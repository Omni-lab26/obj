// Every 1/4 beat in every format: at most 2 caption lines and at most 2 anchor lines on screen.
import {createRequire} from "node:module";
import {openRenderer} from "./browser.mjs";
const require = createRequire(import.meta.url);
const T = require("../src/timeline.js");
let fail = 0;
for (const fmt of ["16x9", "9x16", "1x1"]) {
  const r = await openRenderer({fmt});
  let maxA = 0, maxC = 0;
  for (let b = 0; b <= T.beats; b += 0.25) {
    const f = await r.page.evaluate((t) => { window.seek(t); return window.__lastFrame; }, b * T.spb);
    maxA = Math.max(maxA, f.anchorLines); maxC = Math.max(maxC, f.captionLines);
    if (f.anchorLines > 2 || f.captionLines > 2) { fail++; console.log(`  FAIL ${fmt} b${b}: anchors ${f.anchorLines}, caption ${f.captionLines}`); }
  }
  console.log(`${fmt}: max anchor lines ${maxA}, max caption lines ${maxC}`);
  await r.close();
}
process.exit(fail ? 1 : 0);
