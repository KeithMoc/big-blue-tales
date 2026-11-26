// Short sounds for taps, and the looping sea and music. Which sound, which taps and how loud all come from
// sounds/index.js (SFX and OPTIONS): this file names none of them. Licence: MIT.
import { SFX, OPTIONS } from '../sounds/index.js';
import { canPlay, audio, decode } from './audio.js';
const buffers = new Map();
const load = (id) => { if (!buffers.has(id)) { const p = decode(SFX[id].url); p.catch(() => buffers.delete(id)); buffers.set(id, p); } return buffers.get(id); };
export const hasSfx = (id) => canPlay && !!SFX[id];
export function playSfx(id) {
  if (!canPlay || !SFX[id]) return;
  try {
    const ctx = audio();
    load(id).then(buf => { const s = ctx.createBufferSource(), g = ctx.createGain(); g.gain.value = OPTIONS.sfx?.volume ?? 1; s.buffer = buf; s.connect(g).connect(ctx.destination); s.start(); }, () => {});
  } catch { /* no sound here: taps still work */ }
}
/** A long sound that goes round and round until it is stopped (the sea in a story, music). It comes in and goes
 *  out gently. -> { level(volume, ms), stop(ms) }, or null where there is no such sound. */
export function loopSfx(id, volume = 1, fadeMs = 800) {
  if (!hasSfx(id)) return null;
  try {
    const ctx = audio(), g = ctx.createGain(); let src = null, over = false;
    g.gain.value = 0; g.connect(ctx.destination);
    const level = (v, ms = fadeMs) => { const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(v, t + ms / 1000); };
    load(id).then(buf => { if (over) return; src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      src.loopStart = 0.05; src.loopEnd = Math.max(0.1, buf.duration - 0.06);   // an mp3 decodes with a sliver of silence at each end: go round inside it
      src.connect(g); src.start(); level(volume); }, () => {});
    // a page opened from a link has had no tap yet, and a browser keeps it silent until one comes
    const wake = () => { if (!over) audio(); };
    document.addEventListener('pointerdown', wake, { once: true, capture: true });
    return { level, stop(ms = fadeMs) { if (over) return; over = true; level(0, ms); setTimeout(() => { try { src?.stop(); } catch { /* never started */ } g.disconnect(); }, ms + 80); } };
  } catch { return null; }
}
/** Listens for the taps each sound names. `enabled` is asked on every tap, so the switch works at once. */
export function bindSfx(enabled) {
  if (!canPlay) return;
  const events = new Set(Object.values(SFX).flatMap(s => Object.keys(s.on || {})));
  for (const ev of events) document.addEventListener(ev, (e) => {
    if (!enabled() || !(e.target instanceof Element)) return;
    for (const [id, s] of Object.entries(SFX)) if (s.on?.[ev] && e.target.closest(s.on[ev])) { playSfx(id); return; }
  }, true);
  // fetch them on the first touch of the page, so the first sound is not late
  document.addEventListener('pointerdown', () => { if (enabled()) for (const id of Object.keys(SFX)) if (!SFX[id].bed) load(id).catch(() => {}); }, { once: true, capture: true });
}
