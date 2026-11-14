import * as T from '../../assets/vendor/three.module.js';

// Indexed leaf ribbons with a dark base, tapered tip and (for broad leaves) a midrib.
class PlantMesh {
  positions = [];
  colors = [];
  indices = [];

  vertex(x, y, z, color, light = 1) {
    const index = this.positions.length / 3;
    this.positions.push(x, y, z);
    this.colors.push(color.r * light, color.g * light, color.b * light);
    return index;
  }

  leaf({ x = 0, y = 0, z = 0, angle, rise, reach, width, arch = 0, ribs = false, segments = 4, color = WHITE }) {
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const first = this.positions.length / 3, row = ribs ? 3 : 2;
    for (let step = 0; step < segments; step++) {
      const t = step / segments, ahead = reach * t ** 1.65;
      const h = y + rise * t + arch * Math.sin(Math.PI * t);
      const cx = x + dx * ahead, cz = z + dz * ahead;
      const half = width * .5 * (1 - t) ** .68 * (ribs ? .31 + .89 * Math.sin(Math.PI * t) : .74 + .44 * t);
      const light = .51 + .49 * T.MathUtils.smoothstep(h, -.04, .62);
      this.vertex(cx - dz * half, h, cz + dx * half, color, light * .9);
      if (ribs) this.vertex(cx, h + half * .34, cz, color, light * 1.12);
      this.vertex(cx + dz * half, h - half * .11, cz - dx * half, color, light);
      if (!step) continue;
      const next = first + step * row;
      for (let i = 0; i < row - 1; i++) {
        const a = next - row + i, b = next + i;
        this.indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const tip = this.vertex(x + dx * reach, y + rise, z + dz * reach, color, 1);
    for (let i = tip - row; i + 1 < tip; i++) this.indices.push(i, tip, i + 1);
  }

  seed(x, y, z, width, height, color) {
    // Six sides are enough for a seed head at the actual game camera distance.
    const base = this.vertex(x, y - height * .13, z, color, .7);
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        this.vertex(x + width * Math.cos(a), y + height * (.18 + .65 * row), z + width * Math.sin(a), color, .86 + .14 * row);
      }
    }
    const tip = this.vertex(x, y + height, z, color);
    for (let i = 0; i < 6; i++) {
      const a = base + 1 + i, b = base + 1 + (i + 1) % 6;
      this.indices.push(base, a, b, a, a + 6, b, b, a + 6, b + 6, b + 6, a + 6, tip);
    }
  }

  finish() {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(this.colors, 3));
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return geometry;
  }
}

const WHITE = new T.Color(0xffffff);
const FROND = new T.Color(0xc3d58c);
const SEED = new T.Color(0xad713a);
const STEM = new T.Color(0x90a066);
const PETAL = new T.Color(0xf2e5bd);
const POLLEN = new T.Color(0xe9b85a);
const GOLDEN_ANGLE = 2.39996323;

function meadow(plant, low) {
  const heights = [.62, .38, .56, .41, .69, .34, .52, .44, .46];
  heights.slice(0, low ? 6 : heights.length).forEach((rise, i) => {
    const a = GOLDEN_ANGLE * i, spread = .06 + i * .028;
    plant.leaf({ x: Math.cos(a) * spread, y: -.065, z: Math.sin(a) * spread,
      angle: a + .38 * Math.sin(i * 2.4), rise, reach: .20 + .22 * Math.sin(i * .96) ** 2,
      width: .06 + .035 * Math.sin(i * 1.9) ** 2, arch: .08 + .045 * (i % 2), segments: low ? 3 : 4 });
  });
}

function plantain(plant) {
  for (let i = 0; i < 6; i++) {
    const a = GOLDEN_ANGLE * i;
    plant.leaf({ angle: a, rise: .12 + (i % 3) * .061, reach: .30 + (i % 4) * .084,
      width: .19 + (i % 3) * .038, arch: .14, ribs: true });
  }
  for (const [x, z, height] of [[.081, .023, .51], [-.10, -.062, .64]]) {
    plant.leaf({ x, z, angle: .9, rise: height, reach: .022, width: .033, color: FROND });
    plant.seed(x + .014, height - .025, z + .017, .031, .121, SEED);
  }
}

function fern(plant) {
  for (let frond = 0; frond < 4; frond++) {
    const angle = GOLDEN_ANGLE * frond, length = .56 + (frond % 3) * .10;
    plant.leaf({ angle, rise: .35, reach: length, width: .034, arch: .32, color: FROND, segments: 7 });
    for (let i = 1; i <= 6; i++) {
      const t = .15 + i * .105, ahead = length * t ** 1.65;
      for (const side of [-1, 1]) plant.leaf({ x: Math.cos(angle) * ahead, z: Math.sin(angle) * ahead,
        y: .35 * t + .32 * Math.sin(Math.PI * t), angle: angle + side * 1.02,
        rise: .025, reach: .25 * Math.sin(t ** .6 * Math.PI), width: .082 * (1.18 - t), arch: .025, segments: 2 });
    }
    plant.leaf({ x: Math.cos(angle) * length * .76, z: Math.sin(angle) * length * .76,
      y: .44, angle, rise: -.10, reach: .25, width: .091, arch: .037, segments: 3 });
  }
}

function reed(plant) {
  for (let i = 0; i < 6; i++) {
    const angle = GOLDEN_ANGLE * i;
    plant.leaf({ x: Math.cos(angle) * i * .034, y: -.05, z: Math.sin(angle) * i * .034,
      angle, rise: .54 + i * .057, reach: .33 + .063 * (i % 4), width: .091,
      arch: .38 - .044 * (i % 3), ribs: true });
  }
  for (const [x, z, height, angle] of [[.115, .039, 1.02, 1], [-.158, -.082, 1.20, 2.1], [.041, -.143, .85, 4.2]]) {
    plant.leaf({ x, z, angle, rise: height, reach: .12, width: .053, color: FROND });
    plant.seed(x + Math.cos(angle) * .117, height - .048, z + Math.sin(angle) * .117, .061, .24, SEED);
  }
}

function wildflower(plant) {
  for (let i = 0; i < 3; i++) {
    const angle = GOLDEN_ANGLE * i, x = Math.cos(angle) * .18, z = Math.sin(angle) * .18;
    const height = .34 + i * .107, dx = Math.cos(angle), dz = Math.sin(angle);
    plant.leaf({ x, z, angle, rise: height, reach: .10, width: .038, color: STEM });
    plant.leaf({ x, z, y: .13, angle: angle + .51, rise: .12, reach: .18,
      width: .093, ribs: true, color: STEM });
    for (let petal = 0; petal < 6; petal++) plant.leaf({ x: x + dx * .098, z: z + dz * .098, y: height,
      angle: angle + petal * Math.PI / 3, rise: -.013, reach: .082, width: .068,
      arch: .014, ribs: true, segments: 2, color: PETAL });
    plant.seed(x + dx * .098, height, z + dz * .098, .041, .033, POLLEN);
  }
}

export function makeGroundcoverPlants() {
  const generators = { grass: meadow, shortGrass: plant => meadow(plant, true), plantain, fern, reed, wildflower };
  return Object.fromEntries(Object.entries(generators).map(([species, generate]) => {
    const plant = new PlantMesh();
    generate(plant);
    return [species, plant.finish()];
  }));
}
