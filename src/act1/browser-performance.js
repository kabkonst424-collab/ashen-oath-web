import * as T from '../../assets/vendor/three.module.js';

/** Preserve saved quality; only new mobile profiles default to low. */
export function resolveInitialQuality(settings,navigator={}){
  if(settings?.quality==='high'||settings?.quality==='low')return settings.quality;
  return navigator?.userAgentData?.mobile===true||/Android|iPhone|iPad|iPod/i.test(navigator?.userAgent||'')?'low':'high';
}

const LIMITS=Object.freeze({
  low:{density:1,pixels:1280*800,minScale:.72},
  medium:{density:1.25,pixels:1920*1080,minScale:.72},
  high:{density:1.5,pixels:2560*1440,minScale:.72},
});
const now=()=>globalThis.performance?.now?.()??Date.now();

/** Presentation scheduling only. It never changes campaign state or saves. */
export class BrowserPerformance {
  constructor(world){
    this.world=world;this.scale=1;this.quality=world.qualityLevel||'high';this.ema=16.67;this.lastFrame=0;this.slow=0;this.fast=0;this.cooldown=0;
    this.actorClocks=new WeakMap();this.projected=new T.Vector3();this.width=0;this.height=0;this.hidden=!!globalThis.document?.hidden;
    this.visibility=()=>{this.hidden=!!globalThis.document?.hidden;this.resetTiming();this.ema=16.67;this.cooldown=0;};
    globalThis.document?.addEventListener('visibilitychange',this.visibility);
    this.pixelRatio=globalThis.devicePixelRatio||1;
    if(globalThis.ResizeObserver){this.sizeObserver=new ResizeObserver(()=>{if(!this.world.disposed)this.world.resize();});this.sizeObserver.observe(world.canvas);}
  }
  resetTiming(){this.lastFrame=0;this.slow=0;this.fast=0;this.actorClocks=new WeakMap();}
  setQuality(value){const quality=LIMITS[value]?value:'high';this.world.terrainMaterials?.setQuality(quality);if(quality===this.quality)return false;this.quality=quality;this.scale=1;this.ema=16.67;this.resetTiming();return true;}
  resize(){
    const renderer=this.world.renderer,canvas=this.world.canvas,rect=canvas.getBoundingClientRect(),limits=LIMITS[this.quality];
    const cssWidth=Math.max(1,Math.round(rect.width||canvas.clientWidth||1)),cssHeight=Math.max(1,Math.round(rect.height||canvas.clientHeight||1));
    let density=Math.min(globalThis.devicePixelRatio||1,limits.density)*this.scale;
    density=Math.min(density,Math.sqrt(limits.pixels/(cssWidth*cssHeight)));
    const width=Math.max(1,Math.floor(cssWidth*density)),height=Math.max(1,Math.floor(cssHeight*density));
    // Keep drawing-buffer dimensions explicit; camera/UI continue using CSS size.
    if(renderer.getPixelRatio()!==1)renderer.setPixelRatio(1);
    if(canvas.width!==width||canvas.height!==height)renderer.setSize(width,height,false);
    this.width=width;this.height=height;
  }
  begin(dt){
    if(this.hidden||globalThis.document?.hidden){this.resetTiming();return false;}
    const ratio=globalThis.devicePixelRatio||1;if(ratio!==this.pixelRatio){this.pixelRatio=ratio;this.resize();}
    const time=now();
    if(!this.world.loaded||!(dt>0)){this.lastFrame=time;return true;}
    const elapsed=this.lastFrame?time-this.lastFrame:0;this.lastFrame=time;
    // Zero marks the first/resumed frame. A very long isolated loading stall
    // is ignored; ordinary slow frames still apply bounded pressure.
    if(elapsed<4||elapsed>1000)return true;
    const sample=Math.min(elapsed,120);
    this.ema+=(sample-this.ema)*.055;
    this.cooldown=Math.max(0,this.cooldown-sample);
    if(this.ema>23){this.slow+=sample;this.fast=0;}
    else if(this.ema<17.4){this.fast+=sample;this.slow=Math.max(0,this.slow-sample);}
    else {this.slow=Math.max(0,this.slow-sample*.5);this.fast=0;}
    const min=LIMITS[this.quality].minScale;
    if(!this.cooldown&&this.slow>2000&&this.scale>min){this.scale=Math.max(min,this.scale-.08);this.cooldown=2800;this.slow=0;this.resize();}
    else if(!this.cooldown&&this.fast>6500&&this.scale<1){this.scale=Math.min(1,this.scale+.04);this.cooldown=3500;this.fast=0;this.resize();}
    return true;
  }
  shouldUpdateActor(actor,dt,{critical=false}={}){
    if(!(dt>0)||this.hidden)return 0;
    const w=this.world;
    if(critical||/^(party|enemy):/.test(actor.id||'')||actor.castUntil>w.time||actor.reactionUntil>w.time||actor.pulseUntil>w.time||actor.deathAt!=null&&actor.deathAt>w.time-1.5){this.actorClocks.delete(actor);return dt;}
    for(let parent=actor.wrapper;parent;parent=parent.parent)if(!parent.visible){this.actorClocks.delete(actor);return 0;}
    const camera=w.activeCamera||w.camera;
    actor.wrapper.getWorldPosition(this.projected);this.projected.y+=1;this.projected.project(camera);
    const visible=this.projected.z>-1&&this.projected.z<1&&Math.abs(this.projected.x)<1.25&&Math.abs(this.projected.y)<1.3;
    const elapsed=(this.actorClocks.get(actor)||0)+dt;
    if(visible||elapsed>=.16){this.actorClocks.set(actor,0);return Math.min(elapsed,.25);}
    this.actorClocks.set(actor,elapsed);return 0;
  }
  actorDelta(actor,dt,options){return this.shouldUpdateActor(actor,dt,options);}
  dispose(){this.sizeObserver?.disconnect();globalThis.document?.removeEventListener('visibilitychange',this.visibility);this.actorClocks=new WeakMap();}
}

// Install last, after the other World presentation extensions.
export function installBrowserPerformance(World){
  const p=World.prototype;
  if(p.__browserPerformanceInstalled)return;p.__browserPerformanceInstalled=true;
  const render=p.render,resize=p.resize,quality=p.quality,dispose=p.dispose;
  const controller=world=>world.browserPerformance??=new BrowserPerformance(world);
  p.resize=function(...args){const performance=controller(this);resize.apply(this,args);performance.resize();};
  p.quality=function(value,...args){const performance=controller(this),changed=performance.setQuality(value);if(!changed&&this.qualityLevel===performance.quality){performance.resize();return;}return quality.call(this,performance.quality,...args);};
  p.render=function(state,dt=0){if(!controller(this).begin(dt))return;return render.call(this,state,dt);};
  p.dispose=function(...args){this.browserPerformance?.dispose();return dispose.apply(this,args);};
}
