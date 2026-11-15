import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as M from '../src/act1/model.js';
import * as UI from '../src/act1/interface-100.js';
import {PARTY,ITEMS,SKILLS,ENEMIES} from '../src/act1/content.js';
import {windowValidSelection} from '../src/act1/interface-presentation.js';
import {captureSurface,restoreSurface,bindSearchEditing,itemStatLine} from '../src/act1/ui-feedback.js';

const partyDefs=Object.fromEntries(PARTY.map(hero=>[hero.id,hero])),deps={M,SKILLS,itemDefs:ITEMS};
const main=readFileSync(new URL('../src/act1/main.js',import.meta.url),'utf8');
function instance(state,defId,durability=100){return {uid:state.runId+':'+state.nextUid++,defId,qty:1,...(['weapon','armor','charm'].includes(ITEMS[defId].kind)?{durability}:{})};}
function partyState(){
 const state=M.newGame();
 for(const id of ['iona','radan','leia']){
  state.party.push({id,level:6,xp:0,hp:1,mp:1,maxHp:1,maxMp:1});
  state.gear[id]={weapon:null,armor:null,charm:null};
  state.talents[id]=[];
  for(const [slot,defId] of Object.entries(partyDefs[id].startingGear))state.gear[id][slot]=instance(state,defId);
 }
 state.party.forEach(hero=>{hero.level=6;const stats=M.stats(state,hero.id);Object.assign(hero,{hp:stats.maxHp,mp:stats.maxMp,maxHp:stats.maxHp,maxMp:stats.maxMp});});
 return state;
}
function battleState(){
 const state=partyState(),enemy=Object.values(ENEMIES)[0];
 state.mode='battle';state.battle={activeHeroId:'leia',round:1,status:{},enemies:[{uid:'test:0',kind:enemy.id,hp:100,maxHp:100,status:{},intent:'attack'},{uid:'test:1',kind:enemy.id,hp:0,maxHp:100,status:{},intent:'attack'}]};
 state.party.find(hero=>hero.id==='alar').hp-=70;
 state.party.find(hero=>hero.id==='radan').hp=0;
 return state;
}
function skill(skillId){return {kind:'skill',skillId,ally:SKILLS[skillId].target==='ally'};}

test('A003 concrete worn gear transfer forecasts both owners and never mutates state',()=>{
 const state=partyState(),from={kind:'gear',heroId:'leia',slot:'armor'},to={kind:'gear',heroId:'iona',slot:'armor'};
 state.gear.leia.armor.durability=0;
 const before=structuredClone(state),forecast=M.previewMoveItem(state,from,to),warnings=UI.equipmentMoveResourceRisks(forecast,partyDefs);
 assert.equal(forecast.ok,true);
 const leia=forecast.heroes.find(hero=>hero.id==='leia'),iona=forecast.heroes.find(hero=>hero.id==='iona');
 assert.equal(leia.currentBefore.hp-leia.currentAfter.hp,8);
 assert.equal(iona.currentBefore.mp-iona.currentAfter.mp,4);
 assert.equal(iona.after.def-iona.before.def,-1,'broken mantle contributes 1 defence, not the catalogue 2');
 assert.ok(warnings.some(line=>line.includes('Лея')&&line.includes('HP')&&line.endsWith('потеря 8')));
 assert.ok(warnings.some(line=>line.includes('Иона')&&line.includes('MP')&&line.endsWith('потеря 4')));
 assert.deepEqual(state,before);
 const detail={append(...values){this.values=values;}};
 UI.applyFeature(45,{querySelector(){return detail;}},{state,ui:{selected:{from,uid:state.gear.leia.armor.uid,revision:state.revision},hero:'iona'},locationItem:()=>state.gear.leia.armor,itemDefs:ITEMS,partyDefs,M:{previewMoveItem:M.previewMoveItem,equipmentComparison(){throw Error('Catalogue comparison is forbidden for an owned item');}},el:(tag,cls,...children)=>({tag,cls,children}),text:value=>value});
 assert.ok(detail.values?.length,'inventory warning renders from the concrete forecast');
});

test('A004 cards, queue and arrows share wounded/living and fallen eligibility without RNG or revisions',()=>{
 const state=battleState(),before=structuredClone(state);
 for(const [target,expected] of [[skill('warm_hands'),['alar']],[skill('wake_flame'),['radan']]]){
  const queue=state.party.filter(hero=>UI.queueAllyChoice(state,target,hero.id,false,deps)).map(hero=>hero.id);
  const cards=state.party.filter(hero=>UI.battleTargetEligibility(state,target,'party',hero.id,false,deps).ok).map(hero=>hero.id);
  assert.deepEqual(queue,expected);assert.deepEqual(cards,expected);
  assert.equal(UI.queueEnemyChoice(state,'test:0',false,target,deps),null);
  const ui={target,allyId:null},seen=[];
  const d={...deps,state,ui,targetHero:id=>{ui.allyId=id;seen.push(id);},targetEnemy(){throw Error('An allied action cannot select an enemy');}};
  assert.equal(UI.targetArrowShortcut({code:'ArrowRight'},d),true);
  assert.equal(UI.targetArrowShortcut({code:'ArrowLeft'},d),true);
  assert.deepEqual(seen,[...expected,...expected]);
  assert.equal(UI.queueAllyChoice(state,target,expected[0],true,deps),null);
 }
 assert.deepEqual(state,before);
});

test('A004 all/self skills and all-party items never acquire an unrelated individual target',()=>{
 const state=battleState();state.bag[4]=instance(state,'travel_stew');
 for(const target of [skill('oath_guard'),skill('cinder_wave'),skill('shared_breath'),{kind:'item',slot:4},{kind:'defend'},{kind:'flee'}]){
  const ui={target,enemyId:null,allyId:null},before=structuredClone(ui);
  assert.equal(UI.queueEnemyChoice(state,'test:0',false,target,deps),null);
  for(const hero of state.party)assert.equal(UI.queueAllyChoice(state,target,hero.id,false,deps),null);
  assert.equal(UI.targetArrowShortcut({code:'ArrowRight'},{...deps,state,ui,targetEnemy(){throw Error('Unexpected target');},targetHero(){throw Error('Unexpected target');}}),false);
  assert.deepEqual(ui,before);
 }
 const target={kind:'attack'},selected=[];
 assert.equal(UI.queueEnemyChoice(state,'test:1',false,target,deps),null);
 assert.equal(UI.targetArrowShortcut({code:'ArrowRight'},{...deps,state,ui:{target},targetEnemy:id=>selected.push(id)}),true);
 assert.deepEqual(selected,['test:0']);
});

test('A004 item arrows respect revival and healing; full-health mana transfer stays eligible',()=>{
 const state=battleState(),before=structuredClone(state);
 for(const [kind,expected] of [['heal',['alar']],['revive',['radan']]]){
  const slot=state.bag.findIndex(item=>ITEMS[item?.defId]?.effect?.kind===kind),target={kind:'item',slot};
  assert.deepEqual(state.party.filter(hero=>UI.queueAllyChoice(state,target,hero.id,false,deps)).map(hero=>hero.id),expected);
 }
 assert.deepEqual(state,before);
 state.battle.activeHeroId='iona';state.party.find(hero=>hero.id==='leia').mp-=10;
 assert.equal(UI.queueAllyChoice(state,skill('clear_thought'),'leia',false,deps),'leia');
});

test('A004 changing scope clears alien IDs and marks only that scope as selected',()=>{
 const state=battleState(),ui={target:{kind:'attack'},enemyId:'test:0',allyId:'iona'};
 UI.armSkill(ui,SKILLS.warm_hands);
 assert.equal(ui.enemyId,null);assert.equal(ui.allyId,null);
 ui.enemyId='test:0';ui.allyId='alar';
 assert.equal(UI.battleTargetSelected(state,ui,'enemy','test:0',deps),false);
 assert.equal(UI.battleTargetSelected(state,ui,'party','alar',deps),true);
 UI.armSkill(ui,SKILLS.shared_breath);
 assert.equal(ui.enemyId,null);assert.equal(ui.allyId,null);
 assert.equal(UI.battleTargetSelected(state,ui,'party','alar',deps),true);
 assert.equal(UI.battleTargetSelected(state,ui,'party','radan',deps),false);
 assert.equal(UI.battleTargetSelected(state,ui,'enemy','test:0',deps),false);
 assert.match(UI.battleChoicePrompt(state,ui,true,deps),/Подтвердите/);
 assert.doesNotMatch(UI.battleChoicePrompt(state,ui,false,deps),/Выберите/);
 UI.armSkill(ui,SKILLS.oath_guard);
 assert.equal(UI.battleTargetSelected(state,ui,'party','leia',deps),true);
 assert.equal(UI.battleTargetSelected(state,ui,'party','alar',deps),false);
});

test('A002/A006 drag and keyboard forecasts distinguish identical unstackable swaps from merges',()=>{
 const state=partyState(),from={kind:'bag',index:4},to={kind:'bag',index:5};
 for(const [defId,expected] of [['rust_sword','swap'],['brigand_mail','swap'],['copper_ring','swap'],['healing_draught','merge']]){
  state.bag[4]=instance(state,defId,0);state.bag[5]=instance(state,defId,100);
  const forecast=M.previewMoveItem(state,from,to);
  assert.equal(forecast.ok,true);assert.equal(UI.dropActionKind(forecast,state.bag[4],state.bag[5],ITEMS),expected);
  assert.match(UI.dropPreviewCopy(forecast,state.bag[4],state.bag[5],ITEMS),expected==='swap'?/^Обменять/:/^Объединить/);
 }
 assert.equal(UI.dropActionKind({ok:true},{defId:'single'},{defId:'single'},{single:{kind:'material',stackMax:1}}),'swap');
});

test('A005 switching recipient preserves UID/source/revision and commits one gear-to-gear swap',()=>{
 const state=partyState(),from={kind:'gear',heroId:'leia',slot:'armor'},to={kind:'gear',heroId:'iona',slot:'armor'},source=state.gear.leia.armor,target=state.gear.iona.armor;
 const selected={from,uid:source.uid,revision:state.revision},ui={hero:'leia',selected,detail:source.defId},before=structuredClone(state);
 assert.equal(UI.selectInventoryHero(state,ui,'iona',windowValidSelection),true);
 assert.equal(ui.selected,selected);assert.deepEqual(state,before);
 const forecast=M.previewMoveItem(state,ui.selected.from,to);
 assert.equal(forecast.ok,true);assert.equal(forecast.heroes.find(hero=>hero.id==='iona').after.maxHp,M.stats(state,'iona').maxHp+8);
 assert.equal(M.moveItem(state,selected.from,to,selected.uid,selected.revision).ok,true);
 assert.equal(state.gear.iona.armor.uid,source.uid);assert.equal(state.gear.leia.armor.uid,target.uid);
 UI.selectInventoryHero(state,ui,'alar',windowValidSelection);
 assert.equal(ui.selected,null);assert.equal(ui.detail,null);
 const all=[...state.bag,...Object.values(state.gear).flatMap(Object.values)].filter(Boolean).map(item=>item.uid);
 assert.equal(new Set(all).size,all.length);
 const stale={hero:'alar',selected:{from:to,uid:'already-moved',revision:state.revision},detail:source.defId};
 UI.selectInventoryHero(state,stale,'iona',windowValidSelection);assert.equal(stale.selected,null);
});

test('A006 live drag nodes stay inside modal, use viewport coordinates and cancel without committing',()=>{
 const nodes=[],state=partyState(),ui={touchDrag:false},source=state.bag[0],from={kind:'bag',index:0},to={kind:'bag',index:4};
 function node(){const n={dataset:{},style:{},children:[],classList:{add(){},remove(){}},getBoundingClientRect:()=>({left:100,top:100,width:72,height:72}),append(...values){for(const value of values){value.parentNode=this;this.children.push(value);}},replaceChildren(...values){this.children=values;},remove(){this.removed=true;},hasPointerCapture(){return true;},releasePointerCapture(){this.released=true;},setPointerCapture(){}};nodes.push(n);return n;}
 const modal=node(),slot=node(),drop=node();drop.dataset.location=JSON.stringify(to);drop.closest=()=>drop;
 let moves=0;
 let hovered=drop,checks=0;
 const context={ui,state,M:{previewMoveItem(...args){checks++;return M.previewMoveItem(...args);},moveItem(){moves++;}},UI100:UI,itemDefs:ITEMS,itemStatLine,locationItem:loc=>state.bag[loc.index],canStartInventoryDrag:()=>true,icon:()=>node(),el:()=>node(),text:value=>value,$:()=>modal,document:{querySelectorAll:()=>nodes.filter(n=>n.dataset.dropState),elementFromPoint:()=>hovered},innerWidth:1280,performance:{now:()=>1},commit(){},renderModal(){},sameLocation:(a,b)=>JSON.stringify(a)===JSON.stringify(b)};
 const dragCode=main.slice(main.indexOf('function paintDropTarget('),main.indexOf('const GEAR_LABELS='));
 const comparisonCode=main.slice(main.indexOf('function equipmentChanges('),main.indexOf('function companionView('));
 vm.createContext(context);vm.runInContext(dragCode+comparisonCode,context);
 context.startDrag({pointerId:1,clientX:118,clientY:118},slot,from);
 context.dragMove({pointerId:1,clientX:210,clientY:220,preventDefault(){}},slot,from);
 const drag=ui.drag;
 assert.equal(drag.preview.parentNode,modal);assert.equal(drag.feedback.parentNode,modal);
 assert.equal(drag.preview.style.left,'192px');assert.equal(drag.preview.style.top,'202px');
 context.paintDropTarget(drag,{clientX:211,clientY:220});assert.equal(checks,1);
 hovered=null;context.paintDropTarget(drag,{clientX:100,clientY:220});assert.equal(drag.feedback.children.length,0);
 hovered=drop;context.paintDropTarget(drag,{clientX:211,clientY:220});assert.equal(drag.feedback.children.length,1);
 context.cancelDrag();context.dragEnd({pointerId:1,clientX:210,clientY:220});
 assert.equal(ui.drag,null);assert.equal(moves,0);assert.equal(drag.preview.removed,true);assert.equal(drag.feedback.removed,true);assert.equal(slot.released,true);assert.equal(state.bag[0],source);
});

test('A007 both journal routes save the actual quest area before opening map',()=>{
 const ui={mapAreaId:'monastery',trackedQuestId:'other'},saved=[],opened=[];
 assert.equal(UI.openJournalTarget(ui,'quest-remote',{areaId:'marsh'},{setItem:(key,value)=>saved.push(JSON.parse(value))},'run-1',kind=>opened.push({kind,area:ui.mapAreaId})),true);
 assert.equal(ui.windowMapQuestId,'quest-remote');assert.equal(saved[0].mapAreaId,'marsh');assert.equal(saved[0].mapQuestId,'quest-remote');assert.deepEqual(opened,[{kind:'map',area:'marsh'}]);
 assert.equal(UI.openJournalTarget(ui,'unknown',null,{},'run-1',()=>assert.fail()),false);
});

test('A008 search restores a middle selection and direction after surface replacement',()=>{
 const active={dataset:{focusKey:'bag-search'},selectionStart:2,selectionEnd:6,selectionDirection:'backward',scrollLeft:12};
 const root={ownerDocument:{activeElement:active},contains:n=>n===active,querySelectorAll:selector=>selector.startsWith('button')?[active]:[],scrollTop:78,scrollLeft:0};
 const snapshot=captureSurface(root),replacement={dataset:{focusKey:'bag-search'},focus(){this.focused=true;},setSelectionRange(start,end,direction){Object.assign(this,{selectionStart:start,selectionEnd:end,selectionDirection:direction});}};
 root.querySelectorAll=selector=>selector.startsWith('button')?[replacement]:[];root.scrollTop=0;
 restoreSurface(root,snapshot);
 assert.equal(replacement.focused,true);assert.equal(replacement.selectionStart,2);assert.equal(replacement.selectionEnd,6);assert.equal(replacement.selectionDirection,'backward');assert.equal(replacement.scrollLeft,12);assert.equal(root.scrollTop,78);
});

test('A008 IME repaints bitmap input but delays result rebuild until compositionend',()=>{
 const input=Object.assign(new EventTarget(),{value:'меч',dataset:{}}),commits=[],paints=[];
 bindSearchEditing(input,()=>paints.push(input.value),value=>commits.push(value));
 input.dispatchEvent(new Event('compositionstart'));input.value='ме漢';input.oninput({isComposing:true});input.value='ме漢字';input.oninput({isComposing:true});
 assert.deepEqual(commits,[]);assert.equal(input.dataset.composing,'true');assert.deepEqual(paints,['ме漢','ме漢字']);
 input.dispatchEvent(new Event('compositionend'));input.oninput({isComposing:false});
 assert.deepEqual(commits,['ме漢字']);assert.equal(input.dataset.composing,undefined);
 input.value='меX漢字';input.oninput({isComposing:false});assert.deepEqual(commits,['ме漢字','меX漢字']);
});
