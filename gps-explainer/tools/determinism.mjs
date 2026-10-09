// Render the same frame in two separate browser sessions and diff the pixels.
import crypto from "node:crypto";
import {createRequire} from "node:module";
import {openRenderer} from "./browser.mjs";
const require = createRequire(import.meta.url);
const T = require("../src/timeline.js");
const times = [12.345, 33.5 * T.spb, 77 * T.spb, 63.9];
let fail = 0;
for (const fmt of ["16x9", "9x16", "1x1"]) {
  const a = await openRenderer({fmt}); const ha = []; for (const t of times) ha.push(await a.shot(t)); await a.close();
  const b = await openRenderer({fmt}); const hb = []; for (const t of [...times].reverse()) hb.unshift(await b.shot(t)); await b.close();
  times.forEach((t, i) => {
    const x = crypto.createHash("sha256").update(ha[i]).digest("hex"), y = crypto.createHash("sha256").update(hb[i]).digest("hex");
    const same = Buffer.compare(ha[i], hb[i]) === 0;
    if (!same) fail++;
    console.log(`${fmt} t=${t.toFixed(3)}s  ${x.slice(0, 16)} vs ${y.slice(0, 16)}  ${same ? "identical" : "DIFFERENT"}`);
  });
}
console.log(fail ? `${fail} frame(s) differ` : "determinism: every frame identical across sessions (second session rendered in reverse order)");
process.exit(fail ? 1 : 0);
