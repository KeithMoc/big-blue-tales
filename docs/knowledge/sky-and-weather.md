# Sky, sun, clouds and time of day

Code: `scenes/kit/sky.js`. Shader text (`SKY`) that other materials include, so the backdrop draws the sky and
the sea mirrors the very same one. Times of day: `scenes/kit/daylight.js`, carried into the picture by
`scenes/kit/place.js` (ADR-0037).

## How ours is built

| Part | What it is | Known how |
| --- | --- | --- |
| Gradient | Two colours by height, a warm band at the horizon that is strongest toward the sun | seen |
| Sun | A tight disc plus two wider glows, all powers of the angle to the sun | seen |
| Clouds | Noise on a flat ceiling: 3 layers on `mid`, 5 layers with a little swirl on `high`, none on `low`. Thin edges take the sun's colour, thick middles stay shaded. | seen |
| Time of day | One row of `TIMES` per time: sunrise, day, sunset, night. The sun's height is still the main control; at night the "sun" is a moon. `createDaylight` blends from one row to the next in 3 seconds. | seen |
| Stars | The sky cut into cells of 1/70; about 3 cells in 100 hold one soft point that twinkles slowly. Hidden by clouds, fainter near the horizon. Off on `low`, and not worked out unless it is night. | seen |
| Far sea | `seaFar` (see water-surface.md) | seen |

## What a time of day has to change

A sunset is not a sky colour. It is one light, and it has to be carried through everything
(KM, 2026-11-24). Since 2026-11-25 the list is one row of `TIMES` in `scenes/kit/daylight.js`, and
`createSeaPlace` carries it into every layer, so a new time of day is one new row:

| Layer | Field of the row | Carried by |
| --- | --- | --- |
| Sky colours and sun (or moon) height | `sun`, `sky`, `stars` | sky uniforms |
| Light on animals in the air | `sky.sun`, and `sky.top` with `sky.mid` on the shaded side | `wear(look)` |
| Sun direction under water | worked out: `underwaterSun` (Snell, 1.33) | water backdrop, fish, shafts' lean |
| Water colours by depth | `down`, `shallow`, `reach`, `haze` | `water.setLight` |
| Shaft colour and strength | `light`, `shafts` | `shafts.setLight` |
| Animal tint, mirror and haze by depth | `animalTop`, `animalDeep`, `mirrorTop`, `mirrorDown`, `warm` | `wear(look)`, fish and guests alike |
| The sky seen from below | `bright`, `wash` | `surface.setWash` |
| The words on the page | the story's `times` block, with a source where it says what animals do | `scene.json` |

| Row | What was chosen | Known how |
| --- | --- | --- |
| `sunset` | The evening KM approved on 2026-11-24, moved here unchanged (same triangles, same draw calls, the same picture side by side) | seen, measured |
| `sunrise` | A low sun on the other side of the opening view, pinker and a little cooler than the evening | seen |
| `day` | A high sun, the blue-green water the backdrop had before the evening, wide glow | seen |
| `night` | A moon at about 30 degrees, stars, the water nearly black with a little blue, animals at about a third of their daylight brightness | seen |

None of the four is measured against a photograph, and none has been seen on a real screen.

## Turned down

| Technique | Why | Source |
| --- | --- | --- |
| three.js `Sky` (Preetham scattering) as written | No clouds in r180, unguarded `pow()` of negatives | docs/THREEJS.md section 2 |
| Volumetric clouds | Ray marching per pixel on a phone | not reviewed in depth |

## Open questions

1. **Is time of day a platform setting or a story's own?** Today it is the story's: it opens at the time its
   `scene.json` names (`times.opens`) and the visitor picks another on the picture. Nothing is remembered.
5. **The moon is the sun's disc in a pale colour.** No phases, no moon path on the water beyond the sun's own glint.
2. **Weather.** Rain, wind, fog and storm are not built. Wind would have to drive the waves and the clouds
   together.
3. **A night for the twilight animals.** Stars and a moon exist now. The animals that come up at night (a sourced
   fact for many of them) have no story yet.
4. **Is the sun's glow too big?** With bloom on it fills a quarter of the picture. Not tuned on a real screen.
