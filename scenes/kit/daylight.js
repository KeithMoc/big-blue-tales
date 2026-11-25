// Time of day for a story: one table, one light. A time of day is not a sky colour. It is one light that has to be
// carried through everything in the picture (KM, 2026-11-24): the sky and where the sun or moon stands in it, the sea
// seen from the air, the water's colours just under the surface and further down, the shafts, and the tint and the
// mirror sides of every animal. Each row of TIMES fills in all of those, so a new time of day is one row here and
// nothing anywhere else. createDaylight() holds the row that shows now and moves smoothly to another one.
// The colours are looks, not measurements. What a time of day says about an animal belongs to the story's own words
// and sources (scene.json), never to this file. No shader code here. Licence: MIT.

/**
 * sun      direction to the sun (at night: the moon), any length. Its height is what makes a day, a dawn or a dusk.
 * sky      top = overhead, mid = low sky, glow = the band along the horizon toward the sun, sun = the disc and its
 *          light on things in the air, sea = the sea's own colour seen from the air
 * stars    0 = none, 1 = a night sky
 * down     the water well below the surface: top (looking up), level (level with the eye), deep (looking down),
 *          glow (around the place the light comes through)
 * shallow  the same four just under the surface, where a low sun colours the water and a high one only brightens it
 * reach    units of depth over which `shallow` fades into `down`
 * haze     how wide the glow around the sun's place spreads under water (1 = a high sun, less for a low one)
 * light    the sun's colour once it is in the water: the shafts, and the warm side of an animal near the surface
 * warm     how much of that light an animal near the surface shows (0 to 1)
 * shafts   how strong the shafts of light are
 * animalTop, animalDeep   what the water does to an animal's own colours just under the surface and well below
 * mirrorTop, mirrorDown   what a mirror-sided fish shows in its flanks there
 * bright, wash   the colour the sky is washed with when seen from below through the surface, and how much
 */
export const TIMES = {
  sunrise: {
    sun: [0.55, 0.13, -0.83],
    sky: { top: '#3b5f9e', mid: '#f2bba6', glow: '#ff9d78', sun: '#ffe2c2', sea: '#123f62' }, stars: 0,
    down: { top: '#3a7fa2', level: '#0e4468', deep: '#03142a', glow: '#f6d2b8' },
    shallow: { top: '#a892ac', level: '#69709a', deep: '#1a2850', glow: '#ffd6b0' }, reach: 5, haze: 0.5,
    light: '#ffd9b0', warm: 0.9, shafts: 0.2,
    animalTop: [1.2, 0.92, 0.8], animalDeep: [0.62, 0.76, 0.94], mirrorTop: '#e6b09c', mirrorDown: '#2f80ae',
    bright: '#d2b2c0', wash: 0.55,
  },
  day: {
    sun: [-0.22, 0.82, -0.52],
    sky: { top: '#2a74cc', mid: '#a7d6f1', glow: '#e4f2fb', sun: '#fff4dc', sea: '#0b4a78' }, stars: 0,
    down: { top: '#63c8ea', level: '#0d5a8e', deep: '#021a33', glow: '#d9f6ff' },
    shallow: { top: '#8cdaf1', level: '#1976ab', deep: '#062f58', glow: '#e8fbff' }, reach: 6, haze: 1,
    light: '#eaf8ff', warm: 0.3, shafts: 0.2,
    animalTop: [1.05, 1.05, 1.02], animalDeep: [0.7, 0.86, 1.0], mirrorTop: '#7fd0ee', mirrorDown: '#2f8fc4',
    bright: '#63c8ea', wash: 0.4,
  },
  // the evening the anchovy story was first given (KM approved this look, 2026-11-24)
  sunset: {
    sun: [-0.3, 0.15, -0.94],
    sky: { top: '#27447e', mid: '#e9a57c', glow: '#ff8a4a', sun: '#ffd2a0', sea: '#0c3a5c' }, stars: 0,
    down: { top: '#2f6f96', level: '#0b3a60', deep: '#020f22', glow: '#f3c79a' },
    shallow: { top: '#9480a8', level: '#5b5d8a', deep: '#161f45', glow: '#ffc890' }, reach: 5, haze: 0.45,
    light: '#ffcf94', warm: 1, shafts: 0.22,
    animalTop: [1.25, 0.86, 0.7], animalDeep: [0.6, 0.72, 0.92], mirrorTop: '#e0a084', mirrorDown: '#2a79a8',
    bright: '#c9a6bd', wash: 0.6,
  },
  // a clear night with a moon: the "sun" is the moon, pale and cool, and the water keeps only a little blue
  night: {
    sun: [-0.24, 0.5, -0.83],
    sky: { top: '#040918', mid: '#0e1a36', glow: '#1b2a4c', sun: '#93a6cc', sea: '#040d1c' }, stars: 1,
    down: { top: '#0c2846', level: '#041428', deep: '#00040c', glow: '#6f8cba' },
    shallow: { top: '#15345a', level: '#07203c', deep: '#010814', glow: '#93acd4' }, reach: 6, haze: 0.4,
    light: '#b8cdf0', warm: 0.3, shafts: 0.06,
    animalTop: [0.36, 0.44, 0.62], animalDeep: [0.2, 0.27, 0.42], mirrorTop: '#27507c', mirrorDown: '#0c2c4c',
    bright: '#30507c', wash: 0.5,
  },
};

const COLOURS = ['light', 'mirrorTop', 'mirrorDown', 'bright'], GROUPS = { sky: ['top', 'mid', 'glow', 'sun', 'sea'], down: ['top', 'level', 'deep', 'glow'], shallow: ['top', 'level', 'deep', 'glow'] };
const NUMBERS = ['stars', 'reach', 'haze', 'warm', 'shafts', 'wash'], TRIPLES = ['animalTop', 'animalDeep'];

/**
 * The light that shows now. `now` has the shape of a row of TIMES with every colour a THREE.Color and `sun` a unit
 * Vector3; read it, do not keep copies. set(id, seconds) moves to another time of day; update(dt) returns true on
 * every frame the light changed (and once after it is made), so whoever wears it knows when to repaint.
 */
export function createDaylight(THREE, start = 'day', table = TIMES) {
  const row = (id) => table[id] || table.day || Object.values(table)[0];
  const blank = () => {
    const o = { sun: new THREE.Vector3() };
    for (const k of COLOURS) o[k] = new THREE.Color();
    for (const [g, names] of Object.entries(GROUPS)) { o[g] = {}; for (const n of names) o[g][n] = new THREE.Color(); }
    for (const k of TRIPLES) o[k] = new THREE.Color();
    for (const k of NUMBERS) o[k] = 0;
    return o;
  };
  const fill = (o, r) => {
    o.sun.set(...r.sun).normalize();
    for (const k of COLOURS) o[k].set(r[k]);
    for (const [g, names] of Object.entries(GROUPS)) for (const n of names) o[g][n].set(r[g][n]);
    for (const k of TRIPLES) o[k].setRGB(...r[k]);          // multipliers, not colours to be seen: kept as plain numbers
    for (const k of NUMBERS) o[k] = r[k];
    return o;
  };
  const mix = (o, a, b, k) => {
    o.sun.copy(a.sun).lerp(b.sun, k).normalize();
    for (const c of [...COLOURS, ...TRIPLES]) o[c].copy(a[c]).lerp(b[c], k);
    for (const [g, names] of Object.entries(GROUPS)) for (const n of names) o[g][n].copy(a[g][n]).lerp(b[g][n], k);
    for (const n of NUMBERS) o[n] = a[n] + (b[n] - a[n]) * k;
  };
  let time = table[start] ? start : Object.keys(table)[0];
  const now = fill(blank(), row(time)), from = blank(), to = blank();
  let left = 0, span = 1, fresh = true;
  return {
    now, times: Object.keys(table),
    get time() { return time; },
    /** True while the light is on its way from one time of day to another. */
    get moving() { return left > 0; },
    /** Go to another time of day over `seconds` (0 = at once). An unknown id is ignored. */
    set(id, seconds = 3) {
      if (!table[id] || id === time) return false;
      time = id; fill(to, row(id));
      if (seconds > 0) { mix(from, now, now, 0); left = span = seconds; } else { fill(now, row(id)); left = 0; }
      fresh = true; return true;
    },
    update(dt) {
      if (left > 0) {
        left = Math.max(0, left - dt);
        const k = 1 - left / span; mix(now, from, to, k * k * (3 - 2 * k));
        return true;
      }
      if (fresh) { fresh = false; return true; }
      return false;
    },
  };
}

/** The sun as it is seen from under the water. Light bends as it enters the sea (Snell's law, water 1.33), so even a
 *  sun on the horizon comes down steeply: this is where the bright patch is overhead, and the way the shafts lean. */
export function underwaterSun(sun, out) {
  const l = Math.hypot(sun.x, sun.y, sun.z) || 1, flatIn = Math.hypot(sun.x, sun.z) || 1e-6, flat = flatIn / l / 1.33, k = flat / flatIn;
  return out.set(sun.x * k, Math.sqrt(Math.max(0, 1 - flat * flat)), sun.z * k);
}
