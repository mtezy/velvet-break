import * as THREE from 'three';

const lampFaceSize=256,lastMipSize=8;

export function decodeBallLampEnvironment(data:ArrayBuffer){
  let offset=0;
  const faces=Array.from({length:6},()=>{
    const mipmaps=[];
    for(let size=lampFaceSize;size>=lastMipSize;size>>=1){
      const pixels=new Uint16Array(data,offset,size*size*4);
      mipmaps.push({data:pixels,width:size,height:size});offset+=pixels.byteLength;
    }
    return {width:lampFaceSize,height:lampFaceSize,mipmaps};
  });
  if(offset!==data.byteLength)throw Error('Invalid ball lamp cubemap size');
  // Three's explicit cubemap mip-chain uploader also accepts uncompressed RGBA.
  const texture=new THREE.CompressedCubeTexture(faces,THREE.RGBAFormat as THREE.CompressedPixelFormat,THREE.HalfFloatType);
  texture.name='ball-lamp-cubemap';texture.colorSpace=THREE.LinearSRGBColorSpace;
  texture.minFilter=THREE.LinearMipmapLinearFilter;texture.isPMREMTexture=true;texture.needsUpdate=true;
  return texture;
}

export async function loadBallLampEnvironment(){
  const response=await fetch(new URL('./ball-lamps.bin',import.meta.url));
  if(!response.ok||!response.body)throw Error('Could not load ball lamp cubemap');
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  return decodeBallLampEnvironment(await new Response(stream).arrayBuffer());
}

export function resinBallMaterial(map:THREE.Texture,envMap:THREE.Texture,economy:boolean){
  const material=new THREE.MeshPhysicalMaterial({map,envMap,envMapIntensity:1.15,clearcoatRoughness:.05});
  setResinBallQuality(material,economy);
  return material;
}

export function setResinBallQuality(material:THREE.MeshPhysicalMaterial,economy:boolean){
  // At zero clearcoat Three omits that shading lobe, keeping the base lamp reflection.
  material.clearcoat=economy?0:.85;
  material.roughness=economy?.10:.16;
}
