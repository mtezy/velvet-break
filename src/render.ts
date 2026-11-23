import { TABLE, POCKETS, BALL_COLORS, aimTrace, type Ball } from './physics.ts';
export interface Particle {x:number;y:number;vx:number;vy:number;life:number;color:string;}
export interface RenderState {balls:Ball[];angle:number;power:number;charge:number;aiming:boolean;targetPocket?:number;particles:Particle[];time:number;}
const ink = '#c5eedc';
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number,fill:string,stroke?:string) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function circle(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
export function drawBall(ctx:CanvasRenderingContext2D,b:Ball) {
  const r=TABLE.radius;
  ctx.save();ctx.shadowColor='#00000065';ctx.shadowBlur=9;ctx.shadowOffsetY=4;
  circle(ctx,b.x,b.y,r,BALL_COLORS[b.id]);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  if(b.id>8){ctx.save();ctx.beginPath();ctx.arc(b.x,b.y,r,0,Math.PI*2);ctx.clip();ctx.fillStyle='#f4f0e5';ctx.fillRect(b.x-r,b.y-r,2*r,5);ctx.fillRect(b.x-r,b.y+7,2*r,5);ctx.restore();}
  if(b.id!==0){circle(ctx,b.x,b.y,6.7,'#f7f5ea');ctx.fillStyle='#242633';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(b.id),b.x,b.y+.5);}
  ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(b.x-3,b.y-4,3,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();
  ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(b.x,b.y,r-1,.2,2.5);ctx.lineWidth=2;ctx.strokeStyle='#000000';ctx.stroke();ctx.restore();
}
let surface: HTMLCanvasElement | undefined;
function makeSurface(){
  surface=document.createElement('canvas');surface.width=1200;surface.height=660;
  const ctx=surface.getContext('2d')!;
  roundRect(ctx,23,21,1154,620,54,'#060c13');
  ctx.save();ctx.shadowBlur=30;ctx.shadowColor='#00000070';ctx.shadowOffsetY=12;
  roundRect(ctx,29,22,1142,608,48,'#22212c','#504637');ctx.restore();
  roundRect(ctx,36,29,1128,594,43,'#302c35','#5d5140');
  roundRect(ctx,43,36,1114,580,38,'#28262e');
  // Thin brass inlay and blackened walnut rails.
  ctx.lineWidth=1.5;ctx.strokeStyle='#a18c55';ctx.beginPath();ctx.roundRect(50,43,1100,566,32);ctx.stroke();
  roundRect(ctx,69,65,1062,530,26,'#072b29');
  roundRect(ctx,87,87,1026,486,11,'#176458');
  ctx.fillStyle='#1c6b5d';ctx.fillRect(95,100,1010,458);
  let seed=112;
  for(let i=0;i<14500;i++){seed=(seed*16807)%2147483647;const x=100+seed%1000;seed=(seed*16807)%2147483647;const y=102+seed%456;ctx.fillStyle=i%2?'#ffffff05':'#00000007';ctx.fillRect(x,y,1,1);}
  ctx.lineWidth=12;ctx.strokeStyle='#0e4b42';ctx.strokeRect(93,93,1014,474);
  ctx.lineWidth=2;ctx.strokeStyle='#368576';ctx.strokeRect(102,102,996,456);
  for(const p of POCKETS){circle(ctx,p.x,p.y,30,'#060b12');circle(ctx,p.x,p.y-2,24,'#02070c');ctx.beginPath();ctx.arc(p.x,p.y,30,.15,Math.PI-.15);ctx.strokeStyle='#4c4537';ctx.lineWidth=3;ctx.stroke();}
  for(const y of [59,599])for(const x of [220,410,790,980]){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#b3a476';ctx.fillRect(-2.3,-2.3,4.6,4.6);ctx.restore();}
  for(const x of [59,1141])for(const y of [210,330,450]){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#b3a476';ctx.fillRect(-2.3,-2.3,4.6,4.6);ctx.restore();}
  ctx.strokeStyle='#c8eddd19';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(350,109);ctx.lineTo(350,552);ctx.stroke();
  ctx.beginPath();ctx.arc(350,330,85,Math.PI/2,Math.PI*1.5);ctx.stroke();circle(ctx,350,330,2,'#a0c9b64d');circle(ctx,855,330,2,'#a0c9b64d');
  ctx.textAlign='center';ctx.fillStyle='#b0ddc31a';ctx.font='italic 32px Georgia';ctx.fillText('velvet club',655,325);ctx.font='9px Arial';ctx.fillText('A F T E R   H O U R S   •   S I N C E   2 0 2 6',655,345);
}
export function render(ctx:CanvasRenderingContext2D,state:RenderState) {
  if(!surface)makeSurface();ctx.clearRect(0,0,1200,660);ctx.drawImage(surface!,0,0);
  if(state.targetPocket!==undefined){const p=POCKETS[state.targetPocket];ctx.save();ctx.shadowBlur=18;ctx.shadowColor='#e8bd76';ctx.strokeStyle='#edc783';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,32,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#edc783';ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillText('CALLED POCKET',p.x,p.y<300?p.y+55:p.y-45);ctx.restore();}
  const cue=state.balls.find(b=>b.id===0)!;
  if(state.aiming&&cue.active){
    const trace=aimTrace(state.balls,state.angle);
    ctx.save();ctx.strokeStyle=ink;ctx.globalAlpha=.55;ctx.lineWidth=1.5;ctx.setLineDash([5,8]);ctx.beginPath();ctx.moveTo(cue.x,cue.y);ctx.lineTo(trace.x,trace.y);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(trace.x,trace.y,TABLE.radius,0,Math.PI*2);ctx.strokeStyle='#e1f5de';ctx.globalAlpha=.55;ctx.stroke();
    if(trace.target){const target=trace.target;const a=Math.atan2(target.y-trace.y,target.x-trace.x);ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(target.x,target.y);ctx.lineTo(target.x+Math.cos(a)*95,target.y+Math.sin(a)*95);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(target.x,target.y,18,0,Math.PI*2);ctx.strokeStyle='#f3ce8a';ctx.stroke();}
    ctx.restore();
    const pull=state.charge>0?state.power*70:0,dx=Math.cos(state.angle),dy=Math.sin(state.angle);
    ctx.save();ctx.translate(cue.x-dx*(28+pull),cue.y-dy*(28+pull));ctx.rotate(state.angle+Math.PI);
    roundRect(ctx,0,-2,192,4,2,'#b99c69');roundRect(ctx,78,-3,116,6,2,'#6b443d');roundRect(ctx,190,-3,5,6,1,'#22202b');roundRect(ctx,-3,-2.5,5,5,1,'#a0d7cf');ctx.restore();
    if(state.charge>0){ctx.save();ctx.strokeStyle='#efc780';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cue.x,cue.y,22,-Math.PI/2,-Math.PI/2+Math.PI*2*state.power);ctx.stroke();ctx.restore();}
  }
  for(const b of state.balls){
    if(!b.active)continue;
    for(let i=0;i<b.trail.length;i++){const p=b.trail[i];ctx.globalAlpha=(i/b.trail.length)*.12;circle(ctx,p.x,p.y,TABLE.radius*(i/b.trail.length),BALL_COLORS[b.id]);}
    ctx.globalAlpha=1;drawBall(ctx,b);
  }
  for(const p of state.particles){ctx.globalAlpha=p.life;circle(ctx,p.x,p.y,2.5*p.life+.5,p.color);}ctx.globalAlpha=1;
}
