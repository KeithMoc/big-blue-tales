// The key a read-aloud line is filed under: the page (ui/speech.js) and tools/story-voice.mjs both
// take it from here, so a recorded line and the words asking for it can never drift apart. Licence: MIT.
/** FNV-1a, 32 bit, over the text's UTF-16 units: small, fast and the same in Node and the browser. */
export function lineKey(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
