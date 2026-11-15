import { Quaternion } from '../../assets/vendor/three.module.js';
import { REFERENCE_CURVES } from './reference-curves.js?v=motion-190';

const BODY = /^(?:Spine(?:0[12])?|Head|neck|Tail|(?:Left|Right)(?:Shoulder|Arm|ForeArm))$/;
const AIR = /^(?:Body|Head|Tail|Wing[LR])$/;
const BEAST = /^(?:Head|Tail)$/;
const LOOPS = new Set(['Idle', 'Walk', 'Run']);
const PITCH = { x: 1, y: 0, z: 0 };
const PHRASES = {
  sword: ['load', 'drive', 'follow'],
  spear: ['quick', 'drive', 'retract'],
  heavy: ['load', 'drive', 'brace'],
  claw: ['load', 'quick', 'retract'],
  arrow: ['gather', 'quick', 'follow'],
  guard: ['quick', 'brace', 'brace'],
  ward: ['gather', 'brace', 'follow'],
  fire: ['load', 'drive', 'retract'],
  frost: ['gather', 'brace', 'settle'],
  lightning: ['quick', 'quick', 'retract'],
  runes: ['gather', 'drive', 'follow'],
  heal: ['gather', 'brace', 'settle'],
  revive: ['load', 'brace', 'settle'],
  hit: ['quick', 'settle'],
  fall: ['fall', null],
};

export function motionCurve(name, t) {
  const curve = REFERENCE_CURVES[name];
  const last = curve.length - 1;
  const phase = Math.min(1, Math.max(0, t)) * last;
  const i = Math.floor(phase);
  return i === last ? curve[last] : curve[i] + (curve[i + 1] - curve[i]) * (phase - i);
}

export function rigMotionType(clip) {
  const tracks = clip.tracks;
  if (tracks.some(track => track.name === 'WingL.quaternion')) return 'air';
  if (tracks.some(track => track.name === 'FrontLFoot.quaternion')) return 'beast';
  return tracks.some(track => track.name === 'Hips.quaternion') ? 'human' : 'body';
}

export function referenceFamily(profile, clip) {
  const { name } = clip;
  if (LOOPS.has(name)) return name.toLowerCase();
  if (name === 'Hit') return 'hit';
  if (name === 'Death') return 'fall';
  if (name === 'Block' || /ShieldWall|BraceImpact|EnemyGuard|OathGuard|DawnChallenge/.test(name)) return 'guard';
  if (/Revive|WakeFlame|LastLight/.test(name)) return 'revive';
  if (/Mend|Healing|WarmHands|SharedBreath|Rally|ClearThought/.test(name)) return 'heal';
  if (/Claw/.test(name)) return 'claw';
  if (/Spear|IronSweep|CounterCharge/.test(name)) return 'spear';
  if (/Heavy/.test(name)) return 'heavy';
  if (/Ward|Hymn|OathLink|EnemyRing/.test(name)) return 'ward';
  if (/Fire|Cinder|Ember/.test(name)) return 'fire';
  if (/Frost|Ice/.test(name)) return 'frost';
  if (/Lightning|Spark/.test(name)) return 'lightning';
  if (name === 'Attack' || name === 'CastSunCut') {
    if (profile.profile === 'party:myrt' || /archer/.test(profile.profile + ' ' + profile.motionIntent)) return 'arrow';
    if (profile.profile === 'party:radan') return 'spear';
    const rig = rigMotionType(clip);
    if (rig === 'beast' || rig === 'air' || profile.base === 'bird') return 'claw';
    return /golem|keeper|boss/.test(profile.base) ? 'heavy' : 'sword';
  }
  return 'runes';
}

function phaseStops(profile, family) {
  if (family === 'fall') return [0, profile.deathHeldEndNormalized ?? 20 / 24, 1];
  if (family === 'hit') return [0, .28, 1];
  const release = profile.castReleaseNormalized ?? 7 / 24;
  const contact = profile.physicalImpactNormalized ?? .5;
  return release > 0 && contact > release && contact < 1 ? [0, release, contact, 1] : [0, 7 / 24, .5, 1];
}

function frameMap(times, duration, stops, phrases) {
  const phases = times.map(time => time / duration);
  const protectedKeys = new Set([0, times.length - 1]);
  for (const stop of stops.slice(1, -1)) {
    const key = phases.findIndex(t => t >= stop - 1e-6);
    if (key < 0) continue;
    protectedKeys.add(key);
    // Exact release/contact must survive even between stored keys.
    if (key && Math.abs(phases[key] - stop) > 1e-6) protectedKeys.add(key - 1);
  }
  const result = [];
  let left = 0;
  for (let i = 1; i < times.length - 1; i++) {
    if (protectedKeys.has(i)) continue;
    const beat = stops.findIndex(stop => phases[i] < stop) - 1;
    const shape = phrases[beat];
    if (!shape) continue;
    const start = stops[beat], end = stops[beat + 1];
    const source = start + (end - start) * motionCurve(shape, (phases[i] - start) / (end - start));
    while (left + 1 < times.length - 1 && phases[left + 1] < source) left++;
    const factor = (source - phases[left]) / (phases[left + 1] - phases[left]);
    result.push([i, left, Math.min(1, Math.max(0, factor))]);
  }
  return result;
}

function shapeAction(profile, clip, family) {
  const stops = phaseStops(profile, family);
  if (stops.some((v, i) => !Number.isFinite(v) || (i > 0 && v <= stops[i - 1]))) return;
  const maps = new Map();
  const revisions = [];
  const weightByPhase = new Map();
  const orig = new Quaternion(), changed = new Quaternion();
  const maximumAngle = (family === 'fall' ? 16 : 13) * Math.PI / 180;
  for (const track of clip.tracks) {
    const rotation = track.type === 'quaternion';
    const bone = track.name.split('.')[0];
    // The entire fall follows the same curve. Standing actions keep the
    // authored root and foot trajectories.
    if (family !== 'fall' && !(rotation && (BODY.test(bone) || AIR.test(bone)))) continue;
    if (!rotation && track.type !== 'vector') continue;
    const size = rotation ? 4 : 3;
    if (track.times.length < 3 || track.values.length !== size * track.times.length) continue;
    const id = track.times.join(',');
    if (!maps.has(id)) maps.set(id, frameMap(track.times, clip.duration, stops, PHRASES[family]));
    const original = track.values;
    const output = original.slice();
    for (const [i, left, factor] of maps.get(id)) {
      const start = left * size, end = (left + 1) * size, dest = i * size;
      if (rotation) Quaternion.slerpFlat(output, dest, original, start, original, end, factor);
      else for (let k = 0; k < size; k++) {
        output[dest + k] = original[start + k] + (original[end + k] - original[start + k]) * factor;
      }
      if (rotation) {
        const angle = orig.fromArray(original, dest).normalize().angleTo(changed.fromArray(output, dest).normalize());
        const weight = Math.min(1, maximumAngle / Math.max(.00001, angle));
        const time = track.times[i];
        weightByPhase.set(time, Math.min(weight, weightByPhase.get(time) ?? 1));
      }
    }
    revisions.push({track, output, frames:maps.get(id), size});
  }
  // One limit per key keeps hands, torso and (when falling) root together.
  for (const {track, output, frames, size} of revisions) {
    const source = track.values;
    for (const [frame] of frames) {
      const weight = weightByPhase.get(track.times[frame]) ?? 1;
      if (weight === 1) continue;
      const i = frame*size;
      if (size === 4) Quaternion.slerpFlat(output, i, source, i, output, i, weight);
      else for (let c = 0; c < size; c++) output[i+c] = source[i+c] + (output[i+c]-source[i+c])*weight;
    }
    track.values = output;
  }
}

function settleLoop(clip) {
  const type = rigMotionType(clip);
  const upper = type === 'air' ? AIR : type === 'beast' ? BEAST : BODY;
  const idle = clip.name === 'Idle';
  const center = new Quaternion(), key = new Quaternion(), offset = new Quaternion();
  for (const track of clip.tracks) {
    const bone = track.name.split('.')[0];
    const length = track.times.length;
    if (track.type !== 'quaternion' || !upper.test(bone) || length < 3 || track.values.length !== 4 * length) continue;
    const source = track.values, output = source.slice();
    for (let i = 1; i < length - 1; i++) {
      key.fromArray(source, i * 4).normalize();
      center.fromArray(source, (i - 1) * 4).normalize();
      center.slerp(offset.fromArray(source, (i + 1) * 4).normalize(), .5);
      key.slerp(center, idle ? .44 : clip.name === 'Walk' ? .30 : .22);
      if (idle && /^(Spine|Head|Tail|Body)$/.test(bone)) {
        const weight = bone === 'Head' ? -.004 : bone === 'Tail' ? .008 : .015;
        offset.setFromAxisAngle(PITCH, weight * motionCurve('breath', track.times[i] / clip.duration));
        key.multiply(offset).normalize();
      } else if (!idle && /^(Spine|Head|Tail)$/.test(bone)) {
        const phase = track.times[i] / clip.duration;
        const weight = bone === 'Head' ? -.005 : .006;
        offset.setFromAxisAngle(PITCH, weight * Math.sin(phase * 4 * Math.PI));
        key.multiply(offset).normalize();
      }
      key.toArray(output, i * 4);
    }
    track.values = output;
  }
}

export function refineReferenceMotion(profile) {
  for (const clip of profile.clips) {
    if (LOOPS.has(clip.name)) settleLoop(clip);
    else shapeAction(profile, clip, referenceFamily(profile, clip));
  }
  return profile;
}

export function bowBeat(age, timing) {
  if (!timing || !(age >= 0) || age >= timing.duration) return {lift:0, draw:0, follow:0, string:0};
  const {release, duration} = timing;
  const recovery = 1 - motionCurve('settle', (age - release - .10) / Math.max(.05, duration - release - .10));
  return {
    lift: motionCurve('bowLift', age / (release * .62)) * recovery,
    draw: motionCurve('bowDraw', (age - release * .19) / (release * .61)) * recovery,
    follow: motionCurve('bowFollow', (age - release) / Math.max(.12, (duration - release) * .58)),
    string: motionCurve('quick', (age - release) / .066),
  };
}
