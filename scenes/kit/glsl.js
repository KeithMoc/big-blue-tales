// Small pieces of shader text every new shader in this repo starts from, so the safe way is the short way.
// Both come from the anchovy story: its first version drew black blocks and flickered on an iPhone, because
// pow() of a slightly negative number is "not a number" on Apple GPUs and the bloom pass spreads one such
// pixel over its neighbours. Rules and reasons: docs/THREEJS.md. Checked by tools/three-rules.mjs. Licence: MIT.

/** Put first in a fragment shader. spow = a pow() that cannot make "not a number"; sat = clamp to 0..1; snorm = normalize that survives a zero vector. */
export const GUARD = `
  float sat(float x) { return clamp(x, 0.0, 1.0); }
  float spow(float x, float p) { return pow(max(x, 1e-4), p); }
  vec3 snorm(vec3 v) { return v / max(length(v), 1e-5); }
`;

/** The last two lines of every ShaderMaterial fragment shader. Without them it skips tone mapping and draws darker than the rest. */
export const OUTPUT = `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

/** A clock for a shader: wrapped once an hour, so a phone's low-precision floats never turn smooth motion into steps. */
export const shaderTime = (t) => t % 3600;

/**
 * What each device tier gets, from one table: pick(ctx.tier, { high: {...}, mid: {...}, low: {...} }).
 * An unknown tier gets `low`, never `high`: a wrong guess should cost looks, not frames.
 */
export const pick = (tier, table) => table[tier] ?? table.low;
