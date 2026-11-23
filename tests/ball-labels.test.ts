import test from 'node:test';
import assert from 'node:assert/strict';
import { BALL_LABEL_SCALE, mobileBallLabelScale } from '../src/ball-labels.ts';

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

test('crowding or a zoomed-in camera never shrinks the original label',()=>{
  const label={x:0,y:0,pixelsPerUnit:2};
  assert.equal(mobileBallLabelScale(label,[label]),BALL_LABEL_SCALE);
  assert.equal(mobileBallLabelScale(label,[label,{...label,x:2}]),BALL_LABEL_SCALE);
});
