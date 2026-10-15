import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import './style.css';

type Landmark={name:string;model:string;position:[number,number,number]};
type Metadata={modelObjects:number;textures:number;routeLines:number;glbBytes:number;landmarks:Landmark[]};
type Path={id:number;kind:number;points:[number,number,number][]};
const el=<T = HTMLElement>(id:string)=>document.getElementById(id) as T;
const root=el('canvas'),loading=el('loading');
// The build rewrites this module into /assets/; use the deployment base explicitly.
const asset=(name:string)=>`${process.env.NEXT_PUBLIC_BASE_PATH??''}/models/campus-preview/${name}`;
el('retry').onclick=()=>location.reload();
function fail(message:string){loading.hidden=false;el('load-title').textContent='模型暂时无法加载';el('load-detail').textContent=message;el('retry').hidden=false;loading.querySelector('.spinner')?.remove();}
async function json<T>(name:string):Promise<T>{const r=await fetch(asset(name));if(!r.ok)throw new Error(`${name}: HTTP ${r.status}`);return r.json();}

async function start(){
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.setClearColor('#e9f0ed');root.appendChild(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','三维校园：左键旋转、右键平移、滚轮缩放');renderer.domElement.tabIndex=0;
 const scene=new THREE.Scene();
 scene.add(new THREE.HemisphereLight(0xf5fbff,0xa8ad97,2.3));
 const sun=new THREE.DirectionalLight(0xfff3dc,2.7);sun.position.set(350,700,250);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(43,1,1,10000);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;
 controls.minDistance=12;controls.maxDistance=2400;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=true;
 controls.listenToKeyEvents(renderer.domElement);
 const materials:LineMaterial[]=[];const paths=new THREE.Group();scene.add(paths);paths.visible=false;
 function resize(){const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();materials.forEach(m=>m.resolution.set(w,h));}
 new ResizeObserver(resize).observe(root);resize();
 function view(name:string){const target=new THREE.Vector3(-5,75,15);const wide=root.clientWidth/root.clientHeight<1?1.5:1;
  const poses:Record<string,number[]>={overview:[500,900,760],top:[-5,1250,16],east:[1050,500,30],west:[-1050,500,30]};
  const p=poses[name]??poses.overview;camera.position.set(p[0]*wide,p[1]*wide,p[2]*wide);controls.target.copy(target);controls.update();
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===name)));
  el('view-name').textContent='校园 · '+({overview:'斜视总览',top:'正上方',east:'东侧视角',west:'西侧视角'}[name]??'自由视角');
 }
 view('overview');document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view!));
 el('reset').onclick=()=>{el<HTMLSelectElement>('landmark').value='';view('overview');};
 el('pan').onclick=()=>{const active=el('pan').getAttribute('aria-pressed')!=='true';el('pan').setAttribute('aria-pressed',String(active));controls.mouseButtons.LEFT=active?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;controls.touches.ONE=active?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE;};
 function zoom(factor:number){const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(factor).clampLength(controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update();}
 el('zoom-in').onclick=()=>zoom(.8);el('zoom-out').onclick=()=>zoom(1.25);
 el<HTMLInputElement>('paths').onchange=e=>{paths.visible=(e.target as HTMLInputElement).checked;};
 el<HTMLInputElement>('xray').onchange=e=>{const xray=(e.target as HTMLInputElement).checked;materials.forEach(m=>{m.depthTest=!xray;});};
 renderer.setAnimationLoop(()=>{controls.update();const angle=Math.round(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()));el('north').textContent=`北 ${angle===0?'↑':angle>0?'↗':'↖'} · ${Math.abs(angle)}°`;renderer.render(scene,camera);});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('设备的图形资源不足。请关闭其他 3D 页面后重试。');});
 const metadata=await json<Metadata>('metadata.json');
 const gltf=await new GLTFLoader().loadAsync(asset('campus.glb'),event=>{const total=event.total||metadata.glbBytes;el('load-detail').textContent=`照片纹理与建筑 · ${Math.min(100,Math.round(event.loaded/total*100))}% · ${(total/1048576).toFixed(1)} MB`;});
 // Legacy FBX materials export as metallic by default; building facades and
 // terrain are diffuse. This display adjustment keeps the original texture.
 gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m instanceof THREE.MeshStandardMaterial){m.metalness=0;m.roughness=.9;}});}});
 scene.add(gltf.scene);loading.hidden=true;
 el('stats').textContent=`${metadata.modelObjects} 个模型对象 · ${metadata.textures} 张来源纹理`;
 const select=el<HTMLSelectElement>('landmark');
 metadata.landmarks.forEach((l,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=l.name;select.appendChild(option);});select.disabled=false;
 const marker=new THREE.Mesh(new THREE.TorusGeometry(14,1,8,64),new THREE.MeshBasicMaterial({color:0xf3b633,depthTest:false}));marker.rotation.x=-Math.PI/2;marker.renderOrder=20;marker.visible=false;scene.add(marker);
 el('reset').onclick=()=>{select.value='';marker.visible=false;view('overview');};
 select.onchange=()=>{if(!select.value){marker.visible=false;view('overview');return;}const l=metadata.landmarks[Number(select.value)];const target=new THREE.Vector3(...l.position);controls.target.copy(target).add(new THREE.Vector3(0,-12,0));camera.position.copy(target).add(new THREE.Vector3(110,120,175));controls.update();marker.position.copy(target).add(new THREE.Vector3(0,5,0));marker.visible=true;el('view-name').textContent=l.name;el('selection').textContent='金色圆环标记所选建筑，并非入口或你的位置。';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));};
 try{const source=await json<Path[]>('paths.json');
  const segments:number[][]=[[],[],[]];
  source.forEach(p=>{const bucket=p.kind===2?1:[8,10,12].includes(p.kind)?2:0;for(let i=1;i<p.points.length;i++)segments[bucket].push(...p.points[i-1],...p.points[i]);});
  segments.forEach((positions,i)=>{if(!positions.length)return;const g=new LineSegmentsGeometry();g.setPositions(positions);const m=new LineMaterial({color:[0x176fea,0x0b9b62,0xdf731d][i],linewidth:3,depthTest:false,depthWrite:false});m.resolution.set(root.clientWidth,root.clientHeight);materials.push(m);const line=new LineSegments2(g,m);line.renderOrder=10;paths.add(line);});
 }catch{el<HTMLInputElement>('paths').disabled=true;el('stats').textContent+=' · 路网未加载，请刷新重试';}
}
start().catch(error=>{console.error(error);fail('请检查网络和浏览器 WebGL 支持后重试。模型文件较大，首次加载可能稍慢。');});
