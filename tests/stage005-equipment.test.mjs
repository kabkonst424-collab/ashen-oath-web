import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/act1/model.js';
import * as saves from '../src/act1/save.js';
import { AREAS, ITEMS } from '../src/act1/content.js';
import { EQUIPMENT_SLOTS, LEGACY_EQUIPMENT_SLOTS, effectiveResistance } from '../src/act1/equipment-slots.js';

function addItem(state, index, defId) {
  const item = { uid: state.runId + ':i' + state.nextUid++, defId, qty: 1, durability: 100 };
  state.bag[index] = item;
  return item;
}

function equip(state, slot, id, index = 41) {
  const item = addItem(state, index, id);
  const result = model.moveItem(state, { kind: 'bag', index }, { kind: 'gear', heroId: state.party[0].id, slot }, item.uid, state.revision);
  assert.equal(result.ok, true, result.message);
  return item;
}

function reachPatrol(state, areaId) {
  const hero = state.party[0];
  hero.level = 28;
  const stats = model.stats(state, hero.id);
  Object.assign(hero, {hp:stats.hp, maxHp:stats.hp, mp:stats.mp, maxMp:stats.mp});
  const area = AREAS.find(candidate => candidate.id === areaId);
  const target = area.encounters.find(encounter => encounter.id.startsWith('patrol_') && encounter.enemies[0] === 'c4_mob_a');
  state.areaId = area.id;
  state.position = {x:target.x, z:target.z};
  const outcome = model.interact(state, target.id);
  assert.equal(outcome.ok, true, outcome.message);
  assert.equal(state.battle.activeHeroId, hero.id);
}

test('A021: schema 2 expands storage without changing existing items or state', async () => {
  const state = model.newGame();
  const current = await saves.envelope(state, 7);
  const payload = structuredClone(current.payload);
  payload.schema = 2;
  payload.bag.splice(30);
  for (const hero of payload.party) {
    payload.gear[hero.id] = Object.fromEntries(LEGACY_EQUIPMENT_SLOTS.map(slot => [slot, payload.gear[hero.id][slot]]));
  }
  const old = { schemaVersion:2, contentVersion:current.contentVersion, buildVersion:'1.4.0', savedAt:current.savedAt, revision:7, payload };
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(saves.canonical(old)));
  const restored = await saves.verify({...old, checksum:Buffer.from(bytes).toString('hex')});
  assert.deepEqual(restored, current.payload);
  assert.equal(restored.bag.length, 42);
  assert.deepEqual(Object.keys(restored.gear.alar), EQUIPMENT_SLOTS);
});

test('A021: a wrong slot leaves state intact and identical boots swap unique instances', async () => {
  const state = model.newGame();
  const first = equip(state, 'boots', 'kit_trail_boots');
  const next = addItem(state, 41, 'kit_trail_boots');
  const from = {kind:'bag', index:41};
  const before = model.snapshot(state);
  assert.equal(model.moveItem(state, from, {kind:'gear', heroId:'alar', slot:'leggings'}, next.uid, state.revision).ok, false);
  assert.deepEqual(model.snapshot(state), before);
  assert.equal(model.moveItem(state, from, {kind:'gear', heroId:'alar', slot:'boots'}, next.uid, state.revision).ok, true);
  assert.equal(state.gear.alar.boots.uid, next.uid);
  assert.equal(state.bag[41].uid, first.uid);
  assert.deepEqual(await saves.verify(await saves.envelope(state, 9)), model.snapshot(state));
});

test('A023: the guard and barrier preview include the equipped protection from fire', () => {
  const state = model.newGame();
  equip(state, 'ring', 'kit_ember_ring');
  reachPatrol(state, 'ember_forge');
  const [enemy, other] = state.battle.enemies;
  Object.assign(enemy, {intent:'heavy', skillId:'c4_cinders'});
  state.battle.status.alar = {guard:1, guardMultiplier:.6, barrier:14, barrierTurns:2};
  const preview = model.enemyThreatPreview(state, enemy.uid).targets.find(target => target.id === 'alar');
  assert.equal(preview.element, 'fire');
  assert.equal(preview.resistance, 23);
  assert.equal(effectiveResistance(model.stats(state, 'alar'), 'physical'), 0);
  assert.equal(effectiveResistance({magicResist:45,fireResist:38}, 'fire'), 60);
  state.events.length = 0;
  assert.equal(model.battleAction(state, {kind:'attack', targetId:other.uid}).ok, true);
  const actual = state.events.find(event => event.type === 'hit' && event.actorId === enemy.uid);
  assert.ok(actual && actual.amount >= preview.min && actual.amount <= preview.max);
  assert.equal(actual.absorbed, 14);
  assert.equal(actual.resistance, preview.resistance);
  assert.ok(state.gear.alar.ring.durability < 100);
  model.validate(state);
});

test('A023: enemy resistance affects the forecast and paid fire damage', () => {
  const state = model.newGame();
  reachPatrol(state, 'ember_forge');
  const victim = state.battle.enemies[0];
  const action = {kind:'skill', skillId:'cinder_wave', targetId:victim.uid};
  const estimate = model.battlePreview(state, action).targets.find(target => target.id === victim.uid);
  assert.equal(estimate.resistance, 24);
  assert.equal(estimate.element, 'fire');
  state.events.length = 0;
  assert.equal(model.battleAction(state, action).ok, true);
  const hit = state.events.find(event => event.type === 'hit' && event.actorId === 'alar' && event.targetId === victim.uid);
  assert.ok(hit && hit.amount >= estimate.min && hit.amount <= estimate.max);
});

test('A024: all new equipment has a source and early chest gear is paid once', () => {
  const stock = new Set();
  for (const area of AREAS) {
    for (const npc of area.npcs) for (const item of npc.shop || []) stock.add(item.id || item);
    for (const source of [...area.nodes, ...area.encounters]) {
      for (const item of [...(source.lootTable?.guaranteed || []), ...(source.lootTable?.choices || []), ...(source.rewards?.items || [])]) stock.add(item.id);
    }
  }
  const added = Object.values(ITEMS).filter(item => item.id.startsWith('kit_'));
  assert.equal(added.length, 32);
  for (const item of added) {
    assert.ok(stock.has(item.id), item.id);
    assert.ok(EQUIPMENT_SLOTS.includes(item.kind));
  }
  const state = model.newGame();
  const cache = AREAS[0].nodes.find(node => node.id === 'monastery_cache');
  state.position = {x:cache.x, z:cache.z};
  assert.equal(model.interact(state, cache.id).ok, true);
  const count = () => state.bag.filter(item => item?.defId === 'kit_trail_boots').length;
  assert.equal(count(), 1);
  model.interact(state, cache.id);
  assert.equal(count(), 1);
});
