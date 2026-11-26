// Read aloud, for explorers who cannot read yet. Every line is recorded ahead of time (tools/sounds.mjs): a pack
// brings its own lines, and the book's own lines come from sounds/index.js. A line is found by a hash of its words.
// If a recording will not load, the stand-in the config names takes the line (the browser's own voice, or nothing),
// so a tap is never left hanging. tools/sounds.mjs check fails the build when any line has no recording. Licence: MIT.
import { lineKey } from './line-key.js';
import { NARRATION as SHELL, OPTIONS as CONFIGURED } from '../sounds/index.js';
import { canPlay, audio, decode } from './audio.js';

// Everything about the voice that is a choice comes from sounds/sounds.config.json "runtime" (through sounds/index.js).
// The recorded voice itself is not named anywhere on the page: whichever provider and voice recorded the lines travel
// with them, so swapping them needs no change here. configureSpeech() changes the options at run time.
const OPTIONS = { recorded: true, waitMs: 2500, ...CONFIGURED, fallback: { engine: 'browser', ...(CONFIGURED.fallback || {}) } };
export function configureSpeech(o = {}) { Object.assign(OPTIONS, o, { fallback: { ...OPTIONS.fallback, ...(o.fallback || {}) } }); }

const voice = OPTIONS.fallback.engine === 'browser' && 'speechSynthesis' in window ? window.speechSynthesis : null;
export const canSpeak = !!voice || canPlay;

let pack = null, story = null, playing = null, token = 0, rowTimer = 0, rowEnd = null;
const buffers = new Map();                 // url -> Promise of a decoded AudioBuffer (one animal at a time is kept, plus the book's own lines)

function load(url) {
  if (!buffers.has(url)) { const p = decode(url); p.catch(() => buffers.delete(url)); buffers.set(url, p); }
  return buffers.get(url);
}
/** Where a line sits: in the animal in view first, then in the book's own lines. -> [level, [start, seconds]] or null */
function find(text) {
  if (!canPlay || !OPTIONS.recorded) return null;
  const key = lineKey(text);
  for (const set of [story, pack, SHELL]) for (const lv of Object.values(set?.levels || {})) if (lv.lines[key]) return [lv, lv.lines[key]];
  return null;
}
/** The recorded lines of the animal in view: { levels: { young: { url, lines: { key: [start, seconds] } }, older } }, or null. */
export function setNarration(n) { stopSpeaking(); pack = canPlay && n ? n : null; const own = new Set([SHELL, story].flatMap(s => Object.values(s?.levels || {})).map(l => l.url)); for (const u of [...buffers.keys()]) if (!own.has(u)) buffers.delete(u); }
/** The recorded lines of the story that is open (scenes/<id>/audio/narration.json via scenes/links.js loadVoice), or null when no story is. */
export function setStoryNarration(n) { stopSpeaking(); story = canPlay && n ? n : null; }
/** Fetch a reading level's audio ahead of the first tap. */
export function warmNarration(level) { try { const L = (story || pack)?.levels?.[level]; if (L && canPlay) load(L.url).catch(() => {}); } catch { /* the stand-in will do */ } }

function stopRecorded() { if (playing) { const p = playing; playing = null; p.onended = null; try { p.stop(); } catch { /* already over */ } } }
export function stopSpeaking() { token++; clearTimeout(rowTimer); const end = rowEnd; rowEnd = null; stopRecorded(); try { voice?.cancel(); } catch { /* not available here */ } end?.(false); }
export function isSpeaking() { try { return !!playing || !!rowEnd || !!voice?.speaking; } catch { return false; } }

function speakBrowser(text, done) {
  if (!voice) { done?.(); return false; }
  try {
    voice.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = OPTIONS.fallback.lang; u.rate = OPTIONS.fallback.rate;
    if (done) u.onend = u.onerror = done;
    voice.speak(u);
    return true;
  } catch { return false; }
}

export function speak(text, done) { stopSpeaking(); return start(text, done); }

/** Several things said one after another, each with a pause after it: steps = [{ say: [text, ...], ms, blend }].
 *  onStep(step, index, seconds) runs as each one starts (seconds: how long its recording plays, when that is known); done(finished) runs once, with false when something else cut in
 *  (stopSpeaking() is how anything cuts in). */
export function speakRow(steps, onStep, done) {
  stopSpeaking();
  let live = true, chained = false; const sources = [];
  rowEnd = (finished) => { live = false; for (const src of sources) { src.onended = null; try { src.stop(); } catch { /* already over */ } } done?.(finished); };
  const finish = () => { const end = rowEnd; rowEnd = null; end?.(true); };
  const rate = OPTIONS.rate || 1, wait = (ms, then) => { rowTimer = setTimeout(() => { if (live) then(); }, Math.max(1, ms / rate)); };
  // one at a time, each started when the one before ends: used when a step has no recording (the stand-in voice reads it)
  const chain = (i) => {
    chained = true;
    if (!live) return;
    if (i >= steps.length) return finish();
    const st = steps[i], texts = st.say || [];
    onStep?.(st, i);
    const part = (k) => {
      if (!live) return;
      if (k >= texts.length) return wait(st.ms || 0, () => chain(i + 1));
      start(texts[k], () => { if (live) wait(k + 1 < texts.length ? st.blend || 0 : 0, () => part(k + 1)); });
    };
    part(0);
  };
  // every step recorded in one file: the whole row is put on the audio clock at once, so a busy page cannot stretch the pauses
  const where = steps.map(st => (st.say || []).map(find)), all = where.flat();
  if (!all.length || all.some(w => !w || w[0] !== all[0][0])) { chain(0); return true; }
  try {
    const ctx = audio(), late = setTimeout(() => { if (live && !sources.length) chain(0); }, OPTIONS.waitMs);
    load(all[0][0].url).then(buf => {
      if (!live || chained) return;                     // stopped, or the stand-in already took over
      clearTimeout(late);
      let t = ctx.currentTime + 0.06, now = -1; const at = [];
      steps.forEach((st, i) => {
        at.push(t);
        where[i].forEach(([, [from, secs]], k) => {
          const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate; src.connect(ctx.destination);
          src.start(t, from, secs); sources.push(src);
          t += secs / rate + (k + 1 < where[i].length ? (st.blend || 0) / 1000 / rate : 0);
        });
        t += (st.ms || 0) / 1000 / rate;
      });
      const tick = () => {
        if (!live) return;
        while (now + 1 < at.length && at[now + 1] <= ctx.currentTime) { now++; onStep?.(steps[now], now, where[now].reduce((s, [, [, secs]]) => s + secs, 0) / rate); }
        if (ctx.currentTime >= t) return finish();
        rowTimer = setTimeout(tick, 30);
      };
      tick();
    }, () => { clearTimeout(late); if (live && !chained) chain(0); });
  } catch { chain(0); }
  return true;
}

function start(text, done) {
  const mine = token;
  const [L, at] = find(text) || [];
  if (!at) return speakBrowser(text, done);
  try {
    const ctx = audio();
    // a slow connection must not leave a tap unanswered: after waitMs the stand-in takes the line
    const late = setTimeout(() => { if (mine === token) { token++; speakBrowser(text, done); } }, OPTIONS.waitMs);
    load(L.url).then(buf => {
      clearTimeout(late);
      if (mine !== token) return;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination); if (OPTIONS.rate) src.playbackRate.value = OPTIONS.rate;
      src.onended = () => { if (playing === src) playing = null; done?.(); };
      playing = src; src.start(0, at[0], at[1]);
    }, () => { clearTimeout(late); if (mine === token) speakBrowser(text, done); });
    return true;
  } catch { return speakBrowser(text, done); }
}
