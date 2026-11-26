# AGENTS.md

Instructions for any coding agent working in this repo. Keep to them; ask the owner (KM) when a change needs to
break one.

## What this is

Friendly 3D sea stories for children aged 5 to 7. One story per folder in `scenes/`, built on a shared story kit
(`scenes/kit/`). A static site: plain ES modules, three.js r180 vendored in `vendor/`, no bundler, no build step,
no runtime dependencies. Non-commercial and educational.

## Map

| Path | What |
| --- | --- |
| `scenes/<id>/scene.json` | Every word of a story, its sources (each with a quote), `notMadeUp` (what the picture simplifies or invents) |
| `scenes/<id>/scene.js` | The 3D. Contract: the comment at the top of `scenes/runner.js` |
| `scenes/<id>/audio/` | The story's recorded voice: `narration.young.mp3` + `narration.json` (line key -> `[start, seconds]`) |
| `scenes/index.json` | Story order, big ideas, places. A story not listed here does not exist |
| `scenes/kit/` | Shared sea, sky, time of day, school, splash, guest look. Shader code lives here, in `kit/` or in `core/` only |
| `animals/<id>/` | A guest animal a story mounts with `ctx.mount('<id>')`: `pack.js`, `model/`, signed `dossier.json`, `credits.json` |
| `sounds/` | Shared sounds (`index.js`) and the record of every sound and recorded line (`manifest.json`) |
| `views/`, `ui/`, `core/`, `kit/` | Page, settings, voice and sound playback, engine, pack loader, model kit |
| `docs/` | `STORIES.md` (how to build a story), `THREEJS.md` (3D rules), `TONE.md`, `adr/`, `knowledge/` |
| `vendor/` | three.js. Never edit |

Read `docs/STORIES.md` before touching a story and `docs/THREEJS.md` before any three.js work.

## Hard rules

1. **Facts first.** Every part of a story needs a source with an https URL and a quote in `scene.json`, or a fact
   from a guest animal's signed `dossier.json` confirmed by a second reader. No source means it is left out, or
   listed in `notMadeUp`. Never invent animal behaviour, numbers or colours.
2. **Pretend is labelled.** Anything made up for fun (Play mode) says so on the page and in `notMadeUp`.
3. **No fake animal sounds.** An animal's voice is a real, licensed recording or nothing.
4. **Ages 5 to 7 only.** Write `young` words only, gentle and plain (`docs/TONE.md`): no violent or frightening
   words. Do not add older age groups.
5. **Recording voice costs money.** A new or changed spoken line needs a new paid recording. Do not record it, or
   change a recorded line's words, without KM's yes. Until it is recorded, the browser's own voice reads the line,
   and `tools/story-voice.mjs` fails.
6. **Credits and licences travel with the files.** Every sound and recorded line has an entry in
   `sounds/manifest.json`. Every guest animal has `credits.json`. Licences are in `NOTICE.md`. Never copy code,
   models or media whose licence you have not checked.
7. **Stay inside the budget.** Every scene has a `high` / `mid` / `low` table, and fits its tier budget at its
   biggest (`docs/THREEJS.md` rule 16). No `Math.random` (use a seeded rng). Never `pow()` a value that could be
   negative (use `spow()` from `scenes/kit/glsl.js`). Anything that makes GPU resources has a `dispose()`.
8. **Be honest about what was checked.** Headless Chromium numbers are not frame rates. Say what was not tested
   (real phones, Safari, listening to the voice).

## Checks: all must pass before a change is done

```
npm run check                                   # story-check (sources, tone), story-voice (recordings, manifest), three-rules (3D rules); no browser
python3 -m http.server 8765 &                   # then, with the server running:
node tools/smoke.cjs http://localhost:8765/     # headless page check + triangle/draw-call budget of every story on every tier
```

The first run of the browser check needs `npm install && npx playwright install chromium`.

## Adding a story (short form; the full steps are in README "Add a story")

1. Sources first, then `scenes/<id>/scene.json` and `scene.js` (copy `scenes/anchovy-school/`).
2. List it in `scenes/index.json`.
3. Build on `scenes/kit/` (`createSeaPlace` and friends); add a guest animal in `animals/<id>/` only with a signed dossier.
4. `node tools/story-voice.mjs <id>` lists the lines to record. Ask KM before recording.
5. Run the checks. Add what you learned to `docs/knowledge/` in the same change.
