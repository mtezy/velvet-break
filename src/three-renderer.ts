import * as THREE from 'three';
import { BALL_COLORS, TABLE, POCKETS, aimTrace } from './physics.ts';
import { render as renderFallback, type RenderState } from './render.ts';

/** The game uses a true 3D table and rolling spheres; a Canvas fallback keeps it playable without WebGL. */
export class PoolRenderer {
  renderer:THREE.WebGLRenderer|null=null;
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-630,630,346.5,-346.5,1,4000);
  raycaster=new THREE.Raycaster();plane=new THREE.Plane(new THREE.Vector3(0,1,0),-12);
  balls=new Map<number,{mesh:THREE.Mesh;label:THREE.Sprite;shadow:THREE.Mesh;lastX:number;lastY:number}>();
  aim:THREE.Line;targetLine:THREE.Line;ghost:THREE.Mesh;targetRing:THREE.Mesh;cue=new THREE.Group();calledRing:THREE.Mesh;
  sparks:THREE.Points; fallback:CanvasRenderingContext2D|null=null;
  constructor(public canvas:HTMLCanvasElement){
    const lineMaterial=new THREE.LineDashedMaterial({color:0xc5eedc,dashSize:5,gapSize:8,transparent:true,opacity:.55,depthTest:false});
    this.aim=new THREE.Line(new THREE.BufferGeometry(),lineMaterial);this.targetLine=new THREE.Line(new THREE.BufferGeometry(),lineMaterial.clone());
    this.ghost=new THREE.Mesh(new THREE.RingGeometry(11.5,12.5,48),new THREE.MeshBasicMaterial({color:0xe1f5de,side:THREE.DoubleSide,transparent:true,opacity:.6,depthTest:false}));
    this.targetRing=new THREE.Mesh(new THREE.RingGeometry(17.5,18.3,48),new THREE.MeshBasicMaterial({color:0xf3ce8a,side:THREE.DoubleSide,transparent:true,opacity:.7,depthTest:false}));
    this.calledRing=new THREE.Mesh(new THREE.TorusGeometry(31,1.8,8,64),new THREE.MeshBasicMaterial({color:0xedc783}));
    this.sparks=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({size:4,vertexColors:true,transparent:true,opacity:.8}));
    try{this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});}catch{this.fallback=canvas.getContext('2d');return;}
    // Contact shadows keep the 3D depth without a costly full-scene shadow pass.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));this.renderer.shadowMap.enabled=false;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.35;
    this.camera.position.set(0,1250,625);this.camera.lookAt(0,0,0);
    this.scene.add(new THREE.HemisphereLight(0xe2f9ef,0x24202b,2.3));
    const key=new THREE.DirectionalLight(0xffedcf,3.2);key.position.set(-350,800,-200);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0x87c5e5,1.3);fill.position.set(400,300,500);this.scene.add(fill);
    this.buildTable();this.scene.add(this.aim,this.targetLine,this.ghost,this.targetRing,this.calledRing,this.cue,this.sparks);
    this.ghost.rotation.x=this.targetRing.rotation.x=this.calledRing.rotation.x=-Math.PI/2;
    this.buildCue();
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();});
    this.resize();
  }
  material(color:string|number,roughness=.7,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
  box(width:number,height:number,depth:number,x:number,y:number,z:number,material:THREE.Material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;this.scene.add(mesh);return mesh;}
  buildTable(){
    const wood=this.material('#302b32',.33),edge=this.material('#14151f',.4),brass=this.material('#a38a57',.32,.65),cushion=this.material('#0d4b40',.9);
    this.box(1140,45,600,0,-36,0,edge);this.box(1130,14,590,0,-8,0,wood);
    // Procedural felt: no image downloads, and the texture is original to this game.
    const texCanvas=document.createElement('canvas');texCanvas.width=1024;texCanvas.height=512;
    const c=texCanvas.getContext('2d')!;c.fillStyle='#176457';c.fillRect(0,0,1024,512);let seed=94;
    for(let i=0;i<30000;i++){seed=seed*16807%2147483647;const x=seed%1024;seed=seed*16807%2147483647;const y=seed%512;c.fillStyle=i%2?'#ffffff08':'#0000000c';c.fillRect(x,y,1,1);}
    c.strokeStyle='#c5eedc15';c.lineWidth=1;c.beginPath();c.moveTo(261,5);c.lineTo(261,507);c.stroke();c.beginPath();c.arc(261,256,85,Math.PI/2,Math.PI*1.5);c.stroke();
    c.textAlign='center';c.fillStyle='#b0ddc326';c.font='italic 36px Georgia';c.fillText('velvet club',555,248);c.font='9px Arial';c.fillText('A F T E R   H O U R S   •   S I N C E   2 0 2 6',555,273);
    const feltTexture=new THREE.CanvasTexture(texCanvas);feltTexture.colorSpace=THREE.SRGBColorSpace;feltTexture.anisotropy=Math.min(8,this.renderer!.capabilities.getMaxAnisotropy());
    const felt=new THREE.Mesh(new THREE.PlaneGeometry(1020,480),new THREE.MeshStandardMaterial({map:feltTexture,roughness:1}));felt.rotation.x=-Math.PI/2;felt.position.y=.1;felt.receiveShadow=true;this.scene.add(felt);
    for(const z of [-269,269]){this.box(1112,1.5,1.5,0,8,z,brass);for(const x of [-450,-150,150,450]){const diamond=this.box(5,1,5,x,9,z,this.material('#c6b27b',.3,.5));diamond.rotation.y=Math.PI/4;}}
    for(const x of [-542,542]){this.box(1.5,1.5,536,x,8,0,brass);for(const z of [-135,0,135]){const diamond=this.box(5,1,5,x,9,z,brass);diamond.rotation.y=Math.PI/4;}}
    for(const z of [-240,240])for(const x of [-265,265])this.box(442,15,17,x,5,z,cushion);
    for(const x of [-510,510])this.box(17,15,406,x,5,0,cushion);
    for(const p of POCKETS){const x=p.x-600,z=p.y-330;
      const hole=new THREE.Mesh(new THREE.CircleGeometry(30,48),new THREE.MeshBasicMaterial({color:0x020509}));hole.rotation.x=-Math.PI/2;hole.position.set(x,14,z);hole.renderOrder=2;this.scene.add(hole);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(30,2.3,8,48),this.material('#6c5b3f',.6,.4));ring.rotation.x=-Math.PI/2;ring.position.set(x,12,z);this.scene.add(ring);
    }
  }
  buildCue(){
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(2.2,4,190,16),this.material('#c9b189',.4));shaft.rotation.z=Math.PI/2;shaft.position.x=-95;shaft.castShadow=true;this.cue.add(shaft);
    const grip=new THREE.Mesh(new THREE.CylinderGeometry(3.2,4,83,16),this.material('#6c3b37',.55));grip.rotation.z=Math.PI/2;grip.position.x=-147;this.cue.add(grip);
    const tip=new THREE.Mesh(new THREE.CylinderGeometry(2.3,2.3,5,12),this.material('#8ac8c5'));tip.rotation.z=Math.PI/2;tip.position.x=0;this.cue.add(tip);
  }
  createBall(id:number,x:number,y:number){
    let material:THREE.MeshStandardMaterial;
    if(id>8){const c=document.createElement('canvas');c.width=64;c.height=64;const cx=c.getContext('2d')!;cx.fillStyle='#eee9dc';cx.fillRect(0,0,64,64);cx.fillStyle=BALL_COLORS[id];cx.fillRect(0,19,64,26);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;material=new THREE.MeshStandardMaterial({map:texture,roughness:.23,metalness:.05});}
    else material=this.material(BALL_COLORS[id],.23,.04);
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(TABLE.radius,20,14),material);mesh.position.set(x-600,12,y-330);this.scene.add(mesh);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(13,24),new THREE.MeshBasicMaterial({color:0x020c09,transparent:true,opacity:.24,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.y=.85;shadow.position.set(x-599,.4,y-328);this.scene.add(shadow);
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d')!;
    if(id!==0){c.fillStyle='#f8f3e5';c.beginPath();c.arc(32,32,29,0,Math.PI*2);c.fill();c.fillStyle='#242633';c.font='bold 38px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(String(id),32,34);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true}));label.scale.set(13,13,1);label.position.set(x-600,26,y-330);this.scene.add(label);
    const record={mesh,label,shadow,lastX:x,lastY:y};this.balls.set(id,record);return record;
  }
  resize(){const w=this.canvas.clientWidth,h=w*660/1200;if(this.renderer)this.renderer.setSize(w,h,false);else{this.canvas.width=w*2;this.canvas.height=h*2;}}
  pointer(clientX:number,clientY:number){
    const bounds=this.canvas.getBoundingClientRect();if(!this.renderer)return{x:(clientX-bounds.left)/bounds.width*1200,y:(clientY-bounds.top)/bounds.height*660};
    this.raycaster.setFromCamera(new THREE.Vector2((clientX-bounds.left)/bounds.width*2-1,-(clientY-bounds.top)/bounds.height*2+1),this.camera);
    const point=new THREE.Vector3();this.raycaster.ray.intersectPlane(this.plane,point);return{x:point.x+600,y:point.z+330};
  }
  line(line:THREE.Line,from:{x:number;y:number},to:{x:number;y:number},height=14){line.geometry.setFromPoints([new THREE.Vector3(from.x-600,height,from.y-330),new THREE.Vector3(to.x-600,height,to.y-330)]);line.computeLineDistances();}
  render(state:RenderState){
    if(!this.renderer){if(this.fallback){this.fallback.setTransform(this.canvas.width/1200,0,0,this.canvas.height/660,0,0);renderFallback(this.fallback,state);}return;}
    const ids=new Set(state.balls.map(b=>b.id));
    for(const [id,record]of this.balls){record.mesh.visible=false;record.label.visible=false;record.shadow.visible=false;if(!ids.has(id)){this.scene.remove(record.mesh,record.label,record.shadow);record.mesh.geometry.dispose();(record.mesh.material as THREE.MeshStandardMaterial).map?.dispose();(record.mesh.material as THREE.Material).dispose();record.label.material.map?.dispose();record.label.material.dispose();record.shadow.geometry.dispose();(record.shadow.material as THREE.Material).dispose();this.balls.delete(id);}}
    for(const b of state.balls){let rec=this.balls.get(b.id);if(!rec)rec=this.createBall(b.id,b.x,b.y);rec.mesh.visible=b.active;rec.label.visible=b.active&&b.id!==0;rec.shadow.visible=b.active;
      const dx=b.x-rec.lastX,dz=b.y-rec.lastY,d=Math.hypot(dx,dz);if(d>0&&d<100){const axis=new THREE.Vector3(dz,0,-dx).normalize();rec.mesh.rotateOnWorldAxis(axis,d/TABLE.radius);}rec.lastX=b.x;rec.lastY=b.y;
      rec.mesh.position.set(b.x-600,12,b.y-330);rec.label.position.set(b.x-600,25,b.y-330);rec.shadow.position.set(b.x-599,.4,b.y-328);
    }
    const cue=state.balls[0],aiming=state.aiming&&cue.active;
    this.cue.visible=this.aim.visible=this.ghost.visible=aiming;this.targetRing.visible=this.targetLine.visible=false;
    if(aiming){const trace=aimTrace(state.balls,state.angle);this.line(this.aim,cue,trace);this.ghost.position.set(trace.x-600,14,trace.y-330);
      if(trace.target){const t=trace.target,a=Math.atan2(t.y-trace.y,t.x-trace.x);this.targetRing.visible=this.targetLine.visible=true;this.targetRing.position.set(t.x-600,15,t.y-330);this.line(this.targetLine,t,{x:t.x+Math.cos(a)*95,y:t.y+Math.sin(a)*95});}
      const pull=state.charge?state.power*70:0;this.cue.position.set(cue.x-600-Math.cos(state.angle)*(28+pull),17,cue.y-330-Math.sin(state.angle)*(28+pull));this.cue.rotation.y=-state.angle;
    }
    this.calledRing.visible=state.targetPocket!==undefined;if(state.targetPocket!==undefined){const p=POCKETS[state.targetPocket];this.calledRing.position.set(p.x-600,17,p.y-330);this.calledRing.scale.setScalar(1+Math.sin(state.time*.003)*.025);}
    const positions:number[]=[],colors:number[]=[];for(const p of state.particles){positions.push(p.x-600,15+(1-p.life)*35,p.y-330);const c=new THREE.Color(p.color);colors.push(c.r*p.life,c.g*p.life,c.b*p.life);}
    this.sparks.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));this.sparks.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.sparks.geometry.computeBoundingSphere();
    this.renderer.render(this.scene,this.camera);
  }
}
