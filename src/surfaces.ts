import * as THREE from 'three';

/** Original, deterministic materials: no network textures or per-frame painting. */
export function tableTexture(base:string,kind:'cloth'|'wood'|'carbon'|'stone'|'lacquer'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const c=canvas.getContext('2d')!;c.fillStyle=base;c.fillRect(0,0,1024,512);
  let seed=731;const random=()=>((seed=seed*16807%2147483647)/2147483647);
  if(kind==='cloth'){
    // Fine worsted nap, with a broad baked light pool rather than a noisy flat fill.
    for(let i=0;i<65000;i++){c.fillStyle=i%2?'#ffffff0c':'#00000010';c.fillRect(random()*1024,random()*512,1,.65);}
    const light=c.createRadialGradient(470,240,40,512,256,580);light.addColorStop(0,'#b9e7d00e');light.addColorStop(.58,'#00000000');light.addColorStop(1,'#001b2190');c.fillStyle=light;c.fillRect(0,0,1024,512);
    // Cushion contact occlusion is baked into the nap, not a shadow-map pass.
    for(const [x,y,w,h,vertical,reverse] of [[38,40,22,432,0,0],[964,40,22,432,0,1],[38,40,948,18,1,0],[38,454,948,18,1,1]]){
      const g=c.createLinearGradient(x,y,x+(vertical?0:w),y+(vertical?h:0));g.addColorStop(reverse?1:0,'#00191c70');g.addColorStop(reverse?0:1,'#00191c00');c.fillStyle=g;c.fillRect(x,y,w,h);
    }
    // Head string, head/foot spots and discreet house mark.
    c.strokeStyle='#d5e6df28';c.lineWidth=.8;c.beginPath();c.moveTo(256,15);c.lineTo(256,497);c.stroke();
    for(const x of [256,768]){c.fillStyle='#e5ece399';c.beginPath();c.arc(x,256,1.8,0,Math.PI*2);c.fill();}
    c.textAlign='center';c.fillStyle='#e0ede818';c.font='500 13px Arial';c.fillText('V E L V E T   B R E A K',512,352);c.font='6px Arial';c.fillText('P R E C I S I O N   B I L L I A R D S',512,369);
  }else{
    for(let i=0;i<420;i++){
      const y=random()*512;c.strokeStyle=i%4?'#08040128':'#ebc18a26';c.lineWidth=random()*1.8+.3;c.beginPath();c.moveTo(0,y);
      if(kind==='stone')c.bezierCurveTo(290,y-110,670,y+140,1024,y-80);
      else if(kind==='carbon'){c.lineTo(1024,y+420);c.lineWidth=2;}
      else c.bezierCurveTo(240,y+random()*18,710,y-random()*18,1024,y+random()*6);
      c.stroke();
    }
    const gloss=c.createLinearGradient(0,0,0,512);gloss.addColorStop(0,'#ffffff20');gloss.addColorStop(.23,'#ffffff00');gloss.addColorStop(.76,'#00000010');gloss.addColorStop(1,'#00000055');c.fillStyle=gloss;c.fillRect(0,0,1024,512);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
}

export function contactShadow(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d')!;
  const g=c.createRadialGradient(32,32,0,32,32,31);g.addColorStop(0,'#020509eb');g.addColorStop(.42,'#020509c9');g.addColorStop(.65,'#02050979');g.addColorStop(.82,'#02050928');g.addColorStop(1,'#02050900');c.fillStyle=g;c.fillRect(0,0,64,64);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}

/** A tapered K-profile nose meets the unchanged physics boundary exactly. */
export function cushionGeometry(length:number){
  const shape=new THREE.Shape();shape.moveTo(-length/2+18,0);shape.lineTo(length/2-18,0);shape.lineTo(length/2,27);shape.lineTo(-length/2,27);shape.closePath();
  const g=new THREE.ExtrudeGeometry(shape,{depth:20,bevelEnabled:true,bevelSize:1.2,bevelThickness:1.2,bevelSegments:2,steps:1});
  // Rotate, do not exchange axes (which reverses winding and hides the top).
  g.rotateX(-Math.PI/2);const p=g.getAttribute('position');for(let i=0;i<p.count;i++)if(p.getY(i)>10)p.setZ(i,p.getZ(i)-3);g.computeVertexNormals();return g;
}

/** ExtrudeGeometry uses world-unit UVs; cloth needs normalized top-face UVs. */
export function surfaceUV(geometry:THREE.BufferGeometry,width:number,depth:number){
  const p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/width+.5,p.getY(i)/depth+.5);return geometry;
}
