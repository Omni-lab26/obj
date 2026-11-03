// デザイン案（docs/design-options/options.html）を案ごとに撮影して PNG にする。
// 使い方: node scripts/shot-design-options.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

// playwright はプロジェクトに入っていなければ、グローバルに入っているものを使う
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const { execSync } = require('node:child_process');
  const root = execSync('npm root -g').toString().trim();
  ({ chromium } = require(path.join(root, 'playwright')));
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'design-options');
const page_url = pathToFileURL(path.join(dir, 'options.html')).href;
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;

const browser = await chromium.launch({ proxy });
const page = await browser.newPage({ viewport: { width: 1360, height: 1040 }, deviceScaleFactor: 2 });
for (const t of ['a', 'b', 'c']) {
  await page.goto(`${page_url}?theme=${t}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(dir, `option-${t}.png`), fullPage: true });
  console.log(`option-${t}.png`);
}
await browser.close();
