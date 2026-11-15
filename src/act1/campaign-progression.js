import {specializationBranch} from './specializations.js?v=campaign-170';

export const STARTERS = Object.freeze(['alar', 'myrt', 'elian']);
export const LEVEL_CAP = 30;
export const ACT_ENTRY_LEVELS = Object.freeze({ 2: 13, 3: 16, 4: 19, 5: 22, 6: 25 });
// Later opponents can keep up with high-initiative trinkets and late-game runes.
export const BOSS_CHAPTER_PRESSURE = Object.freeze({
 c2_boss: { power: 1.12, phaseInitiative: 5, peakPressure: 1.08 },
 c3_boss: { power: 1.20, phaseInitiative: 9, peakPressure: 1.11 },
 c4_boss: { power: 1.30, phaseInitiative: 12, peakPressure: 1.23 },
 c5_boss: { power: 1.40, phaseInitiative: 13, peakPressure: 1.28 },
 c6_boss: { power: 1.50, phaseInitiative: 15, peakPressure: 1.34 },
});
const POINT_LEVELS = [4, 6, 8, 12, 13, 16, 18, 20, 23, 27];
const NODE_LEVELS = [4, 9, 17];
const CAMPAIGN_NODE_LEVELS = [6, 13, 16, 20, 23, 27];

const node = (id, name, description, effect) => ({ id, name, description, ...effect });
const attribute = (id, name, description, stats) => node(id, name, description, { stats });
const rune = (id, name, description, skillId, adjustment) => node(id, name, description, { skill: { id: skillId, ...adjustment } });
const branch = (id, name, nodes, levels = NODE_LEVELS) => ({ id, name, nodes, levels });
const campaignBranch = (name, nodes) => branch('campaign', name, nodes, CAMPAIGN_NODE_LEVELS);

const TREES = {
 alar: [
  branch('dawn', 'Клинок рассвета', [
   attribute('first_ray', 'Первый луч', '+4 к атаке и +1 к инициативе.', { atk: 4, initiative: 1 }),
   rune('dawn_edge', 'Острие рассвета', 'Рассветный разрез стоит 7 MP и теряет 7% базовой мощности. По тяжёлому или массовому замаху мощность ×1,45. Срыв одного действия возможен у цели без защиты от прерывания.', 'sun_cut', { powerScale: .93, mpDelta: 3, heroEffects: { heavyPunish: true } }),
   rune('dawn_wave', 'Тихое пламя', 'Волна углей стоит 13 MP, наносит световой урон и ослабляет следующую атаку каждого врага на 30%. Самый истощённый спутник получает до 4 MP. Базовая мощность ниже на 6%.', 'cinder_wave', { element: 'light', powerScale: .94, mpDelta: 2, heroEffects: { chill: { percent: 30 }, rallyMana: 4 } }),
  ]),
  branch('oath', 'Щит обета', [
   attribute('oath_steel', 'Сталь обета', '+16 к запасу здоровья и +3 к защите.', { hp: 16, def: 3 }),
   rune('oath_wall', 'Твёрдый обет', 'Стойкость обета снижает урон на 58%, ставит личный барьер и восстанавливает HP в начале двух ходов. Один ответный удар после получения физического урона сохраняется.', 'oath_guard', { power: .58, heroEffects: { barrier: { base: 14, scale: .32, turns: 2 }, regen: { base: 5, scale: .12, turns: 2 } } }),
   rune('oath_shelter', 'Укрытие', 'Связанный обет стоит 12 MP. Прикрытый спутник получает барьер и до 5 MP. Его стойка снижает урон на 38%, Алар принимает 30% того, что осталось после стойки.', 'oath_link', { power: .38, mpDelta: 2, heroEffects: { barrier: { base: 12, scale: .36, turns: 2 }, manaTransfer: 5 } }),
  ]),
  campaignBranch('Долг хранителя', [
   attribute('keeper_resolve', 'Выдержка', '+10 к запасу здоровья и +2 к защите.', { hp: 10, def: 2 }),
   attribute('keeper_watch', 'Первый на страже', '+3 к инициативе.', { initiative: 3 }),
   rune('keeper_aid', 'Свет над раной', 'Последний свет стоит 8 MP и лечит на 15% больше. Если до лечения у союзника не больше 35% HP, он получает ещё до 18 HP. В бою тяжелораненого также защищает барьер.', 'last_light', { powerScale: 1.15, mpDelta: -2, heroEffects: { emergencyBarrier: { threshold: .35, base: 18, scale: .28, turns: 2 }, triage: { threshold: .35, bonus: 18 } } }),
   attribute('keeper_sinew', 'Стойкость караула', '+18 к запасу здоровья и +3 к защите.', { hp: 18, def: 3 }),
   attribute('keeper_ember', 'Свет в кольчуге', '+9 к запасу маны и +3 к атаке.', { mp: 9, atk: 3 }),
   rune('keeper_bastion', 'Вызов бастиона', 'Вызов рассвета стоит на 2 MP меньше и даёт Алару более прочный барьер на три начала его хода.', 'dawn_challenge', { mpDelta: -2, heroEffects: { barrier: { base: 30, scale: .62, turns: 3 } } }),
  ]),
 ],
 myrt: [
  branch('hunt', 'След зверя', [
   attribute('hunt_alert', 'Чуткое ухо', '+4 к инициативе и +2 к атаке.', { initiative: 4, atk: 2 }),
   rune('hunt_barb', 'Зазубренное остриё', 'Терновый наконечник стоит 10 MP. Прямой удар слабее на 18%, зато цель кровоточит три действия. Против тяжёлого или массового замаха мощность ×1,45 и срыв одного действия, если нет защиты от прерывания.', 'briar_shot', { powerScale: .82, mpDelta: 4, heroEffects: { burn: { base: 8, scale: .17, turns: 3 }, bleed: true, heavyPunish: true } }),
   rune('hunt_volley', 'Обратная засада', 'Перекрёстный залп стоит 12 MP и наносит на 10% меньше базового урона. Снимает стойки всех врагов и ослабляет их следующие атаки на 18%.', 'crossfire', { powerScale: .90, mpDelta: 2, heroEffects: { stripGuard: true, chill: { percent: 18 } } }),
  ]),
  branch('paths', 'Тропа дозорного', [
   attribute('paths_cover', 'Знание укрытий', '+16 к запасу здоровья и +3 к защите.', { hp: 16, def: 3 }),
   rune('paths_brush', 'Живой заслон', 'Защита из зарослей стоит 6 MP и ставит личный барьер. Мирт перехватывает одиночные атаки и может ответить ударом после получения физического урона.', 'brush_guard', { mpDelta: 2, heroEffects: { barrier: { base: 12, scale: .30, turns: 2 }, tauntSelf: true } }),
   rune('paths_breath', 'Ровное дыхание', 'Тихий привал восстанавливает 18 MP и снижает входящий урон на 52%.', 'trail_breath', { power: .52, heroEffects: { restoreSelfMana: 18 } }),
  ]),
  campaignBranch('Охота за гранью', [
   attribute('range_wind', 'Попутный ветер', '+2 к атаке и +2 к инициативе.', { atk: 2, initiative: 2 }),
   attribute('range_patience', 'Терпение следопыта', '+12 к запасу здоровья и +5 к запасу маны.', { hp: 12, mp: 5 }),
   rune('range_sign', 'Подбитое крыло', 'Метка охотника стоит 6 MP и теряет 10% базовой мощности. Два действия цель остаётся с расколотой бронёй. Её первая попытка применить магию за это время становится обычной атакой.', 'trail_mark', { powerScale: .90, mpDelta: 2, heroEffects: { disrupt: true } }),
   attribute('range_stride', 'Шаг по карнизу', '+3 к инициативе и +2 к защите.', { initiative: 3, def: 2 }),
   attribute('range_draw', 'Тугой лук', '+5 к атаке.', { atk: 5 }),
   rune('range_turn', 'Лиса у порога', 'Лисий шаг стоит 7 MP, его базовая мощность выше на 7%. Он обходит стойку цели и может сбить её равновесие на два действия.', 'fox_step', { mpDelta: -1, powerScale: 1.07, heroEffects: { ignoreGuard: true } }),
  ]),
 ],
 elian: [
  branch('storms', 'Соль и гроза', [
   attribute('storms_charge', 'Заряженный воздух', '+3 к атаке и +10 к запасу маны.', { atk: 3, mp: 10 }),
   rune('storms_arc', 'Второй разряд', 'Соляной разряд стоит 8 MP и теряет 18% базовой мощности. Второй враг получает разряд с 55% мощности. Печать на обеих целях превращает их первую попытку колдовать в обычную атаку в течение двух действий.', 'salt_bolt', { powerScale: .82, mpDelta: 4, heroEffects: { chain: true, disrupt: true } }),
   rune('storms_ember', 'Волна разлома', 'Расходящееся эхо стоит 14 MP и теряет 10% базовой мощности. Оно обходит стойки и оставляет горение на два действия врагов. Самый раненый живой спутник получает HP в размере 16% урона самой волны.', 'echo_burst', { powerScale: .90, mpDelta: 3, heroEffects: { ignoreGuard: true, burn: { base: 7, scale: .12, turns: 2 }, lifeHeal: .16 } }),
  ]),
  branch('circles', 'Круг хранителя', [
   attribute('circles_hold', 'Размеченный круг', '+14 к запасу здоровья и +3 к защите.', { hp: 14, def: 3 }),
   rune('circles_mend', 'Тихий свет', 'Бледная нить стоит 7 MP и получает ×1,07 к мощности. В бою она также восстанавливает здоровье в начале двух ходов цели. При тяжёлом ранении сохраняется прибавка до 12 HP.', 'pale_mend', { powerScale: 1.07, mpDelta: -1, heroEffects: { regen: { base: 6, scale: .14, turns: 2 } } }),
   rune('circles_aegis', 'Медная кромка', 'Охранительный контур стоит 9 MP и ставит барьеры всему живому отряду. Каждый сохраняет свою текущую стойку. Барьер держится до начала второго хода владельца.', 'ward_circuit', { mpDelta: 1, heroEffects: { barrier: { base: 17, scale: .33, turns: 2 }, barrierOnly: true } }),
  ]),
  campaignBranch('Страж порогов', [
   attribute('threshold_salt', 'Соль на ладони', '+7 к запасу маны и +2 к инициативе.', { mp: 7, initiative: 2 }),
   attribute('threshold_stone', 'Камень под ногой', '+10 к запасу здоровья и +3 к защите.', { hp: 10, def: 3 }),
   rune('threshold_rime', 'Глубокий иней', 'Зеркало инея стоит на 1 MP меньше и ослабляет следующую атаку цели на 38%.', 'frost_mirror', { mpDelta: -1, heroEffects: { chill: { percent: 38 } } }),
   attribute('threshold_draft', 'Сквозняк разлома', '+4 к атаке и +7 к запасу маны.', { atk: 4, mp: 7 }),
   attribute('threshold_reed', 'Гибкий оберег', '+15 к запасу здоровья и +2 к инициативе.', { hp: 15, initiative: 2 }),
   rune('threshold_echo', 'Печать поперёк', 'Ответная печать стоит 10 MP. Она снимает стойку, ослабляет броню на 25% на два действия и превращает ближайшую попытку колдовать за это время в обычную атаку.', 'counterseal', { mpDelta: 2, heroEffects: { stripGuard: true, fracture: true } }),
  ]),
 ],
 iona: [
  branch('weather', 'Школа погод', [
   attribute('weather_ink', 'Живые чернила', '+4 к атаке и +8 к запасу маны.', { atk: 4, mp: 8 }),
   rune('weather_ember', 'Въедливые угли', 'Огненная строка стоит 6 MP, её базовая мощность выше на 5%. Она оставляет горение на три действия и ослабляет броню цели на 25% на два действия.', 'ember_script', { powerScale: 1.05, mpDelta: 1, heroEffects: { burn: { base: 8, scale: .19, turns: 3 }, fracture: true } }),
   rune('weather_frost', 'Зимнее поле', 'Морозная помета стоит 8 MP и теряет 22% базовой мощности. По тяжёлому или массовому замаху мощность ×1,45. Без защиты от прерывания цель пропускает действие. Следующая атака слабее на 36%.', 'frost_margin', { powerScale: .78, mpDelta: 2, heroEffects: { heavyPunish: true, chill: { percent: 36 } } }),
  ]),
  branch('seals', 'Архив печатей', [
   attribute('seal_margin', 'Свободное поле', '+3 к защите и +2 к инициативе.', { def: 3, initiative: 2 }),
   rune('seal_ink', 'Прочная печать', 'Чернильная печать стоит 15 MP и теряет 13% базовой мощности. Она раскалывает броню и глушит магию основной цели и ещё одного врага. Второму достаётся удар с 55% мощности.', 'ink_seal', { powerScale: .87, mpDelta: 3, heroEffects: { chain: true, fracture: true } }),
   rune('seal_lightning', 'Разрыв контура', 'Цепь озарений стоит 12 MP и бьёт молнией с мощностью ниже на 8%. Снимает стойки обеих целей и ослабляет их следующие атаки на 24%.', 'lightning_chain', { element: 'lightning', powerScale: .92, mpDelta: 2, heroEffects: { stripGuard: true, chill: { percent: 24 } } }),
  ]),
  campaignBranch('Живой архив', [
   attribute('ledger_notes', 'Заметки в пути', '+6 к запасу маны и +2 к атаке.', { mp: 6, atk: 2 }),
   attribute('ledger_stride', 'Почерк на бегу', '+3 к инициативе и +2 к защите.', { initiative: 3, def: 2 }),
   rune('ledger_shards', 'Рассыпанный алфавит', 'Рассыпанные руны стоят на 2 MP меньше и наносят на 10% больше базового урона. Стойки снимаются как обычно.', 'scatter_runes', { mpDelta: -2, powerScale: 1.10 }),
   attribute('ledger_calm', 'Тихая полка', '+12 к запасу здоровья и +8 к запасу маны.', { hp: 12, mp: 8 }),
   attribute('ledger_ink', 'Чернила с медью', '+4 к атаке и +2 к инициативе.', { atk: 4, initiative: 2 }),
   rune('ledger_reply', 'Письмо живому', 'Ясная мысль стоит 10 MP и лечит на 25% больше. В бою другому спутнику передаёт до 9 MP и восстанавливает здоровье в начале двух его ходов. В пути действует прямое лечение.', 'clear_thought', { powerScale: 1.25, mpDelta: 3, heroEffects: { manaTransfer: 9, regen: { base: 4, scale: .12, turns: 2 } } }),
  ]),
 ],
 radan: [
  branch('watch', 'Дозор на заставе', [
   attribute('watch_plate', 'Усиленная подкладка', '+18 к запасу здоровья и +3 к защите.', { hp: 18, def: 3 }),
   rune('watch_wall', 'Двойная линия', 'Сомкнуть щиты стоит 9 MP и снижает урон отряду на 48%. Малые барьеры сохраняются. Самый истощённый спутник получает до 4 MP.', 'shield_wall', { power: .48, mpDelta: 1, heroEffects: { rallyMana: 4 } }),
   rune('watch_brace', 'Жить до утра', 'Принять удар стоит 14 MP. Радан принимает одиночные атаки на себя, снижает урон на 60% и ставит сильный барьер. Может ответить один раз, если получит физический урон.', 'brace_impact', { power: .60, mpDelta: 4, heroEffects: { tauntSelf: true, counter: true, barrier: { base: 36, scale: .70, turns: 2 } } }),
  ]),
  branch('spear', 'Школа копья', [
   attribute('spear_step', 'Длинный шаг', '+4 к атаке и +2 к инициативе.', { atk: 4, initiative: 2 }),
   rune('spear_charge', 'Короткий выпад', 'Сбить разгон стоит 9 MP, теряет 6% базовой мощности и снимает стойку. Против тяжёлого или массового замаха сохраняются множитель ×1,45 и возможность прервать действие.', 'counter_charge', { mpDelta: 2, powerScale: .94, heroEffects: { stripGuard: true } }),
   rune('spear_sweep', 'Ломая строй', 'Железная дуга стоит 12 MP и теряет 16% базовой мощности. Радан раскалывает броню всех задетых врагов на два действия и ослабляет их следующую атаку на 16%. Одиночные атаки направляются на него.', 'iron_sweep', { powerScale: .84, mpDelta: 2, heroEffects: { fracture: true, chill: { percent: 16 } } }),
  ]),
  campaignBranch('Полевой устав', [
   attribute('field_drill', 'Утренняя выучка', '+12 к запасу здоровья и +2 к защите.', { hp: 12, def: 2 }),
   attribute('field_stride', 'На полшага раньше', '+3 к инициативе и +2 к атаке.', { initiative: 3, atk: 2 }),
   rune('field_steel', 'Копьё под щитом', 'Упор копья обходит защитную стойку. Раскол брони сохраняется.', 'spear_thrust', { heroEffects: { ignoreGuard: true } }),
   attribute('field_pack', 'Плечо ветерана', '+14 к запасу здоровья и +8 к запасу маны.', { hp: 14, mp: 8 }),
   attribute('field_brace', 'Крепкая связка', '+4 к защите и +2 к атаке.', { def: 4, atk: 2 }),
   rune('field_rally', 'Походный переклик', 'Держаться вместе стоит 11 MP и лечит на 17% больше. В бою живые союзники с запасом не выше 40% HP до лечения получают барьер. Самый истощённый спутник получает до 6 MP.', 'rally', { powerScale: 1.17, mpDelta: 2, heroEffects: { rallyMana: 6, emergencyBarrier: { threshold: .40, base: 8, scale: .20, turns: 2 } } }),
  ]),
 ],
 leia: [
  branch('mercy', 'Руки лекарки', [
   attribute('mercy_stock', 'Запас настоев', '+12 к запасу маны и +12 к запасу здоровья.', { mp: 12, hp: 12 }),
   rune('mercy_hands', 'Живое тепло', 'Тёплые ладони исцеляют на 18% больше и ставят барьер тяжелораненому.', 'warm_hands', { powerScale: 1.18, heroEffects: { emergencyBarrier: { threshold: .35, base: 12, scale: .28, turns: 2 } } }),
   rune('mercy_wake', 'Второе дыхание', 'Искра возвращения стоит 10 MP и поднимает с 40% здоровья. В бою урон по воскресшему до его следующего хода снижается на 35%.', 'wake_flame', { power: .40, mpDelta: -6 }),
  ]),
  branch('hymn', 'Проводница света', [
   attribute('hymn_glow', 'Тёплый металл', '+3 к атаке и +2 к защите.', { atk: 3, def: 2 }),
   rune('hymn_spark', 'Отзвук искры', 'Медная искра стоит 5 MP и теряет 8% базовой мощности. Она обходит защитную стойку цели и лечит самого раненого живого спутника на 28% фактического урона.', 'copper_spark', { powerScale: .92, mpDelta: 1, heroEffects: { ignoreGuard: true, lifeHeal: .28 } }),
   rune('hymn_ward', 'Протяжная песнь', 'Песня заслона стоит 13 MP и даёт чуть более прочные барьеры. Самый истощённый спутник получает до 6 MP. Текущие стойки отряда сохраняются.', 'warding_hymn', { mpDelta: -1, heroEffects: { barrier: { base: 26, scale: .68, turns: 2 }, rallyMana: 6 } }),
  ]),
  campaignBranch('Обет спутницы', [
   attribute('care_vials', 'Запас перевязи', '+10 к запасу здоровья и +6 к запасу маны.', { hp: 10, mp: 6 }),
   attribute('care_ear', 'Слышать дыхание', '+3 к инициативе и +2 к защите.', { initiative: 3, def: 2 }),
   rune('care_chorus', 'Ровный хор', 'Общее дыхание стоит 14 MP, лечит сразу на 14% больше и усиливает восстановление в начале двух ходов. В бою союзники с запасом не выше 28% HP до лечения дополнительно получают барьер.', 'shared_breath', { powerScale: 1.14, mpDelta: 2, heroEffects: { regen: { base: 10, scale: .18, turns: 2 }, emergencyBarrier: { threshold: .28, base: 7, scale: .14, turns: 2 } } }),
   attribute('care_cloak', 'Подкладка знахарки', '+16 к запасу здоровья и +3 к защите.', { hp: 16, def: 3 }),
   attribute('care_steady', 'Сберечь силы', '+12 к запасу маны и +2 к инициативе.', { mp: 12, initiative: 2 }),
   rune('care_lantern', 'Нить до рассвета', 'Нить возвращения стоит 8 MP и лечит сразу на 18% больше. В бою дарит другому живому спутнику до 5 MP, а постепенное восстановление длится три начала хода цели.', 'healing_thread', { powerScale: 1.18, mpDelta: 2, heroEffects: { regen: { base: 16, scale: .45, turns: 3 }, manaTransfer: 5 } }),
  ]),
 ],
};

for (const [heroId, branches] of Object.entries(TREES)) branches.push(specializationBranch(heroId));
const heroBranches = heroId => Object.hasOwn(TREES, heroId) ? TREES[heroId] : [];
const nodesFor = heroId => heroBranches(heroId).flatMap(branch => branch.nodes);
const pointsAt = level => POINT_LEVELS.filter(required => level >= required).length;

function talentLock(hero, learned, branch, index) {
 const node = branch.nodes[index], required = branch.levels[index];
 if (hero.level < required) return `Требуется уровень ${required}`;
 const predecessor = node.requires ? branch.nodes.find(entry => entry.id === node.requires) : branch.nodes[index - 1];
 if (predecessor && !learned.includes(predecessor.id)) return `Сначала изучите «${predecessor.name}»`;
 const alternative = node.exclusive && branch.nodes.find(entry =>
  entry.id !== node.id && entry.exclusive === node.exclusive && learned.includes(entry.id));
 return alternative ? `Уже выбрано «${alternative.name}»` : '';
}

export function talentCatalog(hero, learned = [], mode = 'explore') {
 const totalPoints = pointsAt(hero.level), points = totalPoints - learned.length;
 return { heroId: hero.id, points, totalPoints, spent: learned.length,
  nextPointLevel: POINT_LEVELS.find(level => level > hero.level) ?? null,
  branches: heroBranches(hero.id).map(b => ({
  id: b.id, name: b.name, nodes: b.nodes.map(({ id, name, description, skill, stats, unlockSkillId, exclusive }, index) => {
   const level = b.levels[index], acquired = learned.includes(id);
   const reason = acquired ? 'Изучено' : talentLock(hero, learned, b, index) ||
    (points < 1 ? 'Нет очков талантов' : mode !== 'explore' ? 'Таланты изучаются в пути' : '');
   return { id, name, description, level, cost: 1, learned: acquired, available: !reason, reason,
    skillId: unlockSkillId ?? skill?.id ?? null, grantsSkill: !!unlockSkillId, passive: !!stats, stats,
    alternative: !!exclusive };
  }),
 })) };
}

export function validTalents(hero, learned) {
 if (!Number.isSafeInteger(hero.level) || hero.level < 1 || hero.level > LEVEL_CAP || !Array.isArray(learned) || learned.length > pointsAt(hero.level) || new Set(learned).size !== learned.length) return false;
 const branches = heroBranches(hero.id);
 return learned.every(id => branches.some(branch => {
  const index = branch.nodes.findIndex(node => node.id === id);
  return index >= 0 && !talentLock(hero, learned, branch, index);
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
