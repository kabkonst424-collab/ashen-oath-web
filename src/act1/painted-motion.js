import * as T from '../../assets/vendor/three.module.js';

export const PAINTED_POSE_RATE = 25;
export const PAINTED_POSE_STEP = 1 / PAINTED_POSE_RATE;
export const PAINTED_DIRECTION_COUNT = 8;
const SECTOR = 2 * Math.PI / PAINTED_DIRECTION_COUNT;
const HYSTERESIS = 4 * Math.PI / 180;
const EPSILON = 1e-9;
const clocks = new WeakMap();
const facings = new WeakMap();
const cameraVector = new T.Vector3();
const actorPosition = new T.Vector3();
const CONTINUOUS_TURN = 10.5;

const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Hold the evaluated skeleton for 40 ms of presentation time. */
export function advancePaintedPose(actor, delta, now) {
  let clock = clocks.get(actor);
  const elapsed = Number.isFinite(delta) && delta > 0 ? delta : 0;
  if (!clock) {
    clock = { remainder: 0, tick: 0, samples: 1, skipped: 0, sampleTime: now };
    clocks.set(actor, clock);
    actor.mixer.update(0);
    return now;
  }
  if (elapsed === 0) return null;

  const total = clock.remainder + elapsed;
  const ticks = Math.floor((total + EPSILON) / PAINTED_POSE_STEP);
  clock.remainder = Math.max(0, total - ticks * PAINTED_POSE_STEP);
  if (ticks === 0) return null;

  // A delayed paint evaluates the final elapsed pose once. Intermediate poses
  // would never reach the screen, so count them without asking the GPU to draw.
  clock.tick += ticks;
  clock.samples++;
  clock.skipped += ticks - 1;
  clock.sampleTime = now - clock.remainder;
  actor.mixer.update(ticks * PAINTED_POSE_STEP);
  return clock.sampleTime;
}

/** Use the authored contact or release pose on the first frame after its cue. */
export function paintedActionAge(sampleTime, actionAt, timing) {
  const age = sampleTime - actionAt;
  // Pick the first frame on or after the cue, so the pose never anticipates it.
  const impactLag = age - timing.impact, releaseLag = age - timing.release;
  if (impactLag >= -EPSILON && impactLag < PAINTED_POSE_STEP - EPSILON) return timing.impact;
  if (releaseLag >= -EPSILON && releaseLag < PAINTED_POSE_STEP - EPSILON) return timing.release;
  return age;
}

/** Sector zero faces the camera. Sectors increase around world +Y. */
export function selectPaintedDirection(heading, cameraYaw, previous) {
  const angle = wrap(heading - cameraYaw);
  if (previous !== undefined && Math.abs(wrap(angle - previous * SECTOR)) <= SECTOR / 2 + HYSTERESIS) return previous;
  return (Math.round(angle / SECTOR) + PAINTED_DIRECTION_COUNT) % PAINTED_DIRECTION_COUNT;
}

function rotateVisualRoot(pivot, scale, correction) {
  const cosine = Math.cos(correction), sine = Math.sin(correction);
  const aspect = scale.x > 0 && scale.z > 0 ? scale.x / scale.z : 1;
  // The wrapper owns placement and may have nonuniform scale. Conjugating
  // the pivot rotation by that scale keeps the original silhouette proportions.
  pivot.matrix.set(cosine, 0, sine / aspect, 0, 0, 1, 0, 0, -sine * aspect, 0, cosine, 0, 0, 0, 0, 1);
  pivot.matrixWorldNeedsUpdate = true;
}

export function orientPaintedActors(actors, camera, delta = 0) {
  if (camera.isOrthographicCamera) camera.getWorldDirection(cameraVector).negate();
  else camera.getWorldPosition(cameraVector);
  for (const actor of actors) {
    const { wrapper, root } = actor;
    if (!wrapper.visible) continue;
    let facing = facings.get(actor);
    if (!facing) {
      const pivot = new T.Group();
      pivot.name = 'PaintedFacing';
      pivot.matrixAutoUpdate = false;
      wrapper.add(pivot);
      pivot.add(root);
      facing = { pivot };
      facings.set(actor, facing);
    }

    const clock = clocks.get(actor);
    const heading = wrapper.rotation.y + (actor.sourceFrontYaw || 0);
    const cameraChanged = facing.camera !== camera;
    if (facing.yaw === undefined || (!actor.presentedDead && (facing.dead || cameraChanged || facing.tick !== clock?.tick))) {
      if (camera.isOrthographicCamera) actorPosition.copy(cameraVector);
      else wrapper.getWorldPosition(actorPosition).negate().add(cameraVector);
      const cameraYaw = Math.hypot(actorPosition.x, actorPosition.z) > EPSILON
        ? Math.atan2(actorPosition.x, actorPosition.z) : heading;
      facing.direction = selectPaintedDirection(heading, cameraYaw, cameraChanged || facing.dead ? undefined : facing.direction);
      // Keep sector metadata for eight-direction presentation while easing the
      // rendered 3D rig towards its anatomical heading, independent of the camera.
      const turn = wrap(heading - (facing.yaw ?? heading));
      const maximumTurn = CONTINUOUS_TURN * Math.max(delta, PAINTED_POSE_STEP);
      facing.yaw = facing.yaw === undefined || cameraChanged || facing.dead
        ? heading : wrap(facing.yaw + T.MathUtils.clamp(turn, -maximumTurn, maximumTurn));
    }
    facing.tick = clock?.tick;
    facing.dead = !!actor.presentedDead;
    facing.camera = camera;
    const correction = wrap(facing.yaw - heading);
    if (correction !== facing.correction || wrapper.scale.x !== facing.scaleX || wrapper.scale.z !== facing.scaleZ) {
      rotateVisualRoot(facing.pivot, wrapper.scale, correction);
      facing.correction = correction;
      facing.scaleX = wrapper.scale.x;
      facing.scaleZ = wrapper.scale.z;
    }
  }
}

export function resetPaintedPose(actor) {
  clocks.delete(actor);
  const facing = facings.get(actor);
  if (facing) {
    facing.yaw = undefined;
    facing.direction = undefined;
    facing.dead = false;
  }
}

export function paintedPoseStatus(actor) {
  const clock = clocks.get(actor), facing = facings.get(actor);
  return {
    tick: clock?.tick ?? 0,
    samples: clock?.samples ?? 0,
    skipped: clock?.skipped ?? 0,
    sampleTime: clock?.sampleTime ?? null,
    direction: facing?.direction ?? null,
    yaw: facing?.yaw ?? null,
  };
}
