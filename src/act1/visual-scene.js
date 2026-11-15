import * as T from '../../assets/vendor/three.module.js';
import { animateCostume, buildEquipment, canBuildEquipment, dressActor, markProcedural, waylightGeometry } from './visual-models.js?v=motion-190';
import { bindTreeSight, buildRouteBorders, updateTreeSight } from './visual-landscape.js?v=motion-190';
import { impactSigilGeometry } from './visual-impact.js?v=visual-180';

const WATERFRONTS = new Set(['salt_coast', 'drowned_beacon', 'wind_cape']);
const LIGHTING = {
  village: { fill: 0xa3c3ea, shade: 0x414b68, rim: 0xffdcaa, fog: 0x395575 },
  forest: { fill: 0xb4badc, shade: 0x464362, rim: 0xe8c39a, fog: 0x4f507b },
  marsh: { fill: 0xc7d5be, shade: 0x324d4b, rim: 0xf0c58d, fog: 0x3e6265 },
  abbey: { fill: 0xb0c1d4, shade: 0x454158, rim: 0xffdca7, fog: 0x414e64 }
};

function cachedMaterial(world, key, build) {
  if (!world.materials.has(key)) world.materials.set(key, build());
  return world.materials.get(key);
}

function scenery(object, design) {
  markProcedural(object, 'procedural-scenery', design);
  object.userData.modelOrigin.source = 'src/act1/visual-scene.js';
  return object;
}

function gradeArea(world) {
  const lighting = LIGHTING[world.biome] ?? LIGHTING.abbey;
  world.hemi.color.setHex(lighting.fill);
  world.hemi.groundColor.setHex(lighting.shade);
  world.hemi.intensity = 1.34;
  world.rim.color.setHex(lighting.rim);
  world.rim.intensity = 1.63;
  world.sun.intensity *= .81;
  world.scene.fog.color.lerp(new T.Color(lighting.fog), .48).multiplyScalar(.72);
  world.scene.fog.density *= 1.46;
  world.scene.background.copy(world.scene.fog.color).multiplyScalar(.76);
}

const backdropVertex = `
varying vec2 worldXZ;
void main() {
  vec4 point = modelMatrix * vec4(position, 1.0);
  worldXZ = point.xz;
  gl_Position = projectionMatrix * viewMatrix * point;
}`;
const backdropFragment = `
varying vec2 worldXZ;
uniform vec3 lowColor;
uniform vec3 highColor;
uniform float time;
uniform float coast;
void main() {
  vec2 p = worldXZ;
  float drift = sin(p.x * .094 + sin(p.y * .124) * 2.5 + time * .12);
  float washes = .47 + drift * .18 + sin(p.y * .09 - p.x * .037) * .12;
  float ripples = sin(p.y * .43 - time * .8 + sin(p.x * .14 - time * .36) * 1.9);
  float ridges = pow(.5 + .5 * ripples, 7.) * coast * (.15 + .23 * washes);
  vec3 shade = mix(lowColor, highColor, clamp(washes + ridges, 0., 1.));
  gl_FragColor = vec4(shade, 1.);
  #include <colorspace_fragment>
}`;

function buildBackdrop(world) {
  // Authored maps already have an ocean or surrounding terrain.
  if (world.area.layout) return null;
  const material = cachedMaterial(world, 'visual-horizon', () => new T.ShaderMaterial({
    uniforms: {
      lowColor: { value: new T.Color() }, highColor: { value: new T.Color() },
      time: { value: 0 }, coast: { value: 0 }
    },
    vertexShader: backdropVertex,
    fragmentShader: backdropFragment
  }));
  const coast = WATERFRONTS.has(world.areaId);
  material.uniforms.coast.value = coast ? 1 : 0;
  material.uniforms.lowColor.value.copy(world.scene.background).multiplyScalar(.66);
  material.uniforms.highColor.value.copy(world.scene.fog.color).lerp(new T.Color(coast ? 0x7babb5 : 0x78898c), .23);
  const floor = world.geometry('visual-horizon', () => new T.PlaneGeometry(320, 320).rotateX(-Math.PI / 2));
  const backdrop = scenery(new T.Mesh(floor, material), 'DistantHaze');
  backdrop.position.y = coast ? -3.6 : -8;
  world.areaGroup.add(backdrop);
  return material;
}

const glowVertex = `
varying vec2 surfaceUV;
void main() {
  surfaceUV = uv;
  vec4 local = vec4(position, 1.);
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * local;
}`;
const glowFragment = `
varying vec2 surfaceUV;
uniform vec3 tint;
uniform float strength;
void main() {
  float d = length(surfaceUV - .5) * 2.;
  float alpha = pow(max(0., 1. - d * d), 2.5) * strength;
  gl_FragColor = vec4(tint, alpha);
  #include <colorspace_fragment>
}`;

function softPlane(world, name, color, opacity, additive = false) {
  const material = cachedMaterial(world, name, () => new T.ShaderMaterial({
    uniforms: { tint: { value: new T.Color(color) }, strength: { value: opacity } },
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    depthWrite: false,
    transparent: true,
    blending: additive ? T.AdditiveBlending : T.NormalBlending,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  }));
  const plane = world.geometry('visual-soft-plane', () => new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2));
  return new T.Mesh(plane, material);
}

function buildWaylights(world) {
  const placements = [];
  for (const item of world.interactables) {
    if (item.kind !== 'exit') continue;
    const angle = item.group.rotation.y, { x, z } = item.definition;
    for (const side of [-1, 1]) {
      const px = x + Math.cos(angle) * 2.85 * side - Math.sin(angle) * 1.8;
      const pz = z - Math.sin(angle) * 2.85 * side - Math.cos(angle) * 1.8;
      if (!world.free(px, pz, .44)) continue;
      const y = world.height(px, pz);
      if (!Number.isFinite(y) || Math.abs(world.height(px + .6, pz) - y) > .36) continue;
      placements.push({ x: px, z: pz, y, angle, scale: side > 0 ? .86 : 1 });
    }
  }
  if (!placements.length) return [];
  const body = world.geometry('visual-waylight-body', waylightGeometry);
  const alloy = world.material('visual-waylight-alloy', { vertexColors: true, roughness: .82, metalness: .12 });
  const lamp = scenery(new T.InstancedMesh(body, alloy, placements.length), 'RoadsideLanterns');
  lamp.castShadow = lamp.receiveShadow = true;
  world.areaGroup.add(lamp);
  const bulbGeometry = world.geometry('visual-waylight-bulb', () => new T.OctahedronGeometry(.093).scale(1, 1.4, .8));
  const bulbMaterial = world.material('visual-waylight-flame', { color: 0xf7b15d, emissive: 0xff8038, emissiveIntensity: .8, roughness: .46 });
  const flames = scenery(new T.InstancedMesh(bulbGeometry, bulbMaterial, placements.length * 2), 'RoadsideLamps');
  world.areaGroup.add(flames);
  const object = new T.Object3D();
  const pool = softPlane(world, 'visual-waylight-pool', 0xfba051, .27, true);
  const groundLight = scenery(new T.InstancedMesh(pool.geometry, pool.material, placements.length), 'RoadsideLightPools');
  world.areaGroup.add(groundLight);
  placements.forEach(({ x, y, z, angle, scale }, index) => {
    object.position.set(x, y, z);
    object.rotation.set(0, angle, 0);
    object.scale.setScalar(scale);
    object.updateMatrix();
    lamp.setMatrixAt(index, object.matrix);
    for (const side of [-1, 1]) {
      object.position.set(x + Math.sin(angle) * side * .126 * scale, y + 1.69 * scale, z + Math.cos(angle) * side * .126 * scale);
      object.updateMatrix();
      flames.setMatrixAt(index * 2 + (side > 0 ? 1 : 0), object.matrix);
    }
    object.position.set(x, y + .06, z);
    object.rotation.set(0, 0, 0);
    object.scale.set(2.25 * scale, 1, 1.86 * scale);
    object.updateMatrix();
    groundLight.setMatrixAt(index, object.matrix);
  });
  for (const mesh of [lamp, flames, groundLight]) mesh.computeBoundingSphere();
  return [pool.material.uniforms.strength];
}

function buildExitSeals(world) {
  const geometry = world.geometry('visual-exit-seal', impactSigilGeometry);
  const material = cachedMaterial(world, 'visual-exit-seal', () => new T.MeshBasicMaterial({
    color: 0x559bd5, vertexColors: true, side: T.DoubleSide,
    transparent: true, opacity: .47, depthWrite: false, toneMapped: false
  }));
  return world.interactables.filter(item => item.kind === 'exit').map(item => {
    const seal = scenery(new T.Mesh(geometry, material), 'ExitSeal');
    seal.position.y = .10;
    seal.position.z = -.83;
    seal.rotation.x = -Math.PI / 2;
    seal.scale.setScalar(1.59);
    item.group.add(seal);
    return { item, seal };
  });
}

function dustGeometry() {
  const positions = new Float32Array(180 * 3);
  const random = new Float32Array(180);
  let seed = 55117;
  const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < random.length; i++) {
    positions[i * 3] = next() * 2 - 1;
    positions[i * 3 + 1] = next();
    positions[i * 3 + 2] = next() * 2 - 1;
    random[i] = next();
  }
  return new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(positions, 3))
    .setAttribute('seed', new T.BufferAttribute(random, 1));
}

function buildAsh(world, parent, x, z, spanX, spanZ) {
  const material = cachedMaterial(world, 'visual-ash-drift', () => new T.ShaderMaterial({
    uniforms: { time: { value: 0 }, size: { value: 2.8 }, tint: { value: new T.Color() } },
    vertexShader: `
      uniform float time, size;
      attribute float seed;
      varying float fade;
      void main() {
        vec3 p = position;
        p.x = mod(p.x + time * (.035 + seed * .03) + 1., 2.) - 1.;
        p.y += sin(time * .55 + seed * 16.) * .10;
        p.z += cos(time * .17 + seed * 5.) * .08;
        vec4 view = modelViewMatrix * vec4(p, 1.);
        fade = (.22 + .5 * seed) * (1. - smoothstep(.78, 1., abs(p.x))) * (1. - smoothstep(21., 60., -view.z));
        gl_PointSize = size * (.7 + seed);
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: `
      uniform vec3 tint;
      varying float fade;
      void main() {
        float glow = max(0., 1. - length(gl_PointCoord - .5) * 2.);
        gl_FragColor = vec4(tint, glow * glow * fade * .63);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false
  }));
  material.uniforms.tint.value.setHex(world.biome === 'abbey' ? 0xcfac91 : 0xc0c9a0);
  const geometry = world.geometry('visual-ash-drift', dustGeometry);
  const ash = new T.Points(geometry, material);
  ash.position.set(x, world.height(x, z) + .5, z);
  ash.scale.set(spanX, 5.1, spanZ);
  ash.frustumCulled = false;
  parent.add(ash);
  return material;
}

function contactShadow(world, actor) {
  if (!(actor.options.party || actor.options.hostile)) return;
  const shadow = scenery(softPlane(world, 'visual-contact-shadow', 0x101724, .55), 'ActorContactShadow');
  const inverse = 1 / Math.max(.0001, Math.abs(actor.wrapper.scale.y));
  const radius = Math.min(.92, (actor.presentationHeight || 2.8) * .25);
  shadow.position.set(0, .055 * inverse, 0);
  shadow.scale.set(radius * inverse, 1, radius * .73 * inverse);
  actor.contactShadow = shadow;
  actor.wrapper.add(shadow);
}

export function updateVisualEdition(world, dt) {
  const visuals = world.visualEdition;
  if (!visuals) return;
  const clock = world.reducedMotion ? 0 : world.time;
  if (visuals.horizon) visuals.horizon.uniforms.time.value = clock;
  visuals.ash.uniforms.time.value = clock;
  visuals.ash.uniforms.size.value = world.qualityLevel === 'low' ? 1.6 : 2.45;
  world.geometries.get('visual-ash-drift').setDrawRange(0, world.reducedMotion ? 32 : world.qualityLevel === 'low' ? 56 : 180);
  for (const strength of visuals.lights) strength.value = .26 + Math.sin(clock * 2.5) * .028 + Math.sin(clock * 6.9) * .012;
  for (const { item, seal } of visuals.seals) seal.visible = !!item.ready;
  const sealMaterial = visuals.seals[0]?.seal.material;
  if (sealMaterial) sealMaterial.opacity = .62 + Math.sin(clock * 1.8) * .07;
  if (visuals.border) {
    visuals.border.grass.count = world.qualityLevel === 'low' ? Math.ceil(visuals.border.fullCount * .60) : visuals.border.fullCount;
  }
  updateTreeSight(world);
  for (const actor of world.actors.values()) {
    if (!actor.wrapper.visible) continue;
    animateCostume(actor, world.time, dt, world.reducedMotion);
    if (actor.contactShadow) actor.contactShadow.visible = !actor.presentedDead;
  }
}

export function installVisualEdition(World) {
  const base = World.prototype;
  const { prop, createActor, destroyActor, loadArea, buildBattleStage, clearArea } = base;
  base.prop = function (name, parent = this.areaGroup, position = [0, 0, 0], scale = 1) {
    return canBuildEquipment(name) ? buildEquipment(this, name, parent, position, scale) : prop.call(this, name, parent, position, scale);
  };
  base.createActor = function (...args) {
    if (this.actors.has(args[0])) return this.actors.get(args[0]);
    const actor = createActor.apply(this, args);
    dressActor(this, actor);
    contactShadow(this, actor);
    return actor;
  };
  base.destroyActor = function (actor) {
    actor.visualMantle?.mesh.geometry.dispose();
    return destroyActor.call(this, actor);
  };
  base.loadArea = function (...args) {
    const result = loadArea.apply(this, args);
    if (!this.area) return result;
    gradeArea(this);
    const horizon = buildBackdrop(this);
    const lights = buildWaylights(this);
    const seals = buildExitSeals(this);
    const border = buildRouteBorders(this);
    const ash = buildAsh(this, this.areaGroup, 0, 0, this.radiusX, this.radiusZ);
    bindTreeSight(this);
    this.visualEdition = { horizon, lights, ash, seals, border };
    return result;
  };
  base.buildBattleStage = function (...args) {
    const result = buildBattleStage.apply(this, args);
    const center = this.battleCenter;
    buildAsh(this, this.battleStage, center.x, center.z, 20, 24);
    return result;
  };
  base.clearArea = function (...args) {
    this.visualEdition = null;
    return clearArea.apply(this, args);
  };
}
