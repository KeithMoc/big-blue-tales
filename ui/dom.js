// Small DOM helpers shared by every piece of the interface. Licence: MIT.
export const $ = (id) => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  e.append(...kids.flat().filter(x => x != null));
  return e;
}
export function svg(tag, attrs = {}, text) {
  const e = document.createElementNS(SVG, tag);
  for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  return e;
}
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage is optional */ } },
};
export const fmt = (n) => n.toLocaleString('en-AU');
export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const WORDS = { she: { subj: 'she', obj: 'her', poss: 'her' }, he: { subj: 'he', obj: 'him', poss: 'his' }, it: { subj: 'it', obj: 'it', poss: 'its' } };
export const pronoun = (animal) => WORDS[animal.pronoun] || WORDS.it;
/** "18 cm", "3 m", "4.2 m", "30 m" */
export const lengthText = (cm) => cm < 100 ? `${fmt(cm)} cm` : `${fmt(+(cm / 100).toFixed(cm % 100 ? 1 : 0))} m`;
export const ICON = 'viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
