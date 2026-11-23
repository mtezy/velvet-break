import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { POCKETS } from './physics.ts';
import type { TableDesign } from './tables.ts';
import { tableTexture, cushionGeometry, surfaceUV } from './surfaces.ts';

function roundedShape(width:number,depth:number,r:number){
  const s=new THREE.Shape(),x=-width/2,y=-depth/2;
  s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);s.lineTo(x+width,y+depth-r);s.quadraticCurveTo(x+width,y+depth,x+width-r,y+depth);s.lineTo(x+r,y+depth);s.quadraticCurveTo(x,y+depth,x,y+depth-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}

export function buildTableModel(design:TableDesign,highQuality=true){
  const group=new THREE.Group();group.name=`table-${design.id}`;
  const woodMap=tableTexture(design.cabinet,design.pattern),wood=highQuality?new THREE.MeshPhysicalMaterial({map:woodMap,roughness:design.pattern==='lacquer'?.19:.34,metalness:design.pattern==='carbon'?.3:.04,envMapIntensity:.32,clearcoat:.5,clearcoatRoughness:.18}):new THREE.MeshStandardMaterial({map:woodMap,roughness:.34,metalness:.04,envMapIntensity:.32});
  const trim=new THREE.MeshStandardMaterial({color:design.trim,metalness:.62,roughness:.28});
  const dark=new THREE.MeshStandardMaterial({color:'#10151d',roughness:.64});
  const rubber=new THREE.MeshStandardMaterial({color:design.cushion,roughness:.86});
  const clothMap=tableTexture(design.felt,'cloth'),cloth=highQuality?new THREE.MeshPhysicalMaterial({map:clothMap,roughness:.94,sheen:.3,sheenColor:new THREE.Color(design.felt).lerp(new THREE.Color('#eee7d3'),.2),sheenRoughness:.9}):new THREE.MeshStandardMaterial({map:clothMap,roughness:.96});
  if(highQuality){const weaveCanvas=document.createElement('canvas');weaveCanvas.width=weaveCanvas.height=64;const wc=weaveCanvas.getContext('2d')!;wc.fillStyle='#8080ff';wc.fillRect(0,0,64,64);for(let i=0;i<64;i+=4){wc.fillStyle='#9280fc';wc.fillRect(i,0,1,64);wc.fillStyle='#808dfc';wc.fillRect(0,i,64,1);}const normal=new THREE.CanvasTexture(weaveCanvas);normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.repeat.set(24,12);cloth.normalMap=normal;cloth.normalScale.set(.12,.12);}
  const glow=new THREE.MeshBasicMaterial({color:design.trim});
  function mesh(geometry:THREE.BufferGeometry,material:THREE.Material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);group.add(m);return m;}
  function box(w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material=wood){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z);}
  function rail(w:number,d:number,x:number,z:number){const s=roundedShape(w,d,5);const m=mesh(surfaceUV(new THREE.ExtrudeGeometry(s,{depth:21,bevelEnabled:true,bevelSize:3,bevelThickness:3,bevelSegments:3,curveSegments:6}),w,d),wood,x,1,z);m.rotation.x=-Math.PI/2;return m;}
  function cylinder(rt:number,rb:number,h:number,x:number,y:number,z:number,material:THREE.Material=wood){return mesh(new THREE.CylinderGeometry(rt,rb,h,12),material,x,y,z);}
  function slab(w:number,d:number,h:number,y:number,material:THREE.Material,r=25,holes=false){
    const shape=roundedShape(w,d,r);
    if(holes)for(const p of POCKETS){const hole=new THREE.Path();hole.absarc(p.x-600,-(p.y-330),29,0,Math.PI*2,true);shape.holes.push(hole);}
    const m=mesh(surfaceUV(new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSize:2,bevelThickness:2,bevelSegments:1,steps:1,curveSegments:8}),w,d),material,0,y,0);m.rotation.x=-Math.PI/2;return m;
  }
  function brace(x1:number,y1:number,z1:number,x2:number,y2:number,z2:number,width:number,material:THREE.Material=wood){
    const a=new THREE.Vector3(x1,y1,z1),b=new THREE.Vector3(x2,y2,z2),delta=b.clone().sub(a);
    const m=mesh(new THREE.BoxGeometry(width,delta.length(),width),material);m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  }
  // A freestanding cabinet, not a plane: slate, deep apron, supports and feet.
  slab(1158,638,63,-91,wood,design.architecture==='retro'?62:32);
  slab(1148,628,8,-100,trim,34);
  slab(1164,646,18,-25,wood,40,true);
  slab(1104,572,2,-4,cloth,18,true);
  for(const z of [-317,317]){
    box(1010,6,3,0,-49,z,trim);
    // Visible cabinet panels give the front apron real recesses and edges.
    for(const x of [-355,0,355])box(280,29,3,x,-72,z,dark);
    if(design.neon)box(960,4,4,0,-32,z,glow);
  }
  // Segmented rails leave physical openings at all six pocket mouths.
  for(const z of [-282,282])for(const x of [-272,272]){
    rail(470,57,x,z<0?-292:292);
    box(450,1,1.4,x,25,z<0?-307:307,trim);
    const cushion=mesh(cushionGeometry(464),rubber,x,0,z<0?-240:240);if(z>0)cushion.rotation.y=Math.PI;
    for(const dx of [-130,0,130]){const diamond=box(4.5,1,7,x+dx,26,z<0?-289:289,trim);diamond.rotation.y=Math.PI/4;}
  }
  for(const x of [-551,551]){
    rail(430,57,x,0).rotation.z=Math.PI/2;
    // End rails run across Z, their cloth noses face the playing rectangle.
    const cushion=mesh(cushionGeometry(442),rubber,x<0?-510:510,0,0);cushion.rotation.y=x<0?Math.PI/2:-Math.PI/2;
    box(1.4,1,400,x<0?-568:568,25,0,trim);
    for(const z of [-130,0,130]){const diamond=box(7,1,4.5,x,26,z,trim);diamond.rotation.y=Math.PI/4;}
  }
  const leather=new THREE.MeshStandardMaterial({color:'#171512',roughness:.72});
  const pocketBlack=new THREE.MeshBasicMaterial({color:'#010403',side:THREE.DoubleSide});
  for(const p of POCKETS){
    const x=p.x-600,z=p.y-330;
    const pocket=mesh(new THREE.CylinderGeometry(28,23,66,32,1,true),pocketBlack,x,-29,z);
    pocket.name='recessed-pocket';
    // Above the solid lower cabinet: the well must never reveal its apron.
    const bottom=mesh(new THREE.CircleGeometry(28,32),pocketBlack,x,-24,z);bottom.rotation.x=-Math.PI/2;
    const rim=mesh(new THREE.RingGeometry(27,37,40),leather,x,1.8,z);rim.rotation.x=-Math.PI/2;
    const lip=mesh(new THREE.TorusGeometry(28.5,1.7,6,40),leather,x,1,z);lip.rotation.x=-Math.PI/2;
  }
  const kind=design.architecture;
  if(kind==='turned'||kind==='columns'||kind==='retro'){
    for(const x of [-437,437])for(const z of [-209,209]){
      if(kind==='retro'){
        brace(x,-90,z,x*1.13,-271,z*1.17,33);cylinder(25,25,12,x*1.13,-277,z*1.17,trim);
      }else{
        box(62,32,62,x,-114,z);
        cylinder(kind==='columns'?27:17,kind==='columns'?27:31,125,x,-190,z);
        cylinder(34,29,18,x,-137,z,trim);cylinder(31,37,18,x,-259,z,trim);
        cylinder(38,40,12,x,-274,z,dark);
        if(kind==='turned'){cylinder(32,20,35,x,-162,z);cylinder(20,32,38,x,-220,z);}
        else for(const dx of [-13,13])box(3,96,3,x+dx,-194,z+27,trim);
      }
    }
    if(kind==='columns'){box(820,14,18,0,-220,0,trim);for(const z of [-210,210])box(850,4,4,0,-91,z,trim);}
  }else if(kind==='monolith'){
    slab(850,368,152,-267,wood,12);slab(938,450,17,-284,dark,15);slab(865,383,5,-258,trim,12);
  }else if(kind==='pedestal'){
    for(const x of [-340,340]){box(108,175,260,x,-180,0);box(230,14,353,x,-278,0,trim);box(116,110,18,x,-190,139,trim);}
  }else if(kind==='beams'){
    for(const x of [-430,430]){
      box(80,174,380,x,-183,0);box(135,18,470,x,-279,0,dark);
      box(90,14,420,x,-114,0,trim);
    }
    box(850,38,42,0,-228,0);for(const sign of [-1,1])brace(sign*430,-120,0,sign*235,-228,0,24,trim);
  }else{
    for(const x of [-360,360]){
      box(300,17,448,x,-279,0,dark);
      for(const sign of [-1,1]){
        brace(x-sign*70,-102,sign*170,x+sign*60,-268,sign*124,kind==='arena'?62:38);
        if(design.neon)brace(x-sign*70,-106,sign*192,x+sign*60,-264,sign*146,5,glow);
      }
    }
    box(760,34,60,0,-180,0,trim);
  }
  // Floor and a soft baked contact shadow cost no shadow-map render passes.
  // The cabinet now stands on the club's floor, not a showroom display slab.
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=64;
  const sc=shadowCanvas.getContext('2d')!;sc.scale(1,.5);const gradient=sc.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'#000000b0');gradient.addColorStop(.65,'#00000060');gradient.addColorStop(1,'#00000000');sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
  const shadow=mesh(new THREE.PlaneGeometry(1510,1080),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}),0,-281,5);shadow.rotation.x=-Math.PI/2;
  // Static batching keeps eight detailed designs inexpensive on mobile GPUs.
  batchStaticMeshes(group);
  return group;
}

/** Extrusions have no index; primitives do. Normalize before material batching. */
export function batchStaticMeshes(group:THREE.Group){
  group.updateMatrixWorld(true);
  const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
  for(const child of group.children){
    const m=child as THREE.Mesh,copy=m.geometry.clone(),g=copy.index?copy.toNonIndexed():copy;
    if(g!==copy)copy.dispose();g.applyMatrix4(m.matrixWorld);
    const material=m.material as THREE.Material,batch=batches.get(material)??[];batch.push(g);batches.set(material,batch);m.geometry.dispose();
  }
  group.clear();
  for(const [material,geometries]of batches){
    const merged=mergeGeometries(geometries);
    if(merged){group.add(new THREE.Mesh(merged,material));for(const g of geometries)g.dispose();}
    else for(const g of geometries)group.add(new THREE.Mesh(g,material));
  }
}

export function disposeTableModel(group:THREE.Group){
  const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  group.traverse(child=>{if(child instanceof THREE.Mesh){child.geometry.dispose();for(const material of Array.isArray(child.material)?child.material:[child.material])materials.add(material);}});
  for(const material of materials){const standard=material as THREE.MeshStandardMaterial;for(const map of [standard.map,standard.normalMap])if(map)textures.add(map);material.dispose();}
  for(const map of textures)map.dispose();group.clear();
}
