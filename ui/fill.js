// Fills a line's blanks: fill('The {name|lower} could not be loaded.', { name: 'Blue Whale' }). The page (ui/words.js)
// and the recording tools (tools/) both use this, so the words asked for and the words recorded cannot drift. Licence: MIT.
const HOW = { lower: (s) => s.toLowerCase(), upper: (s) => s.toUpperCase() };
export function fill(template, vars = {}) {
  return template.replace(/\{(\w+)(?:\|(\w+))?\}/g, (all, k, how) => { const v = String(vars[k] ?? ''); return how && HOW[how] ? HOW[how](v) : v; });
}
