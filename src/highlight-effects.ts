import * as THREE from 'three';
import { POCKETS, type PhysicsEvent } from './physics.ts';

const glowDuration=340,shakeDuration=200;
const warmWhite=new THREE.Color('#fff1cf');

export class PocketHighlights {
  private geometry=new THREE.PlaneGeometry(1,1);
  private glows=new Map<number,{mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;start:number}>();
  private lastPot=-Infinity;
  private active=false;
  private shakeCamera=new THREE.PerspectiveCamera();
  private scene:THREE.Scene;
  private map:THREE.Texture;
  view?:THREE.PerspectiveCamera;

  constructor(scene:THREE.Scene,map:THREE.Texture){this.scene=scene;this.map=map;}

  pot(event:PhysicsEvent,color:string,time:number){
    let index=event.pocket;
    if(index===undefined){
      const {x,y}=event.ball;
      index=0;
      for(let i=1;i<POCKETS.length;i++){
        const a=POCKETS[i],b=POCKETS[index];
        if(Math.hypot(a.x-x,a.y-y)<Math.hypot(b.x-x,b.y-y))index=i;
      }
    }
    const pocket=POCKETS[index];
    if(!pocket)return;
    let glow=this.glows.get(index);
    if(!glow){
      const material=new THREE.MeshBasicMaterial({map:this.map,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
      const mesh=new THREE.Mesh(this.geometry,material);
      mesh.position.set(pocket.x-600,18,pocket.y-330);
      mesh.rotation.x=-Math.PI/2;
      mesh.visible=false;
      this.scene.add(mesh);
      glow={mesh,start:time};
      this.glows.set(index,glow);
    }
    glow.mesh.material.color.set(color).lerp(warmWhite,.55);
    glow.start=this.lastPot=time;
  }

  clear(){
    this.lastPot=-Infinity;
    for(const glow of this.glows.values()){glow.start=-Infinity;glow.mesh.visible=false;}
    this.view=undefined;
  }

  update(time:number,camera:THREE.PerspectiveCamera,enabled:boolean,economy:boolean,reducedMotion:boolean){
    const wasActive=this.active;
    this.active=false;
    this.view=undefined;
    if(!enabled){
      if(this.lastPot!==-Infinity)this.clear();
      return wasActive;
    }
    for(const {mesh,start} of this.glows.values()){
      const t=Math.max(0,time-start)/glowDuration;
      mesh.visible=t<1;
      if(!mesh.visible)continue;
      this.active=true;
      mesh.scale.setScalar((economy?84:100)+t*22);
      mesh.material.opacity=(economy?.48:.78)*(1-t)**2;
    }
    const t=Math.max(0,time-this.lastPot)/shakeDuration;
    if(!reducedMotion&&t<1){
      const amplitude=(economy?1.5:4.5)*(1-t)**2;
      this.view=this.shakeCamera.copy(camera,false);
      this.view.translateX(Math.sin(t*18)*amplitude);
      this.view.translateY(Math.sin(t*24)*amplitude*.55);
    }
    return wasActive||this.active;
  }
}

export class BreakFlash {
  private layer:HTMLDivElement;
  private animation?:Animation;

  constructor(canvas:HTMLCanvasElement){
    this.layer=document.createElement('div');
    this.layer.className='break-highlight';
    this.layer.setAttribute('aria-hidden','true');
    canvas.after(this.layer);
  }

  start(economy:boolean){
    this.clear();
    this.layer.classList.toggle('break-highlight-economy',economy);
    const peak=economy?.48:.64;
    this.animation=this.layer.animate([
      {opacity:peak},
      {opacity:peak,offset:.14,easing:'ease-out'},
      {opacity:0},
    ],{duration:230});
  }

  clear(){this.animation?.cancel();}
}
