// Shared runtime for every scene: canvas sizing, the frame loop, pause/resume,
// taps, and the bridge back to React Native (or to a parent page in a browser).
(function () {
  const Host = {
    w: innerWidth,
    h: innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 3),
    time: 0,
    frameMs: 0,
    warming: false,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  const canvases = [];
  let scene = null;
  let paused = false;
  let rafId = 0;
  let last = 0;

  /** Registers a canvas that always fills the screen. maxDpr caps its backing resolution. */
  Host.canvas = (el, maxDpr = 3) => {
    const entry = { el, maxDpr, dpr: 1 };
    canvases.push(entry);
    fit(entry);
    return entry;
  };

  function fit(entry) {
    entry.dpr = Math.min(Host.dpr, entry.maxDpr);
    entry.el.width = Math.round(Host.w * entry.dpr);
    entry.el.height = Math.round(Host.h * entry.dpr);
    entry.el.style.width = Host.w + 'px';
    entry.el.style.height = Host.h + 'px';
  }

  function onResize() {
    const w = innerWidth;
    const h = innerHeight;
    if (w === Host.w && h === Host.h) return;
    Host.w = w;
    Host.h = h;
    Host.dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvases.forEach(fit);
    if (scene && scene.resize) scene.resize();
  }

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    // Clamp dt so a stalled frame (app switch, GC) never teleports anything.
    const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
    last = now;
    Host.time += dt;
    const t0 = performance.now();
    scene.frame(dt, Host.time);
    // Rolling average of time spent in a frame, for tuning (Host.frameMs).
    Host.frameMs = Host.frameMs * 0.95 + (performance.now() - t0) * 0.05;
  }

  function setPaused(p) {
    if (p === paused) return;
    paused = p;
    if (paused) {
      cancelAnimationFrame(rafId);
    } else if (scene) {
      last = 0;
      rafId = requestAnimationFrame(loop);
    }
  }

  /** scene = { frame(dt, t), resize?(), tap?(x, y), move?(x, y), up?() } */
  Host.start = (s) => {
    scene = s;
    if (scene.resize) scene.resize();
    // Advance the simulation a little so the first frame is already alive.
    // Scenes skip drawing while Host.warming is set.
    Host.warming = true;
    for (let i = 0; i < 90; i++) scene.frame(1 / 30, (Host.time += 1 / 30));
    Host.warming = false;
    if (!paused) rafId = requestAnimationFrame(loop);
    post({ type: 'ready' });
  };

  Host.post = post;
  function post(msg) {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      else if (window.parent !== window) window.parent.postMessage(msg, '*');
    } catch (e) {}
  }

  // React Native calls these through injectJavaScript.
  window.__ambient = { pause: () => setPaused(true), resume: () => setPaused(false) };
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));
  addEventListener('resize', onResize);

  addEventListener('pointerdown', (e) => {
    post({ type: 'touch' });
    if (scene && scene.tap) scene.tap(e.clientX, e.clientY);
  });
  addEventListener('pointermove', (e) => {
    if (e.buttons && scene && scene.move) scene.move(e.clientX, e.clientY);
  });
  addEventListener('pointerup', () => scene && scene.up && scene.up());
  addEventListener('pointercancel', () => scene && scene.up && scene.up());
  // Keep iOS from scrolling, zooming or showing the callout menu.
  addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  addEventListener('gesturestart', (e) => e.preventDefault());

  // Small math helpers every scene uses.
  Host.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  Host.lerp = (a, b, t) => a + (b - a) * t;
  Host.rand = (a, b) => a + Math.random() * (b - a);
  Host.angleDiff = (a, b) => {
    let d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  /** Integer hash → [0, 1). Stable per (x, y, z). */
  Host.hash3 = (x, y, z) => {
    let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  /** Smooth 2D value noise in [0, 1). */
  Host.noise2 = (x, y, seed = 0) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = Host.hash3(xi, yi, seed);
    const b = Host.hash3(xi + 1, yi, seed);
    const c = Host.hash3(xi, yi + 1, seed);
    const d = Host.hash3(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  window.Host = Host;
})();
