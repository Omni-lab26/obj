// Shared build helpers: assemble the single-file catalog and open it in Chromium.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const BUILD = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.dirname(BUILD);
export const PARTS = path.join(BUILD, 'parts');

export function loadSpec() {
  return JSON.parse(fs.readFileSync(path.join(BUILD, 'objects.json'), 'utf8'));
}

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function placeholder(o) {
  return `<!-- ═══ ${o.id} · ${o.name} (未作成) ═══ -->
<article class="obj obj--todo" id="${o.id}" data-name="${escAttr(o.name)}" data-ja="${escAttr(o.ja)}" data-vector="${o.vector.join(' ')}" data-size="${o.size}" data-desc="${escAttr(o.desc)}">
  <div class="obj-stage" data-bg="${o.bg}"><p>未作成</p></div>
</article>`;
}

/** Build the full HTML string. `only` (optional array of IDs) limits which parts are included (others become placeholders). */
export function assemble({ only = null } = {}) {
  const spec = loadSpec();
  let shell = fs.readFileSync(path.join(BUILD, 'shell.html'), 'utf8');
  const iconFiles = fs.existsSync(PARTS)
    ? fs.readdirSync(PARTS).filter((f) => /^_icons.*\.html$/.test(f)).sort()
    : [];
  const icons = iconFiles.map((f) => fs.readFileSync(path.join(PARTS, f), 'utf8').trim()).join('\n');
  const sections = spec.categories.map((c) => {
    const items = spec.objects.filter((o) => o.id.split('-')[0] === c.id);
    const body = items.map((o) => {
      const p = path.join(PARTS, `${o.id}.html`);
      if ((!only || only.includes(o.id)) && fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
      return placeholder(o);
    }).join('\n\n');
    return `<section class="cat" id="cat-${c.id}" data-cat="${c.id}" data-title="${escAttr(c.title)}" data-ja="${escAttr(c.ja)}">
  <header class="cat-head"><h2>${c.title}</h2><span class="cat-ja">${c.ja}</span><span class="cat-count">${items.length} objects</span></header>
  <div class="cat-grid">

${body}

  </div>
</section>`;
  }).join('\n\n');
  shell = shell.replace('<!-- @@ICONS@@ -->', () => icons).replace('<!-- @@SECTIONS@@ -->', () => sections);
  return shell;
}

export function writeTemp(html, tag = 'page') {
  const dir = path.join(BUILD, 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, `${tag}-${process.pid}-${Math.floor(Math.random() * 1e6)}.html`);
  fs.writeFileSync(f, html);
  return f;
}

const require = createRequire(import.meta.url);
export function playwright() {
  try { return require('playwright'); } catch (e) {
    return require('/opt/node22/lib/node_modules/playwright');
  }
}

/**
 * Open the catalog in Chromium.
 * opts: { theme: 'light'|'dark', width, height, dsf, mobile, file, only }
 * Returns { browser, context, page, errors, file }.
 */
export async function openPage(opts = {}) {
  const { chromium } = playwright();
  const theme = opts.theme || 'light';
  const mobile = !!opts.mobile;
  const file = opts.file || writeTemp(assemble({ only: opts.only || null }));
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: opts.width || (mobile ? 390 : 1440), height: opts.height || (mobile ? 844 : 1000) },
    deviceScaleFactor: opts.dsf || 2,
    colorScheme: theme,
    reducedMotion: opts.reducedMotion ? 'reduce' : 'no-preference',
    hasTouch: mobile,
    isMobile: mobile,
  });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`); });
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(300);
  return { browser, context, page, errors, file };
}
