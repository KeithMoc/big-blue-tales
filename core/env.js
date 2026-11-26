// Environment: the water an animal is shown in, built from small independent pieces.
//   lights   - sky light, the submarine's two lamps (they ride with the camera), a rim light, the sun
//   dome     - a smooth gradient behind everything, for open sunlit water
//   surface  - the sea surface seen from below
//   floor    - a sandy sea floor with a soft shadow
//   specks   - drifting marine snow that never crosses in front of an animal
// A pack names a preset and may override single numbers: "environment": { "preset": "sunlit", "fog": 0.02 }.
// Nothing in here knows about any particular animal. Licence: MIT.
import * as THREE from 'three';
import { glowTexture, rng, noise3, skinNormalTexture } from 'creature-kit';
import { PRESET_IDS } from './preset-ids.js';
import { createWater } from '../scenes/kit/water.js';
import { createShafts } from '../scenes/kit/shafts.js';

// ---- the dive look: the water's colour set by the depth an animal lives at. A pack that wears it says
// "looks": { "dive": { "on": true } }; ?look=dive in the address asks for it and ?look=classic turns it off. In a story
// the runner passes no depth, so the only thing ?look=dive changes there is the opening camera (scene.json looks.dive).
const ASKED = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('look') : null;
export const DIVE = ASKED === 'dive';
/** Does this pack (animal.json or scene.json) wear the dive look right now? */
export const wearsDive = (pack) => ASKED === 'dive' || (ASKED !== 'classic' && pack?.looks?.dive?.on === true);
// How fast clear ocean water takes each colour out of sunlight, per metre: red, green, blue. The order (red goes
// first, blue goes deepest) is the sourced fact (NOAA). The three numbers are
// rounded from the absorption of pure water and are NOT yet checked against their paper; they shape a picture.
const TAKEN = [0.34, 0.065, 0.022];
const hex = (r, g, b) => '#' + new THREE.Color().setRGB(Math.min(1, r), Math.min(1, g), Math.min(1, b), THREE.SRGBColorSpace).getHexString();
/** The colour of sunlit water seen at a depth in metres, with the eye used to the dark (we brighten it; real water at 60 m is dimmer). */
export function waterAt(depth, coastal = false) {
  const d = Math.max(0, depth), [r, g, b] = TAKEN.map(k => Math.exp(-k * d));
  // The eye gets used to dim water, so most of the dimming is divided back out and the lost colours are kept as a
  // trace (real water at 60 m is dimmer and bluer than this). Shallow is turquoise-blue, deeper is a green-leaning navy.
  // Green is held at about half of blue in deep water: a real photograph of open water away from the sun measures
  // green at 0.55 of blue with almost no red (the photograph is not in this repo). With less green it read violet.
  const B = 0.7 * Math.pow(Math.max(b, 1e-4), 0.3), keep = (x, floor, k) => B * (floor + k * Math.sqrt(Math.max(x, 0) / Math.max(b, 1e-4)));
  // Coastal water carries plankton and stirred-up sediment, so it is greener than the open sea (a real photograph of
  // green water measures green above blue; not in this repo). A light tint, only for a pack whose
  // dossier says the animal lives mainly near the coast (looks.dive.water = "coastal").
  return coastal ? hex(keep(r, 0.13, 0.4), keep(g, 0.46, 0.36) * 1.04, B * 0.92 * 0.88) : hex(keep(r, 0.13, 0.4), keep(g, 0.46, 0.36), B * 0.92);
}
/** The depth an animal's portrait is set at: a quarter of the way down its usual range, kept between 8 and 120 m so the
 *  water is never too pale to read the words on, nor so dark that no blue is left. That clamp is for the picture, not a fact. */
export const portraitDepth = (depthM) => { const u = depthM?.usual; return u ? Math.min(120, Math.max(8, u[0] + 0.25 * (u[1] - u[0]))) : 20; };

/** lit/dark = water colour with lamps on/off. hemi = [sky, ground, strength]. rim = [colour, strength]. */
export const PRESETS = {
  midnight: { label: 'Midnight zone', lit: '#06141f', dark: '#010305', fog: 0.075, hemi: ['#9cc4e0', '#0a1218', 0.4], key: 3.2, fill: 0.9, rim: ['#4fa3e6', 2.4], rimPos: [-3, 2.6, -4.5],
    sun: 0, bloom: 0.75, exposure: 1.05, snow: 0.5, lamps: true, darkRim: 0.05, darkHemi: 0.012 },
  twilight: { label: 'Twilight zone', lit: '#06141f', dark: '#010305', fog: 0.075, hemi: ['#9cc4e0', '#0a1218', 0.4], key: 3.2, fill: 0.9, rim: ['#4fa3e6', 2.4], rimPos: [-3, 2.6, -4.5],
    sun: 0, bloom: 0.75, exposure: 1.05, snow: 0.5, lamps: true, darkRim: 0.05, darkHemi: 0.012 },
  sunlit: { label: 'Sunlit zone', lit: '#0b4f80', dark: '#06243d', fog: 0.022, hemi: ['#bfe8ff', '#0a3558', 1.5], key: 0.5, fill: 0.9, rim: ['#9fd8ff', 0.9], rimPos: [-3, 2.6, -4.5],
    sun: 3.4, bloom: 0.18, exposure: 1.0, snow: 0.22, lamps: false, dome: ['#3fa9dc', '#0b4f80', '#041c33'], darkRim: 0.05, darkHemi: 0.012 },
  'sunlit-sea': { label: 'Sunlit sea', lit: '#0b3b55', dark: '#010305', fog: 0.05, hemi: ['#bfe6ff', '#0c3346', 0.85], key: 1.9, fill: 0.55, rim: ['#e6f6ff', 1.7], rimPos: [-1.2, 6, 1.5],
    sun: 0, bloom: 0.75, exposure: 1.05, snow: 0.5, lamps: true, surfaceColor: '#58b4d2', darkRim: 0.05, darkHemi: 0.012 },
  'sandy-shelf': { label: 'Sandy sea floor', lit: '#062b40', dark: '#020b13', fog: 0.085, hemi: ['#9fd0e6', '#1c2a30', 0.35], key: 2.5, fill: 0.8, rim: ['#6fb6dc', 1.1], rimPos: [-3, 2.6, -4.5],
    sun: 0, bloom: 0.75, exposure: 1.05, snow: 0.5, lamps: true, floor: true, sand: '#5d7480', darkRim: 0.5, darkHemi: 0.1 },
};

{ const have = Object.keys(PRESETS).sort().join(), want = [...PRESET_IDS].sort().join(); if (have !== want) throw new Error(`core/preset-ids.js lists [${want}] but core/env.js defines [${have}]`); }

/** Preset plus the pack's own overrides, as one flat description. */
export function resolveEnv(cfg) {
  const c = typeof cfg === 'string' ? { preset: cfg } : (cfg || {});
  const base = PRESETS[c.preset];
  if (!base) throw new Error(`Unknown environment preset "${c.preset}". Known: ${Object.keys(PRESETS).join(', ')}`);
  return { ...base, ...c };
}

const SNOW = 520;

export function createEnvironment({ scene, camera }) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0);
  const key = new THREE.DirectionalLight(0xeef6ff, 0);
  key.position.set(-1.6, 2.2, 1.2); camera.add(key, key.target); key.target.position.set(0, 0, -5);
  const fill = new THREE.DirectionalLight(0xbfd9ee, 0);
  fill.position.set(2.2, -0.6, 1.5); camera.add(fill, fill.target); fill.target.position.set(0, 0, -5);
  const rim = new THREE.DirectionalLight(0xffffff, 0);
  const sun = new THREE.DirectionalLight(0xf2fbff, 0);
  sun.position.set(1.5, 6, 2);
  scene.add(hemi, rim, sun);
  // dive look, dark water: the submarine's lamp as ONE pool of light (soft-edged, a little to one side) and the haze it
  // makes in the water behind the animal. Both are off (strength 0, hidden) unless a dive look is applied.
  const lamp = new THREE.SpotLight(0xf4f9ff, 0, 0, 0.4, 0.95, 2);
  lamp.position.set(2.2, 1.9, 0.2); camera.add(lamp, lamp.target); lamp.target.position.set(0, 0, -6);
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(46,120,160,1)', 'rgba(46,120,160,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
  haze.renderOrder = -1; haze.visible = false; scene.add(haze);
  scene.background = new THREE.Color(0x06141f);
  scene.fog = new THREE.FogExp2(0x06141f, 0.075);

  // ---- specks: made once, shared by every environment
  const snowBox = new THREE.Vector3(14, 8, 12), snowPos = new Float32Array(SNOW * 3), snowCol = new Float32Array(SNOW * 3).fill(1), seed = rng(42);
  for (let i = 0; i < SNOW * 3; i++) snowPos[i] = (seed() - 0.5) * snowBox.getComponent(i % 3);
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  snowGeo.setAttribute('color', new THREE.BufferAttribute(snowCol, 3));
  const snowMat = new THREE.PointsMaterial({ map: glowTexture('rgba(210,230,240,1)', 'rgba(210,230,240,0)'), size: 0.07, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true });
  const snow = new THREE.Points(snowGeo, snowMat);
  snow.frustumCulled = false;
  scene.add(snow);

  let E = null, dome = null, surface = null, floor = null, shadow = null, snowScale = 1, heightAt = null, water = null, shafts = null;
  const WATER_LIT = new THREE.Color(), WATER_DARK = new THREE.Color(), toCam = new THREE.Vector3(), v = new THREE.Vector3();
  const own = [];                          // GPU resources of the current preset's pieces
  const keep = (o) => { own.push(o); return o; };

  function clear() {
    for (const o of [dome, surface, floor, shadow]) if (o) o.removeFromParent();
    for (const o of own) o.dispose();
    for (const o of [water, shafts]) if (o) { o.root.removeFromParent(); o.dispose(); }
    haze.visible = false; haze.geometry.dispose(); haze.material.map.dispose();   // a plane, not a Sprite: its GPU copies (shape and glow picture) go when the animal leaves and come back on the next draw
    own.length = 0; dome = surface = floor = shadow = water = shafts = null; heightAt = null;
  }

  /** Switch to an environment. opts.dive = wear the dive look; opts.tune = the pack's {lamp, haze} multipliers for it. opts.surface = {y, breathY}; opts.floorY; opts.scale stretches the specks' box for big scenes. */
  function apply(env, opts = {}) {
    clear();
    E = env;
    const on = opts.dive ?? DIVE;
    const zoned = opts.tune?.zone === 'sunlit';   // the pack says its dossier puts the animal in sunlit water (looks.dive.zoneFact names the fact)
    const dive = on && (E.dome || E.surfaceColor || E.floor === true || zoned) && (opts.depthM || zoned) ? portraitDepth(opts.depthM) : null;   // sunlit water: open, under a surface, or over the shared sandy floor. No known depth (the long-ago animals): the portrait's default depth, a choice for the picture and not a fact
    haze.visible = false;
    if (on && dive === null && E.lamps && opts.depthM && E.floor !== true) {   // not the shared sandy floor; a pack's own floor takes the lamp pool
      // No sunlight reaches here. What you see is what the lamp touches: a strong pool with a soft edge, a faint cool
      // edge light so the shape still reads (drawn, and said so), and almost nothing else. On a pack's own floor the
      // pool on the ground shows the lamp's reach, so there is no haze card (it would cut into the sand).
      E = { ...env, dive: -1, key: 0.12, fill: 0.05, lamp: 5.8 * (opts.tune?.lamp ?? 1), haze: 0.2 * (opts.tune?.haze ?? (E.floor ? 0 : 1)), rim: [env.rim[0], env.rim[1] * 0.4], hemi: [env.hemi[0], env.hemi[1], env.hemi[2] * 0.3], fog: env.fog * 1.5 };
      haze.visible = E.haze > 0;
    }
    if (dive !== null) {
      // The water takes its colour from the depth: paler above (shallower water), darker below (deeper water). One sun,
      // straight above; the sky light is turned down so the animal has a lit back and a shaded belly.
      const green = opts.tune?.water === 'coastal', top = waterAt(dive * 0.3, green), level = waterAt(dive, green), deep = waterAt(dive * 2.2 + 25, green), sunLeft = Math.exp(-dive / 70);
      E = { ...env, lit: level, dark: deep, dome: null, dive, hemi: [waterAt(dive * 0.3), waterAt(dive * 2.2 + 25), 0.7], sun: 2.4 + 1.6 * sunLeft, key: 0.95, fill: 0.25, rim: [waterAt(dive * 0.3), 1.3],   // the lights keep the open-sea colours, so a green sea does not paint the animal green
        bloom: Math.min(env.bloom, 0.18), fog: env.fog * (green ? 1.6 : 1.25) };   // coastal water is murkier too
      if (env.floor === true) {
        // Sand takes the colour of the water above it: grey-blue with no warm tint in the shallows, the water's own
        // blue-green further down (measured on real photographs that are not in this repo). Light lines, the
        // moving net the waves focus on the sand, only where it is shallow enough for them (none by about 25 m).
        const pale = new THREE.Color('#8e9b9e'), far = new THREE.Color(level);
        E.sand = '#' + pale.lerp(far, 1 - Math.exp(-dive / 45)).multiplyScalar(0.25 + 0.75 * Math.exp(-dive / 110)).getHexString();
        E.lines = Math.max(0, 1 - dive / 25) * sunLeft;
      }
      water = createWater(THREE, { top, level, deep, glow: hex(0.75, 0.93, 1), sun: [0.25, 0.94, 0.2] });
      water.root.material.uniforms.uGlow.value.multiplyScalar(0.25 + 0.75 * sunLeft);
      scene.add(water.root);
      if (sunLeft > 0.15) {
        shafts = createShafts(THREE, { count: opts.tier === 'high' ? 9 : opts.tier === 'mid' ? 7 : 5, top: 10, bottom: -8, near: 5, far: 12, back: -5, strength: 0.3 * sunLeft });
        scene.add(shafts.root);
      }
    }
    WATER_LIT.set(E.lit); WATER_DARK.set(E.dark);
    hemi.color.set(E.hemi[0]); hemi.groundColor.set(E.hemi[1]);
    rim.color.set(E.rim[0]); rim.position.set(...E.rimPos);
    snowScale = opts.scale || 1;
    snow.scale.setScalar(snowScale); snowMat.size = 0.07 * snowScale;

    if (E.dome) {
      // open water: brighter above, darker below. A smooth gradient, drawn behind everything.
      const g = keep(new THREE.SphereGeometry(90, 32, 24)), c = new THREE.Color(), cols = [];
      const [up, mid, down] = E.dome.map(h => new THREE.Color(h));
      for (let i = 0; i < g.attributes.position.count; i++) {
        const y = g.attributes.position.getY(i) / 90;
        c.copy(mid).lerp(y > 0 ? up : down, Math.pow(Math.abs(y), 0.7));
        cols.push(c.r, c.g, c.b);
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
      dome = new THREE.Mesh(g, keep(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
      dome.renderOrder = -1; dome.frustumCulled = false;
      scene.add(dome);
    }

    if (E.surfaceColor && opts.surface) {
      // The water surface, seen from underneath only: a soft, slowly drifting pattern with nothing fine in it.
      const S = 128, n = noise3(77), data = new Uint8Array(S * S * 4);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const a = x / S * Math.PI * 2, b = y / S * Math.PI * 2, k = 0.5 + 0.5 * n(Math.cos(a) * 1.3 + 9, Math.sin(a) * 1.3 + Math.cos(b) * 1.3, Math.sin(b) * 1.3);
        const i = (y * S + x) * 4, l = 185 + 70 * k * k * (3 - 2 * k);
        data[i] = data[i + 1] = data[i + 2] = l; data[i + 3] = 255;
      }
      const map = keep(new THREE.DataTexture(data, S, S, THREE.RGBAFormat));
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(7, 7); map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter; map.generateMipmaps = true; map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true;
      surface = new THREE.Mesh(keep(new THREE.PlaneGeometry(90, 90)), keep(new THREE.MeshBasicMaterial({ color: E.surfaceColor, map, transparent: true, opacity: 0.86, side: THREE.BackSide, depthWrite: false })));
      if (E.dive > 0) {
        // Dive look: the far edge of the surface fades away, or it draws a hard line across the paler water behind it.
        const A = 64, fade = new Uint8Array(A * A * 4);
        for (let y = 0; y < A; y++) for (let x = 0; x < A; x++) { const r = Math.hypot(x - (A - 1) / 2, y - (A - 1) / 2) / (A / 2), k = Math.min(1, Math.max(0, (1 - r) / 0.7)), i = (y * A + x) * 4; fade[i] = fade[i + 1] = fade[i + 2] = 255 * k * k * (3 - 2 * k); fade[i + 3] = 255; }
        const alpha = keep(new THREE.DataTexture(fade, A, A, THREE.RGBAFormat)); alpha.magFilter = alpha.minFilter = THREE.LinearFilter; alpha.needsUpdate = true;
        surface.material.alphaMap = alpha;
      }
      surface.rotation.x = -Math.PI / 2; surface.position.y = opts.surface.y;
      surface.userData = { lit: new THREE.Color(E.surfaceColor), y: opts.surface.y, breathY: opts.surface.breathY ?? opts.surface.y };
      scene.add(surface);
    }

    if (E.floor === true) {
      // sea floor: smooth dunes with exact normals and no grain. The engine keeps the camera above it (engine.setGround).
      const y0 = opts.floorY ?? -0.7, N = 72, k = snowScale, SIZE = 46 * k, n = noise3(77);
      const h = (x, z) => 0.16 * n(x * 0.17, 0, z * 0.17) + 0.035 * n(x * 0.55 + 7, 3, z * 0.55);
      const h0 = h(0, 0), fall = (x, z) => Math.min(1, Math.hypot(x, z) / 2.2);   // flat right under the animal
      const H = (X, Z) => { const x = X / k, z = Z / k; return k * (h(x, z) - h0) * fall(x, z) ** 2; };
      const pos = [], nor = [], uv = [], col = [], idx = [], c = new THREE.Color(), sand = new THREE.Color(E.sand);
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
        // rows bunch toward the middle, where the camera looks
        const a = i / N * 2 - 1, b = j / N * 2 - 1, x = Math.sign(a) * a * a * SIZE / 2, z = Math.sign(b) * b * b * SIZE / 2, e = 0.02 * k;
        pos.push(x, y0 + H(x, z), z);
        const nx = (H(x - e, z) - H(x + e, z)) / (2 * e), nz = (H(x, z - e) - H(x, z + e)) / (2 * e), l = Math.hypot(nx, 1, nz);
        nor.push(nx / l, 1 / l, nz / l); uv.push(x / 3 / k, z / 3 / k);
        c.copy(sand).multiplyScalar(0.9 + 0.1 * n(x * 0.3 / k + 20, 5, z * 0.3 / k)); col.push(c.r, c.g, c.b);
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const p = i * (N + 1) + j, q = p + 1, r = p + N + 1, t = r + 1; idx.push(p, q, r, q, t, r); }
      const g = keep(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
      const ripple = keep(skinNormalTexture(5, { strength: 0.8, octaves: [[6, 1], [12, 0.45]] }));
      floor = new THREE.Mesh(g, keep(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, normalMap: ripple, normalScale: new THREE.Vector2(0.35, 0.35) })));
      floor.userData.y = y0; heightAt = (x, z) => y0 + H(x, z);
      if (E.lines > 0) {
        // light lines: a soft tiling net (the bright ridges of a smooth noise), laid on the sand as its own light and drifted slowly
        const S = 256, m = noise3(41), data = new Uint8Array(S * S * 4);
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          const u = x / S * Math.PI * 2, w = y / S * Math.PI * 2;
          const q = m(Math.cos(u) * 1.9 + 3, Math.sin(u) * 1.9 + Math.cos(w) * 1.9, Math.sin(w) * 1.9), r = m(Math.cos(u) * 3.1 + 11, Math.sin(u) * 3.1 + Math.cos(w) * 3.1, Math.sin(w) * 3.1 + 5);
          const ridge = (1 - Math.min(1, Math.abs(q) * 3.2)) ** 3 + 0.5 * (1 - Math.min(1, Math.abs(r) * 3.6)) ** 3, i = (y * S + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = Math.min(255, 255 * ridge); data[i + 3] = 255;
        }
        const net = keep(new THREE.DataTexture(data, S, S, THREE.RGBAFormat));
        net.wrapS = net.wrapT = THREE.RepeatWrapping; net.magFilter = THREE.LinearFilter; net.minFilter = THREE.LinearMipmapLinearFilter; net.generateMipmaps = true; net.colorSpace = THREE.SRGBColorSpace; net.needsUpdate = true;
        floor.material.emissive = new THREE.Color('#cfeaf0'); floor.material.emissiveMap = net; floor.material.emissiveIntensity = 0.4 * E.lines;
        floor.userData.net = net; floor.userData.lines = 0.4 * E.lines;
      }
      // a soft shadow, so the animal reads as floating above the sand or lying on it
      const sc = document.createElement('canvas'); sc.width = sc.height = 128;
      const sx = sc.getContext('2d'), sg = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
      sg.addColorStop(0, 'rgba(0,0,0,0.85)'); sg.addColorStop(0.55, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      sx.fillStyle = sg; sx.fillRect(0, 0, 128, 128);
      const sg2 = keep(new THREE.PlaneGeometry(1, 1)); sg2.rotateX(-Math.PI / 2);
      shadow = new THREE.Mesh(sg2, keep(new THREE.MeshBasicMaterial({ map: keep(new THREE.CanvasTexture(sc)), transparent: true, depthWrite: false, opacity: 0.4, fog: true })));
      shadow.position.y = y0 + 0.004 * k; shadow.userData.floorY = y0;
      scene.add(floor, shadow);
    }
    return E;
  }

  const smooth = (k) => k * k * (3 - 2 * k);
  /**
   * Once a frame. lit = 1 lamps on .. 0 off. bodies = [{position: Vector3 (world), reach}] for every animal shown.
   * rise = 0..1 how far an animal has climbed to breathe. lens = the camera's widening factor in narrow windows.
   */
  function update({ lit, t, dt, bodies = [], rise = 0, lens = 1, specks = true, calm = false }) {
    key.intensity = E.key * lit; fill.intensity = E.fill * lit;
    if (!E.lamp || !bodies.length) lamp.intensity = 0;
    if (E.lamp && bodies.length) {
      // aim the pool at the animal and size it to cover most of her; her far end falls off into the dark
      const b = bodies[0], d = Math.max(0.5, v.copy(b.position).sub(camera.position).length());
      lamp.target.position.set(0, 0, -d); lamp.angle = Math.min(1.2, Math.atan(b.reach * 1.05 / d) + 0.06);
      lamp.intensity = E.lamp * lit * d * d;                       // light fades fast in water: her near end is bright, her far end dim
      camera.getWorldDirection(toCam);
      haze.position.copy(b.position).addScaledVector(toCam, b.reach * 1.6); haze.scale.setScalar(b.reach * 9);
      haze.material.opacity = (E.haze ?? 0.2) * lit; haze.quaternion.copy(camera.quaternion);
    }
    sun.intensity = E.sunDims ? E.sun * lit : E.sun;
    rim.intensity = E.rim[1] * lit + E.darkRim * (1 - lit);
    hemi.intensity = E.hemi[2] * lit + E.darkHemi * (1 - lit);
    scene.background.lerpColors(WATER_DARK, WATER_LIT, lit);
    scene.fog.color.copy(scene.background);
    scene.fog.density = E.fog / lens / snowScale;
    if (dome) { dome.position.copy(camera.position); dome.material.color.setScalar(0.62 + 0.38 * lit); }
    if (water) water.update(t);
    if (shafts) shafts.update(t);
    if (surface) {
      const u = surface.userData;
      surface.position.y = u.y + (u.breathY - u.y) * rise;
      surface.material.color.copy(u.lit).multiplyScalar(0.35 + 0.65 * lit);
      surface.material.map.offset.set(t * 0.012, t * 0.007);
    }
    if (floor) floor.visible = camera.position.y > floor.userData.y;
    if (floor?.userData.net) { floor.userData.net.offset.set(t * 0.011, t * 0.007); floor.material.emissiveIntensity = floor.userData.lines * lit; }
    if (shadow) {
      shadow.visible = floor.visible && bodies.length > 0 && bodies.length === 1;
      if (shadow.visible) {
        const b = bodies[0], p = b.shadowAt || b.position, gap = Math.max(0, p.y - shadow.userData.floorY);
        shadow.position.x = p.x; shadow.position.z = p.z;
        shadow.scale.setScalar(b.reach * (1.7 + 0.9 * gap));
        shadow.material.opacity = (0.55 - 0.3 * Math.min(1, gap / 0.7)) * (0.25 + 0.75 * lit);
      }
    }

    // specks sink slowly and drift with a faint current
    snow.visible = specks;
    if (!specks) return;
    snowMat.opacity = E.snow * (0.1 + 0.9 * lit);
    const sp = (calm ? 0 : 1) * dt;
    for (let i = 0; i < SNOW; i++) {
      const j = i * 3;
      snowPos[j] -= sp * (0.05 + (i % 7) * 0.006);
      snowPos[j + 1] -= sp * (0.035 + (i % 5) * 0.008);
      if (snowPos[j] < -snowBox.x / 2) snowPos[j] += snowBox.x;
      if (snowPos[j + 1] < -snowBox.y / 2) snowPos[j + 1] += snowBox.y;
    }
    snowGeo.attributes.position.needsUpdate = true;
    // A speck that crosses in front of an animal looks like a white flaw on its skin, so each one is faded
    // out (additive black = invisible) until it is behind every animal in view.
    camera.getWorldDirection(toCam);
    let far = -Infinity;
    for (const b of bodies) far = Math.max(far, v.copy(b.position).sub(camera.position).dot(toCam) + b.reach);
    if (far === -Infinity) far = 0;
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, s = snowScale;
    for (let i = 0; i < SNOW; i++) {
      const j = i * 3;
      const depth = (snowPos[j] * s - cx) * toCam.x + (snowPos[j + 1] * s - cy) * toCam.y + (snowPos[j + 2] * s - cz) * toCam.z;
      const k = Math.min(1, Math.max(0, (depth - far) / (1.2 * s)));
      snowCol[j] = snowCol[j + 1] = snowCol[j + 2] = smooth(k);
    }
    snowGeo.attributes.color.needsUpdate = true;
  }

  function dispose() { clear(); haze.removeFromParent(); haze.geometry.dispose(); haze.material.map.dispose(); haze.material.dispose(); lamp.removeFromParent(); snow.removeFromParent(); snowGeo.dispose(); snowMat.map.dispose(); snowMat.dispose(); }
  return { apply, update, dispose, clear, get current() { return E; }, get floorY() { return floor ? floor.userData.y : null; },
    /** Height of the sea floor at (x, z), or null when this water has none. */
    ground: (x, z) => heightAt ? heightAt(x, z) : null, pieces: () => ({ dome, surface, floor, shadow, snow, water: water?.root || null, shafts: shafts?.root || null }) };
}
