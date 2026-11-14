import * as M from './model.js?v=motion-110';
import * as CONTENT from './content.js?v=campaign-v1';

// Routes and the schematic take their boundaries from the movement model.
const PHASES=[];
const phase=(order,run)=>PHASES.push({order,run});
const values=v=>Array.isArray(v)?v:Object.values(v||{});
const byId=v=>new Map(values(v).map(a=>[a.id,a]));
const finite=n=>Number.isFinite(n);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function areaBounds(area={}){if(area.layout)return area.bounds;const b=area.bounds||{};return {x:b.x||0,z:b.z||0,rx:(b.rx||area.radiusX||area.rx||area.width/2||30)*Math.sqrt(.9),rz:(b.rz||area.radiusZ||area.rz||area.depth/2||35)*Math.sqrt(.9)};}
function objectIn(area,id){return [...(area?.npcs||[]).map(o=>({...o,kind:'npc'})),...(area?.nodes||[]).map(o=>({...o,kind:o.type||'inspect'})),...(area?.encounters||[]).map(o=>({...o,kind:'encounter'})),...(area?.exits||[]).map(o=>({...o,kind:'exit'})),...(area?.shops||[]).map(o=>({...o,kind:'shop'}))].find(o=>o.id===id);}
function allowed(state,object){return (object.requiresFlags||[]).every(f=>state.flags?.[f])&&!(object.forbidFlags||[]).some(f=>state.flags?.[f]);}
function availableObject(state,object){return !!object&&allowed(state,object)&&!(state.defeated||[]).includes(object.id)&&!(object.kind==='chest'&&(state.claimed||[]).includes('node:'+object.id));}
export function createNavigationService({walkable=M.walkable,areas=CONTENT.AREAS,quests=CONTENT.QUESTS,model=M,now=()=>globalThis.performance?.now?.()??Date.now()}={}){
 const phases=[...PHASES].sort((a,b)=>a.order-b.order);
 const metrics={updates:0,routeComputations:0,routeCacheHits:0},ctx={areas:byId(areas),quests:values(quests),model,walkable,metrics,now,stageNoticeUntil:0,previousTarget:null,routeCache:null};
 return {metrics,update(state,selection={}){metrics.updates++;const area=ctx.areas.get(state.areaId),view={mode:state.mode,runId:state.runId,area:{id:state.areaId,title:area?.title||area?.name||'Неизвестная область',bounds:areaBounds(area),layout:area?.layout},player:null,quest:null,target:null,waypoint:null,route:{status:'none',points:[],areas:[]},hint:'',distance:null,arrived:false,landmarks:[],quests:[]};for(const item of phases)item.run(view,state,selection,ctx);return view;}};
}



phase(10,(v,s)=>{v.player={x:s.position.x,z:s.position.z,angle:Number(s.angle)||0};});

phase(20,(v,s,selection,c)=>{const requested=selection.questId&&c.model.questProgress(s,selection.questId),selectedId=requested?.known&&requested.available&&!requested.complete?selection.questId:null,objective=c.model.currentObjective(s,selectedId);v.quest={id:objective.id,title:objective.title,description:objective.description||objective.detail||'',complete:!!objective.complete};v.target=objective.target?{...objective.target}:null;});

export function actionVerb(target){return ({npc:'Поговорите',shop:'Купите припасы',encounter:'Победите',exit:'Перейдите',camp:'Отдохните',chest:'Откройте',puzzle:'Решите загадку'})[target?.puzzle?'puzzle':target?.kind]||'Осмотрите';}
phase(80,(v,s,selection,c)=>{const object=v.target&&objectIn(c.areas.get(v.target.areaId),v.target.id);v.verb=actionVerb({...v.target,puzzle:object?.puzzle});v.hint=v.target?v.verb+': '+v.target.label:v.quest?.description||'Осмотрите область и поговорите со спутниками.';});

phase(95,v=>{if(v.player&&v.target?.areaId===v.area.id)v.distance=Math.ceil(distance(v.player,v.target));});

phase(100,(v,s,selection,c)=>{v.arrived=!!v.waypoint?.ready||!!v.target?.ready;const target=v.waypoint||v.target;v.arrived=!!target&&target.areaId===s.areaId&&c.model.nearby(s).some(o=>o.id===target.id&&o.ready);if(v.arrived)v.distance=0;});

phase(25,(v,s,selection,c)=>{const key=[s.runId,v.quest?.id,v.target?.areaId,v.target?.id].join(':');const previous=c.previousTarget,changed=!!previous&&previous.runId===s.runId&&previous.questId===v.quest?.id&&previous.key!==key;if(changed)c.stageNoticeUntil=c.now()+4000;else if(!previous||previous.runId!==s.runId||previous.questId!==v.quest?.id)c.stageNoticeUntil=0;v.stepChanged=c.stageNoticeUntil>c.now();c.previousTarget={runId:s.runId,questId:v.quest?.id,key};});

export function approachTarget(areaId,target,from,walkable=M.walkable){if(!target||!finite(target.x)||!finite(target.z))return null;if(walkable(areaId,target.x,target.z))return {x:target.x,z:target.z};const radius=target.radius||3.4,candidates=[];for(const fraction of [.95,.7,.45])for(let i=0;i<32;i++){const angle=i*Math.PI/16,p={x:target.x+Math.cos(angle)*radius*fraction,z:target.z+Math.sin(angle)*radius*fraction};if(walkable(areaId,p.x,p.z))candidates.push(p);}return candidates.sort((a,b)=>distance(a,from)-distance(b,from))[0]||null;}
phase(40,(v,s,selection,c)=>{if(v.target?.areaId!==s.areaId)return;const object=objectIn(c.areas.get(s.areaId),v.target.id);v.waypoint={...v.target,radius:object?.radius||3.4};v.waypoint.approach=approachTarget(s.areaId,v.waypoint,v.player,c.walkable);});

export function validSegment(areaId,a,b,walkable=M.walkable){const count=Math.max(1,Math.ceil(distance(a,b)/.7));for(let i=0;i<=count;i++)if(!walkable(areaId,a.x+(b.x-a.x)*i/count,a.z+(b.z-a.z)*i/count))return false;return true;}
const NEIGHBORS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
function enqueue(queue, value) {
 let i=queue.length;
 queue.push(value);
 while(i>0){
  const parent=(i-1)>>1;
  if(queue[parent].f<=value.f)break;
  queue[i]=queue[parent];i=parent;
 }
 queue[i]=value;
}

function dequeue(queue) {
 const root=queue[0],last=queue.pop();
 if(!queue.length)return root;
 let i=0;
 while(i*2+1<queue.length){
  let child=i*2+1;
  if(child+1<queue.length&&queue[child+1].f<queue[child].f)child++;
  if(last.f<=queue[child].f)break;
  queue[i]=queue[child];i=child;
 }
 queue[i]=last;
 return root;
}

export function planPath(areaId,start,end,{walkable=M.walkable,bounds,step=2,maxVisited=11000}={}){
 const failed={status:'unreachable',points:[]};
 if(!end||!walkable(areaId,start.x,start.z)||!walkable(areaId,end.x,end.z))return failed;
 if(validSegment(areaId,start,end,walkable))return {status:'ready',points:[{...start},{...end}]};
 const b=bounds||areaBounds(byId(CONTENT.AREAS).get(areaId));
 const key=(x,z)=>x+','+z, world=(x,z)=>({x:b.x+x*step,z:b.z+z*step});
 const source={x:Math.round((start.x-b.x)/step),z:Math.round((start.z-b.z)/step)};
 const open=[],closed=new Set(),visited=new Map();
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
  const x=source.x+dx,z=source.z+dz,p=world(x,z),g=distance(start,p);
  if(!validSegment(areaId,start,p,walkable))continue;
  const row={x,z,p,g,f:g+distance(p,end),previous:null};
  visited.set(key(x,z),row);enqueue(open,row);
 }
 let finish=null;
 while(open.length&&closed.size<maxVisited){
  const current=dequeue(open),id=key(current.x,current.z);
  if(closed.has(id)||visited.get(id)!==current)continue;
  closed.add(id);
  if(distance(current.p,end)<=step*2.5&&validSegment(areaId,current.p,end,walkable)){finish=current;break;}
  for(const [dx,dz] of NEIGHBORS){
   const x=current.x+dx,z=current.z+dz,p=world(x,z),next=key(x,z);
   const g=current.g+Math.hypot(dx,dz)*step;
   if(Math.abs(p.x-b.x)>b.rx+step||Math.abs(p.z-b.z)>b.rz+step||closed.has(next)||
       g>=(visited.get(next)?.g??Infinity)||!validSegment(areaId,current.p,p,walkable))continue;
   if(dx&&dz&&(!walkable(areaId,p.x,current.p.z)||!walkable(areaId,current.p.x,p.z)))continue;
   const row={x,z,p,g,f:g+distance(p,end),previous:current};
   visited.set(next,row);enqueue(open,row);
  }
 }
 if(!finish)return failed;
 const points=[{...end}];
 for(let cursor=finish;cursor;cursor=cursor.previous)points.push(cursor.p);
 points.push({...start});points.reverse();
 const smooth=[points[0]];
 for(let i=0;i<points.length-1;){
  let j=points.length-1;
  while(j>i+1&&!validSegment(areaId,points[i],points[j],walkable))j--;
  smooth.push(points[j]);i=j;
 }
 return {status:'ready',points:smooth};
}
phase(70,(v,s,selection,c)=>{if(!v.waypoint)return;const endpoint=v.waypoint.approach,key=JSON.stringify([s.runId,s.areaId,v.waypoint.id,endpoint,Math.floor(v.player.x/2),Math.floor(v.player.z/2),s.flags,s.claimed,s.defeated]);let path;if(c.routeCache?.key===key&&c.routeCache.path.status==='ready'&&validSegment(s.areaId,v.player,c.routeCache.path.points[1]||endpoint,c.walkable)){c.metrics.routeCacheHits++;path={...c.routeCache.path,points:[{...v.player},...c.routeCache.path.points.slice(1)]};}else{c.metrics.routeComputations++;path=planPath(s.areaId,v.player,endpoint,{walkable:c.walkable,bounds:v.area.bounds});c.routeCache={key,path};}v.route={...v.route,...path};if(path.status==='unreachable')v.route.reason='Не удалось построить доступный путь. Проверьте цель в журнале.';});
phase(96,v=>{if(v.route.points.length>1)v.distance=Math.ceil(v.route.points.slice(1).reduce((sum,p,i)=>sum+distance(v.route.points[i],p),0));});



export function areaRoute(state,destination,{areas=CONTENT.AREAS,includeLocked=false}={}){const defs=byId(areas),queue=[{id:state.areaId,areas:[state.areaId],first:null,edges:[]}],seen=new Set();while(queue.length){const current=queue.shift();if(seen.has(current.id))continue;seen.add(current.id);if(current.id===destination)return current;for(const exit of defs.get(current.id)?.exits||[]){const target=exit.target||exit.to;if(!defs.has(target)||(exit.forbidFlags||[]).some(f=>state.flags?.[f])||!includeLocked&&!allowed(state,exit))continue;const edge={...exit,kind:'exit',areaId:current.id,ready:allowed(state,exit)};queue.push({id:target,areas:[...current.areas,target],first:current.first||edge,edges:[...current.edges,edge]});}}return null;}
phase(50,(v,s,selection,c)=>{if(!v.target||v.target.areaId===s.areaId)return;const chain=areaRoute(s,v.target.areaId,{areas:[...c.areas.values()]});if(!chain?.first){v.route.status='no-transition';return;}v.route.areas=chain.areas;v.route.nextArea=c.areas.get(chain.areas[1])?.title||chain.areas[1];v.waypoint={...chain.first,label:chain.first.label||chain.first.id,radius:chain.first.radius||3.4};v.waypoint.approach=approachTarget(s.areaId,v.waypoint,v.player,c.walkable);});

function knownPrerequisites(state,flags,ctx){
 const found=new Map(),visited=new Set();
 function visit(flag,depth){
  if(depth>=8||visited.has(flag)||state.flags?.[flag])return false;
  visited.add(flag);
  for(const quest of ctx.quests.filter(q=>(q.completeFlags||[]).includes(flag))){
   const progress=ctx.model.questProgress(state,quest.id);
   if(progress?.complete)continue;
   const target=progress?.target,object=target&&objectIn(ctx.areas.get(target.areaId),target.id);
   if(progress?.known&&progress.available&&target&&target.ready!==false&&(!object||availableObject(state,object))){
    const step=target.label?actionVerb({...target,puzzle:object?.puzzle}).toLowerCase()+': '+target.label:'';
    found.set(progress.id||quest.id,progress.title+(step?' — '+step:''));
    return true;
   }
   const requirements=[...(quest.requiresFlags||[]),...(progress?.known&&progress.available?target?.missingFlags||[]:[])];
   for(const required of requirements)if(visit(required,depth+1))return true;
  }
  return false;
 }
 for(const flag of flags)visit(flag,0);
 return [...found.values()];
}
phase(55,(v,s,selection,c)=>{if(v.route.status!=='no-transition')return;const chain=areaRoute(s,v.target.areaId,{areas:[...c.areas.values()],includeLocked:true}),blocked=chain?.edges.find(edge=>!edge.ready),flags=(blocked?.requiresFlags||[]).filter(f=>!s.flags?.[f]),titles=knownPrerequisites(s,flags,c);v.route.status='blocked';v.route.reason=titles.length?'Сначала завершите: '+[...new Set(titles)].join(', ')+'.':'Путь пока закрыт. Продолжите известные задания и проверьте журнал.';v.route.points=[];});

phase(85,(v,s,selection,c)=>{if(v.waypoint?.kind==='exit'&&v.target?.areaId!==v.area.id){v.verb='Перейдите';v.hint='К выходу: '+v.waypoint.label+' → '+v.route.nextArea;v.destinationHint='Затем: '+v.target.label+' · '+(c.areas.get(v.target.areaId)?.title||'Область задания');}});

phase(21,(v,s,selection,c)=>{if(!selection.questId)return;const progress=c.model.questProgress(s,selection.questId);if(!progress?.known||!progress.available&&!progress.complete){v.selectionRejected=true;v.selectionHint='Выбранное задание пока недоступно. Отслеживается: '+v.quest.title;}});

phase(23,(v,s,selection,c)=>{const selected=selection.questId&&c.model.questProgress(s,selection.questId);if(selected?.known&&selected.complete)v.completionNotice='Завершено: '+selected.title;if(v.quest?.complete){v.complete=true;v.target=null;v.waypoint=null;v.route={status:'complete',points:[],areas:[]};}});

phase(56,(v,s,selection,c)=>{if(!v.target||v.target.ready!==false||v.target.areaId!==s.areaId)return;const titles=knownPrerequisites(s,v.target.missingFlags||[],c);v.targetBlockedHint=titles.length?'Для этой цели сначала: '+[...new Set(titles)].join(', ')+'.':'Цель пока недоступна. Проверьте текущий этап в журнале.';v.route.status='blocked-target';v.route.reason=v.targetBlockedHint;});
phase(71,v=>{if(v.targetBlockedHint){v.route.status='blocked-target';v.route.points=[];v.route.reason=v.targetBlockedHint;}});

phase(30,(v,s,selection,c)=>{v.quests=c.model.questList(s).filter(q=>q.known&&q.available&&!q.complete).map(q=>({id:q.id,title:q.title}));});

export function areaMapMarkers(area,state,targetId=null) {
 const entries=(list,kind)=>(list||[]).map(item=>({...item,kind:item.type||kind}));
 const npcs=entries(area.npcs,'npc').filter(npc=>!state.party?.some(hero=>npc.id.startsWith(hero.id+'_')));
 const objects=[...npcs,...entries(area.nodes,'inspect'),...entries(area.encounters,'encounter'),...entries(area.exits,'exit')];
 const active=objects.filter(object=>object.id!==targetId && !(object.forbidFlags||[]).some(f=>state.flags?.[f]) &&
   !(state.defeated||[]).includes(object.id) && !(state.claimed||[]).includes('node:'+object.id) &&
   (object.kind==='exit'||allowed(state,object)));
 return [...(area.layout?.landmarks||[]),...active.map(object=>({
   id:object.id,x:object.x,z:object.z,
   label:object.label||object.name||(object.kind==='encounter'?CONTENT.ENEMIES[object.enemies?.[0]]?.name:null)||object.id,
   kind:object.smith?'smith':object.kind==='npc'&&object.shop?'merchant':object.boss?'boss':object.kind,
   locked:!allowed(state,object),
 }))];
}

phase(35,(v,s,selection,c)=>{
 const area=c.areas.get(s.areaId);
 if(area?.layout){v.landmarks=areaMapMarkers(area,s,v.target?.id);return;}
 const near=c.model.nearby(s).filter(o=>availableObject(s,o)&&['npc','camp','exit','shop'].includes(o.kind));
 const exits=(area?.exits||[]).filter(o=>allowed(s,o)).map(o=>({...o,kind:'exit'}));
 v.landmarks=[...new Map([...near,...exits].filter(o=>o.id!==v.target?.id).map(o=>[o.id,{id:o.id,x:o.x,z:o.z,label:o.label||o.name||o.id,kind:o.kind==='shop'||o.kind==='npc'&&o.shop?'merchant':o.kind}])).values()].slice(0,16);
});

export function directionName(from,to){if(!to)return '';const angle=(Math.atan2(to.x-from.x,-(to.z-from.z))*180/Math.PI+360)%360;return ['север','северо-восток','восток','юго-восток','юг','юго-запад','запад','северо-запад'][Math.round(angle/45)%8];}
phase(105,v=>{v.direction=v.arrived?'вы у цели':directionName(v.player,v.waypoint?.approach||(v.target?.areaId===v.area.id?v.target:null));});








