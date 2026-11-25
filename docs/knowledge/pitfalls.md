# Pitfalls: every bug that cost a round

Newest first. Each one is a rule of thumb now. Add to this page in the same pull request as the fix.

| Date | What was seen | Cause | Rule of thumb | Gate catches it? |
| --- | --- | --- | --- | --- |
| 2026-11-25 | A sea lion as a guest put the huge school over budget on every tier | A guest's triangles were not in anyone's table | Count the worst moment (biggest group and the guest); let far scenery give way while the guest is there | stories test (guest) |
| 2026-11-25 | The sea lion's loop went round the school, not through it, and it swam between the eye and the fish | The loop began under the middle of the school and came head on | Begin the loop before the middle; bring a guest across the picture, not along the line of sight | no |
| 2026-11-25 | A faint grid in the bright window overhead, looking up at a slant (seen on `main` too) | Not found yet | Open: look at the far cells of the surface grid from below | no |
| 2026-11-25 | Mouths that look fake on most animals | A painted stripe, a pipe for a lip, one flat pink inside | Build the mouth: crease in the skin, lining that goes dark, parts from the dossier (mouths.md) | no (`tools/mouth-review.cjs` makes the pictures) |
| 2026-11-24 | Straight dark lines across the sea from below | Wave slopes interpolated across wide far grid cells | Work out slopes per pixel from the formula | no |
| 2026-11-24 | No horizon from the air | The surface mesh ended and faded into sky-coloured haze | Something must draw the sea all the way out, darker than the sky | no |
| 2026-11-24 | Sunset above, midday below | Only the sky was changed | A time of day is one light through every layer (sky-and-weather.md) | no |
| 2026-11-24 | Orange streaks in blue water | `gl_FrontFacing` chose top or underside | Tell the shader where the eye is | no |
| 2026-11-24 | Dashes along wave crests | Transparent surface with depth writing off | A mesh that overlaps itself must write depth | no |
| 2026-11-24 | Fish blue and hazy in the air | Scene fog and underwater lights applied above the surface | Decide water or air per pixel | no |
| 2026-11-24 | Camera could not cross the waterline | A band that pushed the camera back the way it came | Push toward where it is heading | stories test (leap) |
| 2026-11-24 | A recorded line no longer matched its words | The hint text was changed on a branch cut before the voice merged | Merge `main` before the last gate, and treat any child-facing word as a recording | gate step `sounds` |
| 2026-11-24 | "Main has not moved" written in a pull request when it had | Checked once, hours earlier | Fetch `main` again before saying so | no |
| 2026-11-23 | Black blocks and flicker on an iPhone | `pow()` of a slightly negative number is not a number on Apple GPUs; bloom spreads it | `spow()`, clamp every output | gate step `three` (rule pow-base) |
| 2026-11-23 | A picture darker than the rest | A `ShaderMaterial` without the two output includes | End with `OUTPUT` | gate step `three` |

## Things only a person can see

How it looks. Whether it convinces. A real phone. Every row above marked "no" was found by KM looking at the
preview, not by a tool. A still from headless Chromium, looked at before sending, would have caught four of
them: look from just under the surface, from the air toward the horizon, straight up, and at a slant.
