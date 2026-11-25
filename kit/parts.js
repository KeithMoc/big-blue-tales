// Kit parts for big, smooth animals (first written for the blue whale, then the great white shark). Licence: MIT.
//   surface        - any parametric surface, with normals taken from the surface itself
//   wing           - a flat, tapering blade (flukes, flippers, dorsal fins)
//   makeSpine      - a chain of bones along x, and skinByX to bind a mesh to it
//   mottleTexture  - soft pale blotches, tileable, mipmapped
//   grooveNormalTexture - lengthwise furrows (throat pleats) as a smooth normal map
import * as THREE from 'three';

const TAU = Math.PI * 2;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * A surface from fn(u, v, out). us and vs are the parameter values of the vertex rows and columns.
 * Normals are the cross product of the two tangents of fn, so neighbouring patches cut from the same
 * fn shade as one skin. tip(u, v, out) supplies the normal where the surface pinches to a point.
 */
export function surface(fn, { us, vs, flip = false, color = null, uv = null, uv1 = null, tip = null, h = 1e-3 }) {
  const pos = [], nor = [], uvs = [], uvs1 = [], col = [], idx = [];
  const p = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
  const n = new THREE.Vector3(), cc = new THREE.Color(), t2 = new THREE.Vector2();
  for (const u of us) for (const v of vs) {
    fn(u, v, p); pos.push(p.x, p.y, p.z);
    fn(u + h, v, a); fn(u - h, v, b); fn(u, v + h, c); fn(u, v - h, d);
    a.sub(b); c.sub(d);
    n.crossVectors(a, c);
    if (flip) n.negate();
    // Relative test with a floor, and never "<": where the surface pinches to a point both sides are exactly 0,
    // and a zero normal must never reach the GPU (it becomes a NaN pixel that bloom smears into a black block).
    // An absolute threshold would also catch thin parts such as small fins and shade them in bands.
    if (!(n.lengthSq() > Math.max(1e-30, 1e-10 * a.lengthSq() * c.lengthSq()))) { if (tip) tip(u, v, n); else n.set(0, 1, 0); } else n.normalize();
    nor.push(n.x, n.y, n.z);
    if (uv) { uv(u, v, t2); uvs.push(t2.x, t2.y); } else uvs.push(u, v);
    if (uv1) { uv1(u, v, t2); uvs1.push(t2.x, t2.y); }
    if (color) { color(u, v, p, cc); col.push(cc.r, cc.g, cc.b); }
  }
  const R = vs.length;
  for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < R - 1; j++) {
    const q = i * R + j, r = q + 1, s = q + R, t = s + 1;
    if (flip) idx.push(q, r, s, r, t, s); else idx.push(q, s, r, r, s, t);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (uv1) g.setAttribute('uv1', new THREE.Float32BufferAttribute(uvs1, 2));
  if (color) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

export const range = (n, f = (t) => t) => Array.from({ length: n + 1 }, (_, i) => f(i / n));

/**
 * A blade. Local frame: +z along the span (root at z = 0), x along the chord (leading edge forward),
 * y through the thickness. le(u), te(u) = x of the leading and trailing edge, thick(u) = thickness,
 * lift(u) = y of the mid-line (dihedral or droop), all for u = 0 (root) to 1 (tip).
 */
export function wing({ span, le, te, thick, lift = () => 0, nu = 22, nv = 24, mirror = false, color = null }) {
  const fn = (u, v, out) => {
    const uu = Math.min(1, Math.max(0, u)), L = le(uu), T = te(uu), ph = TAU * v;
    const x = (L + T) / 2 + (L - T) / 2 * Math.cos(ph);
    // fuller toward the leading edge, like a hydrofoil
    const y = lift(uu) + thick(uu) / 2 * Math.sin(ph) * (1 + 0.35 * Math.cos(ph));
    return out.set(x, y, (mirror ? -1 : 1) * span * u);
  };
  const tip = (u, v, out) => out.set(0, 0, mirror ? -1 : 1);
  return surface(fn, { us: range(nu, t => 1 - Math.pow(1 - t, 1.5)), vs: range(nv), flip: !mirror, tip, color });
}

/** Bones along the x axis. joints = x of each joint, head to tail. bones[0] sits at the origin. */
export function makeSpine(joints) {
  const bones = [new THREE.Bone()];
  let prev = 0;
  for (const x of joints) { const b = new THREE.Bone(); b.position.x = x - prev; prev = x; bones[bones.length - 1].add(b); bones.push(b); }
  bones[0].updateMatrixWorld(true);
  return { bones, skeleton: new THREE.Skeleton(bones), joints };
}

/** Bind every vertex to the spine by its x. blend = half-width of the soft zone around each joint. */
export function skinByX(geometry, joints, blend = 0.3) {
  const pos = geometry.attributes.position, n = pos.count, K = joints.length + 1;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), w = new Float32Array(K);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i);
    let past = 1;
    for (let k = 0; k < K; k++) {
      const next = k < K - 1 ? sstep(joints[k] + blend, joints[k] - blend, x) : 0;
      w[k] = past - next; past = next;
    }
    const order = [...w.keys()].sort((p, q) => w[q] - w[p]).slice(0, 4);
    let sum = 0; for (const k of order) sum += w[k];
    order.forEach((k, j) => { si[i * 4 + j] = k; sw[i * 4 + j] = w[k] / sum; });
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  return geometry;
}

export function skinned(geometry, material, spine, blend) {
  const m = new THREE.SkinnedMesh(skinByX(geometry, spine.joints, blend), material);
  m.bind(spine.skeleton, new THREE.Matrix4());
  m.frustumCulled = false;
  return m;
}

function finish(t, repeat = true) {
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.anisotropy = 8; t.needsUpdate = true;
  return t;
}

function tileNoise(seed, W, H, octaves, rng) {
  const F = new Float32Array(W * H), f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  let total = 0;
  for (const [pu, pv, gain] of octaves) {
    total += gain;
    const r = rng(seed * 977 + pu * 31 + pv), lat = new Float32Array(pu * pv);
    for (let i = 0; i < lat.length; i++) lat[i] = r() * 2 - 1;
    for (let y = 0; y < H; y++) {
      const fy = y / H * pv, yi = Math.floor(fy), v = f(fy - yi), y1 = (yi + 1) % pv;
      for (let x = 0; x < W; x++) {
        const fx = x / W * pu, xi = Math.floor(fx), u = f(fx - xi), x1 = (xi + 1) % pu;
        const a = lat[yi * pu + xi], b = lat[yi * pu + x1], c = lat[y1 * pu + xi], d = lat[y1 * pu + x1];
        const top = a + (b - a) * u;
        F[y * W + x] += gain * (top + (c + (d - c) * u - top) * v);
      }
    }
  }
  for (let i = 0; i < F.length; i++) F[i] /= total;
  return F;
}

/**
 * Pale blotches on a darker ground, as a grey multiplier for the skin colour. Nothing in it is
 * finer than about 8 texels, and it tiles in both directions.
 */
export function mottleTexture(seed, rng, { W = 1024, H = 1024, lo = 0.8 } = {}) {
  const big = tileNoise(seed, W, H, [[10, 12, 1], [20, 24, 0.55], [40, 48, 0.3]], rng);
  const fine = tileNoise(seed + 5, W, H, [[30, 36, 1], [60, 72, 0.45]], rng);
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    // v runs once around the body: the back and flanks (first half) are boldly mottled, the throat
    // and belly (second half) only faintly, as in life. The fade is part of the texture, so no seam.
    const v = y / H, calm = 0.72 * sstep(0.5, 0.6, v) * sstep(1.0, 0.9, v);
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const blotch = sstep(-0.18, 0.42, big[i]), spots = sstep(0.0, 0.55, fine[i]) * 0.5;
      let m = Math.min(1, Math.max(blotch, spots) + 0.12 * big[i]);
      m += (0.7 - m) * calm;
      const g = 255 * (lo + (1 - lo) * m);
      data[i * 4] = g * 0.985; data[i * 4 + 1] = g * 0.995; data[i * 4 + 2] = g; data[i * 4 + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  return finish(t);
}

/**
 * Furrows running along v, `count` of them across u, fading out toward every edge of the patch.
 * Each furrow is at least 20 texels wide, so it never breaks into sparkle. Not tiled.
 */
export function grooveNormalTexture(count, { W = 2048, H = 128, strength = 1 } = {}) {
  const Hm = new Float32Array(W * H), data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1), fv = sstep(0, 0.05, v) * sstep(1, 0.8, v);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1), fu = sstep(0, 0.08, u) * sstep(1, 0.92, u);
      Hm[y * W + x] = -Math.pow(0.5 + 0.5 * Math.cos(TAU * u * count), 2.2) * fu * fv;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xl = Math.max(0, x - 1), xr = Math.min(W - 1, x + 1), yu = Math.max(0, y - 1), yd = Math.min(H - 1, y + 1);
    const dx = (Hm[y * W + xr] - Hm[y * W + xl]) * strength * 3.2, dy = (Hm[yd * W + x] - Hm[yu * W + x]) * strength * 0.6;
    const l = Math.hypot(dx, dy, 1), i = (y * W + x) * 4;
    data[i] = 127.5 - 127.5 * dx / l; data[i + 1] = 127.5 - 127.5 * dy / l; data[i + 2] = 127.5 + 127.5 / l; data[i + 3] = 255;
  }
  return finish(new THREE.DataTexture(data, W, H, THREE.RGBAFormat), false);
}

/** Vertical dark plates with a paler edge each: baleen. */
export function baleenTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#15191c'; x.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 32; i++) { x.fillStyle = '#2f373c'; x.fillRect(i * 16 + 2, 0, 6, 64); }
  const g = x.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(120,110,95,0.35)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
