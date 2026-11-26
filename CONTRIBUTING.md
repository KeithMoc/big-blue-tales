# Contributing

Thank you for helping. Big Blue Tales is a set of friendly 3D sea stories for children aged 5 to 7, and it is
non-commercial and educational. Every change keeps it true, gentle and easy to use.

## Before you start

- Read `README.md` ("For contributors") for how to run and check the site, and `AGENTS.md` for the hard rules.
  They apply to people and coding agents alike.
- Changing a story? Read `docs/STORIES.md`. Touching anything 3D? Read `docs/THREEJS.md`. Writing words a child
  will see or hear? Read `docs/TONE.md`.
- For a new story or a big change, open an issue first so we can agree on the facts and the plan.

## The rules that matter most

1. **Facts first.** Every line a child reads or hears needs a source with an https link and a quote in the story's
   `scene.json`. No source, no line. Pretend parts are labelled on the page and in `notMadeUp`.
2. **Gentle words** for ages 5 to 7, with no violent or frightening language.
3. **No fake animal sounds.** An animal's voice is a real, licensed recording or nothing.
4. **Recorded voices cost money.** Please don't change a recorded line's words without asking in an issue first.
   A new line is read by the browser's own voice until it is recorded.
5. **Licences travel with the files.** New sounds go in `sounds/manifest.json`, a guest animal has `credits.json`,
   and nothing is copied in without a licence that allows it (see `NOTICE.md`).

## Sending a change

1. Fork the repository and make a branch.
2. Run the checks. All of them must pass:

   ```
   npm run check
   npm install && npx playwright install chromium   # once
   node tools/smoke.cjs --files shots
   node tools/fit.cjs --files
   ```

3. Open a pull request that says what changed, why, and what you could not check (for example a real phone, Safari,
   or listening to a recording). Headless Chromium gives no real frame rate, so please don't quote one.

## Licence

Code you contribute is under the MIT licence in `LICENSE`. Words, facts and media are under the licences listed in
`NOTICE.md`.
