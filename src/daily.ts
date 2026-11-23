import type { Leaderboard } from '@opengamehq/sdk';
import { seededRandom } from './cpu.ts';
import type { Mission } from './missions.ts';
import { TABLE } from './physics.ts';

const dayMs=86_400_000,scoreStride=1_000,limit=10;
export const dailyBoardKey='daily_challenge';
export const dailyDay=(now=Date.now())=>Math.floor(now/dayMs);
export const dailyDate=(day:number)=>new Date(day*dayMs).toISOString().slice(0,10);

export function dailyMission(day:number):Mission{
  const random=seededRandom(day);
  const distance=165+Math.round(random()*65),slope=.55+random()*.25;
  const secondX=840+Math.round(random()*110),secondY=420+Math.round(random()*65);
  const flipX=random()<.5,flipY=random()<.5;
  return {
    title:'Daily challenge',chapter:dailyDate(day),act:0,difficulty:'DAILY',shots:6,par:2,time:75,
    objective:'Clear both balls in 6 shots and 75 seconds.',
    tip:'Every shot left is worth 100 points. Each second left adds a point. Clearing the table earns a 100-point bonus.',
    layout:[[0,TABLE.left+distance*2,TABLE.top+distance*2*slope],[1,TABLE.left+distance,TABLE.top+distance*slope],[2,secondX,secondY]]
      .map(([id,x,y])=>[id,flipX?TABLE.left+TABLE.right-x:x,flipY?TABLE.top+TABLE.bottom-y:y]),
  };
}

export function dailyScore(remaining:number,timeLeft:number){
  return 100*(remaining+1)+Math.floor(timeLeft);
}

// The SDK has no daily reset. Every new day's score outranks older days on its best-per-player board.
export const encodeDailyScore=(day:number,score:number)=>day*scoreStride+score;

export interface DailyEntry {rank:number;name:string;score:number;}
export interface DailyRanking {source:'opengame'|'local';entries:DailyEntry[];}

export class DailyLeaderboard {
  private scores=new Map<number,number[]>();
  private submission?:{day:number;accepted:Promise<boolean>};
  private readonly storage:()=>Pick<Storage,'getItem'|'setItem'>;
  private readonly getBoard:()=>Promise<Pick<Leaderboard,'submit'|'top'>|null>;
  constructor(
    storage:()=>Pick<Storage,'getItem'|'setItem'>,
    getBoard:()=>Promise<Pick<Leaderboard,'submit'|'top'>|null>,
  ){this.storage=storage;this.getBoard=getBoard;}

  private key(day:number){return `velvet-break-daily-${dailyDate(day)}`;}

  private attempts(day:number){
    const cached=this.scores.get(day);
    if(cached)return cached;
    let scores:number[]=[];
    try{
      const raw:unknown=JSON.parse(this.storage().getItem(this.key(day))??'null');
      if(Array.isArray(raw))scores=raw.filter(score=>Number.isInteger(score)&&score>=100&&score<scoreStride).sort((a,b)=>b-a).slice(0,limit);
    }catch{}
    this.scores.set(day,scores);
    return scores;
  }

  best(day:number){return this.attempts(day)[0];}

  record(day:number,score:number){
    const scores=[...this.attempts(day),score].sort((a,b)=>b-a).slice(0,limit);
    this.scores.set(day,scores);
    try{this.storage().setItem(this.key(day),JSON.stringify(scores));}catch{}
    this.submission={day,accepted:this.submit(day,scores[0])};
  }

  private async submit(day:number,score:number){
    const board=await this.getBoard();
    if(!board||day!==dailyDay())return false;
    const result=await board.submit(encodeDailyScore(day,score),{level:dailyDate(day)});
    return result.ok&&result.value.state==='ok';
  }

  async ranking(day:number):Promise<DailyRanking>{
    const board=await this.getBoard();
    if(board&&(this.submission?.day!==day||await this.submission.accepted)){
      const result=await board.top({limit});
      if(result.ok){
        const offset=encodeDailyScore(day,0);
        const entries=result.value.entries
          .filter(entry=>entry.score>=offset+100&&entry.score<offset+scoreStride)
          .map(entry=>({rank:entry.rank,name:entry.isMe?'You':entry.name??'Guest',score:entry.score-offset}));
        return {source:'opengame',entries};
      }
    }
    return {source:'local',entries:this.attempts(day).map((score,i)=>({rank:i+1,name:'You',score}))};
  }
}
