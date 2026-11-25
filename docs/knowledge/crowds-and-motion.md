# Many animals at once

Code: `scenes/kit/school.js` (near school), `scenes/kit/far-school.js`, `scenes/kit/trail.js`.

| Part | How | Known how |
| --- | --- | --- |
| Draw | One `InstancedMesh`: 2,700 fish are one draw call | measured: 21 calls for the whole story |
| Steering | Three local rules on the CPU (keep apart, line up, stay close) plus one shape rule per mode (loop, ring, ball, drawn line) | seen |
| Neighbours | A spatial hash that repeats every 32 cells of 0.42 units, so the school can be anywhere | seen |
| Thinking less | On `mid` and `low`, and for bigger schools, each fish steers every second or third frame | seen |
| Home | The middle of the shape. Moving it moves the school at the fish's own speed. | seen |
| Far schools | Placed once on a ring that turns. No CPU a frame. | seen |
| Drawn line | Resampled to 64 points; each fish has its own place along it | seen |
| No `Math.random` | Seeded numbers, so every visit and every test sees the same school | gate step `three` |

## What is sourced and what is pretend

| Behaviour | Status |
| --- | --- |
| Polarised school, milling ring, ball, fountain around a passing animal | Sourced in `scene.json` (NOAA, PLOS Computational Biology 2013, Communications Biology 2024). The ring was measured in golden shiners, the ball and fountain filmed in sardines, and the page says so. |
| Following a drawn line, play colours, leaping out of the water | Pretend. Play only. Labelled on the page at both reading levels. |
| A loose, spread-out school at night; schools forming again at sunrise | Sourced (Kaltenberg and Benoit-Bird 2009, sardine and anchovy schools off Oregon, by sound). `school.setLoose(1)`: wider lanes, more room above and below, less pull together. How loose is a look. |
| The sea lion's path: level and a little deeper than the school, then a loop up through it | Sourced (Hansen and others 2023, drone and underwater film of California sea lions at sardine schools off Baja California). The side it comes from, the loop's size and its leaving are our choices, listed on the page. |
| How the fish give way to the sea lion | The school's own rule for anything big (`poke`, called every frame with the sea lion's nose). **Not sourced for a loop from below:** the study says defences against vertical attacks "have received little attention". The page says so. |
| The slow drift of the home | A look. Bounded to the upper water because anchovies school near the surface (NOAA). |

## Open questions

1. **Steering on the GPU.** The CPU does all of it. How many fish before a mid-range phone drops frames? Not
   measured.
2. **A predator in the scene: done for the sea lion (2026-11-25).** Open: no fish is ever caught in the picture
   (about one try in five catches one in the source). Should a story ever show it, and how, for a child of five?
3. **Two species at once** in one school kit (sardines with anchovies, or a shark through the school).
