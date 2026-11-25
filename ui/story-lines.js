// The words a story can read aloud, in exactly the words the page will ask for: the story view (views/story.js)
// and the recording tools (tools/narration-lines.mjs) both take them from here, so they can never drift apart.
// A part is read as its line and then its reason; the note for a play mode and the line for a time of day are read
// as they are shown. Licence: MIT.
/** What is said for one part of a story at one reading level: what the animals are doing, then why. */
export const beatLine = (b, level) => b.why?.[level] ? `${b[level]} ${b.why[level]}` : b[level];
/** [{ where, text }] for a scene.json: `where` is beat:<id>, time:<id> or play:<key>. */
export function storyLines(scene, level) {
  const out = [], seen = new Set();
  const add = (where, text) => { if (text && !seen.has(text)) { seen.add(text); out.push({ where, text }); } };
  for (const b of scene.beats || []) add(`beat:${b.id}`, beatLine(b, level));
  for (const o of scene.times?.options || []) add(`time:${o.id}`, o[level]);
  add('play:colours', scene.play?.colours?.note?.[level]);
  add('play:touch', scene.play?.touch?.[level]);
  return out;
}
