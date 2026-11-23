import { chooseCpuPlacement, cpuHasDirectContact, planCpuShot, type CpuDifficulty, type CpuShot } from './cpu.ts';
import { VersusMatch, type PoolMode } from './versus.ts';

export class OfflineGame {
  match:VersusMatch;phase:'thinking'|'planning'|'aiming'='thinking';elapsed=0;angle=0;
  private plan?:Generator<void,CpuShot|null>;shot:CpuShot|null=null;private fromAngle=0;
  difficulty:CpuDifficulty;private rng:()=>number;private onShot:(power:number)=>void;
  constructor(mode:PoolMode,difficulty:CpuDifficulty,rng:()=>number,onShot:(power:number)=>void){this.difficulty=difficulty;this.rng=rng;this.onShot=onShot;this.match=new VersusMatch(mode);this.match.reason='You break first.';}
  get canShoot(){return this.match.turn===0&&this.match.canShoot;}
  get canPlace(){return this.match.turn===0&&this.match.ballInHand&&!this.match.inShot&&this.match.winner===null;}
  advance(dt:number){
    const match=this.match;if(match.turn!==1||match.inShot||match.winner!==null)return;
    this.elapsed+=dt;
    if(this.phase==='thinking'&&this.elapsed>=.75){
      if(match.pushOut==='decision'){match.choosePushOut(1,!cpuHasDirectContact(match));this.reset();return;}
      if(match.ballInHand){const spot=chooseCpuPlacement(match.snapshot());if(spot)match.placeCue(1,spot.x,spot.y);}
      if(match.pushOut==='available'&&!cpuHasDirectContact(match))match.declarePushOut(1);
      this.plan=planCpuShot(match.snapshot(),this.difficulty,this.rng);this.phase='planning';
    }
    if(this.phase==='planning'){
      const result=this.plan!.next();if(!result.done)return;
      this.shot=result.value;if(!this.shot){this.reset();return;}
      this.phase='aiming';this.elapsed=0;this.fromAngle=this.angle;
    }
    if(this.phase==='aiming'&&this.shot){
      const delta=Math.atan2(Math.sin(this.shot.angle-this.fromAngle),Math.cos(this.shot.angle-this.fromAngle));
      this.angle=this.fromAngle+delta*Math.min(1,this.elapsed/.5);
      if(this.elapsed>=.85){
        const shot=this.shot;
        if(match.needsEightCall)match.callEightPocket(1,shot.pocket);
        if(match.shoot(1,shot.angle,shot.power,shot.spin))this.onShot(shot.power);
        this.reset();
      }
    }
  }
  private reset(){this.phase='thinking';this.elapsed=0;this.shot=null;this.plan=undefined;}
}
