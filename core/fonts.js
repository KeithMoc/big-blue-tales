// The two typefaces ship with the page (fonts/, SIL Open Font License) so nothing is fetched from a font
// service. They are loaded as bytes and handed to the browser; until they arrive, or if they cannot be
// read, the fallback stacks in the stylesheet are used. Licence: MIT.
const FACES = [
  ['Atkinson Hyperlegible', 'atkinson-hyperlegible-latin-400-normal.woff2', { weight: '400', style: 'normal' }],
  ['Atkinson Hyperlegible', 'atkinson-hyperlegible-latin-700-normal.woff2', { weight: '700', style: 'normal' }],
  ['Atkinson Hyperlegible', 'atkinson-hyperlegible-latin-400-italic.woff2', { weight: '400', style: 'italic' }],
  ['Fraunces', 'fraunces-latin-wght-normal.woff2', { weight: '100 900', style: 'normal' }],
];
export function loadFonts() {
  if (!('FontFace' in window)) return Promise.resolve();
  return Promise.all(FACES.map(async ([family, file, desc]) => {
    try {
      const r = await fetch(new URL(`../fonts/${file}`, import.meta.url));
      if (!r.ok) return;
      const face = new FontFace(family, await r.arrayBuffer(), desc);
      document.fonts.add(await face.load());
    } catch { /* keep the fallback face */ }
  }));
}
