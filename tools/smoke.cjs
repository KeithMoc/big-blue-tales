// Opens the story in headless Chromium, walks every part, time of day, Listen, Music, Play, a drawn line and
// Just the fish, and fails on any page error, failed request or line with no recording.
// Usage: node tools/smoke.cjs [url] [screenshot folder]. Numbers from headless Chromium are not real frame rates.
// Licence: MIT.
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://localhost:8765/', out = process.argv[3] || '.';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [], requests = [];
  for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(`${name} pageerror: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`); });
    page.on('requestfailed', r => { if (!/\.mp3$/.test(r.url()) || !/ERR_ABORTED/.test(r.failure()?.errorText || '')) errors.push(`${name} failed: ${r.url()} ${r.failure()?.errorText}`); });
    page.on('response', r => { requests.push(r.url()); if (r.status() >= 400) errors.push(`${name} ${r.status()}: ${r.url()}`); });
    await page.goto(url);
    await page.waitForFunction(() => window.__sea?.storyView?.runner?.current?.scene, null, { timeout: 90000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${name}-open.png` });
    if (name === 'desktop') {
      const info = await page.evaluate(() => ({
        title: document.title, level: window.__sea.settings.level,
        parts: [...document.querySelectorAll('#storyacts .act')].map(b => b.textContent),
        times: [...document.querySelectorAll('#storytimes button')].map(b => b.textContent),
        ageButtons: document.querySelectorAll('[data-level]').length, fact: document.querySelector('#storyfact').textContent,
      }));
      console.log(JSON.stringify(info, null, 1));
      if (info.level !== 'young' || info.ageButtons) errors.push('age group is not fixed at ages 5 to 7');
      for (const b of await page.$$('#storyacts .act')) { await b.click(); await page.waitForTimeout(1500); }
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${out}/${name}-sea-lion.png` });
      const missing = await page.evaluate(async () => {
        const { storyLines } = await import('./ui/story-lines.js'), { lineKey } = await import('./ui/line-key.js'), { STORIES } = await import('./sounds/index.js');
        const S = window.__sea.storyView.current, lines = STORIES['anchovy-school'].levels.young.lines;
        return storyLines(S, 'young').filter(l => !lines[lineKey(l.text)]).map(l => l.where);
      });
      if (missing.length) errors.push('no recording for ' + missing.join(', '));
      for (const t of ['sunrise', 'day', 'night', 'sunset']) {
        await page.click(`#storytimes [data-pick="${t}"]`); await page.waitForTimeout(1500);
        if (t === 'night') await page.screenshot({ path: `${out}/${name}-night.png` });
      }
      await page.click('#story-listen'); await page.waitForTimeout(1500);
      if (!requests.some(u => u.endsWith('narration.young.mp3'))) errors.push('Listen did not fetch narration.young.mp3');
      await page.click('#story-play'); await page.waitForTimeout(500);
      await page.click('#story-music'); await page.waitForTimeout(1500);
      if (!requests.some(u => u.endsWith('sfx.story-music.mp3'))) errors.push('Music did not fetch sfx.story-music.mp3');
      if (!requests.some(u => u.endsWith('sfx.story-sea.mp3'))) errors.push('the sea sound was not fetched');
      const [cx, cy] = await page.$eval('#view canvas', c => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      await page.mouse.move(cx - 150, cy); await page.mouse.down();
      for (let i = 0; i <= 20; i++) await page.mouse.move(cx - 150 + i * 15, cy - Math.sin(i / 3) * 60);
      await page.mouse.up(); await page.waitForTimeout(3000);
      await page.screenshot({ path: `${out}/${name}-play-line.png` });
      await page.click('#story-just'); await page.waitForTimeout(1500);
      await page.screenshot({ path: `${out}/${name}-just-the-fish.png` });
      const s = await page.evaluate(() => ({ ...window.__sea.engine.stats(), tier: window.__sea.device.tier }));
      console.log('headless (not a real frame rate):', JSON.stringify({ tier: s.tier, triangles: s.triangles, calls: s.calls }));
    }
    await page.close();
  }
  await browser.close();
  const bad = [...new Set(errors)];
  console.log(bad.length ? 'FAIL\n' + bad.join('\n') : 'PASS: no errors, every line has an ages 5 to 7 recording');
  process.exit(bad.length ? 1 : 0);
})();
