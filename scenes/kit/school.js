// A school of small fish: one instanced mesh (one draw call), steered on the CPU by three local rules
// (keep apart, line up, stay close) plus one "shape" rule per mode. Nothing here knows about the page:
// it takes THREE and numbers, and hands back { root, update, setMode, poke, stats, dispose }, the same
// shape a pack's create(ctx) returns, so it can later sit behind a pack or a habitat. Licence: MIT.
//
// Cost (measured story numbers: docs/knowledge/budgets-and-devices.md): 35 triangles a fish (63 with detail = 1). The tail beat and
// the whole look (paint, mirror sides, sun ripples) are done in the shader; the CPU only writes one matrix
// and one float per fish per frame.

/**
 * Unit fish, nose at +z, tail at -z, one body length long. detail 0 = 4 sides and 4 rings (35 triangles),
 * detail 1 = 6 sides and 5 rings (63 triangles), rounder against the light. detail 2 = 8 sides and 8 rings with a
 * pointed snout, a slim tail stalk and the paired and anal fins (135 triangles), for strong devices. The colours are painted in the
 * fragment shader from where a point sits on the body, so the mesh carries positions and normals only.
 */
export function fishGeometry(THREE, detail = 0) {
  const pos = [], idx = [];
  const v = (x, y, z) => { pos.push(x, y, z); return pos.length / 3 - 1; };
  // stations along the body: [z, half width, half height]. Slender and flat-sided, like an anchovy.
  const ST = detail > 1 ? [[0.45, 0.014, 0.027], [0.37, 0.027, 0.05], [0.25, 0.038, 0.071], [0.09, 0.044, 0.08], [-0.07, 0.042, 0.078], [-0.21, 0.031, 0.059], [-0.31, 0.017, 0.035], [-0.37, 0.008, 0.019]]
    : detail ? [[0.36, 0.027, 0.05], [0.2, 0.041, 0.076], [-0.02, 0.043, 0.08], [-0.22, 0.027, 0.054], [-0.36, 0.009, 0.02]]
    : [[0.31, 0.034, 0.062], [0.06, 0.044, 0.082], [-0.18, 0.030, 0.060], [-0.35, 0.010, 0.022]];
  const S = detail > 1 ? 8 : detail ? 6 : 4, L = ST.length - 1;
  const nose = v(0, -0.008, 0.5);
  const rings = ST.map(([z, w, h]) => Array.from({ length: S }, (_, k) => { const a = k / S * 6.2832; return v(w * Math.sin(a), h * Math.cos(a), z); }));
  const tailRoot = v(0, 0, -0.39);
  for (let k = 0; k < S; k++) {
    const n = (k + 1) % S;
    idx.push(nose, rings[0][n], rings[0][k]);
    for (let r = 0; r < L; r++) idx.push(rings[r][k], rings[r][n], rings[r + 1][k], rings[r][n], rings[r + 1][n], rings[r + 1][k]);
    idx.push(tailRoot, rings[L][k], rings[L][n]);
  }
  // the winding above is fixed up here so every body face looks outward, whatever order it was written in
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]].map(j => pos.slice(j * 3, j * 3 + 3));
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3 - 0.02];
    if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  }
  // forked tail and a small back fin: flat, own vertices, drawn from both sides
  const p = v(0, 0, -0.36), up = v(0, 0.105, -0.5), notch = v(0, 0, -0.445), down = v(0, -0.105, -0.5);
  idx.push(p, up, notch, p, notch, down);
  idx.push(v(0, 0.078, 0.03), v(0, 0.125, -0.07), v(0, 0.066, -0.13));
  if (detail > 1) {
    // a fin behind each gill cover, the pair under the belly (drawn as one) and the one before the tail: small, thin, swept back
    for (const side of [-1, 1]) idx.push(v(side * 0.036, -0.03, 0.26), v(side * 0.062, -0.062, 0.17), v(side * 0.04, -0.045, 0.2));
    idx.push(v(0, -0.074, -0.02), v(0, -0.108, -0.09), v(0, -0.07, -0.1));
    idx.push(v(0, -0.052, -0.2), v(0, -0.082, -0.27), v(0, -0.04, -0.29));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.triangles = idx.length / 3;
  return g;
}

/**
 * The look of a small silver fish under the sun. A standard material with three things added in its shader:
 *   paint   - blue-green back, silver side with a brighter stripe, pale belly, a dark eye (from the body position)
 *   mirror  - the sides of such fish act like mirrors: they show the bright water above and flash when a fish
 *             rolls toward the sun. Worked out per pixel from the view and sun directions, with no extra texture.
 *   ripples - moving sun ripples on whatever faces up (off when caustics = false, for weak devices)
 * and the tail beat in the vertex shader, driven by one float per fish (aSwim) plus one clock (uBeat).
 * Returns the material; material.userData.look = { uTime, uBeat, uSun, uWater } are the live uniforms.
 */
export function fishMaterial(THREE, { caustics = true, sun = [0.24, 0.93, 0.28], water = '#2f8fc4' } = {}) {
  const look = { uTime: { value: 0 }, uBeat: { value: 0 }, uPlay: { value: 0 }, uSun: { value: new THREE.Vector3(...sun).normalize() }, uWater: { value: new THREE.Color(water) },
    // a sea surface overhead (scenes/kit/surface.js): uSurf = its height (far above = none). A fish above it is lit by the
    // sky's low sun (uAirSun, uAirSunCol) and the sky itself (uAirSky); below it, uWarm of that sun comes down through the
    // water and fades with depth.
    uSurf: { value: 1e6 }, uWarm: { value: 0 }, uAirSun: { value: new THREE.Vector3(0, 1, 0) }, uAirSunCol: { value: new THREE.Color('#ffd2a0') }, uAirSky: { value: new THREE.Color('#5a6fa8') },
    // the colour the water gives a fish: uTintTop just under that surface, uTintDeep well below; uHaze = the water's haze there
    uTintTop: { value: new THREE.Color(1, 1, 1) }, uTintDeep: { value: new THREE.Color(1, 1, 1) }, uHaze: { value: new THREE.Color('#0b4f80') }, uHazeOwn: { value: 0 } };
  const material = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.15, side: THREE.DoubleSide });
  material.defines = caustics ? { FISH_RIPPLES: '' } : {};
  material.userData.look = look;
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, look);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSwim;\nuniform float uBeat;\nvarying vec3 vBody;\nvarying vec3 vWN;\nvarying vec3 vWP;')
      // the tail beat: a wave that runs down the body and grows toward the tail; the head barely moves
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBody = position;\nfloat swim = aSwim + uBeat;\nfloat tailward = 1.0 - smoothstep(-0.5, 0.38, position.z);\ntransformed.x += sin(swim - position.z * 6.5) * 0.085 * tailward * tailward + sin(swim + 1.6) * 0.012;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wp = vec4(transformed, 1.0); vec3 wn = objectNormal;
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp; wn = mat3(instanceMatrix) * wn;
        #endif
        vWP = (modelMatrix * wp).xyz; vWN = mat3(modelMatrix) * wn;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uPlay; uniform vec3 uSun; uniform vec3 uWater;
        uniform float uSurf, uWarm, uHazeOwn; uniform vec3 uAirSun, uAirSunCol, uAirSky, uTintTop, uTintDeep, uHaze;
        vec3 fishTint; vec3 fishBase; float fishAir;
        varying vec3 vBody; varying vec3 vWN; varying vec3 vWP;
        float fishMirror;
        float sunRipples(vec2 p, float t) {
          t = mod(t, 628.318);
          float v = 0.0; vec2 q = p;
          for (int i = 0; i < 3; i++) {
            q += 0.55 * vec2(sin(q.y * 1.7 + t * 0.9 + float(i) * 1.9), cos(q.x * 1.9 - t * 0.7 + float(i) * 1.3));
            v += 1.0 / (1.0 + 14.0 * abs(sin(q.x + q.y)));
          }
          return v / 3.0;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float up = clamp(vBody.y / 0.08, -1.3, 1.3);                       // -1 belly .. 1 back
          float back = smoothstep(0.3, 0.72, up);
          float stripe = (1.0 - smoothstep(0.05, 0.2, abs(up - 0.14))) * (1.0 - back) * smoothstep(-0.42, -0.2, vBody.z);
          vec3 paint = mix(vec3(0.93, 0.96, 0.97), vec3(0.70, 0.80, 0.86), smoothstep(-0.95, -0.15, up));
          paint = mix(paint, vec3(0.045, 0.21, 0.25), back);
          paint = mix(paint, vec3(0.97, 0.99, 1.0), stripe * 0.5);
          float fin = step(vBody.z, -0.37) + step(0.09, vBody.y) + step(vBody.y, -0.084);   // tail, back fin and belly fins: thin and dusky
          paint = mix(paint, vec3(0.42, 0.58, 0.64), min(1.0, fin));
          float eye = length(vec2(vBody.z - 0.385, vBody.y - 0.012));
          float onSide = step(0.008, abs(vBody.x));
          paint = mix(paint, vec3(0.92, 0.95, 0.97), (1.0 - smoothstep(0.019, 0.023, eye)) * onSide);
          paint = mix(paint, vec3(0.015), (1.0 - smoothstep(0.010, 0.013, eye)) * onSide);
          // the edge of the gill cover: a thin curved shadow behind the head
          float gill = abs(vBody.z - 0.285 + 28.0 * vBody.y * vBody.y);
          paint *= 1.0 - 0.3 * (1.0 - smoothstep(0.004, 0.011, gill)) * onSide * step(abs(vBody.y), 0.06);
          fishMirror = (1.0 - back) * (1.0 - min(1.0, fin)) * smoothstep(0.012, 0.022, eye);
          // play colours: the fish's own colour (diffuseColor already holds it) shows on the whole body, back included
          fishTint = mix(vec3(1.0), diffuseColor.rgb * 1.5, uPlay);
          paint = mix(paint, vec3(0.5 + 0.45 * dot(paint, vec3(0.33))), uPlay * (1.0 - min(1.0, fin)) * smoothstep(0.012, 0.022, eye));
          fishMirror = mix(fishMirror, 0.75 * (1.0 - min(1.0, fin)) * smoothstep(0.012, 0.022, eye), uPlay);
          diffuseColor.rgb *= paint * mix(0.5, 0.8, uPlay);
          // out of the water the scene's blue underwater lights count for little: the low sun and the sky light the fish (below)
          fishAir = smoothstep(uSurf - 0.04, uSurf + 0.08, vWP.y);
          fishBase = diffuseColor.rgb;
          diffuseColor.rgb *= mix(mix(uTintDeep, uTintTop, exp(-max(uSurf - vWP.y, 0.0) * 0.2)), vec3(0.3), fishAir);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 Nw = vWN / max(length(vWN), 1e-5) * (gl_FrontFacing ? 1.0 : -1.0);
          vec3 toEye = cameraPosition - vWP; vec3 Vw = toEye / max(length(toEye), 1e-5);
          vec3 R = reflect(-Vw, Nw);
          float above = smoothstep(-0.35, 0.85, R.y);
          float glint = pow(clamp(dot(R, uSun), 0.0001, 1.0), 14.0);
          float edge = clamp(1.0 - dot(Nw, Vw), 0.0, 1.0); float rim = edge * edge * edge;
          vec3 seen = uWater * (0.04 + 0.6 * above * above) + vec3(1.0, 0.96, 0.86) * glint * 1.5 + uWater * rim * 0.25;
          // in the air: a warm side toward the low sun, a cool shaded side lit only by the sky, the sky in the mirror flanks
          float key = smoothstep(-0.2, 0.75, dot(Nw, uAirSun));
          vec3 airLit = fishBase * (uAirSunCol * key * 2.1 + uAirSky * (0.3 + 0.2 * Nw.y));
          float toSun = clamp(dot(R, uAirSun), 0.0001, 1.0);
          vec3 airSeen = mix(uAirSky * 1.5, uAirSunCol * 1.25, toSun * toSun) * (0.3 + 0.7 * smoothstep(-0.25, 0.5, R.y))
            + uAirSunCol * (pow(toSun, 30.0) * 2.4 + rim * key * 0.7);
          // under the water: what is left of that sun, warm on the side toward it, less with every unit of depth
          float through = uWarm * exp(-max(uSurf - vWP.y, 0.0) * 0.16) * (1.0 - fishAir);
          vec3 warm = fishBase * uAirSunCol * smoothstep(-0.25, 0.8, dot(Nw, uSun)) * through * 0.7
            + fishMirror * uAirSunCol * glint * through * 1.2 * fishTint;
          totalEmissiveRadiance += clamp(mix(fishMirror * seen * 0.5 * fishTint + warm, airLit + fishMirror * airSeen * 0.5 * fishTint, fishAir), 0.0, 4.0);
          #ifdef FISH_RIPPLES
            float lit = smoothstep(-0.1, 0.8, Nw.y);
            totalEmissiveRadiance += clamp(fishBase * mix(vec3(1.0), uAirSunCol * 1.25, min(1.0, through * 1.3)) * lit * sunRipples(vWP.xz * 2.3 + vWP.y * 0.4, uTime) * 0.5 * (1.0 - fishAir), 0.0, 2.0);
          #endif
        }`)
      // the water's haze does not hang in the air: a fish above the surface is not fogged
      .replace('#include <fog_fragment>', `#ifdef USE_FOG
          #ifdef FOG_EXP2
            float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(fogColor, uHaze, uHazeOwn), fogFactor * (1.0 - fishAir));
        #endif`);
  };
  return material;
}

/** Small seeded random numbers, so a school looks the same on every visit and in every test. */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s + 0x6D2B79F5) | 0, (Math.imul(s ^ (s >>> 15), 1 | s) ^ (Math.imul(s ^ (s >>> 7), 61 | s) + (s ^ (s >>> 15)))) >>> 0) / 4294967296); }

// Each mode is a shape for the school to hold. track = [half length x, half width z] of the loop it swims.
export const MODES = {
  travel: { speed: 0.62, track: [2.7, 1.3], pull: 0.9, align: 1.7, cohere: 0.9, depth: 0.5 },
  ring: { speed: 0.66, track: [1.3, 1.3], pull: 1.6, align: 1.1, cohere: 0.15, depth: 0.42 },
  ball: { speed: 0.78, ball: true, align: 0.5, cohere: 0.6 },
  // play only: the fish swim along a line the visitor drew (see trace). Real fish do not do this; the page says so.
  path: { speed: 0.7, path: true, align: 0.35, cohere: 0.15 },
};

// Neighbour grid: cells of 0.42 a side that repeat every 32 cells (13.4 units) in each direction, so the school can swim
// anywhere and still find its neighbours. Two fish a whole repeat apart share a cell and are told apart by distance.
const CELL = 0.42, GRID = 32, WRAP = GRID - 1;
const SEE = 0.42, MAX_NEIGHBOURS = 12;                    // how far a fish looks (two body lengths) and how many neighbours it heeds

export function createSchool({ THREE, count = 900, length = 0.2, seed = 7, max = count, stagger = 1, ballSize = 1, detail = 0, caustics = true }) {
  // MAX fish have a place in memory and N of them swim; setCount moves N anywhere up to MAX
  const MAX = Math.max(count, max), rnd = rng(seed); let N = count; const APART = 0.8 * length;   // closer than this is too close
  const px = new Float32Array(MAX), py = new Float32Array(MAX), pz = new Float32Array(MAX);
  const vx = new Float32Array(MAX), vy = new Float32Array(MAX), vz = new Float32Array(MAX);
  const hx = new Float32Array(MAX), hy = new Float32Array(MAX), hz = new Float32Array(MAX);   // where the body points (smoothed)
  const ax = new Float32Array(MAX), ay = new Float32Array(MAX), az = new Float32Array(MAX);   // last steering, reused on skipped frames
  const pace = new Float32Array(MAX), size = new Float32Array(MAX), lane = new Float32Array(MAX), level = new Float32Array(MAX), fright = new Float32Array(MAX);
  const swim = new Float32Array(MAX), roll = new Float32Array(MAX);
  for (let i = 0; i < MAX; i++) {
    // start as one loose clump on the travel track, already moving the same way
    const r = Math.cbrt(rnd()) * (0.5 + 0.035 * Math.cbrt(N)), a = rnd() * 6.283, b = Math.acos(2 * rnd() - 1);
    px[i] = 2.7 + r * Math.sin(b) * Math.cos(a) * 0.7; py[i] = r * Math.cos(b) * 0.6; pz[i] = r * Math.sin(b) * Math.sin(a) * 1.6;
    vx[i] = 0; vy[i] = 0; vz[i] = 0.6; hz[i] = 1;
    pace[i] = 0.88 + 0.24 * rnd(); size[i] = 0.82 + 0.36 * rnd(); lane[i] = rnd() * 2 - 1; level[i] = rnd() * 2 - 1; swim[i] = rnd() * 6.283;
  }

  const geometry = fishGeometry(THREE, detail), TRIS = geometry.userData.triangles;
  const swimAttr = new THREE.InstancedBufferAttribute(swim, 1); swimAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aSwim', swimAttr);
  const material = fishMaterial(THREE, { caustics });
  const mesh = new THREE.InstancedMesh(geometry, material, MAX);
  mesh.count = N;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;               // the school moves inside the mesh; one bounding sphere would be wrong
  const tint = new THREE.Color();
  const shade = new Float32Array(MAX);                                // each fish's own brightness, kept so play colours can be undone
  for (let i = 0; i < MAX; i++) mesh.setColorAt(i, tint.setScalar(shade[i] = 0.86 + 0.14 * rnd()));
  const M = mesh.instanceMatrix.array;

  const cellStart = new Int32Array(GRID * GRID * GRID + 1), cellOf = new Int32Array(MAX), order = new Int32Array(MAX);
  const cellIndex = (x, y, z) => ((Math.floor(x / CELL) & WRAP) * GRID + (Math.floor(y / CELL) & WRAP)) * GRID + (Math.floor(z / CELL) & WRAP);
  function sortIntoCells() {
    cellStart.fill(0);
    for (let i = 0; i < N; i++) { const c = cellOf[i] = cellIndex(px[i], py[i], pz[i]); cellStart[c + 1]++; }
    for (let c = 0; c < cellStart.length - 1; c++) cellStart[c + 1] += cellStart[c];
    const fill = cellStart.slice(0, -1);
    for (let i = 0; i < N; i++) order[fill[cellOf[i]]++] = i;
  }

  let mode = 'travel', M_ = MODES.travel, frame = 0, simMs = 0, think = stagger;
  // a ball packs the fish about one body length apart; a very big school packs tighter, so the ball stays in the picture
  const radiusFor = (n) => Math.min(1.5, 0.6 * length * Math.cbrt(n)) * ballSize;
  let ballRadius = radiusFor(N);
  const threat = { on: false, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0, left: 0, reach: 1.15 };
  const mean = { x: 0, y: 0, z: 0, hx: 0, hy: 0, hz: 1 };
  // a drawn line, resampled to PATH points the same distance apart. closed = its ends meet, so the fish go round and round;
  // an open line is swum there and back.
  const PATH = 64, qx_ = new Float32Array(PATH), qy_ = new Float32Array(PATH), qz_ = new Float32Array(PATH);
  const path = { on: false, length: 0, closed: false, wide: 0.2, gone: 0 };
  let before = 'travel';
  // the middle of the loop, ring or ball. Moving it moves the whole school: the fish swim to it at their own speed.
  const home = { x: 0, y: 0, z: 0 };
  // loose: 0 = a school as tight as its mode makes it, 1 = spread out (a school at night). watch: a level some of the
  // fish are watched at, so a scene hears when one crosses it (the sea surface).
  let loose = 0, watch = null;

  function steer(i, t) {
    const x = px[i], y = py[i], z = pz[i], X = x - home.x, Y = y - home.y, Z = z - home.z;   // X, Y, Z: seen from the school's home
    let sx = 0, sy = 0, sz = 0, mx = 0, my = 0, mz = 0, cx = 0, cy = 0, cz = 0, seen = 0;
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL), gz = Math.floor(z / CELL);
    scan: for (let a = gx - 1; a <= gx + 1; a++) {
      for (let b = gy - 1; b <= gy + 1; b++) {
        for (let c = gz - 1; c <= gz + 1; c++) {
          const cell = ((a & WRAP) * GRID + (b & WRAP)) * GRID + (c & WRAP);
          for (let k = cellStart[cell], end = cellStart[cell + 1]; k < end; k++) {
            const j = order[k]; if (j === i) continue;
            const dx = px[j] - x, dy = py[j] - y, dz = pz[j] - z, d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > SEE * SEE || d2 < 1e-8) continue;
            const d = Math.sqrt(d2);
            if (d < APART) { const push = (APART - d) / (APART * d); sx -= dx * push; sy -= dy * push; sz -= dz * push; }
            mx += vx[j]; my += vy[j]; mz += vz[j]; cx += dx; cy += dy; cz += dz;
            if (++seen >= MAX_NEIGHBOURS) break scan;
          }
        }
      }
    }
    let fx = sx * 9, fy = sy * 9, fz = sz * 9;                        // keep apart
    if (seen) {
      const k = 1 / seen;
      const al = M_.align * (1 - 0.55 * loose), co = M_.cohere * (1 - 0.8 * loose) * 3;
      fx += (mx * k - vx[i]) * al + cx * k * co;                      // line up, stay close
      fy += (my * k - vy[i]) * al + cy * k * co;
      fz += (mz * k - vz[i]) * al + cz * k * co;
    }
    if (M_.path) {
      // a drawn line: each fish has its own place along it, and all the places move along the line together
      const u0 = (i * 0.61803) % 1; let u, way = 1;
      if (path.closed) u = (u0 + path.gone / path.length) % 1;
      else { const w = (u0 + path.gone / (2 * path.length)) % 1; if (w < 0.5) u = 2 * w; else { u = 2 - 2 * w; way = -1; } }
      const f = u * (PATH - 1), k0 = Math.min(PATH - 2, f | 0), k1 = k0 + 1, m = f - k0;
      let tx = qx_[k1] - qx_[k0], ty = qy_[k1] - qy_[k0], tz = qz_[k1] - qz_[k0]; const tl = (Math.hypot(tx, ty, tz) || 1) * way; tx /= tl; ty /= tl; tz /= tl;
      const w = path.wide, ox = lane[i] * w, oy = level[i] * w, oz = (((i * 0.7548) % 1) * 2 - 1) * w;
      fx += (qx_[k0] + (qx_[k1] - qx_[k0]) * m + ox - x) * 3.4 + (tx * M_.speed - vx[i]) * 1.2;
      fy += (qy_[k0] + (qy_[k1] - qy_[k0]) * m + oy - y) * 3.4 + (ty * M_.speed - vy[i]) * 1.2;
      fz += (qz_[k0] + (qz_[k1] - qz_[k0]) * m + oz - z) * 3.4 + (tz * M_.speed - vz[i]) * 1.2;
    } else if (M_.ball) {
      // a ball: every fish has its own place in it (a height and a distance from the middle) and circles there
      const ty = level[i] * ballRadius * 0.97, rt = Math.sqrt(Math.max(0.01, ballRadius * ballRadius - ty * ty)) * Math.sqrt(0.12 + 0.88 * (lane[i] * 0.5 + 0.5));
      const r = Math.hypot(X, Z) || 1e-6, pull = Math.max(-5, Math.min(5, (rt - r) * 3.2));
      fx += X / r * pull - Z / r * 0.9; fz += Z / r * pull + X / r * 0.9;
      fy += (ty - Y) * 2.4 - vy[i] * 1.2;
    } else {
      // a loop: swim along the track, each fish in its own lane and at its own level
      const [A, B] = M_.track, th = Math.atan2(Z / B, X / A), qx = A * Math.cos(th), qz = B * Math.sin(th);
      let tx = -A * Math.sin(th), tz = B * Math.cos(th); const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const wide = (mode === 'ring' ? 0.3 : 0.55) * (1 + 1.5 * loose);
      const lx = qx + tz * lane[i] * wide, lz = qz - tx * lane[i] * wide;                 // lane = sideways offset from the track
      // a school that was led far from its home swims back at its own speed: the pull is capped
      const far = Math.hypot(lx - X, lz - Z), ease = far > 3 ? 3 / far : 1;
      fx += (lx - X) * ease * M_.pull + (tx * M_.speed * ease - vx[i]) * 1.1;
      fz += (lz - Z) * ease * M_.pull + (tz * M_.speed * ease - vz[i]) * 1.1;
      fy += (Math.max(-3, Math.min(3, level[i] * M_.depth * (1 + 1.3 * loose) + 0.12 * Math.sin(t * 0.3 + th) - Y))) * 0.9 - vy[i] * 0.8;
    }
    if (threat.on) {
      // something big swims through: move out of its way, sideways from its path more than straight ahead
      const dx = x - threat.x, dy = y - threat.y, dz = z - threat.z, d = Math.hypot(dx, dy, dz);
      if (d < threat.reach) {
        const along = dx * threat.dx + dy * threat.dy + dz * threat.dz;
        let ox = dx - along * threat.dx * 0.8, oy = dy - along * threat.dy * 0.8, oz = dz - along * threat.dz * 0.8;
        const ol = Math.hypot(ox, oy, oz) || 1, k = (1 - d / threat.reach) * 26 / ol;
        fx += ox * k; fy += oy * k; fz += oz * k;
        fright[i] = 1;
      }
    }
    ax[i] = fx; ay[i] = fy; az[i] = fz;
  }

  const UP_LIMIT = 0.5;                                               // fish do not point steeply up or down
  function update(t, dt) {
    const t0 = performance.now();
    dt = Math.min(dt, 0.05);
    if (dt <= 0) { simMs = 0; return; }
    frame++;
    if (M_.path) path.gone += M_.speed * dt;
    if (threat.on) {
      threat.x += threat.dx * 2.6 * dt; threat.y += threat.dy * 2.6 * dt; threat.z += threat.dz * 2.6 * dt;
      if ((threat.left -= dt) <= 0) threat.on = false;
    }
    sortIntoCells();
    let sx = 0, sy = 0, sz = 0, shx = 0, shy = 0, shz = 0;
    for (let i = 0; i < N; i++) {
      // on weaker devices each fish thinks every second frame and coasts in between; all fish move every frame
      if (think === 1 || (i + frame) % think === 0 || fright[i] > 0.9) steer(i, t);
      let x = vx[i] + ax[i] * dt, y = vy[i] + ay[i] * dt, z = vz[i] + az[i] * dt;
      const s = Math.hypot(x, y, z) || 1e-6, want = M_.speed * pace[i] * (1 + 2.4 * fright[i]);
      const k = 1 + (want - s) / s * Math.min(1, 4 * dt);
      x *= k; y *= k; z *= k;
      const flat = Math.hypot(x, z), lim = flat * UP_LIMIT * (M_.path ? 8 : M_.ball ? 2.2 : 1) + (M_.path ? 0.02 : 0); if (Math.abs(y) > lim) y = Math.sign(y) * lim;
      vx[i] = x; vy[i] = y; vz[i] = z;
      const yWas = py[i];
      px[i] += x * dt; py[i] += y * dt; pz[i] += z * dt;
      if (watch && i % watch.every === 0 && (yWas - watch.y) * (py[i] - watch.y) < 0) watch.heard(px[i], pz[i], y, x, z);
      fright[i] = Math.max(0, fright[i] - 1.3 * dt);
      // the body turns toward where it is going a little slower than the velocity does, so it never jitters
      const h = Math.min(1, 9 * dt), sp = Math.hypot(x, y, z) || 1e-6;
      let fx = hx[i] + (x / sp - hx[i]) * h, fy = hy[i] + (y / sp - hy[i]) * h, fz = hz[i] + (z / sp - hz[i]) * h;
      const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
      hx[i] = fx; hy[i] = fy; hz[i] = fz;
      swim[i] += dt * (7 + 15 * sp);                                  // a faster fish beats its tail faster
      // matrix columns: right, up, forward (scaled), then position
      let rx = fz, rz = -fx; const rl = Math.hypot(rx, rz); if (rl > 1e-3) { rx /= rl; rz /= rl; } else { rx = 1; rz = 0; }   // a fish going straight up still has a side
      let ux = fy * rz, uy = fz * rx - fx * rz, uz = -fy * rx; const sc = length * size[i], o = i * 16;
      // a fish leans into its turns, and that lean is what makes a turning school flash in the sun
      const turned = ((x / sp - fx) * rx + (z / sp - fz) * rz) * 9, want2 = Math.max(-1.1, Math.min(1.1, turned * 2.4 + fright[i] * (i & 1 ? 0.8 : -0.8)));
      const ro = roll[i] += (want2 - roll[i]) * Math.min(1, 5 * dt), cr = Math.cos(ro), sr = Math.sin(ro);
      const r0 = rx * cr + ux * sr, r1 = uy * sr, r2 = rz * cr + uz * sr;
      ux = ux * cr - rx * sr; uy = uy * cr; uz = uz * cr - rz * sr;
      M[o] = r0 * sc; M[o + 1] = r1 * sc; M[o + 2] = r2 * sc; M[o + 3] = 0;
      M[o + 4] = ux * sc; M[o + 5] = uy * sc; M[o + 6] = uz * sc; M[o + 7] = 0;
      M[o + 8] = fx * sc; M[o + 9] = fy * sc; M[o + 10] = fz * sc; M[o + 11] = 0;
      M[o + 12] = px[i]; M[o + 13] = py[i]; M[o + 14] = pz[i]; M[o + 15] = 1;
      sx += px[i]; sy += py[i]; sz += pz[i]; shx += fx; shy += fy; shz += fz;
    }
    mean.x = sx / N; mean.y = sy / N; mean.z = sz / N; mean.hx = shx / N; mean.hy = shy / N; mean.hz = shz / N;
    mesh.instanceMatrix.needsUpdate = true; swimAttr.needsUpdate = true;
    simMs += (performance.now() - t0 - simMs) * 0.1;
  }

  return {
    root: mesh, max: MAX, modes: Object.keys(MODES), look: material.userData.look,
    get count() { return N; },
    /** How many fish swim (up to max). New fish arrive just behind the school and join it. every = think every nth frame. */
    setCount(n, every = think) {
      n = Math.max(1, Math.min(MAX, n | 0)); think = every;
      const hl = Math.hypot(mean.hx, mean.hy, mean.hz) || 1, bx = mean.hx / hl, bz = mean.hz / hl;
      for (let i = N; i < n; i++) {
        const back = 0.6 + 1.6 * rnd();
        px[i] = mean.x - bx * back + (rnd() - 0.5) * 1.2; py[i] = mean.y + (rnd() - 0.5) * 0.9; pz[i] = mean.z - bz * back + (rnd() - 0.5) * 1.2;
        vx[i] = bx * M_.speed; vy[i] = 0; vz[i] = bz * M_.speed; hx[i] = bx; hy[i] = 0; hz[i] = bz || 1; ax[i] = ay[i] = az[i] = 0; fright[i] = 0; roll[i] = 0;
      }
      N = n; mesh.count = n; ballRadius = radiusFor(n);
    },
    /** Play colours: fn(i, n, colour) fills in a colour for fish i, or null puts every fish back to its real shade. */
    paint(fn) {
      for (let i = 0; i < MAX; i++) { if (fn) fn(i, MAX, tint); else tint.setScalar(shade[i]); mesh.setColorAt(i, tint); }
      mesh.instanceColor.needsUpdate = true; material.userData.look.uPlay.value = fn ? 1 : 0;
    },
    update,
    /** Where the school keeps its loop, ring or ball. The fish swim there; nothing jumps. */
    setHome(x, y, z) { home.x = x; home.y = y; home.z = z; },
    get mode() { return mode; },
    setMode(name) { if (MODES[name] && !MODES[name].path) { mode = before = name; M_ = MODES[name]; path.on = false; } },
    /** Play: swim along a drawn line. points = [{x, y, z}, ...] in the school's space (two or more), or null to go back
     *  to the shape from before. Calling it again while the line grows keeps the fish where they are on it. */
    trace(points) {
      if (!points || points.length < 2) { if (path.on) { path.on = false; mode = before; M_ = MODES[before]; } return false; }
      let total = 0; const at = [0];
      for (let k = 1; k < points.length; k++) at.push(total += Math.hypot(points[k].x - points[k - 1].x, points[k].y - points[k - 1].y, points[k].z - points[k - 1].z));
      if (total < 0.2) return false;
      for (let k = 0, j = 0; k < PATH; k++) {
        const d = total * k / (PATH - 1); while (j < points.length - 2 && at[j + 1] < d) j++;
        const m = (d - at[j]) / ((at[j + 1] - at[j]) || 1), a = points[j], b = points[j + 1];
        qx_[k] = a.x + (b.x - a.x) * m; qy_[k] = a.y + (b.y - a.y) * m; qz_[k] = a.z + (b.z - a.z) * m;
      }
      const a = points[0], b = points[points.length - 1];
      path.closed = total > 1.5 && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 0.45;
      // room for every fish: a longer line or a smaller school makes a thinner ribbon
      path.length = total; path.wide = Math.min(0.42, Math.max(0.1, Math.sqrt(N * 0.002 / (3.1416 * Math.max(total, 1)))));
      if (!path.on) { path.on = true; path.gone = 0; before = mode; }
      mode = 'path'; M_ = MODES.path;
      return true;
    },
    get tracing() { return path.on; },
    /** Something big swims through the school from `from` (a THREE.Vector3) along `dir` (unit). The fish part and close up
     *  behind it. reach = how far from it the fish give way. A scene that moves the big thing itself calls this every
     *  frame with where it is now. */
    poke(from, dir, reach = 1.15) { Object.assign(threat, { on: true, x: from.x, y: from.y, z: from.z, dx: dir.x, dy: dir.y, dz: dir.z, left: 1.5, reach }); },
    /** 0 = as tight as the mode makes it, 1 = spread out: wider lanes, more room above and below, less pull together. */
    setLoose(k) { loose = Math.max(0, Math.min(1, k)); },
    get loose() { return loose; },
    /** Hear when a fish crosses the height y (the sea surface): heard(x, z, vy, vx, vz) for every `every`-th fish that
     *  does, going up (vy > 0) or down. null stops it. Watching a few fish costs one comparison each a frame. */
    watch(y, heard, every = 8) { watch = heard ? { y, heard, every: Math.max(1, every | 0) } : null; },
    /** Centre of the school and how lined up it is: 1 = every fish points the same way, 0 = every which way. */
    centre(out) { return out.set(mean.x, mean.y, mean.z); },
    heading(out) { return out.set(mean.hx, mean.hy, mean.hz); },
    stats() { return { fish: N, triangles: N * TRIS, simMs: +simMs.toFixed(2), linedUp: +Math.hypot(mean.hx, mean.hy, mean.hz).toFixed(2), mode }; },
    dispose() { geometry.dispose(); material.dispose(); mesh.dispose(); },
  };
}
