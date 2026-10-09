// node tools/stills.mjs --fmt 16x9 --mode normal --out review/stills --beats 1.5,5.5 [--debug]
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {openRenderer} from "./browser.mjs";
const require = createRequire(import.meta.url);
const T = require("../src/timeline.js");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const fmt = arg("fmt", "16x9"), mode = arg("mode", "normal"), dir = arg("dir", "A");
const out = arg("out", "review/stills");
const beats = (arg("beats", "") ? arg("beats").split(",").map(Number) : T.keyBeats);
fs.mkdirSync(out, {recursive: true});
const r = await openRenderer({fmt, mode, dir, debug: process.argv.includes("--debug")});
for (const b of beats) {
  const buf = await r.shot(b * T.spb);
  const f = path.join(out, `${fmt}_${mode}_${dir}_b${String(b).padStart(5, "0")}.png`);
  fs.writeFileSync(f, buf);
  console.log(f);
}
await r.close();
