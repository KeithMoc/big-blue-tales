// Subtitles: a spoken line is shown a piece at a time (one or two short lines on screen), in step with the voice.
// chunks() cuts a line into those pieces. The same cut is used by the page and by tools/caption-cues.mjs, which
// times each piece against the recording (narration.json "cues"). Licence: MIT.

/** A line cut into pieces of at most `max` characters: whole sentences first, long ones cut at a comma or near the middle. */
export function chunks(text, max = 64) {
  const out = [];
  const cut = (s) => {
    if (s.length <= max) { out.push(s); return; }
    const mid = s.length / 2, spots = [];
    for (const m of s.matchAll(/, | and | or | with | but /g)) spots.push(m.index + (m[0].startsWith(',') ? 1 : 0));
    if (!spots.length) for (const m of s.matchAll(/ /g)) spots.push(m.index);
    const at = spots.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
    cut(s.slice(0, at).trim()); cut(s.slice(at).trim());
  };
  for (const s of String(text).split(/(?<=[.!?])\s+/)) if (s.trim()) cut(s.trim());
  return out;
}

/** When each piece starts, as a share of the whole line by length: the stand-in when no timed cues were recorded. */
export function evenCues(text, seconds) {
  const parts = chunks(text), total = parts.reduce((n, p) => n + p.length, 0) || 1;
  let at = 0;
  return parts.map(p => { const c = [+(at * seconds).toFixed(2), p]; at += p.length / total; return c; });
}
