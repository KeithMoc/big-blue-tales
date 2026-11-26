// Phone fit: opens the story at small phone sizes, upright and on its side, and fails if any button or its word is
// cut off by the edge of the screen or by its own box, or if two buttons sit on top of each other. It looks at Learn,
// Play, Play with Move the view on, and Just the fish in Play and in Learn with its tray open.
// Usage: node tools/fit.cjs [url] [screenshot folder]. With --files it reads the files straight from this folder.
// Licence: MIT.
const { chromium } = require('playwright');
const path = require('path');
const FILES = process.argv[2] === '--files', ROOT = path.join(__dirname, '..');
const url = FILES ? 'http://site.local/' : process.argv[2] || 'http://localhost:8765/', out = process.argv[3] || '';
const serve = (page) => FILES && page.route('http://site.local/**', r => { let f = decodeURIComponent(new URL(r.request().url()).pathname); if (f.endsWith('/')) f += 'index.html'; return r.fulfill({ path: path.join(ROOT, f) }).catch(() => r.fulfill({ status: 404, body: '' })); });
const SIZES = [[320, 640], [375, 667], [390, 844], [430, 932], [640, 320], [667, 375], [844, 390], [932, 430]];

// in the page: every visible button, its words and what is wrong with it
function measure(where) {
  const W = innerWidth, H = innerHeight, bad = [], boxes = [];
  const seen = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); if (!(r.width > 0 && r.height > 0 && cs.visibility !== 'hidden') || el.closest('[hidden]')) return false;
    for (let p = el; p; p = p.parentElement) if (+getComputedStyle(p).opacity < 0.05) return false;     // faded out with its row
    return true; };
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.id).trim().slice(0, 30);
  for (const el of document.querySelectorAll('button')) {
    if (!seen(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5) bad.push(`${where}: "${name(el)}" goes past the edge of the screen`);
    if (el.scrollWidth > el.clientWidth + 1) bad.push(`${where}: "${name(el)}" is too narrow for its words`);
    if (Math.min(r.width, r.height) < 43.5) bad.push(`${where}: "${name(el)}" is smaller than 44 px to tap (${r.width.toFixed(0)} x ${r.height.toFixed(0)})`);
    for (const s of el.querySelectorAll('span')) { const q = s.getBoundingClientRect(); if (q.width && (q.left < r.left - 0.5 || q.right > r.right + 0.5)) bad.push(`${where}: the word "${s.textContent}" is cut off`); }
    // a parent that clips (scrolls or hides overflow) must show the whole button
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p); if (!/(auto|scroll|hidden)/.test(cs.overflowX + cs.overflowY)) continue;
      const q = p.getBoundingClientRect(); if (r.left < q.left - 0.5 || r.right > q.right + 0.5 || r.top < q.top - 0.5 || r.bottom > q.bottom + 0.5) { bad.push(`${where}: "${name(el)}" is cut off by its row`); break; }
    }
    boxes.push([name(el), r, !!el.closest('#justtray')]);
  }
  // the words on a row's label (Colours, Trails...) drawn before its buttons
  for (const el of document.querySelectorAll('.seg')) { if (!seen(el)) continue; const r = el.getBoundingClientRect(); if (r.left < -0.5 || r.right > W + 0.5) bad.push(`${where}: the row "${el.getAttribute('aria-label')}" goes past the edge`); if (el.scrollWidth > el.clientWidth + 1) bad.push(`${where}: the row "${el.getAttribute('aria-label')}" is cut off`); }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, A, ta] = boxes[i], [b, B, tb] = boxes[j];
    if (ta !== tb) continue;      // the open tray lies over the buttons below it, as a tray does
    const x = Math.min(A.right, B.right) - Math.max(A.left, B.left), y = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
    if (x > 1 && y > 1) bad.push(`${where}: "${a}" and "${b}" sit on top of each other`);
  }
  return bad;
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  for (const [w, hgt] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: hgt }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    await serve(page);
    page.on('pageerror', e => errors.push(`${w}x${hgt} pageerror: ${e.message}`));
    await page.goto(url);
    await page.waitForFunction(() => window.__sea?.storyView?.runner?.current?.scene, null, { timeout: 90000 });
    await page.waitForSelector('#entrygo', { state: 'visible', timeout: 30000 });
    const at = (what) => `${w}x${hgt} ${what}`;
    errors.push(...await page.evaluate(measure, at('entry')));
    await page.click('#entrygo'); await page.waitForTimeout(1200);
    if (await page.isVisible('#entryskip')) await page.click('#entryskip');
    await page.waitForTimeout(400);
    errors.push(...await page.evaluate(measure, at('introduction')));
    if (await page.isVisible('#introskip')) await page.click('#introskip');
    await page.waitForTimeout(900);
    const shot = (n) => out && page.screenshot({ path: `${out}/fit-${w}x${hgt}-${n}.png` });
    errors.push(...await page.evaluate(measure, at('Learn'))); await shot('learn');
    await page.click('#story-play'); await page.waitForTimeout(500);
    errors.push(...await page.evaluate(measure, at('Play'))); await shot('play');
    await page.click('#story-move'); await page.waitForTimeout(300);
    errors.push(...await page.evaluate(measure, at('Play, Move the view on'))); await shot('move');
    await page.click('#story-just'); await page.waitForTimeout(800);
    if (await page.getAttribute('#story-more', 'aria-expanded') !== 'true') await page.click('#story-more');
    await page.waitForTimeout(300);
    errors.push(...await page.evaluate(measure, at('Just the fish in Play, More open'))); await shot('just-play');
    await page.click('#story-exit'); await page.waitForTimeout(500);
    await page.click('#storymode [data-mode="learn"]'); await page.waitForTimeout(300);
    await page.click('#story-just'); await page.waitForTimeout(800);
    if (await page.getAttribute('#story-more', 'aria-expanded') !== 'true') await page.click('#story-more');
    await page.waitForTimeout(300);
    errors.push(...await page.evaluate(measure, at('Just the fish in Learn, More open'))); await shot('just-learn');
    await page.close();
  }
  await browser.close();
  const bad = [...new Set(errors)];
  console.log(bad.length ? 'FAIL\n' + bad.join('\n') : `PASS: every button and word fits at ${SIZES.map(s => s.join('x')).join(', ')}`);
  process.exit(bad.length ? 1 : 0);
})();
