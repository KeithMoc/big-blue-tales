// Loader: brings one animal pack in, checks it keeps the contract, and takes it out again cleanly.
// A pack is loaded only when someone opens it, so the size of the book does not slow the first screen.
// Licence: MIT.
import * as THREE from 'three';
import * as kit from 'creature-kit';
import { device } from './device.js';

// What one animal may cost. tools/check.mjs fails the build above these; the page warns in the console.
// triangles and drawCalls are counted at rest: what is drawn every frame. peakTriangles and peakDrawCalls are the most
// an animal may reach for the seconds an action plays (a prey fish, bubbles, sparks); tools/check.cjs measures both.
// The shared sea holds 4 animals, so these are a quarter of what one phone frame may cost: 200,000 triangles, 100 draw calls.
export const BUDGET = { triangles: 50000, drawCalls: 25, textureBytes: 16 * 1024 * 1024, peakTriangles: 60000, peakDrawCalls: 32 };
/** A pack may carry a written exception in animal.json: "model": { "budget": { "drawCalls": 31, "why": "..." } } */
export const budgetFor = (animal) => {
  const w = animal.model.budget || {}, b = { ...BUDGET, ...w };
  // a waiver at rest carries the same headroom for an action, unless the pack states its own peak
  if (w.triangles && !w.peakTriangles) b.peakTriangles = Math.max(BUDGET.peakTriangles, w.triangles + (BUDGET.peakTriangles - BUDGET.triangles));
  if (w.drawCalls && !w.peakDrawCalls) b.peakDrawCalls = Math.max(BUDGET.peakDrawCalls, w.drawCalls + (BUDGET.peakDrawCalls - BUDGET.drawCalls));
  return b;
};

const modules = new Map();                 // id -> Promise of the pack module (code is small and kept; GPU memory is not)

/** Load a pack's code and data. The path is the only thing that ties an id to a folder. */
export function loadPack(id) {
  if (!modules.has(id)) {
    const p = import(`../animals/${id}/pack.js`);
    p.catch(() => modules.delete(id));     // a failed load may be tried again
    modules.set(id, p);
  }
  return modules.get(id);
}

const REQUIRED = ['root', 'anchors', 'update', 'actions'];

/**
 * The contract every pack keeps:
 *   create(ctx) -> { root, anchors, update(t, dt, state), actions, busy?, reach?, frame?, rise?, scenery?, floorY?, dispose? }
 *   floorY = height of the pack's own sea floor (model units, in root space); a pack that draws a floor must say it,
 *            so the shell can keep the camera above it
 *   ctx   = { THREE, kit, calm, say(key), env: {floorY}, tier }
 *   tier  = 'high' | 'mid' | 'low', this device's quality tier from core/device.js
 *   state = { glow: 0..1 (1 = dark), focus: hotspot id or null, <toggle id>: 0 or 1 }
 *   actions[id] = { run() } for a scripted action, or { channel } for a toggle the shell flips in state
 * A pack gets no DOM, no renderer and no camera. It can only build objects and speak through ctx.say.
 */
export async function mount(pack, ctx) {
  const creature = await pack.create({ THREE, kit, calm: false, say: () => {}, env: {}, tier: device.tier, ...ctx });
  const id = pack.animal.id;
  for (const k of REQUIRED) if (creature?.[k] == null) throw new Error(`Pack "${id}" broke the contract: create() returned no "${k}".`);
  if (!creature.root.isObject3D) throw new Error(`Pack "${id}": root is not an Object3D.`);
  for (const h of pack.animal.hotspots) if (!creature.anchors[h.id]) throw new Error(`Pack "${id}": hotspot "${h.id}" has no anchor on the model.`);
  for (const a of pack.animal.actions) if (!creature.actions[a.id]) throw new Error(`Pack "${id}": action "${a.id}" is not offered by the model.`);
  if (pack.animal.environment?.floor === 'pack' && !Number.isFinite(creature.floorY)) throw new Error(`Pack "${id}": it draws its own sea floor (environment.floor = "pack") but create() returned no floorY.`);
  creature.root.name = id;
  const m = measure(creature.root);
  const over = [];
  const B = budgetFor(pack.animal);
  if (m.triangles > B.triangles) over.push(`${m.triangles} triangles (budget ${B.triangles})`);
  if (m.drawCalls > B.drawCalls) over.push(`${m.drawCalls} draw calls (budget ${B.drawCalls})`);
  if (over.length) console.warn(`Pack "${id}" is over budget: ${over.join(', ')}.`);
  creature.stats = m;
  return creature;
}

/** Take an animal out of the scene and hand every GPU resource it held back to the driver. */
export function unmount(creature) {
  if (!creature) return;
  try { creature.dispose?.(); } catch (e) { console.error(e); }
  freeTree(creature.root);
  creature.root.removeFromParent();
}

const TEXTURE_SLOTS = ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'bumpMap', 'lightMap', 'envMap', 'displacementMap', 'specularMap'];

/** Dispose every geometry, material, texture and skeleton under root. Safe to call on something already freed. */
export function freeTree(root) {
  const seen = new Set();
  const free = (o) => { if (o && !seen.has(o)) { seen.add(o); o.dispose?.(); } };
  root.traverse((o) => {
    free(o.geometry);
    for (const m of [].concat(o.material || [])) { for (const k of TEXTURE_SLOTS) free(m[k]); free(m); }
    if (o.skeleton) { free(o.skeleton.boneTexture); free(o.skeleton); }
    if (o.isInstancedMesh) o.dispose();
  });
}

/** Count what an animal costs to draw, and scan it for normals that would break on a real GPU. */
export function measure(root) {
  let triangles = 0, drawCalls = 0, vertices = 0, badNormals = 0, textureBytes = 0;
  const textures = new Set(), geos = new Set();
  root.traverse((o) => {
    if (!(o.isMesh || o.isPoints || o.isSprite || o.isLine)) return;
    for (let q = o; q; q = q.parent) if (!q.visible) return;      // not drawn at rest (a prey fish that only appears in an action)
    drawCalls += [].concat(o.material || []).length || 1;
    for (const m of [].concat(o.material || [])) for (const k of TEXTURE_SLOTS) if (m[k]) textures.add(m[k]);
    const g = o.geometry;
    if (!g || !o.isMesh) return;
    const count = g.index ? g.index.count : g.attributes.position.count;
    triangles += (count / 3) * (o.isInstancedMesh ? o.count : 1);
    if (geos.has(g)) return;
    geos.add(g);
    vertices += g.attributes.position.count;
    const n = g.attributes.normal;
    if (n) for (let i = 0; i < n.count; i++) {
      const x = n.getX(i), y = n.getY(i), z = n.getZ(i), l = x * x + y * y + z * z;
      if (!(l > 1e-8) || !Number.isFinite(l)) badNormals++;
    }
  });
  for (const t of textures) { const im = t.image; if (im && im.width) textureBytes += im.width * im.height * 4 * (t.generateMipmaps ? 1.33 : 1); }
  return { triangles: Math.round(triangles), drawCalls, vertices, badNormals, textures: textures.size, textureBytes: Math.round(textureBytes) };
}
