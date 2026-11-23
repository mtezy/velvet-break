import { getTableDesign, TABLE_DESIGNS, type TableDesign } from './tables.ts';
import type { PoolRenderer } from './three-renderer.ts';

const element=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
export class TableRoom {
  selected=getTableDesign(null);onSelect?:(design:TableDesign)=>void;
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
  }
  select(id:string,notify=false){
    this.selected=getTableDesign(id);this.renderer.setTable(this.selected);
    for(const button of document.querySelectorAll<HTMLButtonElement>('[data-table]'))button.setAttribute('aria-pressed',String(button.dataset.table===this.selected.id));
    element('table-name').textContent=this.selected.name;element('table-description').textContent=this.selected.description;
    try{localStorage.setItem('velvet-break-table-v1',this.selected.id);}catch{}
    if(notify)this.onSelect?.(this.selected);
  }
  setView(view:'club'|'overhead'){
    this.renderer.setView(view);for(const v of ['club','overhead'])element(`view-${v}`).setAttribute('aria-pressed',String(view===v));
  }
  setLocked(locked:boolean){for(const button of document.querySelectorAll<HTMLButtonElement>('[data-table]'))button.disabled=locked;}
}
