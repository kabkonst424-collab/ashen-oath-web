import * as T from '../../assets/vendor/three.module.js';
import { STATUS_KINDS, statusRows, statusParts } from './presentation-status.js?v=0.16.0-demo';
import { reducedFlash } from './presentation-visibility.js?v=0.16.0-demo';
import { arcPoint } from './presentation-paths.js?v=0.16.0-demo';
import { actionTimeline } from './presentation-timing.js?v=campaign-170';
import { COMBAT_MOTION } from './party-motion.js?v=motion-110';
import { magicProfile } from './data/magic-profiles.js?v=campaign-170';
import { bowNock } from './bow-presentation.js?v=motion-110';
import { fetchBytes } from './resource-loader.js?v=0.16.0-demo';
import { resolveCastAnchor } from './cast-anchors.js?v=forged-019';
import { heavyAnimation } from './combat200-animation-policy.js?v=0.16.0-demo';
import { ensureCombat200Assets, combat200Material, combat200Windup, combat200Launch, combat200Impact } from './combat200-vfx.js?v=0.16.0-demo';

const TAU = Math.PI * 2;
const UP = new T.Vector3(0, 1, 0);
const ASSET_ROOT = new URL('../../assets/act1/magic/', import.meta.url);
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const ease = t => t * t * (3 - 2 * t);
const hash = text => [...String(text)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
function random(seed) {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ s >>> 15, 1 | s); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const origin = object => { object.userData.modelOrigin = { kind: 'vfx', source: 'act1-magic' }; return object; };
const palette = p => ({ color: p.color, core: p.core, scale: p.scale || 1 });

/** Read-only combat presentation. No references to model RNG or HP/MP setters. */
export class MagicVfx {
  constructor(world, { requestOptions = {}, textureLoaderFactory = () => new T.TextureLoader(), createObjectURL = blob => URL.createObjectURL(blob), revokeObjectURL = url => URL.revokeObjectURL(url) } = {}) {
    this.world = world;
    this.controller = new AbortController();
    this.requestOptions = requestOptions;
    this.textureLoaderFactory = textureLoaderFactory;
    this.createObjectURL = createObjectURL;
    this.revokeObjectURL = revokeObjectURL;
    this.group = origin(new T.Group());
    this.group.name = 'AuthoredMagicVfx';
    world.fxGroup.add(this.group);
    this.effects = [];
    this.statusMarkers = new Map();
    this.sequences = [];
    this.pools = new Map();
    this.poolCount = 0;
    this.serial = 0;
    this.textures = {};
    this.atlasMeta = { columns: 5, rows: 5, frames: 25 };
    this.modelClips = new Map();
    this.boundActors = new WeakSet();
    this.retiredActors = new WeakSet();
    this.loadIssues = [];
    this.sourceHashIssues = [];
    this.geometries = {
      ring: new T.RingGeometry(.86, 1, 48),
      beam: new T.CylinderGeometry(1, 1, 1, 6, 1, true),
      shard: new T.OctahedronGeometry(1, 0),
      shield: new T.IcosahedronGeometry(1, 1),
      'c200-orb': new T.IcosahedronGeometry(1, 2),
      'c200-taper': new T.CylinderGeometry(1, .62, 1, 8, 1, true),
      'c200-plane': new T.PlaneGeometry(1, 1),
    };
    this.scratch = { a: new T.Vector3(), b: new T.Vector3(), delta: new T.Vector3(), mid: new T.Vector3(), hand: new T.Vector3(), target: new T.Vector3() };
    this.softTexture = this.makeSoftTexture();
  }

  makeSoftTexture() {
    // Deterministic analytic fallback for bloom/sparks; no browser canvas or render.
    const side = 32, bytes = new Uint8Array(side * side * 4);
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const radius = Math.hypot((x + .5) / side * 2 - 1, (y + .5) / side * 2 - 1);
      const offset = (y * side + x) * 4;
      bytes[offset] = bytes[offset + 1] = bytes[offset + 2] = 255;
      bytes[offset + 3] = Math.round(Math.pow(clamp(1 - radius), 2.25) * 255);
    }
    const texture = new T.DataTexture(bytes, side, side);
    texture.needsUpdate = true;
    texture.magFilter = texture.minFilter = T.LinearFilter;
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
  }

  // The network is already bounded by fetchBytes. Bound image decoding too,
  // release its Blob URL on every exit, and discard a texture arriving late.
  loadAtlasTexture(bytes, file) {
    if (this.disposed) return Promise.reject(this.controller.signal.reason);
    const url = this.createObjectURL(new Blob([bytes], { type: file.endsWith('.webp') ? 'image/webp' : 'image/png' }));
    const signal = this.controller.signal;
    return new Promise((resolve, reject) => {
      let settled = false, timer;
      const cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        this.revokeObjectURL(url);
      };
      const fail = error => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      const onAbort = () => fail(signal.reason || new DOMException('Magic loading cancelled', 'AbortError'));
      signal.addEventListener('abort', onAbort, { once: true });
      timer = setTimeout(() => fail(new DOMException(`${file}: image decode timeout`, 'TimeoutError')), this.requestOptions.timeoutMs ?? 30000);
      if (signal.aborted) { onAbort(); return; }
      Promise.resolve().then(() => this.textureLoaderFactory().loadAsync(url)).then(texture => {
        if (settled || this.disposed) { texture.dispose(); return; }
        settled = true;
        cleanup();
        resolve(texture);
      }, fail);
    });
  }

  load() {
    if (this.loadPromise) return this.loadPromise;
    if (this.disposed || this.loaded) return Promise.resolve(this);
    this.loadPromise = this.loadResources();
    return this.loadPromise;
  }

  async loadResources() {
    const read = async name => {
      const bytes = await fetchBytes(new URL(name, ASSET_ROOT), { ...this.requestOptions, signal: this.controller.signal });
      return JSON.parse(new TextDecoder().decode(bytes));
    };
    await Promise.all([
      (async () => {
        try {
          const meta = await read('effects-atlas.json');
          if (this.disposed) return;
          if (meta.schema !== 1 || meta.columns !== 5 || meta.rows !== 5 || meta.frames !== 25) throw new Error('Unsupported effects atlas schema');
          this.atlasMeta = meta;
          await Promise.all(['flame', 'explosion', 'smoke'].map(async key => {
            try {
              const file = key === 'flame' ? 'flame.webp' : meta.files?.[key];
              if (!file || !/^[a-z0-9-]+\.(?:png|webp)$/i.test(file)) throw new Error(`Invalid ${key} atlas path`);
              const atlasRoot = key === 'flame' ? new URL('../painted/', ASSET_ROOT) : ASSET_ROOT;
              const bytes = await fetchBytes(new URL(key === 'flame' ? file + '?v=painted-20261114-r2' : file, atlasRoot), { ...this.requestOptions, signal: this.controller.signal });
              if (this.disposed) return;
              const texture = await this.loadAtlasTexture(bytes, file);
              texture.colorSpace = T.SRGBColorSpace;
              texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping;
              texture.magFilter = T.LinearFilter;
              texture.minFilter = T.LinearMipmapLinearFilter;
              // A half texel inset below prevents neighbouring cells bleeding.
              if (this.disposed) texture.dispose(); else this.textures[key] = texture;
            } catch (error) { if (!this.disposed) this.loadIssues.push(`${key}: ${error.message}`); }
          }));
        } catch (error) { if (!this.disposed) this.loadIssues.push(String(error.message)); }
      })(),
      (async () => {
        // The character library owns profile-specific casts and verifies each
        // original base once. Do not refetch/hash the legacy 0.7 overlay here.
        if (this.world.characterAnimations?.loaded) return;
        try {
          const data = await read('cast-motions.json');
          if (this.disposed) return;
          if (data.schema !== 1) throw new Error('Unsupported cast motion schema');
          await Promise.all(Object.entries(data.modelClips || {}).map(async ([base, clips]) => {
            try {
              if (!/^[a-z0-9_]+$/i.test(base)) throw new Error('Invalid model name');
              const expected = String(data.sourceHashes?.[base] || '').toLowerCase().replace(/^sha256:/, '');
              if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error('Source SHA256 unavailable');
              let actual = this.world.loadedAssetHashes?.get(base);
              if (!actual) {
                if (!globalThis.crypto?.subtle) throw new Error('Source SHA256 unavailable');
                const bytes = await fetchBytes(new URL(`../../assets/models/refresh/${base}.glb`, import.meta.url), { ...this.requestOptions, cache: 'force-cache', signal: this.controller.signal });
                const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
                actual = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, '0')).join('');
              }
              actual = String(actual).toLowerCase().replace(/^sha256:/, '');
              if (expected !== actual) throw new Error('Source model SHA256 mismatch');
              const parsed = clips.map(json => {
                // AnimationClip.parse preserves a missing/duplicate JSON UUID;
                // Mixer.clipAction uses that UUID as its cache key. Generate
                // one per cached clip so legacy cast actions cannot alias.
                const clip = T.AnimationClip.parse({ ...json, uuid: T.MathUtils.generateUUID() });
                if (!/^Cast(Fire|Frost|Runes|Nova|Lightning|Mend|Revive|Ward)$/.test(clip.name) || !(clip.duration > 0)) throw new Error('Invalid cast clip');
                const rate = COMBAT_MOTION.duration / clip.duration;
                for (const track of clip.tracks) {
                  // Motion overlays must never displace the root or equipment grips.
                  if (!track.name.endsWith('.quaternion') || /(?:hips|root|hand|finger|leg|foot|toe)/i.test(T.PropertyBinding.parseTrackName(track.name).nodeName)) throw new Error('Unsafe overlay channel');
                  for (let i = 0; i < track.times.length; i++) track.times[i] *= rate;
                }
                clip.duration = COMBAT_MOTION.duration;
                return clip;
              });
              if (!this.disposed) this.modelClips.set(base, parsed);
            } catch (error) { if (!this.disposed) this.sourceHashIssues.push(`${base}: ${error.message}`); }
          }));
        } catch (error) { if (!this.disposed) this.loadIssues.push(String(error.message)); }
      })(),
    ]);
    if (!this.disposed) this.loaded = true;
    return this;
  }

  bindActor(actor) {
    if (!actor || !this.loaded || this.boundActors.has(actor)) return;
    this.boundActors.add(actor);
    if (actor.profileActions?.size) return;
    const base = actor.refreshVisual?.base || actor.options?.refreshVisual?.base;
    for (const clip of this.modelClips.get(base) || []) {
      // Refuse a clip against a different skeleton even if a future caller reuses a base ID.
      if (!clip.tracks.every(track => actor.root.getObjectByName(T.PropertyBinding.parseTrackName(track.name).nodeName))) continue;
      const action = actor.mixer.clipAction(clip);
      action.setLoop(T.LoopOnce, 1);
      action.clampWhenFinished = true;
      actor.actions[clip.name] = action;
    }
  }

  animationFor(actor, event = {}) {
    this.bindActor(actor);
    const heavy = heavyAnimation(actor, event);
    if (heavy) return heavy;
    const p = magicProfile(event, actor);
    if (p.style==='arrow'&&actor?.actions?.ShootBow) return 'ShootBow';
    const authored = actor?.skillClips?.[event.skillId];
    if (authored && actor.actions[authored]) return authored;
    // Creatures retain their authored attack; a weapon hit is never a cast gesture.
    const preferred = p.family === 'physical' ? 'Attack' : p.animation;
    return actor?.actions?.[preferred] ? preferred : p.family === 'nova' && actor?.actions?.CastRunes ? 'CastRunes' : actor?.actions?.[p.fallback] ? p.fallback : actor?.actions?.Cast ? 'Cast' : actor?.actions?.Attack ? 'Attack' : 'Idle';
  }

  /** Cue targets are the real hit/heal/revive actors, not a guessed opposing row. */
  process({ at = this.world.time, event = {}, source, targets = [], timing = actionTimeline(event, source) } = {}) {
    if (!source || this.disposed || this.retiredActors.has(source)) return null;
    ensureCombat200Assets(this);
    const p = magicProfile(event, source), animation = this.animationFor(source, event);
    const unique = [...new Set(targets.map(target => target?.actor || target).filter(actor => actor?.wrapper && !this.retiredActors.has(actor)))].slice(0, 8);
    if (!unique.length && event.targetId) {
      const target = this.world.eventActor?.(event.targetId);
      if (target) unique.push(target);
    }
    if (!unique.length && ['ward', 'heal', 'revive'].includes(p.family)) unique.push(source);
    // Bounded action records also survive a delayed frame without replaying impact.
    if (this.sequences.length >= 12) this.sequences.shift();
    const seed = hash(`${this.world.runId || ''}:${event.actorId || source.id}:${event.skillId || event.kind}:${at}:${this.serial++}`);
    const sequence = { at, timing, event, source, animation, targets: unique, profile: p, random: random(seed), launched: false, impacted: false, windup: false };
    this.sequences.push(sequence);
    this.advanceSequence(sequence);
    return animation;
  }

  get budget() { return this.world.qualityLevel === 'low' ? 100 : this.world.qualityLevel === 'medium' ? 170 : 250; }
  get detail() { return (this.world.qualityLevel === 'low' ? .5 : this.world.qualityLevel === 'medium' ? .75 : 1)*(this.world.reducedMotion?.35:1); }

  acquire(kind, color, additive = true, essential = false) {
    // Pool allocations are strictly bounded even after changing quality settings.
    let pool = this.pools.get(kind);
    if (!pool) this.pools.set(kind, pool = []);
    let item = pool.find(entry => !entry.active);
    if (this.activeCount >= this.budget) {
      if (!essential) return null;
      // A quality change may leave more than one excess item before update.
      // Required feedback may reclaim optional effects, never other hit cores
      // or persistent status items, and must fit before allocating its slot.
      this.trimActiveEffects(this.budget - 1);
      if (this.activeCount >= this.budget) return null;
      item=pool.find(entry=>!entry.active);
    }
    if (!item) {
      if (this.poolCount >= 300) {
        // Different encounters may need different primitive families. Reclaim one
        // idle slot rather than permanently exhausting the budget on old types.
        for (const otherPool of this.pools.values()) {
          const index = otherPool.findIndex(entry => !entry.active);
          if (index < 0) continue;
          const reclaimed = otherPool.splice(index, 1)[0];
          reclaimed.material.dispose(); reclaimed.map?.dispose();
          reclaimed.object.removeFromParent();
          this.poolCount--;
          break;
        }
        if (this.poolCount >= 300) return null;
      }
      const authored = combat200Material(this, kind);
      const atlas = authored?.atlas || (['flame', 'explosion', 'smoke'].includes(kind) ? this.textures[kind] : null);
      const sprite = authored ? authored.sprite : kind === 'glow' || ['flame', 'explosion', 'smoke'].includes(kind);
      const map = atlas ? atlas.clone() : authored?.alphaMap ? null : sprite || authored?.fallback ? this.softTexture : null;
      if (atlas) { map.generateMipmaps=false;map.minFilter=T.LinearFilter;map.magFilter=T.LinearFilter;map.needsUpdate=true; }
      const options = { color, transparent: true, opacity: 0, depthWrite: false, depthTest: true, toneMapped: false,
        blending: additive ? T.AdditiveBlending : T.NormalBlending };
      const material = sprite ? new T.SpriteMaterial({ ...options, map, alphaMap: authored?.alphaMap || null }) : new T.MeshBasicMaterial({ ...options, map, alphaMap: authored?.alphaMap || null, side: T.DoubleSide, wireframe: kind === 'shield' });
      const object = origin(sprite ? new T.Sprite(material) : new T.Mesh(this.geometries[authored?.geometry || kind], material));
      object.castShadow = object.receiveShadow = false;
      object.renderOrder = additive ? 8 : 7;
      item = { object, material, map: atlas ? map : null, atlasMeta: authored?.atlasMeta, kind, active: false };
      pool.push(item); this.poolCount++;
    }
    // A cast may begin while optional textures decode. Promote an idle analytic
    // fallback when the real mask/atlas arrives; retain shared texture ownership.
    const authored = combat200Material(this, kind);
    if (authored?.alphaMap && item.material.alphaMap !== authored.alphaMap) {
      item.material.map = null; item.material.alphaMap = authored.alphaMap; item.material.needsUpdate = true;
    } else if (authored?.atlas && !item.map) {
      item.map = authored.atlas.clone(); item.map.generateMipmaps = false;
      item.map.minFilter = item.map.magFilter = T.LinearFilter; item.map.needsUpdate = true;
      item.material.map = item.map; item.material.needsUpdate = true; item.atlasMeta = authored.atlasMeta;
    }
    item.active = true;
    item.material.color.setHex(color);
    item.material.opacity = 0;
    item.material.blending = additive ? T.AdditiveBlending : T.NormalBlending;
    item.object.renderOrder = additive ? 8 : 7;
    item.object.visible = true;
    item.object.position.set(0, 0, 0);
    item.object.rotation.set(0, 0, 0);
    item.object.scale.set(1, 1, 1);
    if (item.object.isSprite) item.material.rotation = 0;
    this.group.add(item.object);
    return item;
  }

  get activeCount() { return this.effects.length + [...this.statusMarkers.values()].reduce((n, marker) => n + marker.items.length, 0); }

  effect(kind, color, start, life, update, additive = true, essential = false) {
    if (life <= 0 || start + life <= this.world.time) return null;
    if (!essential && this.decorQuota != null && this.decorQuota <= 0) return null;
    const item = this.acquire(kind, color, additive, essential);
    if (!item) return null;
    if (!essential && this.decorQuota != null) this.decorQuota--;
    const present = (item, t) => {
      update(item, t);
      const reduced = !!this.world.reducedMotion;
      item.material.blending = reduced || !additive ? T.NormalBlending : T.AdditiveBlending;
      item.object.renderOrder = reduced || !additive ? 7 : 8;
      if (reduced) { const flash = reducedFlash(t, kind); item.material.opacity = Math.min(flash.cap, Math.max(0, item.material.opacity)) * flash.envelope; }
    };
    const effect = { item, start, life, update: present, essential, target: this.effectTarget || null, ...this.effectOwner };
    this.effects.push(effect);
    return effect;
  }

  point(actor, target = this.scratch.target, fraction = .5) {
    actor.wrapper.updateWorldMatrix(true, false);
    actor.wrapper.getWorldPosition(target);
    target.y += (actor.presentationHeight || actor.refreshHeight || 2.8) * fraction;
    return target;
  }

  hand(actor, target = this.scratch.hand, animation = actor.current) {
    actor.root.updateWorldMatrix(true, true);
    const anchor = animation==='ShootBow'&&bowNock(actor) || resolveCastAnchor(actor, animation);
    anchor.getWorldPosition(target);
    if (anchor === actor.root) this.point(actor, target, .65);
    return target;
  }

  frame(item, t) {
    if (!item.map) return;
    const { columns, rows, frames } = item.atlasMeta || this.atlasMeta;
    const index = Math.min(frames - 1, Math.floor(clamp(t) * frames));
    const width = item.map.image?.width || columns * 128, height = item.map.image?.height || rows * 128;
    const insetX = .5 / width, insetY = .5 / height;
    item.map.repeat.set(1 / columns - insetX * 2, 1 / rows - insetY * 2);
    item.map.offset.set(index % columns / columns + insetX, 1 - (Math.floor(index / columns) + 1) / rows + insetY);
  }

  beam(item, a, b, width) {
    const { delta, mid } = this.scratch;
    delta.subVectors(b, a);
    const length = delta.length();
    item.object.position.copy(mid.copy(a).add(b).multiplyScalar(.5));
    item.object.quaternion.setFromUnitVectors(UP, delta.multiplyScalar(1 / Math.max(.0001, length)));
    item.object.scale.set(width, Math.max(.0001, length), width);
  }

  glow(position, p, start, life, size = 1, follow = null, animation = undefined, essential = false) {
    const base = position.clone();
    this.effect('glow', p.color, start, life, (item, t) => {
      item.object.position.copy(follow ? this.hand(follow, this.scratch.hand, animation) : base);
      const scale = size * p.scale * (this.world.reducedMotion?.85:.62 + Math.sin(Math.PI * t) * .6);
      item.object.scale.set(scale, scale, 1);
      item.material.opacity = Math.sin(Math.PI * t) * .9;
    });
    const core = this.effect('glow', p.core, start, life, (item, t) => {
      item.object.position.copy(follow ? this.hand(follow, this.scratch.hand, animation) : base);
      const scale = size * p.scale * (this.world.reducedMotion?.32:.2 + Math.sin(Math.PI * t) * .25);
      item.object.scale.set(scale, scale, 1);
      item.material.opacity = Math.sin(Math.PI * t);
    }, true, essential);
    return core;
  }

  ring(position, p, start, life, radius = 1, delay = 0, vertical = false) {
    const base = position.clone();
    this.effect('ring', p.color, start + delay, life, (item, t) => {
      item.object.position.copy(base);
      item.object.rotation.x = vertical ? 0 : -Math.PI / 2;
      item.object.rotation.z = this.world.reducedMotion?0:t * .9;
      item.object.scale.setScalar(p.scale * radius * (.4 + ease(t) * .9));
      item.material.opacity = Math.sin(Math.PI * Math.min(1, t * 1.5)) * (1 - t) * .8;
    });
  }

  sparks(position, p, start, life, rng, count = 10, kind = 'glow', rise = false) {
    const base = position.clone(), total = Math.ceil(count * this.detail);
    for (let i = 0; i < total; i++) {
      const angle = rng() * TAU, speed = (.5 + rng() * 1.8) * p.scale;
      const velocity = new T.Vector3(Math.cos(angle) * speed, rise ? .7 + rng() * 2 : (rng() - .25) * 2, Math.sin(angle) * speed);
      const size = (.08 + rng() * .12) * p.scale, rotation = rng() * TAU;
      this.effect(kind, i % 3 ? p.color : p.core, start + rng() * .05, life * (.65 + rng() * .35), (item, t) => {
        const travel = this.world.reducedMotion ? .18 : 1;
        item.object.position.copy(base).addScaledVector(velocity, t * life * travel);
        if (!rise) item.object.position.y -= t * t * .8 * travel;
        item.object.scale.set(size * (1 - t * .7), size * (kind === 'shard' ? 2.8 : 1) * (1 - t * .5), size);
        const spin = this.world.reducedMotion ? 0 : t;
        item.object.rotation.set(rotation + spin * 3, rotation + spin * 2, rotation);
        item.material.opacity = Math.sin(Math.PI * Math.min(1, t * 3)) * (1 - t);
      });
    }
  }

  runes(position, p, start, life, count = 6, radius = 1.05) {
    const base = position.clone();
    this.ring(base, p, start, life, radius);
    this.ring(base, p, start, life * .9, radius * .7, .035);
    const total = Math.ceil(count * this.detail);
    for (let i = 0; i < total; i++) {
      const angle = i / total * TAU;
      this.effect('shard', i % 2 ? p.color : p.core, start, life, (item, t) => {
        const a = angle + t * .7, r = radius * p.scale * (.9 + t * .18);
        item.object.position.copy(base).add(this.scratch.a.set(Math.cos(a) * r, .12 + Math.sin(t * Math.PI) * .2, Math.sin(a) * r));
        item.object.rotation.set(0, a, Math.PI / 4);
        item.object.scale.set(.075 * p.scale, .21 * p.scale, .025 * p.scale);
        item.material.opacity = Math.sin(t * Math.PI) * .9;
      });
    }
  }

  barrierAbsorb(actor, amount, at) {
    if (!(amount > 0) || actor.presentedDead || this.retiredActors.has(actor)) return;
    const start = Math.max(at, this.world.time), position = this.point(actor, new T.Vector3(), .02);
    this.withTarget(actor, () => {
      const effect = this.effect('ring', 0xc8e9fa, start, .28, (item, t) => {
        item.object.position.copy(position); item.object.rotation.x = -Math.PI / 2;
        item.object.scale.setScalar(.68 + t * .2); item.material.opacity = Math.sin(Math.PI * t) * .4;
      }, false);
      if (effect) effect.role = 'barrier-absorb';
    });
  }

  statusDeadline(actor, kind, linkedTarget) {
    let at = this.world.time;
    for (const sequence of this.sequences) if (!sequence.impacted && (sequence.targets.includes(actor) || kind === 'cover' && sequence.source === actor && sequence.targets.includes(linkedTarget))) at = Math.max(at, sequence.at + sequence.timing.impact);
    for (const cue of this.world.cues || []) if (cue.kind === 'action' && (cue.targets?.includes(actor) || kind === 'cover' && cue.actor === actor && cue.targets?.includes(linkedTarget))) at = Math.max(at, cue.at + (cue.timing || actionTimeline(cue.event, cue.actor)).impact);
    return at;
  }

  releaseStatus(key) {
    const marker = this.statusMarkers.get(key); if (!marker) return;
    for (const item of marker.items) { item.active = false; item.object.removeFromParent(); }
    this.statusMarkers.delete(key);
  }

  syncStatuses() {
    const wanted = new Set();
    for (const row of statusRows(this.world.state)) {
      const actor = this.world.eventActor?.(row.id);
      if (!actor || actor.presentedDead || this.retiredActors.has(actor) || !actor.wrapper.visible) continue;
      for (const kind of STATUS_KINDS) if (row.status[kind] > 0 && (kind !== 'barrier' || row.status.barrierTurns > 0)) {
        const targetActor = kind === 'cover' ? this.world.eventActor?.(row.status.coverTargetId) : null;
        if (kind === 'cover' && (!targetActor || targetActor === actor || targetActor.presentedDead || this.retiredActors.has(targetActor) || !targetActor.wrapper.visible)) continue;
        const key = actor.id + ':' + kind; wanted.add(key);
        let marker = this.statusMarkers.get(key);
        const previousAt = marker?.targetActor === targetActor ? marker.at : undefined;
        if (marker && (marker.quality !== this.world.qualityLevel || marker.targetActor !== targetActor)) { this.releaseStatus(key); marker = null; }
        if (!marker) { marker = { actor, kind, targetActor, items: [], parts: statusParts(kind, this.world.qualityLevel), quality: this.world.qualityLevel, at: previousAt ?? this.statusDeadline(actor, kind, targetActor) }; this.statusMarkers.set(key, marker); }
        if (this.world.time < marker.at) continue;
        // Persistent status feedback outranks optional burst decoration. Keep
        // the marker/at/target if a busy frame only has room for some parts,
        // then refill its remaining prefix as transient hit cores expire.
        for (let i = marker.items.length; i < marker.parts.length; i++) {
          const part = marker.parts[i], item = this.acquire(part.kind, part.color, false, true);
          if (!item) break;
          marker.items.push(item);
        }
        const base = this.point(actor, this.scratch.target, 0);
        marker.items.forEach((item, i) => {
          const part = marker.parts[i]; item.object.position.copy(base).add(this.scratch.a.set(part.x, part.y + (part.h || 0) * (actor.presentationHeight || actor.refreshHeight || 2.8), part.z));
          item.object.scale.set(part.sx, part.sy * (part.heightScale ? actor.presentationHeight || actor.refreshHeight || 2.8 : 1), part.sz); item.object.rotation.set(part.rx || 0,part.ry || 0,part.rz || 0);
          if (kind === 'cover') this.beam(item, this.point(actor, this.scratch.a, .43), this.point(targetActor, this.scratch.b, .43), .014);
          const opacity = part.opacity ?? .58;
          item.material.opacity = this.world.reducedMotion ? opacity : opacity + Math.sin(this.world.time * 2.3 + i) * Math.min(.08, opacity * .15);
        });
      }
    }
    for (const key of this.statusMarkers.keys()) if (!wanted.has(key)) this.releaseStatus(key);
  }

  withQuota(limit, fn) {
    const previous = this.decorQuota; this.decorQuota = limit;
    try { return fn(); } finally { this.decorQuota = previous; }
  }

  withTarget(target, fn) {
    const previous = this.effectTarget; this.effectTarget = target;
    try { return fn(); } finally { this.effectTarget = previous; }
  }

  retireActor(actor) {
    this.retiredActors.add(actor); this.cancelSource(actor);
    for (const [key, marker] of this.statusMarkers) if (marker.actor === actor || marker.targetActor === actor) this.releaseStatus(key);
    for (const sequence of this.sequences) sequence.targets = sequence.targets.filter(target => target !== actor);
    this.removeEffects(effect => effect.target === actor || effect.targets?.includes(actor));
  }

  advanceSequence(sequence) {
    const age = this.world.time - sequence.at;
    if (age < 0) return;
    const { source, animation, profile: p, at, targets: queuedTargets, random: rng, timing } = sequence;
    const targets = queuedTargets.filter(target => !this.retiredActors.has(target) && (p.family === 'revive' || !target.presentedDead));
    const RELEASE = timing.release;
    this.effectOwner = { source, phase: 'windup' };
    if (!sequence.windup) {
      sequence.windup = true;
      combat200Windup(this, sequence);
      if (p.family !== 'physical') {
        this.glow(this.hand(source, this.scratch.hand, animation), p, at, RELEASE + .07, .95, source, animation);
        const floor = this.point(source, new T.Vector3(), .015);
        if (['runes', 'nova', 'revive'].includes(p.family)) this.runes(floor, p, at, timing.impact, 6, .8);
        else this.ring(floor, p, at, RELEASE, .7);
      }
    }
    if (!sequence.launched && age >= RELEASE) {
      sequence.launched = true;
      this.effectOwner = { source, phase: 'travel' };
      combat200Launch(this, sequence, targets);
      const launch = this.hand(source, new T.Vector3(), animation);
      if (p.projectile) for (const target of targets) this.withTarget(target, () => this.projectile(launch, target, p, at + RELEASE, at + timing.impact, rng));
      if (p.family === 'fire' && p.style === 'wave') {
        this.fanWave(launch, targets, p, at + RELEASE, at + timing.impact);
      }
      if (p.style === 'breath') for (const target of targets) this.withTarget(target, () => this.breathArc(source, target, p, at + RELEASE, at + timing.impact, animation));
      if (p.style === 'thread') for (const target of targets) this.withTarget(target, () => this.healingThread(source, target, p, at + RELEASE, at + timing.impact, animation));
      if (p.family === 'physical' && p.style === 'arrow') for (const target of targets) this.withTarget(target, () => this.arrow(launch, target, p, at + RELEASE, at + timing.impact));
    }
    if (!sequence.impacted && age >= timing.impact) {
      sequence.impacted = true;
      this.effectOwner = { source, phase: 'impact' };
      const impactAt = at + timing.impact;
      // Reserve the basic hit on every real target before adding optional detail.
      const catchUp = impactAt + .2 <= this.world.time;
      const feedbackAt = catchUp ? this.world.time - .035 : impactAt;
      for (const target of targets) if (!target.presentedDead && !this.retiredActors.has(target) && target.wrapper.visible) {
        const core = this.withTarget(target, () => this.glow(this.point(target, new T.Vector3(), .5), p, feedbackAt, .2, p.family === 'physical' ? .7 : 1.25, null, undefined, true));
        if (core) { core.deadline = impactAt; core.catchUp = catchUp; }
      }
      if (p.skillId === 'scatter_runes') this.constellation(targets, p, impactAt, .42);
      if (p.style === 'chain') {
        let previous = source;
        for (const target of targets) { const from = previous; this.withTarget(target, () => this.lightning(from, target, p, impactAt, rng, animation, from !== source)); previous = target; }
      }
      const perTarget = Math.floor(Math.max(0, this.budget - this.activeCount) / Math.max(1, targets.length));
      for (const target of targets) this.withTarget(target, () => this.withQuota(perTarget, () => this.impactTarget(source, target, p, impactAt, rng, animation)));
      if (p.family === 'nova') {
        const floor = this.point(source, new T.Vector3(), .025);
        for (let i = 0; i < 3; i++) this.ring(floor, p, impactAt, .5, 1.5 + i * 1.3, i * .035);
      }
    }
    this.effectOwner = null;
  }

  fanWave(launch, targets, p, start, end) {
    const destinations = targets.map(target => this.point(target, new T.Vector3(), .42));
    for (let i = 0; i < targets.length; i++) this.withTarget(targets[i], () => {
      const destination = destinations[i];
      const effect = this.effect('flame', p.color, start, end - start, (item, t) => {
        item.object.position.lerpVectors(launch, destination, t);
        item.object.scale.set(p.scale * (.5 + t * .65), p.scale * (.6 + t * .8), 1);
        item.material.opacity = Math.sin(Math.PI * Math.min(.95, t)) * .78; this.frame(item, t);
      }, false);
      if (effect) { effect.role = 'fire-wave-front'; effect.destination = destination; }
      if (i) {
        const previous = destinations[i - 1];
        const join = this.effect('beam', p.color, start, end - start, (item, t) => {
          const a = this.scratch.a.lerpVectors(launch, previous, t), b = this.scratch.b.lerpVectors(launch, destination, t);
          this.beam(item, a, b, .10 * p.scale * Math.sin(Math.PI * t)); item.material.opacity = .55 * Math.sin(Math.PI * t);
        }, false);
        if (join) { join.role = 'fire-wave-join'; join.targets = [targets[i - 1], targets[i]]; }
      }
    });
  }

  projectile(launch, target, p, start, end, rng) {
    const initialTarget = this.point(target, new T.Vector3(), .55);
    const duration = Math.max(.05, end - start), size = .9 * p.scale;
    const positionAt = (t, output) => {
      output.lerpVectors(launch, this.point(target, this.scratch.target, .55), t);
      output.y += Math.sin(Math.PI * t) * Math.min(.7, launch.distanceTo(initialTarget) * .05);
      return output;
    };
    this.effect(p.family === 'ice' ? 'shard' : 'flame', p.color, start, duration, (item, t) => {
      positionAt(t, item.object.position);
      item.object.scale.set(size * .65, size, size * .65);
      if (p.family === 'ice') { item.object.rotation.set(t * 2, t * 2.4, Math.PI / 4); item.object.scale.set(size * .16, size * .7, size * .12); }
      this.frame(item, t);
      item.material.opacity = clamp(t * 12) * (p.family === 'ice' ? .74 : .95);
    }, p.family !== 'ice');
    this.effect('glow', p.core, start, duration, (item, t) => {
      positionAt(t, item.object.position);
      item.object.scale.setScalar(size * (p.family === 'ice' ? .22 : .6));
      item.material.opacity = .95;
    });
    // A fixed number of staggered tail beads follows the same hand-to-target arc.
    for (let i = 0; i < Math.ceil(8 * this.detail); i++) {
      const delay = i * .008, scatter = new T.Vector3((rng() - .5) * .12, (rng() - .5) * .12, (rng() - .5) * .12);
      this.effect('glow', i % 2 ? p.color : p.core, start + delay, duration - delay, (item, t) => {
        const time = clamp((t * (duration - delay)) / duration);
        positionAt(time, item.object.position).add(scatter);
        item.object.scale.setScalar(size * (.32 - i * .025));
        item.material.opacity = .55 * (1 - i / 10) * (1 - t * .45);
      });
    }
  }

  lightning(source, target, p, start, rng, animation = source.current, fromBody = false) {
    const a = fromBody ? this.point(source, new T.Vector3(), .55) : this.hand(source, new T.Vector3(), animation), b = this.point(target, new T.Vector3(), .55);
    const points = [a], segments = this.detail < .7 ? 5 : 8;
    const direction = new T.Vector3().subVectors(b, a).normalize();
    const side = new T.Vector3().crossVectors(direction, UP).normalize();
    for (let i = 1; i < segments; i++) {
      const point = new T.Vector3().lerpVectors(a, b, i / segments);
      point.addScaledVector(side, (rng() - .5) * .8 * Math.sin(i / segments * Math.PI));
      point.y += (rng() - .5) * .6;
      points.push(point);
    }
    points.push(b);
    const line = (from, to, width, color, strength = 1) => {
      const effect = this.effect('beam', color, start, .19, (item, t) => {
        this.beam(item, from, to, width * (this.world.reducedMotion?1:.75 + .25 * Math.sin(t * 95)));
        item.material.opacity = strength * (1 - t) * (this.world.reducedMotion?1:.72 + .28 * Math.sin(t * 120));
      });
      if (effect) effect.route = { from: source.id, to: target.id, fromBody };
    };
    for (let i = 0; i < segments; i++) {
      line(points[i], points[i + 1], .065 * p.scale, p.color, .7);
      line(points[i], points[i + 1], .021 * p.scale, p.core);
      if (i > 0 && i % 2 === 0 && this.detail > .6) {
        const tip = points[i].clone().addScaledVector(side, (rng() > .5 ? 1 : -1) * (.4 + rng() * .7));
        tip.y += (rng() - .5) * .7;
        line(points[i], tip, .014 * p.scale, p.core, .7);
      }
    }
  }

  arrow(launch, target, p, start, end) {
    const from = launch.clone();
    this.effect('beam', p.core, start, end - start, (item, t) => {
      const destination = this.point(target, this.scratch.target, .52);
      const head = this.scratch.a.lerpVectors(from, destination, t);
      const tail = this.scratch.b.lerpVectors(from, destination, Math.max(0, t - .12));
      this.beam(item, tail, head, .025);
      item.material.opacity = .95;
    });
  }

  breathArc(source, target, p, start, end, animation) {
    if (source === target) return;
    const from = this.hand(source, new T.Vector3(), animation);
    for (let i = 0; i < 3; i++) {
      const effect = this.effect('glow', i === 1 ? p.core : p.color, start, end - start, (item, t) => {
        const phase = Math.max(0, t - (1 - t) * i * .12);
        arcPoint(from, this.point(target, this.scratch.target, .45), phase, .24, (i - 1) * .18, item.object.position);
        item.object.scale.setScalar(p.scale * (.12 + .08 * Math.sin(Math.PI * t))); item.material.opacity = Math.sin(Math.PI * t) * .72;
      }, false);
      if (effect) { effect.role = 'breath-arc'; effect.endpoints = [source.id, target.id]; effect.arrival = end; }
    }
  }

  constellation(targets, p, start, life) {
    for (let i = 1; i < targets.length; i++) {
      const left = targets[i - 1], right = targets[i];
      const effect = this.withTarget(right, () => this.effect('beam', p.color, start, life, (item, t) => {
        this.beam(item, this.point(left, this.scratch.a, .22), this.point(right, this.scratch.b, .22), .016 * p.scale);
        item.material.opacity = Math.sin(Math.PI * t) * .65;
      }, false));
      if (effect) { effect.role = 'constellation-link'; effect.targets = [left, right]; effect.endpoints = [left.id, right.id]; }
    }
  }

  healingThread(source, target, p, start, end, animation) {
    if (source === target) return;
    const from = this.hand(source, new T.Vector3(), animation), count = this.world.qualityLevel === 'low' ? 4 : 7;
    for (let i = 0; i < count; i++) {
      const effect = this.effect('beam', p.color, start, end - start, (item, t) => {
        const to = this.point(target, this.scratch.target, .48);
        const a = arcPoint(from, to, i / count, .65, 0, this.scratch.a), b = arcPoint(from, to, (i + 1) / count, .65, 0, this.scratch.b);
        this.beam(item, a, b, .018 * p.scale); item.material.opacity = Math.sin(Math.PI * t) * .7;
      }, false);
      if (effect) { effect.role = 'healing-thread'; effect.endpoints = [source.id, target.id]; }
    }
  }

  protectiveLink(source, target, p, start, life = .65) {
    if (source === target || this.retiredActors.has(source) || this.retiredActors.has(target)) return;
    const effect = this.effect('beam', p.color, start, life, (item, t) => {
      const a = this.point(source, this.scratch.a, .45), b = this.point(target, this.scratch.b, .45);
      this.beam(item, a, b, .025 * p.scale);
      item.material.opacity = Math.sin(Math.PI * t) * .48;
    }, false);
    if (effect) { effect.role = 'oath-link'; effect.endpoints = [source.id, target.id]; }
    this.glow(this.point(source, new T.Vector3(), .45), p, start, life, .35);
    this.glow(this.point(target, new T.Vector3(), .45), p, start, life, .35);
  }

  physical(source, target, p, start, rng, animation = source.current) {
    const position = this.point(target, new T.Vector3(), .52);
    if(p.style==='arrow'){
      this.sparks(position,p,start,.19,rng,4);
      return;
    }
    const from = this.hand(source, new T.Vector3(), animation);
    const count = p.style === 'claw' ? 3 : p.style === 'sweep' ? 2 : 1;
    const forward = new T.Vector3().subVectors(position, from); if (forward.lengthSq() < .0001) forward.set(0, 0, 1); forward.normalize();
    const side = new T.Vector3().crossVectors(forward, UP); if (side.lengthSq() < .0001) side.set(1, 0, 0); side.normalize();
    for (let i = 0; i < count; i++) {
      const a = position.clone().addScaledVector(side, -.5 + i * .15).addScaledVector(UP, p.style === 'sweep' ? .12 : .6);
      const b = position.clone().addScaledVector(side, .5 + i * .15).addScaledVector(UP, p.style === 'sweep' ? -.12 : -.45);
      if (p.style === 'thrust') { a.copy(position).addScaledVector(forward, -.8); b.copy(position).addScaledVector(forward, .12); }
      const strike = this.effect('beam', p.color, start + i * .018, .16, (item, t) => {
        this.beam(item, a, b, (.04 + Math.sin(t * Math.PI) * .045) * p.scale);
        item.material.opacity = Math.sin(t * Math.PI);
      });
      if (strike) strike.role = 'directional-strike';
    }
    this.ring(this.point(target, new T.Vector3(), .025), p, start, .22, .42);
    this.sparks(position, p, start, .28, rng, p.style === 'hammer' ? 12 : 6);
    if (p.style === 'hammer' || p.style === 'sun') this.ring(this.point(target, new T.Vector3(), .025), p, start, .3, .85);
  }

  impactTarget(source, target, p, start, rng, animation = source.current) {
    combat200Impact(this, source, target, p, start, animation);
    const position = this.point(target, new T.Vector3(), .5), floor = this.point(target, new T.Vector3(), .02);
    if (p.family === 'physical') { this.physical(source, target, p, start, rng, animation); return; }
    if (p.family === 'fire') {
      this.effect('explosion', 0xffffff, start, .45, (item, t) => {
        item.object.position.copy(position);
        item.object.scale.setScalar(p.scale * (1.1 + ease(t) * 2.2));
        item.material.opacity = clamp((1 - t) * 2.3);
        this.frame(item, t);
      });
      this.glow(position, p, start, .23, 2.5);
      this.ring(floor, p, start, .4, 1.5);
      this.sparks(position, p, start, .5, rng, 14);
      this.effect('smoke', 0x827267, start + .09, .6, (item, t) => {
        item.object.position.copy(position); item.object.position.y += t * .9;
        item.object.scale.setScalar(p.scale * (.8 + t * 2.5));
        item.material.opacity = Math.sin(t * Math.PI) * .24;
        this.frame(item, t);
      }, false);
      return;
    }
    if (p.family === 'ice') {
      this.ring(floor, p, start, .55, 1.35);
      this.glow(position, p, start, .25, 1.7);
      this.sparks(position, p, start, .52, rng, 12, 'shard');
      this.runes(floor, { ...p, scale: p.scale * .7 }, start + .04, .48, 6, 1.15);
      return;
    }
    if (p.family === 'lightning') {
      if (p.style !== 'chain') this.lightning(source, target, p, start, rng, animation);
      this.glow(position, p, start, .25, 1.9);
      this.sparks(position, p, start, .3, rng, 10);
      this.ring(floor, p, start, .25, .8);
      return;
    }
    if (p.family === 'ward') {
      if (p.style === 'link') this.protectiveLink(source, target, p, start);
      this.runes(floor, p, start, .7, 5, .95);
      this.effect('shield', p.color, start, .65, (item, t) => {
        item.object.position.copy(this.point(target, this.scratch.target, .48));
        item.object.scale.set(1.05 * p.scale, (target.presentationHeight || 2.8) * .48, 1.05 * p.scale);
        item.object.rotation.y = t * .35;
        item.material.opacity = Math.sin(t * Math.PI) * .22;
      });
      this.sparks(position, p, start, .55, rng, 6, 'glow', true);
      return;
    }
    if (p.family === 'heal' || p.family === 'revive') {
      const revive = p.family === 'revive', life = revive ? .82 : .6;
      this.ring(floor, p, start, life, revive ? 1.4 : 1);
      this.ring(floor, { ...p, color: p.core }, start, life * .8, .65, .045);
      this.glow(position, p, start, life, revive ? 2.2 : 1.4);
      this.sparks(floor, p, start, life, rng, revive ? 20 : 12, 'glow', true);
      for (let i = 0; i < (revive ? 3 : 2); i++) {
        this.effect('ring', i % 2 ? p.core : p.color, start + i * .045, life, (item, t) => {
          item.object.position.copy(floor); item.object.position.y += .1 + t * (revive ? 3.5 : 2) * (this.world.reducedMotion ? .15 : 1);
          item.object.rotation.x = -Math.PI / 2;
          item.object.rotation.z = this.world.reducedMotion ? 0 : t * (i % 2 ? -1 : 1);
          item.object.scale.setScalar(p.scale * (.75 + Math.sin(t * Math.PI) * .2) * (revive ? 1 : .65));
          item.material.opacity = Math.sin(t * Math.PI) * .55;
        });
      }
      if (revive) {
        // Rising flame wings and a vertical shaft distinguish revival from healing.
        for (const side of [-1, 1]) this.effect('flame', p.color, start, life, (item, t) => {
          item.object.position.copy(position); item.object.position.x += side * Math.sin(t * Math.PI) * .7 * (this.world.reducedMotion ? .25 : 1); item.object.position.y += t * 1.6 * (this.world.reducedMotion ? .15 : 1);
          item.object.scale.set(p.scale * .9, p.scale * 2.2 * (1 - t * .4), 1);
          item.material.rotation = side * -.35;
          item.material.opacity = Math.sin(t * Math.PI) * .65;
          this.frame(item, t);
        });
      } else if (p.style === 'runes') this.runes(floor, p, start, life, 4, .75);
      return;
    }
    // Runes / sonic nova: nested rings, constellation shards and a compact burst.
    this.runes(floor, p, start, .6, p.family === 'runes' ? 8 : 6, 1.25);
    this.glow(position, p, start, .32, 2);
    this.sparks(position, p, start, .45, rng, 10, 'shard');
    for (let i = 0; i < 2; i++) this.ring(position, p, start, .4, 1.1 + i * .35, i * .035, true);
  }

  /** Fallback for ungrouped result cues. Supplying handled:true prevents duplication. */
  impact({ actor, source = actor, event = {}, kind, handled = false, at = this.world.time } = {}) {
    if (handled || !actor || this.disposed) return;
    const skillId = event.skillId || (kind === 'revive' ? 'wake_flame' : kind === 'heal' ? (source?.options?.hostile ? 'enemy_mend' : 'warm_hands') : 'enemy_claw');
    const castEvent = { ...event, skillId };
    this.impactTarget(source, actor, magicProfile(castEvent, source), at, random(hash(`${actor.id}:${at}:${kind}`)), this.animationFor(source, castEvent));
  }

  update() {
    if (this.disposed) return;
    // fxGroup can be cleared during an area rebuild; attach this private pool again.
    if (this.group.parent !== this.world.fxGroup) this.world.fxGroup.add(this.group);
    // Free completed projectiles before their synchronized impacts need the pool.
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      if (this.world.time >= effect.start + effect.life) {
        effect.item.active = false;
        effect.item.object.removeFromParent();
        this.effects.splice(i, 1);
      }
    }
    this.trimActiveEffects();
    for (let i = this.sequences.length - 1; i >= 0; i--) {
      const sequence = this.sequences[i];
      this.advanceSequence(sequence);
      if (this.world.time >= sequence.at + sequence.timing.duration) this.sequences.splice(i, 1);
    }
    this.syncStatuses();
    this.trimActiveEffects();
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i], age = this.world.time - effect.start;
      if (age < 0) { effect.item.object.visible = false; continue; }
      if (age >= effect.life) {
        effect.item.active = false;
        effect.item.object.removeFromParent();
        this.effects.splice(i, 1);
      } else {
        effect.item.object.visible = true;
        effect.update(effect.item, clamp(age / effect.life));
      }
    }
    this.trimPools();
  }

  trimPools(limit = this.budget + 16) {
    let excess = this.poolCount - Math.max(limit, this.activeCount);
    if (excess <= 0) return 0;
    let released = 0;
    for (const [key, pool] of this.pools) {
      for (let i = pool.length - 1; i >= 0 && excess > 0; i--) if (!pool[i].active) {
        const item = pool[i]; item.object.removeFromParent(); item.material.dispose(); item.map?.dispose();
        pool.splice(i, 1); this.poolCount--; excess--; released++;
      }
      if (!pool.length) this.pools.delete(key);
      if (excess <= 0) break;
    }
    return released;
  }

  trimActiveEffects(limit = this.budget) {
    let excess = this.activeCount - limit, released = 0;
    if (excess <= 0) return released;
    for (let i = this.effects.length - 1; i >= 0 && excess > 0; i--) {
      const effect = this.effects[i];
      if (effect.essential) continue;
      effect.item.active = false;
      effect.item.object.removeFromParent();
      this.effects.splice(i, 1);
      excess--; released++;
    }
    return released;
  }

  removeEffects(predicate) {
    for (let i = this.effects.length - 1; i >= 0; i--) if (predicate(this.effects[i])) {
      const effect = this.effects[i]; effect.item.active = false; effect.item.object.removeFromParent(); this.effects.splice(i, 1);
    }
  }

  cancelSource(actor) {
    this.sequences = this.sequences.filter(sequence => sequence.source !== actor || sequence.launched);
    this.removeEffects(effect => effect.source === actor && effect.phase === 'windup');
  }

  clear() {
    for (const key of this.statusMarkers.keys()) this.releaseStatus(key);
    this.sequences.length = 0;
    for (const effect of this.effects) { effect.item.active = false; effect.item.object.removeFromParent(); }
    this.effects.length = 0;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.controller.abort();
    this.clear();
    this.group.removeFromParent();
    for (const pool of this.pools.values()) for (const item of pool) { item.material.dispose(); item.map?.dispose(); }
    this.pools.clear();
    for (const geometry of Object.values(this.geometries)) geometry.dispose();
    for (const texture of Object.values(this.textures)) texture.dispose();
    this.softTexture.dispose();
    this.modelClips.clear();
  }
}
