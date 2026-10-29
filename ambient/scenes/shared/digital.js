// Digital layer — draws a picture through one "digital" treatment (ASCII grid,
// halftone, dither, LED, …) whose strength is `amount`: 0 is the untouched
// picture, 1 is fully digital. Used by the app's photo scenes and by the gallery.
//
//   const d = Digital.create(canvas, { maxDpr: 2 });
//   await d.setImage(urlOrImageOrCanvas, { focus: [0.5, 0.45] });
//   d.setRecipe({ effect: 'ascii', params: { cell: 9 }, palette: ['#…'], accent: '#…', animate: 'shimmer' });
//   d.setAmount(0.65);
//   d.draw(t);           // each frame
//   d.tap(x, y, t);      // CSS px
//
// Each effect is a GLSL function `vec3 effect(vec2 px)` plus defaults. Shared helpers
// (photo sampling with blur, cells, glyphs, noise, palettes) live in HEADER.
(function () {
  // Ordered from emptiest to densest, so glyphFor(ink) reads as a tone ramp.
  const GLYPHS = " .'`,-:;~+=!*/\\|iltcxo%S#8@";

  const HEADER = `
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uAtlas;
uniform vec2 uRes;        // canvas size, device px
uniform vec4 uCover;      // image uv = px/uRes * uCover.xy + uCover.zw
uniform vec2 uTexSize;    // texture size in texels
uniform float uDpr;
uniform float uAmount;
uniform float uTime;
uniform vec4 uTap;        // x, y (device px), age (s), strength
uniform vec4 uP0;         // effect parameters, meaning per effect
uniform vec4 uP1;
uniform vec3 uPal0;
uniform vec3 uPal1;
uniform vec3 uPal2;
uniform vec3 uPal3;
uniform vec3 uAccent;
uniform float uGlyphs;    // glyph count in the atlas
uniform float uAnimate;   // 0 none, 1 shimmer, 2 drift, 3 scan, 4 breathe, 5 rain
uniform vec2 uLevels;     // black and white points of the visible picture

vec2 imgUV(vec2 px) { return (px / uRes) * uCover.xy + uCover.zw; }
// Auto contrast that grows with the amount, so flat pictures still give the effects
// something to work with while 素 stays the untouched photo.
vec3 lev(vec3 c) { return mix(c, clamp((c - uLevels.x) / (uLevels.y - uLevels.x), 0.0, 1.0), min(uAmount * 2.0, 1.0)); }
// Photo at a screen position; bias > 0 reads a blurrier mip (average over ~2^bias texels).
vec3 photo(vec2 px) { return lev(texture2D(uImage, imgUV(px)).rgb); }
vec3 photoBlur(vec2 px, float bias) { return lev(texture2D(uImage, imgUV(px), bias).rgb); }
// Mip bias that averages over a square of side "px" device pixels.
float mipFor(float px) { return log2(max(1.0, px * uTexSize.x * uCover.x / uRes.x)); }
// Average colour of the cell of side "size" device px containing px; returns the cell centre too.
vec3 cellColor(vec2 px, float size, out vec2 center) {
  center = (floor(px / size) + 0.5) * size;
  return photoBlur(center, mipFor(size));
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
// 4x4 Bayer threshold in [0,1).
float bayer4(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float x = q.x; float y = q.y;
  float b = mod(x, 2.0) * 2.0 + mod(y, 2.0) * 3.0 - 2.0 * mod(x, 2.0) * mod(y, 2.0);
  float a = floor(x / 2.0) * 2.0 + floor(y / 2.0) * 3.0 - 2.0 * floor(x / 2.0) * floor(y / 2.0);
  return (b * 4.0 + a + 0.5) / 16.0;
}
// Coverage of glyph g (0..uGlyphs-1) at uv inside its cell (0..1, y down).
float glyph(float g, vec2 uv) {
  uv = clamp(uv, 0.0, 1.0);
  return texture2D(uAtlas, vec2((g + uv.x) / uGlyphs, uv.y)).r;
}
// Glyph index for a darkness value 0..1 (0 = blank, 1 = densest).
float glyphFor(float ink) { return floor(clamp(ink, 0.0, 0.999) * uGlyphs); }
// The tap: a ring travelling outward, 0..1 at px.
float tapRing(vec2 px, float speed, float width) {
  if (uTap.w <= 0.0) return 0.0;
  float r = uTap.z * speed * uDpr;
  float d = abs(length(px - uTap.xy) - r);
  return uTap.w * smoothstep(width * uDpr, 0.0, d) * exp(-uTap.z * 1.4);
}
vec3 pal4(float t) {
  t = clamp(t, 0.0, 1.0) * 3.0;
  if (t < 1.0) return mix(uPal0, uPal1, t);
  if (t < 2.0) return mix(uPal1, uPal2, t - 1.0);
  return mix(uPal2, uPal3, t - 2.0);
}
`;

  const effects = {};

  /** Registers an effect. src defines `vec3 effect(vec2 px)`; px is in device px, y down. */
  function define(id, def) {
    effects[id] = def;
  }

  function hexToRgb(hex) {
    const n = parseInt(String(hex || '#000000').slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function buildAtlas(size) {
    const c = document.createElement('canvas');
    c.width = size * GLYPHS.length;
    c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff';
    g.font = `600 ${Math.round(size * 0.8)}px ui-monospace, "SF Mono", Menlo, "Roboto Mono", monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < GLYPHS.length; i++) g.fillText(GLYPHS[i], i * size + size / 2, size * 0.54);
    return c;
  }

  const ANIMATE = { none: 0, shimmer: 1, drift: 2, scan: 3, breathe: 4, rain: 5 };

  function create(canvas, opts = {}) {
    const maxDpr = opts.maxDpr || 2;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserve });
    if (!gl) throw new Error('WebGL is not available');
    let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    let image = null; // { w, h, focus }
    let recipe = null;
    let amount = 0.65;
    let tapState = { x: 0, y: 0, t0: -100, s: 0 };
    const programs = {};
    let prog = null;
    let loc = {};

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const imageTex = gl.createTexture();
    const atlasTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, buildAtlas(64));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + '\n' + src);
      return sh;
    }

    function program(id) {
      if (programs[id]) return programs[id];
      const def = effects[id];
      const fs = `${HEADER}\n${def.src}\nvoid main() {\n  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);\n  vec3 col = uAmount <= 0.0005 ? texture2D(uImage, imgUV(px)).rgb : effect(px);\n  gl_FragColor = vec4(col, 1.0);\n}`;
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }'));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const l = {};
      for (const n of ['uImage', 'uAtlas', 'uRes', 'uCover', 'uTexSize', 'uDpr', 'uAmount', 'uTime', 'uTap', 'uP0', 'uP1', 'uPal0', 'uPal1', 'uPal2', 'uPal3', 'uAccent', 'uGlyphs', 'uAnimate', 'uLevels']) {
        l[n] = gl.getUniformLocation(p, n);
      }
      l.a = gl.getAttribLocation(p, 'a');
      programs[id] = { p, l };
      return programs[id];
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    // Images are redrawn into a power-of-two canvas so WebGL 1 can build mipmaps
    // (effects read blurred averages with a mip bias).
    function setImage(src, o = {}) {
      return new Promise((resolve, reject) => {
        const use = (img) => {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          const pot = (n) => Math.pow(2, Math.min(12, Math.ceil(Math.log2(Math.max(2, n)))));
          const c = document.createElement('canvas');
          c.width = pot(Math.min(w, 2048));
          c.height = pot(Math.min(h, 2048));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          gl.bindTexture(gl.TEXTURE_2D, imageTex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          // A tiny copy for CPU-side questions such as "is the middle dark?".
          const n = 48;
          const sc = document.createElement('canvas');
          sc.width = n;
          sc.height = n;
          const sctx = sc.getContext('2d');
          sctx.drawImage(img, 0, 0, n, n);
          let small = null;
          try {
            small = { n, data: sctx.getImageData(0, 0, n, n).data };
          } catch (e) {}
          image = { w, h, tw: c.width, th: c.height, focus: o.focus || [0.5, 0.5], small };
          levelsKey = '';
          resolve(image);
        };
        if (typeof src === 'string') {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => use(img);
          img.onerror = () => reject(new Error('image failed to load: ' + src));
          img.src = src;
        } else {
          use(src);
        }
      });
    }

    function setRecipe(r) {
      recipe = r;
      program(r.effect);
    }

    function setAmount(a) {
      amount = Math.max(0, Math.min(1, a));
    }

    function tap(x, y, t) {
      tapState = { x: x * dpr, y: y * dpr, t0: t, s: 1 };
    }

    // Cover-fit the picture to the canvas, sliding toward the focus point.
    function cover() {
      const cw = canvas.width;
      const ch = canvas.height;
      const sa = cw / ch;
      const ia = image.w / image.h;
      let sx = 1;
      let sy = 1;
      if (ia > sa) sx = sa / ia;
      else sy = ia / sa;
      const ox = Math.min(1 - sx, Math.max(0, image.focus[0] - sx / 2));
      const oy = Math.min(1 - sy, Math.max(0, image.focus[1] - sy / 2));
      return [sx, sy, ox, oy];
    }

    // Black and white points (2nd and 98th percentile luma) of the visible part of
    // the picture, widened so the stretch never exceeds 1.8x.
    let levelsKey = '';
    let levelsVal = [0, 1];
    function levels(cv) {
      const key = cv.join(',');
      if (key === levelsKey) return levelsVal;
      levelsKey = key;
      levelsVal = [0, 1];
      if (!image.small) return levelsVal;
      const { n, data } = image.small;
      const ls = [];
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const u = (x + 0.5) / n;
          const v = (y + 0.5) / n;
          if (u < cv[2] || u > cv[2] + cv[0] || v < cv[3] || v > cv[3] + cv[1]) continue;
          const i = (y * n + x) * 4;
          ls.push((0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255);
        }
      }
      if (ls.length < 16) return levelsVal;
      ls.sort((a, b) => a - b);
      const lo = ls[Math.floor(ls.length * 0.02)];
      const hi = ls[Math.ceil(ls.length * 0.98) - 1];
      const span = Math.max(hi - lo, 1 / 1.8);
      const black = Math.min(1 - span, Math.max(0, (lo + hi) / 2 - span / 2));
      levelsVal = [black, black + span];
      return levelsVal;
    }

    function draw(t) {
      if (!image || !recipe) return;
      resize();
      const def = effects[recipe.effect];
      const { p, l } = program(recipe.effect);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(p);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(l.a);
      gl.vertexAttribPointer(l.a, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.uniform1i(l.uImage, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.uniform1i(l.uAtlas, 1);
      gl.uniform2f(l.uRes, canvas.width, canvas.height);
      const cv = cover();
      gl.uniform4fv(l.uCover, cv);
      gl.uniform2fv(l.uLevels, levels(cv));
      gl.uniform2f(l.uTexSize, image.tw, image.th);
      gl.uniform1f(l.uDpr, dpr);
      gl.uniform1f(l.uAmount, amount);
      gl.uniform1f(l.uTime, t);
      const age = t - tapState.t0;
      gl.uniform4f(l.uTap, tapState.x, tapState.y, age, age < 4 ? tapState.s : 0);
      const params = Object.assign({}, def.defaults, recipe.params || {});
      const u = def.uniforms(params, amount);
      gl.uniform4fv(l.uP0, u[0] || [0, 0, 0, 0]);
      gl.uniform4fv(l.uP1, u[1] || [0, 0, 0, 0]);
      const pal = (recipe.palette && recipe.palette.length ? recipe.palette : def.palette || ['#000000', '#555555', '#aaaaaa', '#ffffff']).map(hexToRgb);
      while (pal.length < 4) pal.push(pal[pal.length - 1]);
      gl.uniform3fv(l.uPal0, pal[0]);
      gl.uniform3fv(l.uPal1, pal[1]);
      gl.uniform3fv(l.uPal2, pal[2]);
      gl.uniform3fv(l.uPal3, pal[3]);
      gl.uniform3fv(l.uAccent, hexToRgb(recipe.accent || def.accent || '#ffffff'));
      gl.uniform1f(l.uGlyphs, GLYPHS.length);
      gl.uniform1f(l.uAnimate, ANIMATE[recipe.animate] || 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    /** Average luminance (0..1) of the picture under a screen rectangle in CSS px. */
    function lumaAt(x0, y0, x1, y1) {
      if (!image || !image.small) return 0.5;
      const [sx, sy, ox, oy] = cover();
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      const n = image.small.n;
      let sum = 0;
      let count = 0;
      for (let k = 0; k < 64; k++) {
        const u = ((x0 + ((x1 - x0) * ((k % 8) + 0.5)) / 8) / W) * sx + ox;
        const v = ((y0 + ((y1 - y0) * (Math.floor(k / 8) + 0.5)) / 8) / H) * sy + oy;
        const i = (Math.min(n - 1, Math.floor(v * n)) * n + Math.min(n - 1, Math.floor(u * n))) * 4;
        const d = image.small.data;
        sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        count++;
      }
      return sum / count;
    }

    /**
     * Average luminance (0..1) of what draw() just put under a rectangle in CSS px.
     * Call it right after draw(), in the same frame, so the drawing buffer is intact.
     */
    function drawnLumaAt(x0, y0, x1, y1) {
      const X0 = Math.max(0, Math.round(x0 * dpr));
      const X1 = Math.min(canvas.width, Math.round(x1 * dpr));
      const Y0 = Math.max(0, canvas.height - Math.round(y1 * dpr));
      const Y1 = Math.min(canvas.height, canvas.height - Math.round(y0 * dpr));
      const w = X1 - X0;
      const h = Y1 - Y0;
      if (w <= 0 || h <= 0) return 0.5;
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(X0, Y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let sum = 0;
      let n = 0;
      for (let i = 0; i < buf.length; i += 4 * 7) {
        sum += 0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2];
        n++;
      }
      return sum / n / 255;
    }

    return { setImage, setRecipe, setAmount, tap, draw, resize, lumaAt, drawnLumaAt, get recipe() { return recipe; } };
  }

  window.Digital = { create, define, effects, GLYPHS };
})();
