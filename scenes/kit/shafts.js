// Shafts of sunlight from the surface: one mesh, one draw call, drawn behind everything else. Each shaft is
// one quad; its streaks are worked out in the shader and drift slowly, so the light looks alive without a
// texture. Additive and soft-edged, fading toward the deep. Licence: MIT.
import { shaderTime } from './glsl.js';

// lean = how far the top of a shaft stands to the side of its foot: a number (along x) or [x, z], so the light can come
// down from where a low sun is.
// wrap > 0: the shafts repeat every 2 x wrap units around a centre (moveTo), so a scene that travels always has light
// around it; each one fades out before it steps across to the other side.
export function createShafts(THREE, { count = 9, top = 9, bottom = -7, near = 5, far = 10, back = -4, strength = 0.2, lean = 2.2, colour = '#bfeaff', wrap = 0 } = {}) {
  const pos = [], uv = [], seed = [], idx = [], base = [], r = (a) => Math.abs(Math.sin(a * 127.1) * 43758.5453 % 1);
  const [lx, lz] = Array.isArray(lean) ? lean : [lean, 0];
  for (let k = 0; k < count; k++) {
    const a = k / count * 6.283 + r(k + 1) * 0.5, d = near + (far - near) * r(k + 7), w = 0.9 + 1.6 * r(k + 3), x = Math.cos(a) * d, z = Math.sin(a) * d + back, o = pos.length / 3, sd = r(k + 13) * 40;
    pos.push(x - w * 0.7, top, z, x + w * 0.7, top, z, x + w, bottom, z, x - w, bottom, z); uv.push(0, 1, 1, 1, 1, 0, 0, 0); seed.push(sd, sd, sd, sd); base.push(x, z, x, z, x, z, x, z); idx.push(o, o + 2, o + 1, o, o + 3, o + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1)); geo.setIndex(idx); geo.setAttribute('aBase', new THREE.Float32BufferAttribute(base, 2));
  const uniforms = { uTime: { value: 0 }, uStrength: { value: strength }, uColour: { value: new THREE.Color(colour) }, uCentre: { value: new THREE.Vector3() }, uWrap: { value: Math.max(wrap, 1) }, uLean: { value: new THREE.Vector2(lx, lz) } };
  const material = new THREE.ShaderMaterial({
    uniforms, defines: wrap > 0 ? { SHAFT_WRAP: '' } : {}, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `attribute float aSeed; attribute vec2 aBase; uniform vec3 uCentre; uniform float uWrap; uniform vec2 uLean; varying vec2 vUv; varying float vSeed; varying float vFade;
      void main() {
        vUv = uv; vSeed = aSeed; vFade = 1.0; vec3 p = position;
        p.xz += uLean * uv.y;                                            // the top of a shaft stands toward the sun
        #ifdef SHAFT_WRAP
          vec2 rel = aBase - uCentre.xz, at = mod(rel + uWrap, 2.0 * uWrap) - uWrap;
          p.xz += at - rel; p.y += uCentre.y;
          vFade = 1.0 - smoothstep(0.8 * uWrap, 0.98 * uWrap, max(abs(at.x), abs(at.y)));
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `uniform float uTime; uniform float uStrength; uniform vec3 uColour; varying vec2 vUv; varying float vSeed; varying float vFade;
      float streak(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(fract(sin(mod(i * 1.7 + vSeed, 6.2832)) * 437.585), fract(sin(mod((i + 1.0) * 1.7 + vSeed, 6.2832)) * 437.585), f); }
      void main() {
        vec2 uvc = clamp(vUv, 0.0, 1.0);     // a pixel on a quad's edge can get a value just outside 0..1, and pow() of a negative is not a number
        float edge = sin(3.14159 * uvc.x); edge *= edge;
        float fine = streak(uvc.x * 7.0 + uTime * 0.06 + vSeed) * 0.65 + streak(uvc.x * 19.0 - uTime * 0.11) * 0.35;
        float breathe = 0.8 + 0.2 * sin(uTime * 0.45 + vSeed);
        float a = clamp(edge * uvc.y * sqrt(uvc.y) * (1.0 - smoothstep(0.82, 1.0, uvc.y)) * (0.35 + 0.95 * fine * fine) * breathe * uStrength * clamp(vFade, 0.0, 1.0), 0.0, 1.0);
        gl_FragColor = vec4(uColour, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.renderOrder = -0.5; mesh.frustumCulled = false;
  return {
    root: mesh, update(t) { uniforms.uTime.value = shaderTime(t); },
    /** With wrap on: the point the shafts stay around. */
    moveTo(p) { uniforms.uCentre.value.copy(p); },
    /** 1 = as bright as made, 0 = none (deep water has fainter shafts). */
    setStrength(k) { uniforms.uStrength.value = strength * k; },
    /** Another light (a time of day): its colour, how strong the shafts are as made, and how far their tops lean [x, z]. */
    setLight({ colour: c, strength: s, lean: l }) { if (c) uniforms.uColour.value.copy(c); if (s != null) strength = s; if (l) uniforms.uLean.value.set(l[0], l[1]); },
    dispose() { geo.dispose(); material.dispose(); },
  };
}
