import * as THREE from 'three';
import type {GuideSettings} from './route-presentation';
/** Lightweight, original 3D companion. No external avatar upload or identity service. */
export function createGuide(settings:GuideSettings){
 const root=new THREE.Group();root.name='Route companion';
 const skin=new THREE.MeshStandardMaterial({color:settings.skin,roughness:.85});
 const outfit=new THREE.MeshStandardMaterial({color:settings.outfit,roughness:.7});
 const hair=new THREE.MeshStandardMaterial({color:'#282129',roughness:.95});
 const dark=new THREE.MeshStandardMaterial({color:'#1a2937',roughness:.85});
 const white=new THREE.MeshStandardMaterial({color:'#e4edf4',roughness:.8});
 const mesh=(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D,x:number,y:number,z:number)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;};
 const sphere=(r:number,m:THREE.Material,parent:THREE.Object3D,x:number,y:number,z:number)=>mesh(new THREE.SphereGeometry(r,16,12),m,parent,x,y,z);
 const body=mesh(new THREE.CylinderGeometry(.19,.23,.48,16),outfit,root,0,1.05,0);body.scale.z=.68;
 sphere(.18,skin,root,0,1.55,0);
 const cap=sphere(.187,hair,root,0,1.61,-.02);cap.scale.y=.66;
 if(settings.hair==='long'){const back=sphere(.19,hair,root,0,1.40,-.11);back.scale.set(.95,1.4,.55);const tail=sphere(.10,hair,root,0,1.38,-.23);tail.scale.y=1.8;}
 for(const x of [-.063,.063])sphere(.016,dark,root,x,1.56,.163);
 const smile=mesh(new THREE.TorusGeometry(.039,.006,4,12,Math.PI),dark,root,0,1.495,.171);smile.rotation.z=Math.PI;
 mesh(new THREE.CylinderGeometry(.068,.07,.12,12),skin,root,0,1.33,0);
 if(settings.style==='woman'){const skirt=mesh(new THREE.CylinderGeometry(.22,.28,.28,16),outfit,root,0,.74,0);skirt.scale.z=.8;}
 const limbs:THREE.Group[]=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.105,.70,0);root.add(leg);limbs.push(leg);
  mesh(new THREE.CapsuleGeometry(.065,.43,4,10),settings.style==='woman'?skin:dark,leg,0,-.27,0);
  const shoe=sphere(.085,white,leg,0,-.60,.035);shoe.scale.set(.85,.65,1.45);
  const arm=new THREE.Group();arm.position.set(side*.25,1.24,0);root.add(arm);limbs.push(arm);
  mesh(new THREE.CapsuleGeometry(.053,.30,4,10),outfit,arm,0,-.17,0);
  sphere(.058,skin,arm,0,-.39,0);
 }
 const halo=mesh(new THREE.RingGeometry(.28,.31,32),new THREE.MeshBasicMaterial({color:settings.outfit,side:THREE.DoubleSide,transparent:true,opacity:.6}),root,0,.025,0);halo.rotation.x=-Math.PI/2;
 return {root,pose:(distance:number,walking:boolean)=>{const stride=walking?Math.sin(distance*5.5)*.42:0;limbs.forEach((part,i)=>part.rotation.x=stride*(i<2?1:-1)*(i%2?-1:1));},dispose:()=>{const materials=new Set<THREE.Material>();root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});materials.forEach(m=>m.dispose());root.removeFromParent();}};
}
