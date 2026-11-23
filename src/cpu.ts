import { aimTrace, POCKETS, TABLE, type Ball, type Spin } from './physics.ts';
import { VersusMatch, type MatchSnapshot } from './versus.ts';

export type CpuDifficulty='easy'|'medium'|'hard';
export interface CpuShot {angle:number;power:number;spin:Spin}
interface Candidate extends CpuShot {rank:number;kind:'pot'|'bank'|'safety'}
export function seededRandom(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function clone(state:MatchSnapshot){const match=new VersusMatch(state.mode);match.applySnapshot(state);return match;}
function targets(match:VersusMatch):Ball[]{
  if(match.mode==='9-ball')return match.balls.filter(b=>b.active&&b.id===match.lowest);
  const group=match.groups[match.turn],eight=!!group&&match.groupRemaining(match.turn)===0;
  return match.balls.filter(b=>b.active&&b.id>0&&(eight?b.id===8:b.id!==8&&(!group||(b.id<8?'solids':'stripes')===group)));
}
function candidates(match:VersusMatch):Candidate[]{
  const cue=match.balls[0],legal=targets(match),shots:Candidate[]=[];
  for(const target of legal){
    const pockets=POCKETS.map(p=>({x:p.x,y:p.y,bank:false}));
    for(const p of POCKETS.slice(0,3)){pockets.push({x:p.x,y:2*(TABLE.bottom-TABLE.radius)-p.y,bank:true});pockets.push({x:p.x,y:2*(TABLE.top+TABLE.radius)-p.y,bank:true});}
    for(const pocket of pockets){
      const dx=pocket.x-target.x,dy=pocket.y-target.y,distance=Math.hypot(dx,dy);
      const ghost={x:target.x-dx/distance*TABLE.radius*2,y:target.y-dy/distance*TABLE.radius*2};
      if(ghost.x<TABLE.left+TABLE.radius||ghost.x>TABLE.right-TABLE.radius||ghost.y<TABLE.top+TABLE.radius||ghost.y>TABLE.bottom-TABLE.radius)continue;
      const angle=Math.atan2(ghost.y-cue.y,ghost.x-cue.x),trace=aimTrace(match.balls,angle);
      if(trace.target?.id!==target.id)continue;
      const cut=(Math.cos(angle)*dx+Math.sin(angle)*dy)/distance;
      if(cut<.2)continue;
      const travel=Math.hypot(ghost.x-cue.x,ghost.y-cue.y)+distance;
      shots.push({angle,power:Math.min(.85,Math.max(.18,(.16+travel/2100)/Math.sqrt(cut))),spin:{x:0,y:0},rank:cut*180-travel*.06-(pocket.bank?80:0),kind:pocket.bank?'bank':'pot'});
    }
    const angle=Math.atan2(target.y-cue.y,target.x-cue.x);
    if(aimTrace(match.balls,angle).target?.id===target.id)for(const power of [.28,.65,.95])shots.push({angle,power,spin:{x:0,y:0},rank:-100+power,kind:'safety'});
  }
  if(!shots.length){
    for(let i=0;i<24;i++)shots.push({angle:i*Math.PI/12,power:.55,spin:{x:0,y:0},rank:-1000,kind:'safety'});
  }
  return shots.sort((a,b)=>b.rank-a.rank);
}
function score(match:VersusMatch,shot:CpuShot,difficulty:CpuDifficulty):number {
  const player=match.turn,trial=clone(match.snapshot()),before=trial.potted.length;
  if(!trial.shoot(player,shot.angle,shot.power,shot.spin))return -Infinity;
  for(let i=0;i<2100&&trial.inShot;i++)trial.tick(1/240);
  if(trial.inShot)return -100000;
  if(trial.winner!==null)return trial.winner===player?100000:-100000;
  const legal=targets(match).some(b=>b.id===trial.firstContact);
  let value=(legal?200:-20000)+(trial.potted.length-before)*1000-(trial.scratched?20000:0)-(trial.ballInHand?20000:0);
  if(difficulty==='hard'&&!trial.ballInHand){
    trial.turn=player;
    value+=(candidates(trial)[0]?.rank??-200)*.4;
  }
  return value;
}
export function* planCpuShot(state:MatchSnapshot,difficulty:CpuDifficulty,rng:()=>number):Generator<void,CpuShot|null> {
  const match=clone(state);if(!match.canShoot)return null;
  const ranked=candidates(match),count=difficulty==='easy'?6:difficulty==='medium'?16:28;
  const options:CpuShot[]=[];
  for(const candidate of ranked.slice(0,difficulty==='easy'?4:7)){
    options.push(candidate,{...candidate,power:Math.min(1,candidate.power*1.25)});
    if(difficulty!=='easy')options.push({...candidate,spin:{x:0,y:-.55}});
    if(difficulty==='hard')options.push({...candidate,spin:{x:0,y:.55}});
  }
  const searched=options.slice(0,count-3);
  searched.push(...ranked.filter(c=>c.kind==='bank').slice(0,1),...ranked.filter(c=>c.kind==='safety').slice(0,2));
  let best=options[0],bestScore=-Infinity;
  for(const shot of searched){const value=score(match,shot,difficulty);if(value>bestScore){best=shot;bestScore=value;}yield;}
  const noise=(difficulty==='easy'?3:difficulty==='medium'?1:.3)*Math.PI/180;
  const angle=best.angle+(rng()*2-1)*noise;
  const legal=targets(match),hit=aimTrace(match.balls,angle).target;
  return {angle:hit&&legal.some(b=>b.id===hit.id)?angle:best.angle,power:Math.min(1,Math.max(.1,best.power+(rng()*2-1)*(difficulty==='easy'?.12:difficulty==='medium'?.05:.02))),spin:{...best.spin}};
}
export function chooseCpuShot(state:MatchSnapshot,difficulty:CpuDifficulty,rng:()=>number):CpuShot|null {
  const plan=planCpuShot(state,difficulty,rng);let result=plan.next();while(!result.done)result=plan.next();return result.value;
}
export function chooseCpuPlacement(state:MatchSnapshot):{x:number;y:number}|null {
  const match=clone(state);if(!match.ballInHand||match.winner!==null)return null;
  let best:{x:number;y:number}|null=null,bestScore=-Infinity;
  for(let x=170;x<=1030;x+=172)for(let y=150;y<=510;y+=90){
    match.ballInHand=true;if(!match.placeCue(match.turn,x,y))continue;
    const value=candidates(match)[0]?.rank??-Infinity;
    if(value>bestScore){bestScore=value;best={x,y};}
  }
  return best;
}
