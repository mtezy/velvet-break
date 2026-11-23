export const TABLE = { left: 90, top: 90, right: 1110, bottom: 570, radius: 12, pocketRadius: 27 };
export const POCKETS = [
  { x: 90, y: 90, name: 'top-left' }, { x: 600, y: 82, name: 'top-middle' },
  { x: 1110, y: 90, name: 'top-right' }, { x: 90, y: 570, name: 'bottom-left' },
  { x: 600, y: 578, name: 'bottom-middle' }, { x: 1110, y: 570, name: 'bottom-right' },
];
export const BALL_COLORS = ['#fcfbef', '#edb915', '#1549b0', '#bf2524', '#602b86', '#e36816', '#08704b', '#6b182c', '#10141b', '#edb915', '#1549b0', '#bf2524', '#602b86', '#e36816', '#08704b', '#6b182c'];
export interface Spin { x:number; y:number }
export function validSpin(value:unknown):value is Spin {
  if(!value||typeof value!=='object')return false;
  const s=value as Spin;return Number.isFinite(s.x)&&Number.isFinite(s.y)&&Math.abs(s.x)<=1&&Math.abs(s.y)<=1&&Math.hypot(s.x,s.y)<=1+1e-12;
}
export function clampSpin(spin:Spin):Spin {
  const x=Number.isFinite(spin.x)?Math.max(-1,Math.min(1,spin.x)):0,y=Number.isFinite(spin.y)?Math.max(-1,Math.min(1,spin.y)):0;
  const scale=Math.max(1,Math.hypot(x,y));return {x:x/scale,y:y/scale};
}
export interface Ball { id: number; x: number; y: number; vx: number; vy: number; active: boolean; banks: number; trail: {x: number; y: number}[]; spin?:Spin; spinContact?:boolean }
export interface PhysicsEvent { type: 'pot' | 'rail' | 'collision'; ball: Ball; otherBall?:Ball; pocket?: number; speed: number }
export function ball(id: number, x: number, y: number): Ball { return { id, x, y, vx: 0, vy: 0, active: true, banks: 0, trail: [], spin:{x:0,y:0}, spinContact:false }; }
export function moving(balls: Ball[]) { return balls.some(b => b.active && Math.hypot(b.vx, b.vy) > 0); }
export function strike(cue: Ball, angle: number, power: number, spin:Spin={x:0,y:0}) {
  cue.spin=clampSpin(spin);cue.spinContact=false;
  const speed = 180 + Math.max(0, Math.min(1, power)) * 1320;
  cue.vx = Math.cos(angle) * speed; cue.vy = Math.sin(angle) * speed;
}
export function simulate(balls: Ball[], dt: number): PhysicsEvent[] {
  const events: PhysicsEvent[] = [];
  const { left, right, top, bottom, radius: r, pocketRadius } = TABLE;
  for (const b of balls) {
    if (!b.active) continue;
    b.x += b.vx * dt; b.y += b.vy * dt;
    const speed = Math.hypot(b.vx, b.vy);
    if(b.id===0&&b.spin){const decay=Math.exp(-dt*(.45+speed/280));b.spin={x:b.spin.x*decay,y:b.spin.y*decay};}
    const pocket = POCKETS.findIndex(p => Math.hypot(b.x - p.x, b.y - p.y) < pocketRadius);
    if (pocket !== -1) { b.active = false; b.vx = b.vy = 0; events.push({type: 'pot', ball: b, pocket, speed}); continue; }
    let hit = false;
    const english=(nx:number,ny:number)=>{if(b.id!==0||!b.spin?.x)return;const kick=b.spin.x*Math.abs(b.vx*nx+b.vy*ny)*.38;b.vx+=-ny*kick;b.vy+=nx*kick;b.spin.x*=.55;};
    if(b.x<left+r)english(1,0);
    if(b.x>right-r)english(-1,0);
    if(b.y<top+r)english(0,1);
    if(b.y>bottom-r)english(0,-1);
    if (b.x < left + r) { b.x = left + r; b.vx = Math.abs(b.vx) * .82; hit = true; }
    if (b.x > right - r) { b.x = right - r; b.vx = -Math.abs(b.vx) * .82; hit = true; }
    if (b.y < top + r) { b.y = top + r; b.vy = Math.abs(b.vy) * .82; hit = true; }
    if (b.y > bottom - r) { b.y = bottom - r; b.vy = -Math.abs(b.vy) * .82; hit = true; }
    if (hit && speed > 20) { b.banks++; events.push({type: 'rail', ball: b, speed}); }
    if (speed > 0) {
      const next = Math.max(0, speed - (100 + speed * .37) * dt);
      if (next < 4) { b.vx = b.vy = 0; } else { b.vx *= next / speed; b.vy *= next / speed; }
    }
  }
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i]; if (!a.active) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j]; if (!b.active) continue;
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
      if (distance >= r * 2) continue;
      const nx = distance > .0001 ? dx / distance : 1, ny = distance > .0001 ? dy / distance : 0;
      const overlap = (r * 2 - distance + .001) / 2;
      a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
      const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (approach > 0) {
        const cue=a.id===0?a:b.id===0?b:undefined;
        const travel=cue?Math.hypot(cue.vx,cue.vy):0,ux=travel?cue!.vx/travel:0,uy=travel?cue!.vy/travel:0;
        const impulse = approach * .985;
        a.vx -= impulse * nx; a.vy -= impulse * ny; b.vx += impulse * nx; b.vy += impulse * ny;
        if(cue&&!cue.spinContact){const kick=(cue.spin?.y??0)*approach*.65;cue.vx+=ux*kick;cue.vy+=uy*kick;cue.spinContact=true;if(cue.spin)cue.spin.y=0;}
        events.push({type: 'collision', ball: b, otherBall:a, speed: approach});
      }
    }
  }
  return events;
}
export function respot(balls: Ball[]) {
  const cue = balls.find(b => b.id === 0)!;
  for (let x = 350; x < 1080; x += 35) for (let y = 330; y < 540; y += 35) {
    if (balls.every(b => !b.active || b.id === 0 || Math.hypot(b.x - x, b.y - y) > TABLE.radius * 2 + 4)) {
      Object.assign(cue, {x, y, vx: 0, vy: 0, active: true, trail: []}); return;
    }
  }
}
export function aimTrace(balls: Ball[], angle: number) {
  const cue = balls.find(b => b.id === 0)!;
  const dx = Math.cos(angle), dy = Math.sin(angle), r = TABLE.radius;
  let length = 1700, target: Ball | undefined;
  for (const b of balls) {
    if (!b.active || b.id === 0) continue;
    const x = b.x - cue.x, y = b.y - cue.y, projection = x * dx + y * dy;
    const perpendicular2 = x*x + y*y - projection*projection;
    if (projection <= 0 || perpendicular2 > 4*r*r) continue;
    const t = projection - Math.sqrt(Math.max(0, 4*r*r - perpendicular2));
    if (t >= 0 && t < length) { length = t; target = b; }
  }
  const tx = dx > 0 ? (TABLE.right-r-cue.x)/dx : dx < 0 ? (TABLE.left+r-cue.x)/dx : Infinity;
  const ty = dy > 0 ? (TABLE.bottom-r-cue.y)/dy : dy < 0 ? (TABLE.top+r-cue.y)/dy : Infinity;
  const wall = Math.min(tx,ty);
  if (wall < length) { length=wall; target=undefined; }
  return {x: cue.x + dx*length, y: cue.y + dy*length, target, length};
}
export function predictCuePath(balls:Ball[],angle:number,power:number,spin:Spin={x:0,y:0}):{x:number;y:number}[] {
  const original=balls.find(b=>b.id===0);
  if(!original?.active||!Number.isFinite(angle)||!Number.isFinite(power)||!validSpin(spin))return [];
  const trace=aimTrace(balls,angle);if(!trace.target)return [];
  const copies=balls.map(b=>({...b,spin:{...b.spin??{x:0,y:0}},trail:[]})),cue=copies.find(b=>b.id===0)!;
  strike(cue,angle,power,spin);
  const step=1/240;
  for(let i=0;i<2400;i++){
    const events=simulate(copies,step);
    if(events.some(e=>e.type==='rail'&&e.ball.id===0)||!cue.active)return [];
    if(cue.spinContact)break;
    if(!moving([cue]))return [];
  }
  if(!cue.spinContact)return [];
  cue.x=trace.x;cue.y=trace.y;
  const path=[{x:cue.x,y:cue.y}];let distance=0,bounces=0;
  for(let i=0;i<240&&distance<80&&moving([cue]);i++){
    const before={x:cue.x,y:cue.y},events=simulate([cue],step);
    if(!cue.active)break;
    const segment=Math.hypot(cue.x-before.x,cue.y-before.y),fraction=Math.min(1,(80-distance)/Math.max(segment,1e-9));
    path.push({x:before.x+(cue.x-before.x)*fraction,y:before.y+(cue.y-before.y)*fraction});distance+=segment;
    if(events.some(e=>e.type==='rail')&&++bounces>1)break;
  }
  return path;
}
