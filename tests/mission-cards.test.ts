import test from 'node:test';
import assert from 'node:assert/strict';
import { missionCardsHtml, missionRule, missionStars } from '../src/mission-cards.ts';
import { missions } from '../src/missions.ts';

const records=[{stars:3,shots:1},{stars:2,shots:3},null,null,null,null,null,null,null,null,null,null];

test('every mission gets one selectable card grouped by chapter',()=>{
  const html=missionCardsHtml(missions,records,1);
  assert.equal(html.match(/data-mission="/g)?.length,12);
  assert.equal(html.match(/class="map-chapter"/g)?.length,4);
  assert.match(html,/class="mission-card selected cleared" data-mission="1"[^>]*aria-current="true"/);
});

test('cards show earned stars, best shots and the next unplayed mission',()=>{
  const html=missionCardsHtml(missions,records,null);
  assert.match(html,/Best 1 · par 1/);
  assert.match(html,/mission-card next-up" data-mission="2"/);
  assert.match(html,/✦ 5 \/ 9/);
  assert.equal(missionStars(records[1]).match(/class="earned"/g)?.length,2);
  assert.equal(missionStars(null).match(/class="earned"/g),null);
});

test('mission rules read as short card labels',()=>{
  assert.equal(missionRule(missions[0]),'Clear the table');
  assert.equal(missionRule(missions[3]),'Bank shot');
  assert.equal(missionRule(missions[6]),'75s clock');
  assert.match(missionCardsHtml(missions,records,null),/<circle cx="1110" cy="90" r="24" class="called"\/>/);
});

test('card labels give screen readers par and the next-up hint',()=>{
  const html=missionCardsHtml(missions,records,0);
  assert.match(html,/aria-label="Mission 1: [^"]*best 1 shot, par \d+"/);
  assert.match(html,/aria-label="Mission 3: [^"]*not played yet, par \d+, next up"/);
  assert.match(html,/aria-label="Mission 4: [^"]*not played yet, par \d+"/);
});
