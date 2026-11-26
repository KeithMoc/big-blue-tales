// A pack animal as a guest in a story, wearing the story's light. A pack's own materials are lit for its own page;
// in a story the water has a time of day, so the guest must take the same tint by depth and fade into the same haze
// as everything else in the picture. wearWater() adds that to every standard material under a root, at the named
// injection points (docs/THREEJS.md, rule 9), and hands back the live values. The pack's shapes, paint and motion are
// not touched, and the materials go when the pack is unmounted. Licence: MIT.

/**
 * root = the guest's root (from ctx.mount). Returns `look`, the same names a school's fish use (scenes/kit/school.js):
 * uSurf (height of the sea surface), uTintTop / uTintDeep (what the water does to its colours just under the surface
 * and well below), uHaze (the water's colour level with the eye), uVeil (0 = as it is, 1 = lost in the haze: a guest
 * comes into the picture and leaves it through the haze, never with a pop). A story's sea (scenes/kit/place.js) keeps them
 * up to date when the look is handed to its wear().
 */
export function wearWater(THREE, root) {
  const look = { uSurf: { value: 1e6 }, uTintTop: { value: new THREE.Color(1, 1, 1) }, uTintDeep: { value: new THREE.Color(1, 1, 1) }, uHaze: { value: new THREE.Color('#0b4f80') }, uHazeOwn: { value: 1 }, uVeil: { value: 0 } };
  const seen = new Set();
  root.traverse((o) => {
    for (const m of [].concat(o.material || [])) {
      if (!m.isMeshStandardMaterial || seen.has(m)) continue;
      seen.add(m);
      const before = m.onBeforeCompile;
      m.onBeforeCompile = (sh, renderer) => {
        before?.call(m, sh, renderer);
        Object.assign(sh.uniforms, look);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying float vGuestY;')
          .replace('#include <project_vertex>', '#include <project_vertex>\nvGuestY = (modelMatrix * vec4(transformed, 1.0)).y;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uSurf, uHazeOwn, uVeil; uniform vec3 uTintTop, uTintDeep, uHaze; varying float vGuestY;')
          .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(uTintDeep, uTintTop, exp(-max(uSurf - vGuestY, 0.0) * 0.2));')
          .replace('#include <fog_fragment>', `#ifdef USE_FOG
            #ifdef FOG_EXP2
              float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
            #else
              float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
            #endif
            gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(fogColor, uHaze, uHazeOwn), max(fogFactor, clamp(uVeil, 0.0, 1.0)));
          #endif`);
      };
      // its own program, told apart by a define (rule 9). Known limit: two guests whose packs each bring a different
      // onBeforeCompile of their own on otherwise equal materials would share one; no pack does that today.
      m.defines = { ...(m.defines || {}), GUEST_WATER: '' };
      m.needsUpdate = true;
    }
  });
  return look;
}
