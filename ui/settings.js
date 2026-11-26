// Settings for the story: the For grown-ups card (tap sounds, reading each part aloud; views/story.js adds the
// sources), and full screen, which "Just the fish" asks for. There is one age group, ages 5 to 7 ("young"), so it is not a choice. Remembered on this device only. Licence: MIT.
import { $, h, store } from './dom.js';
import { canSpeak, stopSpeaking } from './speech.js';
import { canPlay } from './audio.js';

// The two switches a grown-up may want, in the Settings card: [key, label]. Everything else on the screen is always on;
// Full screen and "Just the fish" put the story panel aside for a while.
// [key, label, section]: "all" is for both Learn and Play; "learn" only matters in Learn.
const PARTS = [['sfx', 'Sounds when you tap', 'all'], ['voice', 'Read each part aloud when it is tapped', 'learn']];
// panel, actions, words and snow are not switches any more (always on); they stay as classes the page can read
const EVERYTHING = { sfx: true, voice: false, panel: true, actions: true, words: true, snow: true };
const JUST_FISH = { ...EVERYTHING, panel: false, voice: true };

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
    /** one switch, as its button in the Grown-ups card would set it */
    set(k, v) { if (show[k] !== !!v) { show[k] = !!v; applyShow(); } },
  };
}
