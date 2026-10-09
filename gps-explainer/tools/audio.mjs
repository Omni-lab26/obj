// Renders the Web Audio score in headless Chrome and loudness-normalises it.
//   node tools/audio.mjs → out/audio_raw.wav, out/audio.wav (-16 LUFS integrated, true peak ≤ -2.0 dBTP before AAC)
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {chromium} from "playwright-core";
import {serve} from "./serve.mjs";
const exe = ["/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => fs.existsSync(p));
const {srv, url} = await serve();
const browser = await chromium.launch({executablePath: exe, args: ["--autoplay-policy=no-user-gesture-required"]});
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("pageerror:", e.message));
await page.goto(`${url}/audio.html`);
const b64 = await page.evaluate(() => window.renderAudio());
await browser.close(); srv.close();
fs.mkdirSync("out", {recursive: true});
fs.writeFileSync("out/audio_raw.wav", Buffer.from(b64, "base64"));
// two-pass loudnorm (linear) to -16 LUFS, TP -2.0 (AAC encoding adds a little; final file is checked at -1.5)
const pass1 = execFileSync("ffmpeg", ["-hide_banner", "-i", "out/audio_raw.wav", "-af", "loudnorm=I=-16:TP=-2.0:LRA=11:print_format=json", "-f", "null", "-"], {stdio: ["ignore", "pipe", "pipe"]}).toString();
let stats;
try {
  const err = execFileSync("sh", ["-c", "ffmpeg -hide_banner -i out/audio_raw.wav -af loudnorm=I=-16:TP=-2.0:LRA=11:print_format=json -f null - 2>&1"]).toString();
  stats = JSON.parse(err.slice(err.lastIndexOf("{"), err.lastIndexOf("}") + 1));
} catch (e) { console.error(e); process.exit(1); }
const af = `loudnorm=I=-16:TP=-2.0:LRA=11:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true:print_format=summary`;
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", "out/audio_raw.wav", "-af", af, "-ar", "48000", "-c:a", "pcm_s24le", "out/audio.wav"]);
console.log("raw:", stats.input_i, "LUFS", stats.input_tp, "dBTP →", "out/audio.wav");
