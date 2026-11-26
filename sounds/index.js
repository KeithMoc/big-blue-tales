// Sounds shared by every story: options, button labels and the sound effects. Each story's own voice lives in its
// folder (scenes/<id>/audio/narration.json, read by scenes/links.js loadVoice). Each sound file's maker, prompt and
// licence is in sounds/manifest.json. Edited by hand: no tool writes this file. Licence: MIT.
const u = (p) => new URL(p, import.meta.url).href;
export const OPTIONS = {"recorded":true,"waitMs":2500,"fallback":{"engine":"browser","lang":"en-AU","rate":0.92},"sfx":{"volume":0.3},"story":{"about":"Sound in a story. music = how loud the optional music is, off until the visitor switches it on; fadeMs = how long it takes to come and go.","music":0.55,"fadeMs":1200}};
export const LABELS = {"story.listen":"Listen","story.stop":"Stop"};
export const SFX = {
  "story-dart": { url: u('./shell/sfx.story-dart.mp3'), on: {} },
  "story-line": { url: u('./shell/sfx.story-line.mp3'), on: {} },
  "story-more": { url: u('./shell/sfx.story-more.mp3'), on: {"click":"#storysizes button"} },
  "story-splash": { url: u('./shell/sfx.story-splash.mp3'), on: {} },
  "story-music": { url: u('./shell/sfx.story-music.mp3'), on: {}, bed: true },
  "switch": { url: u('./shell/sfx.switch.mp3'), on: {"click":".sw, .pill"} },
  "tap": { url: u('./shell/sfx.tap.mp3'), on: {"click":".act, .tool"} },
};
