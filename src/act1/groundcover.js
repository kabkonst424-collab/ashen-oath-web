import * as T from '../../assets/vendor/three.module.js';
import { bridgeAt, ellipseContains, nearRiverBank, riverAt, segmentDistance, walkableLayout } from './area-geometry.js?v=rivers-0181';
import { makeGroundcoverPlants } from './groundcover-plants.js?v=groundcover-0192';

const TAU = Math.PI * 2;
const CHUNK = 32;
const ROAD_CELL = 8;
const VEGETATION_CHUNKS_PER_FRAME = 3;
const VEGETATION = {
  ruins:    { step: 1.46, density: .25, height: .73, grass: [0x5b7350, 0x81884d], weed: 0x708755 },
  village:  { step: 1.20, density: .51, height: .94, grass: [0x5e7138, 0x989547], weed: 0x7e8c4e },
  forest:   { step: .96,  density: .80, height: 1.16, grass: [0x55723b, 0x9da854], weed: 0x779a58 },
  quarry:   { step: 1.62, density: .20, height: .75, grass: [0x786e49, 0xa49a5c], weed: 0x8b8d55 },
  marsh:    { step: 1.02, density: .72, height: 1.27, grass: [0x5c7449, 0x969f54], weed: 0x829854 },
  archive:  { step: 1.58, density: .18, height: .70, grass: [0x566d50, 0x818c56], weed: 0x789063 },
  grass:    { step: .89,  density: .88, height: 1.20, grass: [0x6b792f, 0xb1a24d], weed: 0x89924c },
  fortress: { step: 1.56, density: .20, height: .66, grass: [0x616e43, 0x8c8b55], weed: 0x788650 },
  abbey:    { step: 1.52, density: .23, height: .79, grass: [0x586c47, 0x8d8f59], weed: 0x788955 },
  coast:    { step: 1.25, density: .52, height: .87, grass: [0x6c7445, 0xa7a073], weed: 0x7a8d61 },
  reef:     { step: 1.44, density: .30, height: .81, grass: [0x5e775c, 0x788c5c], weed: 0x71907b },
  snow:     { step: 1.75, density: .20, height: .58, grass: [0x72746d, 0xc6c6ac], weed: 0x9ea995 },
  crystal:  { step: 1.78, density: .12, height: .52, grass: [0x677e86, 0x9fa7ae], weed: 0x93a59e },
  slag:     { step: 1.62, density: .18, height: .65, grass: [0x706047, 0xac9062], weed: 0x8c764e },
  forge:    { step: 1.94, density: .10, height: .55, grass: [0x796046, 0xab895d], weed: 0x9c7c4d },
  orchard:  { step: .98, density: .76, height: 1.13, grass: [0x4f7547, 0xabb360], weed: 0x7caa68 },
  glass:    { step: 1.41, density: .33, height: .76, grass: [0x60816e, 0xadc587], weed: 0x8dba96 },
  moor:     { step: 1.06, density: .74, height: 1.08, grass: [0x63774e, 0xa7a66a], weed: 0x909973 },
  amphitheatre:{step:1.57,density:.23,height:.68,grass:[0x767152,0xaba96f],weed:0x9b9b71},
};

const cellKey = (i, j) => `${i}:${j}`;
const idSeed = id => [...id].reduce((seed, char) => Math.imul(seed ^ char.charCodeAt(0), 16777619), 2166136261);
const clamp = T.MathUtils.clamp;

function sample(i, j, seed) {
  let n = seed ^ Math.imul(i, 374761393) ^ Math.imul(j, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
}

function moisture(x, z, size, seed) {
  const u = x / size, v = z / size, i = Math.floor(u), j = Math.floor(v);
  const fx = T.MathUtils.smoothstep(u - i, 0, 1), fz = T.MathUtils.smoothstep(v - j, 0, 1);
  return T.MathUtils.lerp(
    T.MathUtils.lerp(sample(i, j, seed), sample(i + 1, j, seed), fx),
    T.MathUtils.lerp(sample(i, j + 1, seed), sample(i + 1, j + 1, seed), fx), fz);
}

// Index the actual rendered curves so roots stay clear of the roads at bends and junctions.
function roadIndex(paths) {
  const cells = new Map();
  for (const { samples, width } of paths) {
    const half = (width || 3.2) * .5;
    const extent = half * 1.12 + 4.2;
    for (let i = 1; i < samples.length; i++) {
      const start = samples[i - 1], end = samples[i];
      const segment = { from: [start.x, start.z], to: [end.x, end.z], half };
      for (let x = Math.floor((Math.min(start.x, end.x) - extent) / ROAD_CELL); x <= Math.floor((Math.max(start.x, end.x) + extent) / ROAD_CELL); x++) {
        for (let z = Math.floor((Math.min(start.z, end.z) - extent) / ROAD_CELL); z <= Math.floor((Math.max(start.z, end.z) + extent) / ROAD_CELL); z++) {
          const key = cellKey(x, z);
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(segment);
        }
      }
    }
  }
  return cells;
}

function roadRoom(roads, x, z) {
  let clearance = Infinity;
  const segments = roads.get(cellKey(Math.floor(x / ROAD_CELL), Math.floor(z / ROAD_CELL))) || [];
  for (const { from, to, half } of segments) {
    clearance = Math.min(clearance, segmentDistance(x, z, from, to) - half * 1.06);
  }
  return clearance;
}

function makeMaterial(uniforms) {
  const material = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
  material.name = 'Groundcover · leaf translucency and wind';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `
      uniform float coverClock;
      uniform float coverMotion;
      uniform vec4 coverRange;
      uniform vec3 coverFocus;
      uniform vec4 coverPassers[4];
    ` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec3 root = instanceMatrix[3].xyz;
      vec2 across = root.xz - coverFocus.xz;
      float range = 1. - smoothstep(coverRange.x, coverRange.y, abs(dot(across,vec2(.870,-.493))));
      range *= 1. - smoothstep(coverRange.z, coverRange.w, abs(dot(across,vec2(.493,.870))));
      float phase = dot(root.xz, vec2(.22,.136));
      if (coverMotion > .5) {
        float gust = sin(phase - coverClock * 1.65) * .13 + sin(phase * 2.82 + coverClock * 2.53) * .043;
        vec2 lean = vec2(.88,.47) * gust;
        float pressed = 0.;
        for (int i = 0; i < 4; i++) {
          vec4 passer = coverPassers[i];
          vec2 offset = root.xz - passer.xy;
          float distanceSq = dot(offset,offset);
          if (passer.w > 0. && distanceSq < passer.z) {
            float contact = (1. - smoothstep(.04, passer.z, distanceSq)) * passer.w;
            lean += offset * inversesqrt(max(.09, distanceSq)) * contact * .43;
            pressed = max(pressed, contact);
          }
        }
        float stem = clamp(position.y * 1.57, 0., 1.6);
        float bend = stem * stem;
        vec2 lateral = vec2(dot(instanceMatrix[0].xz, lean), dot(instanceMatrix[2].xz, lean));
        transformed.xz += bend * lateral;
        transformed.y *= mix(1., .42, pressed);
      }
      transformed *= range;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      // A small broad ambient term keeps backlit blades and weeds legible in old-growth shade.
      outgoingLight += diffuseColor.rgb * .14;
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey = () => 'ashen-groundcover-wind-1';
  return material;
}

function coverPatch(chunk, species, plant, quality) {
  if (!chunk.species.has(species)) chunk.species.set(species, { common: [], extra: [] });
  chunk.species.get(species)[quality ? 'common' : 'extra'].push(plant);
}

function fillChunk(chunk, options) {
  const { config, seed, roads, exclusions, fields, layout, world, center } = options;
  const battle = !!center;
  const nearbyProps = exclusions.filter(item =>
    item.x + item.radius >= chunk.x && item.x - item.radius <= chunk.x + CHUNK &&
    item.z + item.radius >= chunk.z && item.z - item.radius <= chunk.z + CHUNK);
  const step = config.step * (battle ? .94 : 1);
  for (let i = Math.floor(chunk.x / step); i < Math.ceil((chunk.x + CHUNK) / step); i++) {
    for (let j = Math.floor(chunk.z / step); j < Math.ceil((chunk.z + CHUNK) / step); j++) {
      const x = (i + sample(i, j, seed + 17)) * step, z = (j + sample(i, j, seed + 31)) * step;
      if (x < chunk.x || x >= chunk.x + CHUNK || z < chunk.z || z >= chunk.z + CHUNK) continue;
      const dx = battle ? x - center.x : 0, dz = battle ? z - center.z : 0;
      const ring = battle ? Math.hypot(dx / 7.8, dz / 6.9) : 2;
      if (battle && Math.hypot(dx, dz) > 37) continue;
      const shoulder = battle ? Infinity : roadRoom(roads, x, z);
      if (shoulder < -.74) continue;
      const damp = moisture(x, z, 11, seed + 71), patch = moisture(x, z, 4.5, seed + 153);
      const clump = T.MathUtils.smoothstep(.65 * damp + .35 * patch, .23, .74);
      const roadCover = T.MathUtils.smoothstep(shoulder, -.74, 1.7);
      const battleCover = battle ? .37 + .63 * T.MathUtils.smoothstep(ring, .45, 1.37) : 1;
      const chance = config.density * (.10 + clump * 1.77) * (.19 + .91 * roadCover) * battleCover;
      const random = sample(i, j, seed + 59);
      if (random > chance * 1.23) continue;

      // A deck and its approaches can be walkable over water. Plant roots require real land.
      if (!battle && layout && (!walkableLayout(layout, x, z) || riverAt(layout, x, z, .8) || bridgeAt(layout, x, z, -1.02) ||
          fields.some(field => ellipseContains(field, x, z)))) continue;
      if (nearbyProps.some(item => (x - item.x) ** 2 + (z - item.z) ** 2 < item.radius ** 2)) continue;
      if (!battle && !layout && !world.free(x, z, 0)) continue;

      const alongWater = !battle && layout && (nearRiverBank(layout, x, z, 4.4) ||
        options.pools.some(pool => ellipseContains(pool, x, z, 3.8)));
      const wet = world.biome === 'marsh';
      const choice = sample(i, j, seed + 613);
      const forage = roadCover > .78 && ring > 1.08;
      let species = 'grass';
      if (forage && alongWater && choice > .71) species = 'reed';
      else if (forage && wet && damp > .61 && choice > .94) species = 'reed';
      else if (forage && world.theme === 'forest' && damp > .57 && choice > .91) species = 'fern';
      else if (forage && choice > .922) species = 'plantain';
      else if (forage && ['grass','village','forest','orchard','moor'].includes(world.theme) && clump > .61 && choice < .054) species = 'wildflower';

      const variation = sample(i, j, seed + 295);
      const height = config.height * (.63 + .55 * variation + .29 * clump);
      const trim = battle ? .27 + .73 * T.MathUtils.smoothstep(ring, .92, 1.58) : .52 + .48 * roadCover;
      const scale = (.74 + .51 * sample(i, j, seed + 454)) * (species === 'reed' ? 1.13 : 1);
      const plant = {
        x, z, y: world.height(x, z) - .024,
        yaw: TAU * sample(i, j, seed + 213),
        width: (.83 + .55 * variation) * scale,
        height: height * scale * trim,
        hue: clamp((1 - damp) * .57 + variation * .56, 0, 1),
      };
      const common = random < chance * (battle ? .54 : .50);
      coverPatch(chunk, species, plant, common);
    }
  }
}

function foliageExclusions(world, props) {
  const clearance = world.critical.map(({ x, z }) => ({ x, z, radius: 2.1 }));
  for (const prop of world.area.layout?.props || []) {
    if (prop.slot === 'anvil' || prop.slot === 'brazier' || prop.slot === 'camp') {
      clearance.push({ x: prop.x, z: prop.z, radius: 1.65 * (prop.scale || 1) + .6 });
    }
  }
  for (const [slot, transforms] of props) {
    if (slot === 'grass' || slot === 'wheat') continue;
    const source = world.meshyParts(slot);
    for (const item of transforms) {
      const r = Math.max(source.halfWidth * (item.sx ?? item.scale ?? 1), source.halfDepth * (item.sz ?? item.scale ?? 1));
      // Keep sprouting grass around the bases of trees and rocks; buildings and fires need a larger apron.
      const radius = slot === 'tree' ? .84 * item.scale : slot === 'rock' ? .66 * r : r + .58;
      clearance.push({ x: item.x, z: item.z, radius });
    }
  }
  return clearance;
}

export class Groundcover {
  constructor(world) {
    this.world = world;
    this.geometries = makeGroundcoverPlants();
    this.uniforms = {
      coverClock: { value: 0 }, coverMotion: { value: 1 }, coverRange: { value: new T.Vector4() },
      coverFocus: { value: new T.Vector3() }, coverPassers: { value: Array.from({ length: 4 }, () => new T.Vector4(0, 0, 1, 0)) },
    };
    this.material = makeMaterial(this.uniforms);
    this.transform = new T.Object3D();
    this.color = new T.Color();
    this.surface = null;
    this.arena = null;
  }

  build(parent, { props = new Map(), center = null, obstacles = [] } = {}) {
    const world = this.world, layout = world.area.layout;
    const bounds = center ? { x: center.x, z: center.z, rx: 37, rz: 37 } :
      world.area.bounds || { x: 0, z: 0, rx: world.radiusX, rz: world.radiusZ };
    const config = VEGETATION[world.theme] || VEGETATION.ruins;
    const group = new T.Group();
    group.name = center ? 'Battle groundcover' : 'Exploration groundcover';
    parent.add(group);
    const options = {
      world, layout, config, center, seed: idSeed(center ? `${world.areaId}:${world.battleKey}` : world.areaId),
      roads: center ? null : roadIndex(world.paths), exclusions: center ? obstacles : foliageExclusions(world, props),
      fields: (layout?.fields || []).map(([x, z, rx, rz, yaw = 0]) => ({ x, z, rx: rx + .6, rz: rz + .6, yaw: -yaw })),
      pools: (layout?.obstacles || []).filter(obstacle => obstacle.kind === 'water'),
    };
    const cover = { group, options, chunks: new Map(), pending: [], visibleKey: null, bounds,
      green: config.grass.map(hex => new T.Color(hex)), weed: new T.Color(config.weed) };
    if (center) this.arena = cover;
    else this.surface = cover;
  }

  makeChunk(cover, i, j) {
    const chunk = { x: i * CHUNK, z: j * CHUNK, species: new Map(), group: new T.Group() };
    fillChunk(chunk, cover.options);
    for (const [species, { common, extra }] of chunk.species) {
      // Common grass uses short mesh strips on both settings; dense tufts fill gaps on high.
      const sets = species === 'grass' ? [['shortGrass', common, true], ['grass', extra, false]] : [[species, [...common, ...extra], true]];
      for (const [kind, plants, low] of sets) {
        if (!plants.length) continue;
        const mesh = new T.InstancedMesh(this.geometries[kind], this.material, plants.length);
        mesh.name = `${kind} ${i}:${j}`;
        mesh.receiveShadow = true;
        mesh.userData.modelOrigin = { kind: 'authored-landscape', source: this.world.areaId, layer: 'groundcover', slot: species };
        mesh.userData.lowCount = species === 'grass' ? (low ? plants.length : 0) : common.length;
        mesh.userData.fullCount = plants.length;
        for (const [index, plant] of plants.entries()) {
          this.transform.position.set(plant.x, plant.y, plant.z);
          this.transform.rotation.y = plant.yaw;
          this.transform.scale.set(plant.width, plant.height, plant.width);
          this.transform.updateMatrix();
          mesh.setMatrixAt(index, this.transform.matrix);
          if (species === 'grass' || species === 'reed') this.color.lerpColors(...cover.green, plant.hue);
          else if (species === 'wildflower') this.color.setRGB(.92, .89, .78).multiplyScalar(.86 + plant.hue * .14);
          else this.color.copy(cover.weed).multiplyScalar(.78 + plant.hue * .39);
          mesh.setColorAt(index, this.color);
        }
        mesh.computeBoundingSphere();
        mesh.boundingSphere.radius += 1.5;
        chunk.group.add(mesh);
      }
    }
    chunk.species.clear();
    cover.group.add(chunk.group);
    cover.chunks.set(cellKey(i, j), chunk);
    return chunk;
  }

  update(inBattle, dt) {
    const world = this.world, uniforms = this.uniforms;
    const cover = inBattle ? this.arena : this.surface;
    if (!cover) return;
    const low = world.qualityLevel === 'low';
    if (!world.reducedMotion) uniforms.coverClock.value += dt;
    uniforms.coverMotion.value = world.reducedMotion ? 0 : 1;
    const focus = inBattle ? world.battleCenter : world.focus;
    uniforms.coverFocus.value.set(focus.x, 0, focus.z);
    const halfWidth = clamp(world.camera.right, 5, 47);
    if (inBattle) uniforms.coverRange.value.set(18, 34, 18, 36);
    else uniforms.coverRange.value.set(halfWidth * .96, halfWidth + 8, 23, 32);
    const reach = inBattle ? 38 : halfWidth * .88 + 27;
    const bounds = cover.bounds;
    const minX = Math.max(Math.floor((focus.x - reach) / CHUNK), Math.floor((bounds.x - bounds.rx) / CHUNK));
    const maxX = Math.min(Math.floor((focus.x + reach) / CHUNK), Math.floor((bounds.x + bounds.rx) / CHUNK));
    const minZ = Math.max(Math.floor((focus.z - reach) / CHUNK), Math.floor((bounds.z - bounds.rz) / CHUNK));
    const maxZ = Math.min(Math.floor((focus.z + reach) / CHUNK), Math.floor((bounds.z + bounds.rz) / CHUNK));
    const key = `${minX}:${maxX}:${minZ}:${maxZ}:${low}`;
    if (cover.visibleKey !== key) {
      cover.visibleKey = key;
      cover.pending.length = 0;
      for (const [id, chunk] of cover.chunks) {
        const i = chunk.x / CHUNK, j = chunk.z / CHUNK;
        if (i >= minX - 1 && i <= maxX + 1 && j >= minZ - 1 && j <= maxZ + 1) {
          chunk.group.visible = false;
        } else {
          this.removeChunk(chunk);
          cover.chunks.delete(id);
        }
      }
      for (let i = minX; i <= maxX; i++) for (let j = minZ; j <= maxZ; j++) {
        const chunk = cover.chunks.get(cellKey(i, j));
        if (chunk) this.showChunk(chunk, low);
        else cover.pending.push({ i, j, distance: (focus.x - (i + .5) * CHUNK) ** 2 + (focus.z - (j + .5) * CHUNK) ** 2 });
      }
      cover.pending.sort((a, b) => b.distance - a.distance);
    }
    for (let n = 0; n < VEGETATION_CHUNKS_PER_FRAME && cover.pending.length; n++) {
      const { i, j } = cover.pending.pop();
      this.showChunk(this.makeChunk(cover, i, j), low);
    }
    // Bending uses the visual roots of living heroes and is independent of movement rules.
    const passers = uniforms.coverPassers.value;
    for (const passer of passers) passer.w = 0;
    if (world.reducedMotion) return;
    let index = 0;
    for (const unit of world.state.party || []) {
      const actor = world.actors.get('party:' + unit.id);
      if (!actor?.wrapper.visible || unit.hp <= 0 || index === passers.length) continue;
      const { x, z } = actor.wrapper.position;
      const bridge = !inBattle && world.area.layout && bridgeAt(world.area.layout, x, z, 0);
      if (bridge) continue;
      passers[index++].set(x, z, 1.24, 1);
    }
  }

  showChunk(chunk, low) {
    chunk.group.visible = true;
    for (const mesh of chunk.group.children) {
      mesh.count = low ? mesh.userData.lowCount : mesh.userData.fullCount;
      mesh.visible = mesh.count > 0;
    }
  }

  removeChunk(chunk) {
    for (const mesh of chunk.group.children) mesh.dispose();
    chunk.group.removeFromParent();
  }

  clear(field) {
    const cover = this[field];
    if (!cover) return;
    for (const chunk of cover.chunks.values()) this.removeChunk(chunk);
    cover.group.removeFromParent();
    this[field] = null;
  }

  dispose() {
    this.clear('surface');
    this.clear('arena');
    for (const geometry of Object.values(this.geometries)) geometry.dispose();
    this.material.dispose();
  }
}
