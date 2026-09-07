'use client';
import {publicAsset} from './public-asset';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HEADINGS, type Heading } from './navigation';
import type { Building } from './buildings';
import { buildingNavigation } from './building-navigation';
import { playClock, pauseClock, progressAt, rateClock, type Playback } from './playback';
import {createGuide} from './guide-avatar';
import {routePresentation, type ViewMode, type GuideSettings} from './route-presentation';
export type ViewerAPI = {
 overview:()=>void; focus:(node:string,heading:Heading)=>void;
 setView:(mode:ViewMode,node:string,heading:Heading)=>void; setRate:(rate:number)=>void;
 snapshot:(node:string,heading:Heading)=>string;
 play:(nodes:string[])=>void; pause:()=>void; stop:()=>void;
 record:(nodes:string[])=>Promise<{blob:Blob;extension:string}>;
};
type Props={building:Building;floor:string;guide:GuideSettings;rate:number;path?:string[];confirmed?:string|null;destination?:string;onReady?:()=>void;onError?:(message:string)=>void;onProgress?:(p:number,playing:boolean)=>void;onPick?:(id:string)=>void};
type Runtime={scene:THREE.Scene;camera:THREE.PerspectiveCamera;renderer:THREE.WebGLRenderer;controls:OrbitControls;roof:THREE.Mesh|null;paths:THREE.Group;markers:THREE.Group;labels:THREE.Sprite[];guide:ReturnType<typeof createGuide>;mode:ViewMode;animation:{nodes:string[];clock:Playback;last:number;done?:()=>void}|null;recorder:MediaRecorder|null;overview:()=>void;stop:()=>void;focus:(id:string,h:Heading)=>void};
const GalleryViewer=forwardRef<ViewerAPI,Props>(function GalleryViewer(props,ref){
 const {NODE,pointAt,routeLength}=buildingNavigation(props.building),POIS=props.building.pois;
 const hostRef=useRef<HTMLDivElement>(null), runtime=useRef<Runtime|null>(null),cb=useRef(props);cb.current=props;
 const applyPath=()=>{
  const r=runtime.current;if(!r)return;
  for(const group of [r.paths,r.markers]){while(group.children.length){const c=group.children[0] as THREE.Mesh;group.remove(c);c.geometry?.dispose();if(c.material&&!Array.isArray(c.material))c.material.dispose();}}
  const ids=cb.current.path??[];
  ids.slice(1).forEach((id,i)=>{const a=NODE[ids[i]],b=NODE[id];if(!a||!b)return;const p1=new THREE.Vector3(a.x,a.y+.035,a.z),p2=new THREE.Vector3(b.x,b.y+.035,b.z),delta=p2.clone().sub(p1),length=delta.length();if(length<.001)return;const forward=delta.clone().normalize(),side=new THREE.Vector3(forward.z,0,-forward.x).normalize();
   const ribbon=new THREE.BufferGeometry().setFromPoints([p1.clone().addScaledVector(side,.022),p1.clone().addScaledVector(side,-.022),p2.clone().addScaledVector(side,.022),p2.clone().addScaledVector(side,-.022)]);ribbon.setIndex([0,1,2,2,1,3]);r.paths.add(new THREE.Mesh(ribbon,new THREE.MeshBasicMaterial({color:0x64e6f5,side:THREE.DoubleSide,transparent:true,opacity:.6})));
   for(let d=.7;d<length-.25;d+=2.8){const tip=p1.clone().addScaledVector(forward,d);for(const sign of [-1,1]){const tail=tip.clone().addScaledVector(forward,-.23).addScaledVector(side,.16*sign),edge=tip.clone().sub(tail);const arrow=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,edge.length(),5),new THREE.MeshBasicMaterial({color:0x98f0ff}));arrow.position.copy(tail.add(tip).multiplyScalar(.5));arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),edge.normalize());r.paths.add(arrow);}}
  });
  for(const [id,color] of [[cb.current.confirmed,0x67e2ef],[cb.current.destination,0xffaa66]] as const){if(!id||!NODE[id])continue;const n=NODE[id];const ring=new THREE.Mesh(new THREE.TorusGeometry(.40,.025,6,32),new THREE.MeshBasicMaterial({color}));ring.rotation.x=Math.PI/2;ring.position.set(n.x,n.y+.04,n.z);r.markers.add(ring);}
 };
 useImperativeHandle(ref,()=>({
  overview:()=>runtime.current?.overview(),focus:(n,h)=>runtime.current?.focus(n,h),
  setView:(mode,node,heading)=>{const r=runtime.current;if(!r)return;if(r.animation){r.mode=mode;r.controls.enabled=false;}else if(mode==='overview')r.overview();else r.focus(node,heading);},
  setRate:rate=>{const r=runtime.current;if(r?.animation)r.animation.clock=rateClock(r.animation.clock,rate,performance.now());},
  snapshot:(id,h)=>{
   const r=runtime.current;if(!r||!NODE[id])return '';const n=NODE[id],a=HEADINGS.find(x=>x.id===h)!.angle*Math.PI/180;const c=new THREE.PerspectiveCamera(75,16/9,.1,250);c.position.set(n.x,n.y+1.65,n.z);c.lookAt(n.x+Math.sin(a)*6,n.y+1.6,n.z+Math.cos(a)*6);
   const previousRoof=r.roof?.visible,oldSize=r.renderer.getSize(new THREE.Vector2()),oldRatio=r.renderer.getPixelRatio(),oldClips=r.renderer.clippingPlanes,oldLabels=r.labels.map(l=>l.visible);r.labels.forEach(l=>l.visible=NODE[l.userData.nodeId].floor===n.floor);r.renderer.clippingPlanes=[];if(r.roof)r.roof.visible=true;r.renderer.setPixelRatio(1);r.renderer.setSize(480,270,false);r.renderer.render(r.scene,c);const image=r.renderer.domElement.toDataURL('image/jpeg',.86);r.renderer.setPixelRatio(oldRatio);r.renderer.setSize(oldSize.x,oldSize.y,false);r.renderer.clippingPlanes=oldClips;r.labels.forEach((l,i)=>l.visible=oldLabels[i]);if(r.roof)r.roof.visible=!!previousRoof;r.renderer.render(r.scene,r.camera);return image;
  },
  play:(nodes)=>{const r=runtime.current;if(!r||nodes.length<2||r.recorder)return;r.controls.enabled=false;const now=performance.now(),clock=playClock(r.animation?.clock??null,nodes.join('|'),Math.min(40000,Math.max(9000,routeLength(nodes)/4*1000)),now,cb.current.rate);r.animation={nodes:[...nodes],clock,last:0};cb.current.onProgress?.(progressAt(clock,now),true);},
  pause:()=>{const r=runtime.current;if(!r?.animation||r.recorder)return;r.animation.clock=pauseClock(r.animation.clock,performance.now());cb.current.onProgress?.(progressAt(r.animation.clock,performance.now()),false);},
  stop:()=>runtime.current?.stop(),
  record:(nodes)=>new Promise((resolve,reject)=>{
   const r=runtime.current;if(!r||nodes.length<2)return reject(new Error('请选择一条可预览的路线。'));
   if(typeof MediaRecorder==='undefined'||!r.renderer.domElement.captureStream)return reject(new Error('此浏览器不支持视频导出，请使用 Chrome，或直接播放路线预览。'));
   const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)return reject(new Error('此浏览器没有可用的视频编码器。'));
   r.stop();const stream=r.renderer.domElement.captureStream(30);let rec:MediaRecorder;try{rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:4500000});}catch(e){stream.getTracks().forEach(t=>t.stop());return reject(e);}
   const chunks:BlobPart[]=[];let completed=false;r.recorder=rec;rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onerror=()=>reject(new Error('视频编码失败，请重试。'));rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());r.recorder=null;if(completed)resolve({blob:new Blob(chunks,{type:mime}),extension:mime.startsWith('video/mp4')?'mp4':'webm'});else reject(new Error('视频导出已取消。'));};
   r.controls.enabled=false;rec.start(200);r.animation={nodes:[...nodes],clock:playClock(null,nodes.join('|'),18000,performance.now(),cb.current.rate),last:0,done:()=>{completed=true;rec.stop();}};cb.current.onProgress?.(0,true);
  })
 }),[]);
 useEffect(()=>{applyPath();},[props.path,props.confirmed,props.destination]);
 useEffect(()=>{const r=runtime.current;if(r?.mode==='overview'&&!r.animation)r.overview();},[props.floor]);
 useEffect(()=>{const r=runtime.current;if(!r)return;r.guide.dispose();r.guide=createGuide(props.guide);r.guide.root.visible=false;r.scene.add(r.guide.root);},[props.guide]);
 useEffect(()=>{
  const host=hostRef.current;if(!host)return;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch{cb.current.onError?.('三维显示暂不可用，请开启浏览器硬件加速；平面路线仍可使用。');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#080e17');const camera=new THREE.PerspectiveCamera(48,1,.08,250);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=200;controls.maxPolarAngle=Math.PI*.47;
  scene.add(new THREE.HemisphereLight(0xcdeaff,0x263d55,1.5));const sun=new THREE.DirectionalLight(0xcceaff,1.8);sun.position.set(-15,30,-8);scene.add(sun);
  const paths=new THREE.Group(),markers=new THREE.Group();scene.add(paths,markers);const grid=new THREE.GridHelper(120,60,0x31566c,0x173041);grid.position.y=-.08;scene.add(grid);
  const guide=createGuide(cb.current.guide);guide.root.visible=false;scene.add(guide.root);
  const r:Runtime={scene,camera,renderer,controls,roof:null,paths,markers,guide,labels:[],mode:'overview',animation:null,recorder:null,
   stop:()=>{r.animation=null;r.guide.root.visible=false;camera.up.set(0,1,0);if(r.recorder?.state==='recording')r.recorder.stop();cb.current.onProgress?.(0,false);},
   overview:()=>{r.stop();r.mode='overview';if(r.roof)r.roof.visible=false;const building=cb.current.building,floor=building.floors.find(f=>f.id===cb.current.floor),b=building.bounds,cx=(b.x1+b.x2)/2,cz=(b.z1+b.z2)/2,scale=Math.max(b.x2-b.x1,b.z2-b.z1)/60;renderer.clippingPlanes=building.adapter==='standard'&&floor?[new THREE.Plane(new THREE.Vector3(0,-1,0),floor.y+3.2)]:[];r.labels.forEach(s=>s.visible=!floor||NODE[s.userData.nodeId].floor===floor.id);camera.fov=48;camera.position.set(cx+36*scale,56*scale,cz-61*scale);camera.updateProjectionMatrix();controls.enabled=true;controls.target.set(cx,floor?.y??0,cz);controls.update();},
   focus:(id,h)=>{if(!NODE[id])return;r.stop();r.mode='inside';renderer.clippingPlanes=[];r.labels.forEach(s=>s.visible=true);controls.enabled=false;if(r.roof)r.roof.visible=true;const n=NODE[id],a=HEADINGS.find(x=>x.id===h)!.angle*Math.PI/180;camera.fov=75;camera.position.set(n.x,n.y+1.65,n.z);camera.lookAt(n.x+Math.sin(a)*8,n.y+1.65,n.z+Math.cos(a)*8);camera.updateProjectionMatrix();}
  };runtime.current=r;r.overview();
  let disposed=false;
  const makeLabel=(text:string,color:string)=>{const canvas=document.createElement('canvas');canvas.width=420;canvas.height=112;const ctx=canvas.getContext('2d')!;ctx.fillStyle='rgba(9,24,37,.95)';ctx.beginPath();ctx.roundRect(2,2,416,108,25);ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=color;ctx.font='600 37px Arial, "PingFang SC", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,210,58);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false}));sprite.scale.set(5.7,1.52,1);sprite.renderOrder=3;return sprite;};
  new GLTFLoader().load(publicAsset(props.building.model),g=>{
   if(disposed){g.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{for(const v of Object.values(m))if(v instanceof THREE.Texture)v.dispose();m.dispose();});}});return;}
   const hidden:THREE.Object3D[]=[];let roof:THREE.Mesh|null=null;
   g.scene.traverse(o=>{
    if(o instanceof THREE.Light)hidden.push(o);
    if(o.name.startsWith('Occupancy')||o.name==='d_0'||o.name==='d_1')o.visible=false;
    if(o instanceof THREE.Mesh&&props.building.adapter==='openvgal'){
     if(o.name==='Hall'&&o.geometry.index){const original=o.geometry,index=Array.from(original.index!.array);const roofGeo=original.clone();roofGeo.setIndex(index.slice(0,6));roof=new THREE.Mesh(roofGeo,new THREE.MeshStandardMaterial({color:'#283947',roughness:1,side:THREE.DoubleSide}));roof.position.copy(o.position);roof.quaternion.copy(o.quaternion);roof.scale.copy(o.scale);roof.visible=r.mode==='inside';o.geometry=original.clone();o.geometry.setIndex(index.slice(6));o.material=new THREE.MeshStandardMaterial({color:'#3c5263',roughness:.95,side:THREE.DoubleSide});}
     if(o.name==='Floor')o.material=new THREE.MeshStandardMaterial({color:'#192a38',roughness:1,side:THREE.DoubleSide});
     if(o.name==='panels')o.material=new THREE.MeshStandardMaterial({color:'#2e495c',roughness:1});
     if(['Hall','Floor','panels'].includes(o.name)){const outline=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,25),new THREE.LineBasicMaterial({color:0x75abc3,transparent:true,opacity:.45}));o.add(outline);}
    }
   });hidden.forEach(o=>o.removeFromParent());scene.add(g.scene);if(roof){scene.add(roof);r.roof=roof;}
   const labels=[{id:props.building.entry,text:NODE[props.building.entry].name},...POIS.filter(p=>p.id!==props.building.entry).map(p=>({id:p.id,text:p.number+' · '+p.name}))];
   labels.forEach(l=>{const n=NODE[l.id];const sprite=makeLabel(l.text,l.id===props.building.entry?'#96efff':'#acd6ec');sprite.position.set(n.x,n.y+3,n.z);sprite.userData.nodeId=l.id;r.labels.push(sprite);scene.add(sprite);});
   if(r.mode==='overview')r.overview();
   applyPath();cb.current.onReady?.();
  },undefined,()=>{if(!disposed)cb.current.onError?.('建筑模型未能载入，请刷新重试。');});
  const resize=()=>{const w=Math.max(host.clientWidth,1),h=Math.max(host.clientHeight,1);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const raycaster=new THREE.Raycaster();let down={x:0,y:0};const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};const pointerUp=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6||r.animation)return;const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const hit=raycaster.intersectObjects(r.labels)[0];if(hit)cb.current.onPick?.(hit.object.userData.nodeId);};renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  renderer.setAnimationLoop(now=>{
   if(r.animation){
    const a=r.animation,p=progressAt(a.clock,now),length=routeLength(a.nodes),pose=routePresentation(a.nodes,p,length,pointAt),{point}=pose,running=a.clock.since!==null;
    const visibleFloor=cb.current.building.floors.filter(f=>f.y<=point.y+.3).at(-1);r.labels.forEach(l=>l.visible=NODE[l.userData.nodeId].floor===visibleFloor?.id);
    const top=r.mode==='overview';if(r.roof)r.roof.visible=!top;
    r.renderer.clippingPlanes=top?[new THREE.Plane(new THREE.Vector3(0,-1,0),(visibleFloor?.y??point.y)+2)]:[];
    camera.fov=top?50:75;camera.up.set(0,top?0:1,top?1:0);
    if(top){camera.position.set(point.x,point.y+Math.max(26,20/camera.aspect),point.z-.01);camera.lookAt(point.x,point.y,point.z);}
    else {camera.position.set(point.x,point.y+1.65,point.z);camera.lookAt(point.x+Math.sin(pose.heading)*3,point.y+1.5,point.z+Math.cos(pose.heading)*3);}
    camera.updateProjectionMatrix();
    r.guide.root.visible=cb.current.guide.style!=='ground'&&(top||Math.hypot(pose.guide.x-point.x,pose.guide.z-point.z)>.55);
    r.guide.root.position.set(pose.guide.x,pose.guide.y,pose.guide.z);r.guide.root.rotation.y=pose.guideHeading;r.guide.pose(pose.guideProgress*length,running&&pose.guideProgress<1);
    if(running&&now-a.last>100){cb.current.onProgress?.(p,true);a.last=now;}
    if(running&&p>=1){a.clock=pauseClock(a.clock,now);cb.current.onProgress?.(1,false);a.done?.();}
   }
   else if(r.mode==='overview')controls.update();
   renderer.render(scene,camera);
  });
  return()=>{disposed=true;r.stop();runtime.current=null;observer.disconnect();renderer.setAnimationLoop(null);controls.dispose();renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);const textures=new Set<THREE.Texture>();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Sprite||o instanceof THREE.LineSegments){if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments)o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);m.dispose();});}});textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();};
 },[]);
 return <div className="three-canvas" ref={hostRef} aria-label={props.building.name+'三维模型'}/>;
});
export default GalleryViewer;
