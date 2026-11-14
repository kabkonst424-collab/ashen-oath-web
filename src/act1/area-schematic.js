import { bridgeSpans, obstacleOutline, outlineBounds, riverSections } from './area-geometry.js?v=rivers-0181';

const NS = 'http://www.w3.org/2000/svg';
const outlines = new WeakMap();
let nextClip = 0;
const tones = {
  water: ['#254c5c', '#79a8b0'], cliff: ['#34383b', '#8b8272'],
  structure: ['#484338', '#a19779'],
};
const signs = {
  npc: ['M-3,0 A3,3 0 1,0 3,0 A3,3 0 1,0 -3,0', '#bbcfab'],
  merchant: ['M-4,-3 H4 L3,4 H-3 Z M-2,-3 V-5 H2 V-3', '#9ed5ba'],
  camp: ['M-4,4 H4 L0,-4 Z M0,-.5 V4', '#e5b177'],
  exit: ['M-4,4 V-1 A4,4 0 0,1 4,-1 V4 Z M0,-2 V2', '#e6cc86'],
  chest: ['M-4,-3 H4 V3 H-4 Z M-4,0 H4 M0,0 V2', '#e3ae6c'],
  inspect: ['M-2,-4 H2 V4 H-2 Z M-1,-1 H1 M-1,1 H1', '#dbdcc2'],
  puzzle: ['M0,-4 L5,1 L0,4 L-5,1 Z M0,-3 V2', '#b6b4db'],
  encounter: ['M-3,-3 L3,3 M3,-3 L-3,3', '#edac98'],
  boss: ['M0,-5 L4,0 L0,4 L-4,0 Z M0,-2 V1', '#efa290'],
  landmark: ['M0,-4 L4,0 L0,4 L-4,0 Z', 'none'],
};

const coordinate = n => Number(n).toFixed(2);
const line = (points, project) => points.map(([x, z]) => {
  const p = project({ x, z });
  return coordinate(p.x) + ',' + coordinate(p.y);
}).join(' ');

function rings(layout) {
  if (!outlines.has(layout)) {
    const { z, rz } = outlineBounds(layout.outline);
    const polygons = layout.obstacles.map(obstacle => ({ kind: obstacle.kind, points: obstacleOutline(obstacle) }));
    for (const river of layout.rivers || []) {
      const banks = riverSections(river, z - rz, z + rz, 2.4);
      polygons.push({ kind: 'water', river: river.id, points: [
        ...banks.map(({ left, z }) => [left, z]),
        ...banks.reverse().map(({ right, z }) => [right, z]),
      ] });
    }
    outlines.set(layout, polygons);
  }
  return outlines.get(layout);
}

export function createTerrainClip(svg) {
  const id = 'act-area-terrain-' + ++nextClip;
  const clip = draw(draw(svg, 'defs', {}), 'clipPath', { id });
  const polygon = draw(clip, 'polygon', {});
  return {
    id,
    update(layout, project) {
      polygon.setAttribute('points', line(layout.outline, project));
    },
  };
}

export function terrainShapes(layout, project, clip) {
  if (!layout) return [];
  if (layout.rivers) clip?.update(layout, project);
  const terrain = [['outline', 'polygon', {
    points: line(layout.outline, project), fill: '#263a32', stroke: '#ae9b69', 'stroke-width': 1.1, 'stroke-linejoin': 'round',
  }]];
  for (const [i, road] of layout.roads.entries()) {
    const { scale } = project({ x: 0, z: 0 });
    terrain.push(['road-' + i, 'polyline', {
      points: line(road.points, project), stroke: '#b59862', fill: 'none',
      'stroke-width': Math.max(.65, Math.min(4, road.width * scale * .72)),
      'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: .74, 'data-terrain': 'road',
    }]);
  }
  for (const [i, shape] of rings(layout).entries()) {
    const [fill, stroke] = tones[shape.kind] || tones.structure;
    terrain.push([shape.river ? 'river-' + shape.river : 'obstacle-' + i, 'polygon', {
      points: line(shape.points, project), fill, stroke, 'stroke-width': .7, 'data-terrain': shape.kind,
      ...(shape.river && clip ? { 'clip-path': 'url(#' + clip.id + ')' } : {}),
    }]);
  }
  for (const bridge of bridgeSpans(layout)) {
    const w = bridge.width / 2;
    terrain.push(['bridge-' + bridge.id, 'polygon', {
      points: line([[bridge.left,bridge.z-w],[bridge.right,bridge.z-w],
        [bridge.right,bridge.z+w],[bridge.left,bridge.z+w]], project),
      fill: '#c99865', stroke: '#f3d8a0', 'stroke-width': .7,
      'stroke-linejoin': 'round', 'data-terrain': 'bridge', 'aria-label': bridge.label,
    }]);
  }
  return terrain;
}

export function markerShape(marker, project, scale = 1) {
  const p = project(marker), [d, fill] = signs[marker.kind] || signs.landmark;
  return {
    d, transform: 'translate(' + coordinate(p.x) + ' ' + coordinate(p.y) + ') scale(' + scale + ')',
    fill, stroke: fill === 'none' ? '#d2ceb3' : marker.kind === 'encounter' ? fill : '#14241f',
    'stroke-width': fill === 'none' || marker.kind === 'encounter' ? 1.05 : .7,
    'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: marker.locked ? .4 : 1,
    'data-kind': marker.kind,
  };
}

function draw(parent, tag, attrs, label) {
  const node = parent.ownerDocument.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (label) {
    const title = parent.ownerDocument.createElementNS(NS, 'title');
    title.textContent = label;
    node.append(title);
  }
  parent.append(node);
  return node;
}

export function drawAreaSchematic({ area, markers, position, target, route, document }) {
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('nav50-svg', 'act-area-schematic');
  svg.setAttribute('viewBox', '0 0 460 310');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', area.title + '. Контур области, дороги, переправы и ориентиры. Север сверху.');
  const b = area.bounds, scale = Math.min(415 / (b.rx * 2), 270 / (b.rz * 2));
  const project = ({ x, z }) => ({ x: 230 + (x - b.x) * scale, y: 156 + (z - b.z) * scale, scale });
  const clip = area.layout?.rivers ? createTerrainClip(svg) : null;
  for (const [, tag, attrs] of terrainShapes(area.layout, project, clip)) draw(svg, tag, attrs, attrs['aria-label']);
  if (route?.length > 1) draw(svg, 'polyline', {
    points: line(route.map(p => [p.x, p.z]), project), fill: 'none', stroke: '#a9dfb8',
    'stroke-width': 2.1, 'stroke-dasharray': '4 3', 'stroke-linecap': 'round',
  });
  for (const marker of markers) {
    const label = marker.label + (marker.locked ? ' · закрыто' : '');
    draw(svg, 'path', markerShape(marker, project, 1.28), label);
    if (marker.kind === 'landmark') {
      const p = project(marker);
      const name = draw(svg, 'text', { x: p.x + 6, y: p.y - 5, fill: '#f3e6bd', stroke: '#15221c',
        'stroke-width': 3, 'paint-order': 'stroke', 'font-size': 10.5, 'font-family': 'Georgia, serif' });
      name.textContent = marker.label;
    }
  }
  if (target) {
    const p = project(target);
    draw(svg, 'path', { d: 'M0,-7 L7,0 L0,7 L-7,0 Z', transform: 'translate(' + p.x + ' ' + p.y + ')',
      fill: '#ffda83', stroke: '#463018', 'stroke-width': 1.7 }, target.label + ' · цель');
  }
  if (position) {
    const p = project(position);
    draw(svg, 'path', { d: 'M0,-7 L5,5 L0,3 L-5,5 Z', transform: 'translate(' + p.x + ' ' + p.y + ') rotate(' +
      (180 - (position.angle || 0) * 180 / Math.PI) + ')', fill: '#faf5cd', stroke: '#12201d', 'stroke-width': 1.25 }, 'Отряд');
  }
  draw(svg, 'path', { d: 'M429,34 L434,19 L439,34 L434,30 Z', fill: '#d2be7e' });
  const north = draw(svg, 'text', { x: 434, y: 48, fill: '#efd897', 'text-anchor': 'middle', 'font-size': 11 });
  north.textContent = 'С';
  return svg;
}
