// Pure quest-arrow geometry/controller. No model, save, navigation-service or DOM imports.
const STEPS=[],FINALS=[];
const stage=(order,run)=>STEPS.push({order,run}),finish=(order,run)=>FINALS.push({order,run});
const finite=Number.isFinite;
const label=value=>typeof value==='string'?value:'';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const normalize=angle=>((angle%360)+360)%360;
function bump(metrics,key){metrics[key]=Math.min(Number.MAX_SAFE_INTEGER,(metrics[key]||0)+1);}
function halt(frame,status,reason=''){frame.output.status=status;frame.output.reason=reason;frame.output.visible=false;frame.output.canPoint=false;frame.halted=true;}
function snapshot(view,options){return {visible:false,status:'moving',canPoint:true,angle:0,anchor:{x:0,y:0},key:[label(options.runId),label(options.areaId),label(view.quest?.id),label(view.waypoint?.id)].join(':'),questId:view.quest?.id||null,questTitle:label(view.quest?.title),targetId:view.waypoint?.id||null,targetLabel:label(view.waypoint?.label),hint:label(view.hint),reason:label(view.route?.reason),distance:null,distanceLabel:'',isTransition:false,nextArea:'',destinationHint:label(view.destinationHint),stepChanged:!!view.stepChanged,selectionHint:label(view.selectionHint),completionNotice:label(view.completionNotice),canInteract:false,reducedMotion:!!options.reducedMotion,compact:false};}
export function createQuestArrowNavigator(){
 const steps=[...STEPS].sort((a,b)=>a.order-b.order),finals=[...FINALS].sort((a,b)=>a.order-b.order);
 const state={angle:null,key:null,layoutCache:null},metrics={updates:0,resets:0,projectionCalls:0,projectionErrors:0,layoutSearches:0,layoutCacheHits:0,rejectedInputs:0};
 function reset(){state.angle=null;state.key=null;state.layoutCache=null;bump(metrics,'resets');}
 return {metrics,reset,update(view,options={}){view=view&&typeof view==='object'?view:{};options=options&&typeof options==='object'?options:{};bump(metrics,'updates');const frame={view,options,state,metrics,output:snapshot(view,options),halted:false,waypoint:view.waypoint||null,position:options.position,aim:null,playerScreen:null,aimScreen:null,rawAngle:null};for(const step of steps)if(!frame.halted)step.run(frame);for(const step of finals)step.run(frame);return frame.output;}};
}
stage(0,f=>{const waypoint=f.waypoint;if(!waypoint||waypoint.areaId!==f.options.areaId){halt(f,'no-target','Выберите доступное задание.');return;}f.aim=waypoint.approach?{x:waypoint.approach.x,z:waypoint.approach.z}:{x:waypoint.x,z:waypoint.z};});

stage(-60,f=>{if(!f.position||!finite(f.position.x)||!finite(f.position.z)){f.invalidPosition=true;halt(f,'waiting','Ожидаем свежую позицию отряда.');}});

stage(-10,f=>{const route=f.view.route;if(route?.status==='ready')return;const blocked=['blocked','blocked-target','unreachable','no-transition'].includes(route?.status);if(!blocked&&!f.waypoint&&!f.view.target)return;halt(f,blocked?'blocked':'waiting',label(route?.reason)||(blocked?'Путь пока недоступен. Продолжите известное задание.':'Маршрут обновляется.'));});

stage(12,f=>{if(f.waypoint.ready===true)return;halt(f,f.waypoint.ready===false?'blocked':'waiting',label(f.view.targetBlockedHint)||label(f.view.route?.reason)||(f.waypoint.ready===false?'Сначала выполните условие выбранного задания.':'Проверяем доступность цели.'));});

stage(-80,f=>{const v=f.view,o=f.options,hasWaypoint=!!v.waypoint;if(v.runId!==undefined&&v.runId!==o.runId||v.area?.id!==undefined&&v.area.id!==o.areaId||hasWaypoint&&(!label(v.runId)||!label(o.runId)||!label(o.areaId))){f.stale=true;halt(f,'waiting','Обновляем маршрут для текущей области.');}});

stage(-70,f=>{if(f.view.complete||f.view.quest?.complete||f.view.route?.status==='complete')halt(f,'complete',label(f.view.completionNotice)||'Задание завершено.');});

stage(16,f=>{const points=f.view.route?.points;if(!Array.isArray(points)||!points.length)return;const end=points.at(-1),expected=f.waypoint.approach||f.waypoint,tolerance=f.waypoint.approach?.x!==undefined ? .75 : Math.max(.75,Number(f.waypoint.radius)||3.4);if(!end||!finite(end.x)||!finite(end.z)||!finite(expected.x)||!finite(expected.z)||distance(end,expected)>tolerance){halt(f,'waiting','Обновляем путь к выбранной точке.');}});

function routeProgress(position,points,lookahead=3.5){let best=null;for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz,t=length2?Math.max(0,Math.min(1,((position.x-a.x)*dx+(position.z-a.z)*dz)/length2)):0,q={x:a.x+dx*t,z:a.z+dz*t},gap=distance(position,q);if(!best||gap<best.gap-1e-8)best={index:i,point:q,gap};}if(!best)return null;let remaining=best.gap,aim=null,budget=lookahead,from=best.point;for(let i=best.index+1;i<points.length;i++){const to=points[i],length=distance(from,to);remaining+=length;if(!aim&&length>=budget&&length>0)aim={x:from.x+(to.x-from.x)*budget/length,z:from.z+(to.z-from.z)*budget/length};if(!aim)budget-=length;from=to;}return {...best,remaining,aim:aim||{...points.at(-1)}};}
stage(20,f=>{const points=f.view.route?.points;if(!Array.isArray(points)||points.length<2)return;const progress=routeProgress(f.position,points);if(progress){f.progress=progress;f.aim=progress.aim;f.output.aim={...progress.aim};}});

stage(-55,f=>{const waypoint=f.waypoint;if(!waypoint||waypoint.areaId!==f.options.areaId)return;f.output.isTransition=waypoint.kind==='exit'&&f.view.target?.areaId!==f.options.areaId;f.output.targetId=waypoint.id||null;f.output.targetLabel=label(waypoint.label);if(f.output.isTransition){f.output.nextArea=label(f.view.route?.nextArea);f.output.destinationHint=label(f.view.destinationHint);f.output.hint='К выходу: '+f.output.targetLabel+(f.output.nextArea?' → '+f.output.nextArea:'');}});

stage(14,f=>{const points=f.view.route?.points;if(!Array.isArray(points)||points.length<2||points.some(p=>!p||!finite(p.x)||!finite(p.z))){halt(f,'waiting','Маршрут обновляется.');}});

function projected(f,point){if(typeof f.options.project!=='function')return null;bump(f.metrics,'projectionCalls');try{const value=f.options.project({x:point.x,z:point.z});if(!value||!finite(value.x)||!finite(value.y)){bump(f.metrics,'projectionErrors');return null;}return {x:value.x,y:value.y,visible:value.visible!==false};}catch{bump(f.metrics,'projectionErrors');return null;}}
stage(30,f=>{if(typeof f.options.project!=='function'){halt(f,'waiting','Карта мира обновляется.');return;}const p=projected(f,f.position),a=projected(f,f.aim);if(!p||!a){halt(f,'waiting','Ожидаем видимость пути.');return;}f.playerScreen=p;f.aimScreen=a;f.rawAngle=normalize(Math.atan2(a.x-p.x,-(a.y-p.y))*180/Math.PI);f.output.angle=f.rawAngle;});





stage(32,f=>{if(Math.hypot(f.aimScreen.x-f.playerScreen.x,f.aimScreen.y-f.playerScreen.y)<2)halt(f,'waiting','Уточняем точку взаимодействия.');});

stage(-50,f=>{const w=f.waypoint,radius=finite(w?.radius)&&w.radius>0?w.radius:3.4;if(f.view.arrived===true&&w?.areaId===f.options.areaId&&w.ready===true&&finite(w.x)&&finite(w.z)&&distance(f.position,w)<=radius){f.output.canInteract=true;f.output.distance=0;f.output.distanceLabel='У цели';halt(f,'arrived','Рядом · E — взаимодействовать');}});

stage(24,f=>{if(f.progress){if(!finite(f.progress.remaining)){f.output.distance=null;f.output.distanceLabel='';halt(f,'waiting','Уточняем длину маршрута.');return;}f.output.distance=Math.max(0,Math.ceil(f.progress.remaining));f.output.distanceLabel='≈'+f.output.distance+' шаг.';}});

export function angularDifference(from,to){return ((normalize(to)-normalize(from)+540)%360)-180;}
stage(40,f=>{const raw=f.rawAngle,dt=f.delta??f.options.dt??1/60;if(f.state.angle===null||f.snap)f.state.angle=raw;else f.state.angle=normalize(f.state.angle+angularDifference(f.state.angle,raw)*(1-Math.exp(-dt*10)));f.output.angle=f.state.angle;});

stage(38,f=>{const dt=f.options.dt;f.delta=finite(dt)?Math.max(0,Math.min(.1,dt)):1/60;});

stage(39,f=>{f.snap=!!f.options.reducedMotion;f.output.reducedMotion=f.snap;});

function footprint(anchor,size){return {x:anchor.x-size/2,y:anchor.y-size/2,width:size,height:size};}
function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function hideLayout(f,reason){f.output.visible=false;f.output.canPoint=false;f.output.layoutReason=reason;if(f.output.status==='moving'){f.output.status='waiting';f.output.reason=reason;}}
finish(20,f=>{if(f.output.status==='hidden'||f.layoutDisabled)return;const viewport=f.options.viewport;if(!viewport||!finite(viewport.width)||!finite(viewport.height)||viewport.width<=0||viewport.height<=0){hideLayout(f,'Ожидаем размер окна игры.');return;}const size=f.markerSize??f.options.markerSize??86,insets=f.options.safeInsets||{},inset=(key)=>finite(insets[key])?Math.max(0,insets[key]):8,bounds={left:inset('left')+size/2,right:viewport.width-inset('right')-size/2,top:inset('top')+size/2,bottom:viewport.height-inset('bottom')-size/2};f.markerSize=size;f.output.markerSize=size;f.output.markerWidth=size;f.output.markerHeight=size;f.bounds=bounds;if(bounds.left>bounds.right||bounds.top>bounds.bottom){hideLayout(f,'Для указателя пока нет свободного места.');return;}if(!f.playerScreen){if(!f.position||!finite(f.position.x)||!finite(f.position.z)||typeof f.options.project!=='function')return;f.playerScreen=projected(f,f.position);}if(!f.playerScreen)return;const direction=f.output.canPoint&&finite(f.output.angle)?f.output.angle:0,radians=direction*Math.PI/180,offset=Math.max(size*.8,44),preferred={x:f.playerScreen.x+Math.sin(radians)*offset,y:f.playerScreen.y-Math.cos(radians)*offset};f.preferred=preferred;f.output.anchor={x:clamp(preferred.x,bounds.left,bounds.right),y:clamp(preferred.y,bounds.top,bounds.bottom)};f.output.footprint=footprint(f.output.anchor,size);f.output.visible=true;});

function overlap(a,b){return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
function expanded(rect,pad=2){return {x:rect.x-pad,y:rect.y-pad,width:rect.width+pad*2,height:rect.height+pad*2};}
function fits(f,anchor,obstacles){const b=f.bounds;return anchor.x>=b.left&&anchor.x<=b.right&&anchor.y>=b.top&&anchor.y<=b.bottom&&!obstacles.some(r=>overlap(footprint(anchor,f.markerSize),r));}
function findFreeAnchor(f,obstacles){bump(f.metrics,'layoutSearches');const b=f.bounds,half=f.markerSize/2,p=f.preferred,xs=new Set([b.left,b.right,clamp(p.x,b.left,b.right)]),ys=new Set([b.top,b.bottom,clamp(p.y,b.top,b.bottom)]);for(const r of obstacles){xs.add(clamp(r.x-half,b.left,b.right));xs.add(clamp(r.x+r.width+half,b.left,b.right));ys.add(clamp(r.y-half,b.top,b.bottom));ys.add(clamp(r.y+r.height+half,b.top,b.bottom));}const xValues=[...xs].sort((a,b)=>Math.abs(a-p.x)-Math.abs(b-p.x)||a-b).slice(0,64),yValues=[...ys].sort((a,b)=>Math.abs(a-p.y)-Math.abs(b-p.y)||a-b).slice(0,64);let best=null,bestScore=Infinity;for(const x of xValues)for(const y of yValues){const q={x,y},score=(x-p.x)**2+(y-p.y)**2;if(score>bestScore||!fits(f,q,obstacles))continue;if(score<bestScore||!best||x<best.x||x===best.x&&y<best.y){best=q;bestScore=score;}}return best;}
finish(30,f=>{if(!f.output.visible||f.layoutDisabled)return;const raw=f.options.obstacles??[];if(!Array.isArray(raw)){hideLayout(f,'Уточняем свободное место для указателя.');return;}const obstacles=[];for(const r of raw){if(r==null)continue;if(![r.x,r.y,r.width,r.height].every(finite)||r.width<0||r.height<0){hideLayout(f,'Уточняем свободное место для указателя.');return;}if(r.width&&r.height)obstacles.push(expanded(r));}if(fits(f,f.output.anchor,obstacles))return;const layoutKey=JSON.stringify([f.bounds,f.markerSize,obstacles,Math.round(f.preferred.x/8),Math.round(f.preferred.y/8)]);let anchor;if(f.state.layoutCache?.key===layoutKey&&f.state.layoutCache.anchor&&fits(f,f.state.layoutCache.anchor,obstacles)){bump(f.metrics,'layoutCacheHits');anchor={...f.state.layoutCache.anchor};}else{anchor=findFreeAnchor(f,obstacles);f.state.layoutCache={key:layoutKey,anchor:anchor?{...anchor}:null};}if(!anchor){hideLayout(f,'Для указателя пока нет свободного места.');return;}f.output.anchor=anchor;f.output.footprint=footprint(anchor,f.markerSize);});

finish(10,f=>{const viewport=f.options.viewport||{},short=finite(viewport.height)&&viewport.height<=460,portrait=finite(viewport.width)&&viewport.width<=760;f.output.compact=short||portrait;f.output.shortViewport=short;f.markerSize=f.options.markerSize??(short?52:portrait?68:86);});

finish(15,f=>{if(f.output.status==='hidden')return;const size=f.markerSize??f.options.markerSize??86;if(!finite(size)||size<52||size>160){f.layoutDisabled=true;f.output.markerSize=f.output.shortViewport?52:f.output.compact?68:86;hideLayout(f,'Уточняем размер указателя.');return;}f.markerSize=Math.ceil(size);});

stage(-100,f=>{if(f.options.enabled===false||f.options.suspended){if(f.state.angle!==null||f.state.key!==null||f.state.layoutCache!==null){f.state.angle=null;f.state.key=null;f.state.layoutCache=null;bump(f.metrics,'resets');}halt(f,'hidden','');}});

stage(-95,f=>{const points=f.view.route?.points,obstacles=f.options.obstacles;if(Array.isArray(points)&&points.length>256||Array.isArray(obstacles)&&obstacles.length>64){f.layoutDisabled=true;bump(f.metrics,'rejectedInputs');halt(f,'waiting','Навигация обновляется.');}});
stage(-90,f=>{const w=f.waypoint,key=JSON.stringify([label(f.options.runId),label(f.options.areaId),label(f.view.quest?.id),label(w?.id),w?.approach?.x??w?.x??null,w?.approach?.z??w?.z??null]);f.output.key=key;if(f.state.key!==key){f.state.angle=null;f.state.layoutCache=null;f.state.key=key;bump(f.metrics,'resets');}});
finish(100,f=>{if(!f.output.canPoint)f.state.angle=null;});
