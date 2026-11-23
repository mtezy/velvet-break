import { simulate, strike, moving, respot, type Ball, type PhysicsEvent, type Spin } from './physics.ts';
import { createLayout, practiceLayout, type Mission } from './missions.ts';
export class Session {
  mission: Mission; balls:Ball[]; practice:boolean; shots=0; potted:number[]=[]; started=false; inShot=false; scratched=false;
  timeLeft:number; outcome:'playing'|'won'|'lost'='playing'; reason=''; pendingFailure='';
  constructor(mission:Mission,practice=false) {this.mission=mission;this.practice=practice;this.balls=practice?practiceLayout():createLayout(mission);this.timeLeft=mission.time??0;}
  get canShoot(){return this.outcome==='playing'&&!this.inShot&&!moving(this.balls);}
  get remaining(){return this.practice?Infinity:Math.max(0,this.mission.shots-this.shots);}
  get total(){return this.balls.length-1;}
  get stars(){return this.shots<=this.mission.par?3:this.shots<=this.mission.par+1?2:1;}
  shoot(angle:number,power:number,spin:Spin={x:0,y:0}){
    if(!this.canShoot)return false;
    this.balls.forEach(b=>b.banks=0);this.shots++;this.started=true;this.inShot=true;this.scratched=false;
    strike(this.balls.find(b=>b.id===0)!,angle,power,spin);return true;
  }
  advanceClock(dt:number){
    if(this.outcome!=='playing'||this.practice||!this.mission.time||!this.started)return;
    this.timeLeft=Math.max(0,this.timeLeft-dt);
    if(this.timeLeft===0){this.outcome='lost';this.reason='Time slipped away. Plan your opening and try again.';}
  }
  tick(dt:number,advanceClock=true):PhysicsEvent[]{
    if(advanceClock)this.advanceClock(dt);
    if(this.outcome!=='playing')return [];
    const events=simulate(this.balls,dt);
    for(const e of events){
      if(e.type!=='pot')continue;
      const b=e.ball;
      if(b.id===0){this.scratched=true;if(!this.practice)this.shots++;continue;}
      if(!this.practice){
        const rule=this.mission.rule;
        if(rule==='bank'&&b.banks===0)this.pendingFailure='That was a straight pot. The object ball needs a cushion bank in the same shot.';
        if(rule==='called'&&e.pocket!==this.mission.pocket)this.pendingFailure='Wrong pocket. Aim for the glowing called pocket.';
        if(rule==='order'){
          const next=Math.min(...this.balls.filter(o=>o.id!==0&&!this.potted.includes(o.id)).map(o=>o.id));
          if(b.id!==next)this.pendingFailure=`Out of order. The ${next} ball needed to drop next.`;
        }
        if(rule==='eight'&&b.id===8&&this.balls.some(o=>o.id!==0&&o.id!==8&&!this.potted.includes(o.id)))this.pendingFailure='The 8 ball fell too soon. Clear every color first.';
      }
      this.potted.push(b.id);
    }
    if(this.inShot&&!moving(this.balls)){
      this.inShot=false;
      if(this.scratched)respot(this.balls);
      if(this.pendingFailure){this.outcome='lost';this.reason=this.pendingFailure;}
      else if(this.potted.length===this.total){
        if(this.scratched&&!this.practice){this.outcome='lost';this.reason='So close. A scratch on the final pot costs the mission.';}
        else {this.outcome='won';this.reason=`${this.total} balls. ${this.shots} ${this.shots===1?'shot':'shots'}. All you.`;}
      }else if(this.remaining===0){this.outcome='lost';this.reason='Out of shots, not out of potential. Find a new angle and try again.';}
    }
    return events;
  }
}
