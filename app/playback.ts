/** Monotonic preview clock. Pauses preserve elapsed time; reset is explicit. */
export const PLAYBACK_RATES=[.5,1,1.5,2,4] as const;
export type Playback = { key:string; duration:number; elapsed:number; since:number|null; rate:number };
const validRate=(rate:number)=>Number.isFinite(rate)&&rate>=.5&&rate<=4?rate:1;
export function progressAt(clock:Playback, now:number){
 return Math.min(1,Math.max(0,(clock.elapsed+(clock.since===null?0:Math.max(0,now-clock.since)*clock.rate))/clock.duration));
}
export function playClock(previous:Playback|null,key:string,duration:number,now:number,rate=1):Playback {
 if(previous?.key===key&&progressAt(previous,now)<1)return {...previous,since:previous.since??now};
 return {key,duration:Math.max(1,duration),elapsed:0,since:now,rate:validRate(rate)};
}
/** Rebase before changing speed, so playback never jumps or resumes a pause. */
export function rateClock(clock:Playback,rate:number,now:number):Playback {
 return {...clock,elapsed:progressAt(clock,now)*clock.duration,since:clock.since===null?null:now,rate:validRate(rate)};
}
export function pauseClock(clock:Playback,now:number):Playback {
 return {...clock,elapsed:progressAt(clock,now)*clock.duration,since:null};
}
