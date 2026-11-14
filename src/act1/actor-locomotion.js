const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrapPhase = phase => (phase % 1 + 1) % 1;
const isGait = name => name === 'Walk' || name === 'Run';

export function gaitForSpeed(speed, lastGait) {
  if (speed < (lastGait === 'Idle' ? .19 : .11)) return 'Idle';
  return speed > (lastGait === 'Run' ? 2.85 : 3.25) ? 'Run' : 'Walk';
}

export function gaitRate(actor, name, duration, fallback) {
  const stride = actor.motionProfile?.locomotion?.[name];
  if (!stride?.cycleDistance || !isGait(name)) return fallback;
  const referenceHeight = stride.heightFit || actor.refreshHeight;
  const scale = stride.cycleDistanceUnits === 'actual game units' ? 1 : actor.refreshHeight / referenceHeight;
  const authoredSpeed = stride.cycleDistance * scale / duration;
  if (!(authoredSpeed > 0)) return fallback;
  return clamp(actor.motionSpeed / authoredSpeed, .18, 1.72);
}

export function gaitEntryPhase(actor, name, oldName, oldPhase, fallback) {
  const oldStride = actor.motionProfile?.locomotion?.[oldName];
  const newStride = actor.motionProfile?.locomotion?.[name];
  if (!isGait(name) || !newStride?.stopPhases?.length) return fallback;
  if (isGait(oldName) && Number.isFinite(oldPhase)) {
    return wrapPhase(oldPhase + newStride.stopPhases[0] - (oldStride?.stopPhases?.[0] || 0));
  }
  const foot = (actor.stepStarts || 0) % newStride.stopPhases.length;
  actor.stepStarts = (actor.stepStarts || 0) + 1;
  return newStride.stopPhases[foot] * .65;
}
