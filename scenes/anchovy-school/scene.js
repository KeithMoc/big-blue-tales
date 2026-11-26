// A school of northern anchovies: swim together, turn in a ring, squeeze into a ball, and give way to a sea lion.
// The school itself is scenes/kit/school.js and the sea is scenes/kit/place.js; this file is the story:
//   near school  - the fish that are steered, with painted bodies and mirror sides that flash in the sun
//   far schools  - more anchovies in the haze, turning slowly around the middle (no cost to the CPU)
//   the sea      - open water, the surface overhead, the sky above it and the light of one time of day, all from the
//                  story kit (createSeaPlace). The story opens in the bright day; sunrise, sunset and night can be picked.
//                  At night the school swims spread out: that is sourced (scene.json, "times"). The colours are a look.
//   room         - the school has a home (the middle of its loop, ring or ball) that can be anywhere in AREA. While
//                  the fish swim together the home drifts slowly, and in Play a drawn line leads it somewhere new.
//                  The camera, the shafts and the far schools come along; the water dims a little on the way down.
//   the sea lion - in the last part a California sea lion (its own pack in animals/sea-lion/, as a guest) comes in level and a little
//                  deeper than the school, loops up through it and swims on: the "loop attack" filmed off Mexico
//                  (scene.json, source "loop"). No fish is caught in the picture. The way the fish give way is the
//                  school's own rule for anything big; how a school answers a loop from below has had little study.
//   splash       - in Play a line drawn up to the surface sends the school leaping out and back in, with drops and
//                  bubbles where fish cross the surface and a splash to hear. The leap is pretend, and the page says so.
// Licence: MIT.
import { createSchool } from '../kit/school.js';
import { createFarSchools } from '../kit/far-school.js';
import { createTrail } from '../kit/trail.js';
import { createSeaPlace } from '../kit/place.js';
import { createSplash } from '../kit/splash.js';
import { wearWater } from '../kit/guest.js';
import { pick } from '../kit/glsl.js';

// near fish, triangles each (detail), far fish. The sea's own table (surface grid, waves, clouds, shafts) is SEA in
// scenes/kit/place.js.
const LOOK = {
  // grow: how many times the school for "a school", "a big school", "a huge school". room: the most triangles the
  // near and far fish and a guest may use together on this tier; far fish give way as the near school grows, and
  // again while the sea lion is in the picture.
  // guest: how fine the sea lion's skin is (1 = the pack's full detail). splash: points for drops and bubbles.
  // watch: every n-th fish is watched for crossing the surface.
  high: { fish: 1350, detail: 2, far: 2500, ripples: true, grow: [1, 1.5, 2], room: 394000, guest: 0.8, splash: 192, watch: 6 },      // 182,250 + 87,500 fish, + 51,200 sea (this story's own budget on high: scene.json)
  mid: { fish: 900, detail: 1, far: 700, ripples: true, grow: [1, 1.4, 1.75], room: 108500, guest: 0.4, splash: 128, watch: 8 },       // 56,700 + 24,500, + 5,408
  low: { fish: 500, detail: 0, far: 250, ripples: false, grow: [1, 1.4, 1.8], room: 54000, guest: 0.35, splash: 64, watch: 10 },        // 17,500 + 8,750, + 2,592 (far fish are always 35 triangles)
};
// How many fish: the school as it opens, then one and a half times and twice as many. The far schools thin out
// when the near one grows, so the picture stays inside the budget for a story.
const SIZES = { school: 0, big: 1, huge: 2 };
// Play colours (pretend: real anchovies are silver). Each gives fish i of n a colour.
const PLAY = {
  rainbow: () => (i, n, c) => c.setHSL((i * 0.61803) % 1, 0.9, 0.56),
  // two colours that go together, a new pair on every press (the pairs come round in a fixed order: nothing here is random)
  surprise: (turn) => { const a = (turn * 0.3819) % 1, b = (a + 0.18 + 0.5 * ((turn * 0.7548) % 1)) % 1; return (i, n, c) => c.setHSL(((i % 3 ? a : b) + 0.03 * Math.sin(i) + 1) % 1, 0.92, 0.56); },
};
const PARTS = [['travel', 12], ['ring', 12], ['ball', 10], ['poke', 14]];
// Where the school may swim, in the scene's units. One unit is 0.75 m: a fish is 0.2 long (a 15 cm anchovy) and the sea
// lion's pack is 3 long (a 2.25 m male), so the two are the right size next to each other. SURFACE is the sea surface
// at rest. The school's home stops two units under it, so the eye stays in the water unless the fish leap.
const SURFACE = 9, AREA = { half: 24, top: 7, bottom: -12 };
// The time of day the story opens at (bright day first, for ages 5 to 7: the maintainer, 2026-11-26; it was the
// evening before), and the one at which the school is loose.
const OPENS = 'day', LOOSE_AT = 'night';
// Play, pretend: how long the school keeps leaping, how far the leap reaches along the water and how high and deep it goes
const LEAP = { seconds: 14, along: 2.6, up: 1.5, down: 2.6 };
// The sea lion's visit (source "loop" in scene.json: it comes in on a level, straight line 0.5 to 1 m deeper than the
// school, then turns its head up and loops through it). under = how far below the middle of the school it comes in
// (the school is about half a unit thick, so 1.4 is 0.7 m under its underside); radius = of the loop; from = how far off it
// is first seen, in the haze; speeds in units a second: 3.0 m/s on the way in and out and 3.3 m/s round the loop, inside
// the 2.7 to 3.5 m/s measured for swimming California sea lions (scene.json "lion-speed"). clap = how long the quick
// clap-like stroke under the school lasts, in seconds (source "loop").
// Not sourced, and our choice: the side it comes from, the size of the loop, and that it swims on afterwards.
const VISIT = { wait: 0.8, under: 1.4, radius: 1.7, from: 24, speed: 4.0, loop: 4.4, reach: 1.3, veil: 1.4, clap: 1.2 };
// The slow drift of a school that swims together: a wide, flat figure it takes about nine minutes to go round, at most
// a quarter of a fish's own speed. It stays in the upper water (anchovies school near the surface, NOAA).
const DRIFT = (s, out) => out.set(13 * Math.sin(s * 0.012), 1.2 * Math.sin(s * 0.017), 8 * Math.sin(s * 0.019));

export async function create(ctx) {
  const { THREE, tier } = ctx, L = pick(tier, LOOK);
  const root = new THREE.Group();
  const school = createSchool({ THREE, count: L.fish, max: Math.round(L.fish * L.grow[2]), detail: L.detail, caustics: L.ripples, stagger: tier === 'high' ? 1 : 2 });
  const far = createFarSchools({ THREE, count: L.far });
  // the sea, its surface, its sky and its light: one piece from the story kit. Everything that swims wears its light.
  const sea = createSeaPlace({ THREE, tier, time: OPENS, surface: SURFACE });
  sea.wear(school.look); sea.wear(far.look);
  const splash = createSplash(THREE, { max: L.splash });
  root.add(sea.root, far.root, school.root, splash.root);
  // the sea lion: its own pack (animals/sea-lion/) as a guest, in the story's light, out of the picture until the last part
  const lion = await ctx.mount('sea-lion', { lod: L.guest }), lionLook = sea.wear(wearWater(THREE, lion.root));
  lion.root.visible = false; root.add(lion.root);
  const visit = { on: false, t: 0, phase: 0, turn: 0, at: new THREE.Vector3(), way: new THREE.Vector3(1, 0, 0), foot: new THREE.Vector3(), nose: new THREE.Vector3(), tan: new THREE.Vector3(), up: new THREE.Vector3(), side: new THREE.Vector3(), m: new THREE.Matrix4() };
  const UP = new THREE.Vector3(0, 1, 0), buffer = new THREE.Vector2(), dropLight = new THREE.Color();
  let wet = 0, heard = 0, loose = 0, farShown = L.far, splashes = 0;
  school.watch(SURFACE, (x, z, vy, vx, vz) => { splash.burst(x, sea.heightAt(x, z), z, vy, vx, vz); wet++; splashes++; }, L.watch);
  // Play: the line a visitor draws in the water (scenes/kit/trail.js: dots, a line or sparkles; one draw call)
  const STAY = 25, trail = createTrail({ THREE, max: 160 }), line = trail.points; root.add(trail.root);
  const plane = new THREE.Plane(), ray = new THREE.Ray(), hit = new THREE.Vector3();
  let drawing = false, linger = 0, leaping = false;
  const arc = Array.from({ length: 41 }, () => new THREE.Vector3()), along = new THREE.Vector3();
  // led = where Play has led the school's home (0 = where the story opens); roam = the clock of the slow drift
  const led = new THREE.Vector3(), drift = new THREE.Vector3(), home = new THREE.Vector3(), farAt = new THREE.Vector3(); let roam = 0;
  const inArea = (v) => { v.x = Math.max(-AREA.half, Math.min(AREA.half, v.x)); v.y = Math.max(AREA.bottom, Math.min(AREA.top, v.y)); v.z = Math.max(-AREA.half, Math.min(AREA.half, v.z)); return v; };
  /** The school stays where a line took it: at the end of an open line, in the middle of a closed shape. */
  function settle(at) { led.copy(inArea(at)).sub(DRIFT(roam, drift)); }
  function wipe(stay = true) {
    if (stay && school.tracing) {
      if (linger <= 0 && !drawing && line.length > 1) {
        const a = line[0], b = line[line.length - 1];
        if (a.distanceTo(b) < 0.45) { hit.set(0, 0, 0); for (const q of line) hit.add(q); settle(hit.divideScalar(line.length)); } else settle(hit.copy(b));
      } else settle(school.centre(hit));
    }
    trail.clear(); drawing = false; linger = 0; leaping = false; school.trace(null);
  }
  /** Play, pretend: the school goes round an upright loop that pokes out of the water, so fish keep leaping out and
   *  diving back in. at = where the drawn line met the surface, way = the way the line was going. */
  function leap(at, way) {
    along.set(way.x, 0, way.z); if (along.lengthSq() < 1e-4) along.set(1, 0, 0); along.normalize();
    const mid = SURFACE + (LEAP.up - LEAP.down) / 2, tall = (LEAP.up + LEAP.down) / 2;
    for (let k = 0; k < arc.length; k++) { const a = k / (arc.length - 1) * 6.2832; arc[k].set(at.x - along.x * LEAP.along * Math.cos(a), mid + tall * Math.sin(a), at.z - along.z * LEAP.along * Math.cos(a)); }
    if (school.trace(arc)) { leaping = true; linger = LEAP.seconds; }
  }

  const centre = new THREE.Vector3(), heading = new THREE.Vector3(), eye = new THREE.Vector3();
  let part = 0, clock = 0, told = '', came = false, size = 'school', colours = 'real', turn = 0;
  const tris = [35, 63, 135][L.detail], thinks = tier === 'high' ? 1 : 2;
  function go(i) { wipe(); part = i; clock = 0; came = false; endVisit(); school.setMode(PARTS[i][0] === 'poke' ? 'travel' : PARTS[i][0]); }
  const fishRoom = () => L.room - (visit.on ? lion.stats.triangles : 0);
  const farWanted = () => Math.min(L.far, Math.max(0, Math.floor((fishRoom() - school.count * tris) / 35)));
  function endVisit() { visit.on = false; visit.phase = 0; lion.root.visible = false; }
  /** The sea lion sets off: from far ahead of the school, level, a little deeper than the fish. */
  function startVisit() {
    school.centre(centre); school.heading(heading);
    // our choice: it crosses the picture from one side to the other, so its loop is seen from the side and it never comes
    // between the eye and the school; of the two ways across, the one that meets the school more head on
    visit.way.set(centre.z - sea.eye.z, 0, sea.eye.x - centre.x);
    if (visit.way.lengthSq() < 1e-4) visit.way.set(1, 0, 0);
    visit.way.normalize(); if (visit.way.dot(heading) > 0) visit.way.negate();
    visit.at.copy(centre).addScaledVector(visit.way, -VISIT.from); visit.at.y = Math.min(centre.y - VISIT.under, SURFACE - 0.6 - 2 * VISIT.radius);
    visit.on = true; visit.phase = 1; visit.t = 0; visit.turn = 0;
    far.setCount(farShown = Math.min(farShown, farWanted()));         // room for the guest before it is drawn
    lion.root.visible = true;
  }
  /** One frame of the visit. Phase 1: in on a level line toward the point under the school. 2: the loop, head up first,
   *  back toward the middle of the loop, so its chest faces the surface at the top. 3: on and away, level. */
  function moveVisit(t, dt) {
    const V = visit; V.t += dt;
    V.up.copy(UP); V.tan.copy(V.way);
    if (V.phase === 1) {
      school.centre(centre);
      const dx = centre.x - V.at.x, dz = centre.z - V.at.z, ahead = dx * V.way.x + dz * V.way.z, off = dz * V.way.x - dx * V.way.z;
      V.at.addScaledVector(V.way, VISIT.speed * dt);
      // it holds its line; a school that has drifted a little to one side is met by a small, slow correction
      V.at.x += -V.way.z * off * Math.min(1, 1.2 * dt); V.at.z += V.way.x * off * Math.min(1, 1.2 * dt);
      // the loop begins a little before the middle of the school, so the way up goes through the middle
      if (ahead <= VISIT.radius * 0.9) { V.phase = 2; V.turn = 0; V.foot.copy(V.at); }
    } else if (V.phase === 2) {
      V.turn += VISIT.loop / VISIT.radius * dt;
      const a = Math.min(V.turn, 6.2832), sn = Math.sin(a), cs = Math.cos(a);
      V.at.copy(V.foot).addScaledVector(V.way, VISIT.radius * sn).addScaledVector(UP, VISIT.radius * (1 - cs));
      V.tan.copy(V.way).multiplyScalar(cs).addScaledVector(UP, sn);
      V.up.copy(UP).multiplyScalar(cs).addScaledVector(V.way, -sn);
      if (V.turn >= 6.2832) { V.phase = 3; V.t = 0; V.at.copy(V.foot); }
    } else {
      V.at.addScaledVector(V.way, VISIT.speed * dt);
      if (V.t > VISIT.from / VISIT.speed) { endVisit(); return; }
    }
    // the pack's head is at +x and its back at +y
    V.side.crossVectors(V.tan, V.up).normalize();
    lion.root.setRotationFromMatrix(V.m.makeBasis(V.tan, V.up, V.side)); lion.root.position.copy(V.at);
    lion.update(t, dt, { swim: 1, clap: V.phase === 2 && V.turn * VISIT.radius / VISIT.loop < VISIT.clap ? 1 : 0 });
    // it comes out of the haze and goes back into it
    lionLook.uVeil.value = V.phase === 1 ? 1 - Math.min(1, V.t / VISIT.veil) : V.phase === 3 ? Math.max(0, Math.min(1, (V.t - (VISIT.from / VISIT.speed - VISIT.veil)) / VISIT.veil)) : 0;
    // the fish near it give way (the school's own rule for something big)
    V.nose.copy(V.at).addScaledVector(V.tan, 1.2);
    if (V.nose.distanceToSquared(school.centre(centre)) < 36) school.poke(V.nose, V.tan, VISIT.reach);
  }

  function update(t, dt) {
    // a drawn line holds the story still: the fish swim along it until it fades, then the story carries on
    if (school.tracing || drawing) {
      if (!drawing && (linger -= dt) <= 0) { wipe(); school.setMode(PARTS[part][0] === 'poke' ? 'travel' : PARTS[part][0]); }
      trail.update(t, drawing, drawing ? 1 : linger / 3);          // the finished line goes away over its last three seconds
    } else clock += dt;
    if (clock > PARTS[part][1]) go((part + 1) % PARTS.length);
    const name = PARTS[part][0];
    // the home of the school: led there in Play, plus the slow drift while the fish swim together
    if (!school.tracing && !drawing && (name === 'travel' || name === 'poke')) roam += dt;
    inArea(home.copy(led).add(DRIFT(roam, drift))); school.setHome(home.x, home.y, home.z);
    if (name !== told) { told = name; ctx.beat(name); }
    school.update(t, dt);
    school.look.uTime.value = t;
    far.update(t);
    // the last part: the sea lion comes once, a moment after the part begins
    if (name === 'poke' && !came && clock > VISIT.wait && !school.tracing && !drawing) { startVisit(); came = true; }
    if (visit.on) moveVisit(t, dt);
    // the far schools give way to a bigger near school and to the guest, a few at a time, and come back the same way
    const want = farWanted();
    if (want !== farShown) { const step = Math.max(1, Math.ceil(L.far * 0.5 * dt)); far.setCount(farShown = want < farShown ? Math.max(want, farShown - step) : Math.min(want, farShown + step)); }
    // at night a school that swims together is spread out (scene.json, "times"); the ring and the ball keep their shape
    const wantLoose = sea.time === LOOSE_AT && (name === 'travel' || name === 'poke') && !school.tracing ? 1 : 0;
    loose += (wantLoose - loose) * Math.min(1, 0.5 * dt); school.setLoose(loose);
    // the place comes along: the sea stays around the school, far schools catch up slowly (so they pass by on the
    // way), and the water is brighter near the top of the area and dimmer near its bottom
    school.centre(centre);
    const deep = centre.y > 0 ? centre.y / AREA.top : -centre.y / AREA.bottom;
    sea.update(t, dt, centre, deep);
    farAt.copy(centre).multiplyScalar(0.92); farAt.y = Math.min(farAt.y, SURFACE - 5);
    far.root.position.lerp(farAt, 1 - Math.exp(-0.22 * dt));
    // drops and bubbles where fish crossed the surface this frame, in the light of the sky, and a splash to hear
    const D = sea.light.now;
    splash.setLight(dropLight.copy(D.sky.sun).lerp(D.sky.mid, 0.3), D.bright);
    splash.update(t, dt, ctx.renderer.getDrawingBufferSize(buffer).y);
    heard = Math.max(0, heard - dt);
    if (wet > 0 && heard === 0) { ctx.cue?.('story-splash'); heard = 1.1; }
    wet = 0;
  }

  return {
    root, update,
    beats: Object.fromEntries(PARTS.map(([id], i) => [id, () => go(i)])),
    bodies: () => (visit.on ? [{ position: school.centre(centre), reach: 2 }, { position: lion.root.position, reach: lion.reach }] : [{ position: school.centre(centre), reach: 2 }]),
    /** School sizes a visitor can pick, and the one showing. */
    sizes: Object.keys(SIZES),
    get size() { return size; },
    setSize(id) {
      if (!SIZES[id]) return;
      size = id;
      const n = Math.round(L.fish * L.grow[SIZES[id]]);
      school.setCount(n, thinks + (SIZES[id] ? 1 : 0));           // a bigger school thinks a little less often, and looks the same
      far.setCount(farShown = farWanted());
    },
    /** Times of day a visitor can pick, and the one showing. The whole picture moves there over a few seconds. */
    times: sea.times,
    get time() { return sea.time; },
    setTime(id, seconds) { return sea.setTime(id, seconds); },
    /** A name tag for the sea lion while it is in the picture. */
    labels: () => (visit.on && lionLook.uVeil.value < 0.6 ? [{ id: 'sea-lion', at: lion.root.position, lift: 0.7, when: 'poke' }] : []),
    /** Play colours: 'real' (the default, and the only true one) or a pretend set. */
    colours: ['real', ...Object.keys(PLAY)],
    get colour() { return colours; },
    setColours(id) { colours = PLAY[id] ? id : 'real'; school.paint(PLAY[id] ? PLAY[id](++turn) : null); },
    /** A tap in the water: the fish near that line move out of its way, as they do in the last part of the story. */
    touch(origin, direction) {
      school.centre(centre);
      const along = Math.max(0.5, centre.sub(origin).dot(direction));
      centre.copy(origin).addScaledVector(direction, along - 0.9);
      school.poke(centre, direction);
    },
    /** Play: how the drawn line looks. */
    trails: trail.styles,
    get trail() { return trail.style; },
    setTrail(id) { trail.setStyle(id); },
    /** Play: draw a line in the water and the school swims along it. phase = 'start' | 'move' | 'end' | 'clear';
     *  origin and direction are the ray under the finger. The line lies flat to the eye, through the school. */
    draw(phase, origin, direction) {
      if (phase === 'clear') { if (school.tracing || drawing) { wipe(); school.setMode(PARTS[part][0] === 'poke' ? 'travel' : PARTS[part][0]); } return; }
      if (phase === 'end') {
        drawing = false; linger = STAY;
        if (!school.tracing) { wipe(); return; }
        // a line led up to the surface: the fish leap out and dip back in (pretend)
        const n = line.length, end = line[n - 1];
        if (end.y > SURFACE - 1.1) leap(end, hit.copy(end).sub(line[Math.max(0, n - 6)]));
        return;
      }
      if (phase === 'start') { wipe(); drawing = true; plane.setFromNormalAndCoplanarPoint(direction, school.centre(centre)); }
      if (!drawing || line.length >= trail.max) return;
      ray.origin.copy(origin); ray.direction.copy(direction);
      if (!ray.intersectPlane(plane, hit)) return;
      const up = hit.y; inArea(hit); hit.y = Math.max(hit.y, Math.min(up, SURFACE - 0.3));   // the line stops at the edge of the swim area, and at the surface
      const last = line[line.length - 1];
      if (last && last.distanceTo(hit) < 0.11) return;
      trail.add(hit.clone());
      school.trace(line);
    },
    /** The point the camera keeps in the middle of the picture: the middle of the near school. */
    follow: () => {
      school.centre(eye); if (leaping) eye.y = SURFACE + 1.3;
      // while the sea lion is close, the view leans a little toward it, so its loop stays in the picture. Only a little:
      // a view that follows the sea lion keeps it the same size on the screen while the fish slide past
      if (visit.on) { const d = lion.root.position.distanceTo(eye); if (d < 7) eye.lerp(lion.root.position, 0.2 * Math.min(1, (7 - d) / 3)); }
      return eye;
    },
    /** Once a frame the runner hands over the camera's place; the sea keeps it out of the waterline. While the fish leap,
     *  the eye settles level with them just over the water, so the far sea, the sky and the sun are in the picture. */
    clear(p) { sea.keepEye(p, leaping ? SURFACE + 1.2 : null); },
    /** True while the eye is in the air. */
    dry: () => sea.dry(),
    surface: SURFACE,
    /** Back to start: the school's home goes back to where the story opens, and the fish swim there. */
    rehome() { if (school.tracing || drawing) { wipe(false); school.setMode(PARTS[part][0] === 'poke' ? 'travel' : PARTS[part][0]); } led.set(0, 0, 0); roam = 0; },
    /** The swim area and where the school's home is in it (for tests and the page). */
    area: AREA,
    stats: () => ({ leaping, above: +sea.above.toFixed(2), time: sea.time, loose: +loose.toFixed(2), guest: visit.on ? visit.phase : 0, splashes, home: home.toArray().map(v => +v.toFixed(2)), fish: school.count, farFish: far.shown, size, colours, tracing: school.tracing, trail: trail.style }),
    // the sea lion is the runner's to free: it mounted it
    dispose() { school.watch(0, null); school.dispose(); far.dispose(); sea.dispose(); splash.dispose(); trail.dispose(); },
  };
}
