export type TableArchitecture = 'turned' | 'trestle' | 'pedestal' | 'columns' | 'retro' | 'monolith' | 'beams' | 'arena';
export interface TableDesign {
  id:string; name:string; subtitle:string; description:string; architecture:TableArchitecture;
  felt:string; cushion:string; cabinet:string; grain:string; trim:string; floor:string;
  light:string; pattern:'wood'|'carbon'|'stone'|'lacquer'; emblem:string; neon:boolean;
}

/** Cosmetic builds share regulation collision bounds, so every mission plays identically. */
export const TABLE_DESIGNS:readonly TableDesign[] = [
  {id:'heritage',name:'The Heritage',subtitle:'Walnut / tournament green',description:'Carved walnut cabinet, turned legs and warm brass hardware. The original club classic.',architecture:'turned',felt:'#166454',cushion:'#0b3a30',cabinet:'#573322',grain:'#9a6841',trim:'#c9a363',floor:'#24201d',light:'#f3cc91',pattern:'wood',emblem:'VELVET CLUB',neon:false},
  {id:'afterglow',name:'Afterglow',subtitle:'Carbon / electric violet',description:'Split carbon rails, violet cloth and cyan light strips on an open steel trestle.',architecture:'trestle',felt:'#553180',cushion:'#291b4c',cabinet:'#171c2a',grain:'#41485b',trim:'#60e4ec',floor:'#141b29',light:'#9c91ff',pattern:'carbon',emblem:'AFTERGLOW',neon:true},
  {id:'glacier',name:'Glacier',subtitle:'Porcelain / arctic blue',description:'A sculpted twin-pedestal chassis with porcelain rails and satin-chrome edgework.',architecture:'pedestal',felt:'#327d99',cushion:'#1e4b66',cabinet:'#c3cbd0',grain:'#eef5f5',trim:'#91c9df',floor:'#202c35',light:'#b9edff',pattern:'stone',emblem:'G L A C I E R',neon:false},
  {id:'sovereign',name:'Sovereign',subtitle:'Oxblood / antique gold',description:'An oxblood salon table with fluted columns, inset panels and a gold-banded apron.',architecture:'columns',felt:'#7d243c',cushion:'#49182c',cabinet:'#24192b',grain:'#5b3652',trim:'#d5af54',floor:'#241b27',light:'#f3d496',pattern:'lacquer',emblem:'THE SOVEREIGN',neon:false},
  {id:'desert',name:'Desert Social',subtitle:'Teak / burnt orange',description:'Mid-century teak, flared legs and cream racing inlays, made for golden-hour pool.',architecture:'retro',felt:'#a1502e',cushion:'#673422',cabinet:'#9a6039',grain:'#db9c60',trim:'#f3dfb8',floor:'#30251e',light:'#ffbc82',pattern:'wood',emblem:'DESERT SOCIAL',neon:false},
  {id:'obsidian',name:'Obsidian',subtitle:'Black marble / midnight',description:'A deep monolithic plinth, veined black-stone rails and razor-thin copper detailing.',architecture:'monolith',felt:'#293d5c',cushion:'#16243a',cabinet:'#141920',grain:'#6b737c',trim:'#c08058',floor:'#171c24',light:'#93b9e6',pattern:'stone',emblem:'O B S I D I A N',neon:false},
  {id:'kyoto',name:'Kyoto House',subtitle:'Ash / sakura rose',description:'An exposed ash beam frame, cross braces and rose cloth with a quiet Japanese joinery silhouette.',architecture:'beams',felt:'#985169',cushion:'#5c3043',cabinet:'#ac8159',grain:'#e2bc8e',trim:'#31363b',floor:'#29262a',light:'#ffd7d0',pattern:'wood',emblem:'KYOTO HOUSE',neon:false},
  {id:'apex',name:'Apex Arena',subtitle:'Brushed alloy / pro blue',description:'A competition-blue surface on angular alloy supports, with illuminated tournament rail inserts.',architecture:'arena',felt:'#185c9c',cushion:'#0d345c',cabinet:'#253b4d',grain:'#607688',trim:'#83e6b0',floor:'#15212c',light:'#88c5ff',pattern:'carbon',emblem:'A P E X   A R E N A',neon:true},
];
export function getTableDesign(id:string|null|undefined):TableDesign {
  return TABLE_DESIGNS.find(table=>table.id===id)??TABLE_DESIGNS[0];
}
