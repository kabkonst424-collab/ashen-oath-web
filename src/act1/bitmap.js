// Rasterize labels in the same matte palette as the painted menu and portraits.
const cache=new Map();
let cacheBytes=0;
const CACHE_BYTES=16*1024*1024,CACHE_ENTRIES=600;
function cachedImage(key){const value=cache.get(key);if(value){cache.delete(key);cache.set(key,value);}return value;}
function storeImage(key,value){value.bytes=(value.src.length+key.length)*2;if(value.bytes>CACHE_BYTES)return;cache.set(key,value);cacheBytes+=value.bytes;while(cache.size&&(cache.size>CACHE_ENTRIES||cacheBytes>CACHE_BYTES)){const oldest=cache.keys().next().value;cacheBytes-=cache.get(oldest).bytes;cache.delete(oldest);}}
// A single observer pair serves the whole raster HUD, instead of one pair per label.
const rasterWatch=new WeakMap(),pendingLabels=new Set(),rasterLabels=new Set();
const rasterDensity=()=>Math.max(.5,Math.min(2,Number(globalThis.devicePixelRatio??globalThis.window?.devicePixelRatio)||1));
function refreshRasterDensity(){for(const image of rasterLabels)if(image.isConnected)rasterWatch.get(image)?.(image.width||parseFloat(image.style.width)||40);else unwatchRaster(image);}
globalThis.addEventListener?.('resize',refreshRasterDensity);
let rasterResize,rasterRemoval,pendingFrame=false,resizeFrame=false;
const rasterResizeQueue=new Map();
function queueRasterResize(image,width){rasterResizeQueue.set(image,width);if(resizeFrame)return;resizeFrame=true;requestAnimationFrame(()=>{resizeFrame=false;const work=[...rasterResizeQueue];rasterResizeQueue.clear();for(const [label,actual]of work)if(label.isConnected)rasterWatch.get(label)?.(actual);else unwatchRaster(label);});}
function unwatchRaster(image){if(!rasterWatch.has(image))return;rasterResize?.unobserve(image);rasterWatch.delete(image);rasterLabels.delete(image);pendingLabels.delete(image);rasterResizeQueue.delete(image);}
function watchRaster(image,draw){
 rasterWatch.set(image,draw);rasterLabels.add(image);
 if(typeof ResizeObserver==='undefined')return;
 rasterResize??=new ResizeObserver(entries=>{for(const entry of entries)if(entry.contentRect.width>0)queueRasterResize(entry.target,entry.contentRect.width);});
 rasterWatch.set(image,draw);rasterResize.observe(image);pendingLabels.add(image);
 if(!rasterRemoval&&typeof MutationObserver!=='undefined'){
  rasterRemoval=new MutationObserver(records=>{for(const record of records)for(const node of record.removedNodes){if(node.nodeType!==1||node.isConnected)continue;if(node.matches('img.bitmap-text'))unwatchRaster(node);for(const child of node.querySelectorAll('img.bitmap-text'))if(!child.isConnected)unwatchRaster(child);}});
  rasterRemoval.observe(document.documentElement,{childList:true,subtree:true});
 }
 if(!pendingFrame){pendingFrame=true;requestAnimationFrame(()=>{pendingFrame=false;for(const label of pendingLabels)if(!label.isConnected)unwatchRaster(label);pendingLabels.clear();});}
}
const TITLE_FACE='Cormorant SC',BODY_FACE='Lora';
const FACES=[
 [TITLE_FACE,'CormorantSC-Bold.woff',{weight:'700'}],
 [BODY_FACE,'Lora-Variable.woff',{weight:'400 700'}],
];
let typographyReady,typographyEpoch=0;
function refreshTypography(){typographyEpoch++;cache.clear();cacheBytes=0;refreshRasterDensity();}

export function loadTypography({timeoutMs=4000}={}){
 if(typographyReady)return typographyReady;
 if(typeof FontFace==='undefined'||!globalThis.document?.fonts)return Promise.resolve(false);
 const fontLoads=Promise.allSettled(FACES.map(async([name,file,options])=>{
  const url=new URL('../../assets/act1/fonts/'+file,import.meta.url).href;
  const face=new FontFace(name,`url("${url}") format("woff")`,options);
  await face.load();
  document.fonts.add(face);
  refreshTypography();
 })).then(results=>results.every(result=>result.status==='fulfilled'));
 typographyReady=new Promise(resolve=>{
  const timer=setTimeout(()=>resolve(false),Math.min(30000,Math.max(1,Number(timeoutMs)||4000)));
  fontLoads.then(loaded=>{clearTimeout(timer);resolve(loaded);});
 });
 return typographyReady;
}

function useTypeface(ctx,size,display,bold){
 const family=display?TITLE_FACE:BODY_FACE;
 ctx.font=`${display?700:bold?600:400} ${size}px "${family}", Georgia, serif`;
 if('letterSpacing' in ctx)ctx.letterSpacing=display?Math.min(1.65,size*.034)+'px':'0px';
}

export function paintGildedLine(ctx,line,x,y,size,{align='left',display=true,bold=false,color,accent=false}={}){
 useTypeface(ctx,size,display,bold);
 ctx.textAlign=align;
 ctx.textBaseline='top';
 ctx.shadowColor='#1b100dd0';
 ctx.shadowBlur=1;
 ctx.shadowOffsetY=1;
 if(display){
  const brass=ctx.createLinearGradient(0,y+size*.14,0,y+size);
  brass.addColorStop(0,'#fff4da');
  brass.addColorStop(.46,'#fbe4b3');
  brass.addColorStop(.78,'#e6bc78');
  brass.addColorStop(1,'#bf914e');
  ctx.fillStyle=brass;
  ctx.lineJoin='round';
  ctx.lineWidth=Math.max(.6,size*.024);
  ctx.strokeStyle='#3f2715';
  ctx.strokeText(line,x,y);
 }else ctx.fillStyle=color??(accent?'#b9e7da':'#f4e9d4');
 ctx.fillText(line,x,y);
}

function wrapLines(ctx,text,available){
 const lines=[];
 for(const paragraph of text.split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   if(!word)continue;
   const candidate=line?line+' '+word:word;
   if(ctx.measureText(candidate).width<=available){line=candidate;continue;}
   if(line){lines.push(line);line='';}
   for(const character of word){
    if(line&&ctx.measureText(line+character).width>available){lines.push(line);line='';}
    line+=character;
   }
  }
  lines.push(line);
 }
 return lines;
}

export function textImage(text,{width=420,size=18,color='#eadfca',align='left',bold=false,display=false}={}){
 text=String(text??'');
 const copy=display?text.toLocaleUpperCase('ru-RU'):text;
 width=Math.max(40,Math.round(width));
 const image=new Image();
 image.alt=text;
 image.className='bitmap-text';
 image.dataset.fontRole=display?'heading':'body';
 image.draggable=false;
 image.style.width=width+'px';
 let renderedWidth=0,renderedDensity=0,renderedTypography=-1;
 function draw(actual){
  actual=Math.max(24,Math.round(actual));
  const density=rasterDensity();
  if(actual===renderedWidth&&density===renderedDensity&&renderedTypography===typographyEpoch)return;
  renderedWidth=actual;
  renderedDensity=density;
  renderedTypography=typographyEpoch;
  const key=JSON.stringify([text,actual,size,color,align,bold,display,density,typographyEpoch]);
  let value=cachedImage(key);
  if(!value){
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
   useTypeface(ctx,size,display,bold);
   const padding=display?Math.max(4,Math.ceil(size*.09)):4;
   const lines=wrapLines(ctx,copy,Math.max(1,actual-padding*2));
   const lineHeight=Math.ceil(size*(display?1.27:1.45));
   const height=lines.length*lineHeight+6;
   canvas.width=Math.ceil(actual*density);
   canvas.height=Math.ceil(height*density);
   ctx.scale(density,density);
   const x=align==='center'?actual/2:align==='right'?actual-padding:padding;
   lines.forEach((line,i)=>paintGildedLine(ctx,line,x,3+i*lineHeight,size,{align,display,bold,color}));
   value={src:canvas.toDataURL('image/png'),width:actual,height};
   storeImage(key,value);
  }
  image.src=value.src;
  image.width=value.width;
  image.height=value.height;
 }
 draw(width);
 watchRaster(image,draw);
 return image;
}
export function sprite(index,kind='icons',className=''){const node=document.createElement('div');node.className='sprite '+kind+' '+className;node.style.backgroundPosition=`${(index%4)*100/3}% ${Math.floor(index/4)*100/3}%`;node.setAttribute('aria-hidden','true');return node;}
// Panels use a neutral frame; the generated atlas is not a regular grid.
export function atlasCell(node,index){node.dataset.frame=String(index);return node;}
