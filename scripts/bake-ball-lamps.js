import * as THREE from 'three';

export function bakeBallLampEnvironment(pmrem){
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#52504a');
  const key=new THREE.PlaneGeometry(308,105),fill=new THREE.PlaneGeometry(146,58);
  const keyLight=new THREE.MeshBasicMaterial({color:new THREE.Color(42,34,24),toneMapped:false});
  const fillLight=new THREE.MeshBasicMaterial({color:new THREE.Color(13,10.5,8),toneMapped:false});
  // Set the reflected shades back so their glints fall above the numbers in the club view.
  const primary=new THREE.Mesh(key,keyLight);
  primary.position.set(-65,438,-530);primary.lookAt(0,0,0);scene.add(primary);
  for(const x of [-325,325]){
    const lamp=new THREE.Mesh(fill,fillLight);
    lamp.position.set(x,531,-238);lamp.rotation.x=Math.PI/2;scene.add(lamp);
  }
  const target=pmrem.fromScene(scene,0,1,1000,{size:256});
  key.dispose();fill.dispose();keyLight.dispose();fillLight.dispose();
  return target;
}
