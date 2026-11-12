const clamp=t=>Math.max(0,Math.min(1,t));
export function reducedFlash(t,kind){t=clamp(t);return {envelope:16*t*t*(1-t)*(1-t),cap:kind==='explosion'?.34:kind==='glow'?.42:kind==='beam'?.55:.60};}
