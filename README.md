# A school of anchovies

One 3D sea story for children aged 5 to 7: a school of northern anchovies swims together, turns in a ring, makes
a ball, and a California sea lion loops up through it. Pick sunrise, day, sunset or night. Switch on Play to change
the school's size and colours, tap the water, or draw a line the fish swim along (up to the surface and they leap
out with a splash). "Just the fish" fills the screen. Every part can be read aloud.

Taken from the Sea Monsters A to Z book (`KeithMoc/sea-animals-a-z`, main `df4fd65`, 2026-11-25) with only what this
story needs. Plain ES modules, three.js r180 in `vendor/`, no bundler, no build step.

## Run it

Any static file server from this folder, then open the address it prints:

```
python3 -m http.server 8765        # http://localhost:8765/
```

Opening `index.html` straight from the disk (`file://`) will not work: browsers refuse ES modules there.

## Check it

```
npm install                         # playwright, for the browser check only
node tools/three-rules.mjs          # the three.js rules (shader homes, no pow of negatives, no Math.random, dispose)
node tools/smoke.cjs http://localhost:8765/ shots   # opens the story, walks every part, time of day, Listen, Music, Play, a drawn line and Just the fish
```

The browser check runs in headless Chromium, which draws in software: its numbers are not real frame rates.

## What is in here

| Folder | What |
| --- | --- |
| `index.html`, `app.js` | The page and its entry: one engine, the settings card, the story |
| `views/story.js` | The story view: buttons on the picture, the panel, voice, sound, Play, Just the fish |
| `scenes/anchovy-school/` | The story: `scene.js` (what moves), `scene.json` (every word, its sources, what is left out), `audio/` (the voice) |
| `scenes/kit/` | The story kit: one sea (water, surface, sky, light shafts), time of day, school, far schools, trail, splash, guest |
| `scenes/runner.js`, `scenes/links.js`, `scenes/index.json` | Opens a scene and gives it the engine; the big idea and the place |
| `animals/sea-lion/` | The sea lion guest: its model only (its own page, voice and bark stay in the book) |
| `core/`, `kit/`, `ui/` | Engine, quality tiers, water presets, the model kit, settings, voice and sound playback |
| `sounds/` | Sound list (`index.js`), every sound's maker, prompt and licence (`manifest.json`), the sound files (`shell/`) |
| `docs/` | The story guide, the three.js standard, the tone guide, the story kit decision (ADR-0037) and what was learned |

## One age group

The book has two reading levels, ages 5 to 7 and ages 8 to 10 (the book's default). This story keeps only ages 5 to 7:
its words, its recorded voice, and no age choice in Settings. The ages 8 to 10 words and voice are still in the book.

## Rules this story keeps

- Facts first: every line has a source in `scene.json`; what the picture leaves out or makes up is listed in `notMadeUp`.
- No made-up animal sounds. The voice, sea sound, splash and music are generated and say so in `sounds/manifest.json`.
- Gentle words for young children (`docs/TONE.md`).
- `docs/THREEJS.md`: shader code only in `kit/`, `scenes/kit/`, `core/`; no `pow()` of a value that could be negative;
  no `Math.random`; every scene has a `high` / `mid` / `low` table.

## Not checked

Nobody has heard the recorded lines by ear, and no frame has run on a real phone or in Safari.

## Licences

See `NOTICE.md`.
