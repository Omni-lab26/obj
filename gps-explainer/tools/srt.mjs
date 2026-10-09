// captions.srt from TIMELINE.captions. "|" break hints: one line if short, else split at the hint nearest the middle.
import fs from "node:fs";
import {createRequire} from "node:module";
const require = createRequire(import.meta.url);
const T = require("../src/timeline.js");
const tc = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")},${String(r).padStart(3, "0")}`;
};
function lines(text) {
  const segs = text.split("|");
  const whole = segs.join("");
  if (Array.from(whole).length <= 13 || segs.length === 1) return [whole]; // Netflix JP: 13 characters per line
  let best = null;
  for (let i = 1; i < segs.length; i++) {
    const a = segs.slice(0, i).join(""), b = segs.slice(i).join("");
    const m = Math.max(Array.from(a).length, Array.from(b).length);
    if (!best || m < best.m) best = {m, l: [a, b]};
  }
  return best.l;
}
for (const c of T.captions) {
  const l = lines(c.text);
  if (l.length > 2 || l.some((x) => Array.from(x).length > 13)) { console.error("SRT line too long:", l); process.exitCode = 1; }
}
const out = T.captions.map((c, i) => `${i + 1}\n${tc(c.from * T.spb)} --> ${tc(c.to * T.spb)}\n${lines(c.text).join("\n")}\n`).join("\n");
fs.writeFileSync(process.argv[2] || "captions.srt", out);
console.log(`${T.captions.length} captions → ${process.argv[2] || "captions.srt"}`);
