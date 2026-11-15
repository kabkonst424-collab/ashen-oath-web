import * as T from '../../assets/vendor/three.module.js';

function graphicsDevice(client){
  const tabletDesktopUA=/Mac/i.test(client?.platform||'')&&client?.maxTouchPoints>1;
  return client?.userAgentData?.mobile||tabletDesktopUA||/Android|iPhone|iPad|iPod/i.test(client?.userAgent||'')?'mobile':'desktop';
}

/** Preserve saved quality; new profiles select a default for the device. */
export function resolveInitialQuality(settings,client=globalThis.navigator){
  if(settings?.quality==='high'||settings?.quality==='low')return settings.quality;
  return graphicsDevice(client)==='mobile'?'low':'high';
}

const PRESETS={
  desktop:{
    low:{density:.85,pixels:960*540,minScale:.68,shadowSize:0,anisotropy:1,effectBudget:80,effectDetail:.48,fireLights:1,fireSparks:2},
    medium:{density:1.25,pixels:1920*1080,minScale:.72,shadowSize:1024,anisotropy:4,effectBudget:170,effectDetail:.75,fireLights:2,fireSparks:3},
    high:{density:2.25,pixels:3840*2160,minScale:1,shadowSize:4096,anisotropy:16,effectBudget:300,effectDetail:1,fireLights:4,fireSparks:5},
  },
  mobile:{
    low:{density:.85,pixels:720*416,minScale:.68,shadowSize:0,anisotropy:1,effectBudget:72,effectDetail:.45,fireLights:0,fireSparks:1},
    medium:{density:1.25,pixels:1280*720,minScale:.72,shadowSize:1024,anisotropy:4,effectBudget:140,effectDetail:.72,fireLights:2,fireSparks:3},
    high:{density:2,pixels:1920*1080,minScale:.80,shadowSize:2048,anisotropy:8,effectBudget:250,effectDetail:1,fireLights:3,fireSparks:5},
  },
};

export function graphicsProfile(value,client=globalThis.navigator){
  const device=graphicsDevice(client),quality=['low','medium','high'].includes(value)?value:'high';
  return {quality,device,...PRESETS[device][quality]};
}

function hardwareLimits(renderer){
  const gl=renderer.getContext?.();
  const valid=value=>Number.isFinite(value)&&value>0?value:Infinity;
  const viewport=gl?.getParameter(gl.MAX_VIEWPORT_DIMS);
  const renderbuffer=valid(gl?.getParameter(gl.MAX_RENDERBUFFER_SIZE));
  return {
    width:Math.min(valid(viewport?.[0]),renderbuffer),
    height:Math.min(valid(viewport?.[1]),renderbuffer),
    shadow:Math.min(valid(viewport?.[0]),valid(viewport?.[1]),renderbuffer,valid(renderer.capabilities?.maxTextureSize)),
  };
}
const now=()=>globalThis.performance?.now?.()??Date.now();

/** Presentation scheduling only. It never changes campaign state or saves. */
export class BrowserPerformance {
  constructor(world){
    this.world=world;this.scale=1;this.profile=graphicsProfile(world.qualityLevel);this.hardware=hardwareLimits(world.renderer);this.ema=16.67;this.lastFrame=0;this.slow=0;this.fast=0;this.cooldown=0;
    this.actorClocks=new WeakMap();this.projected=new T.Vector3();this.width=0;this.height=0;this.hidden=!!globalThis.document?.hidden;
    this.visibility=()=>{this.hidden=!!globalThis.document?.hidden;this.resetTiming();this.ema=16.67;this.cooldown=0;};
    globalThis.document?.addEventListener('visibilitychange',this.visibility);
    this.pixelRatio=globalThis.devicePixelRatio||1;
    if(globalThis.ResizeObserver){this.sizeObserver=new ResizeObserver(()=>{if(!this.world.disposed)this.world.resize();});this.sizeObserver.observe(world.canvas);}
  }
  resetTiming(){this.lastFrame=0;this.slow=0;this.fast=0;this.actorClocks=new WeakMap();}
  setQuality(value){
    const profile=graphicsProfile(value);
    if(profile.quality===this.profile.quality&&profile.device===this.profile.device)return this.profile;
    this.profile=profile;this.scale=1;this.ema=16.67;this.cooldown=0;this.resetTiming();
    return profile;
  }
  resize(rect=this.viewport??this.world.canvas.getBoundingClientRect()){
    const renderer=this.world.renderer,canvas=this.world.canvas,limits=this.profile;
    const cssWidth=Math.max(1,Math.round(rect.width||canvas.clientWidth||1)),cssHeight=Math.max(1,Math.round(rect.height||canvas.clientHeight||1));
    let density=Math.min(globalThis.devicePixelRatio||1,limits.density)*this.scale;
    density=Math.min(density,Math.sqrt(limits.pixels/(cssWidth*cssHeight)),this.hardware.width/cssWidth,this.hardware.height/cssHeight);
    const width=Math.max(1,Math.floor(cssWidth*density)),height=Math.max(1,Math.floor(cssHeight*density));
    // Keep drawing-buffer dimensions explicit; camera/UI continue using CSS size.
    if(canvas.width!==width||canvas.height!==height)renderer.setSize(width,height,false);
    this.width=width;this.height=height;
  }
  info(){
    const {quality,device,pixels,density,effectBudget,fireLights}=this.profile,world=this.world;
    return {quality,device,width:this.width,height:this.height,pixelBudget:pixels,densityLimit:density,scale:this.scale,
      shadowSize:world.renderer.shadowMap.enabled?world.sun.shadow.mapSize.x:0,terrainAnisotropy:world.textureAnisotropy,
      effectBudget,fireLights,waterDetail:quality!=='low'};
  }
  begin(dt){
    if(this.hidden||globalThis.document?.hidden)return false;
    const ratio=globalThis.devicePixelRatio||1;if(ratio!==this.pixelRatio){this.pixelRatio=ratio;this.resize();}
    if(this.profile.minScale===1)return true;
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
    const min=this.profile.minScale;
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
  p.resize=function(){
    if(this.disposed)return;
    const performance=controller(this),previous=performance.viewport,rect=this.canvas.getBoundingClientRect();
    performance.viewport=rect;
    if(!previous||rect.width!==previous.width||rect.height!==previous.height||rect.left!==previous.left||rect.top!==previous.top)resize.call(this,rect);
    performance.resize(rect);
  };
  p.quality=function(value){return quality.call(this,controller(this).setQuality(value));};
  p.graphicsInfo=function(){return this.browserPerformance?.info()??null;};
  p.render=function(state,dt=0){if(!controller(this).begin(dt))return;return render.call(this,state,dt);};
  p.dispose=function(...args){this.browserPerformance?.dispose();return dispose.apply(this,args);};
}
