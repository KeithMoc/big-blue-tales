// Device: one guess, made once per visit, at how much picture this machine can draw.
//   tier 'high' | 'mid' | 'low'   handed to every pack in ctx.tier, and mapped to the engine's first quality step
// The guess comes from what the browser will say for free (the GPU's name, its largest texture, memory,
// cores, screen). The first animal then corrects it: the step the engine's governor settles on is the
// truth, and it is kept on this device so the next visit starts there instead of stuttering down to it.
// Nothing here ever leaves the device: no network call, only localStorage. Licence: MIT.
import { store } from '../ui/dom.js';

const KEY = 'sm-device', TIERS = ['high', 'mid', 'low'];
export const START = { high: 0, mid: 1, low: 2 };          // tier -> the engine's first quality step
const tierOfStep = (step) => TIERS[Math.min(2, step)];     // a device that settles at step 2 or worse is 'low'
const RETRY_EVERY = 5;                                     // every fifth visit tries one step better, so one bad day does not stick

// GPU names, as WEBGL_debug_renderer_info reports them. Software renderers and phone GPUs several
// generations old are 'low'; integrated and mid-range phone GPUs are 'mid'. Anything unknown is left
// to the other signals. Safari says only "Apple GPU", so an iPad is judged by its screen and the governor.
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;
const WEAK = /mali-(4|t)|adreno \(?tm\)? ?[2-4]\d\d|adreno \(?tm\)? ?50\d|powervr (sgx|rogue g[e6])|videocore|tegra 3|intel.*hd graphics (2|3|4)\d{3}\b/i;
const MIDDLING = /mali-g(3|5|6)\d\b|adreno \(?tm\)? ?(5[1-9]|6[0-2])\d|powervr|intel|apple a(8|9|10)\b/i;

/** The current answers. Filled in by initDevice; 'high' until then, as packs were always told. */
export const device = { tier: 'high', guess: 'high', startStep: 0, settledStep: null, gpu: '', maxTexture: 0, memory: null, cores: null, screen: [0, 0], dpr: 1 };

/** The guess from free signals alone. Exported so it can be read and tested without a GPU. */
export function guessTier({ gpu = '', maxTexture = 8192, memory = null, cores = null, screen: [sw, sh] = [1440, 900] }) {
  const short = Math.min(sw, sh);
  if (SOFTWARE.test(gpu) || WEAK.test(gpu) || maxTexture < 4096 || (memory && memory <= 2) || (cores && cores <= 2)) return 'low';
  // a phone has more pixels per inch than it has GPU to fill them
  if (MIDDLING.test(gpu) || short < 500 || (memory && memory <= 4) || (cores && cores <= 4)) return 'mid';
  return 'high';
}

function remembered(gpu) {
  try { const m = JSON.parse(store.get(KEY) || 'null'); return m && m.gpu === gpu && Number.isInteger(m.step) ? m : null; } catch { return null; }
}

/** Read the device once, set the engine's first step, and listen for the governor's verdict. */
export function initDevice(engine) {
  const d = device;
  d.memory = navigator.deviceMemory || null; d.cores = navigator.hardwareConcurrency || null;
  d.screen = [screen.width, screen.height]; d.dpr = devicePixelRatio;
  if (!engine) { d.tier = d.guess = 'low'; return d; }      // no WebGL at all
  const gl = engine.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  d.gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  d.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  d.tier = d.guess = guessTier(d);

  // What this device settled on last time beats any guess, unless the GPU's name has changed since.
  const was = remembered(d.gpu), visits = (was?.visits || 0) + 1;
  if (was) {
    d.startStep = visits % RETRY_EVERY ? was.step : Math.max(0, was.step - 1);
    if (!SOFTWARE.test(d.gpu)) d.tier = tierOfStep(was.step);
  } else d.startStep = START[d.tier];
  const save = (step) => store.set(KEY, JSON.stringify({ gpu: d.gpu, step, visits }));
  if (was) save(was.step);                                  // count the visit
  engine.setStart(d.startStep);

  // The first settled step of the visit may lower the tier, once; after that the tier holds still so
  // one visit never mixes animals built for different tiers more than it must. Every settled step is saved.
  let decided = false;
  engine.onSettle((step) => {
    d.settledStep = step; save(step);
    if (decided) return;
    decided = true;
    const t = tierOfStep(step);
    if (TIERS.indexOf(t) > TIERS.indexOf(d.tier)) d.tier = t;
  });
  return d;
}
