// Creature kit: shared building blocks every sea animal is assembled from. Licence: MIT.
//   Loft        - a body skinned over cross-sections along a spine (fish, sharks, whales, eels)
//   buildFin    - a ray-and-membrane fin that can ripple
//   taperTube   - a tapering tube along a curve (lure stalks, lips, teeth, tentacles)
// A creature module supplies numbers (profiles, ray counts); the kit turns them into meshes.
import * as THREE from 'three';

const TAU = Math.PI * 2;

/** Monotone cubic interpolation through (xs, ys). No overshoot, so profiles never bulge by accident. */
export function monotone(xs, ys) {
  const n = xs.length;
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i]
         + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/** Small seeded random generator so every build of a creature is identical. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A body defined by cross-sections along the x axis (head at +x).
 * keys: [{x, top, mid, bot, w}]  top/bot = upper/lower outline, mid = height of the widest point,
 * w = half-width. nose/tail = fraction of the length rounded off into a cap.
 */
export class Loft {
  constructor({ keys, nose = 0.08, tail = 0.04, power = 2.2 }) {
    const x0 = keys[0].x, x1 = keys[keys.length - 1].x;
    const ss = keys.map(k => (k.x - x0) / (x1 - x0));
    this.x0 = x0; this.x1 = x1; this.nose = nose; this.tail = tail; this.power = power;
    this.f = {};
    for (const a of ['top', 'mid', 'bot', 'w']) this.f[a] = monotone(ss, keys.map(k => k[a]));
  }
  sOf(x) { return (x - this.x0) / (this.x1 - this.x0); }
  cap(s) {
    let c = 1;
    if (this.nose > 0 && s < this.nose) { const u = 1 - s / this.nose; c *= Math.sqrt(Math.max(0, 1 - u * u)); }
    if (this.tail > 0 && s > 1 - this.tail) { const u = 1 - (1 - s) / this.tail; c *= Math.sqrt(Math.max(0, 1 - u * u)); }
    return c;
  }
  /** Point on the skin. th = 0 is the +z flank at mid height, PI/2 the back, -PI/2 the belly. */
  point(s, th, out = new THREE.Vector3()) {
    const f = this.f, c = this.cap(s), mid = f.mid(s);
    const cs = Math.cos(th), sn = Math.sin(th), e = 2 / this.power;
    const z = f.w(s) * c * Math.sign(cs) * Math.pow(Math.abs(cs), e);
    const r = (sn >= 0 ? f.top(s) - mid : mid - f.bot(s)) * c;
    const y = mid + r * Math.sign(sn) * Math.pow(Math.abs(sn), e);
    return out.set(this.x0 + (this.x1 - this.x0) * s, y, z);
  }
  normal(s, th, out = new THREE.Vector3()) {
    const h = 1e-3;
    const a = this.point(Math.min(1, s + h), th), b = this.point(Math.max(0, s - h), th);
    const c = this.point(s, th + h), d = this.point(s, th - h);
    const ds = a.sub(b), dth = c.sub(d);
    out.crossVectors(dth, ds);
    if (this.x1 > this.x0) out.negate();
    // At the very tip of a cap every point of the ring is the same point, so the cross product is zero
    // there and the surface faces straight along the spine. The test is RELATIVE to the two tangents, so a
    // thin part (a fin, a tooth) is not mistaken for a tip, and it is written as "not greater than" with a
    // floor so that an exact zero can never get through: a zero normal becomes a NaN pixel on a real GPU,
    // and the bloom pass smears that into a black block.
    if (!(out.lengthSq() > Math.max(1e-30, 1e-12 * ds.lengthSq() * dth.lengthSq()))) return out.set(Math.sign(this.x0 - this.x1) * (s < 0.5 ? 1 : -1), 0, 0);
    return out.normalize();
  }
  /** arc = [from, to] in radians; a full turn makes a closed body, half a turn makes a scoop (a jaw). */
  geometry({ rings = 64, radial = 40, arc = [-Math.PI / 2, TAU - Math.PI / 2], color = null, flip = false } = {}) {
    const closed = Math.abs(arc[1] - arc[0] - TAU) < 1e-6;
    const pos = [], nor = [], uv = [], col = [], idx = [];
    const p = new THREE.Vector3(), nn = new THREE.Vector3(), cc = new THREE.Color();
    for (let i = 0; i <= rings; i++) {
      // bunch rings toward both ends, where the caps curve fastest
      const s = 0.5 - 0.5 * Math.cos(Math.PI * i / rings);
      for (let j = 0; j <= radial; j++) {
        const th = arc[0] + (arc[1] - arc[0]) * j / radial;
        this.point(s, th, p);
        pos.push(p.x, p.y, p.z);
        // Normals come from the surface itself, not from the triangles. Triangle-averaged normals go
        // wrong at the cap tips (zero-area triangles) and shade unevenly where rings bunch up.
        this.normal(s, th, nn);
        nor.push(nn.x, nn.y, nn.z);
        uv.push(s, j / radial);
        if (color) { color(s, th, p, cc); col.push(cc.r, cc.g, cc.b); }
      }
    }
    const R = radial + 1;
    for (let i = 0; i < rings; i++) for (let j = 0; j < radial; j++) {
      const a = i * R + j, b = a + 1, c = a + R, d = c + 1;
      if (flip !== (this.x1 > this.x0)) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);   // faces always point out
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (color) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  }
}

/**
 * Join geometries into one, so parts that never move against each other cost one draw call instead of many.
 * parts: [{ geo, matrix? }] or plain geometries. Each needs position and normal; uv is kept when all have it.
 * The parts' own geometries are disposed.
 */
export function mergeGeometries(parts) {
  const list = parts.map(p => p.isBufferGeometry ? { geo: p } : p);
  const withUv = list.every(p => p.geo.attributes.uv), withCol = list.every(p => p.geo.attributes.color);
  const pos = [], nor = [], uv = [], col = [], idx = [];
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  let base = 0;
  for (const { geo, matrix } of list) {
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, C = geo.attributes.color;
    if (matrix) nm.getNormalMatrix(matrix);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); n.fromBufferAttribute(N, i);
      if (matrix) { v.applyMatrix4(matrix); n.applyMatrix3(nm).normalize(); }
      pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z);
      if (withUv) uv.push(U.getX(i), U.getY(i));
      if (withCol) col.push(C.getX(i), C.getY(i), C.getZ(i));
    }
    if (geo.index) for (let i = 0; i < geo.index.count; i++) idx.push(base + geo.index.getX(i));
    else for (let i = 0; i < P.count; i++) idx.push(base + i);
    base += P.count;
    geo.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (withUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (withCol) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/** Replace any zero or non-finite normal with a fallback direction. A zero normal must never reach the GPU. */
export function safeNormals(geometry, fallback = new THREE.Vector3(0, 1, 0)) {
  const n = geometry.attributes.normal; let fixed = 0;
  for (let i = 0; i < n.count; i++) {
    const x = n.getX(i), y = n.getY(i), z = n.getZ(i), l = x * x + y * y + z * z;
    if (!(l > 1e-12) || !Number.isFinite(l)) { n.setXYZ(i, fallback.x, fallback.y, fallback.z); fixed++; }
  }
  if (fixed) n.needsUpdate = true;
  return fixed;
}

/** A tube whose radius changes along its length. radius(t) with t in 0..1. */
export function taperTube(curve, { segs = 24, radial = 8, radius = () => 0.02 } = {}) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], idx = [], uv = [];
  const p = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, r = radius(t);
    curve.getPointAt(t, p);
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = TAU * j / radial;
      v.copy(p).addScaledVector(N, Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r);
      pos.push(v.x, v.y, v.z); uv.push(t, j / radial);
      v.set(0, 0, 0).addScaledVector(N, Math.cos(a)).addScaledVector(B, Math.sin(a));
      nor.push(v.x, v.y, v.z);
    }
  }
  const R = radial + 1;
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * R + j, b = a + 1, c = a + R, d = c + 1;
    idx.push(a, b, c, b, d, c);   // outward faces: the ring runs from N toward B = T x N
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}

/**
 * A fin: rays fanned from a base, joined by membrane.
 * rays: [{base: Vector3, dir: Vector3, len}]   normal: the direction the fin ripples in.
 */
export function buildFin({ rays, segs = 6, normal = new THREE.Vector3(0, 0, 1), material }) {
  const n = rays.length, R = segs + 1;
  const pos = new Float32Array(n * R * 3), uv = [], idx = [];
  for (let i = 0; i < n; i++) for (let k = 0; k <= segs; k++) uv.push(i / (n - 1), k / segs);
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < segs; k++) {
    const a = i * R + k, b = a + 1, c = a + R, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, material);
  const v = new THREE.Vector3();
  /** amp = how far the tips swing (as a share of ray length), phase = lag between neighbouring rays */
  mesh.userData.ripple = (t, amp = 0.12, speed = 2, phase = 0.5) => {
    for (let i = 0; i < n; i++) {
      const r = rays[i];
      for (let k = 0; k <= segs; k++) {
        const f = k / segs;
        const off = amp * r.len * Math.pow(f, 1.6) * Math.sin(speed * t - phase * i);
        v.copy(r.base).addScaledVector(r.dir, r.len * f).addScaledVector(normal, off);
        pos.set([v.x, v.y, v.z], (i * R + k) * 3);
      }
    }
    g.attributes.position.needsUpdate = true;
    g.computeVertexNormals();
    safeNormals(g, normal);
  };
  mesh.userData.ripple(0, 0);
  g.computeBoundingSphere();
  return mesh;
}

/** Membrane texture with one pale line per fin ray. */
export function finTexture(nRays, { membrane = 'rgba(24,19,22,0.8)', ray = 'rgba(78,70,74,0.96)' } = {}) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = membrane; x.fillRect(0, 0, 512, 64);
  x.fillStyle = ray;
  for (let i = 0; i < nRays; i++) { const u = i / (nRays - 1) * 512; x.fillRect(u - 2, 0, 4, 64); }
  // membrane thins toward the trailing edge
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = g; x.fillRect(0, 0, 512, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Smooth 3D value noise in -1..1, the same for every build. Use it for colour and height variation
 * that follows the surface, instead of one random number per vertex (which shows up as speckle).
 */
export function noise3(seed = 1) {
  const h = (x, y, z) => {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647) ^ Math.imul(seed, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = f(x - xi), v = f(y - yi), w = f(z - zi);
    const L = (a, b, t) => a + (b - a) * t;
    return 2 * L(
      L(L(h(xi, yi, zi), h(xi + 1, yi, zi), u), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w) - 1;
  };
}

/**
 * Tangent-space normal map for soft, scaleless skin: tileable noise with nothing finer than about
 * 6 texels, so it never breaks into single-pixel sparkle. Returned with mipmaps and anisotropic
 * filtering switched on. strength = how deep the wrinkles look.
 */
export function skinNormalTexture(seed = 7, { size = 512, octaves = [[10, 1], [20, 0.5], [40, 0.25]], strength = 1 } = {}) {
  const S = size, H = new Float32Array(S * S);
  // tileable value noise: lattice coordinates wrap at the period of each octave
  for (const [period, gain] of octaves) {
    const r = rng(seed * 131 + period), lat = new Float32Array(period * period);
    for (let i = 0; i < lat.length; i++) lat[i] = r() * 2 - 1;
    const f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const fx = x / S * period, fy = y / S * period, xi = Math.floor(fx), yi = Math.floor(fy);
      const u = f(fx - xi), v = f(fy - yi), x1 = (xi + 1) % period, y1 = (yi + 1) % period;
      const a = lat[yi * period + xi], b = lat[yi * period + x1], c = lat[y1 * period + xi], d = lat[y1 * period + x1];
      H[y * S + x] += gain * (a + (b - a) * u + (c + (d - c) * u - (a + (b - a) * u)) * v);
    }
  }
  const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const xl = (x + S - 1) % S, xr = (x + 1) % S, yu = (y + S - 1) % S, yd = (y + 1) % S;
    const dx = (H[y * S + xr] - H[y * S + xl]) * strength * S / 128, dy = (H[yd * S + x] - H[yu * S + x]) * strength * S / 128;
    const l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    data[i] = 127.5 - 127.5 * dx / l; data[i + 1] = 127.5 - 127.5 * dy / l; data[i + 2] = 127.5 + 127.5 / l; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Soft round sprite texture for glows and drifting particles. */
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.35)')); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const KIT_VERSION = 6;
