// Render index.html to an MP4.
//   node render.mjs                 -> out/compound-interest.mp4
//   node render.mjs --stills 3,12   -> out/still-3.png, out/still-12.png
import { chromium } from 'playwright';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out');
mkdirSync(out, { recursive: true });
const FPS = 30, DUR = 80;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(join(here, 'index.html')).href + '?render=1');
await page.evaluate(() => window.fontsReady);

const grab = async t => {
  const b64 = await page.evaluate(t => {
    window.renderAt(t);
    return document.getElementById('c').toDataURL('image/png').split(',')[1];
  }, t);
  return Buffer.from(b64, 'base64');
};

const stillsArg = process.argv.indexOf('--stills');
if (stillsArg > 0) {
  for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
    writeFileSync(join(out, `still-${t}.png`), await grab(t));
  }
  await browser.close();
  process.exit(0);
}

// audio: synthesize, then two-pass loudnorm to -14 LUFS; TP -3 so the AAC stays under -2 dBTP
const raw = join(out, 'audio-raw.wav'), wav = join(out, 'audio.wav');
writeFileSync(raw, Buffer.from(await page.evaluate(() => window.renderAudio()), 'base64'));
const LN = 'loudnorm=I=-14:TP=-3:LRA=11';
const pass1 = spawnSync('ffmpeg', ['-hide_banner', '-i', raw, '-af', `${LN}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const m = JSON.parse(pass1.slice(pass1.lastIndexOf('{')));
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', raw, '-af',
  `${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
  '-ar', '48000', '-c:a', 'pcm_s24le', wav]);
console.log(`audio: input ${m.input_i} LUFS, ${m.input_tp} dBTP -> normalized`);

const frames = Math.round(DUR * FPS);
const video = join(out, 'video.mp4');
const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', video], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  const png = await grab(f / FPS);
  if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 150 === 0) console.log(`frame ${f}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();

const final = join(out, 'compound-interest.mp4');
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', video, '-i', wav,
  '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', String(DUR), '-movflags', '+faststart', final]);
console.log(`done: ${final} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
