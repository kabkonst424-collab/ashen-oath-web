// These encounters are optional detours. Each keeps its own defeat and reward records.
const PATROLS = {
  monastery: [
    ['cloister', 'Пепельный дозор у келий', -4, 50, ['ash_husk'], 16],
  ],
  briarwood: [
    ['thicket', 'Пара из терновых зарослей', -8, 18, ['thorn_wolf', 'resin_moth'], 22],
  ],
  quarry: [
    ['rubble', 'Стражи старого отвала', -4, 34, ['iron_rat', 'tithe_guard'], 24],
  ],
  fen: [
    ['reeds', 'Огни в осоке', -12, 6, ['wick_light', 'reed_stalker'], 26],
  ],
  archive: [
    ['shelves', 'Дозор списанных томов', -2, 42, ['paper_swarm', 'hush_acolyte'], 28],
  ],
  sunfields: [
    ['fallow', 'Жнецы на залежи', -30, -12, ['hollow_reaper', 'cinder_bird'], 30],
  ],
  fortress: [
    ['rampart', 'Дозор под валом', -8, 44, ['warden_hound', 'tithe_guard'], 32],
  ],
  abbey: [
    ['vespers', 'Рыцарь немой вечерни', -70, 22, ['oath_knight', 'silent_choir'], 34],
  ],
  salt_coast: [
    ['nets', 'Сборщики у брошенных сетей', -6, 32, ['c2_mob_a', 'c2_mob_a'], 32],
    ['moorings', 'Дозор северных причалов', 26, -46, ['c2_mob_b', 'c2_mob_a'], 32],
  ],
  drowned_beacon: [
    ['tideline', 'Караул на полосе отлива', -30, -14, ['c2_mob_a', 'c2_mob_b'], 32],
    ['far_shore', 'Огни дальнего берега', 38, 36, ['c2_mob_b', 'c2_mob_b'], 32],
  ],
  white_pass: [
    ['drift', 'Погоня на снежной гряде', 4, 30, ['c3_mob_a', 'c3_mob_a'], 36],
    ['ledge', 'Дозор на скальном уступе', 44, -4, ['c3_mob_b', 'c3_mob_a'], 36],
  ],
  frost_observatory: [
    ['floe', 'Осколки на льду', -2, 40, ['c3_mob_b', 'c3_mob_b'], 36],
    ['ward', 'Дозор ледяных линз', 46, 12, ['c3_mob_a', 'c3_mob_a', 'c3_mob_b'], 36],
  ],
  slag_terraces: [
    ['ash_bank', 'Караул у кромки шлака', -8, 46, ['c4_mob_a', 'c4_mob_a'], 40],
    ['kilns', 'Сборщики на старых печах', 4, -46, ['c4_mob_a', 'c4_mob_b'], 40],
  ],
  ember_forge: [
    ['bellows', 'Дозор кузнечных мехов', 0, 32, ['c4_mob_b', 'c4_mob_b'], 40],
    ['furnaces', 'Стражи нижней плавильни', 50, 12, ['c4_mob_a', 'c4_mob_a', 'c4_mob_b'], 40],
  ],
  mirror_garden: [
    ['hedge', 'Двойники у живой изгороди', -2, 38, ['c5_mob_a', 'c5_mob_a'], 44],
    ['mirror', 'Дозор треснувшего зеркала', 28, -14, ['c5_mob_a', 'c5_mob_b', 'c5_mob_b'], 44],
  ],
  glass_city: [
    ['lane', 'Патруль стекольного переулка', -4, 44, ['c5_mob_a', 'c5_mob_b'], 44],
    ['vault', 'Хранители глухих сводов', 2, -40, ['c5_mob_a', 'c5_mob_a', 'c5_mob_b'], 44],
  ],
  wind_cape: [
    ['heath', 'Дозор на пустоши', 6, 28, ['c6_mob_a', 'c6_mob_b'], 52],
    ['scree', 'Заслон над каменной осыпью', 22, -36, ['c6_mob_a', 'c6_mob_a', 'c6_mob_b'], 52],
  ],
  voice_amphitheatre: [
    ['arcade', 'Отзвуки под аркадами', -2, 40, ['c6_mob_b', 'c6_mob_b'], 52],
    ['gallery', 'Последний дозор галереи', 6, -46, ['c6_mob_a', 'c6_mob_b', 'c6_mob_b'], 52],
  ],
};

export function addCampaignPatrols(areas) {
  for (const area of areas) {
    for (const [id, label, x, z, enemies, xp] of PATROLS[area.id] || []) {
      area.encounters.push({
        id: `patrol_${area.id}_${id}`, label, x, z, enemies, stroll: [1.4, 0.5],
        rewards: { xp }, lootTable: { guaranteed: [], choices: [] },
      });
    }
  }
}
