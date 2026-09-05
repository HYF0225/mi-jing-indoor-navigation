'use client';
import {publicAsset} from './public-asset';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Search, MapPin, Navigation, Play, Square, Download, RotateCcw, ArrowUpRight, Route as RouteIcon, Check, CornerUpRight, Info, Layers, Flag, Camera, CircleCheck, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import GalleryViewer, { type ViewerAPI } from './gallery-viewer';
import { NODES, NODE, POIS, EDGES, PARTITIONS, HEADINGS, MODEL_VERSION, BLOCKED_EDGE, findRoutes, distance, directionText, headingTo, edgeKey, type Heading } from './navigation';
type ConfirmKind='start'|'next'|'recover';
type Log={text:string;time:string};
function MiniMap({path,current,target,blocked,onPick}:{path:string[];current:string|null;target:string;blocked:boolean;onPick:(id:string)=>void}){
 const pos=(id:string)=>({x:180+NODE[id].x*9,y:310-NODE[id].z*9});
 return <svg viewBox="0 0 360 620" className="floor-map" role="img" aria-label="按原模型隔板与通道标注的平面导航图">
  <rect x="42" y="35" width="276" height="550" rx="5" fill="#f9fcfb" stroke="#b2c7c6" strokeWidth="3"/>
  <text x="180" y="22" textAnchor="middle" className="map-north">N · 北侧（模型约定）</text>
  {PARTITIONS.map((p,i)=><rect key={i} x={180+p.x1*9} y={310-p.z2*9} width={(p.x2-p.x1)*9} height={(p.z2-p.z1)*9} fill="#658b86"/>)}
  {EDGES.map(([a,b])=>{const p=pos(a),q=pos(b),closed=blocked&&edgeKey(a,b)===BLOCKED_EDGE;return <line key={a+b} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={closed?'#e49363':'#2a4557'} strokeWidth="3" strokeDasharray={closed?'6 6':'4 5'}/>;})}
  {path.length>1&&<polyline points={path.map(id=>{const p=pos(id);return p.x+','+p.y;}).join(' ')} stroke="#63e2f2" strokeWidth="5" fill="none" strokeLinejoin="round"/>}
  {NODES.map(n=>{const p=pos(n.id);return <g key={n.id} role="button" tabIndex={0} aria-label={'在平面图选择'+n.name} onClick={()=>onPick(n.id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPick(n.id);}}} className="map-node"><circle cx={p.x} cy={p.y} r={n.id===current||n.id===target?8:5} fill={n.id===target?'#ffaa66':n.id===current?'#63dbea':'#102536'} stroke={n.id===target?'#ffaa66':'#589ab5'} strokeWidth="2"/><text x={p.x+(n.x===0?10:0)} y={p.y+(n.x===0?4:-12)} textAnchor={n.x===0?'start':'middle'}>{n.short}</text></g>;})}
 </svg>;
}
export default function Home(){
 const viewer=useRef<ViewerAPI>(null);
 const [loaded,setLoaded]=useState(false),[error,setError]=useState(''),[query,setQuery]=useState(''),[dest,setDest]=useState('exit'),[start,setStart]=useState('entry'),[selected,setSelected]=useState<string|null>(null),[closed,setClosed]=useState(false);
 const [active,setActive]=useState(false),[confirmed,setConfirmed]=useState<string|null>(null),[facing,setFacing]=useState<Heading>('N'),[step,setStep]=useState(0),[arrived,setArrived]=useState(false);
 const [mode,setMode]=useState('overview'),[playing,setPlaying]=useState(false),[progress,setProgress]=useState(0),[recording,setRecording]=useState(false),[message,setMessage]=useState(''),[about,setAbout]=useState(false),[logs,setLogs]=useState<Log[]>([]);
 const [exportedVideo,setExportedVideo]=useState<{url:string;name:string}|null>(null);
 useEffect(()=>()=>{if(exportedVideo)URL.revokeObjectURL(exportedVideo.url);},[exportedVideo]);
 const [dialog,setDialog]=useState<ConfirmKind|null>(null),[draftNode,setDraftNode]=useState('entry'),[draftHeading,setDraftHeading]=useState<Heading|null>(null),[shots,setShots]=useState<Record<string,string>>({});
 const routes=useMemo(()=>findRoutes(start,dest,closed?[BLOCKED_EDGE]:[]),[start,dest,closed]);
 const route=routes.find(r=>r.id===selected)??routes[0],ids=route?.nodes??[],next=active?ids[step+1]:null;
 const destination=POIS.find(p=>p.id===dest)!;
 const results=POIS.filter(p=>(p.name+p.words+p.category).toLowerCase().includes(query.toLowerCase().trim()));
 function log(text:string){setLogs(l=>[...l,{text,time:new Date().toLocaleTimeString('zh-CN',{hour12:false})}].slice(-20));}
 function stop(){viewer.current?.stop();setPlaying(false);}
 function overview(){stop();setMode('overview');viewer.current?.overview();}
 function changeDestination(id:string){if(id===dest)return;stop();setDest(id);setStart(confirmed??start);setSelected(null);setActive(false);setArrived(false);setStep(0);setMessage('目的地已更新；从最后确认的位置规划，开始前请核对位置与朝向。');}
 function openConfirm(kind:ConfirmKind,id?:string){if(recording)return;stop();setDraftNode(id??(kind==='next'?next:start)??start);setDraftHeading(null);setDialog(kind);}
 useEffect(()=>{if(!dialog||!loaded)return;const images:Record<string,string>={};HEADINGS.forEach(h=>{images[h.id]=viewer.current?.snapshot(draftNode,h.id)??'';});setShots(images);},[dialog,draftNode,loaded]);
 function confirmPosition(){
  if(!draftHeading)return;
  const kind=dialog;
  if(kind==='next'){setStep(v=>v+1);}else {if(draftNode!==start)setSelected(null);setStart(draftNode);setStep(0);}
  setConfirmed(draftNode);setFacing(draftHeading);setActive(true);setArrived(draftNode===dest);setDialog(null);setMode('inside');viewer.current?.focus(draftNode,draftHeading);
  setMessage(kind==='recover'?'已根据重新确认的位置规划路线。':'位置与朝向已确认。');
  log((kind==='recover'?'重新确认':'确认位置')+'：'+NODE[draftNode].name+' · '+HEADINGS.find(h=>h.id===draftHeading)!.name);
 }
 function preview(){setMode('inside');setMessage('正在预览路线；上次确认位置不会随视频移动。');viewer.current?.play(ids);log('播放路线预览（不更新位置）');}
 async function exportVideo(){if(!route)return;setRecording(true);setMode('inside');setMessage('正在渲染约 18 秒的路线视频，请保持页面打开。');try{const result=await viewer.current!.record(ids);if(result.blob.size<1000)throw new Error('视频数据为空，请重试。');const url=URL.createObjectURL(result.blob),name='觅径-'+destination.name+'-'+MODEL_VERSION.replaceAll('/','-')+'.'+result.extension;setExportedVideo({url,name});const link=document.createElement('a');link.href=url;link.download=name;link.click();setMessage('路线视频已生成，可在下方播放或再次下载。画面来自此展厅模型的渲染。');log('生成路线视频：'+destination.name);}catch(e){setMessage(e instanceof Error?e.message:'视频导出失败，请重试。');}finally{setRecording(false);}}
 function toggleClosure(value:boolean){stop();setClosed(value);setSelected(null);if(confirmed&&active){setStart(confirmed);setStep(0);}setMessage(value?'已模拟关闭南侧中央通道，路线已重新计算。':'中央通道已恢复。');log(value?'模拟封路：南侧分流口 → 中央十字口':'解除模拟封路');}
 const current=confirmed?NODE[confirmed]:null;
 return <main className="nav-app">
  <header className="app-header"><div className="brand-mark"><Compass size={25}/></div><div><h1>觅径 <span>室内导航实验室</span></h1><p>在关键路口，确认下一步。</p></div><span className="demo-badge">开源展厅 · 交互演示</span><Button variant="ghost" size="icon" aria-label="查看模型来源与测试范围" onClick={()=>setAbout(true)}><Info size={20}/></Button></header>
  <div className="workspace">
   <aside className="side-panel">
    <div className="place-heading"><div><p className="eyebrow">OPENVGAL / SINGLE FLOOR</p><h2>下一站，去哪里？</h2></div><span className="floor-pill">1F</span></div>
    <div className="search-field"><Search size={18}/><Input aria-label="搜索目的地" placeholder="搜索展区、阅读角…" value={query} onChange={e=>setQuery(e.target.value)} disabled={recording}/></div>
    <div className="destination-list" aria-label="目的地列表">{results.length?results.map(p=><button key={p.id} className={'destination-item '+(p.id===dest?'selected':'')} onClick={()=>changeDestination(p.id)} disabled={recording}><span className="poi-number">{p.number}</span><span><strong>{p.name}</strong><small>{p.category}</small></span>{p.id===dest?<CircleCheck size={18}/>:<ArrowUpRight size={17}/>}</button>):<p className="empty-search">没有匹配的目的地。试试“阅读”或“展区”。</p>}</div>
    <div className="start-field"><label htmlFor="start-select">规划起点</label><Select value={start} onValueChange={v=>{if(v){stop();setStart(v);setSelected(null);setActive(false);setArrived(false);setConfirmed(null);setStep(0);}}} disabled={active||recording}><SelectTrigger id="start-select" className="w-full h-10"><SelectValue>{NODE[start].name}</SelectValue></SelectTrigger><SelectContent>{NODES.map(n=><SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}</SelectContent></Select></div>
    <div className="route-section"><div className="section-label"><span>可用路线</span><span>{routes.length} 条</span></div><div className="route-options">{routes.map((r,i)=><button key={r.id} disabled={active||recording} onClick={()=>{stop();setSelected(r.id);overview();}} className={'route-option '+(r.id===route?.id?'chosen':'')}><span className={'route-dot dot-'+i}/><span><strong>{r.label}</strong><small>{r.turns} 次转弯 · {Math.max(0,r.nodes.length-2)} 个途中节点</small></span><b>{Math.round(r.length)}<small> 米*</small></b></button>)}</div><p className="scale-note">* 按模型尺度估算，非现场测量。</p></div>
    <div className="closure-row"><div><span>模拟中央通道封闭</span><small>测试绕行与路线更新</small></div><Switch aria-label="模拟中央通道封闭" checked={closed} onCheckedChange={toggleClosure} disabled={recording}/></div>
    {!active?<Button className="primary-action" disabled={!loaded||!route||recording} onClick={()=>openConfirm('start')}><Navigation size={18}/>确认起点并开始</Button>:<Button variant="outline" className="primary-action" disabled={recording} onClick={()=>{stop();setStart(confirmed??start);setSelected(null);setActive(false);setArrived(false);setStep(0);setMessage('可以重新选择起点、目的地和路线。');overview();}}><RotateCcw size={17}/>重新选择路线</Button>}
    <p className="source-note">内部模型已下载 · 1.62 MiB<br/>展区名称与导航节点为测试标注。</p>
   </aside>
   <div className="main-column">
    <section className="viewer-panel">
     <div className="viewer-top"><div><p className="eyebrow">{mode==='overview'?'空间总览':'第一人称预览'}</p><h2>{destination.name}</h2></div><Tabs value={mode} onValueChange={v=>{if(v==='overview')overview();else{stop();setMode('inside');viewer.current?.focus(confirmed??start,facing);}}}><TabsList><TabsTrigger value="overview" disabled={recording}><Layers size={15}/>俯视</TabsTrigger><TabsTrigger value="inside" disabled={!loaded||recording}><Camera size={15}/>人视</TabsTrigger></TabsList></Tabs></div>
     <GalleryViewer ref={viewer} path={ids} confirmed={confirmed} destination={dest} onReady={()=>setLoaded(true)} onError={setError} onProgress={(p,running)=>{setProgress(p);setPlaying(running);}} onPick={id=>openConfirm('recover',id)}/>
     {!loaded&&!error&&<div className="model-message">正在载入展厅模型…</div>}{error&&<div className="model-message error">{error}</div>}
     <div className="map-inset"><div className="map-title"><MapPin size={13}/>路线图 <span>点击节点可重定位</span></div><MiniMap path={ids} current={confirmed} target={dest} blocked={closed} onPick={id=>openConfirm('recover',id)}/></div>
     <div className="map-legend"><span><i className="green-line"/>计划路线</span><span><i className="green-ring"/>已确认位置</span><span><i className="orange-dot"/>目的地</span></div>
     <div className="preview-toolbar"><Button variant="outline" disabled={!loaded||ids.length<2||recording} onClick={playing?stop:preview}>{playing?<Square size={16}/>:<Play size={16}/>} {playing?'停止预览':'播放路线'}</Button><div className="preview-progress"><Progress value={progress*100}/><small>{recording?'视频渲染中':playing?'路线预览中':'预览不更新位置'}</small></div><Button variant="outline" disabled={!loaded||ids.length<2||recording} onClick={exportVideo}><Download size={16}/>{recording?'正在导出…':'导出视频'}</Button></div>
    </section>
    <section className={'guidance-card '+(arrived?'arrival':'')} aria-live="polite">
     <div className="guidance-icon">{arrived?<Flag size={26}/>:active?<CornerUpRight size={26}/>:<LocateFixed size={26}/>}</div>
     <div className="guidance-text"><p className="eyebrow">{arrived?'已确认到达':active?'下一段指引':'先确认，再出发'}</p><h3>{arrived?'已到达 '+destination.name:active&&current&&next?directionText(facing,current.id,next)+'，前往'+NODE[next].name:'在南侧门厅或你选择的起点确认位置'}</h3><p>{active&&current&&next?'约 '+Math.round(distance(current,NODE[next]))+' 米（模型估算），到达后再次确认。':arrived?'本次模拟导航完成。可以换个目的地，或测试另一条路线。':'对照不同朝向的模型画面，模拟现场路口确认。'}</p></div>
     {active&&!arrived&&next?<Button className="confirm-next" onClick={()=>openConfirm('next')} disabled={recording}>我已到达下一节点<Check size={17}/></Button>:!active?<Button className="confirm-next" onClick={()=>openConfirm('start')} disabled={!loaded||recording}>确认位置<ArrowUpRight size={17}/></Button>:null}
    </section>
    <div className="status-row"><p><span className="status-light"/>{current?'上次确认：'+current.name+' · '+HEADINGS.find(h=>h.id===facing)!.name:'尚未确认当前位置'}<span className="status-separator">/</span>不使用连续定位</p><Button variant="ghost" disabled={!loaded||recording} onClick={()=>openConfirm('recover',confirmed??start)}>与现场不符 / 重新确认</Button></div>
    {message&&<p className="notice" role="status">{message}</p>}
    {exportedVideo&&<section className="video-result"><div><strong>刚生成的路线视频</strong><a href={exportedVideo.url} download={exportedVideo.name}>下载视频 ↓</a></div><video aria-label="已生成的路线视频" src={exportedVideo.url} controls playsInline preload="metadata"/><p>{exportedVideo.name} · 这是生成时的路线快照，后续改选路线不会修改这段视频。</p></section>}
    <div className="bottom-guide"><p><b>体验顺序</b><span>01 选目的地</span><span>02 看路线预览</span><span>03 逐个路口确认</span></p><button onClick={()=>setAbout(true)}>模型与测试说明 <ArrowUpRight size={14}/></button></div>
    <details className="event-log"><summary>本次测试记录{logs.length?' · '+logs.length+' 条':''}</summary>{logs.length?<ol>{logs.map((l,i)=><li key={i}><time>{l.time}</time>{l.text}</li>)}</ol>:<p>确认位置、播放预览和模拟封路后，这里会记录操作。刷新页面会清空。</p>}</details>
   </div>
  </div>
  <Dialog open={!!dialog} onOpenChange={open=>{if(!open)setDialog(null);}}><DialogContent className="confirmation-dialog"><DialogHeader><DialogTitle>{dialog==='recover'?'重新确认位置与朝向':dialog==='next'?'到达路口了吗？':'确认你的起点'}</DialogTitle><DialogDescription>这次用模型画面模拟现场对照。选择与你当前面向一致的画面；选择后才更新位置。</DialogDescription></DialogHeader><div className="confirm-location"><MapPin size={19}/>{dialog==='recover'?<Select value={draftNode} onValueChange={v=>{if(v){setDraftNode(v);setDraftHeading(null);}}}><SelectTrigger aria-label="重新选择所在位置" className="w-full h-10"><SelectValue>{NODE[draftNode].name}</SelectValue></SelectTrigger><SelectContent>{NODES.map(n=><SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}</SelectContent></Select>:<strong>{NODE[draftNode].name}</strong>}<span>1F</span></div><RadioGroup className="direction-grid" aria-label="选择当前朝向" value={draftHeading??''} onValueChange={v=>setDraftHeading(v as Heading)}>{HEADINGS.map(h=><div key={h.id} className={'direction-card '+(draftHeading===h.id?'chosen':'')}><RadioGroupItem id={'heading-'+h.id} value={h.id} aria-label={h.name} className="direction-radio"/><label htmlFor={'heading-'+h.id}>{shots[h.id]?<img src={shots[h.id]} alt={NODE[draftNode].name+'，'+h.name+'的模型渲染画面'}/>:<span className="shot-loading">准备画面</span>}<span><Compass size={15}/>{h.name}<small>{h.id}</small></span></label></div>)}</RadioGroup><p className="dialog-note">方位以模型为准；这些是模型截图，不是现场照片。</p><div className="confirm-actions"><Button variant="outline" onClick={()=>{setDialog('recover');setDraftHeading(null);}}>都不像，重新选位置</Button><Button onClick={confirmPosition} disabled={!draftHeading}>确认位置与朝向<Check size={16}/></Button></div></DialogContent></Dialog>
  <Dialog open={about} onOpenChange={setAbout}><DialogContent className="about-dialog"><DialogHeader><DialogTitle>这次演示，验证什么？</DialogTitle><DialogDescription>使用现成的小型展厅，把节点式导航流程跑通。</DialogDescription></DialogHeader><div className="about-body"><p><strong>模型来自 OpenVGAL / lbartworks</strong><br/>原始 GLB 约 1.70 MB，MIT 许可。它是作者制作的虚拟展厅，保留了原有内部几何；展区名、路线、方位与标识由本演示添加。</p><p><strong>可以体验</strong><br/>目的地搜索、多路线计算、模型内第一人称预览、视频导出、位置与朝向确认、走错后的重新规划，以及模拟封路。</p><p><strong>尚未验证</strong><br/>真实照片重建、自动拍照定位、真实建筑精度与陌生用户实走效果。本演示没有调用 Atlas；画面与视频由现成模型渲染。</p><p><strong>模型适配</strong><br/>俯视时隐藏屋顶，内部视角恢复屋顶；隐藏作者辅助平面并调整材质。路线绕开四片原始隔板，停在室内门前，不穿越墙体。</p><div className="source-links"><a href="https://github.com/lbartworks/openvgal" target="_blank" rel="noreferrer">查看模型来源 ↗</a><a href={publicAsset("models/OPENVGAL-LICENSE.txt")} target="_blank">MIT 许可 ↗</a><a href={publicAsset("models/gallery.glb")} download>下载原始模型 ↓</a></div></div></DialogContent></Dialog>
 </main>;
}
