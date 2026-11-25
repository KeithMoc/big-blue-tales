# A school of anchovies: notes for Claude

One story taken from the Sea Monsters A to Z book (main df4fd65). Plain ES modules, three.js r180 in `vendor/`, no bundler.

- Read `docs/THREEJS.md` before any three.js work and `docs/STORIES.md` before changing the story. `docs/knowledge/` holds what was learned; add to it in the same change.
- One age group only: ages 5 to 7 (`young`). Do not add older words or voice back without KM's word.
- Facts first: every line in `scenes/anchovy-school/scene.json` has a source; unsourced behaviour is left out or labelled in `notMadeUp`. No made-up animal sounds.
- Gentle words for young children (`docs/TONE.md`).
- Before a change lands: `node tools/three-rules.mjs` and `node tools/smoke.cjs http://localhost:8765/` (with `python3 -m http.server 8765` running). Headless numbers are not real frame rates.
- A new or changed spoken line needs a new recording (paid; KM's yes first) and its entry in `sounds/manifest.json` and `sounds/index.js`.
