# Animals in the light

Code: `fishMaterial` and `fishGeometry` in `scenes/kit/school.js`. One material for near and far fish.

## The anchovy, as built

| Part | How | Known how |
| --- | --- | --- |
| Body | A lofted tube: rings of points along the body. 4 sides x 4 rings (35 triangles), 6 x 5 (63), 8 x 8 with snout, tail stalk and extra fins (135, `high`). | measured: `fishGeometry(...).userData.triangles` |
| Paint | No texture. The fragment shader paints from where a point sits on the body: dark back, silver side with a stripe, pale belly, eye, gill line, dusky fins. | seen |
| Mirror sides | The side of a silver fish is a mirror. The shader reflects the view direction and shows what is there: bright water above, dark below, the sun as a glint. | seen |
| Tail beat | A wave down the body in the vertex shader, one float a fish for its phase | seen |
| Crossing the surface | Decided **per pixel** by height against the surface. Above: lit by the low sun on one side and the sky on the other, sky in the mirror, no haze. Below: tinted by depth, hazed. | seen |
| Shadow | None cast. The shaded side is worked out from the sun's direction. Shadow maps are turned down in the standard. | docs/THREEJS.md |

## Lessons

- **Colours come from the sources.** The anchovy's back, stripe and belly follow NOAA's
  description quoted in `scene.json`.
- **A standard material keeps taking the scene's lights.** In the air those are the wrong lights. The fix was to
  turn the lit colour down above the surface and add our own light there.
- **More triangles made the fish look like fish.** At 63 the body was a six-sided tube. KM's "increase the
  quality of the fish" was answered by shape first, paint second.

## Open questions

1. **Scales and sheen.** No fine detail on the flank. A procedural scale pattern is cheap, but is it visible at
   school distance?
2. **Mouth and gills that move.** Anchovies feed with the mouth wide open (to be checked in a source before
   building). Not modelled.
3. **A pack animal beside the school: one light, two materials (2026-11-25).** `wearWater`
   (`scenes/kit/guest.js`) adds the water's tint by depth and the story's haze to a pack's standard materials,
   with the same uniform names the fish use, so `createSeaPlace` lights both. Seen: the sea lion takes the
   sunset, the day and the night with the school. What a guest does not get: the mirror flanks (it has none), sun
   ripples, and any lighting for the air. The fish material still assumes the unit fish.
4. **One fish does not shade another.** In a dense ball that is the biggest thing missing.
