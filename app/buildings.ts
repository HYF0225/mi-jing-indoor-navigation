import { NODES, EDGES, POIS, PARTITIONS, BLOCKED_EDGE, MODEL_VERSION } from './navigation.ts';
import { EMPTY_MALL } from './empty-mall.ts';
import { HKU_MAIN_BUILDING } from './hku-main-building.ts';

export type Position = {x:number;y:number;z:number};
export type BuildingNode = Position & {id:string;name:string;short:string;floor:string;checkpoint?:boolean};
export type BuildingPOI = {id:string;name:string;category:string;number:string;words:string};
export type Connector = {a:string;b:string;kind:'elevator'|'stairs'|'escalator';oneWay?:boolean};
export type Building = {
 id:string;name:string;subtitle:string;version:string;entry:string;destination:string;
 model:string;adapter:'openvgal'|'standard';
 visualModel?:string;
 visualViews?:{id:string;name:string;model:string;note:string}[];
 floors:{id:string;name:string;y:number}[];
 bounds:{x1:number;x2:number;z1:number;z2:number};
 nodes:BuildingNode[];edges:[string,string][];pois:BuildingPOI[];connectors:Connector[];
 partitions:{x1:number;x2:number;z1:number;z2:number;floor:string}[];
 walls?:{x1:number;x2:number;z1:number;z2:number;floor:string}[];
 surfaces?:{floor:string;triangles:number[][][]}[];
 closure:{edge:string;name:string};
 source:{name:string;url:string;license:string;licenseUrl:string;note:string;size:string};
 notice?:string;searchPlaceholder?:string;
 deferred?:{number:string;name:string;floor:string;reason:string}[];
};
export const GALLERY:Building={
 id:'openvgal-gallery',name:'OpenVGAL 艺术展厅',subtitle:'单层展厅',version:MODEL_VERSION,
 entry:'entry',destination:'exit',model:'models/gallery.glb',adapter:'openvgal',
 floors:[{id:'1F',name:'1F · 展厅',y:0}],bounds:{x1:-15.035,x2:15.035,z1:-30.029,z2:30.029},
 nodes:NODES.map(n=>({...n,y:0,floor:'1F'})),edges:EDGES,pois:POIS,connectors:[],
 partitions:PARTITIONS.map(p=>({...p,floor:'1F'})),closure:{edge:BLOCKED_EDGE,name:'南侧中央通道'},
 source:{name:'OpenVGAL / lbartworks',url:'https://github.com/lbartworks/openvgal',license:'MIT',licenseUrl:'models/OPENVGAL-LICENSE.txt',size:'1.62 MiB',note:'作者制作的虚拟展厅，保留原有内部几何。展区名、路线、方位与标识为测试标注；不是现场扫描。'},
};
/** Add a validated building package here; routing and UI do not depend on its ID. */
export const BUILDINGS:Building[]=[GALLERY,EMPTY_MALL,HKU_MAIN_BUILDING];
