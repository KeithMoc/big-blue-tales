// Every line a story can read aloud (ages 5 to 7), with the key it is filed under and whether it has a recording.
// Usage: node tools/story-voice.mjs [story id ...]   (no id = every story in scenes/index.json)
// Exits 1 when a line has no recording, so a new or changed line is never left to the browser's voice by accident.
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
console.log(missing ? `\n${missing} line(s) have no recording.` : '\nEvery line has a recording.');
process.exit(missing ? 1 : 0);
