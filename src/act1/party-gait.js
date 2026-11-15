import * as T from '../../assets/vendor/three.module.js';
import { WALK_CYCLE, RUN_CYCLE } from './data/party-locomotion.js?v=stride-112';

const UP = new T.Vector3(0, 1, 0);
const SIDES = ['Left', 'Right'];
const CHARACTER_GAIT = {
  alar: [1, 1, .7],
  myrt: [1.055, .95, 1],
  elian: [.99, .97, .87],
  iona: [1.025, .91, .84],
  radan: [.955, 1.07, .68],
  leia: [1.04, .88, .90],
};
const { clamp, lerp, smoothstep } = T.MathUtils;
const cycle = value => (value % 1 + 1) % 1;
const turn = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const shoeVertices = new WeakMap();
const EMPTY_VERTICES = Object.freeze([]);

function sampleCycle(clip, phase, result) {
  const index = cycle(phase) * clip.keys.length;
  const i = Math.floor(index), t = index - i;
  const at = offset => clip.keys[(i + offset + clip.keys.length) % clip.keys.length];
  const before = at(-1), from = at(0), to = at(1), after = at(2);
  // Periodic interpolation keeps the stride and its velocity continuous.
  for (let j = 0; j < result.length; j++) {
    const a = from[j], b = to[j], first = (b - before[j]) * .5, last = (after[j] - a) * .5;
    result[j] = a + t * (first + t * (3 * (b - a) - 2 * first - last + t * (2 * (a - b) + first + last)));
  }
}

function segmentBasis(down, across) {
  const up = down.clone().negate(), front = across.clone().cross(up);
  return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across, up, front));
}

function boneInPlane(bone, end, forward) {
  const down = end.clone().sub(bone.getWorldPosition(new T.Vector3())).normalize();
  const across = forward.clone().cross(down).normalize();
  return segmentBasis(down, across).invert().multiply(bone.getWorldQuaternion(new T.Quaternion()));
}

function mean(points) {
  const centre = new T.Vector3();
  for (const point of points) centre.add(point);
  return centre.multiplyScalar(1 / points.length);
}

function shoeVertexIndices(mesh, names) {
  const { geometry, skeleton } = mesh;
  const indices = geometry.getAttribute('skinIndex');
  const weights = geometry.getAttribute('skinWeight');
  if (!indices || !weights) return EMPTY_VERTICES;

  const boneIds = skeleton.bones.flatMap((bone, index) => names.includes(bone.name) ? [index] : []);
  if (!boneIds.length) return EMPTY_VERTICES;
  let byBone = shoeVertices.get(geometry);
  if (!byBone) {
    byBone = new Map();
    shoeVertices.set(geometry, byBone);
  }
  const key = boneIds.join(':');
  if (!byBone.has(key)) {
    const matches = [], bones = new Set(boneIds);
    for (let index = 0; index < indices.count; index++) {
      let weight = 0;
      for (let component = 0; component < 4; component++) {
        if (bones.has(indices.getComponent(index, component))) weight += weights.getComponent(index, component);
      }
      if (weight >= .57) matches.push(index);
    }
    byBone.set(key, matches);
  }
  return byBone.get(key);
}

function shoeMarkers(meshes, names, forward) {
  const points = [];
  const point = new T.Vector3();
  for (const mesh of meshes) {
    // Vertex identities come from the shared rig. Their world positions depend on this clone's pose.
    for (const index of shoeVertexIndices(mesh, names)) {
      points.push(mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld).clone());
    }
  }
  if (points.length < 12) return null;
  points.sort((a,b) => a.y-b.y);
  // Select the front and back of the sole using actual skinned geometry. Local
  // axes of the ankle joints differ between rigs, and also between left and right.
  const sole = points.slice(0,Math.ceil(points.length*.55)).sort((a,b)=>a.dot(forward)-b.dot(forward));
  const n = Math.max(3,Math.min(28,Math.floor(sole.length*.19)));
  return {heel:mean(sole.slice(0,n)), toe:mean(sole.slice(-n))};
}

export function preparePartyGait(actor) {
  const { party, patrol, battle } = actor.options;
  if ((!party && !patrol && !battle) || Math.abs(actor.flightBaseline || 0) > .02) return;
  const bone = name => actor.root.getObjectByName(name);
  const hips=bone('Hips'), spine=bone('Spine02')||bone('Spine01')||bone('Spine'), head=bone('Head');
  if (!hips?.parent || !spine?.parent || !head) return;
  actor.wrapper.updateMatrixWorld(true);
  const origin = actor.wrapper.getWorldPosition(new T.Vector3());
  const yaw = actor.sourceFrontYaw || 0;
  const forward = new T.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const right = new T.Vector3().crossVectors(UP,forward);
  const sourceFacing = new T.Quaternion().setFromAxisAngle(UP, -yaw);
  const meshes = [];
  actor.root.traverse(mesh=>{if(mesh.isSkinnedMesh)meshes.push(mesh);});
  const legs = SIDES.map(side=>{
    const thigh=bone(side+'UpLeg'), shin=bone(side+'Leg'), foot=bone(side+'Foot'), toe=bone(side+'ToeBase');
    if (![thigh, shin, foot, toe].every(joint => joint?.isBone)) return null;
    if (shin.parent !== thigh || foot.parent !== shin || toe.parent !== foot) return null;
    const heelToToe=shoeMarkers(meshes,[foot.name,toe.name],forward);
    if (!heelToToe) return null;
    const {heel,toe:tip}=heelToToe;
    const axis=tip.clone().sub(heel).normalize(), across=new T.Vector3().crossVectors(UP,axis).normalize();
    if (across.lengthSq()<.9 || tip.distanceTo(heel)<.08) return null;
    const normal=new T.Vector3().crossVectors(axis,across);
    const basis=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(across,normal,axis));
    const inverseBasis=basis.clone().invert();
    const ankle=foot.getWorldPosition(new T.Vector3());
    const offset=point=>point.clone().sub(ankle).applyQuaternion(inverseBasis);
    const heelOffset=offset(heel), tipOffset=offset(tip);
    const knee = shin.getWorldPosition(new T.Vector3());
    const upper = thigh.getWorldPosition(new T.Vector3()).distanceTo(knee);
    const lower = knee.distanceTo(ankle);
    if (Math.min(upper, lower) < .06) return null;
    const sideOffset=ankle.clone().sub(origin).dot(right);
    return {thigh,shin,foot,toe,length:upper+lower,sideOffset,restToe:toe.quaternion.clone(),
      thighInPlane:boneInPlane(thigh,knee,forward), shinInPlane:boneInPlane(shin,ankle,forward),
      ankleInShoe:inverseBasis.clone().multiply(foot.getWorldQuaternion(new T.Quaternion())),
      centre:heelOffset.clone().lerp(tipOffset, .5), shoeLength:heel.distanceTo(tip),
      heel:heelOffset,tip:tipOffset,ankleHeight:-Math.min(heelOffset.y,tipOffset.y),
      pin:new T.Vector3(),target:new T.Vector3(),rotation:new T.Quaternion(),
      lastSole:new T.Vector3(),settleOffset:new T.Vector3(),airOffset:new T.Vector3(),
      sample:new Float32Array(WALK_CYCLE.keys[0].length),
      fore:0,lift:0,pitch:0,presentedLift:0,presentedPitch:0,settleLift:0,settlePitch:0,planted:false};
  });
  if (legs.some(leg=>!leg)) return;
  const [cadence, stanceWidth, armMotion] = CHARACTER_GAIT[actor.options.role] || [1, 1, .85];
  const shoulders = SIDES.map(side => bone(side + 'Arm'));
  actor.partyGait={hips,spine,head,legs,shoulders,cadence,stanceWidth,armMotion,origin,forward,right,
    hipsInFacing:sourceFacing.clone().multiply(hips.getWorldQuaternion(new T.Quaternion())),
    spineInFacing:sourceFacing.clone().multiply(spine.getWorldQuaternion(new T.Quaternion())),
    hipsRestPosition:hips.position.clone(), hipsRestRotation:hips.quaternion.clone(),
    spineRestRotation:spine.quaternion.clone(),
    length:(legs[0].length+legs[1].length)*.5,
    priorOrigin:origin.clone(),centre:new T.Vector3(),sole:new T.Vector3(),heel:new T.Vector3(),tip:new T.Vector3(),
    pelvisLimits:new Float32Array(2),
    point:new T.Vector3(),start:new T.Vector3(),bend:new T.Vector3(),axis:new T.Vector3(),pole:new T.Vector3(),
    across:new T.Vector3(),boneUp:new T.Vector3(),boneFront:new T.Vector3(),basis:new T.Matrix4(),
    facing:new T.Quaternion(),alignment:new T.Quaternion(),adjustment:new T.Quaternion(),
    orientation:new T.Quaternion(),groundShoe:new T.Quaternion(),angles:new T.Euler(0,0,0,'YXZ'),
    previousMode:null, phase:0, speed:0, weight:0, runWeight:0};
}

function footPose(leg, index, rig, ground, step) {
  const {clip, walk, stride, snap, changed, release, yaw, phaseTravel} = step;
  const age = cycle(rig.phase - index * .5);
  sampleCycle(clip, age, leg.sample);
  const [forward, sideways, clearance, pitch, yawDelta] = leg.sample;
  const stance = walk && age < clip.support;
  const side = Math.sign(leg.sideOffset) || 1;
  const width = clamp(Math.abs(leg.sideOffset) * .53, leg.length * .052, leg.length * .108) * rig.stanceWidth;
  const open = lerp(.035, sideways * lerp(1, .45, rig.runWeight), rig.weight) * leg.length;
  const motionScale = leg.length * rig.weight * stride / clip.stride;
  leg.fore = forward * motionScale;
  leg.lift = stance ? 0 : Math.max(0, clearance) * leg.length * rig.weight;
  leg.pitch = pitch * rig.weight;
  const sole = rig.sole.copy(rig.origin).addScaledVector(rig.forward, leg.fore)
    .addScaledVector(rig.right, side * (width + open));
  const nominalYaw = yaw + side * (.058 + yawDelta * rig.weight);
  let shoeYaw = nominalYaw;
  if (stance) {
    if (!leg.planted || snap) {
      const progress = snap ? Math.min(age, phaseTravel) : age;
      leg.pin.copy(sole).addScaledVector(rig.forward, progress * clip.stride * motionScale * .7);
      leg.pinYaw = nominalYaw;
    }
    const drift = Math.hypot(sole.x - leg.pin.x, sole.z - leg.pin.z);
    const toeOff = smoothstep(age, clip.plantEnd - .08, clip.support);
    const turnRelease = 1 - smoothstep(Math.abs(turn(nominalYaw - leg.pinYaw)), .24, .72);
    const pinWeight = (1 - smoothstep(drift, .17, .53)) * lerp(.984, .86, toeOff) * turnRelease;
    sole.lerp(leg.pin, pinWeight);
    shoeYaw += clamp(turn(leg.pinYaw - nominalYaw), -.21, .21) * pinWeight;
  } else if (walk) {
    if (leg.planted && !snap && !changed) {
      leg.airOffset.copy(leg.lastSole).sub(sole);
      leg.airAt = rig.time - step.delta;
      leg.airLift = leg.presentedLift - leg.lift;
    }
    const airBlend = 1 - smoothstep(rig.time - leg.airAt, 0, .12);
    sole.addScaledVector(leg.airOffset, airBlend);
    leg.lift = Math.max(0, leg.lift + leg.airLift * airBlend);
  }
  leg.planted = stance;
  // Begin lowering the pelvis for the next step before the boot lands.
  const untilStrike = 1 - age;
  leg.supportWeight = walk
    ? Math.max(1 - smoothstep(untilStrike, phaseTravel * .55, Math.max(.13, phaseTravel * 2.5)),
        1 - smoothstep(age, clip.support + .028, clip.support + .145))
    : 1;
  if (changed) {
    leg.settleOffset.copy(leg.lastSole).sub(sole);
    leg.settleLift = leg.presentedLift - leg.lift;
    leg.settlePitch = leg.presentedPitch - leg.pitch;
    leg.airAt = -Infinity;
  }
  sole.addScaledVector(leg.settleOffset, release);
  leg.lastSole.copy(sole);
  leg.presentedLift = Math.max(0, leg.lift + leg.settleLift * release);
  leg.presentedPitch = leg.pitch + leg.settlePitch * release;

  const shoeLength = leg.shoeLength;
  const x = Math.sin(shoeYaw) * shoeLength * .5, z = Math.cos(shoeYaw) * shoeLength * .5;
  const slope = clamp(Math.atan2(ground(sole.x + x, sole.z + z) - ground(sole.x - x, sole.z - z), shoeLength), -.24, .24);
  rig.groundShoe.setFromEuler(rig.angles.set(-slope, shoeYaw, 0));
  leg.rotation.setFromEuler(rig.angles.set(-leg.presentedPitch - slope, shoeYaw, 0));
  const heel = rig.heel.copy(leg.heel).applyQuaternion(leg.rotation);
  const tip = rig.tip.copy(leg.tip).applyQuaternion(leg.rotation);
  // Hold the current contact point in world space as the foot rolls over it.
  const contact = .5 - .5 * clamp(leg.presentedPitch / .26, -1, 1);
  rig.point.copy(leg.heel).lerp(leg.tip, contact).sub(leg.centre).applyQuaternion(rig.groundShoe);
  leg.target.copy(sole).add(rig.point).addScaledVector(heel, contact - 1).addScaledVector(tip, -contact);
  const floor = Math.max(ground(leg.target.x + heel.x, leg.target.z + heel.z) - heel.y,
    ground(leg.target.x + tip.x, leg.target.z + tip.z) - tip.y);
  leg.target.y = floor + .018 + leg.presentedLift;
}

function setWorldRotation(rig, bone, rotation) {
  bone.parent.getWorldQuaternion(rig.alignment).invert();
  bone.quaternion.copy(rig.alignment.multiply(rotation)).normalize();
  bone.updateWorldMatrix(false, true);
}

function aimLegSegment(rig, bone, down, restFrame) {
  const up = rig.boneUp.copy(down).normalize().negate();
  rig.boneFront.crossVectors(rig.across, up);
  rig.basis.makeBasis(rig.across, up, rig.boneFront);
  setWorldRotation(rig, bone, rig.orientation.setFromRotationMatrix(rig.basis).multiply(restFrame));
}

function balanceUpperBody(rig, pitch, roll, swing) {
  const axis = rig.axis;
  rig.head.getWorldPosition(axis).sub(rig.hips.getWorldPosition(rig.point));
  const forwardAngle = Math.atan2(axis.dot(rig.forward), axis.y);
  const sideAngle = Math.atan2(axis.dot(rig.right), axis.y);
  const correction = rig.adjustment.setFromAxisAngle(rig.right, clamp(pitch - forwardAngle, -.28, .17));
  correction.multiply(rig.orientation.setFromAxisAngle(rig.forward, clamp(sideAngle - roll, -.14, .14)));
  rig.spine.getWorldQuaternion(rig.orientation).premultiply(correction);
  setWorldRotation(rig, rig.spine, rig.orientation);
  rig.shoulders.forEach((arm, index) => {
    if (!arm) return;
    arm.parent.getWorldQuaternion(rig.alignment).invert();
    axis.copy(rig.right).applyQuaternion(rig.alignment);
    arm.quaternion.premultiply(rig.adjustment.setFromAxisAngle(axis, swing * (index ? 1 : -1))).normalize();
  });
}

function solveLeg(rig, leg) {
  leg.thigh.getWorldPosition(rig.start);
  leg.shin.getWorldPosition(rig.bend);
  leg.foot.getWorldPosition(rig.point);
  const upper = rig.start.distanceTo(rig.bend), lower = rig.bend.distanceTo(rig.point);
  const axis = rig.axis.copy(leg.target).sub(rig.start);
  const distance = clamp(axis.length(), Math.abs(upper - lower) + .035, (upper + lower) * .995);
  axis.normalize();
  const pole = rig.pole.copy(rig.forward).addScaledVector(rig.right, Math.sign(leg.sideOffset) * .055);
  pole.addScaledVector(axis, -pole.dot(axis)).normalize();
  rig.across.crossVectors(pole, axis).normalize();
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  rig.bend.copy(rig.start).addScaledVector(axis, along)
    .addScaledVector(pole, Math.sqrt(Math.max(0, upper * upper - along * along)));
  aimLegSegment(rig, leg.thigh, rig.point.copy(rig.bend).sub(rig.start), leg.thighInPlane);
  leg.shin.getWorldPosition(rig.bend);
  rig.point.copy(rig.start).addScaledVector(axis, distance).sub(rig.bend);
  aimLegSegment(rig, leg.shin, rig.point, leg.shinInPlane);
  setWorldRotation(rig, leg.foot, rig.orientation.copy(leg.rotation).multiply(leg.ankleInShoe));
  leg.toe.quaternion.copy(leg.restToe);
}

function usesPartyGait(actor) {
  const mode = actor.current;
  return !!actor.partyGait && (mode === 'Walk' || mode === 'Run' ||
    mode === 'Idle' && actor.options.party && !actor.battleControlled);
}

// Clear edits to bones that a sparse action might leave unkeyed. The mixer
// evaluates the authored combat clip immediately after this handoff.
export function leavePartyGait(actor) {
  const rig = actor.partyGait;
  if (!rig || rig.previousMode === null || usesPartyGait(actor)) return;
  rig.hips.position.copy(rig.hipsRestPosition);
  rig.hips.quaternion.copy(rig.hipsRestRotation);
  rig.spine.quaternion.copy(rig.spineRestRotation);
  rig.previousMode = null;
}

export function applyPartyGait(actor, ground, yaw, time, snap) {
  const rig = actor.partyGait;
  if (!usesPartyGait(actor)) {
    if (rig) rig.previousMode = null;
    return false;
  }
  const mode = actor.current, walk = mode !== 'Idle';
  const length = rig.length;
  snap ||= rig.previousMode === null;
  const delta = clamp(time - (rig.time ?? time - 1 / 25), 1 / 240, .12);
  actor.wrapper.updateMatrixWorld(true);
  actor.wrapper.getWorldPosition(rig.origin);
  const travelled = snap ? 0 : Math.hypot(rig.origin.x - rig.priorOrigin.x, rig.origin.z - rig.priorOrigin.z);
  rig.priorOrigin.copy(rig.origin);
  const speed = Math.min(8, travelled / delta);
  rig.speed = snap ? (actor.motionSpeed || 0) : lerp(rig.speed, speed, 1 - Math.exp(-delta * 13));
  const wasJogging = rig.jog;
  rig.jog = walk && (rig.jog ? rig.speed > 3.3 : rig.speed > 3.8);
  const changed = !snap && (rig.jog !== wasJogging || walk !== (rig.previousMode !== 'Idle'));
  if (snap) {
    rig.transitionAt = null;
    for (const leg of rig.legs) {
      leg.planted = false;
      leg.airAt = -Infinity;
      leg.airLift = 0;
    }
  } else if (changed) {
    rig.transitionAt = time - delta;
  }
  const release = rig.transitionAt === null ? 0 : 1 - smoothstep(time - rig.transitionAt, 0, .19);
  rig.time = time;
  rig.previousMode = mode;
  const clip = rig.jog ? RUN_CYCLE : WALK_CYCLE;
  rig.weight = snap ? +walk : lerp(rig.weight, +walk, 1 - Math.exp(-delta * (walk ? 15 : 11)));
  rig.runWeight = snap ? +rig.jog : lerp(rig.runWeight, +rig.jog, 1 - Math.exp(-delta * 12));
  const period = lerp(1.12 - rig.speed * .047, .82 - rig.speed * .026, rig.runWeight) / rig.cadence;
  const stride = clamp(rig.speed * period, length * .48, length * lerp(1.92, 2.65, rig.runWeight));
  if (snap && walk) rig.phase = cycle(actor.actions[mode].time / actor.actions[mode].getClip().duration);
  const phaseTravel = Math.min(.17, travelled / stride);
  if (walk) rig.phase = cycle(rig.phase + phaseTravel);
  rig.right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  rig.forward.set(Math.sin(yaw), 0, Math.cos(yaw));
  rig.facing.setFromAxisAngle(UP, yaw);
  const step = {clip, walk, stride:stride / length, snap, changed, release, yaw, delta, phaseTravel};
  rig.legs.forEach((leg, index) => footPose(leg, index, rig, ground, step));

  const [, , , , , hipX, hipY, hipZ, hipRoll, hipYaw, chestRoll, chestYaw, chestPitch] = rig.legs[0].sample;
  const amount = rig.weight, pace = rig.runWeight;
  rig.adjustment.setFromEuler(rig.angles.set(.018 + (.032 + pace * .062) * amount, hipYaw * amount, -hipRoll * amount));
  setWorldRotation(rig, rig.hips, rig.orientation.copy(rig.facing).multiply(rig.adjustment).multiply(rig.hipsInFacing));
  const centre = rig.hips.getWorldPosition(rig.centre);
  const shiftX = hipX * length * amount, shiftZ = hipZ * length * amount;
  const shift = rig.axis.copy(rig.right).multiplyScalar(shiftX).addScaledVector(rig.forward, shiftZ);
  const floor = ground(rig.origin.x, rig.origin.z);
  const extension = lerp(.998, lerp(.987, .978, pace), amount) + hipY * amount;
  let neutralHeight = 0;
  for (const [index, leg] of rig.legs.entries()) {
    const thigh = leg.thigh.getWorldPosition(rig.point);
    const dx = leg.target.x - thigh.x - shift.x, dz = leg.target.z - thigh.z - shift.z;
    const jointOffset = centre.y - thigh.y;
    const reach = Math.sqrt(Math.max(0, (leg.length * lerp(1.014, .992, leg.supportWeight))**2 - dx * dx - dz * dz));
    neutralHeight += floor + leg.ankleHeight + jointOffset + leg.length * extension;
    rig.pelvisLimits[index] = leg.target.y + reach + jointOffset;
  }
  const preferredHeight = neutralHeight * .5;
  let height = preferredHeight, supportHeight = Infinity;
  for (const [index, leg] of rig.legs.entries()) {
    const limit = rig.pelvisLimits[index];
    height = Math.min(height, lerp(preferredHeight, Math.min(preferredHeight, limit), leg.supportWeight));
    if (leg.planted || !walk) supportHeight = Math.min(supportHeight, limit);
  }
  rig.height = snap ? height : lerp(rig.height, height, 1 - Math.exp(-delta * 23));
  rig.height = Math.min(rig.height, supportHeight);
  centre.add(shift).y = rig.height;
  rig.hips.position.copy(rig.hips.parent.worldToLocal(centre));
  rig.hips.updateWorldMatrix(false, true);
  const pitch = .024 + (.043 + .086 * pace + chestPitch) * amount;
  rig.adjustment.setFromEuler(rig.angles.set(pitch, chestYaw * amount, -chestRoll * amount));
  setWorldRotation(rig, rig.spine, rig.orientation.copy(rig.facing).multiply(rig.adjustment).multiply(rig.spineInFacing));
  const swing = Math.cos(rig.phase * Math.PI * 2) * amount * rig.armMotion * lerp(.105, .185, pace);
  balanceUpperBody(rig, pitch, chestRoll * amount, swing);
  for (const leg of rig.legs) solveLeg(rig, leg);
  return true;
}

export function resetPartyGait(actor) {
  if(actor.partyGait)actor.partyGait.previousMode=null;
}
