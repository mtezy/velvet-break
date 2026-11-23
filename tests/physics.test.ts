import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ball, simulate, moving, strike, aimTrace, respot, TABLE } from '../src/physics.ts';
import { Session } from '../src/session.ts';
import { missions, createLayout, practiceLayout } from '../src/missions.ts';

function settle(session:Session,limit=15){for(let t=0;t<limit;t+=1/240){session.tick(1/240);if(!session.inShot)return;}assert.fail('Shot did not settle');}
test('equal-mass head-on collision transfers momentum without increasing energy',()=>{
  const a=ball(0,300,330),b=ball(1,323,330);a.vx=600;
  const energy=600**2;simulate([a,b],1/240);
  assert.ok(b.vx>580);assert.ok(a.vx<15);assert.ok(a.vx*a.vx+b.vx*b.vx<=energy);
});
test('a fast ball cannot tunnel through another ball at the fixed timestep',()=>{
  const balls=[ball(0,300,330),ball(1,400,330)];strike(balls[0],0,1);
  let hit=false;for(let i=0;i<40;i++)hit=simulate(balls,1/240).some(e=>e.type==='collision')||hit;assert.ok(hit);
});
test('friction always brings a full-power shot to rest',()=>{
  const balls=[ball(0,340,340)];strike(balls[0],.4,1);
  for(let i=0;i<6000;i++)simulate(balls,1/240);assert.equal(moving(balls),false);
});
test('rail bounce reflects velocity and records a bank',()=>{
  const b=ball(4,500,TABLE.top+TABLE.radius+1);b.vy=-300;
  const events=simulate([b],1/120);assert.ok(b.vy>0);assert.equal(b.banks,1);assert.ok(events.some(e=>e.type==='rail'));
});
test('pockets capture balls and remove them from collisions',()=>{
  const b=ball(1,105,105);const events=simulate([b],1/240);assert.equal(b.active,false);assert.equal(events[0].pocket,0);
});
test('first mission can be completed with a straight 35% shot and earns three stars',()=>{
  const s=new Session(missions[0]);s.shoot(Math.atan2(-120,-250),.35);settle(s);
  assert.equal(s.outcome,'won');assert.equal(s.stars,3);assert.deepEqual(s.potted,[1]);
});
test('a direct pot fails a bank mission, but a same-shot cushion pot counts',()=>{
  const m={...missions[3],layout:[[0,590,330],[4,340,210]]};
  const s=new Session(m);s.shoot(Math.atan2(-120,-250),.35);settle(s);assert.equal(s.outcome,'lost');assert.match(s.reason,/straight pot/);
  const bank=new Session({...missions[3],layout:[[0,400,300],[4,110,112]]});
  bank.shoot(0,.2);bank.balls[1].banks=1;bank.balls[1].vx=-10;bank.balls[1].vy=-10;settle(bank);assert.equal(bank.outcome,'won');
});
test('wrong called pocket and early eight ball fail the objective',()=>{
  for(const mission of [{...missions[4],layout:[[0,590,330],[5,340,210]]},{...missions[10],layout:[[0,590,330],[8,340,210],[1,900,400]]}]){
    const s=new Session(mission);s.shoot(Math.atan2(-120,-250),.35);settle(s);assert.equal(s.outcome,'lost');
  }
});
test('ordered missions reject the wrong first pot',()=>{
  const s=new Session({...missions[5],layout:[[0,590,330],[2,340,210],[1,900,400]]});s.shoot(Math.atan2(-120,-250),.35);settle(s);assert.equal(s.outcome,'lost');assert.match(s.reason,/1 ball/);
});
test('scratch respots the cue without overlap and costs a penalty shot',()=>{
  const s=new Session(missions[0]);s.balls[0].x=300;s.balls[0].y=190;s.shoot(Math.atan2(-100,-210),.3);settle(s);
  assert.equal(s.shots,2);assert.ok(s.balls[0].active);assert.ok(s.balls.every(b=>b.id===0||Math.hypot(b.x-s.balls[0].x,b.y-s.balls[0].y)>24));
});
test('timer does not run until first shot, then expires with a clear loss',()=>{
  const s=new Session(missions[6]);s.tick(10);assert.equal(s.timeLeft,75);s.shoot(0,.1);s.tick(76);assert.equal(s.outcome,'lost');assert.match(s.reason,/Time/);
});
test('the last allowed shot can still win and moving shots cannot be interrupted',()=>{
  const s=new Session({...missions[0],shots:1});assert.ok(s.shoot(Math.atan2(-120,-250),.35));assert.equal(s.shoot(0,1),false);settle(s);assert.equal(s.outcome,'won');
});
test('free play has all fifteen unique object balls and unlimited shots',()=>{
  const rack=practiceLayout();assert.equal(rack.length,16);assert.equal(new Set(rack.map(b=>b.id)).size,16);
  const s=new Session(missions[0],true);assert.equal(s.remaining,Infinity);
});
test('every mission starts without overlapping balls, and aim preview finds first contact',()=>{
  for(const m of missions){const balls=createLayout(m);for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++)assert.ok(Math.hypot(balls[i].x-balls[j].x,balls[i].y-balls[j].y)>=24);}
  const trace=aimTrace(createLayout(missions[0]),Math.atan2(-120,-250));assert.equal(trace.target?.id,1);
});
test('respot finds an unoccupied location',()=>{const balls=[ball(0,90,90),ball(1,350,330)];balls[0].active=false;respot(balls);assert.ok(balls[0].active);assert.ok(Math.hypot(balls[0].x-350,balls[0].y-330)>28);});
