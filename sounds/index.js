// Sounds shared by every story: options, button labels and the sound effects. Each story's own voice lives in its
// folder (scenes/<id>/audio/narration.json, read by scenes/links.js loadVoice). Each sound file's maker, prompt and
// licence is in sounds/manifest.json. Edited by hand: no tool writes this file. Licence: MIT.
const u = (p) => new URL(p, import.meta.url).href;
export const OPTIONS = {"recorded":true,"waitMs":2500,"fallback":{"engine":"browser","lang":"en-AU","rate":0.92},"sfx":{"volume":0.3},"story":{"about":"Sound in a story. music = how loud the music is, on from Start until the visitor turns it off; duck = how loud it is while a line is read; fadeMs = how long it takes to come and go. sea = the sea now and then (never a steady bed): every = the gap in seconds, from and to; swell and bubbles = how loud each is, times sfx.volume.","music":0.35,"duck":0.12,"fadeMs":1200,"sea":{"every":[7,14],"swell":0.9,"bubbles":0.6}}};
export const LABELS = {"story.listen":"Listen","story.stop":"Stop"};
export const SFX = {
  "story-dart": { url: u('./shell/sfx.story-dart.mp3'), on: {} },
  "story-line": { url: u('./shell/sfx.story-line.mp3'), on: {} },
  "story-more": { url: u('./shell/sfx.story-more.mp3'), on: {"click":"#storysizes button"} },
  "story-splash": { url: u('./shell/sfx.story-splash.mp3'), on: {} },
  "sea-swell": { url: u('./shell/sfx.sea-swell.mp3'), on: {} },
  "sea-bubbles": { url: u('./shell/sfx.sea-bubbles.mp3'), on: {} },
  "story-music": { url: u('./shell/sfx.story-music.mp3'), on: {}, bed: true },
  "switch": { url: u('./shell/sfx.switch.mp3'), on: {"click":".sw, .pill"} },
  "tap": { url: u('./shell/sfx.tap.mp3'), on: {"click":".act, .tool"} },
};
