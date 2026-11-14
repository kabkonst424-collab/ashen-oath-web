const equipment = (id, name, kind, price, rarity, stats, description) => ({
  id, name, kind, slot: kind, price, rarity, stats, description,
});
const trophy = (id, name, price, description) => ({
  id, name, kind: 'material', price: price * 2, sellPrice: price, rarity: 'common', description,
});

export const FORGE_ITEMS = {
  iron_trail_blade: equipment('iron_trail_blade', 'Железо путника', 'weapon', 60, 'uncommon',
    { atk: 6, def: 1 }, 'Простой клинок с широкой крестовиной. Удобен и для рубки, и для защиты.'),
  hardened_jack: equipment('hardened_jack', 'Дублёный панцирь', 'armor', 68, 'uncommon',
    { def: 5, hp: 7 }, 'Слои кожи прошиты льняной нитью и усилены железными заклёпками.'),
  tin_waymark: equipment('tin_waymark', 'Оловянная метка тропы', 'charm', 55, 'uncommon',
    { def: 1, initiative: 2 }, 'Охотники носят такие метки на шнуре и узнают своих по вырезу.'),
  resin_eye_pin: equipment('resin_eye_pin', 'Глаз золотой смолы', 'charm', 108, 'rare',
    { atk: 3, initiative: 4 }, 'В янтаре застыла тёмная игла. Под светом она поворачивается к движению.'),
  slag_bracer: equipment('slag_bracer', 'Панцирь восьмой плавки', 'armor', 145, 'rare',
    { def: 9, hp: 12, speed: -1 }, 'Кузнецы обожгли кромки пластин шлака и нашили их на мягкое основание.'),
  reedglass_spindle: equipment('reedglass_spindle', 'Веретено тростникового стекла', 'weapon', 172, 'rare',
    { atk: 9, mp: 9, initiative: 2 }, 'Отполированный шип держит заряд над болотной водой. Его можно закрепить в рукояти.'),
  mill_wake_locket: equipment('mill_wake_locket', 'Медальон мельничной волны', 'charm', 175, 'rare',
    { hp: 20, mp: 14, def: 2 }, 'Работники носили его у водосброса, чтобы слышать приближение паводка.'),
  rivetwatch_plate: equipment('rivetwatch_plate', 'Латы медной стражи', 'armor', 215, 'rare',
    { def: 11, hp: 18, initiative: 2 }, 'Короткие подвижные пластины держатся на широких медных заклёпках.'),
  salvaged_clasp: trophy('salvaged_clasp', 'Снятая пряжка', 4, 'Кузнецы покупают уцелевшие пряжки и перетапливают их.'),
  ash_glass: trophy('ash_glass', 'Осколок пепельного стекла', 7, 'Гладкое стекло, спёкшееся от жара. Его можно продать.'),
  river_pearl: trophy('river_pearl', 'Речная жемчужина', 9, 'Круглый светлый трофей из русла. Его можно продать.'),
};

const drop = (id, qty = 1) => ({id, qty});
const weight = (id, chance, qty = 1) => ({...drop(id, qty), weight: chance});

// Each defeated enemy yields a compact regional stack. Ordinary victories also
// pick one additional entry per encounter, rather than a gear roll per enemy.
const region = (material, gear, chance) => ({
  material,
  encounter: { choices: [...gear.map(id => weight(id, chance)), weight(material, 100 - gear.length * chance)] },
});
const regions = {
  monastery: region('salvaged_clasp', ['iron_trail_blade', 'hardened_jack'], 17),
  village: region('salvaged_clasp', ['hardened_jack', 'tin_waymark'], 19),
  briarwood: region('golden_resin', ['tin_waymark', 'hunter_pin'], 15),
  quarry: region('iron_ore', ['road_mail', 'hardened_jack'], 16),
  fen: region('river_pearl', ['reed_staff', 'copper_ring'], 16),
  archive: region('ash_glass', ['margin_coat', 'bell_charm'], 16),
  sunfields: region('river_pearl', ['road_mail', 'ash_locket'], 17),
  fortress: region('salvaged_clasp', ['ward_spear', 'road_mail'], 18),
  abbey: region('ash_glass', ['hospice_cloak', 'bell_charm'], 18),
};
const namedTrophies = {
  broken_reliquary: 'hardened_jack',
  thorn_keeper: 'hunter_pin',
  quarry_echo: 'road_mail',
  ferry_echo: 'reed_staff',
  catalogue_warden: 'margin_coat',
  harvest_engine: 'ash_locket',
  dagan: 'ward_spear',
  mute_abbot: 'hospice_cloak',
  bellkeeper: 'bell_charm',
  forged_resin_lynx: 'resin_eye_pin',
  forged_slag_golem: 'slag_bracer',
  forged_fen_weaver: 'reedglass_spindle',
  forged_mill_wisp: 'mill_wake_locket',
  forged_rivet_guard: 'rivetwatch_plate',
};
const chestGear = {
  monastery_cache: 'iron_trail_blade',
  village_well: 'tin_waymark',
  forest_cache: 'hardened_jack',
  quarry_cache: 'copper_ring',
  fen_cache: 'reed_staff',
  field_cache: 'hospice_cloak',
  abbey_hospice: 'bell_charm',
};

export function enemyLoot(areaId, enemy) {
  if (enemy.lootTable) return enemy.lootTable;
  const id = namedTrophies[enemy.id] || regions[areaId].material;
  return {guaranteed: [drop(id)]};
}

export function encounterLoot(areaId, encounter, enemies) {
  if (encounter.lootTable) return encounter.lootTable;
  return enemies.some(enemy => namedTrophies[enemy.kind]) ? null : regions[areaId].encounter;
}

export function chestLoot(areaId, chest) {
  if (chest.lootTable) return chest.lootTable;
  const gear = chestGear[chest.id], material = regions[areaId].material;
  return {guaranteed: gear ? [drop(gear)] : [drop(material, 2)],
    choices: [weight(material, 74), weight('revival_salt', 26)]};
}

export function rollLoot(table, random) {
  if (!table) return [];
  const result = [...(table.guaranteed || [])];
  const choices = table.choices || [];
  const total = choices.reduce((sum, entry) => sum + entry.weight, 0);
  if (!total) return result;
  let ticket = random() * total;
  for (const {id, qty = 1, weight} of choices) {
    ticket -= weight;
    if (ticket < 0) {
      result.push({id, qty});
      break;
    }
  }
  return result;
}
