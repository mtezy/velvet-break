import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture } from 'three';
import { resinBallMaterial, setResinBallQuality } from '../src/ball-finish.ts';

test('economy drops the clearcoat without removing the ball art or lamp reflections',()=>{
  const art=new Texture(),lamps=new Texture();
  const ball=resinBallMaterial(art,lamps,true);
  assert.equal(ball.clearcoat,0);
  const economyRoughness=ball.roughness;
  const version=ball.version;
  setResinBallQuality(ball,false);
  assert.ok(ball.clearcoat>0);
  assert.ok(ball.clearcoatRoughness<ball.roughness);
  assert.ok(ball.version>version);
  setResinBallQuality(ball,true);
  assert.equal(ball.clearcoat,0);
  assert.equal(ball.roughness,economyRoughness);
  assert.equal(ball.map,art);
  assert.equal(ball.envMap,lamps);
  ball.dispose();art.dispose();lamps.dispose();
});
