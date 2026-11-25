// A school of anchovies: the page's entry. One story on one engine with one set of settings.
// Taken from the Sea Monsters A to Z book (main df4fd65): the same engine, story kit and story view, without the
// book's animal pages, alphabet, shared sea, depth chart, phonics or speed test. Licence: MIT.
import { $, h } from './ui/dom.js';
import { createSettings } from './ui/settings.js';
import { createEngine } from './core/engine.js';
import { createEnvironment } from './core/env.js';
import { initDevice } from './core/device.js';
import { loadFonts } from './core/fonts.js';
import { createStoryView } from './views/story.js';
import { bindSfx } from './ui/sfx.js';

loadFonts();
const stage = $('stage');
const settings = createSettings();
bindSfx(() => settings.show.sfx);   // which taps make which sound is data: sounds/index.js
const engine = createEngine(stage, $('view'));
if (!engine) stage.append(h('p', { class: 'nogl', text: 'This device cannot show the 3D picture. You can still read the story beside it.' }));
const env = engine ? createEnvironment(engine) : null;
const device = initDevice(engine);          // the quality tier, and the step the engine starts on

const storyView = createStoryView({ engine, env, settings });
engine?.resize();
storyView.open('anchovy-school');

// A lost GPU context: say so kindly, and open the story again when it returns. A tablet short of memory can take the
// context away at any time; most give it back within a second. After 4 seconds, offer a tap that reloads the page.
if (engine) {
  const paused = $('paused'), again = $('btn-again');
  let waiting = 0;
  engine.onLost(() => {
    storyView.close();
    paused.hidden = false; again.hidden = true;
    clearTimeout(waiting);
    waiting = setTimeout(() => { again.hidden = false; }, 4000);
  });
  engine.onRestored(() => { clearTimeout(waiting); paused.hidden = true; storyView.open('anchovy-school'); });
  again.addEventListener('click', () => location.reload());
}

// Speed numbers (Settings > Speed numbers)
const perf = $('perf');
setInterval(() => {
  if (!engine || !settings.show.perf) return;
  const s = engine.stats();
  perf.textContent = `${s.fps} fps   quality ${5 - s.step}/5\n${s.triangles.toLocaleString('en')} triangles\n${s.calls} draw calls\n${s.geometries} shapes, ${s.textures} textures in memory`;
}, 500);

// handles for checking the page from a test script (tools/smoke.cjs)
window.__sea = { engine, env, settings, device, storyView };
