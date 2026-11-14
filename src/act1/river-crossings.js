import * as T from '../../assets/vendor/three.module.js';
import { bridgeHeight, bridgeSpans, riverSections } from './area-geometry.js?v=rivers-0181';

function indicesForGrid(indices, row, column, columns) {
  if (!row || !column) return;
  const d = row * columns + column, c = d - 1, b = d - columns, a = b - 1;
  indices.push(a, c, b, b, c, d);
}

function gridGeometry(positions, indices) {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function riverGeometry(river) {
  const sections = riverSections(river), positions = [], edges = [], indices = [];
  const columns = 9;
  for (const [i, { left, right, z }] of sections.entries()) {
    for (let j = 0; j < columns; j++) {
      const t = j / (columns - 1), x = T.MathUtils.lerp(left - .58, right + .58, t);
      positions.push(x, river.level, z);
      edges.push(Math.min(1, Math.abs(t * 2 - 1) * 1.16));
      indicesForGrid(indices, i, j, columns);
    }
  }
  const geometry = gridGeometry(positions, indices);
  geometry.setAttribute('waterEdge', new T.Float32BufferAttribute(edges, 1));
  return geometry;
}

function deckPicker(bridge, deck) {
  const positions = [], indices = [], columns = 5;
  const length = bridge.end - bridge.start, rows = Math.ceil(length / .42);
  for (let i = 0; i <= rows; i++) {
    const x = bridge.start + i * length / rows;
    for (let j = 0; j < columns; j++) {
      const z = bridge.z + bridge.width / 2 - j * bridge.width / (columns - 1);
      positions.push(x, deck(x, z), z);
      indicesForGrid(indices, i, j, columns);
    }
  }
  return gridGeometry(positions, indices);
}

const timber = [0x946d45, 0x86603b, 0xa07a50, 0x755331, 0x93724b];
const stone = [0x96907d, 0x827f70, 0xa09a88, 0x73746a, 0x8e8977];

function buildBridge(world, bridge) {
  const deck = (x, z = bridge.z) => bridgeHeight(bridge, x, z, (a, b) => world.height(a, b));
  const group = new T.Group();
  group.name = bridge.label;
  world.areaGroup.add(group);
  const tag = { kind: 'authored-landscape', source: world.areaId, layer: 'bridge', id: bridge.id };
  const boxes = [], { start, end, left, right, x, z, width } = bridge;
  const masonry = bridge.style === 'stone';
  const block = (x, y, z, w, h, d, color, tilt = 0) => boxes.push({ x, y, z, w, h, d, color, tilt });
  function along(a, b, lane, w, h, offset, color) {
    const ya = deck(a, lane), yb = deck(b, lane);
    block((a + b) / 2, (ya + yb) / 2 + offset, lane, Math.hypot(b - a, yb - ya), h, w,
      color, Math.atan2(yb - ya, b - a));
  }

  const count = Math.ceil((end - start) / (masonry ? .87 : .39));
  const step = (end - start) / count;
  for (let i = 0; i < count; i++) {
    const a = start + i * step, b = a + step;
    if (masonry) {
      for (let j = -2; j <= 2; j++) along(a + .016, b - .016, z + j * width / 5,
        width / 5 - .032, .23, -.115, stone[(i * 3 + j + 2) % stone.length]);
    } else {
      along(a + .009, b - .009, z, width, .17, -.085, timber[(i * 7 + Math.floor(i / 3)) % timber.length]);
    }
  }
  for (const side of [-1, 1]) {
    const lane = z + side * (width / 2 - .155);
    const a = start + .25, b = end - .25, bays = Math.ceil((b - a) / 2.7);
    const bay = (b - a) / bays;
    for (let i = 0; i < bays; i++) {
      const u = a + i * bay, v = u + bay;
      if (masonry) {
        along(u, v, lane, .40, .62, .31, stone[(i + 3) % stone.length]);
        along(u, v, lane, .53, .15, .695, 0xada58e);
      } else {
        along(u, v, lane, .14, .15, .58, 0x72502e);
        along(u, v, lane, .19, .16, 1.11, 0x936a41);
      }
    }
    for (let i = 0; i <= bays; i++) {
      const u = a + i * bay, floor = deck(u, lane);
      if (masonry) {
        block(u, floor + .43, lane, .43, .86, .54, 0x8b8774);
        block(u, floor + .91, lane, .55, .12, .67, 0xa69f89);
      } else {
        block(u, floor + .525, lane, .25, 1.25, .27, i % 2 ? 0x614225 : 0x745431);
        block(u, floor + 1.17, lane, .29, .10, .31, 0xa78152);
      }
    }
    along(left, right, z + side * width * .30, .28, .38, -.29, masonry ? 0x797564 : 0x5a4028);
  }
  for (const footing of [left, right]) {
    const top = deck(footing) - .14, bottom = bridge.river.level - .55;
    const courses = Math.ceil((top - bottom) / .34), course = (top - bottom) / courses;
    for (let i = 0; i < courses; i++) {
      for (let j = 0; j < 5; j++) {
        const d = (width + .24) / 5;
        block(footing + .1 * (i % 2), bottom + (i + .5) * course, z + (j - 2) * d,
          1.06 + .06 * (j % 2), course - .02, d - .025, stone[(i + j * 2) % stone.length]);
      }
    }
  }
  if (masonry) {
    for (const p of [T.MathUtils.lerp(left, right, .29), T.MathUtils.lerp(left, right, .71)]) {
      const bottom = bridge.river.level - .75, h = deck(p) - .18 - bottom;
      block(p, bottom + h / 2, z, 1.03, h, width * .89, 0x7f7c70);
      block(p, bottom + h - .16, z, 1.34, .32, width * .96, 0x9b957d);
    }
  } else {
    for (const side of [-1, 1]) {
      const lane = z + side * width * .37, footing = bridge.river.level - .9, h = deck(x, lane) - footing - .12;
      block(x, footing + h / 2, lane, .32, h, .32, 0x5d432c);
    }
    block(x, deck(x) - .46, z, .33, .31, width * .95, 0x67452a);
  }

  const source = world.geometry('river-crossing-box', () => new T.BoxGeometry(1, 1, 1));
  const material = bridgeMaterial(world, masonry);
  const mesh = new T.InstancedMesh(source, material, boxes.length);
  const transform = new T.Object3D(), tint = new T.Color();
  boxes.forEach(({ x, y, z, w, h, d, color, tilt }, i) => {
    transform.position.set(x, y, z);
    transform.scale.set(w, h, d);
    transform.rotation.z = tilt;
    transform.updateMatrix();
    mesh.setMatrixAt(i, transform.matrix);
    mesh.setColorAt(i, tint.setHex(color));
  });
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  mesh.name = 'Structure of ' + bridge.id;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.modelOrigin = tag;
  group.add(mesh);

  const geometry = deckPicker(bridge, deck);
  const picker = new T.Mesh(geometry, world.materials.get('proxy'));
  picker.name = 'Deck of ' + bridge.id;
  picker.userData.walkDeck = true;
  picker.userData.modelOrigin = { ...tag, layer: 'bridge-deck' };
  world.areaGeometries.add(geometry);
  world.areaGroup.add(picker);
}

function bridgeMaterial(world, masonry) {
  const key = masonry ? 'river-crossing-stone' : 'river-crossing-timber';
  if (world.materials.has(key)) return world.materials.get(key);
  const material = world.material(key, { color: 0xffffff, roughness: .96 });
  material.defines = { ...(material.defines || {}), CROSSING_STONE: masonry ? 1 : 0 };
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 plankPosition;\n' + shader.vertexShader.replace('#include <project_vertex>',
      'plankPosition = (instanceMatrix * vec4(transformed,1.)).xyz;\n#include <project_vertex>');
    shader.fragmentShader = `varying vec3 plankPosition;
      float grainHash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,73.9)))*43758.5453); }
      float grainNoise(vec3 p) {
        vec3 cell=floor(p), t=fract(p);t=t*t*(3.-2.*t);
        return mix(mix(mix(grainHash(cell),grainHash(cell+vec3(1,0,0)),t.x),
                       mix(grainHash(cell+vec3(0,0,1)),grainHash(cell+vec3(1,0,1)),t.x),t.z),
                   mix(mix(grainHash(cell+vec3(0,1,0)),grainHash(cell+vec3(1,1,0)),t.x),
                       mix(grainHash(cell+vec3(0,1,1)),grainHash(cell+vec3(1,1,1)),t.x),t.z),t.y);
      }
    ` + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      #if CROSSING_STONE == 1
        float large=grainNoise(plankPosition*1.9);
        float fine=grainNoise(plankPosition*15.);
        diffuseColor.rgb*=.84+.22*large+.10*fine;
      #else
        vec3 p=plankPosition;
        float grain=grainNoise(vec3(p.x*24.,p.y*12.,p.z*.71));
        float tone=grainNoise(vec3(p.x*3.,p.y*2.,p.z*.35));
        diffuseColor.rgb*=.76+.29*grain+.16*tone;
      #endif
    `);
  };
  material.customProgramCacheKey = () => key;
  return material;
}

export function buildRiverBridges(world) {
  for (const bridge of bridgeSpans(world.area.layout)) buildBridge(world, bridge);
}
