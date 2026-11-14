import * as T from '../../assets/vendor/three.module.js';
import { PARTY } from './content.js?v=rivers-0181';
import { fetchBytes } from './resource-loader.js?v=0.16.0-demo';
import { validateCastHands } from './cast-anchors.js?v=0.16.0-demo';
import { SOURCE_BASES, SOURCE_FRONT_YAW, resolveBaseFrontYaw, resolveProfileFrontYaw, actorSourceBase, isSourceBase, sourceValue, normalizeSourceHash, normalizeSourceYaw, sourceFacingBasis, applySourceFacing } from './source-facing.js?v=0.16.0-demo';

import { normalizeBattleEquipment, applyBattleEquipment } from './equipment-presentation.js?v=0.16.0-demo';

const ROOT = new URL('../../assets/act1/animation/', import.meta.url);
const RELEASE_INDEX_SHA256 = '9a9525aeb3c57ac386d403efa0ebbe91b98a9f5060d8014d6e8f44f8e39fb447';
const LOOPS = new Set(['Idle', 'Walk', 'Run']);
const BASIC = ['Idle', 'Walk', 'Run', 'Attack', 'Death'];
const CLIP_NAME = /^(?:Idle|Walk|Run|Attack|Death|Hit|Block|Cast[A-Za-z0-9_]+)$/;

export { SOURCE_FRONT_YAW };

/** Shared immutable clips, separate mixer actions per cloned actor. */
export class CharacterAnimationLibrary {
  constructor(world, { requestOptions = {} } = {}) {
    this.world = world;
    this.profiles = new Map();
    this.profilePromises = new Map();
    this.basePromises = new Map();
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
    this.progress = { completed: 0, total: 0, failed: 0 };
  }

  assertActive() {
    if (this.disposed || this.controller.signal.aborted) throw this.controller.signal.reason || new DOMException('Animation load cancelled', 'AbortError');
  }

  async fetchResource(url, options, context) {
    this.assertActive();
    return fetchBytes(url, {
      ...this.requestOptions, ...options, signal: this.controller.signal,
      onRetry: notice => {
        if (this.disposed) return;
        this.retryNotices.push({ ...notice, context });
        this.onProgress?.(`Повтор загрузки движения · ${context} · попытка ${notice.nextAttempt}`);
        this.requestOptions.onRetry?.(notice);
      },
    });
  }

  async read(file, expectedHash = null, context = file) {
    const resourceUrl = new URL(file, ROOT);
    resourceUrl.searchParams.set('v', '0.16.0-demo');
    if (expectedHash) resourceUrl.searchParams.set('sha256', expectedHash);
    const bytes = await this.fetchResource(resourceUrl, { cache: 'no-store' }, context);
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

  async load(onProgress) {
    if (this.loadPromise) return this.loadPromise;
    this.onProgress = onProgress;
    this.loadPromise = (async () => {
      try {
        const manifest = await this.read('animation-library.json', RELEASE_INDEX_SHA256);
        if (manifest.schema !== 1 || !manifest.profiles || !manifest.sourceHashes) throw new Error('Unsupported character animation library');
        if (this.disposed) return this;
        this.manifest = manifest;
        for (const base of SOURCE_BASES) this.frontYawByBase[base] = resolveBaseFrontYaw(base, this.world.loadedAssetHashes?.get(base), manifest.frontYawByBase);
        let completed = 0;
        const entries = Object.entries(manifest.profiles);
        this.progress.total = entries.length;
        // Load each authored profile once before actors are instantiated. No actor
        // creation, quality change or save reload can trigger another fetch/hash.
        let cursor = 0;
        await Promise.all(Array.from({ length: Math.min(6, entries.length) }, async () => {
          while (cursor < entries.length && !this.disposed) {
            const [key, descriptor] = entries[cursor++];
            let failed = false;
            try { await this.preloadProfile(key, descriptor); }
            catch (error) {
              if (this.disposed) return;
              failed = true;
              this.progress.failed++;
              this.issues.push(`${key} (${descriptor.file}): ${error.message}`);
            }
            if (this.disposed) return;
            this.progress.completed = ++completed;
            onProgress?.(`Движения персонажей · ${completed} / ${entries.length}${failed ? ` · резерв GLB: ${key}` : ''}`);
          }
        }));
      } catch (error) { if (!this.disposed) this.issues.push(`animation-library.json: ${error.message}`); }
      if (!this.disposed) this.loaded = true;
      return this;
    })();
    return this.loadPromise;
  }

  verifyBase(base) {
    if (this.basePromises.has(base)) return this.basePromises.get(base);
    const promise = (async () => {
      this.assertActive();
      const expected = normalizeSourceHash(sourceValue(this.manifest?.sourceHashes, base));
      if (!isSourceBase(base) || !expected) throw new Error('Original model SHA256 unavailable');
      const loaded = this.world.loadedAssetHashes?.get(base);
      if (loaded) {
        if (normalizeSourceHash(loaded) !== expected) throw new Error('Loaded model SHA256 mismatch');
        this.verifiedSourceHashes.set(base, expected);
        this.frontYawByBase[base] = resolveBaseFrontYaw(base, expected, this.manifest.frontYawByBase);
        return true;
      }
      if (!globalThis.crypto?.subtle) throw new Error('Original model SHA256 unavailable');
      const originalModelUrl = new URL(`../../assets/models/refresh/${base}.glb`, import.meta.url);
      if (this.manifest.sourceVariants?.[base]) originalModelUrl.searchParams.set('sha256', expected);
      const bytes = await this.fetchResource(originalModelUrl, { cache: 'force-cache' }, `source:${base}`);
      this.assertActive();
      const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      this.assertActive();
      const actual = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
      if (actual !== expected) throw new Error('Original model SHA256 mismatch');
      this.verifiedSourceHashes.set(base, actual);
      this.frontYawByBase[base] = resolveBaseFrontYaw(base, actual, this.manifest.frontYawByBase);
      return true;
    })();
    this.basePromises.set(base, promise);
    return promise;
  }

  preloadProfile(key, descriptor) {
    if (this.profilePromises.has(key)) return this.profilePromises.get(key);
    const promise = (async () => {
      this.assertActive();
      if (!/^(?:party|enemy|npc):[a-z0-9_]+$/i.test(key) || !/^(?:profiles\/)?[a-z0-9_-]+\.json$/i.test(descriptor.file || '')) throw new Error('Invalid profile path');
      await this.verifyBase(descriptor.base);
      const data = await this.read(descriptor.file, descriptor.sha256, `${key} (${descriptor.file})`);
      this.assertActive();
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
      const skillClips = { ...(descriptor.skillClips || {}), ...(data.skillClips || {}) };
      for (const name of Object.values(skillClips)) if (!clips.has(name)) throw new Error('Skill references a missing clip');
      const castHands = Object.freeze({ ...validateCastHands(descriptor.castHands, clips), ...validateCastHands(data.castHands, clips) });
      const profile = { key, base: data.base, clips, castHands, skillClips: Object.freeze(skillClips), frontYaw: resolveProfileFrontYaw(data, this.frontYawByBase[data.base]), frontYawExplicit: Object.hasOwn(data, 'frontYaw') && normalizeSourceYaw(data.frontYaw) !== undefined };
      profile.battleEquipment = normalizeBattleEquipment(data.battleEquipment);
      // Shared profile identity/basis must stay paired after integrity checks.
      // Three's clips/actions remain mutable objects owned by their usual cache.
      Object.freeze(profile);
      if (!this.disposed) this.profiles.set(key, profile);
      return profile;
    })();
    this.profilePromises.set(key, promise);
    return promise;
  }

  equipPresentation(actor) {
    return applyBattleEquipment(actor, this.profiles.get(actor.animationProfile)?.battleEquipment);
  }

  identity(actor) {
    if (actor.options?.party) return `party:${String(actor.options.role || actor.id.split(':')[1]).split('_')[0]}`;
    if (actor.options?.hostile && actor.options.enemyId) return `enemy:${actor.options.animationSource || actor.options.enemyId}`;
    if (actor.options?.npc) return `npc:${actor.options.animationSource || (actor.id.startsWith('npc:') ? actor.id.slice(4) : actor.options.role)}`;
    return String(actor.options?.animationProfile || actor.id);
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
    actor.profileActions.clear(); actor.skillClips = {}; actor.castHands = {};
    const source = actor.actions[name];
    if (source?.getClip) { source.reset().play(); source.time = Math.max(0, Math.min(1, phase)) * source.getClip().duration; source.paused = !!paused; }
    else actor.current = null;
  }

  bindActor(actor) {
    if (!actor) return actor;
    if (!this.sourceActions.has(actor)) this.sourceActions.set(actor, { ...actor.actions });
    const requested = this.identity(actor), base = actorSourceBase(actor);
    actor.animationProfile = requested;
    let profile = this.profiles.get(requested);
    let reason = 'profile-unavailable';
    if (!profile && actor.options?.npc) {
      const hero = String(actor.options.role || '').split('_')[0];
      if (PARTY.some(member => member.id === hero)) {
        profile = this.profiles.get(`party:${hero}`);
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
    this.onProgress = null;
    this.controller.abort();
    this.profiles.clear();
    this.profilePromises.clear();
    this.basePromises.clear();
    this.verifiedSourceHashes.clear();
    this.fallbacks.clear();
    this.bound = new WeakMap();
  }
}
