import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { POCKETS } from './physics.ts';
import type { TableDesign } from './tables.ts';

function texture(design:TableDesign,felt=false){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d')!;c.fillStyle=felt?design.felt:design.cabinet;c.fillRect(0,0,512,256);
  let seed=94;const random=()=>((seed=seed*16807%2147483647)/2147483647);
  if(felt){
    for(let i=0;i<14000;i++){c.fillStyle=i%2?'#ffffff0b':'#00000012';c.fillRect(random()*512,random()*256,1,1);}
    c.strokeStyle='#ffffff20';c.lineWidth=.6;c.beginPath();c.moveTo(128,12);c.lineTo(128,244);c.stroke();c.beginPath();c.arc(128,128,40,Math.PI/2,Math.PI*1.5);c.stroke();
    c.fillStyle='#ffffff28';c.textAlign='center';c.font='italic 22px Georgia';c.fillText(design.emblem,285,128);c.font='6px Arial';c.fillText('V E L V E T   B R E A K   /   C U S T O M   C O L L E C T I O N',285,144);
  }else{
    c.strokeStyle=design.grain;c.globalAlpha=design.pattern==='stone'?.34:.2;
    for(let i=0;i<(design.pattern==='stone'?18:100);i++){
      c.beginPath();const y=random()*256;c.moveTo(0,y);
      if(design.pattern==='carbon'){c.lineTo(512,y+160);c.lineWidth=2;}
      else if(design.pattern==='stone'){c.bezierCurveTo(160,y-110,330,y+80,512,y-70);c.lineWidth=random()*2+.3;}
      else{c.bezierCurveTo(150,y+random()*8,350,y-random()*8,512,y);c.lineWidth=random()+.3;}
      c.stroke();
    }
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}

function roundedShape(width:number,depth:number,r:number){
  const s=new THREE.Shape(),x=-width/2,y=-depth/2;
  s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);s.lineTo(x+width,y+depth-r);s.quadraticCurveTo(x+width,y+depth,x+width-r,y+depth);s.lineTo(x+r,y+depth);s.quadraticCurveTo(x,y+depth,x,y+depth-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}

export function buildTableModel(design:TableDesign){
  const group=new THREE.Group();group.name=`table-${design.id}`;
  const wood=new THREE.MeshStandardMaterial({map:texture(design),roughness:design.pattern==='lacquer'?.24:.43,metalness:design.pattern==='carbon'?.45:.08});
  const trim=new THREE.MeshStandardMaterial({color:design.trim,metalness:.62,roughness:.28});
  const dark=new THREE.MeshStandardMaterial({color:'#10151d',roughness:.64});
  const rubber=new THREE.MeshStandardMaterial({color:design.cushion,roughness:.94});
  const cloth=new THREE.MeshStandardMaterial({map:texture(design,true),roughness:.98});
  const glow=new THREE.MeshBasicMaterial({color:design.trim});
  function mesh(geometry:THREE.BufferGeometry,material:THREE.Material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);group.add(m);return m;}
  function box(w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material=wood){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z);}
  function cylinder(rt:number,rb:number,h:number,x:number,y:number,z:number,material:THREE.Material=wood){return mesh(new THREE.CylinderGeometry(rt,rb,h,12),material,x,y,z);}
  function slab(w:number,d:number,h:number,y:number,material:THREE.Material,r=25,holes=false){
    const shape=roundedShape(w,d,r);
    if(holes)for(const p of POCKETS){const hole=new THREE.Path();hole.absarc(p.x-600,-(p.y-330),29,0,Math.PI*2,true);shape.holes.push(hole);}
    const m=mesh(new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSize:2,bevelThickness:2,bevelSegments:1,steps:1,curveSegments:8}),material,0,y,0);m.rotation.x=-Math.PI/2;return m;
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
    box(466,24,49,x,9,z);
    box(454,2,3,x,23,z,trim);
    box(442,18,18,x,7,z<0?-240:240,rubber);
    for(const dx of [-130,0,130]){const diamond=box(5,1,5,x+dx,22,z,trim);diamond.rotation.y=Math.PI/4;}
  }
  for(const x of [-551,551]){
    box(56,24,405,x,9,0);box(3,2,390,x,23,0,trim);box(18,18,406,x<0?-510:510,7,0,rubber);
    for(const z of [-130,0,130]){const diamond=box(5,1,5,x,22,z,trim);diamond.rotation.y=Math.PI/4;}
  }
  for(const p of POCKETS){
    const x=p.x-600,z=p.y-330;
    const pocket=mesh(new THREE.CylinderGeometry(28,23,66,20,1,true),new THREE.MeshBasicMaterial({color:'#080b10',side:THREE.DoubleSide}),x,-29,z);
    pocket.name='recessed-pocket';
    const bottom=mesh(new THREE.CircleGeometry(24,20),dark,x,-61,z);bottom.rotation.x=-Math.PI/2;
    const rim=mesh(new THREE.TorusGeometry(29,2.4,6,32),trim,x,3,z);rim.rotation.x=-Math.PI/2;
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
  for(const material of materials){const map=(material as THREE.MeshStandardMaterial).map;if(map)textures.add(map);material.dispose();}
  for(const map of textures)map.dispose();group.clear();
}
