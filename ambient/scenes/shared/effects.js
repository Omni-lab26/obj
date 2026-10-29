// Effect library for the digital layer (see digital.js). Each effect:
//   name / name_ja, params (defaults), uniforms(params) -> [uP0, uP1] (vec4 each),
//   src: GLSL defining `vec3 effect(vec2 px)` (px in device px, y down).
// Every effect must return the untouched photo at uAmount = 0 (digital.js also
// short-circuits there) and should read as "digitisation taking over" in between.
(function () {
  const D = window.Digital;

  // Shared staging: a = amount; s1 eases in early, s2 mid, s3 late.
  const STAGES = `
  float a = uAmount;
  float s1 = smoothstep(0.0, 0.35, a);
  float s2 = smoothstep(0.25, 0.7, a);
  float s3 = smoothstep(0.6, 1.0, a);
`;

  // ── 1. ASCII mosaic: the Koi/Shallows look applied to a photo ───────────
  // 0→0.3 a faint grid appears and the photo settles into cells; 0.25→0.8 type
  // fades into every cell (light type on dark cells, dark type on light ones);
  // 0.6→1 cells separate and the darkest lose their fill, leaving type on ground.
  D.define('ascii', {
    name: 'ASCII mosaic',
    name_ja: '文字モザイク',
    defaults: { cell: 9, grid: 0.7, shimmer: 1.2, drop: 0.32, sat: 1.15 },
    uniforms: (p) => [
      [p.cell, p.grid, p.shimmer, p.drop],
      [p.sat, 0, 0, 0],
    ],
    palette: ['#0c0c0d', '#0c0c0d', '#0c0c0d', '#0c0c0d'],
    src: `
vec3 effect(vec2 px) {
  ${STAGES}
  float size = max(5.0, uP0.x * uDpr);
  vec2 id = floor(px / size);
  vec2 f = fract(px / size);
  vec2 c;
  vec3 cell = cellColor(px, size, c);
  float l = luma(cell);
  cell = clamp(mix(vec3(l), cell, mix(1.0, uP1.x, s3)), 0.0, 1.0);
  vec3 raw = photo(px);
  float h = hash12(id);
  // Distance to the cell border in px: grid lines and gaps.
  float bd = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * size;
  float line = 1.0 - smoothstep(0.0, 1.1 * uDpr, bd);
  float gap = 1.0 - smoothstep(0.6 * uDpr * s3, 0.6 * uDpr * s3 + 1.0, bd);
  // Type: tone picks the glyph, shimmer re-rolls cells now and then.
  float tick = uAnimate > 0.5 ? floor(uTime * uP0.z + h * 9.0) : 0.0;
  float jitter = (hash12(id + tick * 13.17) - 0.5) * 0.16;
  float lightCell = smoothstep(0.42, 0.6, l);
  float dens = clamp(mix(l, 1.0 - l, lightCell) * 0.9 + 0.25 + jitter, 0.0, 1.0);
  float g = glyph(glyphFor(dens), (f - 0.5) * 1.12 + 0.5);
  vec3 onDark = min(cell * 1.7 + 0.22, 1.0);
  vec3 onLight = cell * 0.3;
  vec3 typeCol = mix(onDark, onLight, lightCell);
  float typeOn = smoothstep(0.22 + h * 0.36, 0.34 + h * 0.36, a);
  // Mosaic first, then type, then dark cells drop to the ground.
  vec3 col = mix(raw, cell, s2 * 0.92);
  col = mix(col, typeCol, g * typeOn);
  vec3 ground = uPal0 + cell * 0.08;
  float drop = s3 * (1.0 - smoothstep(uP0.w - 0.12, uP0.w + 0.06, l));
  col = mix(col, mix(ground, onDark, g), drop);
  col = mix(col, col * 0.62, line * uP0.y * s1 * (1.0 - s3));
  col = mix(col, ground, gap);
  float ring = tapRing(px, 220.0, 14.0);
  col = mix(col, max(col, onDark * g + 0.1), ring);
  return col;
}`,
  });

  // ── 2. Halftone print: the Passersby look ───────────────────────────────
  // 0→0.5 a fine screen in the photo's own colours (a magnified print), the
  // screen coarsening; 0.5→1 the dots turn to one ink on paper (mono) or four
  // plates slightly out of register (cmyk). invert = light dots on dark paper.
  D.define('halftone', {
    name: 'Halftone',
    name_ja: '網点プリント',
    defaults: { pitch: 5, angle: 45, mode: 0, invert: 0, gamma: 1.25 },
    uniforms: (p) => [
      [p.pitch, (p.angle * Math.PI) / 180, p.mode, p.invert],
      [p.gamma, 0, 0, 0],
    ],
    palette: ['#f3f1ec', '#141416', '#7a7a7a', '#ffffff'],
    src: `
float screenDot(vec2 px, float pitch, float ang, float tone) {
  float cs = cos(ang); float sn = sin(ang);
  vec2 q = vec2(cs * px.x - sn * px.y, sn * px.x + cs * px.y) / pitch;
  vec2 f = fract(q) - 0.5;
  float rad = sqrt(clamp(tone, 0.0, 1.0)) * 0.71;
  float aa = 0.75 / pitch;
  return (1.0 - smoothstep(rad - aa, rad + aa, length(f))) * clamp(rad / aa - 0.35, 0.0, 1.0);
}
vec3 effect(vec2 px) {
  ${STAGES}
  float pitch = max(2.0, mix(1.8 * uDpr, uP0.x * uDpr, smoothstep(0.1, 0.75, a)));
  float ang = uP0.y;
  vec3 raw = photo(px);
  vec3 soft = photoBlur(px, mipFor(pitch));
  float l = luma(soft);
  float inv = uP0.w;
  // Tone = how much ink; a gamma keeps midtones open so dark photos do not clog.
  float tone = pow(clamp(mix(1.0 - l, l, inv), 0.0, 1.0), uP1.x);
  float dotv = screenDot(px, pitch, ang, tone);
  float solid = smoothstep(0.88, 0.98, tone);
  vec3 paper = inv > 0.5 ? uPal1 : uPal0;
  vec3 inkC = inv > 0.5 ? uPal0 : uPal1;
  // Colour stage: dots carry the photo's colour, paper is a bright version of it.
  vec3 dotCol = mix(soft * 0.75, inkC, s3);
  vec3 paperCol = mix(min(soft * 0.35 + 0.72, 1.0), paper, s3);
  vec3 printed = mix(paperCol, dotCol, max(dotv, solid));
  if (uP0.z > 0.5) {
    vec3 cmy = 1.0 - soft;
    float k = min(min(cmy.r, cmy.g), cmy.b);
    vec3 c3 = (cmy - k) / max(1.0 - k, 0.001);
    float off = 0.6 * uDpr * s3;
    float dc = screenDot(px + vec2(off, 0.0), pitch, radians(15.0), c3.r);
    float dm = screenDot(px - vec2(0.0, off), pitch, radians(75.0), c3.g);
    float dy = screenDot(px, pitch, radians(0.0), c3.b);
    float dk = screenDot(px, pitch, radians(45.0), pow(k, 1.2));
    vec3 ink = uPal0 * (1.0 - vec3(0.0, 0.9, 0.95) * dc) * (1.0 - vec3(0.85, 0.0, 0.3) * dm) * (1.0 - vec3(0.0, 0.05, 0.9) * dy);
    printed = mix(printed, ink * (1.0 - 0.92 * dk), s3);
  }
  vec3 col = mix(raw, printed, smoothstep(0.0, 0.3, a));
  col += (hash12(floor(px)) - 0.5) * 0.025 * s3;
  float ring = tapRing(px, 200.0, 18.0);
  col = mix(col, inkC, ring * 0.3);
  return col;
}`,
  });

  // ── 3. Ordered dither with a small palette (e-ink / Game Boy) ────────────
  D.define('dither', {
    name: 'Dither',
    name_ja: 'ディザ',
    defaults: { pixel: 3, levels: 4, contrast: 1.1 },
    uniforms: (p) => [
      [p.pixel, p.levels, p.contrast, 0],
      [0, 0, 0, 0],
    ],
    palette: ['#0f1a14', '#3a5a40', '#9bbc8a', '#e8f0d8'],
    src: `
vec3 effect(vec2 px) {
  ${STAGES}
  float pixel = max(1.0, floor(mix(1.0, uP0.x * uDpr, s2) + 0.5));
  vec2 p = (floor(px / pixel) + 0.5) * pixel;
  vec3 raw = photo(px);
  vec3 src = photoBlur(p, mipFor(pixel));
  float t = bayer4(px / pixel);
  // Early: posterise the photo itself; late: map to the 4-colour palette.
  float lv = mix(16.0, uP0.y, s1);
  vec3 poster = floor(src * lv + t) / lv;
  float l = clamp((luma(src) - 0.5) * uP0.z + 0.5, 0.0, 1.0);
  float idx = clamp(floor(l * 3.0 + t), 0.0, 3.0);
  vec3 pal = idx < 0.5 ? uPal0 : idx < 1.5 ? uPal1 : idx < 2.5 ? uPal2 : uPal3;
  vec3 col = mix(raw, poster, s1);
  col = mix(col, pal, s3);
  float ring = tapRing(px, 240.0, 12.0);
  col = mix(col, uPal3, ring * step(0.5, t));
  return col;
}`,
  });

  // ── 4. LED matrix: round lamps on black ─────────────────────────────────
  D.define('led', {
    name: 'LED matrix',
    name_ja: 'LEDドット',
    defaults: { pitch: 7, glow: 0.6, bits: 4 },
    uniforms: (p) => [
      [p.pitch, p.glow, p.bits, 0],
      [0, 0, 0, 0],
    ],
    src: `
vec3 effect(vec2 px) {
  ${STAGES}
  float pitch = max(3.0, uP0.x * uDpr * mix(0.45, 1.0, s2));
  vec2 c;
  vec3 cell = cellColor(px, pitch, c);
  vec2 f = fract(px / pitch) - 0.5;
  float bits = mix(64.0, pow(2.0, uP0.z), s2);
  vec3 q = floor(cell * bits + 0.5) / bits;
  float r = 0.36;
  float d = length(f);
  float lamp = 1.0 - smoothstep(r - 0.06, r + 0.04, d);
  float glow = exp(-d * d * 9.0) * uP0.y;
  vec3 lit = q * (lamp * 1.15 + glow * 0.5);
  // Twinkle: lamps flicker very slightly.
  if (uAnimate > 0.5) lit *= 0.94 + 0.06 * sin(uTime * 3.0 + hash12(floor(px / pitch)) * 40.0);
  vec3 raw = photo(px);
  vec3 col = mix(raw, raw * (0.55 + 0.6 * lamp), s1 * (1.0 - s2));
  col = mix(col, lit, s2);
  float ring = tapRing(px, 260.0, 20.0);
  col += ring * lamp * 0.5;
  return col;
}`,
  });

  // ── 5. CRT: scanlines, shadow mask, colour fringing ─────────────────────
  D.define('crt', {
    name: 'CRT',
    name_ja: 'ブラウン管',
    defaults: { line: 3, mask: 0.7, fringe: 2.5, curve: 0.5 },
    uniforms: (p) => [
      [p.line, p.mask, p.fringe, p.curve],
      [0, 0, 0, 0],
    ],
    src: `
vec3 effect(vec2 px) {
  ${STAGES}
  vec2 uv = px / uRes;
  // Barrel curvature grows late.
  vec2 cc = uv - 0.5;
  float bend = uP0.w * 0.12 * s3;
  vec2 uv2 = 0.5 + cc * (1.0 + bend * dot(cc, cc) * 4.0);
  vec2 p = uv2 * uRes;
  float fr = uP0.z * uDpr * s2;
  vec3 col;
  col.r = photo(p + vec2(fr, 0.0)).r;
  col.g = photo(p).g;
  col.b = photo(p - vec2(fr, 0.0)).b;
  float line = max(2.0, uP0.x * uDpr);
  float scan = 0.5 + 0.5 * cos(6.2832 * (p.y / line));
  col *= mix(1.0, 0.4 + 0.75 * scan, s1);
  // RGB aperture grille.
  float m = mod(floor(p.x / max(1.0, uDpr)), 3.0);
  vec3 mask = m < 0.5 ? vec3(1.0, 0.35, 0.35) : m < 1.5 ? vec3(0.35, 1.0, 0.35) : vec3(0.35, 0.35, 1.0);
  col *= mix(vec3(1.0), mask * 1.35, uP0.y * s2);
  // Slow rolling bar and a faint flicker.
  if (uAnimate > 0.5) col *= 1.0 - 0.05 * s2 * smoothstep(0.0, 0.08, abs(fract(uv.y - uTime * 0.07) - 0.5));
  float vig = smoothstep(0.85, 0.25, length(cc * vec2(0.9, 1.0)));
  col *= mix(1.0, vig, s3);
  if (uv2.x < 0.0 || uv2.x > 1.0 || uv2.y < 0.0 || uv2.y > 1.0) col = vec3(0.0);
  vec3 raw = photo(px);
  return mix(raw, col, smoothstep(0.0, 0.12, a));
}`,
  });

  // ── 6. Contour lines: the picture as a topographic map ──────────────────
  D.define('contour', {
    name: 'Contour',
    name_ja: '等高線',
    defaults: { levels: 14, width: 1.2, keep: 0.25 },
    uniforms: (p) => [
      [p.levels, p.width, p.keep, 0],
      [0, 0, 0, 0],
    ],
    palette: ['#0e1116', '#e8e4da', '#7fb7a4', '#f2b36d'],
    src: `
float field(vec2 p) { return luma(photoBlur(p, mipFor(6.0 * uDpr))); }
vec3 effect(vec2 px) {
  ${STAGES}
  float e = 1.5 * uDpr;
  float l = field(px);
  float gx = field(px + vec2(e, 0.0)) - field(px - vec2(e, 0.0));
  float gy = field(px + vec2(0.0, e)) - field(px - vec2(0.0, e));
  float grad = length(vec2(gx, gy)) / (2.0 * e) + 1e-4;
  float lv = uP0.x;
  float drift = uAnimate > 0.5 ? uTime * 0.04 : 0.0;
  float v = l * lv + drift;
  float dist = abs(fract(v) - 0.5);
  dist = 0.5 - dist;                      // 0 on a line
  float px2line = dist / (grad * lv);     // distance to the nearest line in px
  float w = uP0.y * uDpr;
  float line = 1.0 - smoothstep(w * 0.5, w * 0.5 + 1.0, px2line);
  // Every 5th line is an index contour, drawn bolder.
  float idx = step(mod(floor(v + 0.5), 5.0), 0.5);
  line = max(line, (1.0 - smoothstep(w, w + 1.0, px2line)) * idx);
  vec3 raw = photo(px);
  vec3 bands = mix(uPal0, raw, uP0.z) * (0.85 + 0.15 * floor(l * lv) / lv);
  vec3 ink = mix(uPal1, uPal2, idx * 0.6);
  vec3 col = mix(raw, raw * 0.8 + ink * 0.2 * line, s1);
  col = mix(col, mix(bands, ink, line), s2);
  col = mix(col, mix(uPal0, ink, line), s3 * (1.0 - uP0.z));
  float ring = tapRing(px, 180.0, 10.0);
  col = mix(col, uPal3, ring * line);
  return col;
}`,
  });

  // ── 7. Edge neon: outlines glowing out of the dark ──────────────────────
  D.define('neon', {
    name: 'Edge neon',
    name_ja: 'ネオン輪郭',
    defaults: { strength: 2.2, glow: 0.7, keep: 0.12 },
    uniforms: (p) => [
      [p.strength, p.glow, p.keep, 0],
      [0, 0, 0, 0],
    ],
    palette: ['#05060a', '#3df2ff', '#ff4fd8', '#ffffff'],
    src: `
float lumAt(vec2 p, float b) { return luma(photoBlur(p, b)); }
float edgeAt(vec2 p, float e, float b) {
  float tl = lumAt(p + vec2(-e, -e), b), t = lumAt(p + vec2(0.0, -e), b), tr = lumAt(p + vec2(e, -e), b);
  float l = lumAt(p + vec2(-e, 0.0), b), r = lumAt(p + vec2(e, 0.0), b);
  float bl = lumAt(p + vec2(-e, e), b), bt = lumAt(p + vec2(0.0, e), b), br = lumAt(p + vec2(e, e), b);
  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * bt + br;
  return length(vec2(gx, gy));
}
vec3 effect(vec2 px) {
  ${STAGES}
  float e = 1.5 * uDpr;
  float b = mipFor(2.0 * uDpr);
  float edge = clamp(edgeAt(px, e, b) * uP0.x, 0.0, 1.0);
  float halo = clamp(edgeAt(px, e * 4.0, b + 2.0) * uP0.x * 0.6, 0.0, 1.0) * uP0.y;
  vec3 raw = photo(px);
  // Hue from the picture, pushed toward the two neon colours.
  float hsel = smoothstep(0.3, 0.7, luma(photoBlur(px, b + 3.0)));
  vec3 neon = mix(uPal1, uPal2, hsel);
  if (uAnimate > 0.5) neon *= 0.9 + 0.1 * sin(uTime * 2.0 + px.y * 0.01);
  vec3 dark = mix(raw, uPal0 + raw * uP0.z, s2);
  vec3 col = mix(raw, dark, s1);
  col += neon * (edge * 1.2 + halo * 0.6) * mix(0.4, 1.0, s2) * s1;
  col = mix(col, uPal0 + neon * (edge + halo * 0.5), s3 * (1.0 - uP0.z));
  float ring = tapRing(px, 240.0, 16.0);
  col += neon * ring * 0.6;
  return col;
}`,
  });

  // ── 8. Thermal: false colour heat map ───────────────────────────────────
  D.define('thermal', {
    name: 'Thermal',
    name_ja: 'サーモグラフィ',
    defaults: { soft: 3, contrast: 1.2, bands: 0 },
    uniforms: (p) => [
      [p.soft, p.contrast, p.bands, 0],
      [0, 0, 0, 0],
    ],
    palette: ['#0b0630', '#7a1fa2', '#f2542d', '#fff3a3'],
    src: `
vec3 effect(vec2 px) {
  ${STAGES}
  float l = luma(photoBlur(px, mipFor(uP0.x * uDpr * s2 + 1.0)));
  if (uAnimate > 0.5) l += 0.025 * s2 * sin(uTime * 0.8 + px.y * 0.01 + px.x * 0.004);
  l = clamp((l - 0.5) * uP0.y + 0.5, 0.0, 1.0);
  if (uP0.z > 0.5) l = floor(l * uP0.z + 0.5) / uP0.z;
  vec3 heat = pal4(l);
  vec3 raw = photo(px);
  vec3 col = mix(raw, mix(raw, heat, 0.55), s1);
  col = mix(col, heat, s2);
  // Fine sensor scanlines at full strength.
  col *= 1.0 - 0.07 * s3 * step(0.5, fract(px.y / (2.0 * uDpr)));
  float ring = tapRing(px, 220.0, 22.0);
  col = mix(col, uPal3, ring * 0.6);
  return col;
}`,
  });

  // ── 9. Ridgeline: rows of lines lifted by brightness (Unknown Pleasures) ─
  D.define('ridgeline', {
    name: 'Ridgeline',
    name_ja: '稜線',
    defaults: { spacing: 8, height: 38, width: 1.2 },
    uniforms: (p) => [
      [p.spacing, p.height, p.width, 0],
      [0, 0, 0, 0],
    ],
    palette: ['#0a0a0c', '#f2efe8', '#7d7a74', '#ffffff'],
    src: `
float ridgeAt(float baseY, float x, float amp, float drift) {
  float l = luma(photoBlur(vec2(x, baseY), mipFor(3.0 * uDpr)));
  l = smoothstep(0.08, 0.92, l);
  return baseY - (l * l + drift) * amp;
}
vec3 effect(vec2 px) {
  ${STAGES}
  float sp = max(4.0, uP0.x * uDpr);
  float amp = uP0.y * uDpr * mix(0.25, 1.0, s2);
  float w = uP0.z * uDpr;
  float drift = uAnimate > 0.5 ? 0.08 * sin(uTime * 0.6 + px.x * 0.004) : 0.0;
  // Ridges are filled shapes drawn back to front: the frontmost (lowest) ridge
  // that reaches up past this pixel decides what we see.
  float rMax = floor((px.y + amp) / sp);
  float lineHit = 0.0;
  for (int k = 0; k < 12; k++) {
    float r = rMax - float(k);
    float ry = ridgeAt((r + 1.0) * sp, px.x, amp, drift);
    if (ry <= px.y + w) {
      lineHit = 1.0 - smoothstep(w * 0.5, w * 0.5 + 1.0, abs(px.y - ry));
      break;
    }
  }
  vec3 raw = photo(px);
  vec3 col = mix(raw, raw * 0.75 + uPal1 * 0.35 * lineHit, s1);
  col = mix(col, mix(raw * 0.22 * (1.0 - s3), uPal1, lineHit), s2);
  col = mix(col, mix(uPal0, uPal1, lineHit), s3);
  return col;
}`,
  });

  // ── 10. Duotone with grain: the quiet, closest-to-raw option ────────────
  D.define('duotone', {
    name: 'Duotone',
    name_ja: 'デュオトーン',
    defaults: { grain: 0.06, contrast: 1.15 },
    uniforms: (p) => [
      [p.grain, p.contrast, 0, 0],
      [0, 0, 0, 0],
    ],
    palette: ['#1b1f3a', '#f2c6a0', '#1b1f3a', '#f2c6a0'],
    src: `
vec3 effect(vec2 px) {
  ${STAGES}
  vec3 raw = photo(px);
  float l = clamp((luma(raw) - 0.5) * uP0.y + 0.5, 0.0, 1.0);
  vec3 duo = mix(uPal0, uPal1, smoothstep(0.0, 1.0, l));
  float t = uAnimate > 0.5 ? floor(uTime * 12.0) : 0.0;
  float grain = (hash12(floor(px / max(1.0, uDpr)) + t * 7.31) - 0.5) * uP0.x * 2.0;
  vec3 col = mix(raw, duo, s2);
  col += grain * mix(0.3, 1.0, s1) * s1;
  // A fine 1px line screen at full strength.
  col *= 1.0 - 0.08 * s3 * step(0.5, fract(px.y / (2.0 * uDpr)));
  return col;
}`,
  });

  // ── 11. Glyph rain: columns of falling type that reveal the picture ─────
  D.define('rain', {
    name: 'Glyph rain',
    name_ja: '文字の雨',
    defaults: { cell: 11, speed: 0.6, density: 0.6 },
    uniforms: (p) => [
      [p.cell, p.speed, p.density, 0],
      [0, 0, 0, 0],
    ],
    palette: ['#020403', '#1d7a46', '#8cffb5', '#ffffff'],
    src: `
vec3 effect(vec2 px) {
  ${STAGES}
  float size = max(6.0, uP0.x * uDpr);
  vec2 id = floor(px / size);
  vec2 f = fract(px / size);
  vec2 c;
  vec3 cell = cellColor(px, size, c);
  float col0 = hash12(vec2(id.x, 3.7));
  float speed = (0.4 + col0) * uP0.y * 8.0;
  float len = 6.0 + col0 * 18.0;
  float head = fract(uTime * speed / (uRes.y / size) + col0) * (uRes.y / size + len);
  float trail = head - id.y;
  float lit = trail > 0.0 && trail < len ? 1.0 - trail / len : 0.0;
  lit *= step(1.0 - uP0.z, hash12(vec2(id.x, 9.1)) + 0.25);
  float tick = floor(uTime * 6.0 + hash12(id) * 10.0);
  float g = glyph(glyphFor(0.35 + hash12(id + tick) * 0.65), f);
  vec3 raw = photo(px);
  float l = luma(cell);
  // Every cell shows type whose brightness follows the picture, so the image
  // stays readable; the falling heads add light on top.
  vec3 tint = mix(uPal1, min(cell * 1.5 + 0.08, 1.0), 0.55);
  vec3 type = mix(uPal0 + cell * 0.16, tint * (0.35 + 1.25 * l), g) + uPal2 * g * lit * 0.85;
  type += uPal3 * g * step(trail, 1.0) * step(0.0, trail) * 0.6;
  vec3 col = mix(raw, raw * 0.55 + type * 0.6, s1);
  col = mix(col, type, s2);
  float ring = tapRing(px, 260.0, 18.0);
  col += uPal2 * g * ring;
  return col;
}`,
  });

  // ── 12. Pixel blocks: chunky mosaic with bevelled tiles ─────────────────
  D.define('mosaic', {
    name: 'Pixel tiles',
    name_ja: 'ピクセルタイル',
    defaults: { block: 14, bevel: 0.5, gap: 1 },
    uniforms: (p) => [
      [p.block, p.bevel, p.gap, 0],
      [0, 0, 0, 0],
    ],
    src: `
vec3 effect(vec2 px) {
  ${STAGES}
  float size = max(2.0, mix(2.0 * uDpr, uP0.x * uDpr, s2));
  vec2 c;
  vec3 cell = cellColor(px, size, c);
  vec2 f = fract(px / size);
  float gapPx = uP0.z * uDpr * s2;
  float g = step(gapPx / size, f.x) * step(gapPx / size, f.y);
  float bev = (f.x - f.y) * uP0.y * 0.25 * s3;
  vec3 tile = cell * (1.0 + bev) * mix(0.25, 1.0, g);
  vec3 raw = photo(px);
  vec3 col = mix(raw, tile, s1);
  float ring = tapRing(px, 220.0, 16.0);
  col = mix(col, min(tile * 1.6, 1.0), ring);
  return col;
}`,
  });
})();
