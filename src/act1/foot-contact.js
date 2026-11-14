import * as T from '../../assets/vendor/three.module.js';
import {limbSolver} from './limb-ik.js?v=motion-110';

const BIPED_FEET = ['Left', 'Right'];
const solesByGeometry = new WeakMap();
const LOCAL_UP = new T.Vector3(0, 1, 0);

function lowestSoleVertices(mesh, side) {
  const geometry = mesh.geometry;
  let bySide = solesByGeometry.get(geometry);
  if (!bySide) { bySide = {}; solesByGeometry.set(geometry, bySide); }
  if (bySide[side]) return bySide[side];
  const indices = geometry.getAttribute('skinIndex'), weights = geometry.getAttribute('skinWeight');
  if (!indices || !weights) return [];
  const foot = new Set(mesh.skeleton.bones.flatMap((bone, index) =>
    bone.name === side + 'Foot' || bone.name === side + 'ToeBase' ? [index] : []));
  const point = new T.Vector3(), candidates = [];
  for (let index = 0; index < indices.count; index++) {
    let influence = 0;
    for (let j = 0; j < 4; j++) if (foot.has(indices.getComponent(index, j))) influence += weights.getComponent(index, j);
    if (influence < .57) continue;
    mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld);
    candidates.push({ index, y: point.y });
  }
  candidates.sort((a, b) => a.y - b.y);
  const sampleCount = Math.min(8, candidates.length), window = Math.min(candidates.length, 32);
  const chosen = [];
  for (let n = 0; n < sampleCount; n++) chosen.push(candidates[Math.floor(n * window / sampleCount)].index);
  bySide[side] = chosen;
  return chosen;
}

function contactRig(actor) {
  if (actor.footContact !== undefined) return actor.footContact;
  if (Math.abs(actor.flightBaseline || 0) > .02) return actor.footContact = null;
  const legs = BIPED_FEET.map(side => ({
    thigh: actor.root.getObjectByName(side + 'UpLeg'),
    shin: actor.root.getObjectByName(side + 'Leg'),
    foot: actor.root.getObjectByName(side + 'Foot'),
    samples: [],
    pin: new T.Vector3(),
    anchored: false,
  }));
  if (legs.some(({thigh, shin, foot}) => !thigh?.isBone || shin?.parent !== thigh || foot?.parent !== shin)) {
    return actor.footContact = null;
  }
  actor.wrapper.updateWorldMatrix(true, true);
  actor.root.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    legs.forEach((leg, index) => {
      for (const vertex of lowestSoleVertices(mesh, BIPED_FEET[index])) leg.samples.push({ mesh, vertex });
    });
  });
  if (legs.some(leg => !leg.samples.length)) return actor.footContact = null;
  return actor.footContact = { legs, sole:new T.Vector3(), point:new T.Vector3(), target:new T.Vector3(), solve:limbSolver() };
}

function sampleSole(leg, result, point) {
  result.set(0, 0, 0);
  let y = Infinity;
  for (const {mesh, vertex} of leg.samples) {
    mesh.getVertexPosition(vertex, point).applyMatrix4(mesh.matrixWorld);
    result.add(point);
    y = Math.min(y, point.y);
  }
  result.multiplyScalar(1 / leg.samples.length).y = y;
}

export function resetFootContact(actor) {
  for (const leg of actor.footContact?.legs || []) {
    leg.anchored = false;
    leg.previousHeight = undefined;
  }
}

export function applyFootContact(actor, groundHeight, snap) {
  const name = actor.current, stride = actor.motionProfile?.locomotion?.[name];
  const walking = (name === 'Walk' || name === 'Run') && !!stride;
  if (!walking && name !== 'Idle') { resetFootContact(actor);return; }
  const rig = contactRig(actor);
  if (!rig) return;
  actor.wrapper.updateWorldMatrix(true, true);
  const {sole,point,target}=rig;
  const action = actor.actions[name], phase = action.time / action.getClip().duration % 1;
  for (const [index, leg] of rig.legs.entries()) {
    sampleSole(leg, sole, point);
    const ground = groundHeight(sole.x, sole.z);
    const depth = ground - sole.y;
    const near = depth >= (name === 'Run' ? -.13 : -.16);
    const rising = !snap && Number.isFinite(leg.previousHeight) && depth < leg.previousHeight - .045;
    leg.previousHeight = depth;
    const strike = (stride?.stopPhases?.[index] || index / 2) - .09;
    const age = ((phase - strike) % 1 + 1) % 1;
    const inSupport = walking && (age <= (stride.stanceDuty ?? .60) + .07 || age > .94);
    // Keep the plant target briefly, then release as the sole lifts or the
    // nominal pose falls too far behind. Step length correction stays bounded.
    if (snap || !near || rising || !inSupport) leg.anchored = false;
    if (inSupport && near && !rising && !leg.anchored) {
      leg.pin.set(sole.x, ground, sole.z);
      leg.anchored = true;
    }
    const dx = leg.anchored ? leg.pin.x - sole.x : 0;
    const dz = leg.anchored ? leg.pin.z - sole.z : 0;
    const drift = Math.hypot(dx, dz);
    const remaining = 1 - T.MathUtils.smoothstep(drift, .19, .46);
    if (drift > .46) leg.anchored = false;
    const sceneScale = T.MathUtils.clamp((actor.refreshHeight || 2.8) / 2.8, .6, 1.5);
    const pinWeight = (name === 'Run' ? .76 : .9) * remaining;
    const y = T.MathUtils.clamp(depth + .018, near && (inSupport || !walking) ? -.055 : 0, .26 * sceneScale);
    if (Number.isFinite(y) && (Math.abs(y) > .008 || drift * pinWeight > .008)) {
      leg.foot.getWorldPosition(target).addScaledVector(LOCAL_UP,y);
      target.x+=dx*pinWeight;target.z+=dz*pinWeight;
      rig.solve(leg.thigh,leg.shin,leg.foot,target);
    }
  }
}
