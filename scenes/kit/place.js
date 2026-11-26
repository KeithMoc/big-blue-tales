// A sea for a story: the open water, the sea surface, the sky above it, the shafts of light and the time of day, as
// one piece. A story names the place the way an animal names an environment preset, and gets back one object:
//
//   const sea = createSeaPlace({ THREE, tier, time: 'sunset' });     root.add(sea.root);
//   sea.wear(school.look);                    // anything with a fish look or a guest look is lit by this sea
//   sea.update(t, dt, focus, deep);           // once a frame: focus = what the story is about, deep = -1..1 in its area
//   sea.keepEye(cameraPosition);              // once a frame, from the scene's clear(): keeps the eye off the waterline
//   sea.setTime('night');                     // the whole picture moves to another row of scenes/kit/daylight.js
//
// What it is made of (each is its own kit file and can be used alone): water.js (the backdrop, one draw call),
// surface.js (the sea surface, one), shafts.js (one), sky.js (shader text, no call of its own). 3 draw calls in all,
// and the triangles of the surface grid: 2,592 on low, 5,408 on mid, 51,200 on high.
// It knows nothing about any animal: no school, no hunter, no words. No shader code here. Licence: MIT.
import { createWater } from './water.js';
import { createSurface } from './surface.js';
import { createShafts } from './shafts.js';
import { skyUniforms } from './sky.js';
import { createDaylight, underwaterSun, TIMES } from './daylight.js';
import { pick } from './glsl.js';

// What each device tier gets. sea = grid cells a side of the surface (2 x sea x sea triangles), waves = how many it
// carries, clouds / fine / stars = in the sky or not, shafts = how many.
export const SEA = {
  high: { sea: 160, waves: 5, clouds: true, fine: true, stars: true, shafts: 16 },
  mid: { sea: 52, waves: 4, clouds: true, fine: false, stars: true, shafts: 9 },
  low: { sea: 36, waves: 3, clouds: false, fine: false, stars: false, shafts: 7 },
};

/**
 * tier = ctx.tier. time = a row of the times table (default: scenes/kit/daylight.js TIMES). surface = the height of the
 * sea surface at rest. look = overrides for this tier's row of SEA. times = a story's own table, when it needs one.
 */
export function createSeaPlace({ THREE, tier, time = 'day', surface = 9, look = {}, times = TIMES }) {
  const L = { ...pick(tier, SEA), ...look };
  const light = createDaylight(THREE, time, times), D = light.now;
  const sky = skyUniforms(THREE, { clouds: L.clouds, fine: L.fine, stars: L.stars });
  const water = createWater(THREE, { sky, shallow: { top: '#000', level: '#000', deep: '#000', glow: '#000' } });
  const sea = createSurface(THREE, { sky, y: surface, cells: L.sea, waves: L.waves, fine: L.fine });
  const TOP = 10;                                                    // a shaft is this tall above its middle
  const shafts = createShafts(THREE, { count: L.shafts, top: TOP, bottom: -8, near: 4.5, far: 11, back: -3, wrap: 18, lean: [0, 0] });
  const root = new THREE.Group(); root.add(water.root, shafts.root, sea.root);

  const looks = new Set(), eye = new THREE.Vector3(0, 0, 6), at = new THREE.Vector3(), sun = new THREE.Vector3(), mirror = new THREE.Color();
  let above = 0, warm = 0, now = 0;
  /** The time of day, carried into everything: called on each frame the light changed. */
  function paint() {
    const U = sky.uniforms;
    U.uSkySun.value.copy(D.sun); U.uSkyTop.value.copy(D.sky.top); U.uSkyMid.value.copy(D.sky.mid); U.uSkyGlow.value.copy(D.sky.glow);
    U.uSkySunCol.value.copy(D.sky.sun); U.uSea.value.copy(D.sky.sea); U.uSkyStars.value = D.stars;
    underwaterSun(D.sun, sun);
    water.setLight({ down: D.down, shallow: D.shallow, sun, haze: D.haze });
    // the shafts lean half as far as the light really does, so they stay in the picture
    shafts.setLight({ colour: D.light, strength: D.shafts, lean: [sun.x / sun.y * (TOP - 1), sun.z / sun.y * (TOP - 1)] });
    sea.setWash(D.bright, D.wash);
    for (const look of looks) dress(look);
  }
  function dress(look) {
    look.uSurf.value = surface; if (look.uHazeOwn) look.uHazeOwn.value = 1;
    look.uTintTop.value.copy(D.animalTop); look.uTintDeep.value.copy(D.animalDeep);
    if (look.uSun) look.uSun.value.copy(sun).normalize();
    if (look.uWarm) look.uWarm.value = D.warm;
    if (look.uAirSun) { look.uAirSun.value.copy(D.sun); look.uAirSunCol.value.copy(D.sky.sun); look.uAirSky.value.copy(D.sky.top).lerp(D.sky.mid, 0.45); }   // the shaded side takes the sky's own colour
  }

  return {
    root, surface, light, sky, times: light.times,
    triangles: sea.triangles,
    get time() { return light.time; },
    /** Another time of day, over a few seconds. Returns false for an unknown one. */
    setTime(id, seconds = 3) { return light.set(id, seconds); },
    /** Light this look with the sea: a fish look (school.look, far.look) or a guest's (scenes/kit/guest.js). */
    wear(look) { looks.add(look); dress(look); return look; },
    unwear(look) { looks.delete(look); },
    /**
     * Once a frame. focus = the point the story is about (the shafts and the fine part of the surface stay around it).
     * deep = where that is in the story's swim area: 1 at its top, -1 at its bottom (the water brightens and dims a little).
     */
    update(t, dt, focus, deep = 0) {
      now = t;
      if (light.update(dt)) paint();
      sea.update(t); sea.moveTo(focus);
      const out = eye.y > sea.heightAt(eye.x, eye.z) ? 1 : 0; above += (out - above) * Math.min(1, 14 * dt);
      at.copy(focus); at.y = Math.min(focus.y, surface - TOP);          // the shafts start at the surface, never above it
      shafts.moveTo(at); shafts.setStrength((1 + 0.35 * Math.max(-1, Math.min(1, deep))) * (1 - above));
      // the sky's light reaches a little way down: how much of it the water shows follows how far under the surface the eye is
      warm = Math.exp(-Math.max(0, surface - eye.y) / D.reach);
      water.setShallow(warm); water.setDepth(deep * 0.5); water.setAbove(above); sea.setEye(above);
      sea.setUnder(water.level);
      mirror.copy(D.mirrorDown).lerp(D.mirrorTop, warm);
      for (const look of looks) { look.uHaze.value.copy(water.level); if (look.uWater) look.uWater.value.copy(mirror); }
      shafts.update(t); water.update(t);
    },
    /**
     * Once a frame the scene hands over the camera's place (from its clear()). It is kept out of the waterline itself
     * (half the picture under water and half above is only a hard edge on a screen) and remembered, so update knows
     * which side the eye is on. settle = a height the eye eases toward while it is in the air (or null).
     */
    keepEye(p, settle = null) {
      const h = sea.heightAt(p.x, p.z), gap = p.y - h;
      // inside the thin band: carry on to the side it was heading for, so the eye can always cross
      if (Math.abs(gap) < 0.14) p.y = h + ((p.y === eye.y ? gap >= 0 : p.y > eye.y) ? 0.14 : -0.14);
      else if (settle != null && gap > 0) p.y += (settle - p.y) * 0.05;
      eye.copy(p);
    },
    /** Height of the water at (x, z) right now. */
    heightAt: (x, z) => sea.heightAt(x, z),
    /** 0 = the eye is under the water, 1 = it is in the air (eased). */
    get above() { return above; },
    /** True while the eye is in the air: the drifting specks of the water are then not drawn (scenes/runner.js). */
    dry: () => above > 0.5,
    /** How much of the sky's light the water shows where the eye is (1 just under the surface, 0 well below). */
    get warm() { return warm; },
    /** The water's colour level with the eye, and the last camera place handed to keepEye. */
    get level() { return water.level; }, eye,
    dispose() { water.dispose(); sea.dispose(); shafts.dispose(); },
  };
}
