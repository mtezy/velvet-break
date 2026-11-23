import * as THREE from 'three';
import { batchStaticMeshes } from './table-model.ts';
import type { CueDesign } from './cues.ts';
/** The tip is the origin; the shaft extends down -X, matching the aiming rig. */
export function buildCueModel(d:CueDesign){
  const cue=new THREE.Group();cue.name=`cue-${d.id}`;
  function surface(color:string,roughness=.4,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
  function pattern(base:string,wrap=false){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d')!;c.fillStyle=base;c.fillRect(0,0,256,128);for(let i=0;i<128;i+=4){c.strokeStyle=i%8?'#ffffff15':'#00000020';c.lineWidth=1;c.beginPath();c.moveTo(0,i);c.lineTo(256,i+(wrap?65:Math.sin(i)*5));c.stroke();}if(d.pattern==='carbon'&&!wrap){for(let x=0;x<256;x+=12)for(let y=0;y<128;y+=8){c.fillStyle=(x/12+y/8)%2?'#ffffff12':'#0000002b';c.fillRect(x,y,10,6);}}const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;}
  const shaft=surface(d.shaft,.34),butt=new THREE.MeshStandardMaterial({map:pattern(d.butt),roughness:.23,metalness:.08}),wrap=new THREE.MeshStandardMaterial({map:pattern(d.wrap,true),roughness:.8}),trim=surface(d.trim,.2,.75),tip=surface('#597f86',.88),ivory=surface('#f2e6ca',.35),accent=surface(d.accent,.23,.2);
  function cylinder(x:number,length:number,radius1:number,radius2:number,m:THREE.Material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius1,radius2,length,20),m);mesh.rotation.z=Math.PI/2;mesh.position.x=x;cue.add(mesh);}
  cylinder(-1.5,3,1.8,1.8,tip);cylinder(-8,10,1.9,2.1,ivory);cylinder(-126,226,2.1,4.0,shaft);cylinder(-243,8,4,4.4,trim);cylinder(-273,52,4.4,5.1,butt);cylinder(-302,6,5.1,5.2,trim);cylinder(-343,76,5.2,5.8,wrap);cylinder(-384,6,5.8,5.9,trim);cylinder(-400,26,5.9,6.1,butt);cylinder(-415,4,6.1,6.1,trim);cylinder(-420,6,5.8,5.8,surface('#152021',.7));
  for(const x of [-250,-292,-306,-378,-390,-409])cylinder(x,1.2,x<-300?5.9:4.9,x<-300?5.9:4.9,trim);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;const inlay=new THREE.Mesh(new THREE.OctahedronGeometry(2.6,0),accent);inlay.scale.set(6,1,1);inlay.position.set(-271,Math.sin(a)*4.9,Math.cos(a)*4.9);inlay.rotation.x=-a;cue.add(inlay);}
  batchStaticMeshes(cue);return cue;
}
