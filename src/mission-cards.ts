import { BALL_COLORS, POCKETS, TABLE } from './physics.ts';
import type { Mission } from './missions.ts';
import type { MissionRecord } from './campaign-progress.ts';

const RULES:Record<string,string>={bank:'Bank shot',called:'Called pocket',order:'In order',eight:'8 ball last'};
const FELT=['#1f6b5f','#1d5f6e','#24506f','#5a2d43'];

export function missionRule(m:Mission){return m.time?`${m.time}s clock`:RULES[m.rule??'']??'Clear the table';}

export function missionStars(record:MissionRecord|null){
  const earned=record?.stars??0;
  return Array.from({length:3},(_,i)=>`<i${i<earned?' class="earned"':''}>✦</i>`).join('');
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
      const status=record?`${record.stars} of 3 stars, best ${record.shots} ${record.shots===1?'shot':'shots'}`:'not played yet';
      const best=record?`Best ${record.shots} · par ${m.par}`:next?'Next up':`Par ${m.par}`;
      return `<button class="mission-card${current?' selected':''}${record?' cleared':''}${next?' next-up':''}" data-mission="${i}" aria-label="Mission ${i+1}: ${m.title}, ${m.difficulty}, ${missionRule(m)}, ${status}"${current?' aria-current="true"':''}><span class="card-map">${missionMap(m)}${record?'<span class="card-seal" aria-hidden="true">✓</span>':''}</span><span class="card-body"><span class="card-title"><span class="card-number">${String(i+1).padStart(2,'0')}</span>${m.title}</span><span class="card-rule">${m.difficulty} · ${missionRule(m)}</span><span class="card-foot"><span class="card-stars" aria-hidden="true">${missionStars(record)}</span><span class="card-best">${best}</span></span></span></button>`;
    }).join('');
    return `<section class="map-chapter" aria-label="Chapter ${act}: ${entries[0].m.chapter}, ${stars} of ${max} stars"><div class="map-chapter-head"><p class="act-title">0${act} / ${entries[0].m.chapter.toUpperCase()}</p><span class="map-chapter-stars">✦ ${stars} / ${max}</span></div><div class="map-chapter-bar" aria-hidden="true"><i style="width:${stars/max*100}%"></i></div><div class="map-cards">${cards}</div></section>`;
  }).join('');
}
