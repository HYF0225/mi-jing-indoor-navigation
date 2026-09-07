import test from 'node:test';
import assert from 'node:assert/strict';
import { NODES, NODE, EDGES, BLOCKED_EDGE, edgeKey, findRoutes, directionText, pointAt, pointIsClear } from '../app/navigation.ts';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BUILDINGS, GALLERY } from '../app/buildings.ts';
import { buildingNavigation, validateBuilding } from '../app/building-navigation.ts';
import { playClock, pauseClock, progressAt, rateClock, PLAYBACK_RATES } from '../app/playback.ts';
import {routePresentation,DEFAULT_GUIDE} from '../app/route-presentation.ts';
import {createGuide} from '../app/guide-avatar.ts';

test('live speed changes preserve progress, including paused and completed clocks',()=>{
 for(const rate of PLAYBACK_RATES){
  let c=playClock(null,'route',10000,0);c=rateClock(c,rate,2000);
  assert.equal(progressAt(c,2000),.2);assert.ok(Math.abs(progressAt(c,3000)-(.2+rate/10))<1e-9);
  c=pauseClock(c,3000);const held=progressAt(c,3000);c=rateClock(c,4,8000);
  assert.equal(progressAt(c,100000),held);assert.equal(c.since,null);
  c=playClock(c,'route',10000,100000);assert.ok(Math.abs(progressAt(c,100500)-(held+.2))<1e-9);
 }
 let c=playClock(null,'route',1000,0,4);assert.equal(progressAt(c,300),1);
 c=rateClock(pauseClock(c,300),.5,500);assert.equal(progressAt(c,9000),1);
 assert.equal(progressAt(playClock(c,'route',1000,9000,.5),10000),.5);
 assert.equal(rateClock(c,NaN,9000).rate,1);
});
test('view presentation leaves clock untouched and companion stays on all building route polylines',()=>{
 for(const b of BUILDINGS){const nav=buildingNavigation(b),route=nav.findRoutes(b.entry,b.destination)[0],length=nav.routeLength(route.nodes),clock=playClock(null,'route',10000,0),saved=JSON.stringify(clock);
  for(let i=0;i<=100;i++){const p=i/100,pose=routePresentation(route.nodes,p,length,nav.pointAt);assert.deepEqual(pose.point,nav.pointAt(route.nodes,p));assert.deepEqual(pose.guide,nav.pointAt(route.nodes,pose.guideProgress));assert.ok(pose.guideProgress>=p&&pose.guideProgress<=1);assert.ok((pose.guideProgress-p)*length<=2.000001);assert.ok(Number.isFinite(pose.heading)&&Number.isFinite(pose.guideHeading));}
  assert.equal(JSON.stringify(clock),saved);assert.deepEqual(routePresentation(route.nodes,1,length,nav.pointAt).guide,nav.pointAt(route.nodes,1));
 }
});
test('avatar variants construct, animate and release original geometry',()=>{
 for(const style of ['woman','man'])for(const hair of ['long','short']){const avatar=createGuide({...DEFAULT_GUIDE,style,hair});assert.ok(avatar.root.children.length>10);avatar.pose(3,true);avatar.pose(3,false);avatar.root.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite));assert.ok(o.rotation.toArray().slice(0,3).every(Number.isFinite));});avatar.dispose();}
});

test('pause/resume retains progress and excludes all paused wall time',()=>{
 let c=playClock(null,'gallery/routeA',10000,1000);
 c=pauseClock(c,3500);assert.equal(progressAt(c,80000),.25);
 c=playClock(c,'gallery/routeA',10000,90000);assert.equal(progressAt(c,90000),.25);
 assert.equal(progressAt(c,91000),.35);
 c=pauseClock(c,91000);c=pauseClock(c,100000);assert.equal(progressAt(c,120000),.35);
 c=playClock(c,'gallery/routeA',10000,120000);assert.equal(progressAt(c,120500),.4);
});
test('new route, explicit reset and replay after completion start at zero',()=>{
 let c=pauseClock(playClock(null,'a',10000,0),4000);
 assert.equal(progressAt(playClock(c,'b',10000,8000),8000),0);
 assert.equal(progressAt(playClock(null,'a',10000,8000),8000),0);
 c=playClock(null,'a',10000,0);assert.equal(progressAt(c,14000),1);
 assert.equal(progressAt(playClock(c,'a',10000,14000),14000),0);
});
test('all building packages have valid independent endpoints and floor connectors',()=>{
 assert.equal(BUILDINGS.length,3);
 for(const b of BUILDINGS){assert.deepEqual(validateBuilding(b),[]);const n=buildingNavigation(b);assert.ok(n.findRoutes(b.entry,b.destination).length);}
 assert.equal(buildingNavigation(BUILDINGS[1]).findRoutes('entry','exit').length,0);
 assert.equal(buildingNavigation(GALLERY).findRoutes('f1_010','f3_044').length,0);
});
test('generalized gallery routing preserves both outer alternatives and obstacle clearance',()=>{
 const n=buildingNavigation(GALLERY),routes=n.findRoutes('entry','exit');assert.equal(routes.length,3);assert.equal(routes[0].length,56);
 assert.ok(routes.some(r=>r.nodes.some(id=>n.NODE[id].x<0)));assert.ok(routes.some(r=>r.nodes.some(id=>n.NODE[id].x>0)));
 for(const a of GALLERY.nodes)for(const b of GALLERY.pois)for(const r of n.findRoutes(a.id,b.id))for(let i=0;i<=200;i++)assert.ok(pointIsClear(n.pointAt(r.nodes,i/200)));
});
test('mall routes connect floors only through modeled ramps, stay loop-free and honor closures',()=>{
 const b=BUILDINGS[1],n=buildingNavigation(b),keys=new Set(b.edges.map(e=>edgeKey(...e)));
 for(const from of b.nodes.filter(n=>n.checkpoint!==false))for(const to of b.pois){const routes=n.findRoutes(from.id,to.id);assert.ok(routes.length>=1&&routes.length<=3);for(const r of routes){assert.equal(r.nodes[0],from.id);assert.equal(r.nodes.at(-1),to.id);assert.equal(new Set(r.nodes).size,r.nodes.length);assert.ok(r.length<=Math.min(routes[0].length*1.75,routes[0].length+35)+1e-8);for(let i=1;i<r.nodes.length;i++){const a=r.nodes[i-1],c=r.nodes[i];assert.ok(keys.has(edgeKey(a,c)));if(n.NODE[a].floor!==n.NODE[c].floor)assert.equal(n.connector(a,c).kind,'escalator');}}}
 const routes=n.findRoutes(b.entry,b.destination,[b.closure.edge]);assert.ok(routes.length);for(const r of routes)for(let i=1;i<r.nodes.length;i++)assert.notEqual(edgeKey(r.nodes[i-1],r.nodes[i]),b.closure.edge);
});
test('step-free routing never invents an elevator or crosses the atrium',()=>{
 const b=BUILDINGS[1],n=buildingNavigation(b);assert.deepEqual(n.findRoutes(b.entry,b.destination,[],true),[]);
 assert.ok(n.findRoutes(b.entry,'f1_011',[],true).length);
 const r=n.findRoutes(b.entry,b.destination)[0];assert.equal(n.pointAt(r.nodes,0).y,1);assert.equal(n.pointAt(r.nodes,1).y,14);
 assert.ok(r.nodes.some(id=>n.NODE[id].floor==='2F'));
 for(let i=0;i<=500;i++){const p=n.pointAt(r.nodes,i/500);if(p.y>6)assert.ok(Math.hypot(p.x,p.z-22.1)>10);}
});
test('downloaded mall is unchanged and every navigation segment matches geometry evidence',()=>{
 const file=fs.readFileSync(new URL('../public/models/empty-mall.glb',import.meta.url));assert.equal(file.length,3456400);assert.equal(crypto.createHash('sha256').update(file).digest('hex'),'b31ab94bdc69bd71c441fd9b139a1969d2bc5fcd798a8bb3e5cfc430baa2f206');
 const evidence=JSON.parse(fs.readFileSync(new URL('../public/models/empty-mall-navigation-evidence.json',import.meta.url),'utf8')),b=BUILDINGS[1],n=buildingNavigation(b),covered=new Set();
 for(const node of evidence.nodes){const actual=n.NODE[node.id];assert.deepEqual([actual.x,actual.y,actual.z],node.xyz);}
 for(const e of evidence.edges){if(e.kind==='walk'){assert.equal(e.surfaceValidated,true);assert.ok(e.wallClearance>=.35);covered.add(edgeKey(e.from,e.to));}else{const ids=[e.from,e.from+'_via_0',e.from+'_via_1',e.to];ids.forEach((id,i)=>{const p=n.NODE[id];assert.deepEqual([p.x,p.y,p.z],e.polyline[i]);if(i)covered.add(edgeKey(ids[i-1],id));});}}
 assert.equal(covered.size,b.edges.length);for(const e of b.edges)assert.ok(covered.has(edgeKey(...e)));
});

test('all available routes use real connected edges and stay inside the model corridors',()=>{
 let checked=0;
 for(const a of NODES)for(const b of NODES){const routes=findRoutes(a.id,b.id);assert.ok(routes.length>=1);assert.ok(routes.length<=3);for(const r of routes){assert.equal(r.nodes[0],a.id);assert.equal(r.nodes.at(-1),b.id);assert.equal(new Set(r.nodes).size,r.nodes.length);for(let i=1;i<r.nodes.length;i++){assert.ok(EDGES.some(e=>edgeKey(...e)===edgeKey(r.nodes[i-1],r.nodes[i])));}for(let i=0;i<=400;i++)assert.ok(pointIsClear(pointAt(r.nodes,i/400)),`collision: ${r.id} at ${i}/400`);checked++;}}
 assert.ok(checked>=121);
});
test('entry to opposite door has three distinct routes, including both outer aisles',()=>{
 const r=findRoutes('entry','exit');assert.equal(r.length,3);assert.equal(r[0].length,56);assert.ok(r.some(p=>p.nodes.some(id=>NODE[id].x<0)));assert.ok(r.some(p=>p.nodes.some(id=>NODE[id].x>0)));
});
test('closing central passage removes it in both directions and recomputes detours',()=>{
 for(const [a,b] of [['entry','exit'],['exit','entry']]){const routes=findRoutes(a,b,[BLOCKED_EDGE]);assert.ok(routes.length>0);assert.ok(routes[0].length>56);for(const r of routes)for(let i=1;i<r.nodes.length;i++)assert.notEqual(edgeKey(r.nodes[i-1],r.nodes[i]),BLOCKED_EDGE);}
});
test('isolated node correctly returns no route',()=>{
 assert.deepEqual(findRoutes('entry','exit',[edgeKey('entry','sc')]),[]);
});
test('the same turn changes when the confirmed heading is reversed',()=>{
 assert.equal(directionText('N','cc','ce'),'向右转');assert.equal(directionText('S','cc','ce'),'向左转');assert.equal(directionText('S','cc','nc'),'转身向后');
});
test('recovery starts at the newly confirmed node, not the old entry',()=>{
 const routes=findRoutes('cw','exit');for(const r of routes){assert.equal(r.nodes[0],'cw');assert.ok(!r.nodes.includes('entry'));assert.equal(r.nodes.at(-1),'exit');}
});
test('preview endpoints are exactly the route endpoints and source nodes are unchanged',()=>{
 const original=JSON.stringify(NODE);const route=findRoutes('entry','ne')[0];assert.deepEqual(pointAt(route.nodes,0),{x:0,z:-28});const end=pointAt(route.nodes,1);assert.equal(end.x,NODE.ne.x);assert.equal(end.z,NODE.ne.z);assert.equal(JSON.stringify(NODE),original);
});
test('same-node destination produces a zero-length arrival route',()=>{
 const r=findRoutes('ce','ce');assert.equal(r.length,1);assert.equal(r[0].length,0);assert.deepEqual(r[0].nodes,['ce']);
});
test('alternative routes are not padded with excessive detours',()=>{
 for(const a of NODES)for(const b of NODES)for(const closed of [[],[BLOCKED_EDGE]]){const r=findRoutes(a.id,b.id,closed);for(const p of r)assert.ok(p.length<=Math.min(r[0].length*1.75,r[0].length+35));}
});
