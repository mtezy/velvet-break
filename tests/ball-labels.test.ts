import test from 'node:test';
import assert from 'node:assert/strict';
import { Object3D, PerspectiveCamera, Sprite, Vector3 } from 'three';
import { BALL_LABEL_SCALE, mobileBallLabelScale } from '../src/ball-labels.ts';
import { PoolRenderer } from '../src/three-renderer.ts';

test('phone labels target the same screen size at different camera depths',()=>{
  const close={x:0,y:0,pixelsPerUnit:1};
  const distant={x:0,y:28,pixelsPerUnit:.35};
  const labels=[close,distant];
  assert.equal(mobileBallLabelScale(close,labels)*close.pixelsPerUnit,16);
  assert.equal(mobileBallLabelScale(distant,labels)*distant.pixelsPerUnit,16);
});

test('labels in a tight rack grow only as far as the projected ball spacing allows',()=>{
  const first={x:0,y:0,pixelsPerUnit:.35};
  const second={x:6,y:8,pixelsPerUnit:.4};
  const labels=[first,second];
  assert.equal(mobileBallLabelScale(first,labels)*first.pixelsPerUnit,10);
  assert.equal(mobileBallLabelScale(second,labels)*second.pixelsPerUnit,10);
});

test('a nearby cue ball caps enlargement even without a number sprite',()=>{
  const cue={mesh:new Object3D(),label:{sprite:new Sprite(),x:0,y:0,pixelsPerUnit:1}};
  const object={mesh:new Object3D(),label:{sprite:new Sprite(),x:0,y:0,pixelsPerUnit:1}};
  const camera=new PerspectiveCamera(90,1,1,1000);
  cue.mesh.position.set(20,0,-100);
  cue.label.sprite.visible=false;
  object.label.sprite.position.z=-100;
  const renderer=Object.assign(Object.create(PoolRenderer.prototype) as PoolRenderer,{
    camera,viewportHeight:50,labelPosition:new Vector3(),labelNeighbors:[],
    balls:new Map([[0,cue],[1,object]]),
  });
  renderer['sizePhoneLabels']();
  assert.ok(Math.abs(object.label.sprite.scale.x*object.label.pixelsPerUnit-5)<1e-9);
  assert.equal(cue.label.sprite.scale.x,1);
  cue.mesh.visible=false;
  renderer['sizePhoneLabels']();
  assert.equal(object.label.sprite.scale.x*object.label.pixelsPerUnit,16);
});

test('crowding or a zoomed-in camera never shrinks the original label',()=>{
  const label={x:0,y:0,pixelsPerUnit:2};
  assert.equal(mobileBallLabelScale(label,[label]),BALL_LABEL_SCALE);
  assert.equal(mobileBallLabelScale(label,[label,{...label,x:2}]),BALL_LABEL_SCALE);
});

test('phone labels use the replay camera without changing the live camera',()=>{
  const label={sprite:new Sprite(),x:0,y:0,pixelsPerUnit:1};
  label.sprite.position.z=-100;
  const camera=new PerspectiveCamera(90,1,1,1000),replayCamera=camera.clone();
  replayCamera.position.z=100;
  const renderer=Object.assign(Object.create(PoolRenderer.prototype) as PoolRenderer,{
    camera,viewportHeight:50,labelPosition:new Vector3(),labelNeighbors:[],
    balls:new Map([[1,{mesh:new Object3D(),label}]]),
  });
  renderer['sizePhoneLabels'](replayCamera);
  assert.ok(Math.abs(label.pixelsPerUnit-.125)<1e-9);
  assert.equal(camera.position.z,0);
  renderer['sizePhoneLabels']();
  assert.ok(Math.abs(label.pixelsPerUnit-.25)<1e-9);
});
