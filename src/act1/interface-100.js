// Read-only UI adapters. Commands are passed by main; no model state is mutated here.
import {statusDescription as modelStatusDescription,itemStatLine,resistanceDeltaCopy,damageResistanceCopy} from './ui-feedback.js?v=campaign-170';
import {isEquipmentKind,SLOT_LABELS,RESISTANCE_LABELS} from './equipment-slots.js?v=campaign-150';
import {POWER_LABELS} from './hero-attributes.js?v=campaign-170';
export const features=[];
export function decorate(root,surface,d){if(root._ui100Marker?.parentNode===root)return;for(const f of features)if(f.surface===surface)f.apply(root,d);const marker=d.el('span','ui100-render-boundary');marker.hidden=true;root.append(marker);root._ui100Marker=marker;}
export function applyFeature(id,root,d){const f=features.find(f=>f.id===id);if(!f)throw Error('Unknown UI feature '+id);f.apply(root,d);}
function feature(id,surface,apply){features.push({id,surface,apply});}
const alive=entry=>entry.hp>0;
const q=(root,selector)=>root.querySelector(selector),qa=(root,selector)=>[...root.querySelectorAll(selector)];
function line(d,value,cls='ui100-line',width=600){const n=d.el('div',cls,d.text(value,width,13,'#e5ce9b'));n.ariaLabel=String(value);return n;}
function press(n,callback){n.tabIndex=0;n.role='button';n.classList.add('ui100-interactive');n.onclick=callback;n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();callback();}};}
function rows(d,title,lines,cls='ui100-summary'){return d.el('section',cls,line(d,title,'ui100-title'),...lines.filter(Boolean).map(t=>line(d,t)));}
function disclosure(d,title,lines,cls){const box=d.el('details',cls),head=d.el('summary','',d.text(title,300,13,'#e5ce9b',true));box.dataset.disclosure='ui100:'+title;head.dataset.focusKey='ui100:'+title;box.append(head,...lines.filter(Boolean).map(t=>line(d,t,'ui100-line',320)));return box;}
function actorNames(d){return {...d.partyDefs,...Object.fromEntries((d.state.battle?.enemies||[]).map(e=>[e.uid,{name:d.enemyDefs[e.kind]?.name||e.kind}]))};}

// Cards, queue and keyboard share this read-only targeting policy.
export function battleTargetScope(state,target,{M,SKILLS={},itemDefs={}}={}){
 if(!target||['attack','items'].includes(target.kind))return 'enemy';
 if(target.kind==='skill')return M?.availableSkills?.(state,state.battle?.activeHeroId).find(skill=>skill.id===target.skillId)?.target||SKILLS[target.skillId]?.target||(target.ally?'ally':null);
 if(target.kind==='item'){const item=itemDefs[state.bag[target.slot]?.defId],effect=item?.effect||item?.use;return effect?.kind==='allHeal'?'allAllies':M?.previewUseItem?.(state,target.slot)?.scope||'ally';}
 return null;
}
export function battleTargetEligibility(state,target,side,id,locked=false,deps={}){
 const reject=reason=>({ok:false,reason});
 if(locked||state.mode!=='battle'||!state.battle)return reject('');
 const scope=battleTargetScope(state,target,deps);
 if(['allEnemies','allAllies','self'].includes(scope))return reject('Это действие не требует выбора отдельной цели.');
 if(side==='enemy'){
  if(scope!=='enemy')return reject('Это действие применяется к спутнику справа.');
  if(!state.battle.enemies.some(e=>e.uid===id&&e.hp>0))return reject('Выберите живого противника.');
 }else{
  if(scope!=='ally')return reject('Выберите противника.');
  const hero=state.party.find(h=>h.id===id);if(!hero)return reject('Выберите спутника.');
  if(target?.kind==='item'&&deps.M?.previewUseItem){const forecast=deps.M.previewUseItem(state,target.slot,id);return forecast.canCommit?{ok:true,scope,side}:reject(forecast.reason||forecast.message);}
  const effect=deps.SKILLS?.[target?.skillId]?.kind;
  if(hero.hp<=0&&effect!=='revive')return reject('Выберите живого спутника.');
  if(hero.hp>0&&effect==='revive')return reject('Искра возвращает только павших спутников.');
 }
 if(target?.kind==='skill'&&deps.M?.battlePreview){const forecast=deps.M.battlePreview(state,{kind:'skill',skillId:target.skillId},id);if(forecast.ok===false||forecast.canCommit===false)return reject(forecast.reason||forecast.message);}
 return {ok:true,scope,side};
}
export function queueEnemyChoice(state,id,locked=false,target=null,deps={}){return battleTargetEligibility(state,target,'enemy',id,locked,deps).ok?id:null;}
feature(21,'hud',(root,d)=>{for(const n of qa(root,'.turn-entry.enemy')){const id=n.dataset.actorId;if(queueEnemyChoice(d.state,id,d.ui.presentationLock,d.ui.target,d))press(n,()=>d.targetEnemy(id));}});


export function queueAllyChoice(state,target,id,locked=false,deps={}){return battleTargetEligibility(state,target,'party',id,locked,deps).ok?id:null;}
feature(22,'hud',(root,d)=>{for(const n of qa(root,'.turn-entry.party')){const id=n.dataset.actorId;if(queueAllyChoice(d.state,d.ui.target,id,d.ui.presentationLock,d))press(n,()=>d.targetHero(id));}});
export function battleTargetSelected(state,ui,side,id,deps={}){
 if(!ui.target||!state.battle)return false;
 const scope=battleTargetScope(state,ui.target,deps);
 if(side==='enemy')return (scope==='allEnemies'||scope==='enemy'&&ui.enemyId===id)&&state.battle.enemies.some(enemy=>enemy.uid===id&&enemy.hp>0);
 const hero=state.party.find(hero=>hero.id===id);if(!hero)return false;
 if(scope==='allAllies')return hero.hp>0;
 if(scope==='self')return id===state.battle.activeHeroId;
 return scope==='ally'&&ui.allyId===id&&battleTargetEligibility(state,ui.target,side,id,false,deps).ok;
}
export function battleChoicePrompt(state,ui,pending,deps={}){
 const scope=battleTargetScope(state,ui.target,deps);
 if(['allEnemies','allAllies','self'].includes(scope))return pending?'Действие готово. Подтвердите применение.':'Отдельная цель не требуется. Проверьте доступность действия.';
 return pending?'Цель выбрана. Подтвердите применение.':scope==='ally'?'Выберите спутника справа.':ui.target?.kind==='items'?'Выберите припас.':'Выберите противника на поле или его номер.';
}
export function armSkill(ui,skill){ui.target={kind:'skill',skillId:skill.id,ally:skill.target==='ally'};if(skill.target!=='enemy')ui.enemyId=null;ui.allyId=null;}


export function targetHealthForecast(hp,maxHp,target){if(!target||!['damage','heal','allHeal','revive'].includes(target.effect))return null;const min=Number(target.min??target.max??0),max=Number(target.max??target.min??0),damage=target.effect==='damage';const low=Math.max(0,Math.min(maxHp,damage?hp-max:hp+min)),high=Math.max(0,Math.min(maxHp,damage?hp-min:hp+max));return {low,high,before:hp,maxHp,beforePercent:100*hp/maxHp,afterPercent:100*low/maxHp,label:'HP после: '+Math.ceil(low)+(low!==high?'–'+Math.ceil(high):'')+' / '+maxHp};}
function healthForecastNode(d,value){const n=rows(d,value.label,[],'ui100-health-forecast'),meter=d.el('div','ui100-hp-track'),before=d.el('i','ui100-hp-before'),after=d.el('i','ui100-hp-after');before.style.width=value.beforePercent+'%';after.style.width=value.afterPercent+'%';meter.append(before,after);n.append(meter);return n;}
feature(23,'hud',(root,d)=>{const action=d.pendingBattleAction();if(!action||!d.state.battle||d.ui.presentationLock)return;const preview=action.kind==='item'?d.M.previewUseItem(d.state,action.slot,action.targetId):d.M.battlePreview(d.state,action,action.targetId);const enemies=d.state.battle.enemies.filter(alive);qa(root,'.battle-targets .paint-button').forEach((n,i)=>{const e=enemies[i],target=preview.targets?.find(t=>t.id===e?.uid),v=e&&targetHealthForecast(e.hp,e.maxHp||d.enemyDefs[e.kind]?.hp||1,target);if(v)n.append(healthForecastNode(d,v));});});


feature(24,'hud',(root,d)=>{const action=d.pendingBattleAction();if(!action||!d.state.battle||d.ui.presentationLock)return;const preview=action.kind==='item'?d.M.previewUseItem(d.state,action.slot,action.targetId):d.M.battlePreview(d.state,action,action.targetId);qa(root,'.party-card').forEach((n,i)=>{const h=d.state.party[i],st=h&&d.M.stats(d.state,h.id),t=preview.targets?.find(t=>t.id===h?.id),v=h&&targetHealthForecast(h.hp,st.maxHp,t);if(v)n.append(healthForecastNode(d,v));});});


export function threatLines(info,names={}){
 if(!info)return [];
 const range=target=>[ (names[target.id]?.name||target.id)+': '+target.min+'–'+target.max+' HP',damageResistanceCopy(target)].filter(Boolean).join(' · ');
 if(info.effectiveIntent!=='all'&&info.scenarios?.length){
  const heading=info.guaranteed?'Цель определена по текущему состоянию.':'Один из живых героев; диапазоны для каждого сценария.';
  return [heading,...info.scenarios.map((scenario,index)=>'Сценарий '+(index+1)+': '+scenario.targets.filter(t=>t.effect==='damage').map(t=>range(t)+(t.redirected?' · прикрытие':'')).join(' · '))];
 }
 return (info.targets||[]).filter(t=>t.effect==='damage').map(t=>range(t)+(t.guaranteed?' · неизбежная цель':' · возможная цель'));
}
feature(25,'hud',(root,d)=>{if(!d.state.battle)return;const id=d.ui.enemyId||d.state.battle.enemies.find(e=>e.hp>0)?.uid,info=d.M.enemyThreatPreview(d.state,id);if(info?.effectiveIntent==='heavy'){const box=q(root,'.battle-intel')||q(root,'.battle-panel');box?.append(disclosure(d,'! Тяжёлый удар', [...threatLines(info,actorNames(d)),'Оценка текущего состояния: действия и статусы до хода врага могут изменить угрозу.'],'ui100-summary ui100-threat'));q(box||root,'summary')?.append(d.text(' ! ',30,13,'#edc280',true));}});


feature(26,'hud',(root,d)=>{if(!d.state.battle)return;const threats=d.state.battle.enemies.filter(alive).map(e=>d.M.enemyThreatPreview(d.state,e.uid)).filter(t=>t?.effectiveIntent==='all');if(threats.length)(q(root,'.battle-intel')||q(root,'.battle-panel'))?.append(disclosure(d,'!! Угроза всему отряду',threats.flatMap(t=>[t.name,...threatLines(t,actorNames(d)),'Оценка до хода врага; защита и статусы могут изменить результат.']),'ui100-summary ui100-threat'));});


export function intentCopy(info,names={}){if(!info)return 'Намерение неизвестно';const type={attack:'Атака',heavy:'Тяжёлый удар',all:'Удар по отряду',guard:'Защита',heal:'Лечение',skip:'Ход пропущен'}[info.effectiveIntent]||'Неизвестно';return type+' · '+(info.targetIds||[]).map(id=>names[id]?.name||id).join(', ')+' · '+(info.guaranteed?'цель определена':'цель может измениться')+' · '+(info.reason||'Следующее действие по текущему состоянию');}
feature(27,'hud',(root,d)=>{if(!d.state.battle)return;const intel=q(root,'.battle-intel');for(const e of d.state.battle.enemies.filter(alive)){const v=d.M.enemyIntentInfo(d.state,e.uid);intel?.append(line(d,(d.enemyDefs[e.kind]?.name||e.kind)+' · '+intentCopy(v,actorNames(d)),'ui100-intent',280));}});


export function bossPhaseCopy(info){
 if(!info?.boss)return null;
 const imminent=info.transitionPending?'Следующий раунд: фаза '+(info.nextPhase??info.activePhase+1):null;
 const threshold=Number.isFinite(info.nextThreshold)?'Следующая фаза ниже '+Math.round(info.nextThreshold*100)+'% HP':null;
 const initiative=info.resistsWeaknessBreak?'Инициатива '+info.initiative+(info.nextInitiative?' → '+info.nextInitiative:''):null;
 const power=Math.round(info.damageMultiplier*100)/100;
 return ['Фаза '+info.activePhase,info.phaseLabel,imminent||threshold,'Урон ×'+power,initiative,info.resistsWeaknessBreak?'Стойкость к сбиванию от стихии':null].filter(Boolean).join(' · ');
}
feature(28,'hud',(root,d)=>{if(!d.state.battle)return;for(const e of d.state.battle.enemies.filter(alive)){const copy=bossPhaseCopy(d.M.bossPhaseInfo(d.state,e.uid));if(copy)q(root,'.battle-intel')?.append(line(d,copy,'ui100-boss-phase',280));}});


export function statusLifecycleCopy(entry){if(entry.lifecycle)return modelStatusDescription([entry]);const remaining=entry.remaining??entry.duration??entry.turns??null;const boundary=entry.expiresAt||entry.expiryBoundary||entry.durationUnit||entry.lifecycle?.expiresAt||entry.lifecycle?.boundary||'';return (entry.label||entry.name||entry.id)+(remaining!==null?' · '+remaining+' '+(entry.unit||entry.durationUnit||'ход.'):entry.value!==undefined?' · '+entry.value:'')+(boundary?' · '+boundary:'')+(entry.expiresAfter?' · '+entry.expiresAfter:'');}
function statusStrip(d,entries){const box=d.el('div','ui100-status-strip');for(const e of entries){const n=line(d,'◆ '+statusLifecycleCopy(e),'ui100-status',190);n.setAttribute('role','img');n.ariaLabel=statusLifecycleCopy(e);box.append(n);}return box;}
feature(29,'hud',(root,d)=>{if(!d.state.battle)return;qa(root,'.party-card').forEach((n,i)=>{const h=d.state.party[i],statuses=h?d.M.statusInfo(d.state,h.id):[];if(statuses.length)n.append(statusStrip(d,statuses));});});


feature(30,'hud',(root,d)=>{if(!d.state.battle)return;const e=d.state.battle.enemies.find(e=>e.uid===d.ui.enemyId)||d.state.battle.enemies.find(alive);if(e){const entries=d.M.statusInfo(d.state,e.uid);if(entries.length)q(root,'.battle-intel')?.append(rows(d,'Состояния выбранной цели',entries.map(statusLifecycleCopy),'ui100-summary ui100-enemy-status'));}});


export function armUtility(ui,kind){ui.target={kind};ui.enemyId=null;ui.allyId=null;}
export function battleShortcut(e,d){if(targetArrowShortcut(e,d))return true;if(e.code==='KeyD'||e.code==='KeyF'){if(e.code==='KeyF'&&(d.state.battle.boss||d.state.battle.forced))return false;armUtility(d.ui,e.code==='KeyD'?'defend':'flee');d.redraw();return true;}if(e.code==='KeyA'){d.chooseAttack();return true;}if(e.code==='Enter'&&d.pendingBattleAction()){d.battle(d.pendingBattleAction());return true;}const n=Number(e.code?.match(/^Digit([1-6])$/)?.[1]);if(n){const skill=d.M.availableSkills(d.state,d.state.battle.activeHeroId)[n-1];if(skill)d.selectSkill(skill);return !!skill;}return false;}
feature(31,'hud',(root,d)=>{if(d.state.battle)q(root,'.battle-actions')?.append(line(d,'A — атака · D — защита · F — отступить · 1–6 — навыки · Enter — подтвердить','ui100-hotkeys',540));});


export function adjacentTarget(enemies,current,direction){const ids=enemies.filter(alive).map(e=>e.uid);if(!ids.length)return null;let index=ids.indexOf(current);if(index<0)return direction<0?ids.at(-1):ids[0];return ids[(index+direction+ids.length)%ids.length];}
export function targetArrowShortcut(event,d){
 if(!['ArrowLeft','ArrowRight'].includes(event.code)||!d.ui.target)return false;
 const scope=battleTargetScope(d.state,d.ui.target,d),side=scope==='ally'?'party':scope==='enemy'?'enemy':null;
 if(!side||['items','defend','flee'].includes(d.ui.target.kind))return false;
 const candidates=(side==='party'?d.state.party:d.state.battle?.enemies||[]).filter(actor=>battleTargetEligibility(d.state,d.ui.target,side,side==='party'?actor.id:actor.uid,d.ui.presentationLock,d).ok);
 const ids=candidates.map(actor=>side==='party'?actor.id:actor.uid),current=side==='party'?d.ui.allyId:d.ui.enemyId,direction=event.code==='ArrowLeft'?-1:1,index=ids.indexOf(current);
 const id=index<0?(direction<0?ids.at(-1):ids[0]):ids[(index+direction+ids.length)%ids.length];
 if(!id)return false;
 (side==='party'?d.targetHero:d.targetEnemy)(id);return true;
}
feature(32,'hud',(root,d)=>{const scope=battleTargetScope(d.state,d.ui.target,d);if(d.state.battle&&d.ui.target&&['enemy','ally'].includes(scope)&&d.ui.target.kind!=='items')q(root,'.battle-targets')?.append(line(d,'← / → — выбрать подходящую цель','ui100-target-keys',320));});


export function skillTooltip(skill){return skill.name+' · '+(skill.mp??skill.cost??0)+' MP';}
feature(33,'hud',(root,d)=>{if(!d.state.battle)return;for(const n of qa(root,'.hud50-skill')){const id=n.dataset.focusKey?.replace(/^skill:/,''),skill=d.SKILLS[id];if(!skill)continue;const tip=d.el('span','combat-tooltip',d.text(skillTooltip(skill),260,13,'#f5d99e',true));tip.id='ui100-skill-tip-'+id;tip.role='tooltip';tip.ariaLabel=skillTooltip(skill);n.setAttribute('aria-describedby',tip.id);n.append(tip);}});


export function utilityCopy(kind){return kind==='defend'?{title:'Защита: подтвердите расход одного хода',detail:'Снижает входящий урон на 58% до следующего хода героя. Выбор ещё не потратил ход.'}:null;}
feature(34,'battle-info',(root,d)=>{const copy=utilityCopy(d.ui.target?.kind);if(copy){q(root,'.combat-info-copy')?.replaceChildren(line(d,copy.title),line(d,copy.detail));}});


export function fleeCopy(battle){return battle.boss||battle.forced?'Отступление недоступно в этом сюжетном бою.':'Попытка отступления потратит ход и может не удаться. Подтвердите или отмените.';}
feature(35,'battle-info',(root,d)=>{if(d.ui.target?.kind==='flee')q(root,'.combat-info-copy')?.replaceChildren(line(d,'Отступление: подтверждение'),line(d,fleeCopy(d.state.battle)));});


export function logCategory(value){const s=String(value).toLocaleLowerCase('ru');return /урон|удар|атак|повред/.test(s)?'damage':/леч|здоров|защит|ман|возрод|барьер|усил/.test(s)?'support':'events';}
export function filteredBattleLog(log,filter='all'){return log.map((value,index)=>({value,index,category:logCategory(value)})).filter(r=>filter==='all'||r.category===filter);}
feature(36,'hud',(root,d)=>{if(!d.state.battle)return;const log=q(root,'.battle-log');if(!log)return;const head=q(log,'summary'),filter=d.ui.battleLogFilter||'all',controls=d.el('div','ui100-log-filters');for(const [id,label]of [['all','Всё'],['damage','Урон'],['support','Поддержка'],['events','События']]){const b=d.button(label,()=>{d.ui.battleLogFilter=id;d.redraw();},{small:true,width:95,focusKey:'log-filter:'+id});b.setAttribute('aria-pressed',String(filter===id));controls.append(b);}const entries=d.el('div','ui100-log-entries');entries.dataset.disclosure='ui100-log-body';for(const row of filteredBattleLog(d.state.battle.log,filter))entries.append(line(d,row.value,'ui100-log-entry',320));log.replaceChildren(head,controls,entries);});


export function readingPosition(node){return {top:node.scrollTop,follow:node.scrollHeight-node.clientHeight-node.scrollTop<=12};}
export function restoreReading(node,snapshot){if(!snapshot)return;node.scrollTop=snapshot.follow?node.scrollHeight:snapshot.top;}
feature(37,'hud',(root,d)=>{const n=q(root,'.ui100-log-entries');if(!n)return;const key=d.state.runId+':'+d.state.battle.encounterId,entry=d.ui.logReading?.key===key?d.ui.logReading:null;n.onscroll=()=>{const reading=readingPosition(n);d.ui.logReading={key,...reading,count:reading.follow?d.state.battle.log.length:entry?.count??d.state.battle.log.length};};});


export function followNewLog(ui,node,count,key){node.scrollTop=node.scrollHeight;ui.logReading={key,top:node.scrollTop,follow:true,count};}
feature(38,'hud',(root,d)=>{const n=q(root,'.ui100-log-entries'),log=q(root,'.battle-log');if(!n||!log)return;const key=d.state.runId+':'+d.state.battle.encounterId,seen=d.ui.logReading?.key===key?d.ui.logReading.count:d.state.battle.log.length,unread=Math.max(0,d.state.battle.log.length-seen);log.append(d.button('К новым записям'+(unread?' · +'+unread:''),()=>followNewLog(d.ui,n,d.state.battle.log.length,key),{small:true,width:280,focusKey:'log-new'}));});


export function additionalEffectCopy(effect,names={}){const name=names[effect.targetId]?.name||effect.targetName||effect.targetId||'',before=typeof effect.current==='object'?effect.current?.amount:effect.current,after=typeof effect.after==='object'?effect.after?.amount:effect.after,delta=typeof effect.delta==='object'?effect.delta?.amount:effect.delta,duration=effect.after?.duration??effect.duration;return (name?name+' · ':'')+(effect.label||effect.id||'Эффект')+(before!==undefined&&after!==undefined?' · '+before+' → '+after:'')+(Number.isFinite(delta)?' ('+(delta>0?'+':'')+delta+')':'')+(duration!==undefined&&duration!==null?' · срок '+duration+' ход.':'')+(effect.current?.duration!==undefined&&effect.after?.duration!==undefined?' · срок '+effect.current.duration+' → '+effect.after.duration:'')+(effect.willApply===false?' · Не наложится: '+effect.blockedReason:'');}
feature(39,'battle-info',(root,d)=>{const action=d.pendingBattleAction();if(!action||action.kind==='item'||!d.state.battle)return;const effects=d.M.battlePreview(d.state,action,action.targetId).additionalEffects||[];if(effects.length)q(root,'.combat-info-copy')?.append(rows(d,'Изменения эффектов',effects.map(e=>additionalEffectCopy(e,actorNames(d))),'ui100-summary ui100-effect-delta'));});


export function rewardSummaryLines(summary,names={}){if(!summary)return [];return ['Золото: +'+(summary.gold||0),'Опыт: +'+(summary.xp||0)+' на героя до предела уровня',...(summary.xpByHero||[]).map(h=>(names[h.heroId]?.name||h.heroId)+' · Получено XP: '+h.amount),...(summary.items||[]).map(i=>(i.name||names[i.id]?.name||i.id||i.defId)+' ×'+i.qty+(i.pending?' · ожидает места: '+i.pending:'')+(i.delivered!==undefined?' · получено: '+i.delivered:'')),summary.pendingQuantity?'Не поместилось: '+summary.pendingQuantity:null,summary.message||null];}
feature(40,'hud',(root,d)=>{if(d.state.battle)return;const summary=d.M.battleRewardSummary(d.state);if(summary&&d.ui.dismissedBattleReward!==summary.encounterId){const box=disclosure(d,'Награды последнего боя',rewardSummaryLines(summary,{...d.partyDefs,...d.itemDefs}),'ui100-summary ui100-postbattle');box.append(d.button('Скрыть итог боя',()=>{d.ui.dismissedBattleReward=summary.encounterId;box.remove();},{small:true,width:230,focusKey:'reward-dismiss'}));root.append(box);}});


export function dragAnchor(event,rect){return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/Math.max(1,rect.width))),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height)))};}
export function dragPreviewPosition(event,anchor,rect){return {x:event.clientX-anchor.x*rect.width,y:event.clientY-anchor.y*rect.height};}


export function edgeScrollDelta(y,rect,margin=48){return y<rect.top+margin?-Math.ceil(16*Math.min(1,(rect.top+margin-y)/margin)):y>rect.bottom-margin?Math.ceil(16*Math.min(1,(y-rect.bottom+margin)/margin)):0;}
export function autoScrollDrag(container,event){if(!container||container.scrollHeight<=container.clientHeight)return 0;const delta=edgeScrollDelta(event.clientY,container.getBoundingClientRect()),before=container.scrollTop;container.scrollTop=Math.max(0,Math.min(container.scrollHeight-container.clientHeight,before+delta));return container.scrollTop-before;}


export function responsiveGridColumns(grid,window){const columns=window.getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);return Math.max(1,columns[0]==='none'?1:columns.length);}
export function gridDestination(index,key,total,columns){const start=Math.floor(index/columns)*columns,end=Math.min(total-1,start+columns-1);return Math.max(0,Math.min(total-1,key==='Home'?start:key==='End'?end:key==='ArrowLeft'?index-1:key==='ArrowRight'?index+1:key==='ArrowUp'?index-columns:key==='ArrowDown'?index+columns:index));}
export function bindBagGrid(grid,ui,window){
 grid.role='group';grid.ariaLabel='Ячейки сумки · стрелки и Home/End';
 const cells=qa(grid,'.item-slot');
 const active=Math.max(0,cells.findIndex(n=>n.dataset.location===ui.gridFocus));
 cells.forEach((cell,index)=>{
   cell.tabIndex=index===active?0:-1;
   cell.onfocus=()=>{
     ui.gridFocus=cell.dataset.location;
     cells.forEach((candidate,i)=>{candidate.tabIndex=i===index?0:-1;});
   };
   cell.onkeydown=event=>{
     if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
     event.preventDefault();
     const next=cells[gridDestination(index,event.key,cells.length,responsiveGridColumns(grid,window))];
     next.focus();next.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
   };
 });
}
feature(43,'inventory',(root,d)=>{const grid=q(root,'.bag-grid');if(grid)bindBagGrid(grid,d.ui,d.window);});


export function validGearTargets(state,selected,locations,preview){if(!selected)return [];return locations.filter(loc=>loc.kind==='gear'&&preview(state,selected.from,loc).ok);}
feature(44,'inventory',(root,d)=>{if(!d.ui.selected)return;for(const n of qa(root,'.gear-slot')){const loc=JSON.parse(n.dataset.location),valid=d.M.previewMoveItem(d.state,d.ui.selected.from,loc).ok;n.classList.toggle('ui100-valid-gear',valid);if(valid)n.ariaLabel+=' · Можно надеть выбранный предмет';}});


export function equipmentResourceRisks(compare,hero){if(!compare?.ok)return [];const out=[];for(const type of ['hp','mp']){const after=compare.resourceAfter[type],current=hero[type];if(after<current)out.push('! После смены '+type.toUpperCase()+': '+Math.ceil(current)+' → '+Math.ceil(after)+' · потеря '+Math.ceil(current-after));}return out;}
export function equipmentMoveResourceRisks(forecast,names={}){if(!forecast?.ok)return [];return (forecast.heroes||[]).flatMap(hero=>equipmentResourceRisks({ok:true,resourceAfter:hero.currentAfter},hero.currentBefore).map(warning=>(names[hero.id]?.name||hero.id)+' · '+warning));}
feature(45,'inventory',(root,d)=>{const selected=d.ui.selected,item=selected&&d.locationItem(selected.from),def=d.itemDefs[item?.defId],hero=d.state.party.find(h=>h.id===d.ui.hero);if(!item||!hero||!isEquipmentKind(def?.kind))return;const forecast=d.M.previewMoveItem(d.state,selected.from,{kind:'gear',heroId:hero.id,slot:def.kind}),warnings=equipmentMoveResourceRisks(forecast,d.partyDefs);if(warnings.length)q(root,'.item-detail')?.append(rows(d,'Проверьте запас здоровья и маны',warnings,'ui100-summary ui100-gear-risk'));});
export function selectInventoryHero(state,ui,id,validSelection){if(!state.party.some(hero=>hero.id===id))return false;ui.hero=id;if(ui.selected&&!validSelection(state,ui.selected)){ui.selected=null;ui.detail=null;}return true;}


function shopProducts(d){const npc=d.areaDefs[d.state.areaId]?.npcs?.find(n=>n.id===d.ui.shop);return (npc?.shop||npc?.shopItems||[]).map(e=>typeof e==='string'?e:e.id);}
export function equipmentDeltaCopy(compare){
 if(!compare?.ok)return compare?.reason||'Этот герой не может носить предмет';
 const delta={...compare.delta};
 if(delta.maxHp!==undefined)delete delta.hp;
 if(delta.maxMp!==undefined)delete delta.mp;
 if(delta.initiative!==undefined)delete delta.speed;
 return itemStatLine({stats:Object.fromEntries(Object.entries(delta).filter(([,value])=>value))})||'Характеристики без изменений';
}
feature(46,'shop',(root,d)=>{if(d.ui.windowShopMode==='sell')return;const hero=d.state.party.find(h=>h.id===d.ui.shopHero)||d.state.party[0];d.ui.shopHero=hero.id;const selector=d.el('div','window-tabs ui100-shop-heroes');for(const h of d.state.party){const b=d.button('Сравнить: '+d.partyDefs[h.id].name,()=>{d.ui.shopHero=h.id;d.renderModal();},{small:true,width:200,focusKey:'shop-hero:'+h.id});b.setAttribute('aria-pressed',String(h.id===hero.id));selector.append(b);}root.append(selector);const products=shopProducts(d);qa(root,'.shop-entry').forEach((n,i)=>{const item=d.itemDefs[products[i]];if(item&&isEquipmentKind(item.kind)){const c=d.M.equipmentComparison(d.state,item.id,hero.id);n.append(rows(d,'Сравнение · '+d.partyDefs[hero.id].name,[equipmentDeltaCopy(c),resistanceDeltaCopy(c.before,c.after),...equipmentResourceRisks(c,hero)],'ui100-summary ui100-shop-compare'));}});});


export function replacementCopy(compare,defs){return !compare?.ok?compare?.reason||'Недоступно':'Слот: '+(SLOT_LABELS[compare.slot]||compare.slot)+' · Сейчас: '+(defs[compare.currentItemId]?.name||'Пустой слот')+' → Товар: '+(defs[compare.itemId]?.name||compare.itemId);}
feature(47,'shop',(root,d)=>{if(d.ui.windowShopMode==='sell')return;const products=shopProducts(d),hero=d.ui.shopHero||d.state.party[0].id;qa(root,'.shop-entry').forEach((n,i)=>{const item=d.itemDefs[products[i]];if(item&&isEquipmentKind(item.kind))n.append(line(d,replacementCopy(d.M.equipmentComparison(d.state,item.id,hero),d.itemDefs),'ui100-shop-replacement',500));});});


export function riskSaleKey(quote,quantity){return [quote.revision,quote.uid,quantity].join(':');}
export function confirmRiskSale(ui,quote,quantity,commit,redraw){const warnings=quote.warnings||[],key=riskSaleKey(quote,quantity);if(warnings.length&&ui.riskSale!==key){ui.riskSale=key;redraw();return false;}ui.riskSale=null;commit();return true;}
feature(48,'shop',(root,d)=>{if(d.ui.windowShopMode!=='sell')return;const items=d.state.bag.map((item,index)=>({item,index})).filter(({item})=>item&&d.itemDefs[item.defId]?.kind!=='quest');qa(root,'.shop-entry').forEach((n,i)=>{const entry=items[i];if(!entry)return;const qty=d.ui.windowShopQuantities?.['sell:'+entry.item.uid]||1,quote=d.M.previewSell(d.state,d.ui.shop,entry.index,qty);for(const warning of quote.warnings||[])n.append(line(d,'! '+warning.message,'ui100-sale-warning',500));if(d.ui.riskSale===riskSaleKey(quote,qty)){const b=qa(n,'button').find(b=>b.dataset.focusKey?.startsWith('sell:'));if(b){b.replaceChildren(d.text('Подтвердить продажу',220,14,'#f3d69e',true));b.ariaLabel='Подтвердить продажу последнего припаса возрождения';}n.append(line(d,'Продажа не выполнена. Ещё одно нажатие подтверждает известный риск.'));}});});


export function purchaseCapacityCopy(quote){return 'По золоту: '+quote.maxAffordable+' шт. · Поместится: '+quote.maxFit+' шт.'+(quote.maxFit===0?' · ! Нет места в сумке':quote.maxAffordable===0?' · ! Не хватает золота':'');}
feature(49,'shop',(root,d)=>{if(d.ui.windowShopMode==='sell')return;const ids=shopProducts(d);qa(root,'.shop-entry').forEach((n,i)=>{if(ids[i])n.append(line(d,purchaseCapacityCopy(d.M.previewBuy(d.state,d.ui.shop,ids[i])),'ui100-shop-capacity',500));});});


export function selectedTransferCopy(selected,item,defs,heroes){if(!selected||!item)return null;const from=selected.from,source=from.kind==='bag'?'Сумка · ячейка '+(from.index+1):(heroes[from.heroId]?.name||from.heroId)+' · '+(SLOT_LABELS[from.slot]||from.slot);return 'Выбран: '+(defs[item.defId]?.name||item.defId)+' ×'+item.qty+' · Источник: '+source;}
feature(50,'inventory',(root,d)=>{const s=d.ui.selected,item=s&&d.locationItem(s.from),copy=selectedTransferCopy(s,item,d.itemDefs,d.partyDefs);if(!copy)return;root.append(d.el('div','ui100-selection',line(d,copy),d.button('Отменить выбор предмета',()=>{d.cancelDrag();d.ui.selected=null;d.ui.detail=null;d.renderModal();},{small:true,width:320,focusKey:'inventory-cancel-selection'})));});


export function pendingRewardLines(info,defs){return !info?.quantity?[]:[...(info.items||[]).map(i=>(defs[i.id]?.name||i.id)+' ×'+i.qty+' · Можно забрать: '+i.claimable),'Ожидает: '+info.quantity+' · Поместится сейчас: '+info.claimableQuantity+' · Останется: '+info.remainingQuantity,info.reason||''];}
feature(51,'inventory',(root,d)=>{const info=d.M.pendingRewardInfo(d.state);if(info.quantity)root.append(rows(d,'Отложенные припасы',pendingRewardLines(info,d.itemDefs),'ui100-summary ui100-pending'));});


export function dropActionKind(forecast,source,target,defs){if(!forecast.ok)return 'invalid';if(!target)return 'move';const def=defs[source?.defId]||{},max=isEquipmentKind(def.kind)?1:Math.max(1,Math.min(999,def.stackMax||def.maxStack||99));return target.defId===source?.defId&&max>1&&forecast.source?.kind!=='gear'&&forecast.target?.kind!=='gear'?'merge':'swap';}
export function dropPreviewCopy(forecast,source,target,defs){if(!forecast.ok)return 'Нельзя перенести: '+(forecast.reason||forecast.message);const action={merge:'Объединить стопки',swap:'Обменять предметы',move:'Переместить предмет'}[dropActionKind(forecast,source,target,defs)];return action+' · '+(defs[source.defId]?.name||source.defId)+' ×'+source.qty+(target?' · '+(defs[target.defId]?.name||target.defId)+' ×'+target.qty:'');}
feature(52,'inventory',(root,d)=>{if(!d.ui.selected)return;const live=d.el('div','ui100-drop-preview');live.role='status';live.ariaLive='polite';root.append(live);for(const n of qa(root,'.item-slot')){const loc=JSON.parse(n.dataset.location),show=()=>{const from=d.ui.selected?.from;if(!from)return;const source=d.locationItem(from);if(!source)return;const forecast=d.M.previewMoveItem(d.state,from,loc),copy=dropPreviewCopy(forecast,source,d.locationItem(loc),d.itemDefs);live.replaceChildren(line(d,copy));n.ariaDescription=copy;};n.onfocus=show;n.onpointerenter=show;}});


export function revivalSupplyLines(info,names={}){if(!info)return [];return ['Соль пробуждения: '+info.quantity+' · Павших: '+info.fallenIds.length,info.hasReadySkill?'Магическое возрождение доступно сейчас':'Готового заклинания возрождения сейчас нет',...info.skillMethods.map(m=>(names[m.heroId]?.name||m.heroId)+' · '+m.cost+' MP'+(m.mpShortfall?' · не хватает '+m.mpShortfall+' MP':'')+(m.ready?' · готово':' · '+m.reason))];}
for(const surface of ['inventory','shop'])feature(53,surface,(root,d)=>root.append(rows(d,'Запас возрождения',revivalSupplyLines(d.M.revivalSupplyInfo(d.state),d.partyDefs),'ui100-summary ui100-revival-supply')));


export function areaMapView(state, defs, completion) {
  const areas = Object.values(defs), rows = Math.ceil(areas.length / 3);
  const nodes = areas.map((area, index) => {
    const known = completion(state, area.id)?.known || area.id === state.areaId;
    const row = Math.floor(index / 3), column = row % 2 ? 2 - index % 3 : index % 3;
    return { id: area.id, label: known ? area.title : 'Неизвестная область', known,
      current: area.id === state.areaId, x: 17 + column * 33, y: (row + .5) * 100 / rows };
  });
  const byId = Object.fromEntries(nodes.map(node => [node.id, node])), edges = [];
  for (const area of areas) for (const exit of area.exits || []) {
    if (!byId[exit.target]?.known || !byId[area.id].known) continue;
    const open = (exit.requiresFlags || []).every(flag => state.flags[flag]) &&
      !(exit.forbidFlags || []).some(flag => state.flags[flag]);
    edges.push({ from: area.id, to: exit.target, open });
  }
  return { nodes, edges, rows };
}
feature(54, 'map', (root, d) => {
  const graph = areaMapView(d.state, d.areaDefs, d.M.areaCompletion);
  const box = d.el('div', 'ui100-act-map');
  box.role = 'group';
  box.ariaLabel = 'Карта связей между областями кампании';
  box.style.minHeight = graph.rows * 100 + 'px';
  const svg = d.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('ui100-map-edges');
  for (const edge of graph.edges) {
    const a = graph.nodes.find(node => node.id === edge.from), b = graph.nodes.find(node => node.id === edge.to);
    const path = d.document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M ' + a.x + ' ' + a.y + ' L ' + b.x + ' ' + b.y);
    path.dataset.from = edge.from;
    path.dataset.to = edge.to;
    path.classList.add(edge.open ? 'ui100-edge-open' : 'ui100-edge-closed');
    svg.append(path);
  }
  box.append(svg);
  for (const node of graph.nodes) {
    const selected = d.ui.mapAreaId === node.id;
    const button = d.button((node.current ? 'Здесь · ' : selected ? 'Выбрано · ' : '') + node.label, () => {
      d.ui.mapAreaId = node.id;
      saveUIPreferences(d.storage, d.state.runId, d.ui);
      d.renderModal();
    }, { small: true, width: 230, focusKey: 'map-area:' + node.id, ariaLabel: node.label + (node.current ? ' · текущая область' : '') });
    button.dataset.areaId = node.id;
    button.classList.add('ui100-map-node');
    button.classList.toggle('unknown', !node.known);
    button.style.left = node.x + '%';
    button.style.top = node.y + '%';
    button.setAttribute('aria-pressed', String(selected));
    box.append(button);
  }
  root.append(box, line(d, 'Сплошная линия показывает открытый путь. Пунктир показывает закрытый. Исследуйте незнакомые области, чтобы открыть их на карте.', 'ui100-map-legend', 880));
});


export function knownAreaPath(graph,from,to){if(!graph.nodes.some(n=>n.id===to&&n.known))return [];const queue=[[from]],seen=new Set([from]);while(queue.length){const path=queue.shift(),last=path.at(-1);if(last===to)return path;for(const e of graph.edges.filter(e=>e.open&&e.from===last)){const next=e.from===last?e.to:e.from;if(!seen.has(next)){seen.add(next);queue.push([...path,next]);}}}return [];}
function mapObjective(d){const requested=d.ui.windowMapQuestId?d.M.questProgress(d.state,d.ui.windowMapQuestId):null;return requested?.known?requested:d.M.currentObjective(d.state,d.ui.trackedQuestId);}
feature(55,'map',(root,d)=>{const objective=mapObjective(d),graph=areaMapView(d.state,d.areaDefs,d.M.areaCompletion),destination=objective?.target?.areaId,path=destination?knownAreaPath(graph,d.state.areaId,destination):[];d.ui.mapPath=path;for(const edge of qa(root,'path'))if(path.some((id,i)=>i<path.length-1&&(id===edge.dataset.from&&path[i+1]===edge.dataset.to||id===edge.dataset.to&&path[i+1]===edge.dataset.from)))edge.classList.add('ui100-edge-route');root.append(rows(d,'Путь к известной цели · '+(objective?.title||'Выберите задание'),[path.length?path.map(id=>d.areaDefs[id].title).join(' → '):'Открытый известный путь пока не найден. Проверьте известные предпосылки задания.'],'ui100-summary ui100-map-path'));});


export function knownPrerequisiteLines(record){return !record?[]:(record.prerequisites||[]).map(p=>(p.complete?'✓ Выполнено: ':'◇ Требуется: ')+p.title);}
feature(56,'map',(root,d)=>{const objective=mapObjective(d),record=d.M.journalNavigationTargets(d.state).find(q=>q.questId===objective?.id);const lines=knownPrerequisiteLines(record);if(lines.length)root.append(rows(d,'Известные предпосылки',lines,'ui100-summary ui100-map-prerequisites'));else if(objective?.target?.ready===false)root.append(line(d,'Путь пока закрыт. Следуйте известным задачам; дополнительные условия ещё не раскрыты.','ui100-map-prerequisites',880));});


export function areaCompletionLines(info){if(!info?.known)return ['Область ещё неизвестна. Её содержимое не раскрыто.'];return ['Известные бои: '+info.encounters.resolved+' / '+info.encounters.total,'Известные объекты: '+info.nodes.resolved+' / '+info.nodes.total,'Известные задания: '+info.quests.completed+' / '+info.quests.total,(info.complete?'✓ Известное содержимое завершено':'◇ Остались известные дела')+' · '+info.percent+'%','Счётчики относятся только к уже раскрытому содержимому.'];}
feature(57,'map',(root,d)=>{const info=d.M.areaCompletion(d.state,d.ui.mapAreaId||d.state.areaId);root.append(rows(d,info.known?'Область · '+info.name:'Неизвестная область',areaCompletionLines(info),'ui100-summary ui100-area-completion'));});


feature(58,'journal',(root,d)=>{const targets=d.M.journalNavigationTargets(d.state).filter(q=>q.target),box=rows(d,'Известные ориентиры',[],'ui100-summary ui100-journal-targets');for(const record of targets){const b=d.button(record.title+' · '+record.target.label,()=>{openJournalTarget(d.ui,record.questId,record.target,d.storage,d.state.runId,d.openModal);},{small:true,width:650,focusKey:'journal-route:'+record.questId});box.append(b,...knownPrerequisiteLines(record).map(s=>line(d,s)));}if(targets.length)root.append(box);});


const preferenceKey=runId=>'ashen-act1-ui:'+runId;
export function openJournalTarget(ui,questId,target,storage,runId,openModal){if(!target?.areaId)return false;ui.windowMapQuestId=questId;ui.mapAreaId=target.areaId;saveUIPreferences(storage,runId,ui);openModal('map');return true;}
export function saveUIPreferences(storage,runId,ui){try{storage.setItem(preferenceKey(runId),JSON.stringify({trackedQuestId:ui.trackedQuestId||null,mapAreaId:ui.mapAreaId||null,mapQuestId:ui.windowMapQuestId||null}));return true;}catch{return false;}}
export function restoreUIPreferences(storage,state,ui,M,areas){if(ui.preferencesRun===state.runId)return;ui.preferencesRun=state.runId;let saved={};try{saved=JSON.parse(storage.getItem(preferenceKey(state.runId))||'{}')||{};}catch{}const quest=saved.trackedQuestId?M.questProgress(state,saved.trackedQuestId):null;ui.trackedQuestId=quest?.known&&!quest.complete&&quest.available?saved.trackedQuestId:null;const mapQuest=saved.mapQuestId?M.questProgress(state,saved.mapQuestId):null;ui.windowMapQuestId=mapQuest?.known?saved.mapQuestId:null;ui.mapAreaId=areas[saved.mapAreaId]&&M.areaCompletion(state,saved.mapAreaId).known?saved.mapAreaId:state.areaId;}


feature(60,'map',(root,d)=>root.append(line(d,'Выбранная известная область и цель карты запоминаются для этого прохождения.','ui100-map-preference',880)));


export function mapKeyboardIndex(index,key,total){return key==='Home'?0:key==='End'?total-1:key==='ArrowLeft'||key==='ArrowUp'?(index-1+total)%total:key==='ArrowRight'||key==='ArrowDown'?(index+1)%total:index;}
feature(61,'map',(root,d)=>{const nodes=qa(root,'.ui100-map-node'),active=Math.max(0,nodes.findIndex(n=>n.dataset.areaId===(d.ui.mapAreaId||d.state.areaId)));nodes.forEach((n,i)=>{n.tabIndex=i===active?0:-1;n.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const j=mapKeyboardIndex(i,e.key,nodes.length);nodes.forEach((c,k)=>c.tabIndex=k===j?0:-1);nodes[j].focus();};});});


export function milestoneLines(m){if(!m)return [];return m.nextUnlockLevel?['Ближайшая веха: уровень '+m.nextUnlockLevel+' · До неё '+m.xpToUnlock+' XP · Уровней: '+m.levelsAway,...m.skills.map(s=>s.name+' · '+(s.cost??s.mp??0)+' MP')]:['Все исходные навыки уже открыты.'];}
feature(62,'party',(root,d)=>{const growth=q(root,'.hero-growth');if(growth)growth.append(rows(d,'Открытие умений',milestoneLines(d.M.skillMilestone(d.state,d.ui.hero)),'ui100-summary ui100-milestone'));});


export function initiativeBreakdownCopy(info){if(!info)return '';const v=info.initiative;return 'Инициатива: база '+v.base+' + рост '+v.level+' + снаряжение '+v.gear+(v.talent?' + таланты '+v.talent:'')+(v.training?' + развитие '+v.training:'')+' = '+v.total+(v.roundingDelta?' · округление '+v.roundingDelta:'')+' · Порядок хода определяется инициативой.';}
feature(63,'party',(root,d)=>{const stats=q(root,'.hero-breakdown');if(stats)stats.append(line(d,initiativeBreakdownCopy(d.M.statBreakdown(d.state,d.ui.hero))));});


export function statBreakdownLines(info){
 if(!info)return [];
 const labels={maxHp:'HP',maxMp:'MP',atk:'Атака',def:'Защита',...POWER_LABELS,...RESISTANCE_LABELS};
 return Object.keys(labels).filter(key=>info.totals[key]!==undefined).map(key=>{
  const short={maxHp:'hp',maxMp:'mp'}[key]||key,value=source=>source?.[key]??source?.[short]??0;
  const talents=value(info.talents),training=value(info.attributes);
  const suffix=(Object.hasOwn(RESISTANCE_LABELS,key)||Object.hasOwn(POWER_LABELS,key))?'%':'';
  return labels[key]+': база '+value(info.base)+' + рост '+value(info.levelBonus)+' + снаряжение '+value(info.gearTotal)+(talents?' + таланты '+talents:'')+(training?' + развитие '+training:'')+' = '+info.totals[key]+suffix;
 });
}
feature(64,'party',(root,d)=>{const stats=q(root,'.hero-breakdown');if(stats)stats.append(...statBreakdownLines(d.M.statBreakdown(d.state,d.ui.hero)).map(s=>line(d,s)));});


export function recapLines(summary,defs={}){if(!summary)return [];return ['Вы здесь: '+(summary.area?.title||summary.area?.name||'Область'),summary.objective?'Цель: '+summary.objective.title:null,'Отряд: '+summary.party.map(h=>(defs[h.id]?.name||h.id)+' · '+h.level+' ур.'+(h.fallen?' · пал':'')).join(', '),'Золото: '+summary.gold+' · Ожидает припасов: '+summary.pendingRewards.quantity,'Известных заданий завершено: '+summary.quests.completed];}
feature(65,'menu',(root,d)=>{if(!d.menuState)return;const summary=d.M.runSummary(d.menuState),box=d.el('details','window-disclosure ui100-resume-recap');box.dataset.disclosure='ui100-recap';box.append(d.el('summary','',d.text('Вспомнить путь перед возвращением',330,15,'#e9ca91',true)),...recapLines(summary,d.partyDefs).filter(Boolean).map(s=>line(d,s,'ui100-line',330)));root.append(box);});


feature(66,'party',(root,d)=>{const info=d.M.revivalSupplyInfo(d.state);if(info.fallenIds.length)(q(root,'.party-overview')||root).append(rows(d,'Павших спутников: '+info.fallenIds.length,[info.fallenIds.map(id=>d.partyDefs[id]?.name||id).join(', '),...revivalSupplyLines(info,d.partyDefs),'Лагерь восстанавливает отряд бесплатно после возвращения к доступному лагерю.'],'ui100-summary ui100-party-recovery'));});


export function dialogueSpeakerView(state,defs,areas){const dialogue=defs[state.dialogue?.id];if(!dialogue)return null;const npc=areas[state.areaId]?.npcs?.find(n=>n.id===state.dialogue?.npcId||n.id===dialogue.npcId),line=dialogue.lines?.[Math.min(state.dialogue?.line||0,Math.max(0,(dialogue.lines?.length||1)-1))]||{speaker:npc?.name,text:''};return {speaker:line.speaker||npc?.name||'Собеседник',originalText:line.text||'',npc:!!npc};}
feature(67,'dialogue',(root,d)=>{const v=dialogueSpeakerView(d.state,d.dialogueDefs,d.areaDefs),row=q(root,'.dialogue-row');if(!v||!row)return;row.classList.add('ui100-speaker-active');row.role='group';row.ariaLabel='Говорит '+v.speaker+'. '+v.originalText;row.ariaLive='polite';row.ariaAtomic='true';row.append(line(d,'◆ Говорит: '+v.speaker,'ui100-speaker-cue',650));});


export function accessibleChoiceCopy(original,consequences){return original+(consequences?.ok&&consequences.message?' · Известные последствия: '+consequences.message:'');}
feature(68,'dialogue',(root,d)=>{const dialogue=d.dialogueDefs[d.state.dialogue?.id];if(!dialogue)return;const buttons=qa(root,'.window-choice-card button');for(const b of buttons){const id=b.dataset.focusKey?.split(':').at(-1),choice=dialogue.choices?.find(c=>c.id===id);if(choice){const consequences=d.M.choiceConsequences(d.state,id);b.ariaLabel=accessibleChoiceCopy(choice.text,consequences);b.ariaDescription=consequences.ok?consequences.message||'':'';}}});


for(const surface of ['party','menu'])feature(69,surface,(root,d)=>{const state=surface==='menu'?d.menuState:d.state;if(!state)return;const summary=d.M.runSummary(state),objective=summary.objective;if(!objective||summary.complete||['complete','dialogue'].includes(summary.mode)||objective.complete)return;(q(root,'.party-overview')||root).append(d.button('К текущей цели · '+objective.title,()=>{if(surface==='menu')d.openObjective(objective.id);else{d.ui.trackedQuestId=objective.id;d.ui.windowQuestFilter='active';d.openModal('journal');}},{small:true,width:surface==='menu'?320:650,focusKey:'current-objective'}));});


export function actSummaryLines(summary,pending,reward,defs){return [...recapLines(summary,defs),'Известные бои: '+summary.encounters.completed+' / '+summary.encounters.total,'Сумка: '+summary.bag.used+' / '+summary.bag.capacity,'Припасы возрождения: '+summary.revivalSupply.quantity,...pendingRewardLines(pending,defs),...(reward?['Последний бой (текущий сеанс)',...rewardSummaryLines(reward,defs)]:[])];}
feature(70,'complete',(root,d)=>{const summary=d.M.runSummary(d.state),pending=d.M.pendingRewardInfo(d.state),reward=d.M.battleRewardSummary(d.state);root.append(rows(d,'Точный итог путешествия',actSummaryLines(summary,pending,reward,{...d.partyDefs,...d.itemDefs}),'ui100-summary ui100-act-summary'));});

export function restoreAfterLayout(root,{state,ui}){const n=q(root,'.ui100-log-entries');if(!n||!state.battle)return;const key=state.runId+':'+state.battle.encounterId,snapshot=ui.logReading?.key===key?ui.logReading:null;restoreReading(n,snapshot);}
