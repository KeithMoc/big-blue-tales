// A line of light a visitor draws in the water (Play only): the newest end is the brightest and it fades toward
// the oldest end, so the shape and the way it was drawn can both be read. Three looks, one draw call each:
//   dots     - one soft light at every point of the line
//   line     - small lights so close together that they read as one soft line
//   sparkle  - little stars that twinkle
// Nothing here knows about the page or the fish: it takes THREE and points, and hands back
// { root, styles, style, setStyle, points, add, clear, update, dispose }. No shader code: the fade is in the
// colour of each point, which is all an additive light needs. Licence: MIT.

function sprite(THREE, draw) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function soft(x) {
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
}
function star(x) {
  // a small bright middle and four thin rays
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 14);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  for (const [w, h] of [[60, 3], [3, 60]]) {
    const r = x.createRadialGradient(32, 32, 0, 32, 32, 30);
    r.addColorStop(0, 'rgba(255,255,255,0.95)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = r; x.beginPath(); x.ellipse(32, 32, w / 2, h / 2, 0, 0, 6.2832); x.fill();
  }
}

// each = lights between one point and the next. bright = the newest end while drawing; rest = the same once the line is done
const STYLES = {
  dots: { each: 1, size: 0.15, bright: 0.6, rest: 0.34, map: 'soft' },
  line: { each: 5, size: 0.07, bright: 0.85, rest: 0.7, map: 'soft' },
  sparkle: { each: 1, size: 0.36, bright: 1.3, rest: 1.0, map: 'star', twinkle: true },
};
const TAIL = 0.14;                                                     // the oldest end keeps this much of the newest end's light
const WARM = [1.5, 1.25, 0.8];                                         // a little over white, so the bloom gives each light a glow

export function createTrail({ THREE, max = 160 }) {
  const EACH = Math.max(...Object.values(STYLES).map(s => s.each)), ROOM = max * EACH;
  const pos = new Float32Array(ROOM * 3), col = new Float32Array(ROOM * 3), points = [];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geometry.setDrawRange(0, 0);
  const maps = { soft: sprite(THREE, soft), star: sprite(THREE, star) };
  const material = new THREE.PointsMaterial({ map: maps.soft, size: 0.15, vertexColors: true, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const root = new THREE.Points(geometry, material); root.frustumCulled = false; root.visible = false;
  let style = 'dots', S = STYLES.dots, shown = 0;

  function lay() {
    // put the lights along the line: `each` of them from every point to the next
    let n = 0;
    for (let k = 0; k < points.length; k++) {
      const a = points[k], b = points[k + 1] || a, steps = k < points.length - 1 ? S.each : 1;
      for (let j = 0; j < steps; j++, n++) { const m = j / steps; pos[n * 3] = a.x + (b.x - a.x) * m; pos[n * 3 + 1] = a.y + (b.y - a.y) * m; pos[n * 3 + 2] = a.z + (b.z - a.z) * m; }
    }
    shown = n; geometry.setDrawRange(0, n); geometry.attributes.position.needsUpdate = true;
  }

  return {
    root, points, max, styles: Object.keys(STYLES),
    get style() { return style; },
    setStyle(id) { if (!STYLES[id]) return; style = id; S = STYLES[id]; material.map = maps[S.map]; material.size = S.size; material.needsUpdate = true; lay(); },
    /** Add a point (a THREE.Vector3; it is kept, not copied). False when the line is full. */
    add(p) { if (points.length >= max) return false; points.push(p); root.visible = true; lay(); return true; },
    clear() { points.length = 0; shown = 0; root.visible = false; geometry.setDrawRange(0, 0); },
    /** Once a frame. drawing = the visitor is still drawing; fade = 1 down to 0 as the finished line goes away. */
    update(t, drawing, fade = 1) {
      if (!shown) return;
      const top = (drawing ? S.bright : S.rest) * Math.max(0, Math.min(1, fade));
      for (let n = 0; n < shown; n++) {
        const along = shown > 1 ? n / (shown - 1) : 1;                 // 0 = the oldest end, 1 = the newest
        let v = top * (TAIL + (1 - TAIL) * along * along);
        if (S.twinkle) v *= 0.45 + 0.55 * Math.abs(Math.sin(t * 2.6 + n * 1.7));
        col[n * 3] = WARM[0] * v; col[n * 3 + 1] = WARM[1] * v; col[n * 3 + 2] = WARM[2] * v;
      }
      geometry.attributes.color.needsUpdate = true;
    },
    dispose() { geometry.dispose(); material.dispose(); maps.soft.dispose(); maps.star.dispose(); },
  };
}
