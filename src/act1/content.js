import { AREA_LAYOUTS } from './area-layouts.js?v=rivers-0181';
import { applyAreaLayouts } from './area-geometry.js?v=rivers-0181';
import { extendRoadsContent } from './roads-content.js?v=campaign-140';
import { extendForgedEncounters } from './forged-enemies.js?v=forged-meshy-0191';
import { addSmithies } from './forged-smiths.js?v=forged-019';
import { FORGE_ITEMS } from './loot-tables.js?v=forged-019';
import { addStartingHeroes } from './campaign-starters.js?v=campaign-140';
import { extendCampaign } from './campaign-content.js?v=campaign-140';
import { addCampaignPatrols } from './campaign-patrols.js?v=campaign-130';
import { addRegionalEquipment } from './regional-equipment.js?v=campaign-150';
import { applyEncounterBalance } from './encounter-balance.js?v=campaign-150';
export { CAMPAIGN_ACTS, CAMPAIGN_COMICS, CAMPAIGN_ENDINGS } from './campaign-content.js?v=campaign-140';

// Ashen Oath — original first act. Immutable authored data; runtime owns all state.
export const CONTENT_VERSION = '1.0.0';

export const PARTY = [
  {id:'alar',name:'Алар',role:'Рыцарь рассвета',portrait:0,stats:{hp:150,mp:30,atk:24,def:16,speed:14},skills:['sun_cut','oath_guard','cinder_wave','last_light', 'dawn_challenge', 'oath_link'],startingGear:{weapon:'rust_sword',armor:'brigand_mail'}},
  {id:'iona',name:'Иона',role:'Исследовательница печатей',portrait:1,stats:{hp:112,mp:55,atk:18,def:10,speed:18},skills:['ember_script','frost_margin','scatter_runes','clear_thought', 'lightning_chain', 'ink_seal'],startingGear:{weapon:'survey_staff',armor:'scholar_coat'}},
  {id:'radan',name:'Радан',role:'Ветеран заставы',portrait:2,stats:{hp:185,mp:28,atk:26,def:22,speed:10},skills:['spear_thrust','shield_wall','iron_sweep','rally', 'counter_charge', 'brace_impact'],startingGear:{weapon:'veteran_spear',armor:'veteran_plate'}},
  {id:'leia',name:'Лея',role:'Лекарка без ордена',portrait:3,stats:{hp:125,mp:65,atk:16,def:13,speed:16},skills:['warm_hands','shared_breath','wake_flame','copper_spark', 'healing_thread', 'warding_hymn'],startingGear:{weapon:'copper_censer',armor:'healer_mantle'}}
];

const skill=(id,name,mp,target,kind,power,description,element='physical')=>({id,name,mp,target,kind,power,description,element});
export const SKILLS = {
  sun_cut:{...skill('sun_cut','Рассветный разрез',4,'enemy','damage',1.55,'Сильный удар одному врагу. Надёжный способ завершить опасный замах.'),...{"element":"light","heroEffects":{"ignoreGuard":true},"description":"Светлый удар одному врагу. Обходит защитную стойку; слабость к свету учитывается отдельно."}},
  oath_guard:{...skill('oath_guard','Стойкость обета',5,'self','guard',0.65,'Алар принимает защитную стойку и уменьшает получаемый урон.'),...{"heroEffects":{"counter":true},"description":"Алар принимает защитную стойку и уменьшает получаемый урон. Один раз отвечает на физическое попадание ударом 65% мощности; стойка ответа длится до двух начал его хода."}},
  cinder_wave:{...skill('cinder_wave','Волна углей',11,'allEnemies','damage',1.1,'Удар раскалённой волной по всем врагам.','fire'),...{"heroEffects":{"chill":{"percent":20}},"description":"Огненная волна по всем врагам. Их следующая атака наносит на 20% меньше урона; массовая атака ослабляется целиком."}},
  last_light:{...skill('last_light','Последний свет',10,'ally','heal',70,'Малое исцеление союзника, когда лекарка занята.','light'),...{"heroEffects":{"emergencyBarrier":{"threshold":0.25,"base":15,"scale":0.2,"turns":1}},"description":"Лечит 70 HP живому союзнику. В бою, если до лечения у него было не больше 25% HP, также создаёт конечный аварийный барьер до начала следующего хода союзника. В пути — только лечение."}},
  ember_script:{...skill('ember_script','Огненная строка',5,'enemy','damage',1.8,'Сосредоточенная огненная руна.','fire'),...{"heroEffects":{"burn":{"base":3,"scale":0.15,"turns":2}},"description":"Огненный удар и горение перед двумя следующими действиями врага. Точный периодический урон виден в прогнозе; повторное горение обновляет длительность."}},
  frost_margin:{...skill('frost_margin','Морозная помета',6,'enemy','damage',1.9,'Ледяная запись пробивает защиту огненных существ.','ice'),...{"heroEffects":{"chill":{"percent":35}},"description":"Ледяной удар. Следующая атака врага слабее на 35%; защита, лечение и пропуск хода не расходуют ослабление."}},
  scatter_runes:{...skill('scatter_runes','Рассыпанные руны',12,'allEnemies','damage',1.25,'Круг рун поражает весь вражеский ряд.','light'),...{"heroEffects":{"stripGuard":true},"description":"Снимает защитные стойки перед световым ударом по всему вражескому ряду. Равновесие от слабости считается отдельно."}},
  clear_thought:{...skill('clear_thought','Ясная мысль',7,'ally','heal',58,'Иона переводит часть силы печатей в живое тепло.','light'),...{"heroEffects":{"manaTransfer":6},"description":"Восстанавливает 58 HP. В бою дополнительно передаёт до 6 MP другому живому союзнику за 7 MP Ионы. Можно поддержать полностью здорового истощённого спутника. В пути восстанавливает только HP; себе ману не возвращает."}},
  spear_thrust:{...skill('spear_thrust','Упор копья',4,'enemy','damage',1.6,'Точный выпад против одного врага.'),...{"heroEffects":{"fracture":true},"description":"Выпад по одному врагу. Его броня снижена на 25% до окончания двух действий врага; помогает последующим атакам отряда."}},
  shield_wall:{...skill('shield_wall','Сомкнуть щиты',8,'allAllies','guard',0.45,'Группа готовится пережить тяжёлую атаку.'),...{"heroEffects":{"barrier":{"base":6,"scale":0.15,"turns":2}},"description":"Весь живой отряд снижает урон на 45% и получает малые барьеры до двух начал своих ходов. Барьеры поглощают конечный урон и не складываются."}},
  iron_sweep:{...skill('iron_sweep','Железная дуга',10,'allEnemies','damage',1.05,'Широкий удар по нескольким противникам.'),...{"heroEffects":{"tauntSelf":true},"description":"Широкий удар по врагам и провокация на Радана. Одиночные атаки направляются на него; массовые атаки не перенаправляются. Последняя провокация заменяет предыдущую."}},
  rally:{...skill('rally','Держаться вместе',9,'allAllies','heal',35,'Короткая передышка возвращает каждому немного здоровья.','light'),...{"heroEffects":{"rallyMana":3},"description":"Возвращает живому отряду 35 HP. В бою также даёт до 3 MP одному самому истощённому спутнику, кроме Радана. Стоимость 9 MP исключает бесконечное восполнение маны; в пути восстанавливает только HP."}},
  warm_hands:{...skill('warm_hands','Тёплые ладони',5,'ally','heal',96,'Лея лечит одного союзника.','light'),...{"heroEffects":{"triage":{"threshold":0.35,"bonus":30}},"description":"Лечит 96 HP живому союзнику. При здоровье не выше 35% добавляет 30 HP; избыток исцеления не запасается."}},
  shared_breath:{...skill('shared_breath','Общее дыхание',12,'allAllies','heal',62,'Исцеление всей группы.','light'),...{"heroEffects":{"regen":{"base":6,"scale":0.12,"turns":2}},"description":"Исцеляет живой отряд на 62 HP. В бою также восстанавливает немного HP в начале двух следующих ходов каждого. Павших не возрождает; восстановление не складывается. В пути действует только немедленное лечение."}},
  wake_flame:{...skill('wake_flame','Искра возвращения',16,'ally','revive',0.45,'Возрождает павшего спутника с 45% здоровья. Доступно в бою и в пути; живых союзников не лечит.','light'),...{"heroEffects":{"reviveGuard":true},"description":"Возрождает павшего спутника с 45% HP. В бою снижает следующий входящий урон на 35% до начала его хода. В пути действует обычное возрождение без боевого статуса."}},
  copper_spark:{...skill('copper_spark','Медная искра',4,'enemy','damage',1.45,'Небольшой разряд света против теней.','light'),...{"heroEffects":{"lifeHeal":0.25},"description":"Световой удар по врагу. Самый раненый живой спутник лечится на 25% фактически нанесённого урона; избыточный урон не даёт лишнего лечения."}},
  dawn_challenge:{"name":"Вызов рассвета","mp":9,"target":"self","kind":"taunt","power":1,"level":3,"element":"light","heroEffects":{"barrier":{"base":18,"scale":0.5,"turns":2},"tauntOnly":true},"description":"Алар провоцирует одиночные атаки и получает конечный барьер до двух начал своего хода. Умение не добавляет снижение урона и сохраняет уже действующую защитную стойку. Массовые атаки остаются массовыми; барьер не складывается. Последняя провокация заменяет предыдущую.","id":"dawn_challenge"},
  oath_link:{"name":"Связанный обет","mp":10,"target":"ally","kind":"guard","power":0.25,"level":6,"element":"light","heroEffects":{"cover":true},"description":"Защищает другого живого союзника; Алар принимает 30% оставшегося урона по нему до двух начал своего хода. Самоприкрытие и цепочки перенаправления исключены.","id":"oath_link"},
  lightning_chain:{"name":"Цепь озарений","mp":10,"target":"enemy","kind":"damage","power":1.45,"level":3,"element":"light","heroEffects":{"chain":true},"description":"Разряд по выбранному врагу перескакивает на другого живого противника с 55% мощности. Каждая цель получает только один удар.","id":"lightning_chain"},
  ink_seal:{"name":"Чернильная печать","mp":12,"target":"enemy","kind":"damage","power":0.9,"level":6,"element":"light","heroEffects":{"disrupt":true},"description":"Световой удар и печать на два действия врага. Одна следующая магическая атака или лечение заменяется обычной одиночной атакой; враг не теряет ход.","id":"ink_seal"},
  counter_charge:{"name":"Сбить разгон","mp":7,"target":"enemy","kind":"damage","power":1.35,"level":3,"element":"physical","heroEffects":{"heavyPunish":true},"description":"Выпад по врагу. Если тот готовит тяжёлую или массовую атаку, мощность выше на 45% и сбивает одно действие. Равновесие и восстановление защищают от повторного сбивания.","id":"counter_charge"},
  brace_impact:{"name":"Принять удар","mp":10,"target":"self","kind":"guard","power":0.7,"level":6,"element":"physical","heroEffects":{"barrier":{"base":32,"scale":0.6,"turns":2}},"description":"Радан снижает входящий урон на 70% и ставит сильный личный барьер до двух начал своего хода. Провокацию нужно поддерживать отдельно.","id":"brace_impact"},
  healing_thread:{"name":"Нить возвращения","mp":6,"target":"ally","kind":"heal","power":35,"level":3,"element":"light","heroEffects":{"regen":{"base":16,"scale":0.45,"turns":2}},"description":"Восстанавливает 35 HP. В бою также лечит в начале двух следующих ходов живого союзника; можно подготовить нить на здоровом без свежей нити. Павших не поднимает. В пути восстанавливает только 35 HP.","id":"healing_thread"},
  warding_hymn:{"name":"Песня заслона","mp":14,"target":"allAllies","kind":"guard","power":0,"level":6,"element":"light","heroEffects":{"barrier":{"base":24,"scale":0.65,"turns":2},"barrierOnly":true},"description":"Даёт всему живому отряду крупные конечные барьеры до двух начал ходов владельцев. Не добавляет и не заменяет защитную стойку: сильная защита Радана сохраняется. Барьеры не складываются.","id":"warding_hymn"},
  enemy_claw:skill('enemy_claw','Рваный удар',0,'enemy','damage',1,'Ближняя атака.'),
  enemy_fire:skill('enemy_fire','Угольный плевок',0,'enemy','damage',1.35,'Сгусток жара.','fire'),
  enemy_ice:skill('enemy_ice','Холодная память',0,'enemy','damage',1.25,'Прикосновение болотного холода.','ice'),
  enemy_ring:skill('enemy_ring','Тяжёлый звон',0,'allEnemies','damage',0.9,'Удар звуковой волной.','light'),
  enemy_guard:skill('enemy_guard','Железная выдержка',0,'self','guard',0.4,'Противник защищается.'),
  enemy_mend:skill('enemy_mend','Сшить пепел',0,'ally','heal',45,'Восстановление союзника.')
};

const item=(id,name,kind,price,extra={})=>({id,name,kind,price,...extra});
export const ITEMS = {
  rust_sword:item('rust_sword','Клинок пережитого утра','weapon',30,{slot:'weapon',stats:{atk:3}}),
  survey_staff:item('survey_staff','Мерный жезл Ионы','weapon',35,{slot:'weapon',stats:{atk:2,mp:6}}),
  veteran_spear:item('veteran_spear','Копьё заставы','weapon',45,{slot:'weapon',stats:{atk:4}}),
  copper_censer:item('copper_censer','Медное кадило','weapon',35,{slot:'weapon',stats:{atk:2,mp:8}}),
  witness_blade:item('witness_blade','Клинок свидетеля','weapon',210,{slot:'weapon',stats:{atk:12,speed:1}}),
  reed_staff:item('reed_staff','Жезл тихой воды','weapon',190,{slot:'weapon',stats:{atk:8,mp:14}}),
  ward_spear:item('ward_spear','Копьё открытых ворот','weapon',220,{slot:'weapon',stats:{atk:12,def:2}}),
  dawn_censer:item('dawn_censer','Кадило первой зари','weapon',205,{slot:'weapon',stats:{atk:7,mp:18}}),
  brigand_mail:item('brigand_mail','Потемневшая кольчуга','armor',40,{slot:'armor',stats:{def:3}}),
  scholar_coat:item('scholar_coat','Плащ с полями','armor',35,{slot:'armor',stats:{def:2,mp:4}}),
  veteran_plate:item('veteran_plate','Латы старой заставы','armor',50,{slot:'armor',stats:{def:5,speed:-1}}),
  healer_mantle:item('healer_mantle','Дорожная мантия','armor',35,{slot:'armor',stats:{def:2,hp:8}}),
  road_mail:item('road_mail','Кольчуга караванщика','armor',170,{slot:'armor',stats:{def:8,hp:15}}),
  margin_coat:item('margin_coat','Кафтан с возвращённым именем','armor',180,{slot:'armor',stats:{def:6,mp:16}}),
  oath_plate:item('oath_plate','Сталь общего обета','armor',235,{slot:'armor',stats:{def:12,hp:25,speed:-1}}),
  hospice_cloak:item('hospice_cloak','Плащ деревенской лечебницы','armor',180,{slot:'armor',stats:{def:7,mp:12}}),
  copper_ring:item('copper_ring','Кольцо медника','charm',65,{slot:'charm',stats:{hp:18}}),
  ash_locket:item('ash_locket','Медальон неотданного письма','charm',120,{slot:'charm',stats:{hp:25,mp:5}}),
  bell_charm:item('bell_charm','Язык малого колокола','charm',160,{slot:'charm',stats:{def:3,mp:12}}),
  hunter_pin:item('hunter_pin','Знак свободной тропы','charm',120,{slot:'charm',stats:{speed:5,atk:2}}),
  healing_draught:item('healing_draught','Отвар шиповника','consumable',18,{effect:{kind:'heal',power:100}}),
  ether_drop:item('ether_drop','Капля ясного эфира','consumable',30,{effect:{kind:'mp',power:28}}),
  revival_salt:item('revival_salt','Соль пробуждения','consumable',55,{effect:{kind:'revive',power:0.4},description:'Возрождает одного павшего спутника с 40% здоровья. Расходуется одна порция; в бою занимает ход. Доступно через «Возродить» или из сумки.'}),
  travel_stew:item('travel_stew','Похлёбка на четверых','consumable',65,{effect:{kind:'allHeal',power:75}}),
  iron_ore:item('iron_ore','Чистая болотная руда','material',8),
  golden_resin:item('golden_resin','Золотая смола','material',12),
  marsh_lily:item('marsh_lily','Серебряная болотница','material',10),
  grain_sack:item('grain_sack','Спасённое зерно','quest',0),
  farewell_letter:item('farewell_letter','Письмо с тремя сгибами','quest',0),
  quarry_accounts:item('quarry_accounts','Весовая книга каменоломни','quest',0),
  archive_page:item('archive_page','Лист из книги согласий','quest',0),
  memory_spool:item('memory_spool','Катушка удержанного голоса','quest',0),
  witness_register:item('witness_register','Книга живых свидетельств','quest',0),
  warden_key:item('warden_key','Ключ коменданта','quest',0),
  bell_clapper:item('bell_clapper','Расколотый язык большого колокола','quest',0),
  broken_badge:item('broken_badge','Жетон восьмой смены','quest',0),
  ...FORGE_ITEMS
};

const enemy=(id,name,kind,hp,atk,def,speed,xp,gold,skills=['enemy_claw'],extra={})=>({id,name,kind,stats:{hp,mp:99,atk,def,speed},skills,rewards:{xp,gold,items:[]},...extra});
export const ENEMIES = {
  ash_husk:enemy('ash_husk','Пепельный клинок','husk',68,18,7,11,20,9,['enemy_claw'],{weakness:'light'}),
  ember_acolyte:enemy('ember_acolyte','Жрец углей','acolyte',62,19,6,15,24,12,['enemy_fire'],{weakness:'ice'}),
  iron_sentinel:enemy('iron_sentinel','Железный страж','sentinel',105,23,13,8,34,17,['enemy_claw','enemy_guard']),
  broken_reliquary:enemy('broken_reliquary','Страж погасшего выхода','boss',270,24,12,9,100,60,['enemy_claw','enemy_ring'],{boss:true}),
  road_extorter:enemy('road_extorter','Сборщик дорожной дани','husk',85,22,10,14,28,23),
  thorn_wolf:enemy('thorn_wolf','Шиповолк','husk',88,24,8,20,30,12),
  resin_moth:enemy('resin_moth','Смоляная ночница','acolyte',72,24,7,21,31,15,['enemy_fire'],{weakness:'ice'}),
  thorn_keeper:enemy('thorn_keeper','Хозяин железных корней','boss',390,30,15,12,145,85,['enemy_claw','enemy_ring'],{boss:true}),
  iron_rat:enemy('iron_rat','Рудная крыса','husk',80,25,11,22,31,14),
  tithe_guard:enemy('tithe_guard','Страж сборной палаты','sentinel',132,28,17,10,40,24,['enemy_claw','enemy_guard']),
  quarry_overseer:enemy('quarry_overseer','Надсмотрщик восьмой смены','sentinel',205,31,19,10,65,36,['enemy_claw','enemy_ring']),
  quarry_echo:enemy('quarry_echo','Гул пустой вагонетки','boss',425,32,19,11,155,90,['enemy_ring','enemy_guard'],{boss:true}),
  drowned:enemy('drowned','Утопленный обет','husk',122,29,12,13,42,21,['enemy_ice'],{weakness:'light'}),
  wick_light:enemy('wick_light','Блуждающий фитиль','acolyte',98,30,9,22,40,20,['enemy_fire','enemy_ice'],{weakness:'ice'}),
  reed_stalker:enemy('reed_stalker','Камышовый соглядатай','husk',148,32,14,19,45,25),
  ferry_echo:enemy('ferry_echo','Безымянный пассажир','boss',485,35,17,14,180,100,['enemy_ice','enemy_ring'],{boss:true}),
  paper_swarm:enemy('paper_swarm','Стая вычеркнутых листов','acolyte',112,31,10,23,45,24,['enemy_ring'],{weakness:'fire'}),
  ink_guard:enemy('ink_guard','Чернильный пристав','sentinel',175,34,21,12,54,32,['enemy_claw','enemy_guard']),
  hush_acolyte:enemy('hush_acolyte','Переписчик тишины','acolyte',132,35,14,18,52,30,['enemy_fire','enemy_mend'],{weakness:'ice'}),
  catalogue_warden:enemy('catalogue_warden','Хранитель пустой графы','boss',580,37,22,13,220,120,['enemy_claw','enemy_ring','enemy_guard'],{boss:true}),
  hollow_reaper:enemy('hollow_reaper','Пустой жнец','husk',165,35,17,16,56,30),
  cinder_bird:enemy('cinder_bird','Птица чёрного жнивья','acolyte',118,34,13,25,49,27,['enemy_fire'],{weakness:'ice'}),
  harvest_engine:enemy('harvest_engine','Сборщик последнего снопа','boss',650,40,23,12,240,145,['enemy_claw','enemy_ring'],{boss:true}),
  fortress_archer:enemy('fortress_archer','Арбалетчик заставы','acolyte',162,38,17,21,62,36),
  warden_hound:enemy('warden_hound','Стальная гончая','husk',178,41,19,24,65,34),
  dagan:enemy('dagan','Даган, хранитель затвора','boss',840,43,28,15,330,185,['enemy_claw','enemy_guard','enemy_ring'],{boss:true}),
  oath_knight:enemy('oath_knight','Рыцарь отнятого слова','sentinel',215,43,26,14,76,42,['enemy_claw','enemy_guard']),
  silent_choir:enemy('silent_choir','Голос медного хора','acolyte',156,41,18,21,69,38,['enemy_ring','enemy_mend'],{weakness:'light'}),
  oathshade:enemy('oathshade','Тень чужого обещания','husk',192,44,21,22,74,40,['enemy_ice','enemy_claw'],{weakness:'light'}),
  mute_abbot:enemy('mute_abbot','Безгласный настоятель','boss',590,43,26,16,235,140,['enemy_fire','enemy_ring','enemy_mend'],{boss:true}),
  bellkeeper:enemy('bellkeeper','Соборный звонарь','boss',1260,49,29,17,520,300,['enemy_ring','enemy_claw','enemy_guard'],{boss:true})
};

const loot=(id,qty=1)=>({id,qty});
const exit=(id,target,label,x,z,requiresFlags=[])=>({id,target,label,x,z,requiresFlags});
const npc=(id,name,portrait,x,z,dialogue,extra={})=>({id,name,portrait,x,z,dialogue,...extra});
const inspect=(id,label,x,z,flag,dialogue,extra={})=>({id,type:'inspect',label,x,z,flag,dialogue,...extra});
const chest=(id,label,x,z,items,extra={})=>({id,type:'chest',label,x,z,flag:id,items,...extra});
const camp=(id,label,x,z,dialogue)=>({id,type:'camp',label,x,z,flag:id,dialogue});
const puzzle=(id,label,x,z,flag,prompt,choices,successText,extra={})=>({id,type:'puzzle',label,x,z,flag,puzzle:{prompt,choices:choices.map(([text,correct])=>({text,correct})),successText},...extra});
const encounter=(id,x,z,enemies,extra={})=>({id,x,z,enemies,required:false,level:1,...extra});

export const AREAS = [
  {
    id:'monastery',title:'Монастырь после рассвета',biome:'ruins',description:'За поверженным Судьёй остались остывшие печати, сломанная галерея и дорога к живым людям. Три знакомых огня горят тише прежнего.',radiusX:34,radiusZ:42,spawn:{x:-8,z:19},
    exits:[exit('monastery_village','village','Сойти к Вересковой слободе',5,-37,['road_open'])],
    npcs:[npc('iona_monastery','Иона',1,-4,15,'iona_wake',{variants:[{requiresFlags:['iona_joined'],dialogue:'iona_after_join'}]})],
    nodes:[
      inspect('monastery_book','Книга трёх печатей',12,2,'monastery_evidence','monastery_ledger',{requiresFlags:['iona_joined'],items:[loot('archive_page')]}),
      inspect('monastery_letter','Письмо под каменной ладонью',-18,-8,'letter_found','letter_found',{items:[loot('farewell_letter')]}),
      inspect('monastery_sun','Погасший алтарь Солнца',15,-18,'sun_altar_read','sun_altar'),
      chest('monastery_cache','Припасы у рухнувшей колонны',-19,14,[loot('healing_draught',3),loot('ether_drop',2),loot('revival_salt')]),
      camp('monastery_camp','Тёплый камень у печати',-11,3,'camp_monastery')
    ],
    encounters:[
      encounter('enc01',-16,24,['ash_husk','ash_husk']),
      encounter('enc02',10,-9,['iron_sentinel','ember_acolyte'],{level:2}),
      encounter('enc03',4,-27,['broken_reliquary'],{required:true,boss:true,flagOnWin:'road_open',requiresFlags:['monastery_evidence'],level:2})
    ]
  },
  {
    id:'village',title:'Вересковая слобода',biome:'village',description:'Кузница, открытый колодец и дома вдоль изогнутой дороги. Жители встречают рыцаря настороженно: звон ушёл из монастыря, но не из их снов.',radiusX:44,radiusZ:36,spawn:{x:-30,z:15},
    exits:[exit('village_monastery','monastery','Подняться к монастырю',-38,16),exit('village_briarwood','briarwood','Вересковая тропа',35,-11,['council_mandate'])],
    npcs:[
      npc('velda_village','Вельда',4,-10,-3,'velda_arrival',{variants:[{requiresFlags:['council_mandate'],dialogue:'velda_council_after'},{requiresFlags:['seal_repaired','radan_joined','village_heard'],dialogue:'velda_council'},{requiresFlags:['village_heard'],dialogue:'velda_wait'}]}),
      npc('orin_village','Орин',5,12,5,'orin_forge',{shop:['healing_draught','ether_drop','revival_salt','road_mail','copper_ring','witness_blade','ward_spear']}),
      npc('radan_village','Радан',2,18,-14,'radan_first',{variants:[{requiresFlags:['radan_joined'],dialogue:'radan_after'}]}),
      npc('nara_village','Нара',9,-8,15,'nara_village',{forbidFlags:['archive_truth'],shop:['healing_draught','ether_drop','revival_salt','travel_stew']})
    ],
    nodes:[
      inspect('village_memorial','Доска оставленных имён',-24,-12,'memorial_read','village_memorial'),
      chest('village_well','Ведро с дорожными припасами',24,11,[loot('healing_draught',2),loot('travel_stew')]),
      camp('village_camp','Очаг общего дома',-19,6,'camp_village')
    ],
    encounters:[encounter('enc04',24,-3,['road_extorter','road_extorter'],{flagOnWin:'village_road_safe',level:2})]
  },
  {
    id:'briarwood',title:'Лес золотой смолы',biome:'forest',description:'Тропа петляет между стволами, янтарными потёками и корнями старого водовода. На развилках висят ленты лекарки.',radiusX:43,radiusZ:50,spawn:{x:-25,z:25},
    exits:[exit('briarwood_village','village','Вернуться к очагам слободы',-29,30),exit('briarwood_quarry','quarry','Спуститься к каменоломне',28,-38,['forest_pass'])],
    npcs:[
      npc('leia_wood','Лея',3,-14,17,'leia_first',{variants:[{requiresFlags:['leia_joined'],dialogue:'leia_after'}]}),
      npc('mirel_wood','Мирель',6,15,-17,'mirel_first',{variants:[{requiresFlags:['forest_pass'],dialogue:'mirel_after'},{requiresFlags:['leia_joined','forest_resin','forest_guardian'],dialogue:'mirel_pass'}]})
    ],
    nodes:[
      inspect('forest_resin_node','Смоляная чаша водовода',-5,-9,'forest_resin','forest_resin',{requiresFlags:['leia_joined'],items:[loot('golden_resin',3)]}),
      puzzle('forest_traps','Петли у звериной тропы',-25,-13,'traps_opened','Одна верёвка держит петлю, вторая — колокольчик, третья — ветку. Мирель просила выпустить зверей, не созвав охотничьи тени.',[['Перерезать натянутую петлю и придержать ветку',true],['Дёрнуть верёвку с колокольчиком',false],['Бросить огонь в сухую траву',false]],'Петля ложится на землю. Из папоротника выбегает хромая лисица; лес отвечает обычным шорохом.'),
      inspect('forest_slate','Рисунок на старом водоводе',17,25,'forest_slate_read','forest_slate'),
      chest('forest_cache','Сухой тайник охотницы',21,5,[loot('ether_drop',3),loot('healing_draught',2)]),
      camp('forest_camp','Костёр под выгнутым ясенем',-13,-27,'camp_forest')
    ],
    encounters:[
      encounter('enc05',-20,4,['thorn_wolf','thorn_wolf'],{level:3}),
      encounter('enc06',9,12,['resin_moth','thorn_wolf'],{level:3}),
      encounter('enc07',-21,-26,['road_extorter','resin_moth'],{level:3}),
      encounter('enc08',15,-30,['thorn_keeper','resin_moth'],{required:true,boss:true,flagOnWin:'forest_guardian',requiresFlags:['leia_joined'],level:4})
    ]
  },
  {
    id:'quarry',title:'Каменоломня восьмой смены',biome:'quarry',description:'Ступени добычи обнимают провал широкой дугой. Рельсы обрываются у подъёмника, где рабочие жетоны продолжают звенеть без рабочих.',radiusX:47,radiusZ:43,spawn:{x:-28,z:20},
    exits:[exit('quarry_briarwood','briarwood','Подняться в смоляной лес',-39,21),exit('quarry_fen','fen','Грузовой спуск к топям',32,-27,['quarry_lift'])],
    npcs:[
      npc('lio_quarry','Лио',8,-14,-2,'lio_trapped',{variants:[{requiresFlags:['quarry_rescue'],dialogue:'lio_rescued'}]}),
      npc('teren_quarry','Терен',7,19,12,'teren_first',{variants:[{requiresFlags:['quarry_testimony'],dialogue:'teren_after'}]})
    ],
    nodes:[
      inspect('quarry_tokens','Доска восьмой смены',-15,15,'quarry_tokens','quarry_tokens',{items:[loot('broken_badge')]}),
      inspect('quarry_accounts_node','Весовая книга в будке',19,-9,'accounts_found','quarry_accounts',{items:[loot('quarry_accounts'),loot('iron_ore',4)]}),
      inspect('quarry_lantern','Погасший фонарь в вагонетке',-26,-17,'lantern_found','quarry_lantern',{requiresFlags:['quarry_echo_broken']}),
      puzzle('quarry_lift_node','Распределитель грузового подъёмника',24,-19,'quarry_lift','На табличке: «Сначала закрепи пустую клеть. Затем уравновесь груз. Последним отпусти тормоз». Как запустить подъёмник?',[["Фиксатор — противовес — тормоз",true],["Тормоз — фиксатор — противовес",false],["Противовес — тормоз — фиксатор",false]],'Трос натягивается ровно. Клеть опускается к камышовым пристаням.',{requiresFlags:['quarry_tokens','quarry_rescue','quarry_testimony']}),
      chest('quarry_cache','Ящик горняцкой артели',5,24,[loot('revival_salt',2),loot('healing_draught',3),loot('ether_drop',2)]),
      camp('quarry_camp','Ветрозащитная стоянка',-4,-17,'camp_quarry')
    ],
    encounters:[
      encounter('enc09',-21,7,['iron_rat','iron_rat','iron_rat'],{level:4}),
      encounter('enc10',13,4,['tithe_guard','ember_acolyte'],{level:4}),
      encounter('enc11',-10,-8,['quarry_overseer','ash_husk'],{required:true,flagOnWin:'quarry_rescue',requiresFlags:['quarry_tokens'],level:5}),
      encounter('enc12',-28,-12,['quarry_echo'],{boss:true,flagOnWin:'quarry_echo_broken',level:5})
    ]
  },
  {
    id:'fen',title:'Топи забытых переправ',biome:'marsh',description:'Сухие кочки связаны кривыми мостками. Над водой мерцают огни, а на дальнем берегу видна кровля старого архива.',radiusX:48,radiusZ:45,spawn:{x:-29,z:21},
    exits:[exit('fen_quarry','quarry','Вернуться грузовым подъёмником',-40,23),exit('fen_archive','archive','Переправа Герда к архиву',32,-30,['fen_crossing'])],
    npcs:[npc('gerd_fen','Герд',11,8,-11,'gerd_first',{shop:['healing_draught','ether_drop','revival_salt','reed_staff'],variants:[{requiresFlags:['fen_crossing'],dialogue:'gerd_after'},{requiresFlags:['ferry_terms','fen_beacons','fen_witness'],dialogue:'gerd_crossing'},{requiresFlags:['ferry_terms'],dialogue:'gerd_wait'}]})],
    nodes:[
      puzzle('fen_beacons_node','Три чаши переправы',-1,4,'fen_beacons','На пристани высечено: «Камень хранит берег. Камыш показывает течение. Пламя отмечает путь домой». В каком порядке зажечь чаши?',[["У камня — у камыша — у причала",true],["У причала — у камня — у камыша",false],["Все три одновременно",false]],'Огни отражаются непрерывной полосой. Ложная тропа гаснет, и лодка получает безопасный фарватер.',{requiresFlags:['ferry_terms']}),
      inspect('fen_lily','Белые цветы над тёмной водой',-25,-15,'lilies_found','fen_lilies',{items:[loot('marsh_lily',3)]}),
      inspect('fen_passenger','Скамья последнего пассажира',21,14,'passenger_note_found','fen_passenger'),
      inspect('fen_bell','Удержанный голос на пристани',13,-24,'fen_voice_read','fen_voice',{requiresFlags:['fen_witness'],items:[loot('memory_spool')]}),
      chest('fen_cache','Просмоленный дорожный ларь',-20,15,[loot('travel_stew',2),loot('ether_drop',3)]),
      camp('fen_camp','Сухой остров под ивой',-11,-10,'camp_fen')
    ],
    encounters:[
      encounter('enc13',-18,5,['drowned','drowned'],{level:5}),
      encounter('enc14',-24,-9,['wick_light','wick_light'],{level:5}),
      encounter('enc15',18,5,['reed_stalker','drowned'],{level:6}),
      encounter('enc16',16,-18,['ferry_echo','wick_light'],{required:true,boss:true,flagOnWin:'fen_witness',requiresFlags:['fen_beacons'],level:6})
    ]
  },
  {
    id:'archive',title:'Архив несказанных имён',biome:'archive',description:'Полукруглые залы выстроены вокруг сухого бассейна. На полях книг живёт больше правды, чем в золочёных заглавиях.',radiusX:43,radiusZ:47,spawn:{x:-24,z:24},
    exits:[exit('archive_fen','fen','Вернуться к лодке Герда',-30,27),exit('archive_sunfields','sunfields','Выйти к полям низкого солнца',28,-36,['archive_truth'])],
    npcs:[npc('severin_archive','Северин',10,-10,15,'severin_first',{shop:['ether_drop','revival_salt','margin_coat','bell_charm'],variants:[{requiresFlags:['archive_truth'],dialogue:'severin_after'},{requiresFlags:['archive_admitted','archive_catalogue','archive_index','archive_sentinel'],dialogue:'severin_truth'},{requiresFlags:['archive_admitted'],dialogue:'severin_wait'}]})],
    nodes:[
      inspect('archive_catalogue_node','Книга первоначальных согласий',-18,-4,'archive_catalogue','archive_catalogue',{requiresFlags:['archive_admitted'],items:[loot('archive_page',2)]}),
      puzzle('archive_index_node','Поворотный каталог водосбора',11,4,'archive_index','Над столом: «Сначала событие. Затем свидетель. Лишь после — печать». Какая цепочка вернёт запрещённую запись?',[["Паводок — жители — добровольное согласие",true],["Печать — провинность — наказание",false],["Настоятельница — казна — урожай",false]],'Стеллажи расходятся. Вместо списка должников открывается книга отказов.',{requiresFlags:['archive_catalogue']}),
      inspect('archive_margin','Надпись между строк',-25,17,'archive_margin_found','archive_margin'),
      inspect('archive_erasure','Соскобленное имя переписчицы',20,-18,'archive_name_found','archive_erasure',{requiresFlags:['archive_margin_found']}),
      chest('archive_cache','Сейф переплётной мастерской',19,20,[loot('ether_drop',4),loot('revival_salt',2),loot('dawn_censer')]),
      camp('archive_camp','Печка в переплётной',-5,-18,'camp_archive')
    ],
    encounters:[
      encounter('enc17',-12,5,['paper_swarm','paper_swarm'],{level:6}),
      encounter('enc18',16,12,['ink_guard','ink_guard'],{level:7}),
      encounter('enc19',-18,-17,['hush_acolyte','ink_guard'],{level:7}),
      encounter('enc20',12,-27,['catalogue_warden','paper_swarm'],{required:true,boss:true,flagOnWin:'archive_sentinel',requiresFlags:['archive_index'],level:7})
    ]
  },
  {
    id:'sunfields',title:'Поля низкого солнца',biome:'grass',description:'Золотистые полосы жатвы расходятся от водяного колеса. Между ними тянутся красные сборные ленты и кривые межи.',radiusX:52,radiusZ:44,spawn:{x:-32,z:20},
    exits:[exit('sunfields_archive','archive','Тропа к старому архиву',-43,25),exit('sunfields_fortress','fortress','Подняться к крепости затвора',37,-27,['fortress_route'])],
    npcs:[npc('nara_fields','Нара',9,-7,9,'nara_fields_first',{shop:['healing_draught','ether_drop','revival_salt','travel_stew','hospice_cloak'],variants:[{requiresFlags:['field_witnesses'],dialogue:'nara_fields_after'},{requiresFlags:['field_harvest','field_bell'],dialogue:'nara_fields_witness'}]})],
    nodes:[
      puzzle('field_water_node','Шлюзы деревенского водовода',-18,-4,'field_water','Три канала: питьевой колодец, низкое поле и мельничный сброс. Над рукоятью: «Сначала людям, потом корням, избыток — колесу».',[["Колодец — поле — мельница",true],["Мельница — поле — колодец",false],["Закрыть все каналы ради крепостного рва",false]],'Чистая струя наполняет колодец; оставшаяся вода растекается по бороздам. Колесо медленно оживает.'),
      inspect('field_harvest_node','Полоса уцелевшего зерна',8,-6,'field_harvest','field_harvest',{requiresFlags:['field_water'],items:[loot('grain_sack')]}),
      inspect('field_route_node','Дорожная карта сборщиков',23,-16,'fortress_route','field_route',{requiresFlags:['field_witnesses']}),
      puzzle('field_granary','Разорванный полог амбара',-28,13,'granary_secured','Ветер загоняет искры к зерну. Есть мокрая мешковина, длинная верёвка и дырявый железный щит. Как защитить амбар?',[["Накрыть искры мокрой тканью и привязать полог",true],["Поднять щит над крышей как громоотвод",false],["Высыпать зерно на открытую дорогу",false]],'Искры гаснут. Из-под целого полога пахнет сухой соломой, а не дымом.'),
      chest('field_cache','Узелок бригады жнецов',22,12,[loot('travel_stew',3),loot('healing_draught',3)]),
      camp('field_camp','Костёр у неподвижного колеса',-7,-22,'camp_fields')
    ],
    encounters:[
      encounter('enc21',-24,3,['hollow_reaper','hollow_reaper'],{level:7}),
      encounter('enc22',10,17,['cinder_bird','cinder_bird','cinder_bird'],{level:8}),
      encounter('enc23',-16,-17,['tithe_guard','tithe_guard'],{level:8}),
      encounter('enc24',17,-24,['harvest_engine','hollow_reaper'],{required:true,boss:true,flagOnWin:'field_bell',requiresFlags:['field_harvest'],level:8})
    ]
  },
  {
    id:'fortress',title:'Крепость медного затвора',biome:'fortress',description:'Стены повторяют изгиб старой плотины. Крепостной двор держится на арках, а за воротами виден красный купол аббатства.',radiusX:44,radiusZ:48,spawn:{x:-25,z:25},
    exits:[exit('fortress_sunfields','sunfields','Спуститься к полям',-31,27),exit('fortress_abbey','abbey','Дорога к аббатству за водосбросом',28,-38,['warden_key'])],
    npcs:[npc('dagan_gate','Даган',13,-11,15,'dagan_gate',{variants:[{requiresFlags:['warden_key'],dialogue:'dagan_after'},{requiresFlags:['warden_defeated'],dialogue:'dagan_defeated'},{requiresFlags:['gate_terms'],dialogue:'dagan_wait'}]})],
    nodes:[
      puzzle('fortress_gate_node','Затвор трёх противовесов',5,-3,'fortress_gate','Три таблички: «Плотина держится общим весом». Указатели показывают: тяжёлая клеть, пустая клеть, русло. Как открыть проход, сохранив плотину?',[["Уравнять клети, закрыть русло, поднять пешеходную створку",true],["Освободить тяжёлую клеть и раскрыть всё русло",false],["Сбросить противовесы с цепей",false]],'Пешеходная створка поднимается. Вода остаётся за главным затвором; у Дагана больше нет довода об опасности для слободы.',{requiresFlags:['gate_terms']}),
      inspect('fortress_roster','Приказ о ночном сборе',-22,-9,'fortress_order_read','fortress_order'),
      inspect('fortress_wall','Имена в камне караулки',17,20,'fortress_names_read','fortress_names'),
      chest('fortress_armory','Оружейная свободной заставы',21,-12,[loot('oath_plate'),loot('ward_spear'),loot('revival_salt',3),loot('ether_drop',4)],{requiresFlags:['fortress_gate']}),
      camp('fortress_camp','Очаг забытой караулки',-10,-23,'camp_fortress')
    ],
    encounters:[
      encounter('enc25',-18,6,['tithe_guard','tithe_guard'],{level:8}),
      encounter('enc26',17,10,['fortress_archer','fortress_archer','tithe_guard'],{level:9}),
      encounter('enc27',-19,-17,['warden_hound','warden_hound'],{level:9}),
      encounter('enc28',8,-29,['dagan'],{required:true,boss:true,flagOnWin:'warden_defeated',requiresFlags:['fortress_gate'],level:9})
    ]
  },
  {
    id:'abbey',title:'Аббатство удержанного звона',biome:'abbey',description:'Изогнутые галереи сходятся к большому колоколу. В его стали слышен не гимн, а множество вдохов, которым не дали стать словами.',radiusX:46,radiusZ:55,spawn:{x:-25,z:30},
    exits:[exit('abbey_fortress','fortress','Вернуться на мост затвора',-31,33)],
    npcs:[npc('elda_abbey','Эльда',12,-12,18,'elda_first',{variants:[{requiresFlags:['act1_complete'],dialogue:'elda_epilogue'},{requiresFlags:['bell_silenced'],dialogue:'elda_final'},{requiresFlags:['abbess_heard'],dialogue:'elda_wait'}]})],
    nodes:[
      inspect('abbey_consent','Пустая кафедра согласия',18,23,'abbey_consent_read','abbey_consent'),
      inspect('abbey_clapper','Расколотый язык колокола',10,-35,'clapper_taken','abbey_clapper',{requiresFlags:['bell_silenced'],items:[loot('bell_clapper')]}),
      inspect('abbey_return','Открытая книга первого дня',-14,-27,'abbey_last_page','abbey_last_page',{requiresFlags:['bell_silenced']}),
      chest('abbey_hospice','Ларь старой лечебницы',22,2,[loot('travel_stew',3),loot('ether_drop',5),loot('revival_salt',3)]),
      camp('abbey_camp','Огонь перед залом колокола',-14,-12,'camp_abbey')
    ],
    encounters:[
      encounter('enc29',-18,24,['oath_knight','oath_knight'],{level:9}),
      encounter('enc30',14,14,['silent_choir','silent_choir','silent_choir'],{level:9}),
      encounter('enc31',-22,1,['iron_sentinel','silent_choir','oath_knight'],{level:10}),
      encounter('enc32',19,-14,['oathshade','oathshade','oathshade'],{level:10}),
      encounter('enc33',-9,-25,['mute_abbot'],{boss:true,flagOnWin:'mute_abbot_broken',level:10}),
      encounter('enc34',8,-40,['bellkeeper'],{required:true,boss:true,flagOnWin:'bell_silenced',requiresFlags:['abbess_heard'],level:10})
    ]
  }
];

const quest=(id,title,description,areaId,requiresFlags,completeFlags,xp,gold,items=[],optional=false)=>({id,title,description,areaId,requiresFlags,completeFlags,rewards:{xp,gold,items},optional});
export const QUESTS = [
  quest('main01','После Судьи','Поговорите с Ионой у последней печати. Она видела, что печати продолжают выполнять приказ Судьи.', 'monastery',[],['prologue_heard'],15,0),
  quest('main02','Второй голос','Позовите Иону с собой: печати придётся понять, а не только разбить.', 'monastery',['prologue_heard'],['iona_joined'],20,10),
  quest('main03','Книга без должников','Осмотрите книгу у восточной галереи. Вынесите подлинный лист, сохранив имена.', 'monastery',['iona_joined'],['monastery_evidence'],30,10),
  quest('main04','Дорога к живым','Одолейте стража у северного выхода. Его удерживает старая команда Судьи.', 'monastery',['monastery_evidence'],['road_open'],45,25),
  quest('main05','Слобода помнит не всё','Выслушайте Вельду у общего колодца.', 'village',['road_open'],['village_heard'],25,10),
  quest('main06','Рыцарь без заставы','Поговорите с Раданом у дороги и предложите ему место в отряде.', 'village',['village_heard'],['radan_joined'],30,15),
  quest('main07','Исправить знак','Попросите Орина починить знак трёх печатей по найденному листу.', 'village',['radan_joined'],['seal_repaired'],30,10),
  quest('main08','Не приказ, а поручение','Вернитесь к Вельде после ремонта знака. Примите решение деревенского круга.', 'village',['seal_repaired','village_heard'],['council_mandate'],40,35,[loot('healing_draught',2)]),
  quest('main09','Руки без печати','Найдите Лею у лент на лесной тропе. Пригласите лекарку в дорогу.', 'briarwood',['council_mandate'],['leia_joined'],35,10),
  quest('main10','Золотая смола','Осмотрите старый водовод с Леей. Смола покажет, куда уходит монастырский ток.', 'briarwood',['leia_joined'],['forest_resin'],35,15),
  quest('main11','Железные корни','Одолейте хранителя, вросшего в лесной водовод.', 'briarwood',['forest_resin'],['forest_guardian'],60,35),
  quest('main12','Тропа Мирель','Покажите Мирель смолу и след хранителя. Она откроет спуск к восьмой смене.', 'briarwood',['forest_resin','forest_guardian'],['forest_pass'],40,20),
  quest('main13','Восьмая смена','Прочтите жетонную доску у входа в каменоломню.', 'quarry',['forest_pass'],['quarry_tokens'],35,15),
  quest('main14','Человек в клети','Разбейте строй надсмотрщика и освободите путь к Лио.', 'quarry',['quarry_tokens'],['quarry_rescue'],65,35),
  quest('main15','Вес, которого нет','Расспросите Терена о недостающем весе и о старом паводке.', 'quarry',['quarry_rescue'],['quarry_testimony'],45,15),
  quest('main16','Спуск без жертв','Запустите подъёмник в правильном порядке. Не отпускайте тормоз раньше противовеса.', 'quarry',['quarry_testimony'],['quarry_lift'],50,25),
  quest('main17','Цена переправы','Договоритесь с Гердом. Ему нужен безопасный путь, а не монета с чужим гербом.', 'fen',['quarry_lift'],['ferry_terms'],40,10),
  quest('main18','Берег, течение, дом','Восстановите три путевые чаши на переправе.', 'fen',['ferry_terms'],['fen_beacons'],50,20),
  quest('main19','Безымянный пассажир','Остановите эхо у дальней пристани и освободите удержанный голос.', 'fen',['fen_beacons'],['fen_witness'],75,40),
  quest('main20','На другой берег','Скажите Герду, что огни горят, а переправа свободна.', 'fen',['fen_witness'],['fen_crossing'],45,20),
  quest('main21','Право читать','Войдите в архив и договоритесь с Северином о доступе к подлинникам.', 'archive',['fen_crossing'],['archive_admitted'],45,15),
  quest('main22','Первое согласие','Найдите первоначальную книгу: с неё началось удержание звона.', 'archive',['archive_admitted'],['archive_catalogue'],50,20),
  quest('main23','Событие раньше печати','Поверните каталог так, чтобы запись вела от события к свидетелю.', 'archive',['archive_catalogue'],['archive_index'],55,25),
  quest('main24','Закон с вырванной строкой','Одолейте хранителя пустой графы и обсудите найденное с Северином.', 'archive',['archive_index'],['archive_truth'],90,45,[loot('witness_register')]),
  quest('main25','Сначала людям','Откройте водовод в полях: питьевая вода, корни, затем мельница.', 'sunfields',['archive_truth'],['field_water'],55,20),
  quest('main26','Сноп, который останется','Соберите спасённое зерно с политой полосы.', 'sunfields',['field_water'],['field_harvest'],50,20),
  quest('main27','Живые свидетельства','Остановите сборщик снопов и передайте Наре книгу свидетелей.', 'sunfields',['field_harvest'],['field_witnesses'],90,40),
  quest('main28','Кто открывает ворота','Осмотрите карту сборщиков. Найдите пешеходный проход к затвору.', 'sunfields',['field_witnesses'],['fortress_route'],50,25),
  quest('main29','Комендант плотины','Выслушайте Дагана у ворот. Узнайте, чего он боится больше мятежа.', 'fortress',['fortress_route'],['gate_terms'],55,20),
  quest('main30','Общий вес','Откройте пешеходную створку, сохранив главный водяной затвор.', 'fortress',['gate_terms'],['fortress_gate'],65,25),
  quest('main31','Страж старой ошибки','Победите Дагана. Спор о безопасности больше не решится приказом.', 'fortress',['fortress_gate'],['warden_defeated'],110,55),
  quest('main32','Ключ без присяги','Поговорите с поверженным комендантом и получите ключ к аббатству.', 'fortress',['warden_defeated'],['warden_key'],65,30,[loot('warden_key')]),
  quest('main33','Настоятельница и долг','Выслушайте Эльду перед залом большого колокола.', 'abbey',['warden_key'],['abbess_heard'],65,20),
  quest('main34','Прервать удержание','Одолейте Соборного звонаря. Его последняя команда держит чужие голоса в стали.', 'abbey',['abbess_heard'],['bell_silenced'],160,80),
  quest('main35','У кого останется голос','Вернитесь к Эльде и решите судьбу колокола. Выбор определит итог первого акта.', 'abbey',['bell_silenced'],['act1_complete'],180,100,[loot('bell_charm')]),
  quest('side01','Неотданное письмо','Вельда ждёт письмо из монастыря. Найдите его у каменной ладони и решите, кому доверить последние слова.', 'village',['letter_quest_started'],['letter_quest_done'],70,35,[loot('ash_locket')],true),
  quest('side02','Честная мера','Орин хочет вернуть артели недоплаченный вес. Принесите весовую книгу из каменоломни.', 'village',['accounts_quest_started'],['accounts_quest_done'],85,65,[loot('ward_spear')],true),
  quest('side03','След без капкана','Мирель просит снять петли тихо. Вернитесь к ней, когда звериная тропа станет безопасной.', 'briarwood',['traps_quest_started'],['traps_quest_done'],75,35,[loot('hunter_pin')],true),
  quest('side04','Фонарь без имени','Терен хочет вернуть старый фонарь в память о восьмой смене. Разбейте гул вагонетки и осмотрите её.', 'quarry',['lantern_quest_started'],['lantern_quest_done'],95,45,[loot('bell_charm')],true),
  quest('side05','Три чашки лекарства','Соберите серебряные болотницы на тихом берегу топей. Отнесите цветы Наре в слободу или к её лечебнице на полях.', 'village',['lilies_quest_started'],['lilies_quest_done'],85,35,[loot('revival_salt',3),loot('ether_drop',2)],true),
  quest('side06','Последний пассажир','На скамье переправы осталась записка. Помогите Герду назвать последнего пассажира вслух.', 'fen',['passenger_quest_started'],['passenger_quest_done'],85,45,[loot('reed_staff')],true),
  quest('side07','Ошибка на полях','Верните имя переписчице, оставившей правду на полях. Найдите помету, затем соскобленную запись и поговорите с Северином.', 'archive',['name_quest_started'],['name_quest_done'],100,40,[loot('margin_coat')],true),
  quest('side08','Хлеб на завтра','Нара просит защитить амбар от искр. Решите, кому доверить спасённый запас.', 'sunfields',['granary_quest_started'],['granary_quest_done'],95,55,[loot('hospice_cloak')],true)
];

const dialogue=(id,npcId,title,lines,choices)=>({id,npcId,title,lines:lines.map(([speaker,text])=>({speaker,text})),choices});
const choice=(id,text,setFlags={},extra={})=>({id,text,setFlags,...extra});

export const DIALOGUES = {
  iona_wake:dialogue('iona_wake','iona_monastery','Иона у последней печати',[
    ['Иона','Не вставай резко. Судья повержен, а печати ещё выполняют его приказ. Я Иона. Меня позвали расшифровать знаки, и я осталась здесь, когда начался бой.'],
    ['Алар','Что печати делают с людьми?'],
    ['Иона','В монастыре обещали снимать страх после паводка. Теперь сборщики берут записи у людей без спроса. В книге у обрушенного нефа я видела имена жителей слободы. Там можно узнать, кто получает их записи.'],
    ['Алар','А дорога в слободу открыта?'],
    ['Иона','Пока нет. Страж у реликвария слушается печати. Найдём книгу, остановим стража и спросим жителей, что они помнят.']
  ],[
    choice('ask','Что случилось с моей памятью?',{prologue_heard:true},{next:'iona_memory'}),
    choice('join','Возьму Иону в отряд и найду книгу.',{prologue_heard:true,iona_joined:true},{recruit:'iona',next:'iona_join'})
  ]),
  iona_memory:dialogue('iona_memory','iona_monastery','След в памяти',[
    ['Иона','Колокол может снять страх вместе с воспоминанием. Сначала людям давали выбрать, что оставить на хранение. Теперь печать исполняет старый приказ, даже если человек просит вернуть память.'],
    ['Алар','Отсюда и провалы в моей памяти?'],
    ['Иона','Пока не знаю. На твоём знаке тот же узор, что на книге. Дай мне сверить их. Я умею читать печати и могу пойти с тобой.']
  ],[choice('join','Идём вместе. Ты прочтёшь печати.',{iona_joined:true},{recruit:'iona',next:'iona_join'})]),
  iona_join:dialogue('iona_join','iona_monastery','Двое на дороге',[
    ['Иона','Договоримся. Если я скажу «любопытно», дай сначала прочесть надпись. Очень любопытные вещи лучше трогать жезлом.'],
    ['Алар','Он годится для боя?'],
    ['Иона','И для боя, и для измерений. Прибережём эфир для стража у реликвария. Сначала книга у обрушенного нефа.']
  ],[choice('go','К книге у обрушенного нефа.')]),
  iona_after_join:dialogue('iona_after_join','iona_monastery','То, что можно унести',[
    ['Иона','Инструменты при мне. Книга у обрушенного нефа, а страж ждёт во дворе реликвария. За ним дорога в слободу.'],
    ['Алар','Ты уверена, что готова?'],
    ['Иона','Уверена, что могу читать. Остальное проверим, как только выйдем на воздух.']
  ],[choice('go','Продолжим путь.')]),
  monastery_ledger:dialogue('monastery_ledger','iona_monastery','Книга трёх печатей',[
    ['Иона','Это книга трёх печатей. Возле каждого имени были согласие и право забрать отданную память. Кто-то закрыл графу возврата золотой полосой.'],
    ['Алар','Кому отдавали записи?'],
    ['Иона','На листах печать аббатства. Восьмая смена каменоломни числится согласной целиком. Вместо подписей здесь двенадцать отпечатков рабочих жетонов. Заберём исходный лист, чтобы показать людям.'],
    ['Алар','Сначала найдём тех, чьи имена записали.'],
    ['Иона','Начнём со слободы. Как вынесем лист во двор реликвария, печать пропустит нас к стражу. После боя откроется арка.']
  ],[choice('take','Взять исходный лист для Вельды.')]),
  letter_found:dialogue('letter_found','iona_monastery','Три сгиба',[
    ['Алар','Под каменной ладонью конверт. На нём написано «Вельде».'],
    ['Иона','Печать цела. Кто-то хотел доставить письмо в слободу и спрятал его здесь.'],
    ['Алар','Вскрывать будем?'],
    ['Иона','Давай отнесём Вельде. Она сама решит, кому прочесть письмо.']
  ],[choice('keep','Взять запечатанное письмо.')]),
  sun_altar:dialogue('sun_altar','iona_monastery','Старая формула',[
    ['Иона','На основании три слова. Рассвет пробуждает, уголь сохраняет, солнце возвращает. На новом ободе последнее заменили на «удерживает».'],
    ['Алар','При открытии ворот сработали все три печати.'],
    ['Иона','По новой надписи солнце держит всё, что приняли первые две. Видимо, так оно и удерживает чужие записи.'],
    ['Алар','Где узнать, что у кого взяли?'],
    ['Иона','В книге у обрушенного нефа. Портить печать до проверки опасно. Вдруг вместе с приказом исчезнет сама запись.']
  ],[choice('leave','Запомнить исходную формулу.')]),
  camp_monastery:dialogue('camp_monastery','iona_monastery','Тепло после боя',[
    ['Иона','Камень ещё тёплый. Можно посидеть и восстановить силы.'],
    ['Алар','Тебя трясёт.'],
    ['Иона','Да. Дай мне минуту. За обрушенным нефом двор реликвария. Ключ к приказу стража ищем в книге у нефа.']
  ],[choice('rest','Согреться и продолжить.')]),

  velda_arrival:dialogue('velda_arrival','velda_village','Гость с монастырской дороги',[
    ['Вельда','Клинок опусти, пожалуйста. У колодца дети. Я Вельда, староста. Вы с монастырской дороги?'],
    ['Алар','Судья повержен. В монастырской книге есть имена жителей вашей слободы.'],
    ['Вельда','За последний месяц сборщики приходили дважды. После них сосед забыл песню жены. Девочка каждый день ждёт кого-то у дороги и сама уже не знает кого. Обоих записали так, будто они согласились.'],
    ['Иона','С кем здесь можно поговорить об аббатстве?'],
    ['Вельда','Радан у восточной дороги знает заставу. Орин в кузнице чинит знаки. Нара лечит тех, у кого после сбора болит голова. Начните с Радана.']
  ],[
    choice('listen','Сначала выслушаем тех, кто пострадал.',{village_heard:true,approach_listen:true},{next:'velda_wait'}),
    choice('promise','Найдём и остановим тех, кто приказал брать записи.',{village_heard:true,approach_oath:true},{next:'velda_wait'})
  ]),
  velda_wait:dialogue('velda_wait','velda_village','Круг у колодца',[
    ['Вельда','Чтобы круг доверил вам дело, нужен местный проводник и исправный знак. Радан ждёт у восточной дороги. Кузнец Орин у горна.'],
    ['Алар','Слышал, ты ждёшь вестей из монастыря.'],
    ['Вельда','Жду письмо от брата. Оно могло остаться там. Если захотите поискать, расскажу, где он прятал вещи.']
  ],[
    choice('letter','Расскажи о письме.',{letter_quest_started:true},{next:'velda_letter_offer'}),
    choice('deliver','Письмо здесь. Оно запечатано.',{}, {requiresFlags:['letter_found'],forbidFlags:['letter_quest_done'],next:'velda_letter_return'}),
    choice('leave','Найду Радана и Орина.')
  ]),
  velda_council:dialogue('velda_council','velda_village','Поручение слободы',[
    ['Вельда','Теперь есть проводник и знак. По первому договору люди сами просили колокол снять страх после паводка. Аббатство потом назвало помощь долгом и перестало возвращать записи.'],
    ['Радан','Знак откроет старый водовод. Он идёт через лес к каменоломне, дальше к переправе. За топями найдём архив с договором.'],
    ['Вельда','Круг поручает вам найти первый договор и поговорить со свидетелями. Некоторые боятся, что сборщики вернутся за ними. Решите, кому нужна помощь в первую очередь.']
  ],[
    choice('witness','Сначала собрать доказательства для открытого слушания.',{council_mandate:true,mandate_public:true},{gold:15,next:'velda_depart'}),
    choice('shelter','Сначала защитить тех, кто готов дать показания.',{council_mandate:true,mandate_shelter:true},{items:[loot('revival_salt')],next:'velda_depart'})
  ]),
  velda_depart:dialogue('velda_depart','velda_village','Дорога за вереском',[
    ['Вельда','Лекарка Лея уже в смоляном лесу. Ищите её у белых лент. Она знает, где водовод выходит на поверхность.'],
    ['Алар','Вернёмся с доказательствами.'],
    ['Вельда','Возьмите припасы. И спросите каждого, можно ли рассказывать его историю. Тогда люди поймут, зачем вы пришли.']
  ],[choice('go','В путь, к смоляному лесу.')]),
  velda_council_after:dialogue('velda_council_after','velda_village','У колодца всё ещё ждут',[
    ['Вельда','Круг ждёт вашего возвращения. Если вам ещё нужна Лея, ищите белые ленты в лесу.'],
    ['Алар','Над старым письмом ещё подумаем.'],
    ['Вельда','Можем поговорить о нём отдельно. Остальные дела подождут у колодца.']
  ],[
    choice('offer','О письме из монастыря.',{letter_quest_started:true},{next:'velda_letter_offer'}),
    choice('deliver','Я принёс запечатанное письмо.',{}, {requiresFlags:['letter_found'],forbidFlags:['letter_quest_done'],next:'velda_letter_return'}),
    choice('go','Мы продолжаем путь.')
  ]),
  velda_letter_offer:dialogue('velda_letter_offer','velda_village','Неотданное письмо',[
    ['Вельда','Брат ходил в монастырь после паводка. Если хотел оставить мне записку, прятал её под каменной ладонью в галерее.'],
    ['Алар','У письма был конверт?'],
    ['Вельда','Да, со сгибами и моим именем. Если найдёте, отдайте мне целиком. Я решу, хочу ли его читать при людях.']
  ],[
    choice('return','Письмо уже со мной.',{}, {requiresFlags:['letter_found'],forbidFlags:['letter_quest_done'],next:'velda_letter_return'}),
    choice('seek','Поищу у каменной ладони.',{letter_quest_started:true})
  ]),
  velda_letter_return:dialogue('velda_letter_return','velda_village','Слова брата',[
    ['Вельда','Печать цела. Брат пишет, что согласился отдать страх воды и попросил сохранить память о погибших. Сборщик остановил его на полуслове.'],
    ['Иона','Письмо поможет доказать, о чём именно люди соглашались.'],
    ['Вельда','Я хочу сохранить оригинал. Можно попросить меня прочесть нужную строчку соседям или пока оставить письмо дома. Как лучше?']
  ],[
    choice('private','Оставить письмо Вельде. Круг услышит его с её разрешения.',{letter_quest_started:true,letter_quest_done:true,letter_private:true},{next:'velda_letter_private'}),
    choice('public','Попросить Вельду прочесть нужную строку у колодца.',{letter_quest_started:true,letter_quest_done:true,letter_public:true},{gold:20,next:'velda_letter_public'})
  ]),
  velda_letter_private:dialogue('velda_letter_private','velda_village','Право на закрытую дверь',[
    ['Вельда','Положу письмо дома. Если захочу поделиться, сама принесу копию.'],
    ['Алар','Когда будешь готова, мы выслушаем.'],
    ['Вельда','Тогда можно спокойно перечитать. Спасибо, что донесли.']
  ],[choice('go','Спасибо за доверие.')]),
  velda_letter_public:dialogue('velda_letter_public','velda_village','Голос на площади',[
    ['Вельда','Прочту при соседях ту строку, где брат просил вернуть память. Остальное останется у меня.'],
    ['Радан','Я соберу круг у колодца и скажу, о чём встреча.'],
    ['Вельда','Хорошо. Если станет трудно читать, попрошу тебя подождать.']
  ],[choice('go','Его имя останется в книге.')]),
  orin_forge:dialogue('orin_forge','orin_village','Сталь не врёт за хозяина',[
    ['Орин','Знак после монастыря? Положите на стол. Дайте лист, по которому сверить узор.'],
    ['Иона','Нам нужно открыть доступ к старому водоводу. Вот запись из монастырской книги.'],
    ['Орин','Вижу лишнюю перемычку. Я сам выплавлял такие для сборщиков. Если вырезать её, водовод узнает старый знак. Платы за это не возьму.']
  ],[
    choice('repair','Исправь знак по подлинному листу.',{seal_repaired:true},{requiresFlags:['monastery_evidence'],next:'orin_repair'}),
    choice('accounts','Расскажи о недоплате рабочим.',{accounts_quest_started:true},{next:'orin_accounts_offer'}),
    choice('return','Я нашёл весовую книгу.',{}, {requiresFlags:['accounts_found'],forbidFlags:['accounts_quest_done'],next:'orin_accounts_return'}),
    choice('shop','Посмотрим припасы.')
  ]),
  orin_repair:dialogue('orin_repair','orin_village','Незамкнутый круг',[
    ['Орин','Готово. Знак снова с зазором, как на старом листе. Покажите его Вельде.'],
    ['Алар','Ты знал, зачем сборщикам перемычки?'],
    ['Орин','Я видел заказ и мог спросить. Теперь хочу поднять их весовую книгу. Когда окажетесь в каменоломне, могу рассказать, где её искать.']
  ],[choice('go','Сначала совет у колодца.')]),
  orin_accounts_offer:dialogue('orin_accounts_offer','orin_village','Честная мера',[
    ['Орин','Восьмая смена везла руду для знаков. По накладным всем заплатили. Один парень показал пустой кошелёк и сказал, что не помнит ни смену, ни расчёт.'],
    ['Алар','Чем поможет книга?'],
    ['Орин','Там настоящий вес, по нему пересчитаю оплату. Весовая будка на восточном уступе каменоломни. Принесите всю книгу.']
  ],[
    choice('return','Книга уже здесь.',{}, {requiresFlags:['accounts_found'],forbidFlags:['accounts_quest_done'],next:'orin_accounts_return'}),
    choice('go','Загляну в весовую будку.',{accounts_quest_started:true})
  ]),
  orin_accounts_return:dialogue('orin_accounts_return','orin_village','Долг кузницы',[
    ['Орин','Четыре меры руды, заплатили за две. Остальное списали за снятый страх. Вот откуда взялся долг перед семьями.'],
    ['Радан','Сборщики всё ещё хранят часть денег у себя.'],
    ['Орин','Пока их ищем, я могу выдать муку и свою долю платы. Можно объявить суммы всему двору с согласия семей или сначала разнести выплату по домам.']
  ],[
    choice('open','Объявить суммы, не раскрывая имён без согласия.',{accounts_quest_started:true,accounts_quest_done:true,accounts_public:true},{gold:30,next:'orin_accounts_end'}),
    choice('quiet','Сначала разнести муку и выплаты по домам.',{accounts_quest_started:true,accounts_quest_done:true,accounts_shelter:true},{items:[loot('travel_stew',2)],next:'orin_accounts_end'})
  ]),
  orin_accounts_end:dialogue('orin_accounts_end','orin_village','Новая мера',[
    ['Орин','Сделаем так. А это копьё возьмите в дорогу. Я выправил наконечник.'],
    ['Алар','А книга останется здесь?'],
    ['Орин','Да. Семьи смогут сверить свои строки и потребовать остаток. За копьё платить не нужно.']
  ],[choice('go','Вернём дорогу телегам.')]),
  radan_first:dialogue('radan_first','radan_village','Радан у восточной дороги',[
    ['Радан','Встал здесь, чтобы видеть восточную тропу. Копьё рядом по старой привычке. Иона, кто с тобой?'],
    ['Иона','Тот, кто остановил Судью. Ищем, кто велел собирать записи у людей.'],
    ['Алар','Вельда сказала, ты знаешь крепость. Пойдёшь с нами?'],
    ['Радан','Я служил у Дагана. В паводок он велел закрыть нижний проход, чтобы удержать воду. Я выполнил, а за проходом остались люди. Покажу дорогу. Когда придёт время объясняться, скажу, что сделал сам.']
  ],[
    choice('honest','Взять Радана и просить его свидетельствовать.',{radan_joined:true,radan_truth:true},{recruit:'radan',next:'radan_join'}),
    choice('mercy','Взять Радана и дать ему помочь у плотины.',{radan_joined:true,radan_mercy:true},{recruit:'radan',next:'radan_join'})
  ]),
  radan_join:dialogue('radan_join','radan_village','Место в строю',[
    ['Радан','Я прикрою с тыла. Когда предупрежу об ударе, держитесь рядом со щитом.'],
    ['Алар','Так и сделаем. Куда дальше?'],
    ['Радан','К Орину. Пусть сверит знак с монастырским листом. Потом покажем его Вельде, чтобы круг мог дать поручение.']
  ],[choice('go','Пойдём к кузнице.')]),
  radan_after:dialogue('radan_after','radan_village','Последний взгляд на дорогу',[
    ['Радан','Ремни проверил. Твой тоже подтянул, у пряжки разошлась нитка.'],
    ['Алар','Тебе трудно уходить из слободы?'],
    ['Радан','Здесь мой дом. Поэтому пойду. Пока мы готовимся, покажите Вельде знак, когда Орин закончит.']
  ],[choice('go','Совет ещё ждёт.')]),
  nara_village:dialogue('nara_village','nara_village','Лекарство и память',[
    ['Нара','Люди идут ко мне после сбора. Одна соседка просит лекарство от головной боли и всё время забывает, у кого дома её ребёнок.'],
    ['Иона','Можно им помочь, пока мы ищем записи?'],
    ['Нара','Из серебряных болотниц сделаю настой. Если будете у переправы, расскажу, где растут цветы.']
  ],[
    choice('quest','Соберём цветы для твоих больных.',{lilies_quest_started:true},{next:'nara_lilies_offer'}),
    choice('return','Болотницы найдены.',{}, {requiresFlags:['lilies_found'],forbidFlags:['lilies_quest_done'],next:'nara_lilies_return'}),
    choice('shop','Нужны дорожные лекарства.')
  ]),
  nara_lilies_offer:dialogue('nara_lilies_offer','nara_village','Три чашки лекарства',[
    ['Нара','Болотницы растут на тихом берегу топей. У цветка серебряные прожилки, а стебель гнётся. Мне нужны цветки для трёх чашек.'],
    ['Лея','Корни оставим в земле.'],
    ['Нара','Спасибо. Если я уже уйду с лекарствами к полям, принесите цветы туда.']
  ],[choice('go','Оставим корни в воде.',{lilies_quest_started:true})]),
  nara_lilies_return:dialogue('nara_lilies_return','nara_village','Ясный настой',[
    ['Нара','Хорошие цветы, даже лепестки не помялись. Поставлю настой сегодня.'],
    ['Алар','Что он может вернуть?'],
    ['Нара','Он поможет спать и сосредоточиться. За памятью всё равно придётся идти к тем, кто хранит катушки. Возьмите соль и эфир для дороги.']
  ],[choice('finish','Передать цветы лечебнице.',{lilies_quest_started:true,lilies_quest_done:true})]),
  village_memorial:dialogue('village_memorial','velda_village','Доска у колодца',[
    ['Алар','На доске таблички с именами. На нижней строке только дата.'],
    ['Радан','День паводка. Тут оставили место для тех, кого ещё ищут.'],
    ['Иона','Запомню дату. В архиве проверим, какие записи появились после неё.'],
    ['Радан','Только прежде спросим Вельду. Она знает, кого семьи готовы назвать.']
  ],[choice('read','Прочитать имена вслух.')]),
  camp_village:dialogue('camp_village','radan_village','Общий очаг',[
    ['Радан','Сядьте к огню. С востока сегодня сыро.'],
    ['Иона','В тепле чернила лучше идут. Перепишу печать, пока мы здесь.'],
    ['Алар','Орин сможет сверить копию?'],
    ['Радан','Если дадите оригинал. Он у горна, а Вельда ждёт у колодца.']
  ],[choice('rest','Подбросить полено и отдохнуть.')]),

  leia_first:dialogue('leia_first','leia_wood','Ленты на ветвях',[
    ['Лея','Идите по белым лентам. Под красными ветки могут упасть. Поможете подхватить сумку?'],
    ['Алар','Вельда сказала, ты ищешь смолу.'],
    ['Лея','Ищу у водовода. Печати гонят по трубе жар. Из-за него корни разрослись и схватили железо. Чтобы открыть дорогу, сначала надо увидеть, куда течёт жар.'],
    ['Иона','Нам нужен тот же водовод. Пойдёшь с нами?'],
    ['Лея','Я ушла из ордена. Там лечили только тех, у кого был нужный знак. Здесь такого правила нет?'],
    ['Алар','Лечим того, кому сейчас нужна помощь.'],
    ['Лея','Тогда пойду. Если кто устанет, скажите прежде, чем упадёте.']
  ],[
    choice('join','Взять Лею в отряд.',{leia_joined:true,leia_freecare:true},{recruit:'leia',next:'leia_join'})
  ]),
  leia_join:dialogue('leia_join','leia_wood','Место для четвёртого',[
    ['Лея','Могу перевязать рану, а если кто упадёт в бою, попробую вернуть дыхание. Держите соль под рукой.'],
    ['Радан','Привыкли в строю про раны молчать.'],
    ['Лея','А я привыкла замечать. Когда будет привал, посмотрю твою ногу. Пока идём к смоляной чаше водовода. Мирель у северного склона знает спуск к каменоломне.']
  ],[choice('go','К смоляной чаше.')]),
  leia_after:dialogue('leia_after','leia_wood','Белая лента',[
    ['Лея','Здесь повешу белую ленту. Пусть следующие знают, где можно остановиться.'],
    ['Алар','Ты знаешь, куда идёт труба?'],
    ['Лея','Возьмём смолу у чаши и проверим. Если хранитель снова схватит водовод, снимем его и спросим Мирель о спуске.']
  ],[choice('go','Продолжим вместе.')]),
  mirel_first:dialogue('mirel_first','mirel_wood','Лес не обязан молчать',[
    ['Мирель','Лея, твоя белая лента хорошо видна. Повесь следующую повыше. Лисица решила, что это подарок ей.'],
    ['Алар','Нужен спуск в каменоломню. Покажешь?'],
    ['Мирель','Как только корни отпустят трубопровод. Возьмите смолу из чаши и остановите хранителя. Тогда склон не будет трясти. А если зайдёте на западную тропу, помогите снять ловушки.']
  ],[
    choice('traps','Покажи, как снять петли.',{traps_quest_started:true},{next:'mirel_traps_offer'}),
    choice('return','Тропа свободна от петель.',{}, {requiresFlags:['traps_opened'],forbidFlags:['traps_quest_done'],next:'mirel_traps_return'}),
    choice('go','Добудем смолу и остановим хранителя.')
  ]),
  mirel_pass:dialogue('mirel_pass','mirel_wood','Смола и камень',[
    ['Мирель','Водовод больше не трясёт склон. Куда указала смола?'],
    ['Иона','К каменоломне. В трубе ещё идёт жар.'],
    ['Мирель','Тогда спускайтесь по правому краю. Белая жила укажет дорогу. Лио ушёл за жетоном отца и не вернулся к ужину. Если увидите, скажите, что я жду.'],
    ['Лея','Поищем мальчика. Как его узнать?'],
    ['Мирель','Он наверняка будет спорить, что не заблудился.']
  ],[
    choice('open','Покажи безопасный спуск.',{forest_pass:true},{next:'mirel_after'})
  ]),
  mirel_after:dialogue('mirel_after','mirel_wood','У развилки',[
    ['Мирель','Держите в виду камень с белой жилой. От него правая тропа ведёт к каменоломне.'],
    ['Радан','Понял. Обойдём левый край.'],
    ['Мирель','Если снимете петли на западной тропе, зайдите сказать. Лисица уже раз попалась. Второго раза ей хватит.']
  ],[
    choice('traps','Расскажи о петлях.',{traps_quest_started:true},{next:'mirel_traps_offer'}),
    choice('return','Петли сняты тихо.',{}, {requiresFlags:['traps_opened'],forbidFlags:['traps_quest_done'],next:'mirel_traps_return'}),
    choice('go','Спуститься к каменоломне.')
  ]),
  mirel_traps_offer:dialogue('mirel_traps_offer','mirel_wood','След без капкана',[
    ['Мирель','У капкана три верёвки. Одна затягивает петлю, другая звонит, третья держит ветку. Сначала поддержите ветку, затем перережьте петлю.'],
    ['Иона','Зачем здесь колокольчик?'],
    ['Мирель','Он зовёт охотников, если потянуть верёвку. Петли стоят на западной тропе. Оставьте их пустыми и вернитесь.']
  ],[choice('go','Пустой ловушки будет достаточно.',{traps_quest_started:true})]),
  mirel_traps_return:dialogue('mirel_traps_return','mirel_wood','Пустая петля',[
    ['Мирель','Лисица снова ходит к ручью. Вот мой знак. Он пригодится тем, кто встретит вас на лесной тропе.'],
    ['Алар','Что сделаешь, если охотники вернутся?'],
    ['Мирель','Покажу им пустые петли и поговорю прежде, чем они поставят новые. Спасибо за помощь.']
  ],[choice('finish','Принять знак свободной тропы.',{traps_quest_started:true,traps_quest_done:true})]),
  forest_resin:dialogue('forest_resin','leia_wood','Смола водовода',[
    ['Лея','Возьмите смолу, которая уже стекла в чашу. Кору задевать незачем.'],
    ['Иона','Нить смолы тянется к северному склону. Туда и уходит жар из трубы.'],
    ['Лея','Хранитель схватил водовод у корней. Остановим его. Мирель сможет открыть спуск, когда склон утихнет.']
  ],[choice('take','Собрать вытекшую смолу.')]),
  forest_slate:dialogue('forest_slate','iona_monastery','Карта под корой',[
    ['Иона','На плите видно, куда ведёт водовод. После леса труба проходит под рельсами каменоломни.'],
    ['Радан','Дальше по трубе можно выйти к переправе, если работает подъёмник.'],
    ['Иона','Запомню. Под землёй жар не видно, но теперь знаем, где искать.']
  ],[choice('read','Запомнить путь водовода.')]),
  camp_forest:dialogue('camp_forest','leia_wood','Четыре миски',[
    ['Лея','Дайте ногам отдохнуть. Четыре миски, на всех хватит.'],
    ['Радан','Дежурю первым. У трубы шевелятся корни.'],
    ['Иона','Они тянутся к жару. Проверю чашу водовода, когда будем готовы.'],
    ['Лея','Я посмотрю твою ногу, пока сидишь.'],
    ['Алар','После привала держимся белых лент?'],
    ['Лея','Да. Если услышите треск, остановитесь. Иногда ветка предупреждает раньше, чем человек.']
  ],[choice('rest','Разделить ужин.')]),

  lio_trapped:dialogue('lio_trapped','lio_quarry','Голос из клети',[
    ['Лио','Я в грузовой клети. Трос цел, но внизу ходит надсмотрщик. Не спускаюсь, пока он там.'],
    ['Радан','Что ты здесь искал?'],
    ['Лио','Жетон отца. Те, что сдали после смены, висят на доске у рельсов. Она командует надсмотрщиком. Прочтите доску, потом снимите караул. Трос не заденьте, пожалуйста.']
  ],[choice('go','Мы освободим проход к клети.')]),
  lio_rescued:dialogue('lio_rescued','lio_quarry','Жетон вместо подписи',[
    ['Лио','Я спустился. Ноги ещё трясутся. Если увидите Мирель, скажите, что домой иду.'],
    ['Алар','Нашёл жетон отца?'],
    ['Лио','Там двенадцать одинаковых восьмёрок, ни одного имени. Отец после смены забыл нашу песню. Я думал, его жетон поможет вспомнить.'],
    ['Лея','Покажи жетон и спроси, хочет ли он поговорить о смене.'],
    ['Лио','Попробую. На сухом уступе найдите Терена. Он работал с отцом и знает, кто велел сдавать жетоны вместо подписей.']
  ],[choice('go','Возвращайся по белой жиле.')]),
  teren_first:dialogue('teren_first','teren_quarry','Память каменоломни',[
    ['Терен','Я Терен, мерил руду восьмой смены. Слышал, что Лио полез к грузовой клети. Если выбрался, дайте мне знать.'],
    ['Алар','Ты помнишь, откуда взялся колокол?'],
    ['Терен','В паводок Эльда помогала тем, кто ночами слышал воду. Потом казначей стал брать память в уплату за защиту. Когда вместо подписей начали принимать жетоны, я ушёл со смены.'],
    ['Радан','Где теперь искать первый договор?'],
    ['Терен','В архиве за топями. Я дам своё свидетельство, когда буду знать, что с Лио всё в порядке.']
  ],[
    choice('testify','Лио цел. Теперь дай показания об учёте смены.',{quarry_testimony:true},{requiresFlags:['quarry_rescue'],next:'teren_testimony'}),
    choice('lantern','Зачем тебе фонарь восьмой смены?',{lantern_quest_started:true},{next:'teren_lantern_offer'}),
    choice('go','Сначала освободим Лио.')
  ]),
  teren_testimony:dialogue('teren_testimony','teren_quarry','Показания Терена',[
    ['Терен','Запиши, Иона. Я видел, как согласие рабочих заменили жетонами. Один раз возразил. Потом три года подписывал ведомости.'],
    ['Иона','Записала и имя, и срок.'],
    ['Терен','До переправы спуститесь на подъёмнике. На табличке указан порядок. Закрепите пустую клеть, уравновесьте груз и отпустите тормоз. Внизу найдите Герда.']
  ],[choice('go','Взять показания и проверить подъёмник.')]),
  teren_after:dialogue('teren_after','teren_quarry','Не только старый грех',[
    ['Терен','Мою запись положите рядом с ведомостью. Пусть будет видно, какие строки я подписал.'],
    ['Лея','Отнесём её туда, где смогут сверить подписи.'],
    ['Терен','Передайте Герду, что нижней клетью снова можно пользоваться. А если останетесь, спрошу вас о фонаре восьмой смены.']
  ],[
    choice('offer','Расскажи о фонаре.',{lantern_quest_started:true},{next:'teren_lantern_offer'}),
    choice('return','Фонарь больше не держит чужой гул.',{}, {requiresFlags:['lantern_found'],forbidFlags:['lantern_quest_done'],next:'teren_lantern_return'}),
    choice('go','К переправе Герда.')
  ]),
  teren_lantern_offer:dialogue('teren_lantern_offer','teren_quarry','Фонарь без имени',[
    ['Терен','В западной вагонетке остался наш фонарь. Раньше его зажигал последний рабочий, когда все выходили из забоя.'],
    ['Алар','Хочешь забрать его?'],
    ['Терен','Хочу зажечь у колодца, когда Лио придёт домой. Снимите эхо у вагонетки. Стекло треснуло, заверните его в ткань.']
  ],[choice('go','Осмотрим западную вагонетку.',{lantern_quest_started:true})]),
  teren_lantern_return:dialogue('teren_lantern_return','teren_quarry','Огонь для возвращения',[
    ['Терен','Ручка ещё держит. Починю стекло и отнесу фонарь к колодцу.'],
    ['Радан','Кому доверишь его зажечь?'],
    ['Терен','Лио, если захочет. Вам отдам малый язык колокола. И передайте Эльде, что я помню, кому она помогла в паводок и у кого потом перестала спрашивать разрешения.']
  ],[choice('finish','Передадим обе части.',{lantern_quest_started:true,lantern_quest_done:true})]),
  quarry_tokens:dialogue('quarry_tokens','lio_quarry','Двенадцать восьмёрок',[
    ['Иона','Двенадцать крючков и двенадцать восьмёрок. Раньше конец смены отмечали перекличкой. Теперь достаточно сдать жетон.'],
    ['Радан','Если доска считает знак вместо человека, рабочий может остаться внизу, а запись уже закрыта.'],
    ['Алар','Под крайним крючком свежая царапина. Лио искал здесь жетон.'],
    ['Лея','Возьмём сломанный знак. С ним нас пропустит заслон у клети. Надсмотрщика придётся остановить отдельно.']
  ],[choice('take','Прочесть имена и взять сломанный жетон.')]),
  quarry_accounts:dialogue('quarry_accounts','orin_village','Весовая будка',[
    ['Иона','Весовая книга цела. Здесь вес каждой тележки и плата рабочим.'],
    ['Алар','За четыре меры выдавали две. Куда записывали остальное?'],
    ['Радан','В графу за работу колокола. Сумма растёт после каждой смены.'],
    ['Лея','Завернём книгу и отнесём Орину. Он сможет сверить, сколько недодали каждой семье.']
  ],[choice('take','Сохранить весовую книгу целиком.')]),
  quarry_lantern:dialogue('quarry_lantern','teren_quarry','Треснувшее стекло',[
    ['Алар','Эхо стихло. Сниму фонарь с вагонетки.'],
    ['Лея','Возьми ткань, стекло треснуло.'],
    ['Радан','Его зажигал тот, кто выходил из забоя последним.'],
    ['Иона','Терен ждёт на уступе. Он решит, где теперь оставить фонарь.']
  ],[choice('take','Унести фонарь к Терену.')]),
  camp_quarry:dialogue('camp_quarry','radan_village','Под каменным навесом',[
    ['Радан','Я знал людей восьмой смены. Число помню лучше имён.'],
    ['Лея','Отдохни. Ремень опять натёр тебе ногу, дай перевяжу.'],
    ['Радан','В крепости мы тоже считали строй. В паводок этого оказалось мало.'],
    ['Алар','Поговорим с теми, кто ещё может назвать имена.'],
    ['Иона','Начнём с Терена. Когда будем у подъёмника, прочтём табличку. Эту клеть лучше запускать с открытыми глазами.']
  ],[choice('rest','Дать лекарке закончить перевязку.')]),

  gerd_first:dialogue('gerd_first','gerd_fen','Перевозчик считает берега',[
    ['Герд','Копьё потом положите на дно лодки. А сейчас не садитесь. Три путевые чаши погасли.'],
    ['Алар','Чем можно помочь?'],
    ['Герд','Зажгите чаши на мостках и уберите эхо у дальней пристани. Оно сбивает лодку с пути. В прошлый раз я грёб час и вернулся туда же.'],
    ['Иона','Вернём огни. Когда эхо стихнет, дадите пройти к архиву?'],
    ['Герд','Отвезу сам. На дальней насыпи найдёте Северина. Он хранит старые договоры.']
  ],[choice('agree','Зажечь чаши и освободить пристань.',{ferry_terms:true},{next:'gerd_wait'})]),
  gerd_wait:dialogue('gerd_wait','gerd_fen','Три огня до отплытия',[
    ['Герд','Камень отмечает берег, камыш показывает течение, причал ведёт домой. Чаши на мостках. Порядок прочтёте на пристани.'],
    ['Алар','А эхо у дальнего берега было человеком?'],
    ['Герд','Человек оставил на скамье записку. Потом на воде стал слышен голос. За камышовыми мостками есть остров со скамьёй. Если найдёте бумагу, принесите мне.']
  ],[
    choice('passenger','Попробуем узнать имя пассажира.',{passenger_quest_started:true},{next:'gerd_passenger_offer'}),
    choice('return','Мы прочли записку на скамье.',{}, {requiresFlags:['passenger_note_found'],forbidFlags:['passenger_quest_done'],next:'gerd_passenger_return'}),
    choice('go','Сначала зажжём чаши.')
  ]),
  gerd_crossing:dialogue('gerd_crossing','gerd_fen','Путь к архиву',[
    ['Герд','Огни снова стоят ровно. Эхо смолкло, к дальней пристани можно пройти.'],
    ['Алар','Значит, путь к архиву открыт?'],
    ['Герд','Да. У пристани есть катушка, если хотите выяснить, чей голос здесь застрял. В архиве Северин умеет проверять такие записи.'],
    ['Лея','Перевезёшь и тех, кто придёт следом?'],
    ['Герд','Теперь могу. Лодку отвяжу у насыпи.']
  ],[choice('cross','Открыть переправу к архиву.',{fen_crossing:true})]),
  gerd_after:dialogue('gerd_after','gerd_fen','Вода помнит направление',[
    ['Герд','Можете возвращаться тем же путём. Я заменил доски на причале.'],
    ['Алар','Узнал имя пассажира?'],
    ['Герд','Его записка осталась на скамье за камышовыми мостками. Принесите её, если будете у острова. Архив за дальней насыпью.']
  ],[
    choice('offer','Займёмся запиской пассажира.',{passenger_quest_started:true},{next:'gerd_passenger_offer'}),
    choice('return','В записке осталось имя.',{}, {requiresFlags:['passenger_note_found'],forbidFlags:['passenger_quest_done'],next:'gerd_passenger_return'}),
    choice('go','Спасибо за обе стороны переправы.')
  ]),
  gerd_passenger_offer:dialogue('gerd_passenger_offer','gerd_fen','Последний пассажир',[
    ['Герд','Пассажир принёс хлеб и плату за двоих. Сказал, второй сядет на обратном пути. После звона он так и не вышел к лодке.'],
    ['Радан','Можно проверить, оставил ли он имя?'],
    ['Герд','На острове за камышовыми мостками есть скамья. Там лежит его записка. Если имя сохранилось, скажите мне.']
  ],[choice('go','Проверим скамью под ивой.',{passenger_quest_started:true})]),
  gerd_passenger_return:dialogue('gerd_passenger_return','gerd_fen','Сава, мастер лодок',[
    ['Алар','Пассажира звали Сава. Он направлялся в архив за записью жены. Плату оставил на обратную дорогу для них обоих.'],
    ['Герд','Сава чинил мне лодку. Я всё пытался вспомнить его лицо, а вспомнил руки.'],
    ['Лея','Записка объясняет, куда он шёл. Семье можно передать её и рассказать то, что мы знаем.'],
    ['Герд','Отнесу. Он оставил жезл у причала. Возьмите в дорогу, а я решу с семьёй, когда поставить его имя у лодки.']
  ],[
    choice('name','Записать имя Савы на причале.',{passenger_quest_started:true,passenger_quest_done:true,passenger_public:true},{gold:15}),
    choice('home','Сначала отнести записку семье Савы.',{passenger_quest_started:true,passenger_quest_done:true,passenger_home:true},{items:[loot('healing_draught',2)]})
  ]),
  fen_lilies:dialogue('fen_lilies','nara_village','Корни остаются',[
    ['Лея','Вот болотница. Видите серебряные прожилки? Для настоя Наре хватит трёх цветков.'],
    ['Радан','Эти у края достану с мостков.'],
    ['Лея','Оставим корни в воде. Цветы заверну в мокрую ткань. Нару найдём в слободе или у полей, если лекарский обоз уже ушёл.']
  ],[choice('take','Собрать цветы, сохранив корни.')]),
  fen_passenger:dialogue('fen_passenger','gerd_fen','Записка под скамьёй',[
    ['Иона','Под доской записка. Сава, лодочный мастер, просит передать Мере, что пошёл в архив за её записью. Хлеб оставил ей дома.'],
    ['Алар','Теперь есть имя и место, куда он шёл.'],
    ['Лея','Скажем Герду именно это. В записке нет ничего о том, что случилось после отплытия.'],
    ['Радан','Бумага пережила дождь. Уберу её в сухой карман и отнесу к причалу.']
  ],[choice('keep','Сохранить записку и имя.')]),
  fen_voice:dialogue('fen_voice','iona_monastery','Катушка голоса',[
    ['Голос','Согласен отдать страх воды. Прошу оставить мне память о тех, кто остался под водой. Повторите последнюю просьбу, чтобы я понял, что вы её слышите.'],
    ['Иона','Катушка сохранила голос, как письмо сохраняет слова. Край заело, и просьба повторялась снова и снова.'],
    ['Алар','Согласие было только на страх. Просьбу оставить память оборвали.'],
    ['Иона','Запечатаю край. В архиве сверим просьбу с договором и узнаем, мог ли человек потребовать вернуть запись.']
  ],[choice('take','Унести катушку в архив.')]),
  camp_fen:dialogue('camp_fen','gerd_fen','Остров, который не уходит',[
    ['Лея','Снимите мокрые плащи. Земля здесь сухая.'],
    ['Иона','Герд держит лодку у берега, пока эхо сбивает путь.'],
    ['Радан','Если отплывёт первым, следующая лодка повторит его ошибку. В такой воде нужны огни.'],
    ['Алар','Действуем по порядку, как на подъёмнике.'],
    ['Иона','Чаши на мостках, эхо на дальней пристани. Когда обе беды уладим, Герд откроет путь к архиву.']
  ],[choice('rest','Просушить плащи у огня.')]),

  severin_first:dialogue('severin_first','severin_archive','Посетители без записи',[
    ['Северин','Посетители с переправы? Если Герд снова возит людей, отмечу путь в каталоге. Чего вы ищете в архиве?'],
    ['Иона','Первый договор о колоколе. На листе из монастыря спрятали графу возврата.'],
    ['Северин','Один экземпляр уцелел. Скажи, кому вы покажете имена. Однажды при мне вывесили список больных. После этого люди боялись выходить из дома.'],
    ['Алар','Покажем правку в договоре. Людям дадим прочесть собственные строки.'],
    ['Северин','Тогда открываю западный зал. Сначала прочтите подлинник, потом настройте каталог. Он найдёт книгу, где сохранились отказы.']
  ],[
    choice('read','Дай нам доступ к подлинникам.',{archive_admitted:true},{next:'severin_wait'})
  ]),
  severin_wait:dialogue('severin_wait','severin_archive','Порядок поиска',[
    ['Северин','Ищите книгу первоначальных согласий в западном зале, за сухим бассейном. Каталог дальше по наружному проходу. Начните с книги.'],
    ['Иона','Ты видел, как условия меняли?'],
    ['Северин','Видел и прятал копии. Переписчица проверяла их по строкам, пока её не убрали из описи. Если хотите узнать, что ей удалось спасти, спросите о пометах.']
  ],[
    choice('name','Расскажи об авторе помет.',{name_quest_started:true},{next:'severin_name_offer'}),
    choice('return','Мы нашли соскобленное имя.',{}, {requiresFlags:['archive_name_found'],forbidFlags:['name_quest_done'],next:'severin_name_return'}),
    choice('go','Найдём книгу и повернём каталог.')
  ]),
  severin_truth:dialogue('severin_truth','severin_archive','Первый договор о колоколе',[
    ['Северин','В первом договоре каждый мог забрать отданную память и позвать свидетеля по своему выбору. Вот строка, которую спрятали.'],
    ['Иона','Здесь её закрыли золотом. На следующем листе жетон уже считается подписью.'],
    ['Северин','Невозвращённые записи передавали плотине. Колокол гасил перепады воды, казна получала плату. Даган и Эльда одобряли работу. Из-за неё люди теряли память.'],
    ['Алар','Если остановить колокол, затвор выдержит?'],
    ['Северин','Камень держит воду. Без звона караул должен следить за уровнем вручную, пока укрепят затвор.'],
    ['Лея','Кто из жителей готов рассказать Дагану, что было?'],
    ['Северин','Нара лечит людей на полях. Возьмите пустую книгу. Пусть каждый сначала решит, хочет ли говорить, и выберет, что записать.']
  ],[
    choice('take','Взять книгу для показаний людей на полях.',{archive_truth:true},{next:'severin_after'})
  ]),
  severin_after:dialogue('severin_after','severin_archive','Неудобный оригинал',[
    ['Северин','Сделаю копии старого договора для слободы и артели. Подлинник оставлю в архиве, чтобы его могли сверить.'],
    ['Алар','Когда спросят, чья подпись на правке, придёшь сам?'],
    ['Северин','Приду и возьму список своих подписей. Отнесите книгу Наре через восточную галерею. На полях люди смогут начать запись.']
  ],[
    choice('offer','О переписчице и пометах.',{name_quest_started:true},{next:'severin_name_offer'}),
    choice('return','Её имя сохранилось под соскобом.',{}, {requiresFlags:['archive_name_found'],forbidFlags:['name_quest_done'],next:'severin_name_return'}),
    choice('go','Отнесём книгу в поля.')
  ]),
  severin_name_offer:dialogue('severin_name_offer','severin_archive','Ошибка на полях',[
    ['Северин','Переписчица ставила точки там, где согласие вписали без человека. По ним можно найти исходные строки.'],
    ['Иона','С какого листа начать?'],
    ['Северин','С пометы на западном столе. Она ведёт к записи на нижней полке восточного шкафа. Прочтите и вернитесь, если найдёте её имя.']
  ],[choice('go','Пойдём по её точкам.',{name_quest_started:true})]),
  severin_name_return:dialogue('severin_name_return','severin_archive','Мара, дочь переплётчика',[
    ['Иона','Её звали Мара. В выговоре написано, что она ошиблась на полях. Мы сверили подписи. Она прочла их верно.'],
    ['Северин','Мара учила меня писать разборчиво. А я поставил подпись под выговором и позволил вычеркнуть её.'],
    ['Лея','Её работу можно снова открыть читателям. Как лучше начать?'],
    ['Северин','Могу исправить запись в описи и подписать признание. Можем сперва собрать её сверки в отдельную книгу. Кафтан семьи возьмите с собой, он поможет в дороге.']
  ],[
    choice('restore','Восстановить запись с подписью Северина.',{name_quest_started:true,name_quest_done:true,archive_accountable:true},{gold:15}),
    choice('honor','Сначала сохранить работу Мары отдельной книгой.',{name_quest_started:true,name_quest_done:true,archive_mara_honored:true},{items:[loot('ether_drop',2)]})
  ]),
  archive_catalogue:dialogue('archive_catalogue','severin_archive','Первое утро после воды',[
    ['Иона','В первых пяти записях человек сам выбирал того, кто будет рядом при возврате. Эльда согласилась с каждым.'],
    ['Лея','Помощь начинали с разговора. По такой книге ещё можно найти тех, кто соглашался.'],
    ['Радан','Почему каталог показывает одних должников?'],
    ['Иона','Его переставили под новую опись. Вернём прежний порядок. Сначала событие, потом свидетели, затем согласие под печатью.']
  ],[choice('read','Сохранить исходный порядок.')]),
  archive_margin:dialogue('archive_margin','severin_archive','Дорога из точек',[
    ['Иона','Красные точки возле подложных подписей, чёрные возле живых свидетелей. Переписчица оставила способ сверить обе строки.'],
    ['Алар','Последние точки ведут к нижней полке восточного шкафа.'],
    ['Иона','Там она спрятала исходную запись. Посмотрим, осталось ли её имя.']
  ],[choice('follow','Проследить путь к восточному шкафу.')]),
  archive_erasure:dialogue('archive_erasure','severin_archive','Имя под воском',[
    ['Алар','Имя закрыли воском. От тепла ладони проступают буквы.'],
    ['Лея','Погрей ещё немного, лист не порвётся.'],
    ['Иона','Мара, дочь переплётчика. Дальше список подлинников, которые она успела сверить.'],
    ['Радан','Отнесём лист Северину. Он узнает свою подпись под выговором.'],
    ['Иона','Уберу лист в книгу. Пусть Северин сам скажет, что сделает с записью.']
  ],[choice('copy','Сохранить имя и работу Мары.')]),
  camp_archive:dialogue('camp_archive','iona_monastery','Слова, которые не согревают',[
    ['Иона','Я хотела найти договор и увезти его в академию. Теперь вижу, что хозяевам записей тогда было бы трудно его прочесть.'],
    ['Лея','Сможешь оставить им оригинал?'],
    ['Иона','Да. Для сверки хватит копии. Мне придётся довериться и тем, кто прочтёт её иначе.'],
    ['Алар','Они и должны прочесть сами.'],
    ['Иона','Договор и книга помогут разговору на полях. Спросим Северина, что можно взять, и выйдем через восточную галерею.']
  ],[choice('rest','Посидеть у печки без спора.')]),

  nara_fields_first:dialogue('nara_fields_first','nara_fields','Лечебница между межами',[
    ['Нара','Я привезла лекарства. Люди ждут воды и хлеба. Сборщик забирает зерно для плотины и глушит жалобы, пока проходит по меже.'],
    ['Лея','Мы принесли договор. Желающие смогут дать показания.'],
    ['Нара','Пусть сперва попьют. У шлюзов начните с колодца, потом пустите воду к корням и к мельнице. На политой полосе соберите зерно. Сборщик ходит у дальней межи.'],
    ['Алар','Откроем воду и остановим его.'],
    ['Нара','После этого приходите к колодцу. Если зайдёте к амбару, закрепите полог. Искры с поля летят прямо на мешки.']
  ],[
    choice('granary','Позаботимся об амбаре.',{granary_quest_started:true},{next:'nara_granary_offer'}),
    choice('return','Полог закреплён, искры погашены.',{}, {requiresFlags:['granary_secured'],forbidFlags:['granary_quest_done'],next:'nara_granary_return'}),
    choice('lilies','Вот серебряные болотницы.',{}, {requiresFlags:['lilies_found'],forbidFlags:['lilies_quest_done'],next:'nara_lilies_return'}),
    choice('herbs','Напомни о травах для больных.',{lilies_quest_started:true},{forbidFlags:['lilies_quest_done'],next:'nara_lilies_offer'}),
    choice('go','Сначала вода и уцелевшее зерно.')
  ]),
  nara_fields_witness:dialogue('nara_fields_witness','nara_fields','Показания жителей полей',[
    ['Нара','Колодец наполнен, зерно у нас. Сборщик больше не ходит у межи. Теперь люди готовы к разговору.'],
    ['Иона','Начиная с кого?'],
    ['Нара','Одна женщина просит записать цвет двери своего дома. Сосед видел, как сборщик забрал её катушку. Пусть сами выберут, назвать имена или прочесть показания при всех.'],
    ['Радан','Дагану я расскажу, что сделал на нижнем проходе.'],
    ['Нара','Тогда возьми книгу. Ты начнёшь, если люди попросят. Потом дай говорить им.']
  ],[
    choice('names','Собирать показания наедине с согласия каждого.',{field_witnesses:true,witnesses_protected:true},{items:[loot('healing_draught',2)],next:'nara_fields_after'}),
    choice('hearing','Позвать желающих на открытое слушание.',{field_witnesses:true,witnesses_open_hearing:true},{gold:20,next:'nara_fields_after'})
  ]),
  nara_fields_after:dialogue('nara_fields_after','nara_fields','После первого снопа',[
    ['Нара','Теперь спорят, кто починит колесо. Хорошо. Если у вас есть болотницы, я приготовлю настой и отправлю его в слободу с обозом.'],
    ['Алар','Нам ещё нужен путь к Дагану.'],
    ['Нара','На юго-восточной меже есть карта сборщиков. Ищите на ней старый пешеходный проход. Он выведет к затвору и не заставит вести людей под главные ворота.']
  ],[
    choice('offer','О хлебе на завтра.',{granary_quest_started:true},{next:'nara_granary_offer'}),
    choice('return','Амбар защищён от искр.',{}, {requiresFlags:['granary_secured'],forbidFlags:['granary_quest_done'],next:'nara_granary_return'}),
    choice('lilies','Я принёс болотницы для лечебницы.',{}, {requiresFlags:['lilies_found'],forbidFlags:['lilies_quest_done'],next:'nara_lilies_return'}),
    choice('herbs','О серебряной болотнице.',{lilies_quest_started:true},{forbidFlags:['lilies_quest_done'],next:'nara_lilies_offer'}),
    choice('go','Найдём пешеходный ход.')
  ]),
  nara_granary_offer:dialogue('nara_granary_offer','nara_fields','Хлеб на завтра',[
    ['Нара','Амбар за низкой межой на западе. Искры идут под полог. У колодца мокрая мешковина, на столбе верёвка.'],
    ['Лея','Накроем искры и закрепим полог?'],
    ['Нара','Да. Оставьте зерно внутри. На дороге его разнесёт ветром.']
  ],[choice('go','Закрепим полог без суеты.',{granary_quest_started:true})]),
  nara_granary_return:dialogue('nara_granary_return','nara_fields','Кому доверить запас',[
    ['Нара','Дым прошёл, мешки целы. Можно выдавать зерно завтра.'],
    ['Алар','Отдать доли сразу семьям или оставить общий запас?'],
    ['Нара','Раздача поможет тем, у кого пусто сегодня. Для общего запаса нужны два ключа у разных людей и открытая мера. Можно начать с любого решения и сверить остаток через неделю.']
  ],[
    choice('families','Раздать зерно семьям по общей мерке.',{granary_quest_started:true,granary_quest_done:true,granary_families:true},{gold:20,next:'nara_granary_end'}),
    choice('common','Оставить общий запас под двумя ключами.',{granary_quest_started:true,granary_quest_done:true,granary_common:true},{items:[loot('travel_stew',2)],next:'nara_granary_end'})
  ]),
  nara_granary_end:dialogue('nara_granary_end','nara_fields','Не вечное решение',[
    ['Нара','Утром пересчитаем мешки по той же мере. Вывешу ведомость у колодца, чтобы семьи могли сверить свои доли.'],
    ['Лея','Если зерна на всех не хватит?'],
    ['Нара','Созовём людей снова и посмотрим вместе. Спасибо, что до утра есть что делить.']
  ],[choice('go','Сохраним право пересмотреть решение.')]),
  field_harvest:dialogue('field_harvest','nara_fields','Зерно под ладонью',[
    ['Лея','Зерно на политой полосе уцелело. Возьмём один мешок.'],
    ['Алар','Отнесём его Наре.'],
    ['Радан','На меже приказ отдать весь урожай затвору. Сборщик идёт сюда.'],
    ['Иона','Он продолжит, даже если снять табличку.'],
    ['Алар','Тогда сперва остановим сборщика.'],
    ['Лея','И вернёмся к колодцу. Людям будет проще рассказать о сборе, когда у них больше не отнимут хлеб.']
  ],[choice('take','Собрать один мешок, оставив край поля.')]),
  field_route:dialogue('field_route','radan_village','Пешеходный ход к затвору',[
    ['Радан','Этот широкий тракт ведёт под арбалеты. Вот мостик ремонтников к малой створке.'],
    ['Иона','Можно открыть створку, не двигая главного затвора?'],
    ['Радан','Да. Сначала уравнять вес клетей. Потом закрепить затвор и поднять створку. У ворот скажем Дагану, каким путём хотим пройти.'],
    ['Алар','Ты готов с ним говорить?'],
    ['Радан','Постараюсь. За мной идут люди, которым я когда-то закрыл дорогу. Сейчас надо её открыть.']
  ],[choice('go','Пойти пешеходным ходом.')]),
  camp_fields:dialogue('camp_fields','leia_wood','Завтрашний хлеб',[
    ['Иона','В архиве мы нашли договор. Здесь людям сперва нужны вода и зерно.'],
    ['Лея','У колодца сможем выслушать их, когда сборщик уйдёт с межи.'],
    ['Радан','Даган будет спрашивать про уровень воды. Я тоже когда-то прятался за этими цифрами.'],
    ['Алар','Скажешь ему при свидетелях?'],
    ['Радан','Скажу, если люди захотят идти. Нара знает, кто готов. Потом нам понадобится карта к крепости.']
  ],[choice('rest','Сохранить силы для встречи.')]),

  dagan_gate:dialogue('dagan_gate','dagan_gate','Даган у затвора',[
    ['Даган','Радан, я видел вас с моста. К главному затвору не подходите. Вода уже у второй черты.'],
    ['Радан','Нам нужна малая створка. Ты знаешь, что мы можем открыть её отдельно.'],
    ['Алар','Вот первый договор и показания. Мы идём к колоколу, чтобы вернуть людям их записи.'],
    ['Даган','Когда вода выгнула балки, колокол помог удержать плотину. Если оставить её без помощи, кто будет смотреть за руслом ночью?'],
    ['Иона','Ручной караул справится, пока укрепят затвор. Сначала откроем проход для людей. Камень и цепи останутся на месте.'],
    ['Даган','Распределитель во дворе. Покажите, что створка поднимается отдельно. Ключа к аббатству я всё равно не отдам, пока не отвечу за плотину сам.']
  ],[
    choice('safety','Пообещать оставить затвор целым и открыть малую створку.',{gate_terms:true,gate_safety_promised:true},{next:'dagan_wait'}),
    choice('account','Открыть малую створку и потребовать ответа за сборы.',{gate_terms:true,gate_accountability:true},{next:'dagan_wait'})
  ]),
  dagan_wait:dialogue('dagan_wait','dagan_gate','Створка и русло',[
    ['Даган','У каждой цепи на распределителе своя табличка. Главный затвор оставьте закреплённым.'],
    ['Радан','Во время паводка мы закрыли людям даже малый проход.'],
    ['Даган','Я слышал их. Боялся, что ключ повернут сразу в двух местах.'],
    ['Радан','Сейчас проверим цепи при всех.'],
    ['Даган','Поднимите створку. К цепям в бою не подходите. Они держат воду и после нас.']
  ],[choice('go','К распределителю противовесов.')]),
  dagan_defeated:dialogue('dagan_defeated','dagan_gate','Ключ коменданта',[
    ['Даган','Стойте. Главная цепь цела?'],
    ['Иона','Цела. Малая створка открыта, вода осталась за затвором.'],
    ['Даган','Значит, можно было открыть людям дорогу. Я держал её закрытой и после паводка.'],
    ['Радан','Я помогал тебе. На том берегу знают и моё имя.'],
    ['Алар','Отдай ключ к аббатству. Эльда должна выслушать людей.'],
    ['Даган','Отдам. Запасной караул соберу, если дашь время до смены. Можешь приказать мне уйти сейчас, тогда люди у воды назначат другого. В обоих случаях приду к кругу и отвечу за приказы.']
  ],[
    choice('hearing','Сменить Дагана сейчас и вызвать его на слушание.',{warden_key:true,dagan_hearing:true},{gold:30,next:'dagan_after'}),
    choice('watch','Дать Дагану передать караул, затем вызвать на слушание.',{warden_key:true,dagan_watch:true},{items:[loot('revival_salt',2)],next:'dagan_after'})
  ]),
  dagan_after:dialogue('dagan_after','dagan_gate','Последний приказ старого караула',[
    ['Даган','Ключ ваш. Мост к Эльде за северной стеной. Скажите, что затвор остался цел и тут готовят ручной караул.'],
    ['Радан','Придёшь к нижнему проходу, если позовут слушать имена?'],
    ['Даган','Приду. Сначала проверю, кому передали смену.'],
    ['Радан','Хорошо. У Эльды будем до темноты.'],
    ['Даган','Путь к мосту свободен. Я поговорю со своими, чтобы никто не трогал людей у затвора.']
  ],[choice('go','Через мост к аббатству.')]),
  fortress_order:dialogue('fortress_order','dagan_gate','Приказ о ночном сборе',[
    ['Иона','Даган подписал сбор памяти с семей нижнего берега. Здесь сказано принимать жалобы после ремонта. Срока ремонта нет.'],
    ['Радан','Приказ назвали временным. В копиях он шёл из года в год.'],
    ['Алар','Возьмём и приказ, и отчёт о том, как выдержала плотина.'],
    ['Радан','Да. На слушании покажем, кого тогда спасли и кто расплачивался потом. Свою подпись я тоже отмечу.']
  ],[choice('read','Сохранить приказ целиком.')]),
  fortress_names:dialogue('fortress_names','radan_village','Камень караулки',[
    ['Радан','Солдаты царапали имена перед сменой. Вот те, с кем стоял на нижнем проходе.'],
    ['Лея','Твоё имя тоже здесь.'],
    ['Радан','Я вырезал его глубоко. Теперь хочу узнать имена тех, кого мы не впустили.'],
    ['Алар','Спросим тех, кто всё ещё приходит к проходу.'],
    ['Радан','Пусть решат, что записать на камне. Я приду и расскажу, почему повернул ключ.']
  ],[choice('read','Запомнить незаполненное место рядом.')]),
  camp_fortress:dialogue('camp_fortress','radan_village','Те, кто останутся у воды',[
    ['Радан','Даган спросит, кто останется у воды. Хороший вопрос, хоть он и задаёт его слишком поздно.'],
    ['Иона','На распределителе можно открыть малый проход отдельно. Проверим это на месте.'],
    ['Радан','А на ночь нужны люди, которые умеют читать отметки уровня.'],
    ['Лея','Скажем Эльде, кто сможет подменить караул.'],
    ['Алар','И спросим Дагана, где ключ от моста.'],
    ['Радан','Он носит его при себе. Если поднимет оружие, держитесь подальше от цепей.']
  ],[choice('rest','Проверить снаряжение и отдохнуть.')]),

  elda_first:dialogue('elda_first','elda_abbey','Разговор с Эльдой',[
    ['Эльда','Вы принесли книгу? Здесь у лечебницы уже ждут люди, чьи имена в ней.'],
    ['Алар','Им велели отдать память за то, что когда-то предложили бесплатно.'],
    ['Эльда','Я принесла первый колокол после паводка. Люди просили дать им ночь без страха. Потом решила, что сама знаю, кому нужна помощь. Когда люди захотели забрать своё, я оставила записи под замком.'],
    ['Лея','И теперь колокол исполняет этот приказ?'],
    ['Эльда','Звонарь исполняет мою последнюю команду. Сохранить покой любой ценой. Утром я велела ему отпустить записи. Он принял мой отказ за болезнь.'],
    ['Иона','Остановим звонаря. Тогда спросим людей, хотят ли они сохранить колокол.'],
    ['Эльда','У зала есть костёр. Возьмите припасы и отдохните. Когда вернётесь, я буду у кафедры.']
  ],[
    choice('truth','Остановить звонаря и собрать владельцев записей.',{abbess_heard:true,elda_answer_required:true},{next:'elda_wait'}),
    choice('care','Остановить звонаря и сохранить добровольную помощь.',{abbess_heard:true,care_without_force:true},{next:'elda_wait'})
  ]),
  elda_wait:dialogue('elda_wait','elda_abbey','До последнего звона',[
    ['Эльда','У зала есть костёр и ларь с лекарствами. Подготовьтесь, прежде чем идти к колоколу.'],
    ['Алар','Чего ждать от звонаря?'],
    ['Эльда','Когда звонарь собирает удары в один звон, прикрывайте весь отряд. В зале есть стражи, которые ему помогают. После боя вернитесь ко мне, здесь будут ждать владельцы записей.']
  ],[choice('go','К огню перед залом колокола.')]),
  elda_final:dialogue('elda_final','elda_abbey','Судьба колокола',[
    ['Эльда','Звон стих. Люди уже спорят у входа. Одни хотят забрать записи, другие спрашивают, будет ли работать лечебница.'],
    ['Иона','Можем вернуть записи владельцам. При возврате каждый сам позовёт свидетеля. Старый приказ снят, поэтому колокол можно остановить или оставить для добровольного приёма.'],
    ['Радан','У воды собрали ручной караул. Плотина выдержит без сбора записей. Затвор всё равно надо чинить.'],
    ['Лея','Если оставим колокол, ключи получат лечебница, жители и хранитель. Открывать смогут только вместе. Человек сможет отказаться и забрать запись. Если остановим колокол, лечебница продолжит принимать людей без магии.'],
    ['Эльда','Я отдам печать. Круг просит вас первыми предложить решение. Скажите, как будем возвращать записи и помогать людям дальше.']
  ],[
    choice('public_truth','Остановить колокол и вернуть записи владельцам при свидетелях.',{act1_complete:true,public_truth:true},{gold:40,next:'ending_public_truth',forbidFlags:['act1_complete']}),
    choice('stewardship','Оставить колокол для добровольной помощи под тремя ключами.',{act1_complete:true,stewardship:true},{items:[loot('ether_drop',3)],next:'ending_stewardship',forbidFlags:['act1_complete']})
  ]),
  ending_public_truth:dialogue('ending_public_truth','elda_abbey','Круг под немым колоколом',[
    ['Алар','Остановим колокол. Записи вернём владельцам. На открытом слушании покажем, кто поменял договор. Личные строки прочтём только с разрешения.'],
    ['Эльда','Я сниму свою печать и помогу разобрать катушки по именам. Лечебница останется у Нары.'],
    ['Лея','Начнём с тех, кто уже ждёт у двери. Поставьте воду и скамьи.'],
    ['Иона','Подлинники будут доступны владельцам, копии правил унесу в слободу, артель и архив.'],
    ['Радан','Проверю ручной караул, потом пойду к нижнему проходу слушать имена.'],
    ['Алар','У северного тракта нашли катушку с записанным голосом. Печать отливной почты ведёт на Соляное взморье.']
  ],[choice('end','Выйти на северный тракт к взморью.')]),
  ending_stewardship:dialogue('ending_stewardship','elda_abbey','Три ключа и открытая дверь',[
    ['Алар','Оставим колокол для добровольной помощи. Откроют его трое, и любой человек сможет забрать свою запись.'],
    ['Эльда','Первый ключ получит Нара, второй жители слободы. Третьего хранителя они выберут сами. Я передам книгу своих решений кругу.'],
    ['Лея','До приёма спросим человека, чего он хочет. Если передумает у двери, пропустим обратно.'],
    ['Иона','Сделаю копии договора, чтобы впоследствии можно было сверить каждую правку.'],
    ['Радан','Караул остаётся у воды. Держать затвор будем вручную.'],
    ['Алар','У северного тракта нашли катушку с записанным голосом. Печать отливной почты ведёт на Соляное взморье.']
  ],[choice('end','Взять копию договора и выйти к взморью.')]),
  elda_epilogue:dialogue('elda_epilogue','elda_abbey','После решения',[
    ['Эльда','Кафедру вынесли во двор. Люди просят сделать из неё скамьи для слушаний. Я спросила, кому понадобится место у двери.'],
    ['Алар','Если возникнет спор, кто будет решать?'],
    ['Эльда','Круг. В книге есть имена тех, кто взялся помогать. А вам надо идти на Соляное взморье. Выход через северный почтовый тракт.']
  ],[
    choice('truth','Вспомнить круг под немым колоколом.',{}, {requiresFlags:['public_truth'],next:'ending_public_truth'}),
    choice('keys','Вспомнить решение о трёх ключах.',{}, {requiresFlags:['stewardship'],next:'ending_stewardship'}),
    choice('leave','Ещё побудем рядом с людьми.')
  ]),
  abbey_consent:dialogue('abbey_consent','elda_abbey','Кафедра для чужих слов',[
    ['Иона','На кафедре вырезано, что человек может уйти, пока говорит. Прочли?'],
    ['Лея','У двери замок. Люди могут и не поверить надписи.'],
    ['Радан','Сначала здесь была только низкая ограда. Потом заперли створку, чтобы уходящих возвращали к приёму.'],
    ['Алар','Снимем замок и оставим проход?'],
    ['Лея','Да. Когда люди придут, я скажу им, что они могут уйти и вернуться позже.']
  ],[choice('read','Оставить правило открытым для чтения.')]),
  abbey_clapper:dialogue('abbey_clapper','iona_monastery','Не трофей',[
    ['Алар','Язык расколот. Старый приказ больше не прозвучит.'],
    ['Иона','Оставим его у книги. По трещине видно, где разошёлся шов печати.'],
    ['Лея','На металле следы ладоней. Люди касались его, когда просили помощи.'],
    ['Радан','Запишем и это. На слушании пригодится знать, для чего колокол построили и когда его стали использовать для сбора.']
  ],[choice('take','Сохранить расколотый язык как свидетельство.')]),
  abbey_last_page:dialogue('abbey_last_page','elda_abbey','Пустое место для утра',[
    ['Иона','В первой записи Эльда обещала спросить людей о помощи снова наутро. Потом вычеркнула слово «снова». Последний лист остался пустым.'],
    ['Алар','Напишем, что произошло сегодня?'],
    ['Лея','Только то, что знаем. Остальные допишут сами.'],
    ['Радан','Укажем день, когда остановили приказ.'],
    ['Иона','И порядок возврата. Запись получает её владелец, когда он сам попросит.'],
    ['Алар','Поставлю дату.'],
    ['Лея','Оставь место ниже. В следующий раз кто-то может предложить другой порядок.']
  ],[choice('write','Оставить дату и место для других.')]),
  camp_abbey:dialogue('camp_abbey','leia_wood','Четверо перед звоном',[
    ['Иона','По дороге мы узнали, кто подписал сбор. Теперь нужно снять последний приказ с колокола.'],
    ['Радан','Против общего звона держитесь рядом. Прикрывайте того, кто начнёт работать с печатью.'],
    ['Лея','Соль и эфир под рукой. Если кто упадёт, зовите меня.'],
    ['Алар','А когда звон стихнет?'],
    ['Иона','Вернёмся к Эльде. Люди решат, куда пойдут катушки.'],
    ['Радан','Тогда доедайте. Ключи и книги подождут, пока перетянем ремни.']
  ],[choice('rest','Подготовиться к последнему бою акта.')])
};

// Outcome data is intentionally available to the raster UI without reinterpreting flags.
export const ENDINGS = {
  public_truth:{id:'public_truth',title:'Круг под немым колоколом',summary:'Колокол остановлен. Каждый может забрать свою запись, пригласив свидетеля. Копии договора хранят слобода, артель и архив. За плотиной следит ручной караул. В день открытого слушания Эльда придёт объяснить свои решения.',nextHook:'На северном тракте нашли катушку с записанным голосом и печатью отливной почты. След ведёт на Соляное взморье.'},
  stewardship:{id:'stewardship',title:'Три ключа и открытая дверь',summary:'Колокол открывают трое хранителей вместе. Люди сами решают, принять помощь или забрать свою запись. Эльда передала ключи. За плотиной следит ручной караул.',nextHook:'На Соляном взморье узнаете, чей голос записан на катушке с северного тракта.'}
};

export const ACT_INFO = {
  id:'act1',title:'Акт I. Право на последний голос',startingArea:'monastery',estimatedMinutes:180,
  estimateNote:'Авторская цель темпа для первого прохождения с частью дополнительных историй; время не измерено и не гарантируется.',
  mainQuestCount:35,optionalQuestCount:8,encounterCount:34,
  completionFlag:'act1_complete',endingFlags:['public_truth','stewardship']
};

// Stable existing-world targets, ordered by authored intermediate flags.
export const QUEST_TARGETS = {
  "main01": [
    {
      "areaId": "monastery",
      "id": "iona_monastery"
    }
  ],
  "main02": [
    {
      "areaId": "monastery",
      "id": "iona_monastery"
    }
  ],
  "main03": [
    {
      "areaId": "monastery",
      "id": "monastery_book"
    }
  ],
  "main04": [
    {
      "areaId": "monastery",
      "id": "enc03"
    }
  ],
  "main05": [
    {
      "areaId": "village",
      "id": "velda_village"
    }
  ],
  "main06": [
    {
      "areaId": "village",
      "id": "radan_village"
    }
  ],
  "main07": [
    {
      "areaId": "village",
      "id": "orin_village"
    }
  ],
  "main08": [
    {
      "areaId": "village",
      "id": "velda_village"
    }
  ],
  "main09": [
    {
      "areaId": "briarwood",
      "id": "leia_wood"
    }
  ],
  "main10": [
    {
      "areaId": "briarwood",
      "id": "forest_resin_node"
    }
  ],
  "main11": [
    {
      "areaId": "briarwood",
      "id": "enc08"
    }
  ],
  "main12": [
    {
      "areaId": "briarwood",
      "id": "mirel_wood"
    }
  ],
  "main13": [
    {
      "areaId": "quarry",
      "id": "quarry_tokens"
    }
  ],
  "main14": [
    {
      "areaId": "quarry",
      "id": "enc11"
    }
  ],
  "main15": [
    {
      "areaId": "quarry",
      "id": "teren_quarry"
    }
  ],
  "main16": [
    {
      "areaId": "quarry",
      "id": "quarry_lift_node"
    }
  ],
  "main17": [
    {
      "areaId": "fen",
      "id": "gerd_fen"
    }
  ],
  "main18": [
    {
      "areaId": "fen",
      "id": "fen_beacons_node"
    }
  ],
  "main19": [
    {
      "areaId": "fen",
      "id": "enc16"
    }
  ],
  "main20": [
    {
      "areaId": "fen",
      "id": "gerd_fen"
    }
  ],
  "main21": [
    {
      "areaId": "archive",
      "id": "severin_archive"
    }
  ],
  "main22": [
    {
      "areaId": "archive",
      "id": "archive_catalogue_node"
    }
  ],
  "main23": [
    {
      "areaId": "archive",
      "id": "archive_index_node"
    }
  ],
  "main24": [
    {
      "untilFlag": "archive_sentinel",
      "areaId": "archive",
      "id": "enc20"
    },
    {
      "areaId": "archive",
      "id": "severin_archive"
    }
  ],
  "main25": [
    {
      "areaId": "sunfields",
      "id": "field_water_node"
    }
  ],
  "main26": [
    {
      "areaId": "sunfields",
      "id": "field_harvest_node"
    }
  ],
  "main27": [
    {
      "untilFlag": "field_bell",
      "areaId": "sunfields",
      "id": "enc24"
    },
    {
      "areaId": "sunfields",
      "id": "nara_fields"
    }
  ],
  "main28": [
    {
      "areaId": "sunfields",
      "id": "field_route_node"
    }
  ],
  "main29": [
    {
      "areaId": "fortress",
      "id": "dagan_gate"
    }
  ],
  "main30": [
    {
      "areaId": "fortress",
      "id": "fortress_gate_node"
    }
  ],
  "main31": [
    {
      "areaId": "fortress",
      "id": "enc28"
    }
  ],
  "main32": [
    {
      "areaId": "fortress",
      "id": "dagan_gate"
    }
  ],
  "main33": [
    {
      "areaId": "abbey",
      "id": "elda_abbey"
    }
  ],
  "main34": [
    {
      "areaId": "abbey",
      "id": "enc34"
    }
  ],
  "main35": [
    {
      "areaId": "abbey",
      "id": "elda_abbey"
    }
  ],
  "side01": [
    {
      "untilFlag": "letter_found",
      "areaId": "monastery",
      "id": "monastery_letter"
    },
    {
      "areaId": "village",
      "id": "velda_village"
    }
  ],
  "side02": [
    {
      "untilFlag": "accounts_found",
      "areaId": "quarry",
      "id": "quarry_accounts_node"
    },
    {
      "areaId": "village",
      "id": "orin_village"
    }
  ],
  "side03": [
    {
      "untilFlag": "traps_opened",
      "areaId": "briarwood",
      "id": "forest_traps"
    },
    {
      "areaId": "briarwood",
      "id": "mirel_wood"
    }
  ],
  "side04": [
    {
      "untilFlag": "quarry_echo_broken",
      "areaId": "quarry",
      "id": "enc12"
    },
    {
      "untilFlag": "lantern_found",
      "areaId": "quarry",
      "id": "quarry_lantern"
    },
    {
      "areaId": "quarry",
      "id": "teren_quarry"
    }
  ],
  "side05": [
    {
      "untilFlag": "lilies_found",
      "areaId": "fen",
      "id": "fen_lily"
    },
    {
      "areaId": "village",
      "id": "nara_village"
    }
  ],
  "side06": [
    {
      "untilFlag": "fen_witness",
      "areaId": "fen",
      "id": "enc16"
    },
    {
      "areaId": "fen",
      "id": "gerd_fen"
    }
  ],
  "side07": [
    {
      "untilFlag": "archive_margin_found",
      "areaId": "archive",
      "id": "archive_margin"
    },
    {
      "untilFlag": "archive_name_found",
      "areaId": "archive",
      "id": "archive_erasure"
    },
    {
      "areaId": "archive",
      "id": "severin_archive"
    }
  ],
  "side08": [
    {
      "untilFlag": "granary_secured",
      "areaId": "sunfields",
      "id": "field_granary"
    },
    {
      "areaId": "sunfields",
      "id": "nara_fields"
    }
  ]
};

addStartingHeroes(PARTY, SKILLS, ITEMS);
addSmithies(AREAS, AREA_LAYOUTS);
extendForgedEncounters({ENEMIES,SKILLS,AREAS,AREA_LAYOUTS});
extendCampaign({ areas:AREAS, layouts:AREA_LAYOUTS, quests:QUESTS, dialogues:DIALOGUES, targets:QUEST_TARGETS, enemies:ENEMIES, skills:SKILLS, items:ITEMS, actInfo:ACT_INFO });
applyAreaLayouts(AREAS, AREA_LAYOUTS);
extendRoadsContent({areas:AREAS,quests:QUESTS,dialogues:DIALOGUES,targets:QUEST_TARGETS,enemies:ENEMIES});
addCampaignPatrols(AREAS);
addRegionalEquipment(ITEMS, AREAS);
applyEncounterBalance(ENEMIES);
ACT_INFO.optionalQuestCount = QUESTS.filter(quest => quest.optional).length;
ACT_INFO.encounterCount = AREAS.reduce((sum, area) => sum + area.encounters.length, 0);
