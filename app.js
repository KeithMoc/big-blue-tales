// Big Blue Tales: the page's entry. One engine, one set of settings, and the story the address names:
//   #<story id>   that story (a folder in scenes/, listed in scenes/index.json)
//   no address    the first story in scenes/index.json, or the one opened last on this device
// Licence: MIT.
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

const go = (id) => { if (location.hash.slice(1) === id) route(); else location.hash = id; };
const storyView = createStoryView({ engine, env, settings, go });
const wanted = () => location.hash.slice(1).replace(/^story\//, '');   // #story/<id> is read as #<id> too
function route() { storyView.close(); engine?.resize(); storyView.open(wanted()); }
addEventListener('hashchange', route);
route();

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
  engine.onRestored(() => { clearTimeout(waiting); paused.hidden = true; storyView.open(wanted()); });
  again.addEventListener('click', () => location.reload());
}

// handles for checking the page from a test script (tools/smoke.cjs)
window.__sea = { engine, env, settings, device, storyView };
