# Sources

The review of record is `docs/THREEJS.md` section 2: what was taken from each source, what was turned down, and
why. This page is the index by topic, and it also lists sources that were only named and not yet read.

## Read and reviewed

| Topic | Source | Licence | What we use from it |
| --- | --- | --- | --- |
| Water | three.js `Water`, `Water2` (r180 examples; `webgl_shaders_ocean`) | MIT | The Fresnel shading idea. Not the object: it draws the scene twice. |
| Water | WaterThreeJS, achrefelouafi | MIT | Gerstner waves in the vertex shader, the same sum on the CPU |
| Water | beautiful-water, VictorZakharov | MIT | Crossing the surface with the camera, no cut |
| Water, underside | abyssal-ocean, squall01337 | MIT | Snell's window by `refract()`, haze, per-pixel slopes, the horizon blend |
| Sky | three.js `Sky` (r180) | MIT | One camera-centred sky with the sun's height as the control |
| Skills | CloudAI-X three.js skills, img2threejs | MIT, Apache-2.0 | Rules in docs/THREEJS.md |
| Safety | Khronos `pow` reference, MDN WebGL best practices, WCAG 2.3.1 | n/a | Rules 5, 8, 29 |

## Read for facts in a story (not techniques)

These back what animals do in a story. They are quoted in the story's `scene.json`, which `tools/story-check.mjs` reads.

| Story | Source | Licence | What the story takes from it |
| --- | --- | --- | --- |
| Anchovy school | Hansen and others 2023, Phil. Trans. R. Soc. B 378: California sea lions interfere with striped marlin hunting behaviour. https://pmc.ncbi.nlm.nih.gov/articles/PMC10107233 | open access | The sea lion's "loop attack": in level, 0.5 to 1 m deeper than the school, then up through it; 19.3% of attacks caught a fish |
| Anchovy school | Kaltenberg and Benoit-Bird 2009, Mar. Ecol. Prog. Ser.: Diel behavior of sardine and anchovy schools in the California Current System. https://www.int-res.com/journals/meps/articles/meps08252 | abstract read | Schools spread out at night, form again fast at sunrise, hold through the day (Oregon); some schools stayed at night in Monterey Bay |
| Anchovy school | Communications Biology 2024 (fountain effect) | open access | Re-read 2026-11-25: its hunters are striped marlin, not sea lions. The story no longer says the fountain is what a school does around a sea lion. |
| Anchovy school, found and not used | Baxter 1967 (anchovies deeper by day, up at night); a 2025 Phil. Trans. paper on humpback whales and sea lions at anchovy schools in Monterey Bay | only search excerpts read | Candidates for "a day in the sea" and a whale in the story. Each needs a full read first. |

## Read as a README only

| Source | Licence | Why no further |
| --- | --- | --- |
| threejs-water-free, baditaflorin | MIT | WebGPU and TSL on three.js r181 |
| webgpu-ocean, iodiot | MIT | WebGPU compute shaders |
| three.js `webgpu_tsl_raging_sea` | MIT | TSL, stylised, no sky or underside |

## Named by KM, not yet read (2026-11-24)

KM passed these on as the usual origins of functions that appear in generated water shaders. None has been
opened by us, so nothing here is used from them yet. Each needs a row in docs/THREEJS.md section 2 before it is.

| Function | Source | Would matter for |
| --- | --- | --- |
| Gerstner wave | https://catlikecoding.com/unity/tutorials/flow/waves/ | Checking our wave and slope formulas against a worked derivation |
| `hash31` | https://dekoolecentrale.nl/wgsl-fns/hash31 | Noise without a texture |
| fbm | https://www.shadertoy.com/view/tXGfRK | Clouds. Shadertoy code has per-shader licences: check before taking any. |
| `snoise`, `taylorInvSqrt` | https://github.com/ashima/webgl-noise | Simplex noise for clouds and ripples (our sky uses value noise) |
| `fresnelSchlick` | LearnOpenGL, https://github.com/JoeyDeVries/LearnOpenGL | Fresnel, already here in the same form |

## How to add one

Read it. Check the licence and the three.js version. Test each idea against the rules and budgets. Write the row
in docs/THREEJS.md section 2 with what is taken and what is turned down. Then add it here under its topic.
No code is copied from a source whose licence was not checked.
