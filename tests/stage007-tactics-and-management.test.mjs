import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/act1/model.js';
import * as S from '../src/act1/save.js';
import {AREAS, ITEMS} from '../src/act1/content.js';
import {ENCOUNTER_OPENINGS} from '../src/act1/encounter-openings.js';
import {emptyEquipment} from '../src/act1/equipment-slots.js';
import {windowBagView} from '../src/act1/interface-presentation.js';

const okay = answer => assert.equal(answer.ok, true, answer.message);

function addLevel(state, id, level) {
  let hero = state.party.find(entry => entry.id === id);
  if (!hero) {
    hero = {id, xp:0};
    state.party.push(hero);
    state.gear[id] = emptyEquipment();
  }
  hero.level = level;
  const st = M.stats(state,id);
  Object.assign(hero,{maxHp:st.hp, hp:st.hp, maxMp:st.mp, mp:st.mp});
  return hero;
}

function encounter(state, id) {
  const area = AREAS.find(candidate => candidate.encounters.some(fight => fight.id === id));
  const site = area.encounters.find(fight => fight.id === id);
  state.areaId = area.id;
  state.position = {x:site.x, z:site.z};
  for (const flag of site.requiresFlags || []) state.flags[flag] = true;
  okay(M.interact(state,id));
}

for (const [id, fixture] of Object.entries(ENCOUNTER_OPENINGS)) {
  test('first-round tactic for '+id, async () => {
    const state = M.newGame('myrt');
    addLevel(state,'myrt',30);
    encounter(state,id);
    const opening = M.encounterOpeningInfo(state);
    assert.equal(opening.title,fixture.title);
    for (const plan of fixture.units) {
      const enemy=state.battle.enemies[plan.index];
      assert.equal(enemy.intent,plan.intent);
      assert.equal(enemy.skillId,plan.skillId);
      for (const [key,value] of Object.entries(plan.status||{})) assert.equal(enemy.status[key],value);
    }
    const restored = await S.verify(await S.envelope(state,18));
    assert.deepEqual(restored.battle, state.battle);
    assert.deepEqual(M.encounterOpeningInfo(restored), opening);
    okay(M.battleAction(restored,{kind:'defend'}));
    assert.equal(M.encounterOpeningInfo(restored),null);
  });
}

test('A113 net mana forecast uses the true cost and the capped recovery', () => {
  for (const [id, expected] of [['trail_breath',0],['briar_shot',null]]) {
    const state=M.newGame('myrt');
    addLevel(state,'myrt',16);
    state.party[0].mp-=8;
    encounter(state,'patrol_briarwood_thicket');
    const current=state.party[0], ability=M.availableSkills(state).find(skill=>skill.id===id);
    const targetId=ability.target==='self'?'myrt':state.battle.enemies[0].uid;
    const action={kind:'skill',skillId:id,targetId};
    const forecast=M.battlePreview(state,action);
    assert.equal(forecast.manaAfter,expected===0?current.maxMp:current.mp-ability.mp);
    okay(M.battleAction(state,action));
    assert.equal(state.party[0].mp,forecast.manaAfter);
  }
});

test('A114 stronger regeneration can prepare a healthy ally even with equal duration', () => {
  const state=M.newGame('alar');
  addLevel(state,'leia',18);
  encounter(state,'enc02');
  assert.equal(state.battle.activeHeroId,'leia');
  state.battle.status.alar={regen:2, regenPower:1};
  const action={kind:'skill',skillId:'healing_thread',targetId:'alar'};
  const forecast=M.battlePreview(state,action);
  assert.ok(forecast.canCommit);
  const regeneration=forecast.additionalEffects.find(effect=>effect.kind==='regen');
  assert.equal(regeneration.change,'strengthen');
  okay(M.battleAction(state,action));
  assert.equal(state.battle.status.alar.regenPower,regeneration.after.amount);
});

test('A115 a group stance keeps a stronger active guard and does not extend it by mistake', () => {
  const state=M.newGame('elian');
  addLevel(state,'elian',19);
  encounter(state,'patrol_frost_observatory_ward');
  state.battle.status.elian={guard:2,guardMultiplier:.22};
  const action={kind:'skill',skillId:'ward_circuit',targetId:'elian'};
  const forecast=M.battlePreview(state,action);
  const guard=forecast.additionalEffects.find(effect=>effect.kind==='guard');
  assert.equal(guard.after.amount,78);
  assert.match(guard.label,/сохраняется/);
  okay(M.battleAction(state,action));
  assert.equal(state.battle.status.elian.guardMultiplier,.22);
  assert.equal(state.battle.status.elian.guardUntilRound,undefined);
});

test('A116 an elemental weakness shows loss of balance and recovery immunity', () => {
  const state=M.newGame('elian');
  addLevel(state,'elian',23);
  encounter(state,'patrol_slag_terraces_ash_bank');
  const enemy=state.battle.enemies[0];
  const action={kind:'skill',skillId:'frost_mirror',targetId:enemy.uid};
  const stage=()=>M.battlePreview(state,action).additionalEffects.find(effect=>effect.kind==='break');
  assert.equal(stage().willApply,true);
  assert.equal(stage().duration,2);
  enemy.status.breakRecovery=1;
  assert.equal(stage().willApply,false);
});

test('A117 a triage preview gives only healing that fits in the HP bar', () => {
  const state=M.newGame('alar');
  addLevel(state,'leia',16);
  const ally=state.party[0];
  ally.hp=30;
  encounter(state,'enc02');
  const action={kind:'skill',skillId:'warm_hands',targetId:'alar'};
  const forecast=M.battlePreview(state,action);
  const triage=forecast.additionalEffects.find(effect=>effect.kind==='triage');
  const missing=ally.maxHp-ally.hp;
  assert.equal(triage?.amount||0,Math.min(30,Math.max(0,missing-96)));
  assert.equal(forecast.targets[0].max,Math.min(missing,126));
  okay(M.battleAction(state,action));
  const applied=state.events.find(event=>event.type==='heal'&&event.actorId==='leia'&&event.targetId==='alar');
  assert.equal(applied.amount,forecast.targets[0].max);
});

test('A118 a ready enemy healer forecasts a guard if its allies are full', () => {
  const state=M.newGame('myrt');
  addLevel(state,'myrt',30);
  encounter(state,'patrol_archive_shelves');
  const healer=state.battle.enemies[1];
  const guard=M.enemyIntentInfo(state,healer.uid);
  assert.equal(guard.effectiveIntent,'guard');
  assert.match(guard.reason,/союзники целы/);
  state.battle.enemies[0].hp-=12;
  const restore=M.enemyThreatPreview(state,healer.uid);
  assert.equal(restore.effectiveIntent,'heal');
  assert.equal(restore.targets[0].max,12);
});

test('A119/A120 a single refund preserves the other choices and rejects a required parent', async () => {
  const state=M.newGame('alar');
  addLevel(state,'alar',24);
  for(const key of ['strength','strength','agility'])okay(M.trainAttribute(state,'alar',key));
  for(const key of ['first_ray','dawn_edge','oath_steel'])okay(M.learnTalent(state,'alar',key));
  const pristine=structuredClone(state);
  assert.equal(M.refundTalent(state,'alar','first_ray').ok,false);
  assert.deepEqual(state,pristine);
  okay(M.refundTalent(state,'alar','dawn_edge'));
  okay(M.refundAttribute(state,'alar','strength'));
  const result=await S.verify(await S.envelope(state,20));
  assert.deepEqual(result.talents.alar,['first_ray','oath_steel']);
  assert.deepEqual(result.attributes.alar,{strength:1,agility:1});
});

test('A122–A124 inventory filters preserve real slots, favorites survive unequip and block sale', async () => {
  const state=M.newGame('alar'), village=AREAS.find(area=>area.id==='village');
  const shop=village.npcs.find(npc=>npc.id==='orin_village');
  state.areaId=village.id;
  state.position={x:shop.x,z:shop.z};
  state.gold=300;
  okay(M.buy(state,shop.id,'trail_soles'));
  const from=state.bag.findIndex(item=>item?.defId==='trail_soles'), original=state.bag[from];
  okay(M.toggleItemFavorite(state,{kind:'bag',index:from},original.uid,state.revision));
  const view=()=>windowBagView(state.bag,ITEMS,'equipment','','all',{slot:'boots',favoriteOnly:true});
  assert.equal(view()[0].index,from);
  okay(M.equip(state,from,'alar','boots'));
  okay(M.unequip(state,'alar','boots'));
  const next=await S.verify(await S.envelope(state,9));
  const index=next.bag.findIndex(item=>item?.uid===original.uid);
  assert.equal(next.bag[index].favorite,true);
  const balance=next.gold;
  assert.equal(M.previewSell(next,shop.id,index).ok,false);
  assert.equal(M.sell(next,shop.id,index).ok,false);
  assert.equal(next.gold,balance);
  okay(M.toggleItemFavorite(next,{kind:'bag',index},original.uid,next.revision));
  okay(M.sell(next,shop.id,index));
});
