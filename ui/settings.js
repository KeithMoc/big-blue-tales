// Settings for the story, all in one Settings card on the stage: voice, sounds and captions, what is on the screen,
// full screen. There is one age group, ages 5 to 7 ("young"), so it is not a choice. Remembered on this device only. Licence: MIT.
import { $, h, store } from './dom.js';
import { canSpeak, speak, stopSpeaking } from './speech.js';
import { canPlay } from './audio.js';

// [key, label, the Settings section it sits in]
const PARTS = [['voice', 'Read aloud on tap', 'sound'], ['sfx', 'Tap sounds', 'sound'], ['captions', 'Captions', 'sound'],
  ['panel', 'Story panel', 'screen'], ['actions', 'Buttons', 'screen'], ['words', 'Words on buttons', 'screen'], ['snow', 'Drifting specks', 'screen'],
  ['perf', 'Speed numbers', 'grown']];
const OFF_BY_DEFAULT = ['voice', 'perf'];
const EVERYTHING = Object.fromEntries(PARTS.map(([k]) => [k, !OFF_BY_DEFAULT.includes(k)]));
const JUST_ANIMAL = { ...EVERYTHING, panel: false, words: false, captions: false, voice: true };
const ICON_FULL = 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5', ICON_LEAVE = 'M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5';

export function createSettings() {
  const level = 'young';   // the one age group this story carries: ages 5 to 7
  let show = { ...EVERYTHING }, explore = false, saved = null, nativeFull = false, voiceWas = false;
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); };
  try {
    const m = JSON.parse(store.get('sm-show') || 'null');
    // full screen never survives a reload: come back to the switches it had put aside
    if (m) show = { ...EVERYTHING, ...(m.explore && m.saved ? m.saved : m.show) };
  } catch { /* start from the defaults */ }

  function applyLevel() { document.body.classList.add('young'); }

  function applyShow() {
    const root = document.documentElement;
    for (const [k] of PARTS) root.classList.toggle('hide-' + k, !show[k]);
    for (const b of document.querySelectorAll('[data-show]')) b.setAttribute('aria-checked', !!show[b.dataset.show]);
    const f = $('btn-full'), label = explore ? 'Leave full screen' : 'Full screen';
    f.setAttribute('aria-pressed', explore); f.setAttribute('aria-label', label);
    f.querySelector('span').textContent = label;
    f.querySelector('path').setAttribute('d', explore ? ICON_LEAVE : ICON_FULL);
    if (voiceWas && !show.voice) stopSpeaking();   // only when read-aloud itself is switched off
    voiceWas = !!show.voice;
    store.set('sm-show', JSON.stringify({ show, explore, saved }));
    emit();
  }
  for (const [k, label, group] of PARTS) {
    if ((k === 'voice' && !canSpeak) || (k === 'sfx' && !canPlay)) continue;
    const b = h('button', { class: 'sw', 'data-show': k, role: 'switch', id: 'sw-' + k }, h('span', { text: label }), h('i'));
    b.addEventListener('click', () => { show[k] = !show[k]; applyShow(); });
    $('set-' + group).append(b);
  }
  // the two shortcuts sit under "On the screen" and change only that section: voice, sounds and captions stay as chosen
  const others = () => Object.fromEntries(PARTS.filter(([, , g]) => g !== 'screen').map(([k]) => [k, show[k]]));
  $('preset-fish').addEventListener('click', () => { show = { ...JUST_ANIMAL, ...others() }; applyShow(); });
  $('preset-all').addEventListener('click', () => { show = { ...EVERYTHING, ...others() }; applyShow(); });
  const openShow = (open) => { $('showcard').hidden = !open; $('btn-show').setAttribute('aria-expanded', open); };
  $('btn-show').addEventListener('click', () => openShow($('showcard').hidden));
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#showcard, #btn-show')) openShow(false); });

  // Full screen is a shortcut: it remembers the current switches, flips to "just the animal", and puts
  // everything back when you leave.
  function setExplore(on) {
    if (on === explore) return;
    explore = on;
    if (on) { saved = { ...show }; show = { ...JUST_ANIMAL, perf: show.perf }; }
    else { show = saved ? { ...EVERYTHING, ...saved } : { ...EVERYTHING }; saved = null; }
    applyShow(); openShow(false);
    // real full screen where the browser allows it; the stripped-back layout works either way
    const el = document.documentElement;
    try {
      if (on) {
        const ask = el.requestFullscreen || el.webkitRequestFullscreen;
        const r = ask && ask.call(el);
        if (r && r.then) r.then(() => { nativeFull = true; }, () => {}); else if (ask) nativeFull = true;
      } else {
        nativeFull = false;
        const leave = document.exitFullscreen || document.webkitExitFullscreen;
        if (leave && (document.fullscreenElement || document.webkitFullscreenElement)) { const r = leave.call(document); if (r && r.catch) r.catch(() => {}); }
      }
    } catch { /* full screen refused: stay with the in-page version */ }
  }
  $('btn-full').addEventListener('click', () => setExplore(!explore));
  for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => {
    if (nativeFull && !(document.fullscreenElement || document.webkitFullscreenElement)) setExplore(false);
  });

  // one caption line, shared by every view
  let captionTimer = 0;
  function say(text, ms = 3600, { voice = true } = {}) {
    if (!text) return;
    if (voice && show.voice) speak(text);
    const c = $('caption');
    c.textContent = text; c.classList.add('show');
    c.classList.toggle('long', text.length > 60);       // a whole fact, not a shout: smaller words on a dark plate
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => c.classList.remove('show'), ms);
  }
  /** Words on the stage only: for a line that something else is already reading aloud. */
  const caption = (text, ms) => say(text, ms, { voice: false });

  /** Clear the caption and stop the voice: called whenever the animal or the view changes, so one animal's line never shows on the next. */
  function hush() { clearTimeout(captionTimer); const c = $('caption'); c.classList.remove('show'); c.textContent = ''; }

  applyLevel(); applyShow();
  return {
    get level() { return level; },
    get show() { return show; },
    get exploring() { return explore; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** words that depend on the animal in view */
    name({ noun, depthLabel }) { $('preset-fish').textContent = `Just the ${noun}`; const s = document.querySelector('#sw-depth span'); if (s) s.textContent = depthLabel; },
    say, caption, hush, setExplore, openShow,
  };
}
