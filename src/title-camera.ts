const period=40;
const sweep=15*Math.PI/180;

export function titleCameraPosition(seconds:number,aspect:number){
  const angle=Math.atan2(1100,1390)+Math.sin(seconds/period*2*Math.PI)*sweep;
  const fit=aspect<1?1.45:1;
  const radius=Math.hypot(1100,1390)*fit;
  return {x:Math.sin(angle)*radius,y:420*fit,z:Math.cos(angle)*radius};
}
