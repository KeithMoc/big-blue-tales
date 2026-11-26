// Small DOM helpers shared by every piece of the interface. Licence: MIT.
export const $ = (id) => document.getElementById(id);
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
  e.append(...kids.flat().filter(x => x != null));
  return e;
}
export const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage is optional */ } },
};
export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
