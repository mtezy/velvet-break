import { AUDIO_SAMPLE_RATE, renderBarLoop, renderFoley, type FoleySound } from './soundtrack.ts';
import type { PhysicsEvent } from './physics.ts';

export type TableImpact = Pick<PhysicsEvent, 'type' | 'speed'>;
export const AUDIBLE_IMPACT_SPEED = 20;

export function validTableImpact(value: unknown): value is TableImpact {
  if (!value || typeof value !== 'object') return false;
  const { type, speed } = value as TableImpact;
  return (type === 'pot' || type === 'rail' || type === 'collision') &&
    Number.isFinite(speed) && speed >= 0;
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const impactInterval = { collision: .018, rail: .035, pot: .045 } as const;

export class ClubAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private mix?: DynamicsCompressorNode;
  private music?: AudioBufferSourceNode;
  private clips = new Map<FoleySound, AudioBuffer>();
  private lastImpact = { collision: -Infinity, rail: -Infinity, pot: -Infinity };
  private level = .65;
  private on = false;
  private mutedByHost = false;

  get enabled() { return this.on; }
  get hostMuted() { return this.mutedByHost; }
  get volume() { return this.level; }
  private get outputLevel() { return this.on && !this.mutedByHost ? this.level : 0; }

  toggle() {
    if (!this.on) {
      try { this.openContext(); } catch { return false; }
    }
    this.on = !this.on;
    this.updateMix();
    if (this.on) {
      void this.context!.resume().then(() => this.startMusic()).catch(() => {});
    }
    return this.on;
  }

  setVolume(value: number) {
    if (!Number.isFinite(value)) return;
    this.level = clamp(value);
    this.updateMix();
  }

  setHostMuted(value: boolean) {
    this.mutedByHost = value;
    this.updateMix();
  }

  impact({ type, speed }: TableImpact) {
    const ctx = this.playingContext();
    if (!ctx || (type !== 'pot' && speed < AUDIBLE_IMPACT_SPEED)) return;
    if (ctx.currentTime - this.lastImpact[type] < impactInterval[type]) return;
    this.lastImpact[type] = ctx.currentTime;
    const strength = Math.sqrt(clamp(speed / 1300));
    const volume = type === 'pot' ? .52 + strength * .23 : .06 + strength * .7;
    this.playClip(ctx, type, volume, .92 + .18 * strength + Math.random() * .07);
  }

  shot(power: number) {
    const ctx = this.playingContext();
    if (ctx) this.playClip(ctx, 'cue', .33 + clamp(power) * .42, .96 + clamp(power) * .15);
  }

  win() {
    const ctx = this.playingContext();
    if (!ctx) return;
    [261.63, 329.63, 392, 523.25].forEach((frequency, i) => {
      const start = ctx.currentTime + i * .12;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.07, start + .012);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .6);
      osc.connect(gain).connect(this.mix!);
      osc.start(start);
      osc.stop(start + .6);
    });
  }

  private openContext() {
    if (this.context) return;
    const ctx = new AudioContext();
    const master = ctx.createGain(), mix = ctx.createDynamicsCompressor();
    mix.threshold.value = -9;
    mix.ratio.value = 4;
    master.gain.value = 0;
    mix.connect(master).connect(ctx.destination);
    this.context = ctx;
    this.master = master;
    this.mix = mix;
  }

  private updateMix() {
    if (!this.context || !this.master) return;
    const time = this.context.currentTime;
    this.master.gain.cancelScheduledValues(time);
    if (this.outputLevel === 0) this.master.gain.setValueAtTime(0, time);
    else this.master.gain.setTargetAtTime(this.outputLevel, time, .018);
    this.startMusic();
  }

  private playingContext() {
    return this.outputLevel > 0 && this.context?.state === 'running' ? this.context : undefined;
  }

  private buffer(ctx: AudioContext, samples: Float32Array<ArrayBuffer>) {
    const buffer = ctx.createBuffer(1, samples.length, AUDIO_SAMPLE_RATE);
    buffer.copyToChannel(samples, 0);
    return buffer;
  }

  private startMusic() {
    const ctx = this.playingContext();
    if (!ctx || this.music) return;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = this.buffer(ctx, renderBarLoop());
    source.loop = true;
    gain.gain.value = .36;
    source.connect(gain).connect(this.mix!);
    source.start();
    this.music = source;
  }

  private playClip(ctx: AudioContext, sound: FoleySound, volume: number, rate: number) {
    let buffer = this.clips.get(sound);
    if (!buffer) {
      buffer = this.buffer(ctx, renderFoley(sound));
      this.clips.set(sound, buffer);
    }
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = volume;
    source.connect(gain).connect(this.mix!);
    source.start();
  }
}
