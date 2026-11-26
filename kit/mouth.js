// Kit mouth: the parts a mouth is made of, so that no pack has to paint one on. Written after the mouth audit
// of 2026-11-25 (docs/knowledge/mouths.md), which found three things wrong again and again: a mouth that is a
// dark stripe on the skin, a lip that is a pipe laid on the body, and an inside that is one flat pink sheet.
//   dense        - where to put more vertices (around a mouth line), as a map for Skin.add or parts.range
//   creased      - presses a lip crease into any point(u, v) surface: a real groove that catches light
//   liningColor  - the colour of the inside of a mouth: gum at the lips, dark toward the throat
//   baleenRack   - a rack of baleen plates, each one a thin wedge, as one geometry
//   toothRow     - a row of teeth (cones, pegs or flat blades), as one geometry
// No shader code: geometry and vertex colours only, for a MeshStandardMaterial with vertexColors.
// Every count, length and colour a pack passes in must come from its dossier. Licence: MIT.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const wrapHalf = (d) => d - Math.round(d);                    // difference of two v values on a closed ring

/**
 * A map t -> v on [from, to] that puts more of the steps near the values in `at` (each within `width`).
 * gain = how many times denser the steps are there. Use as Skin.add's vMap, or parts.range(n, dense({...})).
 */
export function dense({ at, width = 0.03, gain = 4, from = 0, to = 1 }) {
  const N = 512, cdf = new Float32Array(N + 1);
  for (let i = 0; i < N; i++) {
    const v = from + (to - from) * (i + 0.5) / N;
    let rho = 1;
    for (const c of at) { const d = (v - c) / width; rho += gain * Math.exp(-d * d); }
    cdf[i + 1] = cdf[i] + rho;
  }
  return (t) => {
    const want = clamp01(t) * cdf[N];
    let lo = 0, hi = N;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cdf[m] <= want) lo = m; else hi = m; }
    const f = cdf[hi] > cdf[lo] ? (want - cdf[lo]) / (cdf[hi] - cdf[lo]) : 0;
    return from + (to - from) * (lo + f) / N;
  };
}

/**
 * Presses a lip crease into a surface. point(u, v, out) is the skin; line(u) gives the v of the mouth line for
 * u between `from` and `to` (the crease fades out over `fade` of that span at each end; fade may be [front, back]).
 * depth = how far the groove goes in, width = its half-width in v, lip = how far the skin swells out beside the
 * groove (as a share of depth), on the side(s) named by lipSide: 0 both, +1 the side of rising v, -1 the other.
 * mirror = also crease the other flank (v -> 1 - v). inward(p, out) = the direction "into the body" at p; by
 * default straight toward the x axis at height axisY.
 * Returns a new point function, plus .shade(u, v): 0 on plain skin to 1 at the bottom of the groove, for colour.
 * The mesh needs vertices close together across the line: see dense().
 */
export function creased(point, { line, from, to, depth, width, lip = 0.35, lipSide = 0, fade = 0.15, mirror = false, axisY = 0, inward = null, ring = true }) {
  const dir = new THREE.Vector3(), f = Array.isArray(fade) ? fade : [fade, fade], lo = Math.min(from, to), hi = Math.max(from, to), span = hi - lo;
  const along = (u) => smooth(lo, lo + span * f[0] + 1e-9, u) * (1 - smooth(hi - span * f[1] - 1e-9, hi, u));
  const profile = (u, v) => {                                    // [groove 0..1, swell 0..1]
    const a = along(u);
    if (a <= 0) return [0, 0];
    let g = 0, s = 0;
    for (const m of mirror ? [0, 1] : [0]) {
      const c = line(u), raw = v - (m ? 1 - c : c), d = (ring ? wrapHalf(raw) : raw) / width * (m ? -1 : 1);
      if (Math.abs(d) > 5) continue;
      g += Math.exp(-d * d);
      const e1 = (d - 1.9) / 1.1, e2 = (d + 1.9) / 1.1;
      s += (lipSide >= 0 ? Math.exp(-e1 * e1) : 0) + (lipSide <= 0 ? Math.exp(-e2 * e2) : 0);
    }
    return [a * Math.min(1, g), a * Math.min(1, s)];
  };
  const out = (u, v, p = new THREE.Vector3()) => {
    point(u, v, p);
    const [g, s] = profile(u, v);
    if (g === 0 && s === 0) return p;
    if (inward) inward(p, dir); else dir.set(0, axisY - p.y, -p.z);
    const l = dir.length();
    if (!(l > 1e-9)) return p;
    return p.addScaledVector(dir, (g - lip * s) * depth / l);
  };
  out.shade = (u, v) => profile(u, v)[0];
  return out;
}

/** The inside of a mouth: `lip` colour at the rim (k = 0), `deep` at the throat (k = 1), dark early. */
export function liningColor(lip, deep) {
  const a = new THREE.Color(lip), b = new THREE.Color(deep);
  return (k, out = new THREE.Color()) => out.copy(a).lerp(b, Math.pow(clamp01(k), 0.6));
}

/**
 * A rack of baleen plates as one geometry (vertex colours, for a material with side: DoubleSide off: every
 * face is wound to face out of its wedge). count plates hang side by side along root(q, out), q = 0 at the
 * front of the jaw to 1 at the back. Each plate is a thin wedge: its outer edge runs `length(q)` along
 * down(q, out), its top runs `width(q)` along inward(q, out), and its inner edge is cut short and frayed, as
 * real plates wear. gap = the share of each step left open between plates.
 * color = the plate, fringe = the frayed inner edge (paler in most whales; the dossier says which).
 */
export function baleenRack({ root, down, inward, count, length, width, gap = 0.35, color = 0x1b1b1d, fringe = 0x6d675c }) {
  const pos = [], nor = [], col = [], idx = [];
  const R0 = new THREE.Vector3(), R1 = new THREE.Vector3(), R = new THREE.Vector3(), T = new THREE.Vector3(), D = new THREE.Vector3(), I = new THREE.Vector3(), n = new THREE.Vector3();
  const c0 = new THREE.Color(color), c1 = new THREE.Color(fringe), P = Array.from({ length: 8 }, () => new THREE.Vector3());
  const quad = (a, b, c, d, nn, ca, cb, cc, cd) => {            // a-b-c-d around the face, nn its outward normal
    const base = pos.length / 3;
    for (const [p, k] of [[a, ca], [b, cb], [c, cc], [d, cd]]) { pos.push(p.x, p.y, p.z); nor.push(nn.x, nn.y, nn.z); col.push(k.r, k.g, k.b); }
    n.crossVectors(T.subVectors(b, a), D.subVectors(d, a));
    if (n.dot(nn) >= 0) idx.push(base, base + 1, base + 2, base, base + 2, base + 3); else idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  };
  const along = new THREE.Vector3(), dn = new THREE.Vector3(), inw = new THREE.Vector3(), face = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const q = (i + 0.5) / count;
    root(Math.max(0, q - 0.5 / count), R0); root(Math.min(1, q + 0.5 / count), R1); root(q, R);
    along.subVectors(R1, R0); const step = along.length(); if (!(step > 1e-9)) continue;
    along.multiplyScalar(1 / step);
    down(q, dn).normalize(); inward(q, inw).normalize();
    const L = length(q), W = width(q), t = step * (1 - gap) / 2;
    if (!(L > 1e-6)) continue;
    // the wedge: four corners on the near face (-along), four on the far face (+along)
    for (let s = 0; s < 2; s++) {
      const o = (s ? t : -t);
      P[s * 4 + 0].copy(R).addScaledVector(along, o);                                             // top, outer
      P[s * 4 + 1].copy(R).addScaledVector(along, o).addScaledVector(inw, W);                     // top, inner
      P[s * 4 + 2].copy(R).addScaledVector(along, o).addScaledVector(inw, W * 0.55).addScaledVector(dn, L * 0.5);   // inner edge, frayed short
      P[s * 4 + 3].copy(R).addScaledVector(along, o * 0.5).addScaledVector(dn, L);                // the tip, on the outer edge
    }
    face.copy(inw).negate();
    quad(P[0], P[4], P[7], P[3], face, c0, c0, c0, c0);                                           // the outer edge, seen from outside the mouth
    quad(P[1], P[2], P[6], P[5], inw, c1, c1, c1, c1);                                            // the frayed inner edge, seen from the tongue
    quad(P[3], P[7], P[6], P[2], face.copy(dn).addScaledVector(inw, 0.6).normalize(), c0, c0, c1, c1);   // the slanted lower edge
    face.copy(along).negate();
    quad(P[0], P[3], P[2], P[1], face, c0, c0, c1, c1);                                           // the two flat sides
    quad(P[4], P[5], P[6], P[7], along, c0, c1, c1, c0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/**
 * A row of teeth as one geometry with vertex colours. count teeth stand along at(q, out) (q = 0..1), each
 * pointing along dir(q, out). length(q) and radius(q) size them; flat < 1 squeezes them into blades across
 * `across(q, out)` (the direction along the jaw; default: the row's own direction). lean bends the tip along
 * `across` (a share of the length). sides = facets around; tip = how blunt (0 a point, 0.6 a peg).
 * color = the tooth, root = its colour at the gum.
 */
export function toothRow({ at, dir, count, length, radius, across = null, flat = 1, lean = 0, sides = 6, rings = 2, tip = 0, color = 0xe9e4d6, root = 0xb9ad98 }) {
  const pos = [], nor = [], col = [], idx = [];
  const O = new THREE.Vector3(), O0 = new THREE.Vector3(), O1 = new THREE.Vector3(), A = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), p = new THREE.Vector3(), n = new THREE.Vector3();
  const cT = new THREE.Color(color), cR = new THREE.Color(root), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const q = count === 1 ? 0.5 : i / (count - 1);
    at(q, O); dir(q, A).normalize();
    const L = length(q), r = radius(q);
    if (!(L > 1e-6) || !(r > 1e-6)) continue;
    if (across) across(q, X); else { at(Math.max(0, q - 0.01), O0); at(Math.min(1, q + 0.01), O1); X.subVectors(O1, O0); }
    X.addScaledVector(A, -X.dot(A));
    if (!(X.lengthSq() > 1e-12)) X.set(0, 0, 1).addScaledVector(A, -A.z);
    X.normalize(); Y.crossVectors(A, X).normalize();
    const base = pos.length / 3, R = sides + 1;
    for (let k = 0; k <= rings; k++) {
      const h = k / rings, rr = r * (1 - (1 - tip) * h) * (k === rings && tip === 0 ? 0.04 : 1), bend = lean * L * h * h;
      c.copy(cR).lerp(cT, smooth(0, 0.35, h));
      for (let j = 0; j <= sides; j++) {
        const a = TAU * j / sides, cx = Math.cos(a), sy = Math.sin(a);
        p.copy(O).addScaledVector(A, L * h).addScaledVector(X, rr * cx + bend).addScaledVector(Y, rr * sy * flat);
        // the normal of a cone: outward, tilted back by its slope; never zero
        n.set(0, 0, 0).addScaledVector(X, cx * flat).addScaledVector(Y, sy).addScaledVector(A, (1 - tip) * r / L);
        if (!(n.lengthSq() > 1e-12)) n.copy(A);
        n.normalize();
        pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b);
      }
    }
    for (let k = 0; k < rings; k++) for (let j = 0; j < sides; j++) {
      const a = base + k * R + j, b = a + 1, cc = a + R, d = cc + 1;
      idx.push(a, b, cc, b, d, cc);
    }
    if (tip > 0) {                                                // a blunt tooth gets a cap
      const top = pos.length / 3; p.copy(O).addScaledVector(A, L * 1.02).addScaledVector(X, lean * L);
      pos.push(p.x, p.y, p.z); nor.push(A.x, A.y, A.z); col.push(cT.r, cT.g, cT.b);
      for (let j = 0; j < sides; j++) idx.push(base + rings * R + j, base + rings * R + j + 1, top);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}
