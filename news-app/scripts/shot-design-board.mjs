// デザインのルールの見本（docs/design-options/design-board.html）を PNG にする。
// 使い方: node scripts/shot-design-board.mjs
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const { execSync } = require('node:child_process');
  ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')));
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'design-options');
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ proxy });
const page = await browser.newPage({ viewport: { width: 1568, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.join(dir, 'design-board.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(dir, 'design-board.png'), fullPage: true });
await browser.close();
console.log('design-board.png');
