// Other schools, far off in the haze: one instanced mesh (one draw call) that costs the CPU nothing a frame.
// Every fish gets its place once, in a few long clumps on a wide ring around the middle; the whole ring then
// turns slowly, so each clump swims past in the distance. The fish are the same size and wear the same look
// as the near school (fishMaterial), with the tail beat run from one shared clock. Licence: MIT.
import { fishGeometry, fishMaterial } from './school.js';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s + 0x6D2B79F5) | 0, (Math.imul(s ^ (s >>> 15), 1 | s) ^ (Math.imul(s ^ (s >>> 7), 61 | s) + (s ^ (s >>> 15)))) >>> 0) / 4294967296); }

export function createFarSchools({ THREE, count = 1200, clumps = 5, length = 0.2, near = 13, far = 22, speed = 0.6, seed = 11 }) {
  const rnd = rng(seed), bell = () => (rnd() + rnd() + rnd()) / 1.5 - 1;       // -1..1, most near 0
  const geometry = fishGeometry(THREE, 0), swim = new Float32Array(count);
  const material = fishMaterial(THREE, { caustics: false });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const C = Array.from({ length: clumps }, (_, k) => ({ a: (k + 0.25 + 0.5 * rnd()) / clumps * 6.2832, r: near + (far - near) * rnd(), y: -2.6 + 5.6 * rnd(), long: 0.16 + 0.14 * rnd(), deep: 0.5 + 0.7 * rnd() }));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), tint = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const c = C[i % clumps], a = c.a + bell() * c.long, taper = 1 - Math.min(1, Math.abs(a - c.a) / c.long) * 0.6;
    const r = c.r + bell() * 1.1 * taper, y = c.y + bell() * c.deep * taper;
    p.set(Math.cos(a) * r, y, Math.sin(a) * r);
    e.set(bell() * 0.12, -a + bell() * 0.14, bell() * 0.35, 'YXZ');             // nose along the way the ring turns, a little lean each
    s.setScalar(length * (0.82 + 0.36 * rnd()));
    mesh.setMatrixAt(i, m.compose(p, q.setFromEuler(e), s));
    mesh.setColorAt(i, tint.setScalar(0.86 + 0.14 * rnd()));
    swim[i] = rnd() * 6.2832;
  }
  geometry.setAttribute('aSwim', new THREE.InstancedBufferAttribute(swim, 1));
  mesh.frustumCulled = false;
  const turn = speed / ((near + far) / 2);                                       // radians a second
  return {
    root: mesh, count, get shown() { return mesh.count; }, look: material.userData.look,
    /** Show only the first n fish (the clumps thin out evenly). */
    setCount(n) { mesh.count = Math.max(0, Math.min(count, n | 0)); },
    update(t) { mesh.rotation.y = -t * turn; material.userData.look.uBeat.value = t * 16; },
    dispose() { geometry.dispose(); material.dispose(); mesh.dispose(); },
  };
}
