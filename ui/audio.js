// One audio clock for the whole page: read-aloud (ui/speech.js) and short sounds (ui/sfx.js) share it. Licence: MIT.
const AC = window.AudioContext || window.webkitAudioContext;
export const canPlay = !!AC;
let ctx = null;
/** The shared AudioContext, woken if the browser put it to sleep. Call from a tap. Throws where there is no Web Audio. */
export function audio() { ctx ||= new AC(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }
export function decode(url) {
  return fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(b => new Promise((ok, no) => audio().decodeAudioData(b, ok, no)));
}
/** A longer clip (an animal's call), streamed rather than decoded whole. -> { stop() }; `ended` runs when it finishes or fails. */
export function playClip(url, ended) {
  const a = new Audio(url); let over = false;
  const end = () => { if (!over) { over = true; ended?.(); } };
  a.addEventListener('ended', end); a.addEventListener('error', end);
  a.play().catch(end);
  return { stop() { over = true; a.pause(); } };
}
