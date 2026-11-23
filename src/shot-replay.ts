import { ball, POCKETS, type Ball, type PhysicsEvent } from './physics.ts';

export type ReplayKind = 'Combo shot' | 'Bank shot' | 'Multi-pot';
type Highlight = { kind:ReplayKind; ballId:number; x:number; y:number };

export class NotableShot {
  private contacts = new Map([[0,0]]);
  private direct = new Set<number>();
  private banked = new Set<number>();
  private pots = new Set<number>();

  observe(events:readonly PhysicsEvent[]):Highlight|undefined {
    let highlight:Highlight|undefined;
    for(const event of events){
      const id=event.ball.id;
      if(event.type==='rail'){
        const contacts=this.contacts.get(id);
        if(contacts!==undefined)this.contacts.set(id,contacts+1);
        if(this.direct.has(id))this.banked.add(id);
      }else if(event.type==='collision'&&event.otherBall){
        const other=event.otherBall.id;
        if(id===0||other===0)this.direct.add(id||other);
        const a=this.contacts.get(id),b=this.contacts.get(other);
        if(a!==undefined&&b===undefined)this.contacts.set(other,a+1);
        if(b!==undefined&&a===undefined)this.contacts.set(id,b+1);
      }else if(event.type==='pot'&&id!==0&&!this.pots.has(id)){
        this.pots.add(id);
        const kind=this.pots.size>=2?'Multi-pot':this.banked.has(id)?'Bank shot':(this.contacts.get(id)??0)>=2?'Combo shot':undefined;
        if(kind){
          const target=event.pocket===undefined?event.ball:POCKETS[event.pocket];
          highlight={kind,ballId:id,x:target.x,y:target.y};
        }
      }
    }
    return highlight;
  }
}

const seconds=2.5,speed=.35,hold=.25;

export class ReplayClip {
  readonly balls:Ball[];
  readonly duration:number;
  readonly focus={x:0,y:0,progress:0};
  readonly highlight:Highlight;
  private readonly subject:Ball;
  private readonly frames:Float32Array;
  private readonly step:number;

  constructor(highlight:Highlight,frames:Float32Array,ids:number[],step:number){
    this.highlight=highlight;this.frames=frames;this.step=step;
    this.balls=ids.map(id=>ball(id,0,0));
    this.subject=this.balls.find(b=>b.id===highlight.ballId)!;
    this.duration=(frames.length/(ids.length*3)-1)*step/speed+hold;
  }

  seek(elapsed:number){
    const width=this.balls.length*3,last=this.frames.length/width-1;
    const frame=Math.min(last,Math.max(0,elapsed)*speed/this.step);
    const before=Math.floor(frame),after=Math.min(last,before+1),fraction=frame-before;
    for(let i=0;i<this.balls.length;i++){
      const a=before*width+i*3,b=after*width+i*3,output=this.balls[i];
      output.x=this.frames[a]+(this.frames[b]-this.frames[a])*fraction;
      output.y=this.frames[a+1]+(this.frames[b+1]-this.frames[a+1])*fraction;
      output.active=this.frames[a+2]===1;
    }
    const progress=last?frame/last:1,t=progress*progress*(3-2*progress)*.65;
    this.focus.x=this.subject.x+(this.highlight.x-this.subject.x)*t;
    this.focus.y=this.subject.y+(this.highlight.y-this.subject.y)*t;
    this.focus.progress=progress;
  }
}

export class ShotRecorder {
  private detector=new NotableShot();
  private ids:number[]=[];
  private frames=new Float32Array();
  private head=0;
  private size=0;
  private clip:ReplayClip|undefined;
  private potted=0;
  private readonly capacity:number;
  private readonly step:number;

  constructor(step:number){this.step=step;this.capacity=Math.ceil(seconds/step)+1;}

  start(balls:readonly Ball[]){
    this.detector=new NotableShot();this.clip=undefined;this.head=0;this.size=0;this.potted=0;
    this.ids=balls.map(b=>b.id);
    const length=this.capacity*this.ids.length*3;
    if(this.frames.length!==length)this.frames=new Float32Array(length);
    this.capture(balls,[]);
  }

  capture(balls:readonly Ball[],events:readonly PhysicsEvent[]){
    if(!this.ids.length)return;
    for(const event of events)if(event.type==='pot')this.potted|=1<<event.ball.id;
    const width=balls.length*3;
    for(let i=0;i<balls.length;i++){
      const b=balls[i],at=this.head*width+i*3;
      this.frames[at]=b.x;this.frames[at+1]=b.y;this.frames[at+2]=Number(b.active&&!(this.potted&(1<<b.id)));
    }
    this.head=(this.head+1)%this.capacity;this.size=Math.min(this.size+1,this.capacity);
    const highlight=this.detector.observe(events);
    if(!highlight)return;
    const start=(this.head-this.size+this.capacity)%this.capacity;
    const frames=new Float32Array(this.size*width);
    const first=this.frames.subarray(start*width,Math.min(start+this.size,this.capacity)*width);
    frames.set(first);frames.set(this.frames.subarray(0,frames.length-first.length),first.length);
    this.clip=new ReplayClip(highlight,frames,this.ids,this.step);
  }

  finish(){
    const clip=this.clip;
    this.discard();
    return clip;
  }

  discard(){this.ids=[];this.clip=undefined;}
}
