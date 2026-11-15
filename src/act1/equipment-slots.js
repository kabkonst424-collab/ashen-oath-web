export const LEGACY_EQUIPMENT_SLOTS = Object.freeze(['weapon', 'armor', 'charm']);
export const LEGACY_BAG_SIZE = 30;
export const BAG_SIZE = 42;

export const SLOT_LABELS = Object.freeze({
  weapon: 'Оружие',
  armor: 'Доспех',
  charm: 'Талисман',
  helmet: 'Шлем',
  gloves: 'Перчатки',
  belt: 'Пояс',
  leggings: 'Поножи',
  boots: 'Ботинки',
  ring: 'Кольцо',
});

export const EQUIPMENT_SLOTS = Object.freeze(Object.keys(SLOT_LABELS));

export function isEquipmentKind(kind) {
  return Object.hasOwn(SLOT_LABELS, kind);
}

export function emptyEquipment() {
  return Object.fromEntries(EQUIPMENT_SLOTS.map(slot => [slot, null]));
}

export const RESISTANCE_LABELS = Object.freeze({
  magicResist: 'Магия',
  fireResist: 'Огонь',
  iceResist: 'Холод',
  lightningResist: 'Молния',
  lightResist: 'Свет',
});

export const RESISTANCE_KEYS = Object.freeze(Object.keys(RESISTANCE_LABELS));
export const RESISTANCE_CAP = 60;
export const ELEMENT_RESISTANCE = Object.freeze({
  fire: 'fireResist',
  ice: 'iceResist',
  lightning: 'lightningResist',
  light: 'lightResist',
});

export function effectiveResistance(stats, element) {
  if (!element || element === 'physical') return 0;
  const general = stats?.magicResist || 0;
  const specific = Object.hasOwn(ELEMENT_RESISTANCE, element) ? stats?.[ELEMENT_RESISTANCE[element]] || 0 : 0;
  return Math.max(0, Math.min(RESISTANCE_CAP, general + specific));
}
