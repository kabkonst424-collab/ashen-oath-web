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
let typographyReady,typographyEpoch=0;
function refreshTypography(){typographyEpoch++;cache.clear();cacheBytes=0;refreshRasterDensity();}
export function loadTypography({timeoutMs=30000}={}){
 if(typographyReady)return typographyReady;
 if(typeof FontFace==='undefined'||!document.fonts)return Promise.resolve();
 document.fonts.addEventListener?.('loadingdone',refreshTypography);
 const fontLoads=Promise.allSettled([
  ['RiftDisplay','CormorantSC-Bold.ttf',{weight:'700'}],
  ['RiftText','Lora-Variable.ttf',{weight:'400 700'}]
 ].map(async([name,file,options])=>{const face=new FontFace(name,`url("${new URL('../../assets/act1/fonts/'+file,import.meta.url).href}")`,options);await face.load();document.fonts.add(face);refreshTypography();})).then(results=>{const loaded=results.every(r=>r.status==='fulfilled');if(!loaded)console.warn('Локальные шрифты недоступны: используется резервная кириллица.');return loaded;});
 typographyReady=new Promise(resolve=>{const timer=setTimeout(()=>resolve(false),Math.min(30000,Math.max(1,Number(timeoutMs)||30000)));fontLoads.then(loaded=>{clearTimeout(timer);resolve(loaded);});});
 return typographyReady;
}
export function paintGildedLine(ctx,line,x,y,size,{align='left',display=true,accent=false}={}){
 ctx.font=`${display?'700':'600'} ${size}px ${display?'RiftDisplay':'RiftText'}, Georgia, serif`;
 ctx.textAlign=align;ctx.textBaseline='top';
 ctx.shadowColor='#0a2029b3';ctx.shadowBlur=1;ctx.shadowOffsetY=1;
 ctx.fillStyle=accent?'#b9e7da':display?'#ffe7b6':'#f4e9d4';
 if(ctx.strokeText&&size>=18){ctx.lineJoin='round';ctx.lineWidth=display?1.05:.65;ctx.strokeStyle='#192c32';ctx.strokeText(line,x,y);}
 ctx.fillText(line,x,y);
}
export function textImage(text,{width=420,size=18,color='#eadfca',align='left',bold=false}={}){
 text=String(text??'');width=Math.max(40,Math.round(width));
 const image=new Image();image.alt=text;image.className='bitmap-text';image.draggable=false;image.style.width=width+'px';let renderedWidth=0,renderedDensity=0,renderedTypography=-1;
 function draw(actual){actual=Math.max(24,Math.round(actual));const ratio=rasterDensity();if(actual===renderedWidth&&ratio===renderedDensity&&renderedTypography===typographyEpoch)return;renderedWidth=actual;renderedDensity=ratio;renderedTypography=typographyEpoch;const palette=['#8ed2c1','#9edbd3','#b6e7e0'].includes(color)?'teal':'gold';const key=[text,actual,size,palette,align,bold,ratio,typographyEpoch].join('|');let value=cachedImage(key);
  if(!value){const c=document.createElement('canvas'),ctx=c.getContext('2d'),font=`${bold||size>=21?'700':'600'} ${size}px ${bold||size>=21?'RiftDisplay':'RiftText'}, Georgia, serif`;ctx.font=font;const lines=[];for(const paragraph of text.split('\n')){let line='';for(const word of paragraph.split(/\s+/)){if(!word)continue;const candidate=line?line+' '+word:word;if(ctx.measureText(candidate).width<=actual-8){line=candidate;continue;}if(line){lines.push(line);line='';}for(const char of word){if(line&&ctx.measureText(line+char).width>actual-8){lines.push(line);line='';}line+=char;}}lines.push(line);}const lineHeight=Math.ceil(size*1.48),height=Math.max(lineHeight,lines.length*lineHeight+6),density=ratio;c.width=Math.ceil(actual*density);c.height=Math.ceil(height*density);ctx.scale(density,density);ctx.font=font;ctx.textBaseline='top';ctx.textAlign=align;const x=align==='center'?actual/2:align==='right'?actual-4:4;lines.forEach((line,i)=>paintGildedLine(ctx,line,x,3+i*lineHeight,size,{align,display:bold||size>=21,accent:['#8ed2c1','#9edbd3','#b6e7e0'].includes(color)}));value={src:c.toDataURL('image/png'),width:actual,height};storeImage(key,value);}
  image.src=value.src;image.width=value.width;image.height=value.height;
 }
 draw(width);watchRaster(image,draw);return image;
}
export function sprite(index,kind='icons',className=''){const node=document.createElement('div');node.className='sprite '+kind+' '+className;node.style.backgroundPosition=`${(index%4)*100/3}% ${Math.floor(index/4)*100/3}%`;node.setAttribute('aria-hidden','true');return node;}
// Panels use a neutral frame; the generated atlas is not a regular grid.
export function atlasCell(node,index){node.dataset.frame=String(index);return node;}
