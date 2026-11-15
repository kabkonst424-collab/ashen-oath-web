import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserPerformance, graphicsProfile, resolveInitialQuality } from '../src/act1/browser-performance.js';

const android = { userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile)' };
const ipad = { platform: 'MacIntel', maxTouchPoints: 5 };
const desktop = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

test('new devices use their default while saved graphics choices survive', () => {
  assert.equal(resolveInitialQuality({}, android), 'low');
  assert.equal(resolveInitialQuality({}, ipad), 'low');
  assert.equal(resolveInitialQuality({}, desktop), 'high');
  assert.equal(resolveInitialQuality({ quality: 'high' }, android), 'high');
  assert.equal(resolveInitialQuality({ quality: 'low' }, desktop), 'low');
});

test('both device profiles change pixels, shadows, filtering and effects', () => {
  for (const client of [android, desktop]) {
    const low = graphicsProfile('low', client);
    const high = graphicsProfile('high', client);
    assert.equal(low.device, high.device);
    assert.equal(low.shadowSize, 0);
    for (const key of ['pixels', 'density', 'shadowSize', 'anisotropy', 'effectBudget', 'fireLights', 'fireSparks']) {
      assert.ok(high[key] > low[key], `${low.device} ${key}`);
    }
  }
  assert.equal(graphicsProfile('high', desktop).shadowSize, 4096);
  assert.equal(graphicsProfile('high', android).shadowSize, 2048);
  assert.equal(graphicsProfile('bad', desktop).quality, 'high');
});

function rendererFixture({ width = 1440, height = 900 } = {}) {
  const canvas = { width: 1, height: 1, getBoundingClientRect: () => ({ width, height }) };
  const sizes = [];
  const gl = {
    MAX_VIEWPORT_DIMS: 1,
    MAX_RENDERBUFFER_SIZE: 2,
    getParameter: value => value === 1 ? Int32Array.from([1100, 768]) : 1280,
  };
  const renderer = {
    capabilities: { maxTextureSize: 512 },
    getContext: () => gl,
    setSize(backingWidth, backingHeight, updateStyle) {
      sizes.push({ width: backingWidth, height: backingHeight, updateStyle });
      Object.assign(canvas, { width: backingWidth, height: backingHeight });
    },
  };
  return { world: { canvas, renderer, qualityLevel: 'low' }, sizes };
}

test('changing presets reallocates once, respects GPU bounds and keeps the CSS geometry', () => {
  const { world, sizes } = rendererFixture();
  const controller = new BrowserPerformance(world);
  try {
    const rect = world.canvas.getBoundingClientRect();
    controller.resize();
    controller.resize();
    assert.equal(sizes.length, 1);
    const low = sizes[0];
    assert.ok(low.width * low.height <= graphicsProfile('low', desktop).pixels);
    controller.scale = .72;
    controller.setQuality('high');
    assert.equal(controller.scale, 1);
    controller.resize();
    assert.equal(sizes.length, 2);
    assert.deepEqual(sizes[1], { width: 1100, height: 687, updateStyle: false });
    assert.equal(controller.hardware.shadow, 512);
    assert.deepEqual(world.canvas.getBoundingClientRect(), rect);
    controller.setQuality('low');
    controller.resize();
    assert.deepEqual(sizes[2], low);
  } finally {
    controller.dispose();
  }
});
