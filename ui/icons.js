// The Big Blue Tales icon set: one sea bubble per button, drawn here as inline SVG (no emoji, no font, no
// outside icon library). Every icon is a name; scene.json and index.html say the name, `icon(name)` draws it.
//
// How they are drawn (docs/knowledge/icons.md has the reasons and the outside guides that were read):
// - 32 x 32 grid, chunky filled shapes, round ends, at most 3 colours from the page palette, readable at 24 px.
// - Every icon sits in the same deep-water bubble, so it reads on the dark button and on the gold "on" button.
// - Concrete things a 5 to 7 year old knows (a fish, a book, a beach ball, a present), not adult symbols.
// - Motion is a bonus, never the meaning: an icon moves only while its button is on, hovered or pressed, and
//   only under prefers-reduced-motion: no-preference. Only transform and opacity move. It is inline SVG, so the
//   media query works (it does not inside <img>).

const C = { deep: '#0d3447', rim: '#7fe4f3', fish: '#5cc8d6', back: '#1d7f8e', belly: '#e9f1f3', ink: '#03070c',
  gold: '#ffc45c', sun: '#ffb02e', pink: '#ff8fa3', coral: '#ff7a59', white: '#ffffff', moon: '#f4f1d0',
  lion: '#9a6a48', lionDark: '#5e3d27', sea: '#2fa7c4' };

// A small fish facing right, centred on (x, y). s scales it; body/back/belly let one shape take any paint.
function fish(x, y, s = 1, { body = C.fish, back = C.back, belly = C.belly, cls = 'fish', flip = false } = {}) {
  const t = `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`;
  return `<g class="${cls}" transform="${t}"><g class="fishbody">
    <path class="tail" d="M-4.6 0 L-9 -3.6 Q-8 0 -9 3.6 Z" fill="${back}" stroke="${back}" stroke-width="1.2" stroke-linejoin="round"/>
    <ellipse cx="0" cy="0" rx="6.2" ry="3.7" fill="${body}"/>
    <path d="M-5.6 -1.2 Q0 -4.6 5.6 -1.2 Q0 -3 -5.6 -1.2 Z" fill="${back}"/>
    <path d="M-5 1 Q0 3.9 5.4 0.8 Q0 2 -5 1 Z" fill="${belly}" opacity="0.9"/>
    <circle cx="3.3" cy="-0.6" r="1.15" fill="${C.ink}"/><circle cx="3.6" cy="-0.95" r="0.4" fill="${C.white}"/>
  </g></g>`;
}

const bubble = `<circle class="bub" cx="16" cy="16" r="15" fill="${C.deep}"/>
  <circle cx="16" cy="16" r="14.4" fill="none" stroke="${C.rim}" stroke-opacity="0.55" stroke-width="1.2"/>
  <path d="M7.5 11.5 A10 10 0 0 1 12 6.8" fill="none" stroke="${C.white}" stroke-opacity="0.45" stroke-width="1.6" stroke-linecap="round"/>`;

const waves = (y, col = C.sea) => `<path d="M4.4 ${y} q2.9 -2.2 5.8 0 t5.8 0 t5.8 0 t5.8 0 V25 Q16 30.4 4.4 25 Z" fill="${col}"/>`;

const DRAW = {
  // ---- page buttons ----
  music: () => `<g class="bob"><path d="M12 22.5 V9.5 L23 7 V19.5" fill="none" stroke="${C.gold}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
    <ellipse cx="9.8" cy="22.6" rx="3.2" ry="2.5" fill="${C.gold}"/><ellipse cx="20.8" cy="19.8" rx="3.2" ry="2.5" fill="${C.gold}"/></g>
    <circle class="rise" cx="25" cy="25" r="1.4" fill="${C.rim}" opacity="0.8"/>`,
  find: () => `<g class="swim">${fish(14, 14.5, 0.82)}</g>
    <circle cx="14" cy="14.5" r="7.6" fill="none" stroke="${C.gold}" stroke-width="2.4"/>
    <path d="M19.6 20.1 L24.6 25.1" stroke="${C.gold}" stroke-width="3.6" stroke-linecap="round"/>`,
  just: () => `<g class="grow">${fish(16.6, 16, 1.05, { cls: 'fish' })}</g>
    <path d="M6.5 11 V6.5 H11 M21 6.5 H25.5 V11 M25.5 21 V25.5 H21 M11 25.5 H6.5 V21" fill="none" stroke="${C.gold}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  grownups: () => `<g class="bob"><circle cx="12" cy="9.6" r="3.3" fill="${C.belly}"/><path d="M6.8 25 V18.4 Q6.8 14 12 14 Q17.2 14 17.2 18.4 V25 Z" fill="${C.belly}"/></g>
    <g class="hop"><circle cx="21.4" cy="14.2" r="2.6" fill="${C.gold}"/><path d="M17.6 25 V21.2 Q17.6 17.8 21.4 17.8 Q25.2 17.8 25.2 21.2 V25 Z" fill="${C.gold}"/></g>`,
  start: () => `<path class="pulse" d="M12.2 8.6 Q12.2 7 13.6 7.8 L23.4 14.6 Q24.6 15.6 23.4 16.6 L13.6 23.4 Q12.2 24.2 12.2 22.6 Z" fill="${C.gold}" stroke="${C.gold}" stroke-width="1.5" stroke-linejoin="round"/>`,
  learn: () => `<g class="bob"><path d="M16 10.5 Q11 7.6 5.6 9 V23.4 Q11 22 16 24.6 Q21 22 26.4 23.4 V9 Q21 7.6 16 10.5 Z" fill="${C.belly}"/>
    <path d="M16 10.5 V24.6" stroke="${C.back}" stroke-width="1.4"/>
    <path d="M8.4 13.4 H13.2 M8.4 16.4 H13.2 M8.4 19.4 H12" stroke="${C.sea}" stroke-width="1.4" stroke-linecap="round"/>
    ${fish(21.6, 16.6, 0.46, { cls: 'fish' })}</g>`,
  play: () => `<g class="spin"><circle cx="16" cy="16" r="9.5" fill="${C.white}"/>
    <path d="M16 6.5 A9.5 9.5 0 0 1 25.5 16 L16 16 Z" fill="${C.coral}"/><path d="M16 25.5 A9.5 9.5 0 0 1 6.5 16 L16 16 Z" fill="${C.sea}"/>
    <path d="M6.5 16 A9.5 9.5 0 0 1 16 6.5 L16 16 Z" fill="${C.gold}"/><circle cx="16" cy="16" r="2" fill="${C.white}"/></g>`,
  listen: () => `<path d="M7 13 H11 L16.5 8.4 V23.6 L11 19 H7 Z" fill="${C.gold}" stroke="${C.gold}" stroke-width="1.2" stroke-linejoin="round"/>
    <path class="wave1" d="M19.6 12.6 Q21.6 16 19.6 19.4" fill="none" stroke="${C.rim}" stroke-width="2" stroke-linecap="round"/>
    <path class="wave2" d="M22.6 9.8 Q26.2 16 22.6 22.2" fill="none" stroke="${C.rim}" stroke-width="2" stroke-linecap="round"/>`,
  loading: () => `<g class="swim">${fish(16.5, 16, 1.25)}</g>`,

  // ---- what the fish do ----
  together: () => `<g class="swim">${fish(12, 11, 0.62)}${fish(21, 15.5, 0.62)}${fish(12, 20.5, 0.62)}</g>`,
  ring: () => `<g class="turn"><path d="M16 7.4 A8.6 8.6 0 1 1 7.6 14.2" fill="none" stroke="${C.rim}" stroke-width="1.8" stroke-dasharray="2.6 2.6" stroke-linecap="round"/>
    ${fish(10.2, 9.6, 0.55, { flip: false })}</g>`,
  ball: () => `<g class="squeeze">${[[16, 9.4], [21.6, 12.6], [21.6, 19.2], [16, 22.6], [10.4, 19.2], [10.4, 12.6], [16, 16]]
    .map(([x, y]) => fish(x, y, 0.4)).join('')}</g>`,
  sealion: () => `<g class="nod"><path d="M8 26 Q7 15 13.5 10.6 Q19 7 23.4 10.4 Q26.6 13 25 16.2 Q23.2 18.4 19.8 17.8 Q17 21 17.6 26 Z" fill="${C.lion}"/>
    <ellipse cx="23.4" cy="14.4" rx="2.8" ry="2.1" fill="${C.lionDark}"/><circle cx="25.4" cy="13.4" r="0.9" fill="${C.ink}"/>
    <circle cx="18.6" cy="11.6" r="1.25" fill="${C.ink}"/><circle cx="18.95" cy="11.25" r="0.4" fill="${C.white}"/>
    <path d="M22.8 15.6 L19.6 17 M23.8 16 L21.6 18.2" stroke="${C.belly}" stroke-width="0.6" stroke-linecap="round" opacity="0.8"/></g>`,

  // ---- times of day ----
  sunrise: () => `<g class="rise"><circle cx="16" cy="19.5" r="6.4" fill="${C.sun}"/><path d="M16 9.2 V6.6 M9.4 12.4 L7.8 10.8 M22.6 12.4 L24.2 10.8" stroke="${C.sun}" stroke-width="1.8" stroke-linecap="round"/></g>
    ${waves(21)}`,
  day: () => `<g class="spin"><circle cx="16" cy="16" r="5.6" fill="${C.sun}"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path transform="rotate(${a} 16 16)" d="M16 6.2 V8.4" stroke="${C.gold}" stroke-width="2.2" stroke-linecap="round"/>`).join('')}</g>`,
  sunset: () => `<path d="M4 18 Q16 9 28 18 V22 H4 Z" fill="${C.pink}" opacity="0.55"/><g class="sink"><circle cx="16" cy="19.5" r="6.4" fill="${C.coral}"/></g>${waves(21)}`,
  night: () => `<g class="rock"><path d="M19.6 7.2 A9.4 9.4 0 1 0 24.6 22.2 A7.4 7.4 0 0 1 19.6 7.2 Z" fill="${C.moon}"/></g>
    <path class="twinkle" d="M22.6 8.4 l0.7 1.6 l1.6 0.7 l-1.6 0.7 l-0.7 1.6 l-0.7 -1.6 l-1.6 -0.7 l1.6 -0.7 Z" fill="${C.gold}"/>
    <circle class="twinkle2" cx="25.6" cy="15.6" r="0.9" fill="${C.gold}"/>`,

  // ---- Play mode ----
  school: () => `<g class="swim">${fish(12, 13, 0.55)}${fish(20.5, 16, 0.55)}${fish(12.6, 20, 0.55)}</g>`,
  bigschool: () => `<g class="swim">${[[9.6, 11], [17.2, 9.6], [24, 13], [11, 17.4], [18.6, 16.4], [13.4, 23], [21, 22.4]].map(([x, y]) => fish(x, y, 0.42)).join('')}</g>`,
  hugeschool: () => `<g class="swim">${[[8.8, 9.6], [14.6, 7.6], [20.6, 8.6], [25.2, 12.4], [8, 15], [13.8, 13.4], [19.6, 14.2], [24.8, 18.6],
    [9.6, 20.6], [15.4, 19.4], [20.8, 20.6], [13, 25], [18.6, 25.2]].map(([x, y]) => fish(x, y, 0.33)).join('')}</g>`,
  dots: () => `${fish(21, 16, 0.6, { cls: 'fish' })}<g class="trail"><circle cx="6.6" cy="16" r="1.4" fill="${C.gold}"/><circle cx="10.4" cy="16" r="1.4" fill="${C.gold}"/><circle cx="14" cy="16" r="1.4" fill="${C.gold}"/></g>`,
  line: () => `${fish(22, 14.4, 0.6, { cls: 'fish' })}<path class="trail" d="M4.6 18.6 Q8 13 11 17 T16.4 15.6" fill="none" stroke="${C.gold}" stroke-width="2" stroke-linecap="round"/>`,
  sparkle: () => `${fish(21.6, 17, 0.6, { cls: 'fish' })}
    <path class="twinkle" d="M9.4 9 l1 2.4 l2.4 1 l-2.4 1 l-1 2.4 l-1 -2.4 l-2.4 -1 l2.4 -1 Z" fill="${C.gold}"/>
    <path class="twinkle2" d="M12.4 19.4 l0.6 1.5 l1.5 0.6 l-1.5 0.6 l-0.6 1.5 l-0.6 -1.5 l-1.5 -0.6 l1.5 -0.6 Z" fill="${C.white}"/>`,
  real: () => `<g class="swim">${fish(16.6, 16, 1.2)}</g>`,
  rainbow: () => `<defs><clipPath id="rb-clip"><ellipse cx="17" cy="16" rx="7.4" ry="4.4"/></clipPath></defs>
    <g class="swim"><path d="M11.4 16 L6 11.6 Q7.2 16 6 20.4 Z" fill="${C.pink}" stroke="${C.pink}" stroke-width="1.2" stroke-linejoin="round"/>
    <g clip-path="url(#rb-clip)"><rect x="9" y="11" width="16" height="2.4" fill="${C.coral}"/><rect x="9" y="13.4" width="16" height="2.2" fill="${C.gold}"/>
    <rect x="9" y="15.6" width="16" height="2.2" fill="#7bd88f"/><rect x="9" y="17.8" width="16" height="3" fill="${C.sea}"/></g>
    <circle cx="21" cy="15.2" r="1.3" fill="${C.ink}"/><circle cx="21.4" cy="14.8" r="0.45" fill="${C.white}"/></g>`,
  surprise: () => `<g class="wiggle"><rect x="8" y="14" width="16" height="11" rx="1.6" fill="${C.sea}"/><rect x="7" y="11" width="18" height="4.2" rx="1.4" fill="${C.rim}"/>
    <path d="M16 11 V25" stroke="${C.gold}" stroke-width="2.6"/><path d="M16 11 Q11 5.4 10.6 9.4 Q11 11.4 16 11 Q21 11.4 21.4 9.4 Q21 5.4 16 11 Z" fill="${C.gold}"/></g>`,
};

export const ICON_NAMES = Object.keys(DRAW);

let uid = 0;
/** Inline SVG for a named icon, or '' for an unknown name (the word on the button still says what it does). */
export function icon(name) {
  const draw = DRAW[name];
  if (!draw) return '';
  // clipPath ids must be unique on the page, so each copy gets its own suffix
  const inner = draw().replace(/rb-clip/g, `rb-clip-${++uid}`);
  return `<svg class="ico ico-${name}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${bubble}${inner}</svg>`;
}

/** The icon CSS: size, and the gentle motion (only while on, hovered or pressed, and only without reduced motion). */
export const ICON_CSS = `
.ico { width: 1.6em; height: 1.6em; flex: none; vertical-align: middle; overflow: visible; }
/* only the moving parts get a box origin: on an element with a transform attribute it would shift the drawing */
.ico :is(.swim, .tail, .bob, .hop, .rise, .sink, .spin, .squeeze, .nod, .rock, .twinkle, .twinkle2, .pulse, .grow, .wiggle) { transform-box: fill-box; transform-origin: center; }
@media (prefers-reduced-motion: no-preference) {
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .swim { animation: ico-swim 1.6s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .tail { animation: ico-wag 0.5s ease-in-out infinite alternate; transform-origin: right center; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .bob { animation: ico-bob 1.8s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .hop { animation: ico-hop 0.9s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .rise { animation: ico-rise 2.4s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .sink { animation: ico-sink 2.4s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .spin { animation: ico-spin 8s linear infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .turn { animation: ico-spin 3.2s linear infinite; transform-origin: 16px 16px; transform-box: view-box; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .squeeze { animation: ico-squeeze 1.6s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .nod { animation: ico-nod 1.4s ease-in-out infinite; transform-origin: 40% 100%; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .rock { animation: ico-rock 2.6s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .twinkle { animation: ico-twinkle 1.4s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .twinkle2 { animation: ico-twinkle 1.4s ease-in-out 0.7s infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .wave1 { animation: ico-fade 1.2s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .wave2 { animation: ico-fade 1.2s ease-in-out 0.3s infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .trail { animation: ico-fade 1.4s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .pulse { animation: ico-pulse 1.4s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .grow { animation: ico-pulse 1.6s ease-in-out infinite; }
  :is(button:hover, button:focus-visible, button:active, [aria-checked="true"], [aria-pressed="true"], .ico-live) > .ico .wiggle { animation: ico-wiggle 1.2s ease-in-out infinite; }
}
@keyframes ico-swim { 50% { transform: translateX(1.6px) translateY(-0.6px); } }
@keyframes ico-wag { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
@keyframes ico-bob { 50% { transform: translateY(-1.4px); } }
@keyframes ico-hop { 50% { transform: translateY(-2.2px); } }
@keyframes ico-rise { 0%, 100% { transform: translateY(1.6px); } 50% { transform: translateY(-1.6px); } }
@keyframes ico-sink { 0%, 100% { transform: translateY(-1.4px); } 50% { transform: translateY(1.8px); } }
@keyframes ico-spin { to { transform: rotate(360deg); } }
@keyframes ico-squeeze { 50% { transform: scale(0.86); } }
@keyframes ico-nod { 50% { transform: rotate(-7deg); } }
@keyframes ico-rock { 50% { transform: rotate(-10deg); } }
@keyframes ico-twinkle { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.7); } }
@keyframes ico-fade { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes ico-pulse { 50% { transform: scale(1.08); } }
@keyframes ico-wiggle { 0%, 60%, 100% { transform: rotate(0); } 70% { transform: rotate(-8deg); } 85% { transform: rotate(8deg); } }
`;
