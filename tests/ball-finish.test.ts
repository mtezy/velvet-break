import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { HalfFloatType, Texture } from 'three';
import { decodeBallLampEnvironment, resinBallMaterial, setResinBallQuality } from '../src/ball-finish.ts';

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

test('the offline lamp PMREM contains six 256-pixel HDR faces and their roughness mips',()=>{
  const bytes=gunzipSync(readFileSync(new URL('../src/ball-lamps.bin',import.meta.url)));
  const cubemap=decodeBallLampEnvironment(Uint8Array.from(bytes).buffer);
  assert.equal(cubemap.type,HalfFloatType);
  assert.equal(cubemap.isPMREMTexture,true);
  assert.equal(cubemap.image.length,6);
  for(const face of cubemap.image)assert.deepEqual(face.mipmaps.map(mip=>mip.width),[256,128,64,32,16,8]);
  assert.ok(cubemap.image.some(face=>face.mipmaps[0].data.some((v,i)=>i%4!==3&&v>0x3c00)),'the bake retains HDR lamp values above 1');
  cubemap.dispose();
});
