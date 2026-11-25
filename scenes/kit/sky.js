// A sky that is a formula: a height gradient, a warm band along the horizon that is strongest toward the sun, a sun
// disc with its glow, and (when asked for) soft clouds from three layers of noise. No picture, no pass of its own:
// it is shader text other kit materials include, so the backdrop draws it and the sea surface reflects the very same
// sky. The sun's height is the one control that turns day into sunrise or sunset. What was looked at before writing
// it (three.js Sky and others) and why this is not that: docs/THREEJS.md, section 2. The colours for each time of day
// are rows of scenes/kit/daylight.js; at night the "sun" is the moon and stars come out (uSkyStars). Licence: MIT.

/** Colours of a calm evening. A look, not a fact: nothing here says what time of day anchovies do anything. */
export const EVENING = { top: '#27447e', mid: '#e9a57c', glow: '#ff8a4a', sun: '#ffd2a0', sea: '#0c3a5c' };

/**
 * The live values every material that shows this sky shares (hand the same object to each).
 * sun = direction to the sun (any length). clouds = false leaves the cloud code out of the shader (weak devices). fine = true gives the clouds five layers of
 * noise and a little swirl instead of three plain ones (strong devices).
 */
export function skyUniforms(THREE, { sun = [0.2, 0.2, 0.24], colours = EVENING, clouds = true, fine = false, stars = false } = {}) {
  return {
    clouds, fine: clouds && fine, stars,
    /** The #defines a material that includes SKY needs. */
    defines: { ...(clouds ? { SKY_CLOUDS: '' } : {}), ...(clouds && fine ? { SKY_FINE: '' } : {}), ...(stars ? { SKY_STARS: '' } : {}) },
    uniforms: {
      uSkySun: { value: new THREE.Vector3(...sun).normalize() }, uSkyTime: { value: 0 }, uSkyStars: { value: 0 },
      uSkyTop: { value: new THREE.Color(colours.top) }, uSkyMid: { value: new THREE.Color(colours.mid) },
      uSkyGlow: { value: new THREE.Color(colours.glow) }, uSkySunCol: { value: new THREE.Color(colours.sun) },
      uSea: { value: new THREE.Color(colours.sea) },
    },
  };
}

/** Shader text: put after GUARD (scenes/kit/glsl.js). Gives vec3 skyColour(vec3 direction), direction of length 1,
 *  and vec3 seaFar(vec3 direction) for the sea out at the horizon. */
export const SKY = `
  uniform vec3 uSkySun, uSkyTop, uSkyMid, uSkyGlow, uSkySunCol, uSea; uniform float uSkyTime, uSkyStars;
  float skyHash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
  float skyNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(skyHash(i), skyHash(i + vec2(1.0, 0.0)), f.x), mix(skyHash(i + vec2(0.0, 1.0)), skyHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  vec3 skyColour(vec3 d) {
    float h = sat(d.y), toSun = sat(dot(d, uSkySun));
    vec3 c = mix(uSkyMid, uSkyTop, spow(h, 0.5));
    float band = spow(1.0 - h, 7.0);                                   // the warm band along the horizon
    c = mix(c, uSkyGlow, band * (0.25 + 0.75 * toSun * toSun));
    #ifdef SKY_CLOUDS
      // soft clouds on a flat ceiling far overhead, drifting; lit warm on the side toward the sun
      vec2 p = d.xz / (h + 0.14) * 1.25 + uSkyTime * vec2(0.011, 0.004);
      #ifdef SKY_FINE
        p += 0.4 * vec2(skyNoise(p * 0.7 + 3.1), skyNoise(p * 0.7 + 9.4)) - 0.2;
        float n = 0.0, amp = 0.5; vec2 q = p;
        for (int i = 0; i < 5; i++) { n += amp * skyNoise(q); q = q * 2.03 + 11.7; amp *= 0.5; }
        n /= 0.97;
      #else
        float n = skyNoise(p) * 0.55 + skyNoise(p * 2.1 + 7.3) * 0.3 + skyNoise(p * 4.3 + 1.7) * 0.15;
      #endif
      #ifdef SKY_FINE
        float cover = smoothstep(0.42, 0.84, n) * smoothstep(0.015, 0.16, d.y);      // soft-edged
      #else
        float cover = smoothstep(0.48, 0.78, n) * smoothstep(0.015, 0.16, d.y);
      #endif
      // thin edges catch the low sun, thick middles stay in their own shade
      float thick = smoothstep(0.58, 0.9, n);
      vec3 lit = mix(uSkyMid * 0.9 + uSkyTop * 0.25, uSkySunCol * 1.15, 0.3 + 0.7 * spow(toSun, 1.6));
      vec3 cloud = mix(lit, uSkyTop * 0.6 + uSkyMid * 0.22, thick * 0.65);
      c = mix(c, cloud, cover * 0.85);
    #endif
    #ifdef SKY_STARS
      // stars: the sky cut into small cells, a few of which hold one soft point that twinkles slowly. Only worked out
      // at night (uSkyStars > 0), fainter low in the sky and hidden behind the clouds.
      if (uSkyStars > 0.001) {
        vec3 q = d * 70.0, cell = floor(q); vec2 hh = vec2(skyHash(cell.xy + cell.z * 17.0), skyHash(cell.zx + cell.y * 31.0));
        float near = length(fract(q) - 0.5), lit = step(0.972, hh.x) * (1.0 - smoothstep(0.05, 0.3, near));
        float twinkle = 0.75 + 0.25 * sin(uSkyTime * (0.6 + 1.7 * hh.y) + hh.y * 40.0);
        float behind = 1.0;
        #ifdef SKY_CLOUDS
          behind = 1.0 - cover;
        #endif
        c += vec3(0.78, 0.86, 1.0) * lit * twinkle * (0.25 + 0.75 * hh.y) * smoothstep(0.02, 0.3, d.y) * behind * uSkyStars * 0.9;
      }
    #endif
    c += uSkySunCol * (spow(toSun, 1400.0) * 5.0 + spow(toSun, 90.0) * 0.45 + spow(toSun, 9.0) * 0.16);
    return c;
  }
  // The sea far away, seen from the air in direction d (d.y below 0). Looking that flat across water it is nearly a
  // mirror, so it shows the low sky, a little darker and with the sea's own colour in it: that step in brightness is
  // the horizon. The backdrop draws it and the surface fades into it, so the sea reaches all the way out.
  vec3 seaFar(vec3 d) {
    float g = sat(-d.y), fres = 0.04 + 0.96 * spow(1.0 - g, 5.0);
    return mix(uSea * 0.8, skyColour(snorm(vec3(d.x, g + 0.035, d.z))), fres * 0.8) * 0.86;
  }
`;
