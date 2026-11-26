// Scene runner: opens one scene on the page's one engine and water (core/), and closes it again cleanly.
// A scene is a folder: scenes/<id>/scene.json (words, sources, cast, camera, water) and scene.js (the 3D).
//
//   scene.js:  export async function create(ctx) -> { root, update(t, dt), beats, ground?, follow?, rehome?, clear?, dry?, bodies?, stats?, dispose?,
//                                                        sizes?, size?, setSize?, colours?, colour?, setColours?, touch?, draw?, trails?, trail?, setTrail?,
//                                                        times?, time?, setTime?, labels? }
//   ctx      = { THREE, kit, tier, calm, renderer, mount(animalId, { lod }) -> a pack's creature, beat(id), cue(sound id) }
//   mount    = a pack animal as a guest in the story. lod (0.3 to 1) asks the pack for a coarser skin, for a guest that
//              is never close to the eye on a weak device; a pack that has no coarser skin ignores it. The scene moves
//              creature.root and calls creature.update(t, dt) itself; scenes/kit/guest.js gives it the story's light.
//   cue      = the scene heard something happen that has a sound (a splash): the page plays that sound if it exists and
//              the visitor has sounds on. The ids are keys of SFX in sounds/index.js.
//   beats    = { <beat id>: () => void }   jump to that part of the story; the scene calls ctx.beat(id) as its own
//              clock moves from one part to the next, so the words on the page follow the picture
//   ground   = (x, z) -> lowest height the camera may be at there (a sea floor); the engine keeps it above
//   sizes    = ids of the group sizes on offer, setSize(id) picks one; every size must fit the tier's budget
//   colours  = ids of the colour sets ('real' first; the others are pretend and only offered with Play on), setColours(id)
//   touch    = (origin, direction) -> the visitor tapped the water along this ray (Play on only)
//   draw     = (phase 'start'|'move'|'end'|'clear', origin, direction) -> the visitor drags a line in the water (Play on only)
//   trails   = ids of the looks the drawn line can have, setTrail(id) picks one (Play on only)
//              the words for all of these are the `play` block of scene.json
//   times    = ids of the times of day on offer (rows of scenes/kit/daylight.js), setTime(id) moves the whole picture
//              there; the words for each are the `times` block of scene.json. A time of day is a look unless that
//              block gives it a source.
//   labels   = () -> [{ id, at (Vector3), lift, when (beat id) }]: name tags that follow something during one part
//   follow   = () -> the point (Vector3) the camera keeps in the middle of the picture as it moves; the visitor's
//              own turning and zooming carry on around it. Not used when motion is reduced.
//   rehome   = () -> the visitor pressed Back to start: a scene whose animals can be led away sends them back to
//              where the story opens. The view goes back to its opening angle around follow(), so nothing jumps.
//   dry      = () -> true while the camera is out of the water (a scene with a sea surface): the drifting specks
//              of the water are then not drawn
//   clear    = (camera position) -> moves it out of anything else that is solid, once a frame
// A scene gets no DOM and no camera, like a pack. The page around it shows the words. Licence: MIT.
import * as THREE from 'three';
import * as kit from 'creature-kit';
import { resolveEnv, DIVE } from '../core/env.js';
import { loadPack, mount, unmount } from '../core/loader.js';
import { device } from '../core/device.js';

const base = new URL('./', import.meta.url);
const data = new Map();
/** The words and numbers of one scene (cached). */
export function loadScene(id) {
  if (!data.has(id)) { const p = fetch(new URL(`${id}/scene.json`, base)).then(r => { if (!r.ok) throw new Error(`scene "${id}" not found`); return r.json(); }); p.catch(() => data.delete(id)); data.set(id, p); }
  return data.get(id);
}

export function createSceneRunner({ engine, env, onBeat = () => {}, onCue = () => {}, calm = false, specks = () => true }) {
  let live = null, t = 0, token = 0, held = false;   // held: the camera is not led to the follow point (the entry)
  const offset = new THREE.Vector3();

  function close() {
    token++; held = false;
    if (!live) return;
    engine.run(false); engine.setLoop(null, null); engine.setGround(null);
    for (const c of live.mounted) unmount(c);
    try { live.scene.dispose?.(); } catch (e) { console.error(e); }
    live.scene.root.removeFromParent();
    env.clear(); live = null;
  }

  function view(S) {
    const cam = DIVE && S.looks?.dive?.camera ? { ...S.camera, ...S.looks.dive.camera } : S.camera;   // a proposed look may bring its own opening view
    const c = (engine.camera.aspect < 0.9 && cam.homeTall) || cam.home;
    const target = new THREE.Vector3(...c.target);
    return { target, pos: new THREE.Vector3(...c.pos).sub(target).multiplyScalar(engine.lens).add(target) };
  }

  async function open(id) {
    close();
    const mine = ++token, S = await loadScene(id), mod = await import(new URL(`${id}/scene.js`, base).href);
    if (mine !== token) return null;
    const mounted = [];
    const ctx = {
      THREE, kit, tier: device.tier, calm, renderer: engine.renderer,
      async mount(animalId, { lod = 1 } = {}) { const c = await mount(await loadPack(animalId), { calm, lod }); mounted.push(c); return c; },
      beat: (beatId) => onBeat(beatId, S),
      cue: (soundId) => { if (live?.S === S) onCue(soundId, S); },
    };
    const E = resolveEnv(S.environment);
    env.apply(E, { surface: S.environment.surface, floorY: -60 });
    engine.setLook({ bloom: E.bloom, exposure: E.exposure });
    engine.setLens(S.camera.aspect ?? 1.5);
    const scene = await mod.create(ctx);
    if (mine !== token) { for (const c of mounted) unmount(c); scene.dispose?.(); return null; }
    engine.scene.add(scene.root);
    engine.setGround(scene.ground || null);
    engine.setOrbit({ minDistance: S.camera.minDistance ?? 1.5, maxDistance: S.camera.maxDistance ?? 26, minPolarAngle: 0.2, maxPolarAngle: S.camera.maxPolar ?? Math.PI - 0.2 });
    engine.flyTo(view(S), 0);
    t = 0; live = { id, S, scene, mounted };
    engine.setLoop((dt) => {
      const d = calm ? dt * 0.6 : dt; t += d;
      scene.update(t, d);
      if (scene.follow && !calm && !held) engine.shift(offset.subVectors(scene.follow(), engine.controls.target).multiplyScalar(1 - Math.exp(-1.4 * d)));
      scene.clear?.(engine.camera.position);
      env.update({ lit: 1, t, dt: d, bodies: scene.bodies?.() || [], lens: engine.lens, calm, specks: S.environment.specks !== false && !scene.dry?.() && specks() });   // specks(): Settings > Drifting specks
    });
    engine.retry(); engine.run(true);
    return live;
  }

  return {
    open, close,
    get current() { return live; },
    /** Jump to a part of the story (a button on the page). */
    beat(id) { live?.scene.beats?.[id]?.(); },
    /** Back to the opening view. A scene that moves (follow) gets that view around where it is now. */
    home(seconds = 1.2) {
      if (!live) return;
      live.scene.rehome?.();
      const v = view(live.S), at = live.scene.follow && !calm ? live.scene.follow() : null;
      if (at) { v.pos.add(at).sub(v.target); v.target.copy(at); }
      engine.flyTo(v, seconds);
    },
    /** The entry holds the camera still over the sea while the title shows, and lets it go when the glide ends. */
    hold(on) { held = !!on; },
    /** The opening view around where the story is now (for the entry's glide down to the school). */
    homeView() {
      if (!live) return null;
      const v = view(live.S), at = live.scene.follow && !calm ? live.scene.follow() : null;
      if (at) { v.pos.add(at).sub(v.target); v.target.copy(at); }
      return v;
    },
    stats() { const e = engine.stats(); return { ...e, tier: device.tier, ...(live?.scene.stats?.() || {}) }; },
  };
}
