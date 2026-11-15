import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/act1/model.js';
import * as S from '../src/act1/save.js';
import {AREAS, PARTY} from '../src/act1/content.js';
import {emptyEquipment} from '../src/act1/equipment-slots.js';

const starterIds = ['alar', 'myrt', 'elian'];
const companions = ['iona', 'radan', 'leia'];
const actor = (state, id) => state.party.find(hero => hero.id === id);
const accept = result => assert.equal(result.ok, true, result.message);

function roster(id) {
  const starter = starterIds.includes(id) ? id : 'alar';
  const state = M.newGame(starter);
  const dummy = companions.find(candidate => candidate !== id);
  const target = starter === id ? companions.find(candidate => candidate !== dummy) : starter;
  const ids = [...new Set([starter, id, dummy, target])];
  state.party = ids.map(heroId => ({
    id: heroId,
    level: heroId === id ? 27 : (heroId === dummy ? 34 : 32) - PARTY.find(h => h.id === heroId).stats.speed + 1,
    xp: 0,
  }));
  state.gear = Object.fromEntries(ids.map(heroId => [heroId, emptyEquipment()]));
  for (const hero of state.party) {
    const stats = M.stats(state, hero.id);
    Object.assign(hero, {hp: stats.hp, maxHp: stats.hp, mp: stats.mp, maxMp: stats.mp});
  }
  return {state, target};
}

function enter(state, caster, target, {heavy = false, fallen = false, fullyHealthy = false, alliedGuard = false,
  areaId = 'slag_terraces', encounterId = 'patrol_slag_terraces_kilns'} = {}) {
  const area = AREAS.find(area => area.id === areaId);
  const encounter = area.encounters.find(fight => fight.id === encounterId);
  const ally = actor(state, target);
  actor(state, caster).hp -= 100;
  ally.hp = fallen ? 0 : fullyHealthy ? ally.maxHp : Math.floor(ally.maxHp * .2);
  ally.mp -= 20;
  state.areaId = area.id;
  state.position = {x: encounter.x, z: encounter.z};
  accept(M.interact(state, encounter.id));
  assert.equal(state.battle.activeHeroId, caster);
  for (const enemy of state.battle.enemies) {
    enemy.status = {guard: 1};
    enemy.intent = heavy ? 'heavy' : 'attack';
  }
  if (alliedGuard) state.battle.status[target] = {guard: 2, guardMultiplier: .30};
  assert.equal(M.validate(state), true);
}

function cast(state, caster, target, skill) {
  const targetId = {
    enemy: state.battle.enemies[0].uid, ally: target, self: caster,
  }[skill.target] ?? null;
  const action = {kind: 'skill', skillId: skill.id, targetId};
  const before = structuredClone(state);
  const preview = M.battlePreview(state, action);
  assert.equal(preview.canCommit, true, preview.reason);
  assert.deepEqual(state, before);
  accept(M.battleAction(state, action));
  assert.equal(actor(before, caster).mp - actor(state, caster).mp, preview.cost);
  assert.equal(M.validate(state), true);

  for (const expected of preview.targets) {
    if (expected.effect === 'damage') {
      const hit = state.events.findLast(event => event.type === 'hit' &&
        event.actorId === caster && event.targetId === expected.id);
      assert.ok(hit && hit.amount >= expected.min && hit.amount <= expected.max, expected.name);
    } else if (expected.effect === 'heal' || expected.effect === 'revive') {
      const gain = actor(state, expected.id).hp - actor(before, expected.id).hp;
      assert.equal(gain, expected.max, expected.name);
    }
  }
  return {state, before, preview, skill, target, caster};
}

function runeCase(title, heroId, talentId, expectedCost, check, setup) {
  test(title, () => {
    const {state, target} = roster(heroId);
    const branch = M.talentInfo(state, heroId).branches.find(path => path.nodes.some(node => node.id === talentId));
    const index = branch.nodes.findIndex(node => node.id === talentId);
    const node = branch.nodes[index];
    assert.ok(index > 0 && node.skillId && !node.grantsSkill);
    assert.equal(M.learnTalent(state, heroId, node.id).ok, false);
    for (const required of branch.nodes.slice(0, index)) accept(M.learnTalent(state, heroId, required.id));
    const trained = structuredClone(state);
    const points = M.talentInfo(trained, heroId).points;
    accept(M.learnTalent(trained, heroId, node.id));
    assert.equal(M.talentInfo(trained, heroId).points, points - 1);
    const variants = [state, trained].map(version => {
      const skill = M.availableSkills(version, heroId).find(skill => skill.id === node.skillId);
      assert.ok(skill);
      enter(version, heroId, target, setup);
      return cast(version, heroId, target, skill);
    });
    const [base, runed] = variants;
    assert.equal(base.skill.runeId, undefined);
    assert.equal(runed.skill.runeId, talentId);
    assert.equal(runed.preview.cost, expectedCost);
    check(runed, base);
  });
}

const effect = (result, kind, id) => result.preview.additionalEffects.find(entry =>
  entry.kind === kind && (id === undefined || entry.targetId === id));
const enemy = (result, index = 0) => result.state.battle.enemies[index];
const statuses = (result, id) => result.state.battle.status[id] || {};
const manaGain = (result, id = result.target) => actor(result.state, id).mp - actor(result.before, id).mp;
const healGain = (result, id = result.target) => actor(result.state, id).hp - actor(result.before, id).hp;

runeCase('A039 Alar can trade strike efficiency for a heavy-windup interrupt', 'alar', 'dawn_edge', 7, (r, b) => {
  assert.equal(effect(b, 'break'), undefined);
  assert.equal(effect(r, 'break').willApply, true);
  assert.equal(enemy(r).status.break, 1);
  assert.ok(r.preview.targets[0].min > b.preview.targets[0].min);
}, {heavy: true});

runeCase('A040 Alar’s weaker light wave funds the next companion action', 'alar', 'dawn_wave', 13, (r, b) => {
  assert.ok(r.skill.power < b.skill.power);
  assert.equal(r.preview.targets.length, 2);
  assert.ok(r.preview.targets.every(target => target.element === 'light'));
  assert.equal(enemy(r, 1).status.chillPower, 30);
  assert.equal(effect(r, 'mana', r.target).amount, 4);
  assert.equal(manaGain(b), 0);
  assert.equal(manaGain(r), 4);
});

runeCase('A041 Alar exchanges some direct mitigation for personal recovery', 'alar', 'oath_wall', 5, (r, b) => {
  const regen = effect(r, 'regen', r.caster);
  assert.equal(statuses(b, b.caster).regen, undefined);
  assert.equal(regen.after.duration, 2);
  assert.equal(statuses(r, r.caster).regenPower, regen.after.amount);
  assert.equal(statuses(r, r.caster).counterCharges, 1);
  assert.equal(effect(r, 'guard', r.caster).after.amount, 58);
  assert.equal(effect(b, 'guard', b.caster).after.amount, 65);
});

runeCase('A042 Alar shields a depleted companion while keeping the cover link', 'alar', 'oath_shelter', 12, (r, b) => {
  assert.equal(statuses(r, r.caster).coverTargetId, r.target);
  assert.ok(statuses(r, r.target).barrier > 0);
  assert.equal(effect(r, 'mana', r.target).amount, 5);
  assert.equal(manaGain(b), 0);
  assert.equal(manaGain(r), 5);
}, {fullyHealthy: true});

runeCase('A043 Alar adds caseload triage to an emergency heal', 'alar', 'keeper_aid', 8, (r, b) => {
  assert.equal(healGain(b), 70);
  assert.equal(healGain(r), 99);
  assert.equal(effect(r, 'triage', r.target).amount, 18);
  assert.equal(statuses(r, r.target).barrier, effect(r, 'barrier', r.target).after.amount);
});

runeCase('A044 Myrt can interrupt a heavy windup with a bleeding shot', 'myrt', 'hunt_barb', 10, (r, b) => {
  assert.equal(enemy(b).status.burn, 2);
  assert.equal(enemy(r).status.burn, 3);
  assert.equal(enemy(r).status.bleed, 1);
  assert.equal(effect(r, 'break').willApply, true);
  assert.equal(enemy(r).status.break, 1);
}, {heavy: true});

runeCase('A045 Myrt opens a guarded group for the following heroes', 'myrt', 'hunt_volley', 12, (r, b) => {
  assert.ok(r.skill.power < b.skill.power);
  for (const target of r.state.battle.enemies) {
    assert.equal(enemy(b).status.guard, 1);
    assert.equal(target.status.guard, 0);
    assert.equal(target.status.chillPower, 18);
    assert.ok(effect(r, 'stripGuard', target.uid));
  }
});

runeCase('A046 Myrt baits single attacks while defending an exposed party', 'myrt', 'paths_brush', 6, (r, b) => {
  assert.equal(statuses(b, b.caster).taunt, undefined);
  assert.equal(effect(r, 'taunt', r.caster).after.duration, 2);
  assert.equal(statuses(r, r.caster).taunt, 2);
  assert.equal(statuses(r, r.caster).counterCharges, 1);
  assert.ok(statuses(r, r.caster).barrier > 0);
});

runeCase('A047 Myrt can mark a caster for armour break and a spell interruption', 'myrt', 'range_sign', 6, (r, b) => {
  assert.equal(enemy(b).status.disrupt, undefined);
  assert.equal(effect(r, 'disrupt').after.duration, 2);
  assert.equal(enemy(r).status.disrupt, 2);
  assert.equal(enemy(r).status.fracture, 2);
});

runeCase('A048 Myrt’s late step gets through a stance without removing it', 'myrt', 'range_turn', 7, (r, b) => {
  assert.ok(effect(r, 'ignoreGuard'));
  assert.equal(enemy(r).status.guard, 1);
  assert.equal(enemy(r).status.break, 2);
  assert.ok(r.preview.targets[0].min > b.preview.targets[0].max);
});

runeCase('A049 Elian can trade a stronger single bolt for two silencing strikes', 'elian', 'storms_arc', 8, (r, b) => {
  assert.equal(b.preview.targets.length, 1);
  assert.equal(r.preview.targets.length, 2);
  assert.ok(r.skill.power < b.skill.power);
  assert.equal(r.preview.targets[1].secondary, true);
  assert.equal(enemy(r, 1).status.disrupt, 2);
  assert.ok(effect(r, 'disrupt', enemy(r, 0).uid));
});

runeCase('A050 Elian’s fire echo spends extra mana to heal by actual damage', 'elian', 'storms_ember', 14, (r, b) => {
  const healing = effect(r, 'lifeHeal', r.target);
  const damage = r.state.events.filter(event => event.type === 'hit' && event.actorId === r.caster)
    .reduce((sum, hit) => sum + hit.amount, 0);
  assert.ok(healing && healGain(r) > 0 && healGain(r) >= healing.min && healGain(r) <= healing.max);
  assert.equal(healGain(r), Math.round(damage * .16));
  assert.equal(healGain(b), 0);
  assert.equal(enemy(r, 1).status.burn, 2);
});

runeCase('A051 Elian prepares recovery before the wounded ally’s next two turns', 'elian', 'circles_mend', 7, (r, b) => {
  assert.equal(statuses(b, b.target).regen, undefined);
  assert.equal(statuses(r, r.target).regen, 2);
  assert.equal(statuses(r, r.target).regenPower, effect(r, 'regen', r.target).amount);
  assert.equal(effect(r, 'triage', r.target).amount, 12);
});

runeCase('A052 Elian’s defensive circuit gives barriers without displacing a strong stance', 'elian', 'circles_aegis', 9, (r, b) => {
  assert.ok(effect(b, 'guard', b.target));
  assert.equal(effect(r, 'guard', r.target), undefined);
  assert.equal(statuses(r, r.target).guardMultiplier, .30);
  assert.ok(statuses(r, r.target).barrier > 0);
  assert.equal(statuses(r, r.caster).guard, undefined);
}, {alliedGuard: true, fullyHealthy: true});

runeCase('A053 Elian’s late seal exposes a guarded caster to follow-up hits', 'elian', 'threshold_echo', 10, (r, b) => {
  assert.equal(enemy(b).status.guard, 1);
  assert.equal(enemy(r).status.guard, 0);
  assert.equal(enemy(r).status.fracture, 2);
  assert.equal(enemy(r).status.disrupt, 2);
  assert.ok(effect(r, 'stripGuard'));
});

runeCase('A054 Iona makes a burning target easier for a physical ally to damage', 'iona', 'weather_ember', 6, (r, b) => {
  assert.equal(enemy(b).status.fracture, undefined);
  assert.equal(enemy(r).status.fracture, 2);
  assert.equal(effect(r, 'fracture').after.amount, 25);
  assert.equal(enemy(r).status.burn, 3);
});

runeCase('A055 Iona can stop a heavy strike with an expensive cold cast', 'iona', 'weather_frost', 8, (r, b) => {
  assert.equal(enemy(b).status.break, undefined);
  assert.equal(effect(r, 'break').willApply, true);
  assert.equal(enemy(r).status.break, 1);
  assert.equal(enemy(r).status.chillPower, 36);
}, {heavy: true, areaId: 'white_pass', encounterId: 'patrol_white_pass_drift'});

runeCase('A056 Iona disrupts and fractures two targets with a split seal', 'iona', 'seal_ink', 15, (r, b) => {
  assert.equal(b.preview.targets.length, 1);
  assert.ok(r.preview.targets[1].secondary);
  assert.equal(enemy(r, 1).status.fracture, 2);
  assert.equal(enemy(r, 1).status.disrupt, 2);
  assert.equal(enemy(r, 1).status.guard, 1);
});

runeCase('A057 Iona’s lightning strips two stances and softens the return fire', 'iona', 'seal_lightning', 12, (r, b) => {
  assert.equal(b.preview.targets[0].element, 'light');
  assert.equal(r.preview.targets.length, 2);
  for (const target of r.state.battle.enemies) {
    assert.equal(target.status.guard, 0);
    assert.equal(target.status.chillPower, 24);
    assert.equal(r.preview.targets.find(entry => entry.id === target.uid).element, 'lightning');
  }
});

runeCase('A058 Iona delegates mana and recovery to a depleted healthy ally', 'iona', 'ledger_reply', 10, (r, b) => {
  assert.equal(healGain(r), 0);
  assert.equal(manaGain(b), 6);
  assert.equal(effect(r, 'mana', r.target).amount, 9);
  assert.equal(manaGain(r), 9);
  assert.equal(statuses(r, r.target).regen, 2);
  assert.ok(statuses(r, r.target).regenPower > 0);
}, {fullyHealthy: true});

runeCase('A059 Radan’s group defence lets the most depleted companion cast sooner', 'radan', 'watch_wall', 9, (r, b) => {
  assert.equal(effect(r, 'guard', r.target).after.amount, 48);
  assert.equal(statuses(r, r.target).guardUntilRound, 2);
  assert.equal(manaGain(b), 0);
  assert.equal(manaGain(r), 4);
  assert.ok(statuses(r, r.target).barrier > 0);
});

runeCase('A060 Radan can provoke and brace in one costly action', 'radan', 'watch_brace', 14, (r, b) => {
  assert.equal(statuses(b, b.caster).taunt, undefined);
  assert.equal(statuses(r, r.caster).taunt, 2);
  assert.equal(statuses(r, r.caster).counterCharges, 1);
  assert.equal(effect(r, 'guard', r.caster).after.amount, 60);
  assert.ok(statuses(r, r.caster).barrier > statuses(b, b.caster).barrier);
});

runeCase('A061 Radan’s interrupt clears a stance so other allies can follow up', 'radan', 'spear_charge', 9, (r, b) => {
  assert.equal(enemy(b).status.guard, 1);
  assert.equal(enemy(r).status.guard, 0);
  assert.equal(enemy(r).status.break, 1);
  assert.ok(effect(r, 'stripGuard'));
}, {heavy: true});

runeCase('A062 Radan’s sweep weakens the attacks it draws onto him', 'radan', 'spear_sweep', 12, (r, b) => {
  assert.equal(enemy(b).status.chillPower, undefined);
  assert.equal(r.preview.targets.length, 2);
  assert.ok(r.skill.power < b.skill.power);
  for (const target of r.state.battle.enemies) {
    assert.equal(target.status.chillPower, 16);
    assert.equal(target.status.fracture, 2);
  }
  assert.equal(statuses(r, r.caster).taunt, 2);
});

runeCase('A063 Radan couples a modest heal with a critical-health barrier', 'radan', 'field_rally', 11, (r, b) => {
  assert.equal(healGain(b), 35);
  assert.equal(healGain(r), 41);
  assert.equal(manaGain(r), 6);
  assert.ok(statuses(r, r.target).barrier > 0);
  assert.equal(statuses(r, r.caster).barrier, undefined);
});

runeCase('A064 Leia can choose an economical revival with a smaller health recovery', 'leia', 'mercy_wake', 10, (r, b) => {
  const ratio = (result, fraction) => Math.round(actor(result.state, result.target).maxHp * fraction);
  assert.equal(healGain(b), ratio(b, .45));
  assert.equal(healGain(r), ratio(r, .40));
  assert.ok(r.preview.cost < b.preview.cost);
  assert.equal(statuses(r, r.target).guardMultiplier, .65);
}, {fallen: true});

runeCase('A065 Leia heals more reliably by bypassing a defensive stance', 'leia', 'hymn_spark', 5, (r, b) => {
  const actual = r.state.events.findLast(event => event.type === 'hit' && event.actorId === r.caster);
  assert.ok(effect(r, 'ignoreGuard'));
  assert.equal(enemy(r).status.guard, 1);
  assert.equal(healGain(r), Math.round(actual.amount * .28));
  assert.ok(healGain(r) > healGain(b));
});

runeCase('A066 Leia’s hymn protects the party and fuels its most depleted companion', 'leia', 'hymn_ward', 13, (r, b) => {
  assert.equal(manaGain(b), 0);
  assert.equal(manaGain(r), 6);
  assert.equal(effect(r, 'mana', r.target).amount, 6);
  assert.equal(statuses(r, r.target).guardMultiplier, .30);
  assert.ok(statuses(r, r.target).barrier > statuses(b, b.target).barrier);
}, {alliedGuard: true});

runeCase('A067 Leia protects critically wounded companions during group recovery', 'leia', 'care_chorus', 14, (r, b) => {
  assert.ok(healGain(r) > healGain(b));
  assert.equal(statuses(r, r.target).regen, 2);
  assert.ok(statuses(r, r.target).barrier > 0);
  assert.equal(statuses(r, r.caster).barrier, undefined);
  assert.equal(statuses(b, b.target).barrier, undefined);
});

runeCase('A068 Leia’s extended healing thread can support a depleted healthy target', 'leia', 'care_lantern', 8, (r, b) => {
  assert.equal(healGain(r), 0);
  assert.equal(manaGain(b), 0);
  assert.equal(manaGain(r), 5);
  assert.equal(statuses(r, r.target).regen, 3);
  assert.equal(effect(r, 'mana', r.target).amount, 5);
}, {fullyHealthy: true});

test('A039–A068 rune IDs and effects survive a save during the same battle round', async () => {
  const {state, target} = roster('myrt');
  for (const talent of ['hunt_alert', 'hunt_barb', 'hunt_volley']) accept(M.learnTalent(state, 'myrt', talent));
  enter(state, 'myrt', target);
  const variant = M.availableSkills(state, 'myrt').find(skill => skill.id === 'crossfire');
  cast(state, 'myrt', target, variant);
  const saved = await S.verify(await S.envelope(state, state.revision));
  assert.deepEqual(saved.talents, state.talents);
  assert.deepEqual(saved.battle, state.battle);
  assert.equal(M.availableSkills(saved, 'myrt').find(skill => skill.id === 'crossfire').runeId, 'hunt_volley');
});
