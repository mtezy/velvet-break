export const CAMPAIGN_STORAGE_KEY='velvet-break-v1';
export interface MissionRecord {stars:number;shots:number;}

export function readCampaignProgress(raw:string|null,count:number):(MissionRecord|null)[]{
  let stored:unknown;
  try{stored=JSON.parse(raw??'null');}catch{}
  return Array.from({length:count},(_,i)=>{
    const r=Array.isArray(stored)?stored[i]:null;
    return r&&Number.isInteger(r.stars)&&r.stars>=1&&r.stars<=3&&Number.isInteger(r.shots)&&r.shots>0?{stars:r.stars,shots:r.shots}:null;
  });
}

export function bestMissionRecord(previous:MissionRecord|null,run:MissionRecord):MissionRecord{
  if(!previous)return run;
  if(run.stars<=previous.stars&&run.shots>=previous.shots)return previous;
  return {stars:Math.max(previous.stars,run.stars),shots:Math.min(previous.shots,run.shots)};
}
