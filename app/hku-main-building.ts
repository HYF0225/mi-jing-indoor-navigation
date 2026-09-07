import data from './hku-main-building-data.json' with { type: 'json' };
import type { Building } from './buildings.ts';

const point=(p:number[])=>({x:(p[0]-1165)*.064,z:(675-p[1])*.064});
export const HKU_MAIN_BUILDING:Building={
 id:'hku-main-building-1f',name:'香港大学本部大楼',subtitle:'1F · 图纸导航 · 贴图版',version:data.version+'-materials-v4',
 entry:'mb1-entry',destination:'mb1-154',model:'models/hku-main-building-1f-v4.glb',adapter:'standard',visualModel:'models/hku-main-building-campus-v5.glb',
 visualViews:[
  {id:'campus',name:'全楼与校园场景',model:'models/hku-main-building-campus-v5.glb',note:'主楼三层外观与室内研究模型，加入估算地形、道路、周边建筑和树木。周边体量和室内布局不是测绘成果。'},
  {id:'2F',name:'2/F 上层剖切 · 推定',model:'models/hku-main-building-2f-cutaway-v5.glb',note:'2/F 是地面以上第二层（通常称三楼）。新增 24 个示意房间、门洞、走廊及楼梯；S 编号仅用于模型检查，不是真实房号，不能据此导航。'},
  {id:'1F',name:'1/F 图纸导航层',model:'models/hku-main-building-1f-v4.glb',note:'这是独立的官方一楼图纸重建模型，17 个教室门口可在主界面模拟导航。它与全楼估算模型尚未测绘配准。'},
  {id:'GF',name:'G/F 地面层剖切 · 推定',model:'models/hku-main-building-gf-cutaway-v5.glb',note:'G/F 地面层新增 24 个示意房间与走廊。S 编号不是实际房号；门禁、实际用途和房间布局尚待现状图核实。'},
 ],
 floors:[{id:'1F',name:'1F · 已建图公共走廊',y:0}],bounds:{x1:-38,x2:37,z1:-34,z2:34},
 nodes:data.nodes,edges:data.edges as [string,string][],pois:data.pois,connectors:[],partitions:[],
 walls:data.walls.map(w=>{const a=point(w.a),b=point(w.b);return {x1:a.x,z1:a.z,x2:b.x,z2:b.z,floor:'1F'};}),
 closure:{edge:['mb1-entry',data.edges.find(e=>e.includes('mb1-entry'))!.find(id=>id!=='mb1-entry')!].sort().join(':'),name:'主楼梯旁走廊'},
 notice:'图纸研究版，未实走验证。17 个教室门口可模拟导航；起点在 1F 楼梯上方走廊，不含地面入口和跨层导航。办公室名称、门禁与图纸修订日期待核实。',
 searchPlaceholder:'搜索房号，如 MB154、113C…',
 deferred:data.deferred.map(p=>({number:p.room,name:p.room, floor:p.floor,reason:p.reason})),
 source:{name:'依据 HKU 官方一楼疏散图与 ITS 教室目录重建',url:data.source.url,license:'来源与限制',licenseUrl:'models/HKU-MAIN-BUILDING-SOURCE.md',size:'1F 导航模型',
 note:'本模型从官方 PDF 第 11 页追踪墙体和门洞；并非官方数字模型。房号有来源，门位为图纸人工定位；尺度、墙高和材质为示意。v4 仅更换导航模型材质与 UV，几何不变；砖与花岗石贴图为 AI 生成仿真材质，不是现场扫描。全楼外观展示使用独立的估算模型，不接入导航。省略门扇只表达模型开门状态，不代表实际开放。庭院和未核实楼梯区不可穿越。原图与照片不在网站重新分发。'},
};
