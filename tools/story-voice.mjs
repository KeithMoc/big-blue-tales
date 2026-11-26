// Every line a story can read aloud (ages 5 to 7), with the key it is filed under and whether it has a recording.
// Usage: node tools/story-voice.mjs [story id ...]   (no id = every story in scenes/index.json)
// Exits 1 when a line has no recording, so a new or changed line is never left to the browser's voice by accident,
// or when a recorded line or a sound file has no entry in sounds/manifest.json (or an entry names a file that is not there).
// Recording is paid (ElevenLabs, voice Bronwyn, model eleven_v4, the same as every line so far): ask KM first.
// Licence: MIT.
import { readFileSync, existsSync } from 'node:fs';
import { storyLines } from '../ui/story-lines.js';
import { lineKey } from '../ui/line-key.js';

const root = new URL('../scenes/', import.meta.url);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : JSON.parse(readFileSync(new URL('index.json', root))).scenes;
let missing = 0;
for (const id of ids) {
  const scene = JSON.parse(readFileSync(new URL(`${id}/scene.json`, root)));
  const voiceAt = new URL(`${id}/audio/narration.json`, root);
  const have = existsSync(voiceAt) ? JSON.parse(readFileSync(voiceAt)).levels?.young?.lines || {} : {};
  const lines = storyLines(scene, 'young');
  console.log(`\n${id}: ${lines.length} lines`);
  for (const l of lines) {
    const key = lineKey(l.text), ok = !!have[key];
    if (!ok) missing++;
    console.log(`  ${ok ? 'recorded' : 'MISSING '}  ${key}  ${l.where.padEnd(14)} ${l.text}`);
  }
}
// every recorded line and every sound file has its entry in sounds/manifest.json (maker, licence, credit), and back
const manifest = JSON.parse(readFileSync(new URL('../sounds/manifest.json', import.meta.url))).sounds;
let unlisted = 0;
for (const id of ids) {
  const voiceAt = new URL(`${id}/audio/narration.json`, root);
  const keys = existsSync(voiceAt) ? Object.keys(JSON.parse(readFileSync(voiceAt)).levels?.young?.lines || {}) : [];
  for (const k of keys) if (!manifest.some(s => s.id === `story-${id}/narration/young/${k}`)) { unlisted++; console.log(`  NO MANIFEST ENTRY  ${id} line ${k}`); }
}
for (const s of manifest) if (!existsSync(new URL(`../${s.file}`, import.meta.url))) { unlisted++; console.log(`  MISSING FILE  ${s.file} (${s.id})`); }
console.log(missing ? `\n${missing} line(s) have no recording.` : '\nEvery line has a recording.');
console.log(unlisted ? `${unlisted} problem(s) between the recordings and sounds/manifest.json.` : 'Every recording and sound file is in sounds/manifest.json.');
process.exit(missing || unlisted ? 1 : 0);
