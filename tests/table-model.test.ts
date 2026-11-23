import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStaticMeshes, disposeTableModel } from '../src/table-model.ts';
test('table batching retains extruded cabinets and indexed rails/legs under a shared material',()=>{
  const group=new THREE.Group(),material=new THREE.MeshStandardMaterial();
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(10,0);shape.lineTo(10,10);shape.lineTo(0,10);shape.closePath();
  const body=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:10,bevelEnabled:false}),material);
  const leg=new THREE.Mesh(new THREE.CylinderGeometry(1,1,20,8),material);leg.position.set(40,-15,10);
  const rail=new THREE.Mesh(new THREE.BoxGeometry(50,1,1),material);rail.position.set(5,15,0);
  group.add(body,leg,rail);
  const vertices=group.children.reduce((n,m)=>{const g=(m as THREE.Mesh).geometry;return n+(g.index?.count??g.attributes.position.count);},0);
  batchStaticMeshes(group);assert.equal(group.children.length,1);
  const merged=(group.children[0] as THREE.Mesh).geometry;
  assert.equal(merged.attributes.position.count,vertices);merged.computeBoundingBox();
  assert.ok(merged.boundingBox!.max.x>=41);assert.ok(merged.boundingBox!.min.y<=-25);assert.ok(merged.boundingBox!.max.y>=15.5);
  disposeTableModel(group);assert.equal(group.children.length,0);
});
