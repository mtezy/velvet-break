import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BALL_COLORS, TABLE, POCKETS, aimTrace, predictCuePath } from './physics.ts';
import { render as renderFallback, type RenderState } from './render.ts';
import { getTableDesign, type TableDesign } from './tables.ts';
import { buildTableModel, disposeTableModel } from './table-model.ts';
import { buildClubRoom } from './club-room.ts';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DEFAULT_CAMERA, type CameraSettings } from './camera-settings.ts';
import { buildCueModel } from './cue-model.ts';
import { getCueDesign, type CueDesign } from './cues.ts';

/** The game uses a true 3D table and rolling spheres; a Canvas fallback keeps it playable without WebGL. */
export class PoolRenderer {
  renderer:THREE.WebGLRenderer|null=null;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1200/780,10,12000);
  controls:OrbitControls|null=null;tableModel=new THREE.Group();design:TableDesign=getTableDesign('heritage');
  dirty=true;lastRenderKey='';view:'club'|'overhead'|'custom'='club';effects=true;customCamera:CameraSettings={...DEFAULT_CAMERA};
  cueDesign=getCueDesign(null);cueDisplay=new THREE.Group();cueInspection=false;cueSpin=0;
  pulses:{mesh:THREE.Mesh;age:number;duration:number;radius:number}[]=[];
  raycaster=new THREE.Raycaster();plane=new THREE.Plane(new THREE.Vector3(0,1,0),-12);
  balls=new Map<number,{mesh:THREE.Mesh;shadow:THREE.Mesh;lastX:number;lastY:number}>();
  aim:THREE.Line;targetLine:THREE.Line;ghost:THREE.Mesh;targetRing:THREE.Mesh;cue=new THREE.Group();calledRing:THREE.Mesh;
  sparks:THREE.Points; fallback:CanvasRenderingContext2D|null=null;lastTime=0;
  clubRoom=new THREE.Group();titleMode=false;quality:'auto'|'high'|'economy'='auto';software=false;renderScale=1;averageFrame=.016;qualityFrames=0;
  cuePath=new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(37*3),3)).setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(37*4),4)),new THREE.LineBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,opacity:.8,depthTest:false,depthWrite:false}));
  constructor(public canvas:HTMLCanvasElement){
    const lineMaterial=new THREE.LineDashedMaterial({color:0xc5eedc,dashSize:5,gapSize:8,transparent:true,opacity:.55,depthTest:false});
    this.aim=new THREE.Line(new THREE.BufferGeometry(),lineMaterial);this.targetLine=new THREE.Line(new THREE.BufferGeometry(),lineMaterial.clone());
    this.ghost=new THREE.Mesh(new THREE.RingGeometry(11.5,12.5,48),new THREE.MeshBasicMaterial({color:0xe1f5de,side:THREE.DoubleSide,transparent:true,opacity:.6,depthTest:false}));
    this.targetRing=new THREE.Mesh(new THREE.RingGeometry(17.5,18.3,48),new THREE.MeshBasicMaterial({color:0xf3ce8a,side:THREE.DoubleSide,transparent:true,opacity:.7,depthTest:false}));
    this.calledRing=new THREE.Mesh(new THREE.TorusGeometry(31,1.8,8,64),new THREE.MeshBasicMaterial({color:0xedc783}));
    const sparkCanvas=document.createElement('canvas');sparkCanvas.width=sparkCanvas.height=32;const sc=sparkCanvas.getContext('2d')!,sparkGlow=sc.createRadialGradient(16,16,0,16,16,16);sparkGlow.addColorStop(0,'#ffffffff');sparkGlow.addColorStop(.25,'#ffffffcc');sparkGlow.addColorStop(1,'#ffffff00');sc.fillStyle=sparkGlow;sc.fillRect(0,0,32,32);
    this.sparks=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({map:new THREE.CanvasTexture(sparkCanvas),size:7,vertexColors:true,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
    try{this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});}catch{this.fallback=canvas.getContext('2d');canvas.dataset.renderer='canvas';return;}
    canvas.dataset.renderer='webgl2';
    const gl=this.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');this.software=!!debug&&/swiftshader|llvmpipe|software/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)));
    // Contact shadows keep the 3D depth without a costly full-scene shadow pass.
    this.renderScale=this.software?.72:Math.min(window.devicePixelRatio,1.5);this.renderer.setPixelRatio(this.renderScale);this.renderer.shadowMap.enabled=false;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    this.scene.background=new THREE.Color('#111c20');this.scene.fog=new THREE.FogExp2('#111c20',.00024);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,-80,0);
    this.controls.enablePan=false;this.controls.minDistance=1050;this.controls.maxDistance=8000;
    this.controls.minPolarAngle=.12;this.controls.maxPolarAngle=Math.PI*.39;
    this.controls.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:THREE.MOUSE.ROTATE};this.controls.touches={ONE:null,TWO:null};
    this.controls.addEventListener('change',()=>this.dirty=true);this.setView('club');
    this.scene.add(new THREE.HemisphereLight(0xbed7df,0x62452c,1.35));
    const key=new THREE.DirectionalLight(0xffddaa,2.8);key.position.set(-260,900,200);this.scene.add(key);
    const practical=new THREE.PointLight(0xffd399,1.0,2300,0);practical.position.set(0,480,0);this.scene.add(practical);
    this.clubRoom=buildClubRoom();this.scene.add(this.clubRoom);
    this.setTable(this.design);this.scene.add(this.aim,this.targetLine,this.ghost,this.targetRing,this.calledRing,this.cue,this.sparks);
    this.scene.add(new THREE.HemisphereLight(0xe2f9ef,0x24202b,2.3));
    const key=new THREE.DirectionalLight(0xffedcf,3.2);key.position.set(-350,800,-200);this.scene.add(key);
    const fill=new THREE.DirectionalLight(0x87c5e5,1.3);fill.position.set(400,300,500);this.scene.add(fill);
    this.setTable(this.design);this.scene.add(this.aim,this.targetLine,this.ghost,this.targetRing,this.calledRing,this.cue,this.sparks,this.cuePath);
    this.ghost.rotation.x=this.targetRing.rotation.x=this.calledRing.rotation.x=-Math.PI/2;
    this.buildCue();
    // A small procedural studio reflection gives enamel balls curved highlights.
    const envCanvas=document.createElement('canvas');envCanvas.width=256;envCanvas.height=128;const ec=envCanvas.getContext('2d')!;
    ec.fillStyle='#262620';ec.fillRect(0,0,256,128);ec.fillStyle='#fff1ce';ec.fillRect(26,18,115,10);ec.fillRect(180,24,38,6);ec.fillStyle='#bedde5';ec.fillRect(12,40,15,30);ec.fillRect(150,35,16,30);ec.fillStyle='#5f4230';ec.fillRect(0,78,256,50);
    const environment=new THREE.CanvasTexture(envCanvas);environment.mapping=THREE.EquirectangularReflectionMapping;environment.colorSpace=THREE.SRGBColorSpace;this.scene.environment=environment;this.scene.environmentIntensity=.75;
    if(!this.software){const pmrem=new THREE.PMREMGenerator(this.renderer),studio=new RoomEnvironment();this.scene.environment=pmrem.fromScene(studio,.04).texture;this.scene.environmentIntensity=.45;studio.dispose();pmrem.dispose();environment.dispose();}
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();});
    this.resize();
  }
  material(color:string|number,roughness=.7,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
  setTable(design:TableDesign){
    this.design=design;this.dirty=true;
    if(!this.renderer)return;
    this.scene.remove(this.tableModel);disposeTableModel(this.tableModel);this.tableModel=buildTableModel(design,!this.software);this.scene.add(this.tableModel);
  }
  setView(view:'club'|'overhead'|'custom'){
    if(view==='custom'){this.view=view;const p=this.customCamera,az=p.azimuth*Math.PI/180,el=p.elevation*Math.PI/180,fit=Math.max(1,1.5/Math.max(.45,this.camera.aspect)),distance=p.distance*Math.max(1,fit*.82);this.camera.position.set(Math.sin(az)*Math.cos(el)*distance,Math.sin(el)*distance-80,Math.cos(az)*Math.cos(el)*distance);this.controls?.target.set(0,-80,0);this.camera.lookAt(0,-80,0);this.controls?.update();this.dirty=true;return;}
    this.view=view;const fit=Math.max(1,1.5/Math.max(.45,this.camera.aspect));this.camera.position.copy(view==='club'?new THREE.Vector3(330,740,1390).multiplyScalar(Math.max(1,fit*.82)):new THREE.Vector3(0,1450*fit,90));
    this.controls?.target.set(0,view==='club'?-80:0,0);this.camera.lookAt(this.controls?.target??new THREE.Vector3());this.controls?.update();this.dirty=true;
  }
  cameraSettings():CameraSettings{const offset=this.camera.position.clone().sub(this.controls?.target??new THREE.Vector3(0,-80,0)),distance=offset.length(),fit=Math.max(1,Math.max(1,1.5/Math.max(.45,this.camera.aspect))*.82);return{azimuth:Math.atan2(offset.x,offset.z)*180/Math.PI,elevation:Math.max(25,Math.min(82,Math.asin(offset.y/distance)*180/Math.PI)),distance:Math.max(1100,Math.min(2600,distance/fit))};}
  setTitleMode(value:boolean){this.titleMode=value;if(this.controls)this.controls.enabled=!value;if(value){this.camera.position.set(1100,420,1390);this.camera.lookAt(-70,20,-230);}else this.setView(this.view);this.dirty=true;}
  setQuality(value:'auto'|'high'|'economy'){
    this.quality=value;this.renderScale=value==='economy'?.6:value==='high'?Math.min(window.devicePixelRatio,1.5):this.software?.72:Math.min(window.devicePixelRatio,1.5);this.renderer?.setPixelRatio(this.renderScale);this.dirty=true;
  }
  pulse(x:number,y:number,color:string,radius=60,duration=.65){
    if(!this.effects||!this.renderer)return;
    const m=new THREE.Mesh(new THREE.RingGeometry(.89,1,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(x-600,18,y-330);this.scene.add(m);this.pulses.push({mesh:m,age:0,duration,radius});
    if(this.pulses.length>18){const old=this.pulses.shift()!;this.scene.remove(old.mesh);old.mesh.geometry.dispose();(old.mesh.material as THREE.Material).dispose();}
  }
  buildCue(){
    this.setCue(this.cueDesign);
  }
  setCue(design:CueDesign){this.cueDesign=design;this.dirty=true;if(!this.renderer)return;this.scene.remove(this.cue,this.cueDisplay);disposeTableModel(this.cue);disposeTableModel(this.cueDisplay);this.cue=buildCueModel(design);this.cueDisplay=buildCueModel(design);this.cueDisplay.visible=false;this.cueDisplay.traverse(child=>{if(child instanceof THREE.Mesh){child.renderOrder=100;const material=child.material as THREE.Material;material.depthTest=false;material.depthWrite=false;}});this.scene.add(this.cue,this.cueDisplay);}
  createBall(id:number,x:number,y:number){
    const mapCanvas=document.createElement('canvas');mapCanvas.width=512;mapCanvas.height=256;const c=mapCanvas.getContext('2d')!;
    c.fillStyle=id>8?'#fff8e7':BALL_COLORS[id];c.fillRect(0,0,512,256);
    if(id>8){c.fillStyle=BALL_COLORS[id];c.fillRect(0,58,512,140);c.fillStyle='#ffffff44';c.fillRect(0,58,512,2);c.fillRect(0,196,512,2);}
    if(id!==0)for(const cx of [128,384]){c.beginPath();c.arc(cx,128,39,0,Math.PI*2);c.fillStyle='#fff8e7';c.fill();c.lineWidth=2;c.strokeStyle='#29263833';c.stroke();c.font='bold 48px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#18202c';c.fillText(String(id),cx,131);}
    else for(const cx of [64,192,320,448]){c.beginPath();c.arc(cx,128,5,0,Math.PI*2);c.fillStyle='#b6353e';c.fill();}
    const map=new THREE.CanvasTexture(mapCanvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(4,this.renderer!.capabilities.getMaxAnisotropy());
    const material=this.software?new THREE.MeshStandardMaterial({map,roughness:.17,metalness:.02,envMapIntensity:1.3}):new THREE.MeshPhysicalMaterial({map,roughness:.19,metalness:0,envMapIntensity:1.4,clearcoat:1,clearcoatRoughness:.08});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(TABLE.radius,32,24),material);mesh.position.set(x-600,12,y-330);mesh.rotation.z=Math.PI/2;mesh.rotation.y=.4;this.scene.add(mesh);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(13,24),new THREE.MeshBasicMaterial({color:0x020c09,transparent:true,opacity:.24,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.y=.85;shadow.position.set(x-599,.4,y-328);this.scene.add(shadow);
    const record={mesh,shadow,lastX:x,lastY:y};this.balls.set(id,record);return record;
  }
  resize(){const w=this.canvas.clientWidth,h=this.canvas.clientHeight||w*780/1200;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.titleMode){this.camera.position.set(1100,420,1390);if(w<h)this.camera.position.multiplyScalar(1.45);this.camera.lookAt(-70,20,-230);}else this.setView(this.view);this.dirty=true;if(this.renderer)this.renderer.setSize(w,h,false);else{this.canvas.width=w*2;this.canvas.height=h*2;}}
  pointer(clientX:number,clientY:number){
    const bounds=this.canvas.getBoundingClientRect();if(!this.renderer)return{x:(clientX-bounds.left)/bounds.width*1200,y:(clientY-bounds.top)/bounds.height*660};
    this.raycaster.setFromCamera(new THREE.Vector2((clientX-bounds.left)/bounds.width*2-1,-(clientY-bounds.top)/bounds.height*2+1),this.camera);
    const point=new THREE.Vector3();this.raycaster.ray.intersectPlane(this.plane,point);return{x:point.x+600,y:point.z+330};
  }
  line(line:THREE.Line,from:{x:number;y:number},to:{x:number;y:number},height=14){line.geometry.setFromPoints([new THREE.Vector3(from.x-600,height,from.y-330),new THREE.Vector3(to.x-600,height,to.y-330)]);line.computeLineDistances();}
  render(state:RenderState){
    if(!this.renderer){if(this.fallback){this.fallback.setTransform(this.canvas.width/1200,0,0,this.canvas.height/660,0,0);renderFallback(this.fallback,state,this.design);}return;}
    const dt=this.lastTime?Math.min(.2,(state.time-this.lastTime)/1000):0;this.lastTime=state.time;
    const renderKey=[this.design.id,this.cueDesign.id,this.cueInspection,this.cueSpin,state.angle,state.power,state.spin?.x,state.spin?.y,state.charge,state.aiming,state.targetPocket,...state.balls.map(b=>`${b.id}:${b.x.toFixed(2)}:${b.y.toFixed(2)}:${b.active}`)].join('|');
    if(!this.dirty&&renderKey===this.lastRenderKey&&!state.particles.length&&!this.pulses.length)return;
    this.lastRenderKey=renderKey;this.dirty=false;
    const isMoving=state.balls.some(b=>b.active&&Math.hypot(b.vx,b.vy)>10);
    if(this.quality==='auto'&&isMoving){this.averageFrame=this.averageFrame*.9+dt*.1;if(++this.qualityFrames%24===0&&this.averageFrame>.055&&this.renderScale>.48){this.renderScale=Math.max(.48,this.renderScale*.86);this.renderer.setPixelRatio(this.renderScale);}}
    const canopy=this.clubRoom.getObjectByName('lamp-canopy');if(canopy)canopy.visible=this.titleMode||(this.view!=='overhead'&&this.camera.position.y/this.camera.position.length()<.86);
    for(const pulse of [...this.pulses]){pulse.age+=dt;const t=pulse.age/pulse.duration;pulse.mesh.scale.setScalar(5+pulse.radius*t);(pulse.mesh.material as THREE.MeshBasicMaterial).opacity=Math.max(0,(1-t)*.7);if(t>=1||!this.effects){this.scene.remove(pulse.mesh);pulse.mesh.geometry.dispose();(pulse.mesh.material as THREE.Material).dispose();this.pulses.splice(this.pulses.indexOf(pulse),1);}}
    const ids=new Set(state.balls.map(b=>b.id));
    for(const [id,record]of this.balls){record.mesh.visible=false;record.shadow.visible=false;if(!ids.has(id)){this.scene.remove(record.mesh,record.shadow);record.mesh.geometry.dispose();(record.mesh.material as THREE.MeshStandardMaterial).map?.dispose();(record.mesh.material as THREE.Material).dispose();record.shadow.geometry.dispose();(record.shadow.material as THREE.Material).dispose();this.balls.delete(id);}}
    for(const b of state.balls){let rec=this.balls.get(b.id);if(!rec)rec=this.createBall(b.id,b.x,b.y);rec.mesh.visible=b.active;rec.shadow.visible=b.active;
      const dx=b.x-rec.lastX,dz=b.y-rec.lastY,d=Math.hypot(dx,dz);if(d>0&&d<100){const axis=new THREE.Vector3(dz,0,-dx).normalize();rec.mesh.rotateOnWorldAxis(axis,d/TABLE.radius);}rec.lastX=b.x;rec.lastY=b.y;
      rec.mesh.position.set(b.x-600,12,b.y-330);rec.shadow.position.set(b.x-599,.4,b.y-328);
    }
    this.cueDisplay.visible=this.cueInspection&&!this.titleMode;
    if(this.cueDisplay.visible){const direction=this.camera.getWorldDirection(new THREE.Vector3()),right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);this.cueDisplay.position.copy(this.camera.position).addScaledVector(direction,900).addScaledVector(right,130).addScaledVector(up,this.camera.aspect<.8?95:10);this.cueDisplay.quaternion.copy(this.camera.quaternion);this.cueDisplay.rotateZ(-.12);this.cueDisplay.rotateY(this.cueSpin);this.cueDisplay.scale.setScalar(Math.min(1.2,this.camera.aspect*1.25));}
    const cue=state.balls[0],aiming=state.aiming&&cue.active&&!this.cueInspection;
    this.cue.visible=this.aim.visible=this.ghost.visible=aiming;this.targetRing.visible=this.targetLine.visible=false;
    this.cuePath.visible=false;
    if(aiming){const trace=aimTrace(state.balls,state.angle);this.line(this.aim,cue,trace);this.ghost.position.set(trace.x-600,14,trace.y-330);
      const path=predictCuePath(state.balls,state.angle,state.power,state.spin);
      if(path.length>1){
        this.cuePath.visible=true;const geometry=this.cuePath.geometry,position=geometry.getAttribute('position'),color=geometry.getAttribute('color');
        path.forEach((p,i)=>{position.setXYZ(i,p.x-600,14.5,p.y-330);color.setXYZW(i,1,1,1,1-i/(path.length-1));});
        position.needsUpdate=color.needsUpdate=true;geometry.setDrawRange(0,path.length);geometry.computeBoundingSphere();
      }
      if(trace.target){const t=trace.target,a=Math.atan2(t.y-trace.y,t.x-trace.x);this.targetRing.visible=this.targetLine.visible=true;this.targetRing.position.set(t.x-600,15,t.y-330);this.line(this.targetLine,t,{x:t.x+Math.cos(a)*95,y:t.y+Math.sin(a)*95});}
      const pull=state.charge?state.power*70:0;this.cue.position.set(cue.x-600-Math.cos(state.angle)*(28+pull),17,cue.y-330-Math.sin(state.angle)*(28+pull));this.cue.rotation.y=-state.angle;
    }
    this.calledRing.visible=state.targetPocket!==undefined;if(state.targetPocket!==undefined){const p=POCKETS[state.targetPocket];this.calledRing.position.set(p.x-600,17,p.y-330);this.calledRing.scale.setScalar(1+Math.sin(state.time*.003)*.025);}
    const positions:number[]=[],colors:number[]=[];for(const p of state.particles){positions.push(p.x-600,15+(1-p.life)*35,p.y-330);const c=new THREE.Color(p.color);colors.push(c.r*p.life,c.g*p.life,c.b*p.life);}
    if(this.effects)for(const b of state.balls)if(b.active&&Math.hypot(b.vx,b.vy)>140)for(let i=0;i<b.trail.length;i++){const p=b.trail[i];positions.push(p.x-600,3,p.y-330);const c=new THREE.Color(this.design.trim),fade=i/b.trail.length*.35;colors.push(c.r*fade,c.g*fade,c.b*fade);}
    this.sparks.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));this.sparks.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.sparks.geometry.computeBoundingSphere();
    this.renderer.render(this.scene,this.camera);
  }
}
