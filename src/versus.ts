import { ball, moving, respot, simulate, strike, TABLE, POCKETS, validSpin, type Ball, type PhysicsEvent } from './physics.ts';
import { practiceLayout } from './missions.ts';
export type PoolMode='8-ball'|'9-ball';
export type Player=0|1;
export type BallGroup='solids'|'stripes';
export type PushOut='none'|'available'|'declared'|'decision';
export const HEAD_STRING=TABLE.left+(TABLE.right-TABLE.left)/4;
export interface MatchSnapshot {
  mode:PoolMode;turn:Player;groups:[BallGroup|null,BallGroup|null];winner:Player|null;
  shots:number;inShot:boolean;ballInHand:boolean;reason:string;balls:Ball[];
  kitchen:boolean;calledPocket:number|null;pushOut:PushOut;fouls:[number,number];
}
export const VS_RULES:Record<PoolMode,string>={
  '8-ball':'Pot a ball or send four object balls to cushions on the break. A break scratch gives ball in hand behind the head string; the opening 8 is respotted. Claim a group on the first legal pot after the break. Hit your group first, then call a pocket for the 8. An early 8, a foul while potting it, or an 8 in the wrong pocket loses.',
  '9-ball':'Hit the 1 first on the break and pot a ball or send four object balls to cushions. After a legal break, the next shooter may push out; the opponent can shoot or pass back. Otherwise hit the lowest ball first. A legal 9 wins; the 9 is respotted on a foul or push-out. Three consecutive fouls by one player lose the rack.',
};
const groupOf=(id:number):BallGroup=>id<8?'solids':'stripes';
const isPocket=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<POCKETS.length;
export class VersusMatch {
  balls:Ball[];turn:Player=0;groups:[BallGroup|null,BallGroup|null]=[null,null];winner:Player|null=null;
  shots=0;inShot=false;ballInHand=false;reason='Host breaks. Make your opening count.';
  firstContact:number|null=null;shotPots:number[]=[];railAfterContact=false;scratched=false;target=1;onEight=false;
  kitchen=false;calledPocket:number|null=null;pushOut:PushOut='none';fouls:[number,number]=[0,0];
  breakRailBalls=new Set<number>();eightPocket:number|null=null;
  mode:PoolMode;
  constructor(mode:PoolMode){
    this.mode=mode;
    if(mode==='8-ball'){
      this.balls=practiceLayout();
      const solid=this.balls.find(b=>b.id===7)!,corner=this.balls.find(b=>b.id===11)!;
      [solid.id,corner.id]=[corner.id,solid.id];
    }
    else{
      this.balls=[ball(0,360,330)];let i=0;const numbers=[1,2,3,4,9,5,6,7,8];
      for(let row=0;row<5;row++){const count=3-Math.abs(2-row);for(let column=0;column<count;column++)this.balls.push(ball(numbers[i++],785+row*22,330+(column-(count-1)/2)*25));}
    }
  }
  get canPrepareShot(){return this.winner===null&&!this.inShot&&!this.ballInHand&&this.pushOut!=='decision'&&!moving(this.balls);}
  get needsEightCall(){return this.mode==='8-ball'&&this.shots>0&&!!this.groups[this.turn]&&this.groupRemaining(this.turn)===0;}
  get canShoot(){return this.canPrepareShot&&(!this.needsEightCall||this.calledPocket!==null);}
  get potted(){return this.balls.filter(b=>b.id>0&&!b.active).map(b=>b.id);}
  get lowest(){return Math.min(...this.balls.filter(b=>b.active&&b.id>0).map(b=>b.id));}
  groupRemaining(player:Player){return this.balls.filter(b=>b.active&&b.id!==0&&b.id!==8&&this.groups[player]===groupOf(b.id)).length;}
  callEightPocket(player:Player,pocket:unknown){
    if(player!==this.turn||!this.canPrepareShot||!this.needsEightCall||!isPocket(pocket))return false;
    this.calledPocket=pocket;return true;
  }
  declarePushOut(player:Player){
    if(player!==this.turn||this.pushOut!=='available'||!this.canPrepareShot)return false;
    this.pushOut='declared';this.reason='Push-out declared. Shoot without a first-ball or cushion requirement.';return true;
  }
  choosePushOut(player:Player,passBack:unknown){
    if(player!==this.turn||this.pushOut!=='decision'||this.winner!==null||this.inShot||typeof passBack!=='boolean')return false;
    if(passBack)this.turn=player===0?1:0;
    this.pushOut='none';this.reason=passBack?'Push-out passed back. The original shooter plays.':'Push-out accepted. Play from here.';return true;
  }
  shoot(player:Player,angle:number,power:number,spin:unknown={x:0,y:0}){
    if(player!==this.turn||!this.canShoot||!Number.isFinite(angle)||!Number.isFinite(power)||power<.1||power>1||!validSpin(spin))return false;
    this.target=this.mode==='9-ball'&&this.shots===0?1:this.lowest;this.onEight=this.needsEightCall;
    if(this.pushOut==='available')this.pushOut='none';
    this.firstContact=null;this.shotPots=[];this.railAfterContact=false;this.scratched=false;this.inShot=true;this.shots++;
    this.breakRailBalls.clear();this.eightPocket=null;
    this.balls.forEach(b=>b.banks=0);strike(this.balls[0],angle,power,spin);this.reason='The runes are in motion.';return true;
  }
  placeCue(player:Player,x:number,y:number){
    if(!this.ballInHand||player!==this.turn||this.inShot||this.winner!==null||!Number.isFinite(x)||!Number.isFinite(y))return false;
    const r=TABLE.radius;
    if(this.kitchen&&x>=HEAD_STRING)return false;
    if(x<TABLE.left+r||x>TABLE.right-r||y<TABLE.top+r||y>TABLE.bottom-r||POCKETS.some(p=>Math.hypot(p.x-x,p.y-y)<TABLE.pocketRadius+r)||this.balls.some(b=>b.id!==0&&b.active&&Math.hypot(b.x-x,b.y-y)<r*2+1))return false;
    Object.assign(this.balls[0],{x,y,vx:0,vy:0,active:true,trail:[]});this.ballInHand=false;this.kitchen=false;this.reason='Cue placed. Your shot.';return true;
  }
  tick(dt:number):PhysicsEvent[]{
    if(!this.inShot||this.winner!==null)return [];
    const events=simulate(this.balls,dt);
    for(const event of events){
      if(event.type==='collision'&&this.firstContact===null){if(event.otherBall?.id===0)this.firstContact=event.ball.id;else if(event.ball.id===0)this.firstContact=event.otherBall?.id??null;}
      if(event.type==='rail'&&this.firstContact!==null){
        this.railAfterContact=true;
        if(this.shots===1&&event.ball.id!==0)this.breakRailBalls.add(event.ball.id);
      }
      if(event.type==='pot'){if(event.ball.id===0)this.scratched=true;else{this.shotPots.push(event.ball.id);if(event.ball.id===8)this.eightPocket=event.pocket??null;}}
    }
    if(!moving(this.balls))this.finishShot();return events;
  }
  spotObject(id:number){
    const object=this.balls.find(b=>b.id===id)!;
    for(let x=785;x>110;x-=26)for(let y=330;y<540;y+=26)if(this.balls.every(b=>!b.active||b.id===id||Math.hypot(b.x-x,b.y-y)>26)){Object.assign(object,{x,y,vx:0,vy:0,active:true,trail:[]});return;}
  }
  finishShot(){
    this.inShot=false;const player=this.turn,other:Player=player===0?1:0,opening=this.shots===1;
    const group=this.groups[player],pushing=this.pushOut==='declared',calledPocket=this.calledPocket;
    this.calledPocket=null;this.pushOut='none';
    let foul=this.scratched?'Scratch.':'';
    if(!pushing&&!foul){
      if(this.firstContact===null)foul='No object ball contacted.';
      else if(this.mode==='9-ball'&&this.firstContact!==(opening?1:this.target))foul=`Hit the ${opening?1:this.target} ball first.`;
      else if(this.mode==='8-ball'&&!opening){
        if(this.onEight&&this.firstContact!==8)foul='The 8 ball needed first contact.';
        else if(!this.onEight&&group&&(this.firstContact===8||groupOf(this.firstContact)!==group))foul='Wrong group contacted first.';
        else if(!group&&this.firstContact===8)foul='The 8 cannot be the first contact on an open table.';
      }
      if(!foul&&!this.shotPots.length){
        if(opening&&this.breakRailBalls.size<4)foul='Illegal break: pot a ball or send four object balls to cushions.';
        else if(!opening&&!this.railAfterContact)foul='No cushion or pot after contact.';
      }
    }
    if(this.mode==='8-ball'&&this.shotPots.includes(8)){
      if(opening)this.spotObject(8);
      else{
        const correctPocket=calledPocket!==null&&calledPocket===this.eightPocket;
        this.winner=!foul&&this.onEight&&correctPocket?player:other;
        this.reason=this.winner===player?'The 8 fell in the called pocket. Victory.':!this.onEight?'The 8 fell before your group was cleared. Opponent wins.':foul?`${foul} Foul on the 8 — opponent wins.`:'The 8 missed the called pocket. Opponent wins.';
        return;
      }
    }
    if(this.mode==='9-ball')this.fouls[player]=foul?this.fouls[player]+1:0;
    if(this.mode==='9-ball'&&this.shotPots.includes(9)){
      if(foul||pushing)this.spotObject(9);else{this.winner=player;this.reason='A legal 9-ball pot. Victory.';return;}
    }
    if(this.scratched)respot(this.balls);
    if(foul){
      if(this.mode==='9-ball'&&this.fouls[player]===3){this.winner=other;this.reason=`${foul} Three consecutive fouls. Opponent wins.`;return;}
      this.turn=other;this.ballInHand=true;this.kitchen=this.mode==='8-ball'&&opening&&this.scratched;
      const warning=this.fouls[player]===2?' Two consecutive fouls; the next foul loses the rack.':'';
      this.reason=`${foul}${warning} Ball in hand${this.kitchen?' behind the head string':''}.`;return;
    }
    if(pushing){this.turn=other;this.pushOut='decision';this.reason='Push-out complete. Shoot from here or pass back.';return;}
    if(this.mode==='8-ball'&&!group&&!opening){const claim=this.shotPots.find(id=>id!==8);if(claim){this.groups[player]=groupOf(claim);this.groups[other]=groupOf(claim)==='solids'?'stripes':'solids';}}
    const ownPot=this.mode==='9-ball'?this.shotPots.length>0:this.shotPots.some(id=>id!==8&&(!this.groups[player]||groupOf(id)===this.groups[player]));
    if(!ownPot)this.turn=other;
    this.reason=ownPot?'Clean pot. Keep your turn.':'No scoring pot. The turn passes.';
    if(opening&&this.mode==='9-ball')this.pushOut='available';
  }
  snapshot():MatchSnapshot{return {mode:this.mode,turn:this.turn,groups:[...this.groups],winner:this.winner,shots:this.shots,inShot:this.inShot,ballInHand:this.ballInHand,reason:this.reason,kitchen:this.kitchen,calledPocket:this.calledPocket,pushOut:this.pushOut,fouls:[...this.fouls],balls:this.balls.map(b=>({...b,spin:{...b.spin??{x:0,y:0}},spinContact:b.spinContact??false,trail:[]}))};}
  applySnapshot(value:unknown):boolean{
    if(!value||typeof value!=='object')return false;const s=value as MatchSnapshot;
    if(s.mode!==this.mode||![0,1].includes(s.turn)||![null,0,1].includes(s.winner)||!Array.isArray(s.groups)||s.groups.length!==2||s.groups.some(g=>g!==null&&g!=='solids'&&g!=='stripes')||typeof s.inShot!=='boolean'||typeof s.ballInHand!=='boolean'||typeof s.reason!=='string'||s.reason.length>220||!Number.isInteger(s.shots)||s.shots<0||!Array.isArray(s.balls)||s.balls.length!==this.balls.length)return false;
    if(typeof s.kitchen!=='boolean'||(s.kitchen&&(s.mode!=='8-ball'||!s.ballInHand))||(s.calledPocket!==null&&(s.mode!=='8-ball'||!isPocket(s.calledPocket)))||!['none','available','declared','decision'].includes(s.pushOut)||(s.mode!=='9-ball'&&s.pushOut!=='none')||!Array.isArray(s.fouls)||s.fouls.length!==2||s.fouls.some(n=>!Number.isInteger(n)||n<0||n>3))return false;
    const ids=new Set<number>();
    if(s.balls.some(b=>(b.spin!==undefined&&!validSpin(b.spin))||(b.spinContact!==undefined&&typeof b.spinContact!=='boolean')))return false;
    for(const b of s.balls){if(!this.balls.some(o=>o.id===b.id)||ids.has(b.id)||typeof b.active!=='boolean'||![b.x,b.y,b.vx,b.vy,b.banks].every(Number.isFinite)||b.x<0||b.x>1200||b.y<0||b.y>660||Math.abs(b.vx)>1700||Math.abs(b.vy)>1700)return false;ids.add(b.id);}
    this.turn=s.turn;this.groups=[...s.groups];this.winner=s.winner;this.shots=s.shots;this.inShot=s.inShot;this.ballInHand=s.ballInHand;this.reason=s.reason;
    this.kitchen=s.kitchen;this.calledPocket=s.calledPocket;this.pushOut=s.pushOut;this.fouls=[...s.fouls];
    for(const b of s.balls)Object.assign(this.balls.find(o=>o.id===b.id)!,b,{spin:b.spin?{...b.spin}:{x:0,y:0},spinContact:b.spinContact??false,trail:[]});return true;
  }
}
