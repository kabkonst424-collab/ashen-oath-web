import {chestLoot} from './loot-tables.js?v=campaign-170';

const piece = (id, name, kind, rarity, price, stats, description) => ({
  id, name, kind, slot: kind, rarity, price, stats, description,
});

const CHAPTER_GEAR = [
  [
    piece('study_wraps', 'Обмотки ученика', 'gloves', 'common', 49, {mp: 5, spellPower: 2}, 'Тонкая ткань подходит для знаков и удерживает немного маны.'),
    piece('trail_soles', 'Дорожные полусапоги', 'boots', 'common', 54, {initiative: 2}, 'Лёгкая подошва помогает действовать раньше.'),
    piece('novice_hood', 'Капюшон послушника', 'helmet', 'uncommon', 65, {hp: 12, def: 2}, 'Плотная подкладка смягчает первый удар.'),
    piece('reed_brooch', 'Брошь речной знахарки', 'charm', 'rare', 116, {healingPower: 6, mp: 5}, 'Медная игла с речным жемчугом укрепляет прямое лечение умениями.'),
  ],
  [
    piece('salt_seal', 'Шлем соляных печатей', 'helmet', 'uncommon', 129, {magicResist: 5, spellPower: 3}, 'Металл с соляной насечкой рассеивает вражескую магию.'),
    piece('pier_step', 'Сапоги причального дозора', 'boots', 'uncommon', 130, {initiative: 4, iceResist: 3}, 'Хороши для первого хода на скользком настиле.'),
    piece('waveglass_band', 'Кольцо из волнового стекла', 'ring', 'rare', 164, {iceResist: 11, healingPower: 6}, 'Холодная вода остывает в оправе раньше, чем касается кожи.'),
    piece('swell_edge', 'Клинок высокой воды', 'weapon', 'rare', 211, {atk: 11, physicalPower: 6, initiative: 1}, 'Тяжесть у гарды даёт сильный прямой удар.'),
  ],
  [
    piece('rime_bind', 'Ремень перевального связного', 'belt', 'uncommon', 152, {initiative: 3, iceResist: 8}, 'Короткая перевязь подходит дозорному, который ходит первым.'),
    piece('drift_mantle', 'Мантия снежного следа', 'armor', 'rare', 224, {hp: 33, iceResist: 18, def: 7}, 'Белая шерсть бережёт от холода. От оружия защищают только нашитые пластины.'),
    piece('lens_clasp', 'Застёжка полярной линзы', 'charm', 'rare', 238, {spellPower: 7, mp: 11, lightResist: 6}, 'Линза собирает рассеянный свет для сильного заклинания.'),
    piece('holdfast_gauntlets', 'Краги ледового караула', 'gloves', 'epic', 258, {physicalPower: 8, iceResist: 10}, 'Ребро вдоль кисти помогает провести сильный удар на морозе.'),
  ],
  [
    piece('coal_coat', 'Панцирь тлеющих углей', 'armor', 'rare', 304, {def: 11, hp: 27, fireResist: 17}, 'Литые пластины держат жар, но оставляют руки свободными.'),
    piece('coal_script', 'Печатка живого угля', 'ring', 'epic', 275, {spellPower: 8, fireResist: 13}, 'На тёплой печатке знаки проступают быстрее.'),
    piece('hearths_belt', 'Пояс выездного лекаря', 'belt', 'epic', 280, {healingPower: 8, mp: 12, fireResist: 7}, 'Две прочные застёжки держат настои у самого горна.'),
    piece('foundry_heart', 'Сердце старой литейни', 'charm', 'legendary', 401, {spellPower: 10, fireResist: 17, mp: 10}, 'Именной талисман усиливает заклинания и гасит жар печей.'),
  ],
  [
    piece('mirror_visage', 'Зеркальный шлем переписчика', 'helmet', 'epic', 309, {lightResist: 16, spellPower: 7, def: 3}, 'Тусклое зеркало рассеивает чужой свет и собирает свой.'),
    piece('crossing_strides', 'Сапоги звонких переходов', 'boots', 'rare', 272, {initiative: 5, lightningResist: 10}, 'Подошвы позволяют первым уйти с пути искры.'),
    piece('prism_bracers', 'Наручи призматической стражи', 'gloves', 'epic', 315, {physicalPower: 9, lightningResist: 12}, 'Ребристые пластины удерживают клинок и проводят разряд мимо кисти.'),
    piece('stilled_prism', 'Призма тихого круга', 'ring', 'legendary', 425, {healingPower: 11, lightningResist: 16, mp: 10}, 'Хранит часть силы для прямого лечения в грозу.'),
  ],
  [
    piece('vigil_legs', 'Поножи последней вахты', 'leggings', 'epic', 340, {hp: 28, def: 6, lightResist: 15}, 'Свет финального сигнала рассеивается по широким накладкам.'),
    piece('oath_needle', 'Игла хоровой печати', 'weapon', 'epic', 421, {atk: 20, spellPower: 10, mp: 12}, 'Жезл сохраняет ману для нескольких сильных заклинаний подряд.'),
    piece('edge_of_cape', 'Сталь Северного мыса', 'weapon', 'legendary', 490, {atk: 21, physicalPower: 12, initiative: 2}, 'Тонкая кромка помогает провести решающий удар раньше противника.'),
    piece('free_voice', 'Мантия свободного голоса', 'armor', 'legendary', 515, {hp: 48, healingPower: 8, lightResist: 15}, 'Гасит сигнальные вспышки и усиливает лечение. Ткань оставляет мало защиты от оружия.'),
  ],
];

// Field finds and merchant stock offer alternatives to the chapter's default gear.
const FIELD_EQUIPMENT = [
  ['village', 'forge_village', piece('scribe_talisman', 'Подвеска писца', 'charm', 'common', 51,
    {mp: 6, spellPower: 3}, 'Подвеска держит заряд для заклинаний. Метка тропы даёт вместо этого инициативу и защиту.')],
  ['quarry', 'forge_quarry', piece('quarry_shoes', 'Сапоги каменотёса', 'boots', 'uncommon', 77,
    {def: 3, fireResist: 7}, 'Слои кожи берегут от ударов и жара. Лёгкие дорожные полусапоги лучше для первого хода.')],
  ['salt_coast', null, piece('breaker_legs', 'Поножи рифового обхода', 'leggings', 'rare', 142,
    {hp: 18, iceResist: 12}, 'Вощёные накладки не пропускают ледяные брызги. Под ними нет пластин против клинка.')],
  ['drowned_beacon', 'c2_npc_b', piece('sounder_gloves', 'Перчатки лотового мастера', 'gloves', 'uncommon', 132,
    {initiative: 2, magicResist: 5}, 'С ними проще первым поставить барьер. Краги сборщика смолы сильнее в рубке.')],
  ['frost_observatory', 'c3_npc_b', piece('remedy_boots', 'Сапоги снегового лекаря', 'boots', 'rare', 191,
    {healingPower: 6, iceResist: 10}, 'Утеплённая обувь лекаря для долгого боя. Прямое лечение усиливается, инициатива не растёт.')],
  ['white_pass', null, piece('sunline_gloves', 'Перчатки полярного луча', 'gloves', 'rare', 219,
    {spellPower: 6, lightResist: 8}, 'С ними легче направить заклинание и укрыть руки от резкого света линзы.')],
  ['slag_terraces', null, piece('crucible_greaves', 'Поножи тигельной смены', 'leggings', 'rare', 232,
    {def: 5, fireResist: 17}, 'Толстая кожа и кованые щитки держат жар и удары. Запас здоровья не увеличивается.')],
  ['ember_forge', 'c4_npc_b', piece('tempered_brow', 'Налобник горнового лекаря', 'helmet', 'epic', 271,
    {healingPower: 7, fireResist: 12}, 'Лёгкий медный налобник гасит жар и поддерживает прямое лечение.')],
  ['mirror_garden', null, piece('glass_sash', 'Перевязь стекольного мастера', 'belt', 'epic', 298,
    {mp: 13, lightningResist: 13, def: 3}, 'В кантах проходит проводящая нить. Она отводит разряды и бережёт ману для заклинаний.')],
  ['glass_city', 'c5_npc_b', piece('grounding_mantle', 'Мантия медной оплётки', 'armor', 'epic', 374,
    {def: 9, hp: 25, lightningResist: 20}, 'Гибкая медная сетка отводит сильный разряд. Тяжёлый доспех лучше держит удары оружием.')],
  ['voice_amphitheatre', 'c6_npc_b', piece('chorus_march', 'Сапоги слушателя хора', 'boots', 'epic', 352,
    {healingPower: 9, lightResist: 15}, 'Двойная подкладка рассеивает свет. Подошва уступает по скорости сапогам переходов.')],
  ['voice_amphitheatre', 'c6_npc_b', piece('chorus_spear', 'Сторожевое копьё хора', 'weapon', 'legendary', 486,
    {atk: 18, def: 8, lightResist: 18}, 'Широкое навершие прикрывает от света и помогает держать оборону. Сталь Северного мыса сильнее в нападении.')],
];

const CACHE_SUPPLIES = {
  c2_cache: {id: 'campaign_tonic', qty: 2},
  c3_cache: {id: 'revival_salt', qty: 2},
  c4_cache: {id: 'campaign_tide', qty: 1},
  c5_cache: {id: 'ether_drop', qty: 3},
};

function replaceGuarantee(object, table, priorId, newId, qty) {
  if (!table.guaranteed.some(entry => entry.id === priorId)) throw Error(`Нет награды ${priorId} у ${object.id}`);
  object.lootTable = {...table, guaranteed: table.guaranteed.map(entry =>
    entry.id === priorId ? {...entry, id: newId, qty: qty ?? entry.qty ?? 1} : entry)};
}

function addFieldEquipment(items, areas) {
  for (const [areaId, vendorId, item] of FIELD_EQUIPMENT) {
    items[item.id] = item;
    const area = areas.find(candidate => candidate.id === areaId);
    if (vendorId) {
      area.npcs.find(npc => npc.id === vendorId).shop.push(item.id);
    } else {
      const prefix = `c${area.act}`;
      const cache = area.nodes.find(node => node.id === `${prefix}_side_cache`);
      replaceGuarantee(cache, cache.lootTable, `${prefix}_trophy`, item.id, 1);
    }
  }
}

export function addSpecialtyEquipment(items, areas) {
  for (const [index, gear] of CHAPTER_GEAR.entries()) {
    for (const def of gear) items[def.id] = def;
    const [first, second, chest, signature] = gear;
    if (index === 0) {
      areas.find(area => area.id === 'village').npcs.find(npc => npc.id === 'orin_village').shop.push(first.id, second.id);
      const monastery = areas.find(area => area.id === 'monastery');
      const cache = monastery.nodes.find(node => node.id === 'monastery_cache');
      const noviceLoot = chestLoot(monastery.id, cache);
      replaceGuarantee(cache, noviceLoot, 'iron_trail_blade', 'travel_stew');
      cache.lootTable.guaranteed.push({id: chest.id, qty: 1});
      const fen = areas.find(area => area.id === 'fen');
      const stash = fen.nodes.find(node => node.id === 'fen_cache');
      const table = chestLoot(fen.id, stash);
      stash.lootTable = {...table, choices: [...table.choices, {id: signature.id, weight: 40}]};
      fen.npcs.find(npc => npc.id === 'gerd_fen').shop.push(signature.id);
      continue;
    }

    const prefix = `c${index + 1}`;
    const area = areas.find(map => map.npcs.some(npc => npc.id === `${prefix}_npc_b`));
    const market = area.npcs.find(npc => npc.id === `${prefix}_npc_b`);
    market.shop.push(first.id, second.id);
    const cache = area.nodes.find(node => node.id === `${prefix}_cache`);
    // The previous regional piece remains available at this merchant.
    const previous = cache.lootTable.guaranteed.at(-1).id;
    replaceGuarantee(cache, cache.lootTable, previous, chest.id);
    const supplies = CACHE_SUPPLIES[cache.id];
    if (supplies) {
      cache.lootTable.choices = cache.lootTable.choices.map(entry =>
        entry.id === `${prefix}_gear_armor` ? {...entry, ...supplies} : entry);
    }
    if (index === 5) {
      // The final pieces must be obtainable before the last fight.
      const sideArea = areas.find(map => map.nodes.some(node => node.id === `${prefix}_side_cache`));
      const side = sideArea.nodes.find(node => node.id === `${prefix}_side_cache`);
      side.lootTable = {...side.lootTable, choices: [{id: signature.id, weight: 1}]};
      side.items = side.items.map(entry => entry.id === 'healing_draught' ? {...entry, id: 'campaign_tonic'} : entry);
    } else {
      const boss = area.encounters.find(encounter => encounter.id === `${prefix}_climax`);
      replaceGuarantee(boss, boss.lootTable, `${prefix}_gear_charm`, signature.id);
    }
  }
  addFieldEquipment(items, areas);
}
