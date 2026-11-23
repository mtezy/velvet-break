import * as THREE from 'three';
import { batchStaticMeshes } from './table-model.ts';

/** Original procedural set: warm tavern craft, cool leaded windows and a brass canopy. */
export function buildClubRoom(){
  const room=new THREE.Group();room.name='The Lantern Guild';
  const material=(color:string,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const oak=material('#34251c'),edge=material('#63452b'),walnut=material('#231c18'),brass=material('#b28c48',.36,.6),stone=material('#303434'),velvet=material('#203e38'),black=material('#101b1c');
  const plaster=material('#1d2c30'),ceramic=material('#bfaa83');
  const glass=[material('#21564d',.24),material('#9b592b',.28),material('#46556d',.23)];
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
  const floor=mesh(new THREE.PlaneGeometry(6500,6000),new THREE.MeshStandardMaterial({map:floorMap,color:'#777c80',roughness:.42,metalness:.05}),0,-283,0);floor.rotation.x=-Math.PI/2;
  // A fitted club carpet anchors the table in both the Club and Overhead views.
  const rugMap=canvasMap(1024,640,c=>{
    c.fillStyle='#0c2028';c.fillRect(0,0,1024,640);let seed=42;const random=()=>((seed=seed*16807%2147483647)/2147483647);
    for(let i=0;i<20000;i++){c.fillStyle=i%2?'#ffffff08':'#00000020';c.fillRect(random()*1024,random()*640,1,1);}
    c.strokeStyle='#a28f6070';c.lineWidth=1.3;c.strokeRect(24,24,976,592);c.strokeStyle='#a28f6030';c.strokeRect(31,31,962,578);
    for(const [x,y] of [[44,44],[980,44],[44,596],[980,596]]){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.strokeRect(-6,-6,12,12);c.restore();}
    c.textAlign='center';c.font='11px Arial';c.fillStyle='#b9b6a766';c.fillText('V E L V E T   B R E A K   •   M E M B E R S   C L U B',512,610);
  });
  const rug=mesh(new THREE.PlaneGeometry(1780,1120),new THREE.MeshStandardMaterial({map:rugMap,roughness:1}),0,-282,10);rug.rotation.x=-Math.PI/2;
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
  // The shelf lighting and neon spill are painted once, not rendered with extra lights.
  box(2150,230,170,100,-150,-1210,walnut);box(2230,30,245,100,-21,-1190,edge);box(2240,5,255,100,-4,-1190,brass);
  for(const x of [-800,-330,140,610,1080]){box(420,155,10,x,-140,-1118,edge);box(380,125,12,x,-140,-1109,walnut);}
  const amber=new THREE.MeshBasicMaterial({color:'#dca65e'});
  const shelfMap=canvasMap(512,128,c=>{
    const light=c.createLinearGradient(0,0,0,128);
    for(const offset of [0,.5]){
      light.addColorStop(offset,'#a87845');light.addColorStop(offset+.12,'#64492f');light.addColorStop(offset+.48,'#26201f');
    }
    c.fillStyle=light;c.fillRect(0,0,512,128);
    c.fillStyle='#17181144';for(let x=0;x<512;x+=51)c.fillRect(x,0,2,128);
  });
  mesh(new THREE.PlaneGeometry(1440,360),new THREE.MeshBasicMaterial({map:shelfMap}),0,236,-1417);
  for(const x of [-733,733])box(26,377,172,x,236,-1378,walnut);
  function bottle(x:number,y:number,z:number,index:number){
    const width=[17,22,14][index%3],height=[96,76,112,89][index%4],shoulder=height*.7;
    const profile=[[width-3,0],[width,5],[width,shoulder-11],[width-2,shoulder],[7,shoulder+8],[7,height],[9,height],[9,height+4],[0,height+4]];
    mesh(new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),8),glass[index%glass.length],x,y,z);
    cylinder(width+.3,width+.3,16,x,y+shoulder*.48,z,index%5===0?brass:ceramic,8);
    cylinder(8,8,5,x,y+height+5,z,brass,8);
  }
  for(const [row,y] of [62,242].entries()){
    box(1440,18,164,0,y,-1378,edge);box(1420,4,6,0,y+5,-1295,amber);
    for(let i=0;i<23;i++){
      if((i+row*2)%7===4)continue;
      bottle(-663+i*60+(i%3)*6,y+9,-1340-(i%3)*9,i+row*5);
    }
  }
  box(1440,16,164,0,421,-1378,edge);
  // Architectural wall lamps are emissive geometry, not extra shadow-casting lights.
  for(const x of [-1980,-850,850,1980]){box(20,180,22,x,470,-1414,brass);box(7,160,8,x,470,-1398,amber);box(100,8,65,x,560,-1400,black);box(100,8,65,x,380,-1400,black);}
  const neonMap=canvasMap(1024,256,c=>{
    const wall=c.createRadialGradient(512,113,46,512,113,512);
    wall.addColorStop(0,'#28554b');wall.addColorStop(1,'#1b2527');
    c.fillStyle=wall;c.fillRect(0,0,1024,256);
    const roundedFrame=(left:number,top:number,right:number,bottom:number,radius:number)=>{
      c.beginPath();c.moveTo(left+radius,top);
      c.arcTo(right,top,right,bottom,radius);c.arcTo(right,bottom,left,bottom,radius);
      c.arcTo(left,bottom,left,top,radius);c.arcTo(left,top,right,top,radius);c.closePath();
    };
    roundedFrame(54,17,970,239,35);c.fillStyle='#101e21';c.fill();
    c.strokeStyle='#364c4b';c.lineWidth=4;c.stroke();
    roundedFrame(75,32,949,223,24);
    const drawTubes=(tube:()=>void,halo:string,core:string,width:number)=>{
      c.shadowColor=halo;c.shadowBlur=26;c.strokeStyle=halo;c.lineWidth=width+2;tube();tube();
      c.shadowBlur=0;c.strokeStyle=core;c.lineWidth=width;tube();
    };
    c.lineJoin=c.lineCap='round';c.textAlign='center';
    drawTubes(()=>c.stroke(),'#b35e28','#f0b87f',3);
    c.font='600 84px sans-serif';
    drawTubes(()=>c.strokeText('VELVET BREAK',512,137),'#36bda3','#bbffee',2.8);
    c.font='600 24px sans-serif';c.fillStyle='#f6d5a4';
    c.fillText('T H E   L A N T E R N   G U I L D',512,185);
  });
  mesh(new THREE.PlaneGeometry(980,245),new THREE.MeshBasicMaterial({map:neonMap,toneMapped:false}),-100,545,-1404);
  // Fireplace, a warm emissive hearth and mantle.
  box(600,340,180,-1190,-115,-1300,stone);box(630,45,230,-1190,75,-1295,edge);box(400,235,15,-1190,-143,-1202,black);
  const hearthMap=canvasMap(128,128,c=>{const g=c.createRadialGradient(64,110,0,64,100,90);g.addColorStop(0,'#fff0a4');g.addColorStop(.2,'#ef9a42');g.addColorStop(.6,'#a34120');g.addColorStop(1,'#110d0b');c.fillStyle=g;c.fillRect(0,0,128,128);c.fillStyle='#2c170f';c.save();c.translate(64,105);for(const a of [-.3,.25]){c.rotate(a);c.fillRect(-50,-5,100,13);}c.restore();});
  mesh(new THREE.PlaneGeometry(350,200),new THREE.MeshBasicMaterial({map:hearthMap}),-1190,-155,-1190);
  function mug(x:number,y:number,z:number){cylinder(18,16,47,x,y+24,z,ceramic);cylinder(16,16,1,x,y+48,z,walnut);const handle=mesh(new THREE.TorusGeometry(12,4,6,10),brass,x+20,y+27,z);handle.rotation.y=Math.PI/2;}
  function candle(x:number,y:number,z:number){cylinder(22,28,9,x,y+5,z,brass);cylinder(11,12,44,x,y+30,z,ceramic);const light=mesh(new THREE.SphereGeometry(7,8,6),flame,x,y+59,z);light.scale.set(.6,1.8,.6);}
  for(const x of [-870,480,1020]){mug(x,0,-1160);candle(x+90,0,-1200);}
  // Side banquettes, round tables and cue stand.
  for(const sign of [-1,1]){
    const x=sign*1730;box(650,100,250,x,-210,280,velvet);box(650,240,70,x,-110,390,velvet);
    for(const z of [-520,550]){cylinder(155,155,22,x,-40,z,edge,24);cylinder(19,35,220,x,-160,z,brass);cylinder(90,115,14,x,-272,z,walnut);mug(x-55,-28,z+15);candle(x+60,-28,z);}
    for(const z of [-620,650]){cylinder(65,65,16,x+sign*230,-125,z,velvet);for(const dx of [-35,35])box(15,150,15,x+sign*230+dx,-205,z,walnut);}
  }
  // Backlit patrons read as silhouettes, with different poses and no animation.
  const coat=[material('#1a282a'),material('#2a2128')],skin=material('#44312c'),hair=material('#141a1d');
  function patron(x:number,z:number,angle:number,height:number,index:number){
    const start=room.children.length,m=coat[index%coat.length],lean=index===1?14:0;
    const oval=(x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material)=>{
      const shape=mesh(new THREE.SphereGeometry(1,10,8),mat,x,y,z);shape.scale.set(w,h,d);return shape;
    };
    function limb(a:[number,number,number],b:[number,number,number],r:number,mat:THREE.Material){
      const from=new THREE.Vector3(...a),delta=new THREE.Vector3(...b).sub(from);
      const part=mesh(new THREE.CapsuleGeometry(r,Math.max(0,delta.length()-r),3,8),mat);
      part.position.copy(from).addScaledVector(delta,.5);part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    }
    for(const side of [-1,1]){
      limb([side*29,223,0],[side*32,36,side*12],22,hair);
      oval(side*32,15,side*12+12,23,15,39,hair);
    }
    cylinder(58,37,115,0,279,0,m,10).scale.z=.54;
    oval(0,322,0,65,31,33,m);
    cylinder(15,19,34,lean,348,0,skin,8);
    oval(lean,388,2,31,39,30,skin);
    oval(lean,405,-6,index===2?36:31,index===1?28:22,31,hair);
    for(const side of [-1,1]){
      const bent=(side===1)===(index===1);
      const elbow:[number,number,number]=[side*(bent?76:61),bent?250:246,bent?23:2];
      const hand:[number,number,number]=[side*53,bent?273:186,bent?79:13];
      limb([side*52,319,0],elbow,17,m);limb(elbow,hand,13,m);
      oval(...hand,12,14,12,skin);
    }
    const pose=new THREE.Matrix4().compose(new THREE.Vector3(x,-283,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle),new THREE.Vector3(height,height,height));
    for(const piece of room.children.slice(start))piece.applyMatrix4(pose);
  }
  patron(-715,-1005,2.28,1.07,0);patron(-468,-1020,-2.1,.96,1);patron(466,-1025,2.62,1.12,2);
  box(600,20,140,900,-265,-930,walnut);box(630,18,70,900,210,-950,edge);
  for(let i=0;i<7;i++){const cue=cylinder(4,8,600,650+i*75,25,-960,edge,8);cue.rotation.z=.06;box(8,60,8,650+i*75,270,-960,ceramic);}
  // Hanging three-shade brass luminaire: the visual anchor, above—not across—the sightline.
  const canopyStart=room.children.length;
  box(800,15,28,0,610,0,brass);
  for(const x of [-325,325]){cylinder(3,3,440,x,840,0,brass,6);cylinder(16,20,8,x,1063,0,brass);}
  // Crossed, feathered cards give each shade a soft beam in a single static batch.
  const hazeMap=canvasMap(128,128,c=>{
    const pixels=c.createImageData(128,128);
    for(let y=0;y<128;y++){
      const t=y/127,spread=.44+.54*t;
      const opacity=THREE.MathUtils.smoothstep(t,0,.09)*(1-THREE.MathUtils.smoothstep(t,.25,1));
      for(let x=0;x<128;x++){
        const distance=Math.abs(2*x/127-1)/spread,edge=1-THREE.MathUtils.smoothstep(distance,.05,1),i=4*(y*128+x);
        pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;
        pixels.data[i+3]=Math.round(255*edge*edge*opacity);
      }
    }
    c.putImageData(pixels,0,0);
  });
  const haze=new THREE.MeshBasicMaterial({map:hazeMap,color:'#f4cd8d',transparent:true,opacity:.1,side:THREE.DoubleSide,forceSinglePass:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const beamHeight=360;
  for(const x of [-330,0,330]){
    cylinder(40,105,75,x,575,0,velvet,24);cylinder(107,107,6,x,535,0,brass,24);cylinder(98,98,2,x,531,0,warm,24);cylinder(15,15,35,x,631,0,brass);
    for(const angle of [0,Math.PI/2])mesh(new THREE.PlaneGeometry(400,beamHeight),haze,x,530-beamHeight/2,0).rotation.y=angle;
  }
  const canopy=new THREE.Group();canopy.name='lamp-canopy';
  for(const child of room.children.slice(canopyStart))canopy.add(child);
  batchStaticMeshes(room);batchStaticMeshes(canopy);room.add(canopy);
  return room;
}
