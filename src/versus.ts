import { ball, moving, respot, simulate, strike, TABLE, POCKETS, validSpin, type Ball, type PhysicsEvent } from './physics.ts';
import { practiceLayout } from './missions.ts';
export type PoolMode='8-ball'|'9-ball';
export type Player=0|1;
export type BallGroup='solids'|'stripes';
export interface MatchSnapshot {
  mode:PoolMode;turn:Player;groups:[BallGroup|null,BallGroup|null];winner:Player|null;
  shots:number;inShot:boolean;ballInHand:boolean;reason:string;balls:Ball[];
}
export const VS_RULES:Record<PoolMode,string>={
  '8-ball':'Club 8-ball: claim solids or stripes on the first legal pot after the break. Hit your group first, then pot the 8 only after clearing it. A scratch, wrong first contact, or no cushion/pot after contact gives your opponent ball in hand. An early 8 or foul on the 8 loses. An 8 on the opening break is respotted. No called-pocket rule.',
  '9-ball':'Club 9-ball: always contact the lowest numbered ball first. A legal 9-ball pot wins, including on the break or a combination. Other legal pots keep your turn. A scratch, wrong first contact, or no cushion/pot gives the opponent ball in hand; a 9 potted on a foul is respotted. No push-out or three-foul rule.',
};
const groupOf=(id:number):BallGroup=>id<8?'solids':'stripes';
export class VersusMatch {
  balls:Ball[];turn:Player=0;groups:[BallGroup|null,BallGroup|null]=[null,null];winner:Player|null=null;
  shots=0;inShot=false;ballInHand=false;reason='Host breaks. Make your opening count.';
  firstContact:number|null=null;shotPots:number[]=[];railAfterContact=false;scratched=false;target=1;onEight=false;
  mode:PoolMode;
  constructor(mode:PoolMode){
    this.mode=mode;
    if(mode==='8-ball')this.balls=practiceLayout();
    else{
      this.balls=[ball(0,360,330)];let i=0;const numbers=[1,2,3,4,9,5,6,7,8];
      for(let row=0;row<5;row++){const count=3-Math.abs(2-row);for(let column=0;column<count;column++)this.balls.push(ball(numbers[i++],785+row*22,330+(column-(count-1)/2)*25));}
    }
  }
  get canShoot(){return this.winner===null&&!this.inShot&&!this.ballInHand&&!moving(this.balls);}
  get potted(){return this.balls.filter(b=>b.id>0&&!b.active).map(b=>b.id);}
  get lowest(){return Math.min(...this.balls.filter(b=>b.active&&b.id>0).map(b=>b.id));}
  groupRemaining(player:Player){return this.balls.filter(b=>b.active&&b.id!==0&&b.id!==8&&this.groups[player]===groupOf(b.id)).length;}
  shoot(player:Player,angle:number,power:number,spin:unknown={x:0,y:0}){
    if(player!==this.turn||!this.canShoot||!Number.isFinite(angle)||!Number.isFinite(power)||power<.1||power>1||!validSpin(spin))return false;
    this.target=this.lowest;this.onEight=!!this.groups[player]&&this.groupRemaining(player)===0;
    this.firstContact=null;this.shotPots=[];this.railAfterContact=false;this.scratched=false;this.inShot=true;this.shots++;
    this.balls.forEach(b=>b.banks=0);strike(this.balls[0],angle,power,spin);this.reason='The runes are in motion.';return true;
  }
  placeCue(player:Player,x:number,y:number){
    if(!this.ballInHand||player!==this.turn||this.inShot||this.winner!==null||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const r=TABLE.radius;
    if(x<TABLE.left+r||x>TABLE.right-r||y<TABLE.top+r||y>TABLE.bottom-r||POCKETS.some(p=>Math.hypot(p.x-x,p.y-y)<TABLE.pocketRadius+r)||this.balls.some(b=>b.id!==0&&b.active&&Math.hypot(b.x-x,b.y-y)<r*2+1))return false;
    Object.assign(this.balls[0],{x,y,vx:0,vy:0,active:true,trail:[]});this.ballInHand=false;this.reason='Cue placed. Your shot.';return true;
  }
  tick(dt:number):PhysicsEvent[]{
    if(!this.inShot||this.winner!==null)return [];
    const events=simulate(this.balls,dt);
    for(const event of events){
      if(event.type==='collision'&&this.firstContact===null){if(event.otherBall?.id===0)this.firstContact=event.ball.id;else if(event.ball.id===0)this.firstContact=event.otherBall?.id??null;}
      if(event.type==='rail'&&this.firstContact!==null)this.railAfterContact=true;
      if(event.type==='pot'){if(event.ball.id===0)this.scratched=true;else this.shotPots.push(event.ball.id);}
    }
    if(!moving(this.balls))this.finishShot();return events;
  }
  spotObject(id:number){
    const object=this.balls.find(b=>b.id===id)!;
    for(let x=785;x>110;x-=26)for(let y=330;y<540;y+=26)if(this.balls.every(b=>!b.active||b.id===id||Math.hypot(b.x-x,b.y-y)>26)){Object.assign(object,{x,y,vx:0,vy:0,active:true,trail:[]});return;}
  }
  finishShot(){
    this.inShot=false;const player=this.turn,other:Player=player===0?1:0,opening=this.shots===1;
    const group=this.groups[player];
    let foul=this.scratched?'Scratch.':this.firstContact===null?'No object ball contacted.':'';
    if(!foul&&this.mode==='9-ball'&&this.firstContact!==this.target)foul=`Hit the ${this.target} ball first.`;
    if(!foul&&this.mode==='8-ball'&&group){if(this.onEight&&this.firstContact!==8)foul='The 8 ball needed first contact.';else if(!this.onEight&&(this.firstContact===8||groupOf(this.firstContact!)!==group))foul='Wrong group contacted first.';}
    if(!foul&&this.mode==='8-ball'&&!group&&this.firstContact===8)foul='The 8 cannot be the first contact on an open table.';
    if(!foul&&!this.railAfterContact&&!this.shotPots.length)foul='No cushion or pot after contact.';
    if(this.mode==='8-ball'&&this.shotPots.includes(8)){
      if(opening)this.spotObject(8);
      else{this.winner=!foul&&this.onEight?player:other;this.reason=this.winner===player?'The 8 is sealed. Victory.':foul?`${foul} Foul on the 8 — opponent wins.`:'The 8 fell before your group was cleared. Opponent wins.';return;}
    }
    if(this.mode==='9-ball'&&this.shotPots.includes(9)){
      if(foul)this.spotObject(9);else{this.winner=player;this.reason='A legal 9-ball pot. Victory.';return;}
    }
    if(this.scratched)respot(this.balls);
    if(foul){this.turn=other;this.ballInHand=true;this.reason=`${foul} Ball in hand: click clear felt to place the cue.`;return;}
    if(this.mode==='8-ball'&&!group&&!opening){const claim=this.shotPots.find(id=>id!==8);if(claim){this.groups[player]=groupOf(claim);this.groups[other]=groupOf(claim)==='solids'?'stripes':'solids';}}
    const ownPot=this.mode==='9-ball'?this.shotPots.length>0:this.shotPots.some(id=>id!==8&&(!this.groups[player]||groupOf(id)===this.groups[player]));
    if(!ownPot)this.turn=other;
    this.reason=ownPot?'Clean pot. Keep your turn.':'No scoring pot. The turn passes.';
  }
  snapshot():MatchSnapshot{return {mode:this.mode,turn:this.turn,groups:[...this.groups],winner:this.winner,shots:this.shots,inShot:this.inShot,ballInHand:this.ballInHand,reason:this.reason,balls:this.balls.map(b=>({...b,spin:{...b.spin??{x:0,y:0}},spinContact:b.spinContact??false,trail:[]}))};}
  applySnapshot(value:unknown):boolean{
    if(!value||typeof value!=='object')return false;const s=value as MatchSnapshot;
    if(s.mode!==this.mode||![0,1].includes(s.turn)||![null,0,1].includes(s.winner)||!Array.isArray(s.groups)||s.groups.length!==2||s.groups.some(g=>g!==null&&g!=='solids'&&g!=='stripes')||typeof s.inShot!=='boolean'||typeof s.ballInHand!=='boolean'||typeof s.reason!=='string'||s.reason.length>220||!Number.isInteger(s.shots)||s.shots<0||!Array.isArray(s.balls)||s.balls.length!==this.balls.length)return false;
    const ids=new Set<number>();
    if(s.balls.some(b=>(b.spin!==undefined&&!validSpin(b.spin))||(b.spinContact!==undefined&&typeof b.spinContact!=='boolean')))return false;
    for(const b of s.balls){if(!this.balls.some(o=>o.id===b.id)||ids.has(b.id)||typeof b.active!=='boolean'||![b.x,b.y,b.vx,b.vy,b.banks].every(Number.isFinite)||b.x<0||b.x>1200||b.y<0||b.y>660||Math.abs(b.vx)>1700||Math.abs(b.vy)>1700)return false;ids.add(b.id);}
    this.turn=s.turn;this.groups=[...s.groups];this.winner=s.winner;this.shots=s.shots;this.inShot=s.inShot;this.ballInHand=s.ballInHand;this.reason=s.reason;
    for(const b of s.balls)Object.assign(this.balls.find(o=>o.id===b.id)!,b,{spin:b.spin?{...b.spin}:{x:0,y:0},spinContact:b.spinContact??false,trail:[]});return true;
  }
}
