// ASCII sea — fish are rasterised every frame onto a fixed character grid.
// Each covered cell gets a tinted square and a glyph picked by how "solid" the
// fish is there, so bodies read as dense type and fins fray into punctuation.
//
// AsciiSea.create(config) where config = {
//   theme: { bg, grid, glow:[r,g,b] | null, shadow:[r,g,b], shadowAlpha, vignette },
//   species: [{ ...see SPECIES fields below }],
//   school: [{ species, depth }],          // which fish to spawn
//   particles: 'dashes' | 'specks',
//   pellet: { fill, glyph },
// }
(function () {
  const H = window.Host;
  const { clamp, lerp, rand, angleDiff, hash3, noise2 } = H;

  // Sparse → dense. Fins and edges land at the start, cores at the end.
  // Open a scene with #lineup to see every fish parked in a row (for tuning shapes).
  const LINEUP = location.hash === '#lineup';

  const RAMP = ['.', "'", ',', '`', ':', ';', 't', 'o', '%', 'X', 'S', '8', '#', '@'];
  const FONT = '600 {px}px ui-monospace, "SF Mono", Menlo, "Roboto Mono", monospace';

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function create(config) {
    const theme = config.theme;
    const bgCanvas = document.getElementById('bg');
    const fxCanvas = document.getElementById('fx');
    const bgEntry = H.canvas(bgCanvas);
    const fxEntry = H.canvas(fxCanvas);
    const bg = bgCanvas.getContext('2d');
    const fx = fxCanvas.getContext('2d');

    // ── colour registry ────────────────────────────────────────────────
    const colors = [];
    const colorIds = new Map();
    function colorId(hex) {
      if (!colorIds.has(hex)) {
        colorIds.set(hex, colors.length);
        colors.push(hexToRgb(hex));
      }
      return colorIds.get(hex);
    }
    for (const sp of config.species) {
      sp.paletteIds = sp.palette.map((p) => ({ fill: colorId(p.fill), glyph: colorId(p.glyph) }));
      sp.accentIds = (sp.accents || []).map(colorId);
    }
    const pelletIds = { fill: colorId(config.pellet.fill), glyph: colorId(config.pellet.glyph) };
    const ambientId = colorId(config.ambientGlyph);
    const rippleId = colorId(config.rippleGlyph);

    // ── grid state ─────────────────────────────────────────────────────
    let C = 14; // cell size, CSS px
    let cols = 0;
    let rows = 0;
    let cellDens; // strongest coverage written this frame
    let cellFill; // colour id of the square (-1 = none)
    let cellFillA;
    let cellGlyph; // index into RAMP (-1 = none)
    let cellGlyphC;
    let cellGlyphA;
    let atlas = null;
    let atlasTile = 0;
    let shadowCanvas = null;
    let shadowCtx = null;
    let shadowData = null;

    // ── world ──────────────────────────────────────────────────────────
    const fish = [];
    const pellets = [];
    const ripples = [];
    const particles = [];

    function resize() {
      const short = Math.min(H.w, H.h);
      C = clamp(Math.round(short / 27), 12, 20);
      cols = Math.ceil(H.w / C) + 1;
      rows = Math.ceil(H.h / C) + 1;
      const n = cols * rows;
      cellDens = new Float32Array(n);
      cellFill = new Int16Array(n);
      cellFillA = new Float32Array(n);
      cellGlyph = new Int8Array(n);
      cellGlyphC = new Int16Array(n);
      cellGlyphA = new Float32Array(n);
      buildAtlas();
      drawBackground();
      shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = cols;
      shadowCanvas.height = rows;
      shadowCtx = shadowCanvas.getContext('2d');
      shadowData = shadowCtx.createImageData(cols, rows);
      if (!fish.length) spawnSchool();
      if (!particles.length) spawnParticles();
    }

    // Every glyph in every glyph colour, pre-rendered once so a frame is just blits.
    function buildAtlas() {
      const dpr = fxEntry.dpr;
      atlasTile = Math.ceil(C * dpr);
      atlas = document.createElement('canvas');
      atlas.width = atlasTile * RAMP.length;
      atlas.height = atlasTile * colors.length;
      const a = atlas.getContext('2d');
      a.font = FONT.replace('{px}', String(Math.round(C * 0.74 * dpr)));
      a.textAlign = 'center';
      a.textBaseline = 'middle';
      colors.forEach((rgb, ci) => {
        a.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        RAMP.forEach((g, gi) => {
          a.fillText(g, gi * atlasTile + atlasTile / 2, ci * atlasTile + atlasTile * 0.54);
        });
      });
    }

    function drawBackground() {
      const dpr = bgEntry.dpr;
      bg.setTransform(dpr, 0, 0, dpr, 0, 0);
      bg.fillStyle = theme.bg;
      bg.fillRect(0, 0, H.w, H.h);
      if (theme.vignette) {
        const g = bg.createRadialGradient(H.w / 2, H.h * 0.45, 0, H.w / 2, H.h * 0.45, Math.hypot(H.w, H.h) * 0.6);
        g.addColorStop(0, theme.vignette[0]);
        g.addColorStop(1, theme.vignette[1]);
        bg.fillStyle = g;
        bg.fillRect(0, 0, H.w, H.h);
      }
      bg.strokeStyle = theme.grid;
      bg.lineWidth = 1 / dpr;
      bg.beginPath();
      for (let x = 0; x <= cols; x++) {
        const px = Math.round(x * C * dpr) / dpr + 0.5 / dpr;
        bg.moveTo(px, 0);
        bg.lineTo(px, H.h);
      }
      for (let y = 0; y <= rows; y++) {
        const py = Math.round(y * C * dpr) / dpr + 0.5 / dpr;
        bg.moveTo(0, py);
        bg.lineTo(H.w, py);
      }
      bg.stroke();
    }

    // ── fish ───────────────────────────────────────────────────────────
    const SEGMENTS = 12;

    function makeFish(sp, depth, i, pattern) {
      const L = sp.length * C * rand(0.85, 1.15) * lerp(1, 0.82, depth);
      const edge = Math.floor(rand(0, 4));
      const m = L * 0.6;
      // Start just off-screen so fish glide in rather than pop.
      let x = rand(0, H.w);
      let y = rand(0, H.h);
      if (i > 2) {
        if (edge === 0) x = -m;
        else if (edge === 1) x = H.w + m;
        else if (edge === 2) y = -m;
        else y = H.h + m;
      }
      const heading = Math.atan2(H.h / 2 - y, H.w / 2 - x) + rand(-0.6, 0.6);
      const f = {
        sp,
        depth,
        alpha: lerp(1, 0.42, depth),
        L,
        seg: L / (SEGMENTS - 1),
        x,
        y,
        heading,
        speed: sp.speed * C,
        boost: 0,
        phase: rand(0, 10),
        seed: Math.floor(rand(1, 1e6)),
        target: null,
        targetT: 0,
        pts: [],
        q: [],
        pattern: pattern != null ? pattern : Math.floor(rand(0, sp.patterns || 1)),
      };
      for (let k = 0; k < SEGMENTS; k++) {
        f.pts.push({ x: x - Math.cos(heading) * f.seg * k, y: y - Math.sin(heading) * f.seg * k });
        f.q.push({ x: 0, y: 0, nx: 0, ny: 0 });
      }
      pickTarget(f);
      return f;
    }

    function spawnSchool() {
      const area = (H.w * H.h) / (390 * 844);
      const scale = clamp(Math.sqrt(area), 0.8, 2.2);
      config.school.forEach((s, i) => {
        const copies = s.scales === false ? 1 : Math.max(1, Math.round(scale * (s.count || 1)));
        for (let c = 0; c < copies; c++) {
          const sp = config.species.find((x) => x.id === s.species);
          fish.push(makeFish(sp, clamp(s.depth + rand(-0.08, 0.08), 0, 1), i + c, s.pattern));
        }
      });
      fish.sort((a, b) => b.depth - a.depth); // deep first, so shallow fish win the cells
      if (LINEUP) {
        fish.forEach((f, i) => {
          f.x = H.w * 0.5 + f.L * 0.45;
          f.y = ((i + 0.5) / fish.length) * H.h;
          f.heading = 0;
          f.pts.forEach((p, k) => {
            p.x = f.x - f.seg * k;
            p.y = f.y;
          });
        });
      }
    }

    function pickTarget(f) {
      const mx = H.w * 0.12;
      const my = H.h * 0.1;
      f.target = { x: rand(-mx, H.w + mx), y: rand(-my, H.h + my) };
      f.targetT = rand(5, 11);
    }

    function steer(f, dt, t) {
      // Food wins over wandering.
      let goal = f.target;
      let hungry = false;
      let best = Infinity;
      for (const p of pellets) {
        if (p.eaten) continue;
        const d = Math.hypot(p.x - f.x, p.y - f.y);
        if (d < Math.max(H.w, H.h) * 0.55 && d < best) {
          best = d;
          goal = p;
          hungry = true;
        }
      }
      f.targetT -= dt;
      if (!hungry && (f.targetT <= 0 || Math.hypot(goal.x - f.x, goal.y - f.y) < f.L * 0.5)) pickTarget(f);
      goal = hungry ? goal : f.target;

      const want = Math.atan2(goal.y - f.y, goal.x - f.x);
      const turnRate = (hungry ? 2.4 : 0.9) * f.sp.agility;
      const wobble =
        (Math.sin(t * 0.37 + f.seed) * 0.6 + Math.sin(t * 0.83 + f.seed * 1.7) * 0.4) * 0.35 * f.sp.agility;
      f.heading += clamp(angleDiff(want, f.heading) * 1.4, -turnRate, turnRate) * dt + wobble * dt;

      const cruise = f.sp.speed * C * (0.85 + 0.25 * Math.sin(t * 0.21 + f.seed));
      const goalSpeed = cruise * (hungry ? 1.9 : 1) * (1 + f.boost);
      f.speed = lerp(f.speed, goalSpeed, 1 - Math.exp(-dt * 1.6));
      f.boost = Math.max(0, f.boost - dt * 0.8);

      if (hungry && best < C * 0.9) {
        goal.eaten = true;
        f.boost = 0.9;
        burst(goal.x, goal.y);
      }
    }

    function advance(f, dt, t) {
      if (!LINEUP) {
        steer(f, dt, t);
        f.x += Math.cos(f.heading) * f.speed * dt;
        f.y += Math.sin(f.heading) * f.speed * dt;
      }
      // Tail beat speeds up with swimming speed.
      f.phase += dt * (f.sp.beat + (f.speed / (C * f.sp.speed)) * f.sp.beat * 0.6);

      // Spine follows the head like a chain — turns ripple down the body.
      const pts = f.pts;
      pts[0].x = f.x;
      pts[0].y = f.y;
      for (let k = 1; k < SEGMENTS; k++) {
        const a = pts[k - 1];
        const b = pts[k];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        b.x = a.x + (dx / d) * f.seg;
        b.y = a.y + (dy / d) * f.seg;
      }
      // Swimming undulation layered on top, growing toward the tail.
      const amp = f.sp.wave * f.L;
      for (let k = 0; k < SEGMENTS; k++) {
        const a = pts[Math.max(0, k - 1)];
        const b = pts[Math.min(SEGMENTS - 1, k + 1)];
        let tx = a.x - b.x;
        let ty = a.y - b.y;
        const d = Math.hypot(tx, ty) || 1;
        tx /= d;
        ty /= d;
        const u = k / (SEGMENTS - 1);
        const off = amp * Math.sin(f.phase - u * 4.2) * (0.12 + 0.88 * Math.pow(u, 1.6));
        const q = f.q[k];
        q.nx = -ty;
        q.ny = tx;
        q.x = pts[k].x + q.nx * off;
        q.y = pts[k].y + q.ny * off;
      }
    }

    // Tapered capsule coverage: 1 on the axis, 0 at the rim, <0 outside.
    // Writes the axis parameter into capH and the signed side into capS.
    let capH = 0;
    let capS = 0;
    function capsule(px, py, ax, ay, bx, by, ra, rb) {
      const bax = bx - ax;
      const bay = by - ay;
      const pax = px - ax;
      const pay = py - ay;
      const len2 = bax * bax + bay * bay || 1;
      let h = (pax * bax + pay * bay) / len2;
      h = h < 0 ? 0 : h > 1 ? 1 : h;
      const r = ra + (rb - ra) * h;
      const dx = pax - bax * h;
      const dy = pay - bay * h;
      const d = Math.sqrt(dx * dx + dy * dy);
      capH = h;
      capS = (bax * pay - bay * pax) >= 0 ? d / r : -d / r;
      return 1 - d / r;
    }

    // Parts of the fish this frame: [ax, ay, bx, by, ra, rb, u0, u1, kind, solid,
    // minX, minY, maxX, maxY]. kind: 0 body, 1 fin, 3 head feature.
    const PART = 14;
    const parts = new Float32Array(PART * 40);
    let partCount = 0;
    function addPart(ax, ay, bx, by, ra, rb, u0, u1, kind, solid) {
      const o = partCount++ * PART;
      const r = Math.max(ra, rb);
      parts[o] = ax;
      parts[o + 1] = ay;
      parts[o + 2] = bx;
      parts[o + 3] = by;
      parts[o + 4] = ra;
      parts[o + 5] = rb;
      parts[o + 6] = u0;
      parts[o + 7] = u1;
      parts[o + 8] = kind;
      parts[o + 9] = solid;
      parts[o + 10] = Math.min(ax, bx) - r;
      parts[o + 11] = Math.min(ay, by) - r;
      parts[o + 12] = Math.max(ax, bx) + r;
      parts[o + 13] = Math.max(ay, by) + r;
    }

    // Rasterise one fish into the grid.
    function stamp(f, t) {
      const sp = f.sp;
      const q = f.q;
      const W = sp.width * f.L;
      partCount = 0;

      // Body: a chain of tapered capsules along the spine.
      for (let k = 0; k < SEGMENTS - 1; k++) {
        const u0 = k / (SEGMENTS - 1);
        const u1 = (k + 1) / (SEGMENTS - 1);
        addPart(q[k].x, q[k].y, q[k + 1].x, q[k + 1].y, W * sp.profile(u0) + 0.01, W * sp.profile(u1) + 0.01, u0, u1, 0, 1);
      }

      // Hammerhead cephalofoil: a bar across the head, set back a touch.
      if (sp.hammer) {
        const h = q[0];
        const bk = Math.hypot(q[1].x - h.x, q[1].y - h.y) || 1;
        const cx = h.x + ((q[1].x - h.x) / bk) * 0.04 * f.L;
        const cy = h.y + ((q[1].y - h.y) / bk) * 0.04 * f.L;
        const span = sp.hammer * f.L;
        const r = 0.045 * f.L;
        addPart(cx + h.nx * span, cy + h.ny * span, cx - h.nx * span, cy - h.ny * span, r, r, -1, 1, 3, 1);
      }

      // Paired fins, swept back from the body and flapping gently.
      const flap = Math.sin(f.phase * 0.5) * 0.25;
      for (const fin of sp.fins) {
        const k = Math.round(fin.at * (SEGMENTS - 1));
        const p = q[k];
        const nb = q[Math.min(SEGMENTS - 1, k + 1)];
        let tx = p.x - nb.x;
        let ty = p.y - nb.y;
        const d = Math.hypot(tx, ty) || 1;
        tx /= d;
        ty /= d;
        const bodyW = W * sp.profile(fin.at);
        const len = fin.len * f.L;
        for (let side = -1; side <= 1; side += 2) {
          // Rotate the backward direction (-t) out toward this side. Positive
          // rotation turns toward -n, hence the mirrored sign.
          const ang = -(fin.sweep + flap * side * fin.flap) * side;
          const ca = Math.cos(ang);
          const sa = Math.sin(ang);
          const dx = -tx * ca + ty * sa;
          const dy = -tx * sa - ty * ca;
          const rx = p.x + p.nx * side * bodyW * 0.55;
          const ry = p.y + p.ny * side * bodyW * 0.55;
          addPart(rx, ry, rx + dx * len, ry + dy * len, fin.root * f.L, fin.tip * f.L, 0.3, 0.5, 1, fin.solid);
        }
      }

      // Tail fin: a fan off the last spine point, forked.
      const tb = q[SEGMENTS - 1];
      const tp = q[SEGMENTS - 2];
      let tdx = tb.x - tp.x;
      let tdy = tb.y - tp.y;
      const td = Math.hypot(tdx, tdy) || 1;
      tdx /= td;
      tdy /= td;
      const tailLen = sp.tail * f.L;
      const tailSpread = sp.tailSpread * f.L + W * 0.15;

      // Bounding box of everything, in cells.
      let minX = tb.x + tdx * tailLen;
      let maxX = minX;
      let minY = tb.y + tdy * tailLen;
      let maxY = minY;
      minX = Math.min(minX - tailSpread, tb.x - tailSpread);
      maxX = Math.max(maxX + tailSpread, tb.x + tailSpread);
      minY = Math.min(minY - tailSpread, tb.y - tailSpread);
      maxY = Math.max(maxY + tailSpread, tb.y + tailSpread);
      for (let k = 0; k < partCount; k++) {
        const o = k * PART;
        if (parts[o + 10] < minX) minX = parts[o + 10];
        if (parts[o + 11] < minY) minY = parts[o + 11];
        if (parts[o + 12] > maxX) maxX = parts[o + 12];
        if (parts[o + 13] > maxY) maxY = parts[o + 13];
      }
      const c0 = Math.max(0, Math.floor(minX / C));
      const c1 = Math.min(cols - 1, Math.floor(maxX / C));
      const r0 = Math.max(0, Math.floor(minY / C));
      const r1 = Math.min(rows - 1, Math.floor(maxY / C));
      if (c0 > c1 || r0 > r1) return;

      const tq = t * sp.shimmer;
      for (let r = r0; r <= r1; r++) {
        const py = (r + 0.5) * C;
        for (let c = c0; c <= c1; c++) {
          const px = (c + 0.5) * C;
          let best = 0;
          let bt = 0;
          let bs = 0;
          let part = 0; // 0 body, 1 fin, 2 tail, 3 head feature
          for (let k = 0; k < partCount; k++) {
            const o = k * PART;
            if (px < parts[o + 10] || px > parts[o + 12] || py < parts[o + 11] || py > parts[o + 13]) continue;
            const cov = capsule(px, py, parts[o], parts[o + 1], parts[o + 2], parts[o + 3], parts[o + 4], parts[o + 5]) * parts[o + 9];
            if (cov > best) {
              best = cov;
              part = parts[o + 8];
              bt = part === 3 ? 0.02 : parts[o + 6] + (parts[o + 7] - parts[o + 6]) * capH;
              bs = part === 3 ? capH * 2 - 1 : capS;
            }
          }
          // Tail.
          const ox = px - tb.x;
          const oy = py - tb.y;
          const al = ox * tdx + oy * tdy;
          if (al > -C * 0.3 && al < tailLen) {
            const lat = -ox * tdy + oy * tdx;
            const u = Math.max(0, al) / tailLen;
            const spread = sp.tailSpread * f.L * Math.pow(u, sp.tailShape) + W * 0.15;
            const notch = sp.fork * spread * u;
            const a = Math.abs(lat);
            if (a < spread && a >= notch - C * 0.2) {
              const cov = (1 - a / spread) * (0.5 + 0.5 * (1 - u)) * sp.tailSolid + 0.12;
              if (cov > best) {
                best = cov;
                bt = 1 + u * 0.3;
                bs = lat / spread;
                part = 2;
              }
            }
          }
          if (best <= 0.02) continue;

          const i = r * cols + c;
          const dens = best * f.alpha;
          if (dens <= cellDens[i]) continue;
          cellDens[i] = dens;

          // Paint: the species decides which palette entry this spot of skin is.
          const n = noise2(bt * sp.patternScale[0] + f.pattern * 7.3, bs * sp.patternScale[1], f.seed & 1023);
          // Each cell re-rolls its glyph on its own beat, so the type shimmers.
          const hsh = hash3(c, r, Math.floor(tq + hash3(c, r, 99) * 4));
          const pal = sp.paletteIds[sp.paint(bt, bs, n, part, f.pattern, hsh)];
          const solid = part === 0 || part === 3 ? best : best * 0.8;

          if (solid > sp.fillFrom) {
            cellFill[i] = pal.fill;
            cellFillA[i] = clamp(((solid - sp.fillFrom) / (1 - sp.fillFrom)) * 3, 0.32, 1) * f.alpha;
          } else {
            cellFill[i] = -1;
            cellFillA[i] = 0;
          }
          // Glyph: density picks from the ramp with a little per-cell jitter.
          cellGlyph[i] = clamp(Math.floor(best * (RAMP.length - 1) * 1.15 + (hsh - 0.5) * 4), 0, RAMP.length - 1);
          const accent = sp.accentIds.length && hsh > 0.985 ? sp.accentIds[Math.floor(hsh * 1e5) % sp.accentIds.length] : -1;
          cellGlyphC[i] = accent >= 0 ? accent : cellFill[i] >= 0 ? pal.glyph : pal.fill;
          cellGlyphA[i] = clamp(0.35 + best, 0.3, 1) * f.alpha;
        }
      }
    }

    // ── pellets, ripples, ambient particles ───────────────────────────
    function burst(x, y) {
      ripples.push({ x, y, age: 0, life: 0.9, speed: C * 5, small: true });
    }

    function tap(x, y) {
      ripples.push({ x, y, age: 0, life: 1.6, speed: C * 7 });
      const n = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        pellets.push({
          x: x + rand(-1.6, 1.6) * C,
          y: y + rand(-1.6, 1.6) * C,
          vx: rand(-0.25, 0.25) * C,
          vy: rand(-0.25, 0.25) * C,
          age: 0,
          life: rand(9, 13),
          eaten: false,
        });
      }
      // Fish nearby notice immediately.
      for (const f of fish) {
        if (Math.hypot(f.x - x, f.y - y) < Math.max(H.w, H.h) * 0.6) f.boost = Math.max(f.boost, 0.3);
      }
    }

    function spawnParticles() {
      const count = Math.round((cols * rows) / (config.particles === 'dashes' ? 26 : 40));
      for (let k = 0; k < count; k++) {
        // Dashes come in little horizontal runs, like the surface catching light.
        const run = config.particles === 'dashes' ? 1 + Math.floor(Math.random() * 4) : 1;
        const x = rand(0, cols);
        const y = rand(0, rows);
        const vx = rand(-0.12, 0.12);
        const vy = rand(-0.04, 0.04);
        const seed = Math.random() * 100;
        for (let j = 0; j < run; j++) particles.push({ x: x + j * 2, y, vx, vy, seed, a: rand(0.25, 0.7) });
      }
    }

    // ── frame ──────────────────────────────────────────────────────────
    function frame(dt, t) {
      cellDens.fill(0);
      cellFill.fill(-1);
      cellGlyph.fill(-1);

      for (const f of fish) advance(f, dt, t);
      for (const f of fish) stamp(f, t);

      // Pellets drift, then fade.
      for (let k = pellets.length - 1; k >= 0; k--) {
        const p = pellets[k];
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - dt * 0.4;
        p.vy *= 1 - dt * 0.4;
        if (p.eaten || p.age > p.life) {
          pellets.splice(k, 1);
          continue;
        }
        const c = Math.floor(p.x / C);
        const r = Math.floor(p.y / C);
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const i = r * cols + c;
        const a = clamp(Math.min(p.age * 4, (p.life - p.age) / 2), 0, 1);
        if (cellDens[i] > 0.5) continue;
        cellDens[i] = 0.5;
        cellFill[i] = pelletIds.fill;
        cellFillA[i] = a * 0.9;
        cellGlyph[i] = 7; // 'o'
        cellGlyphC[i] = pelletIds.glyph;
        cellGlyphA[i] = a;
      }

      // Ripples: a ring of light punctuation spreading from each tap.
      for (let k = ripples.length - 1; k >= 0; k--) {
        const rp = ripples[k];
        rp.age += dt;
        if (rp.age > rp.life) {
          ripples.splice(k, 1);
          continue;
        }
        const radius = rp.speed * rp.age * (1 - rp.age / rp.life / 2.5);
        const fade = 1 - rp.age / rp.life;
        const reach = Math.ceil((radius + C) / C);
        const cc = Math.floor(rp.x / C);
        const cr = Math.floor(rp.y / C);
        for (let r = Math.max(0, cr - reach); r <= Math.min(rows - 1, cr + reach); r++) {
          for (let c = Math.max(0, cc - reach); c <= Math.min(cols - 1, cc + reach); c++) {
            const d = Math.hypot((c + 0.5) * C - rp.x, (r + 0.5) * C - rp.y);
            const band = 1 - Math.abs(d - radius) / (C * 0.9);
            if (band <= 0) continue;
            const i = r * cols + c;
            if (cellDens[i] > 0.25) continue;
            const a = band * fade * (rp.small ? 0.6 : 0.85);
            if (a <= cellGlyphA[i] && cellGlyph[i] >= 0) continue;
            cellGlyph[i] = band > 0.6 ? 4 : 0; // ':' on the crest, '.' at the edge
            cellGlyphC[i] = rippleId;
            cellGlyphA[i] = a;
          }
        }
      }

      // Ambient particles drift slowly, snapped to cells.
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -2) p.x += cols + 2;
        if (p.x > cols + 2) p.x -= cols + 2;
        if (p.y < -1) p.y += rows + 1;
        if (p.y > rows + 1) p.y -= rows + 1;
        const c = Math.floor(p.x);
        const r = Math.floor(p.y);
        if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
        const i = r * cols + c;
        if (cellGlyph[i] >= 0) continue;
        const tw = 0.6 + 0.4 * Math.sin(t * 0.8 + p.seed);
        cellGlyph[i] = config.particles === 'dashes' ? -2 : 0;
        cellGlyphC[i] = ambientId;
        cellGlyphA[i] = p.a * tw;
      }

      if (!H.warming) render();
    }

    function render() {
      const dpr = fxEntry.dpr;
      fx.setTransform(1, 0, 0, 1, 0, 0);
      fx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

      // Soft shadow/glow under the fish: one pixel per cell, smoothed on upscale.
      const sd = shadowData.data;
      const sc = theme.shadow;
      for (let i = 0, n = cols * rows; i < n; i++) {
        const o = i * 4;
        const fc = cellFill[i] >= 0 && theme.glow ? colors[cellFill[i]] : sc;
        sd[o] = fc[0];
        sd[o + 1] = fc[1];
        sd[o + 2] = fc[2];
        sd[o + 3] = Math.min(255, cellDens[i] * 255 * theme.shadowAlpha);
      }
      shadowCtx.putImageData(shadowData, 0, 0);
      fx.imageSmoothingEnabled = true;
      fx.imageSmoothingQuality = 'high';
      const so = theme.shadowOffset * C * dpr;
      fx.drawImage(shadowCanvas, -C * dpr * 0.5 + so, -C * dpr * 0.5 + so * 1.4, cols * C * dpr + C * dpr, rows * C * dpr + C * dpr);

      // Squares, batched by colour and quantised alpha.
      const inset = Math.max(1, Math.round(0.9 * dpr));
      const size = Math.round(C * dpr) - inset;
      const buckets = new Map();
      for (let i = 0, n = cols * rows; i < n; i++) {
        if (cellFill[i] < 0 || cellFillA[i] <= 0.02) continue;
        const key = cellFill[i] * 16 + Math.min(15, Math.round(cellFillA[i] * 15));
        let list = buckets.get(key);
        if (!list) buckets.set(key, (list = []));
        list.push(i);
      }
      for (const [key, list] of buckets) {
        const rgb = colors[key >> 4];
        fx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${((key & 15) / 15).toFixed(3)})`;
        fx.beginPath();
        for (const i of list) {
          const c = i % cols;
          const r = (i - c) / cols;
          fx.rect(Math.round(c * C * dpr) + inset, Math.round(r * C * dpr) + inset, size, size);
        }
        fx.fill();
      }

      // Glyphs.
      const tile = atlasTile;
      const dash = config.particles === 'dashes';
      for (let i = 0, n = cols * rows; i < n; i++) {
        const g = cellGlyph[i];
        if (g === -1) continue;
        const c = i % cols;
        const r = (i - c) / cols;
        const x = Math.round(c * C * dpr);
        const y = Math.round(r * C * dpr);
        fx.globalAlpha = cellGlyphA[i];
        if (g === -2 && dash) {
          const rgb = colors[cellGlyphC[i]];
          fx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
          fx.fillRect(x + tile * 0.3, y + tile * 0.5, tile * 0.4, Math.max(1, dpr * 0.9));
          continue;
        }
        fx.drawImage(atlas, g * tile, cellGlyphC[i] * tile, tile, tile, x, y, tile, tile);
      }
      fx.globalAlpha = 1;
    }

    H.start({ frame, resize, tap });
  }

  window.AsciiSea = { create };
})();
