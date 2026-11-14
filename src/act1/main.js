import {resolveInitialQuality} from './browser-performance.js?v=0.16.0-demo-mobile-default20261107';
import {createQuestArrow} from './quest-arrow-view.js?v=0.16.0-demo-webperf20261106';
import {approachTarget,areaBounds,planPath,validSegment} from './navigation.js?v=forged-meshy-0191';
import {createMinimap,createAreaSchematic} from './minimap.js?v=forged-meshy-0191';
import * as HUD50 from './hud-presentation.js?v=0.16.0-demo';
import * as UI100 from './interface-100.js?v=forged-019';
import {ownsMovementKey,ignoreGameShortcut,canBattleShortcut,canStartInventoryDrag,worldTapStart,worldTapComplete} from './input-policy.js?v=0.16.0-demo';
import {normalizeSettings,captureSurface,restoreSurface,captureDisclosures,restoreDisclosures,heroSummary,slotSummary,saveWarning,itemStatLine,feedbackSurface,normalizePresentationSettings,statusDescription,createAudioEventCursor,eventAudioCues,presentationAudioCue} from './ui-feedback.js?v=forged-019';
import * as M from './model.js?v=forged-meshy-0191';
import {PARTY,ITEMS,SKILLS,ENEMIES,AREAS,QUESTS,DIALOGUES,ENDINGS,ACT_INFO} from './content.js?v=forged-meshy-0191';
import {Saves} from './save.js?v=forged-meshy-0191';
import {World} from './world.js?v=groundcover-0192';
import {WriterSession} from './writer-session.js?v=0.16.0-demo';
import {Audio} from './act-audio.js?v=forged-019';
import {bridgeAt,riverSection} from './area-geometry.js?v=rivers-0181';
import {magicProfile} from './data/magic-profiles.js?v=forged-019';
import {durabilityLabel,durabilityMeter,itemRarity,renderChestLoot,renderSmithy} from './forged-ui.js?v=forged-019';
import {textImage,sprite,atlasCell,loadTypography} from './bitmap.js?v=painted-20261114-r2';

const $=id=>document.getElementById(id),list=v=>Array.isArray(v)?v:Object.values(v||{}),dict=v=>Object.fromEntries(list(v).map(x=>[x.id,x]));
const partyDefs=dict(PARTY),itemDefs=dict(ITEMS),areaDefs=dict(AREAS),dialogueDefs=dict(DIALOGUES),enemyDefs=dict(ENEMIES);
const audio=new Audio();let state=M.newGame(),saved=null,world,ready=false,running=false,paused=true,saving=false,saveRequested=false,readOnly=true,saveError=false,destination=null,approach=null,destinationPath=[],last=0,saveTime=0,hudTime=0,toastTimer,lastNotice='',lastHudSignature='';
let contextLost=false,contextRecovering=false,contextError='';
let saveFailure='',saveConflict=false,lastSavedAt='',loadFailed=false;
const presentationAudioReceipts=new WeakSet();
const audioEventCursor=createAudioEventCursor();audioEventCursor.prime(state);
let navigationMinimap=null,navigationUpdateTime=0,navigationView=null;
let questArrow=null,arrow50LayoutTime=Infinity,arrow50Obstacles=[],arrow50Viewport={width:0,height:0},arrow50Insets={},arrow50SafeProbe=null;
const keys=new Set(),ui={modal:null,hero:'alar',selected:null,detail:null,drag:null,target:null,dialogueId:null,line:0,shop:null,suppressClickUntil:0};
let settings={volume:.3,music:.8,sfx:.92,ambience:.72,textScale:1};try{settings={...settings,...JSON.parse(localStorage.getItem('ashen-oath-act1-settings')||'{}')};}catch{}
settings.quality=resolveInitialQuality(settings,globalThis.navigator);
settings={...normalizeSettings(settings),...normalizePresentationSettings(settings)};let appliedTextScale=settings.textScale;
const store=new Saves((kind,message)=>{if(kind==='error'){saveError=true;saveFailure=message;}setSaveStatus(message);});

const WRITER_WAIT='Игра открыта в другой вкладке. Закройте её — кнопки запуска здесь включатся автоматически.';
let writerRefresh=Promise.resolve(),writerRefreshSerial=0,startupError='',startupWarning='';
const writerSession=new WriterSession({onChange:writerChanged});
import {windowBagView,windowValidSelection,windowQuantity,windowOwnership,windowQuestView} from './interface-presentation.js?v=forged-019';

function windowDisclosure(key,label,...children){
  const box=el('details','window-disclosure'),head=el('summary','',text(label,600,17,'#e9ca91',true));
  box.dataset.disclosure=key;head.dataset.focusKey=key;box.append(head,...children);return box;
}

function windowSearch(value,onChange){
  const box=el('div','window-search'),input=document.createElement('input'),mirror=el('div','window-search-mirror');
  input.type='search';input.maxLength=80;input.value=value;input.ariaLabel='Поиск предмета по имени';input.dataset.focusKey='bag-search';input.autocomplete='off';input.spellcheck=false;
  const paint=()=>mirror.replaceChildren(text(input.value||'Введите имя предмета',400,15));paint();
  input.oninput=()=>onChange(input.value);input.onfocus=paint;input.onselect=paint;
  box.append(input,mirror);return box;
}

function nav50SelectQuest(id){const quest=M.questProgress(state,id);if(!quest?.known||quest.complete||!quest.available)return;ui.trackedQuestId=id;UI100.saveUIPreferences(localStorage,state.runId,ui);lastHudSignature='';renderHud();}
function nav50PreferredNearby(near){const objective=M.currentObjective?.(state,ui.trackedQuestId),target=objective?.target;let id=target?.areaId===state.areaId&&target.ready!==false?target.id:null;const view=navigationView;if(!id&&view?.runId===state.runId&&view.area?.id===state.areaId&&view.target?.id===target?.id&&view.target?.areaId===target?.areaId)id=view.waypoint?.id;const chosen=near.find(n=>n.id===id&&n.ready!==false);return chosen?[chosen,...near.filter(n=>n!==chosen)]:near;}
function nav50Mount(root){if(!navigationMinimap)navigationMinimap=createMinimap({el,text,button,onQuestSelect:nav50SelectQuest,onDetails:id=>{if(id)nav50SelectQuest(id);ui.windowQuestFilter='active';openModal('journal');}});root.append(navigationMinimap.element);nav50Update(0,true);}
function nav50Update(dt=0,force=false){if(!navigationMinimap)return;const visible=running&&!paused&&!contextLost&&!ui.modal&&state.mode==='explore';navigationMinimap.element.hidden=!visible;if(!visible)return;navigationUpdateTime+=dt;if(!force&&navigationUpdateTime<.15)return;navigationUpdateTime=0;navigationView=navigationMinimap.update(state,{questId:ui.trackedQuestId,textScale:settings.textScale,compact:(globalThis.innerWidth||1280)<=1000||(globalThis.innerHeight||720)<=460});}
function arrow50Mount(root){
 if(!questArrow)questArrow=createQuestArrow({el,text,button,onDetails:id=>{if(id)nav50SelectQuest(id);ui.windowQuestFilter='active';openModal('journal');}});
 root.append(questArrow.element);
 const controls=navigationMinimap?.element.querySelector('.nav50-controls');if(controls&&questArrow.controlElement)controls.append(questArrow.controlElement);
 if(!arrow50SafeProbe){arrow50SafeProbe=el('div','arrow50-safe-probe');Object.assign(arrow50SafeProbe.style,{position:'fixed',inset:'0',visibility:'hidden',pointerEvents:'none',padding:'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)'});}
 root.append(arrow50SafeProbe);arrow50LayoutTime=Infinity;
}
function arrow50Measure(dt=0){
 arrow50LayoutTime+=Number.isFinite(dt)?Math.max(0,dt):0;
 const width=globalThis.innerWidth||1280,height=globalThis.innerHeight||720;
 if(arrow50LayoutTime<.2&&arrow50Viewport.width===width&&arrow50Viewport.height===height)return;
 arrow50LayoutTime=0;arrow50Viewport={width,height};const root=$('actHud');arrow50Obstacles=[];
 for(const selector of ['.objective-panel','.hud-controls','.near-panel','.party-strip','.nav50-minimap']){const node=root.querySelector(selector);if(!node||node.hidden)continue;const r=node.getBoundingClientRect();if([r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0)arrow50Obstacles.push({x:r.x,y:r.y,width:r.width,height:r.height});}
 const css=arrow50SafeProbe&&globalThis.getComputedStyle?.(arrow50SafeProbe);arrow50Insets={top:Math.max(0,parseFloat(css?.paddingTop)||0),right:Math.max(0,parseFloat(css?.paddingRight)||0),bottom:Math.max(0,parseFloat(css?.paddingBottom)||0),left:Math.max(0,parseFloat(css?.paddingLeft)||0)};
}
function arrow50Update(dt=0){
 if(!questArrow)return;
 const active=ready&&!!world&&running&&!paused&&!contextLost&&!ui.modal&&!ui.presentationLock&&state.mode==='explore';
 if(active)arrow50Measure(dt);
 const plane=active?world.walkHeight(state.position.x,state.position.z)+.3:0;
 return questArrow.update({view:navigationView,runId:state.runId,areaId:state.areaId,position:state.position,project:point=>world.screen(point.x,plane,point.z),viewport:arrow50Viewport,obstacles:arrow50Obstacles,safeInsets:arrow50Insets,suspended:!active,reducedMotion:settings.reducedMotion,textScale:settings.textScale,dt});
}

function nav50EffectLines(preview){return (preview?.additionalEffects||[]).map(effect=>{const name=partyDefs[effect.targetId]?.name||enemyDefs[state.battle?.enemies.find(e=>e.uid===effect.targetId)?.kind]?.name;return (name?name+' · ':'')+(effect.label||'Дополнительный эффект');});}

function writerMessage(){return startupError||(writerSession.error?'Не удалось подключить сохранение. Повторите загрузку страницы.':WRITER_WAIT);}
function writerChanged(owned){
 const serial=++writerRefreshSerial;readOnly=true;
 if(!owned){if(ready){if(running)showMenu();renderMenu(writerMessage());}return;}
 writerRefresh=writerRefresh.catch(()=>{}).then(async()=>{
  if(serial!==writerRefreshSerial||!writerSession.owned)return;
  // Another tab may have saved while this tab waited. Reload its latest
  // committed revision before enabling any button that can write a new run.
  const latest=store.db?await store.load():saved;loadFailed=false;
  if(serial!==writerRefreshSerial||!writerSession.owned)return;
  saved=latest;if(latest)state=structuredClone(latest);else if(!running)state=M.newGame();audioEventCursor.prime(state);
  readOnly=false;ui.confirmNew=false;
  if(ready)renderMenu(saveError?'Автосохранение недоступно. Экспортируйте прохождение вручную.':'Путь готов. Начните историю или продолжите прохождение.');
 }).catch(error=>{if(serial!==writerRefreshSerial)return;saveError=true;loadFailed=true;readOnly=!writerSession.owned;startupError='Не удалось прочитать сохранение: '+error.message;if(ready)renderMenu(startupError);});
}


function el(tag,cls='',...children){const n=document.createElement(tag);n.className=cls;for(const c of children.flat())if(c)n.append(c);return n;}
function text(value,width=420,size=17,color='#eadfca',bold=false){return textImage(value,{width,size:size*settings.textScale,color,bold});}
function button(label,callback,{small=false,disabled=false,width=210,combatIcon=null,primary=false,ariaLabel=null,costBadge=null,textSize=null,iconOnly=false,hint=null,focusKey=null}={}){const b=el('button','paint-button'+(small?' small':'')+(primary?' combat-primary':''));if(combatIcon!==null){const icon=el('span','combat-icon combat-icon-'+combatIcon);icon.setAttribute('aria-hidden','true');b.append(icon);}if(iconOnly){b.classList.add('icon-only');const tip=el('span','combat-tooltip',text(label,150,13,'#f5d99e',true));tip.setAttribute('aria-hidden','true');b.append(tip);}else b.append(text(label,width,textSize??(small?14:17)));if(hint){const tip=el('span','combat-tooltip',text(hint,180,13,'#f5d99e',true));tip.setAttribute('aria-hidden','true');b.append(tip);}if(costBadge!==null){const badge=el('span','combat-cost',text(costBadge,45,11,'#f5d99e',true));badge.setAttribute('aria-hidden','true');b.append(badge);}b.dataset.focusKey=focusKey||ariaLabel||label;b.type='button';b.ariaLabel=ariaLabel||label;b.disabled=disabled;b.onclick=async()=>{if(b.disabled||b.dataset.pending)return;const wasDisabled=b.disabled;b.dataset.pending='true';b.disabled=true;try{audio.play('seal');await callback();}catch(error){toast('Действие не выполнено: '+(error?.message||error));}finally{delete b.dataset.pending;b.disabled=wasDisabled;}};return b;}
function panel(cell,cls='',...children){return atlasCell(el('section','panel '+cls,...children),cell);}
function portrait(index,cls=''){return sprite(Number(index)||0,'portraits',cls);}
function icon(def){const id=(def?.id||'').toLowerCase();let i=def?.icon;if(!Number.isInteger(i))i=/shield/.test(id)?1:/staff/.test(id)?2:/bow/.test(id)?3:/dagger/.test(id)?4:def?.kind==='armor'?(/robe/.test(id)?6:5):def?.kind==='charm'?7:/ether|mana/.test(id)?9:/reviv/.test(id)?10:/herb/.test(id)?11:def?.kind==='quest'?12:def?.kind==='material'?14:def?.kind==='consumable'?8:0;return sprite(i,'icons');}
function clearInput(){ui.worldTap=null;keys.clear();clearDestination();}
function toast(message){if(!message)return;const surface=feedbackSurface({modalOpen:!!ui.modal&&$('gameModal').open,paused});if(surface==='modal'){ui.modalNotice=message;const status=$('modalFeedback');if(status)status.replaceChildren(text(message,850,15,'#f3d69e',true));return;}if(surface==='menu'){ui.menuNotice=message;renderMenu();return;}clearTimeout(toastTimer);$('actToast').replaceChildren(text(message,Math.min(740,innerWidth-80),16));$('actToast').hidden=false;toastTimer=setTimeout(()=>$('actToast').hidden=true,4200);}
function setSaveStatus(message){const n=$('saveStatus');if(n)n.replaceChildren(text(message||'',250,12,'#a9b8a7'));}
async function save({retry=false}={}){if(!running||readOnly||loadFailed||saveConflict||saveError&&!retry)return false;if(saving){saveRequested=true;return false;}saving=true;let committed=false;try{const payload=M.snapshot(state);await store.write(payload);saved=payload;saveError=false;saveFailure='';lastSavedAt=new Date().toLocaleTimeString('ru-RU');committed=true;return true;}catch(error){saveError=true;saveFailure=error.message;saveConflict=error.code==='SAVE_CONFLICT';toast('Не удалось сохранить: '+error.message);return false;}finally{saving=false;saveTime=0;const again=saveRequested;saveRequested=false;if(again&&committed)void save();}}
async function retrySave(){if(saving||readOnly||saveConflict||loadFailed)return false;if(!store.db)try{await store.open();}catch(error){saveFailure=error.message;renderMenu('Не удалось снова открыть хранилище. Экспортируйте прогресс.');return false;}const ok=await save({retry:true});renderMenu(ok?'Прогресс записан. Автосохранение восстановлено.':'Прогресс пока не записан. Экспортируйте прохождение.');return ok;}
function commit(answer,{quiet=false,keepModal=false}={}){if(!answer)return;if(!answer.ok){toast(answer.message);return;}playModelAudio();if(!quiet)toast(answer.message);ui.selected=null;if(!keepModal)ui.detail=null;saveTime=6;syncMode();renderHud();if(ui.modal&&state.mode==='explore')renderModal();const notice=[...state.events].reverse().find(e=>['defeat','level','quest','recruit','victory'].includes(e.type));if(notice&&JSON.stringify(notice)!==lastNotice){lastNotice=JSON.stringify(notice);toast(notice.message);}void save();}
function playModelAudio(){
 const fresh=audioEventCursor.fresh(state),outsideBattle=!state.battle&&!ui.presentationLock;
 for(const cue of eventAudioCues(fresh.filter(event=>outsideBattle||event.type==='flee')))audio.play(cue);
 if(!outsideBattle)return;
 const chest=fresh.some(event=>event.type==='loot'&&event.nodeId);
 if(chest)audio.play('chest');
 else if(fresh.some(event=>event.type==='loot'))audio.play('loot');
 if(fresh.some(event=>event.type==='repair'))audio.play('repair');
 if(fresh.some(event=>event.type==='trade'))audio.play('coin');
}
function playPresentationCue(cue){
 if(cue.event&&presentationAudioReceipts.has(cue.event))return;
 const event=cue.event||{},profile=magicProfile(event);
 const special=(cue.kind==='action'&&event.skillId?.startsWith('forged_')&&['fire','ice','lightning','physical','ward'].includes(profile.family));
 const name=special?({physical:'slash',ward:'block'}[profile.family]||profile.family):presentationAudioCue(cue,SKILLS);
 if(!name)return;
 if(cue.event)presentationAudioReceipts.add(cue.event);
 audio.play(name);
 if((cue.kind||event.type)==='victory'&&event.rewardGrants?.some(reward=>reward.items?.length))audio.play('loot');
}

function updateAudioScene(){
 const covered=document.hidden||contextLost;
 const battle=state.mode==='battle'||!!ui.presentationLock;
 const mode=paused||covered?'menu':battle?'battle':state.mode;
 audio.setScene({mode,areaId:state.areaId,boss:!!(state.battle?.boss||world?.visualBattle?.boss)});
 if(mode!=='explore')audio.setWaterProximity(0);
}

let audioPosition=null,stepTravel=0,riverAudioTime=0;
function walkingAudio(dt,canWalk){
 if(!canWalk){audioPosition=null;stepTravel=0;riverAudioTime=0;return;}
 const {runId,areaId,position:{x,z}}=state,layout=areaDefs[areaId].layout;
 const from=audioPosition;
 audioPosition={runId,areaId,x,z};
 if(from?.areaId===areaId&&from.runId===runId){
  const distance=Math.hypot(x-from.x,z-from.z);
  if(distance<=1)stepTravel+=distance;
  else stepTravel=0;
  if(stepTravel>=1.58){
   const bridge=bridgeAt(layout,x,z);
   const surface=bridge?(bridge.style==='stone'?'stone':'wood'):
     areaId==='fen'?'mud':['briarwood','sunfields','village'].includes(areaId)?'soil':'stone';
   audio.footstep(surface);stepTravel=0;
  }
 }
 riverAudioTime-=dt;
 if(riverAudioTime>0&&from?.areaId===areaId)return;
 riverAudioTime=.18;
 let distance=Infinity;
 for(const river of layout.rivers||[]){
  const bank=riverSection(river,z);
  if(bank)distance=Math.min(distance,Math.max(0,bank.left-x,x-bank.right));
 }
 audio.setWaterProximity(Math.max(0,1-distance/16));
}
function isAllowed(value){return (!value.requiresFlags||value.requiresFlags.every(f=>state.flags[f]))&&(!value.forbidFlags||value.forbidFlags.every(f=>!state.flags[f]));}
function syncMode(){if(state.mode==='dialogue'){ui.dialogueId=state.dialogue?.id;ui.line=state.dialogue?.line||0;openModal('dialogue');}else if(state.mode==='complete')openModal('complete');else if(ui.modal==='dialogue'){closeModal(true);}if(state.mode!=='battle'){world?.requestCombatHover?.(null,null);ui.hoverEnemy=null;ui.target=null;ui.enemyId=null;ui.allyId=null;world?.setCombatSelection?.({});}}
function openModal(kind){if(ui.modal===kind&&$('gameModal').open)return;cancelDrag();clearInput();ui.modalNotice='';ui.modal=kind;world?.invalidateLayout?.();world?.requestCombatHover?.(null,null);renderModal();if(!$('gameModal').open)$('gameModal').showModal();}
function closeModal(force=false){if(!force&&(state.mode==='complete'||ui.modal==='complete'))return;cancelDrag();if(state.mode==='dialogue'&&!force){commit(M.cancelDialogue(state),{quiet:true});}ui.modal=null;ui.selected=null;ui.riskSale=null;world?.invalidateLayout?.();$('gameModal').close();clearInput();}
function modalFrame(title){const content=$('modalContent');content.replaceChildren();const close=button('Закрыть',()=>closeModal(),{small:true,width:110});if(state.mode==='complete')close.disabled=true;content.append(el('header','modal-header',text(title,700,27,'#ebd08e',true),close));const status=el('div','modal-feedback');status.id='modalFeedback';status.role='status';status.ariaLive='polite';status.ariaAtomic='true';if(ui.modalNotice)status.append(text(ui.modalNotice,850,15,'#f3d69e',true));content.append(status);const body=el('div','modal-body');body.dataset.scrollKey='modal-body';content.append(body);return body;}
function renderModal(){
 if(ui.drag||!ui.modal)return;
 const kind=ui.modal,modal=$('gameModal'),focusLabel=captureSurface(modal),disclosures=captureDisclosures(modal);
 const names={inventory:'Сумка и снаряжение',journal:'Журнал путешествия',map:'Дороги первого акта',party:'Спутники',dialogue:'Разговор',shop:'Торговля',smithy:'Кузница',chestLoot:'Добыча из сундука',complete:ACT_INFO.title,revival:'Возрождение спутника',about:'Об игре и лицензии'};
 const body=modalFrame(names[kind]||'Пепельная клятва');
 const renderers={inventory:renderInventory,journal:renderJournal,map:renderMap,party:renderParty,revival:renderRevival,
   dialogue:renderDialogue,shop:renderShop,smithy:renderSmith,complete:renderComplete,puzzle:renderPuzzle,about:renderAbout};
 if(kind==='chestLoot')renderChestLoot(body,{...ui.chestLoot,defs:itemDefs,el,text,button,icon,goToInventory:()=>openModal('inventory')});
 else renderers[kind]?.(body);
 restoreDisclosures(modal,disclosures);restoreHudFocus(modal,focusLabel);
}

function partyStatusText(hero){const status=state.battle?.status?.[hero.id]||{},tags=[];if(hero.hp<=0)tags.push('Пал');if(status.guard>0)tags.push('Защита');if(status.attack>0)tags.push('Усиление');if(status.taunt>0)tags.push('Провокация');return tags.join(' · ');}
function heroCard(hero,active=false,callback=null){const def=partyDefs[hero.id],st=M.stats(state,hero.id),compact=state.mode==='battle',values=el('div','party-values');if(compact)values.append(el('div','party-heading',text((active?'Ход: ':'')+def.name+' · '+hero.level+' ур.',148,13,'#e5cf9a',true)));else values.append(text(def.name,105,15,'#e5cf9a',true),text('Ур. '+hero.level,105,12));for(const [value,max,type] of [[hero.hp,st.maxHp,'hp'],[hero.mp,st.maxMp,'mp']]){const m=el('div','meter '+type),bar=el('i');bar.style.width=Math.max(0,value/max*100)+'%';m.append(bar);const amount=text(HUD50.vitalLabel(value,max,type),compact?105:120,compact?11:12);if(compact)values.append(el('div','party-vital',m,amount));else values.append(m,amount);}if(active&&!compact)values.append(text('Ваш ход',105,12,'#f7dc94',true));const conditions=(M.statusInfo&&state.mode==='battle'?statusDescription(M.statusInfo(state,hero.id)):'')||partyStatusText(hero);if(conditions)values.append(hud50ConditionNode(hero,conditions,compact));const healthWarning=HUD50.healthWarning(hero.hp,st.maxHp);if(healthWarning)values.append(el('div','hud50-health-warning',text(healthWarning,compact?148:105,11,'#efce8d',true)));if(hero.hp<=0)values.append(text('Павший · Возродить',compact?148:105,12,'#9de1c5',true));const card=panel(2,'party-card'+(active?' active':'')+(hero.hp<=0?' fallen':''),portrait(def.portrait),values);if(callback){card.tabIndex=0;card.role='button';card.dataset.focusKey='hero:'+hero.id;card.ariaLabel=heroSummary(def.name,hero,st,active,conditions);card.onclick=callback;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();callback();}};}return card;}
function hud50SelectionSummary(){const t=ui.target,skill=chosenSkill(),hero=partyDefs[state.battle?.activeHeroId],enemy=state.battle?.enemies.find(e=>e.uid===ui.enemyId),ally=partyDefs[ui.allyId],item=t?.kind==='item'?itemDefs[state.bag[t.slot]?.defId]:null;return HUD50.selectionSummary({actor:hero?.name,action:skill?.name||item?.name||(t?.kind==='defend'?'Защита':t?.kind==='flee'?'Отступление':t?.kind==='attack'?'Атака':t?.kind==='items'?'Припасы':'Действие'),target:['defend','flee'].includes(t?.kind)?hero?.name:skill?.target==='allEnemies'?'Все противники':skill?.target==='allAllies'?'Весь отряд':skill?.target==='self'?hero?.name:enemy?HUD50.enemyIdentity(enemy,state.battle.enemies,enemyDefs).label:ally?.name});}
function hud50ConditionNode(hero,conditions,compact){const entries=M.statusInfo&&state.mode==='battle'?M.statusInfo(state,hero.id):[],summary=HUD50.conditionSummary(entries,hero.hp<=0)||conditions,d=el('details','party-condition hud50-condition-details'),s=el('summary','',text(summary,compact?148:105,11,'#e4c984'));d.dataset.disclosure='conditions:'+hero.id;d.append(s,text(conditions,compact?148:105,11,'#e4c984'));d.onclick=e=>e.stopPropagation();d.onkeydown=e=>e.stopPropagation();return d;}
function hud50FollowQueue(root){const queue=root.querySelector?.('.turn-order'),current=queue?.querySelector?.('.turn-entry.current'),id=current?.dataset.actorId;if(HUD50.shouldFollowQueue(ui.hud50QueueActor,id)){current.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'instant'});ui.hud50QueueActor=id;}if(!queue)ui.hud50QueueActor=null;}
function hud50MarkActionGroups(actions){let previous='';for(const n of actions.children){const group=n.dataset.actionKind||(n.classList.contains('hud50-skill')?'skill':n.classList.contains('combat-primary')?'attack':'utility'),category=HUD50.actionCategory(group);n.classList.toggle('hud50-group-start',!!previous&&previous!==category);n.dataset.actionCategory=category;previous=category;}actions.role='group';actions.ariaLabel='Основные действия, затем умения, затем припасы и отступление';}
function hud50ObjectivePanel(objective){const copy=HUD50.objectiveCopy(objective,areaDefs),details=el('details','hud50-objective-details');details.dataset.disclosure='objective:'+objective.id;details.append(el('summary','',text('Подробности задания',300,12)),text(copy.detail,350,14),text(state.completedQuests.length+' заданий завершено · '+state.gold+' золота',350,12,'#b6c7b4'));return panel(0,'objective-panel hud50-objective',el('div','hud50-area',text(HUD50.areaLabel(areaDefs[state.areaId]),350,13,'#8ed2c1',true)),text(copy.title,350,17,'#f0d291',true),text(copy.next,350,14),hud50ProgressNode(objective),details);}
function hud50ProgressNode(objective){const progress=HUD50.objectiveProgress(objective.progress);if(!progress)return null;const n=el('div','hud50-objective-progress',text(progress.label,350,12,'#8ed2c1',true));n.role='progressbar';n.ariaLabel='Прогресс задания '+objective.title;n.setAttribute('aria-valuemin','0');n.setAttribute('aria-valuemax',String(progress.total));n.setAttribute('aria-valuenow',String(progress.achieved));return n;}
function hud50NearbyPanel(near){if(typeof nav50PreferredNearby==='function')near=nav50PreferredNearby(near);const p=panel(15,'near-panel hud50-near'),groups=HUD50.nearbyGroups(near);if(!near.length){p.append(text('Клик — идти · WASD — движение\nE — взаимодействие рядом',235,13));return p;}for(const n of [groups.primary,...groups.secondary].filter(Boolean)){const row=el('div',n===groups.primary?'hud50-near-primary':'hud50-near-secondary'),control=button(interactionLabel(n)+(n.ready===false?' · Закрыто':''),()=>n.ready===false?toast(n.reason||'Путь пока закрыт'):interact(n.id),{small:true,width:220,primary:n===groups.primary,focusKey:'near:'+n.id});const key=HUD50.nearbyKey(groups.primary,n);if(key){const badge=el('span','hud50-keycap',text(key,24,14,'#efce8d',true));badge.setAttribute('aria-hidden','true');row.append(badge);control.ariaLabel='E · '+interactionLabel(n);}row.append(control);if(n.ready===false&&n.reason)row.append(text(n.reason,220,12,'#dec29b'));p.append(row);}return p;}
function hud50InspectSkill(box,skill){const old=box.querySelector?.('.hud50-skill-inspection');old?.remove();if(!skill)return;const copy=box.querySelector?.('.combat-info-copy');if(!copy)return;const n=el('div','hud50-skill-inspection',text('Просмотр · '+skill.name+' · '+(skill.mp??skill.cost??0)+' MP',640,13,'#efce8d',true),text(skill.description||'',640,12));n.role='status';n.ariaLive='polite';copy.append(n);}
function restoreHudFocus(root,snapshot){restoreSurface(root,snapshot);}
function renderHud(){const root=$('actHud');root.hidden=!running||paused;if(root.hidden)return;root.dataset.mode=state.mode;const nearby=M.nearby(state);const signature=JSON.stringify([ui.trackedQuestId,settings.textScale,state.runId,state.revision,state.mode,state.areaId,ui.target,ui.enemyId,ui.allyId,ui.presentationLock,state.party.map(h=>[h.id,h.hp,h.mp]),nearby.map(n=>[n.id,n.ready])]);if(signature===lastHudSignature)return;const focused=captureSurface(root);lastHudSignature=signature;const battleKey=state.battle?state.runId+':'+state.battle.encounterId:'';const disclosures=root.dataset.battleKey===battleKey?captureDisclosures(root):[];root.dataset.battleKey=battleKey;root.replaceChildren();if(state.mode==='explore'&&typeof nav50Mount==='function'){nav50Mount(root);arrow50Mount(root);}const objective=M.currentObjective(state,ui.trackedQuestId),top=el('div','hud-top');top.append(hud50ObjectivePanel(objective));const controls=el('nav','hud-controls');if(state.mode==='battle'){const quest=HUD50.battleQuestLabel(objective);controls.append(button(quest.label,()=>openModal('journal'),{small:true,width:150,ariaLabel:quest.accessible,focusKey:'battle:quest'}));}for(const [label,kind]of [['Сумка · I','inventory'],['Журнал · J','journal'],['Карта · M','map'],['Отряд · P','party']])controls.append(button(label,()=>openModal(kind),{small:true,width:110,disabled:state.mode==='dialogue'}));controls.append(button('Меню · Esc',showMenu,{small:true,width:120}));top.append(controls);root.append(top);const strip=el('div','party-strip');for(const h of state.party){const card=heroCard(h,h.id===HUD50.presentationActor({locked:ui.presentationLock,presentationActorId:ui.hud50PresentationActor,activeHeroId:state.battle?.activeHeroId}),()=>partyClick(h));card.classList.toggle('chosen-target',ui.allyId===h.id);strip.append(card);}root.append(strip);if(state.mode==='battle')root.append(turnOrderPanel());if(ui.presentationLock)root.append(panel(0,'near-panel',text('Выполняется ход · '+(partyDefs[ui.hud50PresentationActor]?.name||'отряд')+'…',235,15)));else if(state.mode==='battle')root.append(battlePanel());else if(state.mode==='explore'){root.append(hud50NearbyPanel(nearby));}ui100Decorate(root,'hud');restoreDisclosures(root,disclosures);restoreHudFocus(root,focused);UI100.restoreAfterLayout(root,{state,ui});hud50FollowQueue(root);}
function interactionLabel(node){return (node.kind==='encounter'||node.type==='encounter'?'Бой · ':node.smith?'Ремонт · ':'')+(node.label||node.name||'Взаимодействовать');}
function itemDescription(def){if(def.description)return def.description;const effect=def.effect||def.use||{},power=Number(effect.power);if(effect.kind==='heal')return 'Восстанавливает здоровье'+(Number.isFinite(power)?': '+power:'')+'.';if(effect.kind==='mp')return 'Восстанавливает ману'+(Number.isFinite(power)?': '+power:'')+'.';if(effect.kind==='revive')return 'Возвращает павшего спутника'+(Number.isFinite(power)&&power>0?' с '+Math.round(power*100)+'% здоровья':'')+'.';return ({weapon:'Оружие отряда.',armor:'Доспех отряда.',charm:'Талисман отряда.',material:'Материал.',quest:'Предмет задания.',consumable:'Расходуемый предмет.'})[def.kind]||'Предмет отряда.';}
function interact(id){
 if(ui.presentationLock)return;
 clearInput();
 const answer=M.interact(state,id);
 commit(answer);
 if(!answer?.ok||state.mode!=='explore')return;
 if(answer.smithId){ui.smith=answer.smithId;openModal('smithy');return;}
 if(answer.lootGrant?.items?.length){
  const chest=areaDefs[state.areaId].nodes.find(node=>node.id===id);
  ui.chestLoot={grant:answer.lootGrant,label:chest?.label||'Открытый сундук'};
  openModal('chestLoot');
  return;
 }
 if(state.shopId){ui.shop=state.shopId;openModal('shop');}
 if(answer.puzzle)showPuzzle(answer.nodeId||id);
}
function enemyIntent(enemy){const intent=String(enemy.telegraph||'').trim(),phase=enemy.phase>1&&enemyDefs[enemy.kind]?.kind==='boss'?'Фаза '+enemy.phase+' · ':'';return phase+(intent?'Намерение: '+intent:'Намерение: '+({attack:'Атака',heavy:'Тяжёлый удар',all:'Атака по отряду',guard:'Защита',heal:'Лечение'}[enemy.intent]||'неизвестно'));}
function enemyStatusText(enemy){const tags=[];if(enemy.status?.break>0)tags.push('Равновесие нарушено');if(enemy.status?.guard>0)tags.push('Защита');return tags.join(' · ');}
function combatSkillIcon(skill){if(skill.kind==='heal'||skill.kind==='revive')return 'heal';if(['guard','buff','taunt'].includes(skill.kind))return 'defend';if(skill.element==='fire')return 'fire';if(skill.element==='ice')return 'ice';return ['damage','break'].includes(skill.kind)&&(!skill.element||skill.element==='physical')?'attack':'arcane';}
function turnOrderPanel(){const entries=ui.presentationLock&&ui.presentationOrder?ui.presentationOrder:M.combatOrder(state),strip=el('div','turn-order');strip.role='list';strip.ariaLabel='Очередь ходов: выше инициатива — раньше ход';const roles=HUD50.queueRoles(entries);for(const [index,entry] of entries.entries()){const enemy=state.battle.enemies.find(e=>e.uid===entry.id),name=entry.side==='party'?partyDefs[entry.id]?.name:enemyDefs[enemy?.kind]?.name;const card=el('div','turn-entry '+entry.side+(entry.active?' current':'')+(entry.acted?' acted':'')+(!entry.alive?' fallen':''));card.role='listitem';card.dataset.actorId=entry.id;card.ariaLabel=(index+1)+'. '+name+' · Инициатива '+entry.initiative+(entry.active?' · Сейчас ход':'')+(entry.acted?' · Ход завершён':'');card.append(text((roles[index]?roles[index]+' · ':index+1+'. ')+(entry.side==='enemy'?HUD50.enemyIdentity(enemy,state.battle.enemies,enemyDefs).label:name),118,12,'#edcc8b',true),text('ИНЦ '+entry.initiative+(!entry.alive?' · пал':''),118,11));strip.append(card);}return strip;}
function chosenSkill(){return ui.target?.skillId?SKILLS[ui.target.skillId]:null;}
function pendingBattleAction(){const t=ui.target;if(!t||t.kind==='items')return null;if(t.kind==='defend')return {kind:'defend'};if(t.kind==='flee')return state.battle.boss||state.battle.forced?null:{kind:'flee'};if(t.kind==='item'){const forecast=M.previewUseItem?.(state,t.slot);if(forecast?.scope==='allAllies'&&forecast.canCommit)return {kind:'item',slot:t.slot};return ui.allyId?{kind:'item',slot:t.slot,targetId:ui.allyId}:null;}const skill=chosenSkill();if(skill&&['allEnemies','allAllies','self'].includes(skill.target))return {kind:'skill',skillId:skill.id,targetId:state.battle.activeHeroId};const targetId=t.ally?ui.allyId:ui.enemyId;return targetId?{kind:t.kind,skillId:t.skillId,targetId}:null;}
function previewLines(action,targetId){const preview=M.battlePreview(state,action,targetId);if(!preview.ok)return preview.message;const result=preview.targets.map(t=>{const enemy=state.battle.enemies.find(e=>e.uid===t.id),prefix=t.side==='enemy'?'№'+(state.battle.enemies.indexOf(enemy)+1)+' ':'';return prefix+t.name+': '+(t.effect==='damage'?'урон ≈ '+t.min+'–'+t.max+'':t.effect==='heal'?'лечение до '+t.max+' HP':t.effect==='revive'?'возвращение '+t.max+' HP':t.effect==='guard'?'защита':t.effect==='buff'?'усиление и защита':t.effect==='taunt'?'провокация':t.effect==='mp'?'мана до '+t.max+' MP':t.effect==='barrier'?'барьер до '+t.max:t.effect==='cover'?'прикрытие':'эффект умения');});return result.length?result.join(' · '):preview.message;}
function paintBattleInfo(hoverSkill=null){if(hoverSkill?.id===chosenSkill()?.id)hoverSkill=null;const box=document.querySelector('.combat-info');if(!box)return;if(hoverSkill&&HUD50.preserveArmedChoice(ui.target,pendingBattleAction())){hud50InspectSkill(box,hoverSkill);return;}hud50InspectSkill(box,null);const key=JSON.stringify([settings.textScale,state.runId,state.revision,state.battle?.activeHeroId,ui.target,ui.enemyId,ui.allyId,hoverSkill?.id||null]);/* Blur must keep an unchanged Apply node alive until its click. */if(box._combatInfoKey===key)return;box._combatInfoKey=key;box.replaceChildren();const copy=el('div','combat-info-copy');box.append(copy);if(ui.target&&!hoverSkill)copy.append(el('div','hud50-selection-summary',text(hud50SelectionSummary(),640,14,'#efce8d',true)));const skill=hoverSkill||chosenSkill(),action=skill?{kind:'skill',skillId:skill.id}:ui.target?.kind==='attack'?{kind:'attack'}:null,chosen=ui.target&&pendingBattleAction();if(skill&&!ui.target)copy.append(text(skill.name+' · '+(skill.mp||skill.cost||0)+' MP',640,17,'#efce8d',true));const itemForecast=ui.target?.kind==='item'?M.previewUseItem?.(state,ui.target.slot,ui.allyId):null;const caster=state.party.find(h=>h.id===state.battle?.activeHeroId),shortage=skill?Math.max(0,(skill.mp??skill.cost??0)-(caster?.mp||0)):0;if(skill)copy.append(text(HUD50.resourceLine({mp:caster?.mp||0,cost:skill.mp??skill.cost??0}),640,13,'#8ed2c1'));if(ui.target?.kind==='item')copy.append(text(HUD50.resourceLine({quantity:state.bag[ui.target.slot]?.qty||0}),640,13,'#8ed2c1'));if(shortage)copy.append(text(HUD50.availability(caster?.mp||0,skill.mp??skill.cost??0).label+' · Только описание',640,14,'#efc296'));const scope=skill?.target||itemForecast?.scope;if(scope){const scopedPreview=action?M.battlePreview(state,action,undefined):itemForecast,scopeLine=HUD50.scopeLabel(scope,scopedPreview?.targets);if(scopeLine)copy.append(text(scopeLine,640,14,'#8ed2c1',true));}if(action)copy.append(el('div','hud50-forecast',text(previewLines(action,hoverSkill?undefined:ui.target?.ally?ui.allyId:ui.enemyId),640,13,'#8ed2c1')));else if(ui.target?.kind==='item'){const item=itemDefs[state.bag[ui.target.slot]?.defId];copy.append(text(item?.name||'Припас',640,17,'#efce8d',true),text(item?itemDescription(item):'',640,13));if(itemForecast)copy.append(text('Расход: 1 · '+(itemForecast.message||itemForecast.reason),640,14,'#b9ddc4'));if((item?.effect||item?.use)?.kind==='revive'&&ui.allyId){const forecast=M.revivalOptions(state,ui.allyId),method=forecast.options.find(o=>o.kind==='item'&&o.slot===ui.target.slot);if(method)copy.append(text(forecast.target.name+': после возрождения '+method.amount+' / '+forecast.target.maxHp+' HP · расход 1 порция',640,13,'#9de1c5'));}}else copy.append(text('Выберите действие, затем цель. Урон и стоимость показаны до применения.',640,13));if(action&&typeof nav50EffectLines==='function'){const extra=nav50EffectLines(M.battlePreview(state,action,hoverSkill?undefined:ui.target?.ally?ui.allyId:ui.enemyId));if(extra.length)copy.append(el('div','nav50-skill-effects',text('Дополнительные эффекты',640,12,'#e5c785',true),...extra.map(line=>text(line,640,13,'#b7ddcb'))));}if(action){const weak=HUD50.weaknessLines(M.battlePreview(state,action,hoverSkill?undefined:ui.target?.ally?ui.allyId:ui.enemyId));if(weak.length)copy.append(el('div','hud50-weakness',text('Известная слабость',640,12,'#8ed2c1',true),...weak.map(line=>text(line,640,12,'#8ed2c1'))));}if(skill){const description=el('details','hud50-action-description');description.dataset.disclosure='action-description:'+skill.id;description.open=!!hoverSkill;description.append(el('summary','',text('Описание умения',640,12)),text(skill.description||'',640,13));copy.append(description);}if(action&&chosen&&!shortage){const availability=M.battlePreview(state,action,chosen.targetId);if(availability.canCommit===false&&availability.reason)copy.append(text(availability.reason,640,14,'#efbb9a'));}if(ui.target&&!hoverSkill){copy.append(text(chosen?'Цель выбрана. Подтвердите применение.':ui.target.ally||ui.target.kind==='item'?'Выберите спутника справа.':ui.target.kind==='items'?'Выберите припас.':'Выберите противника на поле или его номер.',640,12));const row=el('div','combat-choice-controls');if(chosen)row.append(button(HUD50.confirmLabel(ui.target.kind==='item'?'item':skill?.kind||ui.target.kind),()=>battle(pendingBattleAction()),{small:true,width:130,primary:true,ariaLabel:HUD50.confirmLabel(ui.target.kind==='item'?'item':skill?.kind||ui.target.kind)+' · '+hud50SelectionSummary(),focusKey:'battle:confirm',disabled:shortage>0||!!itemForecast&&!itemForecast.canCommit||!!action&&M.battlePreview(state,action,chosen?.targetId).canCommit===false}));row.append(button('Отмена',cancelBattleChoice,{small:true,width:100}));box.append(row);}box.classList.toggle('expanded',!!skill||!!ui.target);ui100Decorate(box,'battle-info');}
function chooseAttack(){ui.target={kind:'attack'};ui.allyId=null;renderHud();}
function battlePanel(){const b=state.battle,hero=state.party.find(h=>h.id===b.activeHeroId),def=partyDefs[hero?.id],p=panel(0,'battle-panel');p.classList.toggle('choosing',!!ui.target);p.append(el('div','combat-heading',text('Раунд '+b.round+' · '+(def?.name||'отряд')+' · '+HUD50.choiceStage(ui.target,pendingBattleAction()).label,430,13,'#e9c883',true)));const targets=el('div','battle-targets');for(const enemy of b.enemies.filter(e=>e.hp>0)){const d=enemyDefs[enemy.kind],hp=Math.ceil(enemy.hp)+' / '+(enemy.maxHp||d.stats?.hp||d.hp),selected=ui.enemyId===enemy.uid||chosenSkill()?.target==='allEnemies',n=button(HUD50.enemyIdentity(enemy,b.enemies,enemyDefs).label+'\n'+hp,()=>targetEnemy(enemy.uid),{small:true,width:128,textSize:11,ariaLabel:'№'+(b.enemies.indexOf(enemy)+1)+' · '+(d.name||enemy.kind)+' · '+hp+(selected?' · Выбрана цель':'')});n.classList.toggle('chosen-target',selected);n.setAttribute('aria-pressed',String(selected));targets.append(n);}p.append(targets);const intel=el('details','battle-intel'),intelHead=el('summary','',text('Намерения врагов',170,12));intel.dataset.disclosure='intel';intel.append(intelHead);for(const enemy of HUD50.orderedIntel(b.enemies,ui.enemyId))intel.append(text((enemy.uid===ui.enemyId?'Выбрана · ':'')+'№'+(b.enemies.indexOf(enemy)+1)+' · '+(enemyDefs[enemy.kind]?.name||enemy.kind)+' · '+enemyIntent(enemy)+(enemyStatusText(enemy)?' · '+enemyStatusText(enemy):'')+(M.statusInfo?'\n'+statusDescription(M.statusInfo(state,enemy.uid)):''),260,13));p.append(intel);const info=el('div','combat-info');info.role='status';info.ariaLive='polite';p.append(info);const actions=el('div','battle-actions');const attack=button('Атака',chooseAttack,{width:90,textSize:13,combatIcon:'attack',primary:true});attack.classList.toggle('chosen-action',ui.target?.kind==='attack');attack.setAttribute('aria-pressed',String(ui.target?.kind==='attack'));actions.append(attack,button('Защита',()=>{UI100.armUtility(ui,'defend');renderHud();},{width:90,textSize:13,combatIcon:'defend',primary:true,hint:'Снижает урон на 58% до следующего хода героя.'}));for(const skill of M.availableSkills(state,hero?.id)){const cost=skill.mp??skill.cost??0,n=button(HUD50.shortSkillName(skill.name),()=>selectSkill(skill),{small:true,width:100,textSize:11,iconOnly:false,costBadge:cost+' MP',combatIcon:combatSkillIcon(skill),ariaLabel:skill.name+' · '+cost+' MP'+((hero?.mp||0)<cost?' · Не хватает '+(cost-(hero?.mp||0))+' MP. Нажмите для описания.':''),focusKey:'skill:'+skill.id});n.classList.add('hud50-skill');const selected=ui.target?.skillId===skill.id,availability=HUD50.availability(hero?.mp||0,cost);n.classList.toggle('hud50-unaffordable',!availability.available);if(!availability.available)n.append(el('span','hud50-shortage',text('−'+availability.shortage+' MP',70,10,'#efce8d',true)));n.classList.toggle('chosen-action',selected);n.setAttribute('aria-pressed',String(selected));n.onpointerenter=()=>paintBattleInfo(skill);n.onfocus=()=>paintBattleInfo(skill);n.onpointerleave=()=>paintBattleInfo();n.onblur=()=>paintBattleInfo();actions.append(n);}if(state.party.some(h=>h.hp<=0)){actions.classList.add('has-revival');actions.append(button('Возродить',()=>openRevival(),{small:true,width:100,textSize:13,combatIcon:'heal',hint:'Вернуть павшего спутника с помощью соли или заклинания.'}));}actions.append(button('Предметы',()=>{ui.target={kind:'items'};ui.enemyId=null;ui.allyId=null;renderHud();},{small:true,width:110,textSize:13,combatIcon:'item'}),button('Отступить',()=>{UI100.armUtility(ui,'flee');renderHud();},{small:true,width:110,textSize:13,ariaLabel:b.boss||b.forced?'Отступить нельзя: сюжетный бой':'Отступить',hint:b.boss||b.forced?'Отступить нельзя: сюжетный бой':null,disabled:b.boss||b.forced,combatIcon:'flee'}));hud50MarkActionGroups(actions);p.append(actions);if(ui.target?.kind==='items'){const items=el('div','battle-items');state.bag.forEach((item,i)=>{if(item&&itemDefs[item.defId].kind==='consumable'){const plans=M.previewUseItem?state.party.map(h=>M.previewUseItem(state,i,h.id)):[],usable=!plans.length||plans.some(p=>p.canCommit);items.append(button(itemDefs[item.defId].name+' ×'+item.qty,()=>{ui.target={kind:'item',slot:i};ui.allyId=null;renderHud();},{small:true,width:350,disabled:!usable,focusKey:'battle-item:'+i}));if(!usable)items.append(text(plans[0]?.reason||'Нет подходящих целей для этого припаса.',350,12,'#efbb9a'));}});if(!items.childElementCount)items.append(text('В сумке нет боевых припасов. Купите их у торговца или найдите в пути.',350,14),button('К действиям',cancelBattleChoice,{small:true,width:180}));p.append(items);}const log=el('details','battle-log'),logState=HUD50.logNotice(b.log,ui.hud50LogRead?.key===state.runId+':'+b.encounterId?ui.hud50LogRead.entries:[]),logHead=el('summary','',text(logState.label,160,12));log.ontoggle=()=>{if(log.open){ui.hud50LogRead={key:state.runId+':'+b.encounterId,count:b.log.length,entries:[...b.log]};logHead.replaceChildren(text('Журнал боя',160,12));}};log.dataset.disclosure='log';log.append(logHead,text('Последнее: '+(logState.last||'Бой начался'),280,13,'#8ed2c1'),text((b.log||[]).slice(-8).join('\n'),280,13));p.append(log);queueMicrotask(()=>paintBattleInfo());return p;}
function selectSkill(skill){ui.target={kind:'skill',skillId:skill.id,ally:skill.target==='ally'};if(['allEnemies','allAllies','self'].includes(skill.target))ui.enemyId=null;ui.allyId=null;renderHud();}
function targetEnemy(id){if(ui.presentationLock||!state.battle?.enemies.some(e=>e.uid===id&&e.hp>0))return;if(ui.target?.ally||ui.target?.kind==='item'){toast('Это действие применяется к спутнику справа.');return;}if(!ui.target||ui.target.kind==='items')ui.target={kind:'attack'};ui.enemyId=id;renderHud();}
function cancelBattleChoice(){ui.target=null;ui.enemyId=null;ui.allyId=null;ui.hoverEnemy=null;renderHud();}
function partyClick(hero){
 if(hero.hp<=0){
  const item=ui.target?.kind==='item'?itemDefs[state.bag[ui.target.slot]?.defId]:null;
  const effect=chosenSkill()?.kind||(item?.effect||item?.use)?.kind;
  if(state.mode==='battle'&&effect==='revive')targetHero(hero.id);else openRevival(hero.id);
  return;
 }
 if(state.mode==='battle'){if(ui.target)targetHero(hero.id);else toast('Сначала выберите действие.');return;}
 ui.hero=hero.id;openModal('inventory');
}
function openRevival(targetId){
 if(ui.presentationLock)return;
 ui.reviveTarget=targetId||state.party.find(h=>h.hp<=0)?.id;
 ui.target=null;ui.enemyId=null;ui.allyId=null;ui.hoverEnemy=null;ui.selected=null;ui.detail=null;
 openModal('revival');renderHud();
}
function chooseRevivalMethod(targetId,option){
 if(state.mode==='battle'){
  const fresh=M.revivalOptions(state,targetId).options.find(o=>o.kind===option.kind&&(o.kind==='item'?o.slot===option.slot&&o.uid===option.uid:o.casterId===option.casterId&&o.skillId===option.skillId));
  if(!fresh?.enabled){toast(fresh?.reason||'Способ возрождения изменился.');renderModal();return;}
  closeModal(true);
  ui.target=fresh.kind==='item'?{kind:'item',slot:fresh.slot}:{kind:'skill',skillId:fresh.skillId,ally:true};
  ui.allyId=targetId;ui.enemyId=null;renderHud();return;
 }
 const answer=M.reviveCompanion(state,targetId,option);commit(answer);
 if(answer.ok){if(!state.party.some(h=>h.hp<=0))closeModal(true);}
 if(ui.modal==='revival')renderModal();
}
function walkToRevivalCamp(campId){
 if(state.mode!=='explore')return;
 const camp=areaDefs[state.areaId].nodes.find(n=>n.id===campId&&n.type==='camp'&&isAllowed(n));
 if(!camp)return;
 closeModal(true);destination={x:camp.x,z:camp.z};approach=camp.id;
 toast('Идём к лагерю: отдых бесплатно вернёт весь отряд в строй.');
}
function renderRevival(body){
 const fallen=state.party.filter(h=>h.hp<=0),target=fallen.find(h=>h.id===ui.reviveTarget)||fallen[0];
 if(!target){body.append(text('Все спутники в строю.',760,22,'#99ddc6',true));return;}
 ui.reviveTarget=target.id;
 const targets=el('div','revival-targets');
 for(const hero of fallen){const b=button(partyDefs[hero.id].name+' · павший',()=>{ui.reviveTarget=hero.id;renderModal();},{small:true,width:180});b.classList.toggle('selected',hero.id===target.id);b.setAttribute('aria-pressed',String(hero.id===target.id));targets.append(b);}
 body.append(targets,el('div','row revival-heading',portrait(partyDefs[target.id].portrait),el('div','grow',text('Возродить: '+partyDefs[target.id].name,650,25,'#e9cd86',true),text('Павший спутник · 0 / '+target.maxHp+' HP',650,16,'#d39a90'))));
 const methods=M.revivalOptions(state,target.id);
 for(const option of methods.options){
  const cost=option.kind==='item'?option.name+' ×1 · в сумке '+option.count:option.casterName+' · '+option.name+' · '+option.cost+' MP';
  const row=el('div','revival-method',text(cost,790,18,'#e7cc91',true),text('После возрождения: '+option.amount+' / '+target.maxHp+' HP',790,16,'#9de1c5'));
  if(option.reason)row.append(text(option.reason,790,15,'#dba88b'));
  row.append(button(state.mode==='battle'?'Выбрать · '+option.name:'Возродить · '+option.name,()=>chooseRevivalMethod(target.id,option),{width:360,disabled:!option.enabled,combatIcon:'heal',primary:true}));body.append(row);
 }
 if(!methods.options.some(o=>o.kind==='item'))body.append(text('Соль пробуждения закончилась. Её можно купить у торговцев или найти в припасах.',790,16));
 if(!methods.options.some(o=>o.kind==='skill'))body.append(text('Магическое возрождение доступно после присоединения Леи.',790,16));
 if(state.mode==='battle')body.append(text('Выбор способа не расходует ресурсы. Подтвердите «Применить» в боевой панели: возрождение займёт один ход. Спутник действует в свою очередь по инициативе; уже пропущенный ход вернётся в следующем раунде.',790,15));
 else{
  const camp=areaDefs[state.areaId].nodes.find(n=>n.type==='camp'&&isAllowed(n));
  body.append(el('div','revival-camp',text('В лагере отдых бесплатно возрождает всех павших и полностью восстанавливает здоровье и ману.',790,16,'#a9d8c7')));
  if(camp)body.append(button('К лагерю · бесплатно',()=>walkToRevivalCamp(camp.id),{width:330,combatIcon:'heal'}));
 }
}
function targetHero(id){if(!(ui.target?.kind==='item'||ui.target?.ally)){toast('Выберите противника.');return;}const hero=state.party.find(h=>h.id===id);if(!hero)return;if(ui.target.kind==='item'&&M.previewUseItem){const forecast=M.previewUseItem(state,ui.target.slot,id);if(!forecast.canCommit){toast(forecast.reason);return;}ui.allyId=id;renderHud();return;}const item=ui.target.kind==='item'?itemDefs[state.bag[ui.target.slot]?.defId]:null,effect=ui.target.kind==='skill'?SKILLS[ui.target.skillId]?.kind:(item?.effect||item?.use)?.kind;if(hero.hp<=0&&effect!=='revive'){toast('Выберите живого спутника.');return;}if(hero.hp>0&&effect==='revive'){toast('Искра возвращает только павших спутников.');return;}if(ui.target.kind==='skill'&&M.battlePreview){const forecast=M.battlePreview(state,{kind:'skill',skillId:ui.target.skillId},id);if(forecast.ok===false){toast(forecast.reason||forecast.message);return;}ui.allyId=id;renderHud();return;}if(effect==='heal'&&hero.hp>=hero.maxHp){toast('Здоровье этого спутника уже полно.');return;}if(effect==='mp'&&hero.mp>=hero.maxMp){toast('Мана этого спутника уже полна.');return;}ui.allyId=id;renderHud();}
function battle(action){if(ui.presentationLock||!action)return;const order=M.combatOrder(state),actingHero=state.battle?.activeHeroId,answer=M.battleAction(state,action);if(!answer.ok){toast(answer.message);renderHud();return;}ui.target=null;ui.enemyId=null;ui.allyId=null;ui.hoverEnemy=null;if(typeof world!=='undefined'&&world){ui.presentationOrder=order;ui.hud50PresentationActor=actingHero;ui.presentationLock=true;clearInput();}commit(answer,{quiet:true});}

function locationItem(loc){return loc.kind==='bag'?state.bag[loc.index]:state.gear[loc.heroId]?.[loc.slot];}
function sameLocation(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function itemSlot(loc){
 const item=locationItem(loc),slot=el('button','item-slot'+(loc.kind==='gear'?' gear-slot':''));
 const condition=item?M.durabilityInfo(item):null,selected=!!ui.selected&&sameLocation(ui.selected.from,loc);
 slot.type='button';slot.dataset.location=JSON.stringify(loc);slot.dataset.focusKey='slot:'+slot.dataset.location;
 const definition=itemDefs[item?.defId];
 slot.ariaLabel=[slotSummary(loc,item,definition?.name,partyDefs[loc.heroId]?.name,selected),itemRarity(definition),durabilityLabel(condition)].filter(Boolean).join(' · ');
 slot.setAttribute('aria-pressed',String(selected));
 if(item){
  slot.append(icon(itemDefs[item.defId]));
  if(item.qty>1){const quantity=text(item.qty,40,15,'#fff2cf',true);quantity.classList.add('qty');slot.append(quantity);}
  if(condition&&condition.ratio<1)slot.append(durabilityMeter(condition,el,text,{tiny:true}));
 }
 slot.classList.toggle('selected',selected);
 slot.onclick=()=>{
  if(ui.drag||performance.now()<ui.suppressClickUntil)return;
  const found=locationItem(loc);
  if(ui.selected&&!sameLocation(ui.selected.from,loc)){
   const s=ui.selected;commit(M.moveItem(state,s.from,loc,s.uid,s.revision),{keepModal:true});return;
  }
  ui.selected=found?{from:loc,uid:found.uid,revision:state.revision}:null;ui.detail=found?.defId||null;renderModal();
 };
 slot.style.touchAction=ui.touchDrag?'none':'pan-y pinch-zoom';
 slot.onpointerdown=event=>startDrag(event,slot,loc);
 slot.onlostpointercapture=event=>{if(ui.drag?.pointer===event.pointerId)cancelDrag();};
 return slot;
}
function paintDropTarget(d,event){document.querySelectorAll('[data-drop-state]').forEach(n=>{delete n.dataset.dropState;n.classList.remove('drag-over');});const n=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-location]');if(!n){d.feedback?.replaceChildren();return;}const to=JSON.parse(n.dataset.location),forecast=M.previewMoveItem(state,d.from,to),sourceItem=locationItem(d.from),targetItem=locationItem(to),kind=!forecast.ok?'invalid':targetItem?(targetItem.defId===sourceItem?.defId?'merge':'swap'):'move';n.dataset.dropState=kind;n.classList.add('drag-over');if(!d.feedback){d.feedback=el('div','drag-feedback');document.body.append(d.feedback);}const message=forecast.ok?({merge:'Объединить стопки',swap:'Обменять предметы',move:'Переместить предмет'}[kind]):forecast.reason||forecast.message;const changes=(forecast.heroes||[]).map(h=>Object.entries(h.delta||{}).filter(([,v])=>v).map(([k,v])=>k+' '+(v>0?'+':'')+v).join(' · ')).filter(Boolean).join(' · ');const key=kind+':'+message+changes;if(key!==d.feedbackKey){d.feedbackKey=key;d.feedback.replaceChildren(text(message+(changes?' · '+changes:''),300,13,forecast.ok?'#bce7c6':'#f3b69e'));}d.feedback.style.left=Math.min(event.clientX+12,innerWidth-310)+'px';d.feedback.style.top=Math.max(8,event.clientY-70)+'px';}
function startDrag(event,node,from){const item=locationItem(from);if(ui.drag){if(ui.drag.pointer!==event.pointerId)cancelDrag();return;}if(!item||!canStartInventoryDrag(event,ui.touchDrag))return;ui.drag={pointer:event.pointerId,node,from,uid:item.uid,revision:state.revision,start:{x:event.clientX,y:event.clientY},anchor:UI100.dragAnchor(event,node.getBoundingClientRect()),active:false,preview:null};node.setPointerCapture(event.pointerId);}
function dragMove(event){const d=ui.drag;if(!d||event.pointerId!==d.pointer)return;if(!d.active&&Math.hypot(event.clientX-d.start.x,event.clientY-d.start.y)>7){d.active=true;d.preview=icon(itemDefs[locationItem(d.from)?.defId]);d.preview.classList.add('drag-preview');document.body.append(d.preview);}if(!d.active)return;event.preventDefault();const position=UI100.dragPreviewPosition(event,d.anchor,d.preview.getBoundingClientRect());d.preview.style.left=position.x+'px';d.preview.style.top=position.y+'px';d.lastEvent={clientX:event.clientX,clientY:event.clientY};UI100.autoScrollDrag($('gameModal'),event);paintDropTarget(d,event);}
function dragEnd(event){const d=ui.drag;if(!d||event.pointerId!==d.pointer)return;let destinationLocation=null;if(d.active){const n=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-location]');if(n)destinationLocation=JSON.parse(n.dataset.location);ui.suppressClickUntil=performance.now()+350;}const active=d.active;cancelDrag();if(active&&destinationLocation&&!sameLocation(d.from,destinationLocation))commit(M.moveItem(state,d.from,destinationLocation,d.uid,d.revision),{keepModal:true});else if(active)renderModal();}
function cancelDrag(){const d=ui.drag;if(!d)return;ui.drag=null;d.preview?.remove();d.feedback?.remove();try{if(d.node.hasPointerCapture(d.pointer))d.node.releasePointerCapture(d.pointer);}catch{}ui.drag=null;document.querySelectorAll('[data-drop-state]').forEach(n=>{delete n.dataset.dropState;n.classList.remove('drag-over');});}
function renderInventory(body){
  if(ui.selected&&!windowValidSelection(state,ui.selected)){ui.selected=null;ui.detail=null;}
  const hero=state.party.find(h=>h.id===ui.hero)||state.party[0];ui.hero=hero.id;
  const layout=el('div','inventory-layout'),gear=el('div','column');
  const heroes=el('div','window-tabs window-heroes');heroes.ariaLabel='Герой для снаряжения';
  for(const h of state.party){const hs=M.stats(state,h.id),selected=h.id===hero.id,b=button((selected?'Выбран · ':'')+partyDefs[h.id].name,()=>{ui.hero=h.id;ui.selected=null;renderModal();},{small:true,width:180,focusKey:'inventory-hero:'+h.id,ariaLabel:partyDefs[h.id].name+' · HP '+Math.ceil(h.hp)+' / '+hs.maxHp+' · MP '+Math.ceil(h.mp)+' / '+hs.maxMp+(selected?' · выбран':'')});b.setAttribute('aria-pressed',String(selected));heroes.append(b);}
  gear.append(heroes,text('Снаряжение · '+partyDefs[hero.id].name,200,18,'#e9ca91',true),text('HP '+Math.ceil(hero.hp)+' / '+M.stats(state,hero.id).maxHp+' · MP '+Math.ceil(hero.mp)+' / '+M.stats(state,hero.id).maxMp,200,14));
  gear.append(portrait(partyDefs[hero.id].portrait));
  for(const [slot,label]of [['weapon','Оружие'],['armor','Доспех'],['charm','Талисман']]){
    const worn=state.gear[hero.id]?.[slot];
    gear.append(el('div','gear-row',itemSlot({kind:'gear',heroId:hero.id,slot}),
      el('div','grow',text(label,135,13),text(worn?itemDefs[worn.defId].name:'Пустой слот',135,14,'#e9ca91',true),
        worn&&durabilityMeter(M.durabilityInfo(worn),el,text))));
  }
  if(hero.hp<=0)gear.append(button('Возродить '+partyDefs[hero.id].name,()=>openRevival(hero.id),{small:true,width:160,combatIcon:'heal'}));
  const st=M.stats(state,hero.id);gear.append(text('Атака '+st.atk+' · Защита '+st.def+'\nИнициатива '+st.initiative,180,14));
  const inventoryRevision=state.revision,bag=el('div','column',text('Сумка · '+state.bag.filter(Boolean).length+' / '+state.bag.length+' · '+state.gold+' золота',420,17,'#e6ca88'));
  bag.append(button('Упорядочить сумку',()=>commit(M.organizeBag(state,inventoryRevision),{keepModal:true}),{small:true,width:350,disabled:!['explore','complete'].includes(state.mode),focusKey:'organize-bag'}));
  ui.windowBagFilter=ui.windowBagFilter||'all';
  const filters=el('div','window-tabs');filters.ariaLabel='Типы предметов';
  for(const [id,label]of [['all','Все'],['equipment','Снаряжение'],['supplies','Припасы'],['trophy','Материалы'],['quest','Задания']]){
    const b=button(label,()=>{ui.windowBagFilter=id;renderModal();},{small:true,width:140,focusKey:'bag-filter:'+id});b.setAttribute('aria-pressed',String(ui.windowBagFilter===id));filters.append(b);
  }
  bag.append(text('Показано предметов: '+windowBagView(state.bag,itemDefs,ui.windowBagFilter,ui.windowBagQuery).filter(entry=>entry.item).length,420,13));
  bag.append(filters,windowSearch(ui.windowBagQuery||'',value=>{ui.windowBagQuery=value;renderModal();}),button('Очистить поиск',()=>{ui.windowBagQuery='';renderModal();},{small:true,width:220,focusKey:'bag-search-clear',disabled:!ui.windowBagQuery}));
  const visible=windowBagView(state.bag,itemDefs,ui.windowBagFilter,ui.windowBagQuery),grid=el('div','bag-grid');for(const {index} of visible)grid.append(itemSlot({kind:'bag',index}));
  if(!visible.some(entry=>entry.item))bag.append(text(state.bag.some(Boolean)?'Ничего не найдено. Измените поиск или тип предмета.':'Сумка пуста. Свободные ячейки доступны для переноса.',420,16),button('Сбросить поиск и фильтр',()=>{ui.windowBagFilter='all';ui.windowBagQuery='';renderModal();},{small:true,width:320,focusKey:'bag-reset'}));
  bag.append(button(ui.touchDrag?'Касание: перетаскивание · включено':'Касание: выбор и прокрутка',()=>{cancelDrag();ui.touchDrag=!ui.touchDrag;renderModal();},{small:true,width:380,focusKey:'touch-drag-mode'}));
  bag.append(grid,windowDisclosure('inventory-help','Как переместить предмет',text('Выбор предмета, затем ячейки — перенос. Escape отменяет выбор.',440,14),text('На телефоне выберите предмет и затем ячейку; свайп прокручивает. Для перетаскивания включите отдельный режим. Перетащите предмет или выберите его кликом, затем выберите ячейку. Escape отменяет перенос.',440,13)));
  if(ui.selected&&(ui.windowBagFilter!=='all'||ui.windowBagQuery))bag.append(button('Все ячейки для переноса',()=>{ui.windowBagFilter='all';ui.windowBagQuery='';renderModal();},{small:true,width:350}));
  if(state.pendingRewards?.length)bag.append(button('Забрать отложенные припасы',()=>commit(M.claimRewards(state),{keepModal:true}),{small:true,width:370}));
  const detail=el('div','item-detail'),def=itemDefs[ui.detail];
  if(def){
    detail.append(icon(def),text(def.name,205,21,'#efcf91',true),
      def.rarity?text(itemRarity(def),205,14,def.rarity==='rare'?'#8cdbdf':'#b3cfaf',true):'',
      text(itemDescription(def),205,15));
    if(ui.selected){
      const from=ui.selected.from,instance=locationItem(from),condition=M.durabilityInfo(instance);
      detail.append(text(from.kind==='gear'?'Носит: '+partyDefs[from.heroId].name+' · '+({weapon:'Оружие',armor:'Доспех',charm:'Талисман'}[from.slot]||from.slot):'В сумке · ячейка '+(from.index+1),300,14));
      if(condition){
        detail.append(durabilityMeter(condition,el,text));
        if(condition.combatFactor<1)detail.append(text('Бонус атаки и защиты от этой вещи: '+Math.round(condition.combatFactor*100)+'%. Починить можно у кузнеца.',260,14,'#efbc9f'));
      }
      const price=M.salePrice(instance);
      if(price>0)detail.append(text('Продажа: '+price+' золота за шт.',230,14));
    }
    if(def.stats)detail.append(text(itemStatLine(def),205,14));
    if(ui.selected?.from.kind==='bag'&&['weapon','armor','charm'].includes(def.kind)){
      const destination={kind:'gear',heroId:hero.id,slot:def.kind},forecast=M.previewMoveItem(state,ui.selected.from,destination),current=state.gear[hero.id]?.[def.kind],delta=forecast.heroes?.find(h=>h.id===hero.id)?.delta;
      const compare=el('div','window-compare',text('Сравнение · '+partyDefs[hero.id].name,300,17,'#e9ca91',true),text('Сейчас: '+(current?itemDefs[current.defId].name:'Пустой слот')+'\nВыбрано: '+def.name,300,15));
      compare.append(text(forecast.ok?'Изменения: '+(itemStatLine({stats:Object.fromEntries(Object.entries(delta||{}).filter(([key,value])=>['hp','mp','atk','def','initiative'].includes(key)&&value))})||'характеристики без изменений'):forecast.reason||forecast.message,300,14));
      compare.append(button('Надеть на '+partyDefs[hero.id].name,()=>commit(M.moveItem(state,ui.selected.from,destination,ui.selected.uid,forecast.revision),{keepModal:true}),{small:true,width:280,disabled:!forecast.ok,focusKey:'equip:'+hero.id+':'+def.id}));
      detail.append(compare);
    }
    if(ui.selected?.from.kind==='bag'&&def.kind==='consumable'){
      const slot=ui.selected.from.index,forecast=M.previewUseItem(state,slot,hero.id),anyTarget=state.party.some(h=>M.previewUseItem(state,slot,h.id).canCommit);
      detail.append(text('Расход: 1 · '+(forecast.message||forecast.reason),300,15),button(state.mode==='battle'?'Выбрать в бою':'Подтвердить: '+partyDefs[hero.id].name,()=>{
        if(state.revision!==forecast.revision||state.bag[slot]?.uid!==forecast.uid){toast('Сумка или отряд изменились. Выберите предмет заново.');renderModal();return;}
        if(state.mode==='battle'){closeModal(true);ui.target={kind:'item',slot};ui.enemyId=null;ui.allyId=null;renderHud();toast(forecast.scope==='allAllies'?'Припас действует на отряд. Подтвердите применение.':'Выберите спутника и подтвердите применение.');}
        else commit(M.useItem(state,slot,hero.id),{keepModal:true});
      },{small:true,width:260,disabled:state.mode==='battle'?!anyTarget:!forecast.canCommit,focusKey:'use-item:'+slot}));
    }
  }else detail.append(text('Выберите предмет, чтобы прочитать его описание.',205,16));
  if(M.fieldHealingOptions)renderFieldHealing(detail,hero.id);layout.append(gear,bag,detail);body.append(layout);ui100Decorate(body,'inventory');
}
function renderFieldHealing(body,targetId){if(state.mode!=='explore')return;const methods=M.fieldHealingOptions(state,targetId);if(!methods.options.length)return;const box=el('details','field-healing'),head=el('summary','',text('Лечение вне боя',300,17,'#bce1cb',true));box.dataset.disclosure='field-healing:'+targetId;head.dataset.focusKey='field-healing:'+targetId;box.append(head);for(const option of methods.options){const forecast=option.targets.filter(t=>t.amount>0).map(t=>t.name+': +'+t.amount+' HP').join(' · ');box.append(text(option.casterName+' · '+option.name+' · '+option.cost+' MP',600,15),text(forecast||option.reason||'Лечение не требуется.',600,14),!option.enabled&&text(option.reason||'Лечение недоступно.',600,14,'#efbb9a'),button('Применить лечение',()=>commit(M.healCompanion(state,targetId,{casterId:option.casterId,skillId:option.skillId,revision:option.revision}),{keepModal:true}),{small:true,width:280,disabled:!option.enabled,focusKey:'field-heal:'+targetId+':'+option.casterId+':'+option.skillId}));}body.append(box);}
function renderJournal(body){
  const known=M.questList(state).filter(q=>q.known);ui.windowQuestFilter=ui.windowQuestFilter||'active';const filters=el('div','window-tabs');
  for(const [id,label,count]of [['active','Активные',known.filter(q=>!q.complete).length],['completed','Завершённые',known.filter(q=>q.complete).length],['all','Все',known.length]]){const b=button(label+' · '+count,()=>{ui.windowQuestFilter=id;renderModal();},{small:true,width:220,focusKey:'quest-filter:'+id});b.setAttribute('aria-pressed',String(ui.windowQuestFilter===id));filters.append(b);}body.append(filters);
  const scroll=el('div','window-journal-list'),trackedId=M.currentObjective(state,ui.trackedQuestId).id,quests=windowQuestView(known,ui.windowQuestFilter,trackedId);
  for(const q of quests){
    const section=el('section','quest-entry'+(q.complete?' done':''),text((q.id===trackedId&&!q.complete?'Отслеживается · ':'')+(q.complete?'✓ ':q.optional?'По желанию · ':'')+q.title,880,19,'#e9ca91',true),text(q.complete?'Завершено':q.total?'Шагов выполнено: '+q.achieved+' / '+q.total:'Следуйте известной цели задания.',880,14));
    if(q.target)section.append(text('Известная цель: '+q.target.label+' · '+(areaDefs[q.target.areaId]?.title||'')+(q.target.ready?' · доступна':' · нужен сюжетный доступ'),880,15));
    if(q.target)section.append(button('Карта цели',()=>{ui.windowMapQuestId=q.id;UI100.saveUIPreferences(localStorage,state.runId,ui);openModal('map');},{small:true,width:220,focusKey:'quest-map:'+q.id}));
    section.append(windowDisclosure('quest-story:'+q.id,'История задания',text(q.description,850,16)));
    if(!q.complete&&q.available)section.append(button(trackedId===q.id?'Отслеживается':'Отслеживать',()=>{ui.trackedQuestId=q.id;UI100.saveUIPreferences(localStorage,state.runId,ui);lastHudSignature='';renderHud();renderModal();},{small:true,width:220,focusKey:'track:'+q.id}));scroll.append(section);
  }
  if(!quests.length)scroll.append(text(ui.windowQuestFilter==='completed'?'Завершённых известных заданий пока нет.':'В этой группе известных заданий нет.',850,17));body.append(scroll);ui100Decorate(body,'journal');
}
function mapRouteState(){const current=areaDefs[state.areaId];return {current,routes:(current.exits||[]).filter(e=>!e.forbidFlags?.some(f=>state.flags[f])).map(e=>({...e,open:isAllowed(e),destination:areaDefs[e.target]?.title||e.label}))};}
function renderMap(body){
 if(ui.windowMapQuestId&&!M.questProgress(state,ui.windowMapQuestId)?.known)ui.windowMapQuestId=null;
 const selected=areaDefs[ui.mapAreaId||state.areaId]||areaDefs[state.areaId];
 if(M.areaCompletion(state,selected.id).known){
  const map=createAreaSchematic({area:selected,state,questId:ui.windowMapQuestId||ui.trackedQuestId});
  body.append(el('div','act-map-detail',text(selected.title,790,20,'#e9cb84',true),map));
 }
 ui100Decorate(body,'map');
}
function renderParty(body){
  if(state.party.some(h=>h.hp<=0))body.append(text('Нажмите «Возродить» у павшего спутника. В лагере весь отряд восстанавливается бесплатно.',880,17,'#9de1c5'));
  for(const h of state.party){
    const d=partyDefs[h.id],st=M.stats(state,h.id),details=el('div','grow',text(d.name+' · '+d.role,760,23,'#edca88',true),text(d.description||d.bio||'',760,16),text('Уровень '+h.level+' · Инициатива '+st.initiative+' · Жизнь '+Math.ceil(h.hp)+'/'+st.maxHp+' · Мана '+Math.ceil(h.mp)+'/'+st.maxMp,760,16));
    const available=M.availableSkills(state,h.id),skillsBox=windowDisclosure('party-skills:'+h.id,'Навыки · '+available.length);
    for(const skill of available)skillsBox.append(text(skill.name+' · '+(skill.mp||skill.cost||0)+' MP — '+skill.description+(['damage','break'].includes(skill.kind)?' Множитель урона ×'+(skill.power||1)+'. Прогноз по цели показан в бою.':''),760,15));
    const progress=M.progressionInfo(state,h.id),skills=M.skillProgression(state,h.id),growth=windowDisclosure('party-growth:'+h.id,'Рост героя');
    if(progress)growth.append(text(progress.capped?'Достигнут предел уровня':'Опыт: '+progress.xp+' / '+progress.threshold+' · До уровня '+progress.nextLevel+': '+progress.remaining+' XP',760,16),text(progress.capped?'':'Следующий уровень: '+itemStatLine({stats:Object.fromEntries(['hp','mp','atk','def','initiative'].map(k=>[k,progress.gains[k]]))})+' · Повышение полностью восстанавливает и возрождает героя.',760,14));
    if(skills)growth.append(text('Открыты умения: '+skills.unlocked.map(k=>k.name+' · '+k.cost+' MP').join(' · '),760,15),text(skills.nextUnlockLevel?'Следующие умения на уровне '+skills.nextUnlockLevel+': '+skills.nextUnlocks.map(k=>k.name).join(', '):'Все исходные умения героя уже открыты.',760,14));
    const statuses=statusDescription(M.statusInfo(state,h.id));if(statuses)details.append(text(statuses,760,15,'#c6dcbe'));
    renderFieldHealing(details,h.id);if(h.hp<=0)details.append(button('Возродить '+d.name,()=>openRevival(h.id),{width:250,combatIcon:'heal',primary:true}));
    const role=M.heroRoleInfo?.(state,h.id);if(role){const tactics=windowDisclosure('party-role:'+h.id,'Роль и сочетания',text(role.identity,760,17,'#e9ce90',true),text(role.signature,760,15));for(const line of role.synergies||[])tactics.append(text('Сочетание: '+line,760,14));for(const line of role.limitations||[])tactics.append(text('Учтите: '+line,760,14));for(const skill of role.skills.filter(s=>!s.unlocked))skillsBox.append(text(skill.name+' · Откроется на уровне '+skill.unlockLevel+' · '+skill.description,760,14,'#b5b99f'));details.append(tactics);}
    details.append(skillsBox,growth);body.append(el('div','row quest-entry',portrait(d.portrait),details));
  }ui100Decorate(body,'party');
}
function renderDialogue(body){ui.line=state.dialogue?.line||0;const dialogue=dialogueDefs[state.dialogue?.id];if(!dialogue){body.append(text('Разговор завершён',800));return;}const area=areaDefs[state.areaId],npc=area.npcs?.find(n=>n.id===state.dialogue?.npcId||n.id===dialogue.npcId||n.dialogue===dialogue.id||n.variants?.some(v=>v.dialogue===dialogue.id)),lines=dialogue.lines||[],line=lines[Math.min(ui.line,lines.length-1)]||{speaker:npc?.name,text:''};body.append(text('Реплика '+Math.min(ui.line+1,Math.max(1,lines.length))+' из '+Math.max(1,lines.length),850,14));body.append(el('div','row dialogue-row',portrait(list(PARTY).find(p=>p.name===line.speaker)?.portrait??npc?.portrait??partyDefs[dialogue.npcId]?.portrait??0),el('div','grow',text(line.speaker||npc?.name||'',710,23,'#e5c27b',true),text(line.text||'',710,19))));const choices=el('div','choice-list');if(ui.line<lines.length-1){choices.classList.add('window-dialogue-advance');choices.append(text('Продолжение разговора',850,17,'#e9ca91',true),button('Следующая реплика',()=>{commit(M.chooseDialogue(state,'next'),{quiet:true,keepModal:true});ui.line=state.dialogue?.line||0;renderModal();},{width:280,focusKey:'dialogue-next'}));}else{choices.classList.add('window-dialogue-decisions');choices.append(text('Выберите ответ',850,19,'#e9ca91',true));for(const choice of (dialogue.choices||[]).filter(isAllowed)){const consequences=M.choiceConsequences(state,choice.id),choiceCard=el('div','window-choice-card'),choiceButton=button(choice.text,()=>{const old=state.dialogue?.id;commit(M.chooseDialogue(state,choice.id),{quiet:true});if(state.mode==='dialogue'){if(old!==state.dialogue?.id)ui.line=0;renderModal();}},{width:840,focusKey:'choice:'+dialogue.id+':'+choice.id});choiceCard.append(choiceButton);if(consequences.ok&&consequences.message){const consequence=text('Известные последствия: '+consequences.message,800,14,'#c5d8bd');consequence.id='window-consequence-'+dialogue.id+'-'+choice.id;choiceButton.setAttribute('aria-describedby',consequence.id);choiceCard.append(consequence);}choices.append(choiceCard);}if(!dialogue.choices?.length)choices.append(button('Завершить разговор',()=>commit(M.chooseDialogue(state,'close'),{quiet:true}),{width:250}));}body.append(choices);if(npc?.shop)body.append(button('Посмотреть товары',()=>{const id=npc.id;M.cancelDialogue(state);ui.shop=id;ui.modal='shop';renderModal();},{small:true,width:240}));ui100Decorate(body,'dialogue');}
function renderShop(body){
  const npc=areaDefs[state.areaId].npcs?.find(n=>n.id===ui.shop),stock=npc?.shop||npc?.shopItems||[];
  const wallet=el('div','window-wallet',text((npc?.name||'Торговец')+' · Кошелёк: '+state.gold+' золота',850,20,'#e0c281')),quote=el('div','window-wallet-quote',text('Выберите товар: здесь появится итог операции.',850,14));wallet.append(quote);body.append(wallet);
  const quoteRow=(row,label,forecast)=>{const show=()=>quote.replaceChildren(text(forecast.ok?label+' · Итог: '+forecast.price+' золота · После: '+(state.gold+(ui.windowShopMode==='sell'?forecast.price:-forecast.price))+' золота':label+' · '+(forecast.reason||forecast.message)+' · Кошелёк: '+state.gold+' золота',850,14));row.onfocusin=show;row.onpointerenter=show;return row;};
  ui.windowShopMode=ui.windowShopMode||'buy';const tabs=el('div','window-tabs');
  for(const [id,label]of [['buy','Купить'],['sell','Продать']]){const b=button(label,()=>{ui.windowShopMode=id;renderModal();},{small:true,width:240,focusKey:'shop-mode:'+id});b.setAttribute('aria-pressed',String(ui.windowShopMode===id));tabs.append(b);}
  if(npc?.smith)tabs.append(button('Ремонт',()=>{ui.smith=npc.id;openModal('smithy');},{small:true,width:150,focusKey:'shop-mode:repair'}));
  body.append(tabs);
  ui.windowShopQuantities=ui.windowShopQuantities||{};
  const quantityControls=(key,quantity,max)=>{const box=el('div','window-quantity',text('Количество: '+quantity,160,14));for(const [delta,label]of [[-1,'−1'],[1,'+1']])box.append(button(label,()=>{ui.windowShopQuantities[key]=windowQuantity(quantity+delta,max);renderModal();},{small:true,width:60,disabled:delta<0?quantity<=1:quantity>=max,focusKey:'quantity:'+key+':'+delta,ariaLabel:(delta<0?'Уменьшить':'Увеличить')+' количество'}));return box;};
  const rows=el('div',ui.windowShopMode==='buy'?'shop-list':'window-sale-list');
  if(ui.windowShopMode==='buy')for(const entry of stock){
    const id=typeof entry==='string'?entry:entry.id,d=itemDefs[id];if(!d)continue;
    const maximum=M.previewBuy(state,ui.shop,id),key='buy:'+id,quantity=windowQuantity(ui.windowShopQuantities[key],maximum.maxQuantity)||1,forecast=M.previewBuy(state,ui.shop,id,quantity),details=el('div','grow',text(d.name,300,17),text(forecast.price+' золота · Можно купить: '+forecast.maxQuantity,300,14),text(itemDescription(d),300,13),text(itemStatLine(d),300,13),quantityControls(key,quantity,maximum.maxQuantity));
    const owned=windowOwnership(state,id);details.append(text('У отряда: в сумке '+owned.bag+' · Надето '+owned.wearers.length+(owned.wearers.length?' · '+owned.wearers.map(w=>partyDefs[w.heroId].name).join(', '):''),300,14));
    const action=el('div','window-shop-action');if(!forecast.ok)action.append(text(forecast.reason||forecast.message,240,14,'#efbb9a'));
    action.append(button('Купить',()=>{if(state.revision!==forecast.revision){toast('Запас или кошелёк изменились. Проверьте итог ещё раз.');renderModal();return;}commit(M.buy(state,ui.shop,id,quantity),{keepModal:true});},{small:true,width:130,focusKey:'buy:'+ui.shop+':'+id,disabled:!forecast.ok,ariaLabel:'Купить '+d.name+' за '+forecast.price+' золота'}));
    rows.append(quoteRow(el('div','shop-entry',icon(d),details,action),d.name,forecast));
  }
  else state.bag.forEach((item,i)=>{
    if(!item||itemDefs[item.defId].kind==='quest')return;const d=itemDefs[item.defId],key='sell:'+item.uid,quantity=windowQuantity(ui.windowShopQuantities[key],item.qty)||1,forecast=M.previewSell(state,ui.shop,i,quantity);
    rows.append(quoteRow(el('div','shop-entry',icon(d),el('div','grow',text(d.name+' · В сумке: '+item.qty+' · Итог: '+forecast.price+' золота',540,16),text(itemDescription(d),540,13),durabilityMeter(M.durabilityInfo(item),el,text),quantityControls(key,quantity,item.qty),!forecast.ok&&text(forecast.reason||forecast.message,540,13,'#efbb9a')),button('Продать ×'+quantity,()=>{if(state.revision!==forecast.revision){toast('Сумка изменилась. Проверьте продажу ещё раз.');renderModal();return;}UI100.confirmRiskSale(ui,forecast,quantity,()=>commit(M.sell(state,ui.shop,i,quantity,forecast.uid),{keepModal:true}),renderModal);},{small:true,width:120,focusKey:'sell:'+ui.shop+':'+i,disabled:!forecast.ok,ariaLabel:'Продать '+d.name+' за '+forecast.price+' золота'})),d.name,forecast));
  });
  if(!rows.children.length)rows.append(text(ui.windowShopMode==='buy'?'У торговца сейчас нет товаров.':'В сумке нет предметов для продажи.',850,17));body.append(rows);ui100Decorate(body,'shop');
}
function renderSmith(body){
 const smith=areaDefs[state.areaId].npcs?.find(npc=>npc.id===ui.smith&&npc.smith);
 renderSmithy(body,{model:M,state,smith,items:itemDefs,party:partyDefs,el,text,button,icon,
   repair:request=>commit(M.repair(state,smith.id,request),{keepModal:true}),
   trade:()=>{ui.shop=smith.id;ui.windowShopMode='sell';openModal('shop');}});
}
function showPuzzle(id){ui.puzzleId=id;openModal('puzzle');renderModal();}
function renderPuzzle(body){const node=areaDefs[state.areaId].nodes.find(n=>n.id===ui.puzzleId);if(!node?.puzzle)return;body.append(text(node.puzzle.prompt,880,21));node.puzzle.choices.forEach((choice,i)=>body.append(button(choice.text,()=>{const r=M.solvePuzzle(state,node.id,i);commit(r);if(r.ok&&r.correct!==false)closeModal(true);else renderModal();},{width:830})));}

async function exportProgress(raw=false){await(raw?store.exportRaw():store.export(running?state:saved||state));toast(raw?'Исходные записи подготовлены к скачиванию.':'Файл прохождения подготовлен к скачиванию. Сохраните его в надёжном месте.');}
function renderComplete(body){const ending=ENDINGS[state.flags.public_truth?'public_truth':'stewardship'];body.append(text(ACT_INFO.title,900,32,'#e7ca8c',true),text(ending?.title||'Первый акт завершён',900,26,'#e7ca8c',true),text(ending?.summary||'Рассвет вернулся. Первый акт завершён.',900,23),text(ending?.nextHook||'',900,18),text('Завершено заданий: '+state.completedQuests.length+'\nПобеждено отрядов врагов: '+state.defeated.length+'\nВремя в игре: '+Math.floor(state.playSeconds/60)+' мин.',900,18),button('Экспортировать прохождение',()=>exportProgress(),{width:380}),button('В главное меню',()=>{closeModal(true);showMenu();},{width:280}));ui100Decorate(body,'complete');}


function renderAbout(body){
 body.append(text('Пепельная клятва · '+ACT_INFO.title+' · Демо 0.19.2',900,27,'#e7ca8c',true),
  text('Оригинальная история и игровые материалы для Авторской кузницы. Панели, портреты, иконки и поверхности созданы в ImageGen. Для 3D-моделей использован Meshy, для части анимаций и экипировки — Blender.',900,17),
  text('Кириллица · Cormorant SC и Lora · SIL Open Font License 1.1',900,16),
  text('Музыкальные темы и атмосфера созданы для игры. Записи шагов, металла и сундука · Kenney RPG Audio · CC0 1.0.',900,16));
 const audioLicense=el('a','row',text('Лицензия и звуковые материалы',370,15,'#e7ca8c',true));
 audioLicense.href='assets/act1/audio/README.md?v=forged-019';
 audioLicense.target='_blank';audioLicense.rel='noopener';
 body.append(audioLicense,text('Three.js · MIT License',900,22,'#e7ca8c'));
 fetch('assets/vendor/THREE-LICENSE.txt').then(r=>r.text()).then(value=>{if(ui.modal==='about')body.append(text(value,900,13));})
  .catch(()=>{if(ui.modal==='about')body.append(text('Полный текст лицензии включён в assets/vendor/THREE-LICENSE.txt',900,14));});
}
function showMenu(){cancelDrag();clearInput();ui.riskSale=null;if(ui.modal){ui.modal=null;$('gameModal').close();}paused=true;world?.requestCombatHover?.(null,null);updateAudioScene();$('actMenu').hidden=false;renderMenu();$('actHud').hidden=true;}
function resume(){if(!ready||!running||readOnly||ui.importing||contextLost||contextRecovering)return;UI100.restoreUIPreferences(localStorage,state,ui,M,areaDefs);ui.menuNotice='';paused=false;$('actMenu').hidden=true;last=performance.now();updateAudioScene();audio.start().catch(()=>{});syncMode();renderHud();if(ui.pendingObjectiveOpen){const objectiveId=ui.pendingObjectiveOpen;ui.pendingObjectiveOpen=null;if(['explore','battle'].includes(state.mode)){ui.trackedQuestId=objectiveId;openModal('journal');}}if(state.mode==='explore'&&!ui.modal)$('actWorld').focus({preventScroll:true});}
function renderMenu(status=''){const card=$('menuCard'),menuFocus=captureSurface(card),menuDisclosures=captureDisclosures(card);const service=windowDisclosure('menu-save','Сохранения и восстановление',text('Экспорт — копия прохождения в файл. Импорт — проверка файла и замена текущего прохождения. При сбое записи сначала экспортируйте прогресс.',330,14));if(saveError||store.corrupt||ui.importing)service.open=true;const brand=new Image();brand.src='assets/act1/painted/title.webp?v=painted-20261114-r2';brand.alt='Пепельная клятва';brand.className='gilded-brand';const actTitle=text(ACT_INFO.title,330,25,'#e9cb84',true);actTitle.classList.add('painted-act-title');card.replaceChildren(brand,actTitle,text('ДЕМО-ВЕРСИЯ · 0.19.2',330,16,'#b6e7e0',true),el('div','intro',text('Рассвет не исчез: его продают. Соберите отряд, выслушайте свидетелей и решите, кому достанется свет.',330,18)),text((status||(startupError?startupError:ready&&readOnly?writerMessage():'Пошаговое путешествие с отрядом\nДевять локаций · оригинальная история'))+(ready&&startupWarning?'\n'+startupWarning:''),330,14,'#c1c5b2'));if(startupError||writerSession.error||startupWarning)card.append(button('Повторить загрузку',()=>location.reload(),{width:290}));if(contextLost){card.append(text(contextRecovering?'Восстанавливаем графику. Прогресс остаётся в памяти.':contextError||'Графика недоступна. Возврат в мир включится после восстановления; экспорт доступен.',330,15,'#f0bc98',true),button('Повторить графику',restoreGraphics,{width:290,disabled:contextRecovering}));}if(ui.menuNotice)card.append(text(ui.menuNotice,330,15,'#f3d69e',true));if(store.corrupt&&typeof store.exportRaw==='function')service.append(button('Экспорт исходных записей',()=>exportProgress(true),{small:true,width:290}));if(saveError){card.append(text(saveWarning({failure:saveFailure,conflict:saveConflict}),330,16,'#f0bc98',true));if(running&&!loadFailed&&!saveConflict)service.append(button('Повторить сохранение',retrySave,{width:290,disabled:readOnly||saving,focusKey:'retry-save'}));}if(running)card.append(button('Вернуться в путь',resume,{disabled:!ready||readOnly||contextLost||contextRecovering,width:290}));if(saved&&!running)card.append(button('Продолжить акт',()=>{resetPresentation();state=structuredClone(saved);audioEventCursor.prime(state);ui.trackedQuestId=null;running=true;resume();},{disabled:!ready||readOnly||contextLost||contextRecovering,width:290}));card.append(button(ui.confirmNew?'Подтвердить новый путь':'Новая история',()=>{if((saved||running)&&!ui.confirmNew){ui.confirmNew=true;renderMenu();return;}ui.confirmNew=false;resetPresentation();state=M.newGame();audioEventCursor.prime(state);ui.trackedQuestId=null;running=true;resume();void save();},{disabled:!ready||readOnly||loadFailed||ui.importing||contextLost||contextRecovering,width:290,focusKey:'new-story'}));service.append(button('Экспорт сохранения',()=>exportProgress(),{small:true,width:290}),button('Импорт сохранения',()=>$('saveFile').click(),{small:true,width:290,disabled:readOnly||ui.importing}));card.append(service);const settingsBox=windowDisclosure('menu-settings','Настройки изображения, текста и звука');settingsBox.append(audioControls());settingsBox.append(button('Размер текста: '+Math.round(settings.textScale*100)+'%',()=>{settings.textScale=settings.textScale===1?1.25:settings.textScale===1.25?1.5:1;applySettings();renderMenu();},{small:true,width:290,focusKey:'text-scale'}),button('Качество: '+(settings.quality==='high'?'высокое':'низкое'),()=>{settings.quality=settings.quality==='high'?'low':'high';applySettings();renderMenu();},{small:true,width:290,focusKey:'quality'}));settingsBox.append(button('Снижение движения: '+(settings.reducedMotion?'включено':'выключено'),()=>{settings.reducedMotion=!settings.reducedMotion;applySettings();renderMenu();},{small:true,width:290,focusKey:'reduced-motion'}),button('Скорость показа боя: ×'+settings.presentationSpeed,()=>{settings.presentationSpeed=settings.presentationSpeed===1?1.5:settings.presentationSpeed===1.5?2:1;applySettings();renderMenu();},{small:true,width:290,focusKey:'presentation-speed'}));card.append(settingsBox);card.append(button('Об игре и лицензии',()=>openModal('about'),{small:true,width:290}));card.append(text('WASD или клик — движение · E — разговор\nI — сумка · J — журнал · M — карта · P — отряд\nСохранения первого акта отдельны от демо 0.2.',330,12,'#9db2a3'));const link=el('a','');link.href='https://theforgeforall.ru/game.html?id=ashen-oath';link.append(text('Авторская кузница · Страница игры',330,14,'#d6bb7d'));card.append(link);const legacy=el('a','');legacy.href='legacy-level1.html';legacy.append(text('Предыдущее демо · 0.2',330,13,'#a5b5a8'));card.append(legacy);ui100Decorate(card,'menu');restoreDisclosures(card,menuDisclosures);if(saveError||store.corrupt||ui.importing)service.open=true;restoreSurface(card,menuFocus);}
function saveAudioMix(){
 audio.setVolume(settings.volume);audio.setMix(settings);
 try{localStorage.setItem('ashen-oath-act1-settings',JSON.stringify(settings));}catch{}
}
function audioControls(){
 const group=el('div','menu-audio-mix');
 for(const [key,label] of [['volume','Общая громкость'],['music','Музыка'],['sfx','Эффекты'],['ambience','Окружение']]){
  const range=document.createElement('input');
  range.type='range';range.min='0';range.max='1';range.step='.05';range.value=settings[key];
  range.ariaLabel=label;range.dataset.focusKey='audio:'+key;
  range.oninput=()=>{settings[key]=Number(range.value);saveAudioMix();};
  group.append(el('div','menu-setting',text(label,160,14),range));
 }
 return group;
}
function applySettings(){settings={...normalizeSettings(settings),...normalizePresentationSettings(settings)};world?.setReducedMotion?.(settings.reducedMotion);world?.setPresentationSpeed?.(settings.presentationSpeed);world?.invalidateLayout?.();globalThis.document?.body?.classList.toggle('reduced',settings.reducedMotion);if(appliedTextScale!==settings.textScale){appliedTextScale=settings.textScale;lastHudSignature='';if(ui.modal)renderModal();}saveAudioMix();world?.quality(settings.quality);}
function frame(time){const dt=Math.min(.08,(time-(last||time))/1000);last=time;if(running&&!paused&&(ui.modal||state.mode!=='explore'||ui.presentationLock))M.update(state,dt,null);const walking=running&&!paused&&!ui.modal&&!ui.presentationLock&&state.mode==='explore';if(walking){const input=walkInput();M.update(state,dt,input);if(state.mode!=='explore'){clearInput();syncMode();}saveTime+=dt;if(saveTime>5)save();}if(world&&ready&&!paused&&!contextLost){world.setCombatSelection?.({skillId:ui.target?.skillId,targetId:ui.enemyId,targetIds:chosenSkill()?.target==='allEnemies'?(state.battle?.enemies||[]).filter(e=>e.hp>0).map(e=>e.uid):[],hoverTargetId:ui.hoverEnemy});world.render(state,running?dt:0);if(world.getCombatHover)ui.hoverEnemy=world.getCombatHover();if(ui.presentationLock&&!world.presentationPending()){ui.presentationLock=false;ui.presentationOrder=null;ui.hud50PresentationActor=null;lastHudSignature='';renderHud();}hudTime+=dt;if(hudTime>.35){hudTime=0;if(!ui.drag)renderHud();}}if(ui.drag?.active&&ui.drag.lastEvent){UI100.autoScrollDrag($('gameModal'),ui.drag.lastEvent);paintDropTarget(ui.drag,ui.drag.lastEvent);}updateAudioScene();walkingAudio(dt,walking&&state.mode==='explore');if(typeof nav50Update==='function')nav50Update(dt);arrow50Update(dt);requestAnimationFrame(frame);}
function resetPresentation(){ui.presentationLock=false;ui.presentationOrder=null;ui.hud50PresentationActor=null;ui.target=null;ui.enemyId=null;ui.allyId=null;world?.setCombatSelection?.({});world?.clearPresentation();clearInput();}
function clearDestination(){destination=null;approach=null;destinationPath=[];}
function setDestination(picked){
 const end=picked.id?approachTarget(state.areaId,picked,state.position):picked;
 const path=planPath(state.areaId,state.position,end,{bounds:areaBounds(areaDefs[state.areaId])});
 if(path.status!=='ready'){clearDestination();toast('К этой точке нет прохода.');return;}
 destinationPath=path.points.slice(1);
 destination=destinationPath.shift();
 approach=picked.id||null;
}
function walkInput(){
 let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
 let z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
 if(x||z){
  clearDestination();
  return {x:x*.82+z*.57,z:z*.82-x*.57};
 }
 while(destination){
  const dx=destination.x-state.position.x,dz=destination.z-state.position.z,d=Math.hypot(dx,dz);
  const after=destinationPath[0];
  if(d>(after?.x!==undefined?.38:.68)||after&&!validSegment(state.areaId,state.position,after)){
   if(d>1e-5)return {x:dx/Math.max(d,.45),z:dz/Math.max(d,.45)};
  }
  if(after){destination=destinationPath.shift();continue;}
  const id=approach;clearDestination();if(id)interact(id);
 }
 return null;
}
window.addEventListener('keydown',e=>{if(ignoreGameShortcut(e))return;if(canBattleShortcut(e,{running,paused,modal:ui.modal,mode:state.mode,locked:ui.presentationLock})&&UI100.battleShortcut(e,{state,ui,M,chooseAttack,selectSkill,battle,pendingBattleAction,targetEnemy,redraw:()=>{lastHudSignature='';renderHud();}})){e.preventDefault();return;}if(ownsMovementKey(e,{running,paused,modal:ui.modal,mode:state.mode,locked:ui.presentationLock}))e.preventDefault();if(e.code==='Escape'){if(ui.drag||ui.selected){cancelDrag();ui.selected=null;renderModal();}else if(ui.modal)closeModal();else if(state.mode==='battle'&&ui.target)cancelBattleChoice();else if(paused)resume();else showMenu();return;}if(ui.modal)return;if(paused||e.repeat||ui.presentationLock)return;if(e.code==='KeyI'){openModal('inventory');return;}if(e.code==='KeyJ'){openModal('journal');return;}if(e.code==='KeyM'){openModal('map');return;}if(e.code==='KeyP'){openModal('party');return;}if(e.code==='KeyE'&&state.mode==='explore'){const rawNearby=M.nearby(state),nearby=typeof nav50PreferredNearby==='function'?nav50PreferredNearby(rawNearby):rawNearby,n=nearby.find(n=>n.ready!==false);if(n)interact(n.id);else if(nearby.length)toast(nearby[0].reason||'Рядом пока нет доступного взаимодействия.');return;}if(!ui.modal&&!e.target?.closest?.('button,a,input,textarea,select,summary,[role=button],[contenteditable]'))keys.add(e.code);});window.addEventListener('keyup',e=>keys.delete(e.code));
function worldPointerAction(e){if(e.button!==0||paused||contextLost||ui.modal||ui.presentationLock)return;if(state.mode==='battle'){const id=world.pickCombatTarget?.(e.clientX,e.clientY);if(id)targetEnemy(id);return;}if(state.mode!=='explore')return;const picked=world.pick(e.clientX,e.clientY);if(!picked)return;setDestination(picked);}
$('actWorld').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||!e.pointerType){if(e.isPrimary!==false)worldPointerAction(e);return;}if(e.isPrimary===false){ui.worldTap=null;return;}ui.worldTap=worldTapStart(e);});
$('actWorld').addEventListener('pointerup',e=>{const tap=ui.worldTap;ui.worldTap=null;if(worldTapComplete(tap,e))worldPointerAction(e);});$('actWorld').addEventListener('pointercancel',()=>{ui.worldTap=null;});
$('actWorld').addEventListener('pointermove',e=>{if(ui.worldTap&&Math.hypot(e.clientX-ui.worldTap.x,e.clientY-ui.worldTap.y)>12)ui.worldTap=null;if(state.mode==='battle'&&!paused&&!ui.modal&&!ui.presentationLock)world?.requestCombatHover?.(e.clientX,e.clientY);});$('actWorld').addEventListener('pointerleave',()=>{ui.hoverEnemy=null;world?.requestCombatHover?.(null,null);});
window.addEventListener('pointermove',dragMove,{passive:false});window.addEventListener('pointerup',dragEnd);window.addEventListener('pointercancel',cancelDrag);window.addEventListener('blur',()=>{clearInput();cancelDrag();});window.addEventListener('resize',()=>{world?.invalidateLayout?.();cancelDrag();if(paused)renderMenu();else renderHud();if(ui.modal)renderModal();});document.addEventListener('visibilitychange',()=>{clearInput();last=performance.now();if(document.hidden){audio.pause();if(running){save();showMenu();}}});$('gameModal').addEventListener('cancel',e=>{e.preventDefault();if(state.mode!=='complete')closeModal();});$('saveFile').onchange=async e=>{let writing=false,importOwned=false;try{const file=e.target.files[0];if(!file)return;if(readOnly||!writerSession.owned)throw Error('Эта вкладка не владеет сохранением');if(saving||ui.importing)throw Error('Дождитесь завершения текущей записи и повторите импорт');ui.importing=true;saving=true;importOwned=true;renderMenu('Проверяем файл прохождения…');const imported=await store.import(file);M.validate(imported);if(readOnly||!writerSession.owned)throw Error('Доступ к сохранению изменился. Повторите импорт');renderMenu('Проверенное прохождение записывается…');if(loadFailed&&!store.corrupt)await store.load();writing=true;if(store.corrupt){if(typeof store.recover!=='function')throw Error('Восстановление хранилища ещё не готово. Исходные записи сохранены.');await store.recover(imported);}else await store.write(imported);resetPresentation();state=imported;audioEventCursor.prime(state);ui.trackedQuestId=null;running=true;saved=M.snapshot(state);saveError=false;saveFailure='';saveConflict=false;loadFailed=false;startupError='';lastSavedAt=new Date().toLocaleTimeString('ru-RU');ui.menuNotice='Импортированное прохождение проверено и сохранено';renderMenu(ui.menuNotice);}catch(error){if(writing){saveError=true;saveFailure=error.message;saveConflict=error.code==='SAVE_CONFLICT';}toast('Импорт не завершён: '+error.message);renderMenu('Импорт не записан. Текущее прохождение сохранено в памяти.');}finally{if(importOwned){saving=false;ui.importing=false;saveRequested=false;}e.target.value='';if(paused)renderMenu();}};
function graphicsLost(e){e.preventDefault();contextLost=true;contextRecovering=false;contextError='';clearInput();void save();showMenu();renderMenu('Графика приостановлена. Экспортируйте прогресс при необходимости.');}
async function restoreGraphics(){if(!contextLost||contextRecovering||!world)return false;contextRecovering=true;let message='';renderMenu('Восстанавливаем материалы и сцену…');try{await new Promise(resolve=>requestAnimationFrame(resolve));if(world.renderer?.getContext?.().isContextLost?.())throw Error('Графический контекст пока недоступен');resetPresentation();world.resize?.();world.invalidateLayout?.();await world.renderer?.compileAsync?.(world.scene,world.activeCamera||world.camera);world.render(state,0);if(world.renderer?.getContext?.().isContextLost?.())throw Error('Графический контекст снова потерян');contextLost=false;contextError='';lastHudSignature='';message='Графика восстановлена. Можно вернуться в путь.';return true;}catch(error){contextError='Не удалось восстановить графику: '+error.message+'. Экспортируйте прогресс и повторите загрузку страницы.';message=contextError;return false;}finally{contextRecovering=false;renderMenu(message);}}
$('actWorld').addEventListener('webglcontextlost',graphicsLost);$('actWorld').addEventListener('webglcontextrestored',()=>{void restoreGraphics();});window.addEventListener('pagehide',()=>{audio.pause();cancelDrag();clearInput();save();});
async function init(){
 await loadTypography();renderMenu('Открываем хронику…');applySettings();
 try{await store.open();saved=await store.load();if(saved)state=structuredClone(saved);audioEventCursor.prime(state);}catch(error){saveError=true;loadFailed=true;saveFailure=error.message;toast('Хранилище: '+error.message);}
 try{
  world=new World($('actWorld'));world.onPresentationCue=playPresentationCue;await world.load(message=>renderMenu(message));
  const animationLibrary=world.characterAnimations,expectedProfiles=Object.keys(animationLibrary?.manifest?.profiles||{}).length,availableProfiles=animationLibrary?.profiles.size||0;
  if(animationLibrary?.issues.length){startupWarning=expectedProfiles?'Движения: '+availableProfiles+' из '+expectedProfiles+'. Для недоступных профилей используются анимации исходных моделей.':'Используются анимации исходных моделей. Дополнительные движения не загрузились.';console.warn('Character animation loading:',animationLibrary.issues);}
  if(world.magicVfx?.loadIssues.length){startupWarning+=(startupWarning?'\n':'')+'Часть эффектов использует резервную графику. Можно повторить загрузку.';console.warn('Magic asset loading:',world.magicVfx.loadIssues);}
  await writerSession.acquire();await writerRefresh;ready=true;applySettings();
  renderMenu(readOnly?writerMessage():saveError?'Автосохранение недоступно. Экспортируйте прохождение вручную.':'Путь готов. Начните историю или продолжите прохождение.');
 }catch(error){console.error(error);startupError='Не удалось подготовить мир: '+error.message;renderMenu(startupError);}
 requestAnimationFrame(frame);
}

function enableAudio(event){
 if(!event.isTrusted||document.hidden||event.repeat)return;
 updateAudioScene();
 void audio.start().catch(()=>{});
}
$('actMenu').addEventListener('pointerdown',enableAudio);
$('actMenu').addEventListener('keydown',enableAudio);

window.__ashen={getState:()=>M.snapshot(state),getStatus:()=>({ready,running,paused,readOnly,saveError,contextLost,contextRecovering,mode:state.mode,version:'0.19.2-demo'}),save};
init();

function ui100Decorate(root,surface){UI100.decorate(root,surface,{state,menuState:running?state:saved,ui,M,partyDefs,enemyDefs,itemDefs,areaDefs,dialogueDefs,SKILLS,el,text,button,panel,settings,redraw:()=>{lastHudSignature='';renderHud();},renderModal,openModal,openObjective:ui100OpenObjective,targetEnemy,targetHero,pendingBattleAction,chosenSkill,battle,chooseAttack,selectSkill,cancelBattleChoice,toast,commit,locationItem,cancelDrag,nav50SelectQuest,storage:localStorage,window:globalThis,document});}
function ui100OpenObjective(id){if(!ready||readOnly||contextLost||contextRecovering||ui.importing)return;const source=running?state:saved;if(!source||['complete','dialogue'].includes(source.mode))return;if(!running&&saved){resetPresentation();state=structuredClone(saved);audioEventCursor.prime(state);running=true;}ui.pendingObjectiveOpen=id;resume();}
