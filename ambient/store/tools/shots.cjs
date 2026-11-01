// App Store screenshots from the web build: iPhone 6.9" (1320x2868) and iPad 13" (2064x2752).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = require('path').join(__dirname, '..', 'screenshots', 'raw');
const DEVICES = [
  { id: 'iphone-6.9', w: 440, h: 956, dpr: 3 },
  { id: 'ipad-13', w: 1032, h: 1376, dpr: 2 },
];
const base = (lang) => ({ lang, langChosen: true, tipsSeen: true, digital: 0.5, clock: { visible: true, font: 'condensed', seconds: true, date: true, hour24: true, color: null } });
const SHOTS = [
  { name: '01-koi-clock', s: (l) => ({ ...base(l), mode: 'clock', scene: 'koi' }) },
  { name: '02-sharks-timer', s: (l) => ({ ...base(l), mode: 'timer', scene: 'sharks', timer: { duration: 25 * 60000, endAt: null, left: 25 * 60000, dial: 25 * 60000 }, timerSaves: [3 * 60000, 25 * 60000, 50 * 60000, null, null] }) },
  { name: '03-walkers-stopwatch', s: (l) => ({ ...base(l), mode: 'stopwatch', scene: 'walkers', stopwatch: { startAt: null, elapsed: 754300 } }) },
  { name: '04-settings', s: (l) => ({ ...base(l), mode: 'clock', scene: 'koi', clock: { ...base(l).clock, color: { h: 28, l: 0.62 } } }), settings: true },
  { name: '05-edit', s: (l) => ({ ...base(l), mode: 'clock', scene: 'blank', clock: { ...base(l).clock } }), edit: true },
];
(async () => {
  const browser = await chromium.launch();
  for (const d of DEVICES) for (const lang of ['ja', 'en']) {
    const dir = `${OUT}/${d.id}/${lang}`;
    fs.mkdirSync(dir, { recursive: true });
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.dpr, hasTouch: true, locale: lang === 'ja' ? 'ja-JP' : 'en-US' });
    const page = await ctx.newPage();
    // The clock reads 9:41 as the page opens, and keeps running (animations need it to).
    await page.addInitScript((target) => {
      const off = target - Date.now();
      const D = Date;
      class Shifted extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } }
      window.Date = Shifted;
    }, new Date('2026-11-01T09:41:00').getTime() - 4000);
    page.on('pageerror', (e) => console.log('ERR', e.message));
    await page.goto('http://localhost:8765/', { waitUntil: 'networkidle' });
    for (const shot of SHOTS) {
      await page.evaluate((s) => { localStorage.clear(); localStorage.setItem('ambient.settings.v1', JSON.stringify(s)); }, shot.s(lang));
      await page.reload({ waitUntil: 'networkidle' });
      await sleep(5000); // scenes settle, controls fade
      if (shot.settings) { await page.mouse.click(d.w / 2, 40); await sleep(700); await page.click(lang === 'ja' ? '[aria-label="設定"]' : '[aria-label="Settings"]'); await sleep(1200); const f = page.getByText(lang === 'ja' ? 'フォント' : 'Font', { exact: true }).first(); await f.scrollIntoViewIfNeeded(); await page.mouse.wheel(0, 0); await sleep(600); }
      if (shot.edit) { await page.mouse.click(d.w / 2, 40); await sleep(500); await page.click(lang === 'ja' ? '[aria-label="数字の位置と大きさを変える"]' : '[aria-label="Move and resize the digits"]'); await sleep(900); }
      const png = `${dir}/${shot.name}.png`;
      await page.screenshot({ path: png });
      execFileSync('python3', ['-c', `from PIL import Image; im=Image.open('${png}').convert('RGB'); print(im.size); im.save('${png.replace('.png', '.jpg')}', quality=92); import os; os.remove('${png}')`]);
      console.log(d.id, lang, shot.name);
    }
    await ctx.close();
  }
  await browser.close();
})();
