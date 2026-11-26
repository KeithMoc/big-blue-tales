// The three.js rules that a program can read from the source, with no browser (docs/THREEJS.md).
//   node tools/three-rules.mjs            check every runtime file; exits 1 on a problem
//   node tools/three-rules.mjs --list     print the rules
// A line may opt out of one rule with a comment on the same line that says why:   // three-rules: ok <rule> <reason>
// What it cannot see (how the picture looks, real frame rates, a real iPhone) is listed in docs/THREEJS.md.
// No dependencies. Licence: MIT.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));

export const RULES = {
  'glsl-home': 'Shader code (ShaderMaterial, onBeforeCompile, GLSL) lives only in kit/, scenes/kit/ and core/. A pack model or a scene.js uses what those export.',
  'output-includes': 'A ShaderMaterial fragment shader ends with <tonemapping_fragment> and <colorspace_fragment> (or OUTPUT from scenes/kit/glsl.js), or it draws darker than everything else.',
  'pow-base': 'The first argument of a GLSL pow() is visibly never negative: clamp(), max(), abs(), spow(), or a float declared from one of those. pow() of a slightly negative number is not a number on Apple GPUs, and bloom spreads it into black blocks.',
  'time-wrap': 'A shader clock (uTime) is wrapped (t % 3600 in JS or mod() in GLSL): phones lose float precision after a long visit and the motion turns to steps.',
  'scene-tiers': 'A scene.js reads ctx.tier and names what high, mid and low each get.',
  'seeded-random': 'No Math.random in kit/, scenes/ or a pack model: a seeded rng, so every visit and every test sees the same picture.',
  'dispose': 'A scenes/kit module that makes a geometry or a material hands back dispose().',
  'references': 'docs/THREEJS.md names the three references the maintainer set (three.js skills, img2threejs, earshot).',
};

const GLSL = /\b(ShaderMaterial|RawShaderMaterial|onBeforeCompile|gl_FragColor|gl_Position)\b/;
const GLSL_HOMES = ['kit/', 'scenes/kit/', 'core/'];
const SAFE_CALL = /^(clamp|max|abs|spow|sat|exp|exp2|length)\s*\(/;
const NUMBER = /^[0-9.]+$/;
const REFERENCES = ['skillselion.com/skills/CloudAI-X/threejs-skills', 'github.com/img2threejs/img2threejs', 'github.com/Leonxlnx/earshot'];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else if (name.endsWith('.js') && name !== 'pack.js') out.push(p);
  }
  return out;
}

/** The runtime files the rules cover: everything the page can load that we wrote. */
export function files(base = root) {
  const all = [];
  for (const d of ['kit', 'core', 'scenes', 'views', 'ui']) walk(join(base, d), all);
  const animals = join(base, 'animals');
  if (existsSync(animals)) for (const id of readdirSync(animals)) walk(join(animals, id, 'model'), all);
  return all.map(p => relative(base, p).split('\\').join('/')).sort();
}

/** The first argument of the call that opens at `open` (the index of its bracket). */
function firstArg(src, open) {
  let depth = 0;
  for (let i = open + 1; i < src.length; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') { if (depth === 0) return src.slice(open + 1, i); depth--; }
    else if (c === ',' && depth === 0) return src.slice(open + 1, i);
  }
  return src.slice(open + 1);
}

/** Check one file's text. Returns [{ rule, line, text }]. Exported so the rules can be tested on a string. */
export function check(file, src) {
  const found = [], lines = src.split('\n');
  const lineOf = (i) => src.slice(0, i).split('\n').length;
  const waived = (rule, line) => new RegExp(`three-rules:\\s*ok\\s+${rule}\\b`).test(lines[line - 1] || '');
  const add = (rule, line, text) => { if (!waived(rule, line)) found.push({ rule, line, text }); };
  const hasGlsl = GLSL.test(src);

  if (hasGlsl && !GLSL_HOMES.some(h => file.startsWith(h))) {
    const i = src.search(GLSL); add('glsl-home', lineOf(i), `shader code outside ${GLSL_HOMES.join(', ')}`);
  }
  if (hasGlsl) {
    if (/\bShaderMaterial\s*\(/.test(src) && /fragmentShader/.test(src)) {
      const whole = /\$\{\s*OUTPUT\s*\}/.test(src) || (src.includes('<tonemapping_fragment>') && src.includes('<colorspace_fragment>'));
      if (!whole) add('output-includes', lineOf(src.search(/\bShaderMaterial\s*\(/)), 'fragment shader does not end with the two output includes');
    }
    // floats that are safe by the way they were made: float x = clamp(...), max(...), abs(...), smoothstep(...)
    const safe = new Set();
    for (const m of src.matchAll(/\bfloat\s+(\w+)\s*=\s*(clamp|max|abs|smoothstep|step|spow|sat|length|fract)\s*\(/g)) safe.add(m[1]);
    for (const m of src.matchAll(/(^|[^.\w])pow\s*\(/g)) {
      const open = m.index + m[0].length - 1, base = firstArg(src, open).trim();
      if (!base || SAFE_CALL.test(base) || NUMBER.test(base) || safe.has(base)) continue;   // an empty one is prose: "pow() of ..."
      add('pow-base', lineOf(open), `pow(${base.slice(0, 40)}, ...) may get a negative number; clamp it or use spow()`);
    }
    if (/uniform\s+float\s+uTime\b/.test(src) && !/%\s*\d|mod\s*\(|shaderTime\s*\(/.test(src)) add('time-wrap', lineOf(src.search(/uniform\s+float\s+uTime\b/)), 'uTime is never wrapped');
  }
  if (/^scenes\/[^/]+\/scene\.js$/.test(file) && !file.startsWith('scenes/kit/')) {
    if (!(/\btier\b/.test(src) && /\bhigh\b/.test(src) && /\bmid\b/.test(src) && /\blow\b/.test(src))) add('scene-tiers', 1, 'no table of what high, mid and low get');
  }
  if (/^(kit|scenes)\//.test(file) || /^animals\/[^/]+\/model\//.test(file)) {
    for (const m of src.matchAll(/Math\.random\s*\(/g)) add('seeded-random', lineOf(m.index), 'Math.random');
  }
  if (file.startsWith('scenes/kit/') && /new THREE\.\w*(Geometry|Material)\b/.test(src) && !/\bdispose\s*\(/.test(src)) add('dispose', 1, 'makes GPU resources and has no dispose()');
  return found;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--list')) { for (const [k, v] of Object.entries(RULES)) console.log(`${k}\n  ${v}`); process.exit(0); }
  const list = files(), problems = [];
  let shaders = 0;
  for (const f of list) {
    const src = readFileSync(join(root, f), 'utf8');
    if (GLSL.test(src)) shaders++;
    for (const p of check(f, src)) problems.push(`${f}:${p.line}  ${p.rule}: ${p.text}`);
  }
  const doc = existsSync(join(root, 'docs/THREEJS.md')) ? readFileSync(join(root, 'docs/THREEJS.md'), 'utf8') : '';
  for (const r of REFERENCES) if (!doc.includes(r)) problems.push(`docs/THREEJS.md  references: does not name ${r}`);
  for (const p of problems) console.log(p);
  console.log(problems.length
    ? `\nthree-rules FAILED: ${problems.length} problem(s). Each rule and its reason: node tools/three-rules.mjs --list`
    : `three-rules: ${list.length} files read, ${shaders} with shader code, ${Object.keys(RULES).length} rules, no problems. Not checked here: how it looks, frame rate, a real iPhone.`);
  process.exit(problems.length ? 1 : 0);
}
