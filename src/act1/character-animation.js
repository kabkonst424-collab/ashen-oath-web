import * as T from '../../assets/vendor/three.module.js';
import { PARTY } from './content.js?v=campaign-170';
import { fetchBytes } from './resource-loader.js?v=0.16.0-demo';
import { validateCastHands } from './cast-anchors.js?v=forged-019';
import { SOURCE_BASES, SOURCE_FRONT_YAW, resolveBaseFrontYaw, resolveProfileFrontYaw, actorSourceBase, isSourceBase, sourceValue, normalizeSourceHash, normalizeSourceYaw, sourceFacingBasis, applySourceFacing } from './source-facing.js?v=campaign-v1';

import { actorAnimationIdentity } from './graphics-refresh.js?v=campaign-140';
import { motionPatchDescriptor, applyMotionPatch } from './motion-clip-corrections.js?v=motion-110';
import { bowClip } from './bow-presentation.js?v=visual-180';
import { normalizeBattleEquipment, applyBattleEquipment } from './equipment-presentation.js?v=0.16.0-demo';

const ROOT = new URL('../../assets/act1/animation/', import.meta.url);
const RELEASE_INDEX_SHA256 = '938fe89ccf5995d7b3a1342ad0ab8484a9e414ff8bd61e9d42144418204e0055';
const LOOPS = new Set(['Idle', 'Walk', 'Run']);
const BASIC = ['Idle', 'Walk', 'Run', 'Attack', 'Death'];
const CLIP_NAME = /^(?:Idle|Walk|Run|Attack|Death|Hit|Block|Cast[A-Za-z0-9_]+)$/;

export { SOURCE_FRONT_YAW };

/** Shared immutable clips, separate mixer actions per cloned actor. */
export class CharacterAnimationLibrary {
  constructor(world, { requestOptions = {} } = {}) {
    this.world = world;
    this.profiles = new Map();
    this.profilesBySource = new Map();
    this.profilePromises = new Map();
    this.bound = new WeakMap();
    this.sourceActions = new WeakMap();
    this.issues = [];
    this.fallbacks = new Map();
    this.frontYawByBase = Object.fromEntries(SOURCE_BASES.map(base => [base, resolveBaseFrontYaw(base, world.loadedAssetHashes?.get(base))]));
    this.verifiedSourceHashes = new Map();
    this.controller = new AbortController();
    this.manifest = null;
    this.loaded = false;
    this.requestOptions = requestOptions;
    this.retryNotices = [];
  }

  assertActive() {
    if (this.disposed || this.controller.signal.aborted) throw this.controller.signal.reason || new DOMException('Animation load cancelled', 'AbortError');
  }

  async fetchResource(url, options, context, signal) {
    this.assertActive();
    return fetchBytes(url, {
      ...this.requestOptions, ...options,
      signal: signal ? AbortSignal.any([this.controller.signal, signal]) : this.controller.signal,
      onRetry: notice => {
        if (this.disposed) return;
        this.retryNotices.push({ ...notice, context });
        this.requestOptions.onRetry?.(notice);
      },
    });
  }

  async read(file, expectedHash = null, context = file, signal) {
    const resourceUrl = new URL(file, ROOT);
    resourceUrl.searchParams.set('v', file.startsWith('motion/') ? 'motion-110' : '0.16.0-demo');
    if (expectedHash) resourceUrl.searchParams.set('sha256', expectedHash);
    const bytes = await this.fetchResource(resourceUrl, { cache: expectedHash ? 'force-cache' : 'no-cache' }, context, signal);
    this.assertActive();
    if (expectedHash) {
      const expected = String(expectedHash).toLowerCase().replace(/^sha256:/, '');
      if (!/^[a-f0-9]{64}$/.test(expected) || !globalThis.crypto?.subtle) throw new Error('Profile SHA256 unavailable');
      const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      this.assertActive();
      const actual = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
      if (actual !== expected) throw new Error('Profile SHA256 mismatch');
    }
    this.assertActive();
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  async load() {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      const manifest = await this.read('animation-library.json', RELEASE_INDEX_SHA256);
      if (manifest.schema !== 1 || !manifest.profiles || !manifest.sourceHashes) throw Error('Unsupported character animation library');
      this.assertActive();
      this.manifest = manifest;
      this.loaded = true;
      return this;
    })();
    return this.loadPromise;
  }

  hasProfile(key) {
    const base = this.manifest?.profiles[key]?.base;
    return !!base && this.profilesBySource.has(base + '/' + key);
  }

  async prepareProfiles(keys, onDone, signal) {
    let cursor = 0, failure;
    await Promise.all(Array.from({length: Math.min(4, keys.length)}, async () => {
      while (!failure && !signal?.aborted && cursor < keys.length) {
        const key = keys[cursor++], descriptor = this.manifest.profiles[key];
        try {
          await this.preloadProfile(key, descriptor, signal);
          if (!signal?.aborted) onDone?.(key);
        } catch (error) { failure ||= error; }
      }
    }));
    if (signal?.aborted) throw signal.reason;
    if (failure) throw failure;
  }

  verifyBase(base, explicitHash) {
    const expected = normalizeSourceHash(explicitHash || sourceValue(this.manifest?.sourceHashes, base));
    if (!isSourceBase(base) || !expected) throw Error('Original model SHA256 unavailable');
    const loaded = this.world.loadedAssetHashes?.get(base);
    if (normalizeSourceHash(loaded) !== expected) throw Error('Loaded model SHA256 mismatch');
    this.verifiedSourceHashes.set(base, expected);
    this.frontYawByBase[base] = resolveBaseFrontYaw(base, expected, this.manifest.frontYawByBase);
  }

  preloadProfile(key, descriptor, signal) {
    if (!descriptor) return Promise.reject(Error('Unknown animation profile: ' + key));
    const sourceKey = descriptor.base + '/' + key;
    if (this.profilePromises.has(sourceKey)) return this.profilePromises.get(sourceKey);
    const promise = (async () => {
      this.assertActive();
      if (!/^(?:party|enemy|npc):[a-z0-9_]+$/i.test(key) || (!descriptor.data && !/^(?:profiles\/)?[a-z0-9_-]+\.json$/i.test(descriptor.file || ''))) throw new Error('Invalid profile path');
      this.verifyBase(descriptor.base, descriptor.sourceHash);
      const patch = motionPatchDescriptor(descriptor.base, key);
      const [data, correction] = await Promise.all([
        descriptor.data || this.read(descriptor.file, descriptor.sha256, key, signal),
        patch ? this.read(patch.file, patch.sha256, key, signal) : null,
      ]);
      this.assertActive();
      if (signal?.aborted) throw signal.reason;
      if (correction) applyMotionPatch(data, correction, descriptor.sha256);
      if (data.schema !== 1 || data.profile !== key || data.base !== descriptor.base || !Array.isArray(data.clips)) throw new Error('Profile identity mismatch');
      const clips = new Map();
      for (const json of data.clips) {
        if (!CLIP_NAME.test(json.name) || clips.has(json.name)) throw new Error('Invalid character clip name');
        // Three.parse overwrites its generated UUID with json.uuid, even when
        // absent. Mixer caches by UUID: undefined/duplicate IDs alias every
        // action to the first clip. Keep a fresh identity for each cached clip.
        const clip = T.AnimationClip.parse({ ...json, uuid: T.MathUtils.generateUUID() });
        if (!(clip.duration > 0) || !Number.isFinite(clip.duration) || !clip.tracks.length) throw new Error('Empty character clip');
        clips.set(clip.name, clip);
      }
      if (!BASIC.every(name => clips.has(name))) throw new Error('Profile is missing a base movement');
      if (key==='party:myrt') clips.set('ShootBow',bowClip(clips.get('Idle')));
      const skillClips = { ...(descriptor.skillClips || {}), ...(data.skillClips || {}) };
      for (const name of Object.values(skillClips)) if (!clips.has(name)) throw new Error('Skill references a missing clip');
      const castHands = Object.freeze({ ...validateCastHands(descriptor.castHands, clips), ...validateCastHands(data.castHands, clips) });
      const profile = { key, base: data.base, clips, castHands, skillClips: Object.freeze(skillClips), frontYaw: resolveProfileFrontYaw(data, this.frontYawByBase[data.base]), frontYawExplicit: Object.hasOwn(data, 'frontYaw') && normalizeSourceYaw(data.frontYaw) !== undefined };
      profile.battleEquipment = normalizeBattleEquipment(data.battleEquipment);
      profile.locomotion = data.locomotion || null;
      profile.releasePose = data.castReleaseNormalized;
      profile.contactPose = data.physicalImpactNormalized;
      // Shared profile identity/basis must stay paired after integrity checks.
      // Three's clips/actions remain mutable objects owned by their usual cache.
      Object.freeze(profile);
      this.profilesBySource.set(sourceKey, profile);
      this.profiles.set(key, profile);
      return profile;
    })().catch(error => {
      this.profilePromises.delete(sourceKey);
      throw error;
    });
    this.profilePromises.set(sourceKey, promise);
    return promise;
  }

  loadCampaignProfile(base, key, data, sha256, signal) {
    this.manifest.frontYawByBase[base] = data.frontYaw;
    return this.preloadProfile(key, { base, data, sha256, sourceHash: data.sourceHash }, signal);
  }

  releaseCampaignProfile(key, base) {
    const sourceKey = base + '/' + key;
    this.profilesBySource.delete(sourceKey);
    this.profilePromises.delete(sourceKey);
    if (this.profiles.get(key)?.base === base) this.profiles.delete(key);
    this.verifiedSourceHashes.delete(base);
  }

  releaseProfiles(keep) {
    for (const profile of this.profilesBySource.values()) {
      if (!keep.has(profile.key)) this.releaseCampaignProfile(profile.key, profile.base);
    }
    this.fallbacks.clear();
  }

  equipPresentation(actor) {
    return applyBattleEquipment(actor, actor.motionProfile?.battleEquipment);
  }

  identity(actor) {
    return actorAnimationIdentity(actor.id, actor.options);
  }

  frontYawForBase(base) {
    const hash = this.sourceHashForBase(base);
    return resolveBaseFrontYaw(base, hash, this.manifest?.frontYawByBase);
  }

  sourceHashForBase(base) {
    return this.world.loadedAssetHashes?.get(base) ?? this.verifiedSourceHashes.get(base);
  }

  bindFacing(actor, base, profile) {
    const hash = this.sourceHashForBase(base);
    const basis = sourceFacingBasis(base, hash, this.manifest?.frontYawByBase, profile);
    applySourceFacing(actor, basis);
  }

  restoreSourceActions(actor) {
    if (!actor.profileActions?.size) return;
    const old = actor.actions[actor.current], phase = old?.getClip ? old.time / old.getClip().duration : 0;
    const name = actor.current, paused = old?.paused;
    for (const key of actor.profileActions) { actor.actions[key]?.stop?.(); delete actor.actions[key]; }
    Object.assign(actor.actions, this.sourceActions.get(actor) || {});
    actor.profileActions.clear(); actor.skillClips = {}; actor.castHands = {}; actor.motionProfile = null;
    const source = actor.actions[name];
    if (source?.getClip) { source.reset().play(); source.time = Math.max(0, Math.min(1, phase)) * source.getClip().duration; source.paused = !!paused; }
    else actor.current = null;
  }

  bindActor(actor) {
    if (!actor) return actor;
    if (!this.sourceActions.has(actor)) this.sourceActions.set(actor, { ...actor.actions });
    const requested = this.identity(actor), base = actorSourceBase(actor);
    actor.animationProfile = requested;
    let profile = this.profilesBySource.get(base + '/' + requested);
    let reason = 'profile-unavailable';
    if (!profile && actor.options?.npc) {
      const hero = String(actor.options.role || '').split('_')[0];
      if (PARTY.some(member => member.id === hero)) {
        profile = this.profilesBySource.get(base + '/party:' + hero);
        reason = 'recruit-uses-party-profile';
      }
    }
    const basis = sourceFacingBasis(base, this.sourceHashForBase(base), this.manifest?.frontYawByBase, profile);
    const previous = this.bound.get(actor);
    if (previous?.requested === requested && previous.profile === profile && previous.base === base
      && previous.yaw === basis.yaw && previous.sourceSHA256 === basis.sourceSHA256 && previous.origin === basis.origin) return actor;
    this.bound.delete(actor);
    this.bindFacing(actor, base);
    if (!profile || profile.base !== base) {
      this.restoreSourceActions(actor);
      actor.animationProfile = requested;
      actor.animationFallback = { requested, resolved: `source:${base}`, reason: profile ? 'profile-base-mismatch' : reason };
      this.fallbacks.set(requested, actor.animationFallback);
      return actor;
    }
    // Validate bindings against the cloned original skeleton before replacing any
    // action. A partial bind would mix another profile's rest basis into the pose.
    for (const clip of profile.clips.values()) for (const track of clip.tracks) {
      const path = T.PropertyBinding.parseTrackName(track.name);
      const nodeName = path.objectName === 'bones' ? path.objectIndex : path.nodeName;
      if (nodeName && !actor.root.getObjectByName(nodeName) && nodeName !== actor.root.name) {
        this.restoreSourceActions(actor);
        actor.animationFallback = { requested, resolved: `source:${base}`, reason: `missing-node:${nodeName}` };
        this.fallbacks.set(requested, actor.animationFallback);
        return actor;
      }
    }
    const oldAction = actor.actions[actor.current];
    const playback = oldAction?.getClip && !LOOPS.has(actor.current) ? { name: actor.current, phase: oldAction.time / oldAction.getClip().duration, paused: oldAction.paused, weight: oldAction.getEffectiveWeight(), rate: oldAction.getEffectiveTimeScale() } : null;
    // A source-only actor may already be playing when its profile arrives.
    // Let the existing world.play path start the replacement action next tick.
    if (actor.current && actor.actions[actor.current]) {
      actor.actions[actor.current].stop?.();
      actor.current = null;
    }
    for (const name of actor.profileActions || []) actor.actions[name]?.stop?.();
    actor.profileActions = new Set();
    for (const [name, clip] of profile.clips) {
      const action = actor.mixer.clipAction(clip);
      action.setLoop(LOOPS.has(name) ? T.LoopRepeat : T.LoopOnce, LOOPS.has(name) ? Infinity : 1);
      action.clampWhenFinished = !LOOPS.has(name);
      actor.actions[name] = action;
      actor.profileActions.add(name);
    }
    if (playback && actor.actions[playback.name]) {
      const action = actor.actions[playback.name];
      action.reset().setEffectiveWeight(playback.weight).setEffectiveTimeScale(playback.rate).play();
      action.time = Math.max(0, Math.min(1, playback.phase)) * action.getClip().duration;
      action.paused = playback.paused; actor.current = playback.name;
      actor.mixer.update(0);
    }
    actor.animationProfile = profile.key;
    actor.motionProfile = profile;
    actor.skillClips = profile.skillClips;
    actor.castHands = profile.castHands;
    this.bindFacing(actor, base, profile);
    if (profile.key !== requested) {
      actor.animationFallback = { requested, resolved: profile.key, reason };
      this.fallbacks.set(requested, actor.animationFallback);
    } else {
      delete actor.animationFallback;
      this.fallbacks.delete(requested);
    }
    this.bound.set(actor, Object.freeze({ requested, profile, base, yaw: actor.sourceFrontYaw,
      sourceSHA256: actor.sourceFacing.sourceSHA256, origin: actor.sourceFacing.origin }));
    return actor;
  }

  dispose() {
    this.disposed = true;
    this.controller.abort();
    this.profiles.clear();
    this.profilePromises.clear();
    this.profilesBySource.clear();
    this.verifiedSourceHashes.clear();
    this.fallbacks.clear();
    this.bound = new WeakMap();
  }
}
