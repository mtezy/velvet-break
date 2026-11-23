export const AUDIO_SAMPLE_RATE = 22050;
export type FoleySound = 'collision' | 'rail' | 'pot' | 'cue';
const TAU = Math.PI * 2;
const frames = (seconds: number) => Math.round(seconds * AUDIO_SAMPLE_RATE);
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function noiseGenerator(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
}

type Mode = [frequency: number, amplitude: number, decay: number];
function knock(buffer: Float32Array, at: number, modes: Mode[], texture: number, brightness: number) {
  const offset = frames(at), random = noiseGenerator(837 + offset);
  const ring = modes.map(([f, a, d]) => [TAU * f / AUDIO_SAMPLE_RATE, a, Math.exp(-1 / (d * AUDIO_SAMPLE_RATE))]);
  const noiseDecay = Math.exp(-1 / (.006 * AUDIO_SAMPLE_RATE));
  let low = 0, noiseLevel = texture;
  for (let i = 0; i + offset < buffer.length; i++) {
    const raw = random();
    low += brightness * (raw - low);
    let sample = low * noiseLevel;
    noiseLevel *= noiseDecay;
    for (const mode of ring) {
      sample += mode[1] * Math.sin(i * mode[0]);
      mode[1] *= mode[2];
    }
    const attack = Math.min(1, i / 14);
    const tail = Math.min(1, (buffer.length - 1 - offset - i) / 75);
    buffer[i + offset] += sample * attack * tail;
  }
}

export function renderFoley(sound: FoleySound) {
  const buffer = new Float32Array(frames({ collision: .083, rail: .116, pot: .3, cue: .093 }[sound]));
  switch (sound) {
    case 'collision':
      knock(buffer, 0, [[1190,.32,.006],[2180,.24,.009],[3490,.18,.008],[5410,.10,.004]], .28, .8);
      break;
    case 'rail':
      knock(buffer, 0, [[146,.34,.024],[298,.16,.015],[655,.1,.012]], .26, .16);
      break;
    case 'pot':
      knock(buffer, 0, [[260,.20,.013],[690,.11,.01]], .3, .3);
      knock(buffer, .045, [[170,.35,.027],[332,.17,.019],[745,.09,.012]], .24, .22);
      knock(buffer, .105, [[118,.17,.031],[288,.12,.021],[560,.06,.013]], .18, .14);
      knock(buffer, .16, [[104,.09,.019],[240,.06,.016]], .12, .14);
      break;
    case 'cue':
      knock(buffer, 0, [[370,.33,.014],[1040,.19,.009],[2790,.20,.004]], .44, .55);
      break;
  }
  return buffer;
}

const bars = [
  { voicing: [53, 57, 60, 64], bass: [38, 45, 48, 49], melody: [[.75,69],[1.66,72],[2.67,76]] },
  { voicing: [53, 57, 59, 64], bass: [43, 47, 50, 47], melody: [[.67,74],[1.66,71],[3.23,67]] },
  { voicing: [52, 55, 59, 62], bass: [36, 43, 47, 48], melody: [[.67,64],[1.67,67],[2.66,71],[3.67,74]] },
  { voicing: [55, 58, 61, 65], bass: [45, 40, 43, 44], melody: [[.17,73],[1.67,70],[3.25,67]] },
  { voicing: [53, 57, 60, 64], bass: [38, 45, 48, 44], melody: [[.67,69],[1.67,72],[2.67,76],[3.67,77]] },
  { voicing: [55, 58, 62, 65], bass: [39, 46, 50, 49], melody: [[.67,77],[1.67,74],[2.67,70]] },
  { voicing: [52, 55, 57, 62], bass: [36, 43, 45, 47], melody: [[.67,76],[1.67,74],[2.67,69]] },
  { voicing: [55, 61, 65, 70], bass: [45, 43, 40, 37], melody: [[.67,70],[1.67,67],[3.17,65]] },
];

export function renderBarLoop() {
  const beat = 60 / 78, loop = new Float32Array(frames(bars.length * 4 * beat));
  const bank = new Map<string, Float32Array>();
  const random = noiseGenerator(22190);
  function layer(kind: 'keys' | 'bass' | 'brush', pitch: number, at: number, volume: number) {
    const key = `${kind}:${pitch}`;
    let clip = bank.get(key);
    if (!clip) {
      const duration = kind === 'keys' ? 1.3 : kind === 'bass' ? .66 : .19;
      const attack = kind === 'keys' ? .012 : kind === 'bass' ? .008 : .026;
      const attackFrames = frames(attack);
      const decay = kind === 'keys' ? .42 : kind === 'bass' ? .25 : .048;
      const decayStep = Math.exp(-1 / (decay * AUDIO_SAMPLE_RATE));
      const step = TAU * hz(pitch) / AUDIO_SAMPLE_RATE;
      let level = 1, low = 0, tine = .66;
      clip = new Float32Array(frames(duration));
      for (let i = 0; i < clip.length; i++) {
        const phase = step * i;
        let wave: number;
        if (kind === 'keys') {
          wave = .86 * Math.sin(phase + tine * Math.sin(2 * phase)) + .14 * Math.sin(phase * 1.003);
          tine *= .99953;
        } else if (kind === 'bass') {
          wave = .83 * Math.sin(phase) + .13 * Math.sin(2 * phase) + .04 * Math.sin(3 * phase);
        } else {
          const raw = random();
          low += .18 * (raw - low);
          wave = .64 * (raw - low);
        }
        clip[i] = wave * level * Math.min(1, i / attackFrames, (clip.length - 1 - i) / 2500);
        level *= decayStep;
      }
      bank.set(key, clip);
    }
    const offset = frames(at * beat) % loop.length;
    for (let i = 0; i < clip.length; i++) loop[(offset + i) % loop.length] += clip[i] * volume;
  }
  bars.forEach(({ voicing, bass, melody }, bar) => {
    const start = bar * 4;
    bass.forEach((pitch, i) => layer('bass', pitch, start + i, i % 2 ? .12 : .2));
    voicing.forEach((pitch, i) => {
      layer('keys', pitch, start + .08 + i * .016, .087);
      layer('keys', pitch, start + 2.33 + i * .016, .063);
    });
    melody.forEach(([time, pitch]) => layer('keys', pitch, start + time, .133));
    [0, 1, 1.67, 2, 3, 3.67].forEach((time, i) =>
      layer('brush', (i + bar) % 4, start + time, time % 2 === 1 ? .1 : .047));
  });
  return loop;
}
