import assert from 'node:assert/strict';
import { test } from 'node:test';
import { titleCameraPosition } from '../src/title-camera.ts';

test('title camera sweeps both ways at a fixed radius and returns to its opening pose',()=>{
  const start=titleCameraPosition(0,16/9),right=titleCameraPosition(10,16/9),left=titleCameraPosition(30,16/9),loop=titleCameraPosition(40,16/9);
  assert.ok(left.x<start.x&&start.x<right.x);
  assert.ok(Math.abs(right.x-left.x)>500);
  for(const pose of [right,left,loop]){
    assert.equal(pose.y,start.y);
    assert.ok(Math.abs(Math.hypot(pose.x,pose.z)-Math.hypot(start.x,start.z))<1e-9);
  }
  assert.ok(Math.hypot(loop.x-start.x,loop.z-start.z)<1e-9);
});

test('portrait title camera backs up without changing its angle',()=>{
  const wide=titleCameraPosition(5,16/9),portrait=titleCameraPosition(5,9/16);
  assert.ok(portrait.y>wide.y);
  assert.equal(Math.atan2(portrait.x,portrait.z),Math.atan2(wide.x,wide.z));
});
