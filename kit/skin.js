// Kit skin: build an animal as a few closed parametric surfaces gathered into one mesh, and bend it on
// the CPU with exact normals. The sea lion's model (animals/sea-lion/model/) is built with it.
//   surfaceNormal  - a normal from the surface itself, never zero
//   Skin           - collects surfaces, strips and flat triangles into one geometry (position, normal, colour, uv)
//   finSurface     - a thin closed blade between a leading and a trailing edge (fins, flukes, flippers)
//   tubeSurface    - a tapering closed tube along any curve (barbels, spines, arms, tusks)
//   loftSurface    - a kit Loft as a point(u, v) function
//   createBender   - a travelling wave along x that turns each slice rigidly, with sockets that ride it
//   eyeGeometry    - an eyeball with a pupil and an iris painted into vertex colours
//   anchor         - a hotspot anchor with a facing direction
// Licence: MIT.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
/** Ring spacing that bunches toward both ends of a closed body, where caps curve fastest. */
export const bunch = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);
/** Ring spacing that bunches toward the tip (u = 1) of a fin or a spine. */
export const tipward = (u) => 1 - Math.pow(1 - u, 1.4);

/**
 * Normal of point(u, v) from its two tangents. Where a ring collapses to a point (fin tips, cap tips) the
 * cross product is zero, so the normal is taken a hair further in instead. A zero normal must never reach
 * the GPU: it turns into NaN pixels that bloom smears into a black block.
 */
const _a = V(), _b = V(), _c = V(), _d = V();
export function surfaceNormal(point, u, v, out) {
  const h = 1e-4;
  for (const nudge of [0, 1e-3, 5e-3, 2e-2, 8e-2]) {
    const uu = u + Math.sign(0.5 - u) * nudge;
    point(Math.min(1, uu + h), v, _a); point(Math.max(0, uu - h), v, _b);
    point(uu, v + h, _c); point(uu, v - h, _d);
    _a.sub(_b); _c.sub(_d);
    out.crossVectors(_a, _c);
    if (out.lengthSq() > Math.max(1e-30, 1e-10 * _a.lengthSq() * _c.lengthSq())) return out.normalize();
  }
  return out.set(0, 1, 0);
}

/** Collects surfaces into one set of buffers, so many parts cost one draw call. */
export class Skin {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.uv = []; this.idx = []; this.ranges = {}; }
  get count() { return this.pos.length / 3; }
  /**
   * point(u, v, out): a surface, v running once around (or across, for an open sheet).
   * probe = [u, v, direction]: the normal at (u, v) must point along direction; this settles inside from outside.
   * color(p, n, u, v, c) fills c. uv(u, v) -> [s, t] (default [u, v]). name records the vertex range in this.ranges.
   * vMap spaces the columns around the body, as uMap spaces the rings (kit/mouth.js dense() bunches them at a mouth line).
   */
  add(point, { nu, nv, uMap = (u) => u, vMap = (v) => v, color = null, probe, uv = null, name = null }) {
    const p = V(), n = V(), c = new THREE.Color(1, 1, 1), base = this.count;
    const sign = Math.sign(surfaceNormal(point, probe[0], probe[1], n).dot(probe[2])) || 1;
    for (let i = 0; i <= nu; i++) {
      const u = uMap(i / nu);
      for (let j = 0; j <= nv; j++) {
        const v = vMap(j / nv);
        point(u, v, p); surfaceNormal(point, u, v, n).multiplyScalar(sign);
        if (color) color(p, n, u, v, c);
        this.pos.push(p.x, p.y, p.z); this.nor.push(n.x, n.y, n.z); this.col.push(c.r, c.g, c.b);
        if (uv) { const t = uv(u, v); this.uv.push(t[0], t[1]); } else this.uv.push(u, v);
      }
    }
    const R = nv + 1;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = base + i * R + j, b = a + 1, cc = a + R, d = cc + 1;
      if (sign > 0) this.idx.push(a, cc, b, b, cc, d); else this.idx.push(a, b, cc, b, d, cc);
    }
    if (name) this.ranges[name] = [base, this.count];
    return this;
  }
  /** A strip of quads lying on another surface (gill slits, a mouth line, a stripe). rows = [[P, P, normal], ...] */
  strip(rows, color) {
    const base = this.count, e1 = V(), e2 = V(), f = V();
    for (const [a, b, n] of rows) for (const p of [a, b]) { this.pos.push(p.x, p.y, p.z); this.nor.push(n.x, n.y, n.z); this.col.push(color.r, color.g, color.b); this.uv.push(0, 0); }
    for (let i = 0; i < rows.length - 1; i++) {
      const a = base + 2 * i, b = a + 1, c = a + 2, d = a + 3;
      e1.subVectors(rows[i + 1][0], rows[i][0]); e2.subVectors(rows[i][1], rows[i][0]);
      if (f.crossVectors(e1, e2).dot(rows[i][2]) > 0) this.idx.push(a, c, b, b, c, d); else this.idx.push(a, b, c, b, d, c);
    }
    return this;
  }
  /** One flat triangle facing along n (a tooth, a scute). */
  tri(a, b, c, n, color) {
    const base = this.count, f = V().crossVectors(V().subVectors(b, a), V().subVectors(c, a));
    const nn = n.clone().normalize();
    for (const p of [a, b, c]) { this.pos.push(p.x, p.y, p.z); this.nor.push(nn.x, nn.y, nn.z); this.col.push(color.r, color.g, color.b); this.uv.push(0, 0); }
    if (f.dot(n) > 0) this.idx.push(base, base + 1, base + 2); else this.idx.push(base, base + 2, base + 1);
    return this;
  }
  get triangles() { return this.idx.length / 3; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    return g;
  }
}

/**
 * A fin: a thin closed blade between a leading and a trailing edge that meet at the tip.
 * O = origin, A and B = two unit directions spanning the fin's plane (A along the body, B along the span).
 * lead and trail are quadratic curves [[a, b], [a, b], [a, b]] in that plane, root to tip; they must end at the
 * same point. thick = thickness at the root. Returns { point, N } for Skin.add (probe: [0.3, 0.25, N]).
 */
export function finSurface({ O, A, B, lead, trail, thick }) {
  const N = V().crossVectors(A, B).normalize();
  const bez = (c, w, k) => (1 - w) * (1 - w) * c[0][k] + 2 * w * (1 - w) * c[1][k] + w * w * c[2][k];
  const point = (u, v, out = V()) => {
    const a = TAU * v, c = (1 - Math.cos(a)) / 2;
    const pa = lerp(bez(lead, u, 0), bez(trail, u, 0), c), pb = lerp(bez(lead, u, 1), bez(trail, u, 1), c);
    const h = thick * Math.pow(Math.max(0, 1 - u), 0.6) * Math.sin(a) * (1 - 0.5 * c);
    return out.copy(O).addScaledVector(A, pa).addScaledVector(B, pb).addScaledVector(N, h);
  };
  return { point, N };
}

/**
 * A closed tube along path(u, out) with radius(u); the radius is rounded off to zero over `cap` of the
 * length at each end unless open. up = any direction not parallel to the path (it fixes the twist).
 * Returns point(u, v) for Skin.add. Probe it with the direction `up` at v = 0.25.
 */
export function tubeSurface(path, radius, { up = V(0, 1, 0), cap = 0.04, flat = 1 } = {}) {
  const p0 = V(), p1 = V(), T = V(), S = V(), U = V();
  return (u, v, out = V()) => {
    const uu = clamp01(u), h = 1e-3;
    path(Math.min(1, uu + h), p1); path(Math.max(0, uu - h), p0);
    T.subVectors(p1, p0).normalize();
    S.crossVectors(T, up); if (S.lengthSq() < 1e-10) S.set(0, 0, 1); S.normalize();
    U.crossVectors(S, T).normalize();
    let r = radius(uu);
    if (cap > 0) { const e = Math.min(uu, 1 - uu); if (e < cap) { const k = 1 - e / cap; r *= Math.sqrt(Math.max(0, 1 - k * k)); } }
    const a = TAU * v;
    path(uu, out);
    return out.addScaledVector(S, r * flat * Math.cos(a)).addScaledVector(U, r * Math.sin(a));
  };
}

/** A kit Loft as point(u, v): v = 0 is the belly line, 0.25 the +z flank, 0.5 the back, 0.75 the -z flank. */
export const loftSurface = (loft) => (u, v, out = V()) => loft.point(clamp01(u), -Math.PI / 2 + TAU * v, out);

/**
 * Bends geometries along x, each slice turned rigidly so positions and normals stay exact.
 * spine(x, o) must set o.d (the shift of the spine at x) and o.m (its slope, d(shift)/dx).
 * axis 'z' bends side to side (fish, sharks, eels); axis 'y' bends up and down (whales, rays, plesiosaurs).
 *   const bender = createBender({ axis: 'z', spine });  bender.add(geometry);  const s = bender.socket(group, x);
 *   every frame: bender.apply();
 * A geometry bent this way needs mesh.frustumCulled = false.
 */
export function createBender({ axis = 'z', spine }) {
  const k = axis === 'z' ? 2 : 1, items = [], sockets = [], o = { d: 0, m: 0 };
  return {
    add(geo) { items.push({ geo, pos: Float32Array.from(geo.attributes.position.array), nor: Float32Array.from(geo.attributes.normal.array) }); return geo; },
    /** A holder that rides the spine at x: parent eyes, separate fins and hotspot anchors to it. */
    socket(parent, x) { const g = new THREE.Group(); g.userData.x = x; parent.add(g); sockets.push(g); return g; },
    apply() {
      for (const it of items) {
        const rp = it.pos, rn = it.nor, p = it.geo.attributes.position.array, n = it.geo.attributes.normal.array;
        for (let i = 0; i < rp.length; i += 3) {
          const x = rp[i], q = rp[i + k];
          spine(x, o);
          const c = 1 / Math.sqrt(1 + o.m * o.m), s = o.m * c;
          p[i] = x - q * s; p[i + k] = o.d + q * c;
          n[i] = rn[i] * c - rn[i + k] * s; n[i + k] = rn[i] * s + rn[i + k] * c;
        }
        it.geo.attributes.position.needsUpdate = true; it.geo.attributes.normal.needsUpdate = true;
      }
      for (const g of sockets) {
        spine(g.userData.x, o);
        if (k === 2) { g.position.set(g.userData.x, 0, o.d); g.rotation.set(0, -Math.atan(o.m), 0); }
        else { g.position.set(g.userData.x, o.d, 0); g.rotation.set(0, 0, Math.atan(o.m)); }
      }
    },
  };
}

/**
 * An eyeball looking along +z of its own frame: pupil, iris and the rest painted into vertex colours.
 * pupil and iris are half-angles in radians. Use with a material that has vertexColors and low roughness.
 */
export function eyeGeometry(r, { pupil = 0.45, iris = 0.85, pupilColor = 0x050607, irisColor = 0xc9b25a, restColor = 0x1a1c1c, slit = 1 } = {}) {
  const g = new THREE.SphereGeometry(r, 24, 16), P = g.attributes.position, col = new Float32Array(P.count * 3);
  const cp = new THREE.Color(pupilColor), ci = new THREE.Color(irisColor), cr = new THREE.Color(restColor), c = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) / r, y = P.getY(i) / r, z = P.getZ(i) / r;
    const a = Math.acos(Math.min(1, Math.max(-1, z))), ap = Math.atan2(Math.hypot(x * slit, y), Math.max(1e-6, z));   // slit > 1 narrows the pupil sideways
    c.copy(cr).lerp(ci, 1 - smooth(iris - 0.08, iris + 0.08, a)).lerp(cp, z > 0 ? 1 - smooth(pupil - 0.06, pupil + 0.06, ap) : 0);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** A hotspot anchor: where the dot sits and which way that bit of skin faces (the dot dims when it faces away). */
export function anchor(parent, pos, normal = V(0, 1, 0)) {
  const o = new THREE.Object3D();
  o.position.copy(pos); o.userData.normal = normal.clone().normalize();
  parent.add(o);
  return o;
}

/** A painted texture for a body: draw(ctx2d, W, H) with x = along the body (u) and y = around it (v). */
export function paintTexture(W, H, draw) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  draw(c.getContext('2d'), W, H);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapT = THREE.RepeatWrapping; t.flipY = false;   // canvas y = v * H
  return t;
}
