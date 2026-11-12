/** Explicit invalidation keeps unchanged battle formations free of layout reads. */
export class BattleLayoutCache {
  constructor(){this.key=null;this.value=null;}
  invalidate(){this.key=null;}
  read(key,measure){if(key!==this.key){this.value=measure();this.key=key;}return this.value;}
}

// Presentation only: keep the combat centre in the area left open by HUD panels.
export function combatViewportOffset(width,height,vertical,insets={}){
  if(!(width>0&&height>0&&vertical>0))return {x:0,y:0};
  const clamp=(v,max)=>Math.max(0,Math.min(Number(v)||0,max));
  const right=clamp(insets.right,width*(width<700?.72:.48));
  const top=clamp(insets.top,height*.35),bottom=clamp(insets.bottom,height*.4);
  return {x:vertical*(width/height)*right/width,y:vertical*(top-bottom)/height};
}
