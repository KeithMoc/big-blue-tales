// Engine: the one renderer, camera, orbit controls and bloom pipeline the whole site shares.
// There is exactly one WebGL context however many animals a story holds. Views borrow the engine;
// they never create a renderer of their own. Licence: MIT.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Quality steps, best first. The governor walks down this list when frames run slow and never back up
// on its own (so the picture does not pump), but every change of animal gives the top step another try.
//   ratio = cap on device pixel ratio, samples = MSAA samples of the scene buffer, bloom = bloom pass on
const STEPS = [
  { ratio: 1.75, samples: 4, bloom: true },
  { ratio: 1.35, samples: 4, bloom: true },
  { ratio: 1.0, samples: 2, bloom: true },
  { ratio: 0.8, samples: 0, bloom: true },
  { ratio: 0.65, samples: 0, bloom: false },
];
const SLOW_MS = 34, WINDOW = 45;          // step down when the average of 45 frames is worse than about 30 fps
const SETTLED = 3;                        // this many good windows in a row and the step is called settled

export function createEngine(stage, view) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }); } catch { return null; }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.info.autoReset = false;          // counted per frame by hand, so the numbers cover every pass and not only the last
  view.append(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'application'); canvas.tabIndex = 0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  scene.add(camera);
  const controls = new OrbitControls(camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, rotateSpeed: 0.7, zoomSpeed: 0.7 });

  // Which step to start on is the device layer's call (core/device.js); until it says, start at the top.
  let start = 0, step = start, locked = false, lost = false;
  let target = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: STEPS[step].samples });
  let composer, bloom;
  const bloomCfg = { strength: 0.75 };
  // The glow pass is the one place a single bad pixel becomes a black block (it blurs "not a number" over its
  // neighbours). So it can be taken out of the frame three ways: the quality step, a look with no glow
  // (strength 0), and ?glow=off in the address, which is how a device that flickers is checked. docs/THREEJS.md
  const glowOff = new URLSearchParams(location.search).get('glow') === 'off';
  const glowOn = () => STEPS[step].bloom && bloomCfg.strength > 0 && !glowOff;
  function buildComposer() {
    if (composer) { composer.dispose(); bloom.dispose(); }
    target.dispose();
    target = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: STEPS[step].samples });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), bloomCfg.strength, 0.7, 1.0);
    bloom.enabled = glowOn();
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  buildComposer();

  // ---------------- size and lens
  let lens = 1, aspectRef = 1.12;
  const resizers = new Set();
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, STEPS[step].ratio));
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h;
    // In tall, narrow windows the animal must still fit: widen the lens a little (views also pull back).
    lens = Math.sqrt(Math.max(1, aspectRef / camera.aspect));
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * lens));
    camera.updateProjectionMatrix();
    for (const fn of resizers) fn(w, h);
  }
  new ResizeObserver(resize).observe(stage);

  function setStep(n) {
    n = Math.max(0, Math.min(STEPS.length - 1, n));
    if (n === step || lost) return;
    const rebuilt = STEPS[n].samples !== STEPS[step].samples;
    step = n;
    if (rebuilt) buildComposer(); else bloom.enabled = glowOn();
    resize();
  }

  // ---------------- the sea floor: the camera never goes under it
  // A view hands over ground(x, z) -> height of the floor there (or null where there is none). Every frame the
  // lowest angle the camera may orbit to is worked out from it, so that the camera, and the whole line of
  // sight from it to what it looks at, stays CLEAR above the sand (a little more from far away, so the view
  // is never edge-on to the floor). The limit is OrbitControls' own polar clamp: dragging further down just
  // stops, with the usual damping and no shake; flights and the arrow keys go through the same clamp.
  // One way under is left open on purpose: a view that a pack placed under the floor (a ray's mouth is on its
  // underside) is flown to with dive = true. The floor is not drawn from below, and the first touch, key or
  // new flight ends the dive: the camera then comes back up over a moment (RISE) instead of jumping.
  const CLEAR = 0.16, CLEAR_PER_DISTANCE = 0.02, SIGHT_STEPS = 8, RISE = 1.6;   // RISE in radians a second
  let ground = null, polarMax = Math.PI, diving = false;
  const offset = new THREE.Vector3();
  /** Orbit limits of the current view. Views set them here, not on the controls, so the floor limit can sit on top. */
  function setOrbit(o) { Object.assign(controls, o); if (o.maxPolarAngle != null) polarMax = o.maxPolarAngle; }
  function setGround(fn) { ground = fn || null; diving = false; if (!ground) controls.maxPolarAngle = polarMax; }
  /** The lowest height a camera at c may be at, or null where there is no floor. */
  function floorNeed(c = camera.position) {
    if (!ground) return null;
    const g = controls.target, m = CLEAR + CLEAR_PER_DISTANCE * c.distanceTo(g);
    let need = null;
    for (let i = 0; i <= SIGHT_STEPS; i++) {
      const s = i / (SIGHT_STEPS + 2), y = ground(c.x + (g.x - c.x) * s, c.z + (g.z - c.z) * s);
      if (y == null) continue;
      // the sight line at s is at c.y + s (g.y - c.y); it must clear the floor there by m (1 - s)
      const n = (y + m * (1 - s) - s * g.y) / (1 - s);
      if (need == null || n > need) need = n;
    }
    return need;
  }
  // The limit is a property of where the camera could be, not of where it is: for the camera's distance and
  // compass direction, walk down from the top to the first angle that is too low, then close in on the edge.
  // Worked out afresh each frame from nothing but distance and direction, it cannot feed back on itself, so a
  // camera resting on the limit rests still (over dunes too).
  const sph = new THREE.Spherical(), probe = new THREE.Vector3();
  const fits = (phi) => { sph.phi = phi; probe.setFromSpherical(sph).add(controls.target); const n = floorNeed(probe); return n == null || probe.y >= n; };
  function lowestAngle(top, bottom) {
    sph.setFromVector3(offset);
    const COARSE = 24;
    let ok = top, bad = null;
    for (let i = 1; i <= COARSE; i++) { const phi = top + (bottom - top) * i / COARSE; if (fits(phi)) ok = phi; else { bad = phi; break; } }
    if (bad == null) return bottom;
    for (let i = 0; i < 14; i++) { const mid = (ok + bad) / 2; if (fits(mid)) ok = mid; else bad = mid; }
    return ok;
  }
  function guard(dt = 0) {
    let max = polarMax;
    if (diving) max = Math.PI;
    else if (ground) {
      const r = offset.subVectors(camera.position, controls.target).length();
      if (r > 1e-6) {
        const now = Math.acos(THREE.MathUtils.clamp(offset.y / r, -1, 1));
        max = lowestAngle(Math.min(controls.minPolarAngle + 0.02, polarMax), polarMax);
        // already lower than allowed (a dive just ended): rise at a steady pace, do not jump
        if (now > max + 1e-4) max = Math.max(max, now - RISE * dt);
      }
    }
    controls.maxPolarAngle = max;
  }

  // ---------------- camera flights
  let flight = null;
  function flyTo(goal, seconds = 1.1, calm = false, dive = false) {
    diving = !!dive && !!ground;
    if (calm || seconds === 0) { flight = null; camera.position.copy(goal.pos); controls.target.copy(goal.target); guard(1); controls.update(); return; }
    flight = { t: 0, seconds, p0: camera.position.clone(), t0: controls.target.clone(), pos: goal.pos.clone(), target: goal.target.clone() };
  }
  /** Move the camera, its target and any flight under way by the same offset (to follow an animal). */
  function shift(d) {
    camera.position.add(d); controls.target.add(d);
    if (flight) for (const k of ['p0', 'pos', 't0', 'target']) flight[k].add(d);
  }
  canvas.addEventListener('pointerdown', () => { flight = null; diving = false; });
  // keyboard: arrows turn the animal, plus and minus zoom
  canvas.addEventListener('keydown', (e) => {
    const turn = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    const zoom = { '+': 0.88, '=': 0.88, '-': 1.14, '_': 1.14 }[e.key];
    if (!turn && !zoom) return;
    e.preventDefault(); flight = null; diving = false;
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    if (turn) { sph.theta += turn[0] * 0.12; sph.phi = THREE.MathUtils.clamp(sph.phi + turn[1] * 0.12, controls.minPolarAngle, controls.maxPolarAngle); }
    if (zoom) sph.radius = THREE.MathUtils.clamp(sph.radius * zoom, controls.minDistance, controls.maxDistance);
    camera.position.setFromSpherical(sph).add(controls.target);
    guard(0); controls.update();   // a dive that this key ended is eased out by the frame loop
  });

  // ---------------- frame loop
  const clock = new THREE.Clock();
  let tick = null, after = null, running = false, wanted = false;
  let acc = 0, n = 0, avgMs = 0, grace = 0, good = 0;
  const settlers = new Set();
  function frame() {
    const raw = clock.getDelta();
    // Real time, so a slow device drops frames instead of running in slow motion.
    const dt = Math.min(0.25, raw);
    if (tick) tick(dt);
    if (flight) {
      flight.t = Math.min(1, flight.t + dt / flight.seconds);
      const k = flight.t, e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(flight.p0, flight.pos, e);
      controls.target.lerpVectors(flight.t0, flight.target, e);
      if (k >= 1) flight = null;
    }
    guard(dt);
    controls.update();
    renderer.info.reset();
    composer.render(dt);
    if (after) after(dt);
    // the governor: frames that follow a load or a tab switch are not counted
    if (grace > 0) { grace--; return; }
    acc += raw * 1000; n++;
    if (n >= WINDOW) {
      avgMs = acc / n; acc = 0; n = 0;
      if (locked) return;
      if (avgMs > SLOW_MS && step < STEPS.length - 1) { setStep(step + 1); grace = 20; good = 0; }
      else if (++good === SETTLED) for (const fn of settlers) fn(step);   // the step this device can hold
    }
  }
  const apply = () => {
    const on = wanted && !document.hidden && !lost;
    if (on === running) return;
    running = on; clock.getDelta(); grace = 20; acc = 0; n = 0;
    renderer.setAnimationLoop(on ? frame : null);
  };
  document.addEventListener('visibilitychange', apply);

  // ---------------- a lost context (a tablet under memory pressure takes the GPU away without asking)
  // three.js rebuilds its own state when the context comes back; here the loop stops, the buffers of the
  // bloom pipeline are let go and made again, and whoever listens is told: on loss to take its animals
  // out (freeing them while the context is dead is silent), on return to build them again.
  const losers = new Set(), restorers = new Set();
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();                     // without this the browser never gives the context back
    lost = true; flight = null; apply();
    composer.dispose(); bloom.dispose(); target.dispose();
    for (const fn of losers) fn();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    buildComposer(); resize();
    for (const fn of restorers) fn();
    apply();
  });

  resize();
  return {
    THREE, renderer, scene, camera, controls, canvas,
    get lens() { return lens; },
    get flying() { return !!flight; },
    /** true while the camera is at a view a pack placed under the sea floor */
    get diving() { return diving; },
    /** The floor height at (x, z) as the camera sees it, or null. */
    groundAt(x, z) { return ground ? ground(x, z) : null; },
    get composer() { return composer; },
    get lost() { return lost; },
    /** fn() when the GPU context is taken away, and when it is back and animals can be built again */
    onLost(fn) { losers.add(fn); return () => losers.delete(fn); },
    onRestored(fn) { restorers.add(fn); return () => restorers.delete(fn); },
    /** fn(step) once the governor has held one step for a few seconds after a change of scene */
    onSettle(fn) { settlers.add(fn); return () => settlers.delete(fn); },
    /** The step every change of scene starts from (core/device.js decides it). */
    setStart(n) { start = Math.max(0, Math.min(STEPS.length - 1, n)); if (!locked) setStep(start); },
    /** aspect = the window shape the current animal's views were framed for */
    setLens(aspect = 1.12) { aspectRef = aspect; resize(); },
    setLook({ bloom: b, exposure }) { bloomCfg.strength = b; bloom.strength = b; bloom.enabled = glowOn(); renderer.toneMappingExposure = exposure; },
    onResize(fn) { resizers.add(fn); return () => resizers.delete(fn); },
    resize, flyTo, shift, setOrbit,
    /** ground(x, z) -> floor height there or null; the camera is kept above it. null = open water, no limit. */
    setGround,
    /** For tests: how far the camera is above the floor under it, and above the lowest height it is allowed (null = no floor). */
    floorGap() { if (!ground) return null; const y = ground(camera.position.x, camera.position.z), need = floorNeed(); return y == null ? null : { above: camera.position.y - y, spare: camera.position.y - need, clear: CLEAR }; },
    stopFlight() { flight = null; },
    /** tick(dt) runs before the picture is drawn, after(dt) once it has been */
    setLoop(t, a) { tick = t; after = a; },
    run(on) { wanted = on; apply(); },
    /** Give the best quality another try (called when the scene changes). */
    retry() { if (!locked) { setStep(start); grace = 30; acc = 0; n = 0; good = 0; } },
    /** For tests and screenshots: hold one quality step. */
    lock(n) { locked = false; setStep(n); locked = true; },
    /** Draw one frame now, with the clock moved on by dt seconds (tests). */
    renderOnce(dt = 0) { if (lost) return; if (tick) tick(dt); guard(dt); controls.update(); renderer.info.reset(); composer.render(dt); if (after) after(dt); },
    /** Move everything on by dt seconds without drawing (tests of where the camera goes need no picture). */
    stepOnce(dt = 0) { if (lost) return; if (tick) tick(dt); guard(dt); controls.update(); },
    stats() {
      const i = renderer.info;
      return { step, start, ratio: renderer.getPixelRatio(), samples: STEPS[step].samples, bloom: bloom.enabled, avgMs: +avgMs.toFixed(1), fps: avgMs ? Math.round(1000 / avgMs) : 0,
        triangles: i.render.triangles, calls: i.render.calls, geometries: i.memory.geometries, textures: i.memory.textures };
    },
  };
}
