// Story check: every story in scenes/index.json is whole, sourced, gently worded and honestly linked. No browser.
//   node tools/story-check.mjs [--strict] [--json]
// It fails (exit 1) when:
//   a story folder lacks scene.json or scene.js, or its id does not match its folder
//   a part (beat) has no ages 5 to 7 words, or neither a source nor a dossier fact
//   a part, a time of day or a link names a source the story does not list, or a source has no https url or no quote
//   a fact id (a part's or a link's) is not in that animal's dossier (animals/<id>/dossier.json), was not confirmed by a
//   second reader, is part of an open conflict there, or the dossier is not signed
//   a cast or link animal has no folder in animals/, or an idea or a place is not named in scenes/index.json
//   pretend colours in Play have no note that says they are pretend
//   any line a child reads or hears holds a "never" word (tools/tone.words.json)
// Lines above the reading grade are listed; --strict fails on them too. Licence: MIT.
import { readFileSync, existsSync } from 'node:fs';
const R = new URL('../', import.meta.url), read = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8')), has = (f) => existsSync(new URL(f, R));
const W = read('tools/tone.words.json'), args = process.argv.slice(2), LEVEL = 'young', MAX = W.maxGrade[LEVEL];
const rx = (list) => new RegExp(`\\b(${list.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|')})\\b`, 'gi');
const NEVER = rx(W.never), REVIEW = rx(W.review);
const syl = (w) => { w = w.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return 0; const m = w.replace(/e$/, '').match(/[aeiouy]+/g); return Math.max(1, m ? m.length : 1); };
/** Flesch-Kincaid grade: rough, but the same ruler for every line. */
const grade = (t) => { const s = Math.max(1, (t.match(/[.!?]+/g) || []).length), w = t.trim().split(/\s+/); return 0.39 * w.length / s + 11.8 * w.reduce((a, x) => a + syl(x), 0) / w.length - 15.59; };

const index = read('scenes/index.json');
const problems = [], hard = [], review = [], out = { stories: 0, lines: 0, sources: 0, facts: 0 };
const dossiers = new Map();
const animal = (id) => has(`animals/${id}/pack.js`);
function fact(ref, where) {
  const [who, id] = ref.split(':'); out.facts++;
  if (!animal(who)) return problems.push(`${where}: no animals/${who}/pack.js for fact ${ref}`);
  if (!dossiers.has(who)) dossiers.set(who, has(`animals/${who}/dossier.json`) ? read(`animals/${who}/dossier.json`) : null);
  const d = dossiers.get(who);
  if (!d) return problems.push(`${where}: ${who} has no dossier.json`);
  if (!d.signedBy || !d.signedOn) problems.push(`${where}: the ${who} dossier is not signed`);
  const f = d.facts.find(x => x.id === id);
  if (!f) return problems.push(`${where}: no fact "${id}" in the ${who} dossier`);
  if (f.verified?.result !== 'yes') problems.push(`${where}: fact ${ref} was not confirmed by a second reader`);
  if ((d.conflicts || []).some(c => (c.facts || []).includes(id))) problems.push(`${where}: fact ${ref} is part of an open conflict in the dossier`);
}
function line(text, where) {
  out.lines++;
  const n = text.match(NEVER); if (n) problems.push(`${where}: never word [${[...new Set(n.map(w => w.toLowerCase()))].join(', ')}]: ${text}`);
  const r = text.match(REVIEW); if (r) review.push(`${where} [${[...new Set(r.map(w => w.toLowerCase()))].join(', ')}]: ${text}`);
  const g = grade(text); if (g > MAX) hard.push(`${where} grade ${g.toFixed(1)}: ${text}`);
}
const words = (o, where) => { if (!o?.[LEVEL]) problems.push(`${where}: no ages 5 to 7 words (${LEVEL})`); else line(o[LEVEL], where); };
const listed = (S, ids, where) => { for (const s of ids || []) if (!S.sources?.[s]) problems.push(`${where}: source "${s}" is not listed`); };

for (const id of index.scenes) {
  out.stories++;
  if (!has(`scenes/${id}/scene.json`) || !has(`scenes/${id}/scene.js`)) { problems.push(`${id}: scene.json or scene.js is missing`); continue; }
  const S = read(`scenes/${id}/scene.json`);
  if (S.id !== id) problems.push(`${id}: scene.json says its id is "${S.id}"`);
  for (const k of S.shows || []) if (!index.ideas?.[k]) problems.push(`${id}: idea "${k}" is not in scenes/index.json`);
  if (!index.habitats?.[S.habitat]) problems.push(`${id}: place "${S.habitat}" is not in scenes/index.json`);
  for (const c of S.cast || []) if (c.animal && !animal(c.animal)) problems.push(`${id}: cast animal "${c.animal}" has no animals/${c.animal}/pack.js`);
  if (!S.beats?.length) problems.push(`${id}: no parts (beats)`);
  for (const b of S.beats || []) {
    words(b, `${id}/${b.id}`);
    if (b.why) words(b.why, `${id}/${b.id} why`);
    if (!b.sources?.length && !b.facts?.length) problems.push(`${id}/${b.id}: no source and no fact`);
    listed(S, b.sources, `${id}/${b.id}`);
    for (const f of b.facts || []) fact(f, `${id}/${b.id}`);
  }
  for (const [k, s] of Object.entries(S.sources || {})) { out.sources++; if (!/^https:\/\//.test(s.url || '') || !s.quote) problems.push(`${id}: source "${k}" needs an https url and a quote`); }
  for (const l of S.links || []) {
    const where = `${id} -> ${l.animal}`;
    if (!l.fact?.startsWith(l.animal + ':')) { problems.push(`${where}: the link's fact must belong to that animal`); continue; }
    fact(l.fact, where); words(l, where);
  }
  if (S.times) {
    if (!(S.times.label && S.times.options?.length > 1)) problems.push(`${id}: times needs a label and two or more options`);
    if (S.times.opens && !S.times.options?.some(o => o.id === S.times.opens)) problems.push(`${id}: times.opens "${S.times.opens}" is not one of its options`);
    for (const o of S.times.options || []) {
      if (!(o.id && o.label)) problems.push(`${id}: a time of day needs an id and a label`);
      words(o, `${id}/time ${o.id}`); listed(S, o.sources, `${id}/time ${o.id}`);
    }
  }
  for (const [k, v] of Object.entries(S.labels || {})) if (typeof v !== 'string' || !v) problems.push(`${id}: label "${k}" has no words`);
  if (S.play) {
    for (const k of ['sizes', 'colours', 'trails']) if (S.play[k] && !(S.play[k].label && S.play[k].options?.every(o => o.id && o.label))) problems.push(`${id}: play.${k} needs a label and options with id and label`);
    if (S.play.colours && !S.play.colours.note) problems.push(`${id}: play colours need a note that says they are pretend`);
    if (S.play.colours?.note) words(S.play.colours.note, `${id}/play colours note`);
    if (S.play.touch) words(S.play.touch, `${id}/play touch`);
  }
}
for (const [k, v] of [...Object.entries(index.ideas || {}), ...Object.entries(index.habitats || {})]) words(v, `index ${k}`);

if (args.includes('--json')) console.log(JSON.stringify({ ...out, problems, review, hard }, null, 1));
else {
  if (problems.length) console.log('problems:\n  ' + problems.join('\n  '));
  if (review.length) console.log('review words (fine when it is the plain fact):\n  ' + review.join('\n  '));
  if (hard.length) console.log(`above reading grade ${MAX}:\n  ` + hard.join('\n  '));
  console.log(`story check: ${out.stories} stories, ${out.lines} lines, ${out.sources} sources, ${out.facts} dossier facts cited: ${problems.length} problem(s), ${review.length} to review, ${hard.length} above grade`);
}
const fail = problems.length || (args.includes('--strict') && hard.length);
console.log(fail ? 'story check FAILED' : 'story check passed');
process.exit(fail ? 1 : 0);
