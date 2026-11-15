import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/act1/model.js';
import * as S from '../src/act1/save.js';
import {AREAS, ITEMS, PARTY, SKILLS} from '../src/act1/content.js';
import {emptyEquipment} from '../src/act1/equipment-slots.js';
import {itemQuality, ITEM_QUALITIES} from '../src/act1/item-quality.js';
import {windowBagView} from '../src/act1/interface-presentation.js';

function roster(starter, level, companions = []) {
  const state = M.newGame(starter);
  for (const id of companions) {
    state.party.push({id, level, xp: 0});
    state.gear[id] = emptyEquipment();
  }
  for (const hero of state.party) {
    hero.level = level;
    const stats = M.stats(state, hero.id);
    Object.assign(hero, {hp: stats.hp, maxHp: stats.hp, mp: stats.mp, maxMp: stats.mp});
  }
  return state;
}

function okay(result) {
  assert.equal(result.ok, true, result.message);
}

function latePatrol(state) {
  const area = AREAS.find(area => area.id === 'slag_terraces');
  const encounter = area.encounters.find(node => node.id === 'patrol_slag_terraces_kilns');
  state.areaId = area.id;
  state.position = {x: encounter.x, z: encounter.z};
  okay(M.interact(state, encounter.id));
  assert.equal(state.battle.activeHeroId, state.party[0].id);
}

test('A026 training has its own milestone budget, cap and atomic reset', () => {
  const state = roster('alar', 2);
  const before = structuredClone(state);
  assert.equal(M.trainAttribute(state, 'alar', 'strength').ok, false);
  assert.deepEqual(state, before);

  const mature = roster('alar', 30);
  const initial = M.stats(mature, 'alar'), initialTalents = M.talentInfo(mature, 'alar').points;
  for (let i = 0; i < 5; i++) okay(M.trainAttribute(mature, 'alar', 'resolve'));
  assert.equal(M.attributeInfo(mature, 'alar').points, 5);
  assert.equal(M.trainAttribute(mature, 'alar', 'resolve').ok, false);
  assert.equal(M.talentInfo(mature, 'alar').points, initialTalents);
  assert.equal(mature.party[0].maxHp, initial.hp + 50);
  assert.equal(mature.party[0].hp, initial.hp, 'training cannot refill resources');
  assert.equal(M.statBreakdown(mature, 'alar').attributes.def, 5);
  okay(M.resetAttributes(mature, 'alar'));
  assert.deepEqual(M.stats(mature, 'alar'), initial);
});

test('A027 training survives export and old schema-3 saves keep all starting statistics', async () => {
  const state = roster('alar', 18);
  delete state.attributes;
  const {checksum, ...legacy} = await S.envelope(state, 7);
  legacy.buildVersion = '1.5.0';
  legacy.payload = M.snapshot(state);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(S.canonical(legacy)));
  const loaded = await S.verify({...legacy, checksum: Buffer.from(digest).toString('hex')});
  assert.deepEqual(M.stats(loaded, 'alar'), M.stats(state, 'alar'));
  assert.deepEqual(loaded.attributes, {});
  okay(M.trainAttribute(loaded, 'alar', 'focus'));
  okay(M.trainAttribute(loaded, 'alar', 'agility'));
  const trained = await S.verify(await S.envelope(loaded, 8));
  assert.deepEqual(trained.attributes.alar, {focus: 1, agility: 1});
  assert.equal(M.statBreakdown(trained, 'alar').initiative.training, 2);
  const invalid = structuredClone(trained);
  invalid.attributes.alar = {strength: 5, focus: 5};
  assert.throws(() => M.validate(invalid), /характеристики/);
});

test('A028 physical and spell damage bonuses affect both forecasts and charged actions', () => {
  for (const [starter, attribute, kind, skillId] of [
    ['myrt', 'strength', 'attack', undefined], ['elian', 'focus', 'skill', 'salt_bolt'],
  ]) {
    const base = roster(starter, 27), trained = structuredClone(base);
    for (let i = 0; i < 5; i++) okay(M.trainAttribute(trained, starter, attribute));
    for (const state of [base, trained]) latePatrol(state);
    const action = {kind, skillId, targetId: base.battle.enemies[1].uid};
    const view = state => M.battlePreview(state, action).targets[0];
    const baseline = view(base), improved = view(trained), pristine = structuredClone(trained);
    assert.ok(improved.min > baseline.min && improved.max > baseline.max);
    assert.deepEqual(trained, pristine);
    for (const state of [base, trained]) {
      okay(M.battleAction(state, action));
      const hit = state.events.findLast(event => event.type === 'hit' && event.actorId === starter);
      const forecast = state === base ? baseline : improved;
      assert.ok(hit.amount >= forecast.min && hit.amount <= forecast.max);
    }
  }
});

test('A029 focus benefits field healing using the exact capped forecast', () => {
  const state = roster('alar', 18, ['leia']);
  state.party[0].hp = 1;
  const healing = () => M.fieldHealingOptions(state, 'alar').options.find(option => option.skillId === 'warm_hands');
  const initial = healing().targets[0].amount;
  for (let i = 0; i < 4; i++) okay(M.trainAttribute(state, 'leia', 'focus'));
  const improved = healing();
  assert.ok(improved.targets[0].amount > initial);
  okay(M.healCompanion(state, 'alar', {casterId: 'leia', skillId: improved.skillId, revision:state.revision}));
  assert.equal(state.party[0].hp, 1 + improved.targets[0].amount);
  assert.equal(state.party[1].mp, state.party[1].maxMp - 12 - improved.cost);
});

test('A030 agility can move the hero ahead of an enemy in initiative order', () => {
  const base = roster('alar', 15), quick = structuredClone(base);
  for (let i = 0; i < 5; i++) okay(M.trainAttribute(quick, 'alar', 'agility'));
  for (const state of [base, quick]) latePatrol(state);
  assert.equal(M.combatOrder(base)[0].side, 'enemy');
  assert.equal(M.combatOrder(quick)[0].id, 'alar');
  assert.equal(M.statBreakdown(quick, 'alar').initiative.training, 10);
});

test('A031 all six heroes unlock one capstone and may change it independently of old runes', async () => {
  for (const {id} of PARTY) {
    const starter = ['alar', 'myrt', 'elian'].includes(id) ? id : 'alar';
    const state = roster(starter, 18, id === starter ? [] : [id]);
    const info = M.talentInfo(state, id);
    const [entry, first, second] = info.branches.find(branch => branch.id === 'specialization').nodes;
    const startingTalent = info.branches[0].nodes[0].id;
    assert.equal(M.learnTalent(state, id, first.id).ok, false);
    okay(M.learnTalent(state, id, startingTalent));
    okay(M.learnTalent(state, id, entry.id));
    okay(M.learnTalent(state, id, second.id));
    assert.equal(M.learnTalent(state, id, first.id).ok, false);
    assert.equal(M.availableSkills(state, id).some(skill => skill.id === second.id), true);
    assert.equal(M.skillProgression(state, id).skills.find(skill => skill.id === first.id).unlocked, false);
    assert.equal(M.heroRoleInfo(state, id).skills.find(skill => skill.id === first.id).unlocked, false);
    const next = await S.verify(await S.envelope(state, 9));
    okay(M.resetSpecialization(next, id));
    assert.deepEqual(next.talents[id], [startingTalent, entry.id]);
    okay(M.learnTalent(next, id, first.id));
    assert.equal(M.availableSkills(next, id).some(skill => skill.id === second.id), false);
    M.validate(next);
  }
});

test('A032/A035 a new shot bypasses the late patrol stance and its battle selection survives reload', async () => {
  const state = roster('myrt', 26);
  okay(M.learnTalent(state, 'myrt', 'myrt_specialization'));
  okay(M.learnTalent(state, 'myrt', 'keen_arrow'));
  latePatrol(state);
  const [guarded, other] = state.battle.enemies;
  assert.equal(guarded.status.guard, 1);
  assert.ok(!other.status.guard);
  const next = await S.verify(await S.envelope(state, 4));
  assert.deepEqual(M.combatOrder(next), M.combatOrder(state));
  const action = {kind: 'skill', skillId: 'keen_arrow', targetId: guarded.uid};
  const look = M.battlePreview(next, action);
  assert.ok(look.canCommit);
  assert.ok(look.additionalEffects.some(effect => effect.kind === 'ignoreGuard'));
  const locked = structuredClone(next);
  assert.equal(M.trainAttribute(next, 'myrt', 'agility').ok, false);
  assert.equal(M.resetSpecialization(next, 'myrt').ok, false);
  assert.deepEqual(next, locked);
  okay(M.battleAction(next, action));
  const strike = next.events.find(event => event.type === 'hit' && event.actorId === 'myrt');
  assert.ok(strike.amount >= look.targets[0].min && strike.amount <= look.targets[0].max);
  assert.equal(next.events.find(event => event.skillId === 'keen_arrow').presentation, SKILLS.keen_arrow.presentation);
  M.validate(next);
});

test('A033/A034 a chest yields quality gear once and the filter retains the real slot index', () => {
  const state = M.newGame('alar');
  const chest = AREAS.find(area => area.id === 'monastery').nodes.find(node => node.id === 'monastery_cache');
  state.position = {x: chest.x, z: chest.z};
  okay(M.interact(state, chest.id));
  const selected = state.bag.findIndex(item => item?.defId === 'novice_hood');
  assert.ok(selected >= 0);
  const uncommon = windowBagView(state.bag, ITEMS, 'equipment', 'капюшон', 'uncommon');
  assert.deepEqual(uncommon, [{index: selected, item: state.bag[selected]}]);
  assert.equal(windowBagView(state.bag, ITEMS, 'equipment', 'капюшон', 'epic').length, 0);
  assert.equal(ITEM_QUALITIES[itemQuality(ITEMS.novice_hood)].label, 'Необычное');
  M.interact(state, chest.id);
  assert.equal(state.bag.filter(item => item?.defId === 'novice_hood').length, 1);
});

test('A034 quality gear modifies the real worn forecast without replacing instance IDs during sorting', () => {
  const state = roster('elian', 26);
  const ordinary = {uid: state.runId+':i'+state.nextUid++, defId: 'kit_tin_band', qty: 1, durability: 100};
  const prized = {uid: state.runId+':i'+state.nextUid++, defId: 'stilled_prism', qty: 1, durability: 20};
  state.bag[30] = ordinary;
  state.bag[40] = prized;
  okay(M.organizeBag(state));
  const index = state.bag.findIndex(item => item?.uid === prized.uid);
  assert.ok(index < state.bag.findIndex(item => item?.uid === ordinary.uid));
  const target = {kind: 'gear', heroId: 'elian', slot: 'ring'};
  const look = M.previewMoveItem(state, {kind: 'bag', index}, target);
  assert.equal(look.heroes[0].delta.healingPower, 8);
  okay(M.equip(state, index, 'elian', 'ring'));
  assert.equal(M.stats(state, 'elian').healingPower, 8);
  assert.deepEqual(state.gear.elian.ring, prized);
  M.validate(state);
});

test('A037 a revival forecast includes the barrier that appears after the ally stands up', () => {
  const state = roster('alar', 27, ['leia']);
  state.party[0].hp = 0;
  okay(M.learnTalent(state, 'leia', 'leia_specialization'));
  okay(M.learnTalent(state, 'leia', 'returning_flame'));
  const fight = AREAS.find(area => area.id === 'monastery').encounters.find(node => node.id === 'enc02');
  state.position = {x:fight.x, z:fight.z};
  okay(M.interact(state, fight.id));
  assert.equal(state.battle.activeHeroId, 'leia');
  const action = {kind:'skill', skillId:'returning_flame', targetId:'alar'};
  const preview = M.battlePreview(state, action);
  const barrier = preview.additionalEffects.find(effect => effect.kind === 'barrier');
  assert.ok(preview.canCommit && barrier.after.amount > 0);
  okay(M.battleAction(state, action));
  const rise = state.events.findLast(event => event.type === 'revive' && event.targetId === 'alar');
  assert.equal(rise.amount, preview.targets[0].max);
  assert.ok(state.battle.status.alar.barrier > 0);
});
