// Settings for the story: a small Settings card for grown-ups (tap sounds, reading each part aloud), and full screen. There is one age group, ages 5 to 7 ("young"), so it is not a choice. Remembered on this device only. Licence: MIT.
import { $, h, store } from './dom.js';
import { canSpeak, stopSpeaking } from './speech.js';
import { canPlay } from './audio.js';

// The two switches a grown-up may want, in the Settings card: [key, label]. Everything else on the screen is always on;
// Full screen and "Just the fish" put the story panel aside for a while.
const PARTS = [['sfx', 'Sounds when you tap'], ['voice', 'Read each part aloud when it is tapped']];
// panel, actions, words and snow are not switches any more (always on); they stay as classes the page can read
const EVERYTHING = { sfx: true, voice: false, panel: true, actions: true, words: true, snow: true };
const JUST_FISH = { ...EVERYTHING, panel: false, voice: true };
const ICON_FULL = 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5', ICON_LEAVE = 'M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5';

export function createSettings() {
  const level = 'young';   // the one age group this story carries: ages 5 to 7
  let show = { ...EVERYTHING }, explore = false, saved = null, nativeFull = false, voiceWas = false;
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); };
  try {
    const m = JSON.parse(store.get('sm-show') || 'null');
    // full screen never survives a reload: come back to the switches it had put aside
    // only the two switches are kept from an earlier visit; anything else saved then is set aside
    if (m) { const was = (m.explore && m.saved ? m.saved : m.show) || {}; show = { ...EVERYTHING, sfx: was.sfx ?? true, voice: !!was.voice }; }
  } catch { /* start from the defaults */ }

  function applyLevel() { document.body.classList.add('young'); }

  function applyShow() {
    const root = document.documentElement;
    for (const k of Object.keys(EVERYTHING)) root.classList.toggle('hide-' + k, !show[k]);
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
  for (const [k, label] of PARTS) {
    if ((k === 'voice' && !canSpeak) || (k === 'sfx' && !canPlay)) continue;
    const b = h('button', { class: 'sw', 'data-show': k, role: 'switch', id: 'sw-' + k }, h('span', { text: label }), h('i'));
    b.addEventListener('click', () => { show[k] = !show[k]; applyShow(); });
    $('set-grown').append(b);
  }
  const openShow = (open) => { $('showcard').hidden = !open; $('btn-show').setAttribute('aria-expanded', open); };
  $('btn-show').addEventListener('click', () => openShow($('showcard').hidden));
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#showcard, #btn-show')) openShow(false); });

  // Full screen is a shortcut: it remembers the current switches, flips to "Just the fish", and puts
  // everything back when you leave.
  function setExplore(on) {
    if (on === explore) return;
    explore = on;
    if (on) { saved = { ...show }; show = { ...JUST_FISH, sfx: show.sfx }; }
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


  applyLevel(); applyShow();
  return {
    get level() { return level; },
    get show() { return show; },
    get exploring() { return explore; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    setExplore, openShow,
  };
}
