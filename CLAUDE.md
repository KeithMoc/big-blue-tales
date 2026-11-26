# Big Blue Tales: notes for Claude

Friendly 3D sea stories for kids, one per folder in `scenes/` on the shared story kit `scenes/kit/`. Adding a story: README "Add a story". Plain ES modules, three.js r180 in `vendor/`, no bundler.

- Read `docs/THREEJS.md` before any three.js work and `docs/STORIES.md` before changing the story. `docs/knowledge/` holds what was learned; add to it in the same change.
- One age group only: ages 5 to 7 (`young`). Do not add older words or voice back without KM's word.
- Facts first: every part in a story's `scene.json` has a source with a quote or a signed dossier fact (`tools/story-check.mjs`); unsourced behaviour is left out or labelled in `notMadeUp`. No made-up animal sounds.
- Gentle words for young children (`docs/TONE.md`).
- Before a change lands: `npm run check` (`tools/story-check.mjs`, `tools/story-voice.mjs`, `tools/three-rules.mjs`) and `node tools/smoke.cjs http://localhost:8765/` (with `python3 -m http.server 8765` running; it also measures every story's budget on every tier). Headless numbers are not real frame rates.
- A new or changed spoken line needs a new recording (paid; KM's yes first) and its key in the story's `audio/narration.json` and an entry in `sounds/manifest.json`.
