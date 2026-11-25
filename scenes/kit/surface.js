// The sea surface: one mesh, one draw call, one pass, seen from above and from below.
//   waves   - a few Gerstner waves move the grid in the vertex shader. The same sum runs here on the CPU
//             (waveHeight), so a scene knows the water's height at a point: is the eye, or a fish, out of the water?
//   above   - a Fresnel mix of the sea's own colour and the sky (scenes/kit/sky.js, the same formula the backdrop
//             draws, so nothing is rendered twice to get a reflection), a sun glint, haze toward the horizon
//   below   - the bright round window overhead that a diver sees (light from the whole sky is bent into a cone about
//             97 degrees wide); outside it the underside mirrors the dark water
// Which of the two is drawn follows where the eye is (setEye), not which side of a triangle faces it: an eye just under
// the surface looks across far wave troughs from above, and those must still be the underside.
// The grid is finer near its middle and follows a point the scene names (moveTo). No picture file.
// What was reviewed first (three.js Water, Water2 and others) and why this is not those: docs/THREEJS.md, section 2.
// Licence: MIT.
import { GUARD, OUTPUT, shaderTime } from './glsl.js';
import { SKY } from './sky.js';

// direction (x, z), length from crest to crest, height of a crest, speed. Long and low: a calm evening sea.
export const WAVES = [
  { dir: [0.94, 0.34], length: 11.0, height: 0.15, speed: 1.5 },
  { dir: [0.5, 0.87], length: 6.4, height: 0.085, speed: 1.15 },
  { dir: [-0.42, 0.91], length: 3.7, height: 0.045, speed: 0.9 },
  { dir: [0.98, -0.2], length: 2.3, height: 0.026, speed: 0.75 },
  { dir: [-0.8, -0.6], length: 1.5, height: 0.014, speed: 0.62 },
];

/** Height of the water above its rest level at (x, z) and time t, with the first n waves. The crests' small sideways
 *  shift is left out, so this is right to within about a tenth of a wave's height. */
export function waveHeight(x, z, t, n = WAVES.length) {
  t = shaderTime(t); let y = 0;
  for (let i = 0; i < n && i < WAVES.length; i++) { const w = WAVES[i], k = 6.2832 / w.length; y += w.height * Math.sin(k * (w.dir[0] * x + w.dir[1] * z) - k * w.speed * t); }
  return y;
}

/**
 * sky = skyUniforms(...) (shared with the backdrop). y = rest level. half = half its width. cells = grid cells a side
 * (2 x cells x cells triangles). waves = how many of WAVES. under = the water's colour seen from below. bright, wash =
 * the colour the sky overhead is washed with when seen through the water, and how much (0 = the sky as it is).
 */
export function createSurface(THREE, { sky, y = 9, half = 56, cells = 64, waves = WAVES.length, under = '#0d5a8e', bright = '#63c8ea', wash = 0.66, fine = false }) {
  const N = Math.max(1, Math.min(WAVES.length, waves)), pos = [], idx = [], S = cells + 1;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / cells * 2 - 1, v = j / cells * 2 - 1;                 // small cells in the middle, big ones far out
    pos.push(Math.sign(u) * Math.pow(Math.abs(u), 1.7) * half, 0, Math.sign(v) * Math.pow(Math.abs(v), 1.7) * half);
  }
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) { const a = j * S + i; idx.push(a, a + S, a + 1, a + 1, a + S, a + S + 1); }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geometry.setIndex(idx);
  const f = (v) => v.toFixed(4);
  const args = (w, i) => `vec2(${f(w.dir[0])}, ${f(w.dir[1])}), ${f(6.2832 / w.length)}, ${f(w.height)}, ${f(w.speed)}, ${i < 2 ? '1.0' : 'near'}`;
  const wave = WAVES.slice(0, N).map((w, i) => `wave(${args(w, i)}, xz, p);`).join('\n        ');
  // the slope of the same waves, worked out again for every pixel: far out the grid's cells are wide, and a slope
  // carried from corner to corner showed there as straight dark lines
  const slope = WAVES.slice(0, N).map((w, i) => `slope(${args(w, i)}, vRest, N);`).join('\n        ');
  const uniforms = { ...sky.uniforms, uTime: { value: 0 }, uCentre: { value: new THREE.Vector3(0, y, 0) }, uHalf: { value: half }, uUnder: { value: new THREE.Color(under) }, uBright: { value: new THREE.Color(bright) }, uEye: { value: 0 }, uWash: { value: wash } };
  const material = new THREE.ShaderMaterial({
    uniforms, defines: { ...sky.defines, ...(fine ? { SURFACE_FINE: '' } : {}) }, transparent: true, side: THREE.DoubleSide, fog: false,
    vertexShader: `uniform float uTime, uHalf; uniform vec3 uCentre; varying vec3 vWorld; varying vec2 vRest; varying float vOut;
      void wave(vec2 dir, float k, float a, float c, float gain, vec2 xz, inout vec3 p) {
        float ph = k * dot(dir, xz) - k * c * uTime, s = sin(ph), co = cos(ph); a *= gain;
        p.xz += dir * (0.55 * a) * co; p.y += a * s;                     // crests lean forward a little: Gerstner
      }
      void main() {
        vec2 xz = position.xz + uCentre.xz; vec3 p = vec3(xz.x, uCentre.y, xz.y);
        vOut = length(position.xz) / uHalf;
        float near = 1.0 - smoothstep(0.2, 0.6, vOut);                   // short waves only where the grid can carry them
        ${wave}
        vWorld = p; vRest = xz;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `uniform float uTime, uHalf, uEye, uWash; uniform vec3 uUnder, uBright, uCentre; varying vec3 vWorld; varying vec2 vRest; varying float vOut;
      ${GUARD}
      ${SKY}
      void slope(vec2 dir, float k, float a, float c, float gain, vec2 xz, inout vec3 n) {
        float ph = k * dot(dir, xz) - k * c * uTime; a *= gain;
        n.xz -= dir * (k * a) * cos(ph); n.y -= 0.55 * k * a * sin(ph);
      }
      // fine ripples the grid is too coarse for: a few crossing sines tilt the surface a little, per pixel
      vec2 ripple(vec2 p, float t) {
        vec2 g = vec2(0.0);
        g += vec2(0.80, 0.60) * cos(dot(p, vec2(0.80, 0.60)) * 5.1 - t * 2.3);
        g += vec2(-0.45, 0.89) * cos(dot(p, vec2(-0.45, 0.89)) * 8.3 - t * 3.1) * 0.7;
        g += vec2(0.95, -0.31) * cos(dot(p, vec2(0.95, -0.31)) * 13.7 + t * 3.9) * 0.45;
        #ifdef SURFACE_FINE
          g += vec2(0.28, 0.96) * cos(dot(p, vec2(0.28, 0.96)) * 21.0 - t * 4.6) * 0.3;
          g += vec2(-0.87, 0.5) * cos(dot(p, vec2(-0.87, 0.5)) * 33.0 + t * 5.3) * 0.2;
          g += vec2(0.6, -0.8) * cos(dot(p, vec2(0.6, -0.8)) * 47.0 - t * 6.1) * 0.13;
        #endif
        return g;
      }
      void main() {
        vec3 toEye = cameraPosition - vWorld; float dist = length(toEye); vec3 V = toEye / max(dist, 1e-4);
        float fine = 1.0 - smoothstep(6.0, 26.0, dist);                  // far off a ripple is smaller than a pixel: leave it out
        vec3 N = vec3(0.0, 1.0, 0.0); float near = 1.0 - smoothstep(0.2, 0.6, vOut);
        ${slope}
        // seen from below the ripples bend the sky much more than they tilt its mirror image from above
        N.xz -= ripple(vWorld.xz, uTime) * mix(0.15, 0.05, uEye) * fine; N = snorm(N);
        float edge = 1.0 - smoothstep(0.72, 0.97, sat(vOut));
        vec3 col; float alpha;
        if (uEye > 0.5) {
          // from the air: more sky is mirrored the flatter the eye looks across the water
          float facing = sat(dot(N, V)), fres = 0.03 + 0.97 * spow(1.0 - facing, 5.0);
          vec3 R = reflect(-V, N); R.y = abs(R.y); R = snorm(R);
          // the water's own colour: darker looking straight down, and the low sun shows through the thin top of a wave
          float crest = smoothstep(0.02, 0.22, vWorld.y - uCentre.y) * spow(sat(dot(-V, uSkySun) * 0.5 + 0.5), 3.0);
          vec3 body = uSea * (0.75 + 0.5 * facing) + uSkyGlow * crest * 0.22;
          col = mix(body, skyColour(R), fres);
          // the sun's road on the water: every small ripple that faces the sun throws a spark
          col += uSkySunCol * spow(sat(dot(R, uSkySun)), 260.0) * 2.2;
          col = mix(col, seaFar(snorm(vec3(-V.x, min(-V.y, -0.001), -V.z))), smoothstep(0.3, 0.95, sat(dist / uHalf)));   // far out it becomes the far sea the backdrop draws
          alpha = 0.9 * edge + (1.0 - edge) * 0.0;
        } else {
          // from under the water. Light from the whole sky is bent into a cone, so the sky is a round window overhead
          // (Snell's window) with the horizon's glow squeezed into its rim. Outside it no light gets in at all: the
          // underside shows only the water's own colour. k > 0 inside the window.
          vec3 Nb = -N; float c = sat(dot(Nb, V)), k = 1.0 - 1.7689 * (1.0 - c * c);
          float window = smoothstep(0.0, 0.16, k);
          vec3 out3 = refract(-V, Nb, 1.33); out3 = snorm(vec3(out3.x, max(out3.y, 0.02), out3.z));
          vec3 seen = mix(skyColour(out3), uBright, uWash) * 1.5 * (0.55 + 0.45 * smoothstep(0.0, 0.5, k));   // the sky is far brighter than the water, and less of it gets through near the rim
          float sunward = sat(dot(out3, uSkySun));                         // the low sun, broken up by the ripples it comes through
          seen += uSkySunCol * (spow(sunward, 60.0) * 1.5 + spow(sunward, 12.0) * 0.22);
          float glitter = spow(sat(0.5 + 0.5 * ripple(vWorld.xz * 0.6, uTime * 0.8).x), 3.0);
          col = mix(uUnder * (0.8 + 0.45 * glitter * fine), seen, window);
          col = mix(col, uUnder, 1.0 - exp(-dist * 0.04));                 // and the water between the eye and the surface hazes it
          alpha = edge * mix(1.0, 0.72, window);                            // what is in the air shows through the window
        }
        gl_FragColor = vec4(clamp(col, 0.0, 6.0), sat(alpha));
        ${OUTPUT}
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; mesh.renderOrder = -0.3;
  let now = 0;
  return {
    root: mesh, y, waves: N, triangles: idx.length / 3,
    update(t) { now = t; uniforms.uTime.value = shaderTime(t); },
    /** The point the grid stays around (only x and z are used). */
    /** 1 = the eye is in the air (the top is drawn), 0 = it is under the water (the underside is drawn). */
    setEye(k) { uniforms.uEye.value = k > 0.5 ? 1 : 0; },
    /** The water's own colour seen from below right now (a scene whose water changes with depth hands it over). */
    setUnder(colour) { uniforms.uUnder.value.copy(colour); },
    /** Another time of day: the colour the sky is washed with seen from below, and how much. */
    setWash(colour, k) { uniforms.uBright.value.copy(colour); uniforms.uWash.value = k; },
    moveTo(p) { uniforms.uCentre.value.set(p.x, y, p.z); },
    /** Height of the water at (x, z) right now, in the scene's units. */
    heightAt(x, z) { return y + waveHeight(x, z, now, N); },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
