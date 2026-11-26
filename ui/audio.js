// One audio clock for the whole page: read-aloud (ui/speech.js) and short sounds (ui/sfx.js) share it. Licence: MIT.
const AC = window.AudioContext || window.webkitAudioContext;
export const canPlay = !!AC;
let ctx = null;
/** The shared AudioContext, woken if the browser put it to sleep. Call from a tap. Throws where there is no Web Audio. */
export function audio() { ctx ||= new AC(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }
export function decode(url) {
  return fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(b => new Promise((ok, no) => audio().decodeAudioData(b, ok, no)));
}
