import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseCpuShot, chooseCpuPlacement, seededRandom } from '../src/cpu.ts';
import { aimTrace } from '../src/physics.ts';
import { VersusMatch } from '../src/versus.ts';
import { OfflineGame } from '../src/offline.ts';

function settle(match:VersusMatch){for(let i=0;i<4000&&match.inShot;i++)match.tick(1/240);assert.equal(match.inShot,false);}
function simple(){
  const match=new VersusMatch('9-ball');for(const b of match.balls)b.active=b.id===0||b.id===9;
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
});
test('CPU declines finished, moving and placement-required shots',()=>{
  assert.equal(chooseCpuPlacement(simple().snapshot()),null);
  const match=simple();match.winner=0;assert.equal(chooseCpuShot(match.snapshot(),'hard',seededRandom(1)),null);
  match.winner=null;match.ballInHand=true;assert.equal(chooseCpuShot(match.snapshot(),'hard',seededRandom(1)),null);
  match.ballInHand=false;match.inShot=true;assert.equal(chooseCpuShot(match.snapshot(),'hard',seededRandom(1)),null);
});
test('offline presentation waits, rotates, then fires exactly once',()=>{
  let effects=0;const game=new OfflineGame('9-ball','easy',seededRandom(3),()=>effects++);game.match=simple();game.match.turn=1;
  game.advance(.6);assert.equal(game.match.shots,0);game.advance(.2);
  for(let i=0;i<40&&game.phase!=='aiming';i++)game.advance(1/60);
  assert.equal(game.phase,'aiming');assert.equal(game.match.shots,0);
  const angle=game.angle;game.advance(.25);assert.notEqual(game.angle,angle);assert.equal(game.match.shots,0);
  game.advance(.6);assert.equal(game.match.shots,1);assert.equal(effects,1);game.advance(1);assert.equal(effects,1);
});
test('seeded Hard versus Easy full racks terminate with a winner within capped turns',()=>{
  for(const mode of ['8-ball','9-ball'] as const){
    const match=new VersusMatch(mode),rng=seededRandom(2026);
    for(let turn=0;turn<180&&match.winner===null;turn++){
      if(match.ballInHand){const p=chooseCpuPlacement(match.snapshot())!;assert.ok(p);assert.equal(match.placeCue(match.turn,p.x,p.y),true);}
      const shot=chooseCpuShot(match.snapshot(),match.turn===0?'hard':'easy',rng)!;assert.ok(shot);
      assert.equal(match.shoot(match.turn,shot.angle,shot.power,shot.spin),true);settle(match);
    }
    assert.notEqual(match.winner,null,`${mode} should finish`);
  }
});
