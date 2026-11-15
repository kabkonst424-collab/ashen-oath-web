const POINT_LEVELS = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
const MAX_RANK = 5;

export const POWER_LABELS = Object.freeze({
  physicalPower: 'Физический урон', spellPower: 'Магический урон', healingPower: 'Прямое лечение',
});
export const POWER_KEYS = Object.keys(POWER_LABELS);

const ATTRIBUTES = {
  strength: { name: 'Сила', stats: {physicalPower: 3}, icon: 'attack' },
  focus: { name: 'Сосредоточенность', stats: {mp: 3, spellPower: 2, healingPower: 2}, icon: 'arcane' },
  resolve: { name: 'Стойкость', stats: {hp: 10, def: 1}, icon: 'defend' },
  agility: { name: 'Расторопность', stats: {initiative: 2}, icon: 'attack' },
};

const spent = ranks => Object.values(ranks).reduce((sum, rank) => sum + rank, 0);
const pointsAt = level => POINT_LEVELS.filter(required => required <= level).length;

export function validAttributeRanks(level, ranks) {
  if (!ranks || typeof ranks !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(ranks))) return false;
  return Object.entries(ranks).every(([id, rank]) =>
    Object.hasOwn(ATTRIBUTES, id) && Number.isSafeInteger(rank) && rank > 0 && rank <= MAX_RANK
  ) && spent(ranks) <= pointsAt(level);
}

export function attributeCatalog(level, ranks, mode) {
  const total = pointsAt(level), used = spent(ranks), points = total - used;
  return {
    total, points, spent: used, nextPointLevel: POINT_LEVELS.find(required => required > level) ?? null,
    entries: Object.entries(ATTRIBUTES).map(([id, definition]) => {
      const rank = ranks[id] || 0;
      const reason = rank === MAX_RANK ? 'Максимальный ранг' : points < 1 ? 'Нет очков' :
        mode !== 'explore' ? 'Доступно в пути' : '';
      return {id, ...definition, rank, max: MAX_RANK, available: !reason, reason};
    }),
  };
}

export function attributeBonuses(ranks) {
  const out = {};
  for (const [id, rank] of Object.entries(ranks)) {
    for (const [stat, value] of Object.entries(ATTRIBUTES[id].stats)) {
      out[stat] = (out[stat] || 0) + rank * value;
    }
  }
  return out;
}
