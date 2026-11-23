import { og } from '@opengamehq/sdk';
import { missions, practiceLayout } from './missions.ts';
import { missionCardsHtml } from './mission-cards.ts';
import { TABLE, POCKETS, BALL_COLORS, clampSpin, type Spin } from './physics.ts';
import { Session } from './session.ts';
import { type Particle } from './render.ts';
import { PoolRenderer } from './three-renderer.ts';
import { TableRoom } from './table-room.ts';
import { OnlineGame } from './online.ts';
import { VS_RULES } from './versus.ts';
import { ClubAudio } from './audio.ts';
import { TABLE_DESIGNS } from './tables.ts';
import { CameraRig } from './camera-rig.ts';
import { CueLocker } from './cue-locker.ts';
import { OfflineGame } from './offline.ts';
import { seededRandom, type CpuDifficulty } from './cpu.ts';
import { setupOnboarding } from './onboarding.ts';
import { CAMPAIGN_STORAGE_KEY, bestMissionRecord, readCampaignProgress, type MissionRecord } from './campaign-progress.ts';
import { DailyLeaderboard, dailyBoardKey, dailyDate, dailyDay, dailyMission, dailyScore } from './daily.ts';
import { ShotRecorder, type ReplayClip } from './shot-replay.ts';
import { runeIcon, runeStars } from './rune-icons.ts';
import manifest from '../opengame.json';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const canvas=$<HTMLCanvasElement>('game'),powerInput=$<HTMLInputElement>('power');
const viewOptions=$('hud-view-options');
const renderer=new PoolRenderer(canvas);
const room=new TableRoom(renderer);
const cameraRig=new CameraRig(renderer,room),cueLocker=new CueLocker(renderer);
viewOptions.addEventListener('beforetoggle',e=>{if((e as ToggleEvent).newState==='open')cameraRig.close();});
let online:OnlineGame|undefined;
let offline:OfflineGame|undefined,cpuResultShown=false;
const cpuDialog=$<HTMLDialogElement>('cpu-dialog');
const dailyDialog=$<HTMLDialogElement>('daily-dialog');
const guide=$<HTMLDialogElement>('guide-dialog'),pauseDialog=$<HTMLDialogElement>('pause-dialog');
const onboarding=$<HTMLDialogElement>('onboarding-dialog');
const audio=new ClubAudio();
let records:(MissionRecord|null)[]=Array(missions.length).fill(null);
try{records=readCampaignProgress(localStorage.getItem(CAMPAIGN_STORAGE_KEY),missions.length);}catch{/* A private browsing session still gets the entire game. */}
let index=0,practice=false,challengeDay:number|undefined,session=new Session(missions[0]),angle=Math.atan2(-120,-250),power=.45,charging=false,chargeStarted=0;
let paused=false,hostPaused=false,lastFrame=performance.now(),accumulator=0,outcomeShown=false,particles:Particle[]=[],floatTimeout=0;
let pointerId:number|null=null,shotAngle=angle,keys=new Set<string>();
const fixedStep=1/240;
const replayRecorder=new ShotRecorder(fixedStep),replayDialog=$<HTMLDialogElement>('shot-replay');
const replayToggle=$<HTMLButtonElement>('replay-toggle'),replayPreference='velvet-break-shot-replay-v1';
let replayEnabled=!matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const value=localStorage.getItem(replayPreference);if(value!==null)replayEnabled=value==='on';}catch{}
let replay:ReplayClip|undefined,replayStarted=0,skipKey='';
function updateReplayToggle(){
  replayToggle.textContent=replayEnabled?'Replay on':'Replay off';
  replayToggle.setAttribute('aria-pressed',String(replayEnabled));
}
updateReplayToggle();
replayToggle.addEventListener('click',()=>{
  replayEnabled=!replayEnabled;
  if(!replayEnabled)replayRecorder.discard();
  try{localStorage.setItem(replayPreference,replayEnabled?'on':'off');}catch{}
  updateReplayToggle();
});
let lastHud='',onlineResultShown=false;
let titleOpen=true,shotPotCount=0;const titleBalls=practiceLayout();
let spin:Spin={x:0,y:0};
const dailyLeaderboard=new DailyLeaderboard(()=>localStorage,async()=>{
  await platformReady;
  return og.capabilities.includes('leaderboards')?og.leaderboard(dailyBoardKey):null;
});
function setSpin(value:Spin){
  spin=clampSpin(value);const dot=$('spin-dot');dot.style.left=`${50+spin.x*43}%`;dot.style.top=`${50-spin.y*43}%`;
  $('spin-value').textContent=Math.hypot(spin.x,spin.y)<.01?'Centre':`${spin.x<0?'L':'R'}${Math.round(Math.abs(spin.x)*100)} ${spin.y<0?'D':'F'}${Math.round(Math.abs(spin.y)*100)}`;
}
const spinPicker=$<HTMLButtonElement>('spin-picker');
function pickSpin(e:PointerEvent){const r=spinPicker.getBoundingClientRect();setSpin({x:(e.clientX-r.left-r.width/2)/(r.width*.43),y:(r.top+r.height/2-e.clientY)/(r.height*.43)});}
spinPicker.addEventListener('pointerdown',e=>{if(e.button!==0)return;spinPicker.setPointerCapture(e.pointerId);pickSpin(e);});
spinPicker.addEventListener('pointermove',e=>{if(spinPicker.hasPointerCapture(e.pointerId))pickSpin(e);});
spinPicker.addEventListener('pointerup',e=>{if(spinPicker.hasPointerCapture(e.pointerId))spinPicker.releasePointerCapture(e.pointerId);});
$('spin-reset').addEventListener('click',()=>setSpin({x:0,y:0}));
const currentBalls=()=>offline?offline.match.balls:online?.active&&online.match?online.match.balls:session.balls;
const versusMatch=()=>offline?.match??(online?.active?online.match:null);
const canChooseRule=()=>!titleOpen&&!paused&&!hostPaused&&!renderer.cueInspection&&(offline?offline.match.turn===0:!!online?.canChooseRule);
const canShoot=()=>!titleOpen&&!renderer.cueInspection&&(offline?offline.canShoot:online?.active?online.canShoot:session.canShoot);
function startOffline(){
  replayRecorder.discard();
  if(online?.active)online.leave();cancelCharge();paused=false;hostPaused=false;
  setTitle(false);cameraRig.close();cueLocker.inspect(false);
  if(pauseDialog.open)pauseDialog.close();cpuDialog.close();
  offline=new OfflineGame($<HTMLSelectElement>('cpu-rules').value==='9-ball'?'9-ball':'8-ball',$<HTMLSelectElement>('cpu-difficulty').value as CpuDifficulty,seededRandom(Date.now()),shotEffect);
  const cue=offline.match.balls[0],apex=offline.match.balls.find(b=>b.id===1)!;
  cpuResultShown=false;particles=[];accumulator=0;angle=Math.atan2(apex.y-cue.y-TABLE.radius*.4,apex.x-cue.x);power=.9;powerInput.value='90';setSpin({x:0,y:0});
  $('result-overlay').classList.add('hidden');lastHud='';updateHud();
}
function restartCurrent(){if(offline)startOffline();else loadMission(index,practice,challengeDay===undefined?undefined:dailyDay());}
function setTitle(value:boolean){
  if(value&&online?.active){toast('Leave the online room before returning to the title.');return;}
  viewOptions.hidePopover();
  renderer.clearHighlights();
  cancelCharge();keys.clear();titleOpen=value;document.body.classList.toggle('title-open',value);renderer.setTitleMode(value);
  cameraRig.close();cueLocker.inspect(false);
  $('title-table-name').textContent=room.selected.name;$('title-play').innerHTML=`<span>01</span> ${session.started?'Return to the table':'Enter the guild'} <b>${runeIcon('forward')}</b>`;
  document.body.classList.remove('missions-open','lobby-expanded');document.querySelector<HTMLDetailsElement>('.table-room')!.open=false;
  if(!value){paused=false;if(pauseDialog.open)pauseDialog.close();canvas.focus({preventScroll:true});}lastHud='';updateHud();
}
function shotEffect(value:number,opening=(versusMatch()?.shots??(practice?session.shots:0))===1){
  shotPotCount=0;
  if(replayEnabled&&!online?.active)replayRecorder.start(currentBalls());
  audio.shot(value);const cue=currentBalls()[0];renderer.pulse(cue.x,cue.y,room.selected.trim,35+value*45,.45);
  if(opening)renderer.highlightBreak();
  if(renderer.effects){const card=document.querySelector('.table-card')!;card.classList.remove('portal-flash');requestAnimationFrame(()=>card.classList.add('portal-flash'));}
}
function handleEvents(events:import('./physics.ts').PhysicsEvent[],playSound=true){
  for(const e of events){
    if(playSound)audio.impact(e);
    if(e.type==='pot'){
      if(e.ball.id===0)toast(versusMatch()?'Scratch.':practice?'Scratch. Cue ball returns.':'Scratch. Cue ball returns. +1 shot penalty.');
      else{shotPotCount++;if(e.ball.banks>0)toast('Bank shot! Beautifully played.');else if(shotPotCount===2)toast('Double pot! Precision in motion.');renderer.highlightPocket(e,room.selected.trim);renderer.pulse(e.ball.x,e.ball.y,room.selected.trim,85,.85);if(renderer.effects)for(let i=0;i<22;i++)particles.push({x:e.ball.x,y:e.ball.y,vx:(Math.random()-.5)*180,vy:(Math.random()-.5)*180,life:1,color:i%3?BALL_COLORS[e.ball.id]:room.selected.trim});}
    }else if(e.type==='collision'||e.type==='rail'){
      if(e.speed>110&&renderer.effects){renderer.pulse(e.ball.x,e.ball.y,e.type==='rail'?room.selected.trim:'#e9f6e9',e.type==='rail'?26:18,.28);for(let i=0;i<4;i++)particles.push({x:e.ball.x,y:e.ball.y,vx:(Math.random()-.5)*80,vy:(Math.random()-.5)*80,life:.55,color:room.selected.trim});}
    }
  }
}
function save(){try{localStorage.setItem(CAMPAIGN_STORAGE_KEY,JSON.stringify(records));}catch{toast('Session saved in memory. Browser storage is unavailable.');}}
function renderMissionBest(){
  const best=records[index];$('best-score').innerHTML=`YOUR BEST<br><b role="img" aria-label="${best?`${best.stars} of 3 stars`:'No score yet'}">${runeStars(best?.stars??0)}</b>`;
}
function renderDailyBest(day:number){$('best-score').innerHTML=`TODAY’S BEST<br><b>${dailyLeaderboard.best(day)??'—'}</b>`;}
function currentTip(){
  const m=session.mission;
  if(practice)return 'No timer, no shot limit. A full rack and a little room to experiment.';
  return challengeDay===undefined?`${m.tip} Finish in ${m.par} ${m.par===1?'shot':'shots'} or fewer for 3 stars.`:m.tip;
}
function renderMissions(){
  const campaign=!practice&&challengeDay===undefined;
  $('missions').innerHTML=missionCardsHtml(missions,records,campaign?index:null);
  const completed=records.filter(Boolean).length;const stars=records.reduce((n,r)=>n+(r?.stars??0),0);
  $('mission-count').textContent=`${completed} / 12`;$('total-stars').textContent=String(stars);$('campaign-progress').style.width=`${completed/12*100}%`;
}
function loadMission(next:number,free=false,day?:number){
  replayRecorder.discard();
  renderer.clearHighlights();
  cameraRig.close();cueLocker.inspect(false);
  document.body.classList.remove('missions-open','lobby-expanded');document.querySelector<HTMLDetailsElement>('.table-room')!.open=false;
  offline=undefined;$('cpu-nav').classList.remove('active');
  if(online?.active)online.leave();
  const m=day===undefined?missions[next]:dailyMission(day);
  cancelCharge();setSpin({x:0,y:0});index=next;practice=free;challengeDay=day;session=new Session(m,free);particles=[];outcomeShown=false;accumulator=0;
  const [cue,target]=session.balls;
  angle=day!==undefined?Math.atan2(target.y-cue.y,target.x-cue.x):next===0?Math.atan2(-120,-250):-Math.PI/4;power=.45;powerInput.value='45';
  $('result-overlay').classList.add('hidden');$('result-overlay').classList.remove('rune-victory');
  $('mission-number').innerHTML=day!==undefined?runeIcon('award'):practice?runeIcon('unlimited'):String(index+1).padStart(2,'0');
  $('mission-title').textContent=practice?'The open table':m.title;
  $('mission-chapter').textContent=day!==undefined?`${m.chapter} / UTC DAILY TABLE`:practice?'NO PRESSURE / JUST POOL':`CHAPTER 0${m.act} / ${m.chapter.toUpperCase()}`;
  $('difficulty').textContent=practice?'FREE PLAY':m.difficulty.toUpperCase();
  $('objective').textContent=practice?'Clear the rack. Take your time.':m.objective;
  $('mission-tip').textContent=currentTip();
  $('campaign-nav').classList.toggle('active',!practice&&day===undefined);$('practice-nav').classList.toggle('active',practice);$('daily-nav').classList.toggle('active',day!==undefined);
  if(day!==undefined)renderDailyBest(day);else if(practice)$('best-score').innerHTML=`YOUR TABLE<br><b>${runeIcon('unlimited')}</b>`;else renderMissionBest();
  renderMissions();lastHud='';updateHud();
}
function updateHud(){
  const duel=versusMatch();
  const signature=[titleOpen,renderer.cueInspection,offline?.phase,offline?.difficulty,duel?.reason,duel?.calledPocket,duel?.pushOut,duel?.fouls.join(),duel?.kitchen,online?.active,online?.connected,online?.pending,duel?.turn,duel?.shots,duel?.inShot,duel?.ballInHand,duel?.winner,duel?.potted.length,duel?.groups.join(),session.shots,session.potted.length,session.inShot,session.outcome,Math.ceil(session.timeLeft),paused,hostPaused,Math.round(power*100),practice,index].join('|');
  if(signature===lastHud)return;lastHud=signature;
  powerInput.style.setProperty('--power-fill', `${Math.max(0, Math.min(100, (power * 100 - 10) / 90 * 100))}%`);
  const ruleTurn=!!duel&&canChooseRule()&&!duel.inShot&&duel.winner===null;
  $('push-out').hidden=!ruleTurn||duel.pushOut!=='available';
  $('push-accept').hidden=$('push-pass').hidden=!ruleTurn||duel.pushOut!=='decision';
  const prompt=!duel||duel.inShot||duel.winner!==null?'':duel.ballInHand&&duel.kitchen?'Ball in hand: place left of the head string (kitchen).':ruleTurn&&duel.pushOut==='decision'?'Push-out: shoot from here or pass back.':ruleTurn&&duel.pushOut==='available'?'Your shot: play normally or push out.':ruleTurn&&duel.pushOut==='declared'?'Push-out declared. Take your shot.':ruleTurn&&!duel.ballInHand&&duel.needsEightCall?(duel.calledPocket===null?'Call a pocket for the 8: click or tap a pocket.':`Called: ${POCKETS[duel.calledPocket].name}. Aim and shoot the 8.`):'';
  const warning=duel&&duel.fouls[duel.turn]===2&&ruleTurn?' Warning: your next foul loses the rack.':'';
  $('online-panel').classList.toggle('connected',!!online?.connected);
  spinPicker.disabled=!!offline&&!offline.canShoot;$<HTMLButtonElement>('spin-reset').disabled=spinPicker.disabled;
  if(offline){
    const match=offline.match,who=match.turn===0?'You':'CPU';
    document.querySelector('.hud-stats small')!.textContent='TURN';
    $('mission-number').textContent='VS';$('mission-title').textContent=`${match.mode} · vs CPU`;$('mission-chapter').textContent='OFFLINE / THE CLUB CHALLENGE';$('difficulty').textContent=offline.difficulty.toUpperCase();
    $('objective').textContent=match.winner!==null?(match.winner===0?'You win!':'CPU wins!'):match.ballInHand?`${who}: ball in hand · click clear felt`:`${who}${match.turn===0?'r turn':` · ${match.inShot?'shooting':offline.phase==='aiming'?'aiming':'thinking…'}`}`;
    if(prompt)$('objective').textContent=prompt;
    $('shots-left').textContent=match.turn===0?'YOU':'CPU';$('shots-left').style.color='';
    $('secondary-label').textContent=match.mode==='9-ball'?'TARGET':match.groups[0]?`YOU ${match.groups[0]} / CPU ${match.groups[1]}`:'OPEN TABLE';
    $('potted-count').textContent=match.mode==='9-ball'?String(match.lowest===Infinity?'—':match.lowest):match.groups[0]?`${match.groupRemaining(0)} / CPU ${match.groupRemaining(1)}`:String(match.potted.length);
    const blocked=!offline.canShoot||paused||hostPaused;$<HTMLButtonElement>('shoot-button').disabled=blocked;powerInput.disabled=blocked;$<HTMLButtonElement>('restart-button').disabled=false;
    $('power-value').textContent=`${Math.round(power*100)}%`;$('table-status').textContent=paused||hostPaused?'PAUSED':match.reason+warning;
    $('mission-tip').textContent=`${match.reason} ${VS_RULES[match.mode]}`;$('best-score').innerHTML='OFFLINE<br><b>CPU</b>';
    for(const id of ['campaign-nav','practice-nav','online-nav','daily-nav'])$(id).classList.remove('active');$('cpu-nav').classList.add('active');
    if(match.winner!==null&&!cpuResultShown){
      cpuResultShown=true;cancelCharge();const won=match.winner===0;
      $('result-kicker').textContent='THE CLUB CHALLENGE';$('result-title').textContent=won?'You beat the CPU!':'CPU takes the table.';$('result-description').textContent=match.reason;$('result-stars').innerHTML=runeIcon(won?'award':'restart');$('next-mission').textContent='Rematch';$('result-retry').textContent='Back to menu';$('result-overlay').classList.remove('hidden');$('result-overlay').classList.toggle('rune-victory',won);if(won)audio.win();
    }
    return;
  }
  if(online?.active){
    document.querySelector('.hud-stats small')!.textContent='TURN';
    $('mission-number').innerHTML=runeIcon('portal');$('mission-title').textContent=duel?`${duel.mode} duel`:'Online duel';$('mission-chapter').textContent='THE DUEL PORTAL / LIVE MULTIPLAYER';$('difficulty').textContent='ONLINE VS';
    $('objective').textContent=duel?duel.winner!==null?`${online.names[duel.winner]} wins!`:duel.ballInHand?`${online.names[duel.turn]}: place the cue on clear felt.`:`${online.names[duel.turn]}'s turn${duel.inShot?' · balls in motion':''}`:'Create a room or join a friend to play.';
    if(prompt)$('objective').textContent=prompt;
    $('shots-left').textContent=duel?(duel.turn===online.player?'YOU':'RIVAL'):'—';$('shots-left').style.color='';
    $('secondary-label').textContent=duel?.mode==='9-ball'?'NEXT BALL':duel?.groups[online.player]?.toUpperCase()??'POTTED';
    $('potted-count').textContent=duel?.mode==='9-ball'?(Number.isFinite(duel.lowest)?String(duel.lowest):'—'):duel?.groups[online.player]?String(duel.groupRemaining(online.player)):String(duel?.potted.length??0);
    $<HTMLButtonElement>('shoot-button').disabled=!online.canShoot;powerInput.disabled=!online.canShoot;$<HTMLButtonElement>('restart-button').disabled=true;
    $('power-value').textContent=`${Math.round(power*100)}%`;$('table-status').textContent=online.connected&&duel?duel.reason+warning:'WAITING AT THE PORTAL';
    $('mission-tip').textContent=VS_RULES[duel?.mode??online.mode];$('best-score').innerHTML=`ONLINE<br><b>${runeIcon('portal')}</b>`;
    $('online-nav').classList.add('active');$('campaign-nav').classList.remove('active');$('practice-nav').classList.remove('active');$('daily-nav').classList.remove('active');
    if(!duel||duel.winner===null){$('result-overlay').classList.add('hidden');onlineResultShown=false;}
    return;
  }
  $('online-nav').classList.remove('active');$<HTMLButtonElement>('restart-button').disabled=false;
  document.querySelector('.hud-stats small')!.textContent='SHOTS LEFT';
  $('shots-left').innerHTML=practice?`<span role="img" aria-label="Unlimited">${runeIcon('unlimited')}</span>`:String(session.remaining);
  $('shots-left').style.color=!practice&&session.remaining<=1?'var(--accent)':'';
  if(!practice&&session.mission.time){$('secondary-label').textContent='TIME LEFT';$('potted-count').textContent=`${Math.ceil(session.timeLeft)}s`;}
  else{$('secondary-label').textContent='POTTED';$('potted-count').innerHTML=`${session.potted.length} <i>/ ${session.total}</i>`;}
  const blocked=!canShoot()||paused||hostPaused;
  $<HTMLButtonElement>('shoot-button').disabled=blocked;powerInput.disabled=blocked;
  $('power-value').textContent=`${Math.round(power*100)}%`;
  $('table-status').innerHTML=`<i></i> ${paused||hostPaused?'TAKE YOUR TIME.':session.inShot?'LET IT ROLL.':session.outcome==='playing'?'YOUR TABLE. YOUR MOVE.':session.outcome==='won'?'THAT’S HOW IT’S DONE.':'ANOTHER ANGLE. ANOTHER CHANCE.'}`;
}
function toast(text:string){clearTimeout(floatTimeout);$('floating-message').textContent=text;$('floating-message').classList.add('visible');floatTimeout=window.setTimeout(()=>$('floating-message').classList.remove('visible'),3200);}
function doShoot(value=power){
  if(titleOpen||renderer.cueInspection||paused||hostPaused||guide.open||pauseDialog.open||cpuDialog.open||dailyDialog.open)return;
  if(offline){if(offline.canShoot&&offline.match.shoot(0,angle,value,spin)){setSpin({x:0,y:0});shotEffect(value);updateHud();}return;}
  if(online?.active){if(online.shoot(angle,value,spin)){setSpin({x:0,y:0});if(online.isHost)shotEffect(value);updateHud();}return;}
  if(session.shoot(angle,value,spin)){setSpin({x:0,y:0});shotEffect(value);if(challengeDay===undefined)og.track('shot_taken',{mission:practice?0:index+1});updateHud();}
}
function cancelCharge(){charging=false;pointerId=null;keys.delete('Space');}
function startCharge(){if(!canShoot()||paused||hostPaused||guide.open||pauseDialog.open||cpuDialog.open||dailyDialog.open)return;charging=true;shotAngle=angle;chargeStarted=performance.now();}
function finishCharge(){if(!charging)return;const elapsed=performance.now()-chargeStarted;charging=false;if(elapsed>140){angle=shotAngle;doShoot(power);}updateHud();}
function showResult(){
  if(outcomeShown)return;outcomeShown=true;cancelCharge();
  const won=session.outcome==='won';
  $('result-overlay').classList.remove('hidden');$('result-overlay').classList.toggle('rune-victory',won);
  if(won){audio.win();for(const b of session.balls)if(b.id!==0)renderer.pulse(b.x,b.y,room.selected.trim,110,1.2);}
  if(challengeDay!==undefined){
    const score=won?dailyScore(session.remaining,session.timeLeft):0;
    if(won){dailyLeaderboard.record(challengeDay,score);renderDailyBest(challengeDay);}
    $('result-kicker').textContent=`THE DAILY TABLE / ${dailyDate(challengeDay)}`;
    $('result-title').textContent=won?`${score} points.`:'Daily run incomplete.';
    $('result-description').textContent=won?`${session.reason} Best on this browser: ${dailyLeaderboard.best(challengeDay)}.`:session.reason;
    $('result-stars').innerHTML=runeIcon(won?'award':'restart');
    $('next-mission').innerHTML=`${won?'Daily leaderboard':'Try again'} <span>${runeIcon('forward')}</span>`;
    $('result-retry').textContent=won?'Play again':'Daily leaderboard';
    updateHud();return;
  }
  $('result-kicker').textContent=won?(index===11&&!practice?'WELCOME TO THE LEGENDS':'BEAUTIFULLY PLAYED'):'THE NIGHT ISN’T OVER';
  $('result-title').textContent=won?(practice?'A clean table.':index===11?'You own the table.':'Mission complete.'):'Find another angle.';
  $('result-description').textContent=won&&!practice?`${session.reason} ${session.stars} of 3 stars earned.`:session.reason;
  $('result-stars').innerHTML=won&&!practice?runeStars(session.stars):runeIcon(won?'award':'restart');
  $('next-mission').innerHTML=`${won&&!practice&&index<11?'Next mission':won&&!practice?'Back to the club':'Try again'} <span>${runeIcon('forward')}</span>`;
  $('result-retry').textContent=won?'Play again':'Back to campaign';
  if(won&&!practice){const best=bestMissionRecord(records[index],{stars:session.stars,shots:session.shots});if(best!==records[index]){records[index]=best;save();}renderMissions();renderMissionBest();og.track('mission_complete',{mission:index+1,stars:session.stars,shots:session.shots});}
  else if(!won)og.track('mission_failed',{mission:index+1});
  updateHud();
}
function setPause(value:boolean){if(titleOpen)return;if(online?.active){if(value)toast('Online duels cannot be paused. Keep the host tab visible.');return;}paused=value;cancelCharge();if(value){stopReplay();if(!pauseDialog.open)pauseDialog.showModal();}if(!value&&pauseDialog.open)pauseDialog.close();updateHud();}
let dailyView=0;
async function openDaily(){
  cancelCharge();keys.clear();
  const view=++dailyView,day=dailyDay(),best=dailyLeaderboard.best(day);
  $('daily-date').textContent=`${dailyDate(day)} UTC / NEW TABLE AT MIDNIGHT`;
  $('daily-personal').textContent=best===undefined?'No score yet on this browser.':`Best on this browser: ${best} points.`;
  $('daily-source').textContent='Loading scores…';$('daily-entries').replaceChildren();
  dailyDialog.showModal();
  const ranking=await dailyLeaderboard.ranking(day);
  if(view!==dailyView||!dailyDialog.open)return;
  $('daily-source').textContent=ranking.source==='opengame'?'OpenGame · top 10 players':'This browser · top 10 attempts';
  if(!ranking.entries.length){$('daily-source').textContent+=' · No scores yet.';return;}
  for(const {rank,name,score} of ranking.entries){
    const row=document.createElement('li');
    const place=document.createElement('span'),player=document.createElement('span'),points=document.createElement('strong');
    place.textContent=String(rank);player.textContent=name;points.textContent=String(score);
    row.append(place,player,points);$('daily-entries').append(row);
  }
}
function startDaily(){
  if(dailyDialog.open)dailyDialog.close();
  loadMission(index,false,dailyDay());setTitle(false);
}
function pointerPosition(e:PointerEvent){return renderer.pointer(e.clientX,e.clientY);}
canvas.addEventListener('pointermove',e=>{if(!canShoot()||charging||e.buttons===2)return;const p=pointerPosition(e),cue=currentBalls()[0];angle=Math.atan2(p.y-cue.y,p.x-cue.x);});
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||paused||hostPaused||cpuDialog.open)return;
  const p=pointerPosition(e),match=versusMatch();
  if(offline?.canPlace||online?.canPlace){
    if(!(offline?offline.match.placeCue(0,p.x,p.y):online?.place(p.x,p.y)))toast(match?.kitchen?'Place the cue on clear felt behind the head string.':'Place the cue on clear felt, away from balls and pockets.');
    updateHud();return;
  }
  if(match?.needsEightCall&&match.canPrepareShot&&canChooseRule()){
    const pocket=POCKETS.findIndex(hole=>Math.hypot(hole.x-p.x,hole.y-p.y)<TABLE.pocketRadius+24);
    if(pocket!==-1){
      if(offline)match.callEightPocket(0,pocket);else online?.rule({type:'call-eight',pocket});
      updateHud();return;
    }
  }
  if(!canShoot())return;
  const cue=currentBalls()[0];if(Math.hypot(p.x-cue.x,p.y-cue.y)>TABLE.radius*2)angle=Math.atan2(p.y-cue.y,p.x-cue.x);
  canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointerId=e.pointerId;startCharge();
});
canvas.addEventListener('pointerup',e=>{if(pointerId===e.pointerId){pointerId=null;finishCharge();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}});
canvas.addEventListener('pointercancel',cancelCharge);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
powerInput.addEventListener('input',()=>{power=Number(powerInput.value)/100;updateHud();});
$('shoot-button').addEventListener('click',()=>doShoot());
$('push-out').addEventListener('click',()=>{
  if(!canChooseRule())return;
  cancelCharge();
  if(offline)offline.match.declarePushOut(0);else online?.rule({type:'push-out'});
  updateHud();
});
for(const [id,passBack] of [['push-accept',false],['push-pass',true]] as const)$(id).addEventListener('click',()=>{
  if(!canChooseRule())return;
  if(offline)offline.match.choosePushOut(0,passBack);else online?.rule({type:'push-choice',passBack});
  updateHud();
});
$('cpu-nav').addEventListener('click',()=>{cancelCharge();cpuDialog.showModal();});
$('cpu-close').addEventListener('click',()=>cpuDialog.close());
$('cpu-start').addEventListener('click',startOffline);
$('restart-button').addEventListener('click',restartCurrent);
$('missions').addEventListener('click',e=>{const btn=(e.target as HTMLElement).closest<HTMLElement>('[data-mission]');if(btn)loadMission(Number(btn.dataset.mission));});
$('next-mission').addEventListener('click',()=>{if(offline){startOffline();return;}if(online?.active){online.requestRematch();$('result-overlay').classList.add('hidden');return;}if(challengeDay!==undefined){if(session.outcome==='won')void openDaily();else startDaily();return;}loadMission(session.outcome==='won'&&!practice?(index+1)%12:index,practice);});
$('result-retry').addEventListener('click',()=>{if(offline){loadMission(index);setTitle(true);return;}if(challengeDay!==undefined&&!online?.active){if(session.outcome==='won')startDaily();else void openDaily();return;}loadMission(session.outcome==='won'?index:0,session.outcome==='won'&&practice);});
$('campaign-nav').addEventListener('click',()=>{cameraRig.close();cueLocker.inspect(false);if(offline||practice||challengeDay!==undefined||online?.active)loadMission(index);document.body.classList.toggle('missions-open');document.querySelector<HTMLDetailsElement>('.table-room')!.open=false;});
$('daily-nav').addEventListener('click',()=>void openDaily());
$('title-daily').addEventListener('click',()=>void openDaily());
$('daily-close').addEventListener('click',()=>dailyDialog.close());
$('daily-play').addEventListener('click',startDaily);
$('practice-nav').addEventListener('click',()=>loadMission(index,true));
$('online-nav').addEventListener('click',()=>{replayRecorder.discard();offline=undefined;$('cpu-nav').classList.remove('active');cameraRig.close();cueLocker.inspect(false);cancelCharge();paused=false;hostPaused=false;if(pauseDialog.open)pauseDialog.close();document.body.classList.toggle('lobby-expanded');document.body.classList.remove('missions-open');document.querySelector<HTMLDetailsElement>('.table-room')!.open=false;online?.enter();});
$('vault-button').addEventListener('click',()=>{const vault=document.querySelector<HTMLDetailsElement>('.table-room')!;vault.open=!vault.open;cameraRig.close();document.body.classList.remove('missions-open','lobby-expanded');});
$('menu-button').addEventListener('click',()=>setTitle(true));
$('title-play').addEventListener('click',()=>setTitle(false));
$('title-online').addEventListener('click',()=>{setTitle(false);$('online-nav').click();});
$('title-guide').addEventListener('click',()=>guide.showModal());
for(const [id,direction]of [['title-prev',-1],['title-next',1]] as const)$(id).addEventListener('click',()=>{const i=TABLE_DESIGNS.findIndex(d=>d.id===room.selected.id);room.select(TABLE_DESIGNS[(i+direction+8)%8].id,true);});
$('title-cpu').addEventListener('click',()=>cpuDialog.showModal());
$('guide-nav').addEventListener('click',()=>{cancelCharge();guide.showModal();});
document.querySelector('.dialog-close')!.addEventListener('click',()=>guide.close());$('close-guide').addEventListener('click',()=>guide.close());
$('hint-button').addEventListener('click',()=>toast(offline?VS_RULES[offline.match.mode]:practice?'Try a 70–90% break toward the head of the rack.':currentTip()));
const soundButton=$<HTMLButtonElement>('sound-button'),soundVolume=$<HTMLInputElement>('sound-volume');
function updateSoundControls(){
  const silent=audio.hostMuted||audio.volume===0;
  $('sound-state').textContent=!audio.enabled?'OFF':silent?'MUTED':'ON';
  soundButton.setAttribute('aria-pressed',String(audio.enabled));
  soundButton.title=audio.hostMuted?'Muted by the host':audio.enabled?'Mute sound':'Enable sound';
  soundVolume.setAttribute('aria-valuetext',`${soundVolume.value}%`);
}
soundVolume.value=String(Math.round(audio.volume*100));
soundVolume.addEventListener('input',()=>{audio.setVolume(soundVolume.valueAsNumber/100);updateSoundControls();});
soundButton.addEventListener('click',()=>{audio.toggle();updateSoundControls();});
updateSoundControls();
$('fullscreen-button').addEventListener('click',()=>{if(og.env.embedded&&og.env.connected){og.fullscreen.request();}else if(document.fullscreenElement){void document.exitFullscreen().catch(()=>{});}else{void document.documentElement.requestFullscreen().catch(()=>toast('Fullscreen is not available in this preview.'));}});
$('resume-button').addEventListener('click',()=>setPause(false));
pauseDialog.addEventListener('cancel',e=>{e.preventDefault();setPause(false);});
function startReplay(clip:ReplayClip,now:number){
  cancelCharge();keys.clear();
  replay=clip;replayStarted=now;
  $('shot-replay-kind').textContent=clip.highlight.kind;
  $('floating-message').classList.remove('visible');
  replayDialog.showModal();
}
function stopReplay(){
  if(!replay)return;
  replay=undefined;replayDialog.close();
}
replayDialog.addEventListener('click',stopReplay);
replayDialog.addEventListener('cancel',e=>{e.preventDefault();stopReplay();});
window.addEventListener('keydown',e=>{
  if(onboarding.open)return;
  if(replay||e.code===skipKey){e.preventDefault();skipKey=e.code;stopReplay();return;}
  if(e.code==='Escape'&&viewOptions.matches(':popover-open'))return;
  // Escape exits the editor even while a range or text input owns focus.
  if(e.code==='Escape'&&!guide.open&&!pauseDialog.open&&!dailyDialog.open){cancelCharge();cameraRig.close();cueLocker.inspect(false);document.body.classList.remove('missions-open','lobby-expanded');document.querySelector<HTMLDetailsElement>('.table-room')!.open=false;canvas.focus({preventScroll:true});return;}
  if((e.target as HTMLElement).matches('input,textarea,select'))return;
  if((e.target as HTMLElement).closest('button,summary')&&['Space','Enter'].includes(e.code))return;
  if(guide.open||pauseDialog.open||cpuDialog.open||dailyDialog.open){if(e.code==='KeyP'&&pauseDialog.open)setPause(false);return;}
  if(titleOpen){if(e.code==='Enter')setTitle(false);return;}
  // Let results scroll natively without stealing Escape, title or pause shortcuts.
  if(!$('result-overlay').classList.contains('hidden')&&['Space','ArrowUp','ArrowDown'].includes(e.code))return;
  if(['KeyW','KeyS','KeyA','KeyD','KeyC'].includes(e.code)){e.preventDefault();if(canShoot()&&!paused&&!hostPaused)setSpin(e.code==='KeyC'?{x:0,y:0}:{x:spin.x+(e.code==='KeyD'?.1:e.code==='KeyA'?-.1:0),y:spin.y+(e.code==='KeyW'?.1:e.code==='KeyS'?-.1:0)});return;}
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
  keys.add(e.code);
  if(e.repeat)return;
  if(e.code==='Space')startCharge();
  if(e.code==='KeyR'&&!online?.active)restartCurrent();
  if(e.code==='KeyP')setPause(!paused);
});
window.addEventListener('keyup',e=>{if(e.code===skipKey){skipKey='';return;}keys.delete(e.code);if(e.code==='Space')finishCharge();});
window.addEventListener('blur',()=>{cancelCharge();keys.clear();skipKey='';});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelCharge();keys.clear();stopReplay();if(offline||(session.started&&session.outcome==='playing'))setPause(true);}});
new ResizeObserver(()=>renderer.resize()).observe(canvas);
function frame(now:number){
  const realElapsed=Math.max(0,(now-lastFrame)/1000),elapsed=Math.min(realElapsed,.25);lastFrame=now;
  if(replay&&(now-replayStarted)/1000>=replay.duration)stopReplay();
  if(!replay&&(online?.active||(!titleOpen&&!paused&&!hostPaused&&!guide.open&&!pauseDialog.open&&!cpuDialog.open&&!dailyDialog.open))){
    if(canShoot()&&!charging&&!guide.open){const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight'))?.16:.8;if(keys.has('ArrowLeft'))angle-=elapsed*speed;if(keys.has('ArrowRight'))angle+=elapsed*speed;if(keys.has('ArrowUp'))power=Math.min(1,power+elapsed*.3);if(keys.has('ArrowDown'))power=Math.max(.1,power-elapsed*.3);}
    if(charging){power=Math.min(1,.1+(now-chargeStarted)/1400*.9);powerInput.value=String(Math.round(power*100));}
    if(!online?.active&&!offline){
      session.advanceClock(realElapsed);
      if(session.outcome!=='playing')replayRecorder.discard();
    }
    accumulator+=elapsed;
    offline?.advance(elapsed);
    const localMatch=online?.active?undefined:offline?.match??session;
    while(accumulator>=fixedStep){
      const recording=replayEnabled&&localMatch?.inShot;
      const events=offline?offline.match.tick(fixedStep):online?.active?online.tick(fixedStep):session.tick(fixedStep,false);
      handleEvents(events);accumulator-=fixedStep;
      if(recording&&localMatch){
        replayRecorder.capture(localMatch.balls,events);
        if(!localMatch.inShot){
          const clip=replayRecorder.finish();
          if(clip){startReplay(clip,now);accumulator=0;break;}
        }
      }
    }
    for(const b of currentBalls()){if(Math.hypot(b.vx,b.vy)>40){b.trail.push({x:b.x,y:b.y});if(b.trail.length>9)b.trail.shift();}else b.trail.shift();}
    for(const p of particles){p.x+=p.vx*elapsed;p.y+=p.vy*elapsed;p.life-=elapsed*1.6;}particles=particles.filter(p=>p.life>0);
    if(!replay&&!offline&&!online?.active&&session.outcome!=='playing')showResult();
    if(online?.active&&online.match&&online.match.winner!==null&&!onlineResultShown){
      onlineResultShown=true;const won=online.match.winner===online.player;
      $('result-kicker').textContent='THE DUEL IS SEALED';$('result-title').textContent=won?'You forged a victory.':'A worthy rival.';$('result-description').textContent=online.match.reason;$('result-stars').innerHTML=runeIcon('portal');$('next-mission').textContent='Request rematch';$('result-retry').textContent='Leave for campaign';$('result-overlay').classList.remove('hidden');$('result-overlay').classList.toggle('rune-victory',won);if(won)audio.win();
    }
  }
  if(replay){
    replay.seek((now-replayStarted)/1000);
    renderer.render({balls:replay.balls,angle:0,power:0,charge:0,aiming:false,particles:[],time:now},replay.focus);
    requestAnimationFrame(frame);return;
  }
  const cpuAiming=!titleOpen&&!renderer.cueInspection&&!!offline&&offline.phase==='aiming'&&!offline.match.inShot&&offline.match.turn===1;
  const match=versusMatch();
  const targetPocket=titleOpen?undefined:match?(cpuAiming?offline?.shot?.pocket:match.calledPocket??undefined):!online?.active&&!practice&&session.mission.rule==='called'?session.mission.pocket:undefined;
  renderer.render({balls:titleOpen?titleBalls:currentBalls(),angle:cpuAiming?offline!.angle:angle,power:cpuAiming?offline!.shot!.power:power,spin:cpuAiming?offline!.shot!.spin:spin,charge:charging?1:0,aiming:(canShoot()||cpuAiming)&&!paused&&!hostPaused,targetPocket,particles:renderer.effects&&!titleOpen?particles:[],time:now});
  updateHud();requestAnimationFrame(frame);
}
online=new OnlineGame({change:()=>{lastHud='';updateHud();},table:(id,locked)=>{if(room.selected.id!==id)room.select(id);room.setLocked(locked);},tableId:()=>room.selected.id,events:events=>handleEvents(events,false),impact:impact=>audio.impact(impact),shot:shotEffect,exit:()=>loadMission(index)});
room.onSelect=()=>{$('title-table-name').textContent=room.selected.name;online?.tableChanged();};
loadMission(0);setTitle(true);
if(new URLSearchParams(location.search).has('room')){setTitle(false);online.enter();}
else setupOnboarding(onboarding,$('title-play'));
requestAnimationFrame(frame);
// Platform handshake never blocks the first frame or standalone play.
const platformReady=og.init({manifest}).then(()=>{audio.setHostMuted(og.audio.muted);updateSoundControls();og.audio.onHostMute(value=>{audio.setHostMuted(value);updateSoundControls();});og.ready();og.onPause(value=>{hostPaused=value;cancelCharge();if(value)stopReplay();});}).catch(()=>{});
