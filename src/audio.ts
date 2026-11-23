export class ClubAudio {
  context:AudioContext|null=null; enabled=false;hostMuted=false;lastHit=0;melodyTimer=0;
  toggle(){this.enabled=!this.enabled;if(this.enabled){this.context??=new AudioContext();void this.context.resume();this.tone(330,.15,.06);}return this.enabled;}
  tone(frequency:number,duration:number,volume=.06,type:OscillatorType='sine',delay=0){
    if(!this.enabled||this.hostMuted)return;this.context??=new AudioContext();const ctx=this.context;
    const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=frequency;
    const start=ctx.currentTime+delay;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.005);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.02);
  }
  hit(speed:number){if(performance.now()-this.lastHit<30)return;this.lastHit=performance.now();this.tone(190+Math.min(speed,1000)*.35,.07,Math.min(.14,speed/6000),'triangle');}
  pot(){[440,554.37,659.25].forEach((n,i)=>this.tone(n,.25,.06,'sine',i*.065));}
  win(){[261.63,329.63,392,523.25].forEach((n,i)=>this.tone(n,.7,.07,'sine',i*.12));}
  shot(power:number){this.tone(130+power*100,.09,.12,'triangle');}
}
