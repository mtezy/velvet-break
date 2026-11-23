import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { PocketHighlights } from '../src/highlight-effects.ts';
import { ball, type PhysicsEvent } from '../src/physics.ts';
import { OnlineGame } from '../src/online.ts';

function setup(){
  const camera=new THREE.PerspectiveCamera(38,1.5,10,12000);
  camera.position.set(100,900,800);
  camera.lookAt(0,0,0);
  const scene=new THREE.Scene(),highlights=new PocketHighlights(scene,new THREE.Texture());
  const pot:PhysicsEvent={type:'pot',ball:ball(1,106,100),pocket:0,speed:300};
  return {camera,scene,highlights,pot};
}

test('a pocket highlight fades, redraws the clean frame, and reuses its mesh',()=>{
  const {camera,scene,highlights,pot}=setup();
  highlights.pot(pot,'#dfa854',100);
  assert.equal(highlights.update(140,camera,true,false,false),true);
  const [glow]=scene.children as THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>[];
  assert.deepEqual(glow.position.toArray(),[-510,18,-240]);
  const opacity=glow.material.opacity;
  highlights.update(300,camera,true,false,false);
  assert.ok(glow.material.opacity<opacity);
  assert.equal(highlights.view,undefined);
  assert.equal(highlights.update(440,camera,true,false,false),true);
  assert.equal(glow.visible,false);
  assert.equal(highlights.update(441,camera,true,false,false),false);
  highlights.pot({...pot,pocket:undefined},'#dfa854',460);
  highlights.update(480,camera,true,false,false);
  assert.deepEqual(scene.children,[glow]);
  assert.equal(glow.visible,true);
  assert.equal(highlights.update(481,camera,false,false,false),true);
  assert.equal(glow.visible,false);
});

test('camera shake is render-only, smaller in Economy, and skipped for reduced motion',()=>{
  const {camera,highlights,pot}=setup();
  const position=camera.position.clone(),rotation=camera.quaternion.clone();
  highlights.pot(pot,'#dfa854',100);
  highlights.update(140,camera,true,false,false);
  const auto=highlights.view!.position.distanceTo(position);
  assert.ok(auto>0&&auto<=4.5);
  assert.deepEqual(camera.position,position);
  assert.ok(camera.quaternion.equals(rotation));
  highlights.update(140,camera,true,true,false);
  const economy=highlights.view!.position.distanceTo(position);
  assert.ok(economy>0&&economy<auto);
  assert.equal(highlights.update(140,camera,true,false,true),true);
  assert.equal(highlights.view,undefined);
});

test('an online guest treats the accepted shot before the first state update as the break',()=>{
  const shots:boolean[]=[];
  const guest=Object.assign(Object.create(OnlineGame.prototype),{
    connected:true,isHost:false,match:{shots:0},hooks:{shot:(_:number,opening:boolean)=>shots.push(opening)},
  }) as OnlineGame;
  const shot={v:2,type:'shot',power:.9};
  guest.receive(shot);
  guest.match!.shots=1;
  guest.receive(shot);
  guest.receive({...shot,power:NaN});
  assert.deepEqual(shots,[true,false]);
});
