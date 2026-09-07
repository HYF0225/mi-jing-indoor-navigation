import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {HKU_MAIN_BUILDING as b} from '../app/hku-main-building.ts';
import {buildingNavigation,validateBuilding} from '../app/building-navigation.ts';
import {edgeKey} from '../app/navigation.ts';
import d from '../app/hku-main-building-data.json' with {type:'json'};
const nav=buildingNavigation(b);
test('HKU has 17 plan-mapped classroom doors, explicit pending coverage, and no invented office names',()=>{
 assert.deepEqual(validateBuilding(b),[]);assert.equal(b.pois.length,17);assert.equal(b.deferred.length,15);
 assert.equal(b.nodes.find(n=>n.id===b.entry).floor,'1F');assert.equal(b.connectors.length,0);
 assert.equal(new Set(b.pois.map(p=>p.number)).size,17);
 for(const p of b.deferred)assert.ok(!b.pois.some(q=>q.name.startsWith(p.number+' ')));
 assert.equal(d.labels.length,69);assert.ok(d.labels.every(l=>l.name_verified===false));
 assert.ok(b.notice.includes('未实走'));assert.ok(b.source.note.includes('门扇'));
});
test('every allowed starting node reaches each mapped classroom and returns; all edges have geometry evidence',()=>{
 const keys=new Set(b.edges.map(e=>edgeKey(...e)));
 assert.equal(d.checks.length,b.edges.length);
 for(const c of d.checks){assert.ok(c.pass);assert.ok(c.min_wall_clearance>=.35);assert.ok(c.floor_clear);assert.ok(keys.has(edgeKey(c.a,c.b)));}
 for(const n of b.nodes)for(const p of b.pois){
  const routes=nav.findRoutes(n.id,p.id);assert.ok(routes.length,`${n.id} -> ${p.id}`);
  for(const r of routes){assert.equal(r.nodes[0],n.id);assert.equal(r.nodes.at(-1),p.id);assert.equal(new Set(r.nodes).size,r.nodes.length);for(let i=1;i<r.nodes.length;i++)assert.ok(keys.has(edgeKey(r.nodes[i-1],r.nodes[i])));}
  assert.ok(nav.findRoutes(p.id,n.id).length);
 }
});
test('HKU closures remove both directions and isolating a door returns no fabricated route',()=>{
 const routes=nav.findRoutes(b.entry,b.destination,[b.closure.edge]);assert.ok(routes.length);
 for(const r of routes)for(let i=1;i<r.nodes.length;i++)assert.notEqual(edgeKey(r.nodes[i-1],r.nodes[i]),b.closure.edge);
 const doorEdges=b.edges.filter(e=>e.includes(b.destination)).map(e=>edgeKey(...e));assert.deepEqual(nav.findRoutes(b.entry,b.destination,doorEdges),[]);
 assert.deepEqual(nav.findRoutes(b.entry,'mb1-100'),[]);assert.deepEqual(nav.findRoutes(b.entry,'mb2-201'),[]);
});
test('door arrivals are on the corridor side and coordinate transform matches exported GLB',()=>{
 for(const dr of d.door_records){const n=nav.NODE[dr.arrival_node],dx=(dr.door_plan[0]-1165)*.064,dz=(675-dr.door_plan[1])*.064;
  assert.ok(Math.abs(Math.hypot(n.x-dx,n.z-dz)-.896)<.0001);assert.equal(n.y,0);assert.equal(dr.access_status,'unknown');
 }
 const file=fs.readFileSync(new URL('../public/'+b.model,import.meta.url));assert.equal(file.subarray(0,4).toString(),'glTF');assert.equal(file.readUInt32LE(4),2);assert.equal(file.readUInt32LE(8),file.length);
});
test('textured models are self-contained and exterior never changes navigation coverage',()=>{
 assert.notEqual(b.model,b.visualModel);assert.equal(b.pois.length,17);assert.equal(b.floors.length,1);
 for(const path of [b.model,b.visualModel]){const bytes=fs.readFileSync(new URL('../public/'+path,import.meta.url)),gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.ok(gltf.images.length>=2);assert.ok(gltf.images.every(i=>i.bufferView!==undefined&&!i.uri));for(const mesh of gltf.meshes)for(const p of mesh.primitives){const mat=gltf.materials[p.material];if(mat.pbrMetallicRoughness?.baseColorTexture)assert.ok(p.attributes.TEXCOORD_0!==undefined);}}
});
test('campus and floor studies are selectable but never become invented navigation floors',()=>{
 assert.deepEqual(b.visualViews.map(v=>v.id),['campus','2F','1F','GF']);
 assert.equal(b.visualViews[0].model,b.visualModel);
 assert.equal(b.visualViews.find(v=>v.id==='1F').model,b.model);
 for(const v of b.visualViews){
  const bytes=fs.readFileSync(new URL('../public/'+v.model,import.meta.url));
  assert.equal(bytes.subarray(0,4).toString(),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.ok(gltf.meshes.length>0);assert.ok(gltf.images.every(i=>i.bufferView!==undefined&&!i.uri));
  if(v.id==='GF'||v.id==='2F')assert.ok(v.note.includes('不是'));
 }
 assert.equal(b.floors.length,1);assert.equal(b.pois.length,17);assert.equal(b.connectors.length,0);
 assert.ok(!b.pois.some(p=>/S\d\d/.test(p.number)));
});
