export const BALL_LABEL_SCALE=13.5;
const MOBILE_LABEL_PIXELS=16;

export interface ProjectedBallLabel { x:number; y:number; pixelsPerUnit:number; }

export function mobileBallLabelScale(label:ProjectedBallLabel,neighbors:readonly ProjectedBallLabel[]){
  let spacingSquared=MOBILE_LABEL_PIXELS**2;
  for(const other of neighbors){
    if(other===label)continue;
    spacingSquared=Math.min(spacingSquared,(label.x-other.x)**2+(label.y-other.y)**2);
  }
  return Math.max(BALL_LABEL_SCALE,Math.sqrt(spacingSquared)/label.pixelsPerUnit);
}
