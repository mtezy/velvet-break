export interface CueDesign {id:string;name:string;subtitle:string;description:string;shaft:string;butt:string;wrap:string;trim:string;accent:string;pattern:'grain'|'carbon'|'ivory'|'runes';}
export const CUE_DESIGNS:CueDesign[]=[
  {id:'ashborne',name:'Ashborne',subtitle:'Maple · brass · linen',description:'Flame maple, a hand-bound forest linen grip, brass joint rings and an emerald maker’s seal.',shaft:'#e0bd85',butt:'#69402e',wrap:'#244e43',trim:'#c9ab68',accent:'#8fc7a7',pattern:'grain'},
  {id:'nightglass',name:'Nightglass',subtitle:'Carbon · chrome · cyan',description:'A graphite shaft, woven carbon butt and chrome collars, cut with electric-blue inlays.',shaft:'#a7afa7',butt:'#182933',wrap:'#111a24',trim:'#99bac4',accent:'#6ce3e5',pattern:'carbon'},
  {id:'sunforge',name:'Sunforge',subtitle:'Amber · copper · runes',description:'Honey ash and dark leather with copper bindings, amber stones and gilded rune inlays.',shaft:'#eac18a',butt:'#824927',wrap:'#483024',trim:'#dba462',accent:'#ffb75d',pattern:'runes'},
  {id:'ivory-regent',name:'Ivory Regent',subtitle:'Ivory · gold · pearl',description:'An ivory-lacquered butt, pearl diamond inlays and gold rings around a midnight leather grip.',shaft:'#f0dec0',butt:'#e3ded1',wrap:'#202f34',trim:'#cfb370',accent:'#f8efd5',pattern:'ivory'},
  {id:'crimson-oath',name:'Crimson Oath',subtitle:'Rosewood · silver · ruby',description:'Deep rosewood points and garnet inlays, matched to a stitched oxblood wrap and silver ferrules.',shaft:'#dfb98b',butt:'#642536',wrap:'#3d1f2b',trim:'#b8b9c4',accent:'#ed8094',pattern:'grain'},
  {id:'aether',name:'Aether',subtitle:'Obsidian · violet · crystal',description:'Obsidian lacquer engraved with violet runes, a lilac-thread grip and faceted crystal accents.',shaft:'#ccc5cf',butt:'#292337',wrap:'#3c3150',trim:'#b9a7d8',accent:'#c79bff',pattern:'runes'},
];
export const getCueDesign=(id:string|null)=>CUE_DESIGNS.find(d=>d.id===id)??CUE_DESIGNS[0];
