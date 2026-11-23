import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ball, simulate, moving, strike, aimTrace, respot, TABLE, clampSpin } from '../src/physics.ts';
import { Session } from '../src/session.ts';
import { missions, createLayout, practiceLayout } from '../src/missions.ts';

function settle(session:Session,limit=15){for(let t=0;t<limit;t+=1/240){session.tick(1/240);if(!session.inShot)return;}assert.fail('Shot did not settle');}
function spinHit(y:number,targetX=350){
  const cue=ball(0,300,330),target=ball(1,targetX,330);strike(cue,0,.6,{x:0,y});
  for(let i=0;i<1200;i++){const events=simulate([cue,target],1/240);if(events.some(e=>e.type==='collision'))return {cue,target};}
  assert.fail('Expected object contact');
}
test('full-hit draw reverses, follow continues forward, and centre stun nearly stops',()=>{
  assert.ok(spinHit(-1).cue.vx < -350);
  assert.ok(spinHit(1).cue.vx > 350);
  assert.ok(Math.abs(spinHit(0).cue.vx)<20);
});
test('long-distance draw loses most of its contact effect',()=>{
  const short=spinHit(-1),long=spinHit(-1,900);
  assert.ok(Math.abs(long.cue.vx/long.target.vx)<Math.abs(short.cue.vx/short.target.vx)*.2);
});
test('side english changes cushion angle in opposite directions and decays at the rail',()=>{
  const rebound=(x:number)=>{const cue=ball(0,500,103);strike(cue,-Math.PI/2,.5,{x,y:0});simulate([cue],1/240);return cue;};
  const left=rebound(-1),centre=rebound(0),right=rebound(1);
  assert.ok(left.vx>centre.vx+200);assert.ok(right.vx<centre.vx-200);
  assert.ok(left.vy>0&&right.vy>0);assert.ok(Math.abs(right.spin!.x)<.55);
});
test('spin clamps to the disc and explicit centre matches an omitted spin exactly',()=>{
  assert.ok(Math.hypot(...Object.values(clampSpin({x:1,y:1})))<=1);
  assert.deepEqual(clampSpin({x:NaN,y:Infinity}),{x:0,y:0});
  const a=ball(0,300,330),b=ball(0,300,330);strike(a,.3,.5);strike(b,.3,.5,{x:0,y:0});
  for(let i=0;i<500;i++){simulate([a],1/240);simulate([b],1/240);}assert.deepEqual(a,b);
});
test('vertical spin applies only on the first object contact',()=>{
  const {cue}=spinHit(1);assert.equal(cue.spinContact,true);assert.equal(cue.spin!.y,0);
  const target=ball(2,cue.x+23,cue.y);cue.spin={x:0,y:1};const before=cue.vx;simulate([cue,target],1/240);assert.ok(cue.vx<before*.05);
});
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
  const bank=new Session({...missions[3],layout:[[0,400,300],[4,105,105]]});
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
test('wall-clock countdown stays accurate when rendering and physics are throttled',()=>{
  const s=new Session(missions[6]);s.shoot(0,.1);
  for(let i=0;i<50;i++){s.advanceClock(.2);s.tick(1/240,false);}
  assert.ok(Math.abs(s.timeLeft-65)<.00001);
  s.advanceClock(65);assert.equal(s.outcome,'lost');
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
