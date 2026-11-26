# Pitfalls: every bug that cost a round

Newest first. Each one is a rule of thumb now. Add to this page in the same change as the fix.

| Date | What was seen | Cause | Rule of thumb | A check catches it? |
| --- | --- | --- | --- | --- |
| 2026-11-25 | A sea lion as a guest put the huge school over budget on every tier | A guest's triangles were not in anyone's table | Count the worst moment (biggest group and the guest); let far scenery give way while the guest is there | `tools/smoke.cjs` (guest pass) |
| 2026-11-25 | The sea lion's loop went round the school, not through it, and it swam between the eye and the fish | The loop began under the middle of the school and came head on | Begin the loop before the middle; bring a guest across the picture, not along the line of sight | no |
| 2026-11-25 | A faint grid in the bright window overhead, looking up at a slant (seen on `main` too) | Not found yet | Open: look at the far cells of the surface grid from below | no |
| 2026-11-24 | Straight dark lines across the sea from below | Wave slopes interpolated across wide far grid cells | Work out slopes per pixel from the formula | no |
| 2026-11-24 | No horizon from the air | The surface mesh ended and faded into sky-coloured haze | Something must draw the sea all the way out, darker than the sky | no |
| 2026-11-26 | A buzz ("zzz") under the music and the water | The generated water loop held 81% of its energy below 30 Hz, too low to hear but enough to make small speakers rattle, plus a thump at the start of every loop | High-pass a sound bed at about 45 Hz, cut thumps, fade the end into the start; measure the spectrum of any new bed | no |
| 2026-11-26 | The sea lion looked like it slid by without swimming, at one size | Its front flippers beat once every 4.8 s (the resting stroke) while it crossed at 4.1 m/s, and the view leaned 45% toward it, so it stayed put on the screen | A guest that swims uses its swimming stroke (about 1 s, sourced) and a sourced pace; the camera leans only a little | no |
| 2026-11-24 | Sunset above, midday below | Only the sky was changed | A time of day is one light through every layer (sky-and-weather.md) | no |
| 2026-11-24 | Orange streaks in blue water | `gl_FrontFacing` chose top or underside | Tell the shader where the eye is | no |
| 2026-11-24 | Dashes along wave crests | Transparent surface with depth writing off | A mesh that overlaps itself must write depth | no |
| 2026-11-24 | Fish blue and hazy in the air | Scene fog and underwater lights applied above the surface | Decide water or air per pixel | no |
| 2026-11-24 | Camera could not cross the waterline | A band that pushed the camera back the way it came | Push toward where it is heading | no |
| 2026-11-24 | A recorded line no longer matched its words | The hint text was changed on a branch cut before the voice merged | Merge `main` before the last check, and treat any child-facing word as a recording | `tools/story-voice.mjs` |
| 2026-11-24 | "Main has not moved" written in a pull request when it had | Checked once, hours earlier | Fetch `main` again before saying so | no |
| 2026-11-23 | Black blocks and flicker on an iPhone | `pow()` of a slightly negative number is not a number on Apple GPUs; bloom spreads it | `spow()`, clamp every output | `tools/three-rules.mjs` (rule pow-base) |
| 2026-11-23 | A picture darker than the rest | A `ShaderMaterial` without the two output includes | End with `OUTPUT` | `tools/three-rules.mjs` (rule output-includes) |

## Things only a person can see

How it looks. Whether it convinces. A real phone. Every row above marked "no" was found by the maintainer looking at the
preview, not by a tool. A still from headless Chromium, looked at before sending, would have caught four of
them: look from just under the surface, from the air toward the horizon, straight up, and at a slant.
