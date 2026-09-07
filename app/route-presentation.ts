export type ViewMode='overview'|'inside';
export type GuideStyle='ground'|'woman'|'man';
export type GuideSettings={style:GuideStyle;hair:'long'|'short';outfit:string;skin:string};
export const DEFAULT_GUIDE:GuideSettings={style:'ground',hair:'long',outfit:'#64d9e8',skin:'#d6a17f'};
type Point={x:number;y:number;z:number};
/** All positions are sampled along the polyline, never straight across a corner. */
export function routePresentation(nodes:string[],progress:number,length:number,pointAt:(nodes:string[],progress:number)=>Point){
 const p=Math.max(0,Math.min(1,progress)),unit=1/Math.max(length,.001);
 const point=pointAt(nodes,p),ahead=pointAt(nodes,Math.min(1,p+.6*unit));
 const guideProgress=Math.min(1,p+2*unit),guide=pointAt(nodes,guideProgress);
 const guideBefore=pointAt(nodes,Math.max(0,guideProgress-.12*unit));
 const guideAfter=pointAt(nodes,Math.min(1,guideProgress+.12*unit));
 const before=pointAt(nodes,Math.max(0,p-.12*unit));
 return {point,ahead,guide,guideProgress,heading:Math.atan2(ahead.x-before.x,ahead.z-before.z),guideHeading:Math.atan2(guideAfter.x-guideBefore.x,guideAfter.z-guideBefore.z)};
}
