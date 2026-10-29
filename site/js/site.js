/* Inchly site behaviour.
 *
 * The residents and their engine live in pix.js (window.InchPix). Everything in
 * this file also works without it: the timers still count, notifications fall
 * back to #toasts, the ruler draws its own little runner, and the pixel wordmark
 * is self-contained. pix.js reads the wordmark through window.inchMark.
 */
(() => {
  'use strict';
  /* the head script checks this on load: without it the page falls back to its no-JS look */
  window.inchlySite = 1;

  const d = document, root = d.documentElement;
  const $ = (s, r = d) => r.querySelector(s);
  const $$ = (s, r = d) => Array.from(r.querySelectorAll(s));
  const motionQ = matchMedia('(prefers-reduced-motion: reduce)');
  /* the OS setting, or 動きを止める on the page (html.calm) */
  const reduced = () => motionQ.matches || root.classList.contains('calm');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, '0');
  /* 00:42, 59:59, then 1:00:00 */
  const fmt = ms => {
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
    return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s % 60);
  };
  const clock = () => { const t = new Date(); return pad(t.getHours()) + ':' + pad(t.getMinutes()); };
  const el = (tag, cls, text) => { const n = d.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  /* each part is independent: one failing never takes the rest down */
  const part = (name, fn) => { try { fn(); } catch (e) { console.warn('[inchly] ' + name, e); } };

  /* pix.js is optional, so every call to it goes through here */
  const has = name => !!(window.InchPix && typeof window.InchPix[name] === 'function');
  const pix = (name, ...args) => {
    if (!has(name)) return undefined;
    try { return window.InchPix[name](...args); } catch (e) { console.warn('[inchly] InchPix.' + name, e); return undefined; }
  };
  const resident = (scope, kind) => (scope ? scope.querySelector(`inch-pal[kind="${kind}"]`) : null);
  /* poke a resident; pix.js shows the icon in its speech bubble */
  const poke = (node, icon) => { if (node) pix('poke', node, icon); };
  /* a quick stepped "boing" for plain elements (pixel things move in steps) */
  const hop = (node, lift = 6) => {
    if (!node || reduced() || !node.animate) return;
    node.animate([
      { transform: 'translateY(0)' }, { transform: `translateY(${-lift}px)` }, { transform: 'translateY(0)' }
    ], { duration: 360, easing: 'steps(4, end)' });
  };

  /* ---------- small styles for the parts this file builds ---------- */
  part('style', () => {
    const st = el('style');
    st.id = 'inchly-site-js';
    st.textContent = `
#ruler .rl-bar{position:absolute;left:0;top:0;bottom:0;width:0;background-color:#c6f432;
  background-image:linear-gradient(90deg,rgba(23,18,31,.4) 0 1px,transparent 1px),linear-gradient(90deg,rgba(23,18,31,.4) 0 1px,transparent 1px);
  background-size:96px 100%,24px 3px;background-repeat:repeat-x;background-position:0 0,0 0;
  box-shadow:0 0 0 1px rgba(23,18,31,.25)}
#ruler .rl-run{position:absolute;left:0;bottom:6px;pointer-events:auto;cursor:pointer;image-rendering:pixelated;will-change:transform;-webkit-tap-highlight-color:transparent}
html[data-theme=dark] #ruler .rl-run{filter:drop-shadow(0 0 1px rgba(255,255,255,.55))}
#ruler.rl-off{display:none}
#toasts .toast-ico{flex:none;width:20px;height:16px;image-rendering:pixelated}
.readout.is-stopped::before{animation:none;background:#3a3247}
#ft-time,#sb-time,#p-start .readout{font-variant-numeric:tabular-nums}
`;
    d.head.appendChild(st);
  });

  /* ---------- notifications: the crane carries them, or they just appear ---------- */
  const TOAST_MS = 4200;
  const envelope = '<svg class="toast-ico" viewBox="0 0 10 8" shape-rendering="crispEdges" aria-hidden="true">' +
    '<path fill="#17121f" d="M0 0h10v1H0zM0 7h10v1H0zM0 1h1v6H0zM9 1h1v6H9zM1 1h1v1H1zM8 1h1v1H8zM2 2h1v1H2zM7 2h1v1H7zM3 3h1v1H3zM6 3h1v1H6z"/>' +
    '<path fill="#fffdf5" d="M2 1h6v1H2zM3 2h4v1H3zM1 2h1v5H1zM8 2h1v5H8zM2 3h1v4H2zM7 3h1v4H7zM3 4h1v3H3zM6 4h1v3H6zM4 5h2v2H4z"/>' +
    '<path fill="#ff6b4a" d="M4 3h2v2H4z"/></svg>';
  const toast = (text, ms = TOAST_MS) => {
    let box = $('#toasts');
    if (!box) { box = el('div', 'toasts'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); d.body.appendChild(box); }
    while (box.children.length >= 3) box.firstElementChild.remove();
    const card = el('div', 'toast');
    card.setAttribute('role', 'status');
    card.innerHTML = envelope;
    card.appendChild(el('span', '', text));
    box.appendChild(card);
    let t = 0;
    const close = () => {
      if (card.classList.contains('out')) return;
      card.classList.add('out');
      setTimeout(() => card.remove(), reduced() ? 0 : 170);
    };
    const arm = () => { clearTimeout(t); t = setTimeout(close, ms); };
    card.addEventListener('mouseenter', () => clearTimeout(t));   /* hovering holds it */
    card.addEventListener('mouseleave', arm);
    card.addEventListener('click', close);
    arm();
  };
  const deliver = (text, ms = TOAST_MS) => { if (has('deliver')) pix('deliver', text, ms); else toast(text, ms); };

  /* ---------- reveal on scroll (the delay comes from --i in the CSS) ---------- */
  part('reveal', () => {
    const els = $$('.reveal');
    const show = n => n.classList.add('in');
    if (!('IntersectionObserver' in window)) { els.forEach(show); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      /* on screen, or already scrolled past (opened at an anchor) */
      if (e.isIntersecting || e.boundingClientRect.bottom < 0) { show(e.target); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(n => io.observe(n));
    /* a keyboard never waits for a fade */
    d.addEventListener('focusin', e => {
      const r = e.target && e.target.closest && e.target.closest('.reveal');
      if (r && !r.classList.contains('in')) { show(r); io.unobserve(r); }
    });
  });

  /* ---------- CSS loops (sparkles, ribbon, ticker, little people) pause while out of sight ---------- */
  part('offscreen', () => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '80px 0px' });
    $$('.hero, .ticker, #f-friends .habitat, #p-start').forEach(n => io.observe(n));
  });

  /* ---------- 動きを止める: a page-level pause for everything that moves ---------- */
  part('calm', () => {
    const btns = $$('[data-calm]');
    const sync = () => { const on = root.classList.contains('calm'); btns.forEach(b => b.setAttribute('aria-pressed', String(on))); };
    btns.forEach(b => b.addEventListener('click', () => {
      const on = !root.classList.contains('calm');
      root.classList.toggle('calm', on);
      try { localStorage.setItem('inchly-calm', on ? '1' : '0'); } catch (e) { /* private mode: still pause */ }
      sync();
      d.dispatchEvent(new CustomEvent('inch:calm', { detail: { calm: on } }));
    }));
    sync();
  });

  /* ?at=section-id jumps straight there (handy for links and screenshots) */
  part('at', () => {
    const at = new URLSearchParams(location.search).get('at');
    if (!at) return;
    const go = () => {
      const t = d.getElementById(at);
      if (!t) return;
      root.style.scrollBehavior = 'auto';
      t.scrollIntoView();
      root.style.scrollBehavior = '';
    };
    if (d.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
  });

  /* ---------- nav: a line once the page moves ---------- */
  part('nav', () => {
    const nav = $('#nav');
    if (!nav) return;
    let on = null;
    const check = () => { const s = scrollY > 8; if (s !== on) { on = s; nav.classList.toggle('scrolled', s); } };
    addEventListener('scroll', check, { passive: true });
    check();
  });

  /* ---------- theme: white / paper / dark, remembered ---------- */
  const THEMES = { white: '#ffffff', paper: '#f3eee3', dark: '#0e0c13' };
  const onTheme = [];           /* parts that repaint with the theme */
  part('theme', () => {
    const btns = $$('.theme [data-set-theme]');
    let meta = $('meta[name="theme-color"]');
    if (!meta) { meta = el('meta'); meta.name = 'theme-color'; d.head.appendChild(meta); }
    let current = root.dataset.theme, doneT = 0;
    const sync = () => {
      const t = root.dataset.theme;
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setTheme === t)));
      if (THEMES[t]) meta.setAttribute('content', THEMES[t]);
    };
    const changed = () => {
      sync();
      if (root.dataset.theme === current) return;
      current = root.dataset.theme;
      onTheme.forEach(fn => { try { fn(current); } catch (e) { console.warn('[inchly] theme', e); } });
      d.dispatchEvent(new CustomEvent('inch:theme', { detail: { theme: current } }));
    };
    const set = (t, save) => {
      if (!THEMES[t]) return;
      if (save) { try { localStorage.setItem('inchly-theme', t); } catch (e) { /* private mode: still switch */ } }
      if (t === root.dataset.theme) { sync(); return; }
      root.classList.add('theming');                 /* every colour eases over .35s */
      root.dataset.theme = t;
      changed();
      clearTimeout(doneT);
      doneT = setTimeout(() => root.classList.remove('theming'), 400);
    };
    btns.forEach(b => b.addEventListener('click', () => set(b.dataset.setTheme, true)));
    /* changed from somewhere else (another tab, pix.js, devtools) */
    new MutationObserver(changed).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    addEventListener('storage', e => { if (e.key === 'inchly-theme' && THEMES[e.newValue]) set(e.newValue, false); });
    sync();
  });

  /* =====================================================================
     The big pixel wordmark.
     "inchly" in Bricolage Grotesque 800 at 22px rows, each opaque pixel a block.
     A lime copy sits (.6 cell, .6 cell) down-right as the extrusion; the ink
     blocks rain in on load, lift on springs near the cursor, and ripple on
     clicks and on residents landing. pix.js walks on surface(pageX).
     ===================================================================== */
  part('wordmark', () => {
    const cv = $('#mark');
    const g = cv && cv.getContext && cv.getContext('2d');
    if (!g) return;                                   /* no canvas: pix.js falls back to the box */
    const host = cv.closest('.wordmark') || cv.parentElement;
    const TEXT = 'inchly', ROWS = 22, WEIGHT = 800, LS = 1;
    const FAMILY = '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif';
    const FONT = `${WEIGHT} ${ROWS}px ${FAMILY}`;
    const SHADE = '#c6f432', MAXCELL = 15, G = 5200;

    let cells = [], cols = 0, rows = 0, top = [];
    let cell = MAXCELL, gap = 1, dep = 9, head = 45, dpr = 1, laidW = -1;
    let ink = '#17121f', waves = [], hot = false, running = false, last = 0, t = 0;
    let pending = false, landed = false, fadeCap = 0, fadeSame = 0, box = null, boxAt = 0;
    const ptr = { x: -1e5, y: -1e5 };

    /* -- turn the real typeface into blocks --
       Each glyph is drawn on its own at the sub-pixel phase that comes out
       crispest (stems land on whole pixels), then placed on a whole-pixel pen. */
    const raster = () => {
      const c = d.createElement('canvas');
      const x = c.getContext('2d', { willReadFrequently: true });
      x.font = FONT;
      const glyphs = [...TEXT].map(ch => ({ ch, adv: x.measureText(ch).width }));
      const H = ROWS * 2, PADX = 3;
      const shoot = (ch, W, px, py) => {
        x.clearRect(0, 0, W, H);
        x.font = FONT; x.fillStyle = '#000'; x.textBaseline = 'alphabetic';
        x.fillText(ch, PADX + px, Math.round(ROWS * 1.35) + py);
        const a = x.getImageData(0, 0, W, H).data;
        let fuzz = 0;
        for (let i = 3; i < a.length; i += 4) fuzz += Math.min(a[i], 255 - a[i]);
        return { a, fuzz };
      };
      let best = null;
      for (const py of [0, 0.25, 0.5, 0.75]) {
        let total = 0;
        const picks = glyphs.map(gl => {
          const W = Math.ceil(gl.adv) + PADX * 2;
          if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
          let b = null;
          for (const px of [0, 0.25, 0.5, 0.75]) { const s = shoot(gl.ch, W, px, py); if (!b || s.fuzz < b.fuzz) b = s; }
          total += b.fuzz;
          return { W, a: b.a };
        });
        if (!best || total < best.total) best = { total, picks };
      }
      const seen = new Set(), pts = [];
      let pen = 0;
      glyphs.forEach((gl, i) => {
        const { W, a } = best.picks[i], ox = Math.round(pen) - PADX;
        for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
          if (a[(yy * W + xx) * 4 + 3] <= 110) continue;
          const k = (ox + xx) + ',' + yy;
          if (!seen.has(k)) { seen.add(k); pts.push([ox + xx, yy]); }
        }
        pen += gl.adv + LS;
      });
      if (!pts.length) return false;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [px, py] of pts) { minX = Math.min(minX, px); minY = Math.min(minY, py); maxX = Math.max(maxX, px); maxY = Math.max(maxY, py); }
      const wasLanded = landed;
      cells = pts.map(([px, py]) => ({ x: px - minX, y: py - minY, oy: 0, vy: 0, lift: 0, lv: 0, delay: 0, landed: true }));
      cols = maxX - minX + 1; rows = maxY - minY + 1;
      top = [];
      for (const p of cells) if (top[p.x] == null || p.y < top[p.x]) top[p.x] = p.y;
      laidW = -1;
      layout();
      if (reduced() || wasLanded) { landed = true; pending = false; }   /* a late font swap: no second rain */
      else if (onScreen()) seedIntro();
      else { pending = true; hideAll(); }
      render();
      return true;
    };

    /* sized before the font arrives (from the usual 68×20 grid) so the hero does not jump */
    const layout = () => {
      const cc = cols || 68, rr = rows || 20;
      const avail = host.clientWidth || (host.parentElement && host.parentElement.clientWidth) || 0;
      if (!avail) return;
      laidW = avail;
      /* whole cells only (15px on a desktop, 5px at 390): the ink fits the column,
         the lime extrusion may hang a few px into the page gutter */
      cell = Math.max(2, Math.min(MAXCELL, Math.floor(avail / cc)));
      gap = Math.round(cell * 0.08);
      dep = Math.round(cell * 0.6);
      head = cell * 3;                                   /* headroom for lifted blocks */
      const w = cc * cell + dep, h = rr * cell + dep + head;
      dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
      cv.style.maxWidth = 'none';                        /* never resample the blocks */
      cv.style.marginTop = -head + 'px';
      box = null;
      render();
    };

    const onScreen = () => { const r = cv.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
    const hideAll = () => { for (const p of cells) { p.landed = false; p.vy = 0; p.oy = -1e6; p.delay = Infinity; } };

    const seedIntro = () => {
      pending = false; landed = false;
      const H = (rows + 6) * cell;
      for (const p of cells) {
        p.landed = false; p.vy = 0;
        p.oy = -H - rnd(0, cell * 8);
        /* left to right, a little ragged; lower rows first within a column */
        p.delay = p.x * 0.012 + rnd(0, 0.18) + (rows - p.y) * 0.004;
      }
      t = 0;
      wake();
    };

    const settleAll = () => { for (const p of cells) { p.landed = true; p.oy = 0; p.vy = 0; p.lift = 0; p.lv = 0; } waves = []; landed = true; pending = false; };

    const readInk = () => { ink = getComputedStyle(cv).color || ink; };
    /* after a theme switch, keep reading the text colour until it settles */
    const following = () => {
      if (!fadeCap) return false;
      const was = ink;
      readInk();
      fadeSame = ink === was ? fadeSame + 1 : 0;
      if ((fadeSame > 6 && !root.classList.contains('theming')) || performance.now() > fadeCap) { fadeCap = 0; return false; }
      return true;
    };

    const render = () => {
      if (!cols) return;
      const s = cell - gap;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cv.width / dpr, cv.height / dpr);
      /* the lime extrusion stays on the ground; it arrives with its block */
      g.fillStyle = SHADE;
      g.beginPath();
      for (const p of cells) {
        if (!p.landed && p.oy < -cell) continue;
        g.rect(p.x * cell + dep, head + p.y * cell + dep + Math.round(Math.min(0, p.oy)), s, s);
      }
      g.fill();
      g.fillStyle = ink;
      g.beginPath();
      for (const p of cells) {
        const y = head + p.y * cell + Math.round(p.oy - p.lift);
        if (y + s < 0) continue;
        g.rect(p.x * cell, y, s, s);
      }
      g.fill();
    };

    const wake = () => { if (!running) { running = true; last = 0; requestAnimationFrame(tick); } };

    const tick = now => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const fading = following();
      if (reduced()) {
        if (!landed) settleAll();
        for (const p of cells) { p.lift = 0; p.lv = 0; }
        waves = []; hot = false;
        render();
        running = fading;
        if (running) requestAnimationFrame(tick);
        return;
      }
      t += dt;
      let busy = fading;
      const r = cv.getBoundingClientRect();
      const px = (ptr.x - r.left) / cell, py = (ptr.y - r.top - head) / cell;
      const R = 7;
      for (const w of waves) w.r += dt * 60;              /* 60 cells a second */
      waves = waves.filter(w => w.r < w.max);
      if (waves.length) busy = true;
      let near = false, all = true;
      for (const p of cells) {
        if (!p.landed) {
          all = false;
          if (!pending) busy = true;
          if (!pending && t >= p.delay) {
            p.vy += G * dt; p.oy += p.vy * dt;
            if (p.oy >= 0) {
              if (p.vy > 500) { p.oy = 0; p.vy = -p.vy * 0.22; }   /* one small bounce */
              else { p.oy = 0; p.vy = 0; p.landed = true; }
            }
          }
        }
        let goal = 0;
        if (hot) {
          const dx = p.x + 0.5 - px, dy = p.y + 0.5 - py, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < R) { const k = 1 - dist / R; goal = k * k * cell * 1.4; near = true; }
        }
        for (const w of waves) {
          const band = Math.abs(Math.hypot(p.x - w.x, p.y - w.y) - w.r);
          if (band < 2.5) goal = Math.max(goal, (1 - band / 2.5) * cell * w.amp * Math.max(0, 1 - w.r / w.max));
        }
        /* every block has its own spring: stiff, a little wobble left in */
        p.lv += ((goal - p.lift) * 320 - p.lv * 22) * dt;
        p.lift += p.lv * dt;
        if (Math.abs(p.lift) > 0.05 || Math.abs(p.lv) > 0.5) busy = true;
        else if (!goal) { p.lift = 0; p.lv = 0; }
      }
      if (all && !pending) landed = true;
      if (!near) hot = false;
      render();
      if (busy || hot) requestAnimationFrame(tick); else running = false;
    };

    /* -- the cursor wakes it from 8 cells away -- */
    const nearCheck = () => {
      if (!cols || reduced()) return;
      const r = cv.getBoundingClientRect(), m = cell * 8;
      if (ptr.x > r.left - m && ptr.x < r.right + m && ptr.y > r.top + head - m && ptr.y < r.bottom + m) { hot = true; wake(); }
    };
    const at = e => { ptr.x = e.clientX; ptr.y = e.clientY; nearCheck(); };
    const gone = () => { ptr.x = ptr.y = -1e5; };
    addEventListener('pointermove', at, { passive: true });
    addEventListener('pointerdown', at, { passive: true });
    addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') gone(); }, { passive: true });
    addEventListener('pointercancel', gone, { passive: true });
    addEventListener('blur', gone);
    root.addEventListener('mouseleave', gone);

    /* -- a click sends a ring through the letters -- */
    host.addEventListener('pointerdown', e => {
      if (!cols || reduced()) return;
      const r = cv.getBoundingClientRect();
      waves.push({ x: (e.clientX - r.left) / cell, y: (e.clientY - r.top - head) / cell, r: 0, max: cols + 20, amp: 1.6 });
      if (waves.length > 16) waves.shift();
      wake();
    });

    /* where the canvas sits on the page, re-measured at most every 100ms */
    const pageBox = () => {
      const n = performance.now();
      if (!box || n - boxAt > 100) {
        const r = cv.getBoundingClientRect();
        box = { left: r.left + scrollX, top: r.top + scrollY };
        boxAt = n;
      }
      return box;
    };

    window.inchMark = {
      /* page-y of the top block in the column under page-x, or null over a gap */
      surface(pageX) {
        if (!cols) return null;
        const b = pageBox();
        const c = Math.floor((pageX - b.left) / cell);
        const tp = top[c];
        return tp == null ? null : b.top + head + tp * cell;
      },
      /* true once every block has landed (residents wait for this) */
      get settled() { return !!cols && landed && !pending; },
      /* something landed on the letters at (pageX, pageY): a small ripple */
      impact(pageX, pageY, power = 1) {
        if (!cols || reduced()) return;
        const b = pageBox(), pw = clamp(+power || 1, 0, 3);
        waves.push({ x: (pageX - b.left) / cell, y: (pageY - b.top - head) / cell, r: 0, max: 5 + 5 * pw, amp: 0.5 + 0.4 * pw });
        if (waves.length > 16) waves.shift();
        wake();
      },
      /* repaint in the current text colour (and size) */
      redraw() {
        readInk();
        if (host.clientWidth !== laidW) layout(); else render();
      },
      get cell() { return cell; },
      get rows() { return rows; },
      get cols() { return cols; }
    };

    /* the theme eases colours over .35s: follow along frame by frame */
    onTheme.push(() => { readInk(); fadeCap = performance.now() + 1500; fadeSame = 0; render(); wake(); });

    if ('ResizeObserver' in window) {
      let q = 0;
      new ResizeObserver(() => {
        if (host.clientWidth === laidW) return;
        cancelAnimationFrame(q);
        q = requestAnimationFrame(() => { layout(); box = null; });
      }).observe(host);
    } else addEventListener('resize', () => layout());

    /* rain only where someone can see it; otherwise wait until it scrolls in */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => {
        if (es[es.length - 1].isIntersecting && pending) seedIntro();
      }).observe(cv);
    }
    if (motionQ.addEventListener) motionQ.addEventListener('change', () => { if (reduced()) { settleAll(); render(); } });
    d.addEventListener('inch:calm', () => { if (reduced()) { settleAll(); render(); } });

    readInk();
    layout();
    /* wait for the real face (but never forever), then build */
    let done = false;
    const build = () => {
      if (done) return;
      done = true;
      readInk();
      raster();
      /* if we had to start with a stand-in font, swap in the real one quietly */
      if (d.fonts && !d.fonts.check(`${WEIGHT} ${ROWS}px "Bricolage Grotesque"`, TEXT)) {
        const swap = () => {
          if (!d.fonts.check(`${WEIGHT} ${ROWS}px "Bricolage Grotesque"`, TEXT)) return;
          d.fonts.removeEventListener('loadingdone', swap);
          raster();
        };
        d.fonts.addEventListener('loadingdone', swap);
      }
    };
    if (d.fonts && d.fonts.load) {
      Promise.race([
        d.fonts.load(`${WEIGHT} ${ROWS}px "Bricolage Grotesque"`, TEXT).catch(() => null),
        new Promise(res => setTimeout(res, 2500))
      ]).then(build, build);
    } else build();
  });

  /* ---------- spawn buttons ---------- */
  part('spawn', () => {
    const btns = $$('button.spawn[data-spawn]');
    if (!btns.length) return;
    const clear = btns.find(b => b.dataset.spawn === 'clear');
    const KIND = { pen: 'penta', flame: 'bo', eraser: 'eraser' };
    btns.forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.spawn;
      if (k === 'clear') {
        pix('clear');
        if (clear) {
          const hadFocus = d.activeElement === clear;
          clear.hidden = true;
          if (hadFocus) { const first = btns.find(x => !x.hidden); if (first) first.focus(); }
        }
        return;
      }
      if (!KIND[k] || !has('spawn')) return;
      /* most pencils and every flame go to the big letters; pix.js may ignore the hint */
      const opts = (k === 'flame' || (k === 'pen' && Math.random() < 0.6)) ? { on: '#mark' } : {};
      pix('spawn', KIND[k], opts);
      if (clear) clear.hidden = false;
    }));
    /* without pix.js the buttons would do nothing: put them away */
    const check = () => { if (!has('spawn')) btns.forEach(n => { n.hidden = true; }); };
    if (d.readyState === 'complete') setTimeout(check, 300); else addEventListener('load', () => setTimeout(check, 300), { once: true });
  });

  /* ---------- No.01 timetable: a stop lights up ---------- */
  part('f-plan', () => {
    const hab = $('#f-plan .habitat');
    if (!hab) return;
    const stops = $$('.stops button', hab);
    stops.forEach(b => {
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        stops.forEach(x => x.setAttribute('aria-pressed', String(x === b && on)));
        if (on) poke(resident(hab, 'jiri'), 'note');
      });
    });
  });

  /* ---------- a stopwatch that really counts ---------- */
  const stopwatch = onTick => {
    let start = 0, acc = 0, iv = 0, shown = '';
    const elapsed = () => acc + (start ? Date.now() - start : 0);
    const paint = () => { const s = fmt(elapsed()); if (s !== shown) { shown = s; onTick(s); } };
    return {
      get running() { return !!start; },
      elapsed,
      start() { if (start) return; start = Date.now(); paint(); iv = setInterval(paint, 200); },
      stop() { if (!start) return; acc += Date.now() - start; start = 0; clearInterval(iv); paint(); },
      reset() { this.stop(); acc = 0; shown = ''; paint(); }
    };
  };

  /* ---------- No.02 timer: ▶ / ❚❚ ---------- */
  part('f-timer', () => {
    const time = $('#ft-time'), go = $('#ft-go');
    if (!time || !go) return;
    const sw = stopwatch(s => { time.textContent = s; });
    const label = () => {
      const on = sw.running;
      go.textContent = on ? '❚❚' : '▶︎';
      go.setAttribute('aria-label', on ? '止める' : 'はかる');
      go.classList.toggle('running', on);
    };
    go.addEventListener('click', () => { if (sw.running) sw.stop(); else sw.start(); label(); });
    label();
  });

  /* ---------- No.03 grass: each press one shade darker ---------- */
  part('f-record', () => {
    const grass = $('#f-record .mini-grass');
    if (!grass) return;
    const cells = $$('button', grass);
    /* one tab stop for the whole field; the arrows walk it (columns are weeks) */
    let cur = Math.max(0, cells.findIndex(b => b.classList.contains('today')));
    const focusAt = (i, move) => {
      cur = clamp(i, 0, cells.length - 1);
      cells.forEach((b, k) => b.tabIndex = k === cur ? 0 : -1);
      if (move) cells[cur].focus();
    };
    focusAt(cur, false);
    grass.addEventListener('keydown', e => {
      const i = cells.indexOf(e.target);
      if (i < 0) return;
      const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[e.key];
      if (step != null) { e.preventDefault(); const j = i + step; if (j >= 0 && j < cells.length) focusAt(j, true); }
      else if (e.key === 'Home') { e.preventDefault(); focusAt(0, true); }
      else if (e.key === 'End') { e.preventDefault(); focusAt(cells.length - 1, true); }
    });
    grass.addEventListener('focusin', e => { const i = cells.indexOf(e.target); if (i >= 0 && i !== cur) focusAt(i, false); });
    grass.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || !grass.contains(b)) return;
      b.dataset.level = String(((parseInt(b.dataset.level, 10) || 0) + 1) % 5);
      const name = b.getAttribute('aria-label') || '';
      b.setAttribute('aria-label', /濃さ\d/.test(name) ? name.replace(/濃さ\d/, '濃さ' + b.dataset.level) : name + ' 濃さ' + b.dataset.level);
      if (!reduced() && b.animate) b.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'steps(3, end)' });
    });
  });

  /* ---------- No.04 streak: poke the flame ---------- */
  part('f-streak', () => {
    const hab = $('#f-streak .habitat');
    if (!hab) return;
    hab.addEventListener('click', e => {
      if (e.target.closest('a,button,input,label')) return;
      const bo = resident(hab, 'bo');
      if (bo && has('poke')) poke(bo);
      else hop($('.days li.today i', hab) || $('.days li i', hab), 5);
    });
  });

  /* ---------- No.06 friends + the play card: the crane brings word ---------- */
  const JOINED = 'kaito と一緒に始めました';
  part('f-friends', () => {
    const b = $('#ff-together');
    if (b) b.addEventListener('click', () => deliver(JOINED));
  });

  /* ---------- play: 勉強を開始 rings the alarm clock ---------- */
  part('p-start', () => {
    const card = $('#p-start');
    const btn = card && $('button', card), out = card && $('.readout', card);
    if (!btn) return;
    const base = btn.textContent.trim() || '勉強を開始';
    let state = 'idle';
    const show = s => { if (out) out.textContent = state === 'idle' ? '' : (state === 'run' ? '計測中 ' : '止めた ') + s; };
    const sw = stopwatch(show);
    if (out) out.setAttribute('role', 'timer');
    btn.addEventListener('click', () => {
      if (state === 'run') {
        state = 'stopped';
        sw.stop();
        show(fmt(sw.elapsed()));
        btn.textContent = base;
        btn.classList.remove('running');
        if (out) out.classList.add('is-stopped');
        return;
      }
      sw.reset();
      state = 'run';
      if (out) out.classList.remove('is-stopped');
      sw.start();
      show(fmt(sw.elapsed()));
      btn.textContent = '止める';
      btn.classList.add('running');
      const jiri = resident(card, 'jiri');
      if (jiri && has('poke')) poke(jiri, 'note'); else hop(btn, 4);
    });
  });

  /* ---------- play: ✓ 記録する floats +39 EXP (1 EXP a minute: a 39-minute record) ---------- */
  part('p-record', () => {
    const card = $('#p-record');
    const btn = card && $('button', card), pop = card && $('.pop', card);
    if (!btn || !pop) return;
    const said = $('[role=status]', card);
    let t = 0;
    btn.addEventListener('click', () => {
      pop.classList.remove('on');
      void pop.offsetWidth;                 /* restart the stepped float */
      pop.classList.add('on');
      clearTimeout(t);
      t = setTimeout(() => pop.classList.remove('on'), 1250);
      if (said) { said.textContent = ''; requestAnimationFrame(() => { said.textContent = pop.textContent.trim(); }); }
      poke(resident(card, 'penta'), 'star');
    });
  });

  /* ---------- play: ticking the ToDo makes the sprout jump ---------- */
  part('p-todo', () => {
    const card = $('#p-todo');
    const box = card && $('input[type=checkbox]', card);
    if (!box) return;
    box.addEventListener('change', () => {
      if (!box.checked) return;
      const mebu = resident(card, 'mebu');
      if (mebu && has('poke')) poke(mebu, '!'); else hop(box.closest('label') || box, 4);
    });
  });

  /* ---------- play: 一緒に始める ---------- */
  part('p-together', () => {
    const btn = $('#p-together button');
    if (btn) btn.addEventListener('click', () => deliver(JOINED));
  });

  /* ---------- play: fill the week, earn a rest ticket ---------- */
  part('p-streak', () => {
    const card = $('#p-streak');
    if (!card) return;
    const days = $$('.days button', card), ticket = $('.ticket', card);
    const label = ticket && ($('span', ticket) || ticket);
    const text = label ? label.textContent : '';
    if (ticket) ticket.setAttribute('role', 'status');
    let full = false;
    days.forEach(b => {
      if (!b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        const now = days.every(x => x.getAttribute('aria-pressed') === 'true');
        if (now === full) return;
        full = now;
        if (!ticket) return;
        if (full) {
          ticket.classList.remove('on');
          void ticket.offsetWidth;
          ticket.classList.add('on');
          if (label) { label.textContent = ''; requestAnimationFrame(() => { label.textContent = text; }); }   /* announce it */
          const bo = resident(card, 'bo');
          if (bo && has('poke')) {
            poke(bo, 'star');
            const r = ($('.days', card) || card).getBoundingClientRect();
            pix('impact', r.left + scrollX + r.width / 2, r.top + scrollY, 1.4);
          } else hop(ticket, 6);
        } else ticket.classList.remove('on');
      });
    });
  });

  /* ---------- sandbox: subject, goal, a real timer and today's log ---------- */
  part('sandbox', () => {
    const time = $('#sb-time'), go = $('#sb-go'), log = $('#sb-log');
    if (!time || !go) return;
    const segBox = $('.seg[data-sb-subject]');
    const subs = segBox ? $$('button[data-subject]', segBox) : [];
    const goal = $('#sb-goal'), goalOut = $('#sb-goal-out'), clearBtn = $('#sb-clear');
    const startText = go.textContent.trim() || '勉強を開始';
    const empty = log ? log.innerHTML : '';
    let subject = (subs.find(b => b.getAttribute('aria-pressed') === 'true') || subs[0] || { dataset: { subject: '英語' } }).dataset.subject;
    const sw = stopwatch(s => { time.textContent = s; paintGoal(); });

    subs.forEach(b => b.addEventListener('click', () => {
      subject = b.dataset.subject;
      subs.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
    /* the goal gauge, as the app's timer card shows it: a line that fills, and the time left (−) or over (+) */
    const bar = $('#sb-bar'), gauge = bar && bar.parentElement, left = $('#sb-left');
    const goalMs = () => (goal ? +goal.value : 60) * 60000;
    const paintGoal = () => {
      const ms = sw.elapsed(), g = goalMs(), over = ms > g;
      if (bar) bar.style.width = (Math.min(1, ms / g) * 100).toFixed(2) + '%';
      if (gauge) gauge.classList.toggle('over', over);
      if (left) {
        const s = Math.floor((over ? ms - g : g - ms + 999) / 1000);       /* time left rounds up, like a countdown */
        left.textContent = (over ? '+' : '−') + Math.floor(s / 60) + ':' + pad(s % 60);
        left.classList.toggle('over', over);
      }
    };
    const showGoal = () => {
      if (goal && goalOut) goalOut.textContent = `目標 ${goal.value}分`;
      if (goal) goal.setAttribute('aria-valuetext', `${goal.value}分`);
      paintGoal();
    };

    const line = ms => {
      const s = Math.floor(ms / 1000);
      const row = d.createDocumentFragment();
      row.append(el('span', 'c-time', clock()), ' ✓ ', el('span', 'c-subj', subject), ' ', el('span', 'c-num', s < 60 ? `${s}秒` : `${Math.floor(s / 60)}分`));
      return row;
    };
    const setGo = () => {
      go.textContent = sw.running ? '止めて記録' : startText;
      go.classList.toggle('running', sw.running);
    };
    if (goal) { goal.addEventListener('input', showGoal); showGoal(); }
    go.addEventListener('click', () => {
      if (!sw.running) {
        sw.reset();
        sw.start();
        setGo();
        const r = time.getBoundingClientRect();
        pix('impact', r.left + scrollX + r.width / 2, r.top + scrollY, 0.5);
        return;
      }
      sw.stop();
      if (log) {
        if (!log.dataset.used) { log.textContent = ''; log.dataset.used = '1'; }
        else log.appendChild(d.createTextNode('\n'));
        log.appendChild(line(sw.elapsed()));
        while (log.childNodes.length > 400) log.removeChild(log.firstChild);
        log.scrollTop = log.scrollHeight;
      }
      sw.reset();
      setGo();
    });
    if (clearBtn && log) clearBtn.addEventListener('click', () => { log.innerHTML = empty; delete log.dataset.used; });
  });

  /* ---------- segmented controls that hand off to pix.js ---------- */
  const seg = (box, attr, apply) => {
    if (!box) return;
    const btns = $$(`button[${attr}]`, box);
    box.addEventListener('click', e => {
      const b = e.target.closest(`button[${attr}]`);
      if (!b || !box.contains(b)) return;
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      apply(b.getAttribute(attr), b);
    });
  };
  /* pix.js wires these itself; without it, at least keep the pressed state honest */
  part('faces', () => seg($('.seg[data-face-look]'), 'data-look', look => {
    if (!window.InchPix) $$('inch-face').forEach(f => f.setAttribute('look', look));
  }));
  part('crowd', () => seg($('.seg[data-crowd]'), 'data-mode', mode => {
    if (!window.InchPix) $$('inch-crowd').forEach(c => c.setAttribute('mode', mode));
  }));

  /* ---------- the phones row ---------- */
  part('screens', () => {
    const row = $('.screens');
    if (!row) return;
    const fit = () => {
      const scrolls = row.scrollWidth > row.clientWidth + 1;
      if (scrolls) row.setAttribute('tabindex', '0'); else row.removeAttribute('tabindex');
    };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(row); else addEventListener('resize', fit);
    /* on phones the row lazy-loads sideways; fetch all six as it comes near */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => {
        if (!es.some(e => e.isIntersecting)) return;
        $$('img[loading=lazy]', row).forEach(i => { i.loading = 'eager'; });
        io.disconnect();
      }, { rootMargin: '400px 0px' });
      io.observe(row);
    }
  });

  /* ---------- the two looks of the app, cross-faded ---------- */
  part('looks', () => {
    const img = $('#looks-img');
    if (!img) return;
    const SRC = { standard: img.getAttribute('src'), cyber: 'img/cyber-home.webp' };
    const ALT = { standard: img.getAttribute('alt') || 'スタンダードの見た目のホーム画面', cyber: 'サイバーの見た目のホーム画面' };
    let want = 'standard', fadeT = 0;
    seg($('.seg[data-looks]'), 'data-look', (look, b) => {
      const src = (b && b.dataset.src) || SRC[look];
      if (!src || look === want) return;
      want = look;
      const pre = new Image();
      pre.src = src;
      const swap = () => {
        if (want !== look) return;
        img.src = src; img.alt = ALT[look] || img.alt;
        img.style.opacity = '';
      };
      if (reduced()) { (pre.decode ? pre.decode() : Promise.resolve()).then(swap, swap); return; }
      img.style.opacity = '0';                              /* .3s fade from the CSS */
      clearTimeout(fadeT);
      fadeT = setTimeout(() => { (pre.decode ? pre.decode() : Promise.resolve()).then(swap, swap); }, 300);
    });
  });

  /* =====================================================================
     The ruler: a lime band at the foot of the screen with inch ticks that
     grows as you read. A small pencil runs along it (drawn by pix.js when it
     is there), cheers at the end, and takes you back up when poked.
     ===================================================================== */
  part('ruler', () => {
    const host = $('#ruler');
    if (!host) return;
    host.textContent = '';
    const bar = el('div', 'rl-bar');
    const cv = el('canvas', 'rl-run');
    cv.title = 'いちばん上へ';
    host.append(bar, cv);
    const g = cv.getContext('2d');
    if (!g) return;
    const U = 2;                                          /* one sprite pixel = 2 css px */
    const FACING = 1;                                     /* the frames look to the right */
    const BUBBLE = 16;                                    /* room above for a bubble */
    let frames = null, fromPix = false, SW = 0, SH = 0;
    let prog = 0, x = 0, lastY = scrollY, lastT = performance.now(), v = 0, dir = 1;
    let ft = 0, fi = 0, running = false, last = 0, hopT = 0, cheered = false, bubble = '', bubbleUntil = 0, drawn = '';

    /* our own stand-in: a tiny pencil on two legs (k ink, y yellow, p pink, s steel, w wood, g lead) */
    const OWN = [
      ['.kkkkkkkkkk..', 'kppsyyyyyyywk.', 'kppsyyyyyyywwg', 'kppsyyyyyyywk.', '.kkkkkkkkkk..', '..k...k..k....'],
      ['.kkkkkkkkkk..', 'kppsyyyyyyywk.', 'kppsyyyyyyywwg', 'kppsyyyyyyywk.', '.kkkkkkkkkk..', '...k...k..k...']
    ];
    const PAL = { k: '#17121f', y: '#ffd23f', p: '#ff8fa3', s: '#b9b4c4', w: '#e8c48f', g: '#17121f' };
    const ownFrames = () => OWN.map(rowsArt => {
      const w = Math.max(...rowsArt.map(r => r.length)), h = rowsArt.length;
      const c = el('canvas'); c.width = w * U; c.height = h * U;
      const x2 = c.getContext('2d');
      rowsArt.forEach((r, yy) => [...r].forEach((ch, xx) => { if (PAL[ch]) { x2.fillStyle = PAL[ch]; x2.fillRect(xx * U, yy * U, U, U); } }));
      return c;
    });
    /* borrow the real pencil from pix.js: draw each frame big, crop to the
       pixels it actually painted (so we need not know its anchor point) */
    const pixFrames = () => {
      if (!has('drawFrame')) return null;
      const S = 160, tmp = el('canvas');
      tmp.width = S; tmp.height = S;
      const tg = tmp.getContext('2d', { willReadFrequently: true });
      const shots = [];
      for (const f of [0, 1]) {
        tg.setTransform(1, 0, 0, 1, 0, 0);
        tg.clearRect(0, 0, S, S);
        tg.imageSmoothingEnabled = false;
        pix('drawFrame', tg, 'penta', f, S / 2, S / 2, U);
        tg.setTransform(1, 0, 0, 1, 0, 0);
        shots.push(tg.getImageData(0, 0, S, S));
      }
      let x0 = S, y0 = S, x1 = -1, y1 = -1;
      shots.forEach(im => {
        const a = im.data;
        for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) if (a[(yy * S + xx) * 4 + 3] > 8) {
          if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy;
        }
      });
      if (x1 < 0) return null;
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      /* frame 1 blank or identical: a one-frame sprite */
      const a0 = shots[0].data, a1 = shots[1].data;
      let blank = true, same = true;
      for (let i = 3; i < a1.length; i += 4) { if (a1[i]) blank = false; if (a0[i] !== a1[i]) same = false; }
      if (blank || same) shots.length = 1;
      return shots.map(im => {
        const c = el('canvas'); c.width = w; c.height = h;
        c.getContext('2d').putImageData(im, -x0, -y0, x0, y0, w, h);
        return c;
      });
    };
    const bake = () => {
      let f = null;
      try { f = pixFrames(); } catch (e) { f = null; }
      fromPix = !!f;
      frames = f || ownFrames();
      SW = Math.max(...frames.map(c => c.width)); SH = Math.max(...frames.map(c => c.height));
      cv.width = SW + 8; cv.height = SH + BUBBLE;
      cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px';
      drawn = '';
    };

    /* little pixel bubbles: "!" for the finish, "↑" when poked */
    const BUBBLES = {
      '!': ['.kkkkk.', 'kwwkwwk', 'kwwkwwk', 'kwwkwwk', 'kwwwwwk', 'kwwkwwk', '.kkkkk.', '...k...'],
      up: ['.kkkkkkk.', 'kwwwkwwwk', 'kwwkkkwwk', 'kwkwkwkwk', 'kwwwkwwwk', 'kwwwkwwwk', '.kkkkkkk.', '....k....']
    };
    const drawBubble = (name, cx) => {
      const art = BUBBLES[name], w = art[0].length;
      const ox = Math.round(cx - (w * U) / 2);
      art.forEach((r, yy) => [...r].forEach((ch, xx) => {
        if (ch === '.') return;
        g.fillStyle = ch === 'k' ? '#17121f' : '#fffdf5';
        g.fillRect(ox + xx * U, yy * U, U, U);
      }));
    };

    const draw = (lift) => {
      if (!frames) bake();
      const face = dir * FACING;
      const key = fi + '|' + face + '|' + lift + '|' + bubble;
      if (key !== drawn) {
        drawn = key;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, cv.width, cv.height);
        const f = frames[fi % frames.length];
        const fx = Math.round((cv.width - f.width) / 2), fy = cv.height - f.height - lift;
        g.save();
        if (face < 0) { g.translate(cv.width, 0); g.scale(-1, 1); }
        g.drawImage(f, fx, fy);
        g.restore();
        if (bubble) drawBubble(bubble, cv.width / 2 + (face > 0 ? 6 : -6));
      }
      cv.style.transform = `translate3d(${Math.round(x)}px,0,0)`;
    };

    const measure = () => {
      const max = Math.max(0, (d.documentElement.scrollHeight || d.body.scrollHeight) - innerHeight);
      host.classList.toggle('rl-off', max < 40);
      prog = max ? clamp(scrollY / max, 0, 1) : 0;
      bar.style.width = (prog * 100).toFixed(3) + '%';
      bar.style.visibility = prog > 0 ? '' : 'hidden';
    };

    const tick = now => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const target = prog * Math.max(0, innerWidth - cv.width);
      const calm = reduced();
      if (calm) x = target; else x += (target - x) * (1 - Math.exp(-10 * dt));
      const moving = Math.abs(target - x) > 0.5;
      v *= Math.exp(-5 * dt);
      /* the faster you scroll, the faster its legs go */
      if (moving && !calm) { ft += dt * clamp(8 + Math.abs(v) / 120, 8, 22); fi = Math.floor(ft) % frames.length; }
      else fi = 0;
      /* at the very end: a cheer, once, until you scroll back a little */
      if (prog >= 0.995 && !cheered) { cheered = true; bubble = '!'; bubbleUntil = now + 1600; hopT = calm ? 0 : 0.6; }
      if (prog < 0.97) cheered = false;
      if (bubble && now > bubbleUntil) bubble = '';
      let lift = 0;
      if (hopT > 0) { hopT = Math.max(0, hopT - dt); const p = (0.6 - hopT) / 0.3 % 1; lift = Math.round(Math.sin(Math.PI * p) * 3) * U; }
      draw(lift);
      if (moving || bubble || hopT > 0) requestAnimationFrame(tick); else { running = false; draw(0); }
    };
    const wake = () => { if (!running) { running = true; last = 0; requestAnimationFrame(tick); } };

    addEventListener('scroll', () => {
      const n = performance.now(), dy = scrollY - lastY, dts = Math.max(0.016, (n - lastT) / 1000);
      if (dy) dir = dy > 0 ? 1 : -1;
      v = v * 0.6 + (dy / dts) * 0.4;
      lastY = scrollY; lastT = n;
      measure();
      wake();
    }, { passive: true });
    addEventListener('resize', () => { measure(); wake(); }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); wake(); }).observe(d.body);

    cv.addEventListener('click', () => {
      bubble = 'up'; bubbleUntil = performance.now() + 900;
      wake();
      scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    });

    bake();
    measure();
    x = prog * Math.max(0, innerWidth - cv.width);
    draw(0);
    /* pix.js may only be ready after load: borrow its pencil then */
    const rebake = () => { if (!fromPix && has('drawFrame')) { bake(); draw(0); } };
    if (d.readyState === 'complete') setTimeout(rebake, 50); else addEventListener('load', () => setTimeout(rebake, 50), { once: true });
    onTheme.push(() => { drawn = ''; draw(0); });
  });

  /* =====================================================================
     The footer's edge: pixel grass. A 48×18 tile of blades in lime and leaf
     green, 6–16px tall, outlined in the page ink (currentColor, so it follows
     the theme), repeated along the top of the green field.
     ===================================================================== */
  part('grass', () => {
    const host = $('.foot-grass');
    if (!host) return;
    const U = 2, W = 24, H = 9;                           /* the tile in 2px pixels; row 8 sits on the field */
    const LIME = '#c6f432', LEAF = '#1FA35B';
    /* back to front: left column, tip row (1 = 16px tall … 6 = 6px), lean, colour.
       A clump of three, a pair, a loner, with a bit of bare ground between. */
    const BLADES = [
      [1, 4, -1, LEAF], [7, 5, 1, LEAF], [4, 1, 0, LIME],
      [15, 6, 1, LEAF], [12, 3, -1, LIME],
      [21, 2, -1, LIME]
    ];
    const grid = Array.from({ length: H }, () => new Array(W).fill(null));
    const wrap = n => ((n % W) + W) % W;
    /* each blade: two pixels wide at the root, one at the tip, leaning into a
       staircase, with its own ink outline (shared with its neighbours) */
    for (const [x0, tip, lean, col] of BLADES) {
      const tall = H - 1 - tip, cellsOf = [];
      for (let r = H - 1; r >= tip; r--) {
        const k = tall > 0 ? (H - 1 - r) / tall : 0;
        const w = k > 0.6 ? 1 : 2;
        const sx = x0 + Math.round(lean * k * 2) + (w === 1 && lean > 0 ? 1 : 0);
        for (let i = 0; i < w; i++) cellsOf.push([wrap(sx + i), r]);
      }
      const mine = new Set(cellsOf.map(([cx, r]) => r * W + cx));
      for (const [cx, r] of cellsOf) for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1]]) {
        const nx = wrap(cx + dx), ny = r + dy;
        if (ny >= 0 && !mine.has(ny * W + nx)) grid[ny][nx] = 'k';
      }
      for (const [cx, r] of cellsOf) grid[r][cx] = col;
    }
    for (let x2 = 0; x2 < W; x2++) if (!grid[H - 1][x2]) grid[H - 1][x2] = 'k';   /* the ground line between clumps */
    const paths = {};
    for (let y = 0; y < H; y++) for (let x2 = 0; x2 < W;) {
      const c = grid[y][x2];
      if (!c) { x2++; continue; }
      let e = x2;
      while (e < W && grid[y][e] === c) e++;
      (paths[c] = paths[c] || []).push(`M${x2 * U} ${y * U}h${(e - x2) * U}v${U}h${-(e - x2) * U}z`);
      x2 = e;
    }
    const body = Object.keys(paths).map(c => `<path fill="${c === 'k' ? 'currentColor' : c}" d="${paths[c].join('')}"/>`).join('');
    const build = () => {
      host.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="18" shape-rendering="crispEdges" aria-hidden="true" focusable="false">' +
        `<defs><pattern id="inchly-grass" width="${W * U}" height="${H * U}" patternUnits="userSpaceOnUse">${body}</pattern></defs>` +
        `<rect width="100%" height="${H * U}" fill="url(#inchly-grass)"/></svg>`;
    };
    build();
    /* patterns can keep a stale tile in some engines: rebuild once the colours settle */
    let rebuildT = 0;
    onTheme.push(() => { clearTimeout(rebuildT); rebuildT = setTimeout(build, 900); });
  });
})();
