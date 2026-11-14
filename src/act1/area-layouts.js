const road = (width, ...points) => ({width, points});
const obstacle = (kind, x, z, rx, rz) => ({kind, x, z, rx, rz});
const prop = (slot, x, z, scale = 1, yaw = 0) => ({slot, x, z, scale, yaw});
const landmark = (id, label, x, z) => ({id, label, x, z, kind:'landmark'});

// Coordinates are X/Z in world units. Roads join at shared points. Water pools
// remain separate where the road crosses between them on a raised causeway.
export const AREA_LAYOUTS = {
  monastery: {
    // Two cloisters surround the collapsed nave. The eastern aisle reaches the reliquary.
    outline:[[-91,-29],[-82,-49],[-67,-52],[-59,-71],[-36,-84],[-13,-79],[8,-89],[31,-86],[46,-73],[66,-70],[83,-52],[87,-29],[75,-10],[88,12],[80,37],[65,57],[44,64],[26,58],[9,78],[-18,86],[-43,83],[-65,72],[-82,58],[-78,36],[-89,13],[-85,-6]],
    spawn:[-56,57],
    positions:{
      monastery_village:[15,-78], iona_monastery:[-49,49],
      monastery_book:[-10,16], monastery_letter:[-54,-27], monastery_sun:[54,-19],
      monastery_cache:[-60,34], monastery_camp:[-37,34],
      enc01:[-55,12], enc02:[48,24], enc03:[11,-53]
    },
    side:{npc:[-69,47],objective:[-72,16],encounter:[-69,-13],reward:[-48,-40]},
    groves:[[-64,-34,15,18],[56,42,15,14],[-65,64,12,9],[46,-51,17,12]],
    roads:[
      road(7,[-62,65],[-56,57],[-49,49],[-39,30],[-23,22],[-10,16],[10,13],[27,4],[27,-21],[21,-40],[11,-53],[15,-78]),
      road(5,[-39,30],[-55,12],[-60,-6],[-54,-27],[-48,-40],[-33,-52],[-13,-56],[11,-53]),
      road(5,[-56,57],[-69,47],[-72,16],[-69,-13],[-54,-27]),
      road(5,[27,-21],[43,-30],[54,-19],[62,-4],[48,24],[33,39],[7,44],[-20,37],[-39,30]),
      road(4.6,[-39,30],[-50,31],[-60,34],[-64,39],[-69,47])
    ],
    obstacles:[
      obstacle('structure',0,-21,13,23), obstacle('cliff',-30,-25,11,15),
      obstacle('structure',49,-49,9,7), obstacle('cliff',42,3,7,7),
      obstacle('cliff',-14,50,7,7)
    ],
    props:[
      prop('wall',-5,-19,1.65,.25),prop('wall',4,-28,1.35,1.34),prop('pillar',3,-14,1.3),prop('pillar',-3,-7,.8),
      prop('rock',-29,-26,4.4,.55),prop('rock',-30,-34,3.4,.2),prop('rock',-15,50,3.1),prop('rock',43,2,3.1),
      prop('arch',47,-49,1.25,.5),prop('pillar',54,-48,.95),prop('pillar',45,-53,1.1),
      prop('pillar',-15,7,.8),prop('pillar',-25,14,.95),prop('brazier',31,-39,.75),
      prop('tree',-53,63,.75),prop('tree',36,50,.9),prop('tree',60,-12,.72),prop('lantern',-41,35)
    ],
    landmarks:[landmark('monastery_south_steps','Южные ступени',-56,57),landmark('monastery_west_cloister','Западная галерея',-58,-27),landmark('monastery_nave','Обрушенный неф',0,-21),landmark('monastery_reliquary_yard','Двор реликвария',11,-53)]
  },
  village: {
    // Houses face a market loop. The toll road leaves along the far bank beyond the settlement.
    outline:[[-92,-35],[-76,-56],[-56,-58],[-47,-76],[-21,-84],[5,-79],[24,-65],[46,-72],[67,-64],[82,-47],[92,-22],[88,0],[97,16],[88,36],[72,48],[55,47],[41,66],[19,80],[-8,78],[-23,64],[-43,71],[-67,66],[-80,49],[-82,26],[-93,10],[-84,-8]],
    spawn:[-72,12],
    positions:{
      village_monastery:[-85,14], village_briarwood:[84,-27],
      velda_village:[-61,8], orin_village:[3,23], radan_village:[41,-21], nara_village:[-16,38],
      village_memorial:[-41,-43], village_well:[24,37], village_camp:[-49,17], enc04:[71,-11]
    },
    side:{npc:[-57,35],objective:[-34,53],encounter:[63,35],reward:[13,59]},
    groves:[[-62,-34,14,11],[-16,60,19,10],[65,31,12,10],[42,-52,12,10]],
    roads:[
      road(8,[-85,14],[-72,12],[-62,11],[-51,10],[-38,-1],[-16,-6],[8,-3],[24,-8],[41,-21],[57,-23],[71,-11],[84,-27]),
      road(5,[-51,10],[-57,35],[-44,48],[-34,53],[-16,56],[13,59],[24,37],[22,22],[3,23],[-16,38],[-37,35],[-51,10]),
      road(6,[-38,-1],[-38,-25],[-41,-43],[-25,-56],[-6,-53],[11,-38],[23,-25],[41,-21]),
      road(5,[8,-3],[3,9],[3,23]),
      road(5,[24,37],[43,39],[63,35],[77,16],[71,-11])
    ],
    obstacles:[
      obstacle('structure',-28,10,8,5),obstacle('structure',-33,26,6.5,5),obstacle('structure',-3,40,7,6),
      obstacle('structure',16,10,6.5,5),obstacle('structure',8,-21,7,5),obstacle('structure',-49,-17,6,5),
      obstacle('water',48,12,15,11),obstacle('water',-19,-30,9,8),obstacle('structure',56,-41,7,6)
    ],
    props:[
      prop('house',-28,10,1,-.15),prop('house',-33,26,.95,.55),prop('house',-3,40,.93,2.9),
      prop('house',16,10,.91,-1.2),prop('house',8,-21,.9,2.8),prop('house',-49,-17,.83,-.35),
      prop('house',56,-41,.95,.7),prop('merchant_stall',-11,34,1,.1),prop('merchant_stall',8,25,.88,1.6),
      prop('well',29,36,1),prop('cart',-57,19,.95,.2),prop('tree',-64,-27,.95),
      prop('tree',-23,63,.92),prop('tree',57,29,.8),prop('tree',71,-46,.9),prop('barrel',13,21,.71)
    ],
    landmarks:[landmark('village_crossroads','Площадь общего дома',-59,9),landmark('village_forge_row','Кузнечный ряд',3,23),landmark('village_orchard','Южные дворы',-34,53),landmark('village_toll_road','Дорога у старой заставы',68,-13)]
  },
  briarwood: {
    // The woodland track bends around the ridge, with separate hunter and resin loops.
    outline:[[-91,-29],[-82,-51],[-66,-63],[-47,-62],[-30,-81],[-7,-91],[16,-82],[33,-91],[59,-87],[79,-72],[85,-51],[76,-31],[94,-14],[97,10],[85,29],[89,48],[69,71],[45,81],[22,72],[5,89],[-23,91],[-44,79],[-63,82],[-81,65],[-91,44],[-86,22],[-95,1]],
    spawn:[-65,53],
    positions:{
      briarwood_village:[-75,65], briarwood_quarry:[70,-68], leia_wood:[-56,47], mirel_wood:[41,-39],
      forest_resin_node:[-6,-7], forest_traps:[-61,-27], forest_slate:[42,57], forest_cache:[62,26], forest_camp:[-32,-53],
      enc05:[-64,23], enc06:[25,28], enc07:[-58,-50], enc08:[54,-50]
    },
    side:{npc:[-29,39],objective:[18,56],encounter:[61,49],reward:[67,6]},
    groves:[[-45,-15,17,25],[-32,56,19,11],[-8,-61,18,13],[36,18,20,13],[67,-35,17,22],[65,57,14,12],[-70,-36,13,20]],
    roads:[
      road(7,[-75,65],[-65,53],[-56,47],[-39,34],[-21,25],[-14,12],[-6,-7],[12,-16],[24,-30],[41,-39],[54,-50],[70,-68]),
      road(4.8,[-39,34],[-64,23],[-74,4],[-72,-12],[-61,-27],[-58,-50],[-48,-59],[-32,-53],[-15,-45],[5,-34],[12,-16]),
      road(5,[-21,25],[-29,39],[-13,53],[18,56],[42,57],[61,49],[66,36],[62,26],[67,6],[56,-10],[45,-22],[41,-39]),
      road(4.8,[18,56],[21,43],[25,28],[20,10],[14,-4],[12,-16])
    ],
    obstacles:[
      obstacle('cliff',-36,-8,16,19),obstacle('cliff',-5,-61,12,9),obstacle('cliff',35,-4,12,9),
      obstacle('water',-42,56,8,6),obstacle('water',46,26,7,9),obstacle('cliff',72,-37,8,11),
      obstacle('cliff',6,35,7,8)
    ],
    props:[
      prop('rock',-35,-7,5,.6),prop('rock',-41,-16,4,-.8),prop('tree',-28,-13,1.1),prop('tree',-33,2,1),
      prop('rock',-6,-62,4.2),prop('tree',3,-67,.9),prop('rock',35,-4,4),prop('tree',34,-11,1.05),
      prop('tree',-76,31,.95),prop('tree',-53,68,.86),prop('tree',-38,-64,1.12),prop('tree',9,68,.95),
      prop('tree',42,70,1),prop('tree',72,58,1.02),prop('tree',80,20,.85),prop('tree',52,11,.95),
      prop('tree',80,-51,.9),prop('rock',71,-36,3.7),prop('tree',7,34,1.08),prop('pillar',46,58,.65)
    ],
    landmarks:[landmark('briarwood_ridge','Корневой гребень',-36,-8),landmark('briarwood_aqueduct','Старый водовод',-6,-7),landmark('briarwood_glade','Поляна охотников',42,57),landmark('briarwood_quarry_ledge','Каменный уступ',54,-53)]
  },
  quarry: {
    // Terraces loop the open pit. The freight road runs along the high northern shelf.
    outline:[[-95,-23],[-85,-47],[-71,-65],[-49,-62],[-30,-79],[-8,-80],[8,-71],[30,-82],[56,-78],[78,-63],[89,-45],[100,-21],[93,5],[102,25],[87,51],[66,61],[48,55],[32,76],[8,86],[-18,81],[-31,68],[-55,76],[-75,62],[-88,44],[-84,25],[-95,8]],
    spawn:[-70,31],
    positions:{
      quarry_briarwood:[-78,37], quarry_fen:[87,-38], lio_quarry:[-62,24], teren_quarry:[35,-48],
      quarry_tokens:[-49,16], quarry_accounts_node:[71,-8], quarry_lantern:[-55,55],
      quarry_lift_node:[75,-38], quarry_cache:[15,55], quarry_camp:[-47,-32],
      enc09:[-69,1], enc10:[65,23], enc11:[-35,-11], enc12:[-48,42]
    },
    side:{npc:[-68,49],objective:[-27,55],encounter:[19,35],reward:[55,45]},
    roads:[
      road(7,[-78,37],[-70,31],[-62,24],[-49,16],[-35,-11],[-41,-28],[-43,-41],[-28,-54],[-6,-58],[14,-53],[35,-48],[57,-46],[75,-38],[87,-38]),
      road(6,[-62,24],[-68,49],[-55,55],[-27,55],[-8,62],[15,55],[37,50],[55,45],[65,23],[68,6],[71,-8],[79,-25],[75,-38]),
      road(4.6,[-49,16],[-51,30],[-48,42],[-55,55]),
      road(5,[-49,16],[-64,10],[-69,1],[-57,-15],[-50,-25],[-47,-32],[-43,-41]),
      road(5,[-27,55],[-4,43],[19,35],[37,38],[55,45])
    ],
    obstacles:[
      obstacle('cliff',12,-8,31,30),obstacle('cliff',-18,16,8,10),
      obstacle('cliff',-3,-36,12,8),obstacle('cliff',-70,-30,8,11),
      obstacle('structure',52,-13,7,8),obstacle('cliff',48,15,9,10),
      obstacle('cliff',-48,65,8,4)
    ],
    props:[
      prop('rock',5,-11,7.2,.7),prop('rock',17,-15,7.8,-.8),prop('rock',24,-4,7.4,1.6),prop('rock',2,-2,6.5),
      prop('rock',-16,15,4.3),prop('rock',-4,-37,4.7),prop('rock',-70,-31,5.1),prop('rock',48,16,4.5),
      prop('house',51,-15,.77,.45),prop('crane',55,-10,.8,1.55),prop('crane',66,-48,.9,.1),
      prop('cart',-36,48,1,.6),prop('cart',47,42,.94,-.2),prop('cart',-58,38,.8,1.3),
      prop('barrel',-48,-35,.9),prop('tree',-73,52,.8),prop('tree',11,74,.74)
    ],
    landmarks:[landmark('quarry_open_pit','Провал восьмой смены',12,-8),landmark('quarry_north_shelf','Северная полка',-13,-55),landmark('quarry_south_tracks','Южный вагонеточный путь',-27,55),landmark('quarry_freight_crane','Грузовая площадка',75,-38)]
  },
  fen: {
    // Two staggered crossings run east through a chain of pools. Three banks host distinct loops.
    outline:[[-96,-24],[-87,-49],[-69,-65],[-51,-75],[-29,-72],[-11,-84],[14,-86],[34,-79],[57,-86],[78,-76],[92,-56],[96,-30],[105,-11],[97,8],[101,29],[93,47],[77,63],[60,70],[45,65],[22,81],[1,84],[-17,75],[-36,91],[-61,86],[-82,72],[-94,53],[-87,31],[-100,11]],
    spawn:[-76,28],
    positions:{
      fen_quarry:[-87,22], fen_archive:[86,-50], gerd_fen:[12,-11],
      fen_beacons_node:[20,-21], fen_lily:[-74,-32], fen_passenger:[4,34], fen_bell:[69,-41],
      fen_cache:[-79,6], fen_camp:[-67,31],
      enc13:[-74,-9], enc14:[-60,-51], enc15:[0,54], enc16:[74,-25]
    },
    side:{npc:[-70,38],objective:[-7,37],encounter:[77,31],reward:[67,48]},
    groves:[[-81,-24,12,26],[-75,60,11,15],[-3,-53,13,12],[14,53,16,19],[77,35,13,19]],
    roads:[
      road(6,[-87,22],[-76,28],[-65,21],[-53,17],[-42,17],[-27,17],[-12,16],[0,9],[9,-1],[12,-11],[26,-8],[42,-8],[58,-8],[67,-12],[74,-25],[79,-38],[86,-50]),
      road(4.7,[-65,21],[-79,6],[-74,-9],[-74,-32],[-60,-51],[-56,-62],[-37,-65],[-14,-62],[-2,-44],[5,-29],[12,-11]),
      road(4.8,[-76,28],[-70,38],[-73,49],[-66,58],[-65,71],[-63,34],[-53,17]),
      road(4.7,[-12,16],[-7,37],[4,34],[12,24],[14,9],[12,-11]),
      road(4.7,[-7,37],[0,54],[5,65],[18,63],[22,51],[19,44],[16,35],[15,22],[16,9],[9,-1]),
      road(4.9,[67,-12],[77,5],[77,31],[67,48],[58,62]),
      road(4.5,[12,-11],[15,-19],[20,-21]),
      road(4.6,[74,-25],[71,-32],[69,-41])
    ],
    obstacles:[
      obstacle('water',-43,-20,21,33),obstacle('water',-41,54,21,32),
      obstacle('water',42,-42,22,30),obstacle('water',42,25,24,29),
      obstacle('water',-15,-26,6.5,9),obstacle('water',12,47,5,7),
      obstacle('structure',19,-34,5,4)
    ],
    props:[
      prop('bridge',-43,17,.83,0),prop('bridge',42,-8,.8,0),prop('house',19,-34,.7,-.78),
      prop('tree',-72,34,1.05),prop('tree',-84,-20,1),prop('tree',-52,-66,.79),
      prop('tree',-8,-56,.85),prop('tree',-5,62,.85),prop('tree',28,64,.77),prop('tree',85,41,.76),
      prop('grass',-62,-39,.72),prop('grass',9,56,.78),prop('grass',63,-27,.8),
      prop('lantern',-27,19),prop('lantern',58,-9),prop('basket',-71,53,.82),prop('barrel',14,-18,.76)
    ],
    landmarks:[landmark('fen_willow_bank','Ивовый берег',-70,30),landmark('fen_reed_bridge','Камышовые мостки',-43,17),landmark('fen_ferry_bank','Пристань Герда',12,-11),landmark('fen_archive_causeway','Архивная насыпь',42,-8)]
  },
  archive: {
    // Ring galleries enclose a dry basin, with a long eastern annex and a quieter bindery.
    outline:[[-90,-28],[-80,-50],[-60,-63],[-40,-62],[-21,-75],[2,-84],[23,-73],[43,-80],[66,-72],[81,-54],[88,-30],[82,-13],[94,9],[93,31],[82,55],[64,68],[43,62],[25,78],[3,84],[-22,75],[-39,81],[-61,70],[-79,52],[-87,33],[-82,12],[-94,-7]],
    spawn:[-68,42],
    positions:{
      archive_fen:[-76,46], archive_sunfields:[79,52], severin_archive:[-59,37],
      archive_catalogue_node:[-54,-16], archive_index_node:[13,-48], archive_margin:[-70,17],
      archive_erasure:[57,-34], archive_cache:[52,27], archive_camp:[-28,48],
      enc17:[-45,5], enc18:[48,-13], enc19:[-40,-39], enc20:[32,-28]
    },
    side:{npc:[-60,57],objective:[47,53],encounter:[69,14],reward:[58,47]},
    roads:[
      road(7,[-76,46],[-68,42],[-59,37],[-49,24],[-45,5],[-54,-16],[-40,-39],[-19,-50],[13,-48],[32,-28],[48,-13],[52,10],[52,27],[60,42],[79,52]),
      road(6,[-59,37],[-42,44],[-28,48],[-10,49],[18,53],[47,53],[60,42]),
      road(5,[-68,42],[-74,27],[-70,17],[-65,2],[-54,-16]),
      road(5,[13,-48],[34,-58],[52,-48],[57,-34],[66,-26],[70,-6],[69,14],[60,42]),
      road(4.8,[-40,-39],[-51,-44],[-54,-38],[-53,-27],[-54,-16]),
      road(4.5,[-59,37],[-61,49],[-60,57])
    ],
    obstacles:[
      obstacle('structure',2,-5,25,28),obstacle('structure',-21,19,7,6),
      obstacle('structure',-64,-28,6,7),obstacle('structure',39,18,7,7),
      obstacle('structure',31,34,9,6),obstacle('structure',64,-53,6,6),
      obstacle('cliff',-15,-68,10,6)
    ],
    props:[
      prop('wall',-15,-1,1.15,1.56),prop('wall',1,-24,1.21,.2),prop('wall',16,-9,1.2,1.4),
      prop('pillar',-17,11,1.25),prop('pillar',19,1,1.24),prop('pillar',0,16,1.22),prop('pillar',-8,-15,1.3),
      prop('bookshelf_book',-21,19,.95,1.1),prop('bookshelf_book',-64,-28,.9,.45),
      prop('bookshelf_book',39,18,.92,-.7),prop('bookshelf_book',29,33,1.03,-.3),
      prop('arch',63,-53,.85,1),prop('rock',-15,-68,3.4),prop('brazier',-25,51,.72),
      prop('lantern',-49,20,.95),prop('lantern',45,-16),prop('lantern',58,49,.88)
    ],
    landmarks:[landmark('archive_dry_basin','Сухой бассейн',2,-5),landmark('archive_catalogue_hall','Зал согласий',-54,-16),landmark('archive_bindery','Переплётная мастерская',-28,48),landmark('archive_east_gallery','Восточная галерея',57,-34)]
  },
  sunfields: {
    // Irrigation channels cross the crescent of fields. Raised field roads connect granary and mill.
    outline:[[-98,-38],[-90,-59],[-75,-75],[-52,-82],[-31,-77],[-14,-89],[8,-86],[25,-79],[47,-85],[69,-75],[83,-55],[88,-34],[103,-19],[100,4],[105,26],[97,49],[91,69],[69,82],[47,79],[32,69],[10,85],[-16,84],[-36,69],[-56,74],[-76,61],[-84,38],[-90,20],[-100,-2]],
    spawn:[-76,-58],
    positions:{
      sunfields_archive:[-83,-59], sunfields_fortress:[85,60], nara_fields:[-67,-50],
      field_water_node:[-52,19], field_harvest_node:[-5,11], field_route_node:[68,43],
      field_granary:[-75,-12], field_cache:[18,-47], field_camp:[-61,34],
      enc21:[-69,12], enc22:[15,-29], enc23:[-18,46], enc24:[58,17]
    },
    side:{npc:[-57,-17],objective:[-18,-42],encounter:[68,-34],reward:[74,-5]},
    fields:[[-39,-37,11,5,.28],[-12,-22,12,5,.32],[4,26,16,6,.28],[62,-54,12,6,.42],[75,-22,10,5,.5],[54,62,10,5,.2]],
    roads:[
      road(7,[-83,-59],[-76,-58],[-67,-50],[-63,-31],[-57,-17],[-57,2],[-59,11],[-52,19],[-52,34],[-41,34],[-29,34],[-20,23],[-5,11],[10,5],[22,-6],[27,-15],[37,-15],[50,-15],[57,-4],[58,17],[60,30],[68,43],[80,50],[85,60]),
      road(5,[-63,-31],[-76,-24],[-75,-12],[-69,12],[-61,34],[-52,34]),
      road(5,[-57,-17],[-36,-20],[-26,-32],[-18,-42],[0,-48],[18,-47],[15,-29],[27,-15]),
      road(5,[-29,34],[-18,46],[-9,57],[17,61],[37,57],[60,48],[68,43]),
      road(5,[50,-15],[57,-30],[68,-34],[79,-20],[74,-5],[65,4],[58,17])
    ],
    obstacles:[
      obstacle('water',-41,10,6.5,20),obstacle('water',-41,54,6.5,14),
      obstacle('water',37,-44,6.5,25),obstacle('water',37,13,6.5,24),
      obstacle('structure',-81,-2,4.5,5),obstacle('structure',-51,8,3.5,4),
      obstacle('structure',-1,-31,7,5),obstacle('structure',80,28,8,5),
      obstacle('cliff',-74,48,6,8)
    ],
    props:[
      prop('bridge',-41,34,.72,0),prop('bridge',37,-15,.72,0),prop('house',-81,-2,.77,1.25),
      prop('waterwheel',-48,9,.85,.5),prop('house',-1,-31,.87,-.15),prop('house',80,28,.88,1.02),
      prop('cart',-71,-42,.92,.34),prop('cart',65,51,.92,1.57),prop('rock',-74,48,3.1),
      prop('wheat',-24,-11,1),prop('wheat',-19,-9,.95),prop('wheat',-14,-7,1.1),prop('wheat',-9,-5,.95),
      prop('wheat',4,23,.95),prop('wheat',9,26,1.1),prop('wheat',14,29,1),prop('wheat',19,32,.96),
      prop('wheat',62,-48,.9),prop('wheat',67,-45,1),prop('wheat',72,-42,.95),
      prop('banner',52,30,.72,.25),prop('tree',-62,50,.81),prop('tree',81,59,.81)
    ],
    landmarks:[landmark('sunfields_granary_road','Амбарный тракт',-75,-12),landmark('sunfields_mill_crossing','Мельничная перемычка',-41,34),landmark('sunfields_reaper_strip','Межи жнецов',-5,11),landmark('sunfields_east_channel','Восточный шлюз',37,-15)]
  },
  fortress: {
    // A public approach, a lower service court and an upper dam road form unequal loops.
    outline:[[-92,-32],[-82,-53],[-65,-66],[-45,-63],[-28,-79],[-8,-87],[11,-79],[31,-89],[56,-86],[77,-73],[90,-54],[97,-33],[88,-14],[101,5],[97,30],[81,51],[63,62],[42,58],[27,76],[1,85],[-22,78],[-42,85],[-64,73],[-80,56],[-90,36],[-83,18],[-95,-5]],
    spawn:[-66,8],
    positions:{
      fortress_sunfields:[-82,10], fortress_abbey:[78,-56], dagan_gate:[-56,7],
      fortress_gate_node:[-15,1], fortress_roster:[-52,-33], fortress_wall:[25,45],
      fortress_armory:[30,16], fortress_camp:[-38,28],
      enc25:[-51,45], enc26:[32,29], enc27:[-30,-44], enc28:[27,-38]
    },
    side:{npc:[-70,-14],objective:[-65,-43],encounter:[-17,-64],reward:[15,-64]},
    roads:[
      road(7,[-82,10],[-66,8],[-56,7],[-39,3],[-15,1],[-2,-5],[12,-19],[27,-38],[36,-52],[57,-57],[78,-56]),
      road(5,[-66,8],[-70,-14],[-72,-31],[-65,-43],[-52,-33],[-30,-44],[-17,-64],[0,-69],[15,-64],[24,-55],[36,-52]),
      road(6,[-56,7],[-57,24],[-51,45],[-31,55],[-11,53],[10,49],[25,45],[32,29],[30,16],[25,4],[12,-8],[12,-19]),
      road(5,[-57,24],[-38,28],[-21,25],[-16,13],[-15,1]),
      road(4.8,[-39,3],[-42,-13],[-52,-33]),
      road(5,[-30,-44],[-18,-43],[-10,-38],[-3,-27],[12,-19])
    ],
    obstacles:[
      obstacle('water',64,-5,15,36),obstacle('water',60,43,14,11),
      obstacle('structure',-3,17,10,8),obstacle('structure',12,29,9,7),
      obstacle('structure',-26,-12,9,6),obstacle('structure',-20,-28,6,6),
      obstacle('cliff',43,-28,7,8),obstacle('structure',71,-71,6,5)
    ],
    props:[
      prop('wall',-7,16,1.26,.25),prop('wall',3,16,1.05,.2),prop('tower',11,29,.83),
      prop('wall',-26,-13,1.4,.38),prop('tower',-20,-28,.88),prop('tower',71,-71,.88),prop('rock',42,-29,4.3),
      prop('banner',-17,6,.84),prop('banner',22,-13,.9,1.57),prop('banner',44,-55,.9,1.57),
      prop('cart',-45,31,.85,.57),prop('barrel',26,18,.94),prop('tree',-71,49,.74),prop('tree',-29,68,.82),
      prop('pillar',48,40,.9)
    ],
    landmarks:[landmark('fortress_outer_court','Внешний караульный двор',-54,10),landmark('fortress_service_yard','Служебный двор плотины',25,45),landmark('fortress_dam_water','Медный водосброс',64,-5),landmark('fortress_upper_road','Верхний ход крепости',37,-52)]
  },
  abbey: {
    // The cloister blocks the direct approach to the belfry. East and west aisles rejoin at its steps.
    outline:[[-94,-30],[-88,-52],[-70,-70],[-49,-73],[-35,-86],[-11,-94],[10,-87],[31,-94],[54,-87],[75,-75],[89,-57],[92,-33],[81,-13],[96,5],[95,28],[82,48],[65,60],[47,56],[32,77],[10,89],[-17,95],[-41,84],[-54,79],[-74,67],[-89,48],[-86,27],[-97,9]],
    spawn:[-20,71],
    positions:{
      abbey_fortress:[-24,84], elda_abbey:[-15,61], abbey_consent:[42,47],
      abbey_clapper:[16,-67], abbey_return:[-37,-53], abbey_hospice:[59,17], abbey_camp:[-20,-18],
      enc29:[-48,41], enc30:[50,32], enc31:[-56,2], enc32:[53,-25], enc33:[-44,-38], enc34:[13,-50]
    },
    side:{npc:[-68,23],objective:[34,22],encounter:[69,-7],reward:[-13,-65]},
    roads:[
      road(8,[-24,84],[-20,71],[-15,61],[-8,46],[-13,32],[-20,18],[-25,0],[-20,-18],[-10,-35],[2,-43],[13,-50],[16,-67]),
      road(5.8,[-15,61],[-36,55],[-48,41],[-62,24],[-56,2],[-57,-19],[-44,-38],[-37,-53],[-28,-64],[-13,-65],[0,-62],[13,-50]),
      road(5.8,[-8,46],[11,53],[28,52],[42,47],[50,32],[59,17],[64,0],[53,-25],[35,-39],[22,-45],[13,-50]),
      road(5,[-48,41],[-29,35],[-13,32]),
      road(5,[50,32],[34,22],[26,11],[29,-5],[40,-17],[53,-25]),
      road(5,[-56,2],[-40,-1],[-25,0])
    ],
    obstacles:[
      obstacle('structure',8,10,14,22),obstacle('structure',-42,19,7,8),
      obstacle('structure',-33,-21,6,8),obstacle('structure',33,37,6,5),
      obstacle('structure',62,34,6,5),obstacle('cliff',-71,-40,10,11),
      obstacle('structure',27,-68,7,6)
    ],
    props:[
      prop('wall',6,1,1.8,1.45),prop('wall',7,19,1.55,1.2),prop('pillar',-2,6,1.34),prop('pillar',15,13,1.31),
      prop('pillar',7,27,1.32),prop('wall',-42,19,1.1,1.5),prop('pillar',-34,-21,1.24),
      prop('altar_inspect',32,36,1,.4),prop('house',63,34,.73,2.62),prop('arch',26,-69,1.34,.22),
      prop('rock',-69,-39,5.2),prop('brazier',-17,-20,.77),prop('brazier',19,-43,.95),
      prop('banner',48,42,.87,-.34),prop('tree',-63,52,.85),prop('tree',-67,16,.78),prop('tree',76,18,.85)
    ],
    landmarks:[landmark('abbey_approach','Южная паперть',-20,71),landmark('abbey_cloister','Изогнутый клуатр',8,10),landmark('abbey_infirmary','Восточная лечебница',59,17),landmark('abbey_belfry','Площадка большого колокола',13,-50)]
  }
};
