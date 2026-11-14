export const AREA_GEOMETRY_REVISION = 2;
const BANK_CLEARANCE = 0.45;
const RAMP_LENGTH = 3.35;
const crossSections = new WeakMap();
const crossings = new WeakMap();
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = value => Math.min(1, Math.max(0, value));
const smooth = t => t * t * (3 - 2 * t);

export function outlineBounds(outline) {
  const xs = outline.map(([x]) => x), zs = outline.map(([, z]) => z);
  const left = Math.min(...xs), right = Math.max(...xs);
  const north = Math.min(...zs), south = Math.max(...zs);
  return { x: (left + right) / 2, z: (north + south) / 2,
    rx: (right - left) / 2, rz: (south - north) / 2 };
}

export function segmentDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}

export function insideOutline(outline, x, z) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [ax, az] = outline[i], [bx, bz] = outline[j];
    if ((az > z) !== (bz > z) && x < ax + (z - az) * (bx - ax) / (bz - az)) inside = !inside;
  }
  return inside;
}

function ellipseDistance(obstacle, x, z, margin = 0) {
  const { x: cx, z: cz, rx, rz, yaw = 0 } = obstacle;
  const dx = x - cx, dz = z - cz;
  const u = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const v = dx * Math.sin(yaw) + dz * Math.cos(yaw);
  return (u / (rx + margin)) ** 2 + (v / (rz + margin)) ** 2;
}

export function ellipseContains(obstacle, x, z, margin = 0) {
  return ellipseDistance(obstacle, x, z, margin) <= 1;
}

export function obstacleOutline(obstacle, count = 32) {
  const yaw = obstacle.yaw || 0;
  return Array.from({ length: count }, (_, i) => {
    const angle = i * Math.PI * 2 / count;
    const u = Math.cos(angle) * obstacle.rx, v = Math.sin(angle) * obstacle.rz;
    return [obstacle.x + u * Math.cos(yaw) + v * Math.sin(yaw),
      obstacle.z - u * Math.sin(yaw) + v * Math.cos(yaw)];
  });
}

function riverTable(river) {
  if (crossSections.has(river)) return crossSections.get(river);
  const points = river.points;
  const start = points[0][1], end = points.at(-1)[1];
  const count = Math.ceil((end - start) / .5), step = (end - start) / count;
  const banks = new Float64Array((count + 1) * 2);
  let segment = 0;
  for (let i = 0; i <= count; i++) {
    const z = Math.min(end, start + i * step);
    while (segment < points.length - 2 && z > points[segment + 1][1]) segment++;
    const a = points[segment], b = points[segment + 1];
    const prev = points[Math.max(0, segment - 1)], next = points[Math.min(points.length - 1, segment + 2)];
    const dz = b[1] - a[1], t = (z - a[1]) / dz, blend = smooth(t);
    const interpolate = axis => lerp(a[axis], b[axis], blend) +
      (1 - t) ** 2 * t * dz * (b[axis] - prev[axis]) / (b[1] - prev[1]) -
      t ** 2 * (1 - t) * dz * (next[axis] - a[axis]) / (next[1] - a[1]);
    const x = interpolate(0), width = interpolate(2);
    banks[i * 2] = x - width + .22 * Math.sin(z * .41) + .13 * Math.sin(z * .93);
    banks[i * 2 + 1] = x + width + .25 * Math.cos(z * .34 + 2) + .11 * Math.sin(z * .78);
  }
  const table = { start, end, count, step, banks };
  crossSections.set(river, table);
  return table;
}

export function riverSection(river, z) {
  const { start, end, count, step, banks } = riverTable(river);
  if (z < start || z > end) return null;
  const row = (z - start) / step, i = Math.min(count - 1, Math.floor(row)), t = row - i;
  return { left: lerp(banks[i * 2], banks[i * 2 + 2], t), right: lerp(banks[i * 2 + 1], banks[i * 2 + 3], t), z };
}

export function riverSections(river, start, end, maxStep = 1) {
  const table = riverTable(river);
  start = Math.max(table.start, start ?? table.start);
  end = Math.min(table.end, end ?? table.end);
  if (end < start) return [];
  const count = Math.max(1, Math.ceil((end - start) / maxStep));
  return Array.from({ length: count + 1 }, (_, i) => riverSection(river, lerp(start, end, i / count)));
}

function bankDistance(section, x) {
  return Math.max(section.left - x, x - section.right);
}

export function riverAt(layout, x, z, margin = 0) {
  return layout.rivers?.find(river => {
    const section = riverSection(river, z);
    return section && bankDistance(section, x) <= margin;
  });
}

export function nearRiverBank(layout, x, z, distance) {
  return layout.rivers?.some(river => {
    const section = riverSection(river, z);
    return section && Math.abs(bankDistance(section, x)) <= distance;
  });
}

export function bridgeSpans(layout) {
  if (!layout.bridges) return [];
  if (!crossings.has(layout)) crossings.set(layout, layout.bridges.map(bridge => {
    const river = layout.rivers.find(river => river.id === bridge.riverId);
    const bank = riverSection(river, bridge.z);
    const sections = riverSections(river, bridge.z - bridge.width / 2, bridge.z + bridge.width / 2);
    const left = Math.min(...sections.map(section => section.left)) - .7;
    const right = Math.max(...sections.map(section => section.right)) + .7;
    return { ...bridge, river, x: (bank.left + bank.right) / 2, left, right, start: left - RAMP_LENGTH, end: right + RAMP_LENGTH };
  }));
  return crossings.get(layout);
}

export function bridgeAt(layout, x, z, inset = 0) {
  return bridgeSpans(layout).find(bridge => x >= bridge.start && x <= bridge.end &&
    Math.abs(bridge.z - z) <= bridge.width / 2 - inset);
}

export function bridgeHeight(bridge, x, z, height) {
  const deck = Math.max(height(bridge.start, bridge.z), height(bridge.end, bridge.z), bridge.river.level + 1.02) + .42;
  if (x < bridge.left) return lerp(height(bridge.start, z) + .045, deck, smooth(clamp((x - bridge.start) / RAMP_LENGTH)));
  if (x > bridge.right) return lerp(height(bridge.end, z) + .045, deck, smooth(clamp((bridge.end - x) / RAMP_LENGTH)));
  return deck;
}

export function terrainElevation(layout, x, z, phase) {
  if (!layout) return Math.sin(x * .16 + phase) * Math.cos(z * .19) * .095 + Math.sin(z * .37 + x * .11) * .035;
  const relief = layout.relief ?? .52;
  const raw = Math.sin(x * .063 + phase) * Math.cos(z * .076) * relief + .08 * Math.sin(x * .19 + z * .14);
  let height = raw;
  for (const obstacle of layout.obstacles) {
    if (obstacle.kind !== 'water') continue;
    const squaredRadius = ellipseDistance(obstacle, x, z);
    const minRadius = Math.min(obstacle.rx, obstacle.rz);
    if (squaredRadius >= (.8 + 4.5 / minRadius) ** 2) continue;
    const radius = Math.sqrt(squaredRadius);
    const blend = Math.max(0, Math.min(1, (radius - .80) * minRadius / 4.5));
    height -= (height + .20) * (1 - blend);
  }
  const river = riverAt(layout, x, z, 3.2);
  if (river) {
    const distance = bankDistance(riverSection(river, z), x);
    const bank = river.level - .055 + .235 * clamp(distance / .62);
    const bed = bank - .83 * smooth(clamp(-distance / 2.2));
    height = lerp(bed, height, smooth(clamp((distance - .62) / 2.58)));
  }
  return height;
}

export function walkableLayout(layout, x, z, { previous = false } = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !insideOutline(layout.outline, x, z)) return false;
  if (layout.obstacles?.some(obstacle => (!previous || !obstacle.introduced) &&
      ellipseContains(obstacle, x, z, BANK_CLEARANCE))) return false;
  if (previous) return !layout.previousObstacles?.some(obstacle => ellipseContains(obstacle, x, z, BANK_CLEARANCE));
  if (riverAt(layout, x, z, BANK_CLEARANCE)) return !!bridgeAt(layout, x, z, .35);
  return true;
}

export function nearestLand(layout, point, limit = 22) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) return null;
  if (walkableLayout(layout, point.x, point.z)) return { x: point.x, z: point.z };
  for (let radius = .75; radius <= limit; radius += .75) {
    const samples = Math.min(108, Math.max(12, Math.ceil(radius * 9)));
    for (let i = 0; i < samples; i++) {
      const angle = i * Math.PI * 2 / samples;
      const candidate = { x: point.x + Math.cos(angle) * radius, z: point.z + Math.sin(angle) * radius };
      if (walkableLayout(layout, candidate.x, candidate.z)) return candidate;
    }
  }
  return null;
}

export function applyAreaLayouts(areas, layouts) {
  for (const area of areas) {
    const layout = layouts[area.id];
    if (!layout) throw Error('Нет карты области: ' + area.id);
    const original = [{ id: 'spawn', ...area.spawn }];
    const bounds = outlineBounds(layout.outline);
    area.legacyMap = { rx: area.radiusX, rz: area.radiusZ, anchors: original };
    area.bounds = bounds;
    area.radiusX = Math.max(...layout.outline.map(([x]) => Math.abs(x)));
    area.radiusZ = Math.max(...layout.outline.map(([, z]) => Math.abs(z)));
    area.layout = layout;
    area.spawn = { x: layout.spawn[0], z: layout.spawn[1] };
    for (const group of ['exits', 'npcs', 'nodes', 'encounters']) {
      for (const object of area[group] || []) {
        const coords = layout.positions[object.id];
        if (!coords) throw Error('Нет положения объекта: ' + object.id);
        original.push({ id: object.id, x: object.x, z: object.z });
        [object.x, object.z] = coords;
      }
    }
  }
}

export function legacyPosition(area, position) {
  const old = area?.legacyMap;
  return old && position && Number.isFinite(position.x) && Number.isFinite(position.z) &&
    (position.x / old.rx) ** 2 + (position.z / old.rz) ** 2 < .9;
}

export function migratePosition(area, position, preferredId) {
  const { layout, legacyMap, spawn } = area;
  const anchor = legacyMap.anchors.find(a => a.id === preferredId) ||
    legacyMap.anchors.reduce((nearest, candidate) => {
      const distance = Math.hypot(candidate.x - position.x, candidate.z - position.z);
      return distance < nearest.distance ? { ...candidate, distance } : nearest;
    }, { distance: Infinity });
  const origin = layout.positions[anchor.id] || layout.spawn;
  const dx = position.x - anchor.x, dz = position.z - anchor.z;
  const factor = Math.min(1, (preferredId ? 2.2 : 6) / Math.max(.01, Math.hypot(dx, dz)));
  const nearby = { x: origin[0] + dx * factor, z: origin[1] + dz * factor };
  return nearestLand(layout, nearby, 9) || nearestLand(layout, { x: origin[0], z: origin[1] }, 9) || { ...spawn };
}

export function returnArrival(area, exit) {
  if (!exit || !area.layout) return { ...area.spawn };
  const near = Math.hypot(exit.x - area.spawn.x, exit.z - area.spawn.z);
  if (near < 14) return { ...area.spawn };
  let best = { point: [area.spawn.x, area.spawn.z], distance: Infinity };
  for (const road of area.layout.roads) {
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i];
      const distance = segmentDistance(exit.x, exit.z, a, b);
      if (distance >= best.distance) continue;
      const point = Math.hypot(a[0] - exit.x, a[1] - exit.z) > Math.hypot(b[0] - exit.x, b[1] - exit.z) ? a : b;
      best = { point, distance };
    }
  }
  const length = Math.hypot(best.point[0] - exit.x, best.point[1] - exit.z) || 1;
  const step = Math.min(length, 6.5);
  return nearestLand(area.layout, { x: exit.x + (best.point[0] - exit.x) * step / length,
    z: exit.z + (best.point[1] - exit.z) * step / length }, 6) || { x: exit.x, z: exit.z };
}
