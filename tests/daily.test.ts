import test from 'node:test';
import assert from 'node:assert/strict';
import type { Leaderboard, ScoreEntry } from '@opengamehq/sdk';
import { DailyLeaderboard, dailyDate, dailyDay, dailyMission, dailyScore, encodeDailyScore } from '../src/daily.ts';
import { Session } from '../src/session.ts';

test('daily tables stay fixed until midnight UTC and have a playable opening',()=>{
  const day=dailyDay(Date.parse('2026-11-23T00:00:00Z'));
  assert.equal(dailyDay(Date.parse('2026-11-23T23:59:59Z')),day);
  assert.equal(dailyDay(Date.parse('2026-11-24T00:00:00Z')),day+1);
  assert.equal(dailyDate(day),'2026-11-23');
  assert.deepEqual(dailyMission(day),dailyMission(day));
  assert.notDeepEqual(dailyMission(day).layout,dailyMission(day+1).layout);
  const session=new Session(dailyMission(day));
  const [cue,target]=session.balls;
  session.shoot(Math.atan2(target.y-cue.y,target.x-cue.x),.45);
  for(let i=0;i<2400&&session.inShot;i++)session.tick(1/240);
  assert.deepEqual(session.potted,[1]);
  assert.equal(session.shots,1);
});

test('daily points prioritize shots over time and current scores over prior days',()=>{
  assert.equal(dailyScore(4,62.8),562);
  assert.ok(dailyScore(4,0)>dailyScore(3,75));
  assert.ok(encodeDailyScore(12,100)>encodeDailyScore(11,675));
});

test('standalone daily leaderboard persists and sorts the best attempts only for their day',async()=>{
  const items=new Map<string,string>();
  const storage=()=>({getItem:(key:string)=>items.get(key)??null,setItem:(key:string,value:string)=>{items.set(key,value);}});
  const day=dailyDay(),leaderboard=new DailyLeaderboard(storage,async()=>null);
  for(let i=0;i<12;i++)leaderboard.record(day,100+i);
  const reopened=new DailyLeaderboard(storage,async()=>null);
  assert.equal(reopened.best(day),111);
  assert.equal(reopened.best(day+1),undefined);
  const ranking=await reopened.ranking(day);
  assert.equal(ranking.source,'local');
  assert.deepEqual(ranking.entries.map(row=>row.score),[111,110,109,108,107,106,105,104,103,102]);
});

test('OpenGame receives the daily best and prior days do not appear in the ranking',async()=>{
  const day=dailyDay();
  const submits:number[]=[];
  const entry=(score:number,rank:number,isMe=false):ScoreEntry=>({score,rank,isMe,name:'Rival',stats:{},tags:{},meta:{},createdAt:'',imported:false});
  const board:Pick<Leaderboard,'submit'|'top'>={
    submit:async score=>{submits.push(score);return {ok:true,value:{score,state:'ok',best:true,preview:false,ignored:[]}};},
    top:async()=>({ok:true,value:{entries:[entry(encodeDailyScore(day,550),1),entry(encodeDailyScore(day,502),2,true),entry(encodeDailyScore(day-1,675),3)],order:'desc',preview:false,source:'game_reported',total:3,offset:0,sort:'score',filter:{},shape:null}}),
  };
  const leaderboard=new DailyLeaderboard(()=>{throw new Error('Storage is blocked');},async()=>board);
  leaderboard.record(day,502);
  leaderboard.record(day,402);
  assert.deepEqual(await leaderboard.ranking(day),{source:'opengame',entries:[{rank:1,name:'Rival',score:550},{rank:2,name:'You',score:502}]});
  assert.deepEqual(submits,[encodeDailyScore(day,502),encodeDailyScore(day,502)]);
  board.submit=async()=>({ok:false,error:'unavailable'});
  leaderboard.record(day,450);
  assert.equal((await leaderboard.ranking(day)).source,'local');
  assert.equal(leaderboard.best(day),502);
});
