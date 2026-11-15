import {chestLoot} from './loot-tables.js?v=forged-019';

const gear = (id, name, kind, price, stats, description, rarity = 'uncommon') =>
  ({id, name, kind, slot: kind, price, stats, description, rarity});

const STARTER_KIT = [
  gear('kit_padded_helm', 'Стёганый подшлемник', 'helmet', 42, {hp: 8, def: 1}, 'Льняная подкладка смягчает удары.', 'common'),
  gear('kit_work_gloves', 'Рукавицы послушника', 'gloves', 38, {atk: 2}, 'Плотная кожа защищает ладонь и даёт крепче держать оружие.', 'common'),
  gear('kit_trail_belt', 'Ремень путника', 'belt', 40, {hp: 10}, 'На широкой коже держатся ножны и поясная сумка.', 'common'),
  gear('kit_padded_legs', 'Стёганые поножи', 'leggings', 46, {def: 2, hp: 4}, 'Лёгкая защита коленей для долгой дороги.', 'common'),
  gear('kit_trail_boots', 'Ботинки странника', 'boots', 45, {initiative: 1, def: 1}, 'Грубая подошва держится на мокром камне.', 'common'),
  gear('kit_tin_band', 'Оловянный ободок', 'ring', 48, {magicResist: 4, mp: 3}, 'Знак на кольце гасит слабое эхо заклинаний.', 'common'),
];

const FIRST_ACT_KIT = [
  gear('kit_briar_gloves', 'Перчатки сборщика смолы', 'gloves', 72, {atk: 3, initiative: 1}, 'Цепкая кожа не скользит даже от сырой смолы.'),
  gear('kit_slag_legs', 'Поножи литьевой смены', 'leggings', 89, {def: 4, fireResist: 9}, 'Литые накладки закрывают голени от жара и щебня.'),
  gear('kit_reed_belt', 'Перевязь лодочника', 'belt', 84, {mp: 8, iceResist: 8}, 'Плетёный пояс стягивает подкладку и бережёт от холода.'),
  gear('kit_margin_helm', 'Капюшон хранителя полей', 'helmet', 104, {magicResist: 5, lightResist: 8}, 'Нити скрывают лицо от слепящих оттисков архива.'),
  gear('kit_watch_boots', 'Ботинки заставы', 'boots', 108, {def: 3, hp: 9}, 'Усиленные носки выдерживают толчки в плотном строю.'),
  gear('kit_echo_band', 'Кольцо привратника', 'ring', 124, {magicResist: 7, lightResist: 10}, 'Гравировка ослабляет резкий звон у ворот аббатства.', 'rare'),
];

const CAMPAIGN_KITS = {
  2: [
    gear('kit_breakwater_ring', 'Кольцо волнореза', 'ring', 132, {magicResist: 6, iceResist: 13}, 'Белая медь ослабляет ледяные волны маяка.', 'rare'),
    gear('kit_rope_boots', 'Сапоги канатного двора', 'boots', 105, {initiative: 2, iceResist: 8}, 'Мягкие подошвы не цепляются за мокрые канаты.'),
    gear('kit_salt_belt', 'Пояс Соляной дороги', 'belt', 117, {hp: 15, iceResist: 7}, 'Сухая просоленная кожа держит тепло под курткой.'),
    gear('kit_lantern_helm', 'Налобник смотрителя', 'helmet', 141, {lightResist: 13, def: 3}, 'Широкая пряжка отводит вспышку сигнальной лампы.'),
  ],
  3: [
    gear('kit_frost_helm', 'Шлем Белого перевала', 'helmet', 158, {def: 4, iceResist: 15}, 'Войлочный ворот закрывает лицо от холодных осколков.'),
    gear('kit_rime_legs', 'Поножи снежного караула', 'leggings', 155, {hp: 14, def: 4, iceResist: 9}, 'Кожаные полосы гнутся на морозе.'),
    gear('kit_lens_gloves', 'Перчатки шлифовщика линз', 'gloves', 172, {atk: 4, lightResist: 10}, 'Бронзовые накладки защищают пальцы при работе со светом.', 'rare'),
    gear('kit_crosswind_belt', 'Пояс перевальной стражи', 'belt', 149, {hp: 12, mp: 10, initiative: 1}, 'На широкой перевязи удобно носить припасы всю смену.'),
  ],
  4: [
    gear('kit_foundry_gloves', 'Рукавицы старшего литейщика', 'gloves', 178, {atk: 4, fireResist: 15}, 'Краги прикрывают кисти и запястья от огня.', 'rare'),
    gear('kit_kiln_boots', 'Ботинки печного обхода', 'boots', 167, {def: 4, fireResist: 11}, 'У подошв двойной шов, чтобы держаться на горячих плитах.'),
    gear('kit_ember_ring', 'Печатка жаровни', 'ring', 207, {magicResist: 9, fireResist: 14}, 'Закалённая сердцевина гасит часть огня.', 'rare'),
    gear('kit_crucible_belt', 'Перевязь плавильщика', 'belt', 184, {hp: 20, fireResist: 9}, 'Плотная пряжка удерживает тяжёлый кожаный передник.'),
  ],
  5: [
    gear('kit_glass_legs', 'Поножи зеркальной стражи', 'leggings', 220, {def: 6, lightningResist: 13}, 'Медь вдоль кромки проводит разряд мимо ноги.', 'rare'),
    gear('kit_prism_ring', 'Кольцо тёмной призмы', 'ring', 234, {magicResist: 10, lightningResist: 16}, 'В камне рассеиваются разряды городских печатей.', 'rare'),
    gear('kit_mirror_gloves', 'Перчатки гравёра', 'gloves', 213, {atk: 5, initiative: 2}, 'Тонкие накладки позволяют работать по стеклу без лишнего нажима.', 'rare'),
    gear('kit_city_helm', 'Маска городового', 'helmet', 204, {def: 5, lightResist: 14}, 'Узкий козырёк отводит блики со стороны площади.'),
  ],
  6: [
    gear('kit_cape_boots', 'Ботинки мысового дозора', 'boots', 250, {initiative: 3, lightningResist: 16}, 'Высокие манжеты прикрывают ноги от разрядов на мокрых плитах.', 'rare'),
    gear('kit_chorus_belt', 'Пояс проводника голосов', 'belt', 274, {mp: 16, magicResist: 7, lightningResist: 10}, 'Узоры на застёжке уводят от тела часть силы хора.', 'rare'),
    gear('kit_final_helm', 'Шлем северной станции', 'helmet', 255, {def: 6, hp: 16, lightResist: 12}, 'Глубокий козырёк прикрывает глаза от вспышек.'),
    gear('kit_signal_ring', 'Кольцо свободного голоса', 'ring', 286, {magicResist: 11, lightResist: 18}, 'Разомкнутая печать пропускает тихие голоса и ослабляет удары света.', 'rare'),
  ],
};

const ACT1_LOOT = {
  monastery_cache: 'kit_trail_boots',
  forest_cache: 'kit_briar_gloves',
  quarry_cache: 'kit_slag_legs',
  archive_cache: 'kit_margin_helm',
  fortress_armory: 'kit_watch_boots',
  abbey_hospice: 'kit_echo_band',
};

function addReward(table, item) {
  const current = table || {};
  return {...current, guaranteed: [...(current.guaranteed || []), {id: item, qty: 1}]};
}

export function addRegionalEquipment(items, areas) {
  for (const item of [...STARTER_KIT, ...FIRST_ACT_KIT, ...Object.values(CAMPAIGN_KITS).flat()]) {
    items[item.id] = item;
  }
  for (const area of areas) {
    if (!area.act || area.act === 1) {
      for (const npc of area.npcs) {
        if (npc.id === 'orin_village') npc.shop.push(...STARTER_KIT.map(item => item.id));
        if (npc.id === 'gerd_fen') npc.shop.push('kit_reed_belt');
        if (npc.id === 'forge_fortress') npc.shop.push('kit_watch_boots');
      }
      for (const node of area.nodes) {
        if (Object.hasOwn(ACT1_LOOT, node.id)) node.lootTable = addReward(chestLoot(area.id, node), ACT1_LOOT[node.id]);
      }
      const ferry = area.encounters.find(encounter => encounter.id === 'enc16');
      if (ferry) {
        const rewards = ferry.rewards || ferry.reward || {};
        ferry.rewards = {...rewards, items: [...(rewards.items || []), {id: 'kit_reed_belt', qty: 1}]};
      }
      continue;
    }

    const prefix = 'c' + area.act, kit = CAMPAIGN_KITS[area.act];
    const curator = area.npcs.find(npc => npc.id === prefix + '_npc_b');
    if (curator) curator.shop.push(...kit.map(item => item.id));
    const cache = area.nodes.find(node => node.id === prefix + '_cache');
    if (cache) cache.lootTable = addReward(cache.lootTable, kit[1].id);
    const checkpoint = area.encounters.find(encounter => encounter.id === prefix + '_road_fight');
    if (checkpoint) checkpoint.lootTable = addReward(checkpoint.lootTable, kit[0].id);
    for (const patrol of area.encounters.filter(encounter => encounter.id.startsWith('patrol_'))) {
      patrol.lootTable = {
        guaranteed: [],
        choices: [{id: kit[2].id, weight: 13}, {id: kit[3].id, weight: 13}, {id: prefix + '_trophy', weight: 74}],
      };
    }
  }
}
