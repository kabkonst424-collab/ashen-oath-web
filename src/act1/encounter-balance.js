const FIRST_ACT_PRESSURE = {
  thorn_keeper: 1.06,
  quarry_overseer: 1.07,
  quarry_echo: 1.08,
  ferry_echo: 1.08,
  catalogue_warden: 1.08,
  harvest_engine: 1.09,
  dagan: 1.08,
  mute_abbot: 1.09,
  bellkeeper: 1.08,
};

// Native creatures resist the region's magic and retain their advertised weaknesses.
const CHAPTER_ENEMIES = {
  c2_mob_a: [1.08, {magicResist: 3, fireResist: 10}],
  c2_mob_b: [1.08, {magicResist: 4, iceResist: 15}],
  c2_boss: [1.08, {magicResist: 6, iceResist: 21}],
  c3_mob_a: [1.10, {magicResist: 4, iceResist: 16}],
  c3_mob_b: [1.10, {magicResist: 5, iceResist: 20}],
  c3_boss: [1.10, {magicResist: 7, iceResist: 28}],
  c4_mob_a: [1.12, {magicResist: 5, fireResist: 19}],
  c4_mob_b: [1.12, {magicResist: 6, fireResist: 23}],
  c4_boss: [1.11, {magicResist: 8, fireResist: 30}],
  c5_mob_a: [1.14, {magicResist: 6, lightningResist: 18}],
  c5_mob_b: [1.14, {magicResist: 8, lightResist: 16, lightningResist: 15}],
  c5_boss: [1.12, {magicResist: 9, lightResist: 13, lightningResist: 29}],
  c6_mob_a: [1.15, {magicResist: 7, lightningResist: 23}],
  c6_mob_b: [1.15, {magicResist: 8, fireResist: 18, lightningResist: 12}],
  c6_boss: [1.13, {magicResist: 10, fireResist: 12, lightningResist: 33}],
};

export function applyEncounterBalance(enemies) {
  for (const [id, multiplier] of Object.entries(FIRST_ACT_PRESSURE)) {
    const stats = enemies[id].stats;
    stats.atk = Math.round(stats.atk * multiplier);
  }
  for (const [id, [multiplier, resistances]] of Object.entries(CHAPTER_ENEMIES)) {
    const stats = enemies[id].stats;
    Object.assign(stats, resistances, {atk: Math.round(stats.atk * multiplier)});
  }
}
