import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraSettings, DEFAULT_CAMERA } from '../src/camera-settings.ts';
import { CUE_DESIGNS, getCueDesign } from '../src/cues.ts';
test('saved camera angles round-trip, including the zero azimuth',()=>{assert.deepEqual(cameraSettings(JSON.parse(JSON.stringify(DEFAULT_CAMERA))),DEFAULT_CAMERA);assert.deepEqual(cameraSettings({azimuth:0,elevation:82,distance:2600}),{azimuth:0,elevation:82,distance:2600});});
test('malformed storage cannot move the camera inside or outside its safe range',()=>{for(const bad of [null,[],{},'camera',{...DEFAULT_CAMERA,azimuth:NaN},{...DEFAULT_CAMERA,elevation:Infinity},{...DEFAULT_CAMERA,distance:0},{...DEFAULT_CAMERA,azimuth:181},{...DEFAULT_CAMERA,elevation:90},{...DEFAULT_CAMERA,distance:9000}])assert.equal(cameraSettings(bad),null);});
test('unknown cue selections fall back safely and every cosmetic has a unique id',()=>{assert.equal(new Set(CUE_DESIGNS.map(d=>d.id)).size,6);for(const d of CUE_DESIGNS)assert.equal(getCueDesign(d.id),d);assert.equal(getCueDesign('<invalid>'),CUE_DESIGNS[0]);assert.equal(getCueDesign(null),CUE_DESIGNS[0]);});
