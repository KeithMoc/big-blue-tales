# The sea surface, waves and the horizon

Code: `scenes/kit/surface.js`, `scenes/kit/sky.js` (`seaFar`), used by `scenes/anchovy-school/scene.js`.

## How ours is built

| Part | What it is | Why this way | Known how |
| --- | --- | --- | --- |
| Mesh | One square grid, finer in the middle (vertex spacing grows with the 1.7th power of the distance), re-centred on the school every frame | One draw call. Detail where the eye is. | measured: 2 x cells x cells triangles; 51,200 on `high` |
| Waves | 3 to 5 Gerstner waves summed in the vertex shader. Each has a direction, a length, a height and a speed. | A handful of sines is enough for a calm sea and costs nothing. | source: WaterThreeJS (MIT), reviewed |
| The same waves on the CPU | `waveHeight(x, z, t)` runs the same sum in JavaScript | The scene must know if the eye or a fish is above the water without reading anything back from the GPU. Right to about a tenth of a wave's height (the sideways shift of the crests is left out). | seen |
| Slopes | Worked out again **per pixel** from the wave formula | Carried from grid corner to grid corner they drew straight dark lines far out, where cells are wide. | seen (the maintainer's screenshot, 2026-11-24) |
| Small ripples | 3 to 6 crossing sine waves added to the slope per pixel, faded out with distance | The grid cannot carry them. Far away a ripple is smaller than a pixel and only makes noise. | seen |
| From the air | Fresnel mix: the sea's own colour looking down, a mirror of the sky looking across. The sky is a formula, so the mirror needs no second render. | three.js `Water` gets its mirror by drawing the whole scene twice. Above our sea there is only sky. | source: three.js Water (shading idea only) |
| Horizon | `seaFar(direction)`: the far sea is a near-mirror of the low sky, a step darker. The backdrop draws it below eye level and the surface fades into it. | Without it the mesh ended in haze and there was no line between sea and sky. | seen (the maintainer, 2026-11-24) |
| Which side is drawn | A uniform says where the eye is (`setEye`). Not `gl_FrontFacing`. | An eye just under the surface looks across far troughs from above. | seen: orange streaks under water |
| Depth | The surface writes depth | With depth writing off, far waves drew over near ones in triangle order: dashes along the crests. | seen |

## Numbers worth keeping

| Thing | Value | Known how |
| --- | --- | --- |
| Fresnel reflectance of water looking straight down | about 2 to 3 percent | textbook (we use 0.03) |
| Schlick's power | 5 | source: common approximation, as in three.js Water |
| Gerstner crest lean we use | 0.55 of the wave height | chosen by eye |

## Turned down, and what would change that

| Technique | Why not now | What would reopen it |
| --- | --- | --- |
| FFT ocean (JONSWAP spectrum, several cascades) | Float render targets and several passes a frame; phones not measured | A story that needs a rough sea, and a measured phone |
| Screen-space reflection and refraction | Needs the scene drawn to a picture first | A story with something above the water to mirror |
| Foam from the wave Jacobian | Needs a buffer that keeps state between frames | A splash or a breaking wave in a story |
| WebGPU and TSL water libraries | We ship WebGL on three.js r180 | A decision for the whole repo, not one story's |

## Open questions

1. **Splash: drops and bubbles are built (2026-11-25, `scenes/kit/splash.js`), rings are not.** The school reports
   every n-th fish that crosses the surface's rest level (`school.watch`), the scene asks the surface for the
   water's height there (`heightAt`) and throws 4 to 6 drops, and 2 bubbles when the fish goes back in. A point's
   whole flight is in the vertex shader (start, speed, birth time), so nothing is written per frame. Gravity is
   13 units a second squared (9.8 m/s2 at 0.75 m a unit). The drops are drawn bigger than a 15 cm fish would
   throw: a look, said in the file. Seen in headless Chromium only. A ring of ripples would need the surface
   shader to know where things went in: not built.
2. **Does the surface hold 60 frames a second on a phone?** Not measured on any real device.
3. **A rough sea.** Five sines look calm by design. How many are needed before it reads as wind?
4. **The slanted look up.** From below, outside Snell's window, nothing in the air can be seen. That is right,
   and it hides leaping fish. Is right what a child should get?
