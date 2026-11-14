export const STARTERS = Object.freeze(['alar', 'myrt', 'elian']);
export const LEVEL_CAP = 30;
export const ACT_ENTRY_LEVELS = Object.freeze({ 2: 13, 3: 16, 4: 19, 5: 22, 6: 25 });
// Later opponents can keep up with high-initiative trinkets and late-game runes.
export const BOSS_CHAPTER_PRESSURE = Object.freeze({
 c2_boss: { power: 1.12, phaseInitiative: 5, peakPressure: 1.08 },
 c3_boss: { power: 1.20, phaseInitiative: 9, peakPressure: 1.11 },
 c4_boss: { power: 1.30, phaseInitiative: 12, peakPressure: 1.16 },
 c5_boss: { power: 1.40, phaseInitiative: 13, peakPressure: 1.20 },
 c6_boss: { power: 1.50, phaseInitiative: 15, peakPressure: 1.25 },
});
const POINT_LEVELS = [4, 8, 12, 18];
const NODE_LEVELS = [4, 9, 17];

const node = (id, name, description, effect) => ({ id, name, description, ...effect });
const attribute = (id, name, description, stats) => node(id, name, description, { stats });
const rune = (id, name, description, skillId, adjustment) => node(id, name, description, { skill: { id: skillId, ...adjustment } });
const branch = (id, name, nodes) => ({ id, name, nodes });

const TREES = {
 alar: [
  branch('dawn', 'Клинок рассвета', [
   attribute('first_ray', 'Первый луч', '+4 к атаке и +1 к инициативе.', { atk: 4, initiative: 1 }),
   rune('dawn_edge', 'Острие рассвета', 'Рассветный разрез получает ×1,14 к мощности и стоит на 1 MP меньше.', 'sun_cut', { powerScale: 1.14, mpDelta: -1 }),
   rune('dawn_wave', 'Тихое пламя', 'Волна углей наносит световой урон. Следующая атака врага слабее на 30%.', 'cinder_wave', { element: 'light', heroEffects: { chill: { percent: 30 } } }),
  ]),
  branch('oath', 'Щит обета', [
   attribute('oath_steel', 'Сталь обета', '+16 к запасу здоровья и +3 к защите.', { hp: 16, def: 3 }),
   rune('oath_wall', 'Твёрдый обет', 'Стойкость обета добавляет личный барьер на два начала хода.', 'oath_guard', { heroEffects: { barrier: { base: 14, scale: .32, turns: 2 } } }),
   rune('oath_shelter', 'Укрытие', 'Связанный обет снижает входящий урон прикрытого героя на 38% и ставит ему барьер.', 'oath_link', { power: .38, heroEffects: { barrier: { base: 12, scale: .36, turns: 2 } } }),
  ]),
 ],
 myrt: [
  branch('hunt', 'След зверя', [
   attribute('hunt_alert', 'Чуткое ухо', '+4 к инициативе и +2 к атаке.', { initiative: 4, atk: 2 }),
   rune('hunt_barb', 'Зазубренное остриё', 'Терновый наконечник наносит прямой удар и оставляет кровотечение на три действия врага.', 'briar_shot', { heroEffects: { burn: { base: 8, scale: .17, turns: 3 }, bleed: true } }),
   rune('hunt_volley', 'Обратная засада', 'Перекрёстный залп получает ×1,16 к мощности и снижает следующую атаку врагов на 18%.', 'crossfire', { powerScale: 1.16, heroEffects: { chill: { percent: 18 } } }),
  ]),
  branch('paths', 'Тропа дозорного', [
   attribute('paths_cover', 'Знание укрытий', '+16 к запасу здоровья и +3 к защите.', { hp: 16, def: 3 }),
   rune('paths_brush', 'Живой заслон', 'Защита из зарослей даёт личный барьер перед ответным ударом.', 'brush_guard', { heroEffects: { barrier: { base: 12, scale: .30, turns: 2 } } }),
   rune('paths_breath', 'Ровное дыхание', 'Тихий привал восстанавливает 18 MP и снижает входящий урон на 52%.', 'trail_breath', { power: .52, heroEffects: { restoreSelfMana: 18 } }),
  ]),
 ],
 elian: [
  branch('storms', 'Соль и гроза', [
   attribute('storms_charge', 'Заряженный воздух', '+3 к атаке и +10 к запасу маны.', { atk: 3, mp: 10 }),
   rune('storms_arc', 'Второй разряд', 'Соляной разряд перескакивает на второго врага с 55% мощности.', 'salt_bolt', { heroEffects: { chain: true } }),
   rune('storms_ember', 'Волна разлома', 'Расходящееся эхо обходит стойку и оставляет горение на два действия врага.', 'echo_burst', { heroEffects: { ignoreGuard: true, burn: { base: 7, scale: .12, turns: 2 } } }),
  ]),
  branch('circles', 'Круг хранителя', [
   attribute('circles_hold', 'Размеченный круг', '+14 к запасу здоровья и +3 к защите.', { hp: 14, def: 3 }),
   rune('circles_mend', 'Тихий свет', 'Бледная нить получает ×1,2 к мощности лечения и расходует на 1 MP меньше.', 'pale_mend', { powerScale: 1.20, mpDelta: -1 }),
   rune('circles_aegis', 'Медная кромка', 'Охранительный контур ставит небольшой барьер всему отряду в дополнение к защитной стойке.', 'ward_circuit', { heroEffects: { barrier: { base: 8, scale: .20, turns: 2 } } }),
  ]),
 ],
 iona: [
  branch('weather', 'Школа погод', [
   attribute('weather_ink', 'Живые чернила', '+4 к атаке и +8 к запасу маны.', { atk: 4, mp: 8 }),
   rune('weather_ember', 'Въедливые угли', 'Угольная запись наносит на 14% больше базового урона и дольше жжёт.', 'ember_script', { powerScale: 1.14, heroEffects: { burn: { base: 8, scale: .19, turns: 3 } } }),
   rune('weather_frost', 'Зимнее поле', 'Морозная помета снижает силу следующей атаки врага на 45% и стоит на 1 MP меньше.', 'frost_margin', { mpDelta: -1, heroEffects: { chill: { percent: 45 } } }),
  ]),
  branch('seals', 'Архив печатей', [
   attribute('seal_margin', 'Свободное поле', '+3 к защите и +2 к инициативе.', { def: 3, initiative: 2 }),
   rune('seal_ink', 'Прочная печать', 'Чернильная печать стоит на 3 MP меньше и раскрывает броню врага.', 'ink_seal', { mpDelta: -3, heroEffects: { fracture: true } }),
   rune('seal_lightning', 'Разрыв контура', 'Цепь озарений наносит электрический урон и снимает активную стойку цели.', 'lightning_chain', { element: 'lightning', heroEffects: { stripGuard: true } }),
  ]),
 ],
 radan: [
  branch('watch', 'Дозор на заставе', [
   attribute('watch_plate', 'Усиленная подкладка', '+18 к запасу здоровья и +3 к защите.', { hp: 18, def: 3 }),
   rune('watch_wall', 'Двойная линия', 'Сомкнуть щиты снижает урон на 51% и стоит на 1 MP меньше.', 'shield_wall', { power: .51, mpDelta: -1 }),
   rune('watch_brace', 'Жить до утра', 'Умение «Принять удар» добавляет один ответный удар и усиливает личный барьер.', 'brace_impact', { heroEffects: { counter: true, barrier: { base: 36, scale: .70, turns: 2 } } }),
  ]),
  branch('spear', 'Школа копья', [
   attribute('spear_step', 'Длинный шаг', '+4 к атаке и +2 к инициативе.', { atk: 4, initiative: 2 }),
   rune('spear_charge', 'Короткий выпад', 'Сбить разгон стоит на 2 MP меньше и наносит на 10% больше базового урона.', 'counter_charge', { mpDelta: -2, powerScale: 1.10 }),
   rune('spear_sweep', 'Ломая строй', 'Железная дуга дополнительно ослабляет броню задетых врагов.', 'iron_sweep', { heroEffects: { fracture: true } }),
  ]),
 ],
 leia: [
  branch('mercy', 'Руки лекарки', [
   attribute('mercy_stock', 'Запас настоев', '+12 к запасу маны и +12 к запасу здоровья.', { mp: 12, hp: 12 }),
   rune('mercy_hands', 'Живое тепло', 'Тёплые ладони исцеляют на 18% больше и ставят барьер тяжелораненому.', 'warm_hands', { powerScale: 1.18, heroEffects: { emergencyBarrier: { threshold: .35, base: 12, scale: .28, turns: 2 } } }),
   rune('mercy_wake', 'Второе дыхание', 'Искра возвращения поднимает с 58% здоровья и стоит на 2 MP меньше.', 'wake_flame', { power: .58, mpDelta: -2 }),
  ]),
  branch('hymn', 'Проводница света', [
   attribute('hymn_glow', 'Тёплый металл', '+3 к атаке и +2 к защите.', { atk: 3, def: 2 }),
   rune('hymn_spark', 'Отзвук искры', 'Медная искра лечит самого раненого на 36% нанесённого урона.', 'copper_spark', { heroEffects: { lifeHeal: .36 } }),
   rune('hymn_ward', 'Протяжная песнь', 'Песня заслона даёт более прочные барьеры и стоит на 2 MP меньше.', 'warding_hymn', { mpDelta: -2, heroEffects: { barrier: { base: 29, scale: .78, turns: 2 } } }),
  ]),
 ],
};

const nodesFor = (heroId) => (TREES[heroId] || []).flatMap(b => b.nodes);
const pointsAt = level => POINT_LEVELS.filter(required => level >= required).length;

export function talentCatalog(hero, learned = [], mode = 'explore') {
 const totalPoints = pointsAt(hero.level), points = totalPoints - learned.length;
 return { heroId: hero.id, points, totalPoints, spent: learned.length, branches: (TREES[hero.id] || []).map(b => ({
  id: b.id, name: b.name, nodes: b.nodes.map(({ id, name, description }, index) => {
   const level = NODE_LEVELS[index], acquired = learned.includes(id), predecessor = b.nodes[index - 1];
   const reason = acquired ? 'Изучено' : hero.level < level ? `Требуется уровень ${level}` :
    predecessor && !learned.includes(predecessor.id) ? `Сначала изучите «${predecessor.name}»` :
    points < 1 ? 'Нет очков талантов' : mode !== 'explore' ? 'Таланты изучаются в пути' : '';
   return { id, name, description, level, cost: 1, learned: acquired, available: !reason, reason };
  }),
 })) };
}

export function validTalents(hero, learned) {
 if (!Number.isSafeInteger(hero.level) || hero.level < 1 || hero.level > LEVEL_CAP || !Array.isArray(learned) || learned.length > pointsAt(hero.level) || new Set(learned).size !== learned.length) return false;
 const catalog = talentCatalog(hero, learned);
 return learned.every(id => catalog.branches.some(b => {
  const i = b.nodes.findIndex(n => n.id === id);
  return i >= 0 && hero.level >= b.nodes[i].level && (!i || learned.includes(b.nodes[i - 1].id));
 }));
}

export function talentBonuses(heroId, learned = []) {
 const result = {};
 if (!learned.length) return result;
 for (const n of nodesFor(heroId)) if (learned.includes(n.id)) {
  for (const [stat, value] of Object.entries(n.stats || {})) result[stat] = (result[stat] || 0) + value;
 }
 return result;
}

export function runedSkill(heroId, skill, learned = []) {
 if (!learned.length) return skill;
 const rune = nodesFor(heroId).find(n => n.skill?.id === skill.id && learned.includes(n.id));
 if (!rune) return skill;
 const { power, powerScale, mpDelta = 0, element, heroEffects } = rune.skill;
 const resultPower = power ?? (powerScale ? (skill.power || 1) * powerScale : skill.power);
 return { ...skill, power: resultPower === undefined ? undefined : Math.round(resultPower * 10000) / 10000,
  mp: Math.max(0, (skill.mp ?? skill.cost ?? 0) + mpDelta), element: element || skill.element,
  heroEffects: { ...skill.heroEffects, ...heroEffects }, runeId: rune.id, runeName: rune.name,
  description: `Руна «${rune.name}». ${rune.description}` };
}

export const experienceThreshold = level => level * 85;
export const experienceAtLevel = level => 85 * (level - 1) * level / 2;
