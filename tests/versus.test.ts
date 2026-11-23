import test from 'node:test';
import assert from 'node:assert/strict';
import { HEAD_STRING, VersusMatch } from '../src/versus.ts';
import { TABLE } from '../src/physics.ts';
function settle(match:VersusMatch){for(let i=0;i<7000&&match.inShot;i++)match.tick(1/240);assert.equal(match.inShot,false);}
test('online shot validation rejects malformed or out-of-range spin without mutating state',()=>{
  const match=new VersusMatch('8-ball'),before=match.snapshot();
  for(const spin of [{x:1.1,y:0},{x:0,y:-2},{x:.8,y:.8},{x:NaN,y:0},{x:0,y:Infinity},{x:0},null]){
    assert.equal(match.shoot(0,0,.5,spin),false);assert.deepEqual(match.snapshot(),before);
  }
  assert.equal(match.shoot(0,0,.5,{x:.6,y:-.8}),true);
  const peer=new VersusMatch('8-ball');assert.equal(peer.applySnapshot(match.snapshot()),true);assert.deepEqual(peer.balls[0].spin,match.balls[0].spin);
  const bad=match.snapshot();bad.balls[0].spin={x:2,y:0};assert.equal(peer.applySnapshot(bad),false);
});
test('legacy online shots and snapshots default missing spin to centre',()=>{
  const match=new VersusMatch('9-ball');assert.equal(match.shoot(0,0,.5),true);assert.deepEqual(match.balls[0].spin,{x:0,y:0});
  const state=match.snapshot();for(const b of state.balls){delete b.spin;delete b.spinContact;}
  const peer=new VersusMatch('9-ball');peer.balls[0].spin={x:1,y:0};assert.equal(peer.applySnapshot(state),true);assert.deepEqual(peer.balls[0].spin,{x:0,y:0});
});
function lineUp(match:VersusMatch,id:number){
  for(const b of match.balls)Object.assign(b,{active:b.id===0||b.id===id,vx:0,vy:0});
  Object.assign(match.balls[0],{x:590,y:330});Object.assign(match.balls.find(b=>b.id===id)!,{x:340,y:210});
}
const angle=Math.atan2(-120,-250);
test('8-ball and diamond 9-ball racks are unique, non-overlapping and legal',()=>{
  for(const mode of ['8-ball','9-ball'] as const){const m=new VersusMatch(mode);assert.equal(m.balls.length,mode==='8-ball'?16:10);assert.equal(new Set(m.balls.map(b=>b.id)).size,m.balls.length);for(const a of m.balls)for(const b of m.balls)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=TABLE.radius*2);}
  assert.equal(new VersusMatch('9-ball').balls.find(b=>b.id===9)!.y,330);
  const rack=new VersusMatch('8-ball').balls;
  assert.equal(rack.find(b=>b.id===8)!.y,330);
  assert.deepEqual(rack.filter(b=>b.x===873&&(b.y===280||b.y===380)).map(b=>b.id<8),[true,false]);
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
  const m=new VersusMatch('8-ball');m.shots=2;m.groups=['solids','stripes'];lineUp(m,8);
  assert.equal(m.shoot(0,angle,.35),false);assert.equal(m.callEightPocket(1,0),false);assert.equal(m.callEightPocket(0,6),false);
  assert.equal(m.callEightPocket(0,0),true);assert.equal(m.shoot(0,angle,.35),true);settle(m);assert.equal(m.winner,0);
  const early=new VersusMatch('8-ball');early.shots=2;early.groups=['solids','stripes'];lineUp(early,8);Object.assign(early.balls.find(b=>b.id===1)!,{active:true,x:900,y:400});early.shoot(0,angle,.35);settle(early);assert.equal(early.winner,1);
});
test('the 8 in a different pocket loses, and a miss clears the call',()=>{
  const m=new VersusMatch('8-ball');m.shots=2;m.groups=['solids','stripes'];lineUp(m,8);
  assert.equal(m.callEightPocket(0,1),true);assert.equal(m.shoot(0,angle,.35),true);settle(m);
  assert.equal(m.winner,1);assert.match(m.reason,/missed the called pocket/);assert.equal(m.calledPocket,null);
  const miss=new VersusMatch('8-ball');miss.shots=2;miss.groups=['solids','stripes'];lineUp(miss,8);
  assert.equal(miss.callEightPocket(0,0),true);assert.equal(miss.shoot(0,0,.1),true);settle(miss);
  assert.equal(miss.calledPocket,null);
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
test('dry breaks require four distinct object balls to reach a cushion',()=>{
  for(const mode of ['8-ball','9-ball'] as const){
    for(const count of [3,4]){
      const m=new VersusMatch(mode);assert.equal(m.shoot(0,0,.5),true);m.firstContact=1;
      for(const b of m.balls)Object.assign(b,{active:b.id<=count,vx:0,vy:0});
      for(const b of m.balls.filter(b=>b.active))Object.assign(b,{x:TABLE.left+TABLE.radius+.1,y:180+b.id*60,vx:-40});
      m.breakRailBalls.add(1);settle(m);
      assert.equal(m.breakRailBalls.size,count);assert.equal(m.turn,1);assert.equal(m.ballInHand,count===3);
      assert.equal(m.pushOut,mode==='9-ball'&&count===4?'available':'none');
    }
  }
  const wrong=new VersusMatch('9-ball');wrong.shots=1;wrong.firstContact=2;wrong.shotPots=[2];wrong.finishShot();
  assert.equal(wrong.ballInHand,true);assert.match(wrong.reason,/Hit the 1 ball first/);
});
test('8-ball break scratch grants kitchen-only placement even with a pot',()=>{
  const m=new VersusMatch('8-ball');m.shots=1;m.firstContact=1;m.shotPots=[1];m.scratched=true;m.balls[0].active=false;m.finishShot();
  assert.equal(m.ballInHand,true);assert.equal(m.kitchen,true);assert.match(m.reason,/behind the head string/);
  assert.equal(m.placeCue(1,HEAD_STRING,330),false);assert.equal(m.placeCue(1,HEAD_STRING-1,330),true);assert.equal(m.kitchen,false);
});
test('a legal push-out spots the 9 and offers the opponent accept or pass back',()=>{
  for(const passBack of [false,true]){
    const m=new VersusMatch('9-ball');assert.equal(m.declarePushOut(0),false);
    m.shots=1;m.firstContact=1;m.shotPots=[1];m.finishShot();
    assert.equal(m.declarePushOut(1),false);assert.equal(m.declarePushOut(0),true);assert.equal(m.declarePushOut(0),false);
    assert.equal(m.shoot(0,0,.1),true);
    m.shotPots=[9];m.balls.find(b=>b.id===9)!.active=false;m.finishShot();
    assert.equal(m.winner,null);assert.equal(m.balls.find(b=>b.id===9)!.active,true);assert.equal(m.ballInHand,false);
    assert.equal(m.turn,1);assert.equal(m.pushOut,'decision');assert.equal(m.shoot(1,0,.1),false);
    assert.equal(m.choosePushOut(0,passBack),false);assert.equal(m.choosePushOut(1,'yes'),false);
    assert.equal(m.choosePushOut(1,passBack),true);assert.equal(m.turn,passBack?0:1);assert.equal(m.pushOut,'none');
  }
});
test('ordinary post-break shot uses up the push-out, and scratching during a push-out is a foul',()=>{
  for(const pushing of [false,true]){
    const m=new VersusMatch('9-ball');m.shots=1;m.firstContact=1;m.shotPots=[1];m.finishShot();
    if(pushing)assert.equal(m.declarePushOut(0),true);
    assert.equal(m.shoot(0,0,.1),true);m.scratched=true;m.finishShot();
    assert.deepEqual(m.fouls,[1,0]);assert.equal(m.turn,1);assert.equal(m.ballInHand,true);assert.equal(m.pushOut,'none');
  }
});
test('9-ball foul streaks belong to each player; the second warns and the third loses',()=>{
  const m=new VersusMatch('9-ball');m.shots=2;
  const miss=()=>{m.firstContact=null;m.railAfterContact=false;m.finishShot();};
  const legal=()=>{m.firstContact=m.target;m.railAfterContact=true;m.finishShot();};
  const place=()=>assert.equal(m.placeCue(m.turn,400,300),true);
  miss();place();miss();place();miss();
  assert.deepEqual(m.fouls,[2,1]);assert.match(m.reason,/next foul loses/);assert.equal(m.winner,null);
  place();legal();legal();assert.deepEqual(m.fouls,[0,0]);
  miss();place();legal();miss();place();legal();miss();
  assert.equal(m.winner,0);assert.match(m.reason,/Three consecutive fouls/);assert.equal(m.ballInHand,false);
});
test('authoritative snapshots round-trip and malformed updates do not mutate state',()=>{
  const host=new VersusMatch('9-ball'),guest=new VersusMatch('9-ball');host.shoot(0,0,.8);for(let i=0;i<100;i++)host.tick(1/240);assert.equal(guest.applySnapshot(host.snapshot()),true);assert.deepEqual(guest.snapshot(),host.snapshot());
  const invalid=host.snapshot();invalid.balls[0].x=Infinity;assert.equal(guest.applySnapshot(invalid),false);assert.deepEqual(guest.snapshot(),host.snapshot());
  const rules=host.snapshot();rules.pushOut='decision';rules.fouls=[2,1];
  assert.equal(guest.applySnapshot(rules),true);assert.deepEqual(guest.snapshot(),rules);
  const badRules={...rules,calledPocket:0};assert.equal(guest.applySnapshot(badRules),false);assert.deepEqual(guest.snapshot(),rules);
});
