// The story's sounds: options, button labels, the recorded story voice (ages 5 to 7 only) and the sound effects.
// Copied from the Sea Monsters A to Z book's generated sounds/index.js (main df4fd65) and cut down to this story. Licence: MIT.
const u = (p) => new URL(p, import.meta.url).href;
export const OPTIONS = {"recorded":true,"waitMs":2500,"fallback":{"engine":"browser","lang":"en-AU","rate":0.92},"sfx":{"volume":0.3},"story":{"about":"Sound in a story. sea = how loud the water is while a story is open; music = the optional music, off until the visitor switches it on; the water drops to seaUnderMusic while music plays; fadeMs = how long either takes to come and go.","sea":0.5,"music":0.55,"seaUnderMusic":0.25,"fadeMs":1200}};
export const WORDS = {};
export const LABELS = {"story.listen":"Listen","story.stop":"Stop"};
export const NARRATION = null;
export const STORIES = {
  "anchovy-school": { levels: { "young": { url: u('../scenes/anchovy-school/audio/narration.young.mp3'), lines: {"a5b2e232":[0,9.775],"60d4d65e":[10.125,10.391],"dae70a24":[20.866,8.063],"69444cc7":[29.279,11.17],"93bc4bb7":[40.799,3.784],"5f4ed876":[44.933,2.981],"078601ff":[48.263,3.98],"17ce958c":[52.593,4.324],"27536db8":[57.267,3.86],"e1130486":[61.477,13.077]} } } },
};
export const SFX = {
  "story-sea": { url: u('./shell/sfx.story-sea.mp3'), on: {}, bed: true },
  "story-dart": { url: u('./shell/sfx.story-dart.mp3'), on: {} },
  "story-line": { url: u('./shell/sfx.story-line.mp3'), on: {} },
  "story-more": { url: u('./shell/sfx.story-more.mp3'), on: {"click":"#storysizes button"} },
  "story-splash": { url: u('./shell/sfx.story-splash.mp3'), on: {} },
  "story-music": { url: u('./shell/sfx.story-music.mp3'), on: {}, bed: true },
  "switch": { url: u('./shell/sfx.switch.mp3'), on: {"click":".sw, .pill"} },
  "tap": { url: u('./shell/sfx.tap.mp3'), on: {"click":".act, .tool"} },
};
