// Story view: one story from scenes/ on the stage, its words in the panel beside it, and under the words who is
// in it, what big idea it shows, where it happens and the other stories (each with its reason). One reading level:
// ages 5 to 7. Licence: MIT.
import * as THREE from 'three';
import { $, h, calm, store } from '../ui/dom.js';
import { createSceneRunner } from '../scenes/runner.js';
import { loadStories, loadVoice } from '../scenes/links.js';
import { playSfx, loopSfx, hasSfx } from '../ui/sfx.js';
import { OPTIONS } from '../sounds/index.js';
import { canSpeak, speak, stopSpeaking, setStoryNarration, warmNarration } from '../ui/speech.js';
import { beatLine } from '../ui/story-lines.js';
import { label } from '../ui/words.js';

export function createStoryView({ engine, env, settings, go }) {
  const tags = $('storytags'), spot = new THREE.Vector3();
  let active = false, stories = null, S = null, beat = null, seq = 0, tagTimer = 0;
  // a scene may name a sound for something that just happened in it (a splash): heard only with "Tap sounds" on, and only if that sound exists
  const runner = engine ? createSceneRunner({ engine, env, calm, specks: () => settings.show.snow, onBeat: (id) => showBeat(id), onCue: (id) => { if (active && settings.show.sfx && hasSfx(id)) playSfx(id); } }) : null;
  const text = (o) => o[settings.level] || o.young;

  // The voice. A story is never read out by itself and never again each time a part is picked: it is read when
  // the reader asks. Asking is the ? on the picture (with "Read aloud on tap" on, it speaks as the card opens)
  // or a Listen button, on the card and beside the words in the panel, which works whatever the switch says.
  // What is said is what is shown, in the ages 5 to 7 words (ui/story-lines.js, recorded ahead).
  let reading = null;
  const listenBtn = (id) => h('button', { class: 'pill listen', id, hidden: !canSpeak, text: label('story.listen'), onclick: () => read(reading === id ? null : id) });
  function read(id) {
    const b = S?.beats.find(x => x.id === beat);
    stopSpeaking(); reading = null;
    if (id && b && speak(beatLine(b, settings.level), () => { if (reading === id) { reading = null; syncListen(); } })) reading = id;
    syncListen();
  }
  function syncListen() { for (const el of document.querySelectorAll('.listen')) { const on = el.id === reading; el.textContent = label(on ? 'story.stop' : 'story.listen'); el.setAttribute('aria-pressed', String(on)); } }
  // a note for a play mode is read once, when it comes up, and only with "Read aloud on tap" on
  let noted = '';
  function sayNote(textNow) { if (textNow && textNow !== noted && settings.show.voice && active) { read(null); speak(textNow); } noted = textNow; }

  function showBeat(id) {
    if (!S) return;
    const b = S.beats.find(x => x.id === id); if (!b) return;
    if (id !== beat && reading) read(null);     // the voice never runs on into the next part
    if (id !== beat) timeNote('');
    beat = id;
    $('storyfact').textContent = beatLine(b, settings.level);
    if (!$('storywhy').hidden) why(true);   // an open card follows the story; a closed one stays closed
    for (const el of $('storyacts').children) if (el.dataset.beat) el.setAttribute('aria-pressed', String(el.dataset.beat === id));
  }
  // The ? on the picture: what the school is doing now and why, shown only when it is pressed.
  function why(on) {
    const b = S?.beats.find(x => x.id === beat), card = $('storywhy');
    on = !!(on && b);
    if (on) card.replaceChildren(h('b', { text: b.label }), h('span', { text: text(b) }), b.why ? h('span', { class: 'because', text: text(b.why) }) : null, h('span', { class: 'row' }, listenBtn('story-listen-why'), h('button', { class: 'pill', text: 'Close', onclick: () => why(false) })));
    if (!on && reading === 'story-listen-why') read(null);
    card.hidden = !on; syncListen(); $('story-why').setAttribute('aria-expanded', String(on));
  }
  $('story-why').addEventListener('click', () => { const open = $('storywhy').hidden; why(open); if (open && settings.show.voice) read('story-listen-why'); });
  $('story-listen').addEventListener('click', () => read(reading === 'story-listen' ? null : 'story-listen'));
  const storyBtn = (o, why) => h('button', { class: 'slink', onclick: () => go(o.id) }, h('b', { text: o.title }), h('span', { text: why }));
  const group = (title, ...kids) => { const k = kids.flat().filter(Boolean); return k.length ? h('section', { class: 'sgroup' }, h('h3', { text: title }), ...k) : null; };

  function render() {
    if (!S || !stories) return;
    const L = stories.forScene(S.id);
    $('storykicker').textContent = `Story · ${L.habitat.name}`;
    $('storytitle').textContent = S.title; $('storyhead-title').textContent = S.title;
    $('storyhead-kicker').textContent = `Story · ${L.habitat.name}`;
    // the parts of the story, as big buttons on the stage (the one place they are: the panel tells, the buttons choose)
    $('storyacts').replaceChildren($('story-why'), ...S.beats.map(b => h('button', { class: 'act', 'data-beat': b.id, 'aria-pressed': 'false', text: b.label, onclick: () => { why(false); runner?.beat(b.id); showBeat(b.id); } })));
    showBeat(beat || S.beats[0].id);
    renderPlay();
    $('storylinks-out').replaceChildren(...[
      group('Who is in this story', L.cast.map(c => h('p', { class: 'splain' }, h('b', { text: c.name }), ' ' + text(L.next.find(l => l.animal === c.animal) || { young: `${c.role[0].toUpperCase()}${c.role.slice(1)}.` })))),
      group('The big idea', L.ideas.map(i => h('p', { class: 'splain' }, h('b', { text: i.name }), ' ' + text(i)))),
      group('Where it happens', h('p', { class: 'splain' }, h('b', { text: L.habitat.name }), ' ' + text(L.habitat))),
      group('More stories', L.more.map(m => storyBtn(m.scene, m.why))),
    ].filter(Boolean));
    $('storysources').replaceChildren(...Object.values(S.sources).map(s => h('li', {}, h('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.name }))));
    $('storyleft').replaceChildren(...(S.notMadeUp || []).map(t => h('li', { text: t })));
  }

  // Play: how many fish (true to life at every size), and pretend colours behind a Play switch that is off
  // when a story opens. While pretend colours show, a note on the stage says what the real animal looks like.
  let playing = false;
  const sceneNow = () => runner?.current?.scene;
  function seg(box, cfg, ids, current, pick) {
    const opts = (cfg?.options || []).filter(o => ids?.includes(o.id));
    box.hidden = opts.length < 2; box.setAttribute('aria-label', cfg?.label || '');
    box.replaceChildren(...opts.map(o => h('button', { role: 'radio', 'data-pick': o.id, 'aria-checked': String(o.id === current), text: o.label, onclick: () => { pick(o.id); renderPlay(); } })));
  }
  // Time of day: the whole picture moves to another light. The line for the time picked shows for a while (and is
  // read once with "Read aloud on tap" on); where it says what the animals do then, scene.json names its source.
  let timeTimer = 0;
  function timeNote(words) {
    const n = $('storytime'); clearTimeout(timeTimer);
    n.textContent = words; n.hidden = !words;
    if (words) { timeTimer = setTimeout(() => timeNote(''), 12000); if (settings.show.voice && active) { read(null); speak(words); } }
    if (just) justNote(words);                                  // the line below the picture is hidden in Just the fish
  }
  function renderPlay() {
    const sc = sceneNow(), P = S?.play || {};
    seg($('storysizes'), P.sizes, sc?.sizes, sc?.size, (id) => sc.setSize(id));
    seg($('storytimes'), S?.times, sc?.times, sc?.time, (id) => { if (sc.setTime(id)) timeNote(text(S.times.options.find(o => o.id === id))); });
    const canPlay = !!(P.colours && sc?.colours?.length > 1);
    const sw = $('story-play'); sw.hidden = !canPlay; sw.setAttribute('aria-checked', String(playing));
    if (canPlay && playing) seg($('storycolours'), P.colours, sc.colours, sc.colour, (id) => sc.setColours(id)); else $('storycolours').hidden = true;
    if (canPlay && playing && sc.trails) seg($('storytrails'), P.trails, sc.trails, sc.trail, (id) => sc.setTrail(id)); else $('storytrails').hidden = true;
    $('story-just').hidden = !(canPlay && playing);
    $('storytoys').hidden = !(canPlay && playing);
    const pretend = canPlay && playing && sc.colour !== 'real', note = $('storynote');
    note.textContent = pretend ? text(P.colours.note) : (canPlay && playing && P.touch ? text(P.touch) : '');
    note.hidden = !note.textContent;
    sayNote(note.textContent);
  }
  const syncTurn = () => { if (engine) engine.controls.enableRotate = !(active && playing && sceneNow()?.draw); };
  // Sound: the sea is heard while a story is open (it follows the "Tap sounds" switch), and music plays only when the
  // visitor switches it on. Which sounds, and how loud, are data: sounds/index.js (SFX and OPTIONS.story).
  const SOUND = OPTIONS.story || {}; let sea = null, music = null;
  const wantMusic = () => store.get('sm-music') === '1' && hasSfx('story-music');
  function syncSound() {
    const on = active && !document.hidden, m = on && wantMusic(), s = on && settings.show.sfx;
    if (m && !music) music = loopSfx('story-music', SOUND.music ?? 0.5, SOUND.fadeMs); else if (!m && music) { music.stop(SOUND.fadeMs); music = null; }
    const loud = m ? SOUND.seaUnderMusic ?? 0.25 : SOUND.sea ?? 0.5;
    if (s && !sea) sea = loopSfx('story-sea', loud, SOUND.fadeMs); else if (!s && sea) { sea.stop(SOUND.fadeMs); sea = null; } else sea?.level(loud, SOUND.fadeMs);
    const sw = $('story-music'); sw.hidden = !hasSfx('story-music'); sw.setAttribute('aria-checked', String(wantMusic()));
  }
  const cue = (id) => { if (settings.show.sfx) playSfx(id); };
  $('story-music').addEventListener('click', () => { store.set('sm-music', wantMusic() ? '0' : '1'); syncSound(); });
  document.addEventListener('visibilitychange', syncSound);
  // Just the fish: Play fills the screen and every other button goes away but one, in the corner. It opens a small
  // tray with the Play choices (trail, colours, time of day) and the way back to the story. The choices
  // are the same buttons as below the picture, moved into the tray and back, so there is one of each. A wide screen
  // starts with the tray open; a narrow one (a phone) starts with only the button. The line that says what is
  // pretend still shows for a few seconds on the way in.
  let just = false;
  const TRAY = ['storytrails', 'storycolours', 'storytimes'];
  const HOME = { storytrails: ['storytoys', 'story-just'], storycolours: ['storytoys', 'storytrails'], storytimes: ['storyday', null] };
  const wide = () => (engine?.canvas?.clientWidth || innerWidth) > 640;
  function tray(open) {
    $('justtray').hidden = !open; $('story-more').setAttribute('aria-expanded', String(open));
  }
  function justNote(words) {
    const n = $('storyjustnote'); n.textContent = words; n.hidden = true;
    if (words) { void n.offsetWidth; n.hidden = false; }     // shown again from the start of its fade
  }
  function justPlay(on) {
    if (on === just) return;
    just = on; document.documentElement.classList.toggle('just-play', on);
    $('justmenu').hidden = !on;
    if (on) { const exit = $('story-exit'); for (const id of TRAY) $('justtray').insertBefore($(id), exit); }
    else for (const id of TRAY) { const [box, before] = HOME[id]; $(box).insertBefore($(id), before ? $(before) : null); }
    tray(on && wide());
    justNote(on ? $('storynote').textContent : '');
    if (settings.exploring !== on) settings.setExplore(on);
    engine?.resize?.();
  }
  $('story-just').addEventListener('click', () => justPlay(true));
  $('story-exit').addEventListener('click', () => justPlay(false));
  $('story-more').addEventListener('click', () => tray($('justtray').hidden));
  // on a narrow screen the open tray covers the water: touching the water closes it
  engine?.canvas?.addEventListener('pointerdown', () => { if (just && !wide()) tray(false); });
  $('story-play').addEventListener('click', () => {
    playing = !playing;
    if (!playing) { sceneNow()?.setColours?.('real'); sceneNow()?.draw?.('clear'); }   // Play off always puts the real animal back
    syncTurn();
    renderPlay();
  });
  // Play on: a tap on the water moves the fish near it out of the way, and a drag draws a line the school swims
  // along. Turning the view is off while Play is on (zooming still works); Play off gives it back.
  if (engine) {
    let down = null, stroke = false; const ray = new THREE.Raycaster(), at = new THREE.Vector2(), cv = engine.canvas;
    const aim = (e) => { const r = cv.getBoundingClientRect(); at.set((e.clientX - r.left) / r.width * 2 - 1, 1 - (e.clientY - r.top) / r.height * 2); ray.setFromCamera(at, engine.camera); return ray.ray; };
    const mine = () => active && playing && sceneNow();
    cv.addEventListener('pointerdown', (e) => { down = e.isPrimary === false ? null : [e.clientX, e.clientY, performance.now(), e.pointerId]; stroke = false; });
    cv.addEventListener('pointermove', (e) => {
      const sc = mine(); if (!sc?.draw || !down || e.pointerId !== down[3]) return;
      if (!stroke) { if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8) return; stroke = true; const r = aim(e); sc.draw('start', r.origin, r.direction); }
      const r = aim(e); sc.draw('move', r.origin, r.direction);
    });
    const up = (e) => {
      const sc = mine(), d = down; down = null;
      if (!sc || !d) return;
      if (stroke) { stroke = false; sc.draw?.('end'); cue('story-line'); return; }
      if (e.type !== 'pointerup' || !sc.touch || performance.now() - d[2] > 400) return;
      const r = aim(e); sc.touch(r.origin, r.direction); cue('story-dart');
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }
  // name tags that follow something in the scene, during the part of the story that talks about it
  function placeTags() {
    const live = runner?.current, list = live?.scene.labels?.() || [], r = engine.canvas.getBoundingClientRect();
    for (const l of list) {
      let el = tags.querySelector(`[data-tag="${l.id}"]`);
      if (!el) { el = h('span', { class: 'stag', 'data-tag': l.id, text: S.labels?.[l.id] || l.id }); tags.append(el); }
      spot.copy(l.at); spot.y += l.lift || 0; spot.project(engine.camera);
      const on = l.when === beat && spot.z < 1;
      el.hidden = !on;
      if (on) el.style.transform = `translate(-50%, -100%) translate(${((spot.x + 1) / 2 * r.width).toFixed(1)}px, ${((1 - spot.y) / 2 * r.height).toFixed(1)}px)`;
    }
    for (const el of tags.children) if (!list.some(l => l.id === el.dataset.tag)) el.hidden = true;
  }

  async function open(id) {
    const mine = ++seq; active = true;
    $('storyfact').textContent = 'The story is on its way.';
    try {
      stories = await loadStories();
      if (mine !== seq) return;
      S = stories.get(id) || stories.get(store.get('sm-story')) || stories.scenes[0];
      store.set('sm-story', S.id);
      document.title = S.title;
      document.documentElement.dataset.env = 'bright';
      beat = null; playing = false; noted = ''; timeNote(''); syncTurn(); tags.replaceChildren();
      const voice = await loadVoice(S.id); if (mine !== seq) return;
      setStoryNarration(voice); if (settings.show.voice) warmNarration(settings.level);
      $('story-listen').hidden = !canSpeak; render();
      if (!runner) return;
      engine.canvas.setAttribute('aria-label', `${S.title}. Drag or use the arrow keys to look around. Plus and minus zoom.`);
      await runner.open(S.id);
      if (mine !== seq) return;
      renderPlay(); syncSound();
      clearInterval(tagTimer); tagTimer = setInterval(placeTags, 50);
    } catch (e) { console.error(e); if (mine === seq) $('storyfact').textContent = 'This story could not be opened.'; }
  }
  function close() {
    if (!active) return;
    justPlay(false); active = false; playing = false; timeNote(''); syncTurn(); syncSound(); seq++;
    clearInterval(tagTimer); tags.replaceChildren();
    runner?.close(); read(null); setStoryNarration(null);
  }
  settings.onChange(() => { if (just && !settings.exploring) justPlay(false); if (active) { if (reading) read(null); render(); syncSound(); } });   // Esc out of full screen leaves Just the fish too
  $('story-home').addEventListener('click', () => runner?.home());

  return { open, close, get current() { return S; }, get beat() { return beat; }, runner, stories: loadStories };
}
