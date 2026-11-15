import { AREAS, DIALOGUES, ENEMIES, PARTY } from './content.js?v=campaign-130';
import { CHAPTER_BIOMES, isCampaignModel } from './campaign-visuals.js?v=campaign-v1';
import { actorAnimationIdentity, resolveActorVisual } from './graphics-refresh.js?v=stride-112';

export const PROP_SLOTS = Object.freeze({
  Rock:'rock', House:'house', Tower:'tower', Wall:'wall', Pillar:'pillar', Arch:'arch',
  Altar:'altar_inspect', Inspect:'altar_inspect', Brazier:'brazier', Well:'well', Chest:'chest',
  Crate:'crate', Barrel:'barrel', Camp:'camp', Puzzle:'puzzle', Bookshelf:'bookshelf_book',
  Book:'book', Stall:'merchant_stall', Bridge:'bridge', Cart:'cart', Crane:'crane',
  Waterwheel:'waterwheel', BannerFrame:'banner', Satchel:'satchel', Basket:'basket',
  Lantern:'lantern', Tree:'tree', Grass:'grass', Wheat:'wheat',
});
const NODE_SLOTS = Object.freeze({chest:'chest', camp:'camp', puzzle:'puzzle', inspect:'altar_inspect'});
const TERRAIN_SLOTS = Object.freeze({village:'terrain_village', forest:'terrain_forest', marsh:'terrain_marsh', abbey:'terrain_ruin'});
const ENEMY_DEFS = Object.fromEntries(Object.values(ENEMIES).map(def => [def.id, def]));
const DIALOGUE_DEFS = Object.fromEntries(Object.values(DIALOGUES).map(def => [def.id, def]));
const PARTY_IDS = Object.values(PARTY).map(def => def.id);
const list = value => Array.isArray(value) ? value : Object.values(value || {});

export function areaBiome(area) {
  const name = String(area.biome || area.theme || area.id || '').toLowerCase();
  if (Object.hasOwn(CHAPTER_BIOMES,name)) return ({coast:'marsh',reef:'marsh',orchard:'forest',moor:'forest'})[name] || 'abbey';
  if (/marsh|swamp|bog|mire|flood|болот/.test(name)) return 'marsh';
  if (/abbey|crypt|ruin|cathedral|sanct|chapel|vault|dungeon|monastery|archive|fortress|quarry|аббат|склеп/.test(name)) return 'abbey';
  if (/village|town|hamlet|market|camp|haven|settlement|crossroad|деревн|лагер/.test(name)) return 'village';
  return 'forest';
}

export function terrainSlot(theme, biome) {
  return CHAPTER_BIOMES[theme]?.surface || TERRAIN_SLOTS[biome] || 'terrain_ruin';
}

// Match the actor options used by exploration and combat. Include every enemy
// in a group, even when exploration shows only its first member.
export function areaAssetPlan(area, state, library, worldEntries) {
  if (!area || !state) throw new Error('Area loading requires the active area and game state');
  const biome = areaBiome(area), campaignTerrain = Object.hasOwn(CHAPTER_BIOMES,area.biome);
  const slots = new Set(['tree', 'rock', 'path_strip', 'water_strip', terrainSlot(area.biome, biome)]);
  if (list(area.exits).length || (list(area.encounters).length && biome === 'abbey')) slots.add('arch');
  if (list(area.encounters).length && biome === 'abbey') slots.add('pillar');
  if (area.layout) {
    if (!campaignTerrain && !['fen','fortress'].includes(area.id) && !area.layout.coastal) {
      slots.add(['sunfields','briarwood'].includes(area.id) ? 'terrain_forest' : 'terrain_marsh');
    }
    for (const prop of list(area.layout.props)) {
      if (prop.slot !== 'anvil' && prop.slot !== 'grass') slots.add(prop.slot);
    }
    if (area.layout.fields?.length) slots.add('wheat');
  } else {
    // Only custom layouts without authored props need the full fallback library.
    for (const slot of worldEntries.keys()) slots.add(slot);
  }
  for (const node of list(area.nodes)) {
    const slot = NODE_SLOTS[node.type || 'inspect'];
    if (slot) slots.add(slot);
  }

  const models = new Set(), profiles = new Set(), campaignModels = new Set();
  function addActor(id, type, options) {
    const look = resolveActorVisual(type, options);
    (isCampaignModel(look.base) ? campaignModels : models).add(look.base);
    for (const accessory of [...(look.gear || []), look.back]) {
      const slot = PROP_SLOTS[accessory];
      if (slot) slots.add(slot);
    }
    const key = actorAnimationIdentity(id, options);
    const recruitFallback = 'party:'+String(options.role || '').split('_')[0];
    const profile = Object.hasOwn(library,key) ? key : options.npc && Object.hasOwn(library,recruitFallback) ? recruitFallback : null;
    if (profile && library[profile].base === look.base) profiles.add(profile);
  }
  const addParty = hero => addActor('party:'+hero, 'hero', {party:true,role:hero});
  function addEnemy(id, encounter) {
    const def = ENEMY_DEFS[id];
    addActor('enemy:'+id, def?.kind || (encounter?.boss ? 'boss' : 'husk'),
      {hostile:true,enemyId:def?.id,animationSource:def?.animationSource,visual:def?.visual});
  }

  for (const member of list(state.party)) addParty(member.id);
  const seenDialogues = new Set();
  function addRecruits(effect) {
    for (const hero of [effect.recruit].flat().filter(Boolean)) addParty(hero);
    for (const id of [effect.dialogue, effect.next, ...list(effect.variants).map(variant => variant.dialogue)]) addDialogue(id);
  }
  function addDialogue(id) {
    const dialogue = DIALOGUE_DEFS[id];
    if (!dialogue || seenDialogues.has(id)) return;
    seenDialogues.add(id);
    addRecruits(dialogue);
    for (const choice of list(dialogue.choices)) addRecruits(choice);
  }
  addDialogue(state.dialogue?.id);
  for (const node of list(area.nodes)) addRecruits(node);
  for (const npc of list(area.npcs)) {
    const partyId = PARTY_IDS.find(id => npc.id.startsWith(id + '_'));
    const options = {npc:true, role:partyId || npc.id, model:npc.model, animationSource:npc.animationSource, visual:npc.visual};
    addActor('npc:'+npc.id, 'acolyte', options);
    addRecruits(npc);
  }
  for (const encounter of list(area.encounters)) {
    for (const member of list(encounter.enemies)) addEnemy(typeof member === 'string' ? member : member.kind || member.id, encounter);
  }
  for (const member of list(state.battle?.enemies)) addEnemy(member.kind);

  for (const slot of slots) if (!worldEntries.has(slot)) throw new Error('Unknown world asset in '+area.id+': '+slot);
  return {areaId:area.id, models, profiles, campaignModels, slots, campaignTerrain};
}
