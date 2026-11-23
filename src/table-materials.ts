import * as THREE from 'three';
import { tableTexture } from './surfaces.ts';
import type { TableDesign } from './tables.ts';

function clothFinish(){
  const size=64,normal=new Uint8Array(size*size*4),roughness=new Uint8Array(normal.length);
  function weave(x:number,y:number){
    const warp=Math.PI*x/2,weft=Math.PI*y/2;
    const crossover=Math.cos(warp/2)*Math.cos(weft/2);
    return Math.cos(warp)*(.55+.45*crossover)+Math.cos(weft)*(.55-.45*crossover);
  }
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,dx=(weave(x-1,y)-weave(x+1,y))*.28,dy=(weave(x,y-1)-weave(x,y+1))*.28;
    const length=Math.hypot(dx,dy,1),r=231+weave(x,y)*12;
    normal.set([(1+dx/length)*127.5,(1+dy/length)*127.5,(1+1/length)*127.5,255],i);
    roughness.set([r,r,r,255],i);
  }
  function tile(data:Uint8Array){
    const texture=new THREE.DataTexture(data,size,size);
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(32,16);
    texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps=true;texture.needsUpdate=true;
    return texture;
  }
  return{normalMap:tile(normal),roughnessMap:tile(roughness)};
}

function leatherGrain(detailed:boolean){
  const canvas=document.createElement('canvas'),size=detailed?128:64;
  canvas.width=canvas.height=size;
  const c=canvas.getContext('2d')!;
  c.fillStyle='#ded9d3';c.fillRect(0,0,size,size);
  let seed=211;
  const random=()=>((seed=seed*16807%2147483647)/2147483647);
  for(let i=0;i<size*size/5;i++){
    const x=random()*size,y=random()*size,r=.4+random()*(detailed?1.4:.8);
    c.fillStyle='#4a34254d';c.fillRect(x,y,r*1.7,r);
    c.fillStyle='#fff8ed55';c.fillRect(x,y+r,r*1.2,.6);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  return map;
}

export function tableMaterials(design:TableDesign,detailed:boolean){
  const timber=design.pattern==='wood';
  const cabinet={map:tableTexture(design.cabinet,design.pattern,detailed,design.grain),
    roughness:timber?.28:design.pattern==='lacquer'?.19:.34,metalness:design.pattern==='carbon'?.3:timber?0:.04,
    envMapIntensity:timber?.72:.32};
  const wood=detailed?new THREE.MeshPhysicalMaterial({...cabinet,clearcoat:timber?.88:.5,clearcoatRoughness:timber?.14:.18}):new THREE.MeshStandardMaterial(cabinet);
  const trim=new THREE.MeshStandardMaterial({color:design.trim,metalness:.76,roughness:.26,envMapIntensity:.9});
  const fabric={map:tableTexture(design.felt,'cloth',detailed),roughness:.98};
  const cloth=detailed?new THREE.MeshPhysicalMaterial({...fabric,...clothFinish(),normalScale:new THREE.Vector2(.24,.24),
    sheen:.25,sheenColor:new THREE.Color(design.felt).lerp(new THREE.Color('#eee7d3'),.2),sheenRoughness:.86}):new THREE.MeshStandardMaterial(fabric);
  const grain=leatherGrain(detailed);
  const leather=new THREE.MeshStandardMaterial({map:grain,color:'#4d3426',roughness:.62,envMapIntensity:.35,vertexColors:true,
    side:THREE.DoubleSide,...(detailed?{bumpMap:grain,bumpScale:.22}:{})});
  return{wood,trim,cloth,leather};
}
