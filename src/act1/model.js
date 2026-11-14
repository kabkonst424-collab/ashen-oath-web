import {AREA_GEOMETRY_REVISION, legacyPosition, migratePosition, nearestLand, returnArrival, walkableLayout} from './area-geometry.js?v=rivers-0181';
import {roleCatalog} from './hero-abilities.js?v=campaign-v1';
import * as CONTENT from './content.js?v=campaign-v1';
import {chestLoot,encounterLoot,enemyLoot,rollLoot} from './loot-tables.js?v=forged-019';
import {ACT_ENTRY_LEVELS, BOSS_CHAPTER_PRESSURE, LEVEL_CAP, STARTERS, experienceAtLevel, experienceThreshold, runedSkill, talentBonuses, talentCatalog, validTalents} from './campaign-progression.js?v=campaign-v1';

export const VERSION='1.1.2';
export const SCHEMA=2;
export const BAG_SIZE=30;
const list=value=>Array.isArray(value)?value:Object.values(value||{});
const index=value=>Object.fromEntries(list(value).map(v=>[v.id,v]));
const PARTY=index(CONTENT.PARTY),ITEMS=index(CONTENT.ITEMS),SKILLS=index(CONTENT.SKILLS),ENEMIES=index(CONTENT.ENEMIES),AREAS=index(CONTENT.AREAS),DIALOGUES=index(CONTENT.DIALOGUES);
const QUESTS=list(CONTENT.QUESTS),SLOTS=['weapon','armor','charm'];
const ACT_ONE_ENDINGS=Object.keys(CONTENT.ENDINGS||{});
const CAMPAIGN_ENDINGS=Object.keys(CONTENT.CAMPAIGN_ENDINGS||{campaign_return:null,campaign_council:null});
const KNOWN_FLAGS=new Set(['act1_complete','campaign_complete',...CAMPAIGN_ENDINGS]),KNOWN_RECEIPTS=new Set(),KNOWN_REWARDS=new Set();
function gatherFlags(value){if(!value||typeof value!=='object')return;for(const [key,entry]of Object.entries(value)){if(['requiresFlags','forbidFlags','completeFlags','onceFlags'].includes(key)&&Array.isArray(entry))for(const flag of entry)KNOWN_FLAGS.add(flag);if(key==='setFlags')for(const flag of Array.isArray(entry)?entry:Object.keys(entry||{}))KNOWN_FLAGS.add(flag);if(['flag','flagOnWin','enterFlag'].includes(key)&&typeof entry==='string')KNOWN_FLAGS.add(entry);if(entry&&typeof entry==='object')gatherFlags(entry);}}
function registerEffects(key){KNOWN_RECEIPTS.add('effect:'+key);KNOWN_RECEIPTS.add('reward:'+key);KNOWN_REWARDS.add(key);}
gatherFlags([CONTENT.AREAS,CONTENT.DIALOGUES,CONTENT.QUESTS]);
for(const dialogue of Object.values(DIALOGUES)){registerEffects('dialogue:'+dialogue.id);for(const choice of dialogue.choices||[])registerEffects('dialogue:'+dialogue.id+':'+choice.id);}
for(const a of Object.values(AREAS)){for(const node of a.nodes||[]){KNOWN_RECEIPTS.add('node:'+node.id);registerEffects('node:'+node.id);registerEffects('camp:'+node.id);}for(const encounter of a.encounters||[]){KNOWN_RECEIPTS.add('reward:encounter:'+encounter.id);KNOWN_REWARDS.add('encounter:'+encounter.id);for(let i=0;i<encounter.enemies.length;i++){KNOWN_RECEIPTS.add('reward:enemy:'+encounter.id+':'+i);KNOWN_REWARDS.add('enemy:'+encounter.id+':'+i);}}}
for(const quest of QUESTS){KNOWN_RECEIPTS.add('reward:quest:'+quest.id);KNOWN_REWARDS.add('quest:'+quest.id);}
const clone=value=>structuredClone(value);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const all=(s,flags)=>!flags||flags.every(flag=>!!s.flags[flag]);
const none=(s,flags)=>!flags||flags.every(flag=>!s.flags[flag]);
const allowed=(s,definition)=>all(s,definition.requiresFlags)&&none(s,definition.forbidFlags);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const area=s=>AREAS[s.areaId];
const kind=item=>item.kind||item.type;
const fail=message=>{throw Error(message);};
const result=(ok,message,extra={})=>({ok,message,...extra});
const totalExperience=hero=>experienceAtLevel(hero.level)+hero.xp;
const learnedTalents=(s,heroId)=>s.talents?.[heroId]||[];
const heroSkill=(s,heroId,skill)=>runedSkill(heroId,skill,learnedTalents(s,heroId));
function emit(s,type,message,data={}){s.events.push({type,message,...data});if(s.events.length>40)s.events.splice(0,s.events.length-40);}
function setFlags(s,flags){if(Array.isArray(flags))for(const flag of flags)s.flags[flag]=true;else if(flags)for(const [flag,value]of Object.entries(flags))s.flags[flag]=!!value;}
function receipt(s,id){if(s.claimed.includes(id))return false;s.claimed.push(id);return true;}
function itemDefinition(id){return ITEMS[id]||fail('Неизвестный предмет: '+id);}
const MAX_DURABILITY=100, WORN_DURABILITY=25;
const isEquipment=def=>SLOTS.includes(kind(def));
function stackMax(def){return isEquipment(def)?1:Math.max(1,Math.min(999,def.stackMax||def.maxStack||99));}
function itemRecord(runId,sequence,id,qty){
 const item={uid:runId+':i'+sequence,defId:id,qty};
 if(isEquipment(itemDefinition(id)))item.durability=MAX_DURABILITY;
 return item;
}
function createItem(s,id,qty=1){return itemRecord(s.runId,s.nextUid++,id,qty);}
export function durabilityInfo(item){
 const def=item&&ITEMS[item.defId];
 if(!def||!isEquipment(def))return null;
 const current=item.durability??MAX_DURABILITY,worn=current<=WORN_DURABILITY,broken=current===0;
 return {current,max:MAX_DURABILITY,worn,broken,ratio:current/MAX_DURABILITY,combatFactor:broken?.5:worn?.75:1};
}
function wearEquipment(s,heroId,slot,amount){
 const item=s.gear[heroId]?.[slot],before=durabilityInfo(item);
 if(!before||before.broken)return;
 item.durability=Math.max(0,before.current-amount);
 const after=durabilityInfo(item);
 if(after.broken||after.worn&&!before.worn){
  const name=ITEMS[item.defId].name,status=after.broken?'сломан':'требует ремонта';
  emit(s,'wear',name+' · '+status,{heroId,itemId:item.defId,slot,current:after.current,max:after.max,broken:after.broken});
 }
}
function insertItems(s,items){
 const bag=clone(s.bag);let next=s.nextUid;
 for(const entry of items||[]){const id=entry.id||entry.defId,def=itemDefinition(id);let qty=entry.qty??1;if(!Number.isSafeInteger(qty)||qty<1||qty>9999)fail('Недопустимое количество предметов');const max=stackMax(def);
  for(const item of bag){if(item?.defId===id&&item.qty<max){const moved=Math.min(qty,max-item.qty);item.qty+=moved;qty-=moved;if(!qty)break;}}
  while(qty){const free=bag.indexOf(null);if(free<0)fail('В сумке нет места. Освободите ячейку.');const moved=Math.min(qty,max);bag[free]=itemRecord(s.runId,next++,id,moved);qty-=moved;}
 }s.bag=bag;s.nextUid=next;
}
function heroBase(def,level){const b=def.stats||def;return {hp:(b.hp||b.maxHp||120)+(level-1)*16,mp:(b.mp||b.maxMp||30)+(level-1)*5,atk:(b.atk||20)+(level-1)*3,def:(b.def||12)+(level-1)*2,speed:(b.speed||12)+(level-1),initiative:(b.initiative??b.speed??12)+(level-1)};}
const STAT_KEYS=['hp','mp','atk','def','speed','initiative'];
function gearBonuses(item){
 const stats=ITEMS[item.defId]?.stats||{},factor=durabilityInfo(item)?.combatFactor??1;
 return {hp:stats.hp??stats.maxHp??0,mp:stats.mp??stats.maxMp??0,
  atk:stats.atk>0?Math.floor(stats.atk*factor):stats.atk||0,
  def:stats.def>0?Math.floor(stats.def*factor):stats.def||0,
  speed:stats.speed||0,initiative:stats.initiative??stats.speed??0};
}
export function stats(s,heroId){const hero=s.party.find(h=>h.id===heroId);if(!hero)return null;const out=heroBase(PARTY[heroId],hero.level);for(const slot of SLOTS){const item=s.gear[heroId]?.[slot];if(!item)continue;const bonuses=gearBonuses(item);for(const key of STAT_KEYS)out[key]+=bonuses[key];}const talents=talentBonuses(heroId,learnedTalents(s,heroId));for(const key of STAT_KEYS)out[key]+=talents[key]||0;out.initiative=Math.max(1,Math.round(out.initiative));out.maxHp=out.hp;out.maxMp=out.mp;return out;}
function refresh(s,full=false){for(const hero of s.party){const value=stats(s,hero.id);hero.maxHp=value.hp;hero.maxMp=value.mp;hero.hp=full?value.hp:clamp(hero.hp,0,value.hp);hero.mp=full?value.mp:clamp(hero.mp,0,value.mp);}}
function recruit(s,id){if(s.party.some(hero=>hero.id===id))return;if(!PARTY[id]||s.party.length>=4)fail('Этот спутник недоступен');const level=Math.max(1,Math.floor(s.party.reduce((sum,h)=>sum+h.level,0)/(s.party.length||1)));const base=heroBase(PARTY[id],level);s.party.push({id,level,xp:0,hp:base.hp,mp:base.mp,maxHp:base.hp,maxMp:base.mp});s.gear[id]={weapon:null,armor:null,charm:null};const starting=PARTY[id].startingGear||{};for(const slot of SLOTS)if(starting[slot]){const defId=typeof starting[slot]==='string'?starting[slot]:starting[slot].id;itemDefinition(defId);s.gear[id][slot]=createItem(s,defId);}refresh(s);const joined=s.party.find(h=>h.id===id);joined.hp=joined.maxHp;joined.mp=joined.maxMp;emit(s,'recruit',PARTY[id].name+' присоединяется к отряду.',{heroId:id});}
export function progressionInfo(s,heroId){
 const hero=s.party.find(h=>h.id===heroId);if(!hero)return null;const capped=hero.level>=LEVEL_CAP,threshold=experienceThreshold(hero.level),next=clone(s),future=next.party.find(h=>h.id===heroId);if(!capped)future.level++;
 const current=stats(s,heroId),nextStats=stats(next,heroId),gains=Object.fromEntries(Object.keys(current).map(k=>[k,nextStats[k]-current[k]]));
 return {heroId,level:hero.level,xp:hero.xp,threshold,capped,remaining:capped?0:threshold-hero.xp,progress:capped?1:hero.xp/threshold,nextLevel:capped?null:hero.level+1,stats:current,nextStats,gains,levelUpRefills:true,levelUpRevives:true};
}
export function talentInfo(s,heroId){
 const hero=s.party.find(h=>h.id===heroId);
 return hero ? talentCatalog(hero,learnedTalents(s,heroId),s.mode) : null;
}
export function learnTalent(s,heroId,talentId){return transact(s,next=>{
 const entry=talentInfo(next,heroId)?.branches.flatMap(b=>b.nodes).find(n=>n.id===talentId);
 if(!entry)fail('Неизвестный талант');
 if(!entry.available)fail(entry.reason);
 next.talents??={};
 (next.talents[heroId]??=[]).push(talentId);
 refresh(next);
 return {message:'Изучен талант «'+entry.name+'».',heroId,talentId};
});}
export function resetTalents(s,heroId){return transact(s,next=>{
 if(next.mode!=='explore')fail('Перераспределение доступно в пути');
 if(!next.party.some(h=>h.id===heroId))fail('Спутник не найден');
 if(!learnedTalents(next,heroId).length)fail('Таланты ещё не изучены');
 delete next.talents[heroId];
 refresh(next);
 return {message:'Очки талантов возвращены.',heroId};
});}

function grantHeroXP(s,hero,amount){
 const wasFallen=hero.hp===0,oldLevel=hero.level;
 hero.xp+=amount;
 while(hero.level<LEVEL_CAP&&hero.xp>=experienceThreshold(hero.level)){
  hero.xp-=experienceThreshold(hero.level);hero.level++;
  const value=stats(s,hero.id);hero.hp=value.hp;hero.mp=value.mp;
  emit(s,'level',PARTY[hero.id].name+': уровень '+hero.level,{heroId:hero.id,level:hero.level});
 }
 if(hero.level===LEVEL_CAP)hero.xp=Math.min(hero.xp,experienceThreshold(hero.level)-1);
 if(wasFallen&&hero.level>oldLevel){const restored=hero.hp;hero.maxHp=stats(s,hero.id).hp;hero.hp=0;reviveHero(s,hero,restored,hero.id);}
}
function grantXP(s,amount){
 if(!amount)return;
 for(const hero of s.party)grantHeroXP(s,hero,amount);
 refresh(s);
}
function deliverFittingItems(s,items){
 const remainder=[];for(const entry of items||[]){const id=entry.id||entry.defId,def=itemDefinition(id),qty=entry.qty??1,max=stackMax(def);if(!Number.isSafeInteger(qty)||qty<1||qty>9999)fail('Недопустимое количество предметов');
 const capacity=s.bag.reduce((n,i)=>n+(!i?max:i.defId===id?max-i.qty:0),0),delivered=Math.min(qty,capacity);if(delivered)insertItems(s,[{id,qty:delivered}]);if(delivered<qty)remainder.push({...entry,qty:qty-delivered});
 }return remainder;
}
function reward(s,value,id){
 if(!value||!receipt(s,'reward:'+id))return null;
 const goldBefore=s.gold,beforeXp=new Map(s.party.map(h=>[h.id,{level:h.level,total:totalExperience(h)}])),beforeItems=countBagItems(s),requested={};for(const entry of value.items||[]){const itemId=entry.id||entry.defId;requested[itemId]=(requested[itemId]||0)+(entry.qty??1);}
 s.gold=clamp(s.gold+(value.gold||0),0,9999999);grantXP(s,value.xp||0);const items=deliverFittingItems(s,value.items||[]);
 if(items.length){s.pendingRewards.push({id,items});emit(s,'rewardPending','Часть награды сохранена у отряда. Освободите место и заберите остаток.',{rewardId:id,items:clone(items)});}
 const afterItems=countBagItems(s);return {sourceId:id,receiptId:'reward:'+id,xp:value.xp||0,xpByHero:s.party.map(h=>({heroId:h.id,amount:totalExperience(h)-beforeXp.get(h.id).total,fromLevel:beforeXp.get(h.id).level,toLevel:h.level})),gold:s.gold-goldBefore,goldRequested:value.gold||0,items:Object.entries(requested).map(([itemId,qty])=>({id:itemId,qty,delivered:(afterItems[itemId]||0)-(beforeItems[itemId]||0),pending:qty-((afterItems[itemId]||0)-(beforeItems[itemId]||0))}))};
}
function lootSeed(runId){
 let value=2166136261;
 for(const char of runId)value=Math.imul(value^char.codePointAt(0),16777619);
 return value>>>0||1;
}
function lootRandom(s){
 let value=s.lootRng??lootSeed(s.runId);
 value^=value<<13;value^=value>>>17;value^=value<<5;
 s.lootRng=value>>>0;
 return s.lootRng/4294967296;
}
function rewardWithLoot(s,value,id,table){
 if(s.claimed.includes('reward:'+id))return null;
 const drops=rollLoot(table,()=>lootRandom(s));
 return reward(s,drops.length?{...value,items:[...(value?.items||[]),...drops]}:value,id);
}
export function upgradeLootState(s){
 s.lootRng??=lootSeed(s.runId);
 for(const item of [...s.bag,...s.party.flatMap(hero=>SLOTS.map(slot=>s.gear[hero.id][slot]))]){
  if(item&&isEquipment(itemDefinition(item.defId)))item.durability??=MAX_DURABILITY;
 }
 return s;
}
// The final choice grants its effects once, then leaves its authored epilogue readable.
function awaitingEnding(s){return s.mode==='dialogue'&&CAMPAIGN_ENDINGS.some(id=>s.flags[id]&&s.dialogue?.id==='ending_'+id);}
function syncQuests(s){for(let pass=0;pass<QUESTS.length+1;pass++){let changed=false;for(const quest of QUESTS){if(s.completedQuests.includes(quest.id)||!all(s,quest.requiresFlags)||!all(s,quest.completeFlags)||!quest.completeFlags?.length)continue;s.completedQuests.push(quest.id);const rewardGrant=reward(s,quest.rewards||quest.reward,'quest:'+quest.id);emit(s,'quest','Завершено: '+(quest.title||quest.name),{questId:quest.id,rewardGrant});changed=true;}if(!changed)break;}if(s.flags.campaign_complete&&!awaitingEnding(s)){s.mode='complete';s.dialogue=null;s.battle=null;}}
function transact(s,work){try{const next=clone(s),answer=work(next);if(answer?.ok===false)return answer;syncQuests(next);next.revision++;for(const key of Object.keys(s))delete s[key];Object.assign(s,next);return result(true,answer?.message||'Готово',answer||{});}catch(error){return result(false,error.message||'Действие недоступно');}}

export function newGame(starterId='alar'){
 if(!STARTERS.includes(starterId)||!PARTY[starterId])fail('Выберите начального героя');
 const firstArea=AREAS.monastery||list(CONTENT.AREAS)[0],spawn=firstArea.spawn||{x:-8,z:19};
 const s={schema:SCHEMA,mapRevision:AREA_GEOMETRY_REVISION,contentVersion:CONTENT.CONTENT_VERSION||1,runId:globalThis.crypto?.randomUUID?.()||'ashen-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9),areaId:firstArea.id,position:{x:spawn.x,z:spawn.z},angle:Math.PI,mode:'explore',party:[],talents:{},bag:Array(BAG_SIZE).fill(null),gear:{},gold:120,flags:{},completedQuests:[],claimed:[],defeated:[],dialogue:null,battle:null,revision:0,nextUid:1,playSeconds:0,rng:748291,lastCamp:{areaId:firstArea.id,position:{x:spawn.x,z:spawn.z}},pendingRewards:[],events:[]};
 s.lootRng=lootSeed(s.runId);recruit(s,starterId);
 const supplies=list(CONTENT.ITEMS).filter(item=>kind(item)==='consumable');
 const heal=supplies.find(item=>item.effect?.kind==='heal'),mp=supplies.find(item=>item.effect?.kind==='mp'),revival=supplies.find(item=>(item.effect||item.use)?.kind==='revive');
 if(heal)insertItems(s,[{id:heal.id,qty:5}]);
 if(mp)insertItems(s,[{id:mp.id,qty:2}]);
 if(revival)insertItems(s,[{id:revival.id,qty:1}]);
 setFlags(s,firstArea.setFlags);refresh(s,true);s.events=[];syncQuests(s);
 return s;
}
export function walkable(areaId,x,z){const a=AREAS[areaId];if(!a||!finite(x,-1000,1000)||!finite(z,-1000,1000))return false;return walkableLayout(a.layout,x,z);}
export function update(s,dt,input=null){if(!finite(dt,0,10))return s;s.playSeconds=Math.min(1e9,s.playSeconds+dt);if(s.mode!=='explore'||!input)return s;const x=Number(input.x)||0,z=Number(input.z)||0,length=Math.hypot(x,z);if(!length)return s;const step=Math.min(dt,.12)*5.4,nx=x/Math.max(1,length),nz=z/Math.max(1,length);const nextX=s.position.x+nx*step,nextZ=s.position.z+nz*step;if(walkable(s.areaId,nextX,s.position.z))s.position.x=nextX;if(walkable(s.areaId,s.position.x,nextZ))s.position.z=nextZ;s.angle=Math.atan2(nx,nz);return s;}
function objectLists(a){return [...(a.npcs||[]).map(v=>({...v,kind:'npc'})),...(a.nodes||[]).map(v=>({...v,kind:v.type||v.kind||'inspect'})),...(a.encounters||[]).map(v=>({...v,kind:'encounter'})),...(a.exits||[]).map(v=>({...v,kind:'exit'})),...(a.shops||[]).map(v=>({...v,kind:'shop'}))];}
function objectById(s,id){return objectLists(area(s)).find(o=>o.id===id);}
export function nearby(s){if(s.mode!=='explore')return [];return objectLists(area(s)).filter(o=>!s.defeated.includes(o.id)&&none(s,o.forbidFlags)&&!(o.type==='chest'&&s.claimed.includes('node:'+o.id))).map(o=>{const ready=allowed(s,o);return {...o,position:{x:o.x,z:o.z},distance:distance(s.position,o),ready,label:o.label||o.name||o.id,reason:ready?'':requirementsReason(s,o),missingFlags:(o.requiresFlags||[]).filter(f=>!s.flags[f])};}).filter(o=>o.distance<=(o.radius||3.4)).sort((a,b)=>a.distance-b.distance);}
function openDialogue(s,id,npcId=null){if(!DIALOGUES[id])fail('Этот разговор пока недоступен');s.mode='dialogue';s.dialogue={id,line:0,npcId};s.battle=null;emit(s,'dialogue',DIALOGUES[id].title||'Разговор',{dialogueId:id});}
function resolveDialogue(s,npc){return (npc.variants||[]).find(v=>allowed(s,v))?.dialogue||npc.dialogue;}
function checkNear(s,obj){if(s.mode!=='explore')fail('Сначала завершите текущее действие');if(!obj)fail('Объект не найден');if(distance(s.position,obj)>(obj.radius||3.8))fail('Подойдите ближе');if(!allowed(s,obj))fail('Сначала завершите текущую задачу');}
function processEffects(s,effect,key,table=null){
 if(!receipt(s,'effect:'+key))return null;
 for(const id of [effect.recruit].flat().filter(Boolean))recruit(s,id);
 setFlags(s,effect.setFlags);
 if(effect.flag)s.flags[effect.flag]=true;
 return rewardWithLoot(s,effect.rewards||effect.reward||{items:effect.items,gold:effect.gold,xp:effect.xp},key,table);
}
export function interact(s,id){return transact(s,next=>{
 const obj=objectById(next,id);
 checkNear(next,obj);
 if(obj.smith){delete next.shopId;return {message:obj.name||obj.label,smithId:obj.id};}
 if(obj.kind==='npc'){
  openDialogue(next,resolveDialogue(next,obj),obj.id);
  return {message:obj.name||'Разговор'};
 }
 if(obj.kind==='exit')return enterArea(next,obj.target||obj.to||obj.toAreaId||obj.areaId,obj.spawn||obj.toPosition,obj);
 if(obj.kind==='encounter'){
  if(next.defeated.includes(obj.id))fail('Этот отряд уже побеждён');
  startBattle(next,obj);return {message:'Начинается бой'};
 }
 if(obj.kind==='camp')return restInternal(next,obj);
 if(obj.kind==='shop'){next.shopId=obj.id;return {message:obj.label||obj.name||'Торговля',shopId:obj.id};}
 if(obj.puzzle)return {message:obj.puzzle.prompt,puzzle:clone(obj.puzzle),nodeId:obj.id};
 if(next.claimed.includes('node:'+obj.id)){
  if(obj.dialogue)openDialogue(next,obj.dialogue);
  return {message:obj.repeatText||'Здесь уже всё осмотрено.'};
 }
 const isChest=obj.type==='chest';
 const grant=processEffects(next,obj,'node:'+obj.id,isChest?chestLoot(next.areaId,obj):null);
 receipt(next,'node:'+obj.id);
 if(obj.dialogue)openDialogue(next,obj.dialogue);
 const message=obj.successText||obj.text||obj.description||'Найдено: '+(obj.label||obj.name||'припасы');
 if(!isChest||!grant)return {message};
 const lootGrant=summarizeRewardGrants([grant]);
 emit(next,'loot',message,{nodeId:obj.id,lootGrant});
 return {message,lootGrant};
});}
export function solvePuzzle(s,id,choice){return transact(s,next=>{const obj=objectById(next,id);checkNear(next,obj);if(!obj.puzzle)fail('Здесь нет загадки');if(next.claimed.includes('node:'+id))return {message:'Загадка уже решена.'};const option=obj.puzzle.choices?.[choice];if(!option)fail('Выберите ответ');if(!option.correct)return {message:option.response||obj.puzzle.failureText||'Знаки не отвечают. Попробуйте другое решение.',correct:false};processEffects(next,obj,'node:'+id);receipt(next,'node:'+id);if(obj.dialogue)openDialogue(next,obj.dialogue);return {message:obj.puzzle.successText||obj.successText||'Знаки складываются в верный узор.',correct:true};});}
export function chooseDialogue(s,choiceId){return transact(s,next=>{if(next.mode!=='dialogue'||!next.dialogue)fail('Разговор уже завершён');const dialogue=DIALOGUES[next.dialogue.id],choice=dialogue.choices?.find(c=>c.id===choiceId);if(!choice){if(choiceId==='next'||choiceId==='continue'||choiceId==='close'){const lines=dialogue.lines||[];if(choiceId!=='close'&&next.dialogue.line<lines.length-1){next.dialogue.line++;return {message:''};}if(!dialogue.choices?.length){processEffects(next,dialogue,'dialogue:'+dialogue.id);setFlags(next,dialogue.onceFlags);next.mode='explore';next.dialogue=null;return {message:'Разговор завершён'};}}fail('Выберите доступный ответ');}if(!allowed(next,choice))fail('Этот ответ недоступен');processEffects(next,choice,'dialogue:'+dialogue.id+':'+choice.id);setFlags(next,dialogue.onceFlags);if(choice.next){openDialogue(next,choice.next,next.dialogue.npcId);}else{next.mode='explore';next.dialogue=null;}return {message:choice.response||'Разговор завершён'};});}
export function cancelDialogue(s){return transact(s,next=>{if(next.mode!=='dialogue')fail('Разговор уже завершён');next.mode='explore';next.dialogue=null;return {message:'Разговор прерван'};});}
function enterArea(s,id,spawn,exit={}){
 const target=AREAS[id];
 if(!target)fail('Путь пока закрыт');
 if(!allowed(s,exit))fail('Этот путь ещё не открыт');
 const previousAct=area(s).act||1,act=target.act||1;
 const returnExit=target.exits.find(gate=>gate.target===s.areaId),dest=spawn||returnArrival(target,returnExit);
 if(!walkable(id,dest.x,dest.z))fail('Некорректная точка перехода');
 s.areaId=id;s.position={x:dest.x,z:dest.z};s.mode='explore';s.dialogue=null;s.battle=null;s.shopId=null;
 setFlags(s,target.setFlags);if(target.enterFlag)s.flags[target.enterFlag]=true;
 if(act>previousAct){
  const floor=experienceAtLevel(ACT_ENTRY_LEVELS[act]||1);
  for(const hero of s.party){
   const missing=floor-totalExperience(hero);
   if(missing>0)grantHeroXP(s,hero,missing);
  }
  refresh(s);
 }
 const title=target.name||target.title||id;
 emit(s,'travel',title,{areaId:id});
 return {message:title};
}
export function travel(s,exitId){return transact(s,next=>{const exit=objectById(next,exitId);checkNear(next,exit);if(exit.kind!=='exit')fail('Выберите выход из области');return enterArea(next,exit.target||exit.to||exit.toAreaId||exit.areaId,exit.spawn||exit.toPosition,exit);});}
function restInternal(s,node){refresh(s,true);s.lastCamp={areaId:s.areaId,position:{x:node.x,z:node.z}};processEffects(s,node,'camp:'+node.id);emit(s,'rest','Отряд восстановил силы. Лагерь стал точкой возвращения.');if(node.dialogue)openDialogue(s,node.dialogue);return {message:'Силы и мана восстановлены.'};}
export function rest(s,nodeId){return transact(s,next=>{const node=objectById(next,nodeId)||nearby(next).find(o=>o.kind==='camp');checkNear(next,node);if(node.kind!=='camp')fail('Отдохнуть можно в лагере');return restInternal(next,node);});}

function rng(s){let value=s.rng|0;value^=value<<13;value^=value>>>17;value^=value<<5;s.rng=value>>>0;return s.rng/4294967296;}
function enemyStats(def){return {hp:def.stats?.hp||def.hp||80,mp:def.stats?.mp||0,atk:def.stats?.atk||def.atk||20,def:def.stats?.def||def.def||8,speed:def.stats?.speed||12,initiative:Math.max(1,Math.round(def.stats?.initiative??def.stats?.speed??12))};}
const isBoss=def=>def.kind==='boss'||!!def.boss;
const DEFAULT_BOSS_PHASE=[{at:.5,damage:1.16,text:'Снимает печать'}];
const phaseList=def=>def.phases||(isBoss(def)?DEFAULT_BOSS_PHASE:[]);
const phaseSkill=def=>new Set([...(def.skills||[]),...phaseList(def).flatMap(phase=>phase.skills||[])]);
const initiativeForPhase=(def,phase)=>enemyStats(def).initiative + (BOSS_CHAPTER_PRESSURE[def.id]?.phaseInitiative || 0) * (phase-1);
function damageForPhase(def,phase){
 const balance=BOSS_CHAPTER_PRESSURE[def.id];
 const stance=phaseList(def)[phase-2]?.damage??1;
 return (balance?.power??1)*stance*(phase>=3?(balance?.peakPressure??1):1);
}
function advanceBossPhase(s,enemy,def){
 const phase=phaseList(def)[enemy.phase-1];
 if(!phase||enemy.hp/enemy.maxHp>=phase.at)return;
 enemy.phase++;
 if(def.phases)enemy.phaseRound=s.battle.round;
 battleLog(s,def.name+': фаза '+enemy.phase+' · '+phase.text);
}
function startBattle(s,encounter){const enemies=encounter.enemies.map((id,i)=>{const def=ENEMIES[typeof id==='string'?id:id.kind||id.id];if(!def)fail('Неизвестный противник');const b=enemyStats(def);return {uid:encounter.id+':'+i,kind:def.id,hp:b.hp,maxHp:b.hp,mp:b.mp,phase:1,status:{},intent:'attack'};});s.mode='battle';s.dialogue=null;s.battle={encounterId:encounter.id,enemies,activeHeroId:s.party.find(h=>h.hp>0)?.id,round:1,acted:[],log:[],status:{},forced:!!(encounter.required||encounter.forced),boss:!!encounter.boss||enemies.some(e=>ENEMIES[e.kind].kind==='boss')};telegraph(s);battleLog(s,'Отряд вступает в бой.');beginRoundOrder(s);resolveInitiative(s);}
function battleLog(s,message){s.battle.log.push(message);if(s.battle.log.length>30)s.battle.log.shift();emit(s,'battle',message);}
function telegraph(s){for(const enemy of s.battle.enemies){
 if(enemy.hp<=0)continue;
 const def=ENEMIES[enemy.kind],boss=isBoss(def);
 advanceBossPhase(s,enemy,def);
 const skills=phaseList(def)[enemy.phase-2]?.skills||def.skills||[];
 enemy.skillId=skills[(s.battle.round-(enemy.phaseRound||1))%Math.max(1,skills.length)]||null;
 const skill=SKILLS[enemy.skillId];
 const healBlocked=skill?.kind==='heal'&&!s.battle.enemies.some(e=>e.hp>0&&e.hp<e.maxHp);
 enemy.intent=skill?.kind==='guard'||healBlocked?'guard':skill?.kind==='heal'?'heal':boss&&!def.phases&&(enemy.hp/enemy.maxHp<.5||s.battle.round%3===0)?'all':skill?.target==='allEnemies'?'all':['heavy','attack'].includes(skill?.intent)?skill.intent:s.battle.round%3===0?'heavy':'attack';
 const authored=skill?.telegraph&&(skill.intent?skill.intent===enemy.intent:!healBlocked&&enemy.intent!=='heavy');
 enemy.telegraph=authored?skill.telegraph:enemy.intent==='all'?'Готовит удар по всему отряду':enemy.intent==='heavy'?'Готовит мощный удар':enemy.intent==='guard'?'Готовится защищаться':enemy.intent==='heal'?'Готовит восстановление союзника':'Прицеливается в одного героя';
}}
export function skillProgression(s,heroId){
 const hero=s.party.find(h=>h.id===heroId);if(!hero)return null;
 const skills=(PARTY[heroId].skills||[]).map(id=>SKILLS[id]).filter(Boolean).map(base=>{
  const skill=heroSkill(s,heroId,base),unlockLevel=skill.level||skill.unlockLevel||1;
  return {id:skill.id,name:skill.name,unlockLevel,unlocked:hero.level>=unlockLevel,cost:skillCost(skill),target:skill.target,kind:skill.kind,element:skill.element||'physical',runeId:skill.runeId||null};
 });
 const locked=skills.filter(k=>!k.unlocked),nextUnlockLevel=locked.length?Math.min(...locked.map(k=>k.unlockLevel)):null;
 return {heroId,policy:'authored-levels',skills,unlocked:skills.filter(k=>k.unlocked),nextUnlockLevel,nextUnlocks:locked.filter(k=>k.unlockLevel===nextUnlockLevel)};
}
export function availableSkills(s,heroId=s.battle?.activeHeroId){
 const hero=s.party.find(h=>h.id===heroId);
 if(!hero)return [];
 return (PARTY[heroId].skills||[]).map(id=>SKILLS[id]).filter(skill=>skill&&hero.level>=(skill.level||skill.unlockLevel||1)).map(skill=>heroSkill(s,heroId,skill));
}
/** Read-only methods for one fallen companion; choosing a method spends nothing. */
export function revivalOptions(s,targetId){
 const target=s.party.find(h=>h.id===targetId),out={ok:false,revision:s.revision,target:target?{id:target.id,name:PARTY[target.id].name,maxHp:target.maxHp}:null,options:[],message:'',supply:revivalSupplyInfo(s)};
 if(!target){out.message='Выберите павшего спутника.';return out;}
 if(target.hp>0){out.message='Этот спутник уже в сознании.';return out;}
 if(!['explore','battle'].includes(s.mode)){out.message='Сначала завершите текущее действие.';return out;}
 for(const [slot,item] of s.bag.entries()){
  if(!item)continue;const def=ITEMS[item.defId],effect=def?.effect||def?.use;
  if(!def||kind(def)!=='consumable'||effect?.kind!=='revive')continue;
  const power=effect.power||.4,amount=power<=1?Math.round(target.maxHp*power):power;
  out.options.push({kind:'item',slot,uid:item.uid,name:def.name,count:item.qty,amount:clamp(Math.round(amount),1,target.maxHp),enabled:true,cost:1,revision:s.revision,totalSupply:out.supply.quantity,remainingSupply:out.supply.quantity-1,lastSupply:out.supply.quantity===1});
 }
 for(const caster of s.party)for(const skill of availableSkills(s,caster.id).filter(k=>k.kind==='revive')){
  const cost=skillCost(skill),power=skill.power||.35;
  const reason=caster.hp<=0?PARTY[caster.id].name+' без сознания.':s.mode==='battle'&&s.battle?.activeHeroId!==caster.id?'Дождитесь хода: '+PARTY[caster.id].name+'.':caster.mp<cost?'Недостаточно маны: нужно '+cost+' MP.':'';
  out.options.push({kind:'skill',casterId:caster.id,skillId:skill.id,name:skill.name,casterName:PARTY[caster.id].name,cost,amount:clamp(Math.round(target.maxHp*(power>1?.35:power)),1,target.maxHp),enabled:!reason,reason,revision:s.revision,mpShortfall:Math.max(0,cost-caster.mp)});
 }
 out.ok=true;return out;
}
function reviveHero(s,hero,amount,actorId){
 if(hero.hp>0)fail('Этот спутник уже в сознании');
 hero.hp=clamp(Math.round(amount),1,hero.maxHp);
 const message=PARTY[hero.id].name+' возвращается в строй: '+hero.hp+' HP.';
 if(s.battle)battleLog(s,message);
 emit(s,'revive',message,{actorId:actorId||s.battle?.activeHeroId||s.party.find(h=>h.hp>0&&h.id!==hero.id)?.id||hero.id,targetId:hero.id,amount:hero.hp});
}
/** Exploration counterpart to normal battleAction; cost and HP commit atomically. */
export function reviveCompanion(s,targetId,request={}){return transact(s,next=>{
 if(next.mode!=='explore')fail('В бою подтвердите возрождение через панель действий');
 if(request.revision!==undefined&&request.revision!==next.revision)fail('Отряд изменился. Выберите способ возрождения заново.');
 const choices=revivalOptions(next,targetId);if(!choices.ok)fail(choices.message);
 const option=choices.options.find(o=>o.kind===request.kind&&(o.kind==='item'?o.slot===request.slot&&o.uid===request.uid:o.casterId===request.casterId&&o.skillId===request.skillId));
 if(!option)fail('Этот способ возрождения больше недоступен');if(!option.enabled)fail(option.reason);
 if(option.kind==='item')consume(next,option.slot,targetId);
 else{
  const caster=next.party.find(h=>h.id===option.casterId),target=next.party.find(h=>h.id===targetId);
  caster.mp-=option.cost;
  emit(next,'action',option.name,{actorId:caster.id,targetId,skillId:option.skillId,kind:'skill'});
  reviveHero(next,target,option.amount,caster.id);
 }
 const target=next.party.find(h=>h.id===targetId);
 return {message:PARTY[targetId].name+' возрождён: '+target.hp+' / '+target.maxHp+' HP.'};
});}
function heroStatus(s,id){return s.battle.status[id]||(s.battle.status[id]={});}
function rolledDamage(attacker,defender,power,magic,roll){const raw=attacker.atk*(power||1)-(magic?.3:.55)*defender.def;return Math.max(3,Math.round(raw*(.94+roll*.12)));}
function damage(s,attacker,defender,power,magic=false){return rolledDamage(attacker,defender,power,magic,rng(s));}
function enemyMultiplier(enemy,element,ignoreGuard=false){const def=ENEMIES[enemy.kind],weak=def.weakness||def.weakElement,vulnerable=!!element&&(weak===element||(Array.isArray(weak)&&weak.includes(element)));return {vulnerable,multiplier:(vulnerable?1.5:1)*(enemy.status.break>0?1.2:1)*(!ignoreGuard&&enemy.status.guard>0?.55:1)};}
function applyBreak(enemy,turns=2){if(enemy.status.break>0||enemy.status.breakRecovery>0)return false;enemy.status.break=clamp(turns,1,2);return true;}
function hitEnemy(s,enemy,amount,element,options={}){
 const def=ENEMIES[enemy.kind],{vulnerable,multiplier}=enemyMultiplier(enemy,element,options.ignoreGuard);
 enemy.hp=Math.max(0,enemy.hp-Math.round(amount*multiplier));
 if(vulnerable){
  const stagger=!def.phases&&applyBreak(enemy);
  battleLog(s,stagger?'Уязвимость! '+def.name+' теряет равновесие.':'Уязвимость! Урон по цели повышен.');
 }
 if(!enemy.hp)battleLog(s,def.name+' повержен.');
}

// Hero-only authored secondary effects. Enemy definitions never opt into these.
const abilityEffects=skill=>skill?.heroEffects||{};
const skillCost=skill=>skill?.mp??skill?.cost??0;
const periodicDamageName=(bleed)=>bleed?'Кровотечение':'Горение';
const abilityAmount=(spec,st)=>Math.max(1,Math.min(999,Math.round((spec?.base||0)+(spec?.scale||0)*st.atk)));
function abilityEnemyStats(enemy){const out=enemyStats(ENEMIES[enemy.kind]);if(enemy.status.fracture>0)out.def*=.75;return out;}
function abilityPower(skill,enemy,secondary=false){const fx=abilityEffects(skill);return (skill?.power||1)*(fx.heavyPunish&&['heavy','all'].includes(enemy.intent)?1.45:1)*(secondary?.55:1);}
function abilityFoes(s,skill,targetId){const living=(s.battle?.enemies||[]).filter(e=>e.hp>0);if(skill?.target==='allEnemies'||targetId==null)return living.map(enemy=>({enemy,secondary:false}));const primary=living.find(e=>e.uid===targetId);if(!primary)return [];const result=[{enemy:primary,secondary:false}];if(abilityEffects(skill).chain){const second=living.find(e=>e.uid!==primary.uid);if(second)result.push({enemy:second,secondary:true});}return result;}
function abilityFriends(s,hero,skill,targetId){return skill?.target==='self'||skill?.kind==='taunt'?[hero]:skill?.target==='allAllies'||targetId==null?s.party:s.party.filter(h=>h.id===targetId);}
function abilityHealAmount(s,hero,skill,ally){const st=stats(s,hero.id),power=skill.power||1,fx=abilityEffects(skill),base=power>5?power:Math.round((st.atk+st.mp*.2)*power+24),bonus=fx.triage&&ally.hp/ally.maxHp<=fx.triage.threshold?fx.triage.bonus:0;return ally.hp>0?Math.min(ally.maxHp-ally.hp,base+bonus):0;}
function abilityHealingUseful(s,hero,skill,ally){if(ally.hp<=0)return false;if(!s.battle)return ally.hp<ally.maxHp;const fx=abilityEffects(skill),effect=s.battle.status[ally.id]||{};return ally.hp<ally.maxHp||fx.manaTransfer&&ally.id!==hero.id&&ally.mp<ally.maxMp||fx.regen&&(effect.regen||0)<fx.regen.turns||fx.rallyMana&&abilityLowestMana(s,hero.id)?.id===ally.id;}
function abilityLowestMana(s,casterId){return s.party.filter(h=>h.hp>0&&h.id!==casterId&&h.mp<h.maxMp).sort((a,b)=>a.mp/a.maxMp-b.mp/b.maxMp)[0];}
function abilityLowestHealth(s){return s.party.filter(h=>h.hp>0&&h.hp<h.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];}
function abilityPreviewEffects(s,hero,skill,targetId,targets){
 const fx=abilityEffects(skill),st=stats(s,hero.id),result=[],friends=abilityFriends(s,hero,skill,targetId),foes=abilityFoes(s,skill,targetId),add=(targetId,kind,label,extra={})=>{let detail='';if(extra.amount!==undefined)detail=kind==='mana'?extra.amount+' MP':kind==='chill'?extra.amount+'%':kind==='burn'?extra.amount+' урона':kind==='barrier'?extra.amount+' поглощения':kind==='regen'||kind==='triage'?extra.amount+' HP':kind==='counter'?'1 ответ':'';if(extra.min!==undefined)detail=extra.min+'–'+extra.max+' HP';if(extra.duration)detail+=(detail?' · ':'')+extra.duration+' ход.';result.push({targetId,kind,label:label+(detail?' · '+detail:''),...extra});};
 for(const {enemy}of foes){if(fx.ignoreGuard&&enemy.status.guard>0)add(enemy.uid,'ignoreGuard','Удар обходит защитную стойку');if(fx.stripGuard&&enemy.status.guard>0)add(enemy.uid,'stripGuard','Снимет защитную стойку');if(fx.burn)add(enemy.uid,'burn',periodicDamageName(fx.bleed)+' перед действиями противника',{amount:abilityAmount(fx.burn,st),duration:fx.burn.turns,bleed:!!fx.bleed});if(fx.chill)add(enemy.uid,'chill','Ослабит следующую атаку',{amount:Math.max(enemy.status.chill>0?enemy.status.chillPower||0:0,fx.chill.percent),duration:1});if(fx.fracture)add(enemy.uid,'fracture','Броня ослаблена на 25%',{amount:25,duration:2});if(fx.disrupt)add(enemy.uid,'disrupt','Следующая магия заменится обычной атакой',{duration:2});if(fx.heavyPunish&&['heavy','all'].includes(enemy.intent))add(enemy.uid,'break','Прервёт тяжёлую подготовку, если нет восстановления равновесия',{duration:1});}
 if(fx.chain&&targetId!=null&&foes.length>1)add(foes[1].enemy.uid,'chain','Цепь: дополнительный разряд 55% мощности');
 for(const ally of friends){if(ally.hp<=0&&skill.kind!=='revive')continue;if(fx.emergencyBarrier&&ally.hp>0&&ally.hp/ally.maxHp<=fx.emergencyBarrier.threshold)add(ally.id,'barrier','Экстренный барьер после лечения; не складывается',{amount:Math.max(abilityAmount(fx.emergencyBarrier,st),s.battle.status[ally.id]?.barrier||0),duration:fx.emergencyBarrier.turns});if(fx.triage&&ally.hp>0&&ally.hp/ally.maxHp<=fx.triage.threshold)add(ally.id,'triage','Экстренное исцеление: дополнительный предел',{amount:fx.triage.bonus});if(fx.manaTransfer&&ally.hp>0&&ally.id!==hero.id)add(ally.id,'mana','Восстановит ману',{amount:Math.min(fx.manaTransfer,ally.maxMp-ally.mp)});if(fx.barrier&&ally.hp>0)add(ally.id,'barrier','Барьер поглотит урон; не складывается',{amount:Math.max(abilityAmount(fx.barrier,st),s.battle.status[ally.id]?.barrier||0),duration:fx.barrier.turns});if(fx.regen&&ally.hp>0)add(ally.id,'regen','Восстановление в начале ходов союзника',{amount:Math.max(s.battle.status[ally.id]?.regen>0?s.battle.status[ally.id].regenPower||0:0,abilityAmount(fx.regen,st)),duration:fx.regen.turns});if(fx.reviveGuard&&ally.hp===0)add(ally.id,'guard','После возрождения урон снижен на 35% до хода союзника',{duration:1});}
 if(fx.counter)add(hero.id,'counter','Один ответный удар после физического попадания',{duration:2,amount:1});if(fx.cover&&targetId&&targetId!==hero.id)add(hero.id,'cover','Прикроет выбранного союзника: 30% урона примет Алар',{duration:2,protectsId:targetId});if(fx.tauntSelf)add(hero.id,'taunt','Одиночные атаки направлены на Радана; массовые не перенаправляются',{duration:2});
 if(fx.rallyMana){const ally=abilityLowestMana(s,hero.id);if(ally)add(ally.id,'mana','Поддержит самого истощённого спутника',{amount:Math.min(fx.rallyMana,ally.maxMp-ally.mp)});}
 if(fx.restoreSelfMana)add(hero.id,'mana','Восстановит собственную ману',{amount:Math.min(fx.restoreSelfMana,hero.maxMp-hero.mp)});
 if(fx.lifeHeal){const ally=abilityLowestHealth(s),damage=targets.filter(t=>t.effect==='damage').reduce((n,t)=>n+t.max,0);if(ally)add(ally.id,'lifeHeal','Свет исцелит самого раненого живого спутника',{min:Math.min(ally.maxHp-ally.hp,Math.round(targets.reduce((n,t)=>n+(t.effect==='damage'?t.min:0),0)*fx.lifeHeal)),max:Math.min(ally.maxHp-ally.hp,Math.round(damage*fx.lifeHeal))});}
 return enrichSupportPreview(s,hero,skill,targetId,enrichDebuffPreview(s,enrichRegenPreview(s,enrichBarrierPreview(s,result))));
}
function abilityProvoke(s,heroId){for(const ally of s.party)if(ally.id!==heroId&&s.battle.status[ally.id]?.taunt>0)s.battle.status[ally.id].taunt=0;heroStatus(s,heroId).taunt=2;}
function abilitySetBarrier(s,ally,spec,st){const effect=heroStatus(s,ally.id);effect.barrier=Math.max(effect.barrier||0,abilityAmount(spec,st));effect.barrierTurns=Math.max(effect.barrierTurns||0,spec.turns);}
function abilityRestoreMana(s,hero,amount,actorId){const actual=Math.min(hero.maxMp-hero.mp,amount);if(actual<=0)return;hero.mp+=actual;battleLog(s,PARTY[hero.id].name+' восстанавливает '+actual+' MP.');emit(s,'mana',String(actual),{actorId,targetId:hero.id,amount:actual});}
function applyAbilityEffects(s,hero,skill,targetId,dealt,priorHp={}){
 const fx=abilityEffects(skill),st=stats(s,hero.id),friends=abilityFriends(s,hero,skill,targetId);
 for(const {enemy}of abilityFoes(s,skill,targetId)){if(enemy.hp<=0)continue;if(fx.burn){enemy.status.burn=fx.burn.turns;enemy.status.burnPower=abilityAmount(fx.burn,st);if(fx.bleed)enemy.status.bleed=1;else delete enemy.status.bleed;}if(fx.chill){enemy.status.chillPower=Math.max(enemy.status.chill>0?enemy.status.chillPower||0:0,fx.chill.percent);enemy.status.chill=1;}if(fx.fracture)enemy.status.fracture=2;if(fx.disrupt)enemy.status.disrupt=2;if(fx.heavyPunish&&['heavy','all'].includes(enemy.intent))applyBreak(enemy,1);}
 for(const ally of friends)if(ally.hp>0){if(fx.emergencyBarrier&&priorHp[ally.id]>0&&priorHp[ally.id]/ally.maxHp<=fx.emergencyBarrier.threshold)abilitySetBarrier(s,ally,fx.emergencyBarrier,st);if(fx.manaTransfer&&ally.id!==hero.id)abilityRestoreMana(s,ally,fx.manaTransfer,hero.id);if(fx.barrier)abilitySetBarrier(s,ally,fx.barrier,st);if(fx.regen){const effect=heroStatus(s,ally.id);effect.regenPower=Math.max(effect.regen>0?effect.regenPower||0:0,abilityAmount(fx.regen,st));effect.regen=Math.max(effect.regen||0,fx.regen.turns);}if(fx.reviveGuard){const effect=heroStatus(s,ally.id);effect.guard=1;effect.guardMultiplier=.65;delete effect.guardUntilRound;}}
 if(fx.counter){const effect=heroStatus(s,hero.id);effect.counter=2;effect.counterCharges=1;effect.counterPower=.65;}
 if(fx.cover&&targetId!==hero.id&&s.party.some(h=>h.id===targetId&&h.hp>0)){const effect=heroStatus(s,hero.id);effect.cover=2;effect.coverTargetId=targetId;}
 if(fx.tauntSelf)abilityProvoke(s,hero.id);
 if(fx.rallyMana){const ally=abilityLowestMana(s,hero.id);if(ally)abilityRestoreMana(s,ally,fx.rallyMana,hero.id);}
 if(fx.restoreSelfMana)abilityRestoreMana(s,hero,fx.restoreSelfMana,hero.id);
 if(fx.lifeHeal&&dealt>0){const ally=abilityLowestHealth(s);if(ally){const amount=Math.min(ally.maxHp-ally.hp,Math.round(dealt*fx.lifeHeal));ally.hp+=amount;battleLog(s,PARTY[ally.id].name+': свет вернул '+amount+' HP.');emit(s,'heal',String(amount),{actorId:hero.id,targetId:ally.id,amount,source:'lifeHeal'});}}
}
function abilityHeroTurnStart(s,heroId){const hero=s.party.find(h=>h.id===heroId),effect=heroStatus(s,heroId);if(hero.hp<=0)return;if(effect.regen>0){const amount=Math.min(hero.maxHp-hero.hp,effect.regenPower);hero.hp+=amount;effect.regen--;if(amount){battleLog(s,PARTY[heroId].name+': восстановление '+amount+' HP.');emit(s,'heal',String(amount),{actorId:heroId,targetId:heroId,amount,source:'regen'});}}for(const key of ['barrierTurns','counter','cover'])if(effect[key]>0)effect[key]--;if(effect.barrierTurns!==undefined&&!effect.barrierTurns)effect.barrier=0;if(effect.counter!==undefined&&!effect.counter)effect.counterCharges=0;}
function abilityAbsorb(s,hero,amount){const effect=heroStatus(s,hero.id),absorbed=Math.min(amount,effect.barrier||0);if(absorbed){effect.barrier-=absorbed;battleLog(s,PARTY[hero.id].name+': барьер поглотил '+absorbed+'.');}return {amount:amount-absorbed,absorbed};}
function abilityTakeHit(s,enemy,hero,amount,magic=false){
 const effect=heroStatus(s,hero.id);if(effect.guard>0)amount=Math.max(1,Math.round(amount*(effect.guardMultiplier??.42)));const coverer=s.party.find(h=>h.id!==hero.id&&h.hp>0&&heroStatus(s,h.id).cover>0&&heroStatus(s,h.id).coverTargetId===hero.id),share=coverer?Math.min(coverer.hp,Math.round(amount*.3)):0;
 const hit=(target,incoming,redirected=false)=>{const reduced=abilityAbsorb(s,target,incoming),actual=Math.min(target.hp,reduced.amount);target.hp-=actual;battleLog(s,ENEMIES[enemy.kind].name+' → '+PARTY[target.id].name+': '+actual+' урона.');emit(s,'hit',String(actual),{actorId:enemy.uid,targetId:target.id,amount:actual,rolledAmount:reduced.amount,overkill:reduced.amount-actual,absorbed:reduced.absorbed,redirected});if(actual>0)wearEquipment(s,target.id,'armor',2);if(target.hp===0){const status=heroStatus(s,target.id);for(const key of ['regen','barrier','barrierTurns','counter','counterCharges','cover'])if(status[key]!==undefined)status[key]=0;}return actual;};
 const actual=hit(hero,amount-share);if(coverer&&share>0)hit(coverer,share,true);
 if(actual>0&&!magic&&hero.hp>0&&enemy.hp>0&&effect.counter>0&&effect.counterCharges>0){effect.counterCharges--;const before=enemy.hp,retaliation=damage(s,stats(s,hero.id),abilityEnemyStats(enemy),effect.counterPower);emit(s,'action','Ответный удар',{actorId:hero.id,targetId:enemy.uid,kind:'attack',source:'counter'});hitEnemy(s,enemy,retaliation);emit(s,'hit',String(before-enemy.hp),{actorId:hero.id,targetId:enemy.uid,amount:before-enemy.hp,source:'counter'});if(before>enemy.hp)wearEquipment(s,hero.id,'weapon',1);}
}
function plainAbilityStatus(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);}
function validAbilityEnemyStatus(status,int){return plainAbilityStatus(status)&&Object.entries(status).every(([key,value])=>['break','breakRecovery','guard','burn','chill','fracture','disrupt'].includes(key)?int(value,0,3):key==='burnPower'?int(value,0,999):key==='chillPower'?int(value,0,60):key==='bleed'?value===1&&status.burn>0:false)&&(!(status.burn>0)||status.burnPower>0)&&(!(status.chill>0)||status.chillPower>0);}
function validAbilityHeroStatus(s,id,status,int){return plainAbilityStatus(status)&&Object.entries(status).every(([key,value])=>key==='guardUntilRound'?int(value,1,10001):key==='guardMultiplier'?finite(value,.05,1):['guard','attack','taunt'].includes(key)?int(value,0,5):['regen','barrierTurns','counter','cover'].includes(key)?int(value,0,3):['barrier','regenPower'].includes(key)?int(value,0,999):key==='counterCharges'?int(value,0,1):key==='counterPower'?finite(value,.1,2):key==='coverTargetId'?typeof value==='string'&&value!==id&&s.party.some(h=>h.id===value):false)&&(!(status.regen>0)||status.regenPower>0)&&(!(status.barrier>0)||status.barrierTurns>0)&&(!(status.counter>0)||int(status.counterCharges,0,1)&&finite(status.counterPower,.1,2))&&(!(status.cover>0)||typeof status.coverTargetId==='string');}

export function battlePreview(s,action={},targetId=action.targetId){
 const out={ok:false,kind:action.kind||'attack',skillId:action.skillId||null,cost:0,targets:[],additionalEffects:[],estimate:true,accuracy:100,message:''};
 if(!s.battle){out.message='Бой не идёт';return out;}const hero=s.party.find(h=>h.id===s.battle.activeHeroId&&h.hp>0);if(!hero){out.message='Нет действующего героя';return out;}if(action.kind==='item')return previewUseItem(s,action.slot,targetId);
 const skill=action.kind==='skill'?availableSkills(s,hero.id).find(k=>k.id===action.skillId):null;if(action.kind==='skill'&&!skill){out.message='Это умение ещё не изучено';return out;}
 const effect=skill?.kind||action.kind||'attack',st=stats(s,hero.id),fx=abilityEffects(skill);out.kind=effect;out.cost=skillCost(skill);out.affordable=hero.mp>=out.cost;out.description=skill?.description||'';
 if(['attack','damage','break'].includes(effect)){
  const targets=abilityFoes(s,skill,targetId);if(!targets.length){out.message='Выберите живого противника';return out;}if(effect==='attack'&&s.battle.status[hero.id]?.attack>0)st.atk*=1.3;
  for(const {enemy,secondary}of targets){const magic=!!skill?.element&&skill.element!=='physical',mult=enemyMultiplier(enemy,skill?.element,fx.ignoreGuard||fx.stripGuard),amount=roll=>Math.min(enemy.hp,Math.round(rolledDamage(st,abilityEnemyStats(enemy),abilityPower(skill,enemy,secondary),magic,roll)*mult.multiplier));out.targets.push({id:enemy.uid,side:'enemy',name:ENEMIES[enemy.kind].name,min:amount(0),max:amount(1),effect:'damage',vulnerable:mult.vulnerable,secondary});}
 }else if(['heal','revive','guard','buff','taunt'].includes(effect)){
  const friends=abilityFriends(s,hero,skill,targetId);if(!friends.length){out.message='Выберите спутника';return out;}for(const ally of friends){let amount=0;if(effect==='heal')amount=abilityHealAmount(s,hero,skill,ally);if(effect==='revive'&&ally.hp===0)amount=Math.max(1,Math.round(ally.maxHp*((skill.power||.35)>1?.35:skill.power)));out.targets.push({id:ally.id,side:'party',name:PARTY[ally.id].name,min:amount,max:amount,effect,alive:ally.hp>0});}
 }else if(effect==='defend')out.message='Урон снижен на 58% до следующего хода этого героя.';else{out.message='Для этого действия нет прогноза';return out;}
 if(skill){
  out.additionalEffects=abilityPreviewEffects(s,hero,skill,targetId,out.targets);
  for(const t of out.targets)if(t.vulnerable&&ENEMIES[s.battle.enemies.find(enemy=>enemy.uid===t.id)?.kind]?.phases){
   out.additionalEffects.push({targetId:t.id,kind:'bossResolve',label:'Уязвимость: ×1,5 к урону. Сбивает действие прерывающий приём.'});
  }
 }
 out.reason=skill?skillEligibility(s,hero,skill,targetId):'';out.canCommit=!out.reason&&out.affordable;out.ok=targetId==null?true:out.canCommit;if(out.reason&&targetId!=null){out.message=out.reason;return out;}
 if(!out.message)out.message=out.targets.map(t=>t.name+': '+(t.effect==='damage'?'урон ≈ '+t.min+'–'+t.max:t.effect==='heal'?'лечение '+t.max:t.effect==='revive'?'возвращение '+t.max+' HP':t.effect==='guard'?'защита':t.effect==='buff'?'защита и усиление':'провокация')).join(' · ');if(['guard','buff','taunt'].includes(effect)&&out.description)out.message=out.description+' '+out.message;return out;
}
function skillEligibility(s,hero,skill,targetId){
 const friends=abilityFriends(s,hero,skill,targetId),foes=abilityFoes(s,skill,targetId),fx=abilityEffects(skill);if(skill.target==='enemy'&&!s.battle?.enemies.some(e=>e.uid===targetId&&e.hp>0))return 'Выберите живого противника';if(skill.target==='ally'&&!s.party.some(h=>h.id===targetId))return 'Выберите спутника';if(hero.mp<skillCost(skill))return 'Недостаточно маны';if(['damage','break'].includes(skill.kind)&&!foes.length)return 'Выберите живого противника';if(['heal','revive','guard','buff'].includes(skill.kind)&&!friends.length)return 'Выберите спутника';if(skill.kind==='heal'&&!friends.some(h=>abilityHealingUseful(s,hero,skill,h)))return 'Выберите раненого спутника';if(skill.kind==='revive'&&!friends.some(h=>h.hp===0))return 'Выберите павшего спутника';if(['guard','buff'].includes(skill.kind)&&!friends.some(h=>h.hp>0))return 'Выберите живого спутника';if(fx.cover&&targetId===hero.id)return 'Обет связывает Алара с другим живым спутником';return '';
}
function applySkill(s,hero,skill,targetId){
 const reason=skillEligibility(s,hero,skill,targetId);if(reason)fail(reason);const cost=skillCost(skill),fx=abilityEffects(skill),friends=abilityFriends(s,hero,skill,targetId),foes=abilityFoes(s,skill,targetId),priorHp=Object.fromEntries(friends.map(h=>[h.id,h.hp]));if(!['damage','break','heal','revive','guard','buff','taunt'].includes(skill.kind))fail('Неизвестное умение');hero.mp-=cost;const st=stats(s,hero.id);let dealt=0;
 emit(s,'action',skill.name,{actorId:hero.id,skillId:skill.id,targetId,kind:'skill',...(skill.runeId?{runeId:skill.runeId,element:skill.element}:{})});battleLog(s,PARTY[hero.id].name+': '+skill.name+'.');
 if(['damage','break'].includes(skill.kind)){for(const {enemy:foe,secondary}of foes){if(fx.stripGuard)foe.status.guard=0;const before=foe.hp,amount=damage(s,st,abilityEnemyStats(foe),abilityPower(skill,foe,secondary),!!skill.element&&skill.element!=='physical');hitEnemy(s,foe,amount,skill.element,{ignoreGuard:fx.ignoreGuard});if(skill.kind==='break')applyBreak(foe);const actual=before-foe.hp;dealt+=actual;battleLog(s,ENEMIES[foe.kind].name+' получает '+actual+' урона.');emit(s,'hit',String(actual),{actorId:hero.id,targetId:foe.uid,amount:actual});}}
 else if(skill.kind==='heal'){for(const ally of friends)if(ally.hp>0){const amount=abilityHealAmount(s,hero,skill,ally);ally.hp+=amount;battleLog(s,PARTY[ally.id].name+' восстанавливает '+amount+' здоровья.');emit(s,'heal',String(amount),{actorId:hero.id,targetId:ally.id,amount});}}
 else if(skill.kind==='revive'){for(const ally of friends)if(ally.hp===0)reviveHero(s,ally,Math.round(ally.maxHp*(skill.power>1?.35:skill.power)),hero.id);}
 else if((skill.kind==='guard'||skill.kind==='buff')&&!fx.barrierOnly){for(const ally of friends)if(ally.hp>0){const effect=heroStatus(s,ally.id);effect.guard=2;if(skill.target==='allAllies')effect.guardUntilRound=s.battle.round+1;else delete effect.guardUntilRound;effect.guardMultiplier=skill.kind==='guard'?clamp(1-(skill.power??.58),.05,1):.42;if(skill.kind==='buff')effect.attack=3;}}
 else if(skill.kind==='taunt'){abilityProvoke(s,hero.id);if(!fx.tauntOnly)heroStatus(s,hero.id).guard=2;}
 applyAbilityEffects(s,hero,skill,targetId,dealt,priorHp);
 if(dealt>0)wearEquipment(s,hero.id,'weapon',2);
 if(cost>0&&skill.element!=='physical')wearEquipment(s,hero.id,'charm',1);
}
function endBattle(s){
 const battle=s.battle;
 if(battle.enemies.some(e=>e.hp>0))return false;
 const encounter=area(s).encounters.find(e=>e.id===battle.encounterId);
 if(!s.defeated.includes(encounter.id)){
  s.defeated.push(encounter.id);
  const rewardGrants=[];
  for(const enemy of battle.enemies){
   const def=ENEMIES[enemy.kind];
   const grant=rewardWithLoot(s,def.rewards||def.reward,'enemy:'+enemy.uid,enemyLoot(s.areaId,def));
   if(grant)rewardGrants.push(grant);
  }
  const encounterGrant=rewardWithLoot(s,encounter.rewards||encounter.reward,'encounter:'+encounter.id,
   encounterLoot(s.areaId,encounter,battle.enemies));
  if(encounterGrant)rewardGrants.push(encounterGrant);
  setFlags(s,encounter.setFlags);if(encounter.flagOnWin)s.flags[encounter.flagOnWin]=true;
  emit(s,'victory','Победа! Получены опыт и добыча.',{encounterId:encounter.id,rewardGrants,rewardSummary:summarizeRewardGrants(rewardGrants)});
 }
 s.mode='explore';s.battle=null;return true;
}
function defeat(s){const penalty=Math.floor(s.gold*.08);s.gold-=penalty;s.areaId=s.lastCamp.areaId;s.position=clone(s.lastCamp.position);s.mode='explore';s.battle=null;s.dialogue=null;refresh(s,true);emit(s,'defeat','Отряд вернулся к лагерю. Потеряно золота: '+penalty+'. Пройденные события сохранены.');}
// Initiative is a stable, inspectable order for every participant in the round.
function orderedActors(s){
 const party=s.party.map((h,i)=>({id:h.id,side:'party',initiative:stats(s,h.id).initiative,tie:i}));
 const foes=s.battle.enemies.map((e,i)=>({id:e.uid,side:'enemy',initiative:initiativeForPhase(ENEMIES[e.kind],e.phase),tie:s.party.length+i}));
 return [...party,...foes].sort((a,b)=>b.initiative-a.initiative||a.tie-b.tie).map(({tie,...entry})=>entry);
}
function unitAlive(s,entry){return entry.side==='party'?s.party.some(h=>h.id===entry.id&&h.hp>0):s.battle.enemies.some(e=>e.uid===entry.id&&e.hp>0);}
function beginRoundOrder(s){const b=s.battle;for(const effect of Object.values(b.status)){if(effect.guardUntilRound!==undefined&&b.round>effect.guardUntilRound){effect.guard=0;delete effect.guardUntilRound;}}b.order=orderedActors(s);b.turnIndex=0;b.completedTurns=[];b.acted=[];b.activeHeroId=null;}
/** Add initiative metadata to old saves without replaying an action or consuming RNG. */
export function upgradeCombatState(s){
 const b=s.battle;if(!b||b.order)return s;
 const sorted=orderedActors(s),done=new Set(b.acted),active=sorted.find(e=>e.side==='party'&&e.id===b.activeHeroId);
 // Keep the already offered legacy player turn. Only this partial round retains that boundary.
 const past=sorted.filter(e=>e.side==='party'&&done.has(e.id));
 b.order=[...past,...(active?[active]:[]),...sorted.filter(e=>!done.has(e.id)&&e!==active)];
 b.turnIndex=past.length;b.completedTurns=past.map(e=>e.id);
 return s;
}
/** Numeric status descriptors use owner-turn boundaries, independent of localized UI. */
export function statusInfo(s,id){
 if(!s.battle)return [];const b=s.battle,hero=s.party.find(h=>h.id===id),enemy=b.enemies.find(e=>e.uid===id),status=hero?b.status[id]||{}:enemy?.status||{},order=combatOrder(s),entry=order.find(e=>e.id===id),index=order.findIndex(e=>e.id===id),meta={ownerId:id,side:hero?'party':'enemy',ownerActed:!!entry?.acted,ownerActive:!!entry?.active,queueIndex:index,turnsBeforeOwner:index<0?null:index>=b.turnIndex?index-b.turnIndex:order.length-b.turnIndex+index};
 const existing=['guard','attack','taunt','break','breakRecovery'].filter(key=>status[key]>0).map(key=>({...meta,id:key,remainingOwnerTurns:status[key],remainingRounds:key==='guard'&&status.guardUntilRound!==undefined?Math.max(0,status.guardUntilRound-b.round+1):null,expiresAt:key==='guard'&&status.guardUntilRound!==undefined?'end-of-round-'+status.guardUntilRound:key==='break'?'after-owner-skipped-turn':key==='breakRecovery'?'after-owner-action':hero?'start-of-owner-turn':'start-of-owner-action',multiplier:key==='guard'?(hero?status.guardMultiplier??.42:.55):key==='attack'?1.3:key==='break'?1.2:null}));
 for(const key of ['burn','chill','fracture','disrupt','barrier','regen','counter','cover'])if(status[key]>0&&(key!=='counter'||status.counterCharges>0))existing.push({...meta,id:key==='burn'&&status.bleed?'bleed':key,remainingOwnerTurns:key==='barrier'?status.barrierTurns:status[key],remainingRounds:null,expiresAt:key==='chill'?'after-owner-attack':key==='burn'?'start-of-owner-action':hero?'start-of-owner-turn':'after-owner-action',amount:key==='burn'?status.burnPower:key==='chill'?status.chillPower:key==='barrier'?status.barrier:key==='regen'?status.regenPower:null,multiplier:key==='fracture'?.75:key==='chill'?1-status.chillPower/100:key==='cover'?.3:null,charges:key==='counter'?status.counterCharges:null,protectsId:key==='cover'?status.coverTargetId:null});return existing.map(entry=>({...entry,lifecycle:statusLifecycle(entry)}));
}
export function combatOrder(s){
 if(!s.battle)return [];
 const view=s.battle.order?s:upgradeCombatState(clone(s)),b=view.battle;
 return b.order.map((entry,i)=>({...entry,active:i===b.turnIndex,acted:b.completedTurns.includes(entry.id),alive:unitAlive(view,entry)}));
}
function finishActor(s,entry){const b=s.battle;if(!b.completedTurns.includes(entry.id))b.completedTurns.push(entry.id);if(entry.side==='party'&&!b.acted.includes(entry.id))b.acted.push(entry.id);b.turnIndex++;}
function enemyAct(s,enemy){
 if(enemy.hp<=0)return;const status=enemy.status;if(status.burn>0){const amount=Math.min(enemy.hp,status.burnPower),source=status.bleed?'bleed':'burn';enemy.hp-=amount;status.burn--;if(!status.burn)delete status.bleed;battleLog(s,ENEMIES[enemy.kind].name+': '+periodicDamageName(source==='bleed').toLowerCase()+' — '+amount+' урона.');emit(s,'hit',String(amount),{actorId:enemy.uid,targetId:enemy.uid,amount,source});}
 if(enemy.hp<=0){battleLog(s,ENEMIES[enemy.kind].name+' повержен.');return;}
 const skill=SKILLS[enemy.skillId],magical=enemy.intent!=='guard'&&(enemy.intent==='heal'||skill?.element&&skill.element!=='physical'),disrupted=status.disrupt>0&&magical&&!status.break,oldIntent=enemy.intent,oldSkillId=enemy.skillId;if(disrupted){enemy.intent='attack';enemy.skillId=null;status.disrupt=0;battleLog(s,ENEMIES[enemy.kind].name+': печать сорвала магию, остаётся обычная атака.');}
 try{enemyActionBody(s,enemy);}finally{if(disrupted){enemy.intent=oldIntent;enemy.skillId=oldSkillId;enemy.telegraph='Печать сорвала магию — совершена обычная атака';}}if(status.fracture>0)status.fracture--;if(status.disrupt>0)status.disrupt--;
}
function enemyActionPower(enemy,skill,intent){
 const power=intent==='heavy'?(skill?.intent==='heavy'?skill.power??1.65:1.65):
  intent==='all'?(skill?.target==='allEnemies'?skill.power??.85:.85):skill?.power||1;
 return power*damageForPhase(ENEMIES[enemy.kind],enemy.phase);
}
function enemyActionBody(s,enemy){
 const b=s.battle,def=ENEMIES[enemy.kind],skill=SKILLS[enemy.skillId],living=s.party.filter(h=>h.hp>0);if(!living.length)return;
 battleLog(s,'Ход: '+def.name+'.');enemy.status.guard=0;
 if(enemy.status.break>0){enemy.status.break--;if(!enemy.status.break)enemy.status.breakRecovery=1;battleLog(s,def.name+' приходит в себя и пропускает ход.');return;}
 if(enemy.status.breakRecovery>0)enemy.status.breakRecovery--;
 if(enemy.intent==='guard'){enemy.status.guard=1;battleLog(s,def.name+' поднимает защиту.');emit(s,'action',skill?.telegraph&&skill.kind==='guard'?skill.name:'Защита',{actorId:enemy.uid,targetId:enemy.uid,kind:'defend',...(skill?.telegraph&&skill.kind==='guard'?{skillId:skill.id}:{})});return;}
 if(enemy.intent==='heal'&&!b.enemies.some(e=>e.hp>0&&e.hp<e.maxHp)){enemy.intent='guard';enemy.telegraph='Готовится защищаться';enemy.status.guard=1;battleLog(s,def.name+' поднимает защиту: союзники не ранены.');emit(s,'action','Защита',{actorId:enemy.uid,targetId:enemy.uid,kind:'defend'});return;}
 if(enemy.intent==='heal'){
  const target=b.enemies.filter(e=>e.hp>0).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0],amount=Math.min(target.maxHp-target.hp,skill?.power||45);
  if(skill?.telegraph)emit(s,'action',skill.name,{actorId:enemy.uid,targetId:target.uid,skillId:skill.id,kind:'skill'});
  target.hp+=amount;battleLog(s,def.name+' восстанавливает союзнику '+amount+' здоровья.');emit(s,'heal',String(amount),{actorId:enemy.uid,targetId:target.uid,amount,skillId:enemy.skillId});return;
 }
 const taunt=living.find(h=>heroStatus(s,h.id).taunt>0),targets=enemy.intent==='all'?living:[taunt||living[Math.floor(rng(s)*living.length)]],power=enemyActionPower(enemy,skill,enemy.intent);
 emit(s,'action',def.name,{actorId:enemy.uid,targetId:targets[0].id,kind:enemy.intent==='all'||(skill?.element&&skill.element!=='physical')?'skill':'attack',skillId:enemy.skillId,...(enemy.intent==='heavy'?{heavy:true}:{})});
 for(const hero of targets){let amount=damage(s,enemyStats(def),stats(s,hero.id),power,!!skill?.element&&skill.element!=='physical');if(enemy.status.chill>0)amount=Math.max(1,Math.round(amount*(1-enemy.status.chillPower/100)));abilityTakeHit(s,enemy,hero,amount,!!skill?.element&&skill.element!=='physical');}if(enemy.status.chill>0)enemy.status.chill--;
}
function resolveInitiative(s){
 while(s.battle){
  if(endBattle(s))return;
  if(s.party.every(h=>h.hp<=0)){defeat(s);return;}
  const b=s.battle;
  if(b.turnIndex>=b.order.length){b.round++;telegraph(s);beginRoundOrder(s);battleLog(s,'Раунд '+b.round+'.');continue;}
  const entry=b.order[b.turnIndex];
  if(!unitAlive(s,entry)){finishActor(s,entry);continue;}
  if(entry.side==='party'){
   abilityHeroTurnStart(s,entry.id);const effect=heroStatus(s,entry.id);for(const key of ['guard','attack','taunt'])if(effect[key]>0&&(key!=='guard'||effect.guardUntilRound===undefined))effect[key]--;
   b.activeHeroId=entry.id;return;
  }
  b.activeHeroId=null;enemyAct(s,b.enemies.find(e=>e.uid===entry.id));finishActor(s,entry);
 }
}
function advanceTurn(s,heroId){
 if(endBattle(s))return;
 const entry=s.battle.order[s.battle.turnIndex];
 if(entry?.side!=='party'||entry.id!==heroId)fail('Очередь ходов изменилась');
 finishActor(s,entry);resolveInitiative(s);
}
export function battleAction(s,action){return transact(s,next=>{
 if(next.mode!=='battle'||!next.battle)fail('Бой не идёт');upgradeCombatState(next);const hero=next.party.find(h=>h.id===next.battle.activeHeroId);if(!hero||hero.hp<=0)fail('Этот герой не может действовать');
 if(action.kind==='attack'){
  const enemy=next.battle.enemies.find(e=>e.uid===action.targetId&&e.hp>0);if(!enemy)fail('Выберите живого противника');const attacker=stats(next,hero.id);if(heroStatus(next,hero.id).attack>0)attacker.atk*=1.3;const before=enemy.hp,amount=damage(next,attacker,abilityEnemyStats(enemy),1);emit(next,'action','Атака',{actorId:hero.id,targetId:enemy.uid,kind:'attack'});hitEnemy(next,enemy,amount);const actual=before-enemy.hp;battleLog(next,PARTY[hero.id].name+' атакует: '+actual+' урона.');emit(next,'hit',String(actual),{actorId:hero.id,targetId:enemy.uid,amount:actual});if(actual>0)wearEquipment(next,hero.id,'weapon',1);
 }else if(action.kind==='skill'){
  const skill=availableSkills(next,hero.id).find(skill=>skill.id===action.skillId);if(!skill)fail('Это умение ещё не изучено');applySkill(next,hero,skill,action.targetId);
 }else if(action.kind==='defend'){
  heroStatus(next,hero.id).guard=1;delete heroStatus(next,hero.id).guardUntilRound;heroStatus(next,hero.id).guardMultiplier=.42;battleLog(next,PARTY[hero.id].name+' защищается.');emit(next,'action','Защита',{actorId:hero.id,targetId:hero.id,kind:'defend'});
 }else if(action.kind==='item'){
  emit(next,'action','Предмет',{actorId:hero.id,targetId:action.targetId,kind:'item'});consume(next,action.slot,action.targetId);battleLog(next,PARTY[hero.id].name+' использует предмет.');
 }else if(action.kind==='flee'){
  if(next.battle.boss||next.battle.forced)fail('Из этого сюжетного боя нельзя отступить');next.mode='explore';next.battle=null;emit(next,'flee','Отряд отступил. Противники остаются на месте.');return {message:'Отступление'};
 }else fail('Неизвестное действие');
 advanceTurn(next,hero.id);return {message:next.mode==='battle'?'Ход выполнен':'Бой завершён'};
});}

function location(s,where){if(Number.isSafeInteger(where))where={kind:'bag',index:where};if(where?.kind==='bag'&&Number.isSafeInteger(where.index)&&where.index>=0&&where.index<BAG_SIZE)return {get:()=>s.bag[where.index],set:value=>s.bag[where.index]=value};if(where?.kind==='gear'&&s.gear[where.heroId]&&SLOTS.includes(where.slot))return {get:()=>s.gear[where.heroId][where.slot],set:value=>s.gear[where.heroId][where.slot]=value,slot:where.slot,heroId:where.heroId};fail('Недопустимая ячейка');}
function accepts(loc,item){if(!item||!loc.slot)return true;const def=itemDefinition(item.defId);return kind(def)===loc.slot&&item.qty===1&&(!def.heroes||def.heroes.includes(loc.heroId));}
export function moveItem(s,from,to,expectedUid,expectedRevision){if(expectedRevision!==s.revision)return result(false,'Сумка изменилась. Повторите перенос.');return transact(s,next=>{if(next.mode==='battle'||next.mode==='dialogue')fail('Переставлять снаряжение можно вне боя и разговора');const source=location(next,from),target=location(next,to),item=source.get(),other=target.get();if(!item||item.uid!==expectedUid)fail('Предмет уже перемещён');if(other?.uid===item.uid)fail('Выберите другую ячейку');if(!accepts(target,item)||!accepts(source,other))fail('Предмет не подходит для этого слота');if(!source.slot&&!target.slot&&other?.defId===item.defId){const max=stackMax(itemDefinition(item.defId)),moved=Math.min(item.qty,max-other.qty);if(!moved)fail('Стопка заполнена');other.qty+=moved;item.qty-=moved;if(!item.qty)source.set(null);}else{source.set(other||null);target.set(item);}refresh(next);return {message:'Предмет перемещён'};});}
export function equip(s,bagIndex,heroId,slot,expectedRevision=s.revision){return moveItem(s,{kind:'bag',index:bagIndex},{kind:'gear',heroId,slot},s.bag[bagIndex]?.uid,expectedRevision);}
export function unequip(s,heroId,slot,bagIndex=s.bag.indexOf(null),expectedRevision=s.revision){return moveItem(s,{kind:'gear',heroId,slot},{kind:'bag',index:bagIndex},s.gear[heroId]?.[slot]?.uid,expectedRevision);}
export function splitItem(s,from,to,qty,expectedUid,expectedRevision){if(expectedRevision!==s.revision)return result(false,'Сумка изменилась. Повторите перенос.');return transact(s,next=>{if(next.mode!=='explore')fail('Сейчас нельзя разделить стопку');const a=location(next,from),b=location(next,to),item=a.get();if(a.slot||b.slot||b.get()||!item||item.uid!==expectedUid||!Number.isSafeInteger(qty)||qty<=0||qty>=item.qty)fail('Выберите пустую ячейку и часть стопки');item.qty-=qty;b.set(createItem(next,item.defId,qty));return {message:'Стопка разделена'};});}
function consumablePlan(s,slot,targetId){
 const loc=location(s,Number.isSafeInteger(slot)?{kind:'bag',index:slot}:slot),item=loc.get();if(!item||loc.slot)fail('Выберите предмет в сумке');
 const def=itemDefinition(item.defId),effect=def.effect||def.use,hero=s.party.find(h=>h.id===targetId);if(kind(def)!=='consumable'||!effect)fail('Этот предмет нельзя использовать');if(!hero&&effect.kind!=='allHeal')fail('Выберите спутника');
 const power=effect.power||50,scope=effect.kind==='allHeal'?'allAllies':'ally',friends=scope==='allAllies'?s.party:[hero];
 const targets=friends.map(h=>{let amount=0;if(['heal','allHeal'].includes(effect.kind)&&h.hp>0)amount=Math.min(h.maxHp-h.hp,power);if(effect.kind==='mp'&&h.hp>0)amount=Math.min(h.maxMp-h.mp,power);if(effect.kind==='revive'&&h.hp===0)amount=clamp(Math.round(power<=1?h.maxHp*power:power),1,h.maxHp);return {id:h.id,side:'party',name:PARTY[h.id].name,effect:effect.kind,min:amount,max:amount,hpGain:effect.kind==='mp'?0:amount,mpGain:effect.kind==='mp'?amount:0,eligible:amount>0};});
 const reasons={heal:'Выберите живого раненого спутника',mp:'Запас маны уже полон',revive:'Этот спутник уже в сознании',allHeal:'Отряд не ранен'};
 if(!reasons[effect.kind])fail('Неизвестное действие предмета');const reason=targets.some(t=>t.eligible)?'':reasons[effect.kind];
 return {loc,item,def,effect,scope,targets,reason};
}
export function previewUseItem(s,slot,targetId){try{const p=consumablePlan(s,slot,targetId);return {ok:!p.reason,canCommit:!p.reason,reason:p.reason,message:p.reason||p.targets.filter(t=>t.eligible).map(t=>t.name+': +'+t.max+(t.mpGain?' MP':' HP')).join(' · '),kind:'item',effect:p.effect.kind,scope:p.scope,slot,uid:p.item.uid,quantityCost:1,targets:p.targets,revision:s.revision};}catch(error){return {ok:false,canCommit:false,reason:error.message,message:error.message,kind:'item',targets:[],revision:s.revision};}}
function consume(s,slot,targetId){const p=consumablePlan(s,slot,targetId);if(p.reason)fail(p.reason);for(const t of p.targets){if(!t.eligible)continue;const hero=s.party.find(h=>h.id===t.id);if(p.effect.kind==='revive')reviveHero(s,hero,t.hpGain);else{hero.hp+=t.hpGain;hero.mp+=t.mpGain;}}p.item.qty--;if(!p.item.qty)p.loc.set(null);emit(s,'item',p.def.name+' использован.');}
export function useItem(s,slot,heroId){return transact(s,next=>{if(next.mode!=='explore')fail('В бою используйте команду «Предмет»');consume(next,slot,heroId);return {message:'Предмет использован'};});}
function findShop(s,id){const shop=objectById(s,id);checkNear(s,shop);if(shop.kind!=='shop'&&!shop.shop&&!shop.shopItems&&!shop.stock)fail('Торговец недоступен');return shop;}
export function buy(s,shopId,itemId,qty=1){return transact(s,next=>{
 const shop=findShop(next,shopId),def=itemDefinition(itemId),stock=shop.shop||shop.items||shop.shopItems||shop.stock||[];
 const offer=stock.find(entry=>(typeof entry==='string'?entry:entry.id)===itemId);
 if(!offer)fail('У торговца нет этого предмета');
 if(!Number.isSafeInteger(qty)||qty<1||qty>99)fail('Недопустимое количество');
 const price=(typeof offer==='object'&&offer.price||def.price||def.buyPrice||0)*qty;
 if(price<1)fail('Этот предмет не продаётся');
 if(next.gold<price)fail('Недостаточно золота');
 insertItems(next,[{id:itemId,qty}]);next.gold-=price;
 const message='Куплено: '+def.name+' ×'+qty;
 emit(next,'trade',message,{shopId,itemId,quantity:qty,price,side:'buy'});
 return {message};
});}
function baseSalePrice(def){return def.sellPrice??Math.floor((def.price||def.buyPrice||0)*.45);}
export function salePrice(item){
 const def=item&&ITEMS[item.defId];
 if(!def||['quest','key'].includes(kind(def))||def.sellable===false)return 0;
 const price=baseSalePrice(def),condition=durabilityInfo(item);
 if(!condition||price<=0)return price;
 return Math.max(1,price-Math.floor(price*.3*(condition.max-condition.current)/condition.max));
}
export function sell(s,shopId,bagIndex,qty=1,expectedUid=s.bag[bagIndex]?.uid){return transact(s,next=>{
 findShop(next,shopId);
 const item=next.bag[bagIndex];
 if(!item||item.uid!==expectedUid)fail('Предмет уже перемещён');
 const def=itemDefinition(item.defId);
 if(['quest','key'].includes(kind(def))||def.sellable===false)fail('Этот предмет нужен для задания');
 if(!Number.isSafeInteger(qty)||qty<1||qty>item.qty)fail('Недопустимое количество');
 const price=salePrice(item)*qty;
 if(price<=0)fail('Торговец не покупает этот предмет');
 next.gold=Math.min(9999999,next.gold+price);item.qty-=qty;
 if(!item.qty)next.bag[bagIndex]=null;
 const message='Продано: '+def.name+' ×'+qty;
 emit(next,'trade',message,{shopId,itemId:def.id,quantity:qty,price,side:'sell'});
 return {message};
});}

export function repairOptions(s,smithId){
 const out={ok:false,reason:'',revision:s.revision,entries:[],total:0,affordable:false};
 try{
  const smith=objectById(s,smithId);
  if(!smith?.smith)fail('Кузнец недоступен');
  checkNear(s,smith);
  const add=(item,where)=>{
   const durability=durabilityInfo(item);
   if(!durability||durability.current===durability.max)return;
   const def=ITEMS[item.defId],missing=durability.max-durability.current;
   const value=Math.max(30,def.price||def.buyPrice||0,baseSalePrice(def)*2);
   const price=Math.max(1,Math.ceil(value*.24*missing/durability.max));
   out.entries.push({uid:item.uid,name:def.name,location:where,durability,price});
   out.total+=price;
  };
  for(const hero of s.party)for(const slot of SLOTS)add(s.gear[hero.id][slot],{kind:'gear',heroId:hero.id,slot});
  s.bag.forEach((item,i)=>add(item,{kind:'bag',index:i}));
  out.ok=true;
  out.affordable=s.gold>=out.total;
 }catch(error){out.reason=error.message;}
 return out;
}

export function repair(s,smithId,{uid,revision}={}){
 if(revision!==s.revision)return result(false,'Снаряжение или кошелёк изменились. Проверьте стоимость ремонта.');
 return transact(s,next=>{
  const quote=repairOptions(next,smithId);
  if(!quote.ok)fail(quote.reason);
  const entries=uid===undefined?quote.entries:quote.entries.filter(entry=>entry.uid===uid);
  if(!entries.length)fail(uid===undefined?'Всё снаряжение исправно.':'Этот предмет уже исправен или перемещён.');
  const price=entries.reduce((sum,entry)=>sum+entry.price,0);
  if(next.gold<price)fail('Недостаточно золота для ремонта.');
  for(const entry of entries)location(next,entry.location).get().durability=entry.durability.max;
  next.gold-=price;
  const message=uid===undefined?'Снаряжение отремонтировано · −'+price+' зол.':
   entries[0].name+' · отремонтировано за '+price+' зол.';
  emit(next,'repair',message,{smithId,price,repairedUids:entries.map(entry=>entry.uid)});
  return {message,price,repairedUids:entries.map(entry=>entry.uid)};
 });
}
export function claimRewards(s,rewardId=null){return transact(s,next=>{
 if(!['explore','complete'].includes(next.mode))fail('Сначала завершите текущее действие');if(!next.pendingRewards.length)fail('Отложенных наград нет');if(rewardId&&!next.pendingRewards.some(r=>r.id===rewardId))fail('Эта награда уже получена');
 let count=0,quantity=0;const pending=[];for(const bundle of next.pendingRewards){if(rewardId&&bundle.id!==rewardId){pending.push(bundle);continue;}const before=bundle.items.reduce((n,i)=>n+(i.qty??1),0),items=deliverFittingItems(next,bundle.items),after=items.reduce((n,i)=>n+(i.qty??1),0);if(after<before){count++;quantity+=before-after;}if(items.length)pending.push({...bundle,items});}
 if(!count)fail('В сумке нет места. Освободите ячейку.');next.pendingRewards=pending;return {message:'Получено наборов припасов: '+count,claimedBundles:count,quantity,remainingBundles:pending.length};
 });}
export function questTarget(s,questId){
 const stages=CONTENT.QUEST_TARGETS?.[questId]||[],stage=stages.find(t=>(!t.untilFlag||!s.flags[t.untilFlag])&&allowed(s,t));if(!stage)return null;const a=AREAS[stage.areaId],object=a&&objectLists(a).find(o=>o.id===stage.id);if(!object)return null;
 return {id:object.id,areaId:a.id,kind:object.kind,label:object.label||object.name||(object.kind==='encounter'?ENEMIES[typeof object.enemies?.[0]==='string'?object.enemies[0]:object.enemies?.[0]?.id]?.name:null)||object.id,x:object.x,z:object.z,ready:allowed(s,object),missingFlags:(object.requiresFlags||[]).filter(f=>!s.flags[f])};
}
export function questProgress(s,questId){
 const q=QUESTS.find(q=>q.id===questId);if(!q)return null;const complete=s.completedQuests.includes(q.id),requirements=(q.requiresFlags||[]).map(id=>({id,done:!!s.flags[id]})),steps=(q.completeFlags||[]).map(id=>({id,done:!!s.flags[id]})),available=requirements.every(f=>f.done);
 return {id:q.id,title:q.title,description:q.description,optional:!!q.optional,complete,available,known:complete||available,requirements,steps,missingRequirements:requirements.filter(f=>!f.done).map(f=>f.id),missingFlags:steps.filter(f=>!f.done).map(f=>f.id),achieved:steps.filter(f=>f.done).length,total:steps.length,target:complete?null:questTarget(s,q.id)};
}
export function questList(s,{includeLocked=false}={}){return QUESTS.map(q=>questProgress(s,q.id)).filter(q=>includeLocked||q.known);}
function requirementsReason(s,object){const missing=(object.requiresFlags||[]).filter(f=>!s.flags[f]),titles=missing.map(flag=>QUESTS.find(q=>q.completeFlags?.includes(flag)&&all(s,q.requiresFlags))?.title).filter(Boolean);return titles.length?'Сначала: '+[...new Set(titles)].join(', ')+'.':'Сначала завершите текущую задачу.';}
export function currentObjective(s,trackedQuestId=null){
 if(s.flags.campaign_complete)return {id:'campaign_complete',title:'Кампания завершена',description:'Последняя клятва прозвучала. Голоса снова принадлежат людям.',detail:'Кампания завершена',complete:true};
 const chapter=area(s).act||1,active=QUESTS.filter(q=>!s.completedQuests.includes(q.id)&&all(s,q.requiresFlags));
 const quest=active.find(q=>q.id===trackedQuestId)||active.find(q=>!q.optional&&(AREAS[q.areaId]?.act||1)>=chapter)||active.find(q=>!q.optional)||active.find(q=>q.areaId===s.areaId)||active[0];
 if(quest){const progress=questProgress(s,quest.id),target=progress.target||quest.target||null;return {...quest,areaId:target?.areaId||quest.areaId,detail:quest.description,target,progress};}
 return {id:'explore',title:'Поговорите со спутниками',description:'Осмотрите область и найдите следующий след.',detail:'Осмотрите область и найдите следующий след.',areaId:s.areaId};
}
export function snapshot(s){const out=clone(s);out.events=[];delete out.shopId;return out;}

/** A completed Act I demo save already paid its quest rewards. Reopen only exploration. */
export function upgradeCampaignState(s){
 if(s.mode==='complete'&&s.flags.act1_complete&&!s.flags.campaign_complete)s.mode='explore';
 s.talents??={};
 return s;
}

export function upgradeMapState(state) {
 if(state.mapRevision===AREA_GEOMETRY_REVISION)return state;
 const area=AREAS[state.areaId], campArea=AREAS[state.lastCamp.areaId];
 if(state.mapRevision===1){
  state.position=nearestLand(area.layout,state.position)||{...area.spawn};
  state.lastCamp.position=nearestLand(campArea.layout,state.lastCamp.position)||{...campArea.spawn};
 }else{
  const focus=state.mode==='battle'?state.battle.encounterId:state.mode==='dialogue'?state.dialogue.npcId:null;
  state.position=migratePosition(area,state.position,focus);
  const campAnchor=campArea.legacyMap.anchors.find(a=>a.x===state.lastCamp.position.x&&a.z===state.lastCamp.position.z);
  state.lastCamp.position=migratePosition(campArea,state.lastCamp.position,campAnchor?.id);
 }
 state.mapRevision=AREA_GEOMETRY_REVISION;
 return state;
}

function validSavedPosition(s,areaId,position) {
 const area=AREAS[areaId];
 if(s.mapRevision===undefined)return legacyPosition(area,position);
 if(s.mapRevision===1)return position && walkableLayout(area.layout,position.x,position.z,{previous:true});
 return s.mapRevision===AREA_GEOMETRY_REVISION && position && walkable(areaId,position.x,position.z);
}

export function validate(s){
 const bad=message=>fail('Повреждённое сохранение кампании: '+message),int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max,unique=value=>Array.isArray(value)&&new Set(value).size===value.length;
 if(!s||s.schema!==SCHEMA||s.contentVersion!==(CONTENT.CONTENT_VERSION||1)||typeof s.runId!=='string'||s.runId.length<1||s.runId.length>100)bad('версия');
 if(!AREAS[s.areaId]||!validSavedPosition(s,s.areaId,s.position)||!['explore','dialogue','battle','complete'].includes(s.mode)||!finite(s.angle,-100,100)||!finite(s.playSeconds,0,1e9)||!int(s.revision,0,Number.MAX_SAFE_INTEGER)||!int(s.nextUid,1,1e8)||!int(s.gold,0,9999999)||!int(s.rng,0,4294967295))bad('мир');
 if(s.lootRng!==undefined&&!int(s.lootRng,1,4294967295))bad('генератор добычи');
 if(!Array.isArray(s.party)||s.party.length<1||s.party.length>4||s.party.some(h=>!h||typeof h.id!=='string'||!Object.hasOwn(PARTY,h.id))||new Set(s.party.map(h=>h.id)).size!==s.party.length||!plainAbilityStatus(s.gear)||Object.keys(s.gear).length!==s.party.length)bad('отряд');
 if(!STARTERS.includes(s.party[0].id)||s.party.slice(1).some(h=>STARTERS.includes(h.id)))bad('начальный герой');
 if(s.talents!==undefined&&(!plainAbilityStatus(s.talents)||Object.entries(s.talents).some(([id,nodes])=>{
  const hero=s.party.find(h=>h.id===id);return !hero||!validTalents(hero,nodes);
 })))bad('таланты');
 if(!Array.isArray(s.bag)||s.bag.length!==BAG_SIZE)bad('сумка');const uids=new Set();let maxUid=0;
 const checkItem=(item,slot=null,heroId=null)=>{
  if(item===null)return;
  const def=item&&ITEMS[item.defId];
  if(!def||typeof item.uid!=='string'||item.uid.length>150||!item.uid.startsWith(s.runId+':i')||uids.has(item.uid)||!int(item.qty,1,stackMax(def)))bad('предмет');
  if(item.durability!==undefined&&(!isEquipment(def)||!int(item.durability,0,MAX_DURABILITY)))bad('прочность предмета');
  const suffix=Number(item.uid.slice((s.runId+':i').length));
  if(!int(suffix,1,1e8)||item.uid!==s.runId+':i'+suffix)bad('идентификатор предмета');
  maxUid=Math.max(maxUid,suffix);uids.add(item.uid);
  if(slot&&!accepts({slot,heroId},item))bad('экипировка');
 };
 for(const item of s.bag)checkItem(item);for(const hero of s.party){if(!int(hero.level,1,LEVEL_CAP)||!int(hero.xp,0,experienceThreshold(hero.level)-1)||!s.gear[hero.id]||Object.keys(s.gear[hero.id]).some(key=>!SLOTS.includes(key)))bad('герой');for(const slot of SLOTS){if(!(slot in s.gear[hero.id]))bad('слот');checkItem(s.gear[hero.id][slot],slot,hero.id);}const st=stats(s,hero.id);if(hero.maxHp!==st.hp||hero.maxMp!==st.mp||!int(hero.hp,0,st.hp)||!int(hero.mp,0,st.mp))bad('характеристики');}if(s.nextUid<=maxUid)bad('счётчик предметов');
 const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9_.:/-]{1,200}$/.test(id);
 if(!s.flags||Array.isArray(s.flags)||Object.keys(s.flags).length>1000||Object.entries(s.flags).some(([id,v])=>!safeId(id)||!KNOWN_FLAGS.has(id)||typeof v!=='boolean'))bad('флаги');
 const encounterIds=new Set(list(CONTENT.AREAS).flatMap(a=>(a.encounters||[]).map(e=>e.id))),questIds=new Set(QUESTS.map(q=>q.id));for(const field of ['claimed','defeated','completedQuests'])if(!unique(s[field])||s[field].length>3000||s[field].some(id=>!safeId(id)))bad('реестр '+field);if(s.defeated.some(id=>!encounterIds.has(id))||s.completedQuests.some(id=>!questIds.has(id))||s.claimed.some(id=>!KNOWN_RECEIPTS.has(id)))bad('ссылка задания');
 const firstEndings=ACT_ONE_ENDINGS.filter(id=>s.flags[id]),campaignEndings=CAMPAIGN_ENDINGS.filter(id=>s.flags[id]);
 if(firstEndings.length>1||campaignEndings.length>1||!!firstEndings.length!==!!s.flags.act1_complete||!!campaignEndings.length!==!!s.flags.campaign_complete||s.flags.campaign_complete&&!s.flags.act1_complete)bad('несовместимые финалы');
 for(const id of s.completedQuests){const q=QUESTS.find(q=>q.id===id);if(!all(s,q.requiresFlags)||!all(s,q.completeFlags))bad('условия завершённого задания '+id);}
 if(!s.lastCamp||!AREAS[s.lastCamp.areaId]||!validSavedPosition(s,s.lastCamp.areaId,s.lastCamp.position))bad('лагерь');
 if(!Array.isArray(s.pendingRewards)||s.pendingRewards.length>300||new Set(s.pendingRewards.map(r=>r.id)).size!==s.pendingRewards.length)bad('награды');for(const r of s.pendingRewards){if(!safeId(r.id)||!KNOWN_REWARDS.has(r.id)||!s.claimed.includes('reward:'+r.id)||!Array.isArray(r.items)||r.items.length>100||r.items.some(item=>!ITEMS[item.id||item.defId]||!int(item.qty,1,9999)))bad('предметы награды');}
 if(!Array.isArray(s.events)||s.events.length>40)bad('события');
 if((s.mode==='dialogue')!==!!s.dialogue||(s.mode==='battle')!==!!s.battle)bad('режим');if(s.dialogue&&(!DIALOGUES[s.dialogue.id]||!int(s.dialogue.line,0,Math.max(0,(DIALOGUES[s.dialogue.id].lines||[]).length-1))))bad('диалог');
 if(s.battle){
  const b=s.battle,encounter=area(s).encounters?.find(e=>e.id===b.encounterId);
  if(!encounter||s.defeated.includes(b.encounterId)||!int(b.round,1,10000)||!unique(b.acted)||b.acted.some(id=>!s.party.some(h=>h.id===id))||!s.party.some(h=>h.id===b.activeHeroId&&h.hp>0&&!b.acted.includes(h.id))||!Array.isArray(b.enemies)||b.enemies.length!==encounter.enemies.length||!Array.isArray(b.log)||b.log.length>30||b.log.some(line=>typeof line!=='string'||line.length>1000)||!plainAbilityStatus(b.status)||typeof b.forced!=='boolean'||typeof b.boss!=='boolean'||b.forced!==!!(encounter.required||encounter.forced))bad('бой');
  const expectedBoss=!!encounter.boss||b.enemies.some(e=>ENEMIES[e.kind]?.kind==='boss');if(b.boss!==expectedBoss)bad('босс');
  for(let i=0;i<b.enemies.length;i++){
   const e=b.enemies[i],expected=encounter.enemies[i],id=typeof expected==='string'?expected:expected.kind||expected.id;
   const def=ENEMIES[e.kind];
   if(!def||e.kind!==id||e.uid!==encounter.id+':'+i||e.maxHp!==enemyStats(def).hp||!int(e.hp,0,e.maxHp)||!int(e.mp,0,10000)||!int(e.phase,1,1+phaseList(def).length)||!['attack','heavy','all','guard','heal'].includes(e.intent)||!e.status||!validAbilityEnemyStatus(e.status,int)||(e.skillId!==null&&!phaseSkill(def).has(e.skillId))||typeof e.telegraph!=='string'||e.telegraph.length>200)bad('противник');
   if(e.phaseRound!==undefined&&(!def.phases||e.phase===1||!int(e.phaseRound,2,b.round)))bad('раунд фазы');
  }
  for(const [id,status]of Object.entries(b.status))if(!s.party.some(h=>h.id===id)||!status||!validAbilityHeroStatus(s,id,status,int))bad('эффект');
  if(b.order!==undefined||b.turnIndex!==undefined||b.completedTurns!==undefined){
   const expected=orderedActors(s),ids=new Map(expected.map(e=>[e.id,e]));
   if(!Array.isArray(b.order)||b.order.length!==expected.length||new Set(b.order.map(e=>e?.id)).size!==expected.length||b.order.some(e=>!e||ids.get(e.id)?.side!==e.side||e.initiative!==ids.get(e.id)?.initiative||!int(e.initiative,1,10000))||!int(b.turnIndex,0,b.order.length-1)||!unique(b.completedTurns)||b.completedTurns.length!==b.turnIndex||b.completedTurns.some((id,i)=>id!==b.order[i].id)||b.order[b.turnIndex].side!=='party'||b.order[b.turnIndex].id!==b.activeHeroId||b.acted.length!==b.order.slice(0,b.turnIndex).filter(e=>e.side==='party').length||b.acted.some(id=>!b.completedTurns.includes(id)))bad('инициатива');
  }
  if(!b.enemies.some(e=>e.hp>0)||s.party.every(h=>h.hp===0))bad('завершённый бой');
 }
 const legacyComplete=s.talents===undefined&&s.mode==='complete'&&s.flags.act1_complete&&!s.flags.campaign_complete;
 if(!legacyComplete&&(s.mode==='complete'||awaitingEnding(s))!==!!s.flags.campaign_complete)bad('финал');if(s.mode!=='battle'&&s.party.every(h=>h.hp===0))bad('павший отряд');return true;
}

/** Forecast uses the real atomic move on a private state. Never changes UID, RNG or revision. */
export function previewMoveItem(s,from,to){
 try{const next=clone(s),answer=moveItem(next,from,to,location(s,from).get()?.uid,s.revision);
 const heroes=s.party.map(h=>{const before=stats(s,h.id),after=stats(next,h.id),other=next.party.find(a=>a.id===h.id);return {id:h.id,before,after,delta:Object.fromEntries(Object.keys(before).map(k=>[k,after[k]-before[k]])),currentBefore:{hp:h.hp,mp:h.mp},currentAfter:{hp:other.hp,mp:other.mp}};});
 return {...answer,reason:answer.ok?'':answer.message,revision:s.revision,source:from,target:to,heroes};
 }catch(error){return {ok:false,reason:error.message,message:error.message,revision:s.revision,source:from,target:to,heroes:[]};}
}

/** Quotes deliberately execute the commit rules on private states. */
export function previewBuy(s,shopId,itemId,qty=1){
 const next=clone(s),answer=buy(next,shopId,itemId,qty),one=clone(s);one.gold=9999999;
 const single=buy(one,shopId,itemId,1),unitPrice=single.ok?9999999-one.gold:0;
 const max=single.ok?stackMax(itemDefinition(itemId)):0,maxFit=single.ok?Math.min(99,s.bag.reduce((capacity,item)=>capacity+(!item?max:item.defId===itemId?max-item.qty:0),0)):0;
 const maxAffordable=unitPrice?Math.min(99,Math.floor(s.gold/unitPrice)):0;
 return {...answer,reason:answer.ok?'':answer.message,revision:s.revision,unitPrice,price:unitPrice*qty,maxAffordable,maxFit,maxQuantity:Math.min(maxAffordable,maxFit)};
}
export function previewSell(s,shopId,bagIndex,qty=1){const next=clone(s),answer=sell(next,shopId,bagIndex,qty);return {...answer,reason:answer.ok?'':answer.message,revision:s.revision,price:answer.ok?next.gold-s.gold:0,quantity:qty,uid:s.bag[bagIndex]?.uid||null,warnings:saleSupplyWarnings(s,bagIndex,qty,answer.ok)};}

/** Current dialogue effects are previewed through the same transaction, with no unseen dialogue text. */
export function choiceConsequences(s,choiceId){
 const dialogue=DIALOGUES[s.dialogue?.id],choice=dialogue?.choices?.find(c=>c.id===choiceId);if(!choice)return {ok:false,reason:'Выберите доступный ответ',message:'Выберите доступный ответ'};
 const next=clone(s),answer=chooseDialogue(next,choiceId);if(!answer.ok)return {...answer,reason:answer.message};
 const flags=Object.entries(next.flags).filter(([id,value])=>value!==s.flags[id]).map(([id,value])=>({id,value})),recruits=next.party.filter(h=>!s.party.some(a=>a.id===h.id)).map(h=>({id:h.id,name:PARTY[h.id].name})),questsCompleted=next.completedQuests.filter(id=>!s.completedQuests.includes(id));
 const endings={...CONTENT.ENDINGS,...CONTENT.CAMPAIGN_ENDINGS};
 const endingId=Object.keys(endings).find(id=>next.flags[id]&&!s.flags[id]),ending=endingId?clone(endings[endingId]):null;
 const act1Choice=!s.flags.act1_complete&&!!next.flags.act1_complete,finalChoice=!s.flags.campaign_complete&&!!next.flags.campaign_complete;
 const rewards={gold:next.gold-s.gold,xp:0,items:[]},key='dialogue:'+dialogue.id+':'+choice.id;
 const values=[...(!s.claimed.includes('reward:'+key)?[choice.rewards||choice.reward||{xp:choice.xp,items:choice.items}]:[]),...QUESTS.filter(q=>questsCompleted.includes(q.id)).map(q=>q.rewards||q.reward)];
 for(const v of values.filter(Boolean)){rewards.xp+=v.xp||0;for(const i of v.items||[])rewards.items.push({...i,name:ITEMS[i.id||i.defId]?.name});}
 const parts=[finalChoice?'Выбор завершит кампанию.':act1Choice?'Выбор завершит первый акт.':'',ending?.summary||'',recruits.length?'К отряду присоединится: '+recruits.map(h=>h.name).join(', ')+'.':'',rewards.gold?'Золото: +'+rewards.gold+'.':'',rewards.xp?'Опыт: +'+rewards.xp+'.':'',rewards.items.length?'Припасы: '+rewards.items.map(i=>i.name+' ×'+(i.qty||1)).join(', ')+'.':''].filter(Boolean);
 return {ok:true,reason:'',choiceId,act1Choice,finalChoice,ending,flags,recruits,questsCompleted,rewards,message:parts.join(' '),revision:s.revision};
}

/** Field healing offers the same learned skills and capped outcomes used in combat. */
export function fieldHealingOptions(s,targetId){
 const target=s.party.find(h=>h.id===targetId);if(!target)return {ok:false,reason:'Выберите спутника',options:[],revision:s.revision};
 const options=[];for(const caster of s.party)for(const skill of availableSkills(s,caster.id).filter(k=>k.kind==='heal')){const reason=s.mode!=='explore'?'Сначала завершите текущее действие':caster.hp<=0?'Этот герой без сознания':skillEligibility(s,caster,skill,targetId),friends=skill.target==='allAllies'?s.party:[target];options.push({casterId:caster.id,casterName:PARTY[caster.id].name,skillId:skill.id,name:skill.name,cost:skillCost(skill),scope:skill.target,enabled:!reason,reason,context:'field',targets:friends.map(h=>({id:h.id,name:PARTY[h.id].name,amount:abilityHealAmount(s,caster,skill,h)})),revision:s.revision});}
 return {ok:true,reason:'',targetId,options,revision:s.revision};
}
export function healCompanion(s,targetId,request={}){return transact(s,next=>{
 if(next.mode!=='explore')fail('В бою используйте панель умений');if(request.revision!==undefined&&request.revision!==next.revision)fail('Отряд изменился. Выберите лечение заново.');
 const option=fieldHealingOptions(next,targetId).options.find(o=>o.casterId===request.casterId&&o.skillId===request.skillId);if(!option)fail('Это лечение недоступно');if(!option.enabled)fail(option.reason);
 const caster=next.party.find(h=>h.id===option.casterId);caster.mp-=option.cost;emit(next,'action',option.name,{actorId:caster.id,targetId,skillId:option.skillId,kind:'skill'});
 for(const t of option.targets)if(t.amount>0){next.party.find(h=>h.id===t.id).hp+=t.amount;emit(next,'heal',String(t.amount),{actorId:caster.id,targetId:t.id,amount:t.amount});}
 return {message:option.name+': здоровье восстановлено.',targets:option.targets};
});}

/** Stable surviving stack UIDs; equipment never participates in bag organization. */
export function organizeBag(s,expectedRevision=s.revision){if(expectedRevision!==s.revision)return result(false,'Сумка изменилась. Повторите действие.');return transact(s,next=>{
 if(!['explore','complete'].includes(next.mode))fail('Сначала завершите текущее действие');const groups=new Map();
 for(const entry of next.bag.filter(Boolean)){const group=groups.get(entry.defId)||[];group.push(entry);groups.set(entry.defId,group);}
 const arranged=[];for(const [id,group]of groups){let total=group.reduce((sum,i)=>sum+i.qty,0);const max=stackMax(itemDefinition(id));for(const entry of group){if(!total)break;entry.qty=Math.min(max,total);total-=entry.qty;arranged.push(entry);}}
 const order=['weapon','armor','charm','consumable','material','quest','key'];arranged.sort((a,b)=>{const k=order.indexOf(kind(ITEMS[a.defId]))-order.indexOf(kind(ITEMS[b.defId]));return k||(a.defId<b.defId?-1:a.defId>b.defId?1:0);});
 const bag=[...arranged,...Array(BAG_SIZE-arranged.length).fill(null)];if(JSON.stringify(bag)===JSON.stringify(s.bag))fail('Сумка уже упорядочена');next.bag=bag;return {message:'Припасы объединены, сумка упорядочена.'};
});}

/** Read-only hero-specific identity and exact authored/unlocked skill catalog. */
export function heroRoleInfo(s,heroId){
 const hero=s.party.find(h=>h.id===heroId),definition=PARTY[heroId];
 const description=roleCatalog(hero,definition,(definition?.skills||[]).map(id=>SKILLS[id]).filter(Boolean).map(skill=>heroSkill(s,heroId,skill)));
 if(!description||description.identity)return description;
 return {...description,identity:definition.role,signature:definition.description||definition.bio||definition.role};
}


function enemyPreActionHp(enemy){return Math.max(0,enemy.hp-(enemy.status?.burn>0?enemy.status.burnPower:0));}
/** Conditional on current state, including own deterministic turn-start burn; never samples a future random choice. */
export function enemyIntentInfo(s,enemyId){
 const b=s.battle,enemy=b?.enemies.find(e=>e.uid===enemyId);if(!enemy)return null;
 const definition=ENEMIES[enemy.kind],skill=SKILLS[enemy.skillId],living=s.party.filter(h=>h.hp>0),status=enemy.status||{};
 const out={enemyId,name:definition.name,alive:enemy.hp>0,intent:enemy.intent,effectiveIntent:enemy.intent,skillId:enemy.skillId||null,policy:'none',targetIds:[],guaranteed:false,reason:'',revision:s.revision,scope:'current-state'};
 if(enemy.hp<=0){out.reason='Противник повержен';return out;}
 if(status.burn>0&&status.burnPower>=enemy.hp){out.effectiveIntent='skip';out.reason=periodicDamageName(status.bleed)+' сразит противника до действия';return out;}
 if(status.break>0){out.effectiveIntent='skip';out.reason='Пропустит действие: равновесие нарушено';return out;}
 const magical=enemy.intent!=='guard'&&(enemy.intent==='heal'||skill?.element&&skill.element!=='physical');
 if(status.disrupt>0&&magical){out.effectiveIntent='attack';out.skillId=null;out.reason='Печать заменяет магию обычной атакой';}
 if(out.effectiveIntent==='heal'){
  const candidates=b.enemies.map(e=>e.uid===enemyId?{...e,hp:enemyPreActionHp(e)}:e).filter(e=>e.hp>0),target=candidates.sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp)[0];
  if(!target||!candidates.some(e=>e.hp<e.maxHp))out.effectiveIntent='guard';
  else{out.policy='lowest-health-ratio-enemy';out.targetIds=[target.uid];out.guaranteed=true;return out;}
 }
 if(out.effectiveIntent==='guard'){out.policy='self';out.targetIds=[enemyId];out.guaranteed=true;return out;}
 if(out.effectiveIntent==='all'){out.policy='all-living-party';out.targetIds=living.map(h=>h.id);out.guaranteed=true;return out;}
 const taunt=living.find(h=>(b.status[h.id]?.taunt||0)>0);out.policy=taunt?'taunted-party':'uniform-living-party';out.targetIds=taunt?[taunt.id]:living.map(h=>h.id);out.guaranteed=!!taunt||living.length===1;return out;
}



export function enemyThreatPreview(s,enemyId){
 const info=enemyIntentInfo(s,enemyId);if(!info)return null;const enemy=s.battle.enemies.find(e=>e.uid===enemyId),skill=SKILLS[info.skillId],out={...info,estimate:true,scenarios:[],targets:[],message:'Текущее состояние с учётом собственного горения до действия; предыдущие ходы могут изменить цель и защиту.'};
 if(!info.alive||info.effectiveIntent==='skip'||info.effectiveIntent==='guard')return out;
 if(info.effectiveIntent==='heal'){const target=s.battle.enemies.find(e=>e.uid===info.targetIds[0]),hp=target.uid===enemyId?enemyPreActionHp(target):target.hp,amount=Math.min(target.maxHp-hp,skill?.power||45);out.targets=[{id:target.uid,side:'enemy',effect:'heal',min:amount,max:amount}];return out;}
 const magical=!!skill?.element&&skill.element!=='physical',power=enemyActionPower(enemy,skill,info.effectiveIntent);
 const groups=info.effectiveIntent==='all'?[info.targetIds]:info.targetIds.map(id=>[id]);
 for(const ids of groups){
  const endpoint=roll=>{const heroes=clone(s.party),effects=clone(s.battle.status),hits={};
   const receive=(hero,amount,redirected)=>{const effect=effects[hero.id]||{},absorbed=Math.min(amount,effect.barrier||0),actual=Math.min(hero.hp,amount-absorbed);effect.barrier=(effect.barrier||0)-absorbed;hero.hp-=actual;const hit=hits[hero.id]||(hits[hero.id]={id:hero.id,amount:0,absorbed:0,redirected:false});hit.amount+=actual;hit.absorbed+=absorbed;hit.redirected||=redirected;if(!hero.hp){effect.cover=0;effect.barrier=0;}effects[hero.id]=effect;};
   for(const id of ids){const hero=heroes.find(h=>h.id===id),effect=effects[id]||{};let amount=rolledDamage(enemyStats(ENEMIES[enemy.kind]),stats(s,id),power,magical,roll);if(enemy.status.chill>0)amount=Math.max(1,Math.round(amount*(1-enemy.status.chillPower/100)));if(effect.guard>0)amount=Math.max(1,Math.round(amount*(effect.guardMultiplier??.42)));const coverer=heroes.find(h=>h.id!==id&&h.hp>0&&(effects[h.id]?.cover||0)>0&&effects[h.id].coverTargetId===id),share=coverer?Math.min(coverer.hp,Math.round(amount*.3)):0;receive(hero,amount-share,false);if(share)receive(coverer,share,true);}
   return hits;
  };
  const low=endpoint(0),high=endpoint(1),targets=[...new Set([...Object.keys(low),...Object.keys(high)])].map(id=>({id,side:'party',effect:'damage',min:Math.min(low[id]?.amount||0,high[id]?.amount||0),max:Math.max(low[id]?.amount||0,high[id]?.amount||0),absorbedMin:Math.min(low[id]?.absorbed||0,high[id]?.absorbed||0),absorbedMax:Math.max(low[id]?.absorbed||0,high[id]?.absorbed||0),redirected:!!(low[id]?.redirected||high[id]?.redirected)}));out.scenarios.push({primaryTargetIds:[...ids],targets});
 }
 out.targets=[...new Set(out.scenarios.flatMap(p=>p.targets.map(t=>t.id)))].map(id=>{const values=out.scenarios.map(p=>p.targets.find(t=>t.id===id));return {id,side:'party',effect:'damage',min:Math.min(...values.map(t=>t?.min||0)),max:Math.max(...values.map(t=>t?.max||0)),possible:values.some(Boolean),guaranteed:values.every(Boolean)};});out.magical=magical;out.power=power;return out;
}



export function bossPhaseInfo(s,enemyId){
 const enemy=s.battle?.enemies.find(e=>e.uid===enemyId);if(!enemy)return null;const definition=ENEMIES[enemy.kind],boss=definition.kind==='boss'||!!definition.boss,thresholdCrossed=boss&&enemy.hp>0&&enemy.hp/enemy.maxHp<.5;
 const phases=phaseList(definition),current=phases[enemy.phase-2],next=phases[enemy.phase-1];
 const crossed=definition.phases ? enemy.hp>0&&!!next&&enemy.hp/enemy.maxHp<next.at : thresholdCrossed;
 return {enemyId,boss,alive:enemy.hp>0,activePhase:enemy.phase,phaseLabel:current?.text||null,
  threshold:next?.at??(boss&&!definition.phases ? .5 : null),nextThreshold:next?.at??null,nextPhase:next?enemy.phase+1:null,
  phases:phases.map((phase,i)=>({phase:i+2,at:phase.at,damage:damageForPhase(definition,i+2),initiative:initiativeForPhase(definition,i+2),text:phase.text})),initiative:initiativeForPhase(definition,enemy.phase),nextInitiative:next?initiativeForPhase(definition,enemy.phase+1):null,resistsWeaknessBreak:!!definition.phases,thresholdRule:'strictly-below',thresholdCrossed:crossed,transitionPending:crossed&&!!next,transitionBoundary:'next-round-telegraph',damageMultiplier:damageForPhase(definition,enemy.phase),baseDamageMultiplier:damageForPhase(definition,1),revision:s.revision};
}



function statusLifecycle(entry){
 const start=entry.expiresAt.startsWith('start-of-owner'),round=entry.remainingRounds!==null,periodic=['burn','bleed','regen'].includes(entry.id),consumed=entry.id==='chill'?'owner-attack':entry.id==='counter'?'first-physical-hit-with-hp-damage':null;
 return {boundary:round?'end-of-round':entry.expiresAt,unit:round?'round':entry.id==='chill'?'attack':'owner-turn',remaining:round?entry.remainingRounds:entry.remainingOwnerTurns,tick:periodic?entry.expiresAt:null,remainingTicks:periodic?entry.remainingOwnerTurns:null,consumedOn:consumed,endsBeforeNextAction:start&&entry.remainingOwnerTurns===1&&!periodic,stacking:['barrier','regen','chill'].includes(entry.id)?'maximum-and-refresh':['burn','bleed'].includes(entry.id)?'replace-and-refresh':'refresh'};
}



function previewTransition(effect,current,after){
 const delta={amount:after.amount-current.amount,duration:after.duration-current.duration},change=!current.amount?'apply':delta.amount>0?'strengthen':delta.amount<0?'weaken':delta.duration>0?'refresh':delta.duration<0?'shorten':'unchanged';return {...effect,current,after,delta,change,amount:after.amount,duration:after.duration};
}
function enrichBarrierPreview(s,effects){return effects.map(effect=>{if(effect.kind!=='barrier')return effect;const status=s.battle.status[effect.targetId]||{},current={amount:status.barrier||0,duration:status.barrierTurns||0},after={amount:Math.max(current.amount,effect.amount),duration:Math.max(current.duration,effect.duration)},out=previewTransition(effect,current,after);out.label='Барьер: '+current.amount+' → '+after.amount+' поглощения · длительность '+current.duration+' → '+after.duration+' начал хода'+(out.change==='unchanged'?' · без усиления':out.change==='refresh'?' · только обновление длительности':'');return out;});}



function enrichRegenPreview(s,effects){return effects.map(effect=>{if(effect.kind!=='regen')return effect;const status=s.battle.status[effect.targetId]||{},current={amount:status.regen>0?status.regenPower||0:0,duration:status.regen||0},after={amount:Math.max(current.amount,effect.amount),duration:Math.max(current.duration,effect.duration)},out=previewTransition(effect,current,after);out.label='Восстановление: '+current.amount+' → '+after.amount+' HP за начало хода · тиков '+current.duration+' → '+after.duration+(out.change==='unchanged'?' · без усиления':out.change==='refresh'?' · только обновление длительности':'');return out;});}



function enrichDebuffPreview(s,effects){return effects.map(effect=>{
 const enemy=s.battle.enemies.find(e=>e.uid===effect.targetId);if(!enemy)return effect;const status=enemy.status;
 if(effect.kind==='break'){const blocked=status.break>0?'Равновесие уже нарушено':status.breakRecovery>0?'Восстановление равновесия блокирует повторный срыв':'';return {...effect,willApply:!blocked,blockedReason:blocked,label:blocked||effect.label};}
 if(!['burn','chill','fracture','disrupt'].includes(effect.kind))return effect;
 const key=effect.kind,current={amount:status[key]>0?(key==='burn'?status.burnPower:key==='chill'?status.chillPower:key==='fracture'?25:1):0,duration:status[key]||0},after={amount:key==='chill'?Math.max(current.amount,effect.amount):key==='disrupt'?1:effect.amount,duration:effect.duration};
 const out=previewTransition(effect,current,after);out.label=({burn:periodicDamageName(effect.bleed),chill:'Ослабление атаки',fracture:'Пробитая броня',disrupt:'Печать молчания'}[key])+': сила '+current.amount+' → '+after.amount+' · длительность '+current.duration+' → '+after.duration+(out.change==='unchanged'?' · без усиления':'');return out;
 });}



function enrichSupportPreview(s,hero,skill,targetId,effects){
 const out=[...effects],fx=abilityEffects(skill),add=(id,key,amount,duration)=>{const status=s.battle.status[id]||{},current={amount:status[key]>0?(key==='guard'?Math.round((1-(status.guardMultiplier??.42))*100):key==='attack'?30:1):0,duration:status[key]||0},after={amount,duration},entry=previewTransition({targetId:id,kind:key,label:''},current,after);entry.label=({guard:'Снижение урона, %',attack:'Усиление атаки, %',taunt:'Провокация'}[key])+': '+current.amount+' → '+after.amount+' · длительность '+current.duration+' → '+after.duration;out.push(entry);};
 if(['guard','buff'].includes(skill.kind)&&!fx.barrierOnly)for(const ally of abilityFriends(s,hero,skill,targetId).filter(h=>h.hp>0)){add(ally.id,'guard',Math.round((skill.kind==='guard'?clamp(skill.power??.58,0,.95):.58)*100),2);if(skill.kind==='buff')add(ally.id,'attack',30,3);}
 if(skill.kind==='taunt'||fx.tauntSelf){for(const ally of s.party)if(ally.id!==hero.id&&(s.battle.status[ally.id]?.taunt||0)>0)add(ally.id,'taunt',0,0);if(!out.some(e=>e.kind==='taunt'&&e.targetId===hero.id))add(hero.id,'taunt',1,2);else{const index=out.findIndex(e=>e.kind==='taunt'&&e.targetId===hero.id);out.splice(index,1);add(hero.id,'taunt',1,2);}if(skill.kind==='taunt'&&!fx.tauntOnly){const status=s.battle.status[hero.id]||{};add(hero.id,'guard',Math.round((1-(status.guardMultiplier??.42))*100),2);}}
 return out;
}


function countBagItems(s){const counts={};for(const item of s.bag)if(item)counts[item.defId]=(counts[item.defId]||0)+item.qty;return counts;}


function summarizeRewardGrants(grants=[]){
 const seen=new Set(),items={},heroes={},out={xp:0,gold:0,goldRequested:0,receiptIds:[],xpByHero:[],items:[],pendingQuantity:0};
 for(const grant of grants){if(!grant||seen.has(grant.receiptId))continue;seen.add(grant.receiptId);out.receiptIds.push(grant.receiptId);out.xp+=grant.xp;out.gold+=grant.gold;out.goldRequested+=grant.goldRequested;for(const hero of grant.xpByHero||[])heroes[hero.heroId]=(heroes[hero.heroId]||0)+hero.amount;for(const item of grant.items||[]){const total=items[item.id]||(items[item.id]={id:item.id,qty:0,delivered:0,pending:0});for(const key of ['qty','delivered','pending'])total[key]+=item[key];}}
 out.items=Object.values(items);out.xpByHero=Object.entries(heroes).map(([heroId,amount])=>({heroId,amount}));out.pendingQuantity=out.items.reduce((n,i)=>n+i.pending,0);return out;
}
export function battleRewardSummary(s,event=null){const victory=event||[...(s.events||[])].reverse().find(e=>e.type==='victory');if(!victory||victory.type!=='victory')return null;return {encounterId:victory.encounterId,...summarizeRewardGrants(victory.rewardGrants||[]),available:Array.isArray(victory.rewardGrants),persistent:false};}



export function pendingRewardInfo(s,rewardId=null){
 const bundles=s.pendingRewards.filter(bundle=>!rewardId||bundle.id===rewardId),next=clone(s),answer=claimRewards(next,rewardId),before=countBagItems(s),after=countBagItems(next),items={};
 for(const bundle of bundles)for(const item of bundle.items){const id=item.id||item.defId;items[id]=(items[id]||0)+item.qty;}
 return {revision:s.revision,rewardId,ok:answer.ok,reason:answer.ok?'':answer.message,bundles:clone(bundles),quantity:Object.values(items).reduce((n,qty)=>n+qty,0),claimableQuantity:answer.ok?answer.quantity:0,remainingQuantity:Object.values(items).reduce((n,qty)=>n+qty,0)-(answer.ok?answer.quantity:0),items:Object.entries(items).map(([id,qty])=>({id,qty,claimable:answer.ok?(after[id]||0)-(before[id]||0):0})),canClaim:answer.ok};
}



export function skillMilestone(s,heroId){
 const hero=s.party.find(h=>h.id===heroId),progress=skillProgression(s,heroId);if(!hero||!progress)return null;
 const nextUnlockLevel=progress.nextUnlockLevel!==null&&progress.nextUnlockLevel<=LEVEL_CAP?progress.nextUnlockLevel:null;let xpToUnlock=0;if(nextUnlockLevel!==null)xpToUnlock=Math.max(0,experienceAtLevel(nextUnlockLevel)-totalExperience(hero));
 return {heroId,currentLevel:hero.level,currentXP:hero.xp,capped:hero.level>=LEVEL_CAP,nextUnlockLevel,levelsAway:nextUnlockLevel===null?0:nextUnlockLevel-hero.level,xpToUnlock,skills:nextUnlockLevel===null?[]:clone(progress.nextUnlocks),nextLevelXP:hero.level>=LEVEL_CAP?0:experienceThreshold(hero.level)-hero.xp};
}



export function statBreakdown(s,heroId){
 const hero=s.party.find(h=>h.id===heroId);if(!hero)return null;const base=heroBase(PARTY[heroId],1),leveled=heroBase(PARTY[heroId],hero.level),levelBonus=Object.fromEntries(STAT_KEYS.map(key=>[key,leveled[key]-base[key]])),gearTotal=Object.fromEntries(STAT_KEYS.map(key=>[key,0])),gear=[];
 for(const slot of SLOTS){const item=s.gear[heroId]?.[slot];if(!item)continue;const bonuses=gearBonuses(item);for(const key of STAT_KEYS)gearTotal[key]+=bonuses[key];gear.push({slot,uid:item.uid,itemId:item.defId,bonuses,durability:durabilityInfo(item)});}
 const bonuses=talentBonuses(heroId,learnedTalents(s,heroId)),talents=Object.fromEntries(STAT_KEYS.map(key=>[key,bonuses[key]||0]));
 const totals=stats(s,heroId),raw=base.initiative+levelBonus.initiative+gearTotal.initiative+talents.initiative;return {heroId,base,levelBonus,gear,gearTotal,talents,totals,initiative:{base:base.initiative,level:levelBonus.initiative,gear:gearTotal.initiative,talent:talents.initiative,raw,total:totals.initiative,roundingDelta:totals.initiative-raw}};
}



export function equipmentComparison(s,itemId,heroId){
 const hero=s.party.find(h=>h.id===heroId),def=ITEMS[itemId],slot=def?kind(def):null,out={ok:false,reason:'',revision:s.revision,heroId,itemId,slot,currentItemId:null,before:null,after:null,delta:null,resourceAfter:null,canEquipNow:false};
 if(!hero){out.reason='Спутник не найден';return out;}if(!def||!SLOTS.includes(slot)){out.reason='Выберите снаряжение';return out;}if(def.heroes&&!def.heroes.includes(heroId)){out.reason='Этот предмет не подходит спутнику';return out;}
 const next=clone(s);next.gear[heroId][slot]={uid:'preview-only',defId:itemId,qty:1};out.before=stats(s,heroId);out.after=stats(next,heroId);out.delta=Object.fromEntries(Object.keys(out.before).map(key=>[key,out.after[key]-out.before[key]]));out.currentItemId=s.gear[heroId]?.[slot]?.defId||null;out.resourceAfter={hp:Math.min(hero.hp,out.after.maxHp),mp:Math.min(hero.mp,out.after.maxMp)};out.canEquipNow=!['battle','dialogue'].includes(s.mode);out.ok=true;return out;
}



export function revivalSupplyInfo(s){
 const stacks=[];for(const [slot,item]of s.bag.entries()){if(!item)continue;const def=ITEMS[item.defId];if(kind(def)==='consumable'&&(def.effect||def.use)?.kind==='revive')stacks.push({slot,uid:item.uid,itemId:item.defId,name:def.name,quantity:item.qty});}
 const quantity=stacks.reduce((n,item)=>n+item.quantity,0),skillMethods=[];for(const hero of s.party)for(const skill of availableSkills(s,hero.id).filter(k=>k.kind==='revive')){const cost=skillCost(skill),mpShortfall=Math.max(0,cost-hero.mp),reason=hero.hp<=0?'Спутник без сознания':!['explore','battle'].includes(s.mode)?'Сначала завершите текущее действие':s.mode==='battle'&&s.battle?.activeHeroId!==hero.id?'Дождитесь хода спутника':mpShortfall?'Не хватает '+mpShortfall+' MP':'';skillMethods.push({heroId:hero.id,skillId:skill.id,cost,mp:hero.mp,mpShortfall,alive:hero.hp>0,ready:!reason,reason});}
 return {revision:s.revision,quantity,stacks,fallenIds:s.party.filter(h=>h.hp<=0).map(h=>h.id),lastConsumable:quantity===1,skillMethods,hasReadySkill:skillMethods.some(method=>method.ready)};
}
function saleSupplyWarnings(s,index,qty,valid){const supply=revivalSupplyInfo(s);return valid&&supply.stacks.some(i=>i.slot===index)&&supply.quantity-qty===0?[{code:'last-revival-consumable',message:'Будет продан последний запас для возрождения. Проверьте ману лекарки или сохраните припас.',remaining:0}]:[];}



export function areaCompletion(s,areaId=s.areaId){
 const definition=AREAS[areaId];if(!definition)return null;const knownQuests=questList(s),localQuests=knownQuests.filter(q=>QUESTS.find(d=>d.id===q.id)?.areaId===areaId),known=areaId===s.areaId||areaId===s.lastCamp?.areaId||localQuests.length>0||(definition.encounters||[]).some(e=>s.defeated.includes(e.id))||(definition.nodes||[]).some(n=>s.claimed.includes('node:'+n.id));
 if(!known)return {areaId,name:'Неизвестная область',known:false,encounters:null,nodes:null,quests:null,percent:null,complete:false};
 const targets=new Set(knownQuests.filter(q=>!q.complete&&q.target?.areaId===areaId).map(q=>q.target.id)),resolvedNode=n=>s.claimed.includes('node:'+n.id),resolvedEncounter=e=>s.defeated.includes(e.id),revealed=(object,resolved)=>resolved(object)||(none(s,object.forbidFlags)&&(allowed(s,object)||targets.has(object.id))),encounters=(definition.encounters||[]).filter(e=>revealed(e,resolvedEncounter)),nodes=(definition.nodes||[]).filter(n=>!['camp','shop'].includes(n.type||n.kind)&&revealed(n,resolvedNode));
 const encounterView={resolved:encounters.filter(resolvedEncounter).length,total:encounters.length,available:encounters.filter(e=>!resolvedEncounter(e)&&allowed(s,e)).length,blocked:encounters.filter(e=>!resolvedEncounter(e)&&!allowed(s,e)).length},nodeView={resolved:nodes.filter(resolvedNode).length,total:nodes.length,available:nodes.filter(n=>!resolvedNode(n)&&allowed(s,n)).length},quests={completed:localQuests.filter(q=>q.complete).length,total:localQuests.length},total=encounterView.total+nodeView.total+quests.total,done=encounterView.resolved+nodeView.resolved+quests.completed;
 return {areaId,name:definition.name||definition.title||areaId,known:true,encounters:encounterView,nodes:nodeView,quests,percent:total?Math.round(done/total*100):0,complete:total>0&&done===total};
}



export function runSummary(s){
 const quests=questList(s),pending=pendingRewardInfo(s);return {revision:s.revision,mode:s.mode,playSeconds:s.playSeconds,act:area(s).act||1,act1Complete:!!s.flags.act1_complete,complete:!!s.flags.campaign_complete,endingIds:[...ACT_ONE_ENDINGS,...CAMPAIGN_ENDINGS].filter(id=>s.flags[id]),party:s.party.map(h=>({id:h.id,level:h.level,hp:h.hp,maxHp:h.maxHp,mp:h.mp,maxMp:h.maxMp,fallen:h.hp<=0})),gold:s.gold,bag:{used:s.bag.filter(Boolean).length,capacity:BAG_SIZE},revivalSupply:revivalSupplyInfo(s),pendingRewards:{bundles:s.pendingRewards.length,quantity:pending.quantity,claimableQuantity:pending.claimableQuantity},quests:{completed:s.completedQuests.length,total:QUESTS.length,known:quests.length,active:quests.filter(q=>!q.complete).length},encounters:{completed:s.defeated.length,total:Object.values(AREAS).reduce((n,a)=>n+(a.encounters||[]).length,0)},objective:safeObjectiveView(currentObjective(s)),area:areaCompletion(s)};
}



export function journalNavigationTargets(s){
 const known=questList(s),definitions=new Map(known.map(q=>[q.id,QUESTS.find(d=>d.id===q.id)])),reference=q=>({questId:q.id,title:q.title,complete:q.complete});
 const requires=(consumer,producer)=>producer.id!==consumer.id&&(definitions.get(consumer.id).requiresFlags||[]).some(flag=>(definitions.get(producer.id).completeFlags||[]).includes(flag));
 return known.map(q=>{const prerequisites=known.filter(p=>requires(q,p)),dependents=known.filter(p=>requires(p,q)),target=q.complete?null:safeNavigationTarget(q.target),status=q.complete?'complete':!target?'no-target':!target.ready?'blocked':target.areaId!==s.areaId?'off-area':'ready';return {questId:q.id,title:q.title,optional:q.optional,complete:q.complete,status,target,missingRequirements:prerequisites.filter(p=>!p.complete).map(p=>p.id),prerequisites:prerequisites.map(reference),dependents:dependents.map(reference)};});
}

function projectFields(value,keys){return Object.fromEntries(keys.filter(key=>value[key]!==undefined).map(key=>[key,value[key]]));}
function safeNavigationTarget(target){return target?projectFields(target,['id','areaId','kind','label','x','z','ready']):null;}
function safeObjectiveView(objective){
 if(!objective)return null;const out=projectFields(objective,['id','title','name','description','detail','areaId','optional','complete']);
 if('target'in objective)out.target=safeNavigationTarget(objective.target);
 if(objective.progress){out.progress=projectFields(objective.progress,['id','title','description','optional','complete','available','known','achieved','total']);out.progress.target=safeNavigationTarget(objective.progress.target);}
 return out;
}

