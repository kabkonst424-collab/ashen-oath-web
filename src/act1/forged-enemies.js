// Optional encounters in Act I. IDs also identify save receipts and loot tables.
const strike = (id, name, target, power, element, telegraph, intent = 'attack') =>
  ({ id, name, mp: 0, target, kind: 'damage', power, element, telegraph, intent, description: telegraph });
const stand = (id, name, telegraph) =>
  ({ id, name, mp: 0, target: 'self', kind: 'guard', power: .4, element: 'physical', telegraph, description: telegraph });

const skills = [
  strike('forged_lynx_lunge', 'Смоляной наскок', 'enemy', 1.32, 'physical', 'Смоляной наскок · быстрый выпад в одного героя'),
  stand('forged_slag_shell', 'Шлаковый панцирь', 'Шлаковый панцирь · погасит часть входящего урона'),
  strike('forged_slag_eruption', 'Выброс шлака', 'allEnemies', .91, 'fire', 'Выброс шлака · огонь накроет весь отряд', 'all'),
  strike('forged_weaver_needle', 'Игольчатая изморозь', 'enemy', 1.18, 'ice', 'Игольчатая изморозь · дротик в одного героя'),
  { id: 'forged_weaver_mend', name: 'Латка из тины', mp: 0, target: 'ally', kind: 'heal', power: 47, element: 'light',
    telegraph: 'Латка из тины · восстановит до 47 HP самому раненому врагу', description: 'Восстанавливает HP самому раненому врагу.' },
  strike('forged_wisp_spark', 'Искра тока', 'enemy', 1.14, 'light', 'Искра тока · разряд в одного героя'),
  strike('forged_wisp_discharge', 'Разлив тока', 'allEnemies', .77, 'light', 'Разлив тока · молния по всему отряду', 'all'),
  stand('forged_guard_stand', 'Упор заклёпки', 'Упор заклёпки · закроется щитом перед тяжёлым ударом'),
  strike('forged_guard_rivet', 'Клёпаный замах', 'enemy', 1.65, 'physical', 'Клёпаный замах · тяжёлый удар в одного героя. Можно сбить', 'heavy'),
];

const type = (id, name, kind, stats, xp, gold, skills, weakness) =>
  ({ id, name, kind, stats: { ...stats, mp: 99 }, skills, weakness, rewards: { xp, gold, items: [] } });

const types = [
  type('forged_resin_lynx', 'Смоляная рысь', 'husk',
    { hp: 100, atk: 26, def: 9, speed: 18 }, 38, 18, ['forged_lynx_lunge', 'enemy_claw'], 'fire'),
  type('forged_slag_golem', 'Шлаковый голем', 'sentinel',
    { hp: 182, atk: 31, def: 18, speed: 9 }, 55, 25, ['forged_slag_shell', 'forged_slag_eruption', 'enemy_claw'], 'ice'),
  type('forged_fen_weaver', 'Камышовый шептун', 'acolyte',
    { hp: 135, atk: 31, def: 11, speed: 17 }, 48, 24, ['forged_weaver_needle', 'forged_weaver_mend'], 'fire'),
  type('forged_mill_wisp', 'Мельничный огонёк', 'acolyte',
    { hp: 132, atk: 34, def: 11, speed: 20 }, 54, 27, ['forged_wisp_spark', 'forged_wisp_discharge'], 'ice'),
  type('forged_rivet_guard', 'Клёпаный караульный', 'sentinel',
    { hp: 205, atk: 39, def: 21, speed: 11 }, 64, 32, ['enemy_claw', 'forged_guard_stand', 'forged_guard_rivet'], 'light'),
];

const patrols = [
  { id: 'forged_resin_lynx_den', area: 'briarwood', label: 'Рысь у смоляных следов', at: [32, 49],
    level: 3, enemies: ['forged_resin_lynx', 'resin_moth'], stroll: [.96, .53, 5.6] },
  { id: 'forged_slag_golem_yard', area: 'quarry', label: 'Голем у шлакового отвала', at: [55, -32],
    level: 5, enemies: ['forged_slag_golem', 'iron_rat'], stroll: [1.16, -.18, 8.6] },
  { id: 'forged_fen_weaver_pool', area: 'fen', label: 'Шептун у камышовых мостков', at: [-27, 26],
    level: 6, enemies: ['forged_fen_weaver', 'reed_stalker'], stroll: [.46, 1.12, 7.5] },
  { id: 'forged_mill_wisp_bank', area: 'sunfields', label: 'Огонёк у мельничной воды', at: [-29, 42],
    level: 8, enemies: ['forged_mill_wisp', 'hollow_reaper'], stroll: [.57, 1.22, 6.4] },
  { id: 'forged_rivet_guard_post', area: 'fortress', label: 'Резервный караул у водосброса', at: [47, -47],
    level: 9, enemies: ['forged_rivet_guard', 'fortress_archer'], stroll: [-1.13, .5, 8.1] },
];

export function extendForgedEncounters({ ENEMIES, SKILLS, AREAS, AREA_LAYOUTS }) {
  for (const skill of skills) SKILLS[skill.id] = skill;
  for (const enemy of types) ENEMIES[enemy.id] = enemy;
  for (const { id, area, label, at, level, enemies, stroll } of patrols) {
    const zone = AREAS.find(zone => zone.id === area);
    const [x, z] = at;
    AREA_LAYOUTS[area].positions[id] = at;
    zone.encounters.push({ id, x, z, label, level, enemies, radius: 3.8, required: false, stroll });
  }
}
