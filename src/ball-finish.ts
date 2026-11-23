import * as THREE from 'three';

export function ballLampEnvironment(pmrem:THREE.PMREMGenerator){
  const scene=new THREE.Scene();
  scene.background=new THREE.Color('#52504a');
  const geometry=new THREE.CircleGeometry(98,24);
  const material=new THREE.MeshBasicMaterial({color:new THREE.Color(7.0,5.3,3.6),toneMapped:false});
  // Bake the three brass shades' luminous undersides from cloth height.
  for(const x of [-330,0,330]){
    const lamp=new THREE.Mesh(geometry,material);
    lamp.position.set(x,531,0);lamp.rotation.x=Math.PI/2;scene.add(lamp);
  }
  const target=pmrem.fromScene(scene,0,1,1000,{size:64});
  geometry.dispose();material.dispose();
  return target;
}

export function resinBallMaterial(map:THREE.Texture,envMap:THREE.Texture,economy:boolean){
  const material=new THREE.MeshPhysicalMaterial({map,envMap,envMapIntensity:1.15,clearcoatRoughness:.075});
  setResinBallQuality(material,economy);
  return material;
}

export function setResinBallQuality(material:THREE.MeshPhysicalMaterial,economy:boolean){
  // At zero clearcoat Three omits that shading lobe, keeping the base lamp reflection.
  material.clearcoat=economy?0:.85;
  material.roughness=economy?.13:.19;
}
