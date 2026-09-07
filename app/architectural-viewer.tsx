'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {publicAsset} from './public-asset';
import {Button} from '@/components/ui/button';

/** Separate visual study: no navigation graph is projected onto estimated coordinates. */
export default function ArchitecturalViewer({model}:{model:string}){
 const host=useRef<HTMLDivElement>(null),reset=useRef<()=>void>(()=>{});
 const [status,setStatus]=useState('正在载入三维场景…');
 useEffect(()=>{
  setStatus('正在载入三维场景…');
  if(!host.current)return;const el=host.current;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{setStatus('三维显示不可用，请开启硬件加速，或下载模型查看。');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#c7d0d3');
  const camera=new THREE.PerspectiveCamera(43,1,.1,3000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=2;controls.maxDistance=1400;controls.maxPolarAngle=Math.PI*.49;
  scene.add(new THREE.HemisphereLight('#ffffff','#667169',2));const sun=new THREE.DirectionalLight('#fff4e4',3);sun.position.set(-50,80,65);scene.add(sun);
  el.appendChild(renderer.domElement);let disposed=false;
  const disposeObject=(object:THREE.Object3D)=>{const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();object.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>{for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);m.dispose();});textures.forEach(t=>t.dispose());};
  new GLTFLoader().load(publicAsset(model),g=>{
   if(disposed){disposeObject(g.scene);return;}
   scene.add(g.scene);g.scene.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){const texture=(m as THREE.MeshStandardMaterial).map;if(texture)texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}});
   const box=new THREE.Box3().setFromObject(g.scene),center=box.getCenter(new THREE.Vector3()),extent=box.getSize(new THREE.Vector3());
   controls.maxDistance=Math.max(280,extent.length()*4);
   camera.far=Math.max(1000,extent.length()*12);camera.updateProjectionMatrix();
   reset.current=()=>{const distance=Math.max(extent.x,extent.z)/Math.min(1,camera.aspect)*1.45;camera.position.copy(center).add(new THREE.Vector3(.65,.8,1).normalize().multiplyScalar(distance));controls.target.copy(center);controls.update();};
   reset.current();setStatus('');
  },undefined,()=>{if(!disposed)setStatus('模型未能载入，请重试或下载 GLB 查看。');});
  const resize=()=>{camera.aspect=Math.max(el.clientWidth,1)/Math.max(el.clientHeight,1);camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);};const observer=new ResizeObserver(resize);observer.observe(el);resize();
  renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
  return()=>{disposed=true;observer.disconnect();renderer.setAnimationLoop(null);controls.dispose();disposeObject(scene);renderer.dispose();renderer.domElement.remove();reset.current=()=>{};};
 },[model]);
 return <><div className="architecture-canvas" ref={host} aria-label="香港大学主楼与校园三维模型">{status&&<p role="status" className="architecture-status">{status}</p>}</div><div className="architecture-actions"><span>拖动旋转 · 滚轮缩放 · 右键平移</span><Button variant="outline" onClick={()=>reset.current()}>恢复全景</Button><a href={publicAsset(model)} download>下载当前 GLB ↓</a></div></>;
}
