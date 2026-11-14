export const AREA_GEOMETRY_REVISION = 1;
const BANK_CLEARANCE = 0.45;

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
  return height;
}

export function walkableLayout(layout, x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || !insideOutline(layout.outline, x, z)) return false;
  return !layout.obstacles?.some(obstacle => ellipseContains(obstacle, x, z, BANK_CLEARANCE));
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
