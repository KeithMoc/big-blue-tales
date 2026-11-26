// S is for Sea Lion: Zalophus californianus, a grown male California sea lion about 2.25 metres long.
// Built from published descriptions (see ../dossier.json): a streamlined, torpedo-shaped body with strong, bulky
// shoulders that tapers to the tail; a dog-like head with a long muzzle that tapers to a fairly blunt end; whiskers
// on the muzzle; small visible ear flaps; a raised forehead crest (adult males only), lighter than the body; long,
// wing-like front flippers that row it along; hind flippers that trail behind like a rudder, with a small flat tail
// between them. Dark chestnut brown with a sandier belly and black, almost bare flippers.
// Model units: 1 unit = 75 cm. Body 3 units from the nose to the tip of the tail. Head at +x, back at +y.
// Runtime contract: create(ctx) -> { root, anchors, update, actions, busy, reach, rise }.
// SPDX-License-Identifier: MIT
import * as THREE from 'three';
import { Loft, noise3, monotone, rng } from 'creature-kit';
import { TAU, V, lerp, clamp01, smooth, bunch, tipward, Skin, finSurface, tubeSurface, loftSurface, createBender, eyeGeometry, anchor, paintTexture } from 'creature-kit/skin';

export function create(ctx = {}) {
  const root = new THREE.Group(), pose = new THREE.Group(), swim = new THREE.Group();
  root.add(pose); pose.add(swim);
  const nz = noise3(311);
  // lod: 1 on its own page. A story that has it as a guest far from the eye may ask for a coarser skin (ctx.lod, 0.3 to 1):
  // the same shape, paint and motion with fewer triangles (docs/THREEJS.md, guests in a story).
  const lod = Math.max(0.3, Math.min(1, ctx.lod ?? 1)), cut = (n) => Math.max(8, Math.round(n * lod));

  // ---------- body: a dog-like muzzle, a high domed forehead (the male's crest), a thick neck, bulky shoulders,
  // a deep chest, then a long taper to the hips and a small tail ----------
  const XN = 1.5, XT = -1.5, POWER = 2.1;
  const body = new Loft({
    keys: [
      { x: 1.500, top: -0.010, mid: -0.045, bot: -0.080, w: 0.026 },
      { x: 1.475, top: 0.012, mid: -0.045, bot: -0.105, w: 0.050 },
      { x: 1.420, top: 0.034, mid: -0.045, bot: -0.128, w: 0.070 },
      { x: 1.350, top: 0.055, mid: -0.042, bot: -0.145, w: 0.084 },
      { x: 1.290, top: 0.088, mid: -0.036, bot: -0.162, w: 0.104 },
      { x: 1.225, top: 0.175, mid: -0.030, bot: -0.176, w: 0.124 },
      { x: 1.150, top: 0.250, mid: -0.024, bot: -0.188, w: 0.140 },
      { x: 1.060, top: 0.282, mid: -0.020, bot: -0.198, w: 0.152 },
      { x: 0.960, top: 0.270, mid: -0.016, bot: -0.210, w: 0.160 },
      { x: 0.840, top: 0.262, mid: -0.010, bot: -0.236, w: 0.178 },
      { x: 0.660, top: 0.290, mid: -0.004, bot: -0.290, w: 0.222 },
      { x: 0.420, top: 0.340, mid: 0, bot: -0.340, w: 0.266 },
      { x: 0.150, top: 0.352, mid: 0, bot: -0.350, w: 0.272 },
      { x: -0.150, top: 0.332, mid: 0, bot: -0.322, w: 0.250 },
      { x: -0.500, top: 0.270, mid: 0, bot: -0.252, w: 0.198 },
      { x: -0.820, top: 0.190, mid: 0, bot: -0.172, w: 0.138 },
      { x: -1.080, top: 0.118, mid: 0, bot: -0.104, w: 0.086 },
      { x: -1.280, top: 0.066, mid: 0, bot: -0.056, w: 0.050 },
      { x: -1.420, top: 0.036, mid: 0, bot: -0.030, w: 0.026 },
      { x: -1.500, top: 0.020, mid: 0, bot: -0.016, w: 0.012 },
    ], nose: 0.014, tail: 0.02, power: POWER,
  });
  const loftPoint = loftSurface(body);
  const topAt = (x) => { const s = body.sOf(x); return body.f.mid(s) + (body.f.top(s) - body.f.mid(s)) * body.cap(s); };

  // ---------- the coat, painted: x runs nose to tail, y once around (0.5 = the back) ----------
  // h is the height on the flank, -1 the belly line, 0 the widest point, +1 the back line.
  // Dark chestnut brown; sandier on the belly; the crest, the muzzle and the ring round the eye lighter (they lighten
  // with age on most males); a dark, bare nose pad.
  const EYE_X = 1.2, EYE_H = 0.34;
  const skinTex = paintTexture(1024, 512, (g, W, H) => {
    const img = g.createImageData(W, H), d = img.data, E = POWER / 2;
    const BACK = [58, 40, 29], SIDE = [84, 60, 42], BELLY = [128, 98, 68], CREST = [168, 136, 98], MUZZLE = [132, 104, 78], NOSE = [34, 27, 24];
    for (let py = 0; py < H; py++) {
      const sn = Math.sin(-Math.PI / 2 + TAU * (py + 0.5) / H), h = Math.sign(sn) * Math.pow(Math.abs(sn), 1 / E);
      for (let px = 0; px < W; px++) {
        const x = XN + (XT - XN) * (px + 0.5) / W;
        const back = smooth(-0.1, 0.7, h);
        const belly = 1 - smooth(-0.85, -0.35, h);
        const crest = 0.85 * smooth(0.9, 1.04, x) * (1 - smooth(1.14, 1.24, x)) * smooth(0.3, 0.75, h);
        const muzzle = smooth(1.28, 1.38, x) * (1 - smooth(1.47, 1.495, x)) * (0.55 + 0.45 * smooth(-0.6, 0.4, h));
        const ex = (x - EYE_X) / 0.05, eh = (h - EYE_H) / 0.22, ring = 0.7 * Math.exp(-(ex * ex + eh * eh));
        const nose = smooth(1.478, 1.495, x) * smooth(-0.4, 0.2, h);
        const mottle = 7 * (nz(x * 2.6, h * 1.7, 2.3) - 0.5);
        const i = (py * W + px) * 4;
        for (let k = 0; k < 3; k++) {
          let c = lerp(SIDE[k], BACK[k], back);
          c = lerp(c, BELLY[k], belly);
          c = lerp(c, CREST[k], crest);
          c = lerp(c, MUZZLE[k], Math.max(muzzle, ring));
          c = lerp(c, NOSE[k], nose);
          d[i + k] = Math.max(0, Math.min(255, c + mottle));
        }
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
  const ringMap = (u) => { const b = bunch(u); return lerp(b, u, 0.3); };
  const bodySkin = new Skin().add(loftPoint, { nu: cut(180), nv: cut(76), uMap: ringMap, probe: [0.4, 0.5, V(0, 1, 0)] });
  const bodyGeo = bodySkin.geometry();
  const bodyMesh = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.42, metalness: 0 }));
  bodyMesh.frustumCulled = false;
  swim.add(bodyMesh);

  // ---------- parts that ride the body: ear flaps, whiskers, nostrils, mouth line, hind flippers ----------
  const parts = new Skin();
  const FLIP = new THREE.Color(0x1f1a17), FLIP2 = new THREE.Color(0x2c2520), LINE = new THREE.Color(0x15100d);
  const EAR = new THREE.Color(0x6a4c36), WHISK = new THREE.Color(0xe6dcc6);
  const flipColor = (p, n, u, v, c) => c.copy(FLIP).lerp(FLIP2, 0.5 + 0.5 * nz(p.x * 5, p.y * 5, p.z * 5));
  const thFromH = (h) => Math.asin(Math.sign(h) * Math.pow(Math.abs(h), POWER / 2));
  const onBody = (x, th, lift = 0.003) => {
    const s = body.sOf(x), P = body.point(s, th), N = body.normal(s, th);
    if (N.dot(V(0.2, P.y - body.f.mid(s), P.z)) < 0) N.negate();
    return [P.addScaledVector(N, lift), N];
  };
  const side = (s, th) => (s > 0 ? th : Math.PI - th);

  // ear flaps: small, pointed, lying back along the side of the head behind the eye (the place is a judgement)
  const EAR_X = 0.985, EAR_H = 0.42;
  for (const s of [1, -1]) {
    const [O] = onBody(EAR_X, side(s, thFromH(EAR_H)), -0.004);
    const B = V(-1, 0.14, 0.28 * s).normalize(), A = V(0, 1, 0).addScaledVector(B, -B.y).normalize();
    const f = finSurface({ O, A, B, thick: 0.02, lead: [[0.026, 0], [0.03, 0.045], [0.004, 0.1]], trail: [[-0.026, 0], [-0.028, 0.04], [0.004, 0.1]] });
    parts.add(f.point, { nu: 10, nv: 10, probe: [0.3, 0.25, f.N.clone().multiplyScalar(s)], color: (p, n, u, v, c) => c.copy(EAR) });
  }
  // whiskers: long, pale, in rows on the side of the muzzle, sweeping back and down
  const wr = rng(17);
  for (const s of [1, -1]) {
    for (let k = 0; k < 14; k++) {
      const row = k % 4, col = Math.floor(k / 4);
      const x = 1.45 - 0.032 * col - 0.008 * row, h = 0.05 - 0.2 * row;
      const [P, N] = onBody(x, side(s, thFromH(h)), -0.002);
      const len = 0.1 + 0.05 * wr() + 0.02 * row;
      const dir = V(-0.55, -0.25 - 0.08 * row, 0).addScaledVector(N, 0.75).normalize();
      const bend = V(0, -0.35, 0);
      const path = (u, out) => out.copy(P).addScaledVector(dir, len * u).addScaledVector(bend, 0.03 * u * u);
      parts.add(tubeSurface(path, (u) => 0.0032 * (1 - 0.8 * u), { up: V(0, 0, 1), cap: 0.02 }), { nu: 5, nv: 4, probe: [0.5, 0.25, V(0, -0.5, 0).addScaledVector(N, 0.2)], color: (p, n, u, v, c) => c.copy(WHISK) });
    }
  }
  // nostrils: two short dark slits on top of the end of the muzzle
  for (const s of [1, -1]) {
    const rows = [];
    for (let k = 0; k <= 8; k++) {
      const m = k / 8, x = 1.488 - 0.03 * m, th = Math.PI / 2 - s * (0.32 + 0.12 * m), w = 0.004 * Math.sin(Math.PI * m) + 0.001;
      const [a, n] = onBody(x, th + w * 6, 0.0025), [b] = onBody(x, th - w * 6, 0.0025);
      rows.push([a, b, n]);
    }
    parts.strip(rows, LINE);
  }
  // the mouth: a dark line low on the muzzle, from the nose pad back to below the eye
  for (const s of [1, -1]) {
    const rows = [];
    for (let k = 0; k <= 16; k++) {
      const m = k / 16, x = 1.49 - 0.24 * m, hh = -0.5 + 0.12 * m * m;
      const th0 = thFromH(hh);
      const [a, n] = onBody(x, side(s, th0 + 0.035), 0.002), [b] = onBody(x, side(s, th0 - 0.035), 0.002);
      rows.push([a, b, n]);
    }
    parts.strip(rows, LINE);
  }
  // hind flippers: broad, dark, trailing behind on either side of the tail, held almost upright like a rudder
  const XH = -1.18;
  for (const s of [1, -1]) {
    const [O] = onBody(XH, side(s, thFromH(-0.35)), -0.02);
    const B = V(-1, -0.04, 0.16 * s).normalize(), A = V(0, 1, 0.1 * s).addScaledVector(B, -B.y).normalize();
    const f = finSurface({ O, A, B, thick: 0.05,
      lead: [[0.06, 0], [0.2, 0.36], [0.16, 0.62]], trail: [[-0.07, 0], [-0.24, 0.42], [0.16, 0.62]] });
    parts.add(f.point, { nu: 30, nv: 18, uMap: tipward, probe: [0.3, 0.25, f.N.clone().multiplyScalar(s)], color: flipColor });
  }
  const partsGeo = parts.geometry();
  const partsMesh = new THREE.Mesh(partsGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0 }));
  partsMesh.frustumCulled = false;
  swim.add(partsMesh);

  // ---------- a gentle flex of the back body; the front flippers do the swimming ----------
  const XP = 0.2, LB = XP - XT, K = TAU / 4.2, wave = { phase: 0, amp: 0.05 };
  const bender = createBender({ axis: 'y', spine: (x, o) => {
    const tau = Math.max(0, (XP - x) / LB), ph = wave.phase - K * (XP - x), sn = Math.sin(ph), c = Math.cos(ph);
    o.d = wave.amp * tau * tau * sn; o.m = wave.amp * (-2 * tau / LB * sn + tau * tau * K * c);
  } });
  bender.add(bodyGeo); bender.add(partsGeo);

  // ---------- front flippers: long, wing-like, black, from the shoulder low on the flank ----------
  // Each is its own mesh on a pivot at the shoulder, so it can beat up and down.
  const XS = 0.5, HS = -0.5;
  const flipMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0 });
  const shoulder = bender.socket(swim, XS), flippers = [];
  for (const s of [1, -1]) {
    const [root0] = onBody(XS, side(s, thFromH(HS)), -0.03);
    const pivot = new THREE.Group(); pivot.position.set(root0.x - XS, root0.y, root0.z); shoulder.add(pivot);
    const B = V(-0.62, -0.5, 0.6 * s).normalize(), A = V(1, 0, 0).addScaledVector(B, -B.x).normalize();
    const f = finSurface({ O: V(), A, B, thick: 0.06,
      lead: [[0.11, 0], [0.15, 0.36], [0.0, 0.72]], trail: [[-0.11, 0], [-0.13, 0.3], [0.0, 0.72]] });
    const g = new Skin().add(f.point, { nu: 34, nv: 18, uMap: tipward, probe: [0.3, 0.25, f.N.clone().multiplyScalar(s)], color: flipColor }).geometry();
    const m = new THREE.Mesh(g, flipMat); pivot.add(m); flippers.push({ pivot, s });
  }

  // ---------- eyes: large and dark ----------
  const eyeGeo = eyeGeometry(0.03, { pupil: 0.8, iris: 1.05, irisColor: 0x241a12, restColor: 0x0b0908 });
  const eyeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0 });
  for (const s of [1, -1]) {
    const [p, n] = onBody(EYE_X, side(s, thFromH(EYE_H)), -0.012);
    const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.copy(p); e.lookAt(p.clone().add(n.clone().add(V(0.25, 0, 0)))); swim.add(e);
  }

  // ---------- bubbles: only while porpoising, left where it goes out of the water and back in ----------
  const NB = 70, bub = [], bRand = rng(53);
  const bPos = new Float32Array(NB * 3).fill(0);
  const bGeo = new THREE.BufferGeometry(); bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
  const bTex = paintTexture(32, 32, (g) => {
    const r = g.createRadialGradient(16, 16, 2, 16, 16, 15);
    r.addColorStop(0, 'rgba(255,255,255,0.15)'); r.addColorStop(0.7, 'rgba(235,248,255,0.9)'); r.addColorStop(1, 'rgba(235,248,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 32, 32);
  });
  const bubbles = new THREE.Points(bGeo, new THREE.PointsMaterial({ map: bTex, size: 0.07, transparent: true, opacity: 0.85, depthWrite: false }));
  bubbles.frustumCulled = false; bubbles.visible = false;
  root.add(bubbles);
  for (let i = 0; i < NB; i++) bub.push({ life: 0, x: 0, y: -50, z: 0, vx: 0, vy: 0 });
  let bNext = 0;
  const spawn = (x, y) => {
    const b = bub[bNext]; bNext = (bNext + 1) % NB;
    b.life = 1.1 + 0.9 * bRand(); b.x = x + 0.3 * (bRand() - 0.5); b.y = y + 0.2 * (bRand() - 0.5); b.z = 0.3 * (bRand() - 0.5);
    b.vx = -(1.2 + 0.8 * bRand()); b.vy = 0.25 + 0.35 * bRand();
  };

  // ---------- anchors (all on the +z side, the camera's home side) ----------
  const hindSock = bender.socket(swim, -1.45);
  const at = (x, h, lift) => onBody(x, thFromH(h), lift);
  const [bP, bN] = at(-0.25, 0.2, 0.03), [eP, eN] = at(EAR_X - 0.03, EAR_H - 0.12, 0.03), [cP] = at(1.19, 1, 0.02);
  const anchors = {
    body: anchor(bender.socket(swim, -0.25), V(0, bP.y, bP.z), bN),
    ears: anchor(swim, eP, eN),
    crest: anchor(swim, cP, V(0.2, 1, 0.45)),
    foreflippers: anchor(flippers[0].pivot, V(-0.2, -0.16, 0.2), V(0, 0.2, 1)),
    hindflippers: anchor(hindSock, V(-0.06, -0.02, 0.13), V(0, 0.15, 1)),
  };

  // ---------- porpoising: two low leaps out of the water and back in, flippers tucked in the air ----------
  // TMMC: "They are sometimes seen porpoising, or jumping out of the water". How high and how long is our guess.
  const KT = [0, 1.0, 1.7, 2.35, 3.0, 3.7, 4.4, 5.05, 5.7, 6.6, 7.8], KY = [0, -0.45, 0.4, 1.02, 0.4, -0.4, 0.4, 1.02, 0.4, -0.25, 0];
  const pathY = monotone(KT, KY), T_END = 7.8, VX = 1.9, SURF = 0.8;          // SURF: environment.surface.breathY
  let run = null, last = null, rise = 0, stroke = 0;

  function update(t, dt0, st = {}) {
    const dt = last === null ? 0 : Math.min(0.25, Math.max(0, t - last)); last = t;
    let pitch = 0, lift = 0, air = 0, fast = 0;
    rise = 0;
    if (run) {
      run.t += dt;
      const a = run.t;
      lift = pathY(Math.min(a, T_END));
      const slope = (pathY(Math.min(a + 0.03, T_END)) - pathY(Math.max(a - 0.03, 0))) / 0.06;
      pitch = Math.atan(slope / VX);
      rise = smooth(0.2, 1.2, a) * (1 - smooth(6.0, 7.4, a));
      air = smooth(SURF - 0.2, SURF + 0.35, lift);
      fast = smooth(0, 0.7, a) * (1 - smooth(5.8, 7.4, a));
      if (dt > 0) {
        const cross = Math.exp(-Math.pow((lift - SURF + 0.1) / 0.35, 2));
        run.acc += dt * (cross * 60 * (a > 1.3 && a < 6.2 ? 1 : 0) + (a > 0.4 && a < 1.5 ? 6 : 0));
        while (run.acc >= 1) { run.acc -= 1; spawn(-0.4 + 1.3 * bRand(), Math.min(lift, SURF - 0.08)); }
      }
      if (a >= 1.8 && !run.said) { run.said = true; ctx.say?.('porpoise', 5600); }
      if (a >= T_END + 1.2) run = null;
    }
    let alive = false;
    for (let i = 0; i < NB; i++) {
      const b = bub[i];
      if (b.life > 0) {
        b.life -= dt; b.x += b.vx * dt; b.y = Math.min(SURF - 0.03, b.y + b.vy * dt); alive = true;
        bPos[i * 3] = b.x; bPos[i * 3 + 1] = b.life > 0 ? b.y : -50; bPos[i * 3 + 2] = b.z;
      }
    }
    if (alive || bubbles.visible) { bGeo.attributes.position.needsUpdate = true; bubbles.visible = alive; }

    // front flippers: slow, gliding strokes at rest; quick, strong strokes before each leap; folded back in the air
    const calm = ctx.calm ? 0.5 : 1;
    stroke += dt * (1.3 + 5.2 * fast * (1 - air));
    const beat = Math.sin(stroke), amp = (0.22 + 0.25 * fast) * calm * (1 - air);
    for (const { pivot, s } of flippers) {
      pivot.rotation.set(s * (0.15 + amp * beat), 0, -0.1 - 0.12 * amp * Math.cos(stroke) - 0.55 * air, 'XYZ');
    }
    wave.phase += dt * (1.3 + 5.2 * fast * (1 - air));
    wave.amp = 0.05 * (1 + 0.6 * fast) * (1 - 0.7 * air);
    bender.apply();
    const idle = 1 - smooth(0, 0.5, fast);
    pose.position.set(0, lift, 0);
    pose.rotation.set(0, 0, pitch);
    swim.position.set(0, (0.03 * calm * Math.sin(stroke + 1.2) + 0.025 * Math.sin(t * 0.31)) * idle, 0);
    swim.rotation.set(0.02 * Math.sin(t * 0.27) * idle, 0, 0.015 * calm * Math.sin(stroke - 0.4) * (1 - air));
  }
  update(0, 0);

  return { root, anchors, update, actions: { porpoise: { run() { if (!run) run = { t: 0, acc: 0, said: false }; } } }, reach: 2.0,
    get busy() { return !!run && run.t < T_END; },
    /** 0..1: how far the sea surface has come down to meet it; the shell lowers it (environment.surface.breathY) */
    get rise() { return rise; } };
}
