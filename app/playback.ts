/** Monotonic preview clock. Pauses preserve elapsed time; reset is explicit. */
export type Playback = { key:string; duration:number; elapsed:number; since:number|null };
export function progressAt(clock:Playback, now:number){
 return Math.min(1,Math.max(0,(clock.elapsed+(clock.since===null?0:Math.max(0,now-clock.since)))/clock.duration));
}
export function playClock(previous:Playback|null,key:string,duration:number,now:number):Playback {
 if(previous?.key===key&&progressAt(previous,now)<1)return {...previous,since:previous.since??now};
 return {key,duration:Math.max(1,duration),elapsed:0,since:now};
}
export function pauseClock(clock:Playback,now:number):Playback {
 return {...clock,elapsed:progressAt(clock,now)*clock.duration,since:null};
}
