// Splashes where something crosses the sea surface: one set of points, one draw call.
//   drops    - thrown up into the air, they fall back under gravity and catch the light of the sky
//   bubbles  - pulled a little way under by whatever dived in, they rise back to the surface and are gone
// A scene calls burst(x, y, z, going) when it knows something crossed (scenes/kit/school.js reports its fish). Each
// point's whole flight is worked out in the vertex shader from where and when it started, so the CPU writes a few
// numbers once per burst and nothing per frame. Seeded: every visit throws the same drops. No picture file.
// Sizes are a look: a real anchovy's splash is a few drops, and these are drawn large enough to be seen. Licence: MIT.
import { GUARD, OUTPUT, shaderTime } from './glsl.js';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s + 0x6D2B79F5) | 0, (Math.imul(s ^ (s >>> 15), 1 | s) ^ (Math.imul(s ^ (s >>> 7), 61 | s) + (s ^ (s >>> 15)))) >>> 0) / 4294967296); }

const GRAVITY = 13;        // units a second squared: 9.8 m/s2 where one unit is 0.75 m (a 15 cm anchovy is 0.2 long)
const LIFE = 1.25;         // seconds a point lives at most

/** max = points in memory (the oldest are reused). size = a drop's width in units. colour = the light on the drops. */
export function createSplash(THREE, { max = 160, size = 0.034, colour = '#ffffff', seed = 29 } = {}) {
  const rnd = rng(seed), start = new Float32Array(max * 3), vel = new Float32Array(max * 3), born = new Float32Array(max).fill(-10), kind = new Float32Array(max);
  const geometry = new THREE.BufferGeometry();
  const attr = (name, array, n) => { const a = new THREE.BufferAttribute(array, n); a.setUsage(THREE.DynamicDrawUsage); geometry.setAttribute(name, a); return a; };
  const aStart = attr('position', start, 3), aVel = attr('aVel', vel, 3), aBorn = attr('aBorn', born, 1), aKind = attr('aKind', kind, 1);
  const uniforms = { uTime: { value: 0 }, uSize: { value: size }, uHeight: { value: 800 }, uColour: { value: new THREE.Color(colour) }, uDeep: { value: new THREE.Color('#bfe6f5') } };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, fog: false,
    vertexShader: `attribute vec3 aVel; attribute float aBorn, aKind; uniform float uTime, uSize, uHeight; varying float vAge; varying float vKind;
      void main() {
        float age = mod(uTime - aBorn + 3600.0, 3600.0), life = mix(${(LIFE * 0.6).toFixed(2)}, ${LIFE.toFixed(2)}, aKind);
        vAge = age / life; vKind = aKind;
        // a drop falls back under gravity; a bubble is carried down, slows, and floats back up to where it went in
        vec3 p = position + aVel * age;
        p.y += mix(-${(GRAVITY / 2).toFixed(1)}, 1.6, aKind) * age * age;
        if (aKind > 0.5) p.y = min(p.y, position.y);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * mix(1.0, 0.7, aKind) * projectionMatrix[1][1] * uHeight * 0.5 / max(-mv.z, 0.05), 1.0, 48.0);   // the same size in the scene's units at any zoom
        if (vAge >= 1.0 || aBorn < -5.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);     // not alive: off the screen
      }`,
    fragmentShader: `uniform vec3 uColour, uDeep; varying float vAge; varying float vKind;
      ${GUARD}
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0, age = sat(vAge);
        // a drop is a soft bright dot; a bubble is a ring with a small highlight
        float dot1 = 1.0 - smoothstep(0.15, 0.95, r);
        float ring = smoothstep(0.45, 0.8, r) * (1.0 - smoothstep(0.82, 1.0, r)) + 0.5 * (1.0 - smoothstep(0.0, 0.3, length(gl_PointCoord - vec2(0.36, 0.34)) * 2.0));
        float a = mix(dot1, ring * 0.8, vKind) * (1.0 - age * age) * smoothstep(0.0, 0.06, age);
        gl_FragColor = vec4(clamp(mix(uColour * 1.5, uDeep, vKind), 0.0, 4.0), sat(a) * 0.9);
        ${OUTPUT}
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; points.renderOrder = 0.4;
  let next = 0, now = 0, dirty = false, live = 0;
  function put(x, y, z, vx, vy, vz, k) {
    const i = next; next = (next + 1) % max;
    start[i * 3] = x; start[i * 3 + 1] = y; start[i * 3 + 2] = z; vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz; born[i] = now; kind[i] = k;
    dirty = true;
  }
  return {
    root: points, max,
    /**
     * Something crossed the surface at (x, y, z); y is the water's height there. going > 0 = it came out (drops thrown
     * the way it was going), going < 0 = it went in (a few drops, and bubbles under the water). vx, vz = its speed
     * along the water. strength scales how many points and how high.
     */
    burst(x, y, z, going = 1, vx = 0, vz = 0, strength = 1) {
      const out = going > 0, drops = Math.max(1, Math.round((out ? 6 : 4) * strength)), bubbles = out ? 0 : Math.max(1, Math.round(2 * strength));
      for (let k = 0; k < drops; k++) {
        const a = rnd() * 6.2832, s = 0.2 + 0.7 * rnd(), up = (out ? 1.4 : 1.0) + 1.8 * rnd() * rnd();
        put(x + (rnd() - 0.5) * 0.08, y + 0.01, z + (rnd() - 0.5) * 0.08, Math.cos(a) * s + vx * 0.5, up * Math.sqrt(strength), Math.sin(a) * s + vz * 0.5, 0);
      }
      for (let k = 0; k < bubbles; k++) put(x + (rnd() - 0.5) * 0.14, y - 0.02, z + (rnd() - 0.5) * 0.14, vx * 0.4 + (rnd() - 0.5) * 0.2, -(0.5 + 0.7 * rnd()), vz * 0.4 + (rnd() - 0.5) * 0.2, 1);
      live = LIFE;
    },
    /** height = the drawing buffer's height in pixels, so a drop keeps its size in the scene's units. */
    update(t, dt, height = 800) {
      now = shaderTime(t); uniforms.uTime.value = now; uniforms.uHeight.value = height;
      if (dirty) { aStart.needsUpdate = aVel.needsUpdate = aBorn.needsUpdate = aKind.needsUpdate = true; dirty = false; }
      live = Math.max(0, live - dt); points.visible = live > 0;        // nothing in flight: nothing is drawn
    },
    /** The light on the drops (the sky's sun colour) and on the bubbles (the water's own bright colour). */
    setLight(drops, bubbles) { uniforms.uColour.value.copy(drops); if (bubbles) uniforms.uDeep.value.copy(bubbles); },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
