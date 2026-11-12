export function environmentalTime(clock,time,reduced){
 const now=Number.isFinite(time)?time:clock.last;
 if(!reduced&&!clock.reduced)clock.value+=Math.max(0,now-clock.last);
 clock.last=now;clock.reduced=!!reduced;return clock.value;
}
export function fireDistanceFade(distanceSquared){const t=Math.max(0,Math.min(1,(Math.sqrt(Math.max(0,distanceSquared))-64)/16));return 1-t*t*(3-2*t);}
const NORMAL_WATER=Object.freeze({glint:.78,foam:.62}),CALM_WATER=Object.freeze({glint:.18,foam:.24});
export const waterReadability=reduced=>reduced?CALM_WATER:NORMAL_WATER;
