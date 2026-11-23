import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseCpuShot, chooseCpuPlacement, seededRandom } from '../src/cpu.ts';
import { aimTrace } from '../src/physics.ts';
import { HEAD_STRING, VersusMatch } from '../src/versus.ts';
import { OfflineGame } from '../src/offline.ts';

function settle(match:VersusMatch){for(let i=0;i<4000&&match.inShot;i++)match.tick(1/240);assert.equal(match.inShot,false);}
function simple(){
  const match=new VersusMatch('9-ball');for(const b of match.balls)b.active=b.id===0||b.id===9;
  match.shots=1;
  Object.assign(match.balls[0],{x:600,y:340});Object.assign(match.balls.find(b=>b.id===9)!,{x:600,y:190});return match;
}
test('seeded hard CPU pots a straight-in nine, does not mutate input, and stays within budget',()=>{
  const match=simple(),state=match.snapshot(),before=structuredClone(state),start=performance.now();
  const shot=chooseCpuShot(state,'hard',seededRandom(42))!;
  assert.ok(performance.now()-start<500);assert.deepEqual(state,before);
  assert.deepEqual(shot,chooseCpuShot(state,'hard',seededRandom(42)));
  assert.equal(match.shoot(0,shot.angle,shot.power,shot.spin),true);settle(match);assert.equal(match.winner,0);
});
test('CPU chooses a legal first contact when clearly available at every difficulty',()=>{
  for(const difficulty of ['easy','medium','hard'] as const){
    const match=simple();match.balls.find(b=>b.id===1)!.active=true;Object.assign(match.balls.find(b=>b.id===1)!,{x:600,y:230});
    const shot=chooseCpuShot(match.snapshot(),difficulty,seededRandom(12))!;
    assert.equal(aimTrace(match.balls,shot.angle).target?.id,1);if(difficulty==='easy')assert.deepEqual(shot.spin,{x:0,y:0});
  }
});
test('CPU ball-in-hand samples a legal clear position without changing the match',()=>{
  const match=new VersusMatch('8-ball');match.turn=1;match.ballInHand=true;const before=match.snapshot();
  const spot=chooseCpuPlacement(before)!;assert.ok(spot);assert.deepEqual(match.snapshot(),before);assert.equal(match.placeCue(1,spot.x,spot.y),true);
  match.ballInHand=true;match.kitchen=true;
  const kitchen=chooseCpuPlacement(match.snapshot())!;assert.ok(kitchen.x<HEAD_STRING);assert.equal(match.placeCue(1,kitchen.x,kitchen.y),true);
});
test('CPU finds a legal break from a full 8-ball and 9-ball rack',()=>{
  for(const mode of ['8-ball','9-ball'] as const){
    const match=new VersusMatch(mode),shot=chooseCpuShot(match.snapshot(),'easy',seededRandom(42))!;
    assert.equal(match.shoot(0,shot.angle,shot.power,shot.spin),true);settle(match);
    assert.equal(match.ballInHand,false,match.reason);
  }
});
test('CPU calls the pocket it aims at when potting the 8',()=>{
  const match=new VersusMatch('8-ball');match.shots=2;match.groups=['stripes','solids'];match.turn=1;
  for(const b of match.balls)b.active=b.id===0||b.id===8;
  Object.assign(match.balls[0],{x:600,y:340});Object.assign(match.balls.find(b=>b.id===8)!,{x:600,y:190});
  const game=new OfflineGame('8-ball','hard',seededRandom(42),()=>{});game.match=match;
  for(let i=0;i<180&&!match.inShot;i++)game.advance(1/60);
  assert.equal(match.calledPocket,1);settle(match);assert.equal(match.winner,1);
});
test('CPU accepts a push-out with a clear target and passes it back when blocked',()=>{
  for(const blocked of [false,true]){
    const game=new OfflineGame('9-ball','hard',seededRandom(42),()=>{}),match=simple();game.match=match;
    match.turn=1;match.pushOut='decision';
    if(blocked)Object.assign(match.balls.find(b=>b.id===9)!,{x:600,y:240}),Object.assign(match.balls.find(b=>b.id===1)!,{active:true,x:600,y:190});
    game.advance(.8);
    assert.equal(match.pushOut,'none');assert.equal(match.turn,blocked?0:1);
    if(blocked){
      match.turn=1;match.pushOut='available';
      game.advance(.8);assert.equal(match.pushOut,'declared');
      for(let i=0;i<120&&!match.inShot;i++)game.advance(1/60);
      settle(match);assert.equal(match.pushOut,'decision');assert.equal(match.turn,0);
    }
  }
});
test('CPU declines finished, moving and placement-required shots',()=>{
  assert.equal(chooseCpuPlacement(simple().snapshot()),null);
  const match=simple();match.winner=0;assert.equal(chooseCpuShot(match.snapshot(),'hard',seededRandom(1)),null);
  match.winner=null;match.ballInHand=true;assert.equal(chooseCpuShot(match.snapshot(),'hard',seededRandom(1)),null);
  match.ballInHand=false;match.inShot=true;assert.equal(chooseCpuShot(match.snapshot(),'hard',seededRandom(1)),null);
});
test('offline presentation waits, rotates, then fires exactly once',()=>{
  let effects=0;const game=new OfflineGame('9-ball','easy',seededRandom(3),()=>effects++);game.match=simple();game.match.turn=1;
  game.advance(.6);assert.equal(game.match.shots,1);game.advance(.2);
  for(let i=0;i<40&&game.phase!=='aiming';i++)game.advance(1/60);
  assert.equal(game.phase,'aiming');assert.equal(game.match.shots,1);
  const angle=game.angle;game.advance(.25);assert.notEqual(game.angle,angle);assert.equal(game.match.shots,1);
  game.advance(.6);assert.equal(game.match.shots,2);assert.equal(effects,1);game.advance(1);assert.equal(effects,1);
});
test('seeded Hard versus Easy full racks terminate with a winner within capped turns',()=>{
  for(const mode of ['8-ball','9-ball'] as const){
    const match=new VersusMatch(mode),rng=seededRandom(2026);
    for(let turn=0;turn<180&&match.winner===null;turn++){
      if(match.ballInHand){const p=chooseCpuPlacement(match.snapshot())!;assert.ok(p);assert.equal(match.placeCue(match.turn,p.x,p.y),true);}
      const shot=chooseCpuShot(match.snapshot(),match.turn===0?'hard':'easy',rng)!;assert.ok(shot);
      if(match.needsEightCall)assert.equal(match.callEightPocket(match.turn,shot.pocket),true);
      assert.equal(match.shoot(match.turn,shot.angle,shot.power,shot.spin),true);settle(match);
    }
    assert.notEqual(match.winner,null,`${mode} should finish`);
  }
});
