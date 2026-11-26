# ADR-0001: A story kit: one sea, one light for the time of day, guest animals from their own packs

| Status | Date | Supersedes | Superseded by |
| --- | --- | --- | --- |
| Accepted | 2026-11-25 | none | none |

## Context

The anchovy story grew a sea surface, a sky, an evening light and a swim area, all wired together inside its own
`scene.js`. KM wants more stories about sea animals living together, and asked
for the sea, the surface, the sky and the time of day as reusable parts first (2026-11-25), with the anchovy
story as their first user: a splash with a sound, sunrise and night, and a real hunter. Three questions were
open in `docs/knowledge/stories-next.md`: what the contract of a story kit is, whether a pack animal can
appear in a story wearing the story's light, and whether a time of day is a look or a fact.

## Decision

1. **One sea.** `createSeaPlace` (`scenes/kit/place.js`) is the open water, the sea surface, the sky and the
   shafts as one piece with one `update`. A scene keeps only its story: who is there and what they do. The
   sea has its own table of what `high`, `mid` and `low` get; a scene still has its own table for its animals.
2. **One light.** A time of day is one row of `TIMES` (`scenes/kit/daylight.js`) that fills in every layer the
   light touches: sky and sun height, the sea from the air, the water by depth, the shafts, the tint and mirror
   on animals. `setTime` moves the whole picture. Four rows ship: sunrise, day, sunset, night.
3. **A time of day is a look unless a source says otherwise.** The colours are never a claim. What animals do
   at a time of day is written in the story's `times` block with its sources, and `notMadeUp` says which parts
   of the story no source ties to a time. In the anchovy story the loose school at night is sourced; the ring,
   the ball and the sea lion are shown the same at every time, and the page says so.
4. **A guest is its own pack.** A story shows a hunter or a neighbour by mounting that animal's own pack
   (`animals/<id>/`) with `ctx.mount`, never a second model. `wearWater` (`scenes/kit/guest.js`) gives its
   materials the sea's tint and haze. A pack may honour `ctx.lod` (0.3 to 1) with a coarser skin; one that does not is drawn as it is.
   What the guest does must have a source; what the source leaves open is listed as our choice.
5. **The budget holds at the worst moment.** `tools/smoke.cjs` measures each tier with the biggest group picked
   and the guest in the picture. Far scenery gives way while a guest is there.
6. **A sound for an event is a cue, not a call.** A scene says `ctx.cue(id)`; the page plays that `SFX` entry (`sounds/index.js`)
   only if it exists and the visitor has sounds on. A sound that was never made is silence, not an error.

## Consequences

A new open-water story starts at about twenty lines (`docs/STORIES.md`). The anchovy scene lost its sea code
and kept its picture: at sunset it draws the same triangles and draw calls as before. Every time of day is a
palette somebody chose, and none has been seen on a real phone. The guest look has no lighting for the air, so
a guest stays under water. Stories on a sea floor still need a kit piece for the ground. We would revisit this
if a second story needs a sea that does not fit `createSeaPlace` (a reef in shallow water, a river mouth).

## Where it lives

`scenes/kit/place.js`, `daylight.js`, `guest.js`, `splash.js`, additions to `school.js`, `sky.js`, `water.js`,
`shafts.js`, `surface.js`; `scenes/runner.js` (contract: `times`, `labels`, `ctx.cue`, `ctx.mount` with
`lod`); `scenes/anchovy-school/`; `tools/smoke.cjs` (budget), `tools/story-check.mjs` (sources); `docs/STORIES.md`.
