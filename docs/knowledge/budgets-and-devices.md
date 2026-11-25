# Budgets and devices

Rules: `docs/THREEJS.md` rules 15 and 16. Check: `node tools/stories-test.cjs` (gate step `stories`).

| Tier | Story budget | Anchovy story today | Known how |
| --- | --- | --- | --- |
| `low` | 60,000 triangles, 40 calls | 31,558 (45,558 with the huge school; 56,624 and 27 calls with the sea lion in the picture), 21 calls | measured |
| `mid` | 120,000, 60 | 89,328 (116,628; 119,337 and 26 calls with the sea lion), 21 | measured |
| `high` | 200,000, 100. The anchovy story has its own: 450,000 (KM, 2026-11-24) | 323,684 (447,904; 447,901 and 27 calls with the sea lion: far fish give way while it is there), 21 | measured |

## What we know and do not know

| Claim | Status |
| --- | --- |
| Triangle and draw call counts | Measured, every tier, every school size, in the gate |
| Frame rate on any phone, tablet or laptop | **Not measured.** Headless Chromium with software rendering is not a device. |
| Safari and iPhone | **Not looked at** since the flicker fix. The `pow()` guard is the only protection. |
| Cost of the pixel shaders (sky with 5 noise layers, surface, fish) | **Not measured.** Triangles are not the whole cost: a full-screen sky is paid per pixel. |
| Memory | No textures in the story's 3D scene, so small. Not measured. |

## Lessons

- **A broken picture was blamed on the budget.** It was three shader bugs. Look for the bug before raising a
  number.
- **Raise a budget only where it was asked for and only on the tier that can take it.** `high` only; phones
  stay until one is measured.
- **A per-story budget is data** (`budget` in `scene.json`), read by the test.

## Open questions

1. **Measure a real device.** One mid-range Android phone and one iPhone, each tier, frame time. Until then every
   quality step is a guess about cost.
2. **Does the tier picker choose well?** `core/device.js` guesses a tier. Nothing has checked the guess against a
   measured frame time.
3. **A frame-time governor.** The engine has render steps (`STEPS`). Should a story drop a tier by itself when
   frames are slow?
