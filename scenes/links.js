// The links between stories, animals, big ideas and places. Nothing is stored twice: a story's own
// scene.json says who is in it (cast), what it shows (ideas), where it is (habitat) and which animals to
// meet next and why (links, each pointing at a fact in that animal's signed dossier). This file reads
// them all once and answers the two questions a page asks:
//   forAnimal(id)  -> [{ scene, why: { young, older } }]   stories to offer on an animal's page
//   forScene(id)   -> { cast, ideas, habitat, next, more }  what to show beside a story
// Every link carries its reason, so the page never says "related" without saying why. Licence: MIT.
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
  const both = (text) => ({ young: text, older: text });
  return {
    index, scenes, get: (id) => byId.get(id),
    forAnimal(animal) {
      const out = [];
      for (const S of scenes) {
        const cast = S.cast.find(c => c.animal === animal), link = (S.links || []).find(l => l.animal === animal);
        if (link) out.push({ scene: S, why: { young: link.young, older: link.older }, fact: link.fact, inCast: !!cast });
        else if (cast) out.push({ scene: S, why: both(`${cast.name}: ${cast.role}.`), inCast: true });
      }
      return out.sort((a, b) => b.inCast - a.inCast);
    },
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
