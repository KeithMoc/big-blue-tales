// The Big Blue Tales icon set: one sea bubble per button, drawn here as inline SVG (no emoji, no font, no
// outside icon library). Every icon is a name; scene.json and index.html say the name, `icon(name)` draws it.
//
// How they are drawn (docs/knowledge/icons.md has the reasons and the outside guides that were read):
// - 32 x 32 grid, chunky filled shapes, at most 3 colours from the page palette, readable at 24 px.
// - Every icon sits in the same plain deep-water bubble (no shine mark: at button size it read as a scratch).
//   What is inside is clipped to the bubble, so a scene (sea, sky) fills it edge to edge.
// - One fish shape everywhere: a whole silhouette with its tail, a blue-green back and a silver belly (NOAA).
// - Few, big things. Never more than 8 fish in one icon: at 24 px more became dust.
// - Motion is a bonus, never the meaning: an icon moves only while its button is on, hovered or pressed, and
//   only under prefers-reduced-motion: no-preference. Only transform and opacity move. It is inline SVG, so the
//   media query works (it does not inside <img>).

const C = { deep: '#0d3447', rim: '#7fe4f3', fish: '#4fbfd0', back: '#16707f', belly: '#dff3f6', ink: '#03070c',
  gold: '#ffc45c', sun: '#ffb02e', pink: '#ff8fa3', coral: '#ff7a59', white: '#ffffff', moon: '#f4f1d0',
  lion: '#a0714d', lionDark: '#5e3d27', sea: '#2fa7c4', seaDeep: '#1b6f8c', dusk: '#ff9a62', green: '#7bd88f' };

// The one fish: a whole silhouette facing right, about 16 long and 8 tall at s = 1, centred on (x, y),
// turned by `turn` degrees. Small copies (s < 0.5) drop the eye glint so they stay clean at 24 px.
function fish(x, y, s = 1, { turn = 0, body = C.fish, back = C.back, belly = C.belly } = {}) {
  const fine = s >= 0.5;
  return `<g transform="translate(${x} ${y}) rotate(${turn}) scale(${s})">
    <path d="M7 0 C7 -2.7 3.8 -4.2 0 -4.2 C-3.2 -4.2 -5.2 -2.6 -6.2 -1 L-6.2 1 C-5.2 2.6 -3.2 4.2 0 4.2 C3.8 4.2 7 2.7 7 0 Z" fill="${body}"/>
    <path d="M6.6 -0.8 C6 -3 3.4 -4.2 0 -4.2 C-3.2 -4.2 -5.2 -2.6 -6.2 -1 L-6.2 -0.2 C-2 -1.2 2.6 -1.4 6.6 -0.8 Z" fill="${back}"/>
    <path d="M6.2 1.4 C5 3.3 2.8 4.2 0 4.2 C-2.8 4.2 -4.6 3 -5.6 1.8 C-2 2.4 2.4 2.2 6.2 1.4 Z" fill="${belly}"/>
    <path class="tail" d="M-5.6 0 L-10 -4.2 Q-9 0 -10 4.2 Z" fill="${back}" stroke="${back}" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="3.6" cy="-0.7" r="1.35" fill="${C.ink}"/>${fine ? `<circle cx="4" cy="-1.1" r="0.45" fill="${C.white}"/>` : ''}
  </g>`;
}
// a little four-point sparkle
const star = (x, y, r, fill, cls = '') => `<path class="${cls}" d="M${x} ${y - r} Q${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y} Q${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r} Q${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y} Q${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r} Z" fill="${fill}"/>`;
// the sea, from y down to the bottom of the bubble, with a soft wave on top
const sea = (y, col = C.sea) => `<path d="M0 ${y} q4 -2.4 8 0 t8 0 t8 0 t8 0 V32 H0 Z" fill="${col}"/>`;

const DRAW = {
  // ---- page buttons ----
  music: () => `<g class="bob"><path d="M12.4 22.6 V9.8 L23.2 7.2 V19.8" fill="none" stroke="${C.gold}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M12.4 12.6 L23.2 10" stroke="${C.gold}" stroke-width="2.6"/>
    <ellipse cx="9.8" cy="22.8" rx="3.5" ry="2.7" fill="${C.gold}"/><ellipse cx="20.6" cy="20" rx="3.5" ry="2.7" fill="${C.gold}"/></g>`,
  find: () => `<g class="swim">${fish(14, 14, 0.62)}</g>
    <circle cx="14" cy="14" r="7.4" fill="none" stroke="${C.gold}" stroke-width="2.8"/>
    <path d="M19.4 19.4 L24.4 24.4" stroke="${C.gold}" stroke-width="4.2" stroke-linecap="round"/>`,
  just: () => `<g class="grow">${fish(16.6, 16, 0.9)}</g>
    <path d="M6.2 11.4 V6.2 H11.4 M20.6 6.2 H25.8 V11.4 M25.8 20.6 V25.8 H20.6 M11.4 25.8 H6.2 V20.6" fill="none" stroke="${C.gold}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  grownups: () => `<path d="M13.6 18.6 Q17 21.4 19.8 19.6" fill="none" stroke="${C.belly}" stroke-width="1.8" stroke-linecap="round"/>
    <g class="bob"><circle cx="11.2" cy="9.4" r="3.4" fill="${C.belly}"/><path d="M6 27 V18.6 Q6 13.8 11.2 13.8 Q16.4 13.8 16.4 18.6 V27 Z" fill="${C.belly}"/></g>
    <g class="hop"><circle cx="21.8" cy="15.4" r="2.7" fill="${C.gold}"/><path d="M17.8 27 V22.2 Q17.8 19 21.8 19 Q25.8 19 25.8 22.2 V27 Z" fill="${C.gold}"/></g>`,
  start: () => `<path class="pulse" d="M12.4 8.4 Q12.4 6.8 13.8 7.6 L23.8 14.6 Q25 15.6 23.8 16.6 L13.8 23.6 Q12.4 24.4 12.4 22.8 Z" fill="${C.gold}" stroke="${C.gold}" stroke-width="1.6" stroke-linejoin="round"/>`,
  learn: () => `<g class="bob"><path d="M16 10.4 Q11 7.4 5.2 8.8 V23.8 Q11 22.4 16 25 Q21 22.4 26.8 23.8 V8.8 Q21 7.4 16 10.4 Z" fill="${C.belly}"/>
    <path d="M16 10.4 V25" stroke="${C.back}" stroke-width="1.6"/>
    <path d="M8.2 13.4 H13 M8.2 16.6 H13 M8.2 19.8 H11.6" stroke="${C.sea}" stroke-width="1.6" stroke-linecap="round"/>
    ${fish(21.4, 16.8, 0.42)}</g>`,
  play: () => `<g class="spin"><circle cx="16" cy="16" r="9.6" fill="${C.white}"/>
    <path d="M16 6.4 A9.6 9.6 0 0 0 16 25.6 C10.6 21.4 10.6 10.6 16 6.4 Z" fill="${C.coral}"/>
    <path d="M16 6.4 A9.6 9.6 0 0 1 16 25.6 C21.4 21.4 21.4 10.6 16 6.4 Z" fill="${C.sea}"/>
    <path d="M16 6.4 C13.4 11 13.4 21 16 25.6 C18.6 21 18.6 11 16 6.4 Z" fill="${C.gold}"/></g>`,
  listen: () => `<path d="M6.6 12.8 H10.8 L16.4 8 V24 L10.8 19.2 H6.6 Z" fill="${C.gold}" stroke="${C.gold}" stroke-width="1.4" stroke-linejoin="round"/>
    <path class="wave1" d="M19.6 12.4 Q21.8 16 19.6 19.6" fill="none" stroke="${C.rim}" stroke-width="2.2" stroke-linecap="round"/>
    <path class="wave2" d="M22.8 9.4 Q26.6 16 22.8 22.6" fill="none" stroke="${C.rim}" stroke-width="2.2" stroke-linecap="round"/>`,
  loading: () => `<g class="swim">${fish(17, 16, 1.15)}</g>`,

  // ---- what the fish do ----
  together: () => `<g class="swim">${fish(11.6, 10.6, 0.56)}${fish(21.2, 16, 0.56)}${fish(11.6, 21.4, 0.56)}</g>`,
  // three fish chasing each other round an empty middle: a ring, not a loading spinner
  ring: () => `<circle cx="16" cy="16" r="7.6" fill="none" stroke="${C.rim}" stroke-opacity="0.35" stroke-width="3.2"/><g class="turn">${[0, 120, 240].map(a => { const r = (a * Math.PI) / 180;
    return fish(+(16 + 7.6 * Math.cos(r)).toFixed(2), +(16 + 7.6 * Math.sin(r)).toFixed(2), 0.5, { turn: a + 90 }); }).join('')}</g>`,
  // a tight round crowd: a dark ball with fish packed inside it
  ball: () => `<g class="squeeze"><circle cx="16" cy="16" r="10" fill="${C.back}"/>
    ${[[16, 10.6], [11.4, 15], [20.4, 15], [13.6, 20.6], [19.6, 21]].map(([x, y]) => fish(x, y, 0.42, { back: C.fish, body: C.belly, belly: C.white })).join('')}</g>`,
  sealion: () => `${sea(25, C.seaDeep)}<g class="nod">
    <path d="M9 27 C8.4 20 9.4 14 13.6 10.6 C16.8 8 21.4 8.4 23.6 10.8 C26.4 11.4 27.4 13.4 26.6 14.8 C25.8 16 23.4 16 21.4 15.6 C19 17.4 18 21.4 18.6 27 Z" fill="${C.lion}"/>
    <circle cx="26.2" cy="13.2" r="1.1" fill="${C.ink}"/>
    <circle cx="19.4" cy="11.6" r="1.4" fill="${C.ink}"/><circle cx="19.8" cy="11.2" r="0.45" fill="${C.white}"/>
    <path d="M16 11 q-0.8 1 -0.2 2" fill="none" stroke="${C.lionDark}" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M23.4 14.6 L20.6 15.6 M24 15.2 L22 17" stroke="${C.belly}" stroke-width="0.7" stroke-linecap="round"/></g>`,

  // ---- times of day: each is a small window of sky over the sea ----
  sunrise: () => `<rect width="32" height="32" fill="#2b4a7a"/><path d="M0 14 H32 V24 H0 Z" fill="${C.pink}" opacity="0.6"/>
    <g class="rise"><circle cx="16" cy="21" r="6" fill="${C.sun}"/><path d="M16 11.4 V9 M9.8 14.2 L8.2 12.6 M22.2 14.2 L23.8 12.6" stroke="${C.sun}" stroke-width="2" stroke-linecap="round"/></g>${sea(22)}`,
  day: () => `<rect width="32" height="32" fill="#3aa0d8"/><g class="spin"><circle cx="16" cy="15" r="5.4" fill="${C.sun}"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path transform="rotate(${a} 16 15)" d="M16 5.6 V7.8" stroke="${C.gold}" stroke-width="2.2" stroke-linecap="round"/>`).join('')}</g>${sea(25)}`,
  sunset: () => `<rect width="32" height="32" fill="${C.dusk}"/><path d="M0 0 H32 V11 H0 Z" fill="#7a4a8c" opacity="0.8"/>
    <g class="sink"><circle cx="16" cy="20" r="6.4" fill="${C.coral}"/></g>${sea(21, '#4a5f9a')}
    <path d="M12 24.6 H20 M13.6 27.4 H18.4" stroke="${C.coral}" stroke-width="1.6" stroke-linecap="round"/>`,
  night: () => `<rect width="32" height="32" fill="#0b1d3a"/><g class="rock"><path d="M18.6 6.6 A9.4 9.4 0 1 0 24.4 22 A7.6 7.6 0 0 1 18.6 6.6 Z" fill="${C.moon}"/></g>
    ${star(23.6, 9, 2.4, C.gold, 'twinkle')}${star(25.6, 17, 1.4, C.gold, 'twinkle2')}`,

  // ---- Play: how many fish (3, 5, 8: each step is clearly more) ----
  school: () => `<g class="swim">${fish(11.6, 11, 0.56)}${fish(21, 16, 0.56)}${fish(11.6, 21, 0.56)}</g>`,
  bigschool: () => `<g class="swim">${[[10, 10], [20, 10], [15, 16], [10, 22], [20, 22]].map(([x, y]) => fish(x, y, 0.46)).join('')}</g>`,
  hugeschool: () => `<g class="swim">${[[11, 8.6], [19.4, 8.6], [8.4, 14.4], [16.4, 14.4], [24, 14.4], [11.6, 20.2], [19.8, 20.2], [15.6, 25.4]].map(([x, y]) => fish(x, y, 0.38)).join('')}</g>`,

  // ---- Play: trails and colours ----
  dots: () => `${fish(21.4, 16, 0.6)}<g class="trail"><circle cx="5.6" cy="16" r="1.6" fill="${C.gold}"/><circle cx="9.4" cy="16" r="1.6" fill="${C.gold}"/><circle cx="13.2" cy="16" r="1.6" fill="${C.gold}"/></g>`,
  line: () => `${fish(22, 14.2, 0.6)}<path class="trail" d="M4 19 Q7.4 12.6 10.6 17.2 T16.2 15" fill="none" stroke="${C.gold}" stroke-width="2.4" stroke-linecap="round"/>`,
  sparkle: () => `${fish(21.4, 17.6, 0.6)}${star(9.4, 11, 3.6, C.gold, 'twinkle')}${star(12.6, 21.4, 2.4, C.white, 'twinkle2')}`,
  real: () => `<g class="swim">${fish(17, 16, 1.15)}</g>`,
  rainbow: () => `<g class="swim">${fish(17, 16, 1.15, { body: C.gold, back: C.coral, belly: C.green })}</g>`,
  surprise: () => `<g class="wiggle"><rect x="8" y="14.4" width="16" height="11" rx="1.6" fill="${C.sea}"/><rect x="7" y="11" width="18" height="4.4" rx="1.4" fill="${C.rim}"/>
    <path d="M16 11 V25.4" stroke="${C.gold}" stroke-width="2.8"/><path d="M16 11 Q10.6 4.8 10.2 9.2 Q10.6 11.4 16 11 Q21.4 11.4 21.8 9.2 Q21.4 4.8 16 11 Z" fill="${C.gold}"/></g>`,
};

export const ICON_NAMES = Object.keys(DRAW);

let uid = 0;
/** Inline SVG for a named icon, or '' for an unknown name (the word on the button still says what it does). */
export function icon(name) {
  const draw = DRAW[name];
  if (!draw) return '';
  const id = `ib${++uid}`;                         // clip ids must be unique on the page
  return `<svg class="ico ico-${name}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <defs><clipPath id="${id}"><circle cx="16" cy="16" r="14.6"/></clipPath></defs>
    <circle cx="16" cy="16" r="15" fill="${C.deep}"/><g clip-path="url(#${id})">${draw()}</g>
    <circle cx="16" cy="16" r="14.6" fill="none" stroke="${C.rim}" stroke-width="1.4"/></svg>`;
}

const ON = ':is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico';
const MOVES = [['swim', 'ico-swim 1.6s ease-in-out infinite'], ['tail', 'ico-wag 0.5s ease-in-out infinite alternate'],
  ['bob', 'ico-bob 1.8s ease-in-out infinite'], ['hop', 'ico-hop 0.9s ease-in-out infinite'], ['rise', 'ico-rise 2.4s ease-in-out infinite'],
  ['sink', 'ico-sink 2.4s ease-in-out infinite'], ['spin', 'ico-spin 8s linear infinite'], ['turn', 'ico-spin 4s linear infinite'],
  ['squeeze', 'ico-squeeze 1.6s ease-in-out infinite'], ['nod', 'ico-nod 1.4s ease-in-out infinite'], ['rock', 'ico-rock 2.6s ease-in-out infinite'],
  ['twinkle', 'ico-twinkle 1.4s ease-in-out infinite'], ['twinkle2', 'ico-twinkle 1.4s ease-in-out 0.7s infinite'],
  ['wave1', 'ico-fade 1.2s ease-in-out infinite'], ['wave2', 'ico-fade 1.2s ease-in-out 0.3s infinite'], ['trail', 'ico-fade 1.4s ease-in-out infinite'],
  ['pulse', 'ico-pulse 1.4s ease-in-out infinite'], ['grow', 'ico-pulse 1.6s ease-in-out infinite'], ['wiggle', 'ico-wiggle 1.2s ease-in-out infinite']];

/** The icon CSS: size, and the gentle motion (only while on, hovered or pressed, and only without reduced motion). */
export const ICON_CSS = `
.ico { width: 1.6em; height: 1.6em; flex: none; vertical-align: middle; }
/* Only the moving parts get a box origin. Never put a moving class on an element with a transform attribute:
   the animation would replace it (wrap it in a <g> instead). */
.ico :is(${MOVES.map(([c]) => '.' + c).join(', ')}) { transform-box: fill-box; transform-origin: center; }
.ico .tail { transform-origin: right center; }
.ico :is(.turn, .spin) { transform-box: view-box; }
.ico .turn, .ico-play .spin { transform-origin: 16px 16px; }
.ico-day .spin { transform-origin: 16px 15px; }
@media (prefers-reduced-motion: no-preference) {
${MOVES.map(([c, a]) => `  ${ON} .${c} { animation: ${a}; }`).join('\n')}
}
@keyframes ico-swim { 50% { transform: translateX(1.6px) translateY(-0.6px); } }
@keyframes ico-wag { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
@keyframes ico-bob { 50% { transform: translateY(-1.4px); } }
@keyframes ico-hop { 50% { transform: translateY(-2.2px); } }
@keyframes ico-rise { 0%, 100% { transform: translateY(1.6px); } 50% { transform: translateY(-1.6px); } }
@keyframes ico-sink { 0%, 100% { transform: translateY(-1.4px); } 50% { transform: translateY(1.8px); } }
@keyframes ico-spin { to { transform: rotate(360deg); } }
@keyframes ico-squeeze { 50% { transform: scale(0.88); } }
@keyframes ico-nod { 50% { transform: rotate(-6deg); } }
@keyframes ico-rock { 50% { transform: rotate(-10deg); } }
@keyframes ico-twinkle { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.7); } }
@keyframes ico-fade { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes ico-pulse { 50% { transform: scale(1.08); } }
@keyframes ico-wiggle { 0%, 60%, 100% { transform: rotate(0); } 70% { transform: rotate(-8deg); } 85% { transform: rotate(8deg); } }
`;
