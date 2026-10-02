// Screenshot objects from the assembled catalog.
//
// Usage:
//   node _build/shot.mjs BTN-01 [BTN-02 ...] [options]
// Options:
//   --theme light|dark|both   (default both)
//   --mobile                  390px wide touch viewport (output suffix -mobile)
//   --width N                 viewport width (default 1440)
//   --solo                    open the object in single-object (solo) mode first
//   --do "<js>"               async JS run in the page before the shot; `root` = the <article>, `stage` = its .obj-stage,
//                             `sleep(ms)` helper available. e.g. --do "root.querySelector('.btn').click(); await sleep(600)"
//   --wait N                  extra ms to wait before the shot (default 250)
//   --tag NAME                suffix added to output file names (e.g. -tag pressed → BTN-01-light-pressed.png)
//   --stage                   screenshot only the .obj-stage instead of the whole card
//   --full                    full-page screenshot of the whole catalog (ignores IDs), dsf 1
//   --all                     include every part in the page (default: only the requested IDs; others are placeholders)
// Output: _build/shots/<ID>-<theme>[-mobile][-tag].png  — paths and any console errors are printed.
import path from 'node:path';
import fs from 'node:fs';
import { openPage, BUILD } from './lib.mjs';

const args = process.argv.slice(2);
const ids = [];
const opt = { theme: 'both', mobile: false, width: 0, solo: false, do: '', wait: 250, tag: '', stage: false, full: false, all: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--theme') opt.theme = args[++i];
  else if (a === '--mobile') opt.mobile = true;
  else if (a === '--width') opt.width = +args[++i];
  else if (a === '--solo') opt.solo = true;
  else if (a === '--do') opt.do = args[++i];
  else if (a === '--wait') opt.wait = +args[++i];
  else if (a === '--tag') opt.tag = args[++i];
  else if (a === '--stage') opt.stage = true;
  else if (a === '--full') opt.full = true;
  else if (a === '--all') opt.all = true;
  else ids.push(a);
}
const themes = opt.theme === 'both' ? ['light', 'dark'] : [opt.theme];
const outDir = path.join(BUILD, 'shots');
fs.mkdirSync(outDir, { recursive: true });

for (const theme of themes) {
  const only = opt.full || opt.all || !ids.length ? null : ids;
  const { browser, page, errors } = await openPage({ theme, mobile: opt.mobile, width: opt.width || undefined, dsf: opt.full ? 1 : 2, only });
  try {
    if (opt.full) {
      const f = path.join(outDir, `FULL-${theme}${opt.mobile ? '-mobile' : ''}${opt.tag ? '-' + opt.tag : ''}.png`);
      await page.screenshot({ path: f, fullPage: true });
      console.log(f);
    }
    for (const id of ids) {
      if (opt.solo) {
        await page.evaluate((id) => { const b = document.querySelector(`#${CSS.escape(id)} .obj-solo`); b && b.click(); }, id);
        await page.waitForTimeout(200);
      }
      const loc = page.locator(`#${id}`);
      if (!(await loc.count())) { console.log(`!! #${id} not found`); continue; }
      await loc.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      if (opt.do) {
        await page.evaluate(async ({ id, code }) => {
          const root = document.getElementById(id);
          const stage = root.querySelector('.obj-stage');
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          const fn = new Function('root', 'stage', 'sleep', `return (async () => { ${code} })()`);
          await fn(root, stage, sleep);
        }, { id, code: opt.do });
      }
      await page.waitForTimeout(opt.wait);
      const target = opt.stage ? loc.locator('.obj-stage') : loc;
      const f = path.join(outDir, `${id}-${theme}${opt.mobile ? '-mobile' : ''}${opt.tag ? '-' + opt.tag : ''}.png`);
      await target.screenshot({ path: f, animations: 'allow' });
      console.log(f);
    }
  } finally {
    const relevant = errors.filter((e) => !/fonts\.(googleapis|gstatic)|ERR_FAILED|net::/.test(e));
    if (relevant.length) console.log(`[${theme}] errors:\n  ` + relevant.join('\n  '));
    await browser.close();
  }
}
