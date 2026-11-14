import {installRefresh} from './graphics-refresh.js?v=gait-111';
import {installMeshyWorld} from './meshy-world.js?v=gait-111';
import {areaBiome} from './area-asset-plan.js?v=gait-111';
import {WorldElements,installWorldElements} from './water-fire.js?v=gait-111';
import {MagicVfx} from './magic-vfx.js?v=motion-110';
import {advancePaintedPose, orientPaintedActors, paintedActionAge, resetPaintedPose, paintedHeading} from './painted-motion.js?v=gait-111';
import {CharacterAnimationLibrary} from './character-animation.js?v=gait-111';
import {installBrowserPerformance} from './browser-performance.js?v=0.16.0-demo';
import * as T from '../../assets/vendor/three.module.js';
import { GLTFLoader } from '../../assets/vendor/GLTFLoader.js';
import { clone as cloneSkeleton } from '../../assets/vendor/SkeletonUtils.js';
import * as Content from './content.js?v=campaign-v1';
import { battleFormation, fitBattleCamera, facingToward, oppositionFacing, wrapFacing } from './battle-stage.js?v=0.16.0-demo';
import { combatMotionPolicy, actionLunge, impactRecoil, meleeTiming, meleeTravel } from './presentation-motion.js?v=motion-110';
import { actionTimeline, actionClipPhase } from './presentation-timing.js?v=motion-110';
import { reactionPhase, contactReaction, transitionBlend, hasUnsettledDeath } from './combat200-animation-policy.js?v=0.16.0-demo';
import { PartyTrail, loopTiming, COMBAT_MOTION, combatPlaybackRate } from './party-motion.js?v=motion-110';
import { walkable } from './model.js?v=gait-111';
import { gaitForSpeed, gaitRate, gaitEntryPhase } from './actor-locomotion.js?v=motion-110';
import { applyFootContact, resetFootContact } from './foot-contact.js?v=motion-110';
import { applyPartyGait, resetPartyGait } from './party-gait.js?v=gait-111';
import { updateBow, disposeBow } from './bow-presentation.js?v=motion-110';
import { BattleLayoutCache } from './ui-framing.js?v=0.16.0-demo';
import { paintGildedLine } from './bitmap.js?v=painted-20261114-r2';

import { buildAuthoredRoad } from './authored-landscape.js?v=campaign-v1';
import { bridgeAt, bridgeHeight, nearestLand, terrainElevation } from './area-geometry.js?v=rivers-0181';
import { Groundcover } from './groundcover.js?v=campaign-v1';
import { CHAPTER_BIOMES } from './campaign-visuals.js?v=campaign-v1';

const UP = new T.Vector3(0, 1, 0);
const TAU = Math.PI * 2;
const MODEL_NAMES = ['hero', 'husk', 'acolyte', 'sentinel', 'boss', 'environment'];
const PALETTES = {
  village: { tile: 0, sky: 0x9abeb7, fog: 0x92b0ac, foliage: 0x627948, earth: 0x79745e, light: 0xffe1aa },
  forest: { tile: 1, sky: 0x668d81, fog: 0x668579, foliage: 0x486347, earth: 0x776c53, light: 0xffedc7 },
  marsh: { tile: 2, sky: 0x79958e, fog: 0x71928b, foliage: 0x64794d, earth: 0x656e56, light: 0xe4edc2 },
  abbey: { tile: 3, sky: 0x778c9c, fog: 0x7e9199, foliage: 0x536250, earth: 0x6a665c, light: 0xffe1b8 },
};
// Friendly silhouettes reuse the original armored / robed GLB families.
const ROLE_LOOKS = {
  alar: { model: 'hero', scale: 1 },
  iona: { model: 'acolyte', cloth: 0x4d7097, ivory: 0xc2cbd0, trim: 0xa89d74, scale: 0.96, width: 0.94 },
  radan: { model: 'sentinel', cloth: 0x715247, ivory: 0xc0b393, trim: 0xa98e62, scale: 0.94, width: 1.03 },
  leia: { model: 'acolyte', cloth: 0x527e69, ivory: 0xded7b9, trim: 0xb3a57b, scale: 0.94, width: 0.92 },
  velda: { model: 'acolyte', cloth: 0x83718d, ivory: 0xe0d2ac, trim: 0xb09b70, scale: 0.88 },
  orin: { model: 'hero', cloth: 0x795e48, ivory: 0x9e9176, trim: 0x9f8d70, scale: 1.03, width: 1.08 },
  nara: { model: 'acolyte', cloth: 0x9c7955, ivory: 0xd6c498, trim: 0xad946c, scale: 0.91 },
  mirel: { model: 'acolyte', cloth: 0x58734a, ivory: 0xa3af85, trim: 0x9b9671, scale: 0.95, width: 0.9 },
  lio: { model: 'acolyte', cloth: 0x8c806b, ivory: 0xc6b892, trim: 0x918674, scale: 0.85, width: 0.93 },
  teren: { model: 'acolyte', cloth: 0x71685a, ivory: 0xc2b18e, trim: 0xa99b80, scale: 0.95 },
  gerd: { model: 'acolyte', cloth: 0x587d77, ivory: 0xc1b99a, trim: 0xa4916e, scale: 1 },
  severin: { model: 'acolyte', cloth: 0x52627e, ivory: 0xd8cda9, trim: 0xb4a77e, scale: 0.97 },
  dagan: { model: 'sentinel', cloth: 0x793e43, ivory: 0xbeb695, trim: 0xb79759, scale: 1.03 },
  elda: { model: 'acolyte', cloth: 0xbbbea3, ivory: 0xe6ddbd, trim: 0xc0ab70, scale: 0.96, width: 0.95 },
};
const roleLook = role => ROLE_LOOKS[String(role || '').split('_')[0]];
const values = value => Array.isArray(value) ? value : Object.values(value || {});
const point = value => ({ x: Number(value?.x ?? value?.[0] ?? 0), z: Number(value?.z ?? value?.[1] ?? 0) });
const flag = (state, id) => !!(state?.flags?.[id] || state?.flags?.includes?.(id));
const hasId = (value, id) => value instanceof Set ? value.has(id) : Array.isArray(value) ? value.includes(id) || value.some(v => v?.id === id) : !!value?.[id];
const hash = text => [...String(text)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
function random(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ s >>> 15, 1 | s); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function condition(state, required) {
  if (!required) return true;
  if (typeof required === 'string') return flag(state, required);
  if (Array.isArray(required)) return required.every(id => condition(state, id));
  if (required.all && !required.all.every(id => condition(state, id))) return false;
  if (required.any && !required.any.some(id => condition(state, id))) return false;
  if (required.not && condition(state, required.not)) return false;
  return true;
}
function visible(state, entity) {
  return condition(state, entity.visibleWhen ?? entity.requiresFlag ?? entity.requiresFlags ?? entity.requires)
    && !(entity.hideWhen && condition(state, entity.hideWhen))
    && !(entity.hiddenByFlag && flag(state, entity.hiddenByFlag));
}

/** Read-only Three.js presentation. All movement, flags and combat belong to the model. */
export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.11;
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x435451);
    this.scene.fog = new T.FogExp2(0x546660, 0.012);
    this.camera = new T.OrthographicCamera(-20, 20, 14, -14, 0.1, 180);
    this.camera.position.set(15, 24, 23);
    this.camera.lookAt(0, 0, 0);
    this.battleCamera = new T.PerspectiveCamera(40, 1, 0.1, 180);
    this.activeCamera = this.camera;
    this.focus = new T.Vector3();
    this.zoomHeight = 14;
    this.sun = new T.DirectionalLight(0xffe4bd, 3.1);
    this.sun.position.set(-18, 30, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 95 });
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.06;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(new T.HemisphereLight(0xd1e0dc, 0x454437, 2.25));
    const rim = new T.DirectionalLight(0x9abec6, 1.15);
    rim.position.set(16, 14, -25);
    this.scene.add(rim);
    this.groundcover = new Groundcover(this);
    this.areaGroup = new T.Group();
    this.actorGroup = new T.Group();
    this.fxGroup = new T.Group();
    this.battleStage = new T.Group();
    this.battleStage.visible = false;
    this.scene.add(this.areaGroup, this.actorGroup, this.fxGroup, this.battleStage);
    this.assets = {};
    this.actors = new Map();
    this.geometries = new Map();
    this.materials = new Map();
    this.areaGeometries = new Set();
    this.interactables = [];
    this.animations = [];
    this.effects = [];
    this.cues = [];
    this.errors = [];
    this.raycaster = new T.Raycaster();
    this.pointer = new T.Vector2();
    this.groundPlane = new T.Plane(UP, 0);
    this.time = 0;
    this.loaded = false;
    this.disposed = false;
    this.qualityLevel = 'high';
    this.resizeHandler = () => this.resize();
    globalThis.addEventListener?.('resize', this.resizeHandler);
    this.resize();
  }

  async load(onProgress) {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      await this.loadAssets(value => onProgress?.(value * .62));
      // Keep render/loadArea behind the complete presentation initialization.
      this.loaded = false;
      if (this.disposed) return this;
      this.characterAnimations = new CharacterAnimationLibrary(this, {requestOptions: this.assetRequestOptions});
      await this.characterAnimations.load();
      if (this.disposed) return this;
      onProgress?.(.76);
      this.magicVfx = new MagicVfx(this);
      await this.magicVfx.load();
      if (this.disposed) return this;
      this.worldElements = new WorldElements(this);
      this.loaded = true;
      onProgress?.(1);
      return this;
    })();
    return this.loadPromise;
  }

  async loadAssets(onProgress) {
    const loader = new GLTFLoader();
    let completed = 0;
    const results = await Promise.allSettled(MODEL_NAMES.map(async name => {
      const gltf = await loader.loadAsync(new URL(`../../assets/models/${name}.glb`, import.meta.url).href);
      gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.assets[name] = gltf;
      onProgress?.(`Оригинальные модели · ${++completed} / ${MODEL_NAMES.length}`);
    }));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const message = `Не удалось загрузить ${MODEL_NAMES[index]}.glb: ${result.reason?.message || result.reason}`;
        this.errors.push(message);
        console.error(message);
        onProgress?.(message);
      }
    });
    if (!this.assets.hero) throw new Error(this.errors.join('\n') || 'Не загружена модель героя');
    // Recovery uses another successfully loaded original model only after an actual load failure.
    for (const name of ['husk', 'acolyte', 'sentinel', 'boss']) if (!this.assets[name]) this.assets[name] = this.assets[name === 'boss' ? 'sentinel' : 'hero'] || this.assets.hero;
    onProgress?.('Земля, камень и растительность…');
    this.atlas = await new T.TextureLoader().loadAsync(new URL('../../assets/act1/terrain-atlas.png', import.meta.url).href);
    this.atlas.colorSpace = T.SRGBColorSpace;
    this.atlas.wrapS = this.atlas.wrapT = T.ClampToEdgeWrapping;
    this.atlas.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.atlas.generateMipmaps = true;
    this.makeMaterials();
    this.loaded = true;
    onProgress?.('Мир первого акта готов');
    return this;
  }

  material(key, parameters) {
    if (!this.materials.has(key)) this.materials.set(key, new T.MeshStandardMaterial(parameters));
    return this.materials.get(key);
  }

  atlasMaterial(key, quadrant, color = 0xffffff) {
    const mat = this.material(key, { map: this.atlas, color, roughness: 0.96 });
    const offset = new T.Vector2(quadrant % 2 ? 0.5 : 0, quadrant < 2 ? 0.5 : 0);
    mat.onBeforeCompile = shader => {
      shader.uniforms.terrainTileOffset = { value: offset };
      shader.fragmentShader = `uniform vec2 terrainTileOffset;\n${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec2 terrainUV = terrainTileOffset + vec2(0.002) + fract(vMapUv) * 0.496;
          vec4 sampledDiffuseColor = texture2D(map, terrainUV);
          diffuseColor *= sampledDiffuseColor;
        #endif
      `);
    };
    mat.customProgramCacheKey = () => `act1-terrain-${quadrant}`;
    return mat;
  }

  makeMaterials() {
    for (let i = 0; i < 4; i++) this.atlasMaterial(`terrain${i}`, i);
    this.atlasMaterial('path', 1, 0xc8bfa2);
    this.atlasMaterial('bank', 2, 0x9b9d78);
    this.atlasMaterial('wall', 0, 0xc0b99e);
    this.atlasMaterial('ruin', 3, 0x979b94);
    this.atlasMaterial('roof', 3, 0x6a4342);
    const options = {
      cliff: { color: 0x525950, roughness: 1 },
      wood: { color: 0x514333, roughness: 0.96 },
      bark: { color: 0x594b3a, roughness: 1 },
      leaves: { color: 0x496246, roughness: 0.94 },
      grass: { color: 0x777c4d, roughness: 1, side: T.DoubleSide },
      dark: { color: 0x252b2a, roughness: 0.87 },
      steel: { color: 0x64716f, metalness: 0.75, roughness: 0.42 },
      gold: { color: 0xb69852, metalness: 0.8, roughness: 0.34 },
      cloth: { color: 0x6f2830, roughness: 0.95, side: T.DoubleSide },
      ivory: { color: 0xc8bc95, roughness: 0.92 },
      teal: { color: 0x426b65, roughness: 0.9 },
      ember: { color: 0xffbc61, emissive: 0xff8526, emissiveIntensity: 1.9, roughness: 0.3 },
      water: { color: 0x4b7476, metalness: 0.36, roughness: 0.24, transparent: true, opacity: 0.87, depthWrite: false },
    };
    for (const [key, parameters] of Object.entries(options)) this.material(key, parameters);
    const pointer = new T.MeshBasicMaterial({ color: 0xe6cc87, side: T.DoubleSide, transparent: true, opacity: 0.72, depthWrite: false });
    this.materials.set('marker', pointer);
    this.materials.set('hostile', new T.MeshBasicMaterial({ color: 0xad5342, transparent: true, opacity: 0.57, side: T.DoubleSide, depthWrite: false }));
    this.materials.set('proxy', new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
  }

  geometry(key, make) {
    if (!this.geometries.has(key)) this.geometries.set(key, make());
    return this.geometries.get(key);
  }

  mesh(geometry, material, parent = this.areaGroup, x = 0, y = 0, z = 0, local = false) {
    if (local) this.areaGeometries.add(geometry);
    const mesh = new T.Mesh(geometry, typeof material === 'string' ? this.materials.get(material) : material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  box(w, h, d, material, parent, x = 0, y = 0, z = 0) {
    return this.mesh(this.geometry(`box:${w}:${h}:${d}`, () => new T.BoxGeometry(w, h, d)), material, parent, x, y, z);
  }

  cylinder(rt, rb, h, material, parent, x = 0, y = 0, z = 0, segments = 9) {
    return this.mesh(this.geometry(`cylinder:${rt}:${rb}:${h}:${segments}`, () => new T.CylinderGeometry(rt, rb, h, segments)), material, parent, x, y, z);
  }

  height(x, z) {
    return terrainElevation(this.area?.layout, x, z, this.seedPhase);
  }

  walkHeight(x, z) {
    const bridge = this.area?.layout && bridgeAt(this.area.layout, x, z, .30);
    return bridge ? bridgeHeight(bridge, x, z, (a, b) => this.height(a, b)) : this.height(x, z);
  }

  loadArea(id, state) {
    this.clearArea();
    const areas = values(Content.AREAS);
    this.area = areas.find(area => area.id === id) || areas[0];
    if (!this.area) return;
    this.dropOtherCampaignModels?.(this.area,state);
    this.areaId = this.area.id;
    this.seedPhase = hash(this.areaId) % 1000 / 73;
    this.rng = random(hash(this.areaId));
    this.radiusX = Number(this.area.radiusX || this.area.radius?.x || this.area.width / 2 || 30);
    this.radiusZ = Number(this.area.radiusZ || this.area.radius?.z || this.area.height / 2 || 26);
    this.biome = areaBiome(this.area);
    this.theme = this.area.biome || this.biome;
    const palette = CHAPTER_BIOMES[this.theme] || PALETTES[this.biome];
    this.terrainTile = palette.tile;
    this.scene.background.set(palette.sky);
    this.scene.fog.color.set(palette.fog);
    this.scene.fog.density = palette.density ?? (this.biome === 'marsh' ? 0.015 : 0.011);
    this.sun.color.set(palette.light);
    this.sun.intensity = palette.exposure ?? (this.biome === 'abbey' ? 2.5 : 3.1);
    this.materials.get('leaves').color.set(palette.foliage);
    this.materials.get('cliff').color.set(palette.earth).multiplyScalar(0.62);
    this.paths = [];
    this.critical = [point(this.area.spawn), ...['exits', 'npcs', 'nodes', 'encounters'].flatMap(key => values(this.area[key]).map(point))];
    this.buildGround(palette.tile);
    this.buildPaths();
    this.buildLandscape();
    this.buildInteractions();
    this.syncInteractions(state);
    const spawn = point(state?.hero || state?.position || this.area.spawn);
    this.focus.set(spawn.x, 0, spawn.z);
    this.battleKey = null;
  }

  buildGround(tile) {
    const rings = 18, segments = 112, positions = [0, this.height(0, 0), 0], uvs = [0, 0], indices = [];
    for (let ring = 1; ring <= rings; ring++) {
      const radial = ring / rings;
      for (let i = 0; i <= segments; i++) {
        const angle = i / segments * TAU;
        const edge = 1.065 + Math.sin(angle * 5 + this.seedPhase) * 0.026 + Math.cos(angle * 9 - this.seedPhase) * 0.018;
        const x = Math.cos(angle) * this.radiusX * radial * edge;
        const z = Math.sin(angle) * this.radiusZ * radial * edge;
        positions.push(x, this.height(x, z), z);
        uvs.push(x / 5.5, z / 5.5);
        if (ring === 1 && i < segments) indices.push(0, 1 + i + 1, 1 + i);
        if (ring > 1 && i < segments) {
          const a = 1 + (ring - 2) * (segments + 1) + i;
          const b = a + segments + 1;
          indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    this.ground = this.mesh(geometry, `terrain${tile}`, this.areaGroup, 0, 0, 0, true);
    this.ground.castShadow = false;
    const skirtPositions = [], skirtUV = [], skirtIndices = [];
    const outerStart = 1 + (rings - 1) * (segments + 1);
    for (let i = 0; i <= segments; i++) {
      const o = (outerStart + i) * 3;
      const x = positions[o], y = positions[o + 1], z = positions[o + 2];
      skirtPositions.push(x, y - 0.02, z, x * 0.96, -4.5 - Math.sin(i * 0.7) * 0.5, z * 0.96);
      skirtUV.push(i * 0.2, 1, i * 0.2, 0);
      if (i < segments) skirtIndices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 2, i * 2 + 3, i * 2 + 1);
    }
    const skirt = new T.BufferGeometry();
    skirt.setAttribute('position', new T.Float32BufferAttribute(skirtPositions, 3));
    skirt.setAttribute('uv', new T.Float32BufferAttribute(skirtUV, 2));
    skirt.setIndex(skirtIndices);
    skirt.computeVertexNormals();
    this.mesh(skirt, 'cliff', this.areaGroup, 0, 0, 0, true);
  }

  ribbon(points, width, material, elevation = 0.025) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(p.x, 0, p.z)));
    const samples = curve.getPoints(Math.max(22, points.length * 12));
    const positions = [], uv = [], indices = [];
    let distance = 0;
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i], before = samples[Math.max(0, i - 1)], after = samples[Math.min(samples.length - 1, i + 1)];
      if (i) distance += p.distanceTo(samples[i - 1]);
      const tangent = after.clone().sub(before).normalize();
      const side = new T.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(width * (0.48 + Math.sin(i * 0.7) * 0.055));
      for (const sign of [-1, 1]) {
        const x = p.x + side.x * sign, z = p.z + side.z * sign;
        positions.push(x, this.height(x, z) + elevation, z);
        uv.push(sign < 0 ? 0 : width / 5.5, distance / 5.5);
      }
      if (i < samples.length - 1) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = this.mesh(geometry, material, this.areaGroup, 0, 0, 0, true);
    mesh.castShadow = false;
    return { mesh, samples };
  }

  buildPaths() {
    if (this.area.layout) {
      for (const road of this.area.layout.roads) {
        this.paths.push(buildAuthoredRoad(this, road));
      }
      return;
    }
    const spawn = point(this.area.spawn);
    const center = { x: spawn.x * 0.1, z: spawn.z * 0.05 };
    const goals = [...values(this.area.exits), ...values(this.area.npcs), ...values(this.area.nodes), ...values(this.area.encounters)];
    this.paths.push(this.ribbon([spawn, { x: spawn.x * 0.55 + 1.6, z: spawn.z * 0.6 - 0.8 }, center], this.biome === 'village' ? 3.8 : 2.6, this.biome === 'abbey' ? 'terrain3' : 'path'));
    for (const item of goals) {
      const end = point(item);
      const bend = this.rng() * 3 - 1.5;
      this.paths.push(this.ribbon([center, { x: end.x * 0.48 + bend, z: end.z * 0.57 - bend }, end], item.target || item.to || item.targetArea ? 3.3 : 1.9, this.biome === 'abbey' ? 'terrain3' : 'path', 0.032));
    }
  }

  free(x, z, margin = 2.4) {
    if ((x / this.radiusX) ** 2 + (z / this.radiusZ) ** 2 > 0.99) return false;
    if (this.critical.some(p => Math.hypot(x - p.x, z - p.z) < margin + 1.5)) return false;
    if (this.paths.some(path => path.samples.some(p => Math.hypot(x - p.x, z - p.z) < margin))) return false;
    return true;
  }

  instance(geometry, material, transforms, colors) {
    if (!transforms.length) return null;
    const mesh = new T.InstancedMesh(geometry, typeof material === 'string' ? this.materials.get(material) : material, transforms.length);
    const object = new T.Object3D();
    transforms.forEach((t, index) => {
      object.position.set(t.x, t.y, t.z);
      object.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0);
      object.scale.set(t.sx ?? t.scale ?? 1, t.sy ?? t.scale ?? 1, t.sz ?? t.scale ?? 1);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
      if (colors) mesh.setColorAt(index, colors[index]);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    this.areaGroup.add(mesh);
    return mesh;
  }

  buildLandscape() {
    const trees = [], crowns = [], rocks = [], grasses = [], rockColors = [], crownColors = [];
    const count = this.theme === 'grass' ? 15 : this.biome === 'village' ? 24 : this.biome === 'abbey' ? 16 : 88;
    for (let attempt = 0; attempt < count * 9 && trees.length < count; attempt++) {
      const angle = this.rng() * TAU, radius = Math.sqrt(this.rng()) * 0.98;
      const x = Math.cos(angle) * this.radiusX * radius, z = Math.sin(angle) * this.radiusZ * radius;
      if (!this.free(x, z, 3.2) || trees.some(p => Math.hypot(p.x - x, p.z - z) < 3.8)) continue;
      const h = 4.8 + this.rng() * 4.8, s = 0.65 + this.rng() * 0.55;
      const y = this.height(x, z);
      trees.push({ x, y: y + h / 2, z, sx: s, sy: h, sz: s, rz: (this.rng() - 0.5) * 0.12 });
      const dead = this.biome === 'marsh' && this.rng() < 0.42;
      for (let crown = 0; crown < (dead ? 1 : 3); crown++) {
        const a = crown * 2.4 + this.rng();
        crowns.push({ x: x + Math.cos(a) * s * 1.3, y: y + h - 0.4 + crown * 0.6, z: z + Math.sin(a) * s * 1.2, sx: s * (dead ? 1.1 : 2.8), sy: s * (dead ? 0.45 : 1.7), sz: s * (dead ? 1.1 : 2.6), ry: a });
        crownColors.push(new T.Color().setHSL(0.24 + this.rng() * 0.065, 0.2 + this.rng() * 0.13, dead ? 0.22 : 0.72 + this.rng() * 0.23));
      }
    }
    this.instance(this.geometry('tree-trunk', () => new T.CylinderGeometry(0.2, 0.42, 1, 7)), 'bark', trees);
    this.instance(this.geometry('tree-crown', () => new T.IcosahedronGeometry(1, 1)), 'leaves', crowns, crownColors);
    for (let i = 0; i < 170; i++) {
      const angle = this.rng() * TAU, radial = 0.45 + this.rng() * 0.57;
      const x = Math.cos(angle) * this.radiusX * radial, z = Math.sin(angle) * this.radiusZ * radial;
      if (!this.free(x, z, 1.2)) continue;
      const scale = 0.28 + this.rng() * 0.9;
      rocks.push({ x, y: this.height(x, z) + scale * 0.2, z, sx: scale * 1.4, sy: scale * 0.7, sz: scale, rx: this.rng(), ry: this.rng() * TAU });
      rockColors.push(new T.Color().setScalar(0.74 + this.rng() * 0.32));
    }
    for (let i = 0; i < 500; i++) {
      const x = (this.rng() * 2 - 1) * this.radiusX, z = (this.rng() * 2 - 1) * this.radiusZ;
      if (!this.free(x, z, 1.2)) continue;
      const h = (this.biome === 'marsh' ? 0.65 : 0.25) + this.rng() * 0.55;
      grasses.push({ x, y: this.height(x, z) + h / 2, z, sx: 0.15 + this.rng() * 0.25, sy: h, sz: 0.15 + this.rng() * 0.2, ry: this.rng() * TAU, rz: (this.rng() - 0.5) * 0.3 });
    }
    this.instance(this.geometry('rock', () => new T.DodecahedronGeometry(1, 0)), 'cliff', rocks, rockColors);
    this.instance(this.geometry('grass', () => new T.ConeGeometry(0.45, 1, 3)), 'grass', grasses);
    if (this.biome === 'village') this.village();
    if (this.biome === 'forest' || this.biome === 'marsh') this.stream();
    if (this.theme === 'quarry') this.quarry();
    else if (this.theme === 'grass') this.fields();
    else if (this.biome === 'abbey') {
      this.abbey();
      if (this.theme === 'archive') this.archive();
      if (this.theme === 'fortress') this.fortress();
    }
    this.buildAtmosphere();
  }

  module(name, x, z, scale = 1, angle = 0, parent = this.areaGroup) {
    const source = this.assets.environment?.scene.getObjectByName(name);
    if (!source) return null;
    const object = source.clone(true);
    object.position.set(x, this.height(x, z), z);
    object.rotation.y = angle;
    object.scale.multiplyScalar(scale);
    parent.add(object);
    return object;
  }

  /** Keep the complete rotated solid footprint beyond the model's sqrt(.9) ellipse. */
  perimeter(group, halfWidth, halfDepth) {
    const oldX = group.position.x, oldZ = group.position.z;
    const lift = group.position.y - this.height(oldX, oldZ);
    const angle = group.rotation.y, cosine = Math.cos(angle), sine = Math.sin(angle);
    const hw = halfWidth * group.scale.x, hd = halfDepth * group.scale.z;
    const offsets = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => ({ x: (x * cosine + z * sine) / this.radiusX, z: (-x * sine + z * cosine) / this.radiusZ }));
    let ux = oldX / this.radiusX, uz = oldZ / this.radiusZ;
    const length = Math.hypot(ux, uz);
    if (length < 0.001) { ux = 0; uz = -1; } else { ux /= length; uz /= length; }
    const nearestRadius = radius => {
      const corners = offsets.map(p => ({ x: ux * radius + p.x, z: uz * radius + p.z }));
      let nearest = Infinity;
      for (let i = 0; i < corners.length; i++) {
        const a = corners[i], b = corners[(i + 1) % corners.length];
        const dx = b.x - a.x, dz = b.z - a.z;
        const t = T.MathUtils.clamp(-(a.x * dx + a.z * dz) / (dx * dx + dz * dz), 0, 1);
        nearest = Math.min(nearest, Math.hypot(a.x + dx * t, a.z + dz * t));
      }
      return nearest;
    };
    let lower = Math.max(0.98, length), upper = lower;
    if (nearestRadius(upper) < 0.98) {
      while (nearestRadius(upper) < 0.98) upper += 0.15;
      for (let i = 0; i < 26; i++) {
        const middle = (lower + upper) * 0.5;
        if (nearestRadius(middle) < 0.98) lower = middle; else upper = middle;
      }
    }
    group.position.set(ux * upper * this.radiusX, 0, uz * upper * this.radiusZ);
    group.position.y = this.height(group.position.x, group.position.z) + lift;
    this.perimeterApron(group.position.x, group.position.z, hw, hd, angle);
    return group;
  }

  /** Nonwalkable scenery has its own organic terrain lobe and a descending foundation. */
  perimeterApron(cx, cz, hw, hd, angle) {
    const segments = 48, positions = [cx, this.height(cx, cz) + 0.014, cz], uvs = [cx / 5.5, cz / 5.5], indices = [];
    const sidePositions = [], sideUVs = [], sideIndices = [];
    const padding = 2.7;
    let rx = hw + padding, rz = hd + padding;
    const cornerRadius = Math.hypot(hw / rx, hd / rz);
    if (cornerRadius > 0.94) { rx *= cornerRadius / 0.94; rz *= cornerRadius / 0.94; }
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * TAU;
      const variation = 1 + Math.sin(a * 5 + this.seedPhase) * 0.022;
      const px = Math.cos(a) * rx * variation, pz = Math.sin(a) * rz * variation;
      const x = cx + px * cosine + pz * sine, z = cz - px * sine + pz * cosine;
      const y = this.height(x, z) + 0.014;
      positions.push(x, y, z);
      uvs.push(x / 5.5, z / 5.5);
      sidePositions.push(x, y - 0.02, z, cx + (x - cx) * 0.94, -4.8, cz + (z - cz) * 0.94);
      sideUVs.push(i * 0.2, 1, i * 0.2, 0);
      if (i < segments) {
        indices.push(0, i + 2, i + 1);
        sideIndices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 2, i * 2 + 3, i * 2 + 1);
      }
    }
    for (const [p, uv, index, material] of [[positions, uvs, indices, `terrain${this.terrainTile}`], [sidePositions, sideUVs, sideIndices, 'cliff']]) {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(p, 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const mesh = this.mesh(geometry, material, this.areaGroup, 0, 0, 0, true);
      mesh.castShadow = material === 'cliff';
    }
  }

  house(x, z, angle, scale = 1, ruined = false) {
    const group = new T.Group();
    group.position.set(x, this.height(x, z), z);
    group.rotation.y = angle;
    group.scale.setScalar(scale);
    this.areaGroup.add(group);
    this.perimeter(group, 2.95, 2.95);
    this.box(5.2, 0.45, 5, 'ruin', group, 0, 0.15, 0);
    this.box(4.6, ruined ? 1.65 : 3.8, 4.5, 'wall', group, 0, ruined ? 1 : 2.1, 0);
    for (const px of [-2.24, 2.24]) for (const pz of [-2.24, 2.24]) this.box(0.2, ruined ? 2.2 : 4, 0.2, 'wood', group, px, ruined ? 1.1 : 2.1, pz);
    this.box(4.65, 0.2, 4.55, 'wood', group, 0, ruined ? 1.8 : 3.7, 0);
    if (!ruined) {
      for (const side of [-1, 1]) {
        const roof = this.box(3.45, 0.22, 5.5, 'roof', group, side * 1.3, 4.55, 0);
        roof.rotation.z = -side * 0.56;
      }
      this.box(0.65, 2.2, 0.7, 'ruin', group, 1.3, 5.15, -1.2);
      this.box(0.87, 0.18, 0.9, 'dark', group, 1.3, 6.25, -1.2);
    }
    this.box(1.15, 2.35, 0.12, 'dark', group, 0, 1.38, 2.29);
    this.box(0.1, 2.5, 0.18, 'wood', group, -0.66, 1.45, 2.34);
    this.box(0.1, 2.5, 0.18, 'wood', group, 0.66, 1.45, 2.34);
    this.box(1.4, 0.14, 0.2, 'wood', group, 0, 2.72, 2.34);
    for (const px of [-1.45, 1.45]) {
      this.box(0.7, 0.93, 0.12, 'dark', group, px, 2.25, 2.28);
      this.box(0.06, 0.98, 0.2, 'gold', group, px, 2.25, 2.35);
      this.box(0.78, 0.07, 0.2, 'wood', group, px, 2.25, 2.35);
    }
    return group;
  }

  village() {
    const locations = [[-0.57, -0.48, 0.46, 1.15], [0.58, -0.4, -0.7, 0.95], [-0.7, 0.12, 0.9, 0.85], [0.66, 0.29, -0.9, 1.05], [0.03, -0.72, 0.15, 1.1]];
    for (const [x, z, angle, scale] of locations) this.house(x * this.radiusX, z * this.radiusZ, angle, scale);
    const wellX = -this.radiusX * 0.24, wellZ = this.radiusZ * 0.1;
    const well = new T.Group();
    well.position.set(wellX, this.height(wellX, wellZ), wellZ);
    this.areaGroup.add(well);
    this.perimeter(well, 1.75, 1.7);
    this.cylinder(1.45, 1.55, 0.85, 'ruin', well, 0, 0.35, 0, 16);
    this.cylinder(1.04, 1.04, 0.08, 'water', well, 0, 0.81, 0, 16);
    for (const side of [-1, 1]) this.box(0.18, 3.1, 0.18, 'wood', well, side * 1.4, 1.6, 0);
    this.box(3.4, 0.15, 1.8, 'wood', well, 0, 3.16, 0);
    for (const [x, z] of [[0.27, 0.48], [-0.28, -0.46]]) {
      const stall = new T.Group();
      stall.position.set(this.radiusX * x, this.height(this.radiusX * x, this.radiusZ * z), this.radiusZ * z);
      stall.rotation.y = x > 0 ? -0.4 : 0.3;
      this.areaGroup.add(stall);
      this.perimeter(stall, 1.95, 1.4);
      for (const side of [-1, 1]) this.box(0.13, 2.7, 0.13, 'wood', stall, side * 1.65, 1.3, 0);
      const awning = this.box(3.8, 0.12, 2.3, x > 0 ? 'cloth' : 'teal', stall, 0, 2.7, 0);
      awning.rotation.x = 0.15;
      this.box(3.2, 0.9, 1.1, 'wood', stall, 0, 0.5, 0);
      for (let i = 0; i < 4; i++) this.cylinder(0.18, 0.2, 0.3, i % 2 ? 'ivory' : 'gold', stall, -1.1 + i * 0.7, 1.07, 0, 7);
    }
  }

  stream() {
    const x = -this.radiusX * 0.52;
    const points = [{ x: x - 3, z: -this.radiusZ * 0.84 }, { x: x + 2, z: -this.radiusZ * 0.48 }, { x: x - 1.5, z: 0 }, { x: x + 3.5, z: this.radiusZ * 0.47 }, { x: x + 6, z: this.radiusZ * 0.81 }];
    const width = this.biome === 'marsh' ? 5 : 2.7;
    this.ribbon(points, width + 2.6, 'bank', 0.034);
    const river = this.ribbon(points, width, 'water', 0.045);
    this.animations.push({ kind: 'water', object: river.mesh });
    if (this.biome === 'forest') {
      const bridge = new T.Group();
      bridge.position.set(x - 1.4, this.height(x - 1.4, 0) + 0.18, 0);
      this.areaGroup.add(bridge);
      for (let i = 0; i < 13; i++) this.box(0.42, 0.14, 2.7, 'wood', bridge, (i - 6) * 0.42, Math.sin(i / 12 * Math.PI) * 0.18, 0);
      for (const side of [-1, 1]) {
        this.box(5.5, 0.13, 0.13, 'wood', bridge, 0, 0.95, side * 1.28);
        for (const px of [-2.6, 0, 2.6]) this.box(0.15, 1.2, 0.15, 'wood', bridge, px, 0.5, side * 1.28);
      }
    } else {
      for (const [px, pz, scale] of [[0.57, -0.45, 0.8], [0.6, 0.46, 0.62]]) this.house(px * this.radiusX, pz * this.radiusZ, -0.6, scale, true);
    }
  }

  abbey() {
    const rz = this.radiusZ, rx = this.radiusX;
    const apseArch = this.module('Arch', 0, -rz * 0.53, 1.55);
    if (apseArch) this.perimeter(apseArch, 6, 3);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) this.module('Pillar', side * rx * 0.45, (i - 1) * rz * 0.43, i === 0 ? 1.25 : 0.95);
      const wall = this.box(1.3, 3.1, rz * 1.15, 'ruin', this.areaGroup, side * rx * 0.72, 1.4, -rz * 0.14);
      wall.rotation.y = side * 0.07;
      this.perimeter(wall, 0.65, rz * 0.575);
      for (let i = 0; i < 3; i++) {
        const piece = this.box(2.2, 0.5, 2, 'ruin', this.areaGroup, side * rx * 0.72 + (this.rng() - 0.5) * 2, 0.25, -rz * 0.5 + i * 4.8);
        piece.rotation.set(0.15, this.rng() * TAU, 0.12);
      }
      this.banner(side * rx * 0.42, -rz * 0.6, side * 0.15);
    }
    const apseAltar = this.module('Altar', 0, -rz * 0.73, 1.3);
    if (apseAltar) this.perimeter(apseAltar, 1.7, 1.1);
    for (const x of [-4.3, 4.3]) {
      const brazier = this.module('Brazier', x, -rz * 0.68, 1);
      if (brazier) this.perimeter(brazier, 0.9, 0.9);
    }
    const sign = this.mesh(this.geometry('sun-ring', () => new T.TorusGeometry(3.8, 0.055, 6, 80)), 'gold', this.areaGroup, 0, 0.07, -rz * 0.38);
    sign.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      const spoke = this.box(0.08, 0.04, 0.75, 'gold', this.areaGroup, Math.sin(a) * 4.5, 0.07, -rz * 0.38 + Math.cos(a) * 4.5);
      spoke.rotation.y = a;
    }
  }

  banner(x, z, angle = 0) {
    const group = new T.Group();
    group.position.set(x, this.height(x, z), z);
    group.rotation.y = angle;
    this.areaGroup.add(group);
    this.cylinder(0.05, 0.07, 5.8, 'gold', group, 0, 2.8, 0, 7);
    this.box(1.9, 0.07, 0.08, 'gold', group, 0.75, 5.3, 0);
    const cloth = this.box(1.45, 2.5, 0.045, 'cloth', group, 0.75, 3.95, 0);
    this.animations.push({ kind: 'banner', object: cloth, phase: this.rng() * TAU });
    const emblem = this.mesh(this.geometry('banner-sun', () => new T.TorusGeometry(0.27, 0.038, 6, 24)), 'gold', group, 0.75, 4.2, 0.035);
    emblem.castShadow = false;
  }

  buildAtmosphere() {
    const positions = [];
    for (let i = 0; i < 125; i++) positions.push((this.rng() * 2 - 1) * this.radiusX, 0.3 + this.rng() * 5, (this.rng() * 2 - 1) * this.radiusZ);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    this.areaGeometries.add(geometry);
    if (!this.materials.has('dust')) this.materials.set('dust', new T.PointsMaterial({ color: 0xd9c99b, size: 0.045, transparent: true, opacity: 0.45, depthWrite: false }));
    const dust = new T.Points(geometry, this.materials.get('dust'));
    this.areaGroup.add(dust);
    this.animations.push({ kind: 'dust', object: dust });
  }

  quarry() {
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI * 0.9 + i / 10 * Math.PI * 1.65;
      const x = Math.cos(a) * this.radiusX * 0.82, z = Math.sin(a) * this.radiusZ * 0.82;
      const rock = this.mesh(this.geometry('quarry-ridge', () => new T.DodecahedronGeometry(1, 1)), 'ruin', this.areaGroup, x, 1.5 + i % 3, z);
      rock.scale.set(4 + i % 3, 3.2 + i % 4, 4.5);
      rock.rotation.y = a;
      this.perimeter(rock, 1, 1);
    }
    const crane = new T.Group();
    crane.position.set(this.radiusX * 0.45, 0, -this.radiusZ * 0.45);
    crane.rotation.y = -0.4;
    this.areaGroup.add(crane);
    for (const x of [-2.3, 2.3]) this.box(0.4, 8.5, 0.4, 'wood', crane, x, 4.1, 0);
    this.box(7.8, 0.45, 0.5, 'wood', crane, 0, 8.3, 0);
    const brace = this.box(0.25, 6, 0.3, 'wood', crane, 0, 5.6, 0);
    brace.rotation.z = 0.65;
    this.cylinder(0.035, 0.035, 7, 'dark', crane, 2.8, 4.5, 0, 6);
    this.box(2.8, 0.2, 2.5, 'wood', crane, 2.8, 1.2, 0);
    this.house(-this.radiusX * 0.59, -this.radiusZ * 0.38, 0.6, 0.8, true);
    for (let i = 0; i < 5; i++) {
      const cart = new T.Group();
      cart.position.set(-this.radiusX * 0.4 + i * 6, 0.15, this.radiusZ * 0.65 + Math.sin(i) * 1.7);
      cart.rotation.y = 0.12 * i;
      this.areaGroup.add(cart);
      this.perimeter(cart, 1.15, 1.05);
      this.box(2.1, 0.85, 1.5, 'steel', cart, 0, 0.65, 0);
      for (const x of [-0.65, 0.65]) for (const z of [-0.83, 0.83]) {
        const wheel = this.cylinder(0.38, 0.38, 0.17, 'dark', cart, x, 0.32, z, 10);
        wheel.rotation.x = Math.PI / 2;
      }
    }
  }

  fields() {
    const stalks = [], colors = [];
    for (let i = 0; i < 2200; i++) {
      const a = this.rng() * TAU, r = Math.sqrt(this.rng()) * 0.92;
      const x = Math.cos(a) * this.radiusX * r, z = Math.sin(a) * this.radiusZ * r;
      // Clumps follow the curved field margins rather than a tile or crop grid.
      if (!this.free(x, z, 1.7) || Math.sin(z * 0.21 + Math.sin(x * 0.08) * 2.4) < -0.1) continue;
      const h = 0.6 + this.rng() * 0.55;
      stalks.push({ x, y: this.height(x, z) + h / 2, z, sx: 0.085, sy: h, sz: 0.085, rz: -0.15 + this.rng() * 0.2 });
      colors.push(new T.Color().setRGB(1, 0.77 + this.rng() * 0.22, 0.36 + this.rng() * 0.22));
    }
    this.instance(this.geometry('wheat', () => new T.ConeGeometry(1, 1, 5)), 'ivory', stalks, colors);
    this.house(this.radiusX * 0.63, this.radiusZ * 0.25, -0.8, 1.1);
    this.house(-this.radiusX * 0.6, -this.radiusZ * 0.47, 0.7, 0.95);
    this.stream();
    const wheel = new T.Group();
    wheel.position.set(-this.radiusX * 0.54, 2.1, -this.radiusZ * 0.55);
    this.areaGroup.add(wheel);
    this.perimeter(wheel, 0.8, 3.2);
    const ring = this.mesh(this.geometry('mill-ring', () => new T.TorusGeometry(2.8, 0.17, 7, 32)), 'wood', wheel);
    ring.rotation.y = Math.PI / 2;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU;
      const spoke = this.box(0.25, 5.4, 0.22, 'wood', wheel);
      spoke.rotation.x = a;
      const paddle = this.box(1.2, 0.55, 0.25, 'wood', wheel, 0, Math.cos(a) * 2.8, Math.sin(a) * 2.8);
      paddle.rotation.x = a;
    }
    this.animations.push({ kind: 'wheel', object: wheel });
  }

  archive() {
    const books = { cloth: [], ivory: [], teal: [] };
    for (const side of [-1, 1]) for (let row = 0; row < 4; row++) {
      const shelf = new T.Group();
      shelf.position.set(side * this.radiusX * 0.6, 0, (row - 1.5) * 10);
      shelf.rotation.y = side * -0.13;
      this.areaGroup.add(shelf);
      this.perimeter(shelf, 0.85, 3.15);
      shelf.updateMatrixWorld(true);
      this.box(1.4, 4.8, 6, 'wood', shelf, 0, 2.4, 0);
      for (let level = 0; level < 4; level++) {
        this.box(1.6, 0.13, 6.1, 'dark', shelf, 0, 0.6 + level * 1.1, 0);
        for (let book = 0; book < 10; book++) {
          const position = shelf.localToWorld(new T.Vector3(-side * 0.45, 1 + level * 1.1, -2.5 + book * 0.53));
          books[['cloth', 'ivory', 'teal'][book % 3]].push({ x: position.x, y: position.y, z: position.z, sx: 0.9, sy: 0.65 + (book % 3) * 0.09, sz: 0.35, rx: (book % 4 - 1) * 0.035, ry: shelf.rotation.y });
        }
      }
    }
    for (const [material, transforms] of Object.entries(books)) this.instance(this.geometry('book', () => new T.BoxGeometry(1, 1, 1)), material, transforms);
  }

  fortress() {
    for (const side of [-1, 1]) {
      const x = side * this.radiusX * 0.68, z = -this.radiusZ * 0.65;
      const tower = new T.Group();
      tower.position.set(x, this.height(x, z), z);
      this.areaGroup.add(tower);
      this.perimeter(tower, 4.15, 4.15);
      this.cylinder(3.6, 4, 10, 'ruin', tower, 0, 4.8, 0, 14);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        this.box(1.15, 1.3, 1, 'ruin', tower, Math.sin(a) * 3.3, 10.2, Math.cos(a) * 3.3);
      }
      this.house(side * this.radiusX * 0.63, this.radiusZ * 0.35, -side * 0.6, 0.85);
    }
    const gate = this.module('Arch', 0, -this.radiusZ * 0.72, 2.1);
    if (gate) this.perimeter(gate, 6, 3);
  }

  addProxy(group, definition, kind, radius = 1.3, height = 1.6) {
    const proxy = this.mesh(this.geometry(`proxy:${radius}:${height}`, () => new T.CylinderGeometry(radius, radius, height, 10)), 'proxy', group, 0, height / 2, 0);
    proxy.castShadow = proxy.receiveShadow = false;
    const item = { id: definition.id, kind, definition, group, proxy, ready: true };
    proxy.userData.interaction = item;
    this.interactables.push(item);
    return item;
  }

  ring(group, hostile = false, radius = 1.1) {
    const mesh = this.mesh(this.geometry(`ring:${radius}`, () => new T.RingGeometry(radius, radius + 0.055, 48)), hostile ? 'hostile' : 'marker', group, 0, 0.04, 0);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = false;
    return mesh;
  }

  buildInteractions() {
    for (const definition of values(this.area.exits)) {
      const group = new T.Group();
      group.position.set(definition.x, this.height(definition.x, definition.z), definition.z);
      const outward = Math.atan2(definition.x, definition.z);
      group.rotation.y = outward;
      this.areaGroup.add(group);
      const arch = this.assets.environment?.scene.getObjectByName('Arch')?.clone(true);
      if (arch) { arch.position.set(0, 0, 0); arch.scale.setScalar(0.75); group.add(arch); }
      else this.cylinder(0.35, 0.5, 3.7, 'ruin', group, -1.6, 1.8, 0);
      this.ring(group, false, 1.65);
      const glyph = this.mesh(this.geometry('exit-glyph', () => new T.OctahedronGeometry(0.18, 0)), 'ember', group, 0, 3.5, 0);
      const item = this.addProxy(group, definition, 'exit', 2, 3.7);
      item.glyph = glyph;
      this.animations.push({ kind: 'glyph', object: glyph, baseY: 3.5, phase: this.rng() * TAU });
    }
    for (const definition of values(this.area.nodes)) {
      const group = new T.Group();
      group.position.set(definition.x, this.height(definition.x, definition.z), definition.z);
      group.rotation.y = this.rng() * 0.5 - 0.25;
      this.areaGroup.add(group);
      const type = definition.type || 'inspect';
      const item = this.addProxy(group, definition, 'node', 1.35, 1.9);
      item.marker = this.ring(group, false, 1.15);
      if (type === 'chest') {
        this.box(1.7, 0.78, 1.1, 'wood', group, 0, 0.47, 0);
        item.lid = this.box(1.8, 0.21, 1.18, 'steel', group, 0, 0.98, 0);
        for (const x of [-0.63, 0.63]) this.box(0.11, 0.93, 1.14, 'gold', group, x, 0.52, 0);
        this.box(0.25, 0.28, 0.1, 'gold', group, 0, 0.73, 0.6);
      } else if (type === 'camp') {
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * TAU;
          const stone = this.mesh(this.geometry('camp-stone', () => new T.DodecahedronGeometry(0.3, 0)), 'ruin', group, Math.cos(a) * 0.9, 0.2, Math.sin(a) * 0.9);
          stone.scale.set(1.2, 0.65, 1);
        }
        for (const angle of [-0.7, 0.7]) { const log = this.cylinder(0.16, 0.19, 1.8, 'wood', group, 0, 0.25, 0, 7); log.rotation.set(Math.PI / 2, 0, angle); }
        const fire = this.mesh(this.geometry('fire', () => new T.IcosahedronGeometry(0.43, 0)), 'ember', group, 0, 0.72, 0);
        fire.scale.set(0.65, 1.7, 0.65);
        this.animations.push({ kind: 'fire', object: fire, phase: this.rng() * TAU });
        this.box(2.2, 0.16, 0.8, 'cloth', group, 1.8, 0.12, 0.6);
        this.cylinder(0.35, 0.4, 0.55, 'wood', group, -1.8, 0.25, 0.5, 9);
      } else if (type === 'puzzle') {
        this.cylinder(0.9, 1.1, 0.35, 'ruin', group, 0, 0.17, 0, 10);
        this.box(1.2, 1.2, 0.75, 'ruin', group, 0, 0.9, 0);
        for (const x of [-0.4, 0, 0.4]) {
          const lever = this.cylinder(0.055, 0.07, 0.6, 'gold', group, x, 1.65, 0.2, 6);
          lever.rotation.x = -0.45;
          this.mesh(this.geometry('lever-knob', () => new T.SphereGeometry(0.1, 8, 6)), 'gold', group, x, 1.95, 0.05);
        }
      } else {
        this.cylinder(0.8, 0.95, 0.22, 'ruin', group, 0, 0.1, 0, 9);
        this.cylinder(0.34, 0.5, 0.95, 'ruin', group, 0, 0.63, 0, 8);
        const book = this.box(0.95, 0.12, 0.7, 'ivory', group, 0, 1.15, 0);
        book.rotation.x = -0.18;
        this.box(0.035, 0.13, 0.73, 'gold', group, 0, 1.18, 0);
        const emblem = this.mesh(this.geometry('inspect-glyph', () => new T.OctahedronGeometry(0.12, 0)), 'ember', group, 0, 1.7, 0);
        this.animations.push({ kind: 'glyph', object: emblem, baseY: 1.7, phase: this.rng() * TAU });
      }
    }
    for (const definition of values(this.area.npcs)) {
      const partyId = values(Content.PARTY).find(member => definition.id.startsWith(member.id + '_'))?.id;
      const role = partyId || definition.id;
      const actor = this.createActor(`npc:${definition.id}`, roleLook(role)?.model || 'acolyte', { role, npc: true, model:definition.model, portrait: definition.portrait, animationSource: definition.animationSource, visual: definition.visual });
      actor.wrapper.position.set(definition.x, this.height(definition.x, definition.z), definition.z);
      actor.wrapper.rotation.y = Math.atan2(-definition.x, -definition.z) - (actor.sourceFrontYaw || 0);
      actor.definition = definition;
      actor.partyId = partyId;
      this.addProxy(actor.wrapper, definition, 'npc', 0.95, 2.5);
      actor.ring = this.ring(actor.wrapper, false, 0.85);
      this.play(actor, 'Idle');
    }
    for (const definition of values(this.area.encounters)) {
      const group = new T.Group();
      group.position.set(definition.x, this.height(definition.x, definition.z), definition.z);
      this.areaGroup.add(group);
      const item = this.addProxy(group, definition, 'encounter', definition.boss ? 1.9 : 1.5, definition.boss ? 3.7 : 2.4);
      item.marker = this.ring(group, true, definition.boss ? 1.85 : 1.4);
      const first = definition.enemies?.[0];
      const enemyId = typeof first === 'string' ? first : first?.kind || first?.id;
      const enemy = Content.ENEMIES?.[enemyId] || values(Content.ENEMIES).find(e => e.id === enemyId);
      const actor = this.createActor(`encounter:${definition.id}`, enemy?.kind || (definition.boss ? 'boss' : 'husk'), { hostile: true, enemyId, animationSource: enemy?.animationSource, visual: enemy?.visual });
      actor.wrapper.position.copy(group.position);
      actor.wrapper.rotation.y = Math.atan2(-definition.x, -definition.z) - (actor.sourceFrontYaw || 0);
      if (definition.stroll) actor.stroll = { definition, target: new T.Vector3(), time: .38 + (hash(definition.id) % 100) / 100 };
      item.actor = actor;
      this.play(actor, 'Idle');
    }
  }

  syncInteractions(state) {
    const partyIds = new Set(state.party?.map(member => member.id));
    for (const item of this.interactables) {
      const d = item.definition;
      let shown = item.kind === 'exit' ? true : visible(state, d);
      if (item.kind === 'encounter' && (hasId(state.defeated, d.id) || state.battle?.encounterId === d.id)) shown = false;
      if (d.forbidFlags?.some(id => flag(state, id))) shown = false;
      const actor = item.kind === 'npc' ? this.actors.get(`npc:${d.id}`) : item.actor;
      if (item.kind === 'npc' && actor?.partyId && partyIds.has(actor.partyId)) shown = false;
      item.ready = condition(state, d.requiresFlags || d.requires);
      item.group.visible = shown;
      item.proxy.visible = shown;
      if (actor) actor.wrapper.visible = shown;
      const used = (d.type === 'chest' && hasId(state.claimed, `node:${d.id}`)) || (d.flag && flag(state, d.flag));
      if (item.marker) item.marker.visible = !used;
      if (item.lid) { item.lid.rotation.x = used ? -0.9 : 0; if (!item.craftedLid) item.lid.position.y = used ? 1.18 : 0.98; }
      if (item.glyph) item.glyph.visible = item.ready;
    }
  }

  animatePatrol(actor, dt) {
    const patrol = actor.stroll, { definition: d, target } = patrol;
    patrol.time += dt;
    const [dx, dz, requestedPeriod] = d.stroll;
    const period = requestedPeriod > 0 ? requestedPeriod : 6.4 + (hash(d.id) % 28) * .1;
    const phase = TAU * patrol.time / period;
    const x = d.x + dx * Math.sin(phase), z = d.z + dz * Math.sin(phase), speed = Math.cos(phase);
    const safe = walkable(this.areaId, x, z), moving = Math.abs(speed) > .23 && safe;
    const yaw = moving ? Math.atan2(dx * speed, dz * speed) :
      actor.wrapper.rotation.y + (actor.sourceFrontYaw || 0);
    if (safe) target.set(x, this.walkHeight(x,z), z);
    else target.copy(actor.wrapper.position);
    actor.motionSpeed = moving ? Math.hypot(dx, dz) * TAU / period * Math.abs(speed) : 0;
    this.animate(actor, target, yaw, moving ? 'Walk' : 'Idle', 1, dt, this.justEnteredArea);
  }

  createActor(id, type, options = {}) {
    if (this.actors.has(id)) return this.actors.get(id);
    const template = this.assets[type] || this.assets.hero;
    const root = cloneSkeleton(template.scene);
    const ownMaterials = [];
    const role = String(options.role || '');
    const look = roleLook(role);
    const friendly = !!(options.npc || options.party);
    root.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      const cloneMaterial = original => {
        const material = original.clone();
        ownMaterials.push(material);
        if (look?.cloth && /Burgundy|Cloth/.test(original.name)) this.dyeCloth(material, look.cloth);
        if (look?.ivory && /Ivory|Tabard/.test(original.name)) this.dyeCloth(material, look.ivory);
        if (look?.trim && /Gold/.test(original.name)) { material.color.setHex(look.trim); material.metalness = type === 'acolyte' ? 0.46 : 0.73; material.roughness = type === 'acolyte' ? 0.55 : 0.43; }
        if (friendly && type === 'acolyte' && /Ember|Fire|Glow/.test(original.name)) {
          material.color.setHex(0xc5b788);
          material.emissive.setHex(0xc6ba91);
          material.emissiveIntensity = 0.035;
          material.roughness = 0.65;
          material.metalness = 0.25;
        }
        return material;
      };
      o.material = Array.isArray(o.material) ? o.material.map(cloneMaterial) : cloneMaterial(o.material);
    });
    const wrapper = new T.Group();
    const scale = look?.scale || 1;
    wrapper.scale.set(scale * (look?.width || 1), scale, scale);
    wrapper.add(root);
    this.actorGroup.add(wrapper);
    const mixer = new T.AnimationMixer(root), actions = {};
    for (const clip of template.animations || []) {
      const action = mixer.clipAction(clip);
      if (!['Idle', 'Walk', 'Run'].includes(clip.name)) { action.setLoop(T.LoopOnce, 1); action.clampWhenFinished = true; }
      actions[clip.name] = action;
    }
    const actor = { id, type, wrapper, root, mixer, actions, ownMaterials, current: null, options, pulseUntil: 0, reactionUntil: 0, lastHp: null, initialized: false };
    if (role) this.accessories(actor, role, !!options.npc);
    if (options.party) {
      actor.ring = this.ring(wrapper, false, 0.72);
      actor.ring.visible = false;
    }
    this.actors.set(id, actor);
    return actor;
  }

  dyeCloth(material, color) {
    material.color.setHex(color);
    material.roughness = 0.96;
    material.metalness = 0;
    // Keep the source woven texture; neutralize its burgundy dye before recoloring.
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D(map, vMapUv);
          float weave = clamp(dot(sampledDiffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722)) * 3.2 + 0.16, 0.16, 1.0);
          diffuseColor *= vec4(vec3(weave), sampledDiffuseColor.a);
        #endif
      `);
    };
    material.customProgramCacheKey = () => 'act1-friendly-woven-cloth-v1';
  }

  accessories(actor, role, npc) {
    const anchor = actor.root.getObjectByName('Spine') || actor.root;
    const accessory = new T.Group();
    accessory.position.set(0, 0.2, -0.29);
    anchor.add(accessory);
    if (/iona|severin/.test(role)) {
      this.box(0.52, 0.65, 0.18, 'teal', accessory, 0, 0.08, 0);
      for (const x of [-0.22, 0.22]) this.box(0.045, 0.67, 0.21, 'gold', accessory, x, 0.08, 0);
      this.cylinder(0.085, 0.085, 1.1, 'ivory', accessory, 0.38, 0.15, 0, 8);
    } else if (/radan|dagan/.test(role)) {
      const crest = this.mesh(this.geometry('veteran-crest', () => new T.ConeGeometry(0.18, 0.6, 5)), 'cloth', actor.root.getObjectByName('Head') || accessory, 0, 0.45, 0);
      crest.scale.z = 0.3;
    } else if (/leia|elda/.test(role)) {
      this.box(0.66, 0.48, 0.18, 'ivory', accessory, 0, -0.03, 0);
      this.box(0.09, 0.29, 0.19, 'gold', accessory, 0, -0.03, -0.03);
      this.box(0.29, 0.09, 0.19, 'gold', accessory, 0, -0.03, -0.04);
      this.cylinder(0.13, 0.15, 0.32, 'gold', accessory, 0.4, -0.2, 0, 8);
    } else if (/orin/.test(role)) {
      this.box(0.58, 0.72, 0.12, 'wood', accessory, 0, -0.07, 0);
      this.box(0.65, 0.15, 0.23, 'steel', accessory, 0.25, 0.5, -0.05);
      this.cylinder(0.055, 0.055, 0.9, 'wood', accessory, 0.25, 0.17, 0, 6);
      this.box(0.6, 0.88, 0.06, 'wood', anchor, 0, -0.15, 0.31);
    } else if (/teren/.test(role)) {
      this.box(0.6, 0.72, 0.24, 'wood', accessory, 0, -0.1, 0);
      this.cylinder(0.17, 0.19, 0.42, 'gold', accessory, 0.4, -0.25, 0, 8);
      this.box(0.16, 0.27, 0.17, 'ivory', accessory, 0.4, -0.2, -0.02);
    } else if (/lio/.test(role)) {
      this.box(0.72, 0.24, 0.38, 'ivory', anchor, 0, 0.25, 0);
      this.box(0.44, 0.55, 0.15, 'cloth', accessory, 0, -0.13, 0);
    } else if (/gerd/.test(role)) {
      const oar = this.cylinder(0.045, 0.05, 2.25, 'wood', accessory, 0.18, 0.05, 0, 6);
      oar.rotation.z = -0.28;
      const blade = this.box(0.3, 0.58, 0.065, 'wood', accessory, 0.47, 1.05, 0);
      blade.rotation.z = -0.28;
      this.cylinder(0.22, 0.2, 0.34, 'gold', accessory, -0.3, -0.23, 0, 8);
    } else if (/nara/.test(role)) {
      const basket = this.cylinder(0.33, 0.25, 0.42, 'wood', anchor, 0.3, -0.3, 0.32, 10);
      basket.scale.z = 0.75;
      const handle = this.mesh(this.geometry('basket-handle', () => new T.TorusGeometry(0.24, 0.025, 5, 16, Math.PI)), 'wood', anchor, 0.3, -0.09, 0.32);
      handle.castShadow = false;
    } else if (/velda/.test(role)) {
      const pendant = this.mesh(this.geometry('elder-pendant', () => new T.TorusGeometry(0.12, 0.025, 5, 20)), 'gold', anchor, 0, 0.14, 0.31);
      pendant.castShadow = false;
      this.box(0.45, 0.58, 0.16, 'ivory', accessory, 0, -0.12, 0);
    } else if (/mirel/.test(role)) {
      const bow = this.mesh(this.geometry('hunter-bow', () => new T.TorusGeometry(0.53, 0.035, 5, 20, Math.PI)), 'wood', accessory, 0.3, 0, -0.05);
      bow.rotation.z = 0.3;
      this.cylinder(0.12, 0.12, 0.7, 'wood', accessory, -0.25, 0, 0, 7);
    } else if (npc) {
      this.box(0.55, 0.65, 0.22, 'wood', accessory, 0, 0, 0);
      const hat = actor.root.getObjectByName('Head');
      if (hat) this.cylinder(0.33, 0.4, 0.16, /velda|severin/.test(role) ? 'ivory' : 'teal', hat, 0, 0.26, 0, 9);
    }
  }

  play(actor, name, restart = false) {
    if (!actor.actions[name]) name = name === 'Cast' ? (actor.actions.Attack ? 'Attack' : 'Idle') : name === 'Walk' ? (actor.actions.Run ? 'Run' : 'Idle') : 'Idle';
    if (actor.current === name && !restart) return;
    const action = actor.actions[name];
    if (!action) return;
    const previousAction = actor.actions[actor.current];
    const gaitPhase = ['Walk','Run'].includes(actor.current) && previousAction?.getClip ? (previousAction.time / previousAction.getClip().duration) % 1 : null;
    const looping = ['Idle','Walk','Run'].includes(name);
    const blend = name==='Idle'&&gaitPhase!==null ? .16 : transitionBlend(actor.current, name);
    actor.actions[actor.current]?.fadeOut(blend);
    action.reset();
    if (looping) {
      const timing=loopTiming(actor.id,name,action.getClip().duration,this.time,actor.motionSpeed||0);
      const keepPlantPhase = actor.partyGait && !actor.battleControlled && gaitPhase !== null && name !== 'Idle';
      const entryPhase = keepPlantPhase ? gaitPhase : gaitEntryPhase(actor,name,actor.current,gaitPhase,timing.phase/action.getClip().duration);
      action.time = entryPhase * action.getClip().duration;
      action.setEffectiveTimeScale(gaitRate(actor,name,action.getClip().duration,timing.rate));
    } else action.setEffectiveTimeScale(combatPlaybackRate(name,action.getClip().duration,actor.presentationTiming));
    action.fadeIn(blend).play();
    actor.current = name;
  }

  animate(actor, target, angle, desiredAnimation, hp, dt, snap = false) {
    const activeAim = this.time < Math.max(actor.pulseUntil || 0, actor.lungeUntil || 0);
    const aimedActor = activeAim && actor.actionTargetId ? this.actors.get(actor.actionTargetId) : null;
    if (aimedActor?.wrapper.visible && aimedActor !== actor) angle = facingToward(target, aimedActor.wrapper.position, angle);
    const awaitingRevive = this.pendingReviveActors?.has(actor.id);
    const dying = awaitingRevive || hp <= 0 && this.time >= (actor.deathAt || 0) && !this.unreadDeathActors?.has(actor.id);
    const restoredCorpse = !actor.initialized && dying && !(actor.deathAt > 0);
    if (!dying) { actor.deathFacingYaw = null; actor.deathPosition = null; actor.restoredCorpse = false; }
    else if (!Number.isFinite(actor.deathFacingYaw)) actor.deathFacingYaw = actor.initialized ? actor.wrapper.rotation.y : angle - (actor.sourceFrontYaw || 0);
    if (dying && actor.initialized && !actor.deathPosition) actor.deathPosition = actor.wrapper.position.clone();
    const timing = actor.presentationTiming;
    const age = this.time - actor.actionAt;
    const travel = !dying && this.time < actor.lungeUntil ? meleeTravel(age,timing) : null;
    if ((travel==='back'||travel==='turn')&&actor.lungeDirection) {
      angle=Math.atan2(-actor.lungeDirection.x,-actor.lungeDirection.z);
    }
    const placement = dying && actor.deathPosition ? actor.deathPosition : target;
    const yaw = dying ? actor.deathFacingYaw : wrapFacing(angle - (actor.sourceFrontYaw || 0));
    if (!actor.initialized || snap) { actor.wrapper.position.copy(placement); actor.wrapper.rotation.y = yaw; actor.initialized = true; }
    else {
      if(actor.followControlled || actor.battleControlled || dying)actor.wrapper.position.copy(placement);
      else actor.wrapper.position.lerp(placement, 1 - Math.exp(-dt * 11));
      const delta = wrapFacing(yaw - actor.wrapper.rotation.y), turnRate = travel==='turn'||activeAim ? 12 : 5.5;
      actor.wrapper.rotation.y = dying ? yaw : wrapFacing(actor.wrapper.rotation.y + T.MathUtils.clamp(delta, -dt * turnRate, dt * turnRate));
    }
    if (!dying && this.time < actor.lungeUntil && actor.lungeDirection) {
      const distance=actionLunge(age,timing,actor.lungeDistance);
      actor.wrapper.position.addScaledVector(actor.lungeDirection,distance);
      if(travel&&travel!=='turn'){
        const priorDistance=actionLunge(age-Math.max(dt,.01),timing,actor.lungeDistance);
        actor.motionSpeed=Math.abs(distance-priorDistance)/Math.max(dt,.01);
      }
    }
    if (!dying && actor.battleControlled && this.time < actor.reactionUntil && actor.recoil) {
      actor.wrapper.position.addScaledVector(actor.recoil,
        this.reducedMotion ? 0 : impactRecoil(this.time - actor.reactionAt, actor.reactionUntil - actor.reactionAt, actor.recoilStrength));
    }
    if (!dying && actor.battleControlled) actor.wrapper.position.y = this.height(actor.wrapper.position.x, actor.wrapper.position.z);
    const animation = dying ? 'Death' : this.time < actor.reactionUntil ? 'Hit' :
      travel ? (travel==='turn' ? 'Idle' : gaitForSpeed(actor.motionSpeed,actor.current)) :
      this.time < actor.pulseUntil ? actor.pulseAnimation : desiredAnimation;
    if (dying && !actor.deathPosition) actor.deathPosition = actor.wrapper.position.clone();
    this.play(actor, animation);
    if (restoredCorpse && actor.current === 'Death') {
      const death = actor.actions.Death;
      if (death?.getClip) {
        for (const other of new Set(Object.values(actor.actions))) if (other !== death) other.stop?.();
        death.stopFading?.(); death.setEffectiveWeight(1); death.time = death.getClip().duration; death.paused = true;
        actor.restoredCorpse = true; actor.mixer.update(0);
      }
    }
    const presentedDead = dying && actor.current === 'Death';
    if (presentedDead && !actor.presentedDead) this.magicVfx?.cancelSource?.(actor);
    actor.presentedDead = presentedDead;
    if(['Idle','Walk','Run'].includes(actor.current)) {
      const action=actor.actions[actor.current],timing=loopTiming(actor.id,actor.current,action.getClip().duration,this.time,actor.motionSpeed||0);
      action.setEffectiveTimeScale(gaitRate(actor,actor.current,action.getClip().duration,timing.rate));
    }
    const sampleTime = advancePaintedPose(actor, dt, this.time);
    actor.poseSampled = sampleTime !== null;
    if (sampleTime !== null && actor.current === 'Hit' && Number.isFinite(actor.reactionAt)) {
      const action = actor.actions.Hit;
      if (action?.getClip) { action.time = reactionPhase(sampleTime, actor.reactionAt, COMBAT_MOTION.reaction) * action.getClip().duration; actor.mixer.update(0); }
    }
    if (sampleTime !== null && !dying && actor.presentationTiming && actor.current === actor.pulseAnimation && sampleTime <= actor.pulseUntil) {
      const action = actor.actions[actor.current];
      if (action?.getClip) {
        const age = paintedActionAge(sampleTime, actor.actionAt, actor.presentationTiming);
        action.time = actionClipPhase(age, actor.presentationTiming) * action.getClip().duration;
        actor.mixer.update(0);
      }
    }
    actor.lastHp = hp;
    return sampleTime;
  }

  constrainFollower(position) {
    if(walkable(this.areaId,position.x,position.z))return {...position};
    const land = nearestLand(this.area.layout, position, 6) || point(this.state?.position || this.area.spawn);
    return {...position, ...land};
  }

  syncParty(state, dt, battle) {
    const party = battle ? state.party || [] : (state.party || []).filter(member => member.hp > 0);
    const position = point(state.position || state.hero || this.area.spawn);
    const angle = Number(state.angle ?? state.hero?.angle ?? Math.PI);
    const context=state.runId+':'+this.areaId+':'+(battle?'battle':'explore');
    let reset=this.motionContext!==context||this.justEnteredArea||this.enteringBattle;
    if(!battle) {
      if(reset||!this.partyTrail){this.partyTrail=new PartyTrail(p=>this.constrainFollower(p));this.partyTrail.reset(position,angle);}
      reset=this.partyTrail.record(position,angle)||reset;
      this.partyTrail.retain(party.slice(1).map(member=>member.id));
    }
    this.motionContext=context;
    const leaderSpeed=!reset&&dt>0&&this.lastPosition?Math.hypot(position.x-this.lastPosition.x,position.z-this.lastPosition.z)/dt:0;
    for (let index = 0; index < party.length; index++) {
      const member = party[index];
      const actor = this.createActor(`party:${member.id}`, roleLook(member.id)?.model || 'hero', { role: member.id, party: true });
      actor.wrapper.visible = true;
      let x = position.x, z = position.z, facing = angle,animation=gaitForSpeed(leaderSpeed, actor.current);
      actor.followControlled=!battle&&index>0;
      actor.battleControlled=!!battle;
      actor.motionSpeed=battle?0:leaderSpeed;
      if (battle) {
        const slot = battleFormation('party', index, party.length);
        x = this.battleCenter.x + slot.x;
        z = this.battleCenter.z + slot.z;
        facing = oppositionFacing('party', { x, z }, battle.enemies || [], this.battleCenter);
        animation=state.battle?.status?.[member.id]?.guard>0?'Block':'Idle';
      } else if (index) {
        const follower=this.constrainFollower(this.partyTrail.step(member.id,index,dt));
        x=follower.x;z=follower.z;facing=follower.angle;animation=follower.animation;actor.motionSpeed=follower.speed;
      }
      const target = (this.actorTarget ||= new T.Vector3()).set(x, battle ? this.height(x, z) : this.walkHeight(x, z), z);
      this.animate(actor, target, facing, animation, member.hp, dt, reset);
      if (actor.ring) {
        actor.ring.visible = !!battle && state.battle?.activeHeroId === member.id && member.hp > 0;
        this.sizeActorRing(actor,1);
        actor.ring.rotation.z = this.reducedMotion ? 0 : this.time * 0.14;
      }
    }
    for (const [id, actor] of this.actors) if (id.startsWith('party:') && !party.some(member => id === `party:${member.id}`)) actor.wrapper.visible = false;
    this.lastPosition = position;
  }

  sizeActorRing(actor,pulse=1) {
    if(!actor.ring)return;
    const scale=actor.wrapper.scale;
    actor.ring.position.y=.045/Math.max(.001,Math.abs(scale.y));
    actor.ring.scale.set(pulse/Math.max(.001,Math.abs(scale.x)),pulse/Math.max(.001,Math.abs(scale.z)),1/Math.max(.001,Math.abs(scale.y)));
  }

  setCombatSelection({skillId=null,targetId=null,hoverTargetId=null,targetIds=[]}={}) {
    const clean=id=>typeof id==='string'?id.replace(/^enemy:/,''):null;
    const selectedIds=Array.isArray(targetIds)?[...new Set(targetIds.map(clean).filter(Boolean))]:[];
    this.combatSelection={skillId,targetId:clean(targetId),hoverTargetId:clean(hoverTargetId),targetIds:selectedIds};
  }

  updateCombatSelection(actor,unit) {
    const selected=this.combatSelection?.targetIds?.length?this.combatSelection.targetIds.includes(unit.uid):this.combatSelection?.targetId===unit.uid;
    const hovered=this.combatSelection?.hoverTargetId===unit.uid;
    if(!actor.selectionMarker) {
      const group=new T.Group();this.actorGroup.add(group);actor.selectionMarker=group;
      if(!this.materials.has('target-selected'))this.materials.set('target-selected',new T.MeshBasicMaterial({color:0x69f0dc,transparent:true,opacity:.95,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}));
      if(!this.materials.has('target-gold'))this.materials.set('target-gold',new T.MeshBasicMaterial({color:0xffdd83,transparent:true,opacity:.95,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}));
      const radius=actor.refreshHeight>3.5?1.45:1;
      const inner=this.mesh(this.geometry(`selection:${radius}`,()=>new T.RingGeometry(radius,radius+.105,64)),'target-selected',group);
      inner.rotation.x=-Math.PI/2;inner.renderOrder=24;inner.castShadow=inner.receiveShadow=false;
      const outer=this.mesh(this.geometry(`selection-gold:${radius}`,()=>new T.RingGeometry(radius+.18,radius+.22,64)),'target-gold',group,0,.008,0);
      outer.rotation.x=-Math.PI/2;outer.renderOrder=25;outer.castShadow=outer.receiveShadow=false;
      actor.selectionArrow=this.mesh(this.geometry('target-arrow',()=>new T.OctahedronGeometry(.16,0)),'target-gold',group,0,(actor.presentationHeight||actor.refreshHeight||2.8)+.8,0);
      actor.selectionArrow.renderOrder=25;actor.selectionArrow.castShadow=actor.selectionArrow.receiveShadow=false;
    }
    const marker=actor.selectionMarker;marker.visible=unit.hp>0&&(selected||hovered);
    marker.position.copy(actor.wrapper.position);marker.position.y+=.06;
    marker.scale.setScalar(selected?(this.reducedMotion?1:1+Math.sin(this.time*3.5)*.025):.91);
    actor.selectionArrow.visible=selected;
    actor.selectionArrow.rotation.y=this.reducedMotion?0:this.time*1.2;
  }

  syncBattle(state, dt) {
    const battle = state.battle;
    if (!battle) {
      for (const [id, actor] of this.actors) if (id.startsWith('enemy:')) actor.wrapper.visible = false;
      this.retireBattleActors();
      if (this.battleKey && !this.visualBattle && !this.cues?.length) this.clearBattleStage();
      this.battleKey = null;
      this.combatSelection={};
      for(const actor of this.actors.values())if(actor.selectionMarker)actor.selectionMarker.visible=false;
      return;
    }
    if (this.battleKey !== battle.encounterId) {
      const encounter = values(this.area.encounters).find(item => item.id === battle.encounterId);
      const center = point(encounter || state.position);
      center.x = T.MathUtils.clamp(center.x, -this.radiusX * 0.45, this.radiusX * 0.45);
      center.z = T.MathUtils.clamp(center.z, -this.radiusZ * 0.58, this.radiusZ * 0.58);
      this.battleCenter = center;
      this.battleKey = battle.encounterId;
      this.enteringBattle = true;
      this.buildBattleStage();
      this.timeline = this.time;
    }
    for (let index = 0; index < battle.enemies.length; index++) {
      const unit = battle.enemies[index];
      const definition = Content.ENEMIES[unit.kind] || values(Content.ENEMIES).find(enemy => enemy.id === unit.kind);
      const actor = this.createActor(`enemy:${unit.uid}`, definition?.kind || 'husk', { hostile: true, enemyId: definition?.id, animationSource: definition?.animationSource, visual: definition?.visual });
      actor.wrapper.visible = true;
      actor.battleControlled = true;
      if (!actor.battleLabel) {
        actor.battleLabel = new T.Sprite(this.battleLabelMaterial(index + 1));
        actor.battleLabel.position.y = (actor.refreshHeight || 2.8) + .35;
        actor.battleLabel.scale.set(0.85, 0.85, 1);
        actor.battleLabel.renderOrder = 20;
        actor.wrapper.add(actor.battleLabel);
      }
      actor.battleLabel.visible = unit.hp > 0;
      const labelScale=actor.wrapper.scale;
      actor.battleLabel.position.y=((actor.presentationHeight||actor.refreshHeight||2.8)+.35)/Math.max(.001,Math.abs(labelScale.y));
      actor.battleLabel.scale.set(.85/Math.max(.001,Math.abs(labelScale.x)),.85/Math.max(.001,Math.abs(labelScale.y)),1);
      actor.wrapper.userData.combatUid=unit.uid;
      const slot = battleFormation('enemy', index, battle.enemies.length);
      const x = this.battleCenter.x + slot.x, z = this.battleCenter.z + slot.z;
      const facing = oppositionFacing('enemy', { x, z }, state.party || [], this.battleCenter);
      this.animate(actor, (this.actorTarget ||= new T.Vector3()).set(x, this.height(x, z), z), facing, 'Idle', unit.hp, dt, this.justEnteredArea || this.enteringBattle);
      if (!actor.ring) actor.ring = this.ring(actor.wrapper, true, actor.type === 'boss' ? 1.25 : 0.85);
      actor.ring.visible = unit.hp > 0;
      this.sizeActorRing(actor,unit.intent === 'heavy' || unit.intent === 'all' ? 1.2 + (this.reducedMotion?0:Math.sin(this.time * 3) * 0.035) : 1);
      this.updateCombatSelection(actor,unit);
    }
    for (const [id, actor] of this.actors) if (id.startsWith('enemy:') && !battle.enemies.some(unit => id === `enemy:${unit.uid}`)) actor.wrapper.visible = false;
  }

  retireBattleActors() {
    // Effects may still reference the actors after the final death pose.
    if (this.visualBattle || this.cues?.length || this.magicVfx?.activeCount || this.magicVfx?.sequences?.length || this.time < (this.timeline || 0) + COMBAT_MOTION.finishPad) return;
    for (const [id, actor] of [...this.actors]) if (id.startsWith('enemy:')) this.destroyActor(actor);
  }

  clearBattleStage() {
    this.battleStage.traverse(object => { if (object.userData.stageGeometry) object.geometry.dispose(); });
    this.battleStage.clear();
    this.battleStage.visible = false;
  }

  buildBattleStage() {
    this.clearBattleStage();
    const center = this.battleCenter;
    const geometry = new T.PlaneGeometry(140,140,70,70);
    geometry.rotateX(-Math.PI/2);
    const positions = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i=0;i<positions.count;i++) {
      const x=positions.getX(i),z=positions.getZ(i);
      positions.setY(i,this.height(center.x+x,center.z+z));
      uv.setXY(i,x/5.5,z/5.5);
    }
    geometry.computeVertexNormals();
    const ground = this.mesh(geometry,`terrain${this.terrainTile}`,this.battleStage,center.x,0,center.z);
    ground.userData.stageGeometry = true; ground.castShadow = false;
    // Dressing stays behind the opponents: the party-to-enemy sight lines remain open.
    const rng=random(hash(this.areaId+':battle'));
    for(let i=-6;i<=6;i++) {
      const t=i*5.5,x=center.x+22+t*.45,z=center.z-13+t*.9;
      const hill=this.mesh(this.geometry('battle-hill',()=>{const g=new T.SphereGeometry(1,18,12),uv=g.attributes.uv;for(let n=0;n<uv.count;n++)uv.setXY(n,uv.getX(n)*8,uv.getY(n)*4);return g;}),`terrain${this.terrainTile}`,this.battleStage,x,-2,z);
      hill.scale.set(8+rng()*3,7+rng()*5,8+rng()*3);
    }
    for(let i=0;i<30;i++) {
      const x=center.x+10+rng()*20,z=center.z-20+rng()*39;
      const rock=this.mesh(this.geometry('battle-rock',()=>new T.DodecahedronGeometry(1,0)),'cliff',this.battleStage,x,this.height(x,z),z);
      rock.scale.set(1+rng()*2,.5+rng()*1.1,.8+rng()*1.3);rock.rotation.y=rng()*TAU;
      if (this.biome==='forest'||this.biome==='marsh'||this.biome==='village') {
        const h=5+rng()*4;
        this.cylinder(.18,.4,h,'bark',this.battleStage,x,this.height(x,z)+h/2,z);
        const crown=this.mesh(this.geometry('battle-crown',()=>new T.IcosahedronGeometry(1,1)),'leaves',this.battleStage,x,this.height(x,z)+h,z);
        crown.scale.set(2.5,1.9,2.4);
      } else if(i%3===0) {
        this.module(i%2?'Pillar':'Arch',x,z,.9+rng()*.5,rng()*.6,this.battleStage);
      }
    }
    // Low tufts around the edges join the textured ground without a visible tile grid.
    for(let i=0;i<100;i++) {
      const x=center.x+(rng()-.5)*32,z=center.z+(rng()-.5)*34;
      if(Math.abs(x-center.x)<8&&Math.abs(z-center.z)<8)continue;
      const grass=this.mesh(this.geometry('battle-grass',()=>new T.ConeGeometry(.3,.7,3)),'grass',this.battleStage,x,this.height(x,z)+.2,z);
      grass.rotation.y=rng()*TAU;grass.scale.y=.4+rng()*.6;
    }
  }

  eventActor(id) { return this.actors.get(`party:${id}`) || this.actors.get(`enemy:${id}`); }

  battleLabelMaterial(number) {
    const key = `battle-label:${number}`;
    if (!this.materials.has(key)) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 96;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#111923'; ctx.strokeStyle = '#e4c078'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(48, 48, 40, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      paintGildedLine(ctx,String(number),48,21,52,{align:'center',display:true});
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      const material = new T.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
      material.userData.battleLabelTexture = texture;
      this.materials.set(key, material);
    }
    return this.materials.get(key);
  }

  presentationEventFrame(events) {
    const previous = this.previousEvents, keys = events.map(event => JSON.stringify(event));
    let overlap = Math.min(keys.length, previous?.length || 0);
    while (overlap && !previous.slice(-overlap).every((key, index) => key === keys[index])) overlap--;
    return { events, previous, keys, fresh: previous ? events.slice(overlap) : [] };
  }

  readEvents(state) {
    const events = state.events || [];
    const frame = this.pendingEventFrame?.events === events && this.pendingEventFrame.previous === this.previousEvents ? this.pendingEventFrame : this.presentationEventFrame(events);
    const { keys, fresh } = frame;
    this.previousEvents = keys; this.pendingEventFrame = null; this.unreadDeathActors = null;
    let actionCue = null;
    const actionsBySource = new Map();
    const scheduleAction = (event, source) => {
      const start = Math.max(this.time, this.timeline || 0);
      const target=this.eventActor(event.targetId);
      const motion=combatMotionPolicy(event,source,target);
      const timing=meleeTiming(actionTimeline(event,source),motion);
      this.timeline = start + timing.spacing;
      this.lastActionStart = start;
      const cue = { at: start, timing, motion, kind: 'action', actor: source, event, targets: [], animation: event.kind === 'defend' ? 'Block' : event.kind === 'skill' || event.kind === 'item' ? 'Cast' : 'Attack' };
      // Guard skills intentionally emit no result events. Read their authored
      // targeting rule rather than inventing hit targets for damaging skills.
      const skill = Content.SKILLS[event.skillId];
      if (event.kind === 'defend' || skill?.target === 'self') cue.targets.push(source);
      else if (skill?.kind === 'guard' || skill?.kind === 'buff') {
        if (skill.target === 'allAllies') {
          const hostile = !!source.options.hostile;
          const friends = hostile ? (state.battle || this.visualBattle)?.enemies || [] : state.party || [];
          for (const unit of friends) {
            const actor = this.eventActor(unit.uid || unit.id);
            if (unit.hp > 0 && actor) cue.targets.push(actor);
          }
        } else {
          const target = this.eventActor(event.targetId);
          if (target) cue.targets.push(target);
        }
      }
      this.cues.push(cue);
      actionsBySource.set(event.actorId, cue);
      return cue;
    };
    for (const event of fresh) {
      const source = this.eventActor(event.actorId), target = this.eventActor(event.targetId || event.heroId);
      if (event.type === 'action' && source) {
        actionCue = scheduleAction(event, source);
      }
      if ((event.type === 'hit' || event.type === 'heal' || event.type === 'revive') && target) {
        let group = event.source === 'burn' ? null : actionsBySource.get(event.actorId) || null;
        // Enemy mend is an authored heal-only event in model.enemyAct. Give it
        // its own visual turn without altering the model's events or resources.
        if (!group && event.type === 'heal' && source?.options.hostile) {
          group = actionCue = scheduleAction({ type: 'action', kind: 'skill', skillId: 'enemy_mend', actorId: event.actorId, targetId: event.targetId, presentationOnly: true }, source);
        }
        if (group && !group.targets.includes(target)) group.targets.push(target);
        const at = group ? Math.max(this.time, group.at + group.timing.impact) : this.time;
        if (event.type !== 'revive') target.deathAt = at + 0.13;
        this.cues.push({ at, kind: event.type, actor: target, source, event, actionCue: group });
      }
      if (event.type === 'victory' && this.visualBattle) this.cues.push({ at: Math.max(this.time + 0.25, (this.timeline || this.time) - 0.2), kind: 'victory', event });
      if (event.type === 'level' || event.type === 'recruit') {
        const actor = this.eventActor(event.heroId);
        if (actor) {
          this.effect(actor.wrapper.position, 0xe3c581, true);
          this.notifyPresentationCue({kind:event.type,event,actor});
        }
      }
    }
  }

  notifyPresentationCue(cue) {
    // Audio is optional presentation feedback; its failure cannot stop a turn.
    try {
      const result=this.onPresentationCue?.({kind:cue.kind,event:cue.event,actionEvent:cue.actionCue?.event,hostile:cue.actor?.options?.hostile,sourceHostile:cue.source?.options?.hostile});
      result?.catch?.(()=>{});
    } catch {}
  }

  playCues() {
    this.cues.sort((a, b) => a.at - b.at);
    while (this.cues.length && this.cues[0].at <= this.time) {
      const cue = this.cues.shift(), actor = cue.actor;
      if (cue.kind === 'action' && actor?.presentedDead) continue;
      this.notifyPresentationCue(cue);
      if (cue.kind === 'action') {
        const selectedTarget = this.eventActor(cue.event?.targetId);
        const aimed = selectedTarget && selectedTarget !== actor && cue.targets.includes(selectedTarget) ? selectedTarget : cue.targets.find(target => target !== actor);
        const timing = cue.timing || actionTimeline(cue.event, actor);
        const animation = this.magicVfx?.process({ at: cue.at, event: cue.event, source: actor, targets: cue.targets, timing }) || cue.animation;
        if (this.time >= cue.at + timing.duration) continue;
        actor.actionTargetId = aimed?.id || null;
        actor.presentationTiming = timing; actor.actionAt = cue.at;
        actor.pulseUntil = cue.at + timing.duration;
        actor.pulseAnimation = animation;
        const motion = cue.motion;
        actor.lungeDistance = motion.distance;
        actor.lungeUntil = 0;
        if (!motion.planted && motion.distance > 0) {
          actor.lungeStart = cue.at; actor.lungeUntil = cue.at + timing.duration;
          const heading = aimed ? facingToward(actor.wrapper.position, aimed.wrapper.position, actor.wrapper.rotation.y + (actor.sourceFrontYaw || 0)) : actor.wrapper.rotation.y + (actor.sourceFrontYaw || 0);
          actor.lungeDirection ||= new T.Vector3();
          actor.lungeDirection.set(Math.sin(heading), 0, Math.cos(heading));
        }
        const age=this.time-cue.at;
        if(!meleeTravel(age,timing)){
          this.play(actor,animation,true);
          const action=actor.actions[animation];
          if(action&&age>0)action.time=actionClipPhase(age,timing)*action.getClip().duration;
        }
      } else if (cue.kind === 'hit' || cue.kind === 'heal' || cue.kind === 'revive') {
        if (cue.kind === 'revive') {
          this.pendingReviveActors?.delete(actor.id);
          actor.presentedDead = false;
          actor.deathAt = 0;
          actor.deathFacingYaw = null;
          actor.deathPosition = null; actor.restoredCorpse = false;
          actor.pulseUntil = 0;
          actor.lungeUntil = 0;
        }
        if (cue.kind === 'hit' && contactReaction(cue.event)) {
          actor.reactionAt = cue.at; actor.reactionUntil = cue.at + COMBAT_MOTION.reaction;
          const source = cue.source || cue.actionCue?.actor;
          actor.recoil ||= new T.Vector3();
          actor.recoil.set(0,0,0);
          if (source && source !== actor) {
            actor.recoil.subVectors(actor.wrapper.position,source.wrapper.position).setY(0).normalize();
          }
          actor.recoilStrength = cue.event?.amount > 0 ? (cue.actionCue?.event?.heavy ? .16 : .09) : 0;
          if (!actor.presentedDead && this.time < actor.reactionUntil) this.play(actor, 'Hit', true);
        } else if (cue.kind !== 'hit') actor.reactionUntil = 0;
        if (cue.kind === 'hit' && cue.event?.absorbed > 0) this.magicVfx?.barrierAbsorb?.(actor, cue.event.absorbed, cue.at);
        if (!cue.actionCue) {
          if (this.magicVfx) this.magicVfx.impact({ actor, source: cue.source || actor, event: cue.event, kind: cue.kind, at: cue.at });
          else this.effect(actor.wrapper.position, cue.kind === 'hit' ? 0xffbb65 : 0x88d8b0, cue.kind !== 'hit');
        }
      } else if (cue.kind === 'victory' && this.visualBattle) {
        for (const enemy of this.visualBattle.enemies) {
          enemy.hp = 0;
          const fallen = this.eventActor(enemy.uid);
          if (fallen && !(fallen.deathAt > 0)) fallen.deathAt = this.time;
        }
      }
    }
  }

  effect(position, color, healing = false) {
    const material = new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: T.DoubleSide, depthWrite: false });
    const mesh = new T.Mesh(this.geometry('effect-ring', () => new T.RingGeometry(0.55, 0.68, 40)), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y += 0.12;
    this.fxGroup.add(mesh);
    this.effects.push({ mesh, age: 0, duration: 0.65, healing });
  }

  updateEffects(dt) {
    for (let index = this.effects.length - 1; index >= 0; index--) {
      const effect = this.effects[index];
      effect.age += dt;
      const t = effect.age / effect.duration;
      effect.mesh.scale.setScalar(1 + t * 2.4);
      effect.mesh.material.opacity = Math.max(0, (1 - t) * 0.8);
      if (effect.healing) effect.mesh.position.y += dt * 1.4;
      if (t >= 1) { this.fxGroup.remove(effect.mesh); effect.mesh.material.dispose(); this.effects.splice(index, 1); }
    }
  }

  setPresentationSpeed(value) { this.presentationSpeed=[1,1.5,2].includes(Number(value))?Number(value):1;return this; }

  setReducedMotion(value) { this.reducedMotion=!!value;return this; }

  updateAtmosphere(state, dt) {
    const clock=this.reducedMotion?0:this.time;
    for (const animation of this.animations) {
      const object = animation.object;
      if (animation.kind === 'glyph') { object.position.y = animation.baseY + (this.reducedMotion?0:Math.sin(clock * 1.8 + animation.phase) * 0.09); object.rotation.y = clock * 0.5; }
      if (animation.kind === 'fire') object.scale.y = 1.6 + (this.reducedMotion?0:Math.sin(clock * 9 + animation.phase) * 0.16);
      if (animation.kind === 'dust') { object.position.y = Math.sin(clock * 0.18) * 0.28; object.rotation.y = Math.sin(clock * 0.04) * 0.015; }
      if (animation.kind === 'banner') object.rotation.z = (this.reducedMotion?0:Math.sin(clock * 1.7 + animation.phase) * 0.035);
      if (animation.kind === 'wheel' && !this.reducedMotion && flag(state, 'field_water')) object.rotation.x += dt * 0.22;
    }
  }

  presentationPending() { return this.cues.length > 0 || this.time < (this.timeline || 0) + COMBAT_MOTION.finishPad || !!(this.visualBattle && !this.state?.battle); }

  clearPresentation() { this.pendingCombatHover=null;this.hoverCombatTarget=null;this.magicVfx?.clear(); this.browserPerformance?.resetTiming(); this.partyTrail=null;this.motionContext=null;this.combatSelection={};this.pendingReviveActors=new Set();this.cues.length = 0; this.timeline = this.time - 1; this.lastActionStart = 0; this.previousEvents = null; this.visualBattle = null; this.visualBattleSource = null; for (const actor of this.actors.values()) { resetPaintedPose(actor); resetFootContact(actor); resetPartyGait(actor); actor.pulseUntil = 0; actor.lungeUntil = 0; actor.actionTargetId = null; actor.deathFacingYaw = null; actor.deathPosition=null;actor.restoredCorpse=false;actor.reactionAt=null; actor.reactionUntil = 0; actor.deathAt = 0; actor.clearanceLift=0; if(actor.refreshRootBaseY!=null)actor.root.position.y=actor.refreshRootBaseY; } for (const effect of this.effects) { effect.mesh.material.dispose(); this.fxGroup.remove(effect.mesh); } this.effects.length = 0; }

  render(state, dt = 0) {
    if (this.disposed || !this.loaded || !state) return;
    dt = Math.max(0, Math.min(Number(dt) || 0, 0.1));
    // Scale only read-only combat presentation; authoritative model dt is external.
    if(state.battle || this.visualBattle || this.cues.length)dt*=this.presentationSpeed||1;
    this.time += dt;
    this.state = state;
    const newRun = this.runId !== state.runId;
    if (newRun) { this.clearPresentation(); this.runId = state.runId; }
    this.justEnteredArea = newRun || this.areaId !== state.areaId;
    if (this.justEnteredArea) this.loadArea(state.areaId, state);
    if (!this.area) return;
    this.pendingEventFrame = this.presentationEventFrame(state.events || []);
    this.unreadDeathActors = new Set();
    this.pendingReviveActors ||= new Set();
    for (const event of this.pendingEventFrame.fresh) if (event.type === 'revive') {
      const id = event.targetId || event.heroId;
      if (id) {
        const existing = this.eventActor(id), key = existing?.id || ((state.party || []).some(hero => hero.id === id) ? 'party:' : 'enemy:') + id;
        this.pendingReviveActors.add(key);
      }
    }
    for (const event of this.pendingEventFrame.fresh) if (event.type === 'hit') {
      const id = event.targetId || event.heroId; this.unreadDeathActors.add('party:' + id); this.unreadDeathActors.add('enemy:' + id);
    }
    const paused = state.mode === 'dialogue';
    const animationDelta = paused ? 0 : dt;
    if (state.battle) {
      // Model transactions replace battle and advance revision; retain one detached snapshot between actions.
      if (!Number.isSafeInteger(state.revision) || this.visualBattleSource !== state.battle || this.visualBattleRevision !== state.revision || !this.visualBattle) {
        this.visualBattle = { ...state.battle, enemies: state.battle.enemies.map(unit => ({ ...unit })) };
        this.visualBattleSource = state.battle; this.visualBattleRevision = state.revision;
      }
      this.lastBattleSeen = this.time;
    } else if (this.visualBattle && this.time > Math.max((this.lastBattleSeen || 0) + COMBAT_MOTION.duration, (this.timeline || 0) + COMBAT_MOTION.finishPad) && !hasUnsettledDeath(this.actors)) this.visualBattle = null;
    const presentation = this.visualBattle ? { ...state, battle: this.visualBattle } : state;
    this.syncInteractions(presentation);
    this.playCues();
    this.syncBattle(presentation, animationDelta);
    this.syncParty(presentation, animationDelta, presentation.battle);
    this.readEvents(state);
    this.playCues();
    for (const [id, actor] of this.actors) if ((id.startsWith('npc:') || id.startsWith('encounter:')) && actor.wrapper.visible) {
      const actorDelta = this.browserPerformance?.shouldUpdateActor(actor, animationDelta, { critical: false }) ?? animationDelta;
      if (actor.stroll && !presentation.battle && !this.reducedMotion) {
        if (actorDelta > 0 || this.justEnteredArea) this.animatePatrol(actor, actorDelta);
      } else {
        if (actor.stroll && this.reducedMotion) this.play(actor, 'Idle');
        actor.poseSampled = advancePaintedPose(actor, actorDelta, this.time) !== null;
      }
    }
    this.updateEffects(animationDelta);
    this.updateAtmosphere(state, dt);
    const inBattle = !!presentation.battle;
    const destination = inBattle ? this.battleCenter : point(state.position || state.hero);
    const desired = (this.cameraTarget ||= new T.Vector3()).set(destination.x, 0.4, destination.z);
    this.focus.lerp(desired, this.justEnteredArea || this.reducedMotion ? 1 : 1 - Math.exp(-dt * 4.4));
    const rect = this.canvas.getBoundingClientRect();
    const aspect = Math.max(0.25, rect.width / Math.max(1, rect.height));
    this.areaGroup.visible = !inBattle;
    this.battleStage.visible = inBattle;
    if (inBattle) {
      for (const [id, actor] of this.actors) if (id.startsWith('npc:') || id.startsWith('encounter:')) actor.wrapper.visible = false;
      const hud = globalThis.document?.getElementById('actHud');
      this.battleLayoutCache ||= new BattleLayoutCache();
      if(hud!==this.observedHud){
        this.layoutMutationObserver?.disconnect();this.layoutResizeObserver?.disconnect();this.observedHud=hud;
        if(hud&&globalThis.MutationObserver){this.layoutMutationObserver=new MutationObserver(()=>this.invalidateLayout());this.layoutMutationObserver.observe(hud,{subtree:true,childList:true,attributes:true,characterData:true});}
        this.layoutObservedNodes=new Set();
        if(hud&&globalThis.ResizeObserver)this.layoutResizeObserver=new ResizeObserver(()=>this.invalidateLayout());
        this.invalidateLayout();
      }
      const roster=[...(presentation.party||[]).map(unit=>['party:'+unit.id,unit.id]),...presentation.battle.enemies.map(unit=>['enemy:'+unit.uid,unit.uid])];
      const signature=[this.areaId,this.battleCenter.x,this.battleCenter.z,rect.left,rect.top,rect.width,rect.height,...roster.flatMap(([id,uid])=>[uid,this.actors.get(id)?.presentationHeight||this.actors.get(id)?.refreshHeight||0])].join(':');
      const fit=this.battleLayoutCache.read(signature,()=>{
      const panels=['.party-strip','.battle-panel','.combat-heading','.turn-order'].map(selector=>hud?.querySelector(selector));
      this.observeBattleLayout([hud,...panels]);
      const [party,panel,heading,turnOrder]=panels.map(element=>element?.getBoundingClientRect());
      const points = [];
      // Fit resting formation, not animation lunges, so attacks never pump the camera.
      for (const [side,units] of [['party',presentation.party||[]],['enemy',presentation.battle.enemies]]) units.forEach((unit,index)=>{
        const slot=battleFormation(side,index,units.length);
        const actor=this.actors.get(side==='party'?`party:${unit.id}`:`enemy:${unit.uid}`);
        const floor=this.height(this.battleCenter.x+slot.x,this.battleCenter.z+slot.z);
        const bodyHeight=actor?.presentationHeight || actor?.refreshHeight || (actor?.type==='boss'?3.8:2.6);
        for(const x of [-.75,.75])for(const z of [-.75,.75])for(const y of [0,bodyHeight+(side==='enemy'?1.05:0)])
          points.push([slot.x+x,floor+y-1,slot.z+z]);
      });
      const insets = {
        right:party?.width ? rect.right-party.left+8 : (rect.width<=900?150:186),
        top:Math.max(heading?.height?heading.bottom-rect.top:95,turnOrder?.height?turnOrder.bottom-rect.top:0)+8,
        bottom:panel?.height ? rect.bottom-panel.top+60 : (rect.width<=900?195:130),
      };
      return fitBattleCamera(points,rect.width,rect.height,insets);
      });
      const camera = this.battleCamera;
      if(this.appliedBattleFit!==fit){
      this.appliedBattleFit=fit;
      camera.fov = fit.fov; camera.aspect = aspect;
      camera.far=Math.max(180,fit.distance+160);
      camera.setViewOffset(rect.width,rect.height,fit.offsetX,fit.offsetY,rect.width,rect.height);
      const target = (this.cameraTarget ||= new T.Vector3()).set(this.battleCenter.x,1,this.battleCenter.z);
      camera.position.copy(target).addScaledVector((this.cameraDirection ||= new T.Vector3()).set(...fit.direction),fit.distance);
      camera.lookAt(target); camera.updateProjectionMatrix();
      }
      this.activeCamera = camera;
    } else {
      this.combatInsets = null;
      this.zoomHeight = this.justEnteredArea ? 13.2 : T.MathUtils.damp(this.zoomHeight,13.2,3.5,dt);
      const left = -this.zoomHeight*aspect, right = this.zoomHeight*aspect;
      if (this.camera.left !== left || this.camera.right !== right || this.camera.top !== this.zoomHeight || this.camera.bottom !== -this.zoomHeight) {
        this.camera.left = left; this.camera.right = right;
        this.camera.top = this.zoomHeight; this.camera.bottom = -this.zoomHeight;
        this.camera.updateProjectionMatrix();
      }
      this.camera.position.copy(this.focus); this.camera.position.x += 13; this.camera.position.y += 23; this.camera.position.z += 23;
      this.camera.lookAt(this.focus.x,this.focus.y,this.focus.z-1);
      this.activeCamera = this.camera;
    }
    this.sun.position.copy(this.focus); this.sun.position.x -= 18; this.sun.position.y += 30; this.sun.position.z += 12;
    this.sun.target.position.copy(this.focus);
    this.sun.target.updateMatrixWorld();
    this.activeCamera.updateMatrixWorld();
    orientPaintedActors(this.actors.values(), this.activeCamera, dt);
    this.footSurface ||= (x,z) => this.battleStage.visible ? this.height(x,z) : this.walkHeight(x,z);
    for (const actor of this.actors.values()) {
      if (actor.wrapper.visible && actor.poseSampled) {
        const snap=this.justEnteredArea||this.enteringBattle;
        if (!applyPartyGait(actor,this.footSurface,paintedHeading(actor),this.time,snap)) {
          applyFootContact(actor,this.footSurface,snap);
        }
      }
      if (actor.wrapper.visible) updateBow(actor,this);
      actor.poseSampled=false;
    }
    this.magicVfx?.update(animationDelta);
    this.worldElements?.update();
    this.groundcover.update(inBattle, animationDelta);
    this.resolveCombatHover();
    this.renderer.render(this.scene, this.activeCamera);
    this.enteringBattle = false;
  }

  observeBattleLayout(elements) {
    const next=new Set(elements.filter(Boolean)),previous=this.layoutObservedNodes||new Set();
    for(const element of previous)if(!next.has(element))this.layoutResizeObserver?.unobserve(element);
    for(const element of next)if(!previous.has(element))this.layoutResizeObserver?.observe(element);
    this.layoutObservedNodes=next;
  }

  invalidateLayout() { this.battleLayoutCache?.invalidate(); }

  requestCombatHover(clientX,clientY) {
    if(!Number.isFinite(clientX)||!Number.isFinite(clientY)){this.pendingCombatHover=null;this.hoverCombatTarget=null;return null;}
    this.pendingCombatHover={x:clientX,y:clientY};return this.getCombatHover();
  }

  getCombatHover() {
    const id=this.hoverCombatTarget;
    return this.state?.battle?.enemies.some(unit=>unit.uid===id&&unit.hp>0)?id:null;
  }

  resolveCombatHover() {
    const point=this.pendingCombatHover;this.pendingCombatHover=null;
    if(!this.state?.battle){this.hoverCombatTarget=null;return;}
    if(point)this.hoverCombatTarget=this.pickCombatTarget(point.x,point.y);
  }

  pickCombatTarget(clientX,clientY) {
    if(!this.state?.battle||this.disposed||!Number.isFinite(clientX)||!Number.isFinite(clientY))return null;
    const rect=this.canvas.getBoundingClientRect();
    if(!rect.width||!rect.height||clientX<rect.left||clientX>rect.right||clientY<rect.top||clientY>rect.bottom)return null;
    this.pointer.set((clientX-rect.left)/rect.width*2-1,1-(clientY-rect.top)/rect.height*2);
    this.raycaster.setFromCamera(this.pointer,this.activeCamera);
    this.scene.updateMatrixWorld(true);
    const roots=[];
    const shown=object=>{for(let parent=object;parent;parent=parent.parent)if(!parent.visible)return false;return true;};
    for(const unit of this.state.battle.enemies){if(unit.hp<=0)continue;const actor=this.actors.get(`enemy:${unit.uid}`);if(!actor||!shown(actor.wrapper))continue;actor.root.traverse(object=>{if(object.isMesh&&shown(object))roots.push(object);});}
    const hit=this.raycaster.intersectObjects(roots,false)[0];
    if(!hit)return null;
    let object=hit.object;while(object){if(object.userData.combatUid)return object.userData.combatUid;object=object.parent;}
    return null;
  }

  pick(clientX, clientY) {
    if (!this.loaded || !this.area || this.disposed || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    this.pointer.set((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.scene.updateMatrixWorld(true);
    const proxies = this.interactables.filter(item => item.group.visible && item.proxy.visible).map(item => item.proxy);
    const hits = this.raycaster.intersectObjects(proxies, false);
    if (hits.length) {
      const item = hits[0].object.userData.interaction;
      return { x: item.definition.x, z: item.definition.z, id: item.id, kind: item.kind };
    }
    const terrain = this.ground.parent?.children.filter(object => object.isMesh) || [this.ground];
    const groundHit = this.raycaster.intersectObjects(terrain, false)[0];
    let hit = groundHit?.point;
    if (!hit) { hit = new T.Vector3(); if (!this.raycaster.ray.intersectPlane(this.groundPlane, hit)) return null; }
    return nearestLand(this.area.layout, hit, 14);
  }

  /** Screen locations use the actual canvas rectangle, including embedded layouts. */
  screen(x, y, z) {
    if(this.disposed || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))return {x:0,y:0,visible:false};
    const p = (this.screenPoint ||= new T.Vector3()).set(x, y, z).project(this.activeCamera), rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + (p.x * 0.5 + 0.5) * rect.width, y: rect.top + (0.5 - p.y * 0.5) * rect.height, visible: p.z > -1 && p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 };
  }

  resize() {
    if (this.disposed) return;
    this.invalidateLayout();
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width || this.canvas.clientWidth || 1));
    const height = Math.max(1, Math.floor(rect.height || this.canvas.clientHeight || 1));
    // BrowserPerformance owns the budgeted backing size. Avoid allocating a CSS-sized
    // buffer immediately before its wrapper applies the final pixel budget.
    if (!this.browserPerformance && (this.canvas.width !== width || this.canvas.height !== height)) this.renderer.setSize(width, height, false);
    const aspect = width / height;
    this.camera.left = -this.zoomHeight * aspect;
    this.camera.right = this.zoomHeight * aspect;
    this.camera.top = this.zoomHeight;
    this.camera.bottom = -this.zoomHeight;
    this.camera.updateProjectionMatrix();
  }

  quality(value) {
    value = ['low', 'medium', 'high'].includes(value) ? value : 'high';
    if (this.qualityLevel === value) { this.resize(); return this; }
    this.qualityLevel = value;
    if (!this.browserPerformance) this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, value === 'low' ? 1 : value === 'medium' ? 1.25 : 1.5));
    this.renderer.shadowMap.enabled = value !== 'low';
    this.sun.shadow.mapSize.set(value === 'medium' ? 1024 : 2048, value === 'medium' ? 1024 : 2048);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.resize();
    return this;
  }

  setQuality(value) { this.quality(value); return this; }

  destroyActor(actor) {
    resetPaintedPose(actor);
    disposeBow(actor);
    this.magicVfx?.retireActor?.(actor);
    actor.mixer.stopAllAction();
    actor.mixer.uncacheRoot(actor.root);
    actor.outfitGeometry?.dispose();
    actor.wrapper.removeFromParent();
    actor.selectionMarker?.removeFromParent();
    const skeletons = new Set();
    actor.root.traverse(object => { if (object.isSkinnedMesh) skeletons.add(object.skeleton); });
    for (const skeleton of skeletons) skeleton?.dispose();
    for (const material of actor.ownMaterials) material.dispose();
    this.actors.delete(actor.id);
  }

  clearArea() {
    this.browserPerformance?.resetTiming();
    this.magicVfx?.clear();
    this.worldElements?.clearArea();
    this.groundcover.clear('surface');
    this.partyTrail=null;this.motionContext=null;this.combatSelection={};
    this.clearBattleStage();
    this.areaGroup.visible = true;
    for (const actor of [...this.actors.values()]) this.destroyActor(actor);
    this.areaGroup.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
    this.areaGroup.clear();
    for (const geometry of this.areaGeometries) geometry.dispose();
    this.areaGeometries.clear();
    this.interactables.length = 0;
    this.animations.length = 0;
    for (const effect of this.effects) effect.mesh.material.dispose();
    this.effects.length = 0;
    this.cues.length = 0;
    this.fxGroup.clear();
    if (!this.disposed && this.magicVfx) this.fxGroup.add(this.magicVfx.group);
    this.visualBattle = null;
    this.timeline = 0;
    this.lastPosition = null;
    this.ground = null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.layoutMutationObserver?.disconnect();this.layoutResizeObserver?.disconnect();
    globalThis.removeEventListener?.('resize', this.resizeHandler);
    this.clearArea();
    this.groundcover.dispose();
    this.worldElements?.dispose();
    this.magicVfx?.dispose();
    this.characterAnimations?.dispose();
    for (const geometry of this.geometries.values()) geometry.dispose();
    for (const material of this.materials.values()) { material.userData.battleLabelTexture?.dispose(); material.dispose(); }
    const geometries = new Set(), materials = new Set(), textures = new Set();
    for (const asset of new Set(Object.values(this.assets))) asset.scene.traverse(object => {
      if (!object.isMesh) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
      object.skeleton?.dispose();
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    this.atlas?.dispose();
    this.paintedPigments?.dispose();
    this.sun.shadow.map?.dispose();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.assets = {};
    this.scene.clear();
  }
}

installRefresh(World);
installMeshyWorld(World);
installWorldElements(World);
installBrowserPerformance(World);
