// The app icon: one kohaku from the real koi scene (scenes/koi.html), posed and cropped.
// Writes c-<layout>-<seed>.png here; the icon is layout A, seed 1, resized to 1024.
// Icon candidates from the real koi scene: posed koi and one lotus leaf, cropped square.
const { chromium } = require('playwright');
const V = 300; // viewport: cells 7 px, U 12 px (the finest cells the scene draws)
const LAYOUTS = {
  A: { fish: [{ pattern: 0, x: 0.5, y: 0.5, h: -2.36, bend: 0.035 }], centre: [0.53, 0.46], pad: { x: 0.2, y: 0.8, r: 3.0, flower: true } },
  A2: { fish: [{ pattern: 0, x: 0.5, y: 0.5, h: -2.36, bend: -0.035 }], centre: [0.5, 0.47], pad: { x: 0.8, y: 0.82, r: 2.6, flower: true } },
  B: { fish: [{ pattern: 0, x: 0.44, y: 0.46, h: -2.36, bend: 0.03 }, { pattern: 3, x: 0.62, y: 0.6, h: -2.42, bend: 0.02 }], centre: [0.54, 0.5], pad: { x: 0.18, y: 0.84, r: 2.4, flower: true } },
};
(async () => {
  const browser = await chromium.launch();
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    for (const seed of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: V, height: V }, deviceScaleFactor: 7 });
      await page.goto(`file://${require('path').join(__dirname, '..', '..', 'scenes', 'koi.html')}#seed=${seed}&hold&probe`);
      await page.waitForFunction(() => window.__seaFish && window.__seaPads);
      const r = await page.evaluate(([lay, V]) => {
        for (let i = 0; i < 30; i++) window.__ambient.step(1 / 30);
        const fs = window.__seaFish, pads = window.__seaPads;
        const used = new Set();
        const away = (f) => { f.x = -9000; f.y = -9000; for (const p of f.pts) { p.x = -9000; p.y = -9000; } f.target = { x: -9000, y: -9000 }; f.targetT = 999; f.speed = 0; };
        let L = 0;
        for (const want of lay.fish) {
          const k = fs.find((f) => f.pattern === want.pattern && !used.has(f));
          used.add(k); L = Math.max(L, k.L);
          k.heading = want.h; k.x = want.x * V + Math.cos(want.h) * k.L * 0.45; k.y = want.y * V + Math.sin(want.h) * k.L * 0.45;
          let x = k.x, y = k.y;
          k.pts.forEach((p, i) => { const a = want.h + want.bend * i; if (i) { x -= Math.cos(a) * k.seg; y -= Math.sin(a) * k.seg; } p.x = x; p.y = y; });
          k.target = { x: k.x + Math.cos(want.h) * 3000, y: k.y + Math.sin(want.h) * 3000 }; k.targetT = 999; k.speed = 0;
        }
        for (const f of fs) if (!used.has(f)) away(f);
        // the posed fish, together, centred where asked by their outline
        const all = [...used].flatMap((f) => f.pts);
        const bx = (Math.min(...all.map((p) => p.x)) + Math.max(...all.map((p) => p.x))) / 2;
        const by = (Math.min(...all.map((p) => p.y)) + Math.max(...all.map((p) => p.y))) / 2;
        const dx = lay.centre[0] * V - bx, dy = lay.centre[1] * V - by;
        for (const f of used) { f.x += dx; f.y += dy; f.target.x += dx; f.target.y += dy; for (const p of f.pts) { p.x += dx; p.y += dy; } }
        pads.forEach((p, i) => {
          if (i === 0) { p.x = lay.pad.x * V; p.y = lay.pad.y * V; p.r = lay.pad.r * 12; p.vx = p.vy = p.vr = 0; if (lay.pad.flower && !p.flower) p.flower = { ang: 0.8, size: 1.6 * 12 }; if (!lay.pad.flower) p.flower = null; }
          else { p.x = -9000; p.y = -9000; p.vx = p.vy = 0; }
        });
        window.__ambient.step(1 / 60);
        return { L };
      }, [lay, V]);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `c-${name}-${seed}.png` });
      await page.close();
    }
  }
  await browser.close();
})();
