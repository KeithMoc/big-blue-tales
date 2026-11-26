# Light under water

Code: `scenes/kit/water.js` (backdrop), `scenes/kit/shafts.js`, `scenes/kit/surface.js` (underside), the fish
material in `scenes/kit/school.js`, `core/env.js` (`waterAt`: water colour by depth).

## The physics we lean on

| Fact | Number | What it decides in the picture | Known how |
| --- | --- | --- | --- |
| Light bends entering water | refractive index 1.33 | Everything below | textbook |
| Snell's window | The whole sky is squeezed into a cone about 97 degrees wide overhead (critical angle 48.6 degrees) | From below, the sky is a round window. Its rim holds the whole horizon. | textbook |
| Total internal reflection | Outside that cone no light from the air arrives | Outside the window the underside shows only the water's own colour. Nothing in the air is visible there. | textbook |
| A low sun still comes down steeply | A sun 9 degrees above the horizon is 48 degrees from straight up once in the water | Where the bright patch is, and which way shafts lean, at sunset | textbook, worked in `scene.js` (`SUN`) |
| Water takes red light first | not measured by us | Warm colours belong only to the top few units. Deeper is blue whatever the sky is doing. | textbook; `core/env.js` `waterAt` has the coefficients, not yet checked against their paper |
| Water between eye and object adds its own colour | exponential with distance | Haze. Things and the surface fade to the water's colour, not to black. | textbook |

## How ours is built

| Part | What it does | Known how |
| --- | --- | --- |
| Backdrop sphere | Three colours by direction (up, level, down) plus a glow around the sun's place. One draw call, centred on the camera. | seen |
| Colour by depth | `setShallow(k)` moves the backdrop between two palettes, k = exp(-depth of the eye / 5 units). A look built on "red goes first", not measured colours. | seen |
| Shafts | Quads with moving streaks, additive. They lean toward the refracted sun and repeat around the school. We lean them half as far as the light really leans, to keep them in the picture. | seen |
| Underside of the surface | `refract()` per pixel: sky inside the window, water colour outside, hazed by distance; ripples bend the sky three times as much as they tilt its mirror image from above. | source: abyssal-ocean (MIT), technique only |
| Sun ripples on backs | Three rounds of a warped sine pattern on whatever faces up. Off on `low`. | seen |
| Fish | Tinted by their own depth; warm on the side toward the refracted sun, fading with depth (exp, 0.16 a unit). | seen |

## Mistakes made here

- **A sunset above and midday below.** The first evening build changed only the sky. The maintainer: "everything becomes
  blue, it looks like daytime." One light has to be carried through every layer: backdrop, shafts, surface,
  fish, haze.
- **The sky seen from below washed with bright blue.** It read as grey. The window is the sky's own colour.
- **Fog on a fish in the air.** The scene's fog is the water's haze. A fragment above the surface must not get it.

## Open questions

1. **Caustics on the fish near the surface** follow a made-up pattern, not the waves above. abyssal-ocean derives
   them from the real surface. Worth it for small fish?
2. **Real colours at depth.** `waterAt` in `core/env.js` is tuned to one photograph. The story's dusk palette is
   tuned by eye. Should both come from one table of absorption per colour?
3. **How dark is right?** The eye adapts, so `waterAt` brightens deep water. No rule yet says by how much
   for an evening scene.
4. **Particles.** Drifting specks are hidden in the air (`dry`). Under water they are not lit by the sun's colour.
