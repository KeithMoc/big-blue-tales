// The book's own lines (not one animal's): asked for by id, so no view carries a sentence of its own and every
// line the page can say is one the recording tools know about (sounds/shell.en.json). Licence: MIT.
import { WORDS, LABELS } from '../sounds/index.js';
import { fill } from './fill.js';
/** words('sea.loadFailed', { name }) -> the sentence, or '' (with a warning) when the id is not in sounds/shell.en.json. */
export function words(id, vars) { const t = WORDS[id]; if (t == null) { console.warn(`contract: no shell line "${id}" in sounds/shell.en.json`); return ''; } return fill(t, vars); }
export const label = (id) => LABELS[id] || '';
