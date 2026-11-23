import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_SAMPLE_RATE, renderBarLoop, renderFoley } from '../src/soundtrack.ts';
import { OnlineGame } from '../src/online.ts';
import { ball } from '../src/physics.ts';

const rms = (samples: Float32Array) =>
  Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);

test('foley is distinct, bounded, and fades to silence', () => {
  const [collision, rail, cue, pot] = (['collision', 'rail', 'cue', 'pot'] as const).map(renderFoley);
  for (const clip of [collision, rail, cue, pot]) {
    assert.equal(clip[0], 0);
    assert.equal(Math.abs(clip[clip.length - 1]), 0);
    assert.ok(clip.every(value => Number.isFinite(value) && Math.abs(value) < 1));
    assert.ok(rms(clip) > .015);
  }
  const crossings = (clip: Float32Array) =>
    clip.subarray(1, 330).filter((value, i) => value * clip[i] < 0).length;
  assert.ok(crossings(collision) > crossings(cue));
  assert.ok(crossings(cue) > crossings(rail));
  assert.ok(rms(pot.subarray(1000, 1900)) > rms(pot.subarray(540, 930)));
});

test('the original score spans eight bars with a continuous loop boundary', () => {
  const score = renderBarLoop();
  assert.equal(score.length, Math.round(AUDIO_SAMPLE_RATE * 32 * 60 / 78));
  assert.ok(score.every(value => Number.isFinite(value) && Math.abs(value) < 1));
  for (let start = 0; start < score.length - AUDIO_SAMPLE_RATE; start += AUDIO_SAMPLE_RATE) {
    assert.ok(rms(score.subarray(start, start + AUDIO_SAMPLE_RATE)) > .025);
  }
  assert.ok(Math.abs(score[0] - score[score.length - 1]) < .01);
});

test('online host forwards one strong sound per contact kind and guest validates it', () => {
  const objectBall = ball(1, 200, 200);
  const events = [
    { type: 'collision', speed: 80, ball: objectBall },
    { type: 'collision', speed: 245, ball: objectBall },
    { type: 'rail', speed: 7, ball: objectBall },
    { type: 'pot', speed: 0, ball: objectBall },
  ];
  const messages: object[] = [], played: object[] = [];
  const host = Object.assign(Object.create(OnlineGame.prototype), {
    active: true, connected: true, isHost: true, sentAt: Infinity,
    match: { inShot: true, tick: () => events },
    send: (message: object) => messages.push(message),
  }) as OnlineGame;
  const guest = Object.assign(Object.create(OnlineGame.prototype), {
    connected: true, isHost: false, hooks: { impact: (impact: object) => played.push(impact) },
  }) as OnlineGame;

  assert.equal(host.tick(1 / 240), events);
  assert.equal(messages.length, 1);
  guest.receive({ ...messages[0], v: 2 });
  assert.deepEqual(played, [{ type: 'pot', speed: 0 }, { type: 'collision', speed: 245 }]);
  guest.receive({ v: 2, type: 'impacts', impacts: [{ type: 'rail', speed: NaN }] });
  guest.receive({ v: 2, type: 'impacts', impacts: [{ type: 'cue', speed: 1 }] });
  assert.equal(played.length, 2);
});
