import test from 'node:test';
import assert from 'node:assert/strict';
import { bestMissionRecord, readCampaignProgress } from '../src/campaign-progress.ts';
import { missions } from '../src/missions.ts';
import { Session } from '../src/session.ts';

test('mission stars reward par, one over par, and other finishes',()=>{
  const mission=missions[0],run=new Session(mission);
  for(const [shots,stars] of [[1,3],[2,2],[3,1]]){
    run.shots=shots;
    assert.equal(run.stars,stars);
  }
});

test('best campaign ratings survive reloads and worse runs',()=>{
  const first={stars:1,shots:3},improved={stars:2,shots:2};
  const best=bestMissionRecord(first,improved);
  assert.deepEqual(best,improved);
  assert.strictEqual(bestMissionRecord(best,first),best);
  assert.deepEqual(readCampaignProgress(JSON.stringify([best,{stars:4,shots:1}]),3),[improved,null,null]);
  assert.deepEqual(readCampaignProgress('broken',2),[null,null]);
});
