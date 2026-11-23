export interface CameraSettings {azimuth:number;elevation:number;distance:number;targetX?:number;targetZ?:number;}
export const DEFAULT_CAMERA:CameraSettings={azimuth:4,elevation:53,distance:1350,targetX:0,targetZ:0};
/** Fit the rotated table, not its room, inside the available gameplay viewport. */
export function cameraFit(azimuth:number,elevation:number,aspect:number){
  const az=azimuth*Math.PI/180,el=elevation*Math.PI/180,c=Math.abs(Math.cos(az)),s=Math.abs(Math.sin(az));
  return Math.max(1,(1440*c+820*s)/(930*Math.max(.25,aspect)),(1440*s+820*c)*Math.sin(el)/930);
}
/** Saved browser data is untrusted; never let it put the camera inside or beyond the room. */
export function cameraSettings(value:unknown):CameraSettings|null{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const v=value as CameraSettings;
  if(![v.azimuth,v.elevation,v.distance].every(Number.isFinite)||Math.abs(v.azimuth)>180||v.elevation<25||v.elevation>90||v.distance<1100||v.distance>2600)return null;
  if(v.targetX!==undefined&&(!Number.isFinite(v.targetX)||Math.abs(v.targetX)>400))return null;
  if(v.targetZ!==undefined&&(!Number.isFinite(v.targetZ)||Math.abs(v.targetZ)>300))return null;
  return {azimuth:v.azimuth,elevation:v.elevation,distance:v.distance,...(v.targetX!==undefined?{targetX:v.targetX}:{}),...(v.targetZ!==undefined?{targetZ:v.targetZ}:{})};
}
