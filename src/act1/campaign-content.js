import {CAMPAIGN_LAYOUTS} from './campaign-layouts.js?v=campaign-1';
import {CHAPTERS} from './campaign-acts/chapters.js?v=campaign-130';

export const CAMPAIGN_ACTS = [
  {id:'act1', number:1, title:'Право на последний голос', areas:['monastery','village','briarwood','quarry','fen','archive','sunfields','fortress','abbey'], bossId:'bellkeeper'},
  ...CHAPTERS.map(chapter => ({id:`act${chapter.act}`, number:chapter.act, title:chapter.title,
    areas:chapter.areas.map(([id])=>id), bossId:`c${chapter.act}_boss`, comicId:`act${chapter.act}_arrival`})),
];

export const CAMPAIGN_ENDINGS = {
  campaign_return:{id:'campaign_return', title:'Голоса по домам', comicId:'final_return',
    summary:'Центральный узел разобран. Записи уходят их владельцам по отливной дороге. Порты и зимние станции договариваются друг с другом напрямую; работа спасательных служб продолжается.'},
  campaign_council:{id:'campaign_council', title:'Зал открытого круга', comicId:'final_council',
    summary:'Амфитеатр остаётся общим залом. Ни у одного города нет главного ключа. В первый круг допускают только послания, которые можно забрать обратно, оставив у себя оригинал.'},
};

const comic = (id,title,lines,illustrationId=id) => ({id,title,illustration:`assets/campaign/comics/${illustrationId}.webp`,panels:lines.map(text=>({text}))});
export const CAMPAIGN_COMICS = Object.fromEntries(CHAPTERS.flatMap(chapter=>{
  const arrival=`act${chapter.act}_arrival`, depths=`act${chapter.act}_depths`;
  return [[arrival,comic(arrival,chapter.title,chapter.arrival)], [depths,comic(depths,chapter.areas[1][1],chapter.crossing)]];
}).concat([
  ['final_return',comic('final_return','Голоса по домам',[
    'Отряд снял центральный ключ. Пластины амфитеатра разошлись по портам и зимним станциям вместе с книгами возврата.',
    'На месте старого приказа осталось несколько разных сигналов. Ночью Сима доставляет последнее письмо лично. У окна её ждут двое, и каждый называет своё имя сам.',
  ])],
  ['final_council',comic('final_council','Зал открытого круга',[
    'Вран отпирает все входы амфитеатра. Никто не получает центрального ключа; он лежит разомкнутым в витрине.',
    'Первый спор начинается ещё до рассвета. Нель просит повторить чужую поправку, а Ирма уходит допаивать больничную трубу. Двери остаются открытыми с обеих сторон.',
  ])],
]));

const loot = (id,qty=1) => ({id,qty});
const choice = (id,text,setFlags={},extra={}) => ({id,text,setFlags,...extra});
const page = (id,npcId,title,lines,choices=[]) => ({id,npcId,title,lines:lines.map(([speaker,text])=>({speaker,text})),choices});
const target = (areaId,id,untilFlag,requiresFlags=[]) => ({areaId,id,untilFlag,requiresFlags});
const mark = (flag) => ({[flag]:true});
const at = ([x,z]) => ({x,z});

function bindLocation(layout,objects) {
  layout.positions=Object.fromEntries(objects.map(object=>[object.id,[object.x,object.z]]));
}

function stage(layout, anchor, fields) {
  if(!layout.anchors[anchor]) throw Error(`Отсутствует точка ${anchor} для ${fields.id}`);
  return {...fields,...at(layout.anchors[anchor])};
}

function addChapterGear(items,chapter) {
  const n=chapter.act-2, prefix=`c${chapter.act}`;
  const [weapon,armor,charm,trophy]=chapter.gear;
  const rules={
    weapon:[weapon,180+n*68,{atk:13+n*3,initiative:n%2?2:1},'Усиливает основной удар. Инициатива помогает действовать раньше противников.'],
    armor:[armor,210+n*70,{def:11+n*2,hp:26+n*6},'Смягчает физический урон и увеличивает запас здоровья.'],
    charm:[charm,200+n*74,{mp:17+n*4,initiative:3+n%2,hp:8+n*3},'Поддерживает запас маны и помогает раньше поставить заслон.'],
  };
  for(const [kind,[name,price,stats,description]] of Object.entries(rules)) {
    const id=`${prefix}_gear_${kind}`;
    items[id]={id,name,kind,slot:kind,price,stats,description,rarity:n>2?'epic':'rare'};
  }
  const material=`${prefix}_trophy`;
  items[material]={id:material,name:trophy,kind:'material',price:27+n*8,sellPrice:12+n*4,description:'Местные мастера покупают этот материал для ремонта и обмена.'};
  return {weapon:`${prefix}_gear_weapon`,armor:`${prefix}_gear_armor`,charm:`${prefix}_gear_charm`,material};
}

function addChapterEnemies(enemies,skills,chapter,gear) {
  const ids=[`c${chapter.act}_mob_a`,`c${chapter.act}_mob_b`,`c${chapter.act}_boss`];
  for(const [i,[name,kind,hp,atk,def,initiative,weakness,skillId,skillName,element,use,power,warning]] of chapter.foes.entries()) {
    const boss=kind==='boss', id=ids[i];
    const target={all:'allEnemies',heal:'ally',guard:'self'}[use]||'enemy';
    skills[skillId]={id:skillId,name:skillName,mp:0,target,kind:['heal','guard'].includes(use)?use:'damage',power,element,
      intent:use,telegraph:`${name} ${warning}`,description:warning};
    const rotation=boss?[skillId,chapter.act%2?'enemy_guard':'enemy_claw',chapter.act===6?'enemy_fire':'enemy_ring']:
      use==='heal'||use==='guard'?[skillId,'enemy_ice','enemy_claw']:[skillId,'enemy_claw'];
    enemies[id]={id,name,kind,boss,stats:{hp,mp:99,atk,def,speed:initiative},weakness,skills:rotation,
      ...(boss?{phases:chapter.phases.map((phase,index)=>({...phase,at:index===0?.52:.24,damage:index===0?1.05:1.11}))}:{}),
      rewards:{xp:boss?260+chapter.act*35:72+chapter.act*11,gold:boss?120+chapter.act*25:24+chapter.act*5,items:[]},
      lootTable:{guaranteed:[loot(gear.material,boss?3:1),...(boss?[loot(gear.weapon)]:[])]}};
  }
  return ids;
}

function promptNode(layout,anchor,id,flag,record,requiresFlags,sequence) {
  const [label,prompt,answers,successText]=record;
  // The clue determines the correct answer. Rotate the button order between scenes.
  const choices=answers.map((text,i)=>({text,correct:i===0}));
  const offset=sequence%choices.length;
  return stage(layout,anchor,{id,type:'puzzle',label,flag,requiresFlags,successText,puzzle:{prompt,choices:[...choices.slice(offset),...choices.slice(0,offset)],
    failureText:'Порядок не сработал. Сверьте записку в журнале и попробуйте ещё раз.'}});
}

function addChapter({areas,layouts,quests,dialogues,targets,enemies,skills,items},chapter) {
  const {act,title,areas:[[first,firstTitle,firstDescription],[second,secondTitle,secondDescription]],people:[personA,personB]}=chapter;
  const prefix=`c${act}`, id=tag=>`${prefix}_${tag}`;
  const previousAct=CAMPAIGN_ACTS[act-2], nextAct=CAMPAIGN_ACTS[act], previous=previousAct.areas.at(-1), next=nextAct?.areas[0];
  const shallow=structuredClone(CAMPAIGN_LAYOUTS[first]), deep=structuredClone(CAMPAIGN_LAYOUTS[second]);
  const gear=addChapterGear(items,chapter), [mobA,mobB,boss]=addChapterEnemies(enemies,skills,chapter,gear);
  const gateFlag=act===2?'act1_complete':`c${act-1}_settled`;
  const started=id('travelled'), brief=id('briefed'), clueFlag=id('clue_read'), opened=id('route_open'), fightFlag=id('causeway_clear');
  const reached=id('stage_reached'), audit=id('audit_allowed'), evidence=id('evidence_read'), lockFlag=id('safeguard_open');
  const beaten=id('boss_beaten'), settled=next?id('settled'):'campaign_complete';
  const sideStarted=id('side_started'), sideLearned=id('side_learned'), sideAccess=id('side_unblocked'), sideFound=id('side_found'), sideDone=id('side_done');
  const npcA=id('npc_a'), npcB=id('npc_b');
  const enterFirst=stage(shallow,'back',{id:`${first}_${previous}`,label:`Вернуться · ${areas.find(a=>a.id===previous)?.title||'Аббатство'}`,target:previous});
  const leaveFirst=stage(shallow,'ahead',{id:`${first}_${second}`,label:secondTitle,target:second,requiresFlags:[fightFlag]});
  const enterSecond=stage(deep,'back',{id:`${second}_${first}`,label:`Вернуться · ${firstTitle}`,target:first});
  const leaveSecond=next?stage(deep,'ahead',{id:`${second}_${next}`,label:CHAPTERS[act-1].areas[0][1],target:next,requiresFlags:[settled]}):null;
  const link=(areaId,key,untilFlag,requiresFlags)=>target(areaId,key,untilFlag,requiresFlags);

  const localStats=act-2;
  const sidePuzzle=act===3?['Сигнальная доска старой стоянки','В старом караване Нель два коротких удара означают просьбу о тихом проходе. Как подать знак?',['Два коротких удара','Два долгих удара','Три коротких удара'],'Караульные отходят проверять гребень. До стоянки можно дойти без боя.']:
      act===5?['Пустая бирка-проходка','Покажите зеркалам бирку, на которую ещё никто не дал ответ.',['Пустая бирка','Старое имя','Зеркальный ответ'],'Ловчие пропускают чистую бирку. Саженец теперь доступен без боя.']:null;
  const readClue=stage(shallow,'clue',{id:id('read_clue'),type:'inspect',label:chapter.trail[0],flag:clueFlag,requiresFlags:[brief],dialogue:id('read_clue_text'),successText:chapter.trail[1]});
  const openRoute=promptNode(shallow,'device',id('device'),opened,chapter.switch,[clueFlag],act);
  const roadFight=stage(shallow,'roadFight',{id:id('road_fight'),label:'Караул перехода',enemies:[mobA,mobB],level:chapter.levels[0],required:true,
    requiresFlags:[opened],flagOnWin:fightFlag,stroll:[1.8,.7], rewards:{xp:250+act*25,gold:54+act*12},lootTable:{choices:[{...loot(gear.armor),weight:1},{...loot(gear.material,2),weight:2}]}});
  const aidDossier=stage(shallow,'side',{id:id('side_dossier'),type:'inspect',label:chapter.side[0],flag:sideLearned,requiresFlags:[sideStarted],dialogue:id('side_dossier_text'),successText:chapter.side[1]});
  const sideFight=stage(shallow,'sideFight',{id:id('side_fight'),label:'Дозор у старой тропы',enemies:[mobA],level:chapter.levels[0],flagOnWin:sideAccess,stroll:[.6,.8],
    requiresFlags:[sideLearned],forbidFlags:[sideAccess],rewards:{xp:90,gold:35},lootTable:{guaranteed:[loot(gear.material,2)]}});
  const sideBypass=sidePuzzle?promptNode(shallow,'side',id('side_bypass'),sideAccess,sidePuzzle,[sideLearned],act+1):null;
  if(sideBypass){sideBypass.x+=3.3;sideBypass.z+=2.8;sideBypass.forbidFlags=[sideAccess];}
  const sideCache=stage(shallow,'cache',{id:id('side_cache'),type:'chest',label:'Ящик со свидетельством',flag:sideFound,requiresFlags:[sideAccess],
    successText:'Свидетельство найдено. Его ждут до следующей смены.',items:[loot('healing_draught',2)],lootTable:{guaranteed:[loot(gear.material,2)]}});

  const readEvidence=stage(deep,'evidence',{id:id('read_evidence'),type:'inspect',label:chapter.evidence[0],flag:evidence,requiresFlags:[audit],dialogue:id('read_evidence_text'),successText:chapter.evidence[1]});
  const mechanism=promptNode(deep,'mechanism',id('mechanism'),lockFlag,chapter.lock,[evidence],act+1);
  const climax=stage(deep,'climax',{id:id('climax'),label:chapter.foes[2][0],enemies:act===6?[boss]:[boss,mobB],level:chapter.levels[1],required:true,boss:true,
    requiresFlags:[lockFlag],flagOnWin:beaten,rewards:{xp:310+act*33,gold:72+act*13},lootTable:{guaranteed:[loot(gear.charm)]}});
  const verdict=stage(deep,'verdict',{id:id('verdict'),type:'inspect',label:chapter.scene[0],flag:id('heard_verdict'),requiresFlags:[beaten],dialogue:id('verdict_text'),
    successText:'У этого разговора осталось одно решение.'});
  const cache=stage(deep,'cache',{id:id('cache'),type:'chest',label:'Запасной дорожный сундук',flag:id('cache_open'),
    lootTable:{guaranteed:[loot('ether_drop',2),loot('revival_salt')],choices:[{...loot(gear.material),weight:3},{...loot(gear.armor),weight:1}]},rewards:{xp:75+localStats*15,gold:46+localStats*7}});
  const shop=[gear.weapon,gear.armor,gear.charm,'healing_draught','ether_drop','revival_salt','travel_stew','campaign_tonic'];
  if(act>=4)shop.push('campaign_tide');
  const workbench=stage(deep,'workbench',{id:id('workbench'),type:'inspect',smith:true,name:'Дорожный верстак',label:'Дорожный верстак · ремонт',smithLine:'Подтяните крепления, поправьте лезвия и отправляйтесь дальше с целой экипировкой.'});

  const guide=stage(shallow,'guide',{id:npcA,name:personA[0],animationSource:npcA,model:npcA,portrait:act+3,
    dialogue:id('brief'),variants:[{requiresFlags:[sideFound],dialogue:id('side_return')},{requiresFlags:[brief],dialogue:id('guide_again')}]});
  const curator=stage(deep,'curator',{id:npcB,name:personB[0],animationSource:npcB,model:npcB,portrait:act+6,dialogue:id('audit'),
    variants:[{requiresFlags:[settled],dialogue:id('curator_after')},{requiresFlags:[audit],dialogue:id('curator_again')}],shop});
  const camp=(map,tag)=>stage(map,'camp',{id:id(tag),type:'camp',label:'Лагерь · восстановление',flag:id(tag),radius:3.8});

  const zoneA={id:first,act,title:firstTitle,description:firstDescription,biome:chapter.biomes[0],radiusX:80,radiusZ:70,
    spawn:at(shallow.spawn),entryComic:`act${act}_arrival`,enterFlag:started,exits:[enterFirst,leaveFirst],npcs:[guide],
    nodes:[camp(shallow,'road_camp'),readClue,openRoute,aidDossier,sideCache,...(sideBypass?[sideBypass]:[])],encounters:[roadFight,sideFight]};
  const zoneB={id:second,act,title:secondTitle,description:secondDescription,biome:chapter.biomes[1],radiusX:80,radiusZ:73,
    spawn:at(deep.spawn),entryComic:`act${act}_depths`,enterFlag:reached,exits:[enterSecond,...(leaveSecond?[leaveSecond]:[])],npcs:[curator],
    nodes:[camp(deep,'stage_camp'),readEvidence,mechanism,verdict,workbench,cache],encounters:[climax]};
  for(const [zone,layout] of [[zoneA,shallow],[zoneB,deep]]){
    layouts[zone.id]=layout;
    bindLocation(layout,[...zone.exits,...zone.npcs,...zone.nodes,...zone.encounters]);
    areas.push(zone);
  }

  const previousArea=areas.find(a=>a.id===previous), entry=previousArea.exits.find(exit=>exit.target===first);
  if(!entry)throw Error('Предыдущая область не связана с '+first);
  const write=(dialogue)=>{dialogues[dialogue.id]=dialogue;};
  const speech=(tag,npc,title,lines,choices)=>write(page(id(tag),npc,title,lines,choices));
  const branchChoice=(which)=>choice(`road_${which}`,chapter.outcomes[which][0],{[settled]:true,[id(which?'outcome_b':'outcome_a')]:true},{
    next:id(which?'after_b':'after_a'),items:[which?loot('ether_drop',2):loot('campaign_tonic'),loot(gear.material)],
  });
  const answer=choice('done','Вернуться к дороге.');
  const description=chapter.trail[1];
  const sideChoices=[choice('help','Разобраться и вернуться с вестью.',mark(sideStarted),{forbidFlags:[sideStarted]}),choice('later','Продолжить путь.')];

  speech('brief',npcA,personA[1],[[personA[2],personA[3]],['Герой','Проверим след, пока дорога открыта.']],
    [choice('listen','Осмотреть свидетельство у тропы.',mark(brief))]);
  for(const [index, echo] of (chapter.echoes||[]).entries()){
    const prior=index?'b':'a', variant=id(`brief_echo_${prior}`);
    const source=dialogues[id('brief')];
    dialogues[variant]={...source,id:variant,lines:[{speaker:personA[2],text:echo},...source.lines]};
    guide.variants.push({requiresFlags:[`c${act-1}_outcome_${prior}`],forbidFlags:[brief],dialogue:variant});
  }
  speech('guide_again',npcA,chapter.side[0],[[personA[2],chapter.side[1]]],sideChoices);
  speech('side_dossier_text',npcA,chapter.side[0],[[personA[2],chapter.side[1]],['Герой',sidePuzzle?'Проверю знак здесь, у тропы. Если дозор не поверит, придётся идти через его пост.':'Отряд проверит дорогу и заберёт свидетельство.']],[answer]);
  speech('side_return',npcA,chapter.side[0],[[personA[2],chapter.side[2]]],
    [choice('return','Передать найденное свидетельство.',mark(sideDone),{forbidFlags:[sideDone]}),choice('leave','Попрощаться.')]);
  speech('read_clue_text',npcA,chapter.trail[0],[['Герой',description]],[answer]);
  speech('audit',npcB,personB[1],[[personB[2],personB[3]],['Герой','Покажите записи и порядок работы механизма.']],[choice('see','Проверить документ.',mark(audit))]);
  speech('curator_again',npcB,personB[1],[[personB[2],evidenceHint(chapter)],[personB[2],'Верстак у лагеря открыт. Припасы можно взять здесь.']],[answer]);
  speech('read_evidence_text',npcB,chapter.evidence[0],[['Герой',chapter.evidence[1]]],[answer]);
  speech('curator_after',npcB,chapter.scene[0],[[personB[2],chapter.epilogue]],[answer]);
  speech('verdict_text',npcB,chapter.scene[0],[['Герой',chapter.scene[1]],[personB[2],chapter.scene[2]]],next?
    [branchChoice(0),branchChoice(1),choice('leave','Подумать ещё.')]:[
      choice('return','Разобрать центральный узел. Вернуть записи владельцам.',{campaign_complete:true,campaign_return:true},{next:'ending_campaign_return',forbidFlags:['campaign_complete']}),
      choice('council','Оставить зал для открытого круга. Отозвать центральный ключ.',{campaign_complete:true,campaign_council:true},{next:'ending_campaign_council',forbidFlags:['campaign_complete']}),
      choice('leave','Подумать ещё.'),
    ]);
  if(next){
    for(const [i,[,effect]] of chapter.outcomes.entries())speech(i?'after_b':'after_a',npcB,chapter.scene[0],[[personB[2],effect],[personB[2],chapter.epilogue]],[answer]);
    verdict.forbidFlags=[settled];
  }

  const addQuest=(key,name,areaId,description,requiresFlags,completeFlags,weight,stages,{optional=false,items:rewardItems=[]}={})=>{
    const questId=key==='north_letter'?'c2_north_letter':id(key);
    quests.push({id:questId,title:name,areaId,act,description,requiresFlags,completeFlags,optional,
      rewards:{xp:Math.round(chapter.budget*weight),gold:weight?Math.round(45+170*weight+localStats*15):0,items:rewardItems}});
    targets[questId]=stages;
  };

  addQuest(act===2?'north_letter':'journey',act===2?'Катушка с чужим гербом':`Дорога · ${title}`,previous,
    act===2?'Поднимитесь по северной лестнице аббатства и выйдите на почтовый тракт.':`Отправляйтесь в область «${firstTitle}».`,[gateFlag],[started],.035,[link(previous,entry.id,started)]);
  addQuest('trace',chapter.trail[0],first,`Поговорите с ${personA[0]} и прочтите документ у тропы. ${chapter.trail[1]}`,[started],[brief,clueFlag],.13,
    [link(first,npcA,brief),link(first,readClue.id,clueFlag)]);
  addQuest('pass',chapter.switch[0],first,chapter.switch[1],[clueFlag],[opened,fightFlag,reached],.17,
    [link(first,openRoute.id,opened),link(first,roadFight.id,fightFlag),link(first,leaveFirst.id,reached)]);
  addQuest('audit_task',chapter.evidence[0],second,`Поговорите с ${personB[0]} и осмотрите документ. ${chapter.evidence[1]}`,[reached],[audit,evidence],.125,
    [link(second,npcB,audit),link(second,readEvidence.id,evidence)]);
  addQuest('clash',chapter.lock[0],second,`${chapter.lock[1]} Когда механизм открыт, одолейте противника, который держит участок.`,[evidence],[lockFlag,beaten],.20,
    [link(second,mechanism.id,lockFlag),link(second,climax.id,beaten)]);
  addQuest('decision',chapter.scene[0],second,next?'Завершите дело здесь и узнайте, куда переносили записи.':'Решите судьбу центрального зала.',[beaten],[settled],.12,
    [link(second,verdict.id,settled)],{items:[loot('ether_drop',2),loot('healing_draught',2)]});
  addQuest('side_story',chapter.side[0],first,sideBypass?`${chapter.side[1]} Можно договориться о тихом проходе или одолеть дозор.`:chapter.side[1],[brief],[sideStarted,sideLearned,sideAccess,sideFound,sideDone],.14,
    [link(first,npcA,sideStarted),link(first,aidDossier.id,sideLearned),link(first,sideBypass?.id||sideFight.id,sideAccess),link(first,sideCache.id,sideFound),link(first,npcA,sideDone)],
    {optional:true,items:[loot(gear.armor),loot('revival_salt')]});
}

function evidenceHint(chapter) {
  return 'До решения перечитайте документ, на который я указал. '+chapter.evidence[1];
}

export function extendCampaign({areas,layouts,quests,dialogues,targets,enemies,skills,items,actInfo}) {
  const abbey=areas.find(a=>a.id==='abbey'), layout=layouts.abbey;
  const gate={id:'abbey_salt_coast',label:'Северный тракт · Соляное взморье',target:'salt_coast',x:1,z:-79,requiresFlags:['act1_complete']};
  abbey.exits.push(gate);
  layout.positions[gate.id]=[gate.x,gate.z];
  layout.roads.push({width:4.8,points:[[0,-62],[1,-70],[1,-79]]});
  layout.landmarks.push({id:'abbey_north_post',label:'Северный почтовый столб',x:2.4,z:-76,kind:'landmark'});

  for(const branch of ['public_truth','stewardship']){
    const epilogue=dialogues[`ending_${branch}`];
    const line=epilogue.lines.at(-1);
    line.text=branch==='public_truth'
      ?'Утром на северном тракте нашли катушку с чужим гербом. Внутри голос просит о встрече. На обороте сургуча — знак отливной почты. Идём на взморье, пока дорога открыта.'
      :'Утром с северного тракта принесли катушку с чужим гербом. Внутри голос назначил встречу. На обороте сургуча — знак отливной почты. Пусть возьмём копию нового договора: покажем, чьё согласие теперь нужно.';
  }

  items.campaign_tonic={id:'campaign_tonic',name:'Настой грозового цветка',kind:'consumable',price:58,effect:{kind:'heal',power:215},
    description:'Восстанавливает до 215 HP одному живому герою.'};
  items.campaign_tide={id:'campaign_tide',name:'Полевой котелок',kind:'consumable',price:115,effect:{kind:'allHeal',power:145},
    description:'Восстанавливает до 145 HP каждому живому герою отряда.'};

  for(const chapter of CHAPTERS)addChapter({areas,layouts,quests,dialogues,targets,enemies,skills,items},chapter);

  for(const [id,ending] of Object.entries(CAMPAIGN_ENDINGS)){
    const lines=id==='campaign_return'?
      [['Вран','Сегодня вперёд не уйдёт ни один запертый голос. Ключ снимем при свидетелях, потом разнесём пластины.'],
      ['Герой','Первую посылку отдайте отливной почте. Доставку подтверждает тот, кто её получит.']]:
      [['Вран','Пусть зал держит звук, но не вмещает чужую власть. Оставим открытым каждый боковой вход.'],
      ['Герой','Первым делом голос из слободы. Он вправе передумать, забрать запись и уйти.']];
    dialogues[`ending_${id}`]=page(`ending_${id}`,'c6_npc_b',ending.title,lines,[choice('end','Открыть финальный комикс.')]);
  }

  // The act-I decision is still recorded by the imported save. Its consequence
  // travels with the party and changes the greeting at the first destination.
  const guide=areas.find(a=>a.id==='salt_coast').npcs[0];
  const base=dialogues.c2_brief;
  for(const [flag,text] of [
    ['public_truth','У вас знают, что колокол остановлен. Рыбаки спрашивают, как теперь получать помощь. Расскажите им у костра, что уже работает без колокола.'],
    ['stewardship','Сюда дошла копия договора о трёх ключах. Смотрителю можно её показать. Он помнит, как одна рука забирала обратно весь отданный свет.'],
  ]){
    const id=`c2_brief_${flag}`;
    dialogues[id]={...base,id,lines:[{speaker:'Сима',text},...base.lines]};
    guide.variants.push({requiresFlags:[flag],forbidFlags:['c2_briefed'],dialogue:id});
  }

  Object.assign(actInfo,{campaignTitle:'Пепельная клятва',actCount:CAMPAIGN_ACTS.length,campaignCompletionFlag:'campaign_complete',
    campaignEndingFlags:Object.keys(CAMPAIGN_ENDINGS),campaignAreaCount:areas.length});
}
