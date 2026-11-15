import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// The same tests can reproduce regressions against an untouched release copy.
const root = process.env.ASHEN_TEST_ROOT || fileURLToPath(new URL('..', import.meta.url));
const moduleURL = path => pathToFileURL(resolve(root, path)).href;
const M = await import(moduleURL('src/act1/model.js'));
const C = await import(moduleURL('src/act1/content.js'));
const Save = await import(moduleURL('src/act1/save.js'));

function refreshHero(state, hero) {
  const stats = M.stats(state, hero.id);
  Object.assign(hero, { maxHp: stats.maxHp, maxMp: stats.maxMp, hp: stats.maxHp, mp: stats.maxMp });
}

function addHero(state, id, level) {
  assert.ok(C.PARTY.some(hero => hero.id === id));
  const hero = { id, level, xp: 0, hp: 1, mp: 0, maxHp: 1, maxMp: 0 };
  state.party.push(hero);
  state.gear[id] = { weapon: null, armor: null, charm: null };
  refreshHero(state, hero);
  return hero;
}

function healingFixture() {
  const state = M.newGame('alar');
  state.party[0].level = 9;
  refreshHero(state, state.party[0]);
  const leia = addHero(state, 'leia', 9);
  for (const id of ['mercy_stock', 'mercy_hands']) assert.equal(M.learnTalent(state, leia.id, id).ok, true);
  state.party[0].hp = 20;
  M.validate(state);
  return state;
}

function enterEncounter(state, id = 'enc02') {
  const encounter = C.AREAS.find(area => area.id === state.areaId).encounters.find(entry => entry.id === id);
  assert.ok(encounter);
  state.position = { x: encounter.x, z: encounter.z };
  const answer = M.interact(state, id);
  assert.equal(answer.ok, true, answer.message);
  M.validate(state);
}

async function roundTrip(state) {
  M.validate(state);
  const file = await Save.envelope(state, 7);
  const loaded = await Save.verify(JSON.parse(JSON.stringify(file)));
  assert.deepEqual(loaded, M.snapshot(state));
}

test('A001: runed field healing is integral, matches its preview, and survives save verification', async () => {
  const state = healingFixture();
  const before = structuredClone(state);
  const option = M.fieldHealingOptions(state, 'alar').options.find(entry => entry.skillId === 'warm_hands');
  assert.deepEqual(state, before, 'preview must not change state or RNG');
  assert.equal(option.enabled, true);
  assert.equal(option.cost, 5);
  assert.equal(option.targets[0].amount, 143);
  const answer = M.healCompanion(state, 'alar', { casterId: 'leia', skillId: 'warm_hands', revision: state.revision });
  assert.equal(answer.ok, true, answer.message);
  assert.equal(state.party[0].hp, 163);
  assert.equal(state.party.find(hero => hero.id === 'leia').mp, before.party.find(hero => hero.id === 'leia').mp - 5);
  assert.equal(state.rng, before.rng);
  assert.equal(state.lootRng, before.lootRng);
  await roundTrip(state);
});

test('A001: runed battle healing matches preview without consuming RNG and survives save verification', async () => {
  const state = healingFixture();
  enterEncounter(state);
  assert.equal(state.battle.activeHeroId, 'leia');
  const before = structuredClone(state);
  const action = { kind: 'skill', skillId: 'warm_hands', targetId: 'alar' };
  const preview = M.battlePreview(state, action);
  assert.deepEqual(state, before);
  assert.equal(preview.ok, true);
  assert.equal(preview.targets[0].max, 143);
  assert.equal(preview.targets[0].min, 143);
  assert.equal(preview.cost, 5);
  assert.equal(M.battleAction(state, action).ok, true);
  assert.equal(state.battle.activeHeroId, 'alar', 'next ally acts before enemy damage can obscure the heal');
  assert.equal(state.party[0].hp - before.party[0].hp, preview.targets[0].max);
  assert.equal(state.party.find(hero => hero.id === 'leia').mp, before.party.find(hero => hero.id === 'leia').mp - 5);
  assert.equal(state.events.findLast(event => event.type === 'heal').amount, 143);
  assert.ok(state.battle.status.alar.barrier > 0, 'the rune still grants its emergency barrier');
  assert.equal(state.rng, before.rng);
  assert.equal(state.lootRng, before.lootRng);
  await roundTrip(state);
});

test('A001: healing rounds outside triage, caps at max HP, and rejects full or fallen targets atomically', () => {
  for (const scenario of [
    { hp: 120, amount: 113, enabled: true },
    { hp: 'near-full', amount: 2, enabled: true },
    { hp: 'full', amount: 0, enabled: false },
    { hp: 0, amount: 0, enabled: false },
  ]) {
    const state = healingFixture(), hero = state.party[0];
    hero.hp = scenario.hp === 'full' ? hero.maxHp : scenario.hp === 'near-full' ? hero.maxHp - 2 : scenario.hp;
    M.validate(state);
    const before = structuredClone(state);
    const option = M.fieldHealingOptions(state, hero.id).options.find(entry => entry.skillId === 'warm_hands');
    assert.equal(option.targets[0].amount, scenario.amount);
    assert.equal(option.enabled, scenario.enabled);
    const answer = M.healCompanion(state, hero.id, { casterId: 'leia', skillId: 'warm_hands' });
    assert.equal(answer.ok, scenario.enabled);
    if (scenario.enabled) {
      assert.equal(state.party[0].hp, before.party[0].hp + scenario.amount);
      M.validate(state);
    } else assert.deepEqual(state, before);
  }
});

function bagItem(state, index, defId, qty = 1, durability) {
  const item = { uid: state.runId + ':i' + state.nextUid++, defId, qty };
  if (durability !== undefined) item.durability = durability;
  state.bag[index] = item;
  return structuredClone(item);
}

test('A002: identical nonstackable equipment swaps unique instances and durability in a full bag', async () => {
  const state = M.newGame();
  for (let index = 0; index < M.BAG_SIZE; index++) bagItem(state, index, 'rust_sword', 1, index);
  M.validate(state);
  const before = structuredClone(state), first = before.bag[0], second = before.bag[1];
  const preview = M.previewMoveItem(state, 0, 1);
  assert.equal(preview.ok, true, preview.reason);
  assert.deepEqual(state, before);
  const answer = M.moveItem(state, 0, 1, first.uid, state.revision);
  assert.equal(answer.ok, true, answer.message);
  assert.deepEqual(state.bag[0], second);
  assert.deepEqual(state.bag[1], first);
  assert.deepEqual(state.bag.slice(2), before.bag.slice(2));
  assert.equal(state.nextUid, before.nextUid);
  assert.equal(state.rng, before.rng);
  assert.equal(state.revision, before.revision + 1);
  await roundTrip(state);
});

test('A002: real consumables still merge up to their cap and preserve remaining stack identity', () => {
  const state = M.newGame();
  const defId = state.bag[0].defId, definition = C.ITEMS[defId];
  const max = definition.stackMax || definition.maxStack || 99;
  const source = bagItem(state, 0, defId, 5), target = bagItem(state, 1, defId, max - 2);
  M.validate(state);
  assert.equal(M.moveItem(state, 0, 1, source.uid, state.revision).ok, true);
  assert.deepEqual(state.bag[0], { ...source, qty: 3 });
  assert.deepEqual(state.bag[1], { ...target, qty: max });
  const before = structuredClone(state);
  const answer = M.moveItem(state, 0, 1, source.uid, state.revision);
  assert.equal(answer.ok, false);
  assert.match(answer.message, /Стопка заполнена/);
  assert.deepEqual(state, before);
  assert.equal(M.moveItem(state, 0, 3, source.uid, state.revision).ok, true);
  assert.equal(state.bag[0], null);
  assert.deepEqual(state.bag[3], { ...source, qty: 3 });
  M.validate(state);
});

test('A002: stale revision, stale UID, same-cell and wrong-slot failures leave every field unchanged', () => {
  const state = M.newGame();
  const source = bagItem(state, 3, 'rust_sword', 1, 7);
  M.validate(state);
  for (const [from, to, uid, revision] of [
    [3, 4, source.uid, state.revision - 1],
    [3, 4, source.uid + '-stale', state.revision],
    [3, 3, source.uid, state.revision],
    [3, { kind: 'gear', heroId: 'alar', slot: 'armor' }, source.uid, state.revision],
  ]) {
    const before = structuredClone(state);
    assert.equal(M.moveItem(state, from, to, uid, revision).ok, false);
    assert.deepEqual(state, before);
  }
});

function foxFixture() {
  const state = M.newGame('myrt');
  state.party[0].level = 8;
  refreshHero(state, state.party[0]);
  addHero(state, 'iona', 8);
  enterEncounter(state);
  assert.equal(state.battle.activeHeroId, 'myrt');
  return state;
}

for (const scenario of [
  { name: 'ordinary attack', status: {}, applies: true, afterBreak: 2, reason: '' },
  { name: 'existing break', status: { break: 1 }, applies: false, afterBreak: 1, reason: 'Равновесие уже нарушено' },
  { name: 'break recovery immunity', status: { breakRecovery: 1 }, applies: false, afterBreak: 0, reason: 'Восстановление равновесия блокирует повторный срыв' },
]) test('A010: fox_step preview agrees with actual interruption for ' + scenario.name, async () => {
  const state = foxFixture(), enemy = state.battle.enemies[0];
  enemy.status = { ...scenario.status };
  // A break skill interrupts ordinary actions too; its forecast must not require a heavy intent.
  enemy.intent = 'attack';
  M.validate(state);
  const before = structuredClone(state);
  const action = { kind: 'skill', skillId: 'fox_step', targetId: enemy.uid };
  const preview = M.battlePreview(state, action);
  assert.deepEqual(state, before, 'forecast must be a pure read');
  assert.equal(preview.ok, true);
  const effects = preview.additionalEffects.filter(effect => effect.kind === 'break' && effect.targetId === enemy.uid);
  assert.equal(effects.length, 1, 'show the authored break as an additional effect');
  assert.equal(effects[0].duration, 2);
  assert.equal(effects[0].willApply, scenario.applies);
  assert.equal(effects[0].blockedReason, scenario.reason);
  assert.equal(preview.cost, 8);
  assert.equal(M.battleAction(state, action).ok, true);
  assert.equal(state.battle.activeHeroId, 'iona', 'inspect the effect before the enemy takes a turn');
  const actual = state.battle.enemies.find(entry => entry.uid === enemy.uid);
  assert.ok(actual.hp > 0);
  assert.equal(actual.status.break || 0, scenario.afterBreak);
  assert.equal(actual.status.breakRecovery || 0, scenario.status.breakRecovery || 0);
  const hit = state.events.findLast(event => event.type === 'hit' && event.actorId === 'myrt');
  assert.ok(hit.amount >= preview.targets[0].min && hit.amount <= preview.targets[0].max);
  assert.equal(state.party[0].mp, before.party[0].mp - 8);
  let nextRng = before.rng | 0;
  nextRng ^= nextRng << 13;
  nextRng ^= nextRng >>> 17;
  nextRng ^= nextRng << 5;
  assert.equal(state.rng, nextRng >>> 0, 'only the actual hit consumes a damage roll');
  assert.equal(state.lootRng, before.lootRng);
  await roundTrip(state);
});
