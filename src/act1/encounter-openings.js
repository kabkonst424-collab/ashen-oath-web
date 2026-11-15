// These plans modify the first round of a new battle. Saved rounds keep their authored state.
const stance = {guard: 1};
const unit = (index, intent, skillId, telegraph, status) => ({index, intent, skillId, telegraph, status});

export const ENCOUNTER_OPENINGS = {
  patrol_monastery_cloister: {
    title: 'Страж у кельи',
    units: [unit(0, 'attack', 'enemy_claw', 'Укрывается перед обычным ударом. Стойка спадёт с его первым действием.', stance)],
  },
  patrol_briarwood_thicket: {
    title: 'Наскок из терновника',
    units: [unit(0, 'heavy', null, 'Волк припадает к земле перед сильным броском. Подготовку можно прервать.')],
  },
  patrol_archive_shelves: {
    title: 'Чтец у стеллажа',
    units: [unit(1, 'heal', 'enemy_mend', 'Хочет вылечить Рой. Если никто не ранен, поднимет щит.')],
  },
  patrol_salt_coast_moorings: {
    title: 'Заслон на причале',
    units: [
      unit(0, 'guard', null, 'Перегораживает сходни и готовится удерживать стойку.', stance),
      unit(1, 'heavy', 'c2_salvage', 'За спиной защитника замахивается якорным крюком. Замах можно сбить.'),
    ],
  },
  patrol_drowned_beacon_tideline: {
    title: 'Холод с полосы отлива',
    units: [
      unit(0, 'guard', null, 'Готовится закрыть полосу отлива щитом.'),
      unit(1, 'attack', 'c2_drown', 'Пока страж занимает проход, готовит одиночный удар ледяной водой.'),
    ],
  },
  c2_side_fight: {
    title: 'Застигнут на отливе',
    units: [unit(0, 'heavy', 'c2_salvage', 'Тяжёлый удар ослаблен холодом на 22%.', {chill: 1, chillPower: 22})],
  },
  patrol_white_pass_ledge: {
    title: 'Сосульки у карниза',
    units: [unit(0, 'attack', 'enemy_ice', 'Направляет ледяной осколок в одного героя, пока зверь готовит таран.')],
  },
  patrol_frost_observatory_ward: {
    title: 'Связка у линз',
    units: [
      unit(0, 'guard', null, 'Первый страж уже прикрылся и усилит оборону своим ходом.', stance),
      unit(2, 'heal', 'c3_stitch', 'Готов сшить рану одного стража. Без раненых перейдёт в стойку.'),
    ],
  },
  c3_side_fight: {
    title: 'Треснувшая наледь',
    units: [unit(0, 'heavy', 'c3_glasshorn', 'Готовит таран. Треснувший панцирь ослаблен на 25% до двух его действий.', {fracture: 2})],
  },
  patrol_slag_terraces_kilns: {
    title: 'Две стихии у печей',
    units: [
      unit(0, 'attack', 'c4_cinders', 'Из стойки готовит одиночный огненный удар.', stance),
      unit(1, 'attack', 'enemy_ice', 'Готовит удар остывшим осколком. Он наносит урон холодом.'),
    ],
  },
  patrol_ember_forge_furnaces: {
    title: 'Тиски нижней плавильни',
    units: [
      unit(1, 'heavy', null, 'Нагибается над горном для тяжёлого выпада. Его можно прервать.'),
      unit(2, 'guard', 'c4_bellows', 'Позади рабочих уже держит защиту и собирается её продлить.', stance),
    ],
  },
  c4_side_fight: {
    title: 'Пауза у остывшего горна',
    units: [unit(0, 'guard', null, 'Закроется перед первым огненным выпадом. Пока он готовит стойку, есть время для ответа.')],
  },
  patrol_mirror_garden_mirror: {
    title: 'Щит за отражением',
    units: [
      unit(1, 'guard', 'c5_reflection', 'Средний двойник держит зеркало щитом. Открытый передний враг готовит световой удар.', stance),
      unit(2, 'attack', 'enemy_ice', 'Крайний двойник посылает ледяной осколок в одного героя.'),
    ],
  },
  patrol_glass_city_vault: {
    title: 'Заглушённый отблеск',
    units: [
      unit(0, 'attack', 'c5_refract', 'Готовит световой луч, но остаточная печать сорвёт первое заклинание.', {disrupt: 1}),
      unit(2, 'guard', 'c5_reflection', 'Заслоняет дальнюю сторону свода, пока напарники наступают.', stance),
    ],
  },
  c5_side_fight: {
    title: 'Выпад из-за зеркала',
    units: [unit(0, 'attack', 'c5_refract', 'Световой удар готовится из уже поднятой стойки. Выберите снятие стойки или прикройтесь.', stance)],
  },
  patrol_wind_cape_scree: {
    title: 'Заслон на осыпи',
    units: [
      unit(1, 'guard', null, 'Средний враг прикрывает осыпь. Он уже в стойке.', stance),
      unit(2, 'heavy', 'c6_register', 'Задний враг готовит тяжёлый выпад. Передний готовит молнию.'),
    ],
  },
  patrol_voice_amphitheatre_gallery: {
    title: 'Проводящий зал',
    units: [
      unit(0, 'all', 'c6_copper_voice', 'Разводит молнию по всей галерее. Под ударом весь отряд.'),
      unit(1, 'guard', null, 'Прикрывает проводник. Перед первым ходом уже защищён.', stance),
    ],
  },
  c6_side_fight: {
    title: 'Ошеломлённый сторож',
    units: [unit(0, 'attack', 'c6_copper_voice', 'Потерял равновесие при обвале. Пропустит первое действие.', {break: 1})],
  },
};

export function applyOpening(battle, plan) {
  if (!plan) return;
  for (const {index, intent, skillId, telegraph, status} of plan.units) {
    const enemy = battle.enemies[index];
    Object.assign(enemy, {intent, skillId, telegraph});
    Object.assign(enemy.status, status);
  }
  battle.openingApplied = true;
}
