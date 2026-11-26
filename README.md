# Big Blue Tales

Friendly 3D sea stories for kids, with narration, sounds and music. Every line a child reads is tied to a quoted
source. One story per folder on a shared story kit. Non-commercial and educational.

The first story is **A school of anchovies**: a school of northern anchovies swims together, turns in a ring, makes a
ball, and a California sea lion loops up through it. Pick sunrise, day, sunset or night, and a school, a big school
or a huge school. Switch on Play for pretend colours and a line of light: tap the water to move the fish, or draw a
line for them to follow. Draw it up to the surface and they leap out with a splash (pretend, and the page says so).
"Just the fish" fills the screen with only the water and a menu button. Every part can be read aloud.

The stories are written for children aged 5 to 7. The page is plain ES modules and three.js r180 in `vendor/`, with
no bundler and no build step.

## Run it

```
python3 -m http.server 8765        # then open http://localhost:8765/ (the last story opened, or the first one) or http://localhost:8765/#anchovy-school
```

Opening `index.html` straight from the disk (`file://`) will not work, because browsers refuse ES modules there.

## Check it

```
node tools/story-check.mjs       # every part has a source with a quote or a signed dossier fact, and no "never" word for children
node tools/story-voice.mjs       # every line a story can read aloud has a recording, and every sound is in sounds/manifest.json
node tools/three-rules.mjs       # the three.js rules a program can read: shader homes, no pow of negatives, no Math.random, dispose
npm run check                    # the three above, in that order; none needs a browser

npm install && npx playwright install chromium       # once: playwright, used only by the browser check
node tools/smoke.cjs http://localhost:8765/ shots    # with the server running: see below
```

`tools/smoke.cjs` opens the page in headless Chromium at a desktop and a phone size. At the desktop size it steps
through the first story's parts, times of day, Listen, Music, Play, a drawn line and Just the fish, opens every
story by its address, and counts triangles and draw calls for every story on the `low`, `mid` and `high` tiers
(every group size, and the biggest group with the guest animal in the picture) against the story's budget. At the
phone size it only opens the page and saves a picture. It fails on any page error, failed request, a first-story
line with no recording, or a count over budget. Headless Chromium draws in software, so it gives no real frame rate.

## How it fits together

```mermaid
flowchart LR
  index["scenes/index.json<br/>the list of stories, big ideas, places"] --> app["app.js<br/>#story-id picks the story"]
  app --> view["views/story.js<br/>buttons, panel, voice, sound, Play"]
  view --> runner["scenes/runner.js"]
  runner --> story["scenes/&lt;id&gt;/<br/>scene.json + scene.js + audio/"]
  story --> kit["scenes/kit/<br/>sea, sky, time of day, school, splash, guest"]
  story -- "ctx.mount(id)" --> guest["animals/&lt;id&gt;/<br/>a guest animal's model and dossier"]
  view --> sounds["sounds/<br/>shared sea sound, splash, taps, music"]
```

| Folder | What |
| --- | --- |
| `scenes/<id>/` | One story: `scene.json` (every word, its sources, what the picture leaves out), `scene.js` (what moves), `audio/` (its voice) |
| `scenes/kit/` | The story kit: one sea (water, surface, sky, light shafts), time of day, school, far schools, trail, splash, guest |
| `scenes/index.json` | The stories in order, plus the big ideas and places they share |
| `animals/<id>/` | Guest animals a story mounts. Today that is the California sea lion: `pack.js`, `model/`, its signed fact `dossier.json`, `notes.md`, `credits.json` |
| `views/`, `ui/`, `core/`, `kit/` | The story view; settings, voice and sound playback; engine, water presets, quality tiers, pack loader; the model kit |
| `sounds/` | Sounds every story shares (`index.js`), and the maker, prompt and licence of every sound and recorded line (`manifest.json`) |
| `tools/` | The four checks above |
| `docs/` | Story guide (`STORIES.md`), three.js standard (`THREEJS.md`), tone guide (`TONE.md`), the story kit decision (`adr/`), what was learned (`knowledge/`) |

## Add a story

Read `docs/STORIES.md` first. In short:

1. **Facts first.** Gather the sources before any 3D. Every part in `scene.json` needs a source with a quote, or a
   fact from a guest animal's signed dossier. If a behaviour has no source, leave it out or say so in `notMadeUp`.
   No made-up animal sounds.
2. **Make the folder** `scenes/<new-id>/` with `scene.json` and `scene.js`. Copy `scenes/anchovy-school/` as the
   template. Write only ages 5 to 7 words (`young`), in the gentle tone of `docs/TONE.md`.
3. **Build on the kit.** `createSeaPlace` gives the water, surface, sky and light. Crowds, splash and guests come
   from `scenes/kit/`. Shader code stays in `scenes/kit/`, and every scene has a `high` / `mid` / `low` table that
   fits its budget (`docs/THREEJS.md`).
4. **A guest animal** goes in `animals/<id>/`: a `pack.js` that exports `animal` and `create`, keeping the contract
   at the top of `core/loader.js`, with its model in `model/`, a signed `dossier.json` for any fact a story cites,
   and its `credits.json`. The story mounts it with `ctx.mount('<id>')`.
5. **List the story** in `scenes/index.json`, along with any new big idea or place. It then opens at `#<new-id>`, and
   every story shows the others under "More stories", each with its reason.
6. **Record the voice.** `node tools/story-voice.mjs <new-id>` lists the lines and their keys. The recordings go in
   `scenes/<new-id>/audio/narration.young.mp3`, with one `[start, seconds]` per key in `audio/narration.json`, and
   one entry per line in `sounds/manifest.json`. Recording is paid (ElevenLabs, voice Bronwyn, model eleven_v4,
   the same voice as every line so far), so ask KM first. Until the recordings exist, the browser's own voice reads
   the lines.
7. **Check it** with the four commands above, and add what you learned to `docs/knowledge/`.

## Rules every story keeps

- **One age group:** ages 5 to 7. There is no age choice in Settings.
- **Facts first:** sources with quotes in `scene.json`, and anything left out or made up listed in `notMadeUp`.
- **Gentle words**, with no hunting or violent language (`docs/TONE.md`).
- **Honest sound:** generated sounds and voices are labelled as generated in `sounds/manifest.json`.
- **Non-commercial and educational.** Licences are in `NOTICE.md`.

## Not checked

- Nobody has listened to the recorded lines yet.
- No frame has run on a real phone or tablet, or in Safari: every speed number here is a triangle or draw-call
  count, not a frame rate.
- How it looks: no tool judges the picture. `tools/smoke.cjs` saves screenshots for a person to look at.
- The phone layout is only opened and photographed by the browser check, not stepped through.
