import test from 'node:test';
import assert from 'node:assert/strict';
import { NODES, NODE, EDGES, BLOCKED_EDGE, edgeKey, findRoutes, directionText, pointAt, pointIsClear } from '../app/navigation.ts';

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
