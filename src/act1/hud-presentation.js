// Pure read-only presentation adapters. No state, RNG, transactions or persistence.

export function enemyIdentity(enemy,enemies,defs){const number=enemies.findIndex(e=>e.uid===enemy?.uid)+1,name=defs[enemy?.kind]?.name||enemy?.kind||'Противник';return {number,name,label:'№'+number+' '+name};}

export function choiceStage(target,pending){return !target?{index:0,key:'action',label:'Действие → Цель → Применение'}:!pending?{index:1,key:'target',label:'Действие ✓ → Выберите цель → Применение'}:{index:2,key:'confirm',label:'Действие ✓ → Цель ✓ → Подтвердите'};}

export function selectionSummary({actor,action,target}){return [actor||'Герой',action||'Действие',target||'Выберите цель'].join(' · ');}

export function confirmLabel(kind){return ({flee:'Подтвердить отступление',defend:'Подтвердить защиту',attack:'Атаковать',damage:'Атаковать',break:'Атаковать',heal:'Лечить',revive:'Возродить',guard:'Защитить',buff:'Усилить',taunt:'Провоцировать',item:'Использовать'})[kind]||'Применить';}

export function resourceLine({mp=0,cost=0,quantity=null}={}){if(quantity!==null)return 'Расход: 1 из '+quantity+' · Останется: '+Math.max(0,quantity-1);return 'MP '+mp+' → '+Math.max(0,mp-cost)+' · Расход '+cost;}

export function availability(mp,cost){const shortage=Math.max(0,cost-mp);return {shortage,available:shortage===0,label:shortage?'Не хватает '+shortage+' MP':'Маны достаточно'};}

export function vitalLabel(value,max,type){return type.toUpperCase()+' '+Math.ceil(value)+'/'+max;}

// UI warning only: living heroes at or below 25% maximum HP. No combat threshold.
export function healthWarning(hp,maxHp){return hp>0&&maxHp>0&&hp/maxHp<=.25?'Мало HP':'';}

export function conditionSummary(entries=[],fallen=false){const names={guard:'Защита',attack:'Усиление',taunt:'Провокация',break:'Сбит',breakRecovery:'Равновесие',burn:'Горение',chill:'Ослабление',fracture:'Пробитая броня',disrupt:'Печать',barrier:'Барьер',regen:'Восстановление',counter:'Ответный удар',cover:'Прикрытие'},first=entries[0];return fallen?'Пал':first?(names[first.id]||first.id)+(entries.length>1?' +'+(entries.length-1):''):'';}

export function queueRoles(entries){const index=entries.findIndex(e=>e.active),next=index<0?-1:entries.findIndex((e,i)=>i>index&&e.alive&&!e.acted);return entries.map((entry,i)=>entry.active?'Сейчас':i===next?'Далее':'');}

export function shouldFollowQueue(previous,current){return !!current&&previous!==current;}

export function shortSkillName(name,max=13){const value=String(name||'Умение');if(value.length<=max)return value;const words=value.split(/\s+/);return words.length>1?words[0].slice(0,4)+'. '+words.at(-1).slice(0,max-6):value.slice(0,max-1)+'…';}

export function actionCategory(kind){return ['attack','defend'].includes(kind)?'Основные действия':kind==='skill'?'Умения':'Припасы и отступление';}

export function scopeLabel(scope,targets=[]){const count=targets.filter(t=>t.alive!==false).length;return scope==='allEnemies'?'Все противники: '+count:scope==='allAllies'?'Весь отряд: '+count:scope==='self'?'Сам герой':'';}

export function weaknessLines(preview){return (preview?.targets||[]).filter(t=>t.vulnerable).map(t=>t.name+' · Уязвимость раскрыта прогнозом');}

export function orderedIntel(enemies,selectedId){return [...enemies].filter(e=>e.hp>0).sort((a,b)=>(b.uid===selectedId?1:0)-(a.uid===selectedId?1:0));}

export function logNotice(log=[],seen=[]){const previous=Array.isArray(seen)?seen:[];let overlap=0;for(let n=Math.min(previous.length,log.length);n>0;n--)if(previous.slice(-n).every((line,i)=>line===log[i])){overlap=n;break;}const unread=log.length-overlap,last=String(log.at(-1)||'');return {unread,last,label:'Журнал боя'+(unread?' · +'+unread:'')};}

export function presentationActor({locked=false,presentationActorId=null,activeHeroId=null}={}){return locked&&presentationActorId?presentationActorId:activeHeroId;}

export function areaLabel(area){return 'Область · '+(area?.title||'Неизвестная область');}

export function objectiveCopy(objective,areas){const target=objective.target;return {title:objective.title,next:target?'Цель: '+target.label+' · '+(areas[target.areaId]?.title||'')+(target.ready?'':' · путь пока закрыт'):objective.detail||objective.description||'Осмотрите область',detail:objective.detail||objective.description||''};}

export function objectiveProgress(progress){return progress&&Number.isFinite(progress.total)&&progress.total>0?{achieved:progress.achieved,total:progress.total,label:progress.achieved+' / '+progress.total+' шагов'}:null;}

export function nearbyGroups(near=[]){const primary=near.find(n=>n.ready!==false)||null;return {primary,secondary:near.filter(n=>n!==primary).slice(0,2),extra:Math.max(0,near.length-(primary?1:0)-2)};}

export function nearbyKey(primary,node){return primary?.id===node?.id?'E':'';}

export function battleQuestLabel(objective){return {label:'Цель · '+String(objective?.title||'Путешествие').slice(0,18),accessible:'Открыть цель в журнале · '+(objective?.title||'Путешествие')};}

export function preserveArmedChoice(target,pending){return !!target&&!!pending;}
