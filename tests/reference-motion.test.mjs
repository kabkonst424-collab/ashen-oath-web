import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { test } from 'node:test';
import { Quaternion } from '../assets/vendor/three.module.js';
import { motionPatchDescriptor, applyMotionPatch } from '../src/act1/motion-clip-corrections.js';
import { bowBeat, referenceFamily, refineReferenceMotion, rigMotionType } from '../src/act1/reference-motion.js';
import { REFERENCE_CURVES } from '../src/act1/reference-curves.js';

const assets = new URL('../assets/', import.meta.url);
const library = 'act1/animation/';
const campaign = 'campaign/actors/';
const bytes = path => readFileSync(new URL(path, assets));
const read = path => JSON.parse(bytes(path));
const sha = value => createHash('sha256').update(value).digest('hex');
const q1 = new Quaternion(), q2 = new Quaternion();
const round = n => Number(n.toFixed(4));

function loadProfile(path, expected) {
  const raw = bytes(path);
  assert.equal(sha(raw), expected);
  const profile = JSON.parse(raw);
  const patch = motionPatchDescriptor(profile.base, profile.profile);
  if (patch) {
    assert.equal(sha(bytes(library + patch.file)), patch.sha256);
    applyMotionPatch(profile, read(library + patch.file), expected);
  }
  return profile;
}

function* sources() {
  for (const row of Object.values(read(library + 'animation-library.json').profiles)) {
    yield loadProfile(library + row.file, row.sha256);
  }
  for (const row of read(campaign + 'manifest.json').actors) {
    yield loadProfile(campaign + row.id + '.json', row.motionSha256);
  }
}

test('every browser animation file keeps its key times, phase anchors and rig', () => {
  const report = {profiles:0, clips:0, modified:0, unchanged:[], groups:{}, rows:[]};
  for (const profile of sources()) {
    const result = refineReferenceMotion(structuredClone(profile));
    report.profiles++;
    assert.deepEqual(result.locomotion, profile.locomotion);
    assert.deepEqual(result.skillClips, profile.skillClips);
    assert.deepEqual(result.castHands, profile.castHands);
    for (const [index, source] of profile.clips.entries()) {
      const revised = result.clips[index], family = referenceFamily(profile, source);
      const rig = rigMotionType(source);
      const key = profile.base + '/' + profile.profile + '/' + source.name;
      report.clips++;
      assert.equal(revised.name, source.name, key);
      assert.equal(revised.duration, source.duration, key);
      assert.equal(revised.tracks.length, source.tracks.length, key);
      const loop = ['idle','walk','run'].includes(family);
      const anchors = family === 'fall' ? [profile.deathHeldEndNormalized ?? 20/24]
        : family === 'hit' ? [.28] : loop ? [] : [profile.castReleaseNormalized ?? 7/24, profile.physicalImpactNormalized ?? .5];
      let maximumDegrees = 0;
      let maximumShift = 0;
      for (const [i, track] of source.tracks.entries()) {
        const next = revised.tracks[i];
        assert.equal(next.name, track.name, key);
        assert.deepEqual(next.times, track.times, key);
        assert.ok(next.values.every(Number.isFinite), key);
        const size = track.type === 'quaternion' ? 4 : 3;
        const end = track.times.length - 1;
        const exact = new Set([0,end]);
        for (const phase of anchors) {
          const f = track.times.findIndex(time => time/source.duration >= phase-1e-6);
          if (f < 0) continue;
          exact.add(f);
          if (f > 0 && Math.abs(track.times[f]/source.duration - phase) > 1e-6) exact.add(f-1);
          if (family === 'fall') for (let n=f; n<=end; n++) exact.add(n);
        }
        for (let frame=0; frame<=end; frame++) {
          const start = frame*size;
          const now = next.values.slice(start, start+size);
          if (exact.has(frame)) assert.deepEqual(now, track.values.slice(start,start+size), key + ':' + track.name);
          if (size === 4) {
            q1.fromArray(track.values,start).normalize();
            q2.fromArray(now).normalize();
            const length = Math.hypot(...now);
            assert.ok(Math.abs(length-1)<1e-4, key);
            maximumDegrees = Math.max(maximumDegrees,q1.angleTo(q2)*180/Math.PI);
          } else {
            maximumShift = Math.max(maximumShift, Math.hypot(...now.map((v,c)=>v-track.values[start+c])));
          }
        }
        if (family !== 'fall' && /(?:UpLeg|Foot|ToeBase|Rear[LR]|Front[LR]|Hips|Root)\b/.test(track.name)) {
          assert.deepEqual(next.values, track.values, key + ':' + track.name);
        }
      }
      const modified = maximumDegrees > .025 || maximumShift > .001;
      assert.ok(maximumDegrees < (family === 'fall' ? 16.01 : 13.01), key + ' ' + maximumDegrees);
      if (modified) report.modified++;
      else report.unchanged.push(key);
      const group = report.groups[rig+'/'+family] ??= {clips:0,modified:0,maxDegrees:0};
      group.clips++;
      group.modified += Number(modified);
      group.maxDegrees = round(Math.max(group.maxDegrees,maximumDegrees));
      report.rows.push({clip:key,rig,family,maximumDegrees:round(maximumDegrees),maximumShift:round(maximumShift),modified});
    }
  }
  assert.ok(report.profiles>=80 && report.clips>=750);
  assert.equal(report.modified, report.clips, JSON.stringify(report.unchanged));
  if (process.env.ASHEN_MOTION_REPORT) writeFileSync(process.env.ASHEN_MOTION_REPORT, JSON.stringify(report,null,2)+'\n');
});

test('Blender control samples are bounded and monotone at gameplay beats', () => {
  for (const [name, curve] of Object.entries(REFERENCE_CURVES)) {
    assert.equal(curve.length,25,name);
    assert.equal(curve[0],0,name);
    if (name === 'bowFollow' || name === 'breath') assert.equal(curve[24],0,name);
    else {
      assert.equal(curve[24],1,name);
      assert.ok(curve.every((value,i)=>i===0||value>=curve[i-1]),name);
    }
  }
});

test('bow stays at full draw before release, keeps the lead arm and separates follow-through', () => {
  const timeline = {release:.54,duration:1.12};
  assert.deepEqual(bowBeat(-.01,timeline),{lift:0,draw:0,follow:0,string:0});
  assert.equal(bowBeat(.12,timeline).follow,0);
  assert.ok(bowBeat(.12,timeline).lift>bowBeat(.12,timeline).draw);
  for (const t of [.44,.48,.54]) assert.deepEqual(bowBeat(t,timeline),{lift:1,draw:1,follow:0,string:0});
  const early = bowBeat(.58,timeline), follow = bowBeat(.70,timeline);
  assert.ok(early.lift===1&&early.follow>0&&early.string>0&&early.string<1);
  assert.ok(follow.lift>.75&&follow.follow>early.follow&&follow.string===1);
  assert.ok(bowBeat(.98,timeline).draw<.2);
  assert.deepEqual(bowBeat(1.12,timeline),{lift:0,draw:0,follow:0,string:0});
});
