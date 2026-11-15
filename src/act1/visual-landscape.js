import * as T from '../../assets/vendor/three.module.js';
import { markProcedural } from './visual-models.js?v=motion-190';

function colorize(geometry, paint) {
  const points = geometry.attributes.position;
  const colors = new Float32Array(points.count * 3), color = new T.Color();
  for (let i = 0; i < points.count; i++) {
    paint(points.getX(i), points.getY(i), points.getZ(i), color).toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  return geometry;
}

function boulder(coast) {
  // The same deformation is evaluated for coincident vertices on each face.
  const geometry = new T.IcosahedronGeometry(1, 1);
  const points = geometry.attributes.position;
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), y = points.getY(i), z = points.getZ(i);
    const shape = .91 + .13 * Math.sin(x * 6.4 + y * 3.9) * Math.cos(z * 4.1 - y);
    points.setXYZ(i, x * shape, Math.max(-.38, y * shape * .78), z * shape);
  }
  geometry.computeVertexNormals();
  const base = new T.Color(coast ? 0x465b62 : 0x4b504a);
  const moss = new T.Color(coast ? 0x6a8581 : 0x859557);
  return colorize(geometry, (x, y, z, color) => color.copy(base)
    .lerp(moss, T.MathUtils.smoothstep(y + .09 * Math.sin(z * 8 + x * 3), -.09, .55)));
}

function leafClump(coast) {
  const positions = [], indices = [];
  for (let i = 0; i < 6; i++) {
    const angle = i * 2.4, width = coast ? .062 : .125, h = .34 + .115 * (i % 3);
    const c = Math.cos(angle), s = Math.sin(angle), j = i * 5;
    positions.push(0, .01, 0, c * .15 - s * width, h * .46, s * .15 + c * width,
      c * .19, h * .53, s * .19, c * .15 + s * width, h * .45, s * .15 - c * width, c * .34, h, s * .34);
    indices.push(j, j + 1, j + 2, j, j + 2, j + 3, j + 1, j + 4, j + 2, j + 2, j + 4, j + 3);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const base = new T.Color(coast ? 0x52655a : 0x3d634d);
  const tip = new T.Color(coast ? 0xab9a66 : 0x9fbc64);
  return colorize(geometry, (_x, y, _z, color) => color.copy(base).lerp(tip, Math.min(1, y * 1.85)));
}

function randomForArea(id) {
  let seed = 177819;
  for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function scatter(world) {
  const random = randomForArea(world.areaId), centers = [], rocks = [], plants = [];
  for (const path of world.paths) {
    const samples = path.samples;
    const step = Math.max(5, Math.round(samples.length / 5));
    for (let i = step; i < samples.length - 2 && centers.length < 11; i += step) {
      const { x, z } = samples[i];
      const dx = samples[i + 1].x - samples[i - 1].x, dz = samples[i + 1].z - samples[i - 1].z;
      const gap = Math.max(3.7, Number(path.width || 3) * .55 + 1.5);
      const offset = gap / (Math.hypot(dx, dz) || 1) * (random() < .5 ? -1 : 1);
      const px = x + dz * offset, pz = z - dx * offset;
      if (world.free(px, pz, 1.45) && !centers.some(p => Math.hypot(p.x - px, p.z - pz) < 5)) centers.push({ x: px, z: pz });
    }
  }
  for (let i = 0; i < 110 && centers.length < 19; i++) {
    const a = random() * Math.PI * 2, radius = .62 + random() * .32;
    const x = Math.cos(a) * radius * world.radiusX;
    const z = Math.sin(a) * radius * world.radiusZ;
    if (world.free(x, z, 1.3) && !centers.some(p => Math.hypot(p.x - x, p.z - z) < 5)) centers.push({ x, z });
  }
  for (const center of centers) {
    const yaw = random() * Math.PI * 2;
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4 + yaw, radius = (.35 + random() * .5) * Math.sqrt(i);
      const x = center.x + Math.cos(a) * radius, z = center.z + Math.sin(a) * radius;
      if (!world.free(x, z, .72)) continue;
      const size = i < 2 ? .74 + random() * .52 : .27 + random() * .43;
      const y = world.height(x, z);
      if (i < 4) rocks.push({ x, z, y: y + size * .14, sx: size * 1.26, sy: size * .83, sz: size, yaw: a });
      if (i > 1) plants.push({ x, z, y: y + .018, sx: size * 1.17, sy: size * 1.28, sz: size, yaw: a });
    }
  }
  return { rocks, plants };
}

function instances(world, name, geometry, material, rows) {
  if (!rows.length) return null;
  const mesh = markProcedural(new T.InstancedMesh(geometry, material, rows.length), 'procedural-scenery', name);
  mesh.userData.modelOrigin.source = 'src/act1/visual-landscape.js';
  const object = new T.Object3D();
  rows.forEach(({ x, y, z, sx, sy, sz, yaw }, index) => {
    object.position.set(x, y, z);
    object.rotation.y = yaw;
    object.scale.set(sx, sy, sz);
    object.updateMatrix();
    mesh.setMatrixAt(index, object.matrix);
  });
  mesh.receiveShadow = true;
  mesh.computeBoundingSphere();
  world.areaGroup.add(mesh);
  return mesh;
}

export function buildRouteBorders(world) {
  const coast = world.area.layout?.coastal || world.biome === 'marsh';
  const landscape = scatter(world);
  const rock = world.geometry('visual-rock-' + !!coast, () => boulder(coast));
  const plant = world.geometry('visual-plant-' + !!coast, () => leafClump(coast));
  instances(world, 'MossyBoulders', rock, world.material('visual-rock', { vertexColors: true, roughness: .92 }), landscape.rocks);
  const grass = instances(world, 'RouteLeafClumps', plant,
    world.material('visual-foliage', { vertexColors: true, side: T.DoubleSide, roughness: .93 }), landscape.plants);
  return grass && { grass, fullCount: landscape.plants.length };
}

export function bindTreeSight(world) {
  const partList = world.meshyLibrary?.get('tree')?.parts;
  if (!partList) return;
  const sight = world.treeSight ??= {
    focus: { value: new T.Vector3() }, view: { value: new T.Vector3(0, 1, 0) },
    enabled: { value: 0 }, materials: new WeakSet()
  };
  for (const part of partList) {
    for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
      if (sight.materials.has(material)) continue;
      sight.materials.add(material);
      const compile = material.onBeforeCompile, key = material.customProgramCacheKey();
      material.onBeforeCompile = function (shader, renderer) {
        compile.call(this, shader, renderer);
        Object.assign(shader.uniforms, { sightFocus: sight.focus, sightView: sight.view, sightEnabled: sight.enabled });
        shader.vertexShader = 'varying vec3 sightPoint;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
          vec4 sightLocal = vec4(transformed, 1.);
          #ifdef USE_INSTANCING
            sightLocal = instanceMatrix * sightLocal;
          #endif
          sightPoint = (modelMatrix * sightLocal).xyz;
          #include <project_vertex>
        `);
        shader.fragmentShader = 'varying vec3 sightPoint; uniform vec3 sightFocus, sightView; uniform float sightEnabled;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `
          #include <alphatest_fragment>
          if (sightEnabled > .5) {
            vec3 offset = sightPoint - sightFocus;
            float front = dot(offset, sightView);
            float lateral = length(offset - front * sightView);
            if (front > .25 && front < 10. && lateral < 1.55) {
              float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
              if (noise > smoothstep(.88, 1.55, lateral)) discard;
            }
          }
        `);
      };
      material.customProgramCacheKey = () => key + '|actor-sight';
      material.needsUpdate = true;
    }
  }
}

export function updateTreeSight(world) {
  const sight = world.treeSight;
  if (!sight) return;
  sight.enabled.value = world.battleStage.visible ? 0 : 1;
  const position = world.state?.position;
  if (!position) { sight.enabled.value = 0; return; }
  sight.focus.value.set(position.x, world.walkHeight(position.x, position.z) + .94, position.z);
  sight.view.value.subVectors(world.activeCamera.position, sight.focus.value).normalize();
}
