// Opens the page in headless Chromium at a desktop and a phone size. At the desktop size it walks the first story's
// parts, times of day, Read aloud, Music, Play, Draw and a drawn line, and Just the fish; opens every story in scenes/index.json by
// its address; and measures every story on the low, mid and high tiers against its budget (every group size, and the
// biggest group with its guest in the picture). At the phone size it only opens the page and takes a picture.
// Fails on any page error, failed request, line of the first story with no recording, or count over budget.
// Usage: node tools/smoke.cjs [url] [screenshot folder]. With --files instead of a url it reads the files straight from
// this folder (no server needed). Numbers from headless Chromium are not real frame rates.
// Licence: MIT.
const { chromium } = require('playwright');
const path = require('path');
const FILES = process.argv[2] === '--files', ROOT = path.join(__dirname, '..');
const url = FILES ? 'http://site.local/' : process.argv[2] || 'http://localhost:8765/', out = process.argv[3] || '.';
// --files: every request to site.local is answered from the repository folder
const serve = (page) => FILES && page.route('http://site.local/**', r => { let f = decodeURIComponent(new URL(r.request().url()).pathname); if (f.endsWith('/')) f += 'index.html'; return r.fulfill({ path: path.join(ROOT, f) }).catch(() => r.fulfill({ status: 404, body: '' })); });
// what a story may draw on each device tier; a story may raise one in its scene.json "budget" (docs/THREEJS.md rule 16)
const TIER_BUDGET = { low: { triangles: 60000, calls: 40 }, mid: { triangles: 120000, calls: 60 }, high: { triangles: 200000, calls: 100 } };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [], requests = [];
  for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
    await serve(page);
    page.on('pageerror', e => errors.push(`${name} pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`); });
    page.on('requestfailed', r => { if (!/\.mp3$/.test(r.url()) || !/ERR_ABORTED/.test(r.failure()?.errorText || '')) errors.push(`${name} failed: ${r.url()} ${r.failure()?.errorText}`); });
    page.on('response', r => { requests.push(r.url()); if (r.status() >= 400) errors.push(`${name} ${r.status()}: ${r.url()}`); });
    await page.goto(url);
    await page.waitForFunction(() => window.__sea?.storyView?.runner?.current?.scene, null, { timeout: 90000 });
    // the entry: the name in the sky, Start, then the glide (skipped here); the buttons are only there after it
    await page.waitForSelector('#entrygo', { state: 'visible', timeout: 30000 });
    await page.screenshot({ path: `${out}/${name}-entry.png` });
    await page.click('#entrygo'); await page.waitForTimeout(1500);
    if (await page.isVisible('#entryskip')) await page.click('#entryskip');
    await page.waitForTimeout(300);
    if (await page.isVisible('#introskip')) await page.click('#introskip');     // Skip ends the introduction at once
    if (await page.evaluate(() => document.getElementById('app').classList.contains('intro'))) errors.push(`${name}: Skip did not end the introduction`);
    if (await page.evaluate(() => document.getElementById('app').classList.contains('entering'))) errors.push(`${name}: the buttons did not come in after the entry`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${name}-open.png` });
    if (name === 'desktop') {
      const info = await page.evaluate(() => ({
        title: document.title, level: window.__sea.settings.level,
        parts: [...document.querySelectorAll('#storyacts .act')].map(b => b.textContent),
        times: [...document.querySelectorAll('#storytimes button')].map(b => b.textContent),
        ageButtons: document.querySelectorAll('[data-level]').length, panel: !!document.querySelector('.storypanel'), caption: !document.querySelector('#storycaption').hidden,
      }));
      console.log(JSON.stringify(info, null, 1));
      if (info.level !== 'young' || info.ageButtons) errors.push('age group is not fixed at ages 5 to 7');
      if (info.panel) errors.push('a word panel is back on the kids\' screen: only a caption while a line is spoken');
      for (const b of await page.$$('#storyacts .act')) { await b.click(); await page.waitForTimeout(1500); }
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${out}/${name}-sea-lion.png` });
      const missing = await page.evaluate(async () => {
        const { storyLines } = await import('./ui/story-lines.js'), { lineKey } = await import('./ui/line-key.js'), { loadVoice } = await import('./scenes/links.js');
        const S = window.__sea.storyView.current, lines = (await loadVoice(S.id))?.levels.young.lines || {};
        return storyLines(S, 'young').filter(l => !lines[lineKey(l.text)]).map(l => l.where);
      });
      if (missing.length) errors.push('no recording for ' + missing.join(', '));
      for (const t of ['sunrise', 'day', 'night', 'sunset']) {
        await page.click(`#storytimes [data-pick="${t}"]`); await page.waitForTimeout(1500);
        if (t === 'night') await page.screenshot({ path: `${out}/${name}-night.png` });
      }
      await page.click('#story-voice'); await page.waitForTimeout(1500);
      if (!requests.some(u => u.endsWith('narration.young.mp3'))) errors.push('Read aloud did not fetch narration.young.mp3');
      await page.click('#story-play'); await page.waitForTimeout(500);
      // music is on from Start
      if (!requests.some(u => u.endsWith('sfx.story-music.mp3'))) errors.push('Music did not start with the story (sfx.story-music.mp3 not fetched)');
      await page.click('#story-draw'); await page.waitForTimeout(300);
      const [cx, cy] = await page.$eval('#view canvas', c => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      await page.mouse.move(cx - 150, cy); await page.mouse.down();
      for (let i = 0; i <= 20; i++) await page.mouse.move(cx - 150 + i * 15, cy - Math.sin(i / 3) * 60);
      await page.mouse.up(); await page.waitForTimeout(3000);
      await page.screenshot({ path: `${out}/${name}-play-line.png` });
      await page.click('#story-more'); await page.waitForTimeout(300);
      await page.click('#story-just'); await page.waitForTimeout(1500);
      await page.screenshot({ path: `${out}/${name}-just-the-fish.png` });
      const s = await page.evaluate(() => ({ ...window.__sea.engine.stats(), tier: window.__sea.device.tier }));
      console.log('headless (not a real frame rate):', JSON.stringify({ tier: s.tier, triangles: s.triangles, calls: s.calls }));
    }
    if (name === 'desktop') {
      // every story opens by its address (#<id>), and an unknown address falls back to a story
      const ids = await page.evaluate(async () => (await (await fetch('./scenes/index.json')).json()).scenes);
      for (const id of [...ids, 'no-such-story']) {
        await page.goto(url.replace(/#.*$/, '') + '#' + id);
        await page.waitForFunction(() => window.__sea?.storyView?.runner?.current?.scene, null, { timeout: 90000 });
        const got = await page.evaluate(() => window.__sea.storyView.current?.id);
        console.log(`#${id} opened ${got}`);
        if (id !== 'no-such-story' && got !== id) errors.push(`#${id} opened ${got}`);
      }
      // the budget (docs/THREEJS.md rule 16): every story on every device tier, at every group size, and with the
      // biggest group while its guest is in the picture. Counts are real in headless Chromium; frame rates are not.
      for (const id of ids) for (const tier of ['low', 'mid', 'high']) {
        const S = await page.evaluate(async (id) => (await fetch(`./scenes/${id}/scene.json`)).json(), id);
        const B = { ...TIER_BUDGET[tier], ...(S.budget?.[tier] || {}) }, who = `${id} on ${tier}`;
        await page.evaluate(async ([id, tier]) => { const v = window.__sea.storyView; v.close(); window.__sea.device.tier = tier; await v.open(id); }, [id, tier]);
        const step = (sec) => page.evaluate((sec) => { const E = window.__sea.engine; E.run(false); for (let i = 0; i < sec * 30; i++) E.stepOnce(1 / 30); E.renderOnce(); E.run(true); return { ...E.stats(), guest: window.__sea.storyView.runner.stats().guest }; }, sec);
        const over = (s, what) => { if (s.triangles > B.triangles || s.calls > B.calls) errors.push(`${who}${what}: ${s.triangles} triangles, ${s.calls} calls; allowed ${B.triangles}, ${B.calls}`); };
        const sizes = S.play?.sizes?.options.map(o => o.id) || [null];
        for (const size of sizes) {
          if (size) await page.evaluate((size) => window.__sea.storyView.runner.current.scene.setSize(size), size);
          const s = await step(2); over(s, size ? `, size ${size}` : '');
          console.log(`${who}${size ? `, ${size}` : ''}: ${s.triangles} triangles, ${s.calls} calls (allowed ${B.triangles}, ${B.calls})`);
        }
        if (!(S.cast || []).some(c => c.animal)) continue;
        let worst = null;
        for (const b of S.beats) {
          await page.evaluate((b) => window.__sea.storyView.runner.beat(b), b.id);
          for (let k = 0; k < 30; k++) { const s = await step(0.5); if (s.guest) { if (!worst || s.triangles > worst.triangles) worst = s; } else if (worst || k > 8) break; }
          if (worst) break;
        }
        if (!worst) { errors.push(`${who}: the guest never came into the picture`); continue; }
        over(worst, `, biggest group with the guest`);
        console.log(`${who}, ${sizes.at(-1)} with the guest: ${worst.triangles} triangles, ${worst.calls} calls`);
      }
    }
    await page.close();
  }
  await browser.close();
  const bad = [...new Set(errors)];
  console.log(bad.length ? 'FAIL\n' + bad.join('\n') : 'PASS: no errors, every line of the first story has a recording, every story fits its budget on every tier');
  process.exit(bad.length ? 1 : 0);
})();
