// Web 書き出しを複数の画面幅で撮影する。
//
//   node scripts/shot.mjs                  … ホーム（/）を撮る
//   node scripts/shot.mjs / /explore       … 複数のルートを撮る
//   node scripts/shot.mjs --build /        … 先に `expo export --platform web` を実行してから撮る
//   SHOT_WIDTHS=320,393,440,768 node scripts/shot.mjs /
//
// 出力：.artifacts/shots/<ルート>-<幅>.png
// 必要なもの：npm i -D playwright && npx playwright install chromium
//
// 注意：ブラウザは「見た目と動きの近似」。文字の描画の細部などは docs/verify.md の
//       「実機でしか分からないこと」を参照し、実機で確かめる。

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const DIST = resolve(ROOT, 'dist');
const OUT = resolve(ROOT, '.artifacts/shots');
const WIDTHS = (process.env.SHOT_WIDTHS ?? '320,393,440').split(',').map(Number);
const HEIGHT = Number(process.env.SHOT_HEIGHT ?? 852);

const args = process.argv.slice(2);
const doBuild = args.includes('--build');
const routes = args.filter((a) => !a.startsWith('--'));
if (routes.length === 0) routes.push('/');

if (doBuild || !existsSync(DIST)) {
  console.log('Web を書き出しています…');
  execSync('npx expo export --platform web', { stdio: 'inherit' });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

// /explore → explore.html / explore/index.html / index.html（SPA）の順に探す
function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\/+$/, '') || '/';
  const candidates = [
    join(DIST, clean),
    join(DIST, `${clean}.html`),
    join(DIST, clean, 'index.html'),
    join(DIST, 'index.html'),
  ];
  return candidates.find((p) => p.startsWith(DIST) && existsSync(p) && statSync(p).isFile());
}

const server = createServer((req, res) => {
  const file = resolveFile(req.url ?? '/');
  if (!file) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

mkdirSync(OUT, { recursive: true });
// ヘッドレスブラウザは同時に1つだけ（CLAUDE.md の作業環境ルール）
// SHOT_CHROME=/path/to/chrome で、手元の Chrome を使うこともできる
const browser = await chromium.launch({ executablePath: process.env.SHOT_CHROME || undefined });
let errorCount = 0;

try {
  for (const route of routes) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width, height: HEIGHT },
        deviceScaleFactor: 2,
        // isMobile は付けない（viewport の指定がないページが 980px 幅で描かれてしまうため）
        hasTouch: true,
        locale: 'ja-JP',
      });
      // PC のセンサーで傾きアニメーションが動かないようにする
      await context.addInitScript(() => {
        const stop = (e) => e.stopImmediatePropagation();
        window.addEventListener('deviceorientation', stop, true);
        window.addEventListener('devicemotion', stop, true);
      });
      const page = await context.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errorCount++;
          console.log(`  [console error] ${route} @${width}: ${msg.text()}`);
        }
      });
      page.on('pageerror', (err) => {
        errorCount++;
        console.log(`  [page error] ${route} @${width}: ${err.message}`);
      });

      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const name = route === '/' ? 'home' : route.replace(/^\//, '').replace(/[/?=&]/g, '_');
      const file = join(OUT, `${name}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`撮影：${file}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(errorCount === 0 ? 'コンソールのエラー：0' : `コンソールのエラー：${errorCount}`);
process.exit(errorCount === 0 ? 0 : 1);
