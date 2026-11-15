import {isEquipmentKind} from './equipment-slots.js?v=campaign-150';

export const ITEM_QUALITIES = Object.freeze({
  common: {label: 'Обычное', color: '#e2d4ba', rank: 1},
  uncommon: {label: 'Необычное', color: '#b3d8a9', rank: 2},
  rare: {label: 'Редкое', color: '#a8c7f4', rank: 3},
  epic: {label: 'Эпическое', color: '#dbc0ff', rank: 4},
  legendary: {label: 'Легендарное', color: '#ffd08b', rank: 5},
});

export function itemQuality(def) {
  if (!def) return '';
  if (Object.hasOwn(ITEM_QUALITIES, def.rarity)) return def.rarity;
  return isEquipmentKind(def.kind || def.type) ? 'common' : '';
}
