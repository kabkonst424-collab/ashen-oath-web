import * as T from '../../assets/vendor/three.module.js';
import { obstacleOutline, segmentDistance, walkableLayout } from './area-geometry.js?v=roads-018';
import { TerrainMaterials } from './terrain-material.js?v=painted-20261114-r2';

export function buildAuthoredRoad(world, road) {
  const curve = new T.CatmullRomCurve3(road.points.map(([x,z]) => new T.Vector3(x,0,z)));
  const samples = curve.getSpacedPoints(Math.max(10, Math.ceil(curve.getLength() / 1.1)));
  const positions = [], uv = [], edges = [], indices = [];
  const half = road.width / 2, columns = 8;
  let distance = 0;
  for (let i = 0; i < samples.length; i++) {
    const point = samples[i], before = samples[Math.max(0,i-1)], after = samples[Math.min(samples.length-1,i+1)];
    const dx = after.x - before.x, dz = after.z - before.z, length = Math.hypot(dx,dz) || 1;
    if (i) distance += point.distanceTo(before);
    const width = half * (1 + .075 * Math.sin(distance * .61) + .045 * Math.cos(distance * .39));
    for (let j = 0; j <= columns; j++) {
      const across = j / columns * 2 - 1;
      const x = point.x - dz / length * across * width, z = point.z + dx / length * across * width;
      positions.push(x, world.height(x,z) + .12, z);
      uv.push(x / 8, z / 8);
      edges.push(Math.max(Math.abs(across), 1 - Math.min(i, samples.length - 1 - i) * .32));
      if (!i || !j) continue;
      const d = i * (columns + 1) + j, c = d - 1, b = d - columns - 1, a = b - 1;
      indices.push(a,b,c,b,d,c);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setAttribute('waterEdge',new T.Float32BufferAttribute(edges,1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const source = world.meshyParts('path_strip').parts[0].material;
  const material = world.terrainMaterials.material(Array.isArray(source) ? source[0] : source,'path_strip',{path:true});
  const mesh = attach(world,geometry,material,'Authored road','road');
  mesh.receiveShadow = true;
  return {mesh,samples};
}

function surfaceGeometry(outline, holes, height) {
  const vertices = [...outline, ...holes.flat()];
  const vectorize = ring => ring.map(([x, z]) => new T.Vector2(x, z));
  const faces = T.ShapeUtils.triangulateShape(vectorize(outline), holes.map(vectorize));
  const positions = [], uvs = [], indices = [], points = new Map();
  const lengthSq = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
  function index(x, z) {
    const key = x.toFixed(6) + ':' + z.toFixed(6);
    if (points.has(key)) return points.get(key);
    const id = positions.length / 3;
    positions.push(x, height(x, z), z);
    uvs.push(x / 8, z / 8);
    points.set(key, id);
    return id;
  }
  for (const face of faces) {
    const [a, b, c] = face.map(i => vertices[i]);
    const pending = [[a, b, c]];
    while (pending.length) {
      const [p, q, r] = pending.pop();
      const lengths = [lengthSq(p, q), lengthSq(q, r), lengthSq(r, p)];
      const longest = Math.max(...lengths);
      if (longest > 36) {
        const i = lengths.indexOf(longest), points = [p, q, r];
        const u = points[i], v = points[(i + 1) % 3], w = points[(i + 2) % 3];
        const middle = [(u[0] + v[0]) * .5, (u[1] + v[1]) * .5];
        pending.push([u, middle, w], [middle, v, w]);
      } else {
        const up = (q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]);
        if (Math.abs(up) > 1e-8) {
          indices.push(index(...p), index(...(up > 0 ? q : r)), index(...(up > 0 ? r : q)));
        }
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function shorelineGeometry(ring, height, drop) {
  const positions = [], indices = [];
  const samples = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const count = 2 ** Math.max(0, Math.ceil(Math.log2(Math.hypot(a[0] - b[0], a[1] - b[1]) / 6)));
    for (let j = 0; j < count; j++) samples.push([a[0] + (b[0] - a[0]) * j / count, a[1] + (b[1] - a[1]) * j / count]);
  }
  for (let i = 0; i < samples.length; i++) {
    const [x, z] = samples[i];
    const y = height(x, z);
    positions.push(x, y + .015, z, x, y - drop, z);
    const a = 2 * i, b = 2 * ((i + 1) % samples.length);
    indices.push(a, a + 1, b, b, a + 1, b + 1, a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function attach(world, geometry, material, name, origin) {
  const object = new T.Mesh(geometry, material);
  object.name = name;
  object.userData.modelOrigin = { kind: 'authored-landscape', source: world.areaId, layer: origin };
  object.receiveShadow = origin === 'ground';
  world.areaGeometries.add(geometry);
  world.areaGroup.add(object);
  return object;
}

function authoredGroundMaterial(world, id, { path = false } = {}) {
  const source = world.meshyParts(id).parts[0].material;
  return world.terrainMaterials.material(Array.isArray(source) ? source[0] : source, id, { path });
}

export function buildAuthoredOcean(world) {
  const rx = world.radiusX + 120, rz = world.radiusZ + 120;
  const coast = new Set(['fen','fortress']);
  if (!coast.has(world.areaId)) {
    const surrounding = new T.PlaneGeometry(2 * rx, 2 * rz, 32, 32).rotateX(-Math.PI / 2);
    const positions = surrounding.attributes.position;
    const texture = world.areaId === 'sunfields' || world.areaId === 'briarwood' ? 'terrain_forest' : 'terrain_marsh';
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      positions.setY(i, -1.4 + .47 * Math.sin(x * .054) * Math.cos(z * .037));
    }
    surrounding.computeVertexNormals();
    attach(world, surrounding, authoredGroundMaterial(world, texture), 'Surrounding terrain', 'landscape');
    return;
  }
  const geometry = new T.PlaneGeometry(2 * rx, 2 * rz, 24, 24);
  geometry.rotateX(-Math.PI / 2).translate(0, -1.1, 0);
  geometry.setAttribute('waterEdge', new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count), 1));
  const source = world.meshyParts('water_strip').parts[0].material;
  const material = world.worldElements.material(Array.isArray(source) ? source[0] : source, false, { x: 0, z: 0 },
    world.radiusX, world.radiusZ, true);
  const mesh = attach(world, geometry, material, 'Surrounding water', 'water');
  mesh.userData.waterSurface = true;
}

export function buildAuthoredGround(world) {
  const { outline, obstacles } = world.area.layout;
  const pools = obstacles.filter(obstacle => obstacle.kind === 'water');
  const holes = pools.map(pool => obstacleOutline(pool, 48));
  const height = (x, z) => world.height(x, z);
  // Use the authored walkable outline for the surface and inherit the shared
  // biome shader/material from the existing Meshy source.
  const terrain = world.meshyTerrainId();
  world.terrainMaterials ??= new TerrainMaterials(world);
  const ground = authoredGroundMaterial(world, terrain);
  world.ground = attach(world, surfaceGeometry(outline, holes, height), ground, 'Authored ground', 'ground');
  attach(world, shorelineGeometry(outline, height, 2.8), world.materials.get('cliff'), 'Outer bank', 'bank');

  const waterSource = world.meshyParts('water_strip').parts[0].material;
  const sourceMap = Array.isArray(waterSource) ? waterSource[0] : waterSource;
  for (const [index, outline] of holes.entries()) {
    const pool = pools[index];
    const elevation = height(pool.x, pool.z) - .20;
    const geometry = surfaceGeometry(outline, [], () => elevation);
    geometry.setAttribute('waterEdge', new T.Float32BufferAttribute(
      Array.from({ length: geometry.attributes.position.count }, (_, i) => {
        const x = geometry.attributes.position.getX(i), z = geometry.attributes.position.getZ(i);
        return Math.min(1, Math.hypot((x - pool.x) / pool.rx, (z - pool.z) / pool.rz));
      }), 1));
    const material = world.worldElements.material(sourceMap, true, pool, pool.rx, pool.rz);
    attach(world, geometry, material, 'Pool ' + index, 'water');
    attach(world, shorelineGeometry(outline, height, .6), world.materials.get('cliff'), 'Pool bank ' + index, 'bank');
  }
}

function onRoad(roads, x, z, padding) {
  return roads.some(road => road.points.some((p, i) =>
    i && segmentDistance(x, z, road.points[i - 1], p) < road.width * .5 + padding));
}

export function buildAuthoredLandscape(world) {
  const layout = world.area.layout;
  const groups = new Map();
  const emit = (slot, x, z, scale = 1, yaw = 0, stretch) => {
    if (!groups.has(slot)) groups.set(slot, []);
    groups.get(slot).push({
      x, y: world.height(x, z), z, scale, ry: yaw,
      sx: stretch?.[0], sy: stretch?.[1], sz: stretch?.[2],
    });
  };
  for (const prop of layout.props) {
    if (prop.slot === 'brazier' || prop.slot === 'camp') {
      const fire = world.meshyProp(prop.slot, world.areaGroup, [prop.x, world.height(prop.x, prop.z), prop.z], prop.scale || 1);
      fire.rotation.y = prop.yaw || 0;
    } else emit(prop.slot, prop.x, prop.z, prop.scale, prop.yaw, prop.stretch);
  }
  for (const obstacle of layout.obstacles) {
    if (obstacle.kind !== 'cliff') continue;
    const ring = obstacleOutline(obstacle, Math.max(5, Math.min(13, Math.round((obstacle.rx + obstacle.rz) / 5))));
    for (const [x, z] of ring) {
      const scale = 2.5 + world.rng() * 1.7;
      emit('rock', (x + obstacle.x) * .5, (z + obstacle.z) * .5,
        scale, world.rng() * 6.28, [scale * 1.7, scale * 1.5, scale]);
    }
  }
  const biomeTrees = world.area.id === 'briarwood' ? 114 : world.area.id === 'sunfields' ? 24 :
    world.biome === 'marsh' ? 60 : world.biome === 'village' ? 60 : 44;
  const wanted = [['tree', biomeTrees, 4], ['grass', 410, .8], ['rock', 112, 1.8]];
  const forests = layout.groves || [];
  for (const [slot, quantity, margin] of wanted) {
    for (let count = 0, attempt = 0; count < quantity && attempt < quantity * 5; attempt++) {
      const group = slot === 'tree' && forests.length && world.rng() < .72 ? forests[attempt % forests.length] : null;
      const x = group ? group[0] + (world.rng() * 2 - 1) * group[2] : (world.rng() * 2 - 1) * world.radiusX;
      const z = group ? group[1] + (world.rng() * 2 - 1) * group[3] : (world.rng() * 2 - 1) * world.radiusZ;
      if (!walkableLayout(layout, x, z) || onRoad(layout.roads, x, z, margin) ||
          world.critical.some(p => Math.hypot(p.x - x, p.z - z) < margin + 2.8) ||
          layout.props.some(p => Math.hypot(x - p.x, z - p.z) < (p.scale || 1) * 1.8 + margin)) continue;
      if (slot === 'tree' && groups.get(slot)?.some(p => Math.hypot(x - p.x, z - p.z) < 3.8)) continue;
      const scale = slot === 'tree' ? .66 + world.rng() * .52 : slot === 'rock' ? .38 + world.rng() * 1.05 : .3 + world.rng() * .36;
      emit(slot, x, z, scale, world.rng() * Math.PI * 2);
      count++;
    }
  }
  for (const field of layout.fields || []) {
    const [cx, cz, rx, rz, yaw = 0] = field;
    const cosine = Math.cos(yaw), sine = Math.sin(yaw);
    for (let u = -rx; u <= rx; u += 2.5) for (let v = -rz; v <= rz; v += 1.9) {
      const a = u + (world.rng() - .5) * .6, b = v + (world.rng() - .5) * .6;
      const x = cx + a * cosine - b * sine, z = cz + a * sine + b * cosine;
      if (walkableLayout(layout, x, z) && !onRoad(layout.roads, x, z, 1.6) &&
          !world.critical.some(p => Math.hypot(p.x - x, p.z - z) < 3.5)) emit('wheat', x, z, .45 + world.rng() * .3, yaw);
    }
  }
  for (const [slot, transforms] of groups) world.meshyInstances(slot, transforms);
  world.buildAtmosphere();
}
