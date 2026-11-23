import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStaticMeshes, buildTableModel, disposeTableModel } from '../src/table-model.ts';
import { getTableDesign } from '../src/tables.ts';
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

test('Economy keeps the textured surfaces and skips the detailed finish maps and coat',t=>{
  const noop=()=>{},gradient={addColorStop:noop};
  const context={save:noop,restore:noop,translate:noop,scale:noop,fillRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,bezierCurveTo:noop,
    stroke:noop,arc:noop,fill:noop,fillText:noop,createLinearGradient:()=>gradient,createRadialGradient:()=>gradient};
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>({...context})})}});
  t.after(()=>Reflect.deleteProperty(globalThis,'document'));

  function surfaces(detailed:boolean){
    const table=buildTableModel(getTableDesign('heritage'),detailed);
    const materials=table.children.map(mesh=>(mesh as THREE.Mesh).material as THREE.MeshStandardMaterial);
    const [wood,cloth]=materials.filter(m=>m.map?.image.width===(detailed?1024:512));
    const leather=materials.find(m=>m.vertexColors)!;
    assert.equal(materials.filter(m=>m.vertexColors).length,1,'pocket leather meshes share one batch');
    assert.equal(leather.map?.image.width,detailed?128:64);
    return{table,wood,cloth,leather};
  }

  const economy=surfaces(false),detailed=surfaces(true);
  assert.ok(!(economy.wood instanceof THREE.MeshPhysicalMaterial));
  assert.equal(economy.cloth.normalMap,null);assert.equal(economy.cloth.roughnessMap,null);
  assert.equal(economy.leather.bumpMap,null);
  assert.ok(detailed.wood instanceof THREE.MeshPhysicalMaterial&&detailed.wood.clearcoat>0);
  assert.equal(detailed.cloth.normalMap?.wrapS,THREE.RepeatWrapping);
  assert.ok(detailed.cloth.roughnessMap?.generateMipmaps);
  assert.equal(detailed.leather.bumpMap,detailed.leather.map);

  const disposed=new Set<THREE.Texture>();
  const maps=[detailed.cloth.normalMap!,detailed.cloth.roughnessMap!,detailed.leather.map!];
  for(const map of maps)map.addEventListener('dispose',()=>{assert.ok(!disposed.has(map));disposed.add(map);});
  disposeTableModel(detailed.table);disposeTableModel(economy.table);
  assert.equal(disposed.size,maps.length);
});
