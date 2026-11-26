// Open water as a backdrop: one sphere drawn behind everything, always centred on the camera. Bright
// blue-green up toward the sun, the water's own blue level with the eye, dark toward the deep, with a soft
// glow and slow, wide rays around the place the sun comes through. One draw call, no texture. Licence: MIT.
import { GUARD, shaderTime } from './glsl.js';
import { SKY } from './sky.js';

export function createWater(THREE, { sun = [0.2, 0.95, 0.24], top = '#63c8ea', level = '#0d5a8e', deep = '#021a33', glow = '#d9f6ff', sky = null, haze = 1, shallow = null } = {}) {
  // shallow = { top, level, deep, glow }: the water's colours just under the surface, when they differ from the ones
  // further down (a low sun colours the top of the sea and not the deep). setShallow(k) moves between the two.
  // haze = how wide the glow around the sun's place spreads (1 = a high sun's wide glow, less for a low sun)
  // sky = skyUniforms(...) from scenes/kit/sky.js: the same sphere then shows that sky, and the far sea under it,
  // whenever the eye is out of the water (setAbove). One backdrop either way.
  const uniforms = { ...(sky ? sky.uniforms : {}), uAbove: { value: 0 }, uTime: { value: 0 }, uSun: { value: new THREE.Vector3(...sun).normalize() }, uTop: { value: new THREE.Color(top) }, uLevel: { value: new THREE.Color(level) }, uDeep: { value: new THREE.Color(deep) }, uGlow: { value: new THREE.Color(glow) }, uHaze: { value: haze } };
  const geometry = new THREE.SphereGeometry(1, 32, 20);
  const material = new THREE.ShaderMaterial({
    uniforms, defines: { ...(sky ? { WATER_SKY: '', ...sky.defines } : {}) }, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false,
    // only the camera's turning is applied, never its position: the sphere is always around the eye
    vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position * 50.0, 1.0); }`,
    fragmentShader: `uniform float uTime, uAbove, uHaze; uniform vec3 uSun, uTop, uLevel, uDeep, uGlow; varying vec3 vDir;
      ${GUARD}
      #ifdef WATER_SKY
        ${SKY}
      #endif
      void main() {
        vec3 d = vDir / max(length(vDir), 1e-5);
        vec3 c = mix(uDeep, uLevel, smoothstep(-0.75, 0.02, d.y));
        float up = smoothstep(-0.05, 0.95, d.y); c = mix(c, uTop, up * sqrt(sqrt(max(up, 0.0))));
        float toSun = clamp(dot(d, uSun), 0.0001, 1.0);
        // wide rays that fan out from the sun's place and drift
        vec3 side = normalize(cross(uSun, vec3(1.0, 0.0, 0.0))), other = cross(uSun, side);
        float around = atan(dot(d, side), dot(d, other));
        float rays = 0.5 + 0.5 * sin(around * 9.0 + uTime * 0.12 + 1.5 * sin(around * 4.0 - uTime * 0.07));
        c += uGlow * (pow(toSun, 5.0) * 0.55 * uHaze + pow(toSun, 40.0) * 0.6 + pow(toSun, 2.2) * rays * rays * 0.16 * uHaze * smoothstep(-0.2, 0.4, d.y));
        #ifdef WATER_SKY
          if (uAbove > 0.001) {
            // out of the water: the sky above the horizon, the far sea below it, and a clear line where they meet
            vec3 air = mix(seaFar(snorm(vec3(d.x, min(d.y, -0.0005), d.z))), skyColour(snorm(vec3(d.x, max(d.y, 0.0005), d.z))), smoothstep(-0.0025, 0.0025, d.y));
            c = mix(c, air, sat(uAbove));
          }
        #endif
        gl_FragColor = vec4(clamp(c, 0.0, 6.0), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = -0.9; mesh.frustumCulled = false;
  const down = { uTop: uniforms.uTop.value.clone(), uLevel: uniforms.uLevel.value.clone(), uDeep: uniforms.uDeep.value.clone(), uGlow: uniforms.uGlow.value.clone() };
  const up = shallow && { uTop: new THREE.Color(shallow.top), uLevel: new THREE.Color(shallow.level), uDeep: new THREE.Color(shallow.deep), uGlow: new THREE.Color(shallow.glow) };
  const made = { uTop: down.uTop.clone(), uLevel: down.uLevel.clone(), uDeep: down.uDeep.clone(), uGlow: down.uGlow.clone() };
  let depth = 0, shallowK = 0;
  const paint = () => { for (const [name, gain] of [['uTop', 0.38], ['uLevel', 0.4], ['uDeep', 0.3], ['uGlow', 0.45]]) uniforms[name].value.copy(made[name]).multiplyScalar(1 + gain * depth); };
  return {
    root: mesh, update(t) { uniforms.uTime.value = shaderTime(t); if (sky) sky.uniforms.uSkyTime.value = shaderTime(t); },
    /** 0 = the eye is under the water, 1 = it is in the air (needs sky). */
    setAbove(k) { uniforms.uAbove.value = Math.max(0, Math.min(1, k)); },
    /** How deep the eye is, as a look: 0 = as made, 1 = just under the surface (brighter), -1 = well below (dimmer, bluer). */
    setDepth(k) {
      depth = Math.max(-1, Math.min(1, k)); paint();
    },
    /** With shallow colours: 1 = the eye is just under the surface, 0 = it is well below. */
    setShallow(k) { if (!up) return; shallowK = k = Math.max(0, Math.min(1, k)); for (const name in made) made[name].copy(down[name]).lerp(up[name], k); paint(); },
    /** Another time of day (scenes/kit/daylight.js): new colours for the water well below, and just under the surface
     *  when it was made with `shallow`. Each is { top, level, deep, glow } of THREE.Color. sun = where the light comes
     *  through, haze = how wide its glow spreads. */
    setLight({ down: d, shallow: s2, sun: at, haze: h }) {
      const put = (to, src) => { to.uTop.copy(src.top); to.uLevel.copy(src.level); to.uDeep.copy(src.deep); to.uGlow.copy(src.glow); };
      if (d) put(down, d);
      if (s2 && up) put(up, s2);
      if (at) uniforms.uSun.value.copy(at).normalize();
      if (h != null) uniforms.uHaze.value = h;
      for (const name in made) { made[name].copy(down[name]); if (up) made[name].lerp(up[name], shallowK); }
      paint();
    },
    /** The water's colour level with the eye right now (for haze on things in it). */
    get level() { return uniforms.uLevel.value; },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}
