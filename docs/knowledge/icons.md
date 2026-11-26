# Icons

The story's buttons use one icon set drawn for Big Blue Tales: `ui/icons.js` (inline SVG, a name per icon,
`icon(name)` draws it, `ICON_CSS` sizes and moves it). No emoji, no icon font, no outside icon files.

## Rules

- 32 x 32 grid, chunky filled shapes, round ends, at most three colours from the page palette, readable at 24 px.
- Every icon sits in the same deep-sea bubble, so the set reads on the dark button and on the gold "on" button.
- Things a 5 to 7 year old knows (fish, book, beach ball, present, magnifying glass), not adult symbols.
- Keep the shapes kids already know from tablets: play triangle (Start), speaker (Listen), full-screen corners.
- The word stays on every button; the picture never carries the meaning alone.
- Motion only on the button that is on, hovered or pressed, only under `prefers-reduced-motion: no-preference`,
  only transform and opacity. Inline SVG, because the media query does not run inside `<img>`.
- Never put an animated class on an element that has a `transform` attribute: the CSS animation replaces it.
  Wrap it in a `<g>` instead. Never give every element a `transform-origin`: on an element with a transform
  attribute it shifts the drawing (the first board had fish and sun rays flying out of their bubbles).

## Outside guides read (2026-11-26), taken and turned down

| Source | Taken | Turned down |
| --- | --- | --- |
| NN/g, children's UX (nngroup.com/articles/childrens-websites-usability-issues) | narrow age band, big targets, kids know play/volume/full screen | |
| UX Collective, designing apps for young kids | concrete things, no adult metaphors | "labels are useless": we keep a word on every button |
| Smart Interface Design Patterns, design for children | one consistent picture language | |
| Tabler, Lucide, Atlas (MIT), Fluent Emoji (MIT) | grid, round ends, inline SVG technique | their icons: adult line style or emoji, no sea animals |
| svg-animation.com and WCAG 2.3.3 on reduced motion | still icon complete, motion opt-in, transform/opacity only | |
