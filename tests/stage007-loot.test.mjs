import test from 'node:test';
import assert from 'node:assert/strict';
import {AREAS, ENEMIES, ITEMS} from '../src/act1/content.js';
import {EQUIPMENT_SLOTS, effectiveResistance} from '../src/act1/equipment-slots.js';
import {itemQuality} from '../src/act1/item-quality.js';
import {enemyLoot, encounterLoot, rollLoot} from '../src/act1/loot-tables.js';
import * as model from '../src/act1/model.js';
import * as saves from '../src/act1/save.js';

const itemCount = (state, id) => state.bag.reduce((count, item) =>
  count + (item?.defId === id ? item.qty : 0), 0);

function atSource(areaId, sourceId, collection) {
  const area = AREAS.find(candidate => candidate.id === areaId);
  const source = area[collection].find(candidate => candidate.id === sourceId);
  assert.ok(source, sourceId);
  const state = model.newGame();
  state.areaId = area.id;
  state.position = {x: source.x, z: source.z};
  assert.ok(model.walkable(state.areaId, state.position.x, state.position.z));
  return {state, source};
}

function arriveAtCache(areaId, sourceId) {
  const scenario = atSource(areaId, sourceId, 'nodes');
  for (const flag of scenario.source.requiresFlags || []) scenario.state.flags[flag] = true;
  return scenario;
}

function verifyEquipment(state, itemId, stats) {
  const {kind} = ITEMS[itemId];
  if (state.gear.alar[kind]) assert.equal(model.unequip(state, 'alar', kind).ok, true);
  const before = model.stats(state, 'alar');
  const index = state.bag.findIndex(item => item?.defId === itemId);
  assert.ok(index >= 0);
  const uuid = state.bag[index].uid;
  assert.equal(model.equip(state, index, 'alar', kind).ok, true);
  assert.equal(state.gear.alar[kind].uid, uuid);
  const after = model.stats(state, 'alar');
  for (const [stat, amount] of Object.entries(stats)) assert.equal(after[stat] - before[stat], amount, stat);
  assert.equal(model.validate(state), true);
}

const fieldEquipment = [
  ['A069', 'scribe_talisman', 'village', 'forge_village', 'npcs', 'charm', 'common', {mp:6, spellPower:3}],
  ['A070', 'quarry_shoes', 'quarry', 'forge_quarry', 'npcs', 'boots', 'uncommon', {def:3, fireResist:7}],
  ['A071', 'breaker_legs', 'salt_coast', 'c2_side_cache', 'nodes', 'leggings', 'rare', {hp:18, iceResist:12}],
  ['A072', 'sounder_gloves', 'drowned_beacon', 'c2_npc_b', 'npcs', 'gloves', 'uncommon', {initiative:2, magicResist:5}],
  ['A073', 'remedy_boots', 'frost_observatory', 'c3_npc_b', 'npcs', 'boots', 'rare', {healingPower:6, iceResist:10}],
  ['A074', 'sunline_gloves', 'white_pass', 'c3_side_cache', 'nodes', 'gloves', 'rare', {spellPower:6, lightResist:8}],
  ['A075', 'crucible_greaves', 'slag_terraces', 'c4_side_cache', 'nodes', 'leggings', 'rare', {def:5, fireResist:17}],
  ['A076', 'tempered_brow', 'ember_forge', 'c4_npc_b', 'npcs', 'helmet', 'epic', {healingPower:7, fireResist:12}],
  ['A077', 'glass_sash', 'mirror_garden', 'c5_side_cache', 'nodes', 'belt', 'epic', {mp:13, lightningResist:13, def:3}],
  ['A078', 'grounding_mantle', 'glass_city', 'c5_npc_b', 'npcs', 'armor', 'epic', {def:9, hp:25, lightningResist:20}],
  ['A079', 'chorus_march', 'voice_amphitheatre', 'c6_npc_b', 'npcs', 'boots', 'epic', {healingPower:9, lightResist:15}],
  ['A080', 'chorus_spear', 'voice_amphitheatre', 'c6_npc_b', 'npcs', 'weapon', 'legendary', {atk:18, def:8, lightResist:18}],
];

for (const [step, id, area, source, collection, slot, quality, bonuses] of fieldEquipment) {
  test(`${step} ${id} comes from its chapter source and changes the equipped build`, () => {
    const item = ITEMS[id];
    assert.equal(item.kind, slot);
    assert.equal(itemQuality(item), quality);
    assert.deepEqual(item.stats, bonuses);
    const {state} = collection === 'nodes' ? arriveAtCache(area, source) : atSource(area, source, collection);
    if (collection === 'npcs') {
      state.gold = item.price;
      const offer = model.previewBuy(state, source, id);
      assert.equal(offer.ok, true, offer.reason);
      assert.equal(offer.price, item.price);
      const purchase = model.buy(state, source, id);
      assert.equal(purchase.ok, true, purchase.message);
      assert.equal(state.gold, 0);
      assert.ok(model.salePrice(state.bag.find(piece => piece?.defId === id)) < offer.price);
    } else {
      const lootSeed = state.lootRng;
      const opened = model.interact(state, source);
      assert.equal(opened.ok, true, opened.message);
      assert.equal(state.lootRng, lootSeed, 'guaranteed finds do not consume a random roll');
      assert.ok(state.claimed.includes('node:'+source));
      assert.ok(model.interact(state, source).ok);
    }
    assert.equal(itemCount(state, id), 1);
    verifyEquipment(state, id, bonuses);
  });
}

const existingEquipment = [
  ['A081', 'resin_eye_pin', {initiative:4, healingPower:5}, {initiative:4}],
  ['A082', 'kit_breakwater_ring', {def:3, magicResist:3, iceResist:15}, {}],
  ['A083', 'kit_lens_gloves', {def:3, lightResist:14}, {}],
  ['A084', 'kit_crucible_belt', {hp:20, def:4, fireResist:5}, {hp:20}],
  ['A085', 'kit_city_helm', {def:3, lightResist:21}, {}],
  ['A086', 'kit_chorus_belt', {mp:16, magicResist:5, lightResist:16}, {mp:16}],
];

for (const [step, id, bonuses, stable] of existingEquipment) {
  test(`${step} ${id} has its revised niche and compatible saved attributes`, async () => {
    const state = model.newGame();
    const item = ITEMS[id];
    for (const attr of ['hp', 'mp', 'initiative', 'speed']) assert.equal(item.stats[attr], stable[attr]);
    const uid = state.runId+':i'+state.nextUid++;
    state.bag[model.BAG_SIZE-1] = {uid, defId:id, qty:1, durability:100};
    verifyEquipment(state, id, bonuses);
    const restored = await saves.verify(await saves.envelope(state, 4));
    assert.equal(restored.gear.alar[item.kind].uid, uid);
    assert.deepEqual(model.stats(restored,'alar'), model.stats(state,'alar'));
  });
}

test('A087 the first cache adds a four-target meal and the old sword still has a source', () => {
  const {state} = arriveAtCache('monastery','monastery_cache');
  const mealBefore = itemCount(state,'travel_stew');
  const found = model.interact(state,'monastery_cache');
  assert.equal(found.ok, true, found.message);
  assert.equal(itemCount(state,'travel_stew'), mealBefore+1);
  assert.equal(itemCount(state,'iron_trail_blade'), 0);
  assert.equal(itemCount(state,'novice_hood'), 1);
  assert.equal(itemCount(state,'kit_trail_boots'), 1);
  assert.equal(ITEMS.travel_stew.effect.kind, 'allHeal');
  const smith = atSource('village','forge_village','npcs').state;
  assert.ok(model.previewBuy(smith,'forge_village','iron_trail_blade').ok);
});

function nextLootSeed(seed) {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return seed >>> 0;
}

// These two seeds put the next draw on opposite sides of the 75% boundary.
const supplySeed = 14336;
const materialSeed = 1;

for (const [step, act, area, id, qty, effect] of [
  ['A088', 2, 'drowned_beacon', 'campaign_tonic', 2, 'heal'],
  ['A089', 3, 'frost_observatory', 'revival_salt', 2, 'revive'],
  ['A090', 4, 'ember_forge', 'campaign_tide', 1, 'allHeal'],
  ['A091', 5, 'glass_city', 'ether_drop', 3, 'mp'],
]) {
  test(`${step} act ${act} cache replenishes ${effect} and retains the matching armor offer`, () => {
    const prefix = 'c'+act;
    const armor = prefix+'_gear_armor';
    const {state, source} = arriveAtCache(area,prefix+'_cache');
    assert.equal(ITEMS[id].effect.kind, effect);
    const extra = source.lootTable.choices.find(entry => entry.id === id);
    assert.deepEqual(extra,{id,qty,weight:1});
    assert.deepEqual(source.lootTable.choices.find(entry => entry.id === prefix+'_trophy'), {id:prefix+'_trophy',qty:1,weight:3});
    const market = atSource(area,prefix+'_npc_b','npcs').state;
    market.gold = ITEMS[armor].price;
    assert.ok(model.previewBuy(market,prefix+'_npc_b',armor).ok);
    for (const [seed, bonus] of [[materialSeed,0],[supplySeed,qty]]) {
      const run = structuredClone(state);
      run.lootRng = seed;
      const baseline = itemCount(run,id) + (source.lootTable.guaranteed.find(entry=>entry.id===id)?.qty || 0);
      assert.equal(model.interact(run,source.id).ok,true);
      assert.equal(itemCount(run,id),baseline+bonus);
      assert.equal(itemCount(run,armor),0);
      assert.equal(run.lootRng,nextLootSeed(seed));
    }
  });
}

test('A092 upgraded final optional healing leaves the legendary armor and receipt intact', () => {
  const {state,source} = arriveAtCache('wind_cape','c6_side_cache');
  const healed = itemCount(state,'healing_draught');
  assert.ok(ITEMS.campaign_tonic.effect.power > ITEMS.healing_draught.effect.power);
  assert.ok(model.interact(state,source.id).ok);
  assert.equal(itemCount(state,'campaign_tonic'),2);
  assert.equal(itemCount(state,'free_voice'),1);
  assert.equal(itemCount(state,'healing_draught'),healed);
  assert.ok(model.interact(state,source.id).ok);
  assert.equal(itemCount(state,'campaign_tonic'),2);
});

test('A093 ordinary field loot offers a meal while the Harvest Engine keeps its named trophy', () => {
  const area = AREAS.find(candidate=>candidate.id==='sunfields');
  const regular = area.encounters.find(entry=>!entry.boss&&!entry.required&&!entry.lootTable);
  const enemies = regular.enemies.map(kind=>({kind}));
  assert.deepEqual(rollLoot(encounterLoot(area.id,regular,enemies),()=>.18),[{id:'travel_stew',qty:1}]);
  const special = enemyLoot(area.id, ENEMIES.harvest_engine);
  assert.deepEqual(rollLoot(special,()=>.18),[{id:'ash_locket',qty:1}]);
  const {state} = atSource(area.id,regular.id,'encounters');
  state.party[0].level = 28;
  const stats = model.stats(state,'alar');
  Object.assign(state.party[0], {hp:stats.hp,maxHp:stats.hp,mp:stats.mp,maxMp:stats.mp});
  state.lootRng = 4096;
  const meal = itemCount(state,'travel_stew');
  assert.ok(model.interact(state,regular.id).ok);
  for (let move = 0; state.mode === 'battle' && move < 20; move++) {
    const targetId = state.battle.enemies.find(enemy=>enemy.hp>0).uid;
    const result = model.battleAction(state,{kind:'attack',targetId});
    assert.equal(result.ok,true,result.message);
  }
  assert.ok(state.defeated.includes(regular.id));
  assert.equal(itemCount(state,'travel_stew'),meal+1);
  assert.equal(state.lootRng,nextLootSeed(4096));
});

test('a full bag preserves the new side-cache item and claim receipt through export', async () => {
  const {state, source} = arriveAtCache('slag_terraces', 'c4_side_cache');
  state.bag = state.bag.map(item => item ?? {
    uid: state.runId+':i'+state.nextUid++, defId:'hardened_jack', qty:1, durability:100,
  });
  assert.equal(model.validate(state),true);
  assert.ok(model.interact(state,source.id).ok);
  const reward = 'node:'+source.id;
  const restored = await saves.verify(await saves.envelope(state, 5));
  assert.ok(restored.claimed.includes('reward:'+reward));
  assert.equal(itemCount(restored,'crucible_greaves'),0);
  assert.ok(restored.pendingRewards.some(entry=>entry.id===reward && entry.items.some(item=>item.id==='crucible_greaves')));
  assert.equal(model.claimRewards(restored,reward).ok,false);
  const slot = restored.bag.findIndex(item=>item.defId==='hardened_jack');
  const merchant = atSource('ember_forge','c4_npc_b','npcs').state;
  restored.areaId = merchant.areaId;
  restored.position = merchant.position;
  assert.ok(model.sell(restored,'c4_npc_b',slot).ok);
  assert.equal(restored.bag[slot],null);
  const paid = model.claimRewards(restored,reward);
  assert.equal(paid.ok,true,paid.message);
  assert.equal(itemCount(restored,'crucible_greaves'),1);
  const loot = restored.lootRng;
  restored.areaId = state.areaId;
  restored.position = state.position;
  assert.ok(model.interact(restored,source.id).ok);
  assert.equal(itemCount(restored,'crucible_greaves'),1);
  assert.equal(restored.lootRng,loot);
  assert.equal(model.claimRewards(restored,reward).ok,false);
  assert.equal(model.validate(restored),true);
});

test('the equipment additions and revisions cover each slot and broken gear has smaller bonuses', () => {
  const ids = [...fieldEquipment.map(entry=>entry[1]),...existingEquipment.map(entry=>entry[1])];
  assert.deepEqual(new Set(ids.map(id=>ITEMS[id].kind)),new Set(EQUIPMENT_SLOTS));
  assert.deepEqual(new Set(ids.map(id=>itemQuality(ITEMS[id]))),new Set(['common','uncommon','rare','epic','legendary']));
  const {state} = atSource('voice_amphitheatre','c6_npc_b','npcs');
  state.gold = ITEMS.chorus_march.price;
  assert.ok(model.buy(state,'c6_npc_b','chorus_march').ok);
  verifyEquipment(state,'chorus_march',{healingPower:9,lightResist:15});
  state.gear.alar.boots.durability = 0;
  const worn = model.stats(state,'alar');
  assert.equal(worn.healingPower,4);
  assert.equal(effectiveResistance(worn,'light'),7);
});
