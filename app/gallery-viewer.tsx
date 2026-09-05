'use client';
import {publicAsset} from './public-asset';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NODES, NODE, POIS, HEADINGS, pointAt, routeLength, type Heading } from './navigation';
export type ViewerAPI = {
 overview:()=>void; focus:(node:string,heading:Heading)=>void;
 snapshot:(node:string,heading:Heading)=>string;
 play:(nodes:string[])=>void; stop:()=>void;
 record:(nodes:string[])=>Promise<{blob:Blob;extension:string}>;
};
type Props={path?:string[];confirmed?:string|null;destination?:string;onReady?:()=>void;onError?:(message:string)=>void;onProgress?:(p:number,playing:boolean)=>void;onPick?:(id:string)=>void};
type Runtime={scene:THREE.Scene;camera:THREE.PerspectiveCamera;renderer:THREE.WebGLRenderer;controls:OrbitControls;roof:THREE.Mesh|null;paths:THREE.Group;markers:THREE.Group;labels:THREE.Sprite[];mode:'overview'|'inside';animation:{nodes:string[];start:number;duration:number;last:number;done?:()=>void}|null;recorder:MediaRecorder|null;overview:()=>void;stop:()=>void;focus:(id:string,h:Heading)=>void};
const GalleryViewer=forwardRef<ViewerAPI,Props>(function GalleryViewer(props,ref){
 const hostRef=useRef<HTMLDivElement>(null), runtime=useRef<Runtime|null>(null),cb=useRef(props);cb.current=props;
 const applyPath=()=>{
  const r=runtime.current;if(!r)return;
  for(const group of [r.paths,r.markers]){while(group.children.length){const c=group.children[0] as THREE.Mesh;group.remove(c);c.geometry?.dispose();if(c.material&&!Array.isArray(c.material))c.material.dispose();}}
  const ids=cb.current.path??[];
  ids.slice(1).forEach((id,i)=>{const a=NODE[ids[i]],b=NODE[id];if(!a||!b)return;const p1=new THREE.Vector3(a.x,.12,a.z),p2=new THREE.Vector3(b.x,.12,b.z),delta=p2.clone().sub(p1);const line=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,delta.length(),8),new THREE.MeshBasicMaterial({color:0x64e6f5}));line.position.copy(p1.clone().add(p2).multiplyScalar(.5));line.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());r.paths.add(line);
   const arrow=new THREE.Mesh(new THREE.ConeGeometry(.36,.8,3),new THREE.MeshBasicMaterial({color:0x98f0ff}));arrow.position.copy(p1.clone().lerp(p2,.6));arrow.position.y=.16;arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),p2.clone().sub(p1).normalize());r.paths.add(arrow);
  });
  for(const [id,color] of [[cb.current.confirmed,0x67e2ef],[cb.current.destination,0xffaa66]] as const){if(!id||!NODE[id])continue;const n=NODE[id];const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.13,8,32),new THREE.MeshBasicMaterial({color}));ring.rotation.x=Math.PI/2;ring.position.set(n.x,.22,n.z);r.markers.add(ring);}
 };
 useImperativeHandle(ref,()=>({
  overview:()=>runtime.current?.overview(),focus:(n,h)=>runtime.current?.focus(n,h),
  snapshot:(id,h)=>{
   const r=runtime.current;if(!r||!NODE[id])return '';const n=NODE[id],a=HEADINGS.find(x=>x.id===h)!.angle*Math.PI/180;const c=new THREE.PerspectiveCamera(75,16/9,.1,150);c.position.set(n.x,1.65,n.z);c.lookAt(n.x+Math.sin(a)*6,1.6,n.z+Math.cos(a)*6);
   const previousRoof=r.roof?.visible,oldSize=r.renderer.getSize(new THREE.Vector2()),oldRatio=r.renderer.getPixelRatio();if(r.roof)r.roof.visible=true;r.renderer.setPixelRatio(1);r.renderer.setSize(480,270,false);r.renderer.render(r.scene,c);const image=r.renderer.domElement.toDataURL('image/jpeg',.86);r.renderer.setPixelRatio(oldRatio);r.renderer.setSize(oldSize.x,oldSize.y,false);if(r.roof)r.roof.visible=!!previousRoof;r.renderer.render(r.scene,r.camera);return image;
  },
  play:(nodes)=>{const r=runtime.current;if(!r||nodes.length<2)return;r.stop();r.mode='inside';r.controls.enabled=false;if(r.roof)r.roof.visible=true;r.camera.fov=75;r.camera.updateProjectionMatrix();r.animation={nodes,start:performance.now(),duration:Math.min(26000,Math.max(9000,routeLength(nodes)/4*1000)),last:0};cb.current.onProgress?.(0,true);},
  stop:()=>runtime.current?.stop(),
  record:(nodes)=>new Promise((resolve,reject)=>{
   const r=runtime.current;if(!r||nodes.length<2)return reject(new Error('请选择一条可预览的路线。'));
   if(typeof MediaRecorder==='undefined'||!r.renderer.domElement.captureStream)return reject(new Error('此浏览器不支持视频导出，请使用 Chrome，或直接播放路线预览。'));
   const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)return reject(new Error('此浏览器没有可用的视频编码器。'));
   r.stop();const stream=r.renderer.domElement.captureStream(30);let rec:MediaRecorder;try{rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000});}catch(e){stream.getTracks().forEach(t=>t.stop());return reject(e);}
   const chunks:BlobPart[]=[];let completed=false;r.recorder=rec;rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onerror=()=>reject(new Error('视频编码失败，请重试。'));rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());r.recorder=null;if(completed)resolve({blob:new Blob(chunks,{type:mime}),extension:mime.startsWith('video/mp4')?'mp4':'webm'});else reject(new Error('视频导出已取消。'));};
   r.mode='inside';r.controls.enabled=false;if(r.roof)r.roof.visible=true;r.camera.fov=75;r.camera.updateProjectionMatrix();rec.start(200);r.animation={nodes,start:performance.now(),duration:18000,last:0,done:()=>{completed=true;rec.stop();}};cb.current.onProgress?.(0,true);
  })
 }),[]);
 useEffect(()=>{applyPath();},[props.path,props.confirmed,props.destination]);
 useEffect(()=>{
  const host=hostRef.current;if(!host)return;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch{cb.current.onError?.('三维显示暂不可用，请开启浏览器硬件加速；平面路线仍可使用。');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#080e17');const camera=new THREE.PerspectiveCamera(48,1,.08,250);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=130;controls.maxPolarAngle=Math.PI*.47;
  scene.add(new THREE.HemisphereLight(0xcdeaff,0x263d55,1.5));const sun=new THREE.DirectionalLight(0xcceaff,1.8);sun.position.set(-15,30,-8);scene.add(sun);
  const paths=new THREE.Group(),markers=new THREE.Group();scene.add(paths,markers);const grid=new THREE.GridHelper(120,60,0x31566c,0x173041);grid.position.y=-.08;scene.add(grid);
  const r:Runtime={scene,camera,renderer,controls,roof:null,paths,markers,labels:[],mode:'overview',animation:null,recorder:null,
   stop:()=>{r.animation=null;if(r.recorder?.state==='recording')r.recorder.stop();cb.current.onProgress?.(0,false);},
   overview:()=>{r.stop();r.mode='overview';if(r.roof)r.roof.visible=false;camera.fov=48;camera.position.set(36,56,-61);camera.updateProjectionMatrix();controls.enabled=true;controls.target.set(0,0,0);controls.update();},
   focus:(id,h)=>{if(!NODE[id])return;r.stop();r.mode='inside';controls.enabled=false;if(r.roof)r.roof.visible=true;const n=NODE[id],a=HEADINGS.find(x=>x.id===h)!.angle*Math.PI/180;camera.fov=75;camera.position.set(n.x,1.65,n.z);camera.lookAt(n.x+Math.sin(a)*8,1.65,n.z+Math.cos(a)*8);camera.updateProjectionMatrix();}
  };runtime.current=r;r.overview();
  let disposed=false;
  const makeLabel=(text:string,color:string)=>{const canvas=document.createElement('canvas');canvas.width=420;canvas.height=112;const ctx=canvas.getContext('2d')!;ctx.fillStyle='rgba(9,24,37,.95)';ctx.beginPath();ctx.roundRect(2,2,416,108,25);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=color;ctx.font='600 37px Arial, "PingFang SC", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,210,58);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false}));sprite.scale.set(5.7,1.52,1);sprite.renderOrder=3;return sprite;};
  new GLTFLoader().load(publicAsset('models/gallery.glb'),g=>{
   if(disposed)return;
   const hidden:THREE.Object3D[]=[];let roof:THREE.Mesh|null=null;
   g.scene.traverse(o=>{
    if(o instanceof THREE.Light)hidden.push(o);
    if(o.name.startsWith('Occupancy')||o.name==='d_0'||o.name==='d_1')o.visible=false;
    if(o instanceof THREE.Mesh){
     if(o.name==='Hall'&&o.geometry.index){const original=o.geometry,index=Array.from(original.index!.array);const roofGeo=original.clone();roofGeo.setIndex(index.slice(0,6));roof=new THREE.Mesh(roofGeo,new THREE.MeshStandardMaterial({color:'#283947',roughness:1,side:THREE.DoubleSide}));roof.position.copy(o.position);roof.quaternion.copy(o.quaternion);roof.scale.copy(o.scale);roof.visible=r.mode==='inside';o.geometry=original.clone();o.geometry.setIndex(index.slice(6));o.material=new THREE.MeshStandardMaterial({color:'#3c5263',roughness:.95,side:THREE.DoubleSide});}
     if(o.name==='Floor')o.material=new THREE.MeshStandardMaterial({color:'#192a38',roughness:1,side:THREE.DoubleSide});
     if(o.name==='panels')o.material=new THREE.MeshStandardMaterial({color:'#2e495c',roughness:1});
     if(['Hall','Floor','panels'].includes(o.name)){const outline=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,25),new THREE.LineBasicMaterial({color:0x75abc3,transparent:true,opacity:.45}));o.add(outline);}
    }
   });hidden.forEach(o=>o.removeFromParent());scene.add(g.scene);if(roof){scene.add(roof);r.roof=roof;}
   const labels=[{id:'entry',text:'S · 南侧门厅'},...POIS.map(p=>({id:p.id,text:p.number+' · '+p.name})),{id:'cc',text:'中央十字口'}];
   labels.forEach(l=>{const n=NODE[l.id];const sprite=makeLabel(l.text,l.id==='entry'?'#96efff':'#acd6ec');sprite.position.set(n.x,3,n.z);sprite.userData.nodeId=l.id;r.labels.push(sprite);scene.add(sprite);});
   applyPath();cb.current.onReady?.();
  },undefined,()=>cb.current.onError?.('展厅模型未能载入，请刷新重试。'));
  const resize=()=>{const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const raycaster=new THREE.Raycaster();let down={x:0,y:0};const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};const pointerUp=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6||r.animation)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=raycaster.intersectObjects(r.labels)[0];if(hit)cb.current.onPick?.(hit.object.userData.nodeId);};renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  renderer.setAnimationLoop(now=>{
   if(r.animation){const a=r.animation,p=Math.min(1,(now-a.start)/a.duration),point=pointAt(a.nodes,p),ahead=pointAt(a.nodes,Math.min(1,p+.018));camera.position.set(point.x,1.65,point.z);if(p<.999)camera.lookAt(ahead.x,1.65,ahead.z);if(now-a.last>100){cb.current.onProgress?.(p,true);a.last=now;}if(p>=1){r.animation=null;cb.current.onProgress?.(1,false);a.done?.();}}
   else if(r.mode==='overview')controls.update();
   renderer.render(scene,camera);
  });
  return()=>{disposed=true;r.stop();runtime.current=null;observer.disconnect();renderer.setAnimationLoop(null);controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);const textures=new Set<THREE.Texture>();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Sprite||o instanceof THREE.LineSegments){if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments)o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);m.dispose();});}});textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div className="three-canvas" ref={hostRef} aria-label="可旋转的展厅三维模型"/>;
});
export default GalleryViewer;
