// node scripts/icons.mjs — draws the app's icon, the Android layers, the splash
// mark and the favicons (and the site's, when ../site is there) from one piece
// of pixel art: the header's mark (src/themes/standard/pixel.tsx `LogoMark`) —
// five ticks of rising height and a lime cap on the tallest — outlined in ink.
// No packages: the PNGs are written with node's own zlib. A dot is always a
// whole number of pixels, so nothing is smoothed.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';

// ---------- colors (src/design.ts スタンダード, src/themes/standard/look.ts) ----------
export const PAPER = '#F3EEE3';
export const INK = '#17121F';
export const LIME = '#C6F432';
export const LIME_DEEP = '#A8D81C';
export const TICKS = ['#E5484D', '#F2C46D', '#9AB8DB', '#5B8DEF', '#9D7BF5'];

// ---------- the art, in dots ----------
// The header's mark is on a 16 grid: ticks 2 wide, 1 apart, 3·5·7·9·11 tall,
// the lime cap 1 above the tallest. Here a unit of that grid is 2 dots, and the
// ink between the ticks runs round them as an outline 2 dots thick.
const U = 2;
export const ART_W = 16 * U; // 32 dots
export const ART_H = 15 * U; // 30 dots
/**
 * The mark as rows of letters: '.' empty, 'k' ink, '0'–'4' the ticks, 'l' the
 * cap. `notch`: the outline's outer corners lose a dot (pixel-rounded).
 */
export function art({ notch = true } = {}) {
  const g = Array.from({ length: ART_H }, () => Array(ART_W).fill('.'));
  const box = (x, y, w, h, ch) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = ch; };
  const floor = 14 * U; // the ticks stand on this row
  const tick = (i) => ({ x: (1 + 3 * i) * U, h: (3 + 2 * i) * U });
  for (let i = 0; i < 5; i++) { const t = tick(i); box(t.x - U, floor - t.h - U, 4 * U, t.h + 2 * U, 'k'); }
  box(12 * U, 0, 4 * U, 3 * U, 'k');
  for (let i = 0; i < 5; i++) { const t = tick(i); box(t.x, floor - t.h, 2 * U, t.h, String(i)); }
  box(13 * U, U, 2 * U, U, 'l');
  if (notch) {
    const at = (x, y) => (g[y] && g[y][x]) || '.';
    const cut = [];
    for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) {
      if (g[y][x] !== 'k') continue;
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) if (at(x + dx, y) === '.' && at(x, y + dy) === '.') cut.push([x, y]);
    }
    cut.forEach(([x, y]) => { g[y][x] = '.'; });
  }
  return g.map((r) => r.join(''));
}

// ---------- a canvas of pixels ----------
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function canvas(w, h, fill) {
  const px = new Uint8Array(w * h * 4);
  if (fill) { const [r, g, b] = rgb(fill); for (let i = 0; i < w * h; i++) px.set([r, g, b, 255], i * 4); }
  return { w, h, px };
}
function rect(c, x, y, w, h, hex) {
  const [r, g, b] = rgb(hex);
  for (let j = Math.max(0, y); j < Math.min(c.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(c.w, x + w); i++) c.px.set([r, g, b, 255], (j * c.w + i) * 4);
}
/** The art on the header's own 16 grid (a unit a pixel): for the smallest pictures, where a dot would be half a pixel. */
const units = () => art({ notch: false }).filter((_, y) => y % U === 0).map((r) => [...r].filter((_, x) => x % U === 0).join(''));

/** How far the shadow falls to the right and down, in dots (the lead card's lift in the app is the same slant). */
const SHADOW = 3;
/**
 * The mark on a canvas, a dot `dot` pixels, centered.
 * `shadow`: a flat lime shadow down-right of it (the mark and its shadow are centered together).
 * `mono`: only the ticks and the cap, in one color — the ink between them stays empty (Android's themed icon).
 * `unit`: draw the 16-grid art, `dot` pixels a unit. `snap`: keep the corner on a multiple of this many pixels.
 */
export function stamp(c, dot, { shadow = false, mono, unit = false, snap = 1 } = {}) {
  if (!Number.isInteger(dot)) throw new Error(`a dot must be whole pixels (got ${dot})`);
  const rows = unit ? units() : art();
  const pal = { k: INK, l: LIME, ...Object.fromEntries(TICKS.map((t, i) => [String(i), t])) };
  const sh = shadow ? SHADOW : 0;
  const at = (size, n) => Math.round((size - (n + sh) * dot) / 2 / snap) * snap;
  const x0 = at(c.w, rows[0].length), y0 = at(c.h, rows.length);
  const each = (f) => rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') f(ch, x0 + x * dot, y0 + y * dot); }));
  if (shadow && !mono) each((_, x, y) => rect(c, x + sh * dot, y + sh * dot, dot, dot, LIME_DEEP));
  each((ch, x, y) => { if (!(mono && ch === 'k')) rect(c, x, y, dot, dot, mono ?? pal[ch]); });
  return c;
}
/** The farthest painted pixel from the middle, in pixels (Android's safe circle). */
export function reach(c) {
  let far = 0;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.px[(y * c.w + x) * 4 + 3]) {
    far = Math.max(far, Math.hypot(Math.max(Math.abs(x - c.w / 2), Math.abs(x + 1 - c.w / 2)), Math.max(Math.abs(y - c.h / 2), Math.abs(y + 1 - c.h / 2))));
  }
  return far;
}

// ---------- PNG ----------
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4); tail.writeUInt32BE(crc(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}
/** `alpha: false` writes RGB (iOS wants an icon with no transparency at all). */
export function png(c, { alpha = true } = {}) {
  const n = alpha ? 4 : 3;
  const raw = Buffer.alloc(c.h * (1 + c.w * n));
  for (let y = 0; y < c.h; y++) {
    const at = y * (1 + c.w * n);
    for (let x = 0; x < c.w; x++) for (let k = 0; k < n; k++) raw[at + 1 + x * n + k] = c.px[(y * c.w + x) * 4 + k];
  }
  const head = Buffer.alloc(13); head.writeUInt32BE(c.w, 0); head.writeUInt32BE(c.h, 4); head.set([8, alpha ? 6 : 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** The mark as an SVG on the header's 16 grid (the site's favicon: whole pixels at 16, 32 and 48). */
export function svg() {
  const r = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  const h = (i) => 3 + 2 * i;
  const ink = [0, 1, 2, 3, 4].map((i) => `M${3 * i} ${13 - h(i)}h4v${h(i) + 2}h-4z`).join('') + 'M12 0h4v3h-4z';
  const ticks = TICKS.map((t, i) => r(1 + 3 * i, 14 - h(i), 2, h(i), t)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -1 16 16" shape-rendering="crispEdges"><path d="${ink}" fill="${INK}"/>${ticks}${r(13, 1, 2, 1, LIME)}</svg>\n`;
}

// ---------- the files ----------
/** Every file as [path from the app's folder, bytes]. */
export function files() {
  const full = 1024;
  const out = [];
  // the icon: paper to the edges (iOS cuts the corners itself), no transparency. 22px a dot: the mark and its shadow take 3/4 of the width
  out.push(['assets/images/icon.png', png(stamp(canvas(full, full, PAPER), 22, { shadow: true }), { alpha: false })]);
  // Android: the launcher shows the middle 2/3 and may cut it to a circle, so everything stays inside the 66/108 circle (13px a dot)
  const fore = stamp(canvas(full, full), 13, { shadow: true });
  const safe = (full * 66) / 108 / 2;
  if (reach(fore) > safe) throw new Error(`the Android foreground leaves the safe circle (${reach(fore).toFixed(1)} > ${safe.toFixed(1)})`);
  out.push(['assets/images/android-icon-foreground.png', png(fore)]);
  out.push(['assets/images/android-icon-background.png', png(canvas(full, full, PAPER))]);
  out.push(['assets/images/android-icon-monochrome.png', png(stamp(canvas(full, full), 13, { shadow: true, mono: '#000000' }))]);
  // the splash: 24px a dot, every edge on a multiple of 8 — at app.json's imageWidth 128 (1/8) a dot is 3pt on every screen
  out.push(['assets/images/splash-icon.png', png(stamp(canvas(full, full), 24, { shadow: true, snap: 8 }))]);
  // favicons: the mark alone on nothing (the tab's own color shows through), a row of the 16 grid free above it —
  // every edge on that grid (48 = 3px a unit, 64 = 4px), so the 16 and 32 a browser makes of them stay whole
  out.push(['assets/images/favicon.png', png(stamp(canvas(48, 48), 3, { unit: true, snap: 3 }))]);
  out.push(['../site/img/favicon.png', png(stamp(canvas(64, 64), 2, { snap: 4 }))]);
  out.push(['../site/img/apple-touch-icon.png', png(stamp(canvas(180, 180, PAPER), 4, { shadow: true }), { alpha: false })]);
  out.push(['../site/img/icon-256.png', png(stamp(canvas(256, 256, PAPER), 5, { shadow: true }), { alpha: false })]);
  out.push(['../site/favicon.svg', Buffer.from(svg())]);
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const [path, bytes] of files()) {
    const to = join(app, path);
    if (path.startsWith('../') && !existsSync(resolve(app, '../site'))) { console.log(`skip  ${path} (no ../site here)`); continue; }
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, bytes);
    console.log(`wrote ${path}`);
  }
}
