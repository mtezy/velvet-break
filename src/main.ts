import { og } from '@opengamehq/sdk';
import { missions } from './missions.ts';
import { TABLE, BALL_COLORS } from './physics.ts';
import { Session } from './session.ts';
import { type Particle } from './render.ts';
import { PoolRenderer } from './three-renderer.ts';
import { ClubAudio } from './audio.ts';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('game'),powerInput=$<HTMLInputElement>('power');
const renderer=new PoolRenderer(canvas);
const guide=$<HTMLDialogElement>('guide-dialog'),pauseDialog=$<HTMLDialogElement>('pause-dialog');
const audio=new ClubAudio();
interface Record {stars:number;shots:number;}
let records:(Record|null)[]=Array(12).fill(null);
try{const stored=JSON.parse(localStorage.getItem('velvet-break-v1')??'null');if(Array.isArray(stored))records=missions.map((_,i)=>{const r=stored[i];return r&&Number.isInteger(r.stars)&&r.stars>=1&&r.stars<=3&&Number.isInteger(r.shots)&&r.shots>0?{stars:r.stars,shots:r.shots}:null;});}catch{/* A private browsing session still gets the entire game. */}
let index=0,practice=false,session=new Session(missions[0]),angle=Math.atan2(-120,-250),power=.45,charging=false,chargeStarted=0;
let paused=false,hostPaused=false,lastFrame=performance.now(),accumulator=0,outcomeShown=false,particles:Particle[]=[],floatTimeout=0;
let pointerId:number|null=null,shotAngle=angle,keys=new Set<string>();
const fixedStep=1/240;
function save(){try{localStorage.setItem('velvet-break-v1',JSON.stringify(records));}catch{toast('Session saved in memory. Browser storage is unavailable.');}}
function renderMissions(){
  let act=0;
  $('missions').innerHTML=missions.map((m,i)=>{
    const heading=m.act!==act?`<p class="act-title">0${m.act} / ${m.chapter.toUpperCase()}</p>`:'';act=m.act;
    const record=records[i];
    return heading+`<button class="mission-button ${i===index&&!practice?'selected':''}" data-mission="${i}" aria-label="Mission ${i+1}: ${m.title}${record?`, ${record.stars} stars`:''}" ${i===index&&!practice?'aria-current="true"':''}><span class="mission-index">${record?'✓':String(i+1).padStart(2,'0')}</span><span><span class="mission-name">${m.title}</span><span class="mission-stars ${record?'earned':''}">${record?'✦'.repeat(record.stars)+'·'.repeat(3-record.stars):'· · ·'}</span></span>${i===index&&!practice?'<span class="mission-arrow">↗</span>':''}</button>`;
  }).join('');
  const completed=records.filter(Boolean).length;const stars=records.reduce((n,r)=>n+(r?.stars??0),0);
  $('mission-count').textContent=`${completed} / 12`;$('total-stars').textContent=String(stars);$('campaign-progress').style.width=`${completed/12*100}%`;
}
function loadMission(next:number,free=false){
  cancelCharge();index=next;practice=free;session=new Session(missions[next],free);particles=[];outcomeShown=false;accumulator=0;
  angle=next===0?Math.atan2(-120,-250):-Math.PI/4;power=.45;powerInput.value='45';
  $('result-overlay').classList.add('hidden');
  const m=missions[index];
  $('mission-number').textContent=practice?'∞':String(index+1).padStart(2,'0');
  $('mission-title').textContent=practice?'The open table':m.title;
  $('mission-chapter').textContent=practice?'NO PRESSURE / JUST POOL':`CHAPTER 0${m.act} / ${m.chapter.toUpperCase()}`;
  $('difficulty').textContent=practice?'FREE PLAY':m.difficulty.toUpperCase();
  $('objective').textContent=practice?'Clear the rack. Take your time.':m.objective;
  $('mission-tip').textContent=practice?'No timer, no shot limit. A full rack and a little room to experiment.':m.tip;
  $('campaign-nav').classList.toggle('active',!practice);$('practice-nav').classList.toggle('active',practice);
  const best=records[index];$('best-score').innerHTML=practice?'YOUR TABLE<br><b>∞</b>':`YOUR BEST<br><b>${best?'✦'.repeat(best.stars)+'·'.repeat(3-best.stars):'— — —'}</b>`;
  renderMissions();updateHud();
}
function updateHud(){
  $('shots-left').textContent=practice?'∞':String(session.remaining);
  $('shots-left').style.color=!practice&&session.remaining<=1?'var(--accent)':'';
  if(!practice&&session.mission.time){$('secondary-label').textContent='TIME LEFT';$('potted-count').textContent=`${Math.ceil(session.timeLeft)}s`;}
  else{$('secondary-label').textContent='POTTED';$('potted-count').innerHTML=`${session.potted.length} <i>/ ${session.total}</i>`;}
  const blocked=!session.canShoot||paused||hostPaused;
  $<HTMLButtonElement>('shoot-button').disabled=blocked;powerInput.disabled=blocked;
  $('power-value').textContent=`${Math.round(power*100)}%`;
  $('table-status').innerHTML=`<i></i> ${paused||hostPaused?'TAKE YOUR TIME.':session.inShot?'LET IT ROLL.':session.outcome==='playing'?'YOUR TABLE. YOUR MOVE.':session.outcome==='won'?'THAT’S HOW IT’S DONE.':'ANOTHER ANGLE. ANOTHER CHANCE.'}`;
}
function toast(text:string){clearTimeout(floatTimeout);$('floating-message').textContent=text;$('floating-message').classList.add('visible');floatTimeout=window.setTimeout(()=>$('floating-message').classList.remove('visible'),3200);}
function doShoot(value=power){
  if(paused||hostPaused||guide.open||pauseDialog.open)return;
  if(session.shoot(angle,value)){audio.shot(value);og.track('shot_taken',{mission:practice?0:index+1});updateHud();}
}
function cancelCharge(){charging=false;pointerId=null;keys.delete('Space');}
function startCharge(){if(!session.canShoot||paused||hostPaused||guide.open||pauseDialog.open)return;charging=true;shotAngle=angle;chargeStarted=performance.now();}
function finishCharge(){if(!charging)return;const elapsed=performance.now()-chargeStarted;charging=false;if(elapsed>140){angle=shotAngle;doShoot(power);}updateHud();}
function showResult(){
  if(outcomeShown)return;outcomeShown=true;cancelCharge();
  const won=session.outcome==='won';
  $('result-kicker').textContent=won?(index===11&&!practice?'WELCOME TO THE LEGENDS':'BEAUTIFULLY PLAYED'):'THE NIGHT ISN’T OVER';
  $('result-title').textContent=won?(practice?'A clean table.':index===11?'You own the table.':'Mission complete.'):'Find another angle.';
  $('result-description').textContent=session.reason;
  $('result-stars').textContent=won&&!practice?'✦'.repeat(session.stars)+'☆'.repeat(3-session.stars):won?'✦':'↻';
  $('next-mission').innerHTML=won&&!practice&&index<11?'Next mission <span>↗</span>':won&&!practice?'Back to the club <span>↗</span>':'Try again <span>↗</span>';
  $('result-retry').textContent=won?'Play again':'Back to campaign';
  $('result-overlay').classList.remove('hidden');
  if(won){audio.win();if(!practice){const old=records[index];if(!old||session.stars>old.stars||session.shots<old.shots){records[index]={stars:Math.max(old?.stars??0,session.stars),shots:Math.min(old?.shots??Infinity,session.shots)};save();}renderMissions();$('best-score').innerHTML=`YOUR BEST<br><b>${'✦'.repeat(records[index]!.stars)}</b>`;og.track('mission_complete',{mission:index+1,stars:session.stars,shots:session.shots});}}
  else og.track('mission_failed',{mission:index+1});
  updateHud();
}
function setPause(value:boolean){paused=value;cancelCharge();if(value&&!pauseDialog.open)pauseDialog.showModal();if(!value&&pauseDialog.open)pauseDialog.close();updateHud();}
function pointerPosition(e:PointerEvent){return renderer.pointer(e.clientX,e.clientY);}
canvas.addEventListener('pointermove',e=>{if(!session.canShoot||charging)return;const p=pointerPosition(e),cue=session.balls[0];angle=Math.atan2(p.y-cue.y,p.x-cue.x);});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!session.canShoot)return;const p=pointerPosition(e),cue=session.balls[0];if(Math.hypot(p.x-cue.x,p.y-cue.y)>TABLE.radius*2)angle=Math.atan2(p.y-cue.y,p.x-cue.x);canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointerId=e.pointerId;startCharge();});
canvas.addEventListener('pointerup',e=>{if(pointerId===e.pointerId){pointerId=null;finishCharge();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}});
canvas.addEventListener('pointercancel',cancelCharge);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
powerInput.addEventListener('input',()=>{power=Number(powerInput.value)/100;updateHud();});
$('shoot-button').addEventListener('click',()=>doShoot());
$('restart-button').addEventListener('click',()=>loadMission(index,practice));
$('missions').addEventListener('click',e=>{const btn=(e.target as HTMLElement).closest<HTMLElement>('[data-mission]');if(btn)loadMission(Number(btn.dataset.mission));});
$('next-mission').addEventListener('click',()=>loadMission(session.outcome==='won'&&!practice?(index+1)%12:index,practice));
$('result-retry').addEventListener('click',()=>loadMission(session.outcome==='won'?index:0,session.outcome==='won'&&practice));
$('campaign-nav').addEventListener('click',()=>loadMission(index));
$('practice-nav').addEventListener('click',()=>loadMission(index,true));
$('guide-nav').addEventListener('click',()=>{cancelCharge();guide.showModal();});
document.querySelector('.dialog-close')!.addEventListener('click',()=>guide.close());$('close-guide').addEventListener('click',()=>guide.close());
$('hint-button').addEventListener('click',()=>toast(practice?'Try a 70–90% break toward the head of the rack.':session.mission.tip));
$('sound-button').addEventListener('click',()=>{const enabled=audio.toggle();$('sound-state').textContent=enabled?'ON':'OFF';$('sound-button').setAttribute('aria-label',enabled?'Mute sound':'Enable sound');$('sound-button').style.color=enabled?'var(--accent)':'';});
$('fullscreen-button').addEventListener('click',()=>{if(og.env.embedded&&og.env.connected){og.fullscreen.request();}else if(document.fullscreenElement){void document.exitFullscreen().catch(()=>{});}else{void document.documentElement.requestFullscreen().catch(()=>toast('Fullscreen is not available in this preview.'));}});
$('resume-button').addEventListener('click',()=>setPause(false));
pauseDialog.addEventListener('cancel',e=>{e.preventDefault();setPause(false);});
window.addEventListener('keydown',e=>{
  if((e.target as HTMLElement).matches('input,textarea,select'))return;
  if(guide.open||pauseDialog.open){if(e.code==='KeyP'&&pauseDialog.open)setPause(false);return;}
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
  keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='Space')startCharge();
  if(e.code==='KeyR')loadMission(index,practice);
  if(e.code==='KeyP')setPause(!paused);
  if(e.code==='Escape')cancelCharge();
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')finishCharge();});
window.addEventListener('blur',()=>{cancelCharge();keys.clear();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelCharge();keys.clear();if(session.started&&session.outcome==='playing')setPause(true);}});
new ResizeObserver(()=>renderer.resize()).observe(canvas);
function frame(now:number){
  const realElapsed=Math.max(0,(now-lastFrame)/1000),elapsed=Math.min(realElapsed,.25);lastFrame=now;
  if(!paused&&!hostPaused&&!guide.open&&!pauseDialog.open){
    if(session.canShoot&&!charging){const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?.16:.8;if(keys.has('ArrowLeft'))angle-=elapsed*speed;if(keys.has('ArrowRight'))angle+=elapsed*speed;if(keys.has('ArrowUp'))power=Math.min(1,power+elapsed*.3);if(keys.has('ArrowDown'))power=Math.max(.1,power-elapsed*.3);}
    if(charging){power=Math.min(1,.1+(now-chargeStarted)/1400*.9);powerInput.value=String(Math.round(power*100));}
    session.advanceClock(realElapsed);
    accumulator+=elapsed;
    while(accumulator>=fixedStep){const events=session.tick(fixedStep,false);for(const e of events){if(e.type==='pot'){if(e.ball.id===0)toast(practice?'Scratch. Cue ball returns.':'Scratch. Cue ball returns. +1 shot penalty.');else{audio.pot();for(let i=0;i<15;i++)particles.push({x:e.ball.x,y:e.ball.y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,life:1,color:BALL_COLORS[e.ball.id]});}}else if(e.type==='collision')audio.hit(e.speed);}accumulator-=fixedStep;}
    for(const b of session.balls){if(Math.hypot(b.vx,b.vy)>40){b.trail.push({x:b.x,y:b.y});if(b.trail.length>9)b.trail.shift();}else b.trail.shift();}
    for(const p of particles){p.x+=p.vx*elapsed;p.y+=p.vy*elapsed;p.life-=elapsed*1.6;}particles=particles.filter(p=>p.life>0);
    if(session.outcome!=='playing')showResult();
  }
  renderer.render({balls:session.balls,angle,power,charge:charging?1:0,aiming:session.canShoot&&!paused&&!hostPaused,targetPocket:!practice&&session.mission.rule==='called'?session.mission.pocket:undefined,particles,time:now});
  updateHud();requestAnimationFrame(frame);
}
loadMission(0);requestAnimationFrame(frame);
// Platform handshake never blocks the first frame or standalone play.
void og.init().then(()=>{og.ready();og.onPause(value=>{hostPaused=value;cancelCharge();});og.audio.onHostMute(value=>{audio.hostMuted=value;});}).catch(()=>{});
