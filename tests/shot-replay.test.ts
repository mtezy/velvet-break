import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ball, type PhysicsEvent } from '../src/physics.ts';
import { NotableShot, ShotRecorder } from '../src/shot-replay.ts';

const cue=ball(0,200,200),one=ball(1,400,300),two=ball(2,500,300),three=ball(3,600,300);
const hit=(ball:PhysicsEvent['ball'],otherBall:PhysicsEvent['ball']):PhysicsEvent=>({type:'collision',ball,otherBall,speed:150});
const rail=(ball:PhysicsEvent['ball']):PhysicsEvent=>({type:'rail',ball,speed:150});
const pot=(ball:PhysicsEvent['ball']):PhysicsEvent=>({type:'pot',ball,pocket:0,speed:150});

test('straight pots, unrelated cushions and scratches do not qualify',()=>{
  const shot=new NotableShot();
  assert.equal(shot.observe([hit(one,cue),rail(two),pot(cue),pot(one)]),undefined);
  assert.equal(shot.observe([pot(one)]),undefined);
});

test('a direct object ball banking after cue contact qualifies',()=>{
  const shot=new NotableShot();
  shot.observe([hit(cue,one)]);
  assert.equal(shot.observe([rail(one),pot(one)])?.kind,'Bank shot');
});

test('a linked ball-to-ball or kick combination qualifies, not incidental collisions',()=>{
  assert.equal(new NotableShot().observe([hit(one,cue),hit(two,one),pot(two)])?.kind,'Combo shot');
  assert.equal(new NotableShot().observe([rail(cue),hit(one,cue),pot(one)])?.kind,'Combo shot');
  assert.equal(new NotableShot().observe([hit(one,cue),hit(two,one),hit(three,two),pot(one)]),undefined);
});

test('the second distinct object ball makes the highlight a multi-pot',()=>{
  const shot=new NotableShot();
  assert.equal(shot.observe([hit(one,cue),rail(one),pot(one),pot(cue)])?.kind,'Bank shot');
  assert.equal(shot.observe([pot(one),pot(two)])?.kind,'Multi-pot');
});

test('a wrapped clip interpolates at slow speed, keeps the pot, and leaves live balls unchanged',()=>{
  const balls=[ball(0,200,200),ball(1,0,300)];
  const target=balls[1],recorder=new ShotRecorder(.25);
  recorder.start(balls);
  for(let x=1;x<=18;x++){
    target.x=x;
    target.active=x<14;
    const events=x===13?[hit(target,balls[0]),rail(target)]:x===14?[pot(target)]:[];
    recorder.capture(balls,events);
  }
  const clip=recorder.finish()!;
  assert.equal(clip.highlight.kind,'Bank shot');
  assert.ok(Math.abs(clip.duration-(2.5/.35+.25))<1e-9);
  clip.seek(0);
  assert.equal(clip.balls[1].x,4);
  clip.seek(.125/.35);
  assert.ok(Math.abs(clip.balls[1].x-4.5)<1e-9);
  clip.seek(clip.duration);
  assert.equal(clip.balls[1].x,14);
  assert.equal(clip.balls[1].active,false);
  assert.equal(target.x,18);
  recorder.start(balls);
  assert.equal(recorder.finish(),undefined);
});
