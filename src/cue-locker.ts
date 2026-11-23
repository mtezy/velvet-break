import { CUE_DESIGNS, getCueDesign } from './cues.ts';
import type { PoolRenderer } from './three-renderer.ts';
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
export class CueLocker {
  selected=getCueDesign(null);
  constructor(public renderer:PoolRenderer){
    el('cue-collection').innerHTML=CUE_DESIGNS.map((d,i)=>`<button class="cue-design" data-cue="${d.id}" aria-pressed="false" style="--cue-shaft:${d.shaft};--cue-butt:${d.butt};--cue-wrap:${d.wrap};--cue-trim:${d.trim}"><span class="cue-mini" aria-hidden="true"></span><small>CRAFT 0${i+1}</small><strong>${d.name}</strong><em>${d.subtitle}</em><b class="cue-equipped">EQUIPPED</b></button>`).join('');
    let saved:string|null=null;try{saved=localStorage.getItem('velvet-break-cue-v1');}catch{}this.select(saved);
    el('cue-collection').addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('[data-cue]');if(button)this.select(button.dataset.cue!);});
    for(const name of ['tables','cues']){el(`vault-${name}-tab`).tabIndex=name==='tables'?0:-1;el(`vault-${name}-tab`).addEventListener('click',()=>{for(const tab of ['tables','cues']){el(`vault-${tab}-tab`).setAttribute('aria-selected',String(tab===name));el(`vault-${tab}-tab`).tabIndex=tab===name?0:-1;el(`vault-${tab}`).hidden=tab!==name;}this.inspect(false);});el(`vault-${name}-tab`).addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();const tab=el(`vault-${e.key==='Home'?'tables':e.key==='End'?'cues':name==='tables'?'cues':'tables'}-tab`);tab.click();tab.focus();}});}
    el('cue-inspect').addEventListener('click',()=>this.inspect(!renderer.cueInspection));
    el<HTMLInputElement>('cue-rotation').addEventListener('input',e=>{renderer.cueSpin=Number((e.target as HTMLInputElement).value)*Math.PI/180;renderer.dirty=true;el('cue-rotation-value').textContent=`${(e.target as HTMLInputElement).value}°`;});
    document.querySelector('.table-room')!.addEventListener('toggle',()=>{if(!document.querySelector<HTMLDetailsElement>('.table-room')!.open)this.inspect(false);});
    if(!renderer.renderer)el<HTMLButtonElement>('cue-inspect').disabled=true;
  }
  select(id:string|null){this.selected=getCueDesign(id);this.renderer.setCue(this.selected);el('cue-name').textContent=this.selected.name;el('cue-description').textContent=this.selected.description;for(const button of document.querySelectorAll<HTMLElement>('[data-cue]'))button.setAttribute('aria-pressed',String(button.dataset.cue===this.selected.id));try{localStorage.setItem('velvet-break-cue-v1',this.selected.id);}catch{}}
  inspect(value:boolean){this.renderer.cueInspection=value;this.renderer.dirty=true;el('cue-inspect').textContent=value?'Finish inspection':'Inspect cue in 3D';el('cue-inspect').setAttribute('aria-pressed',String(value));el('cue-inspection-controls').hidden=!value;document.body.classList.toggle('cue-inspecting',value);}
}
