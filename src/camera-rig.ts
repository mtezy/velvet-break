import { cameraSettings, type CameraSettings } from './camera-settings.ts';
import type { PoolRenderer } from './three-renderer.ts';
import type { TableRoom } from './table-room.ts';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const axes=['azimuth','elevation','distance','targetX','targetZ'] as const;
export class CameraRig {
  saved:CameraSettings|null=null;
  constructor(public renderer:PoolRenderer,public room:TableRoom){
    room.onViewChange=()=>this.refresh();
    try{this.saved=cameraSettings(JSON.parse(localStorage.getItem('velvet-break-camera-v1')??'null'));}catch{}
    el<HTMLButtonElement>('view-custom').disabled=!this.saved||!renderer.renderer;
    if(this.saved){renderer.customCamera=this.saved;room.setView('custom');}
    el('camera-button').addEventListener('click',()=>{
      el('hud-view-options').hidePopover();
      el('camera-panel').hidden=false;el('camera-button').setAttribute('aria-expanded','true');
      document.querySelector<HTMLDetailsElement>('.table-room')!.open=false;document.body.classList.remove('missions-open','lobby-expanded');
      this.refresh();el('camera-close').focus();
    });
    el('camera-close').addEventListener('click',()=>{this.close();el('hud-view-button').focus();});
    for(const key of axes)el<HTMLInputElement>(`camera-${key}`).addEventListener('input',()=>{const value={azimuth:Number(el<HTMLInputElement>('camera-azimuth').value),elevation:Number(el<HTMLInputElement>('camera-elevation').value),distance:Number(el<HTMLInputElement>('camera-distance').value),targetX:Number(el<HTMLInputElement>('camera-targetX').value),targetZ:Number(el<HTMLInputElement>('camera-targetZ').value)};if(cameraSettings(value)){renderer.customCamera=value;room.setView('custom');this.refresh();el('camera-note').textContent='Position, angle and zoom are independent. Save your framing below.';}});
    for(const button of document.querySelectorAll<HTMLButtonElement>('[data-camera-preset]'))button.addEventListener('click',()=>{const preset=button.dataset.cameraPreset!;if(preset==='overhead')room.setView('overhead');else if(preset==='rail'){renderer.customCamera={azimuth:28,elevation:25,distance:1850};room.setView('custom');}else room.setView('club');this.refresh();});
    el('camera-save').addEventListener('click',()=>{this.saved=renderer.cameraSettings();renderer.customCamera=this.saved;room.setView('custom');el<HTMLButtonElement>('view-custom').disabled=false;try{localStorage.setItem('velvet-break-camera-v1',JSON.stringify(this.saved));el('camera-note').textContent='Angle saved. “My angle” restores it anytime.';}catch{el('camera-note').textContent='Angle saved for this visit. Browser storage is unavailable.';}this.refresh();});
    el('view-custom').addEventListener('click',()=>{if(this.saved){renderer.customCamera=this.saved;room.setView('custom');this.refresh();}});
    el('camera-centre').addEventListener('click',()=>{renderer.customCamera={...renderer.cameraSettings(),targetX:0,targetZ:0};room.setView('custom');this.refresh();el('camera-note').textContent='Table centred. Angle and zoom kept.';});
    renderer.controls?.addEventListener('end',()=>this.refresh());
    if(!renderer.renderer)el<HTMLButtonElement>('camera-button').disabled=true;
  }
  refresh(){const pose=this.renderer.cameraSettings();for(const key of axes){const value=Math.round(pose[key]??0);el<HTMLInputElement>(`camera-${key}`).value=String(value);el(`camera-${key}-value`).textContent=key==='distance'?`${Math.round(pose.distance/13.5)}%`:key==='targetX'||key==='targetZ'?value===0?'Centred':String(value):`${value}°`;}}
  close(){el('camera-panel').hidden=true;el('camera-button').setAttribute('aria-expanded','false');}
}
