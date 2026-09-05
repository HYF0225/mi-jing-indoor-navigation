export type Point = { x:number; z:number };
export type NavNode = Point & { id:string; name:string; short:string };
export type Route = { id:string; nodes:string[]; length:number; turns:number; label:string; detail:string };
export type Heading = 'N'|'E'|'S'|'W';
export const HEADINGS: {id:Heading;name:string;angle:number}[]=[{id:'N',name:'面向北侧',angle:0},{id:'E',name:'面向东侧',angle:90},{id:'S',name:'面向南侧',angle:180},{id:'W',name:'面向西侧',angle:270}];
export const NODES:NavNode[]=[
 {id:'entry',name:'南侧门厅',short:'入口',x:0,z:-28},
 {id:'sc',name:'南侧分流口',short:'南口',x:0,z:-26},
 {id:'sw',name:'西南转角',short:'西南',x:-10.5,z:-26},
 {id:'se',name:'东南转角',short:'东南',x:10.5,z:-26},
 {id:'cw',name:'西侧交叉口',short:'西口',x:-10.5,z:0},
 {id:'cc',name:'中央十字口',short:'中央',x:0,z:0},
 {id:'ce',name:'东侧交叉口',short:'东口',x:10.5,z:0},
 {id:'nw',name:'西北展区',short:'西北',x:-10.5,z:26},
 {id:'nc',name:'北侧分流口',short:'北口',x:0,z:26},
 {id:'ne',name:'东北展区',short:'东北',x:10.5,z:26},
 {id:'exit',name:'北侧门前',short:'终点',x:0,z:28},
];
export const NODE = Object.fromEntries(NODES.map(n=>[n.id,n])) as Record<string,NavNode>;
export const EDGES: [string,string][]=[['entry','sc'],['sc','cc'],['cc','nc'],['nc','exit'],['sw','sc'],['sc','se'],['cw','cc'],['cc','ce'],['nw','nc'],['nc','ne'],['sw','cw'],['cw','nw'],['se','ce'],['ce','ne']];
export const PARTITIONS=[{x1:-6.25,x2:-5.75,z1:-22.5,z2:-7.5},{x1:5.75,x2:6.25,z1:-22.5,z2:-7.5},{x1:-6.25,x2:-5.75,z1:7.5,z2:22.5},{x1:5.75,x2:6.25,z1:7.5,z2:22.5}];
export const POIS=[
 {id:'exit',name:'北侧展厅终点',category:'门前到达',number:'01',words:'出口 north exit 北侧展厅终点'},
 {id:'nw',name:'古典展区',category:'西北区域',number:'02',words:'古典 艺术 西北 classic'},
 {id:'ne',name:'当代展区',category:'东北区域',number:'03',words:'当代 艺术 东北 contemporary'},
 {id:'cw',name:'阅读角',category:'西侧交叉口',number:'04',words:'阅读 图书 library'},
 {id:'ce',name:'互动展区',category:'东侧交叉口',number:'05',words:'互动 科学 东侧 interactive'},
];
export const MODEL_VERSION='openvgal-a0855e1/nav-v1';
export const edgeKey=(a:string,b:string)=>[a,b].sort().join(':');
export const BLOCKED_EDGE=edgeKey('sc','cc');
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export function headingTo(a:Point,b:Point):Heading{return Math.abs(b.x-a.x)>Math.abs(b.z-a.z)?(b.x>a.x?'E':'W'):(b.z>a.z?'N':'S');}
export function directionText(facing:Heading,from:string,to:string){const dirs:Heading[]=['N','E','S','W'];const d=(dirs.indexOf(headingTo(NODE[from],NODE[to]))-dirs.indexOf(facing)+4)%4;return ['向前直行','向右转','转身向后','向左转'][d];}
export function routeLength(ids:string[]){return ids.slice(1).reduce((sum,id,i)=>sum+distance(NODE[ids[i]],NODE[id]),0);}
export function routeTurns(ids:string[]){let turns=0;for(let i=1;i<ids.length-1;i++)if(headingTo(NODE[ids[i-1]],NODE[ids[i]])!==headingTo(NODE[ids[i]],NODE[ids[i+1]]))turns++;return turns;}
export function findRoutes(start:string,end:string,blocked:string[]=[]):Route[]{
 if(!NODE[start]||!NODE[end])return [];
 if(start===end)return [{id:start,nodes:[start],length:0,turns:0,label:'已经在目的地',detail:'请核对终点标注'}];
 const adj:Record<string,string[]>=Object.fromEntries(NODES.map(n=>[n.id,[]]));
 EDGES.forEach(([a,b])=>{if(!blocked.includes(edgeKey(a,b))){adj[a].push(b);adj[b].push(a);}});
 const all:string[][]=[];
 function visit(path:string[]){const last=path[path.length-1];if(last===end){all.push(path);return;}for(const n of adj[last])if(!path.includes(n))visit([...path,n]);}
 visit([start]);all.sort((a,b)=>routeLength(a)-routeLength(b)||routeTurns(a)-routeTurns(b));if(!all.length)return [];
 const shortest=routeLength(all[0]);
 const reasonable=all.filter(p=>routeLength(p)<=Math.min(shortest*1.75,shortest+35));
 const selected=[all[0]],used=new Set([all[0].join('-')]);
 // Prefer visibly distinct routes through each outer aisle instead of three near-duplicates.
 for(const side of [-1,1]){const candidate=reasonable.find(p=>!used.has(p.join('-'))&&p.some(id=>Math.sign(NODE[id].x)===side)&&p.filter(id=>!selected[0].includes(id)).length>=2);if(candidate){selected.push(candidate);used.add(candidate.join('-'));}}
 for(const p of reasonable){if(selected.length>=3)break;if(!used.has(p.join('-'))&&p.filter(id=>!selected[0].includes(id)).length>=2){selected.push(p);used.add(p.join('-'));}}
 return selected.slice(0,3).map((nodes,i)=>{const sx=nodes.reduce((v,id)=>v+NODE[id].x,0);return {id:nodes.join('-'),nodes,length:routeLength(nodes),turns:routeTurns(nodes),label:i===0?'推荐路线':sx<0?'西侧绕行':sx>0?'东侧绕行':'另一条路线',detail:i===0?'当前可用的较短路线':'通过另一侧通道抵达'};});
}
export function pointAt(ids:string[],progress:number):Point {
 if(!ids.length)return {x:0,z:0};if(ids.length===1)return NODE[ids[0]];let remaining=routeLength(ids)*Math.max(0,Math.min(1,progress));
 for(let i=1;i<ids.length;i++){const a=NODE[ids[i-1]],b=NODE[ids[i]],d=distance(a,b);if(remaining<=d)return {x:a.x+(b.x-a.x)*remaining/d,z:a.z+(b.z-a.z)*remaining/d};remaining-=d;}return NODE[ids[ids.length-1]];
}
export function pointIsClear(p:Point,radius=.5){return Math.abs(p.x)<15.035-radius&&Math.abs(p.z)<30.029-radius&&!PARTITIONS.some(b=>p.x>b.x1-radius&&p.x<b.x2+radius&&p.z>b.z1-radius&&p.z<b.z2+radius);}
