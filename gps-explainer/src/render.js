/*
 * Frame renderer. window.seek(t) paints the frame at time t (seconds); every pixel is a pure function of t
 * and the URL parameters (fmt, mode, dir, debug). No clocks, no Math.random.
 */
(function () {
  const T = window.TIMELINE;
  const W0 = T.world;
  const params = new URLSearchParams(location.search);
  const FMT = params.get("fmt") || "16x9";
  const MODE = params.get("mode") || "normal"; // normal | reduced
  const DIR = params.get("dir") || "A";        // visual direction (directions.html only)
  const DEBUG = params.get("debug") === "1";
  const REDUCED = MODE === "reduced";

  // ---------------------------------------------------------------- layout per format
  const FORMATS = {
    "16x9": {W: 1920, H: 1080, diag: [96, 56, 1728, 690], capBottom: 1024, capMaxW: 1720},
    "9x16": {W: 1080, H: 1920, diag: [72, 200, 936, 1180], capBottom: 1700, capMaxW: 936},
    "1x1": {W: 1080, H: 1080, diag: [72, 48, 936, 760], capBottom: 1030, capMaxW: 960},
  };
  const F = FORMATS[FMT];
  const [DX, DY, DW, DH] = F.diag;

  let TOK, COL, SIZE, EASE = {};
  const canvas = document.getElementById("c");
  canvas.width = F.W;
  canvas.height = F.H;
  canvas.style.width = F.W + "px";
  canvas.style.height = F.H + "px";
  const ctx = canvas.getContext("2d");

  // ---------------------------------------------------------------- directions (only for directions.html)
  const DIRECTIONS = {
    A: null,
    B: {paper: "#1F1C18", paper_shade: "#2C2822", ink: "#EEE8DC", ink_2: "#B9B2A5", rule: "#4A443B", accent: "#E8875A", accent_tint: "rgba(232,135,90,0.14)"},
    C: {paper: "#EEF1F2", paper_shade: "#DDE4E8", ink: "#132A3E", ink_2: "#4C6274", rule: "#B9C6CF", accent: "#1F5FC4", accent_tint: "rgba(31,95,196,0.10)"},
    D: null,
  };

  // ---------------------------------------------------------------- math helpers
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (u) => ((ax * u + bx) * u + cx) * u;
    const sy = (u) => ((ay * u + by) * u + cy) * u;
    const dsx = (u) => (3 * ax * u + 2 * bx) * u + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let u = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(u) - x;
        const d = dsx(u);
        if (Math.abs(e) < 1e-7 || Math.abs(d) < 1e-6) break;
        u -= e / d;
      }
      if (u < 0 || u > 1 || Math.abs(sx(u) - x) > 1e-5) { // bisection fallback
        let lo = 0, hi = 1;
        for (let i = 0; i < 40; i++) { u = (lo + hi) / 2; if (sx(u) < x) lo = u; else hi = u; }
      }
      return sy(u);
    };
  }

  // eased progress of a named move at beat b (0..1)
  function mv(name, b) {
    const m = T.moves[name];
    const raw = clamp01((b - m[0]) / (m[1] - m[0]));
    return EASE[m[2]](raw);
  }
  // linear fade used where reduced motion replaces a spatial move
  function fade(name, b) {
    const m = T.moves[name];
    return clamp01((b - m[0]) / (m[1] - m[0]));
  }
  const between = (b, a, z) => b >= a && b < z;
  function window01(b, from, to, fin = 0.25, fout = 0.25) {
    if (b < from || b > to) return 0;
    return Math.min(clamp01((b - from) / fin), clamp01((to - b) / fout));
  }

  // ---------------------------------------------------------------- camera
  function fit(regionName) {
    const tall = FMT !== "16x9" && T.cameras[regionName + "_tall"];
    const [x0, y0, x1, y1] = tall || T.cameras[regionName];
    const s = Math.min(DW / (x1 - x0), DH / (y1 - y0));
    return {s, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2};
  }
  function toScreenWith(cam, x, y) {
    return [DX + DW / 2 + (x - cam.cx) * cam.s, DY + DH / 2 - (y - cam.cy) * cam.s];
  }
  function cameraAt(b) {
    let cur = fit(T.cameraTrack[0].cam);
    for (const k of T.cameraTrack.slice(1)) {
      const [m0, m1] = k.move;
      if (b < m0) break;
      const nxt = fit(k.to);
      if (b >= m1) { cur = nxt; continue; }
      let e = EASE.move(clamp01((b - m0) / (m1 - m0)));
      if (REDUCED) e = b < (m0 + m1) / 2 ? 0 : 1; // a cut instead of a zoom
      const P = W0.phone;
      const p0 = toScreenWith(cur, P[0], P[1]);
      const p1 = toScreenWith(nxt, P[0], P[1]);
      const s = Math.exp(lerp(Math.log(cur.s), Math.log(nxt.s), e));
      const px = lerp(p0[0], p1[0], e), py = lerp(p0[1], p1[1], e);
      cur = {s, cx: P[0] - (px - DX - DW / 2) / s, cy: P[1] + (py - DY - DH / 2) / s};
      break;
    }
    return cur;
  }
  let CAM;
  const S = (x, y) => toScreenWith(CAM, x, y);
  const SP = (p) => S(p[0], p[1]);

  // visible world box (with margin) for adaptive circle sampling
  function viewBox() {
    const m = 200; // px margin
    const x0 = CAM.cx - (DW / 2 + DX + m) / CAM.s, x1 = CAM.cx + (F.W - DX - DW / 2 + m) / CAM.s;
    const y1 = CAM.cy + (DH / 2 + DY + m) / CAM.s, y0 = CAM.cy - (F.H - DY - DH / 2 + m) / CAM.s;
    return {x0, y0, x1, y1};
  }

  // path along a circle in world space; handles radii far larger than the screen.
  function circlePath(cx, cy, r, a0 = null, a1 = null) {
    const rpx = r * CAM.s;
    let from, to, n;
    if (a0 !== null) {
      from = a0; to = a1; n = Math.max(24, Math.ceil(Math.abs(a1 - a0) / (2 * Math.PI) * 720));
    } else if (rpx < 6000) {
      from = 0; to = 2 * Math.PI; n = Math.max(96, Math.min(1440, Math.ceil(rpx * 0.6)));
    } else {
      const v = viewBox();
      const vx = (v.x0 + v.x1) / 2, vy = (v.y0 + v.y1) / 2;
      const half = Math.hypot(v.x1 - v.x0, v.y1 - v.y0) / 2;
      const phi = Math.atan2(vy - cy, vx - cx);
      const span = Math.min(Math.PI, Math.asin(Math.min(1, half / r)) * 1.25 + 1e-4);
      from = phi - span; to = phi + span; n = 600;
    }
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = lerp(from, to, i / n);
      pts.push(S(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
    return pts;
  }
  function strokePts(pts, color, width, alpha = 1, dash = null, dashOffset = 0) {
    if (alpha <= 0.001 || pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = dashOffset; }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.restore();
  }
  function line(p, q, color, width, alpha = 1, dash = null, off = 0) { strokePts([p, q], color, width, alpha, dash, off); }
  function dot(p, r, fill, alpha = 1, ring = null, ringW = 0) {
    if (alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
    if (ring) { ctx.lineWidth = ringW; ctx.strokeStyle = ring; ctx.stroke(); }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }
  function ringPx(p, r, color, width, alpha = 1) {
    if (alpha <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------- text
  const NO_START = "、。，．・：；？！ー）」』】〉》”’";
  const NO_END = "（「『【〈《“‘";
  const sizeOf = (style) => SIZE[style] || (style === "mono" ? SIZE.anchor : SIZE.anchor);
  function fontFor(style) {
    const z = sizeOf(style);
    if (style === "mono") return `500 ${z}px "IBM Plex Mono", "IBM Plex Sans JP"`;
    if (style === "label") return `600 ${z}px "IBM Plex Sans JP"`;
    if (style === "small") return `400 ${z}px "IBM Plex Sans JP"`;
    if (style === "caption") return `500 ${z}px "IBM Plex Sans JP"`;
    return `500 ${z}px "IBM Plex Sans JP"`;
  }
  // Line breaking: only at "|" hints (Japanese phrase boundaries). Picks the split with the
  // narrowest widest line; falls back to character wrapping with kinsoku for an over-long segment.
  function charWrap(text, maxW) {
    const lines = [];
    let curr = "";
    for (const ch of Array.from(text)) {
      if (ctx.measureText(curr + ch).width > maxW && curr.length) {
        if (NO_START.includes(ch)) { curr += ch; lines.push(curr); curr = ""; continue; }
        const last = curr[curr.length - 1];
        if (NO_END.includes(last)) { lines.push(curr.slice(0, -1)); curr = last + ch; continue; }
        lines.push(curr);
        curr = ch;
      } else curr += ch;
    }
    if (curr) lines.push(curr);
    return lines;
  }
  function wrap(text, maxW) {
    const segs = text.split("|");
    const whole = segs.join("");
    const wd = (s) => ctx.measureText(s).width;
    if (wd(whole) <= maxW) return [whole];
    let best = null;
    for (let i = 1; i < segs.length; i++) {
      const a = segs.slice(0, i).join(""), b = segs.slice(i).join("");
      const m = Math.max(wd(a), wd(b));
      if (m <= maxW && (!best || m < best.m)) best = {m, lines: [a, b]};
    }
    if (best) return best.lines;
    const lines = [];
    let curr = "";
    for (const sg of segs) {
      if (wd(curr + sg) <= maxW) { curr += sg; continue; }
      if (curr) lines.push(curr);
      if (wd(sg) <= maxW) curr = sg;
      else { const cw = charWrap(sg, maxW); lines.push(...cw.slice(0, -1)); curr = cw[cw.length - 1]; }
    }
    if (curr) lines.push(curr);
    return lines;
  }

  // text with a paper halo so it reads over lines
  function drawText(lines, x, y, style, align, alpha, color) {
    if (alpha <= 0.001) return;
    const z = sizeOf(style);
    const lh = z * 1.36;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = fontFor(style);
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = COL.paper;
    ctx.lineWidth = Math.round(z * 0.32);
    ctx.fillStyle = color || COL.ink;
    lines.forEach((ln, i) => {
      const yy = y + (i - (lines.length - 1) / 2) * lh;
      ctx.strokeText(ln, x, yy);
      ctx.fillText(ln, x, yy);
    });
    ctx.restore();
  }

  // the payoff dims everything but the location dot
  const focus = (b) => 1 - 0.85 * (REDUCED ? fade("focus_dot", b) : mv("focus_dot", b));

  // ---------------------------------------------------------------- scene objects
  const PHONE = W0.phone;
  const satPos = (k) => W0.sats[k].pos;
  const satScreen = (k) => SP(satPos(k));

  function drawEarth(b) {
    const a = REDUCED ? fade("earth_in", b) : mv("earth_in", b);
    const lift = REDUCED ? 0 : (1 - a) * 16;
    const pts = circlePath(0, 0, W0.R);
    if (pts.length < 2) return;
    const fo = focus(b);
    ctx.save();
    ctx.globalAlpha = a * fo;
    ctx.translate(0, lift);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    // close through points far inside the Earth so a huge radius still fills correctly
    const v = viewBox();
    const deep = Math.max(v.x1 - v.x0, v.y1 - v.y0) * 3;
    const last = pts[pts.length - 1], first = pts[0];
    const c0 = S(0, 0);
    const toward = (p) => {
      const dx = c0[0] - p[0], dy = c0[1] - p[1];
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, (deep * CAM.s) / d);
      return [p[0] + dx * k, p[1] + dy * k];
    };
    const l2 = toward(last), f2 = toward(first);
    ctx.lineTo(l2[0], l2[1]);
    ctx.lineTo(f2[0], f2[1]);
    ctx.closePath();
    ctx.fillStyle = COL.paper_shade;
    ctx.fill();
    ctx.restore();
    // the outline is a planet-scale cue only; at street scale circle A must not be mistaken for the ground edge
    const outline = CAM.s < 2 ? 1 : CAM.s > 20 ? 0 : 1 - (CAM.s - 2) / 18;
    strokePts(pts.map((p) => [p[0], p[1] + lift]), COL.rule, TOK.stroke.line, a * fo * outline);
  }

  function satAlpha(k, b) {
    const name = k + "_in";
    if (!T.moves[name]) return 0;
    return REDUCED ? fade(name, b) : mv(name, b);
  }
  function drawSat(k, b) {
    const a = satAlpha(k, b) * focus(b);
    if (a <= 0.001) return;
    let [x, y] = satScreen(k);
    if (!REDUCED) y -= (1 - a) * 36;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    const u = SIZE.label / 52;
    ctx.lineWidth = 3 * u;
    ctx.strokeStyle = COL.ink;
    ctx.fillStyle = COL.paper;
    // body
    ctx.beginPath();
    ctx.rect(-12 * u, -12 * u, 24 * u, 24 * u);
    ctx.fill();
    ctx.stroke();
    // solar panels with one cell line each
    for (const sgn of [-1, 1]) {
      const px = sgn > 0 ? 18 * u : -50 * u;
      ctx.beginPath();
      ctx.rect(px, -9 * u, 32 * u, 18 * u);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + 16 * u, -9 * u);
      ctx.lineTo(px + 16 * u, 9 * u);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sgn > 0 ? 12 * u : -12 * u, 0);
      ctx.lineTo(sgn > 0 ? 18 * u : -18 * u, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  // the wrong belief: a beam from satellite A onto the phone
  function drawCone(b) {
    let grow, a;
    if (b < T.moves.cone_out[0]) {
      grow = REDUCED ? 1 : mv("cone_in", b);
      a = REDUCED ? fade("cone_in", b) : (b >= T.moves.cone_in[0] ? 1 : 0);
    } else {
      grow = REDUCED ? 1 : 1 - mv("cone_out", b);
      a = REDUCED ? 1 - fade("cone_out", b) : (grow > 0.001 ? 1 : 0);
    }
    if (a <= 0.001 || grow <= 0.001) return;
    const A = satScreen("A"), P = SP(PHONE);
    const apex = [A[0], A[1] + 18];
    const end = [lerp(apex[0], P[0], grow), lerp(apex[1], P[1], grow)];
    const half = 70 * grow * (SIZE.label / 52);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.moveTo(apex[0], apex[1]);
    ctx.lineTo(end[0] - half, end[1]);
    ctx.lineTo(end[0] + half, end[1]);
    ctx.closePath();
    ctx.fillStyle = COL.ink;
    ctx.globalAlpha = a * 0.06;
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.setLineDash([14, 12]);
    ctx.strokeStyle = COL.ink_2;
    ctx.lineWidth = TOK.stroke.line;
    ctx.stroke();
    ctx.restore();
  }

  function circleColorAlpha(k, b) {
    // returns [color, alpha, width] of satellite k's range circle (after it exists)
    const settle = {A: [38, 39], B: [44, 45], C: [55, 56]}[k];
    let mix = clamp01((b - settle[0]) / (settle[1] - settle[0]));
    let alpha = 1;
    const dim = mv("circles_dim", b);
    alpha *= lerp(1, 0.28, dim);
    const sk = "street_" + k + "_in";
    const back = REDUCED ? fade(sk, b) : mv(sk, b);
    if (b >= T.moves.street_A_in[0]) alpha = lerp(0.28, 1, back);
    if (b >= T.moves.arcs_out[0]) alpha *= 1 - (REDUCED ? fade("arcs_out", b) : mv("arcs_out", b));
    const color = mix >= 1 ? COL.ink_2 : COL.accent;
    return [color, alpha, TOK.stroke.line, mix];
  }

  function drawWavefronts(b) {
    const fo = focus(b);
    for (const e of T.emissions) {
      if (b < e.b) continue;
      const range = W0.sats[e.sat].range;
      const c = satPos(e.sat);
      if (!satAlpha(e.sat, b) && e.sat !== "A") continue;
      if (REDUCED) {
        // no expanding ring: the ring appears at its arrival radius and fades
        if (e.freeze) continue;
        const a = window01(b, e.arrive - 0.25, e.arrive + 1.5, 0.35, 0.8) * 0.85 * fo;
        strokePts(circlePath(c[0], c[1], range), COL.accent, TOK.stroke.line, a);
        continue;
      }
      const r = (b - e.b) * W0.KM_PER_BEAT;
      if (e.freeze) {
        if (r >= range) continue; // becomes the satellite's circle
        strokePts(circlePath(c[0], c[1], r), COL.accent, TOK.stroke.line, 0.95);
        continue;
      }
      const end = range * 1.4;
      if (r > end) continue;
      const a = (r < range ? 0.95 : 0.95 * (1 - (r - range) / (end - range))) * fo;
      strokePts(circlePath(c[0], c[1], r), COL.accent, TOK.stroke.line, a);
    }
  }

  function errorOffset(b) {
    // km added to every range by the phone's clock error
    const on = REDUCED ? fade("clock_error", b) : mv("clock_error", b);
    const off = REDUCED ? fade("solve", b) : mv("solve", b);
    return W0.ERROR_KM * on * (1 - off);
  }

  function drawRangeCircles(b) {
    // A: swept from the measured line
    const sw0 = T.moves.sweep_A[0];
    if (b >= sw0) {
      const [color, alpha, w] = circleColorAlpha("A", b);
      const c = satPos("A");
      const r = W0.sats.A.range;
      if (b < T.moves.sweep_A[1]) {
        if (REDUCED) {
          strokePts(circlePath(c[0], c[1], r), COL.accent, w, fade("sweep_A", b));
        } else {
          const p = mv("sweep_A", b);
          const a0 = -Math.PI / 2;
          strokePts(circlePath(c[0], c[1], r, a0, a0 - p * 2 * Math.PI), COL.accent, w, 1);
        }
      } else drawRangeCircle("A", b, color, alpha, w);
    }
    for (const k of ["B", "C"]) {
      const e = T.emissions.find((x) => x.sat === k && x.freeze);
      if (b < e.arrive) continue;
      const [color, alpha, w] = circleColorAlpha(k, b);
      const appear = REDUCED ? clamp01((b - e.arrive) / 0.5) : 1;
      drawRangeCircle(k, b, color, alpha * appear, w);
    }
  }
  function drawRangeCircle(k, b, color, alpha, w) {
    const c = satPos(k);
    const r = W0.sats[k].range;
    const err = errorOffset(b);
    const inTurn = b >= T.moves.clock_error[0] && b < T.moves.arcs_out[1];
    if (!inTurn || err < 1e-9 && b < T.moves.clock_error[0]) {
      strokePts(circlePath(c[0], c[1], r), color, w, alpha);
      return;
    }
    if (REDUCED) {
      // cross-fade between the true circle and the shifted one
      const f = err / W0.ERROR_KM;
      strokePts(circlePath(c[0], c[1], r), COL.ink, w, alpha * (1 - f) + alpha * 0.25 * f);
      strokePts(circlePath(c[0], c[1], r + W0.ERROR_KM), COL.accent, TOK.stroke.bold, alpha * f, [16, 12]);
      return;
    }
    // true circle stays as a faint reference while the measured one is off
    const f = err / W0.ERROR_KM;
    strokePts(circlePath(c[0], c[1], r), COL.ink, w, alpha * lerp(1, 0.25, f));
    if (err > 1e-6) strokePts(circlePath(c[0], c[1], r + err), COL.accent, TOK.stroke.bold, alpha * f, [16, 12]);
  }

  function drawDelayLine(b) {
    const [m0] = T.moves.delay_line;
    if (b < m0) return;
    const A = satScreen("A"), P = SP(PHONE);
    let p = REDUCED ? 1 : mv("delay_line", b);
    let a = REDUCED ? fade("delay_line", b) : 1;
    const sw = T.moves.sweep_A;
    if (b >= sw[0]) {
      // the measured distance becomes the radius and sweeps the circle
      const q = REDUCED ? 1 : mv("sweep_A", b);
      const r = W0.sats.A.range;
      const ang = -Math.PI / 2 - q * 2 * Math.PI;
      const c = satPos("A");
      const end = S(c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang));
      a *= 1 - (REDUCED ? fade("radius_out", b) : mv("radius_out", b));
      line(A, end, COL.accent, TOK.stroke.bold, a);
      return;
    }
    const end = [lerp(A[0], P[0], p), lerp(A[1], P[1], p)];
    line(A, end, COL.accent, TOK.stroke.bold, a);
    // end ticks
    const tick = 14;
    if (p > 0.98) {
      line([A[0] - tick, A[1] + 30], [A[0] + tick, A[1] + 30], COL.accent, TOK.stroke.bold, a);
      line([P[0] - tick, P[1] - 18], [P[0] + tick, P[1] - 18], COL.accent, TOK.stroke.bold, a);
    }
  }

  function drawMarkers(b) {
    if (b < T.moves.markers_in[0] || b >= T.moves.circles_dim[1] + 1) return;
    const a = REDUCED ? fade("markers_in", b) : mv("markers_in", b);
    const P = SP(PHONE);
    const Q = SP(W0.secondAB);
    const u = SIZE.label / 52;
    const gone = REDUCED ? fade("wrong_out", b) : mv("wrong_out", b);
    // second (wrong) candidate
    if (gone < 1) {
      ringPx(Q, 20 * u, COL.ink, TOK.stroke.line, a * (1 - gone));
      drawText(["?"], Q[0] + 44 * u, Q[1] - 4, "label", "center", a * (1 - gone));
      if (b >= T.moves.wrong_out[0]) {
        const s = 16 * u;
        const k = REDUCED ? 1 : clamp01((b - T.moves.wrong_out[0]) / 0.3);
        line([Q[0] - s, Q[1] - s], [Q[0] - s + 2 * s * k, Q[1] - s + 2 * s * k], COL.ink, TOK.stroke.bold, 1 - gone);
        line([Q[0] + s, Q[1] - s], [Q[0] + s - 2 * s * k, Q[1] - s + 2 * s * k], COL.ink, TOK.stroke.bold, 1 - gone);
      }
    }
    // phone candidate → current position
    const lock = REDUCED ? fade("lock_in", b) : mv("lock_in", b);
    const dimOut = mv("circles_dim", b);
    if (lock < 1) {
      ringPx(P, 20 * u, COL.ink, TOK.stroke.line, a * (1 - lock));
      drawText(["?"], P[0] + 44 * u, P[1] - 30 * u, "label", "center", a * (1 - lock));
    }
    ringPx(P, lerp(20, 28, lock) * u, COL.accent, TOK.stroke.bold, lock * (1 - dimOut));
  }

  function drawSignals(b) {
    if (b < T.moves.signals_in[0] || b > T.moves.signals_out[1]) return;
    const p = REDUCED ? 1 : mv("signals_in", b);
    const a = (REDUCED ? fade("signals_in", b) : 1) * (1 - (REDUCED ? fade("signals_out", b) : mv("signals_out", b)));
    const P = SP(PHONE);
    ["A", "B", "C"].forEach((k, i) => {
      const s0 = satScreen(k);
      const lag = clamp01(p * 1.6 - i * 0.3);
      const end = [lerp(s0[0], P[0], lag), lerp(s0[1], P[1], lag)];
      const flow = REDUCED ? 0 : -(b - T.moves.signals_in[0]) * 36;
      line(s0, end, COL.accent, TOK.stroke.line, a, [18, 14], flow);
    });
  }

  const UP_TILT = (25 * Math.PI) / 180;
  function upGeom() {
    const P = SP(PHONE);
    const u = SIZE.label / 52;
    const dir = [Math.sin(UP_TILT), -Math.cos(UP_TILT)];
    const nrm = [Math.cos(UP_TILT), Math.sin(UP_TILT)];
    const from = [P[0] + dir[0] * 26 * u, P[1] + dir[1] * 26 * u];
    const len = 150 * u;
    const top = [from[0] + dir[0] * len, from[1] + dir[1] * len];
    return {P, u, dir, nrm, from, top, len};
  }
  function drawUpArrow(b) {
    if (b < T.moves.up_in[0] || b > T.moves.signals_out[1]) return;
    const a = (REDUCED ? fade("up_in", b) : mv("up_in", b)) * (1 - (REDUCED ? fade("signals_out", b) : mv("signals_out", b)));
    const {u, dir, nrm, from, top, len} = upGeom();
    const struck = REDUCED ? fade("strike_in", b) : mv("strike_in", b);
    const fadeA = lerp(1, 0.45, struck);
    const head = (s) => [top[0] - dir[0] * 22 * u + s * nrm[0] * 16 * u, top[1] - dir[1] * 22 * u + s * nrm[1] * 16 * u];
    line(from, top, COL.ink, TOK.stroke.bold, a * fadeA);
    line(top, head(-1), COL.ink, TOK.stroke.bold, a * fadeA);
    line(top, head(1), COL.ink, TOK.stroke.bold, a * fadeA);
    if (struck > 0) {
      const c = [from[0] + dir[0] * len / 2, from[1] + dir[1] * len / 2];
      const s = 46 * u;
      const k = REDUCED ? 1 : struck;
      // strike across the arrow: perpendicular-ish diagonal
      const d1 = [-(nrm[0] + dir[0]) * s * 0.75, -(nrm[1] + dir[1]) * s * 0.75];
      const p0 = [c[0] + d1[0], c[1] + d1[1]];
      const p1 = [c[0] - d1[0], c[1] - d1[1]];
      line(p0, [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k)], COL.accent, TOK.stroke.bold + 1, a);
    }
  }

  function bracketGeom() {
    // vertical bracket between A's true circle and its shifted circle, beside the phone
    const x = 0.42;
    const yTrue = W0.sats.A.pos[1] - Math.sqrt(W0.sats.A.range ** 2 - x * x);
    const yErr = W0.sats.A.pos[1] - Math.sqrt((W0.sats.A.range + W0.ERROR_KM) ** 2 - x * x);
    return {p: S(x, yTrue), q: S(x, yErr)};
  }
  function drawBracket(b) {
    if (b < T.moves.bracket_in[0] || b > T.moves.solve[0] + 0.5) return;
    const a = (REDUCED ? fade("bracket_in", b) : mv("bracket_in", b)) * (1 - clamp01((b - T.moves.solve[0]) / 0.5));
    const {p, q} = bracketGeom();
    const t = 12;
    line(p, q, COL.ink, TOK.stroke.line, a);
    line([p[0] - t, p[1]], [p[0] + t, p[1]], COL.ink, TOK.stroke.line, a);
    line([q[0] - t, q[1]], [q[0] + t, q[1]], COL.ink, TOK.stroke.line, a);
  }
  function circleMeet(k1, k2, extra) {
    // intersection of two (range + extra) circles closest to the phone
    const [x1, y1] = satPos(k1), [x2, y2] = satPos(k2);
    const r1 = W0.sats[k1].range + extra, r2 = W0.sats[k2].range + extra;
    const d = Math.hypot(x2 - x1, y2 - y1);
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const mx = x1 + (a * (x2 - x1)) / d, my = y1 + (a * (y2 - y1)) / d;
    const c1 = [mx + (h * (y2 - y1)) / d, my - (h * (x2 - x1)) / d];
    const c2 = [mx - (h * (y2 - y1)) / d, my + (h * (x2 - x1)) / d];
    const dist = (p) => Math.hypot(p[0] - PHONE[0], p[1] - PHONE[1]);
    return dist(c1) < dist(c2) ? c1 : c2;
  }
  function errorTriangle() {
    return [circleMeet("A", "B", W0.ERROR_KM), circleMeet("B", "C", W0.ERROR_KM), circleMeet("A", "C", W0.ERROR_KM)].map(SP);
  }
  function triangleCentroid() {
    const v = errorTriangle();
    return [Math.min(...v.map((p) => p[0])), (v[0][1] + v[1][1] + v[2][1]) / 3];
  }
  function drawTriangle(b) {
    const a = window01(b, T.moves.bracket_in[0] + 0.5, T.moves.solve[0], 0.4, 0.4);
    if (a <= 0) return;
    const v = errorTriangle();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = COL.accent;
    ctx.globalAlpha = a * 0.16;
    ctx.beginPath();
    ctx.moveTo(v[0][0], v[0][1]);
    ctx.lineTo(v[1][0], v[1][1]);
    ctx.lineTo(v[2][0], v[2][1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPhone(b) {
    const a = REDUCED ? fade("phone_in", b) : mv("phone_in", b);
    const P = SP(PHONE);
    const u = SIZE.label / 52;
    const md = b < 10
      ? 1 - (REDUCED ? fade("mapdot_open", b) : mv("mapdot_open", b)) // opening: the map dot shrinks into the phone point
      : (REDUCED ? fade("mapdot", b) : mv("mapdot", b));
    if (md > 0) {
      // the point becomes the map app's location dot with its accuracy circle
      const R = (b < 10 ? 84 : 120) * u * md;
      ctx.save();
      ctx.globalAlpha = 0.07 + 0.0 * md;
      ctx.fillStyle = COL.ink;
      ctx.beginPath();
      ctx.arc(P[0], P[1], R, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
      ringPx(P, R, COL.ink_2, TOK.stroke.hair, md);
    }
    dot(P, lerp(11, 15, md) * u, COL.ink, a, COL.paper, lerp(3, 6, md) * u);
  }

  // ---------------------------------------------------------------- anchors and captions
  function anchorPoint(at, b) {
    const u = SIZE.label / 52;
    if (at === "phone") return SP(PHONE);
    if (at === "cone") { const A = satScreen("A"), P = SP(PHONE); return [lerp(A[0], P[0], 0.55) + 90 * u, lerp(A[1], P[1], 0.55)]; }
    if (at.startsWith("sat:")) return satScreen(at.slice(4));
    if (at === "delay_mid") { const c = satPos("A"); return S(c[0], c[1] - W0.sats.A.range / 2); }
    if (at === "up") { const g = upGeom(); return [g.top[0] + 10 * u, g.top[1] + 40 * u]; }
    if (at === "mapdot_below") { const P = SP(PHONE); return [P[0], P[1] + 132 * u]; }
    if (at === "mapdot_right") { const P = SP(PHONE); return [P[0] + 120 * u, P[1]]; }
    if (at === "bracket") { const {p, q} = bracketGeom(); return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }
    if (at === "triangle") return triangleCentroid();
    if (at === "triangle_low") { const v = errorTriangle(); const lo = v.reduce((m, p) => (p[1] > m[1] ? p : m)); return [lo[0], lo[1] + 6]; }
    if (at === "mapdot") { const P = SP(PHONE); return [P[0] + 84 * u, P[1]]; }
    return [DX + DW / 2, DY + SIZE.anchor];
  }
  function drawAnchors(b) {
    let lines = 0;
    const pick = (v) => (v && typeof v === "object" ? v[FMT] || v.default : v);
    for (const an0 of T.anchors) {
      const an = Object.assign({}, an0, {at: pick(an0.at), side: pick(an0.side)});
      const a = window01(b, an.from, an.to, 0.25, 0.25);
      if (a <= 0) continue;
      ctx.font = fontFor(an.style);
      const z = sizeOf(an.style);
      const maxW = ["below", "top", "topleft", "corner"].includes(an.side) ? DW : DW * 0.6;
      const txt = wrap(an.text, maxW);
      lines += txt.length;
      const w = Math.max(...txt.map((l) => ctx.measureText(l).width));
      const h = txt.length * z * 1.36;
      let [x, y] = anchorPoint(an.at, b);
      let align = "left";
      const pad = (an.at.startsWith("sat:") ? 70 : 26) * (SIZE.label / 52);
      if (an.side === "below") { align = "center"; y += pad + h / 2 + 8; }
      else if (an.side === "right") { x += pad; }
      else if (an.side === "left") { align = "right"; x -= pad; }
      else if (an.side === "top") { align = "center"; x = DX + DW / 2; y = DY + h / 2; }
      else if (an.side === "corner") { align = "left"; x = DX; y = DY + DH - h / 2; }
      else if (an.side === "topleft") {
        // top-left corner; tall formats use a camera framing with headroom for it (cameras.*_tall)
        align = "left"; x = DX;
        const row = an.at === "eq2" ? 1 : 0;
        y = DY + h / 2 + row * z * 1.5;
      }
      // keep the label inside the diagram area
      let left = align === "left" ? x : align === "center" ? x - w / 2 : x - w;
      const shift = Math.max(DX - left, 0) - Math.max(left + w - (DX + DW), 0);
      x += shift;
      y = Math.min(Math.max(y, DY + h / 2), DY + DH - h / 2);
      drawText(txt, x, y, an.style, align, a, an.style === "mono" ? COL.accent : COL.ink);
    }
    return lines;
  }

  function drawCaption(b) {
    const c = T.captions.find((x) => b >= x.from && b <= x.to);
    if (!c) return 0;
    const a = window01(b, c.from, c.to, 0.3, 0.3);
    ctx.font = fontFor("caption");
    const z = SIZE.caption;
    const lines = wrap(c.text, F.capMaxW - 48);
    const lh = z * 1.45;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const h = lines.length * lh;
    const cx = F.W / 2;
    const y1 = F.capBottom, y0 = y1 - h - 28;
    ctx.save();
    ctx.globalAlpha = a * 0.94;
    ctx.fillStyle = COL.paper;
    roundRect(cx - w / 2 - 28, y0, w + 56, h + 28, 14);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = COL.ink;
    ctx.font = fontFor("caption");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((ln, i) => ctx.fillText(ln, cx, y0 + 14 + lh * (i + 0.5)));
    ctx.restore();
    return lines.length;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // direction D only: oversized numerals behind the diagram
  function drawEditorial(b) {
    if (DIR !== "D") return;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = COL.accent;
    ctx.font = `500 ${Math.round(F.H * 0.22)}px "IBM Plex Mono"`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("3 → 1", DX, DY);
    ctx.restore();
  }

  // ---------------------------------------------------------------- frame
  function paint(t) {
    const b = t / T.spb;
    CAM = cameraAt(b);
    ctx.save();
    ctx.fillStyle = COL.paper;
    ctx.fillRect(0, 0, F.W, F.H);
    ctx.restore();
    if (DIR === "C") drawGrid();
    drawEditorial(b);
    drawEarth(b);
    drawWavefronts(b);
    drawRangeCircles(b);
    drawDelayLine(b);
    drawCone(b);
    drawSignals(b);
    drawMarkers(b);
    drawTriangle(b);
    drawBracket(b);
    drawUpArrow(b);
    for (const k of ["A", "B", "C", "D"]) drawSat(k, b);
    drawPhone(b);
    const nA = drawAnchors(b);
    const nC = drawCaption(b);
    if (DEBUG) {
      ctx.save();
      ctx.font = `500 26px "IBM Plex Mono"`;
      ctx.fillStyle = COL.ink_2;
      ctx.textAlign = "right";
      const sc = T.scenes.find((s) => b >= s.from && b < s.to) || T.scenes[T.scenes.length - 1];
      ctx.fillText(`${sc.id} ${sc.part}  b${b.toFixed(2)}  ${t.toFixed(2)}s  A${nA} C${nC}`, F.W - 24, 34);
      ctx.restore();
    }
    window.__lastFrame = {t, b, anchorLines: nA, captionLines: nC};
  }
  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = COL.rule;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let x = 0; x <= F.W; x += 48) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, F.H); ctx.stroke(); }
    for (let y = 0; y <= F.H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(F.W, y + 0.5); ctx.stroke(); }
    ctx.restore();
  }

  // ---------------------------------------------------------------- boot
  async function boot() {
    TOK = await (await fetch("brand/tokens.json")).json();
    COL = Object.assign({}, TOK.color, DIRECTIONS[DIR] || {});
    SIZE = TOK.type.sizes[FMT];
    for (const [k, v] of Object.entries(TOK.motion)) if (Array.isArray(v)) EASE[k] = bezier(...v);
    const faces = [
      ["IBM Plex Sans JP", "fonts/IBMPlexSansJP-400.ttf", "400"],
      ["IBM Plex Sans JP", "fonts/IBMPlexSansJP-500.ttf", "500"],
      ["IBM Plex Sans JP", "fonts/IBMPlexSansJP-600.ttf", "600"],
      ["IBM Plex Mono", "fonts/IBMPlexMono-500.ttf", "500"],
    ];
    for (const [fam, url, w] of faces) {
      const f = new FontFace(fam, `url(${url})`, {weight: w});
      await f.load();
      document.fonts.add(f);
    }
    await document.fonts.ready;
    paint(0);
  }
  window.ready = boot();
  window.seek = (t) => paint(t);
  window.FORMAT = {name: FMT, W: F.W, H: F.H, mode: MODE};
})();
