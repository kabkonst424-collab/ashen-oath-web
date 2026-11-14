import {createTerrainClip,drawAreaSchematic,markerShape,terrainShapes} from './area-schematic.js?v=forged-019';
import {areaMapMarkers,createNavigationService} from './navigation.js?v=forged-019';
const INITIALIZERS=[],RENDERERS=[];
const initialize=run=>INITIALIZERS.push(run),renderer=(order,run)=>RENDERERS.push({order,run});
const NS='http://www.w3.org/2000/svg';
export function projectPoint(view,point,{zoom=1}={}){const b=view.area.bounds,scale=Math.min(176/(b.rx*2),136/(b.rz*2))*zoom,center=zoom>1&&view.player?view.player:{x:b.x,z:b.z};return {x:100+(point.x-center.x)*scale,y:80+(point.z-center.z)*scale,scale};}
export function createMinimap({el,text,button,onQuestSelect=()=>{},onDetails=()=>{},document=globalThis.document,service=createNavigationService(),initialZoom=1}={}){
 if(!el||!text||!button||!document?.createElementNS)throw Error('Minimap requires the existing raster UI adapters and SVG document');
 const metrics={updates:0,shapeCreates:0,shapeWrites:0,shapeEntries:0,labelsPainted:0},prefs={zoom:initialZoom===2?2:1,showRoute:true,expanded:null,chooser:false,legend:false};
 const element=el('section','nav50-minimap'),header=el('div','nav50-header'),body=el('div','nav50-body'),copy=el('div','nav50-copy'),controls=el('div','nav50-controls'),extra=el('div','nav50-extra');
 element.setAttribute('aria-label','Мини-карта и подсказка задания');element.dataset.focusKey='navigation';
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 200 160');svg.setAttribute('role','img');svg.setAttribute('aria-label','Текущая область');svg.classList.add('nav50-svg');
 const terrainClip=createTerrainClip(svg),layers={};for(const key of ['terrain','route','landmarks','target','player']){const group=document.createElementNS(NS,'g');group.setAttribute('data-layer',key);svg.append(group);layers[key]=group;}
 body.append(svg,copy,controls,extra);element.append(header,body);
 const captions=new Map(),shapes=new Map(),buttons=new Map(),handlers=new Map();let latest=null,destroyed=false;
 function caption(key,value,{width=220,size=13,parent=copy,color='#e9ce93',bold=false}={}){let entry=captions.get(key);if(!entry){entry={node:el('div','nav50-caption nav50-'+key),value:null};captions.set(key,entry);parent.append(entry.node);}entry.node.hidden=!value;const signature=JSON.stringify([value,width,size,color,bold,latest?.selection?.textScale||1]);if(entry.signature!==signature){entry.node.replaceChildren(text(value||'',width,size,color,bold));entry.value=value;entry.signature=signature;metrics.labelsPainted++;}return entry.node;}
 function shape(layer,key,tag,attrs){let node=shapes.get(key);if(!node||!node.parentNode&&!node.parent){node=document.createElementNS(NS,tag);node.setAttribute('data-nav-shape',key);layers[layer].append(node);shapes.set(key,node);node._navAttrs=Object.create(null);metrics.shapeCreates++;metrics.shapeEntries=shapes.size;}for(const name in attrs){const value=String(attrs[name]);if(node._navAttrs[name]!==value){node.setAttribute(name,value);node._navAttrs[name]=value;metrics.shapeWrites++;}}return node;}
 function attr(node,key,value){value=String(value);if(node.getAttribute(key)!==value)node.setAttribute(key,value);return node;}
 function removeShape(node){shapes.delete(node.getAttribute('data-nav-shape'));node.remove();metrics.shapeEntries=shapes.size;}
 function control(key,label,callback,parent=controls){let node=buttons.get(key);handlers.set(key,callback);if(!node){node=button(label,()=>handlers.get(key)?.(),{small:true,width:100,focusKey:'navigation:'+key});node.classList.add('nav50-control');node.dataset.navControl=key;buttons.set(key,node);parent.append(node);}if(node._navLabel!==label){node.ariaLabel=label;node._navLabel=label;}const captionKey=label+'|'+(latest?.selection?.textScale||1);if(node._navCaption!==captionKey){node.replaceChildren(text(label,100,12,'#ead49f',true));node._navCaption=captionKey;}return node;}
 // Registrations are fixed after module evaluation; retain one ordered pipeline per instance.
 const renderSteps=[...RENDERERS].sort((a,b)=>a.order-b.order);
 const api={element,metrics,service,prefs,update(state,selection={}){if(destroyed)return null;metrics.updates++;const view=service.update(state,selection);latest={state,selection,view};env.view=view;env.state=state;env.selection=selection;element.hidden=state.mode!=='explore';for(const step of renderSteps)step.run(env);element.dataset.route=view.route.status;return view;},destroy(){destroyed=true;element.remove();captions.clear();shapes.clear();metrics.shapeEntries=0;buttons.clear();handlers.clear();}};
 const env={el,element,header,body,svg,terrainClip,layers,copy,controls,extra,prefs,metrics,caption,shape,removeShape,attr,control,project:point=>projectPoint(env.view,point,prefs),onQuestSelect,onDetails,refresh:()=>latest&&api.update(latest.state,latest.selection),choose:id=>{if(latest)latest.selection={...latest.selection,questId:id};onQuestSelect(id);env.refresh();}};
 for(const run of INITIALIZERS)run(env);
 return api;
}
renderer(0,e=>{
 const layout=e.view.area.layout;
 const key=e.view.area.id+':'+e.prefs.zoom+(e.prefs.zoom===2?':'+e.view.player.x.toFixed(2)+':'+e.view.player.z.toFixed(2):'');
 if(e.terrainKey!==key){
  e.terrainKey=key;
  const shapes=terrainShapes(layout,e.project,e.terrainClip),live=new Set(shapes.map(shape=>shape[0]));
  if(!layout){
   const b=e.view.area.bounds,center=e.project({x:b.x,z:b.z}),edge=e.project({x:b.x+b.rx,z:b.z+b.rz});
   live.add('bounds');
   shapes.push(['bounds','ellipse',{cx:center.x,cy:center.y,rx:Math.abs(edge.x-center.x),ry:Math.abs(edge.y-center.y),fill:'#263a32',stroke:'#ae9b69','stroke-width':1.1}]);
  }
  for(const node of [...e.layers.terrain.children])if(!live.has(node.getAttribute('data-nav-shape')))e.removeShape(node);
  for(const [id,tag,attrs] of shapes)e.shape('terrain',id,tag,attrs);
 }
 e.caption('area',e.view.area.title,{parent:e.header,size:14,bold:true});
});



renderer(10,e=>{const p=e.project(e.view.player);e.shape('player','player','path',{d:'M0,-6 L4,5 L0,3 L-4,5 Z',transform:'translate('+p.x+' '+p.y+') rotate('+(180-e.view.player.angle*180/Math.PI)+')',fill:'#f4df96',stroke:'#081416','stroke-width':1.4});});

renderer(20,e=>{e.caption('quest',e.view.quest?.title||'',{size:14,bold:true});if(e.view.target&&e.view.target.areaId===e.view.area.id){const p=e.project(e.view.target);e.shape('target','target','path',{d:'M0,-6 L6,0 L0,6 L-6,0 Z',transform:'translate('+p.x+' '+p.y+')',fill:'#f3d778',stroke:'#152723','stroke-width':2,visibility:'visible'});}else e.shape('target','target','path',{d:'',visibility:'hidden'});});

renderer(50,e=>e.caption('hint',e.view.hint,{size:13}));

renderer(60,e=>e.caption('distance',e.view.distance!==null?'Путь: ≈'+e.view.distance+' шаг.':'',{color:'#9ed9cd',size:12}));

renderer(70,e=>e.caption('arrival',e.view.arrived?'Рядом · E — '+e.view.verb.toLowerCase():'',{color:'#a9e3c8',bold:true}));

renderer(45,e=>{const notice=e.caption('step',e.view.stepChanged?'Следующий шаг · '+(e.view.target?.label||'Обновите задание'):'',{bold:true,color:'#aee4d0',size:12});notice.role='status';notice.ariaLive='polite';notice.ariaAtomic='true';});



renderer(8,e=>{const points=e.view.route.points.map(p=>{const q=e.project(p);return q.x+','+q.y;}).join(' ');e.shape('route','route','polyline',{points,fill:'none',stroke:'#b6e4c5','stroke-width':2,'stroke-dasharray':'4 3','stroke-linecap':'round'});});
renderer(82,e=>e.caption('route-reason',e.view.route.reason||'',{size:12,color:'#efca9b'}));

export function clampMapPoint(point,padding=10){const x=Math.max(padding,Math.min(200-padding,point.x)),y=Math.max(padding,Math.min(160-padding,point.y));return {x,y,outside:x!==point.x||y!==point.y,angle:Math.atan2(point.x-100,-(point.y-80))*180/Math.PI};}
renderer(22,e=>{const target=e.view.waypoint||e.view.target;if(!target||target.areaId!==e.view.area.id)return;const p=clampMapPoint(e.project(target));e.shape('target','target','path',{d:p.outside?'M0,-7 L5,5 L0,2 L-5,5 Z':'M0,-6 L6,0 L0,6 L-6,0 Z',transform:'translate('+p.x+' '+p.y+')'+(p.outside?' rotate('+p.angle+')':''),fill:'#f3d778',stroke:'#152723','stroke-width':2,visibility:'visible'});e.element.dataset.offmap=String(p.outside);});





renderer(55,e=>e.caption('destination',e.view.destinationHint||'',{size:12,color:'#b3d8cd'}));

renderer(46,e=>e.caption('selection-hint',e.view.selectionHint||'',{size:12,color:'#edc29b'}));

renderer(47,e=>{e.caption('completion',e.view.complete?'Первый акт завершён. Выберите новый путь после продолжения истории.':e.view.completionNotice||'',{size:13,bold:true});});




initialize(e=>{const list=documentFallback(e,'nav50-quest-list');e.questList=list;e.extra.append(list);e.control('quests','Задания',()=>{e.prefs.chooser=!e.prefs.chooser;e.refresh();});});
function documentFallback(e,cls){return e.el('div',cls);}
renderer(90,e=>{e.questList.hidden=!e.prefs.chooser;if(!e.prefs.chooser)return;const listKey=JSON.stringify([e.view.quests,e.view.quest?.id,e.selection.textScale||1]);if(e.questList._navKey===listKey)return;e.questList._navKey=listKey;e.questList.replaceChildren();for(const quest of e.view.quests){const selected=e.view.quest?.id===quest.id,node=e.control('quest-'+quest.id,(selected?'Выбрано · ':'')+quest.title,()=>e.choose(quest.id),e.questList);e.attr(node,'aria-pressed',String(selected));e.questList.append(node);}if(!e.view.quests.length)e.caption('no-quests','Нет активных известных заданий.',{parent:e.questList,size:12});});

renderer(15,e=>{
 const live=new Set();
 for(const marker of e.view.landmarks){
  const p=e.project(marker);
  if(p.x<5||p.x>195||p.y<5||p.y>155)continue;
  const key='landmark-'+marker.id;
  live.add(key);
  const node=e.shape('landmarks',key,'path',markerShape(marker,e.project));
  const label=marker.label+(marker.locked?' · закрыто':'');
  if(node._markerTitle!==label){node._markerTitle=label;let title=node.firstChild;
   if(!title){title=e.svg.ownerDocument.createElementNS(NS,'title');node.append(title);}
   title.textContent=label;
  }
 }
 for(const node of [...e.layers.landmarks.children])if(!live.has(node.getAttribute('data-nav-shape')))e.removeShape(node);
});

initialize(e=>e.control('route','Линия: да',()=>{e.prefs.showRoute=!e.prefs.showRoute;e.refresh();}));
renderer(95,e=>{const button=e.control('route',e.prefs.showRoute?'Линия: да':'Линия: нет',()=>{e.prefs.showRoute=!e.prefs.showRoute;e.refresh();});e.attr(button,'aria-pressed',String(e.prefs.showRoute));e.attr(e.layers.route,'visibility',e.prefs.showRoute?'visible':'hidden');});

initialize(e=>e.control('zoom','Масштаб: 1×',()=>{e.prefs.zoom=e.prefs.zoom===1?2:1;e.refresh();}));
renderer(96,e=>{e.attr(e.control('zoom','Масштаб: '+e.prefs.zoom+'×',()=>{e.prefs.zoom=e.prefs.zoom===1?2:1;e.refresh();}),'aria-pressed',String(e.prefs.zoom===2));});

renderer(65,e=>e.caption('direction','Север ↑'+(e.view.direction?' · '+e.view.direction:''),{size:12,color:'#bfd6c7'}));

initialize(e=>e.control('expand','Мини-карта',()=>{const compact=e.selection?.compact??((globalThis.innerWidth||1280)<=760||(globalThis.innerHeight||720)<=460);e.prefs.expanded=!(e.prefs.expanded??!compact);e.refresh();},e.header));
renderer(99,e=>{const compact=e.selection.compact??((globalThis.innerWidth||1280)<=760||(globalThis.innerHeight||720)<=460),expanded=e.prefs.expanded??!compact;e.body.hidden=!expanded;e.element.classList.toggle('nav50-collapsed',!expanded);e.attr(e.control('expand',expanded?'Свернуть':'Мини-карта',()=>{e.prefs.expanded=!(e.prefs.expanded??!compact);e.refresh();},e.header),'aria-expanded',String(expanded));});

initialize(e=>e.control('details','Журнал',()=>e.onDetails(e.view.quest?.id||null)));
renderer(97,e=>{const node=e.control('details','Журнал',()=>e.onDetails(e.view.quest?.id||null));node.ariaLabel='Открыть задание в журнале · '+(e.view.quest?.title||'Текущая задача');});

initialize(e=>e.control('legend','Значки',()=>{e.prefs.legend=!e.prefs.legend;e.refresh();}));
renderer(98,e=>{e.attr(e.control('legend','Значки',()=>{e.prefs.legend=!e.prefs.legend;e.refresh();}),'aria-expanded',String(e.prefs.legend));e.caption('legend',e.prefs.legend?'Светлая стрелка — отряд · Золотой ромб — цель\nАрка — выход · Шатёр — лагерь · Сумка — торговец\nМолот — кузнец · Красный крест — враги\nСиний — вода · Линия — дорога · Светлый настил — мост':'',{parent:e.extra,size:12});e.attr(e.svg,'aria-label',[e.view.area.title,e.view.quest?.title,e.view.hint,e.view.route.reason,e.view.distance!==null?'Примерно '+e.view.distance+' шагов':'',e.view.direction].filter(Boolean).join('. '));});



export function createAreaSchematic({area,state,questId,document=globalThis.document}){
 const local=state.areaId===area.id;
 const view=createNavigationService().update(state,{questId});
 const target=view.target?.areaId===area.id?view.target:null;
 return drawAreaSchematic({
  area,state,position:local?{...state.position,angle:state.angle}:null,
  markers:areaMapMarkers(area,state,target?.id),target,route:local?view.route.points:[],document,
 });
}
