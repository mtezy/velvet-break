import * as THREE from 'three';
import { batchStaticMeshes } from './table-model.ts';

/** Original procedural set: warm tavern craft, cool leaded windows and a brass canopy. */
export function buildClubRoom(){
  const room=new THREE.Group();room.name='The Lantern Guild';
  const material=(color:string,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const oak=material('#34251c'),edge=material('#63452b'),walnut=material('#231c18'),brass=material('#b28c48',.36,.6),stone=material('#303434'),velvet=material('#203e38'),black=material('#101b1c');
  const plaster=material('#48433a'),bottleGreen=material('#244e3d',.22),bottleAmber=material('#9b612d',.25),ceramic=material('#bfaa83');
  const warm=new THREE.MeshBasicMaterial({color:'#ffe3a0'}),flame=new THREE.MeshBasicMaterial({color:'#fff3b9'}),blue=new THREE.MeshBasicMaterial({color:'#668d9b'});
  function mesh(g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0){const object=new THREE.Mesh(g,m);object.position.set(x,y,z);room.add(object);return object;}
  function box(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material=oak){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);}
  function cylinder(rt:number,rb:number,h:number,x:number,y:number,z:number,m:THREE.Material=oak,segments=12){return mesh(new THREE.CylinderGeometry(rt,rb,h,segments),m,x,y,z);}
  function beam(a:THREE.Vector3,b:THREE.Vector3,width:number,m:THREE.Material=oak){const delta=b.clone().sub(a),object=box(width,delta.length(),width,0,0,0,m);object.position.copy(a).add(b).multiplyScalar(.5);object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}
  function canvasMap(w:number,h:number,paint:(c:CanvasRenderingContext2D)=>void){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;paint(canvas.getContext('2d')!);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;}
  // Baked floorboard color variation/grain, not hundreds of separate meshes.
  const floorMap=canvasMap(1024,1024,c=>{
    let seed=123;const random=()=>((seed=seed*16807%2147483647)/2147483647);
    c.fillStyle='#3a2c21';c.fillRect(0,0,1024,1024);
    for(let row=0;row<16;row++){const y=row*64;c.fillStyle=['#4e3b29','#463426','#56402c','#3c3025'][row%4];c.fillRect(0,y+1,1024,62);for(let i=0;i<35;i++){c.strokeStyle=i%3?'#aa815116':'#110c091f';c.beginPath();const yy=y+random()*64;c.moveTo(0,yy);c.bezierCurveTo(220,yy-3,620,yy+3,1024,yy);c.stroke();}for(let x=(row%3)*230;x<1024;x+=690){c.fillStyle='#191812';c.fillRect(x,y,2,64);c.fillRect(x+7,y+9,2,2);c.fillRect(x+7,y+52,2,2);}}
  });floorMap.wrapS=floorMap.wrapT=THREE.RepeatWrapping;floorMap.repeat.set(3,3);floorMap.anisotropy=4;
  const floor=mesh(new THREE.PlaneGeometry(6500,6000),new THREE.MeshStandardMaterial({map:floorMap,roughness:.58}),0,-283,0);floor.rotation.x=-Math.PI/2;
  // Dado panels, plaster, heavy posts and exposed roof trusses.
  box(5600,1500,80,0,410,-1550,plaster);box(5600,330,95,0,-120,-1498,walnut);box(5600,18,110,0,53,-1488,edge);
  for(const x of [-2600,-1700,-850,0,850,1700,2600]){box(60,1450,100,x,400,-1472);box(70,35,150,x,1070,-1450,edge);}
  for(let x=-2500;x<2600;x+=240){box(10,280,20,x,-124,-1440,edge);box(205,5,16,x+110,-235,-1438,edge);}
  box(80,1500,4000,-2600,410,180,plaster);box(80,1500,4000,2600,410,180,plaster);
  box(5550,100,100,0,1100,-1450);box(5550,100,100,0,1100,1600);
  for(const z of [-1200,250,1400]){box(5550,100,100,0,1110,z);for(const sign of [-1,1])beam(new THREE.Vector3(sign*2550,700,z),new THREE.Vector3(sign*2200,1100,z),60);}
  // Broad leaded windows are painted geometry: depth cues without expensive transmission.
  function windowSet(x:number){
    box(510,700,30,x,550,-1445,black);box(448,624,12,x,550,-1424,blue);
    box(520,20,55,x,900,-1410,edge);box(550,25,90,x,195,-1400,edge);
    for(const dx of [-250,0,250])box(16,700,24,x+dx,550,-1400,edge);
    for(const y of [300,550,800])box(490,10,20,x,y,-1398,edge);
    for(const dx of [-180,-60,60,180])for(const y of [420,670]){
      beam(new THREE.Vector3(x+dx-60,y-125,-1398),new THREE.Vector3(x+dx+60,y+125,-1398),6,black);
      beam(new THREE.Vector3(x+dx+60,y-125,-1398),new THREE.Vector3(x+dx-60,y+125,-1398),6,black);
    }
  }windowSet(-1780);windowSet(1780);
  // Deep back bar and small still-life details.
  box(2150,230,170,100,-150,-1210,walnut);box(2230,30,245,100,-21,-1190,edge);box(2240,5,255,100,-4,-1190,brass);
  for(const x of [-800,-330,140,610,1080]){box(420,155,10,x,-140,-1118,edge);box(380,125,12,x,-140,-1109,walnut);}
  function bottle(x:number,y:number,z:number,index:number){const m=index%3?bottleGreen:bottleAmber;cylinder(13,17,58,x,y+30,z,m);cylinder(6,8,27,x,y+71,z,m);cylinder(7,7,5,x,y+87,z,brass);cylinder(17.2,17.2,19,x,y+32,z,ceramic);}
  for(const y of [300,565]){box(1300,18,140,0,y,-1400,edge);for(let i=0;i<13;i++)bottle(-570+i*93,y+10,-1360,i);}
  // House crest, hand-painted with no external fonts or art.
  const crestMap=canvasMap(512,512,c=>{c.fillStyle='#182d2a';c.fillRect(0,0,512,512);c.strokeStyle='#9d7b43';c.lineWidth=3;c.strokeRect(18,18,476,476);c.strokeRect(25,25,462,462);c.textAlign='center';c.fillStyle='#d3b77b';c.font='110px Georgia';c.fillText('ᛟ',256,175);c.font='36px Georgia';c.fillText('VELVET BREAK',256,255);c.font='14px Georgia';c.fillText('T H E  L A N T E R N  G U I L D',256,305);c.font='12px Georgia';c.fillText('EST. MMXXVI  ·  PRECISION & FINESSE',256,360);});
  const crest=mesh(new THREE.PlaneGeometry(410,410),new THREE.MeshStandardMaterial({map:crestMap,roughness:.85}),0,820,-1430);crest.name='guild-crest';
  // Fireplace, a warm emissive hearth and mantle.
  box(600,340,180,-1190,-115,-1300,stone);box(630,45,230,-1190,75,-1295,edge);box(400,235,15,-1190,-143,-1202,black);
  const hearthMap=canvasMap(128,128,c=>{const g=c.createRadialGradient(64,110,0,64,100,90);g.addColorStop(0,'#fff0a4');g.addColorStop(.2,'#ef9a42');g.addColorStop(.6,'#a34120');g.addColorStop(1,'#110d0b');c.fillStyle=g;c.fillRect(0,0,128,128);c.fillStyle='#2c170f';c.save();c.translate(64,105);for(const a of [-.3,.25]){c.rotate(a);c.fillRect(-50,-5,100,13);}c.restore();});
  mesh(new THREE.PlaneGeometry(350,200),new THREE.MeshBasicMaterial({map:hearthMap}),-1190,-155,-1190);
  function mug(x:number,y:number,z:number){cylinder(18,16,47,x,y+24,z,ceramic);cylinder(16,16,1,x,y+48,z,walnut);const handle=mesh(new THREE.TorusGeometry(12,4,6,10),brass,x+20,y+27,z);handle.rotation.y=Math.PI/2;}
  function candle(x:number,y:number,z:number){cylinder(22,28,9,x,y+5,z,brass);cylinder(11,12,44,x,y+30,z,ceramic);const light=mesh(new THREE.SphereGeometry(7,8,6),flame,x,y+59,z);light.scale.set(.6,1.8,.6);}
  for(const x of [-870,480,1020]){mug(x,0,-1160);candle(x+90,0,-1200);}
  // Side banquettes, round tables, cue stand and discreet seated silhouettes.
  for(const sign of [-1,1]){
    const x=sign*1730;box(650,100,250,x,-210,280,velvet);box(650,240,70,x,-110,390,velvet);
    for(const z of [-520,550]){cylinder(155,155,22,x,-40,z,edge,24);cylinder(19,35,220,x,-160,z,brass);cylinder(90,115,14,x,-272,z,walnut);mug(x-55,-28,z+15);candle(x+60,-28,z);}
    for(const z of [-620,650]){cylinder(65,65,16,x+sign*230,-125,z,velvet);for(const dx of [-35,35])box(15,150,15,x+sign*230+dx,-205,z,walnut);}
    // Low-poly background guest, deliberately unanimated and kept off the playing surface.
    const px=x-sign*30;mesh(new THREE.IcosahedronGeometry(40,1),material(sign===1?'#88694e':'#70614e'),px,15,300);
    const torso=mesh(new THREE.ConeGeometry(75,145,7),material(sign===1?'#313d38':'#323338'),px,-93,320);torso.rotation.x=-.1;
    beam(new THREE.Vector3(px-45,-40,295),new THREE.Vector3(px-60,-90,225),20,edge);beam(new THREE.Vector3(px+45,-40,295),new THREE.Vector3(px+70,-90,225),20,edge);
  }
  box(600,20,140,900,-265,-930,walnut);box(630,18,70,900,210,-950,edge);
  for(let i=0;i<7;i++){const cue=cylinder(4,8,600,650+i*75,25,-960,edge,8);cue.rotation.z=.06;box(8,60,8,650+i*75,270,-960,ceramic);}
  // Hanging three-shade brass luminaire: the visual anchor, above—not across—the sightline.
  const canopyStart=room.children.length;
  box(800,15,28,0,610,0,brass);
  for(const x of [-325,325]){cylinder(3,3,440,x,840,0,brass,6);cylinder(16,20,8,x,1063,0,brass);}
  for(const x of [-330,0,330]){
    cylinder(40,105,75,x,575,0,velvet,24);cylinder(107,107,6,x,535,0,brass,24);cylinder(98,98,2,x,531,0,warm,24);cylinder(15,15,35,x,631,0,brass);
  }
  const haze=mesh(new THREE.ConeGeometry(650,515,32,1,true),new THREE.MeshBasicMaterial({color:'#e5c485',transparent:true,opacity:.019,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),0,270,0);haze.name='warm-lamp-haze';
  const canopy=new THREE.Group();canopy.name='lamp-canopy';
  for(const child of room.children.slice(canopyStart))canopy.add(child);
  batchStaticMeshes(room);batchStaticMeshes(canopy);room.add(canopy);
  return room;
}
