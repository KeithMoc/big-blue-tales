// The links between stories, the animals in them, big ideas and places. Nothing is stored twice: a story's own
// scene.json says who is in it (cast), what it shows (ideas), where it is (habitat) and what to say about an animal
// in it (links, each pointing at a fact in that animal's signed dossier, animals/<id>/dossier.json). This file reads
// them all once and answers what the story view shows beside a story:
//   forScene(id)   -> { cast, ideas, habitat, next, more }
// Every link to another story carries its reason, so the page never says "related" without saying why. Licence: MIT.
import { loadScene } from './runner.js';

let ready = null;
export function loadStories() {
  if (!ready) {
    ready = (async () => {
      const index = await (await fetch(new URL('./index.json', import.meta.url))).json();
      const scenes = await Promise.all(index.scenes.map(loadScene));
      return api(index, scenes);
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

function api(index, scenes) {
  const byId = new Map(scenes.map(s => [s.id, s]));
  return {
    index, scenes, get: (id) => byId.get(id),
    forScene(id) {
      const S = byId.get(id), others = scenes.filter(o => o !== S);
      const ideas = S.shows.map(k => ({ id: k, ...index.ideas[k], also: others.filter(o => o.shows.includes(k)) }));
      const habitat = { id: S.habitat, ...index.habitats[S.habitat], also: others.filter(o => o.habitat === S.habitat) };
      // every other story, each with the reason it sits beside this one (a shared idea first, then a shared place)
      const more = others.map(o => {
        const idea = S.shows.find(k => o.shows.includes(k));
        const why = idea ? `It also shows ${index.ideas[idea].name.toLowerCase()}.` : o.habitat === S.habitat ? `It is also in the ${index.habitats[o.habitat].name.toLowerCase()}.` : `A different place: the ${index.habitats[o.habitat].name.toLowerCase()}.`;
        return { scene: o, why, close: idea ? 2 : o.habitat === S.habitat ? 1 : 0 };
      }).sort((a, b) => b.close - a.close);
      return { scene: S, cast: S.cast, ideas, habitat, next: S.links || [], more };
    },
  };
}

/** A story's recorded voice, from scenes/<id>/audio/narration.json: { levels: { young: { url, lines } } }, or null when
 *  the story has none yet (the browser's own voice then reads its lines). Only the ages 5 to 7 level is used. */
export async function loadVoice(id) {
  try {
    const at = new URL(`./${id}/`, import.meta.url), r = await fetch(new URL('audio/narration.json', at));
    if (!r.ok) return null;
    const L = (await r.json()).levels?.young;
    return L ? { levels: { young: { url: new URL(L.file, at).href, lines: L.lines, cues: L.cues || {} } } } : null;
  } catch { return null; }
}
