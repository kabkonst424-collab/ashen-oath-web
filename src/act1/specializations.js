const move = (id, name, kind, target, element, mp, power, description, heroEffects, presentation) =>
  ({id, name, kind, target, element, mp, power, description, heroEffects, presentation});

const PATHS = {
  alar: {
    name: 'Путь обета', foundation: 'Выучка капитана', stats: {def: 2, physicalPower: 3},
    choices: [
      move('oath_company', 'Обет товарищей', 'guard', 'allAllies', 'light', 17, .30,
        'Живые спутники получают на 30% меньше урона до конца следующего раунда. Барьер защищает каждого до начала его второго хода.',
        {barrier: {base: 14, scale: .20, turns: 2}}, 'shield_wall'),
      move('dawn_verdict', 'Приговор рассвета', 'damage', 'enemy', 'light', 12, 1.42,
        'Снимает стойку и наносит удар светом. Пока враг снова не встанет в стойку, отряд может атаковать его без неё.',
        {stripGuard: true}, 'sun_cut'),
    ],
  },
  myrt: {
    name: 'Путь следопыта', foundation: 'Верный прицел', stats: {initiative: 2, physicalPower: 3},
    choices: [
      move('briar_net', 'Терновая сеть', 'damage', 'allEnemies', 'physical', 24, .65,
        'Задевает всех врагов. На два действия ослабляет их броню на 25%, а ближайшую атаку — на 22%.',
        {fracture: true, chill: {percent: 22}}, 'crossfire'),
      move('keen_arrow', 'Дальняя стрела', 'damage', 'enemy', 'physical', 18, 1.58,
        'Сильный одиночный выстрел проходит сквозь защитную стойку цели.',
        {ignoreGuard: true}, 'briar_shot'),
    ],
  },
  elian: {
    name: 'Путь эха', foundation: 'Память контура', stats: {mp: 8, spellPower: 3},
    choices: [
      move('winter_echo', 'Зимний отголосок', 'damage', 'allEnemies', 'ice', 25, .89,
        'Задевает всех врагов холодом и уменьшает силу их следующей атаки на 28%.',
        {chill: {percent: 28}}, 'frost_mirror'),
      move('tidal_circle', 'Круг отлива', 'guard', 'allAllies', 'light', 25, .18,
        'Живые союзники получают на 18% меньше урона до конца следующего раунда. Сильный барьер рассеивается в начале второго хода каждого союзника.',
        {barrier: {base: 18, scale: .36, turns: 2}}, 'ward_circuit'),
    ],
  },
  iona: {
    name: 'Путь печати', foundation: 'Двойная строка', stats: {initiative: 2, spellPower: 3},
    choices: [
      move('ember_folio', 'Огненная азбука', 'damage', 'enemy', 'fire', 22, 1.15,
        'Огонь перескакивает на второго врага с 55% мощности. Обе цели горят перед двумя следующими действиями.',
        {chain: true, burn: {base: 7, scale: .14, turns: 2}}, 'ember_script'),
      move('stitched_seal', 'Сшитая печать', 'damage', 'enemy', 'light', 18, .94,
        'Снимает стойку. В течение двух действий врага его первая попытка колдовать заменяется обычной атакой.',
        {stripGuard: true, disrupt: true}, 'ink_seal'),
    ],
  },
  radan: {
    name: 'Путь караула', foundation: 'Крепкий строй', stats: {hp: 14, initiative: 2},
    choices: [
      move('last_line', 'Последний рубеж', 'guard', 'allAllies', 'physical', 16, .30,
        'Живые спутники получают на 30% меньше урона до конца следующего раунда. Мощный барьер помогает пережить резкий удар.',
        {barrier: {base: 20, scale: .35, turns: 2}}, 'shield_wall'),
      move('spear_retort', 'Ответ остриём', 'damage', 'enemy', 'physical', 12, 1.23,
        'Раскалывает броню на два действия. Удар по готовящему тяжёлую или массовую атаку усиливается на 45% и прерывает её, если у цели сейчас нет защиты от прерывания.',
        {heavyPunish: true, fracture: true}, 'counter_charge'),
    ],
  },
  leia: {
    name: 'Путь светоча', foundation: 'Ровное пламя', stats: {mp: 8, healingPower: 4},
    choices: [
      move('returning_flame', 'Возвратное пламя', 'revive', 'ally', 'light', 27, .53,
        'Поднимает одного павшего союзника с 53% здоровья. В бою ему также достаётся световой барьер.',
        {barrier: {base: 16, scale: .31, turns: 2}}, 'wake_flame'),
      move('hearth_circle', 'Круг тепла', 'heal', 'allAllies', 'light', 25, .40,
        'Исцеляет весь живой отряд. В бою каждый дополнительно восстанавливает здоровье в начале двух следующих ходов.',
        {regen: {base: 12, scale: .22, turns: 2}}, 'shared_breath'),
    ],
  },
};

const foundationId = heroId => `${heroId}_specialization`;

export function specializationBranch(heroId) {
  const path = PATHS[heroId];
  return {
    id: 'specialization', name: path.name, levels: [12, 18, 18],
    nodes: [
      {id: foundationId(heroId), name: path.foundation, description: 'Открывает выбор специализации на 18-м уровне.', stats: path.stats},
      ...path.choices.map(skill => ({
        id: skill.id, name: skill.name, description: skill.description, unlockSkillId: skill.id,
        requires: foundationId(heroId), exclusive: 'specialization',
      })),
    ],
  };
}

export function addSpecializationSkills(party, skills) {
  for (const hero of party) {
    for (const skill of PATHS[hero.id].choices) {
      skills[skill.id] = {...skill, level: 18, requiresTalent: skill.id};
      hero.skills.push(skill.id);
    }
  }
}
