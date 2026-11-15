import * as T from '../../assets/vendor/three.module.js';

function addStrip(positions, colors, indices, segments, sample) {
  const offset = positions.length / 3;
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    for (let edge = 0; edge < 3; edge++) {
      const [x, y, weight] = sample(u, edge / 2);
      positions.push(x, y, 0);
      colors.push(weight, weight, weight);
    }
    if (i === segments) continue;
    for (let edge = 0; edge < 2; edge++) {
      const a = offset + i * 3 + edge, b = a + 3;
      indices.push(a, a + 1, b + 1, a, b + 1, b);
    }
  }
}

function stripGeometry(build) {
  const positions = [], colors = [], indices = [];
  build(positions, colors, indices);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function contactArcGeometry() {
  return stripGeometry((positions, colors, indices) => {
    addStrip(positions, colors, indices, 24, (u, edge) => {
      const angle = -.94 + 1.88 * u;
      const envelope = Math.sin(Math.PI * u);
      const radius = 1 - .27 * Math.pow(envelope, .75) * edge;
      const light = (.28 + .72 * envelope) * (edge === .5 ? 1 : edge === 0 ? .67 : .11);
      return [Math.sin(angle) * radius, (Math.cos(angle) * radius - .58) * 1.13, light];
    });
  });
}

export function impactSigilGeometry() {
  return stripGeometry((positions, colors, indices) => {
    for (let sector = 0; sector < 6; sector++) {
      const center = sector * Math.PI / 3;
      addStrip(positions, colors, indices, 8, (u, edge) => {
        const angle = center + (u - .5) * .71;
        const tip = Math.max(0, 1 - Math.abs(u - .5) * 7);
        const radius = .8 + edge * .10 + tip * (.20 - edge * .06);
        const intensity = (.58 + .4 * Math.sin(Math.PI * u)) * (edge === .5 ? 1 : .42);
        return [Math.cos(angle) * radius, Math.sin(angle) * radius, intensity];
      });
    }
  });
}

export function fireFringeGeometry() {
  return stripGeometry((positions, colors, indices) => {
    for (let i = 0; i < 15; i++) {
      const center = i * Math.PI * 2 / 15;
      addStrip(positions, colors, indices, 7, (u, edge) => {
        const angle = center + (u - .5) * .45;
        const flame = Math.pow(Math.sin(Math.PI * u), .65);
        const radius = .81 + edge * (.09 + flame * (.1 + .14 * Math.abs(Math.sin(i * 13))));
        return [Math.cos(angle) * radius, Math.sin(angle) * radius, flame * (edge === .5 ? 1 : .27)];
      });
    }
  });
}

/** The same impact clock drives the mesh, flash and target reaction. */
export function playContactArc(vfx, source, target, profile, start, animation) {
  const position = vfx.point(target, new T.Vector3(), .53);
  const hand = vfx.hand(source, new T.Vector3(), animation);
  const bearing = Math.atan2(position.x - hand.x, position.z - hand.z);
  const wide = ['sweep', 'hammer', 'sun'].includes(profile.style);
  const thrust = profile.style === 'thrust';
  const count = profile.style === 'claw' ? 2 : 1;
  const size = Math.min(1.8, Math.max(.7, profile.scale || 1)) * (wide ? 1.42 : .98);
  for (let i = 0; i < count; i++) {
    const offset = i ? .16 : -.04;
    const effect = vfx.effect('visual-contact-arc', profile.core || profile.color, start + i * .02, .24, (item, t) => {
      const speed = 1 - (1 - t) ** 2;
      item.object.position.copy(position);
      item.object.position.x += Math.sin(bearing) * (speed * .20 + offset - .59);
      item.object.position.z += Math.cos(bearing) * (speed * .20 + offset - .59);
      item.object.position.y += .12 * (1 - t) - i * .18;
      item.object.rotation.set(thrust ? -.85 : -.48, bearing + .5 * speed, thrust ? 1.3 : -.54 + i * .17, 'YXZ');
      item.object.scale.set(size * (thrust ? .63 : 1) * (.7 + .35 * speed), size, size);
      item.material.opacity = Math.sin(Math.PI * Math.min(1, t * 1.16)) * .70;
    });
    if (effect) effect.role = 'directional-strike';
  }
}

const SIGILS = {
  fire: { life: .43, size: 1.5, rotation: .13, opacity: .40 },
  ice: { life: .55, size: 1.25, rotation: -.06, opacity: .50 },
  lightning: { life: .24, size: 1.12, rotation: .32, opacity: .63 },
  ward: { life: .57, size: .91, rotation: -.36, opacity: .55 }
};

export function playImpactSigil(vfx, target, profile, start) {
  const design = SIGILS[profile.family];
  if (!design) return;
  const floor = vfx.point(target, new T.Vector3(), .033);
  const size = design.size * Math.min(1.75, Math.max(.65, profile.scale || 1));
  const fire = profile.family === 'fire';
  const effect = vfx.effect(fire ? 'visual-fire-fringe' : 'visual-impact-sigil', fire ? 0xffa53d : profile.color, start, design.life, (item, t) => {
    const expand = 1 - (1 - t) ** 2;
    item.object.position.copy(floor);
    item.object.rotation.set(-Math.PI / 2, 0, design.rotation * expand);
    item.object.scale.setScalar(size * (.54 + .57 * expand));
    item.material.opacity = Math.min(1, t * 14) * (1 - t) ** 1.6 * (fire ? .73 : design.opacity);
  }, fire);
  if (effect) effect.role = 'impact-sigil';
}

export function playRuneTrail(vfx, source, target, profile, start, end) {
  const life = end - start;
  if (life <= .025) return;
  const from = new T.Vector3(), to = new T.Vector3(), tip = new T.Vector3();
  const count = vfx.world.qualityLevel === 'low' || vfx.world.reducedMotion ? 1 : 3;
  const violet = new T.Color(profile.color).lerp(new T.Color(0x813ef0), .47).getHex();
  for (let i = 0; i < count; i++) {
    const offset = i === 0 ? 0 : i === 1 ? .31 : -.31;
    const effect = vfx.effect('beam', i || count === 1 ? violet : (profile.core || profile.color), start, life, (item, t) => {
      vfx.point(target, tip, .57);
      const behind = Math.max(0, t - .29);
      from.lerpVectors(source, tip, behind);
      to.lerpVectors(source, tip, t);
      const driftX = tip.z - source.z, driftZ = source.x - tip.x;
      const distance = Math.max(.01, Math.hypot(driftX, driftZ));
      for (const [point, beat] of [[from, behind], [to, t]]) {
        const arch = Math.sin(Math.PI * beat);
        point.x += driftX / distance * offset * arch;
        point.z += driftZ / distance * offset * arch;
        point.y += (.52 + i * .12) * arch;
      }
      vfx.beam(item, from, to, i ? .026 : .019);
      item.material.opacity = Math.min(1, t * 18) * (.85 - t * .47);
    });
    if (effect) effect.role = 'rune-trail';
  }
}
