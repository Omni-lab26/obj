// Frame export: headless Chrome steps t = n / fps, pipes PNG frames to ffmpeg (libx264, crf 16, yuv420p).
//   node tools/render.mjs --fmt 16x9 --mode normal --out out/video_16x9.mp4 [--fps 60] [--workers 3] [--debug]
// Frames are split into contiguous chunks rendered by parallel pages, then concatenated without re-encoding.
import fs from "node:fs";
import path from "node:path";
import {spawn, execFileSync} from "node:child_process";
import {createRequire} from "node:module";
import {openRenderer} from "./browser.mjs";

const require = createRequire(import.meta.url);
const T = require("../src/timeline.js");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const fmt = arg("fmt", "16x9");
const mode = arg("mode", "normal");
const fps = Number(arg("fps", T.fps));
const workers = Number(arg("workers", 3));
const out = arg("out", `out/video_${fmt}.mp4`);
const crf = arg("crf", "16");
const debug = process.argv.includes("--debug");
const total = Math.round(T.duration * fps);
const tmp = path.join(path.dirname(out), `.parts_${path.basename(out, ".mp4")}`);
fs.mkdirSync(tmp, {recursive: true});

function encoder(file) {
  const ff = spawn("ffmpeg", [
    "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
    "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
    "-c:v", "libx264", "-crf", crf, "-preset", "slow", "-tune", "animation", "-pix_fmt", "yuv420p",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
    "-r", String(fps), file,
  ], {stdio: ["pipe", "inherit", "inherit"]});
  return ff;
}

async function work(i, start, end) {
  const r = await openRenderer({fmt, mode, debug});
  const file = path.join(tmp, `part_${String(i).padStart(2, "0")}.mp4`);
  const ff = encoder(file);
  const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c)))));
  for (let n = start; n < end; n++) {
    const buf = await r.shot(n / fps);
    if (!ff.stdin.write(buf)) await new Promise((res) => ff.stdin.once("drain", res));
    if (i === 0 && n % (fps * 4) === 0) process.stdout.write(`  ${fmt}/${mode}: ${((n - start) / (end - start) * 100).toFixed(0)}% of chunk 0\n`);
  }
  ff.stdin.end();
  await done;
  await r.close();
  return file;
}

const t0 = Date.now();
const per = Math.ceil(total / workers);
const jobs = [];
for (let i = 0; i < workers; i++) {
  const s = i * per, e = Math.min(total, s + per);
  if (s < e) jobs.push(work(i, s, e));
}
const parts = await Promise.all(jobs);
const list = path.join(tmp, "list.txt");
fs.writeFileSync(list, parts.map((p) => `file '${path.resolve(p)}'`).join("\n"));
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", out]);
fs.rmSync(tmp, {recursive: true, force: true});
const frames = execFileSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", out]).toString().trim();
console.log(`${out}: ${frames} frames (expected ${total}) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
if (Number(frames) !== total) process.exit(1);
