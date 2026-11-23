import { BALL_COLORS, POCKETS, TABLE } from './physics.ts';
import { runeIcon } from './rune-icons.ts';
import type { Mission } from './missions.ts';
import type { MissionRecord } from './campaign-progress.ts';

const RULES:Record<string,string>={bank:'Bank shot',called:'Called pocket',order:'In order',eight:'8 ball last'};
const FELT=['#1f6b5f','#1d5f6e','#24506f','#5a2d43'];

export function missionRule(m:Mission){return m.time?`${m.time}s clock`:RULES[m.rule??'']??'Clear the table';}

export function missionStars(record:MissionRecord|null){
  const earned=record?.stars??0;
  return Array.from({length:3},(_,i)=>i<earned?`<i class="earned">${runeIcon('award')}</i>`:`<i>${runeIcon('award-empty')}</i>`).join('');
}

export function missionMap(m:Mission){
  const felt=FELT[(m.act-1)%FELT.length];
  const pockets=POCKETS.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="24"${m.rule==='called'&&m.pocket===i?' class="called"':''}/>`).join('');
  const balls=m.layout.map(([id,x,y])=>`<circle cx="${x}" cy="${y}" r="19" fill="${BALL_COLORS[id]}"${id===8?' class="eight"':''}/>`).join('');
  return `<svg viewBox="58 50 1084 560" aria-hidden="true" focusable="false"><rect x="62" y="62" width="1076" height="536" rx="30" class="rail"/><rect x="${TABLE.left}" y="${TABLE.top}" width="${TABLE.right-TABLE.left}" height="${TABLE.bottom-TABLE.top}" rx="6" fill="${felt}"/><path d="M600 120v420M330 330h540" class="rune-line"/><g class="pockets">${pockets}</g><g class="balls">${balls}</g></svg>`;
}

export function missionCardsHtml(list:readonly Mission[],records:readonly (MissionRecord|null)[],selected:number|null){
  const nextUp=records.findIndex(r=>!r);
  const acts=[...new Set(list.map(m=>m.act))];
  return acts.map(act=>{
    const entries=list.map((m,i)=>({m,i})).filter(e=>e.m.act===act);
    const stars=entries.reduce((n,e)=>n+(records[e.i]?.stars??0),0),max=entries.length*3;
    const cards=entries.map(({m,i})=>{
      const record=records[i],current=i===selected,next=i===nextUp;
      const status=record?`${record.stars} of 3 stars, best ${record.shots} ${record.shots===1?'shot':'shots'}, par ${m.par}`:`not played yet, par ${m.par}${next?', next up':''}`;
      const best=record?`Best ${record.shots} · par ${m.par}`:next?'Next up':`Par ${m.par}`;
      return `<button class="mission-card${current?' selected':''}${record?' cleared':''}${next?' next-up':''}" data-mission="${i}" aria-label="Mission ${i+1}: ${m.title}, ${m.difficulty}, ${missionRule(m)}, ${status}"${current?' aria-current="true"':''}><span class="card-map">${missionMap(m)}${record?`<span class="card-seal" aria-hidden="true">${runeIcon('verified')}</span>`:''}</span><span class="card-body"><span class="card-title"><span class="card-number">${String(i+1).padStart(2,'0')}</span>${m.title}</span><span class="card-rule">${m.difficulty} · ${missionRule(m)}</span><span class="card-foot"><span class="card-stars" aria-hidden="true">${missionStars(record)}</span><span class="card-best">${best}</span></span></span></button>`;
    }).join('');
    const crest=`<svg class="chapter-crest" viewBox="0 0 44 48" aria-hidden="true" focusable="false"><path d="m22 2 7 4 12 2v19c0 9-11 15-19 19C14 42 3 36 3 27V8l12-2Z" fill="url(#medal-gold)"/><path d="m22 7 6 3 9 2v15c0 6-8 12-15 15-7-3-15-9-15-15V12l9-2Z" fill="#18302c" stroke="#ffe3a0" stroke-width=".6"/><path d="m12 15 20 19m0-19L12 34" stroke="#b79a5e" stroke-width="1"/><circle cx="22" cy="24" r="10" fill="#142624" stroke="#b79a5e"/><text x="22" y="29" text-anchor="middle" fill="#f4d78c" font-family="Georgia,serif" font-size="15">${act}</text></svg>`;
    return `<section class="map-chapter" aria-label="Chapter ${act}: ${entries[0].m.chapter}, ${stars} of ${max} stars"><div class="map-chapter-head"><div class="chapter-label">${crest}<p class="act-title">0${act} / ${entries[0].m.chapter.toUpperCase()}</p></div><span class="map-chapter-stars">${runeIcon('award')} ${stars} / ${max}</span></div><div class="map-chapter-bar" aria-hidden="true"><i style="width:${stars/max*100}%"></i></div><div class="map-cards">${cards}</div></section>`;
  }).join('');
}
