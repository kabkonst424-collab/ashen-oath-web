import { NEW_CHARACTERS } from './campaign-visuals.js?v=campaign-v1';

// Source mesh basis is independent of target/world heading (R07, R09).
const TURN = Math.PI * 2;
export const SOURCE_BASES = Object.freeze([
  'alar_nocape','iona_nocape','radan_nocape','leia_nocape','townsman','townswoman',
  'ash_husk','ember_acolyte','bellkeeper','root_keeper','wolf','rat','moth','bird',
  'forged_resin_lynx','forged_slag_golem','forged_fen_weaver','forged_mill_wisp','forged_rivet_guard',
  ...NEW_CHARACTERS,
]);
const BASES = new Set(SOURCE_BASES);
export const isSourceBase = base => typeof base === 'string' && BASES.has(base);

export function actorSourceBase(actor) {
  const visualBase = actor?.refreshVisual?.base;
  if (isSourceBase(visualBase)) return visualBase;
  const optionBase = actor?.options?.refreshVisual?.base;
  return isSourceBase(optionBase) ? optionBase : undefined;
}
// Fresh Blender 5.2.3 rest-mesh views, test/fixtures/facing-proof.json:
// glTF -Z contains ears/head, +Z contains the low tail. Bone names alone gave
// the opposite result. Apply this correction to these exact source bytes only.
export const VISUAL_FRONT_CALIBRATIONS = Object.freeze({
  wolf: Object.freeze({
    sha256: '7c6e8f935137a339040ce6fb56ae9486588826be361e5c921bd6f8136637a372',
    yaw: Math.PI,
    proof: 'test/fixtures/facing-proof.json',
  }),
});

export function calibratedSourceYaw(base, sourceHash) {
  const calibration = sourceValue(VISUAL_FRONT_CALIBRATIONS, base);
  return calibration && normalizeSourceHash(sourceHash) === calibration.sha256 ? calibration.yaw : undefined;
}

export const SOURCE_FRONT_YAW = Object.freeze(Object.fromEntries(SOURCE_BASES.map(base => [base, VISUAL_FRONT_CALIBRATIONS[base]?.yaw ?? 0])));

/** Verified visual evidence supersedes the older bone-derived base table. */
export function resolveBaseFrontYaw(base, sourceHash, manifestTable) {
  if (!isSourceBase(base)) return 0;
  return calibratedSourceYaw(base, sourceHash) ?? normalizeSourceYaw(sourceValue(manifestTable, base)) ?? 0;
}

/** An authored profile basis takes priority, including an explicit zero. */
export function resolveProfileFrontYaw(profile, baseYaw) {
  const explicit = profile && Object.hasOwn(profile, 'frontYaw') ? normalizeSourceYaw(profile.frontYaw) : undefined;
  return explicit ?? normalizeSourceYaw(baseYaw) ?? 0;
}

/** One bounded diagnostic value per actor; no history or additional actor copy. */
export function sourceFacingBasis(base, sourceHash, manifestTable, profile) {
  const visualYaw = calibratedSourceYaw(base, sourceHash);
  const manifestYaw = normalizeSourceYaw(sourceValue(manifestTable, base));
  const baseYaw = resolveBaseFrontYaw(base, sourceHash, manifestTable);
  const explicit = profile && profile.base === base && profile.frontYawExplicit !== false
    ? normalizeSourceYaw(profile.frontYaw) : undefined;
  return Object.freeze({
    base: isSourceBase(base) ? base : null,
    yaw: explicit ?? baseYaw,
    origin: explicit !== undefined ? 'profile' : visualYaw !== undefined ? 'visual-calibration' : manifestYaw !== undefined ? 'manifest' : 'source-default',
    sourceSHA256: normalizeSourceHash(sourceHash) ?? null,
    proof: visualYaw !== undefined ? sourceValue(VISUAL_FRONT_CALIBRATIONS, base).proof : null,
  });
}

/** A basis change is wrapperOld + frontOld - frontNew, not a new target. */
export function applySourceFacing(actor, basis) {
  const previous = normalizeSourceYaw(actor.sourceFrontYaw) ?? 0;
  const correction = previous - basis.yaw;
  if (correction !== 0 && actor.initialized) {
    if (Number.isFinite(actor.wrapper?.rotation?.y)) actor.wrapper.rotation.y = normalizeSourceYaw(actor.wrapper.rotation.y + correction);
    // The existing death lock stores wrapper yaw in the same source basis.
    if (Number.isFinite(actor.deathFacingYaw)) actor.deathFacingYaw = normalizeSourceYaw(actor.deathFacingYaw + correction);
  }
  actor.sourceFrontYaw = basis.yaw;
  actor.sourceFacing = basis;
}

/** Ignore prototype properties and model names outside the source library. */
export function sourceValue(table, base) {
  if (!isSourceBase(base) || !table || typeof table !== 'object' || Array.isArray(table)) return undefined;
  const prototype = Object.getPrototypeOf(table);
  if (prototype !== null && prototype !== Object.prototype) return undefined;
  // Manifest values are data. An accessor must not execute during startup/bind.
  return Object.getOwnPropertyDescriptor(table, base)?.value;
}

export function normalizeSourceHash(value) {
  if (typeof value !== 'string') return undefined;
  const hash = value.toLowerCase().replace(/^sha256:/, '');
  return /^[a-f0-9]{64}$/.test(hash) ? hash : undefined;
}

/** Finite radians in (-PI, PI]; undefined means the input supplied no basis. */
export function normalizeSourceYaw(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  let yaw = value % TURN;
  if (yaw > Math.PI) yaw -= TURN;
  if (yaw <= -Math.PI) yaw += TURN;
  return yaw === 0 ? 0 : yaw;
}
