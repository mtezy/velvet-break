export const TABLE = { left: 90, top: 90, right: 1110, bottom: 570, radius: 12, pocketRadius: 27 };
export const POCKETS = [
  { x: 90, y: 90, name: 'top-left' }, { x: 600, y: 82, name: 'top-middle' },
  { x: 1110, y: 90, name: 'top-right' }, { x: 90, y: 570, name: 'bottom-left' },
  { x: 600, y: 578, name: 'bottom-middle' }, { x: 1110, y: 570, name: 'bottom-right' },
];
export const BALL_COLORS = ['#f7f6ee', '#f5c343', '#528afa', '#ee686d', '#ac7eec', '#f29951', '#39c5a0', '#d1548f', '#262b36', '#f5c343', '#528afa', '#ee686d', '#ac7eec', '#f29951', '#39c5a0', '#d1548f'];
export interface Ball { id: number; x: number; y: number; vx: number; vy: number; active: boolean; banks: number; trail: {x: number; y: number}[] }
export interface PhysicsEvent { type: 'pot' | 'rail' | 'collision'; ball: Ball; pocket?: number; speed: number }
export function ball(id: number, x: number, y: number): Ball { return { id, x, y, vx: 0, vy: 0, active: true, banks: 0, trail: [] }; }
export function moving(balls: Ball[]) { return balls.some(b => b.active && Math.hypot(b.vx, b.vy) > 0); }
export function strike(cue: Ball, angle: number, power: number) {
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
    const pocket = POCKETS.findIndex(p => Math.hypot(b.x - p.x, b.y - p.y) < pocketRadius);
    if (pocket !== -1) { b.active = false; b.vx = b.vy = 0; events.push({type: 'pot', ball: b, pocket, speed}); continue; }
    let hit = false;
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
        const impulse = approach * .985;
        a.vx -= impulse * nx; a.vy -= impulse * ny; b.vx += impulse * nx; b.vy += impulse * ny;
        if (approach > 12) events.push({type: 'collision', ball: b, speed: approach});
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
