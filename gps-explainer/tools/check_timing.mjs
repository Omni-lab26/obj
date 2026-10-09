// Timing pass: reading speed, camera vs captions, grid alignment. Exits 1 on any failure.
import {createRequire} from "node:module";
const require = createRequire(import.meta.url);
const T = require("../src/timeline.js");
let fail = 0;
const s = (b) => (b * T.spb).toFixed(2) + "s";
console.log("captions (chars per second, limit 6.5):");
for (const c of T.captions) {
  const n = Array.from(c.text.replace(/\|/g, "")).length;
  const dur = (c.to - c.from) * T.spb;
  const cps = n / dur;
  const ok = cps <= 6.5;
  if (!ok) fail++;
  console.log(`  ${s(c.from)}–${s(c.to)}  ${n} chars  ${cps.toFixed(2)} cps  ${ok ? "ok" : "FAIL"}  ${c.text.replace(/\|/g, "")}`);
}
console.log("camera moves vs captions (the camera must hold still while text is read):");
for (const k of T.cameraTrack.slice(1)) {
  const [m0, m1] = k.move;
  const hit = T.captions.filter((c) => c.from < m1 && c.to > m0);
  if (hit.length) { fail++; console.log(`  FAIL move ${s(m0)}–${s(m1)} overlaps: ${hit.map((c) => c.text.slice(0, 10)).join(" / ")}`); }
  else console.log(`  ok   move ${s(m0)}–${s(m1)} → ${k.to}`);
}
console.log("captions overlapping each other:");
const cs = [...T.captions].sort((a, b) => a.from - b.from);
for (let i = 1; i < cs.length; i++) if (cs[i].from < cs[i - 1].to) { fail++; console.log("  FAIL", cs[i - 1].text, "/", cs[i].text); }
console.log("cues on the 1/8-beat grid (wavefront arrivals follow physics and are exempt):");
const arrivals = new Set(T.emissions.map((e) => e.arrive.toFixed(4)));
for (const c of T.cues) {
  const onGrid = Math.abs(c.b * 2 - Math.round(c.b * 2)) < 1e-6;
  if (!onGrid && !arrivals.has(c.b.toFixed(4))) { fail++; console.log(`  FAIL ${c.type} at b${c.b}`); }
}
console.log(`  ${T.cues.length} cues checked`);
const last = Math.max(...T.captions.map((c) => c.to), ...T.anchors.map((a) => a.to));
if (last > T.beats) { fail++; console.log("FAIL: text runs past the end"); }
console.log(`duration ${T.duration.toFixed(2)} s, ${T.beats} beats @ ${T.bpm} BPM`);
console.log(fail ? `${fail} problem(s)` : "timing pass: all checks ok");
process.exit(fail ? 1 : 0);
