// Times the subtitles of every recorded line against the recording itself, so each piece of a line shows while it is
// being said. For each line in scenes/<id>/audio/narration.json it cuts the words with ui/captions.js chunks(),
// finds the pauses in that stretch of audio (ffmpeg silencedetect), and puts each cut on the pause nearest to where
// its share of the words would fall. Writes levels.<level>.cues = { key: [[seconds, words], ...] }.
// Usage: node tools/caption-cues.mjs [story-id ...]   (needs ffmpeg; run after a new recording). Licence: MIT.
import fs from 'fs';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
const imp = (p) => import(pathToFileURL(process.cwd() + '/' + p).href);
const { chunks } = await imp('ui/captions.js');
const { storyLines } = await imp('ui/story-lines.js');
const { lineKey } = await imp('ui/line-key.js');

const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync('scenes').filter(d => fs.existsSync(`scenes/${d}/audio/narration.json`));
for (const id of ids) {
  const file = `scenes/${id}/audio/narration.json`, N = JSON.parse(fs.readFileSync(file, 'utf8'));
  const scene = JSON.parse(fs.readFileSync(`scenes/${id}/scene.json`, 'utf8'));
  for (const [level, L] of Object.entries(N.levels)) {
    const audio = `scenes/${id}/${L.file}`, cues = {};
    for (const { text } of storyLines(scene, level)) {
      const key = lineKey(text), at = L.lines[key]; if (!at) continue;
      const parts = chunks(text), [start, seconds] = at;
      // pauses inside this line: midpoints, in seconds from the line's start
      const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-ss', String(start), '-t', String(seconds), '-i', audio,
        '-af', 'silencedetect=noise=-32dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
      const s0 = [...log.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]), s1 = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
      const pauses = s0.map((a, i) => (a + (s1[i] ?? a)) / 2).filter(t => t > 0.3 && t < seconds - 0.3);
      const total = parts.reduce((n, p) => n + p.length, 0);
      let share = 0, last = -1; const out = [[0, parts[0]]];
      for (let k = 1; k < parts.length; k++) {
        share += parts[k - 1].length / total;
        const guess = share * seconds, left = parts.length - k - 1;
        const free = pauses.map((t, i) => [t, i]).filter(([, i]) => i > last && i < pauses.length - left);
        const best = free.sort((a, b) => Math.abs(a[0] - guess) - Math.abs(b[0] - guess))[0];
        // a pause far from where the words should be is not trusted: then the share of the words decides
        const t = best && Math.abs(best[0] - guess) < Math.max(1.2, seconds * 0.12) ? (last = best[1], best[0]) : guess;
        out.push([+Math.max(t, out[k - 1][0] + 0.4).toFixed(2), parts[k]]);
      }
      cues[key] = out;
    }
    L.cues = cues;
    console.log(`${id} ${level}: ${Object.keys(cues).length} lines timed, ${Object.values(cues).reduce((n, c) => n + c.length, 0)} subtitles`);
  }
  fs.writeFileSync(file, JSON.stringify(N));
}
