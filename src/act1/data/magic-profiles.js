// Authored presentation only. Damage, targets, costs and combat RNG live in model.js.
const profile = (family, animation, color, extra = {}) => Object.freeze({
  family, animation, color, core: 0xfff4d7, scale: 1,
  fallback: family === 'physical' ? 'Attack' : 'Cast', ...extra,
});

/** Every authored skill in content.js has an explicit visual identity. */
export const MAGIC_PROFILES = Object.freeze({
  sun_cut: profile('physical', 'Attack', 0xffd881, { style: 'sun', scale: 1.15 }),
  oath_guard: profile('ward', 'CastWard', 0xe7be63, { style: 'oath', fallback: 'Block' }),
  cinder_wave: profile('fire', 'CastNova', 0xff772f, { style: 'wave', scale: 1.3 }),
  last_light: profile('heal', 'CastMend', 0xffd67c, { style: 'sun' }),
  ember_script: profile('fire', 'CastFire', 0xff6b24, { style: 'script', projectile: true, scale: 1.15 }),
  frost_margin: profile('ice', 'CastFrost', 0x75d8ff, { style: 'shards', projectile: true, core: 0xe9fcff }),
  scatter_runes: profile('runes', 'CastRunes', 0xc3a0ff, { style: 'constellation', core: 0xf5ecff, scale: 1.15 }),
  clear_thought: profile('heal', 'CastMend', 0x9bbcff, { style: 'runes', core: 0xf0f4ff }),
  spear_thrust: profile('physical', 'Attack', 0xcfe5ef, { style: 'thrust' }),
  shield_wall: profile('ward', 'CastWard', 0x91bbd5, { style: 'shield', fallback: 'Block', scale: 1.12 }),
  iron_sweep: profile('physical', 'Attack', 0xf1cca0, { style: 'sweep', scale: 1.25 }),
  rally: profile('heal', 'CastMend', 0xf5c986, { style: 'rally', scale: .85 }),
  warm_hands: profile('heal', 'CastMend', 0x8ce6bb, { style: 'hands' }),
  shared_breath: profile('heal', 'CastMend', 0x9ee8d1, { style: 'breath', scale: 1.15 }),
  wake_flame: profile('revive', 'CastRevive', 0xffcb70, { style: 'phoenix', core: 0xfffae5, scale: 1.3 }),
  copper_spark: profile('lightning', 'CastLightning', 0x74caff, { style: 'copper', core: 0xffffff, scale: 1.05 }),
  dawn_challenge: profile('ward', 'CastWard', 0xffbb60, { style: 'oath', fallback: 'Block', scale: 1.1 }),
  oath_link: profile('ward', 'CastWard', 0x8de1cb, { style: 'link', fallback: 'Block', scale: .95 }),
  lightning_chain: profile('lightning', 'CastLightning', 0x8dcfff, { style: 'chain', core: 0xffffff, scale: 1.15 }),
  ink_seal: profile('runes', 'CastRunes', 0xb596ff, { style: 'constellation', core: 0xf2eaff }),
  counter_charge: profile('physical', 'Attack', 0xffd296, { style: 'thrust', scale: 1.2 }),
  brace_impact: profile('ward', 'CastWard', 0x9ec5ec, { style: 'shield', fallback: 'Block', scale: 1.2 }),
  healing_thread: profile('heal', 'CastMend', 0x9be7bf, { style: 'thread', scale: .9 }),
  warding_hymn: profile('ward', 'CastWard', 0xd1e9a3, { style: 'oath', scale: 1.15 }),
  enemy_claw: profile('physical', 'Attack', 0xffc0a0, { style: 'claw' }),
  enemy_fire: profile('fire', 'CastFire', 0xff6d2c, { style: 'spit', projectile: true }),
  enemy_ice: profile('ice', 'CastFrost', 0x79bfd9, { style: 'memory', projectile: true, core: 0xe7f9ff }),
  enemy_ring: profile('nova', 'CastNova', 0xd6ac65, { style: 'bell', scale: 1.15 }),
  enemy_guard: profile('ward', 'CastWard', 0x9daab9, { style: 'iron', fallback: 'Block', scale: .95 }),
  enemy_mend: profile('heal', 'CastMend', 0xb2cb9b, { style: 'ash', core: 0xe6eddc }),
  forged_lynx_lunge: profile('physical', 'Attack', 0xe5b464, { style: 'claw', scale: 1.05 }),
  forged_slag_shell: profile('ward', 'CastEnemyRing', 0xaba68c, { style: 'iron', fallback: 'Idle', scale: 1.15 }),
  forged_slag_eruption: profile('fire', 'CastNova', 0xff7338, { style: 'wave', core: 0xffdb95, scale: 1.20 }),
  forged_weaver_needle: profile('ice', 'CastFrost', 0x85c9d7, { style: 'shards', projectile: true, core: 0xe5f5ea, scale: .88 }),
  forged_weaver_mend: profile('heal', 'CastMend', 0xa5df8e, { style: 'breath', core: 0xe6f6b8 }),
  forged_wisp_spark: profile('lightning', 'CastLightning', 0x8bf1e2, { style: 'copper', core: 0xe5fff7, scale: .86 }),
  forged_wisp_discharge: profile('lightning', 'CastLightning', 0x5edfcf, { style: 'chain', core: 0xebfff3, scale: 1.12 }),
  forged_guard_stand: profile('ward', 'CastWard', 0x9cb7c1, { style: 'iron', fallback: 'Block' }),
  forged_guard_rivet: profile('physical', 'Attack', 0xc99c65, { style: 'hammer', scale: 1.13 }),
  trail_mark: profile('physical','Attack',0xd8d994,{style:'arrow',projectile:true}),
  brush_guard: profile('ward','CastWard',0xadc477,{style:'oath'}),
  briar_shot: profile('physical','Attack',0xd7a55c,{style:'arrow',projectile:true}),
  trail_breath: profile('ward','CastWard',0x8fc7a4,{style:'breath'}),
  crossfire: profile('physical','Attack',0xccbb78,{style:'arrow',projectile:true,scale:.92}),
  fox_step: profile('physical','Attack',0xffd17e,{style:'arrow',projectile:true}),
  salt_bolt: profile('lightning','CastLightning',0x70c9ff,{style:'copper',core:0xffffff}),
  frost_mirror: profile('ice','CastFrost',0x91d8ff,{style:'shards',projectile:true}),
  ward_circuit: profile('ward','CastWard',0x8bded5,{style:'link',scale:1.15}),
  pale_mend: profile('heal','CastMend',0xabecd3,{style:'thread'}),
  echo_burst: profile('fire','CastNova',0xff9048,{style:'wave',scale:1.2}),
  counterseal: profile('runes','CastRunes',0xe4c0ff,{style:'constellation'}),
  c2_breaker_wave: profile('nova','CastNova',0x8bd5d0,{style:'wave',scale:1.5}),
  c2_salvage: profile('physical','Attack',0xcdad76,{style:'blade'}),
  c2_drown: profile('ice','CastFrost',0x8dc5d8,{style:'memory',projectile:true}),
  c3_whiteout: profile('nova','CastNova',0xccedf9,{style:'frost',scale:1.45}),
  c3_glasshorn: profile('physical','Attack',0xf3d9ac,{style:'thrust'}),
  c3_stitch: profile('heal','CastMend',0x91cafc,{style:'thread'}),
  c4_furnace: profile('fire','CastNova',0xff783c,{style:'wave',scale:1.65}),
  c4_cinders: profile('fire','CastFire',0xffb350,{style:'embers',projectile:true}),
  c4_bellows: profile('ward','CastWard',0xc89772,{style:'iron'}),
  c5_prism: profile('nova','CastNova',0xb7e9d9,{style:'bell',scale:1.44}),
  c5_refract: profile('runes','CastRunes',0xafaef7,{style:'constellation'}),
  c5_reflection: profile('ward','CastWard',0xdbe9eb,{style:'link'}),
  c6_final_chord: profile('nova','CastNova',0xffbd78,{style:'bell',scale:1.64}),
  c6_copper_voice: profile('lightning','CastLightning',0xffc881,{style:'copper',core:0xffffff}),
  c6_register: profile('physical','Attack',0xdd8b60,{style:'thrust',scale:1.11}),
});

const enemy = (color, theme, extra = {}) => Object.freeze({ color, theme, ...extra });
const BASIC_BOW = profile('physical', 'ShootBow', 0xdfc786, { style: 'arrow' });
const BASIC_BLADE = profile('physical', 'Attack', 0xf6d38c, { style: 'blade' });
const BASIC_SPEAR = profile('physical', 'Attack', 0xe4cc9e, { style: 'thrust' });
/** All 31 enemy variants retain their original skill/element semantics. */
export const ENEMY_MAGIC_OVERRIDES = Object.freeze({
  ash_husk: enemy(0xf1b98c, 'ash', { physical: 'blade' }),
  ember_acolyte: enemy(0xff652c, 'embers'),
  iron_sentinel: enemy(0xb8ccd7, 'iron', { physical: 'blade' }),
  broken_reliquary: enemy(0xe6c876, 'reliquary', { boss: true, scale: 1.25 }),
  road_extorter: enemy(0xdbbc98, 'road', { physical: 'blade' }),
  thorn_wolf: enemy(0xc5d398, 'thorn', { physical: 'claw' }),
  resin_moth: enemy(0xffb84f, 'resin'),
  thorn_keeper: enemy(0xcbd777, 'roots', { boss: true, scale: 1.3 }),
  iron_rat: enemy(0xbbc8d2, 'ore', { physical: 'claw' }),
  tithe_guard: enemy(0xe2c88e, 'tithe', { physical: 'thrust' }),
  quarry_overseer: enemy(0xe3ba88, 'quarry', { physical: 'hammer' }),
  quarry_echo: enemy(0xb0c7f3, 'quarry-echo', { boss: true, scale: 1.25 }),
  drowned: enemy(0x82c8e0, 'drowned'),
  wick_light: enemy(0xffae58, 'wick'),
  reed_stalker: enemy(0xbdceaa, 'reed', { physical: 'arrow' }),
  ferry_echo: enemy(0x9acfff, 'ferry', { boss: true, scale: 1.25 }),
  paper_swarm: enemy(0xece3bd, 'paper'),
  ink_guard: enemy(0xb4a2d6, 'ink', { physical: 'thrust' }),
  hush_acolyte: enemy(0xba9ce8, 'hush'),
  catalogue_warden: enemy(0xc5b4ee, 'catalogue', { boss: true, scale: 1.3 }),
  hollow_reaper: enemy(0xd4d19e, 'harvest', { physical: 'sweep' }),
  cinder_bird: enemy(0xff9240, 'cinder'),
  harvest_engine: enemy(0xffcf77, 'harvest-engine', { boss: true, scale: 1.35 }),
  fortress_archer: enemy(0xdce7d0, 'fortress', { physical: 'arrow' }),
  warden_hound: enemy(0xc1d0e2, 'hound', { physical: 'claw' }),
  dagan: enemy(0xec9c88, 'dagan', { boss: true, scale: 1.25, physical: 'blade' }),
  oath_knight: enemy(0xc1c3ef, 'oath', { physical: 'blade' }),
  silent_choir: enemy(0xf0d794, 'choir'),
  oathshade: enemy(0xa6aff4, 'oathshade', { physical: 'blade' }),
  mute_abbot: enemy(0xd4a0e9, 'abbot', { boss: true, scale: 1.25 }),
  bellkeeper: enemy(0xffd17c, 'cathedral', { boss: true, scale: 1.45 }),
});

export function magicProfile(event = {}, actor) {
  const hostile = !!actor?.options?.hostile || String(actor?.id || '').startsWith('enemy:');
  const skillId = event.skillId || (event.kind === 'defend' ? 'enemy_guard' : null);
  let selected = MAGIC_PROFILES[skillId];
  if (!selected && event.kind === 'attack') {
    const role = actor?.options?.role || event.actorId;
    selected = hostile ? MAGIC_PROFILES.enemy_claw : role === 'myrt' ? BASIC_BOW : role === 'radan' ? BASIC_SPEAR : BASIC_BLADE;
  }
  if (skillId === 'cinder_wave' && event.element === 'light') {
    selected = { ...selected, family: 'nova', style: 'dawn', color: 0xffe0a0, core: 0xfffae9 };
  }
  if (skillId === 'lightning_chain' && event.runeId === 'seal_lightning') {
    selected = { ...selected, color: 0x63e7f0, core: 0xffffff };
  }
  if (!selected && event.kind === 'item') selected = profile('heal', 'CastMend', 0xc1e6b5, { style: 'item' });
  if (!selected) selected = MAGIC_PROFILES.enemy_claw;
  // Conventional Attack/Block clips keep physical creatures and weapon users grounded.
  if (!hostile) {
    if (selected.style === 'arrow' && (actor?.options?.role || event.actorId) === 'myrt') {
      return { ...selected, projectile: false, animation: 'ShootBow', skillId, hostile: false };
    }
    return { ...selected, skillId, hostile: false };
  }
  const override = ENEMY_MAGIC_OVERRIDES[actor?.options?.enemyId] || {};
  const color = selected.family === 'ice' ? selected.color : override.color ?? selected.color;
  return { ...selected, ...override, color, skillId, hostile: true,
    scale: selected.scale * (override.scale || 1),
    style: selected.family === 'physical' ? override.physical || selected.style : selected.style,
  };
}
