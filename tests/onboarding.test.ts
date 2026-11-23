import test from 'node:test';
import assert from 'node:assert/strict';
import { showFirstPlay } from '../src/onboarding.ts';

test('the first-play tour is shown once across launches without overwriting game progress',()=>{
  const values=new Map([['velvet-break-v1','saved missions']]);
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  let shown=0;
  const show=()=>{shown++;};
  showFirstPlay(()=>storage,show);
  showFirstPlay(()=>storage,show);
  assert.equal(shown,1);
  assert.equal(storage.getItem('velvet-break-v1'),'saved missions');
});

test('storage restrictions do not prevent the first-play tour',()=>{
  const unavailable=()=>{throw new Error('storage blocked');};
  let shown=0;
  const show=()=>{shown++;};
  showFirstPlay(unavailable,show);
  showFirstPlay(()=>({getItem:()=>null,setItem:unavailable}),show);
  assert.equal(shown,2);
});
