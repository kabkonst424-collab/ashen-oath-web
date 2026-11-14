export function normalizeSettings(value={}){
 const gain=(name,fallback)=>Number.isFinite(value?.[name])?Math.max(0,Math.min(1,value[name])):fallback;
 return {volume:gain('volume',.3),music:gain('music',.8),sfx:gain('sfx',.92),ambience:gain('ambience',.72),
   textScale:[1,1.25,1.5].includes(value?.textScale)?value.textScale:1,quality:value?.quality==='low'?'low':'high'};
}
export function captureSurface(root){
 const active=root.ownerDocument?.activeElement;
 return {key:root.contains(active)?active?.dataset?.focusKey||active?.ariaLabel:null,index:[...root.querySelectorAll('button,[role="button"],input,a,summary')].indexOf(active),scroll:[root,...root.querySelectorAll('[data-scroll-key],.scroll')].map(n=>({key:n.dataset?.scrollKey||null,top:n.scrollTop,left:n.scrollLeft}))};
}
export function restoreSurface(root,snapshot){
 if(!snapshot)return;
 const key=typeof snapshot==='string'?snapshot:snapshot.key;
 const candidates=[...root.querySelectorAll('button,[role="button"],input,a,summary')];
 const target=candidates.find(n=>(n.dataset?.focusKey||n.ariaLabel)===key&&!n.disabled)||(key&&snapshot.index>=0?candidates.filter(n=>!n.disabled)[Math.min(snapshot.index,candidates.filter(n=>!n.disabled).length-1)]:null);
 if(target)target.focus({preventScroll:true});
 if(typeof snapshot==='object')for(const [i,n] of [root,...root.querySelectorAll('[data-scroll-key],.scroll')].entries()){const saved=snapshot.scroll?.find(s=>s.key&&s.key===n.dataset?.scrollKey)||snapshot.scroll?.[i];if(saved){n.scrollTop=saved.top;n.scrollLeft=saved.left;}}
}
export function captureDisclosures(root){return [...root.querySelectorAll('details[data-disclosure]')].map(n=>({key:n.dataset.disclosure,open:n.open,top:n.scrollTop,follow:n.scrollHeight-n.clientHeight-n.scrollTop<8}));}
export function restoreDisclosures(root,records=[]){for(const n of root.querySelectorAll('details[data-disclosure]')){const saved=records.find(r=>r.key===n.dataset.disclosure);if(saved){n.open=saved.open;n.scrollTop=saved.follow?n.scrollHeight:saved.top;}}}
export function heroSummary(name,hero,stats,active,conditions=''){return [name,'Уровень '+hero.level,'Жизнь '+Math.ceil(hero.hp)+' из '+stats.maxHp,'Мана '+Math.ceil(hero.mp)+' из '+stats.maxMp,active?'Сейчас ходит':'',hero.hp<=0?'Павший. Нажмите для возрождения':'',conditions].filter(Boolean).join(' · ');}
export function slotSummary(loc,item,name,owner,selected){const destination=loc.kind==='bag'?'Сумка · ячейка '+(loc.index+1):(owner||loc.heroId)+' · '+({weapon:'Оружие',armor:'Доспех',charm:'Талисман'}[loc.slot]||loc.slot);return destination+' · '+(item?name+' · количество '+item.qty:'Пустая ячейка')+(selected?' · Выбран для переноса':'');}
export function saveWarning({failure='',conflict=false}={}){return 'Прогресс не записан. Экспортируйте прохождение.'+(conflict?' Запись в другой вкладке изменилась; нужен свежий запуск.':' Можно повторить сохранение после устранения ошибки.')+(failure?'\n'+failure:'');}
export function itemStatLine(def){return Object.entries(def.stats||{}).map(([key,value])=>({hp:'Жизнь',mp:'Мана',atk:'Атака',def:'Защита',initiative:'Инициатива',speed:'Инициатива'}[key]||key)+' '+(value>0?'+':'')+value).join(' · ');}
export function feedbackSurface({modalOpen,paused}){return modalOpen?'modal':paused?'menu':'world';}
export function normalizePresentationSettings(value={},systemReducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false){return {reducedMotion:typeof value.reducedMotion==='boolean'?value.reducedMotion:!!systemReducedMotion,presentationSpeed:[1,1.5,2].includes(value.presentationSpeed)?value.presentationSpeed:1};}
export function statusDescription(entries=[]){return entries.map(entry=>{const name={guard:'Защита',attack:'Усиление атаки',taunt:'Провокация',break:'Равновесие нарушено',breakRecovery:'Восстановление равновесия',burn:'Горение',bleed:'Кровотечение',chill:'Ослабление атаки',fracture:'Пробитая броня',disrupt:'Печать молчания',barrier:'Барьер',regen:'Восстановление',counter:'Ответный удар',cover:'Прикрытие'}[entry.id]||entry.id;const duration=entry.lifecycle?statusLifetimeText(entry):entry.remainingRounds!==null&&entry.remainingRounds!==undefined?(entry.remainingRounds===1?'до конца текущего раунда':'раундов до окончания: '+entry.remainingRounds):entry.id==='break'?'пропускает свой ход':entry.id==='breakRecovery'?'до своего действия':'ходов владельца: '+entry.remainingOwnerTurns;const multiplier=entry.id==='attack'?'Атака':entry.id==='chill'?'Урон врага':entry.id==='fracture'?'Защита врага':'Получаемый урон';const protectedName={alar:'Алар',iona:'Иона',radan:'Радан',leia:'Лея'}[entry.protectsId];return name+' · '+duration+(entry.multiplier!==null&&entry.multiplier!==undefined?' · '+multiplier+' ×'+entry.multiplier:'')+(Number.isFinite(entry.amount)&&!['chill','fracture'].includes(entry.id)?' · '+(entry.id==='barrier'?'Поглощение ':entry.id==='burn'?'Урон за ход ':entry.id==='regen'?'HP за ход ':'Сила ')+entry.amount:'')+(Number.isFinite(entry.charges)?' · Срабатываний '+entry.charges:'')+(protectedName?' · Защищает: '+protectedName:'');}).join(' · ');}
export function createAudioEventCursor(){let runId=null,revision=null,previous=[];return {prime(state){runId=state.runId;revision=state.revision;previous=(state.events||[]).map(e=>JSON.stringify(e));},fresh(state){const events=state.events||[],keys=events.map(e=>JSON.stringify(e));if(runId!==state.runId){runId=state.runId;revision=null;previous=[];}if(revision===state.revision)return [];let overlap=Math.min(previous.length,keys.length);while(overlap&&!previous.slice(-overlap).every((key,i)=>key===keys[i]))overlap--;const fresh=events.slice(overlap);previous=keys;revision=state.revision;return fresh;}};}
export function eventAudioCues(events=[]){return events.flatMap(event=>event.type==='rest'||event.type==='item'?['heal']:event.type==='flee'?['dash']:[]);}
export function presentationAudioCue(cue,skills={}){const event=cue.event||{},skill=skills[event.skillId],kind=cue.kind||event.type;if(kind==='action'){if(event.kind==='defend'||['guard','buff','taunt'].includes(skill?.kind))return 'block';if(event.kind==='item')return 'heal';if(event.kind==='skill'){if(cue.sourceHostile)return 'enemyCast';if(['fire','ice','lightning'].includes(skill?.element))return skill.element;if(['heal','revive'].includes(skill?.kind))return null;return 'nova';}return event.kind==='attack'?'slash':null;}if(kind==='hit')return cue.sourceHostile?'heroHit':'hit';if(kind==='heal')return cue.sourceHostile&&!cue.actionEvent?'enemyCast':'heal';return ['revive','victory','level','recruit'].includes(kind)?kind:null;}


export function statusLifetimeText(entry){
 const life=entry.lifecycle,n=life.remaining;
 if(life.unit==='round')return n===1?'до конца текущего раунда':'до конца раунда; осталось раундов: '+n;
 if(entry.id==='break')return 'пропустит действий: '+n;
 if(entry.id==='breakRecovery')return 'защита от нового нарушения до своего действия';
 if(life.consumedOn==='owner-attack')return 'до следующей атаки; защита и пропуск не расходуют';
 if(life.tick)return (entry.id==='regen'?'лечение':'урон')+' в начале '+n+' следующих ходов владельца';
 if(life.boundary.startsWith('start-of-owner'))return (n===1?'до начала следующего хода владельца':'до начала хода владельца; осталось начал: '+n)+' (ходов владельца: '+n+')';
 if(life.boundary==='after-owner-action')return 'до окончания действий владельца: '+n;
 return 'ходов владельца: '+n;
}

