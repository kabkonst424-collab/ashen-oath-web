import * as T from '../../assets/vendor/three.module.js';
import { mergeGeometries } from '../../assets/vendor/BufferGeometryUtils.js';
import { paintMaterial } from './painted-material.js?v=painted-20261114-r2';

const finish = {
  resin: [0xc68b42, .65], fur: [0x654428, .93], tawny: [0xb38457, .92],
  slag: [0x42474c, .94], clinker: [0x635655, .87], molten: [0xffa23e, .65, 0xfa5c12, .70],
  reed: [0x6d7046, .97], straw: [0xa38a50, .92], linen: [0x8f9478, .92],
  bronze: [0xa0834d, .66], cage: [0x515649, .84], glass: [0x80dbc3, .3, 0x24bea7, .55],
  steel: [0x777c80, .77], iron: [0x434b51, .82], braid: [0x923f37, .93],
};

const part = (solid, color, size, at, rotation) => ({ solid, color, size, at, rotation });
const plate = (color, size, at, rotation) => part('plate', color, size, at, rotation);
const shard = (color, size, at, rotation) => part('shard', color, size, at, rotation);
const cone = (color, size, at, rotation) => part('cone', color, size, at, rotation);
const loop = (color, size, at, rotation) => part('ring', color, size, at, rotation);
const hex = (color, size, at, rotation) => part('hex', color, size, at, rotation);

const head = ['Head'];
const chest = ['Spine02', 'Spine2', 'Spine', 'Chest'];
const body = ['Body'];
const anvil = ['Spine02', 'Spine2', 'Spine'];

const outfits = {
  'resin-lynx': [
    [head, [-1, 1].flatMap(side => [
      cone('tawny', [.22, .35, .20], [side * .18, .39, .02], [0, 0, -side * .24]),
      cone('fur', [.085, .24, .075], [side * .24, .60, .025], [0, 0, -side * .34]),
      shard('fur', [.21, .30, .24], [side * .22, .03, .13], [.17, side * .46, side * .66]),
    ])],
    [body, [
      shard('resin', [.20, .30, .41], [0, .46, .22], [.20, .20, .14]),
      shard('resin', [.18, .23, .29], [-.14, .41, -.12], [.30, 0, -.26]),
      shard('resin', [.16, .18, .29], [.13, .39, -.34], [-.2, 0, .39]),
    ]],
  ],
  'slag-golem': [
    [anvil, [
      plate('slag', [1.02, .85, .34], [0, .05, .51]),
      shard('molten', [.41, .53, .18], [0, .10, .70], [0, 0, .33]),
      shard('clinker', [.76, .55, .35], [0, .24, -.45], [.34, 0, 0]),
    ]],
    [head, [
      shard('slag', [.82, .42, .68], [0, .16, .07], [.12, .12, -.04]),
      plate('molten', [.43, .08, .055], [0, .09, .45]),
    ]],
    ...[-1, 1].map(side => [[side < 0 ? 'RightArm' : 'LeftArm'], [
      shard('slag', [.86, .57, .85], [side * .15, .15, .04], [.24, side * .33, -side * .24]),
      shard('clinker', [.66, .36, .54], [side * .21, .39, -.17], [.31, side * .42, 0]),
      shard('molten', [.27, .16, .25], [side * .39, .35, .08], [.33, side * .59, 0]),
    ]]),
    ...['LeftHand', 'RightHand'].map(bone => [[bone], [shard('slag', [.53, .43, .59], [0, -.11, .08])]]),
  ],
  'fen-weaver': [
    [head, [
      part('hat', 'straw', [1.26, .28, 1.01], [0, .34, .01], [0, 0, .07]),
      part('hat', 'reed', [.93, .40, .75], [0, .47, -.05], [0, 0, .07]),
      loop('linen', [.66, .66, .12], [0, .46, -.055], [Math.PI / 2, 0, 0]),
      cone('straw', [.13, .62, .12], [.27, .49, -.34], [-.53, 0, -.34]),
    ]],
    [chest, [...[-1, 1].flatMap(side => [
      plate('linen', [.46, .31, .34], [side * .31, .10, .10], [-.18, side * .55, -side * .31]),
      cone('reed', [.29, .56, .28], [side * .36, .25, -.35], [-.45, 0, side * .21]),
      cone('straw', [.22, .48, .25], [side * .31, .17, -.51], [-.58, 0, side * .27]),
    ]),
      part('box', 'reed', [.51, .32, .32], [0, -.27, -.41], [.1, 0, .18]),
      hex('glass', [.22, .34, .22], [.48, -.30, .13], [0, 0, -.23]),
      hex('bronze', [.24, .095, .24], [.52, -.13, .13], [0, 0, -.23]),
    ]],
  ],
  'mill-wisp': [
    [body, [
      shard('glass', [.49, .70, .49], [0, .11, -.05], [0, .4, 0]),
      hex('bronze', [.67, .13, .67], [0, .53, -.05]),
      hex('bronze', [.51, .11, .51], [0, -.29, -.05], [0, .24, 0]),
      loop('bronze', [.32, .35, .32], [0, .69, -.05]),
      ...Array.from({ length: 4 }, (_, i) => {
        const angle = Math.PI / 2 * i + Math.PI / 4;
        return hex('cage', [.078, .86, .078], [.30 * Math.cos(angle), .11, -.05 + .30 * Math.sin(angle)]);
      }),
    ]],
    ...[[-1, 'WingR'], [1, 'WingL']].map(([side, bone]) => [[bone], [
      plate('bronze', [.23, .09, .42], [side * .28, .02, -.05], [Math.PI / 2, 0, side * -.34]),
      shard('glass', [.14, .11, .22], [side * .39, .06, -.06], [0, 0, side * .3]),
    ]]),
  ],
  'rivet-guard': [
    [head, [
      plate('iron', [.44, .32, .13], [0, .21, .19]),
      plate('bronze', [.38, .055, .07], [0, .24, .27]),
      plate('braid', [.15, .31, .35], [0, .44, -.14], [-.69, 0, 0]),
    ]],
    ...[-1, 1].map(side => [[side < 0 ? 'RightArm' : 'LeftArm'], [
      plate('iron', [.45, .29, .48], [side * .17, .18, .04], [.28, side * .30, -side * .30]),
      plate('steel', [.37, .22, .41], [side * .24, .14, .14], [.27, side * .30, -side * .30]),
      hex('bronze', [.105, .075, .105], [side * .28, .22, .35], [Math.PI / 2, 0, 0]),
    ]]),
    [chest, [
      plate('braid', [.34, .70, .10], [0, -.32, -.38]),
      plate('bronze', [.20, .18, .12], [0, .04, -.44]),
    ]],
  ],
};

const skillClips = {
  'resin-lynx': { forged_lynx_lunge: 'CastEnemyClaw' },
  'slag-golem': { forged_slag_shell: 'CastEnemyRing', forged_slag_eruption: 'CastNova' },
  'fen-weaver': { forged_weaver_needle: 'CastFire', forged_weaver_mend: 'CastEnemyMend' },
  'mill-wisp': { forged_wisp_spark: 'CastFire', forged_wisp_discharge: 'CastEnemyFire' },
  'rivet-guard': { forged_guard_stand: 'CastEnemyGuard', forged_guard_rivet: 'CastHeavy' },
};

function solid(name) {
  switch (name) {
    case 'shard': return new T.IcosahedronGeometry(.55, 0);
    case 'cone': return new T.ConeGeometry(.5, 1, 7);
    case 'ring': return new T.TorusGeometry(.43, .075, 5, 11);
    case 'hex': return new T.CylinderGeometry(.46, .5, 1, 6);
    case 'hat': return new T.CylinderGeometry(.24, .50, 1, 11, 1);
    case 'box': return new T.BoxGeometry(1, 1, 1);
    default: {
      const outline = new T.Shape();
      outline.moveTo(-.36, .35);
      outline.lineTo(.36, .35);
      outline.lineTo(.43, .09);
      outline.lineTo(.32, -.29);
      outline.lineTo(0, -.42);
      outline.lineTo(-.32, -.29);
      outline.lineTo(-.43, .09);
      outline.closePath();
      return new T.ExtrudeGeometry(outline, {
        depth: .58, bevelEnabled: true, bevelSegments: 1, bevelThickness: .15, bevelSize: .07,
      }).translate(0, 0, -.29);
    }
  }
}

function makeParts(parts) {
  const meshes = [], transform = new T.Object3D(), grain = new T.Color();
  for (const data of parts) {
    const geometry = solid(data.solid), faces = geometry.index ? geometry.toNonIndexed() : geometry;
    if (faces !== geometry) geometry.dispose();
    transform.position.fromArray(data.at);
    transform.scale.fromArray(data.size);
    transform.rotation.set(...(data.rotation || [0, 0, 0]));
    transform.updateMatrix();
    faces.applyMatrix4(transform.matrix);
    faces.clearGroups();
    const positions = faces.getAttribute('position'), colors = [];
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const value = .78 + .15 * Math.sin(x * 16 + y * 4 - z * 11) ** 2 + .12 * Math.cos(x * 23 + y * 17 + z * 8) ** 2;
      grain.setRGB(value, value, value);
      colors.push(grain.r, grain.g, grain.b);
    }
    faces.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    meshes.push(faces);
  }
  const group = mergeGeometries(meshes);
  for (const mesh of meshes) mesh.dispose();
  return group;
}

function shortenTail(actor) {
  const tail = actor.root.getObjectByName('Tail');
  const bones = new Set();
  tail?.traverse(child => { if (child.isBone) bones.add(child); });
  actor.root.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const tailIndices = new Set(mesh.skeleton.bones.flatMap((bone, index) => bones.has(bone) ? [index] : []));
    const skin = mesh.geometry.getAttribute('skinIndex'), weights = mesh.geometry.getAttribute('skinWeight');
    if (!tailIndices.size || !skin || !weights) return;
    const geometry = mesh.geometry.clone();
    const pivot = mesh.worldToLocal(tail.getWorldPosition(new T.Vector3()));
    const p = geometry.getAttribute('position'), vertex = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      let influence = 0;
      for (let slot = 0; slot < 4; slot++) if (tailIndices.has(skin.getComponent(i, slot))) influence += weights.getComponent(i, slot);
      if (influence < .03) continue;
      vertex.fromBufferAttribute(p, i).lerp(pivot, .74 * influence);
      p.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    mesh.geometry = geometry;
    actor.outfitGeometry = geometry;
    mesh.userData.modelOrigin = { kind: 'actor-accessory', source: 'Wolf mesh / shortened skin-weighted tail', outfit: 'resin-lynx' };
  });
}

export function addForgedOutfit(world, actor, outfit) {
  const anchors = outfits[outfit];
  if (!anchors) return;
  actor.wrapper.updateMatrixWorld(true);
  if (outfit === 'resin-lynx') shortenTail(actor);
  const rotation = actor.wrapper.getWorldQuaternion(new T.Quaternion())
    .multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), actor.sourceFrontYaw || 0));
  for (const [partIndex, [names, parts]] of anchors.entries()) {
    const anchor = names.map(name => actor.root.getObjectByName(name)).find(Boolean);
    if (!anchor) continue;
    const joint = new T.Group();
    joint.name = 'Forged outfit · ' + outfit;
    const frame = new T.Matrix4().compose(anchor.getWorldPosition(new T.Vector3()), rotation, new T.Vector3(1, 1, 1));
    frame.premultiply(anchor.matrixWorld.clone().invert());
    frame.decompose(joint.position, joint.quaternion, joint.scale);
    anchor.add(joint);
    const palettes = new Map();
    for (const data of parts) {
      if (!palettes.has(data.color)) palettes.set(data.color, []);
      palettes.get(data.color).push(data);
    }
    for (const [colorName, geometryParts] of palettes) {
      const [color, roughness, emissive = 0, emissiveIntensity = 0] = finish[colorName];
      const geometry = world.geometry('forged-outfit:' + outfit + ':' + partIndex + ':' + colorName,
        () => makeParts(geometryParts));
      const material = paintMaterial(world.material('forged-outfit:' + colorName,
        { color, roughness, emissive, emissiveIntensity, vertexColors: true }), { character: true });
      const mesh = new T.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData.modelOrigin = { kind: 'actor-accessory', source: 'Forged enemy outfits', outfit };
      joint.add(mesh);
    }
  }
  const mapped = Object.entries(skillClips[outfit]).filter(([, clip]) => actor.actions[clip]);
  actor.skillClips = { ...actor.skillClips, ...Object.fromEntries(mapped) };
}
