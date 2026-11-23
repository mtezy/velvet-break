export interface CameraSettings {azimuth:number;elevation:number;distance:number;}
export const DEFAULT_CAMERA:CameraSettings={azimuth:13,elevation:30,distance:1640};
/** Saved browser data is untrusted; never let it put the camera inside or beyond the room. */
export function cameraSettings(value:unknown):CameraSettings|null{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const v=value as CameraSettings;
  if(![v.azimuth,v.elevation,v.distance].every(Number.isFinite)||Math.abs(v.azimuth)>180||v.elevation<25||v.elevation>82||v.distance<1100||v.distance>2600)return null;
  return {azimuth:v.azimuth,elevation:v.elevation,distance:v.distance};
}
