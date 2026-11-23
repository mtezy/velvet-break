import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cushionGeometry, surfaceUV } from '../src/surfaces.ts';

test('cushion top faces upward and its nose follows the original collision edge',()=>{
  const g=cushionGeometry(464);g.computeBoundingBox();
  assert.ok(g.boundingBox!.min.z>=-32&&g.boundingBox!.max.z<=1.3);
  assert.ok(g.boundingBox!.max.y>20&&g.boundingBox!.max.y<22);
  const p=g.getAttribute('position');let topFaces=0;
  for(let i=0;i<p.count;i+=3){
    const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);
    if(Math.min(a.y,b.y,c.y)<19)continue;
    const n=new THREE.Triangle(a,b,c).getNormal(new THREE.Vector3());
    if(n.y>.9)topFaces++;
  }
  assert.ok(topFaces>0,'visible top cap must not be backface culled');g.dispose();
});

test('large extruded surfaces sample the entire cloth image, not a clamped edge',()=>{
  const shape=new THREE.Shape();shape.moveTo(-552,-286);shape.lineTo(552,-286);shape.lineTo(552,286);shape.lineTo(-552,286);shape.closePath();
  const g=surfaceUV(new THREE.ExtrudeGeometry(shape,{depth:2,bevelEnabled:false}),1104,572),uv=g.getAttribute('uv');
  const us=Array.from({length:uv.count},(_,i)=>uv.getX(i)),vs=Array.from({length:uv.count},(_,i)=>uv.getY(i));
  assert.equal(Math.min(...us),0);assert.equal(Math.max(...us),1);assert.equal(Math.min(...vs),0);assert.equal(Math.max(...vs),1);g.dispose();
});
