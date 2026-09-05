import type { Building, BuildingNode, Position } from './buildings.ts';
import { edgeKey, headingTo, type Heading, type Route } from './navigation.ts';

export const nodeIndex=(building:Building)=>Object.fromEntries(building.nodes.map(n=>[n.id,n])) as Record<string,BuildingNode>;
export const distance3=(a:Position,b:Position)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function buildingNavigation(building:Building){
 const NODE=nodeIndex(building);
 const connector=(a:string,b:string)=>building.connectors.find(c=>edgeKey(c.a,c.b)===edgeKey(a,b));
 const length=(ids:string[])=>ids.slice(1).reduce((s,id,i)=>s+distance3(NODE[ids[i]],NODE[id]),0);
 const turns=(ids:string[])=>ids.slice(1,-1).reduce((sum,id,i)=>sum+(NODE[ids[i]].floor===NODE[id].floor&&NODE[id].floor===NODE[ids[i+2]].floor&&headingTo(NODE[ids[i]],NODE[id])!==headingTo(NODE[id],NODE[ids[i+2]])?1:0),0);
 function findRoutes(start:string,end:string,blocked:string[]=[],stepFree=false):Route[]{
  if(!NODE[start]||!NODE[end])return [];
  const adj:Record<string,string[]>=Object.fromEntries(building.nodes.map(n=>[n.id,[]]));
  building.edges.forEach(([a,b])=>{const c=connector(a,b);if(blocked.includes(edgeKey(a,b))||(stepFree&&c&&c.kind!=='elevator'))return;adj[a].push(b);if(!c?.oneWay)adj[b].push(a);});
  // Dijkstra + bounded Yen alternatives: no exponential all-simple-path enumeration.
  function shortest(from:string,excludedEdges:Set<string>,excludedNodes:Set<string>):string[]|null {
   const cost:Record<string,number>={[from]:0},prev:Record<string,string>={},unvisited=new Set(Object.keys(NODE).filter(id=>!excludedNodes.has(id)));
   while(unvisited.size){let current:string|undefined;let best=Infinity;for(const id of unvisited)if((cost[id]??Infinity)<best){current=id;best=cost[id];}if(!current)return null;
    if(current===end){const result=[end];while(result[0]!==from)result.unshift(prev[result[0]]);return result;}
    unvisited.delete(current);
    for(const n of adj[current])if(unvisited.has(n)&&!excludedEdges.has(current+'>'+n)){const next=best+distance3(NODE[current],NODE[n]);if(next<(cost[n]??Infinity)){cost[n]=next;prev[n]=current;}}
   }return null;
  }
  const first=shortest(start,new Set(),new Set());if(!first)return [];
  const accepted=[first],candidates=new Map<string,string[]>(),seen=new Set([first.join('|')]);
  for(let k=1;k<12;k++){
   const previous=accepted[k-1];
   for(let i=0;i<previous.length-1;i++){
    const root=previous.slice(0,i+1),excluded=new Set<string>();
    for(const p of accepted)if(root.every((id,j)=>p[j]===id))excluded.add(p[i]+'>'+p[i+1]);
    const spur=shortest(root[i],excluded,new Set(root.slice(0,-1)));
    if(spur){const candidate=[...root.slice(0,-1),...spur],key=candidate.join('|');if(!seen.has(key))candidates.set(key,candidate);}
   }
   const next=[...candidates.values()].sort((a,b)=>length(a)-length(b)||turns(a)-turns(b))[0];if(!next)break;
   const key=next.join('|');candidates.delete(key);seen.add(key);accepted.push(next);
  }
  const max=Math.min(length(first)*1.75,length(first)+35),reasonable=accepted.filter(p=>length(p)<=max);
  const selected=[first];
  for(const side of [-1,1]){const p=reasonable.find(p=>p!==first&&p.some(id=>Math.sign(NODE[id].x)===side)&&p.filter(id=>!first.includes(id)).length>=2&&!selected.includes(p));if(p)selected.push(p);}
  for(const p of reasonable.slice(1)){if(selected.length>=3)break;if(!selected.includes(p)&&p.filter(id=>!first.includes(id)).length>=2)selected.push(p);}
  return selected.slice(0,3).map((nodes,i)=>{const cs=nodes.slice(1).map((n,j)=>connector(nodes[j],n)).filter(Boolean),kinds=[...new Set(cs.map(c=>c!.kind))];const transport=kinds.map(k=>({elevator:'电梯',stairs:'楼梯',escalator:'扶梯'}[k])).join(' + ');const sx=(cs.length?cs.map(c=>NODE[c!.a].x):nodes.map(n=>NODE[n].x)).reduce((a,b)=>a+b,0);return {id:nodes.join('|'),nodes,length:length(nodes),turns:turns(nodes),label:nodes.length===1?'已经在目的地':i===0?'推荐路线':sx<0?'西侧绕行':sx>0?'东侧绕行':`备选路线 ${i}`,detail:transport?`经${sx<0?'西侧':sx>0?'东侧':''}${transport}跨层`:'同层通道'};});
 }
 function pointAt(ids:string[],progress:number):Position {
  if(!ids.length)return {x:0,y:0,z:0};let remaining=length(ids)*Math.max(0,Math.min(1,progress));
  for(let i=1;i<ids.length;i++){const a=NODE[ids[i-1]],b=NODE[ids[i]],d=distance3(a,b);if(remaining<=d&&d>0){const t=remaining/d;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};}remaining-=d;}
  const n=NODE[ids[ids.length-1]];return {x:n.x,y:n.y,z:n.z};
 }
 function directionText(facing:Heading,from:string,to:string){const a=NODE[from],b=NODE[to],c=connector(from,to);if(a.floor!==b.floor&&c)return `乘${c.kind==='elevator'?'电梯':c.kind==='escalator'?'扶梯':'楼梯'}前往 ${b.floor}`;const dirs:Heading[]=['N','E','S','W'];return ['向前直行','向右转','转身向后','向左转'][(dirs.indexOf(headingTo(a,b))-dirs.indexOf(facing)+4)%4];}
 return {NODE,findRoutes,pointAt,routeLength:length,directionText,connector};
}
export function validateBuilding(building:Building){
 const errors:string[]=[],nodes=nodeIndex(building),floors=new Map(building.floors.map(f=>[f.id,f.y])),keys=new Set<string>();
 if(new Set(building.nodes.map(n=>n.id)).size!==building.nodes.length)errors.push('duplicate node');
 for(const n of building.nodes)if(!floors.has(n.floor)||![n.x,n.y,n.z].every(Number.isFinite))errors.push('invalid node '+n.id);
 for(const [a,b] of building.edges){if(!nodes[a]||!nodes[b]){errors.push('missing edge endpoint');continue;}const key=edgeKey(a,b);if(keys.has(key))errors.push('duplicate edge');keys.add(key);if(distance3(nodes[a],nodes[b])===0)errors.push('zero-length edge');if(nodes[a].floor!==nodes[b].floor&&!building.connectors.some(c=>edgeKey(c.a,c.b)===key))errors.push('undeclared cross-floor edge');}
 for(const c of building.connectors)if(!keys.has(edgeKey(c.a,c.b)))errors.push('missing connector edge');
 for(const p of building.pois)if(!nodes[p.id])errors.push('missing POI node');
 if(!nodes[building.entry]||!nodes[building.destination])errors.push('missing default endpoints');
 if(!keys.has(building.closure.edge))errors.push('missing closure edge');
 return errors;
}
