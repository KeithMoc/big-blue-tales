// Read aloud, for children who cannot read yet. Every line of a story is recorded ahead of time into its
// scenes/<id>/audio/narration.young.mp3; scenes/links.js loadVoice hands this file where each line sits. A line is
// found by a hash of its words (ui/line-key.js). If a line has no recording, or the recording will not load in time,
// the browser's own voice reads it (OPTIONS.fallback in sounds/index.js), so a tap is never left hanging.
// tools/story-voice.mjs fails when a line has no recording. Licence: MIT.
import { lineKey } from './line-key.js';
import { OPTIONS as CONFIGURED } from '../sounds/index.js';
import { canPlay, audio, decode } from './audio.js';

// Everything about the voice that is a choice comes from OPTIONS in sounds/index.js. The recorded voice itself is not
// named anywhere on the page: whichever voice recorded the lines travels with them, so swapping it needs no change here.
const OPTIONS = { recorded: true, waitMs: 2500, ...CONFIGURED, fallback: { engine: 'browser', ...(CONFIGURED.fallback || {}) } };

const voice = OPTIONS.fallback.engine === 'browser' && 'speechSynthesis' in window ? window.speechSynthesis : null;
export const canSpeak = !!voice || canPlay;

let story = null, playing = null, token = 0;
const buffers = new Map();                 // url -> Promise of a decoded AudioBuffer

function load(url) {
  if (!buffers.has(url)) { const p = decode(url); p.catch(() => buffers.delete(url)); buffers.set(url, p); }
  return buffers.get(url);
}
/** Where a line sits in the open story's recording. -> [level, [start, seconds]] or null */
function find(text) {
  if (!canPlay || !OPTIONS.recorded) return null;
  const key = lineKey(text);
  for (const lv of Object.values(story?.levels || {})) if (lv.lines[key]) return [lv, lv.lines[key]];
  return null;
}
/** The recorded lines of the story that is open: { levels: { young: { url, lines: { key: [start, seconds] } } } }
 *  (scenes/<id>/audio/narration.json via scenes/links.js loadVoice), or null when no story is. */
export function setStoryNarration(n) { stopSpeaking(); story = canPlay && n ? n : null; }
/** Fetch a reading level's audio ahead of the first tap. */
export function warmNarration(level) { try { const L = story?.levels?.[level]; if (L && canPlay) load(L.url).catch(() => {}); } catch { /* the stand-in will do */ } }

function stopRecorded() { if (playing) { const p = playing; playing = null; p.onended = null; try { p.stop(); } catch { /* already over */ } } }
export function stopSpeaking() { token++; stopRecorded(); try { voice?.cancel(); } catch { /* not available here */ } }

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
