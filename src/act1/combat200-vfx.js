import * as T from '../../assets/vendor/three.module.js';
import { fetchBytes } from './resource-loader.js?v=0.16.0-demo';

// Presentation-only authoring. All allocations pass through MagicVfx.effect,
// including low-quality/reduced-motion and per-target quotas.
const ROOT = new URL('../../assets/act1/magic/combat200/', import.meta.url);
const TAU = Math.PI * 2, UP = new T.Vector3(0, 1, 0);
const clamp = t => Math.max(0, Math.min(1, t));
const envelope = t => Math.sin(Math.PI * clamp(t));
export const MASK_NAMES = Object.freeze(['flame_01','slash_02','smoke_05','magic_03','circle_05','light_03','spark_04','scorch_01']);

export function ensureCombat200Assets(vfx) {
  if (vfx.combat200Load || vfx.disposed) return vfx.combat200Load;
  const read = async file => {
    const bytes = await fetchBytes(new URL(file, ROOT), { ...vfx.requestOptions, signal: vfx.controller.signal });
    if (vfx.disposed) return null;
    return vfx.loadAtlasTexture(bytes, file);
  };
  vfx.combat200Load = Promise.all(MASK_NAMES.map(async name => {
    try {
      const texture = await read(`${name}.png`);
      if (!texture) return;
      texture.colorSpace = T.NoColorSpace; // RGB luminance, never opaque source alpha.
      texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping;
      texture.minFilter = T.LinearMipmapLinearFilter;
      texture.magFilter = T.LinearFilter;
      if (vfx.disposed) texture.dispose(); else vfx.textures[`mask:${name}`] = texture;
    } catch (error) { if (!vfx.disposed) vfx.loadIssues.push(`combat200/${name}: ${error.message}`); }
  }).concat([(async () => {
    try {
      const texture = await read('blender-ember-atlas.png');
      if (!texture) return;
      texture.colorSpace = T.SRGBColorSpace;
      texture.wrapS = texture.wrapT = T.ClampToEdgeWrapping;
      if (vfx.disposed) texture.dispose(); else vfx.textures['combat200-ember'] = texture;
    } catch (error) { if (!vfx.disposed) vfx.loadIssues.push(`combat200/blender-ember: ${error.message}`); }
  })()]));
  return vfx.combat200Load;
}

export function combat200Material(vfx, kind) {
  if (kind === 'c200-ember') return { sprite: true, atlas: vfx.textures['combat200-ember'], atlasMeta: { columns: 5, rows: 5, frames: 25 } };
  const match = /^c200-(ground-)?mask-(.+)$/.exec(kind);
  if (!match) return null;
  const texture = vfx.textures[`mask:${match[2]}`];
  return { sprite: !match[1], geometry: match[1] ? 'c200-plane' : undefined, alphaMap: texture, fallback: !texture };
}

function emit(v, c, kind, start, life, update, part, additive = false, color = c.p.color) {
  const effect = v.effect(kind, color, start, life, update, additive);
  if (effect) { effect.role = `combat200:${c.phase}:${c.p.skillId}:${part}`; effect.recipe = c.p.skillId; effect.combat200 = true; if(c.target)effect.target=c.target; }
  return effect;
}
function mark(v, c, actor, { ground = false, mask = 'magic_03', radius = .8, tilt = 0, start = c.start, life = c.life, height = .52, color = c.p.color, part = 'sigil' } = {}) {
  return emit(v, c, `c200-${ground ? 'ground-' : ''}mask-${mask}`, start, life, (item, t) => {
    v.point(actor, item.object.position, ground ? .025 : height);
    item.object.scale.setScalar(radius * c.p.scale * (v.world.reducedMotion ? 1 : .86 + .14 * envelope(t)));
    if (ground) item.object.rotation.set(-Math.PI / 2, 0, tilt);
    else item.material.rotation = tilt + (v.world.reducedMotion ? 0 : t * .35);
    item.material.opacity = envelope(t) * .64;
  }, part, false, color);
}
function segments(v, c, pointsAt, { count = 5, width = .025, color = c.p.color, part = 'filament', start = c.start, life = c.life, reveal = false, opacity = .72 } = {}) {
  const total = v.world.qualityLevel === 'low' ? Math.min(count, 3) : count;
  for (let i = 0; i < total; i++) emit(v, c, 'beam', start, life, (item, t) => {
    const a = pointsAt(i / total, t, new T.Vector3()), b = pointsAt((i + 1) / total, t, new T.Vector3());
    if (reveal) b.lerp(a, 1 - clamp(t * total - i));
    v.beam(item, a, b, (typeof width === 'function' ? width(i) : width) * c.p.scale);
    item.material.opacity = reveal ? (t * total < i ? 0 : opacity) : envelope(t) * opacity;
  }, `${part}-${i}`, false, color);
}
function arc(v, c, actor, { radius = .75, from = -.7, sweep = 1.4, height = .52, width = .035, vertical = false, part = 'crescent', color = c.p.color } = {}) {
  const base = v.point(actor, new T.Vector3(), height);
  segments(v, c, (f, t, out) => {
    const angle = from + f * sweep;
    const r = radius * c.p.scale * (v.world.reducedMotion ? 1 : .88 + .12 * t);
    return out.copy(base).add(new T.Vector3(Math.cos(angle) * r, vertical ? Math.sin(angle) * r : .025, vertical ? .02 : Math.sin(angle) * r));
  }, { count: 6, width, color, part });
}
function handOrbit(v, c, { mask = 'light_03', count = 3, radius = .25, part = 'hand-orbit', vertical = false } = {}) {
  const total = v.world.reducedMotion ? Math.min(count, 2) : count;
  for (let i = 0; i < total; i++) emit(v, c, `c200-mask-${mask}`, c.at, c.release, (item, t) => {
    v.hand(c.source, item.object.position, c.animation);
    const a = i / total * TAU + (v.world.reducedMotion ? 0 : t * 1.8);
    item.object.position.add(new T.Vector3(Math.cos(a) * radius, vertical ? Math.sin(a) * radius : .03, vertical ? 0 : Math.sin(a) * radius));
    item.object.scale.setScalar(.24 * c.p.scale * (.7 + .3 * envelope(t)));
    item.material.rotation = a;
    item.material.opacity = envelope(t) * .8;
  }, `${part}-${i}`, false, i % 2 ? c.p.core : c.p.color);
}
function filament(v, c, target, { twists = 1, width = .018, rise = .6, part = 'filament', orbit = .12, color = c.p.color } = {}) {
  c={...c,target};
  if (c.source === target) return handOrbit(v, c, { part: `${part}-self`, mask: 'spark_04', vertical: true });
  const from = v.hand(c.source, new T.Vector3(), c.animation);
  segments(v, c, (f, t, out) => {
    out.lerpVectors(from, v.point(target, new T.Vector3(), .48), f);
    const a = f * TAU * twists + (v.world.reducedMotion ? 0 : t * 2);
    out.y += Math.sin(Math.PI * f) * rise + Math.cos(a) * orbit * Math.sin(Math.PI * f);
    out.z += Math.sin(a) * orbit * Math.sin(Math.PI * f);
    return out;
  }, { count: 7, width, color, part, start: c.at + c.release, life: c.impact - c.release, reveal: true });
}

export function fireballFlight(v, c, target, { part = 'ember-volume', soot = false, fork = false } = {}) {
  c={...c,target};
  const from = v.hand(c.source, new T.Vector3(), c.animation), start = c.at + c.release, life = c.impact - c.release;
  const point = (t, out) => {
    out.lerpVectors(from, v.point(target, new T.Vector3(), .53), clamp(t));
    out.y += Math.sin(Math.PI * clamp(t)) * .48;
    return out;
  };
  emit(v, c, 'c200-orb', start, life, (item, t) => {
    point(t, item.object.position); item.object.scale.setScalar(c.p.scale * .11);
    item.material.opacity = .86;
  }, `${part}-hot-core`, false, c.p.core);
  emit(v, c, 'c200-orb', start, life, (item, t) => {
    point(t, item.object.position); item.object.scale.setScalar(c.p.scale * .22);
    item.material.opacity = .31;
  }, `${part}-heat-shell`, true);
  emit(v, c, 'c200-ember', start, life, (item, t) => {
    const destination=v.point(target,new T.Vector3(),.53);
    point(t, item.object.position); item.object.scale.set(c.p.scale * 1.6, c.p.scale * 2.1, 1);
    item.material.rotation = Math.atan2(destination.y-from.y,destination.x-from.x)+Math.PI/2;
    item.material.opacity = .83; v.frame(item, t * .72);
  }, `${part}-blender-tongues`, true, 0xffffff);
  emit(v,c,'c200-mask-flame_01',start,life,(item,t)=>{
    point(t,item.object.position);item.object.scale.set(c.p.scale*.8,c.p.scale*1.05,1);
    item.material.rotation=Math.PI/2;item.material.opacity=.27;
  },`${part}-soft-volume`,true);
  for (let i = 0; i < (v.world.reducedMotion ? 2 : 4); i++) emit(v, c, 'c200-taper', start, life, (item, t) => {
    const a = point(Math.max(0, t - (i + 1) * .055), new T.Vector3()), b = point(Math.max(0, t - i * .055), new T.Vector3());
    v.beam(item, a, b, c.p.scale * (.13 - i * .026));
    item.material.opacity = .52 - i * .10;
  }, `${part}-taper-${i}`, false, i ? c.p.color : c.p.core);
  if (soot) emit(v, c, 'c200-mask-smoke_05', start, life, (item, t) => {
    point(Math.max(0, t - .12), item.object.position); item.object.scale.setScalar(.7 * c.p.scale);
    item.material.opacity = envelope(t) * .35;
  }, `${part}-soot`, false, 0x6b5b4d);
  if (fork) for (let i = 0; i < 2; i++) emit(v, c, 'c200-mask-spark_04', start, life, (item, t) => {
    point(t, item.object.position); const a = i * Math.PI + t * (v.world.reducedMotion ? 0 : 3);
    item.object.position.y += Math.cos(a) * .24; item.object.position.z += Math.sin(a) * .24;
    item.object.scale.setScalar(.23); item.material.rotation = a; item.material.opacity = .65;
  }, `${part}-orbit-script-${i}`, false, c.p.core);
}

export function lightningRibbon(v, c, target, { chain = false, part = 'copper-ribbon' } = {}) {
  c={...c,target};
  const from = v.hand(c.source, new T.Vector3(), c.animation), start = c.at + c.release, life = c.impact - c.release;
  const total = v.world.qualityLevel === 'low' ? 4 : 7;
  const path = (f, out) => {
    out.lerpVectors(from, v.point(target, new T.Vector3(), .53), f);
    if (f > 0 && f < 1) { const n=Math.floor(f*total); out.y += (n % 2 ? -.12-.055*(n%3) : .16+.035*(n%4)); out.z += Math.sin(f * 37 + target.id.length) * .19; }
    return out;
  };
  segments(v, c, (f, t, out) => path(f, out), { count: total, width: i=>.062-(i%3)*.008, part:`${part}-envelope`, start, life, reveal: true, opacity:.38 });
  segments(v, c, (f, t, out) => path(f, out), { count: total, width: i=>.016+(i%2)*.005, part:`${part}-white-core`, color:c.p.core, start, life, reveal: true, opacity:.95 });
  // Mesh branches have real width in WebGL. They stop short of other actors.
  for (let i = 1; i < 3; i++) emit(v, c, 'beam', start, life, (item, t) => {
    const f = i / 3, a = path(f, new T.Vector3()), b = a.clone().add(new T.Vector3(.15, i % 2 ? .38 : -.32, i % 2 ? .3 : -.3));
    v.beam(item, a, b, .022 * c.p.scale);
    item.material.opacity = t < f ? 0 : .65;
  }, `${part}-branch-${i}`, false, c.p.core);
  if (chain) mark(v, c, c.source, { mask: 'spark_04', radius: .45, start, life, part: `${part}-source-node` });
}

function facets(v, c, actor, { count = 4, rise = false, part = 'ice-crown', radius = .55 } = {}) {
  const total = v.world.reducedMotion ? 2 : count;
  for (let i = 0; i < total; i++) emit(v, c, 'shard', c.start, c.life, (item, t) => {
    v.point(actor, item.object.position, rise ? .025 : .48);
    const angle = i / total * TAU;
    item.object.position.add(new T.Vector3(Math.cos(angle) * radius, rise ? t * .5 : Math.sin(angle) * radius, Math.sin(angle) * radius * .45));
    item.object.rotation.set(.25, angle, rise ? .2 : angle);
    const grow = v.world.reducedMotion ? .8 : Math.sin(Math.PI * Math.min(1, t * 1.5));
    item.object.scale.set(.10 * grow, (.35 + i % 2 * .12) * grow, .075 * grow);
    item.material.opacity = envelope(t) * .8;
  }, `${part}-${i}`, false, i % 2 ? c.p.core : c.p.color);
}
function pillar(v, c, target, { part = 'pillar', count = 3, mask = 'light_03', height = 1.8, radius = .5 } = {}) {
  for (let i = 0; i < (v.world.reducedMotion ? 2 : count); i++) emit(v, c, `c200-mask-${mask}`, c.start, c.life, (item, t) => {
    v.point(target, item.object.position, .24); const a = i / count * TAU;
    item.object.position.x += Math.cos(a) * radius;
    item.object.position.z += Math.sin(a) * radius;
    item.object.position.y += v.world.reducedMotion ? .15 : t * .35;
    item.object.scale.set(.3 * c.p.scale, height * c.p.scale, 1);
    item.material.opacity = envelope(t) * .55;
  }, `${part}-${i}`, false, i % 2 ? c.p.core : c.p.color);
}
function seal(v, c, target, { mask = 'circle_05', part = 'seal', ground = true, radius = 1.25, height = .5, tilt = 0 } = {}) {
  mark(v, c, target, { ground, mask, part, radius, height, tilt });
}
function slash(v, c, target, { part = 'slash', tilt = -.65, radius = 1.3, count = 1 } = {}) {
  for (let i = 0; i < count; i++) mark(v, c, target, { mask: 'slash_02', radius, tilt: tilt + i * .32, start: c.start + i * .018, life: c.life * .65, part: `${part}-${i}` });
}
function scorch(v, c, target, { part = 'scorch', ice = false } = {}) {
  mark(v, c, target, { ground: true, mask: ice ? 'circle_05' : 'scorch_01', radius: ice ? 1.35 : 1.1, part, color: ice ? c.p.color : 0x956443 });
}
function helix(v, c, target, { turns = 1, radius = .45, height = 1.8, part = 'restoration-helix', color = c.p.color } = {}) {
  segments(v, c, (f, t, out) => {
    v.point(target, out, .04); const a = f * TAU * turns + (v.world.reducedMotion ? 0 : t * .7);
    return out.add(new T.Vector3(Math.cos(a) * radius, f * height, Math.sin(a) * radius));
  }, { count: 9, width: .021, part, color });
}
function spokes(v, c, target, { count = 4, part = 'contact-spokes', radius = .65, diagonal = 0, floor = false } = {}) {
  for (let i = 0; i < count; i++) emit(v, c, 'c200-taper', c.start, c.life * .65, (item, t) => {
    const center = v.point(target, new T.Vector3(), floor ? .035 : .5), a = i / count * TAU + diagonal;
    const direction = new T.Vector3(Math.cos(a), floor ? .03 : Math.sin(a), floor ? Math.sin(a) : .03);
    const from = center.clone().addScaledVector(direction, .10 + t * radius * .35), to = center.clone().addScaledVector(direction, .10 + radius * (.3 + t * .7));
    v.beam(item, from, to, .045 * c.p.scale * (1 - t * .7)); item.material.opacity = envelope(t) * .8;
  }, `${part}-${i}`, false, i % 2 ? c.p.core : c.p.color);
}
function gate(v, c, target, { part = 'ward-gate', crest = true, wide = false } = {}) {
  const center = v.point(target, new T.Vector3(), .04), half = wide ? .65 : .45, height = (target.presentationHeight || 2.8) * .66;
  const corners = [new T.Vector3(-half,0,0),new T.Vector3(-half,height,0),new T.Vector3(half,height,0),new T.Vector3(half,0,0)].map(x=>x.add(center));
  for (let i = 0; i < 3; i++) emit(v,c,'beam',c.start,c.life,(item,t)=>{
    v.beam(item,corners[i],corners[i+1],.035*c.p.scale);item.material.opacity=envelope(t)*.65;
  },`${part}-frame-${i}`,false,i===1?c.p.core:c.p.color);
  if (crest) mark(v,c,target,{mask:'magic_03',radius:.55,height:.68,part:`${part}-crest`});
}
function suture(v, c, target, { part = 'suture', vertical = false, count = 3 } = {}) {
  const center=v.point(target,new T.Vector3(),.5);
  for(let i=0;i<count;i++)emit(v,c,'beam',c.start,c.life,(item,t)=>{
    const y=(i-(count-1)/2)*.22,a=center.clone(),b=center.clone();
    if(vertical){a.x+=y;a.y-=.4;b.x+=y;b.y+=.4}else{a.y+=y;a.x-=.32;b.y+=y;b.x+=.32}
    v.beam(item,a,b,.022*c.p.scale);item.material.opacity=envelope(t)*.7;
  },`${part}-${i}`,false,i%2?c.p.core:c.p.color);
}
function moteFlight(v,c,target,{part='travelling-glyph',mask='light_03',arcHeight=.4,spin=0,size=.45}={}){
  c={...c,target};
  const from=v.hand(c.source,new T.Vector3(),c.animation);
  emit(v,c,`c200-mask-${mask}`,c.at+c.release,c.impact-c.release,(item,t)=>{
    item.object.position.lerpVectors(from,v.point(target,new T.Vector3(),.5),t);item.object.position.y+=Math.sin(Math.PI*t)*arcHeight;
    item.object.scale.setScalar(size*c.p.scale);item.material.rotation=v.world.reducedMotion?0:t*spin;item.material.opacity=.75;
  },part,false);
}
function iceFlight(v,c,target,{part='frost-fan',memory=false}={}){
  c={...c,target};
  const from=v.hand(c.source,new T.Vector3(),c.animation),count=v.world.reducedMotion?2:3;
  for(let i=0;i<count;i++)emit(v,c,'shard',c.at+c.release,c.impact-c.release,(item,t)=>{
    item.object.position.lerpVectors(from,v.point(target,new T.Vector3(),.52),t);
    item.object.position.y+=Math.sin(Math.PI*t)*(.28+i*.13);item.object.position.z+=(i-1)*.16*Math.sin(Math.PI*t);
    item.object.rotation.set(memory?.4:t*2,i*.8,Math.PI/2);item.object.scale.set(.09,.33-i*.05,.07);item.material.opacity=.8;
  },`${part}-${i}`,false,i===1?c.p.core:c.p.color);
}

// Each entry below is introduced in its own planned, checked skill cycle.
export const LAUNCH_RECIPES = {
  sun_cut: (v,c) => { if(c.mode==='windup'){handOrbit(v,c,{mask:'slash_02',count:2,vertical:true,part:'sun-edge-charge'});arc(v,c,c.source,{vertical:true,from:.2,sweep:1.8,radius:.5,part:'sun-halo-draw'});} },
  oath_guard: (v,c) => { if(c.mode==='windup'){gate(v,c,c.source,{part:'oath-counter-gate'});seal(v,c,c.source,{radius:.85,part:'oath-counter-footing'});} },
  cinder_wave: (v,c) => { if(c.mode==='windup'){arc(v,c,c.source,{radius:1.1,from:0,sweep:Math.PI,part:'cinder-fan-charge'});handOrbit(v,c,{mask:'flame_01',count:2,part:'cinder-palms'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'flame_01',size:1,arcHeight:.12,part:'cinder-front-crest'}); },
  last_light: (v,c) => { if(c.mode==='windup'){seal(v,c,c.source,{mask:'light_03',radius:.8,part:'last-light-reserve'});handOrbit(v,c,{count:1,mask:'light_03',part:'last-light-palm'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'light_03',arcHeight:.95,size:.5,part:'last-light-tear'}); },
  ember_script: (v,c) => { if(c.mode==='windup'){handOrbit(v,c,{mask:'magic_03',count:2,vertical:true,part:'ember-script-characters'});}else for(const t of c.targets)fireballFlight(v,c,t,{fork:true,part:'ember-written-fireball'}); },
  frost_margin: (v,c) => { if(c.mode==='windup'){facets(v,c,c.source,{count:3,part:'frost-bracket',radius:.3});handOrbit(v,c,{mask:'circle_05',count:1,part:'frost-margin-measure'});}else for(const t of c.targets)iceFlight(v,c,t,{part:'frost-three-facet-lance'}); },
  scatter_runes: (v,c) => { if(c.mode==='windup'){handOrbit(v,c,{mask:'magic_03',count:4,radius:.4,part:'scatter-hand-constellation'});seal(v,c,c.source,{radius:1,part:'scatter-origin-seal'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'magic_03',spin:3,arcHeight:.7,size:.6,part:'scatter-rune-token'}); },
  clear_thought: (v,c) => { if(c.mode==='windup'){mark(v,c,c.source,{mask:'circle_05',height:.92,radius:.65,part:'clear-thought-lens'});handOrbit(v,c,{count:2,mask:'spark_04',part:'clear-thought-pages'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'circle_05',spin:-2,arcHeight:.3,size:.65,part:'clear-thought-transfer'}); },
  spear_thrust: (v,c) => { if(c.mode==='windup'){suture(v,c,c.source,{vertical:true,count:1,part:'spear-grip-line'});handOrbit(v,c,{mask:'spark_04',count:1,vertical:true,part:'spear-point-charge'});}else arc(v,c,c.source,{vertical:true,from:-.15,sweep:.3,width:.022,radius:.7,part:'spear-short-wake'}); },
  shield_wall: (v,c) => { if(c.mode==='windup'){gate(v,c,c.source,{wide:true,part:'wall-source-battlement'});seal(v,c,c.source,{radius:1.1,part:'wall-foundation'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'circle_05',arcHeight:.15,size:.75,part:'wall-ally-shield-token'}); },
  iron_sweep: (v,c) => { if(c.mode==='windup'){arc(v,c,c.source,{radius:1.05,from:-1.5,sweep:3,part:'iron-sweep-load'});handOrbit(v,c,{mask:'slash_02',count:1,part:'iron-edge-load'});}else arc(v,c,c.source,{radius:1.2,from:-1.2,sweep:2.4,height:.42,part:'iron-sweep-wake'}); },
  rally: (v,c) => { if(c.mode==='windup'){arc(v,c,c.source,{vertical:true,from:0,sweep:Math.PI,radius:.65,part:'rally-banner-arch'});mark(v,c,c.source,{mask:'light_03',height:.75,radius:.65,part:'rally-standard'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'light_03',arcHeight:.25,size:.4,part:'rally-group-return'}); },
  warm_hands: (v,c) => { if(c.mode==='windup')handOrbit(v,c,{mask:'light_03',count:2,radius:.18,vertical:true,part:'warm-paired-palms'});else for(const t of c.targets)filament(v,c,t,{twists:1,orbit:.12,rise:.5,part:'warm-triage-braid'}); },
  shared_breath: (v,c) => { if(c.mode==='windup'){seal(v,c,c.source,{ground:false,mask:'circle_05',radius:.85,height:.52,part:'shared-breath-diaphragm'});handOrbit(v,c,{mask:'smoke_05',count:2,radius:.18,part:'shared-exhale-wisps'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'smoke_05',arcHeight:.2,size:.8,part:'shared-breath-mist'}); },
  wake_flame: (v,c) => { if(c.mode==='windup'){pillar(v,c,c.source,{mask:'flame_01',count:2,height:1.3,radius:.25,part:'wake-phoenix-charge'});handOrbit(v,c,{mask:'spark_04',count:3,part:'wake-life-seed'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'flame_01',arcHeight:1.1,size:.8,part:'wake-returning-seed'}); },
  copper_spark: (v,c) => { if(c.mode==='windup')handOrbit(v,c,{mask:'spark_04',count:3,radius:.23,vertical:true,part:'copper-charge-nodes'});else for(const t of c.targets)lightningRibbon(v,c,t,{part:'copper-life-ribbon'}); },
  dawn_challenge: (v,c) => { if(c.mode==='windup'){mark(v,c,c.source,{mask:'magic_03',height:.75,radius:1,part:'dawn-challenge-crest'});spokes(v,c,c.source,{count:5,floor:true,part:'dawn-challenge-call'});} },
  oath_link: (v,c) => { if(c.mode==='windup'){seal(v,c,c.source,{radius:.8,part:'oath-link-source'});handOrbit(v,c,{mask:'circle_05',count:2,vertical:true,part:'oath-link-pair'});}else for(const t of c.targets)filament(v,c,t,{twists:2,orbit:.18,rise:.15,width:.025,part:'oath-linked-braid'}); },
  lightning_chain: (v,c) => { if(c.mode==='windup'){handOrbit(v,c,{mask:'spark_04',count:3,radius:.4,part:'chain-offset-nodes'});mark(v,c,c.source,{mask:'circle_05',radius:.7,height:.78,part:'chain-source-loop'});}else if(c.targets[0])lightningRibbon(v,c,c.targets[0],{chain:true,part:'chain-first-discharge'}); },
  ink_seal: (v,c) => { if(c.mode==='windup'){mark(v,c,c.source,{mask:'magic_03',radius:.7,height:.93,tilt:Math.PI/4,part:'ink-open-stamp'});suture(v,c,c.source,{count:2,part:'ink-page-lines'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'magic_03',spin:-4,arcHeight:.15,size:.65,part:'ink-closing-stamp'}); },
  counter_charge: (v,c) => { if(c.mode==='windup'){suture(v,c,c.source,{count:2,part:'counter-brace-bars'});handOrbit(v,c,{mask:'slash_02',count:2,radius:.12,part:'counter-loaded-point'});}else arc(v,c,c.source,{vertical:true,from:-.25,sweep:.5,radius:.95,width:.05,part:'counter-charge-wake'}); },
  brace_impact: (v,c) => { if(c.mode==='windup'){gate(v,c,c.source,{crest:false,wide:true,part:'brace-heavy-gate'});facets(v,c,c.source,{count:2,rise:true,radius:.65,part:'brace-anchor-stones'});} },
  healing_thread: (v,c) => { if(c.mode==='windup'){handOrbit(v,c,{mask:'circle_05',count:1,radius:.1,part:'thread-source-spool'});mark(v,c,c.source,{mask:'spark_04',height:.64,radius:.35,part:'thread-needle'});}else for(const t of c.targets)filament(v,c,t,{twists:2,orbit:.2,rise:.85,width:.015,part:'thread-double-weave'}); },
  warding_hymn: (v,c) => { if(c.mode==='windup'){pillar(v,c,c.source,{count:3,height:1.4,radius:.4,part:'hymn-source-pipes'});suture(v,c,c.source,{count:3,part:'hymn-stave'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'circle_05',spin:1,arcHeight:.6,size:.5,part:'hymn-ward-note'}); },
  enemy_claw: (v,c) => { if(c.mode==='windup'){handOrbit(v,c,{mask:'slash_02',count:3,radius:.16,vertical:true,part:'enemy-claw-coil'});} },
  enemy_fire: (v,c) => { if(c.mode==='windup'){handOrbit(v,c,{mask:'flame_01',count:1,radius:.08,part:'enemy-spit-mouth'});mark(v,c,c.source,{mask:'smoke_05',height:.65,radius:.55,part:'enemy-spit-soot'});}else for(const t of c.targets)fireballFlight(v,c,t,{soot:true,part:'enemy-coal-spit'}); },
  enemy_ice: (v,c) => { if(c.mode==='windup'){mark(v,c,c.source,{mask:'circle_05',height:.65,radius:.7,tilt:.3,part:'enemy-memory-lens'});facets(v,c,c.source,{count:2,radius:.35,part:'enemy-memory-fragments'});}else for(const t of c.targets)iceFlight(v,c,t,{memory:true,part:'enemy-memory-fan'}); },
  enemy_ring: (v,c) => { if(c.mode==='windup'){seal(v,c,c.source,{ground:false,radius:1.3,height:.62,part:'enemy-bell-resonator'});arc(v,c,c.source,{radius:1.3,from:0,sweep:Math.PI,part:'enemy-bell-floor-arc'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'circle_05',arcHeight:0,size:.7,part:'enemy-sonic-pressure'}); },
  enemy_guard: (v,c) => { if(c.mode==='windup'){gate(v,c,c.source,{crest:false,part:'enemy-iron-gate'});seal(v,c,c.source,{radius:.65,part:'enemy-iron-footing'});} },
  enemy_mend: (v,c) => { if(c.mode==='windup'){suture(v,c,c.source,{vertical:true,count:3,part:'enemy-ash-needles'});handOrbit(v,c,{mask:'smoke_05',count:1,part:'enemy-ash-spool'});}else for(const t of c.targets)moteFlight(v,c,t,{mask:'smoke_05',arcHeight:.6,size:.6,part:'enemy-ash-return'}); },
  // @launch-recipes
};
export const IMPACT_RECIPES = {
  sun_cut: (v,c,t) => { slash(v,c,t,{part:'sun-piercing-crescent',tilt:-.7,radius:1.6});spokes(v,c,t,{count:4,diagonal:.45,part:'sun-contact-wedges'}); },
  oath_guard: (v,c,t) => { gate(v,c,t,{part:'oath-counter-closure'});seal(v,c,t,{ground:false,radius:.8,height:.54,part:'oath-counter-ready'}); },
  cinder_wave: (v,c,t) => { pillar(v,c,t,{count:3,mask:'flame_01',height:1.5,radius:.45,part:'cinder-front-plumes'});scorch(v,c,t,{part:'cinder-wide-footprint'}); },
  last_light: (v,c,t) => { pillar(v,c,t,{count:1,height:2.2,radius:0,part:'last-light-descending-column'});seal(v,c,t,{mask:'light_03',radius:1.1,part:'last-light-rescue-sun'}); },
  ember_script: (v,c,t) => { scorch(v,c,t,{part:'ember-burned-letter'});pillar(v,c,t,{count:2,mask:'flame_01',height:1.2,radius:.25,part:'ember-split-tongues'});seal(v,c,t,{mask:'magic_03',radius:.65,part:'ember-burn-character'}); },
  frost_margin: (v,c,t) => { facets(v,c,t,{count:6,rise:true,radius:.65,part:'frost-ground-crown'});scorch(v,c,t,{ice:true,part:'frost-ground-margin'}); },
  scatter_runes: (v,c,t) => { seal(v,c,t,{ground:false,mask:'magic_03',radius:1.1,height:.56,tilt:Math.PI/4,part:'scatter-breaking-star'});spokes(v,c,t,{count:5,floor:true,diagonal:.3,part:'scatter-guard-splinters'}); },
  clear_thought: (v,c,t) => { mark(v,c,t,{mask:'circle_05',radius:1,height:.96,part:'clear-thought-open-lens'});suture(v,c,t,{vertical:true,count:3,part:'clear-thought-clarity-stitches'}); },
  spear_thrust: (v,c,t) => { spokes(v,c,t,{count:3,radius:.5,diagonal:.2,part:'spear-puncture-contact'});facets(v,c,t,{count:2,radius:.32,part:'spear-armor-halves'}); },
  shield_wall: (v,c,t) => { gate(v,c,t,{wide:true,part:'wall-ally-panel'});seal(v,c,t,{radius:1.15,part:'wall-shared-foundation'}); },
  iron_sweep: (v,c,t) => { slash(v,c,t,{count:2,tilt:-.05,radius:1.6,part:'iron-wide-contact'});spokes(v,c,t,{count:3,floor:true,part:'iron-floor-contact'}); },
  rally: (v,c,t) => { pillar(v,c,t,{count:1,height:1.2,radius:0,part:'rally-ally-standard'});arc(v,c,t,{vertical:true,from:0,sweep:Math.PI,radius:.65,part:'rally-recovery-arch'}); },
  warm_hands: (v,c,t) => { helix(v,c,t,{turns:1,radius:.38,height:1.5,part:'warm-triage-cradle'});mark(v,c,t,{mask:'light_03',radius:.75,height:.5,part:'warm-joined-palms'}); },
  shared_breath: (v,c,t) => { pillar(v,c,t,{count:2,mask:'smoke_05',height:1.3,radius:.4,part:'shared-regeneration-mist'});seal(v,c,t,{ground:false,radius:1.4,height:.5,part:'shared-breath-body-hoop'}); },
  wake_flame: (v,c,t) => { pillar(v,c,t,{count:2,mask:'flame_01',height:2.6,radius:.6,part:'wake-phoenix-wings'});helix(v,c,t,{turns:1.5,radius:.65,height:2.5,part:'wake-life-ascent'});seal(v,c,t,{radius:1.4,part:'wake-return-seal'}); },
  copper_spark: (v,c,t) => { spokes(v,c,t,{count:5,radius:.8,diagonal:.15,part:'copper-contact-branch-star'});seal(v,c,t,{mask:'circle_05',radius:.85,part:'copper-return-circuit'}); },
  dawn_challenge: (v,c,t) => { mark(v,c,t,{mask:'magic_03',radius:1.25,height:.75,part:'dawn-taunt-barrier-crest'});spokes(v,c,t,{count:5,floor:true,radius:.9,part:'dawn-challenge-rays'}); },
  oath_link: (v,c,t) => { helix(v,c,t,{turns:.75,radius:.6,height:1.7,part:'oath-cover-embrace'});seal(v,c,t,{ground:false,radius:.85,height:.58,part:'oath-covered-seal'}); },
  lightning_chain: (v,c,t) => { mark(v,c,t,{mask:'spark_04',radius:1.3,height:.55,part:'chain-target-node'});spokes(v,c,t,{count:3,radius:.95,diagonal:.6,part:'chain-asymmetric-contact'}); },
  ink_seal: (v,c,t) => { mark(v,c,t,{mask:'magic_03',radius:1.2,height:.82,tilt:Math.PI/4,part:'ink-disruption-stamp'});suture(v,c,t,{count:2,part:'ink-closing-bars'}); },
  counter_charge: (v,c,t) => { slash(v,c,t,{count:2,tilt:-.65,radius:1.1,part:'counter-crossed-contact'});spokes(v,c,t,{count:2,radius:.8,diagonal:.3,part:'counter-stop-wedges'}); },
  brace_impact: (v,c,t) => { gate(v,c,t,{wide:true,crest:false,part:'brace-closed-heavy-frame'});facets(v,c,t,{count:4,rise:true,radius:.72,part:'brace-barrier-anchors'}); },
  healing_thread: (v,c,t) => { helix(v,c,t,{turns:2,radius:.32,height:1.9,part:'thread-regeneration-weave'});suture(v,c,t,{count:3,part:'thread-mended-stitches'}); },
  warding_hymn: (v,c,t) => { pillar(v,c,t,{count:3,height:2.1,radius:.55,part:'hymn-barrier-pipes'});seal(v,c,t,{radius:1.3,part:'hymn-barrier-note'}); },
  enemy_claw: (v,c,t) => { slash(v,c,t,{count:3,tilt:-.85,radius:1.1,part:'enemy-ragged-claw-contact'});spokes(v,c,t,{count:4,radius:.4,part:'enemy-claw-contact-star'}); },
  enemy_fire: (v,c,t) => { scorch(v,c,t,{part:'enemy-spit-dirty-scorch'});pillar(v,c,t,{count:1,mask:'smoke_05',height:1.4,radius:0,part:'enemy-spit-smoke'});mark(v,c,t,{mask:'flame_01',radius:1,height:.5,part:'enemy-spit-tongue'}); },
  enemy_ice: (v,c,t) => { facets(v,c,t,{count:3,radius:.55,part:'enemy-frozen-memory-shards'});seal(v,c,t,{ground:false,radius:1.05,height:.55,part:'enemy-memory-cold-lens'}); },
  enemy_ring: (v,c,t) => { arc(v,c,t,{vertical:true,radius:1.15,from:0,sweep:Math.PI,part:'enemy-bell-upper-pressure'});arc(v,c,t,{radius:1.3,from:-1.4,sweep:2.8,part:'enemy-bell-floor-pressure'});seal(v,c,t,{ground:false,radius:1.6,height:.52,part:'enemy-bell-contact-circle'}); },
  enemy_guard: (v,c,t) => { gate(v,c,t,{crest:false,part:'enemy-iron-closed-frame'});suture(v,c,t,{count:3,part:'enemy-iron-brace-bars'}); },
  enemy_mend: (v,c,t) => { suture(v,c,t,{vertical:true,count:4,part:'enemy-ash-repair-stitches'});helix(v,c,t,{turns:.75,radius:.4,height:1.3,part:'enemy-ash-reknitting'}); },
  // @impact-recipes
};

export function combat200Windup(v, sequence) {
  const recipe = LAUNCH_RECIPES[sequence.profile.skillId];
  if (!recipe) return;
  const c = { ...sequence, p: sequence.profile, phase: 'launch', mode: 'windup', release: sequence.timing.release, impact: sequence.timing.impact, start: sequence.at, life: sequence.timing.release };
  v.withQuota(v.world.reducedMotion ? 6 : 12, () => recipe(v, c));
}
export function combat200Launch(v, sequence, targets) {
  const recipe = LAUNCH_RECIPES[sequence.profile.skillId];
  if (!recipe) return;
  const c = { ...sequence, targets, p: sequence.profile, phase: 'launch', mode: 'travel', release: sequence.timing.release, impact: sequence.timing.impact, start: sequence.at + sequence.timing.release, life: sequence.timing.impact - sequence.timing.release };
  // A row action keeps its first target readable without letting target count
  // multiply the shared source/travel detail budget.
  v.withQuota(v.world.reducedMotion ? 9 : 24, () => recipe(v, c));
}
export function combat200Impact(v, source, target, p, start, animation) {
  const recipe = IMPACT_RECIPES[p.skillId];
  if (!recipe) return;
  const c = { source, target, p, animation, phase: 'impact', start, life: p.family === 'revive' ? .72 : .52, at: start, release: 0, impact: .52 };
  recipe(v, c, target);
}
