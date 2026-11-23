import * as THREE from 'three';

/** Original, deterministic materials: no network textures or per-frame painting. */
export function tableTexture(base:string,kind:'cloth'|'wood'|'carbon'|'stone'|'lacquer',detailed:boolean,grain=base){
  const canvas=document.createElement('canvas'),scale=detailed?1:.5;canvas.width=1024*scale;canvas.height=512*scale;
  const c=canvas.getContext('2d')!;c.scale(scale,scale);c.fillStyle=base;c.fillRect(0,0,1024,512);
  let seed=731;const random=()=>((seed=seed*16807%2147483647)/2147483647);
  if(kind==='cloth'){
    // The broad amber bounce is baked into the cloth so it needs no extra render pass.
    c.save();c.translate(512,212);c.scale(610,292);
    const lamp=c.createRadialGradient(0,0,0,0,0,1);lamp.addColorStop(0,'#ffc67965');lamp.addColorStop(.35,'#ffc6794d');lamp.addColorStop(.7,'#ffc6791e');lamp.addColorStop(1,'#ffc67900');c.fillStyle=lamp;c.fillRect(-1,-1,2,2);c.restore();
    const pitch=detailed?3:4;
    for(const [color,offset] of [['#f4fff125',0],['#0012112f',1]] as const){
      c.strokeStyle=color;c.lineWidth=1;c.beginPath();
      for(let row=0;row*pitch<512;row++)for(let col=0;col*pitch<1024;col++){
        if((row+col)%2!==offset)continue;
        const x=col*pitch+random()*.8,y=row*pitch+random()*.8;
        c.moveTo(x,y);c.lineTo(x+(offset?pitch*.8:.3),y+(offset?.3:pitch*.8));
      }
      c.stroke();
    }
    for(let i=0;i<(detailed?14000:6500);i++){c.fillStyle=i%2?'#ffffff15':'#00000019';c.fillRect(random()*1024,random()*512,1.8,.7);}
    const edge=c.createRadialGradient(512,256,0,512,256,580);edge.addColorStop(.58,'#001b2100');edge.addColorStop(1,'#001b2190');c.fillStyle=edge;c.fillRect(0,0,1024,512);
    // Cushion contact occlusion is baked into the nap, not a shadow-map pass.
    for(const [x,y,w,h,vertical,reverse] of [[38,40,22,432,0,0],[964,40,22,432,0,1],[38,40,948,18,1,0],[38,454,948,18,1,1]]){
      const g=c.createLinearGradient(x,y,x+(vertical?0:w),y+(vertical?h:0));g.addColorStop(reverse?1:0,'#00191c70');g.addColorStop(reverse?0:1,'#00191c00');c.fillStyle=g;c.fillRect(x,y,w,h);
    }
    // Head string, head/foot spots and discreet house mark.
    c.strokeStyle='#d5e6df28';c.lineWidth=.8;c.beginPath();c.moveTo(256,15);c.lineTo(256,497);c.stroke();
    for(const x of [256,768]){c.fillStyle='#e5ece399';c.beginPath();c.arc(x,256,1.8,0,Math.PI*2);c.fill();}
    c.textAlign='center';c.fillStyle='#e0ede818';c.font='500 13px Arial';c.fillText('V E L V E T   B R E A K',512,352);c.font='6px Arial';c.fillText('P R E C I S I O N   B I L L I A R D S',512,369);
  }else if(kind==='wood'){
    const lines=detailed?480:260;
    for(let i=0;i<lines;i++){
      const y=random()*512,phase=y*.047;
      c.strokeStyle=i%5===0?`${grain}44`:i%2?`${grain}22`:'#160b0759';
      c.lineWidth=i%7===0?3+random()*8:.35+random()*1.7;
      c.beginPath();c.moveTo(0,y);
      c.bezierCurveTo(160,y+Math.cos(phase)*25,245,y-Math.sin(phase)*42,490,y+Math.sin(phase)*15);
      c.bezierCurveTo(685,y+Math.cos(phase)*33,860,y-Math.cos(phase)*19,1024,y+Math.sin(phase)*9);
      c.stroke();
    }
  }else{
    for(let i=0;i<(detailed?420:220);i++){
      const y=random()*512;c.strokeStyle=i%4?'#08040128':'#ebc18a26';c.lineWidth=random()*1.8+.3;c.beginPath();c.moveTo(0,y);
      if(kind==='stone')c.bezierCurveTo(290,y-110,670,y+140,1024,y-80);
      else if(kind==='carbon'){c.lineTo(1024,y+420);c.lineWidth=2;}
      else c.bezierCurveTo(240,y+random()*18,710,y-random()*18,1024,y+random()*6);
      c.stroke();
    }
    const gloss=c.createLinearGradient(0,0,0,512);gloss.addColorStop(0,'#ffffff20');gloss.addColorStop(.23,'#ffffff00');gloss.addColorStop(.76,'#00000010');gloss.addColorStop(1,'#00000055');c.fillStyle=gloss;c.fillRect(0,0,1024,512);
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=detailed?4:2;return map;
}

export function contactShadow(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d')!;
  const g=c.createRadialGradient(32,32,4,32,32,31);g.addColorStop(0,'#020603f2');g.addColorStop(.35,'#020603d4');g.addColorStop(.62,'#02060391');g.addColorStop(.82,'#02060332');g.addColorStop(1,'#02060300');c.fillStyle=g;c.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);
}

export function placeBallShadow(shadow:THREE.Object3D,ball:THREE.Vector3,lamp:THREE.Vector3,economy:boolean){
  const height=.4;
  if(economy){
    shadow.position.set(ball.x,height,ball.z);
    shadow.rotation.set(-Math.PI/2,0,0);
    shadow.scale.set(1,1,1);
    return;
  }
  const dx=ball.x-lamp.x,dz=ball.z-lamp.z;
  const projection=(ball.y-height)/(lamp.y-ball.y);
  const spread=Math.hypot(dx,dz)/(lamp.y-ball.y);
  shadow.position.set(ball.x+dx*projection,height,ball.z+dz*projection);
  shadow.rotation.set(-Math.PI/2,0,-Math.atan2(dz,dx));
  shadow.scale.set(1.17+spread*.32,1,1);
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
