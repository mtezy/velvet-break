import { getTableDesign, TABLE_DESIGNS, type TableDesign } from './tables.ts';
import type { PoolRenderer } from './three-renderer.ts';

const element=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
export class TableRoom {
  selected=getTableDesign(null);onSelect?:(design:TableDesign)=>void;onViewChange?:()=>void;
  constructor(public renderer:PoolRenderer){
    const collection=element('table-collection');
    collection.innerHTML=TABLE_DESIGNS.map((d,i)=>`<button class="table-design" data-table="${d.id}" aria-pressed="false" style="--felt:${d.felt};--wood:${d.cabinet};--metal:${d.trim}"><span class="table-mini" aria-hidden="true"><i></i><b>ᛟ</b></span><span><small>RELIC 0${i+1}</small><strong>${d.name}</strong><em>${d.subtitle}</em></span><span class="design-check" aria-hidden="true">◇</span></button>`).join('');
    collection.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-table]');if(button&&!button.disabled)this.select(button.dataset.table!,true);});
    let saved:string|null=null;try{saved=localStorage.getItem('velvet-break-table-v1');}catch{}
    this.select(getTableDesign(saved).id);
    for(const view of ['club','overhead'] as const)element(`view-${view}`).addEventListener('click',()=>this.setView(view));
    element('view-reset').addEventListener('click',()=>this.setView('club'));
    if(!renderer.renderer){for(const id of ['view-club','view-overhead','view-reset'])element<HTMLButtonElement>(id).disabled=true;element('camera-hint').textContent='2D compatibility view · table colors still available';}
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let effects=!reduced;
    try{const stored=localStorage.getItem('velvet-break-fx-v1');if(stored!==null)effects=stored==='on'&&!reduced;}catch{}
    const updateEffects=()=>{renderer.effects=effects;element('effects-button').setAttribute('aria-pressed',String(effects));element('effects-button').textContent=effects?'Effects on':'Effects off';document.body.classList.toggle('effects-off',!effects);};
    updateEffects();element('effects-button').addEventListener('click',()=>{effects=!effects;updateEffects();try{localStorage.setItem('velvet-break-fx-v1',effects?'on':'off');}catch{}});
    try{renderer.labels=localStorage.getItem('velvet-break-labels-v1')!=='off';}catch{}
    const updateLabels=()=>{renderer.dirty=true;element('labels-button').setAttribute('aria-pressed',String(renderer.labels));element('labels-button').textContent=renderer.labels?'Numbers on':'Numbers off';};updateLabels();
    element('labels-button').addEventListener('click',()=>{renderer.labels=!renderer.labels;updateLabels();try{localStorage.setItem('velvet-break-labels-v1',renderer.labels?'on':'off');}catch{}});
    let quality:'auto'|'high'|'economy'='auto';try{const saved=localStorage.getItem('velvet-break-quality-v1');if(saved==='high'||saved==='economy')quality=saved;}catch{}
    const updateQuality=()=>{renderer.setQuality(quality);element('quality-button').textContent=`Quality: ${quality[0].toUpperCase()+quality.slice(1)}`;element('quality-button').setAttribute('aria-label',`Rendering quality ${quality}. Click to change.`);};updateQuality();
    element('quality-button').addEventListener('click',()=>{quality=quality==='auto'?'high':quality==='high'?'economy':'auto';updateQuality();try{localStorage.setItem('velvet-break-quality-v1',quality);}catch{}});
  }
  select(id:string,notify=false){
    this.selected=getTableDesign(id);this.renderer.setTable(this.selected);
    for(const button of document.querySelectorAll<HTMLButtonElement>('[data-table]'))button.setAttribute('aria-pressed',String(button.dataset.table===this.selected.id));
    element('table-name').textContent=this.selected.name;element('table-description').textContent=this.selected.description;
    try{localStorage.setItem('velvet-break-table-v1',this.selected.id);}catch{}
    if(notify)this.onSelect?.(this.selected);
  }
  setView(view:'club'|'overhead'|'custom'){
    this.renderer.setView(view);for(const v of ['club','overhead','custom'])element(`view-${v}`).setAttribute('aria-pressed',String(view===v));
    this.onViewChange?.();
  }
  setLocked(locked:boolean){for(const button of document.querySelectorAll<HTMLButtonElement>('[data-table]'))button.disabled=locked;}
}
