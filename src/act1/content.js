import { AREA_LAYOUTS } from './area-layouts.js?v=rivers-0181';
import { applyAreaLayouts } from './area-geometry.js?v=rivers-0181';
import { extendRoadsContent } from './roads-content.js?v=forged-019';
import { extendForgedEncounters } from './forged-enemies.js?v=forged-019';
import { addSmithies } from './forged-smiths.js?v=forged-019';
import { FORGE_ITEMS } from './loot-tables.js?v=forged-019';

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
  quest('main01','После Судьи','Поговорите с исследовательницей у последней печати. Она знает, почему победа не вернула тишину.', 'monastery',[],['prologue_heard'],15,0),
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
  quest('side05','Три чашки лекарства','Наре нужны серебряные болотницы с тихого берега. Вернитесь в слободу с цветами.', 'village',['lilies_quest_started'],['lilies_quest_done'],85,35,[loot('revival_salt',3),loot('ether_drop',2)],true),
  quest('side06','Последний пассажир','На скамье переправы осталась записка. Помогите Герду назвать последнего пассажира вслух.', 'fen',['passenger_quest_started'],['passenger_quest_done'],85,45,[loot('reed_staff')],true),
  quest('side07','Ошибка на полях','Верните имя переписчице, оставившей правду на полях. Найдите помету, затем соскобленную запись и поговорите с Северином.', 'archive',['name_quest_started'],['name_quest_done'],100,40,[loot('margin_coat')],true),
  quest('side08','Хлеб на завтра','Нара просит защитить амбар от искр. Решите, кому доверить спасённый запас.', 'sunfields',['granary_quest_started'],['granary_quest_done'],95,55,[loot('hospice_cloak')],true)
];

const dialogue=(id,npcId,title,lines,choices)=>({id,npcId,title,lines:lines.map(([speaker,text])=>({speaker,text})),choices});
const choice=(id,text,setFlags={},extra={})=>({id,text,setFlags,...extra});

export const DIALOGUES = {
  iona_wake:dialogue('iona_wake','iona_monastery','После последнего удара',[
    ['Иона','Не вставай резко. Судья разбит, три печати горят, а камень всё ещё отдаёт приказ. Я насчитала семь повторов твоего последнего шага. На восьмом он наконец стал твоим. Если увидишь, что я снова считаю пальцы, просто назови меня по имени.'],
    ['Алар','Ты была здесь во время боя?'],
    ['Иона','Под лестницей. Очень учёная позиция: хорошо видно причины катастрофы и совершенно невозможно красиво умереть. Я пришла читать печати, а нашла книгу, из которой исчезают строки. Там не молитвы. Имена жителей слободы, вес зерна и графа «возвращено молчанием». Судью победили. Теперь надо выяснить, кому он служил.'],
    ['Алар','За воротами есть люди?'],
    ['Иона','Должны быть. И я предпочла бы спросить живых, прежде чем разбивать ещё что-нибудь важное.']
  ],[
    choice('ask','Что случилось с моей памятью?',{prologue_heard:true},{next:'iona_memory'}),
    choice('join','Пойдём к людям вместе.',{prologue_heard:true,iona_joined:true},{recruit:'iona',next:'iona_join'})
  ]),
  iona_memory:dialogue('iona_memory','iona_monastery','След в памяти',[
    ['Иона','В печатях нет души Судьи. Там порядок действий, повторённый так часто, что он научился защищать себя. Звон способен удержать сильное чувство вместе с воспоминанием о нём. Человек перестаёт бояться, но иной раз забывает, почему боялся. Удобно после бедствия. Страшно перед новым.'],
    ['Алар','И мои провалы — от него?'],
    ['Иона','Не стану подменять неизвестность красивым ответом. На твоих латах такой же знак, как на переплёте. Это след, не приговор. Я умею находить разницу. Правда, иногда лишь с третьей попытки. Возьми меня: понадобится человек, который сначала прочтёт надпись на рычаге.']
  ],[choice('join','Тогда будешь читать. Идём.',{iona_joined:true},{recruit:'iona',next:'iona_join'})]),
  iona_join:dialogue('iona_join','iona_monastery','Двое на дороге',[
    ['Иона','Договоримся сразу: если я скажу «любопытно», не трогай находку голыми руками. Если скажу «очень любопытно», отойди за толстую стену. А если замолчу — спроси, помню ли своё имя.'],
    ['Алар','У тебя есть оружие?'],
    ['Иона','Мерный жезл. Академия называет его прибором. Несколько очень настойчивых крыс считали иначе. Огненные строки подойдут против корней, морозные — против угольных созданий. Только не трать весь эфир на первого встречного: у северного выхода стоит ещё один страж. Сначала книга в восточной галерее. Потом дорога. На этот раз именно в таком порядке.']
  ],[choice('go','К восточной галерее.')]),
  iona_after_join:dialogue('iona_after_join','iona_monastery','То, что можно унести',[
    ['Иона','Я забрала инструменты. Остальное пусть останется здесь: человеку полезно хотя бы раз уйти из монастыря без мешка священных камней. В книге найдём причину, у северной арки — препятствие. За ними начинается слобода.'],
    ['Алар','Ты легко говоришь о том, что едва нас не убило.'],
    ['Иона','Это не лёгкость. Это способ не дать страху выбирать слова за меня. Когда доберёмся до огня, я, вероятно, буду дрожать. Позволь мне это. А сейчас давай проверим, помнит ли дорога наши ноги лучше, чем я помню своё вчера.']
  ],[choice('go','Продолжим путь.')]),
  monastery_ledger:dialogue('monastery_ledger','iona_monastery','Не книга должников',[
    ['Иона','Посмотри: первый столбец — имя. Второй — добровольное согласие. Третий прикрыт полоской золота. Под ней написано «право забрать отданное». Кто-то не вырвал страницу. Кто-то сделал забывание красивым.'],
    ['Алар','Записи свежие?'],
    ['Иона','Чернила разных лет, а подпись приёмщика одна: аббатство удержанного звона. Вот последняя строка. Восьмая смена каменоломни: двенадцать работников, двенадцать согласий, ни одной подписи. Вместо них отпечатки жетонов. Я выну этот лист. Не для коллекции. Чтобы нам не ответили, будто мы всё неверно запомнили.'],
    ['Алар','Начнём со слободы.'],
    ['Иона','Да. У людей обычно лучше получается узнавать свои имена, когда их ещё не объявили чужой ошибкой.']
  ],[choice('take','Сохранить страницу и имена.')]),
  letter_found:dialogue('letter_found','iona_monastery','Три сгиба',[
    ['Алар','Письмо зажато под каменной ладонью. На конверте — только «Вельде».'],
    ['Иона','Край не тронут. Оно лежало здесь ещё до последнего пожара. Удивительно: книги с золотыми застёжками исчезают, а человек прячет важное под первым попавшимся обломком.'],
    ['Алар','Вскрыть?'],
    ['Иона','Адресат живёт в слободе, если карта не врёт. Пусть сначала она решит, кому принадлежат эти слова. Мы и так идём выяснять, кто получил право распоряжаться чужой памятью. Плохое начало — пользоваться тем же правом по дороге. Уберём письмо так, чтобы сохранить все три сгиба.']
  ],[choice('keep','Взять запечатанное письмо.')]),
  sun_altar:dialogue('sun_altar','iona_monastery','Старая формула',[
    ['Иона','Рассвет пробуждает, уголь сохраняет, солнце возвращает. Так написано на основании. Но на верхнем ободе новая формула: пробуждать, сохранять, удерживать. Одно слово заменило весь смысл.'],
    ['Алар','Я пробудил все три печати.'],
    ['Иона','И открыл ворота. Это было необходимо. Не бери на себя чужую подмену только потому, что успел к ней прикоснуться. Мы часто наследуем вещи, которые построили не мы. Отвечать приходится за то, что делаем после того, как прочли надпись.'],
    ['Алар','Значит, вернём последнее слово.'],
    ['Иона','Сначала узнаем, кому и что следует вернуть. Книги любят точность. Люди заслуживают её ещё больше.']
  ],[choice('leave','Запомнить исходную формулу.')]),
  camp_monastery:dialogue('camp_monastery','iona_monastery','Тепло после боя',[
    ['Иона','У печати остался жар. Его хватит восстановить силы, даже если хозяин огня давно исчез. Забавная мысль: иногда хорошее дело живёт дольше плохого приказа.'],
    ['Алар','Ты обещала дрожать у огня.'],
    ['Иона','Уже начала. Спасибо, что не предложил немедленно стать храбрее. Смотри на северную арку: там страж, привязанный к старой команде. Он не услышит доводов. Книга в восточной галерее объяснит, как разомкнуть его печать. Отдохнём и пойдём. Я хочу увидеть дом, который ещё пахнет хлебом, а не каменной пылью.']
  ],[choice('rest','Согреться и продолжить.')]),

  velda_arrival:dialogue('velda_arrival','velda_village','Гость с монастырской дороги',[
    ['Вельда','Клинок убери остриём вниз. Здесь дети ходят смотреть на героев и забывают смотреть под ноги. Я Вельда. Когда нужно принять неприятное решение, меня называют старостой. Когда раздать муку — просто старухой. Ты из монастыря?'],
    ['Алар','Судья повержен. Но в его книге — ваши имена.'],
    ['Вельда','Наши имена много где есть. На налоговых досках, на посуде умерших, на дверях, куда хозяин больше не возвращается. Беда не в записи. Дважды за месяц приходил сборщик. После него сосед не узнал песню жены. Девочка перестала помнить, чего ждёт у дороги. А хлеб пекут, работа идёт, жалоб будто нет.'],
    ['Иона','Можно поговорить со всеми?'],
    ['Вельда','Поговорить — да. Приказать доверять вам — нет. Радан знает заставу, Орин умеет чинить знаки, Нара видит последствия в людях. Начните с них.']
  ],[
    choice('listen','Мы будем спрашивать и слушать.',{village_heard:true,approach_listen:true},{next:'velda_wait'}),
    choice('promise','Я остановлю сборщиков.',{village_heard:true,approach_oath:true},{next:'velda_wait'})
  ]),
  velda_wait:dialogue('velda_wait','velda_village','Круг у колодца',[
    ['Вельда','Пока у вас нет проводника и знака, совет даст только советы. Радан у восточной дороги. Орин у горна. Не говорите ветерану, что ему пора забыть прошлое: это уже однажды предложили бесплатно.'],
    ['Алар','В монастыре было письмо на твоё имя.'],
    ['Вельда','Тогда оно ждало дольше, чем я позволяла себе надеяться. Но прежде спроси меня прямо, о нём ли мы говорим. Людям легче дышать, когда у разговора есть дверь, которую можно открыть самим. И ещё: дорожные сборщики за кузницей к аббатству отношения уже не имеют. Страхом тоже можно торговать врозницу.']
  ],[
    choice('letter','Расскажи о письме.',{letter_quest_started:true},{next:'velda_letter_offer'}),
    choice('deliver','Письмо здесь. Оно запечатано.',{}, {requiresFlags:['letter_found'],forbidFlags:['letter_quest_done'],next:'velda_letter_return'}),
    choice('leave','Найду Радана и Орина.')
  ]),
  velda_council:dialogue('velda_council','velda_village','Поручение живых',[
    ['Вельда','Орин подтвердил знак. Радан подтвердил дорогу. Я подтверждаю одно: мы не отдавали аббатству право стирать отказ. Раньше колокол принимал тяжесть после паводка. Люди сами приходили. Теперь сборщики зовут это долгом за безопасность.'],
    ['Радан','В лесу лежит водовод. Через каменоломню он идёт к топям, оттуда к архиву и плотине. Если нужен источник, держитесь его.'],
    ['Вельда','Мы даём вам припасы и право говорить, что слобода просит ответа. Не право отвечать вместо неё. Найдите книгу согласий. Приведите свидетелей, если они смогут идти. А если не смогут — вернитесь и выслушайте здесь. Ни одна победа не стоит того, чтобы наши голоса снова стали только строчками в вашей книге.']
  ],[
    choice('witness','Принести доказательства открыто.',{council_mandate:true,mandate_public:true},{gold:15,next:'velda_depart'}),
    choice('shelter','Сначала защитить тех, кто заговорит.',{council_mandate:true,mandate_shelter:true},{items:[loot('revival_salt')],next:'velda_depart'})
  ]),
  velda_depart:dialogue('velda_depart','velda_village','Дорога за вереском',[
    ['Вельда','Оба дела нужны. Но первое обещание человек вспоминает раньше второго, когда станет страшно. Я запомню твоё. Лея ушла в смоляной лес ещё до вас. Лекарка упряма: считает, что людей следует лечить даже без разрешения печати. Найдите её ленты.'],
    ['Алар','Мы вернёмся.'],
    ['Вельда','Возвращаются все: ногами, именем или бедой, которую оставили позади. Постарайтесь выбрать первый способ. И возьмите еду. Герои почему-то думают, будто хороший замысел заменяет горячую похлёбку. Потом Нара часами вытаскивает их из этого заблуждения.']
  ],[choice('go','В путь, к смоляному лесу.')]),
  velda_council_after:dialogue('velda_council_after','velda_village','У колодца всё ещё ждут',[
    ['Вельда','Колодец работает, огонь не погас. Это моя часть пути, пока вы ходите свою. Я не спрашиваю каждый раз, близко ли победа: у неё дурная привычка отступать, если слишком громко звать. Лучше скажите, кому нужны сухие носки.'],
    ['Алар','Есть новости о сборщиках?'],
    ['Вельда','Требуют тишины, но приходят всё реже. Значит, услышали ваши шаги. Не перепутайте: испугавшийся приказ ещё не отменённый приказ. Дойдите до того, кто его написал. А письмо, если нашли, отдайте сейчас. Для некоторых дел не бывает удобного времени.']
  ],[
    choice('offer','О письме из монастыря.',{letter_quest_started:true},{next:'velda_letter_offer'}),
    choice('deliver','Я принёс запечатанное письмо.',{}, {requiresFlags:['letter_found'],forbidFlags:['letter_quest_done'],next:'velda_letter_return'}),
    choice('go','Мы продолжаем путь.')
  ]),
  velda_letter_offer:dialogue('velda_letter_offer','velda_village','Неотданное письмо',[
    ['Вельда','Мой брат служил писарем в монастыре. Перед последним сбором сказал, что нашёл неправильное слово. Я велела ему принести слово домой и сперва поужинать. Он рассмеялся. Два дня спустя его место оказалось пустым, а я не могла вспомнить, из-за чего мы поссорились.'],
    ['Алар','Ты знаешь, где искать?'],
    ['Вельда','У сломанной статуи, западнее галереи. В детстве мы прятали записки под ладонью, которая ничего не могла удержать. Если письмо ещё там, не читай по дороге. Я хочу хотя бы один раз сама решить, что сделать со своей болью.']
  ],[
    choice('return','Письмо уже со мной.',{}, {requiresFlags:['letter_found'],forbidFlags:['letter_quest_done'],next:'velda_letter_return'}),
    choice('seek','Поищу у каменной ладони.',{letter_quest_started:true})
  ]),
  velda_letter_return:dialogue('velda_letter_return','velda_village','Слова брата',[
    ['Вельда','Почерк его. Видишь, в слове «здравствуй» буква падает? Он торопился со мной поздороваться даже на бумаге. «Вельда, я подписал согласие забыть паводок. Не подписывал согласие забыть тех, кого не успел спасти. Теперь они просят молчать о разнице».'],
    ['Иона','Это свидетельство подмены.'],
    ['Вельда','Для вас — да. Для меня ещё и последняя шутка о твоём дурацком монастырском супе, брат. Я позволю сделать копию. Но скажите: оригинал пусть останется здесь, у моего огня, или я должна сама прочесть его перед кругом? Не выбирайте, какая мне положена смелость. Скажите, что вы считаете нужным.']
  ],[
    choice('private','Оригинал твой. Копию покажем с твоего согласия.',{letter_quest_started:true,letter_quest_done:true,letter_private:true},{next:'velda_letter_private'}),
    choice('public','Прочти кругу. Пусть у него снова будет голос.',{letter_quest_started:true,letter_quest_done:true,letter_public:true},{gold:20,next:'velda_letter_public'})
  ]),
  velda_letter_private:dialogue('velda_letter_private','velda_village','Право на закрытую дверь',[
    ['Вельда','Хорошо. Сегодня я прочту его одна. Завтра, может быть, позову соседку. Иногда право закрыть дверь важнее любых слов о свободе. Возьмите медальон. Брат прислал его ещё до службы, когда наши беды были меньше этого круга меди.'],
    ['Алар','Ты уверена?'],
    ['Вельда','Уверена в том, что решаю сама. Не заставляй меня повторять: старые люди начинают сердиться, когда их собственное согласие приходится доказывать дважды. И да, копию я разрешаю. Каждое слово, кроме шутки о супе. Её Северин не заслужил.']
  ],[choice('go','Спасибо за доверие.')]),
  velda_letter_public:dialogue('velda_letter_public','velda_village','Голос на площади',[
    ['Вельда','Тогда соберу круг вечером. Начну с его имени. Не с обвинения, не с вашей победы. Если люди плачут, им сперва нужен кто-то, кого можно оплакивать. Потом уже место, куда направить гнев.'],
    ['Радан','Я останусь рядом, когда вернёмся.'],
    ['Вельда','Рядом — хорошо. Впереди с копьём — не надо. Мы достаточно долго видели оружие прежде, чем слышали слова. А вам медальон и немного дорожных денег. Сегодня брат снова пришёл домой. Пожалуй, впервые я могу отдать его вещь и не почувствовать, что у меня что-то забрали.']
  ],[choice('go','Его имя останется в книге.')]),
  orin_forge:dialogue('orin_forge','orin_village','Сталь не врёт за хозяина',[
    ['Орин','Если пришёл точить меч — поставь на стол. Если пришёл точить совесть — становись в очередь, перед тобой половина слободы. А, знак печатей. После монастыря? Дай посмотреть.'],
    ['Иона','Нам нужен знак, который пропустит к водоводу. Вот исходная запись.'],
    ['Орин','Вижу. В форму впаяли лишнюю перемычку. Снаружи солнце как солнце, внутри замкнутый круг. Разрежу здесь — старые механизмы узнают исходный рисунок. Бесплатно. Не делай такого лица, рыцарь: я беру за труд, а не за участие в исправлении собственной ошибки. Такие перемычки когда-то вышли из моей мастерской.']
  ],[
    choice('repair','Исправь знак по подлинному листу.',{seal_repaired:true},{requiresFlags:['monastery_evidence'],next:'orin_repair'}),
    choice('accounts','Что за очередь к твоей совести?',{accounts_quest_started:true},{next:'orin_accounts_offer'}),
    choice('return','Я нашёл весовую книгу.',{}, {requiresFlags:['accounts_found'],forbidFlags:['accounts_quest_done'],next:'orin_accounts_return'}),
    choice('shop','Посмотрим припасы.')
  ]),
  orin_repair:dialogue('orin_repair','orin_village','Незамкнутый круг',[
    ['Орин','Готово. Маленький зазор, а знак уже другой. Хорошая сталь терпит исправления. Люди часто делают вид, что не могут. Покажи Вельде и возьми Радана: он узнает крепостные команды раньше, чем они ударят вам в спину.'],
    ['Алар','Ты знал, для чего перемычки?'],
    ['Орин','Нет. И старательно не спрашивал. Разница, конечно, есть, но на хлеб её не намажешь. Если дойдёте до каменоломни, найдите весовую книгу в будке. За пустые вагонетки платили как за полные. За полные людям платили как за пустые. Там и начинается моя очередь.']
  ],[choice('go','Сначала совет у колодца.')]),
  orin_accounts_offer:dialogue('orin_accounts_offer','orin_village','Честная мера',[
    ['Орин','Восьмая смена добывала руду для этих знаков. Накладные сходились слишком красиво. Я поверил цифрам: железо пришло, заказ закрыт. Потом увидел руки парня, которому по книге полагалось отдыхать третью неделю. Парень не помнил ни смены, ни платы. Только держал пустой кошелёк.'],
    ['Алар','Чего ты хочешь от книги?'],
    ['Орин','Выяснить настоящую долю каждого. Не сжечь, не спрятать, не заменить благотворительным вздохом. Весовая будка стоит на восточном уступе. Принеси книгу целиком. Удобные страницы я уже умею выбирать. Теперь хочу научиться читать остальные.']
  ],[
    choice('return','Книга уже здесь.',{}, {requiresFlags:['accounts_found'],forbidFlags:['accounts_quest_done'],next:'orin_accounts_return'}),
    choice('go','Загляну в весовую будку.',{accounts_quest_started:true})
  ]),
  orin_accounts_return:dialogue('orin_accounts_return','orin_village','Долг кузницы',[
    ['Орин','Так и есть. Четыре меры руды, две меры оплаты, остальное записано как «снятая тяжесть». Работник платил ещё и за то, чтобы забыть, почему ему нечего есть. Какая аккуратная арифметика.'],
    ['Радан','Деньги сборной палаты ещё можно найти.'],
    ['Орин','Можно. Но пока ищем, у семей заканчивается мука. У меня есть запас и инструмент. Я готов выдать свою часть сейчас. Только решите со мной: объявим весь счёт публично, чтобы никто не спрятал остаток, или сперва тихо разнесём доли, не выдавая имена пострадавших? За меня решать не надо. За тех, кто не может прийти, кто-то всё-таки должен постоять.']
  ],[
    choice('open','Объявим суммы. Имена — только с разрешения.',{accounts_quest_started:true,accounts_quest_done:true,accounts_public:true},{gold:30,next:'orin_accounts_end'}),
    choice('quiet','Сначала еда и доли семьям.',{accounts_quest_started:true,accounts_quest_done:true,accounts_shelter:true},{items:[loot('travel_stew',2)],next:'orin_accounts_end'})
  ]),
  orin_accounts_end:dialogue('orin_accounts_end','orin_village','Новая мера',[
    ['Орин','Сделаем. А копьё забирай. Я выправил его не для парада. У Радана руки ещё помнят строй, хотя сам он делает вид, что просто случайно стоит поперёк любой опасной двери.'],
    ['Алар','Задолженность не станет меньше от подарка нам.'],
    ['Орин','Это не в счёт долга. Книга остаётся открытой. Копьё — в счёт дороги, по которой однажды снова пойдут нормальные телеги. Торговцы станут спорить о цене, дети воровать яблоки, я ругаться на плохую руду. Хочется хоть раз получить именно такую скучную награду.']
  ],[choice('go','Вернём дорогу телегам.')]),
  radan_first:dialogue('radan_first','radan_village','Человек у восточной дороги',[
    ['Радан','Нет, я не караулю. Здесь сухо и видно тропу. Копьё тоже просто стоит рядом, чтобы не упало. Можете закончить улыбаться. Иона, ты опять нашла вещь, которая обещала быть безопасной?'],
    ['Иона','На этот раз рыцаря. Обещаний он ещё не давал.'],
    ['Алар','Мы ищем источник сборов. Нужен человек, знающий крепость.'],
    ['Радан','Я командовал её малой заставой. Во время паводка Даган удержал затвор. Спас поля, но велел закрыть нижний проход. Я выполнил. За проходом остались люди. Потом нам предложили колокол, чтобы можно было спать. Я отказался. С тех пор прекрасно знаю дорогу и скверно — сон. Если возьмёте, не просите считать прежний приказ оправданным только потому, что я полезен сейчас.']
  ],[
    choice('honest','Мне нужен твой опыт. Правду мы не спрячем.',{radan_joined:true,radan_truth:true},{recruit:'radan',next:'radan_join'}),
    choice('mercy','Пойдём. Сделанное можно исправлять дальше.',{radan_joined:true,radan_mercy:true},{recruit:'radan',next:'radan_join'})
  ]),
  radan_join:dialogue('radan_join','radan_village','Место в строю',[
    ['Радан','Тогда я беру задний край. Молодые всегда хотят идти впереди. Пусть хоть кто-то замечает, что остаётся за спиной. В бою скажу «щиты» — берегите дыхание и готовьтесь принять удар. Скажу «дуга» — дайте копью место.'],
    ['Алар','У нас ещё нет строя.'],
    ['Радан','Значит, не будем портить готовый. К Вельде я пойду. Но сначала Орин пусть исправит твой знак. Крепостные машины не любят новых гербов. Они любят старый правильный рисунок. Редкая черта, в которой я с машинами совершенно согласен.']
  ],[choice('go','Пойдём к кузнице.')]),
  radan_after:dialogue('radan_after','radan_village','Последний взгляд на дорогу',[
    ['Радан','Я проверил ремни. И твои тоже, пока ты говорил с кузнецом. Нет, это не недоверие. Ремень не становится прочнее от хорошего характера владельца.'],
    ['Алар','Ты оставляешь дом?'],
    ['Радан','У меня тут скамья, крыша и соседи, которые не спрашивают лишнего. Домом это стало не сразу. Потому и пойду: если сбор продолжится, однажды я не вспомню, почему хочу вернуться. Иона уже знает дорогу в лес. Вельда даст поручение, когда увидит исправленный знак. Давай начнём с малого и выполним хоть одно обещание по порядку.']
  ],[choice('go','Совет ещё ждёт.')]),
  nara_village:dialogue('nara_village','nara_village','Лекарство и память',[
    ['Нара','Ссадину вижу, гордость не лечу, плату беру после того, как человек перестанет шататься. Что у вас? Звон в голове? Тогда садиться необязательно: всё равно лекарство пока не придумано.'],
    ['Иона','У людей пропадают воспоминания.'],
    ['Нара','Не все. Боль уходит охотно. А вместе с ней запах кухни, имя спасателя, причина не подходить к обрыву. Я записываю каждую перемену. Аббатство прислало бланки «улучшения состояния». Пришлось писать поперёк граф. Лея в лесу ищет смолу для согревающих повязок. Если встретите, скажите: спор об отварах я ещё не закончила. Для моих больных нужны серебряные болотницы из топей. Там прохладная вода, они сохраняют ясность настоя.']
  ],[
    choice('quest','Соберём цветы для твоих больных.',{lilies_quest_started:true},{next:'nara_lilies_offer'}),
    choice('return','Болотницы найдены.',{}, {requiresFlags:['lilies_found'],forbidFlags:['lilies_quest_done'],next:'nara_lilies_return'}),
    choice('shop','Нужны дорожные лекарства.')
  ]),
  nara_lilies_offer:dialogue('nara_lilies_offer','nara_village','Три чашки лекарства',[
    ['Нара','Не срывайте весь куст. Три цветка с разных стеблей, корни в воде. Мне нужны три чашки лекарства, а не победа над болотной растительностью. Растут на западном тихом берегу, в стороне от огней.'],
    ['Лея','Я помню рецепт.'],
    ['Нара','Ты помнишь половину и добавляешь мёд. Это вкусно, но не всегда необходимо. Простите, профессиональный спор. Принесите цветы мне: до открытия архива я в слободе, потом выйду с лекарствами к полям. Больные не обязаны ждать окончания вашего большого дела, чтобы получить своё маленькое облегчение.']
  ],[choice('go','Оставим корни в воде.',{lilies_quest_started:true})]),
  nara_lilies_return:dialogue('nara_lilies_return','nara_village','Ясный настой',[
    ['Нара','Свежие, не примятые. Значит, хоть кто-то слушает первую половину моих наставлений. Этого хватит детям и старику у печи. Он не вспомнил лицо сына, но помнит, как тому не нравилась горечь. Попросил добавить мёд. Лея, считай, один спор ты выиграла.'],
    ['Алар','Настой вернёт память?'],
    ['Нара','Нет. Он позволит спокойно выслушать того, кто поможет вспомнить. Не каждое лекарство должно быть чудом. Возьмите соль пробуждения и эфир. Когда кто-то упадёт рядом с вами, у него должно быть право подняться ещё до того, как вы придумаете красивую речь.']
  ],[choice('finish','Передать цветы лечебнице.',{lilies_quest_started:true,lilies_quest_done:true})]),
  village_memorial:dialogue('village_memorial','velda_village','Доска у колодца',[
    ['Алар','Одни имена выжжены, другие написаны углём. Под некоторыми оставлено место.'],
    ['Радан','Доска тех, кого перестали помнить. Не мёртвых. Живые тоже могут остаться без имени в чужой голове. Уголь стирают, когда человека узнают снова. Выжженные строки ждут дольше.'],
    ['Иона','Здесь нет общего заглавия.'],
    ['Радан','Вельда запретила. Не хотела выбирать для всех, каким словом назвать потерю. Раз в неделю приносят воду и читают доску вслух. Иногда кто-то возражает против прозвища, иногда вспоминает голос. Было бы смешно, если бы я умел смеяться над такими вещами: самая упрямая оборона слободы держится на неправильных буквах и ведре воды.']
  ],[choice('read','Прочитать имена вслух.')]),
  camp_village:dialogue('camp_village','radan_village','Общий очаг',[
    ['Радан','У этого очага не спрашивают, кто заплатил за дрова. Зато заставляют подбросить полено перед уходом. Очень разумный закон. Жаль, до крепости он не добрался.'],
    ['Иона','Если вернём людям воспоминания разом, они могут не выдержать.'],
    ['Алар','Значит, им снова кто-то должен решать, сколько знать?'],
    ['Радан','Вот для этого и нужен круг. Говорить всем долго, шумно, неудобно. Зато потом трудно притвориться, будто никто не возражал. Сейчас наша ближайшая задача проще: Орин чинит знак, я иду с вами, Вельда даёт поручение. Отдохнём — и пройдём эти три шага, не сочиняя финал раньше дороги.']
  ],[choice('rest','Подбросить полено и отдохнуть.')]),

  leia_first:dialogue('leia_first','leia_wood','Ленты на ветвях',[
    ['Лея','По белым лентам ходить можно, под красными не стойте. Там сухие сучья. Нет, цвет не значит, что я благословила дерево умереть: просто другой ткани не было. Подайте сумку, пожалуйста.'],
    ['Алар','Нара сказала, ты ищешь смолу.'],
    ['Лея','И нашла бы быстрее, если бы корни не научились хватать людей. Печати гонят жар через старый водовод. Дерево принимает его за весну и растёт в железо. Можно всё сжечь. Можно найти чашу и снять лишнее. Второй способ медленнее, зато после нас останется лес.'],
    ['Иона','Нам как раз нужен источник тока. Пойдёшь с нами?'],
    ['Лея','Я ушла из ордена, потому что там помощь требовала правильного знака на двери. С вами тоже будет условие?'],
    ['Алар','Помогаем тому, кому нужна помощь.'],
    ['Лея','Тогда место для моей сумки найдётся. Для наставлений тоже придётся найти.']
  ],[
    choice('join','Найдётся. Добро пожаловать.',{leia_joined:true,leia_freecare:true},{recruit:'leia',next:'leia_join'})
  ]),
  leia_join:dialogue('leia_join','leia_wood','Место для четвёртого',[
    ['Лея','Я не умею делать человека неуязвимым. Умею закрыть рану, вернуть дыхание, вовремя рассердиться. Если скажу «назад», не стойте из вежливости. Даже очень благородная смерть мешает перевязке.'],
    ['Радан','С ветеранами у тебя будет трудно.'],
    ['Лея','Я заметила, ты уже прячешь больную ногу за здоровую. Дойдём до огня — посмотрю. А сейчас к чаше водовода в центре леса. Там золотая смола, по ней увидим направление тока. Потом Мирель у северного склона покажет спуск. Только не называйте её проводницей. Она говорит, что водит людей лес, а она всего лишь не даёт им спорить с каждым деревом.']
  ],[choice('go','К смоляной чаше.')]),
  leia_after:dialogue('leia_after','leia_wood','Белая лента',[
    ['Лея','На этой ветке оставлю последнюю белую ленту. Пусть следующие знают, что здесь можно остановиться. Нам тоже можно — я не выдаю исцеление только за скорость.'],
    ['Алар','Ты уверена насчёт дороги?'],
    ['Лея','Нет. Насчёт людей чуть больше. Радан молча переложил самые тяжёлые склянки к себе. Иона трижды спросила, можно ли трогать мои травы, и один раз дождалась ответа. Ты не пообещал вылечить мир до ужина. Неплохое начало. Теперь добудем смолу и уговорим корни отдать водовод. Мирель ждёт там, где лес становится каменистым.']
  ],[choice('go','Продолжим вместе.')]),
  mirel_first:dialogue('mirel_first','mirel_wood','Лес не обязан молчать',[
    ['Мирель','Четверо на одной тропе. Лес, конечно, большой, но вы стараетесь. Лея, твоя лента спасла мою ногу. Следующую повесь чуть выше: лисица решила, что подарок ей.'],
    ['Алар','Нужен спуск в каменоломню.'],
    ['Мирель','Нужен всем, кто приходит с мечом. Обратно почему-то спрашивают родник. Спуск открою, когда водовод перестанет пугать зверей. Достаньте золотую смолу из чаши, остановите корневого хранителя. Не ради моего разрешения: иначе склон будет дёргаться под ногами. И у меня есть просьба без большого подвига. Кто-то наставил железных петель к западу отсюда. Снимите их тихо. Не всё, что попалось в чужую ловушку, должно услышать ещё и ваш победный крик.']
  ],[
    choice('traps','Покажи, как снять петли.',{traps_quest_started:true},{next:'mirel_traps_offer'}),
    choice('return','Тропа свободна от петель.',{}, {requiresFlags:['traps_opened'],forbidFlags:['traps_quest_done'],next:'mirel_traps_return'}),
    choice('go','Добудем смолу и остановим хранителя.')
  ]),
  mirel_pass:dialogue('mirel_pass','mirel_wood','Смола и камень',[
    ['Мирель','Вот теперь слышу лес. Не тишину — лес. Птицы спорят, мышь скребётся, где-то падает то, что давно должно было упасть. Вы принесли смолу?'],
    ['Иона','Она тянется к каменоломне, словно к магниту.'],
    ['Мирель','Значит, под рельсами ещё живёт старый водовод. Держитесь правой стороны спуска. Слева красивый мох, под ним пустота. Лио полез туда искать пропавший жетон отца и не вернулся к ужину. Если увидите мальчишку, скажите, что я очень зла. Это у нас означает «жива ли твоя голова».'],
    ['Лея','У тебя своеобразный язык заботы.'],
    ['Мирель','Зато короткий. Берегите склон. Камень не виноват, что людям понадобилось забыть его вес.']
  ],[
    choice('open','Покажи безопасный спуск.',{forest_pass:true},{next:'mirel_after'})
  ]),
  mirel_after:dialogue('mirel_after','mirel_wood','У развилки',[
    ['Мирель','На развилке выбирайте камень с белой жилой. Он похож на кривой палец, если смотреть правильно, и на другой кривой палец, если неправильно. Радан разберётся. У ветеранов особая дружба с невнятными указателями.'],
    ['Радан','Указатель достаточный.'],
    ['Мирель','Вот. А мне оставьте лес и петли. Если снимете последние, зайдите: я хочу знать, что лисица больше не хромает из-за человеческой жадности. Нет, я не собираюсь платить за каждую спасённую лапу. Я подарю знак тому, кто умеет пройти и не потребовать, чтобы весь мир уступил ему дорогу.']
  ],[
    choice('traps','Расскажи о петлях.',{traps_quest_started:true},{next:'mirel_traps_offer'}),
    choice('return','Петли сняты тихо.',{}, {requiresFlags:['traps_opened'],forbidFlags:['traps_quest_done'],next:'mirel_traps_return'}),
    choice('go','До встречи у лесной тропы.')
  ]),
  mirel_traps_offer:dialogue('mirel_traps_offer','mirel_wood','След без капкана',[
    ['Мирель','Три верёвки. Одна душит, вторая звонит, третья держит ветку. Не берись за ту, что легче тянется. Поддержи ветку и перережь саму петлю. Тогда капкан умрёт, не созвав своих хозяев.'],
    ['Иона','Откуда у охотников такие колокольчики?'],
    ['Мирель','Из старых сборных палочек. Покупают у дорожных воришек. Раньше они звали людей на службу, теперь зовут к добыче. Вещи быстро учатся дурным привычкам своих владельцев. Найдёте петли на западной звериной тропе. И не несите мне шкуру в доказательство. Пустая ловушка доказывает всё, что мне нужно.']
  ],[choice('go','Пустой ловушки будет достаточно.',{traps_quest_started:true})]),
  mirel_traps_return:dialogue('mirel_traps_return','mirel_wood','Пустая петля',[
    ['Мирель','Лисица прошла к ручью. Всё ещё хромает, но уже ругается на меня, значит, дело поправимое. Возьмите мой знак. Он не делает вас охотниками. Просто лесные жители будут знать: вы умеете иногда убрать руки.'],
    ['Алар','Хозяева вернутся?'],
    ['Мирель','Вернутся — поговорю. Я умею быть убедительной без трофеев. А если спросите, зачем спасать одного зверя, когда целая слобода теряет память, отвечу заранее: я не хочу ждать конца большой беды, чтобы перестать причинять маленькую. Идите. До каменоломни ещё достаточно дороги, на которой можно сделать что-нибудь разумное.']
  ],[choice('finish','Принять знак свободной тропы.',{traps_quest_started:true,traps_quest_done:true})]),
  forest_resin:dialogue('forest_resin','leia_wood','Тепло в живой коре',[
    ['Лея','Не режь глубоко. Дерево не сосуд, который удобно опустошить. Нам хватит того, что уже вытекло. Видишь золотую нить? Ток идёт из каменоломни и возвращается к большому колоколу. Монастырь был лишь узлом.'],
    ['Иона','На чаше написано «согревать добровольно отданное». Опять то же слово.'],
    ['Лея','Добровольное не значит вечное. Человек может попросить обезболить рану. Это не разрешение отрезать ему руку, чтобы больше не болела. Возьмём три капли для следа и повязок. Корневой хранитель впереди защищает не лес, а чужую команду внутри железа. После него сможем поговорить с Мирель о спуске.']
  ],[choice('take','Собрать вытекшую смолу.')]),
  forest_slate:dialogue('forest_slate','iona_monastery','Карта под корой',[
    ['Иона','Детский рисунок поверх инженерной схемы. Кто-то дорисовал плотине усы, а колоколу огромные ноги. Под рисунком целы стрелки: каменоломня, топи, архив, поля, затвор, аббатство. Долгий путь, зато хотя бы не лестница, ведущая прямо к разгадке.'],
    ['Радан','Водовод строили для паводка. По нему сбрасывали давление в накопительные чаши.'],
    ['Иона','Потом стали сбрасывать чужую тяжесть. Механизм похож, цель другая. Вот маленькая рука возле архива: «здесь мама». Схему можно было сделать заново. Рисунок оставили. Значит, кто-то из инженеров тоже не считал память лишней деталью.']
  ],[choice('read','Запомнить путь водовода.')]),
  camp_forest:dialogue('camp_forest','leia_wood','Четыре миски',[
    ['Лея','Миски четыре. Радан, если скажешь, что не голоден, я всё равно положу. А потом заставлю объяснять детям, почему взрослые лгут перед кашей.'],
    ['Радан','Угроза принята.'],
    ['Иона','Мы всё время говорим о добровольном согласии. Но если боль такая, что человек согласится на что угодно?'],
    ['Лея','Тогда сначала уменьшают боль, дают воду, остаются рядом. И спрашивают снова позже. Согласие должно выдерживать утро.'],
    ['Алар','Наше тоже.'],
    ['Лея','Наше тоже. Завтра можно сказать, что страшно, устал или передумал. Я лучше перевяжу отступившего друга, чем похороню верного клятве незнакомца. Ближайшая цель — Мирель и спуск. До аббатства успеем поспорить ещё не раз.']
  ],[choice('rest','Разделить ужин.')]),

  lio_trapped:dialogue('lio_trapped','lio_quarry','Голос из клети',[
    ['Лио','Эй! Я не приманка. И не призрак. Если не верите, спросите что-нибудь скучное: призраки скучное не знают. Например, сколько Орин просит за починку дверной петли. Слишком много, вот сколько!'],
    ['Радан','Почему ты в грузовой клети?'],
    ['Лио','Искал отцовский жетон. Доска сказала, что смена ещё идёт. Я дёрнул рукоять, надсмотрщик решил, что я новый работник. Теперь караулит выход. Жетонная доска у входа — от неё команда. Прочтите смену, потом разбейте надсмотрщика. Только не бейте по тросу. У меня и так важный опыт общения с высотой.']
  ],[choice('go','Мы освободим проход к клети.')]),
  lio_rescued:dialogue('lio_rescued','lio_quarry','Жетон вместо подписи',[
    ['Лио','Я спустился! То есть правильно спустился, не как мешок. Спасибо. Мирель злится? Если очень, значит, ещё не успела испугаться. Или уже успела. С ней трудно.'],
    ['Алар','Нашёл жетон отца?'],
    ['Лио','Нашёл двенадцать. Все с одинаковой восьмёркой. На обратной стороне не имя, а выемка для печати. Отец вернулся после смены, но перестал свистеть нашу песню. Я думал, если принесу правильную вещь, он вспомнит.'],
    ['Лея','Вещь поможет начать разговор. Не заменит его.'],
    ['Лио','Тогда возьму один и спрошу, хочет ли он слушать. А вы поговорите с Тереном на сухом уступе. Он помнит, когда здесь считали людей, а не вес тишины. И, пожалуйста, скажите Мирель, что я очень разумно испугался. Это почти правда.']
  ],[choice('go','Возвращайся по белой жиле.')]),
  teren_first:dialogue('teren_first','teren_quarry','Память каменоломни',[
    ['Терен','Слышите? Между стуком цепей есть пауза. Раньше в ней рабочие ругались. Ничего возвышенного: хлеб чёрствый, бригадир жадный, сапоги промокли. Когда исчезли ругательства, я понял, что случилось худшее.'],
    ['Алар','Нам сказали, ты помнишь старый паводок.'],
    ['Терен','Помню воду до окон и тех, кого вытащили на крышу. Тогда Эльда принесла первый колокол. Люди сами отдали ему ночные крики. На следующий день смогли чинить плотину. Через год казначей придумал: если тяжесть можно снять с человека, её можно записать как уплату. Через два перестали спрашивать. Я ушёл, когда понял, что моя работа — подтверждать отсутствие жалоб.'],
    ['Радан','Ты можешь показать, где изменили закон?'],
    ['Терен','В архиве остался первоначальный договор. Освободите сперва мальчика. Свидетелю трудно рассуждать о прошлом, пока рядом запирают будущее.']
  ],[
    choice('testify','Лио свободен. Дай нам своё свидетельство.',{quarry_testimony:true},{requiresFlags:['quarry_rescue'],next:'teren_testimony'}),
    choice('lantern','Почему ты живёшь на этом уступе?',{lantern_quest_started:true},{next:'teren_lantern_offer'}),
    choice('go','Сначала освободим Лио.')
  ]),
  teren_testimony:dialogue('teren_testimony','teren_quarry','Первый договор',[
    ['Терен','Записывай, Иона. Я, Терен, бывший мерщик восьмой артели, видел подмену личного согласия рабочим жетоном. Возражал один раз, потом замолчал на три года. Это тоже запиши. Свидетельство без неудобного места слишком легко превратить в новую печать.'],
    ['Иона','Записала.'],
    ['Терен','Подъёмник к топям работает, если запускать с пустой клетью на фиксаторе. Надпись цела. На переправе Герд. Он брал людей в долгую воду ещё до строительства архива. Не платите ему обещанием, что всё станет как раньше. Раньше тоже умели закрывать двери перед теми, кто стучал снизу. Лучше покажите, что умеете слушать сейчас.']
  ],[choice('go','Свидетельство останется целым.')]),
  teren_after:dialogue('teren_after','teren_quarry','Не только старый грех',[
    ['Терен','Моё свидетельство у вас. Осталось сделать так, чтобы оно пригодилось живым. Не надо ставить меня в первую строку как мудреца, который всё понял. Мудрость, три года сидевшая на уступе, не заслужила такого удобного заглавия.'],
    ['Лея','Ты сохранил первоначальный договор в памяти. Это важно.'],
    ['Терен','Важно ещё спуститься к людям. Я попробую. Но сперва фонарь из старой вагонетки: маленькая вещь, на которую всё время не хватает больших сил. Если разобьёте её гул и принесёте фонарь, у моей прогулки в слободу будет хотя бы ясная причина.']
  ],[
    choice('offer','Расскажи о фонаре.',{lantern_quest_started:true},{next:'teren_lantern_offer'}),
    choice('return','Фонарь больше не держит чужой гул.',{}, {requiresFlags:['lantern_found'],forbidFlags:['lantern_quest_done'],next:'teren_lantern_return'}),
    choice('go','К переправе Герда.')
  ]),
  teren_lantern_offer:dialogue('teren_lantern_offer','teren_quarry','Фонарь без имени',[
    ['Терен','В западной вагонетке фонарь восьмой смены. Его зажигали, когда все вышли из забоя. Однажды он горел при пустой площадке. Я понял, что механизм считает завершением не возвращение людей, а сдачу их жетонов. После этого перестал его зажигать.'],
    ['Алар','И хочешь начать снова?'],
    ['Терен','Хочу принести к колодцу и спросить, кому светить первым. В вагонетке держится тяжёлое эхо. Разбейте его, потом осторожно снимите фонарь. Там треснувшее стекло. Я могу долго рассуждать о вине, но не умею чинить простое стекло. Приятно хоть в чём-то оставаться обыкновенным стариком.']
  ],[choice('go','Осмотрим западную вагонетку.',{lantern_quest_started:true})]),
  teren_lantern_return:dialogue('teren_lantern_return','teren_quarry','Огонь для возвращения',[
    ['Терен','Стекло цело? Почти. Этого достаточно. Не для прошлого — для дороги. Я спущусь в слободу и зажгу фонарь, когда Лио вернётся домой. Потом попрошу его отца научить меня забытой песне. Вдруг он захочет сочинить новую.'],
    ['Радан','Старую можно помнить и без песни.'],
    ['Терен','Да. И не каждому надо петь ради чужого утешения. Возьмите малый колокольный язык. Он больше не удерживает голос, зато защищает от тяжёлого звона. Когда дойдёте до Эльды, скажите: я помню первый день, когда она помогала. И все дни, когда перестала спрашивать. Пусть обе части дойдут вместе.']
  ],[choice('finish','Передадим обе части.',{lantern_quest_started:true,lantern_quest_done:true})]),
  quarry_tokens:dialogue('quarry_tokens','lio_quarry','Двенадцать восьмёрок',[
    ['Иона','Двенадцать крючков, двенадцать одинаковых жетонов. Команда над доской: «Смена окончена по сдаче знаков». А ниже стёртое: «После переклички людей».'],
    ['Радан','Жетон проще предъявить, чем человека. Не возражает, не болеет, не просит увидеть семью.'],
    ['Алар','Под одним крючком свежая царапина.'],
    ['Лея','Лио пытался достать верхний ряд. Возьмём сломанный жетон, чтобы разомкнуть приказ. Надсмотрщик у клети теперь узнает, что смену проверяют. Нам он не обрадуется. Но у мальчика появится путь наружу, если мы удержим его подальше от троса. Сначала люди. Перекличку стоит вернуть хотя бы так.']
  ],[choice('take','Прочесть имена и взять сломанный жетон.')]),
  quarry_accounts:dialogue('quarry_accounts','orin_village','Весовая будка',[
    ['Иона','В книге две линейки. По одной измеряли руду, по другой труд. Вторая каждый месяц становилась короче. И всё заверено одной печатью: будто металл и человеческое время можно подогнать одинаковым напильником.'],
    ['Алар','Орин хотел весь счёт.'],
    ['Радан','Тогда забираем целиком. Не выбираем лист, на котором кузнец выглядит лучше. Он сам просил научить его читать остальные.'],
    ['Лея','В ящике руда, а рядом пустой мешочек для платы. Возьмём образцы и книгу. Мешочек оставим на виду. Иногда честное пустое место рассказывает больше, чем правильно заполненная таблица. Вернёмся к Орину, когда дорога позволит.']
  ],[choice('take','Сохранить весовую книгу целиком.')]),
  quarry_lantern:dialogue('quarry_lantern','teren_quarry','Треснувшее стекло',[
    ['Алар','Гул исчез. Вагонетка стала просто старым железом.'],
    ['Лея','Не просто. Теперь она хотя бы не заставляет переживать чужую смену каждому, кто подойдёт. Вот фонарь. Фитиль сухой, стекло с трещиной, ручка ещё держит.'],
    ['Радан','Когда-то последнему рабочему доверяли зажечь его. Не начальнику. Тому, кто убедился, что за ним никто не остался.'],
    ['Иона','Это можно вернуть без древней магии и новой печати. Терен ждёт на уступе. Я заверну стекло в свой шарф. Если он опять начнёт говорить, что не заслуживает помочь, попросим просто подержать фонарь. С маленькой задачей иногда легче сдвинуться с места.']
  ],[choice('take','Унести фонарь к Терену.')]),
  camp_quarry:dialogue('camp_quarry','radan_village','Под каменным навесом',[
    ['Радан','Я знал людей восьмой смены. Не всех по имени. Это первое, что теперь вспоминаю: сколько раз считал строй и сколько раз не посмотрел в лица.'],
    ['Лея','Сегодня ты посмотрел на Лио. И придержал клеть, пока он слезал.'],
    ['Радан','Это не возвращает тех, кто был за затвором.'],
    ['Алар','Не возвращает. Но Лио не придётся становиться ещё одним.'],
    ['Иона','Можно оставить оба предложения рядом. Правда не обязана укладываться в одну строку. Терен дал свидетельство. Подъёмник ждёт правильного порядка: фиксатор, противовес, тормоз. После отдыха пойдём к топям. И Радан, покажи Леe ногу. Она уже смотрит тем взглядом, который опаснее любого надсмотрщика.']
  ],[choice('rest','Дать лекарке закончить перевязку.')]),

  gerd_first:dialogue('gerd_first','gerd_fen','Перевозчик считает берега',[
    ['Герд','Четверо. С сумками — пятеро, если считать сумку лекарки за разумное существо. Копьё внутрь лодки, благородство снаружи не свешивать. Хотя пока никуда не плывём.'],
    ['Алар','Мы заплатим.'],
    ['Герд','Деньги замечательные: тяжёлые, круглые, ко дну идут без возражений. Только путь они не показывают. Три чаши погасли, огни водят кругами, на дальней пристани сидит пассажир без имени. Однажды я взял его в лодку. Высадил на этом же берегу, только на день старше. С тех пор продаю не переправу, а надежду когда-нибудь её открыть. Нехорошая торговля, решил остановить.'],
    ['Иона','Восстановим чаши и освободим пристань.'],
    ['Герд','Тогда проплывёте. Не бесплатно: в обмен на то, что не заставите следующего начинать с той же беды.']
  ],[choice('agree','Сделаем переправу безопасной для всех.',{ferry_terms:true},{next:'gerd_wait'})]),
  gerd_wait:dialogue('gerd_wait','gerd_fen','Три огня до отплытия',[
    ['Герд','Чаши в центре мостков. Камень помнит берег, камыш показывает воду, причал — возвращение. Мой дед говорил это в стихах, но я забыл рифму и прекрасно плаваю. Читайте надпись, не придумывайте храбрость там, где нужна очерёдность.'],
    ['Алар','Пассажир был настоящим человеком?'],
    ['Герд','Был. Возможно, ещё есть. В этом худшее свойство удержанных голосов: пока не назовёшь имя, не поймёшь, кого ждёшь. На скамье у восточного рукава осталась его записка. Если будете рядом, гляньте. Только не обещайте родственникам того, чего не видели. Я уже наговорил достаточно утешительных слов вместо правды.']
  ],[
    choice('passenger','Попробуем узнать имя пассажира.',{passenger_quest_started:true},{next:'gerd_passenger_offer'}),
    choice('return','Мы прочли записку на скамье.',{}, {requiresFlags:['passenger_note_found'],forbidFlags:['passenger_quest_done'],next:'gerd_passenger_return'}),
    choice('go','Сначала зажжём чаши.')
  ]),
  gerd_crossing:dialogue('gerd_crossing','gerd_fen','Лодка больше не кружит',[
    ['Герд','Огни стоят ровно. И вода наконец течёт туда, куда собиралась всё это время. Лодку можно отвязать.'],
    ['Алар','На пристани остался голос в катушке. Мы освободили его.'],
    ['Герд','Заберите. Архив умеет читать такие вещи. Я — только слушать. Иногда этого довольно, но не в вашем деле. На другом берегу Северин. Человек, который прячет ключи по алфавиту и потом жалуется на беспорядок во вселенной. Скажите, я отвёз вас живыми. Он каждый год требует подтверждение, будто смерть стала хуже подделывать документы.'],
    ['Лея','А следующего перевезёшь?'],
    ['Герд','Да. Теперь цена обычная, а беда общая стала меньше. Хороший день для перевозчика.']
  ],[choice('cross','Открыть переправу к архиву.',{fen_crossing:true})]),
  gerd_after:dialogue('gerd_after','gerd_fen','Вода помнит направление',[
    ['Герд','Путь держится. Вернуться можете в любое время: слово «переправа» должно означать обе стороны. Я вынес сухие доски на причал, следующему не придётся прыгать прямо в грязь. Вот и вся моя великая работа на сегодня.'],
    ['Алар','О пассажире узнал что-нибудь?'],
    ['Герд','Только что человек редко исчезает целиком. Остаются узлы, записки, чужая привычка придвигать вторую кружку. Прочитаете записку на восточной скамье — заходите. Я хочу убрать её с дождя и наконец назвать хозяина правильно. К архиву держитесь дальнего причала. Северин любит посетителей меньше, чем книги, но это поправимо. Наверное.']
  ],[
    choice('offer','Займёмся запиской пассажира.',{passenger_quest_started:true},{next:'gerd_passenger_offer'}),
    choice('return','В записке осталось имя.',{}, {requiresFlags:['passenger_note_found'],forbidFlags:['passenger_quest_done'],next:'gerd_passenger_return'}),
    choice('go','Спасибо за обе стороны переправы.')
  ]),
  gerd_passenger_offer:dialogue('gerd_passenger_offer','gerd_fen','Последний пассажир',[
    ['Герд','Он пришёл с сухим хлебом и платой за двоих. Второго не было. Я спросил — ответил: «На обратном пути». Потом пропал в звоне. Может, ждал человека, может, собственное воспоминание. Записку я не трогал. Боялся узнать, что мог помочь иначе.'],
    ['Радан','Страх не пройдёт, если оставить бумагу мокнуть.'],
    ['Герд','Знаю. Потому прошу. Восточная скамья, где ива касается мостков. Если имя сохранилось, принесите мне его. Я не обещаю красивой истории в ответ. Только перестану называть его последним пассажиром, будто прежде него не было целой жизни.']
  ],[choice('go','Проверим скамью под ивой.',{passenger_quest_started:true})]),
  gerd_passenger_return:dialogue('gerd_passenger_return','gerd_fen','Сава, мастер лодок',[
    ['Алар','Его звали Сава. Он шёл в архив за записью жены. Ей вернули боль, но не узнавание. Он хотел попросить помощи, чтобы рассказать ей всё заново. Плата за двоих — чтобы вернуться вместе.'],
    ['Герд','Сава. Он чинил мне лодку, когда я был мальчишкой. Я помнил руки, а имя не связал. Звон не всё делает сам: мы ему ещё помогаем, когда торопимся мимо человека.'],
    ['Лея','Можно отнести записку домой. Не как обещание возвращения, как правду о его дороге.'],
    ['Герд','Отнесу. И жезл возьмите: Сава оставил его, чтобы не перегружать лодку. Теперь он послужит дороге, которую мы открыли вместе.']
  ],[
    choice('name','Запиши его имя на причале.',{passenger_quest_started:true,passenger_quest_done:true,passenger_public:true},{gold:15}),
    choice('home','Сперва отдай записку семье.',{passenger_quest_started:true,passenger_quest_done:true,passenger_home:true},{items:[loot('healing_draught',2)]})
  ]),
  fen_lilies:dialogue('fen_lilies','nara_village','Корни остаются',[
    ['Лея','Серебряная болотница. Три цветка, как просила Нара. Первый стебель молодой — его оставим. На втором и третьем достаточно зрелых чашечек. Радан, не надо заходить в воду по пояс ради самой красивой. Больным всё равно, насколько героически ты промок.'],
    ['Радан','Я ещё ничего не сделал.'],
    ['Лея','Поэтому и говорю заранее. Лепестки охлаждают настой, но не забирают человека из его дня. Нара хочет помочь больным слушать близких без боли. Это хорошая цель. Заверну цветы в мокрую ткань. Если вернёмся в слободу, передадим ей лично. Корни остаются в воде, следующая весна тоже кому-нибудь понадобится.']
  ],[choice('take','Собрать цветы, сохранив корни.')]),
  fen_passenger:dialogue('fen_passenger','gerd_fen','Записка под скамьёй',[
    ['Иона','«Сава, лодочный мастер. Если задержусь, скажите Мере: я помню наш дом за двоих, но хочу, чтобы мы снова спорили, какого цвета была дверь. Чёрствый хлеб у меня. Ей оставил свежий».'],
    ['Алар','Герд должен это прочитать.'],
    ['Лея','Да. Только не будем придумывать, где Сава теперь. Мы нашли намерение человека, не его конец. Иногда люди так хотят утешить, что крадут у другого возможность дождаться настоящего ответа.'],
    ['Радан','Сухой уголок сохранил подпись. Я запомню. Сава, мастер лодок. Когда бумаги нет под рукой, пусть останется хотя бы ещё один свидетель. Герд ждёт у причала.']
  ],[choice('keep','Сохранить записку и имя.')]),
  fen_voice:dialogue('fen_voice','iona_monastery','Катушка голоса',[
    ['Голос','…я согласен отдать страх воды. Не согласен забыть тех, кто остался под ней. Повторите последнюю строку. Последнюю…'],
    ['Иона','Слово застряло в приёмной катушке. Не человек, а свидетельство того, что его остановили на полуслове. Я запечатаю край, чтобы голос не повторялся в воде бесконечно.'],
    ['Алар','Мы слышали это в письме Вельды.'],
    ['Иона','Значит, есть два независимых следа. Если в архиве скажут, что брат старосты ошибался, ответит этот голос. Если назовут голос случайным эхом, у нас останется письмо. Я всегда любила хорошие ссылки в примечаниях. Сегодня впервые понимаю, почему за них стоило учиться.']
  ],[choice('take','Унести катушку в архив.')]),
  camp_fen:dialogue('camp_fen','gerd_fen','Остров, который не уходит',[
    ['Лея','Сухой остров. Уже роскошь. Снимайте мокрые вещи, пока не решили доказать сырости свою стойкость.'],
    ['Иона','Удержанный голос всё просил повторить последнюю строку. Думаю, я буду слышать это во сне.'],
    ['Радан','Попроси разбудить. В одиночку плохие сны кажутся приказами. При других людях они хотя бы становятся рассказом.'],
    ['Алар','Мы близко к первому договору.'],
    ['Иона','К бумаге — да. К ответу, что делать с колоколом, не знаю. Зато у нас уже есть право отказаться от удобной версии. Зажжём чаши, остановим эхо у пристани, вернёмся к Герду. Пусть ближайшая дорога будет короче мыслей о последней.']
  ],[choice('rest','Просушить плащи у огня.')]),

  severin_first:dialogue('severin_first','severin_archive','Посетители без записи',[
    ['Северин','Архив закрыт до проверки записей о причине закрытия. Не я придумал формулировку, но оценил её долговечность. Герд вас привёз? Значит, три чаши горят. Уже повод изменить одну карточку.'],
    ['Иона','У нас исходный лист монастырской книги и голос с переправы. Нужен первый договор.'],
    ['Северин','Первый договор существует в трёх экземплярах, из которых официально не сохранилось ни одного. Да, это значит, что я знаю, где они. Сначала объясните, что сделаете с именами. Приходили люди, которые хотели освободить всех сразу. Они начинали с публикации списка больных. Потом больные боялись выйти из дома.'],
    ['Алар','Покажем, что изменили в законе. О чужой боли люди скажут сами.'],
    ['Северин','Приемлемый ответ. Не безупречный, таких я перестал ждать. Читайте оригиналы. В каталоге ставьте событие раньше печати: только так машина найдёт книгу отказов.']
  ],[
    choice('read','Дай нам доступ к подлинникам.',{archive_admitted:true},{next:'severin_wait'})
  ]),
  severin_wait:dialogue('severin_wait','severin_archive','Порядок поиска',[
    ['Северин','Первоначальные согласия в западном нижнем шкафу. Поворотный каталог в центре. Сначала читайте, затем поворачивайте, потом спорьте с хранителем. Посетители обычно предпочитают обратное и оставляют очень выразительные пятна.'],
    ['Иона','Ты не мог остановить подмену?'],
    ['Северин','Мог вынести книгу. Выбрал спрятать и остаться рядом. Удобно называть это сохранением истины. Особенно человеку, который всё ещё получал жалованье. Поэтому я открою вам не только красивую страницу. Если хотите ещё одну неприятную историю, спросите о пометах на полях. Их автор сохранила больше правды, чем я, а имя у неё забрали первым.']
  ],[
    choice('name','Расскажи об авторе помет.',{name_quest_started:true},{next:'severin_name_offer'}),
    choice('return','Мы нашли соскобленное имя.',{}, {requiresFlags:['archive_name_found'],forbidFlags:['name_quest_done'],next:'severin_name_return'}),
    choice('go','Найдём книгу и повернём каталог.')
  ]),
  severin_truth:dialogue('severin_truth','severin_archive','Право отозвать согласие',[
    ['Северин','Вот первоначальный текст. «Принявший помощь сохраняет имя, свидетельство и право забрать отданную тяжесть в присутствии выбранного им человека». Не лекаря по назначению. Не сборщика. Выбранного человека.'],
    ['Иона','Позже графу отзыва покрыли золотой фольгой. Потом жетон заменил подпись.'],
    ['Северин','А невостребованную тяжесть стали передавать на укрепление затвора. Даган получил более устойчивую плотину. Казна — регулярную плату. Эльда — доказательство, что её помощь работает. Каждому досталась своя удобная часть. Людям осталась целая цена.'],
    ['Алар','Если выключить колокол, плотина рухнет?'],
    ['Северин','Нет. Камень держит воду, звон гасит резкие перепады. Без него нужен ручной караул и новый ремонт. Дороже и труднее, но возможно. Не позволяйте назвать удобство единственным способом спасения.'],
    ['Лея','Нужны свидетели, которые выберут, что вернуть.'],
    ['Северин','В полях Нара собирает людей после последнего сбора. Возьмите пустую книгу. Запишите сначала их согласие говорить. Только потом — рассказ.']
  ],[
    choice('take','Открой книгу живых свидетельств.',{archive_truth:true},{next:'severin_after'})
  ]),
  severin_after:dialogue('severin_after','severin_archive','Неудобный оригинал',[
    ['Северин','Сделаю копии. Одну в слободу, одну артели, одну оставлю на видном месте. Странное ощущение: истина станет менее защищённой и гораздо труднее уничтожимой. Пожалуй, я слишком долго путал эти вещи.'],
    ['Алар','Ты пойдёшь свидетельствовать?'],
    ['Северин','Да. С перечнем собственных подписей. Очень не люблю неправильно оформленные обвинения, особенно если обвиняемый я. Но прежде верните имя моей переписчице, если нашли его внизу. А потом к полям. Книга должна набраться живых голосов, иначе Даган увидит в ней лишь ещё одну причину закрыть ворота.']
  ],[
    choice('offer','О переписчице и пометах.',{name_quest_started:true},{next:'severin_name_offer'}),
    choice('return','Её имя сохранилось под соскобом.',{}, {requiresFlags:['archive_name_found'],forbidFlags:['name_quest_done'],next:'severin_name_return'}),
    choice('go','Отнесём книгу в поля.')
  ]),
  severin_name_offer:dialogue('severin_name_offer','severin_archive','Ошибка на полях',[
    ['Северин','Она ставила маленькие точки возле строк, где согласие записали без человека. Потом соединяла точки: получалась дорога к исходной записи. Я просил её быть осторожнее. Хорошая фраза, когда не хочешь говорить «я боюсь помочь».'],
    ['Иона','Ты не помнишь имя?'],
    ['Северин','Помню, что нарочно позволил себе не повторять его после выговора. Теперь не уверен, сколько сделал звон, а сколько я. Найдите помету в западном верхнем столе. Она укажет на нижнюю запись в восточном шкафу. Не придумывайте ей красивое прозвище, пока ищете. У неё было собственное имя. Этого должно хватать.']
  ],[choice('go','Пойдём по её точкам.',{name_quest_started:true})]),
  severin_name_return:dialogue('severin_name_return','severin_archive','Мара, дочь переплётчика',[
    ['Иона','Мара. Дочь переплётчика, принята в архив за точное чтение сложных подписей. Переведена в разряд безымянной помощи за «ошибку на полях». Ошибка была верной.'],
    ['Северин','Мара. Она поправляла мой почерк. Говорила, что буквам в моей фамилии тесно от важности. Я сердился. Очень хотелось сердиться на что-то маленькое.'],
    ['Лея','Можно начать с записи о ней. Вернуть должность и работу.'],
    ['Северин','И указать, кто подписал выговор. Я подпишу снова, на этот раз под своим именем. Кафтан из мастерской её семьи возьмите в дорогу. Он берёг рукава от чернил, вас, надеюсь, сбережёт от того, что ранит глубже. Только не называйте это расплатой. До неё мне ещё работать.']
  ],[
    choice('restore','Восстановить запись с подписью Северина.',{name_quest_started:true,name_quest_done:true,archive_accountable:true},{gold:15}),
    choice('honor','Сначала сохранить работу Мары отдельной книгой.',{name_quest_started:true,name_quest_done:true,archive_mara_honored:true},{items:[loot('ether_drop',2)]})
  ]),
  archive_catalogue:dialogue('archive_catalogue','severin_archive','Первое утро после воды',[
    ['Иона','В первой записи всего пять имён. Каждый оставил рядом имя человека, который должен присутствовать при возврате. У кого-то сосед, у кого-то сестра. Один написал «кого позову сам, когда смогу». Подпись Эльды под этим ответом. Она разрешила.'],
    ['Лея','Значит, начала с помощи.'],
    ['Радан','Это не делает продолжение безопаснее.'],
    ['Иона','Нет. Но позволяет не врать о начале. Позже появляется колонка пользы: сколько часов работал человек после снятия боли. Потом колонка долга. Потом подписи исчезают. Каталог искал по последнему правилу и возвращал лишь должников. Повернём его по первому: событие, свидетель, согласие. Тогда найдётся то, что не удалось вычеркнуть, — право сказать «хватит».']
  ],[choice('read','Сохранить исходный порядок.')]),
  archive_margin:dialogue('archive_margin','severin_archive','Дорога из точек',[
    ['Иона','На полях точки. Красные возле подменённых подписей, чёрные возле живых свидетелей. Это не шифр для избранных. Это инструкция тому, кто хотя бы раз решит читать внимательно.'],
    ['Алар','Точки ведут к нижней полке восточного шкафа.'],
    ['Иона','Да. Автор знала, что книгу могут объявить ошибочной, и спрятала не вывод, а дорогу к нему. Такое сложнее заменить готовой правдой. В конце маленькая приписка: «Не верьте мне на слово. Сверьте». Я бы хотела познакомиться с человеком, который написал это в учреждении, живущем приказом верить печати. Посмотрим нижнюю запись. Возможно, хотя бы имя сохранилось.']
  ],[choice('follow','Проследить путь к восточному шкафу.')]),
  archive_erasure:dialogue('archive_erasure','severin_archive','Имя под воском',[
    ['Алар','Поверх соскоба тонкий воск. Если греть ладонью, проступают буквы.'],
    ['Лея','Не ножом. Дай время.'],
    ['Иона','Мара. Рядом её работа: восстановлены девятнадцать несоответствий в согласиях, сохранены семь отзывов, выявлена замена личных подписей жетонами. А сверху «лишена имени за ошибку». Почерк взыскания — Северина.'],
    ['Радан','Понесём ему. Без удобного места.'],
    ['Иона','Сделаю копию воскового слепка. Мы не знаем, жива ли Мара и чего захочет от этой истории. Но архив может перестать повторять ложь уже сейчас. Это не отнимет у неё будущего выбора. И никто больше не должен искать её только по названию чужого наказания.']
  ],[choice('copy','Сохранить имя и работу Мары.')]),
  camp_archive:dialogue('camp_archive','iona_monastery','Слова, которые не согревают',[
    ['Иона','Я думала, когда найдём первый договор, станет ясно, кто прав. Теперь ясно только, сколько людей соглашались с разными частями неправды. Даже я хотела унести доказательство в академию. Чтобы правильно описать. Чтобы никто не мешал.'],
    ['Лея','Теперь хочешь иначе?'],
    ['Иона','Хочу оставить копии. И оригинал доступным тем, чьи имена внутри. Мне страшно: они могут прочесть не так, как я считаю правильным.'],
    ['Алар','Могут.'],
    ['Иона','Ужасно короткий ответ. Похоже, придётся с ним жить. Северин даст книгу свидетельств после хранителя. За северным выходом поля: там нужны вода и люди, а не ещё одна наша победная речь. Отдохнём. Даже неудобная правда завтра будет ждать.']
  ],[choice('rest','Посидеть у печки без спора.')]),

  nara_fields_first:dialogue('nara_fields_first','nara_fields','Лечебница между межами',[
    ['Нара','Вы добрались. Я вышла с обозом лекарств, а здесь вместо обоза люди с пустыми мешками. Сборщик забрал зерно и страх голода. Очень выгодный порядок: голод остаётся, жаловаться будто незачем.'],
    ['Лея','У нас договор и книга для тех, кто согласится свидетельствовать.'],
    ['Нара','Пусть сперва попьют. Водовод отдаёт воду крепостному рву, колодец сухой. Откройте каналы по порядку: людям, корням, мельнице. Потом уцелевшая полоса даст зерно. Сборщик всё ещё ходит кругами у дальней межи. Пока его команда действует, никто не поверит, что имеет право оставить сноп себе.'],
    ['Алар','Мы остановим его.'],
    ['Нара','Хорошо. А если останутся силы на дело без большого противника, амбару нужен целый полог. Искры с поля долетают до крыши. Хлеб на завтра имеет скверную привычку сгорать, пока все решают судьбу мира.']
  ],[
    choice('granary','Позаботимся об амбаре.',{granary_quest_started:true},{next:'nara_granary_offer'}),
    choice('return','Полог закреплён, искры погашены.',{}, {requiresFlags:['granary_secured'],forbidFlags:['granary_quest_done'],next:'nara_granary_return'}),
    choice('lilies','Вот серебряные болотницы.',{}, {requiresFlags:['lilies_found'],forbidFlags:['lilies_quest_done'],next:'nara_lilies_return'}),
    choice('herbs','Напомни о травах для больных.',{lilies_quest_started:true},{forbidFlags:['lilies_quest_done'],next:'nara_lilies_offer'}),
    choice('go','Сначала вода и уцелевшее зерно.')
  ]),
  nara_fields_witness:dialogue('nara_fields_witness','nara_fields','Не по одному',[
    ['Нара','Воду дали. Сноп оставили. Машина больше не требует плату. Теперь можно спрашивать о том, что страшно. Я объяснила людям: записываться необязательно, имя можно отозвать, помощь от этого не исчезнет. Сначала никто не подошёл. Потом пришла женщина, которая хотела записать только цвет двери своего дома.'],
    ['Иона','Я запишу.'],
    ['Нара','Запиши и то, что она не обязана объяснять, почему это важно. Потом подошёл её сосед. Потом ещё двое. Они пойдут к крепости вместе, если вы оставите дорогу безопасной. Даган привык видеть в толпе угрозу. Пусть попробует увидеть людей, которые несут собственные имена.'],
    ['Радан','Я поговорю с ним первым.'],
    ['Нара','Первым — можно. Единственным — нельзя. Вот книга. На последней странице свободное место и для вашего свидетельства.']
  ],[
    choice('names','Имена останутся у согласившихся говорить.',{field_witnesses:true,witnesses_protected:true},{items:[loot('healing_draught',2)],next:'nara_fields_after'}),
    choice('hearing','Созовём открытое слушание с правом отказаться.',{field_witnesses:true,witnesses_open_hearing:true},{gold:20,next:'nara_fields_after'})
  ]),
  nara_fields_after:dialogue('nara_fields_after','nara_fields','После первого снопа',[
    ['Нара','Люди начали спорить, кому чинить колесо. Прекрасный признак: вчера им было всё равно, куда уходит вода. Я передала лекарства помощницам в слободу, сама пока останусь здесь. Если несёте болотницы, отдайте мне: со следующим обозом больные получат готовый настой.'],
    ['Алар','Как пройти к крепости?'],
    ['Нара','У сборщиков карта на юго-восточной меже. На ней налоговые дороги, но виден и старый пешеходный ход. Даган скажет, что вы хотите погубить плотину. Не обзывайте его страх выдумкой: он видел настоящий паводок. Просто не отдавайте страху право командовать всем остальным. И про амбар не забудьте. Я намерена завтра кормить этих людей.']
  ],[
    choice('offer','О хлебе на завтра.',{granary_quest_started:true},{next:'nara_granary_offer'}),
    choice('return','Амбар защищён от искр.',{}, {requiresFlags:['granary_secured'],forbidFlags:['granary_quest_done'],next:'nara_granary_return'}),
    choice('lilies','Я принёс болотницы для лечебницы.',{}, {requiresFlags:['lilies_found'],forbidFlags:['lilies_quest_done'],next:'nara_lilies_return'}),
    choice('herbs','О серебряной болотнице.',{lilies_quest_started:true},{forbidFlags:['lilies_quest_done'],next:'nara_lilies_offer'}),
    choice('go','Найдём пешеходный ход.')
  ]),
  nara_granary_offer:dialogue('nara_granary_offer','nara_fields','Хлеб на завтра',[
    ['Нара','Амбар к западу, за низкой межой. Мешковина мокрая у колодца, верёвка на столбе. Прижмите тканью искры, потом закрепите полог. Не тащите зерно на дорогу: ветер разнесёт его быстрее, чем вы успеете гордиться трудолюбием.'],
    ['Лея','А щит на крыше?'],
    ['Нара','Затыкали дыру. Дыра осталась, добавилась тяжёлая вещь над головой. Снимите осторожно, не объявляйте сельчанам, что они всё делали неправильно. Люди закрывали амбар тем, что нашлось, пока их руки ещё помнили, зачем хранить зерно. После ваших больших выводов им жить здесь. Хорошо бы с целой крышей.']
  ],[choice('go','Закрепим полог без суеты.',{granary_quest_started:true})]),
  nara_granary_return:dialogue('nara_granary_return','nara_fields','Кому доверить запас',[
    ['Нара','Крыша цела, дым ушёл. Теперь самое трудное: зерно надо распределить, и каждый вспомнит, почему ему нужнее. Раньше сборщик избавлял от спора вместе с хлебом. Мы так больше не умеем и не станем учиться.'],
    ['Алар','Как ты предлагаешь?'],
    ['Нара','Первую меру лечебнице — согласились все. Остаток либо выдаём семьям сейчас по открытой мерке, либо храним общим запасом с двумя ключами. Мне ближе второе, но семейные старшие боятся нового «удержания ради безопасности». Вы помогли сохранить амбар. Скажите при них, какой порядок готовы защищать, когда начнутся неудобства. Я прослежу, чтобы решение пересмотрели через неделю.']
  ],[
    choice('families','Раздать семьям по открытой мерке.',{granary_quest_started:true,granary_quest_done:true,granary_families:true},{gold:20,next:'nara_granary_end'}),
    choice('common','Общий запас с двумя ключами и пересмотром.',{granary_quest_started:true,granary_quest_done:true,granary_common:true},{items:[loot('travel_stew',2)],next:'nara_granary_end'})
  ]),
  nara_granary_end:dialogue('nara_granary_end','nara_fields','Не вечное решение',[
    ['Нара','Договорились на неделю. Очень люблю эту часть: решение достаточно крепкое, чтобы начать, и недостаточно священное, чтобы запретить исправления. Берите плащ лечебницы. Его шили для того, кто понесёт лекарства по любой дороге. Сегодня это вы.'],
    ['Лея','Верну чистым.'],
    ['Нара','Вернись сама, плащ как получится. И запомните этот амбар перед разговором с Эльдой. Когда она скажет, что людям невозможно доверить общую беду, вспомните: они сумели обсудить хлеб, испугаться друг друга и всё-таки оставить ключи в живых руках. Без единого волшебного колокола.']
  ],[choice('go','Сохраним право пересмотреть решение.')]),
  field_harvest:dialogue('field_harvest','nara_fields','Зерно под ладонью',[
    ['Лея','Полоса ещё живая. Колосья лёгкие, зато полные. Не трогайте крайние: птицы тоже не знали, что их включили в чужой сбор.'],
    ['Алар','Берём мешок для людей у колодца.'],
    ['Радан','На меже знак машины: «Всё собранное принадлежит затвору». Ни слова о том, кто сеял.'],
    ['Иона','Сотру знак?'],
    ['Алар','Сперва остановим того, кто заставляет ему верить.'],
    ['Лея','А новый знак пусть поставят хозяева поля. Может, просто напишут: «Здесь растёт наш хлеб». Это тоже хорошее начало закона. Отнесём мешок Наре, когда сборщик больше не сможет его забрать. Тогда просьба рассказать о себе будет похожа на просьбу, а не новую плату за еду.']
  ],[choice('take','Собрать один мешок, оставив край поля.')]),
  field_route:dialogue('field_route','radan_village','Путь для ног, не для войска',[
    ['Радан','Вот крепость. Налоговый тракт ведёт под арбалеты. А здесь старый мостик к противовесам. По нему ходили ремонтники. Даган закрыл пешеходную створку, но главный затвор трогать не требуется.'],
    ['Иона','Значит, можно пройти и не спустить воду.'],
    ['Радан','Можно, если читать таблички. Удивительно, сколько крепостей надеется, что противник этого не умеет. Я помню распределитель: уравнять клети, закрыть русло, поднять малую створку. Сначала выслушаем коменданта. Потом покажем, что его опасность решаема без чужого молчания.'],
    ['Алар','Ты готов встретиться?'],
    ['Радан','Нет. Но путь найден, и люди идут за нами по собственной воле. Этого сегодня достаточно, чтобы не спрятаться за словом «позже».']
  ],[choice('go','Пойти пешеходным ходом.')]),
  camp_fields:dialogue('camp_fields','leia_wood','Завтрашний хлеб',[
    ['Иона','Мне казалось, правда должна сначала выйти из архива, потом изменить жизнь. Здесь всё наоборот: дали воду, оставили сноп — и люди решились говорить.'],
    ['Лея','Сытый человек не обязательно смелее. Просто у него чуть больше сил выбирать слова. Не превращай это в новую формулу, пожалуйста.'],
    ['Радан','Даган предложит спорить о плотине. Ему легче считать уровни воды, чем слушать то, что случилось за закрытым проходом. Я так делал.'],
    ['Алар','Ты скажешь ему?'],
    ['Радан','Скажу. И не стану просить других молчать, пока мы разбираемся по-солдатски. Нара собрала свидетелей. Найдём карту сборщиков, поднимемся к воротам. Завтра мы должны увидеть не только крепость, но и тех, кому она всё ещё нужна.']
  ],[choice('rest','Сохранить силы для встречи.')]),

  dagan_gate:dialogue('dagan_gate','dagan_gate','Перед плотиной',[
    ['Даган','Радан. Ты привёл к затвору рыцаря, учёную и лекарку. Осталось найти судью, чтобы каждый мог сказать, почему лучше меня понимает воду.'],
    ['Радан','Судья остался в монастыре. Без него разговор получится честнее.'],
    ['Алар','Сборы прекращаются. У нас первоначальный договор и живые свидетельства.'],
    ['Даган','У меня отметка паводка над вашими головами. Я стоял здесь, когда вода выгнула балки. Эльда дала плотине тишину между толчками. Люди пережили ночь. Теперь вы хотите вернуть всё разом и назвать последствия свободой?'],
    ['Иона','Камень держит воду. Звон лишь гасит перепады. Нужен ремонт и ручной караул.'],
    ['Даган','Ремонт требует рук. Руки требуют хлеба. Хлеб требует полей, которые я держу сухими. Разорвите этот круг, если умеете. Пешеходную створку открыть можно. Но одно неверное движение тронет русло. Я не отдам ключ за красивый ответ. Покажите, что способны пройти, не утопив тех, кого пришли спасать.']
  ],[
    choice('safety','Сохраним главный затвор и откроем малую створку.',{gate_terms:true,gate_safety_promised:true},{next:'dagan_wait'}),
    choice('account','Безопасность нужна всем. Ответить всё равно придётся.',{gate_terms:true,gate_accountability:true},{next:'dagan_wait'})
  ]),
  dagan_wait:dialogue('dagan_wait','dagan_gate','Створка и русло',[
    ['Даган','Распределитель во дворе. У каждой цепи табличка. Читайте внимательно: я не обязан повторять, когда вы решите, что страх — удел трусов.'],
    ['Радан','Страх был и у нас за нижним проходом. Только ты услышал свой раньше.'],
    ['Даган','Я слышал все крики. Именно поэтому затвор не открылся. Думаешь, от этого становится легче?'],
    ['Радан','Нет. Думаю, лёгкость никогда не давала тебе права заставлять молчать остальных.'],
    ['Даган','Откройте малую створку. Тогда поговорим внутри. И если потребуется бой, стойте дальше от цепей. Не хочу ещё одного человека поднимать из воды ради доказательства, что я снова оказался прав.']
  ],[choice('go','К распределителю противовесов.')]),
  dagan_defeated:dialogue('dagan_defeated','dagan_gate','Ключ коменданта',[
    ['Даган','Стой. Цепи целы?'],
    ['Иона','Целы. Главный затвор закрыт, малый проход открыт. Ни поле, ни слобода не пострадали.'],
    ['Даган','Вот и закончился мой единственный довод. Хотел бы сказать, что вы всё упростили. Но вы как раз оставили мне трудное: жить с тем, что другой путь был.'],
    ['Радан','Он не всегда был виден. Когда стал виден, мы продолжали делать вид, что его нет. Я тоже.'],
    ['Алар','Дай ключ к аббатству. Люди пришли вернуть свой голос.'],
    ['Даган','Дам. И выставлю ручной караул на ночь, если колокол остановится. Но решите, кем я буду после: пленником перед кругом или комендантом до смены караула. Не предлагаю прощение за пользу. Спрашиваю, как исполнить следующий приказ, когда прежний наконец перестал казаться вечным.']
  ],[
    choice('hearing','Сложи знак. Ответишь перед открытым кругом.',{warden_key:true,dagan_hearing:true},{gold:30,next:'dagan_after'}),
    choice('watch','Останься до смены караула, затем придёшь сам.',{warden_key:true,dagan_watch:true},{items:[loot('revival_salt',2)],next:'dagan_after'})
  ]),
  dagan_after:dialogue('dagan_after','dagan_gate','Последний приказ старого караула',[
    ['Даган','Ключ ваш. Мост к аббатству за северной стеной. Эльда ждёт не нападения. Она ждёт подтверждения, что всё ещё помогает. Не давайте ей удобной лжи, даже из милосердия. Я слишком долго получал именно её.'],
    ['Радан','Ты придёшь к нижнему проходу, когда будут читать имена?'],
    ['Даган','Приду. Не знаю, что скажу.'],
    ['Радан','Для начала ничего. Послушаешь.'],
    ['Даган','Хороший тяжёлый приказ. Стражам велю убрать арбалеты с дороги. Не все подчинятся сразу: в старом знаке больше привычки, чем стали. Я займусь теми, кого ещё могу остановить словами. Вы — колоколом. До ночного подъёма воды остаётся время на настоящую работу.']
  ],[choice('go','Через мост к аббатству.')]),
  fortress_order:dialogue('fortress_order','dagan_gate','Приказ о ночном сборе',[
    ['Иона','Приказ подписан Даганом: «Изъять избыток переживаний у семей нижнего берега. Жалобы направлять после стабилизации затвора». Даты стабилизации нет.'],
    ['Радан','Временный приказ. Самые долговечные обычно начинаются этим словом.'],
    ['Алар','Он понимал, что забирают?'],
    ['Радан','Понимал достаточно, чтобы не спрашивать точнее. Как и я, когда исполнял его команды. Сохраним приказ рядом с отчётом о спасённых полях. Если оставить только один документ, получим либо чудовище без причины, либо героя без цены. Нам нужны оба, чтобы следующий караул не выучил ту же ложь с другой стороны.']
  ],[choice('read','Сохранить приказ целиком.')]),
  fortress_names:dialogue('fortress_names','radan_village','Камень караулки',[
    ['Радан','Солдаты царапали имена перед сменой. Не по уставу: считалось, что от этого башня хуже держит обстрел. Башня выстояла, солдат не всех помню.'],
    ['Лея','Твоё имя здесь тоже.'],
    ['Радан','Да. Молодой был, вырезал глубоко, чтобы наверняка остаться. Теперь смотрю и хочу, чтобы рядом записали тех, кому я не открыл проход. Не поверх моего. Рядом.'],
    ['Алар','Когда вернёмся, найдём место.'],
    ['Радан','Не место — имена. Место в стене всегда находится. Это люди у нас почему-то всё время оказываются лишними. Пойдём. Даган ждёт не только нашего ответа, но и знакомого оправдания. Постараюсь не принести ему ни одного.']
  ],[choice('read','Запомнить незаполненное место рядом.')]),
  camp_fortress:dialogue('camp_fortress','radan_village','Те, кто останутся у воды',[
    ['Радан','Я представлял эту встречу много раз. В одних разговорах Даган признавал всё, в других я кричал, в третьих просто уходил. Ни в одном не было Ионы, объясняющей распределитель. Очень полезный недостаток моих фантазий.'],
    ['Иона','Я могу не объяснять в следующий раз.'],
    ['Радан','Объясняй. Иногда миру нужен человек с табличкой больше, чем человек с правильно накопленным гневом.'],
    ['Лея','После колокола кто-то должен остаться у воды. Не забывайте их, когда станем спорить о развязке.'],
    ['Алар','Даган выставит караул. Мы найдём тех, кто будет ему помогать и проверять.'],
    ['Радан','Тогда спать. Ключ ещё нужно получить разговором после боя. И мост всё так же идёт к аббатству, сколько ни смотреть на огонь.']
  ],[choice('rest','Проверить снаряжение и отдохнуть.')]),

  elda_first:dialogue('elda_first','elda_abbey','Та, что принесла первый колокол',[
    ['Эльда','Вы дошли с книгой. Я надеялась, что когда-нибудь её принесут. И делала всё, чтобы этот день не наступил. Неприятно, когда два правдивых предложения стоят рядом.'],
    ['Алар','Ты превратила помощь в сбор.'],
    ['Эльда','Да. Сначала я спрашивала каждого. После паводка люди спали стоя, бросали детей, потому что слышали воду в их кашле. Первый колокол дал им ночь без ужаса. Наутро они смогли строить. Потом пришли новые беды. Мне казалось жестоким каждый раз требовать, чтобы страдающий человек находил слова согласия. Я стала отвечать за него. Очень милосердное начало любого насилия.'],
    ['Лея','Ты могла остановиться, когда они попросили вернуть память.'],
    ['Эльда','Могла. Но тогда пришлось бы признать, что я удерживаю не только боль. Соборный звонарь хранит мой последний приказ: сохранять покой любой ценой. Я отозвала слова сегодня утром. Он счёл моё сожаление ещё одной тяжестью, которую надо снять.'],
    ['Иона','Мы остановим механизм. Но потом решать будут люди.'],
    ['Эльда','Я знаю. Пустая кафедра справа построена для их голосов. Много лет на неё поднималась только я. Идите к колоколу. Вернитесь живыми: это единственная просьба, которую я ещё имею право произнести от себя.']
  ],[
    choice('truth','Мы остановим звон и вернём право выбирать.',{abbess_heard:true,elda_answer_required:true},{next:'elda_wait'}),
    choice('care','Больным нужна помощь. Всем — право отказаться.',{abbess_heard:true,care_without_force:true},{next:'elda_wait'})
  ]),
  elda_wait:dialogue('elda_wait','elda_abbey','До последнего звона',[
    ['Эльда','Ларь лечебницы ещё полон. Возьмите всё, что понадобится. Это не прощение и не плата за него. Просто лекарства должны дойти до раненых.'],
    ['Алар','Что умеет звонарь?'],
    ['Эльда','Собирает отдельные удары в общий звон. Когда зал наполнится эхом, защищайтесь всей группой. Хор умеет поднимать павших стражей; решите, кого остановить первым. Перед большим колоколом есть огонь, который больше не связан с приказом. Восстановите силы. Я останусь у кафедры и начну писать список тех, за кого отвечала, не спросив. Список длинный. Сегодня это больше не причина отложить начало.']
  ],[choice('go','К огню перед залом колокола.')]),
  elda_final:dialogue('elda_final','elda_abbey','У кого останется голос',[
    ['Эльда','Я слышу людей внизу. Сначала думала, звон вернулся. Потом различила спор. Кто-то требует открыть двери, кто-то просит говорить тише. Хороший звук. Не красивый, зато никому не принадлежит.'],
    ['Иона','Приказ разорван. Катушки можно вернуть по одному свидетельству, с выбранным человеком рядом. Большой колокол ещё способен снимать боль. Но прежнего устройства контроля не будет.'],
    ['Радан','На затворе ручной караул. Воду удержим. Потом придётся чинить камень, учить новых людей, не ждать следующего чуда.'],
    ['Лея','Если колокол останется, три ключа: у лечебницы, у круга жителей и у независимого хранителя. Каждый приём — с правом уйти и потребовать возврат. Если замолчит, помощь продолжат люди, настои и разговоры. Некоторым станет тяжелее раньше, чем станет лучше. Нельзя скрывать ни одну цену.'],
    ['Эльда','Я не возьму ключ и не буду вести первый круг. Но свидетелем приду. Вопрос передан тем, чьи голоса здесь держали. Они попросили вас открыть разговор решением, за которое вы готовы отвечать. Что вы предложите?']
  ],[
    choice('public_truth','Остановить колокол. Вернуть свидетельства на открытом круге.',{act1_complete:true,public_truth:true},{gold:40,next:'ending_public_truth',forbidFlags:['act1_complete']}),
    choice('stewardship','Сохранить помощь: три ключа, отзыв согласия, общий надзор.',{act1_complete:true,stewardship:true},{items:[loot('ether_drop',3)],next:'ending_stewardship',forbidFlags:['act1_complete']})
  ]),
  ending_public_truth:dialogue('ending_public_truth','elda_abbey','Круг под немым колоколом',[
    ['Алар','Колокол замолчит. Ни слобода, ни крепость больше не заплатят чужой памятью за удобную тишину. Мы не станем раскрывать личные записи без согласия. Открытым будет сам порядок и ответ тех, кто его нарушил.'],
    ['Эльда','Тогда я помогу вернуть катушки и сниму собственную печать. Лечебница останется. Настоятельницей я больше не буду.'],
    ['Лея','Сегодня начнём с воды, сна и людей рядом. Чудо стало меньше. Работа — нет.'],
    ['Иона','Я отнесу копии в слободу, артель и архив. Оригиналы останутся доступны их владельцам. Мара получит свою книгу. Даже если придёт не завтра.'],
    ['Радан','А я пойду к нижнему проходу. Не охранять. Слушать имена.'],
    ['Алар','Первый акт окончен. Утром на северном тракте нашли колокольную катушку с чужим гербом. Внутри голос просит не освобождения — встречи. Это уже другая дорога. Сегодня мы возвращаемся к живым.']
  ],[choice('end','Пусть начнётся первый день без сбора.')]),
  ending_stewardship:dialogue('ending_stewardship','elda_abbey','Три ключа и открытая дверь',[
    ['Алар','Колокол останется средством помощи. Ни одному человеку он больше не назначит плату. Три ключа, открытая запись порядка, право отозвать согласие в любой день. Каждый отказ сохраняется целиком.'],
    ['Эльда','Первый ключ я отдам Наре. Второй — кругу слободы. Третий пусть хранит тот, кого они выберут без моего голоса. Я останусь здесь только по их решению и отвечу за каждую подмену.'],
    ['Лея','Начнём не со звона. С разговора. У двери будет лавка, вода и человек, который не торопит решение. Если утром согласие не выдержит, приём отменяется.'],
    ['Иона','Копии договора выйдут из архива. На этот раз право исправить правило станет частью самого правила.'],
    ['Радан','А караул останется ручным. Помощь не должна снова подменить работу.'],
    ['Алар','Первый акт окончен. Утром с северного тракта принесли катушку с чужим гербом. Внутри голос назначает встречу. Мы ответим позже. Сегодня важно, что у этой двери снова можно пройти мимо.']
  ],[choice('end','Сохранить дверь открытой в обе стороны.')]),
  elda_epilogue:dialogue('elda_epilogue','elda_abbey','После решения',[
    ['Эльда','Кафедру вынесли во двор. Оказалось, она тяжёлая и совсем неудобная. Люди уже предложили распилить её на скамьи. Я привыкла считать это оскорблением святыни. Сегодня впервые думаю о тех, кому придётся долго слушать стоя.'],
    ['Алар','Решение выдержит?'],
    ['Эльда','Если его будут менять живые люди, когда понадобится. Я слишком долго искала устройство, которое однажды всё исправит вместо нас. Нет такого устройства. Есть первый день без сбора, потом второй. Северная катушка никуда не исчезла. Но прежде чем уйти, пройдите к своим. Они хотят услышать ваш голос без стен и колокольного металла.']
  ],[
    choice('truth','Вспомнить круг под немым колоколом.',{}, {requiresFlags:['public_truth'],next:'ending_public_truth'}),
    choice('keys','Вспомнить решение о трёх ключах.',{}, {requiresFlags:['stewardship'],next:'ending_stewardship'}),
    choice('leave','Ещё побудем рядом с людьми.')
  ]),
  abbey_consent:dialogue('abbey_consent','elda_abbey','Кафедра для чужих слов',[
    ['Иона','На верхней кромке вырезано: «Говорящий может уйти, не закончив». Какое простое правило. Даже сейчас мне хочется спросить: а если он должен сообщить важное?'],
    ['Лея','Значит, придётся найти способ попросить ещё раз. Без замка на двери.'],
    ['Радан','Потом поставили балюстраду. Наверное, чтобы никто не упал. Потом створку. Чтобы никто не вошёл без очереди. Потом замок, чтобы не вышел до окончания приёма. У каждой детали была разумная причина.'],
    ['Алар','Снимем замок?'],
    ['Лея','Да. И прочитаем надпись людям, которые придут. Открытая дверь недостаточна, если человек уверен, что за порогом его остановят. Пусть они узнают, что правило снова принадлежит им.']
  ],[choice('read','Оставить правило открытым для чтения.')]),
  abbey_clapper:dialogue('abbey_clapper','iona_monastery','Не трофей',[
    ['Алар','Язык расколот. С таким большой колокол больше не повторит старую команду.'],
    ['Иона','Заберём как свидетельство устройства. Только не вешай на пояс: весит больше моей первой диссертации, а та тоже никому не приносила пользы при падении.'],
    ['Лея','На металле следы ладоней. Наверное, больные касались его перед приёмом.'],
    ['Радан','Пусть останется в книге не как трофей над врагом. Как вещь, которой помогали, потом принуждали, а потом сумели остановить. Если покажут детям только трещину, те решат, что зло всегда легко узнать по сломанной стали. А оно приходило с целыми знаками и очень заботливыми словами.']
  ],[choice('take','Сохранить расколотый язык как свидетельство.')]),
  abbey_last_page:dialogue('abbey_last_page','elda_abbey','Пустое место для утра',[
    ['Иона','Первая запись Эльды: «Помочь пятерым пережить ночь. Утром спросить снова». На следующей странице «снова» зачёркнуто. Последняя страница пустая.'],
    ['Алар','Напишем итог?'],
    ['Лея','Оставим место людям. Мы уже достаточно говорили в этой истории.'],
    ['Радан','Одну строку всё же можно. Не победную.'],
    ['Иона','«Приказ остановлен. Свидетельства возвращаются только с согласия владельцев. Записи доступны проверке». Скучно. Мне нравится.'],
    ['Алар','А ниже — дата первого дня.'],
    ['Лея','И свободное место. Чтобы завтра не пришлось выскребать нашу уверенность ножом, как имя Мары. Хорошая книга должна выдержать то, что её продолжит кто-то другой.']
  ],[choice('write','Оставить дату и место для других.')]),
  camp_abbey:dialogue('camp_abbey','leia_wood','Четверо перед звоном',[
    ['Иона','Когда вышли из монастыря, я хотела найти неправильное слово. Нашла целый порядок, в котором каждый мог считать себя полезным. Очень хочется вернуться к одному слову.'],
    ['Радан','Порядок тоже ломается по частям. Мы открыли створку, не спустив воду. Освободили мальчишку, не оборвав трос. Значит, руки уже кое-что умеют.'],
    ['Лея','И умеют остановиться. Перед большим звоном защищайтесь вместе. Эфир не жалейте на возвращение павшего: следующего боя может не быть, следующего утра хочется всем.'],
    ['Алар','А после?'],
    ['Иона','После спросим тех, кого пришли услышать. Я приготовила две чистые страницы и очень постараюсь не написать ответ заранее.'],
    ['Радан','Тогда доедайте. Меч не становится легче от торжественного молчания. Я проверял много лет.']
  ],[choice('rest','Подготовиться к последнему бою акта.')])
};

// Outcome data is intentionally available to the raster UI without reinterpreting flags.
export const ENDINGS = {
  public_truth:{id:'public_truth',title:'Круг под немым колоколом',summary:'Колокол остановлен. Возврат свидетельств проходит с согласия владельцев. Слобода, артель и архив хранят независимые копии; плотину держат ручной караул и общий ремонт. Ответственные придут на открытый круг.',nextHook:'На северном тракте найдена катушка с чужим гербом. Голос внутри просит о встрече.'},
  stewardship:{id:'stewardship',title:'Три ключа и открытая дверь',summary:'Колокол сохранён для добровольной помощи. Три независимых ключа, доступные записи и право забрать отданное ограничивают его работу. Эльда лишилась единоличной власти; плотина больше не зависит от сбора.',nextHook:'С северного тракта принесли катушку с чужим гербом. Голос внутри назначает встречу.'}
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

addSmithies(AREAS, AREA_LAYOUTS);
extendForgedEncounters({ENEMIES,SKILLS,AREAS,AREA_LAYOUTS});
applyAreaLayouts(AREAS, AREA_LAYOUTS);
extendRoadsContent({areas:AREAS,quests:QUESTS,dialogues:DIALOGUES,targets:QUEST_TARGETS,enemies:ENEMIES});
ACT_INFO.optionalQuestCount = QUESTS.filter(quest => quest.optional).length;
ACT_INFO.encounterCount = AREAS.reduce((sum, area) => sum + area.encounters.length, 0);
