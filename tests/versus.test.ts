import test from 'node:test';
import assert from 'node:assert/strict';
import { VersusMatch } from '../src/versus.ts';
import { TABLE } from '../src/physics.ts';
function settle(match:VersusMatch){for(let i=0;i<7000&&match.inShot;i++)match.tick(1/240);assert.equal(match.inShot,false);}
function lineUp(match:VersusMatch,id:number){
  for(const b of match.balls)Object.assign(b,{active:b.id===0||b.id===id,vx:0,vy:0});
  Object.assign(match.balls[0],{x:590,y:330});Object.assign(match.balls.find(b=>b.id===id)!,{x:340,y:210});
}
const angle=Math.atan2(-120,-250);
test('8-ball and diamond 9-ball racks are unique, non-overlapping and legal',()=>{
  for(const mode of ['8-ball','9-ball'] as const){const m=new VersusMatch(mode);assert.equal(m.balls.length,mode==='8-ball'?16:10);assert.equal(new Set(m.balls.map(b=>b.id)).size,m.balls.length);for(const a of m.balls)for(const b of m.balls)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=TABLE.radius*2);}
  assert.equal(new VersusMatch('9-ball').balls.find(b=>b.id===9)!.y,330);
});
test('turn ownership, moving lockout and malformed/replayed powers are rejected',()=>{
  const m=new VersusMatch('9-ball');assert.equal(m.shoot(1,0,.8),false);assert.equal(m.shoot(0,NaN,.8),false);assert.equal(m.shoot(0,0,2),false);assert.equal(m.shoot(0,0,.8),true);assert.equal(m.shoot(0,0,.8),false);
});
test('9-ball legally potting the 9 on a combination wins',()=>{
  const m=new VersusMatch('9-ball');m.shots=1;m.inShot=true;m.target=1;m.firstContact=1;m.shotPots=[9];m.balls.find(b=>b.id===9)!.active=false;m.finishShot();assert.equal(m.winner,0);
});
test('9 on a foul is respotted, not awarded, and opponent gets ball in hand',()=>{
  const m=new VersusMatch('9-ball');m.shots=2;m.inShot=true;m.target=1;m.firstContact=2;m.shotPots=[9];m.balls.find(b=>b.id===9)!.active=false;m.finishShot();assert.equal(m.winner,null);assert.equal(m.turn,1);assert.equal(m.ballInHand,true);assert.equal(m.balls.find(b=>b.id===9)!.active,true);
});
test('a legal 8-ball color pot after the break claims groups and keeps the turn',()=>{
  const m=new VersusMatch('8-ball');m.shots=1;lineUp(m,1);assert.equal(m.shoot(0,angle,.35),true);settle(m);assert.deepEqual(m.groups,['solids','stripes']);assert.equal(m.turn,0);assert.equal(m.winner,null);
});
test('8-ball wins only after the assigned group is cleared',()=>{
  const m=new VersusMatch('8-ball');m.shots=2;m.groups=['solids','stripes'];lineUp(m,8);m.shoot(0,angle,.35);settle(m);assert.equal(m.winner,0);
  const early=new VersusMatch('8-ball');early.shots=2;early.groups=['solids','stripes'];lineUp(early,8);Object.assign(early.balls.find(b=>b.id===1)!,{active:true,x:900,y:400});early.shoot(0,angle,.35);settle(early);assert.equal(early.winner,1);
});
test('an 8 potted on the break is respotted and does not end the match',()=>{
  const m=new VersusMatch('8-ball');m.shots=1;m.inShot=true;m.firstContact=1;m.shotPots=[8];m.balls.find(b=>b.id===8)!.active=false;m.finishShot();assert.equal(m.winner,null);assert.equal(m.balls.find(b=>b.id===8)!.active,true);
});
test('missing a ball gives ball in hand; cue placement rejects overlaps, pockets and out-of-bounds',()=>{
  const m=new VersusMatch('9-ball');m.shoot(0,Math.PI,.1);settle(m);assert.equal(m.turn,1);assert.equal(m.ballInHand,true);assert.equal(m.shoot(1,0,.5),false);assert.equal(m.placeCue(0,300,300),false);assert.equal(m.placeCue(1,0,0),false);assert.equal(m.placeCue(1,785,330),false);assert.equal(m.placeCue(1,102,102),false);assert.equal(m.placeCue(1,400,300),true);assert.equal(m.canShoot,true);
});
test('a scratch passes the turn even when a color was potted',()=>{
  const m=new VersusMatch('8-ball');m.shots=2;m.firstContact=1;m.shotPots=[1];m.scratched=true;m.balls[0].active=false;m.finishShot();assert.equal(m.turn,1);assert.equal(m.ballInHand,true);assert.equal(m.balls[0].active,true);assert.deepEqual(m.groups,[null,null]);
});
test('authoritative snapshots round-trip and malformed updates do not mutate state',()=>{
  const host=new VersusMatch('9-ball'),guest=new VersusMatch('9-ball');host.shoot(0,0,.8);for(let i=0;i<100;i++)host.tick(1/240);assert.equal(guest.applySnapshot(host.snapshot()),true);assert.deepEqual(guest.snapshot(),host.snapshot());
  const invalid=host.snapshot();invalid.balls[0].x=Infinity;assert.equal(guest.applySnapshot(invalid),false);assert.deepEqual(guest.snapshot(),host.snapshot());
});
