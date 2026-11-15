import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import * as model from '../src/act1/model.js';
import * as saves from '../src/act1/save.js';
import { AREAS, CAMPAIGN_COMICS, ENEMIES, PARTY, SKILLS } from '../src/act1/content.js';
import { experienceAtLevel, runedSkill, talentCatalog } from '../src/act1/campaign-progression.js';
import { areaLoadingPresentation } from '../src/act1/campaign-ui.js';
import { planPath, validSegment } from '../src/act1/navigation.js';

const isPatrol = encounter => encounter.id.startsWith('patrol_');
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const experience = hero => experienceAtLevel(hero.level) + hero.xp;

test('A013: each area has a small illustration and tips rotate per visit', () => {
  const images = new Set();
  for (const area of AREAS) {
    const first = areaLoadingPresentation(area, CAMPAIGN_COMICS, 0);
    const next = areaLoadingPresentation(area, CAMPAIGN_COMICS, 1);
    assert.equal(first.title, area.title);
    assert.notEqual(first.tip, next.tip);
    assert.equal(first.illustration, next.illustration);
    assert.ok(statSync(new URL('../' + first.illustration, import.meta.url)).size < 130_000);
    assert.ok(!first.illustration.includes('final_'));
    if (area.entryComic) assert.equal(first.illustration, CAMPAIGN_COMICS[area.entryComic].illustration);
    images.add(first.illustration);
  }
  assert.equal(images.size, 11);
});

test('A014: all 28 optional patrols are reachable and clear of exits, camps and story encounters', () => {
  let count = 0;
  for (const area of AREAS) {
    const patrols = area.encounters.filter(isPatrol);
    const story = [area.spawn, ...area.nodes, ...area.npcs, ...area.exits, ...area.encounters.filter(e => !isPatrol(e))];
    for (const patrol of patrols) {
      count++;
      assert.ok(!patrol.boss && !patrol.required && !patrol.forced && !patrol.flagOnWin, patrol.id);
      assert.ok(patrol.enemies.every(id => ENEMIES[id] && !ENEMIES[id].boss), patrol.id);
      assert.ok(story.every(point => distance(point, patrol) >= 10), patrol.id);
      assert.ok(patrols.every(other => other === patrol || distance(other, patrol) > 28), patrol.id);
      assert.equal(planPath(area.id, area.spawn, patrol, { bounds: area.bounds }).status, 'ready', patrol.id);
      for (const sign of [-1, 1]) {
        const [dx, dz] = patrol.stroll;
        assert.ok(validSegment(area.id, patrol, { x: patrol.x + sign * dx, z: patrol.z + sign * dz }), patrol.id);
      }
    }
  }
  assert.equal(count, 28);
});

test('A015: a real battle awards the roster XP and patrol bonus once across a save reload', async () => {
  const state = model.newGame('alar');
  const patrol = AREAS[0].encounters.find(isPatrol);
  state.position = { x: patrol.x, z: patrol.z };
  const beforeXp = experience(state.party[0]);
  assert.equal(model.interact(state, patrol.id).ok, true);
  assert.equal(state.battle.forced, false);
  for (let i = 0; state.battle && i < 16; i++) {
    assert.equal(model.battleAction(state, { kind: 'attack', targetId: state.battle.enemies[0].uid }).ok, true);
  }
  const xp = patrol.rewards.xp + patrol.enemies.reduce((sum, id) => sum + ENEMIES[id].rewards.xp, 0);
  assert.equal(experience(state.party[0]) - beforeXp, xp);
  assert.equal(state.events.find(event => event.type === 'victory').rewardSummary.xp, xp);
  const restored = await saves.verify(await saves.envelope(state, state.revision));
  const beforeRetry = model.snapshot(restored);
  assert.equal(model.interact(restored, patrol.id).ok, false);
  assert.deepEqual(model.snapshot(restored), beforeRetry);
});

test('A016: six different role branches expose both real skill runes and new stat bonuses', () => {
  const ids = new Set();
  for (const hero of PARTY) {
    const branch = talentCatalog({ ...hero, level: 27 }).branches.find(entry => entry.id === 'campaign');
    assert.deepEqual(branch.nodes.map(node => node.level), [6, 13, 16, 20, 23, 27]);
    assert.equal(branch.nodes.filter(node => node.passive).length, 4);
    for (const node of branch.nodes) {
      assert.ok(!ids.has(node.id));
      ids.add(node.id);
      if (node.skillId) {
        assert.ok(hero.skills.includes(node.skillId));
        assert.equal(runedSkill(hero.id, SKILLS[node.skillId], [node.id]).runeId, node.id);
      }
    }
    const firstFive = branch.nodes.slice(0, 5).map(node => node.id);
    const finalStep = level => talentCatalog({ ...hero, level }, firstFive).branches.at(-1).nodes.at(-1);
    assert.equal(finalStep(26).available, false);
    assert.equal(finalStep(27).available, true);
  }
  assert.equal(ids.size, 36);
});

test('A016: the final Alar rune spends fewer MP and grants its longer barrier after a save reload', async () => {
  const state = model.newGame('alar');
  state.party[0].level = 27;
  const stats = model.stats(state, 'alar');
  Object.assign(state.party[0], { hp: stats.maxHp, maxHp: stats.maxHp, mp: stats.maxMp, maxMp: stats.maxMp });
  const branch = model.talentInfo(state, 'alar').branches.find(entry => entry.id === 'campaign');
  assert.equal(model.learnTalent(state, 'alar', branch.nodes.at(-1).id).ok, false);
  for (const node of branch.nodes) assert.equal(model.learnTalent(state, 'alar', node.id).ok, true);
  assert.equal(model.stats(state, 'alar').def, stats.def + 5);
  const loaded = await saves.verify(await saves.envelope(state, state.revision));
  const patrol = AREAS[0].encounters.find(isPatrol);
  loaded.position = { x: patrol.x, z: patrol.z };
  assert.equal(model.interact(loaded, patrol.id).ok, true);
  const skill = model.availableSkills(loaded, 'alar').find(entry => entry.id === 'dawn_challenge');
  assert.equal(skill.runeId, 'keeper_bastion');
  assert.equal(skill.heroEffects.barrier.turns, 3);
  const action = { kind: 'skill', skillId: skill.id, targetId: 'alar' };
  const preview = model.battlePreview(loaded, action, 'alar');
  assert.equal(preview.ok, true);
  assert.equal(preview.cost, 7);
  const mana = loaded.party[0].mp;
  assert.equal(model.battleAction(loaded, action).ok, true);
  assert.equal(loaded.party[0].mp, mana - preview.cost);
  assert.ok(loaded.battle.status.alar.barrier > 0);
  model.validate(loaded);
});
