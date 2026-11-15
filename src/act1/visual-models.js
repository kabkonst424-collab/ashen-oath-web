import * as T from '../../assets/vendor/three.module.js';
import { motionCurve } from './reference-motion.js?v=motion-190';
import { mergeGeometries } from '../../assets/vendor/BufferGeometryUtils.js';

const BRONZE = 0xba854d;
const LEATHER = 0x44312b;
const STEEL = 0x839bac;
const DARK_STEEL = 0x253745;
const TEAL = 0x65d3cf;
const GRIP_SCALE = new T.Vector3(1, 1, 1);
const UP = new T.Vector3(0, 1, 0);

export function markProcedural(object, kind, design) {
  object.name = design;
  object.userData.modelOrigin = { kind, source: 'src/act1/visual-models.js', design };
  return object;
}

function plate(outline, z, depth, bevel) {
  const contour = new T.Shape(outline.map(([x, y]) => new T.Vector2(x, y)));
  return new T.ExtrudeGeometry(contour, {
    depth, steps: 1, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1
  }).translate(0, 0, z);
}

function collar(top, bottom, height, y, segments = 10) {
  return new T.CylinderGeometry(top, bottom, height, segments).translate(0, y, 0);
}

function tube(points, radius, segments = 16) {
  const path = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
  return new T.TubeGeometry(path, segments, radius, 6, false);
}

function combinedParts(parts) {
  const geometries = parts.map(([source, tint]) => {
    const geometry = source.index ? source.toNonIndexed() : source;
    if (source !== geometry) source.dispose();
    geometry.deleteAttribute('uv');
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const base = new T.Color(tint);
    const color = new T.Color();
    for (let i = 0; i < positions.count; i++) {
      const fleck = Math.sin(positions.getX(i) * 25 + positions.getY(i) * 17 + positions.getZ(i) * 33);
      color.copy(base).multiplyScalar(.92 + .12 * fleck).toArray(colors, i * 3);
    }
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    return geometry;
  });
  const geometry = mergeGeometries(geometries);
  for (const part of geometries) part.dispose();
  return geometry;
}

function sword() {
  const blade = [[0, -.93], [.047, -.77], [.064, -.15], [0, -.125], [-.064, -.15], [-.047, -.77]];
  const fuller = [[0, -.81], [.013, -.67], [.022, -.19], [-.022, -.19], [-.013, -.67]];
  const guard = [[-.17, -.074], [-.139, -.13], [-.049, -.102], [.049, -.102], [.139, -.13],
    [.17, -.074], [.093, -.041], [-.093, -.041]];
  return combinedParts([
    [plate(blade, -.008, .016, .008), STEEL],
    [plate(fuller, -.017, .034, .004), DARK_STEEL],
    [plate(guard, -.020, .04, .007), BRONZE],
    [collar(.027, .025, .168, .041), LEATHER],
    [collar(.026, .037, .029, .135), BRONZE],
    [new T.OctahedronGeometry(.042).scale(.87, 1.07, .76).translate(0, .162, 0), DARK_STEEL],
    ...[.001, .04, .079].map(y => [collar(.027, .027, .008, y), 0x6f4f37])
  ]);
}

function shield() {
  const outline = [[0, -.49], [.125, -.357], [.212, -.17], [.232, .347], [.177, .465], [0, .424],
    [-.177, .465], [-.232, .347], [-.212, -.17], [-.125, -.357]];
  const inset = outline.map(([x, y]) => [x * .83, y * .86]);
  const sun = [[0, .216], [.053, .067], [.147, .023], [.057, -.03], [0, -.235],
    [-.057, -.03], [-.147, .023], [-.053, .067]];
  return combinedParts([
    [plate(outline, -.08, .08, .012), DARK_STEEL],
    [plate(outline, -.109, .028, .011), BRONZE],
    [plate(inset, -.12, .02, .008), 0x623b35],
    [plate(sun, -.139, .02, .005), BRONZE],
    [new T.OctahedronGeometry(.071).scale(.69, 1.05, .43).translate(0, .018, -.151), 0xeec37c],
    ...[[.17, .34], [-.17, .34], [.15, -.17], [-.15, -.17]].map(([x, y]) => [
      new T.IcosahedronGeometry(.019).scale(1, 1, .55).translate(x, y, -.126), 0xd5a875
    ])
  ]).rotateY(Math.PI);
}

function staff() {
  const claws = [0, Math.PI * 2 / 3, Math.PI * 4 / 3].map(angle => [
    tube([[0, .69, 0], [.075, .77, 0], [.107, .86, 0], [.078, .94, 0], [.021, .993, 0]], .014, 12)
      .rotateY(angle), BRONZE
  ]);
  return combinedParts([
    [collar(.025, .019, 1.63, -.044), 0x3c4542],
    [collar(.029, .030, .27, -.032), LEATHER],
    ...[-.80, -.63, -.19, .13, .63, .72].map(y => [collar(.032, .032, .03, y), BRONZE]),
    [new T.TorusGeometry(.078, .012, 5, 16).rotateX(Math.PI / 2).translate(0, .87, 0), 0x83aaa7],
    ...claws
  ]).translate(0, -.025, 0);
}

const BOW_TOP = [.086, .475, -.049];
const BOW_BOTTOM = [.002, -.475, -.049];

function bow() {
  // Bounds match the stowed bow and the two endpoints used by the draw IK.
  const limbs = tube([BOW_BOTTOM, [.049, -.393, -.021], [.074, -.225, -.003], [0, 0, 0],
    [.10, .225, -.012], [.125, .39, -.028], BOW_TOP], .017, 24);
  return combinedParts([
    [limbs, 0x71584a],
    [collar(.024, .024, .13, 0), LEATHER],
    [collar(.028, .025, .021, -.061).translate(.014, 0, 0), BRONZE],
    [collar(.025, .028, .021, .061).translate(.022, 0, 0), BRONZE],
    [new T.OctahedronGeometry(.036).scale(.77, 1.4, .59).translate(.024, 0, .01), 0x99b8a4]
  ]);
}

export function waylightGeometry() {
  const finial = [[0, 2.02], [.24, 1.69], [.23, 1.45], [0, 1.36], [-.23, 1.45], [-.24, 1.69]];
  return combinedParts([
    [collar(.29, .39, .18, .09, 7), 0x505f65],
    [collar(.21, .27, .21, .27, 6), 0x68757b],
    [collar(.11, .17, .98, .84, 5), 0x4a545b],
    [collar(.22, .12, .16, 1.407, 6), 0x6b716c],
    [plate(finial, -.069, .14, .025), 0x30383f],
    [plate([[0, 1.94], [.127, 1.68], [0, 1.48], [-.127, 1.68]], .083, .012, .013), BRONZE],
    [plate([[0, 1.94], [.127, 1.68], [0, 1.48], [-.127, 1.68]], -.104, .012, .013), BRONZE],
    [new T.TorusGeometry(.156, .018, 6, 12).rotateX(Math.PI / 2).translate(0, 1.35, 0), BRONZE]
  ]);
}

const BUILDERS = { Sword: sword, Shield: shield, Staff: staff, Bow: bow };

export function canBuildEquipment(name) {
  return Object.hasOwn(BUILDERS, name);
}

export function buildEquipment(world, name, parent, position, scale) {
  const prop = new T.Group();
  prop.name = name;
  prop.position.set(...position);
  prop.scale.setScalar(scale);
  parent.add(prop);

  const material = world.material('visual-forged-alloy', { vertexColors: true, metalness: .28, roughness: .58 });
  const body = markProcedural(new T.Mesh(world.geometry('visual-equipment-' + name, BUILDERS[name]), material), 'procedural-equipment', name);
  body.castShadow = body.receiveShadow = true;
  prop.add(body);

  if (name === 'Staff') {
    const crystal = world.geometry('visual-staff-crystal', () => new T.OctahedronGeometry(.073).scale(1, 1.72, 1));
    const glass = world.material('visual-staff-glass', { color: TEAL, emissive: 0x359591, emissiveIntensity: .45, roughness: .26, metalness: .18 });
    const light = markProcedural(new T.Mesh(crystal, glass), 'procedural-equipment', 'StaffCrystal');
    light.position.y = .840;
    prop.add(light);
  }
  if (name === 'Bow') {
    const wire = world.geometry('visual-bow-string', () => tube([BOW_BOTTOM, BOW_TOP], .0028, 2));
    const strand = markProcedural(
      new T.Mesh(wire, world.material('visual-bow-fiber', { color: 0xc3b59b, roughness: .95 })),
      'procedural-equipment', 'StowedBowString'
    );
    strand.userData.stowedBowString = true;
    prop.add(strand);
  }
  return prop;
}

const MANTLES = {
  alar: { width: .84, length: 1.13, color: 0x813b36, trim: 0xcf9c5c, back: .31 },
  myrt: { width: .62, length: .72, color: 0x285c51, trim: 0x9bb79b, back: .26 },
  elian: { width: .68, length: .93, color: 0x354d72, trim: 0x8db2c8, back: .28 }
};
const CLOTH_COLUMNS = 14;
const CLOTH_ROWS = 12;

function cloakGeometry(profile) {
  const geometry = new T.PlaneGeometry(1, 1, CLOTH_COLUMNS, CLOTH_ROWS);
  geometry.attributes.position.setUsage(T.DynamicDrawUsage);
  const color = new T.Color(), base = new T.Color(profile.color), trim = new T.Color(profile.trim);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let row = 0; row <= CLOTH_ROWS; row++) {
    for (let column = 0; column <= CLOTH_COLUMNS; column++) {
      const edge = column === 0 || column === CLOTH_COLUMNS || row >= CLOTH_ROWS - 1;
      color.copy(edge ? trim : base).multiplyScalar(.78 + .19 * Math.cos(column * 1.47) + .13 * row / CLOTH_ROWS);
      color.toArray(colors, (row * (CLOTH_COLUMNS + 1) + column) * 3);
    }
  }
  geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
  return geometry;
}

export function dressActor(world, actor) {
  if (actor.refreshVisual?.base === 'forged_mill_wisp') dressWisp(world, actor);
  const role = actor.options.party && actor.options.role;
  const profile = MANTLES[role];
  const spine = profile && actor.root.getObjectByName('Spine');
  if (!spine) return;
  const mount = new T.Group();
  const pivot = spine.getWorldPosition(new T.Vector3());
  const orientation = actor.wrapper.getWorldQuaternion(new T.Quaternion());
  orientation.multiply(new T.Quaternion().setFromAxisAngle(UP, actor.sourceFrontYaw || 0));
  const matrix = new T.Matrix4().compose(pivot, orientation, GRIP_SCALE);
  matrix.premultiply(new T.Matrix4().copy(spine.matrixWorld).invert()).decompose(mount.position, mount.quaternion, mount.scale);
  spine.add(mount);

  const geometry = cloakGeometry(profile);
  const material = world.material('visual-woven-wool', { vertexColors: true, roughness: .92, side: T.DoubleSide });
  const mesh = markProcedural(new T.Mesh(geometry, material), 'procedural-costume', 'Mantle_' + role);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mount.add(mesh);
  actor.visualMantle = { profile, mesh, drift: 0 };
  actor.visualCrystal = actor.root.getObjectByName('StaffCrystal');
  animateCostume(actor, 0, 0, true);
}

function wispShell() {
  const sections = [];
  for (const angle of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) {
    sections.push([
      plate([[0, -.35], [.145, -.19], [.186, .12], [.06, .29], [.098, .06], [0, -.12]], -.027, .054, .011)
        .translate(.30, .04, 0).rotateY(angle), 0x77654d
    ]);
    sections.push([new T.OctahedronGeometry(.055).scale(.66, 1.5, .68)
      .translate(.33, .103, .046).rotateY(angle), 0x79ad9d]);
  }
  return combinedParts(sections);
}

function dressWisp(world, actor) {
  const rig = new T.Group();
  const inverse = 1 / Math.max(.0001, Math.abs(actor.wrapper.scale.y));
  const hover = actor.presentationHeight * .61;
  rig.position.y = hover * inverse;
  rig.scale.setScalar(inverse);
  actor.wrapper.add(rig);

  const shell = markProcedural(new T.Mesh(
    world.geometry('visual-wisp-shell', wispShell),
    world.material('visual-wisp-alloy', { vertexColors: true, metalness: .31, roughness: .55 })
  ), 'procedural-creature', 'MillWispShell');
  shell.castShadow = true;
  const spark = markProcedural(new T.Mesh(
    world.geometry('visual-wisp-core', () => new T.IcosahedronGeometry(.235, 1).scale(.88, 1.48, .88)),
    world.material('visual-wisp-core', { color: 0x84faea, emissive: 0x35c1b4, emissiveIntensity: 1.1, roughness: .41 })
  ), 'procedural-creature', 'MillWispCore');
  rig.add(shell, spark);
  actor.root.traverse(object => { if (object.isSkinnedMesh) object.visible = false; });
  actor.visualCastAnchor = spark;
  actor.visualWisp = { rig, shell, spark, inverse, hover };
}

function animateWisp(actor, time, reducedMotion) {
  const wisp = actor.visualWisp;
  if (!wisp) return;
  const clock = reducedMotion ? 0 : time;
  const action = actor.actions[actor.current];
  const phase = action?.getClip().duration ? Math.min(1, action.time / action.getClip().duration) : 0;
  const collapse = actor.current === 'Death' ? motionCurve('fall', phase / .83) : 0;
  const hit = actor.current === 'Hit' && !reducedMotion ? motionCurve('bowFollow', phase) : 0;
  const guard = actor.current === 'Block' ? motionCurve('quick', phase) : 0;
  const travelling = actor.current === 'Run' ? .9 : actor.current === 'Walk' ? .46 : 0;
  const active = actor.current === actor.pulseAnimation && time < actor.pulseUntil;
  const charge = active && !reducedMotion ? Math.sin(phase * Math.PI) : 0;
  const bob = Math.sin(clock * (4.1 + travelling * 2)) * (.13 - travelling * .065) * (1 - collapse);
  wisp.rig.position.y = (wisp.hover * (1 - collapse * .76) + bob - hit * .12) * wisp.inverse;
  wisp.rig.scale.setScalar((1 - .72 * collapse) * wisp.inverse);
  if (actor.current !== 'Death' || wisp.spinClock === undefined) wisp.spinClock = clock;
  wisp.shell.rotation.set(.28 + (.16 * Math.sin(clock * 2) + travelling * .28 + hit * .28) * (1 - collapse),
    wisp.spinClock * .83 + 1.1 * charge, .44 * collapse + guard * .33);
  wisp.spark.rotation.y = -wisp.spinClock * 1.37;
  wisp.spark.scale.setScalar(1 + .29 * charge - .12 * hit);
}

export function animateCostume(actor, time, dt, reducedMotion) {
  animateWisp(actor, time, reducedMotion);
  const cape = actor.visualMantle;
  if (!cape || actor.presentedDead) return;
  const motion = reducedMotion ? 0 : Math.min(1, Math.abs(actor.motionSpeed || 0) / 5);
  const action = actor.actions[actor.current];
  const phase = action?.getClip().duration ? action.time / action.getClip().duration : 0;
  const active = actor.current === actor.pulseAnimation && time < actor.pulseUntil;
  const kick = active && !reducedMotion ? Math.sin(Math.PI * phase) * .23 : 0;
  cape.drift = reducedMotion ? 0 : T.MathUtils.damp(cape.drift, motion * .31 + kick, 7, dt);
  const clock = reducedMotion ? 0 : time;
  const attribute = cape.mesh.geometry.attributes.position;
  const { width, length, back } = cape.profile;
  for (let row = 0; row <= CLOTH_ROWS; row++) {
    const trail = row / CLOTH_ROWS;
    const bend = trail * trail;
    for (let column = 0; column <= CLOTH_COLUMNS; column++) {
      const u = column / CLOTH_COLUMNS * 2 - 1;
      const x = u * width * (.38 + .12 * trail) + (!reducedMotion ? bend * Math.sin(clock * 3 - trail * 2) * .047 : 0);
      const y = .24 - trail * length + bend * (Math.abs(u) * .075 + cape.drift * .25);
      const z = -back - .11 * trail - bend * cape.drift
        + Math.cos(u * 11 - trail * 2 - clock * (1.5 + motion)) * (.016 + .027 * trail);
      attribute.setXYZ(row * (CLOTH_COLUMNS + 1) + column, x, y, z);
    }
  }
  attribute.needsUpdate = true;
  cape.mesh.geometry.computeVertexNormals();
  if (actor.visualCrystal) {
    actor.visualCrystal.rotation.y = clock * .9;
    actor.visualCrystal.scale.setScalar(1 + kick * .55);
  }
}
