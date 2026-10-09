/*
 * Procedural score, rendered offline with Web Audio. Tempo-locked to TIMELINE.bpm; every event comes from
 * the beat grid or TIMELINE.cues. Seeded noise only, so two renders are sample-identical.
 *   window.renderAudio() → base64 of a 48 kHz stereo 32-bit float WAV
 */
(function () {
  const T = window.TIMELINE;
  const SR = 48000;
  const SPB = T.spb;
  const at = (b) => b * SPB;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // section intensity for the bed (0..1), per beat
  function intensity(b) {
    if (b < 10) return 0.55;
    if (b < 38) return 0.8;
    if (b < 68) return 1.0;
    if (b < 74) return 0.85;
    if (b < 82) return 0.45; // the clock error: the bed thins out
    if (b < 85.5) return 0.9;
    return 0.75;
  }

  const CHORDS = [ // two bars each: D, Bm, G, A
    [146.83, 185.0, 220.0],
    [123.47, 146.83, 185.0],
    [98.0, 123.47, 146.83],
    [110.0, 138.59, 164.81],
  ];
  const ROOTS = [73.42, 61.74, 49.0, 55.0];
  const MOTIF = [587.33, 739.99, 880.0];

  async function render() {
    const dur = T.duration;
    const ctx = new OfflineAudioContext(2, Math.ceil(dur * SR), SR);
    const rnd = mulberry32(T.seed);

    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    // final fade
    master.gain.setValueAtTime(0.9, dur - 3.0);
    master.gain.linearRampToValueAtTime(0.0001, dur - 0.05);

    // reverb from seeded decaying noise
    const irLen = Math.floor(2.4 * SR);
    const ir = ctx.createBuffer(2, irLen, SR);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / irLen, 3.2);
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.32;
    verb.connect(verbGain).connect(master);

    const bed = ctx.createGain();
    bed.gain.value = 1;
    bed.connect(master);
    const sfx = ctx.createGain();
    sfx.gain.value = 1.5; // cues sit clearly above the bed
    sfx.connect(master);

    const noiseBuf = ctx.createBuffer(1, SR * 2, SR);
    {
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    }

    function tone(type, freq, t0, a, hold, rel, level, dest, send = 0, pan = 0) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(level, t0 + a);
      g.gain.setValueAtTime(level, t0 + a + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel);
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      o.connect(g).connect(p).connect(dest);
      if (send) { const s = ctx.createGain(); s.gain.value = send; p.connect(s).connect(verb); }
      o.start(t0);
      o.stop(t0 + a + hold + rel + 0.05);
      return o;
    }
    function bell(freq, t0, level, pan = 0) {
      const partials = [[1, 1, 1.8], [2.0, 0.38, 1.1], [3.01, 0.18, 0.7], [4.2, 0.08, 0.45]];
      for (const [m, amp, decay] of partials) tone("sine", freq * m, t0, 0.004, 0, decay, level * amp, sfx, 0.5, pan);
    }
    function noiseBurst(t0, len, level, type, f0, f1, dest, q = 0.8) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.Q.value = q;
      f.frequency.setValueAtTime(f0, t0);
      f.frequency.exponentialRampToValueAtTime(f1, t0 + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(level, t0 + Math.min(0.01, len / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      src.connect(f).connect(g).connect(dest);
      src.start(t0, (t0 * 7.13) % 1.5);
      src.stop(t0 + len + 0.02);
    }

    // ---------------------------------------------------------------- bed
    const padLP = ctx.createBiquadFilter();
    padLP.type = "lowpass";
    padLP.frequency.value = 950;
    padLP.Q.value = 0.4;
    padLP.connect(bed);
    for (let bar = 0; bar < T.beats / 4; bar++) {
      const b = bar * 4;
      const chord = CHORDS[Math.floor(bar / 2) % 4];
      const lvl = intensity(b + 1);
      // pad: one swell per two bars
      if (bar % 2 === 0) {
        chord.forEach((f, i) => {
          tone("triangle", f, at(b), 1.4, at(8) - 2.2, 1.6, 0.05 * lvl, padLP, 0.3, (i - 1) * 0.3);
          tone("sine", f * 2, at(b), 1.8, at(8) - 2.6, 1.6, 0.012 * lvl, padLP, 0.3, (1 - i) * 0.3);
        });
      }
      // bass on each bar, muted through the clock error
      if (b >= 2 && !(b >= 74 && b < 82)) {
        const root = ROOTS[Math.floor(bar / 2) % 4];
        tone("sine", root, at(b), 0.03, 0.15, 1.4, 0.11 * lvl, bed);
        tone("triangle", root * 2, at(b), 0.02, 0.05, 0.6, 0.03 * lvl, bed);
      }
    }
    // eighth-note ticks and a soft low pulse
    for (let e = 0; e < T.beats * 2; e++) {
      const b = e / 2;
      const lvl = intensity(b);
      const ticking = (b >= 10 && b < 74) || (b >= 82 && b < T.beats - 4);
      if (ticking) noiseBurst(at(b), 0.035, (e % 2 === 0 ? 0.03 : 0.018) * lvl, "highpass", 5200, 7000, bed, 0.5);
      const pulsing = (b >= 18 && b < 68) || (b >= 82 && b < T.beats - 8);
      if (pulsing && e % 4 === 0) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.setValueAtTime(92, at(b));
        o.frequency.exponentialRampToValueAtTime(48, at(b) + 0.18);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at(b));
        g.gain.exponentialRampToValueAtTime(0.09 * lvl, at(b) + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, at(b) + 0.32);
        o.connect(g).connect(bed);
        o.start(at(b));
        o.stop(at(b) + 0.35);
      }
    }

    // ---------------------------------------------------------------- cues
    for (const c of T.cues) {
      const t0 = at(c.b);
      switch (c.type) {
        case "lock":
          tone("sine", 880, t0, 0.004, 0.04, 0.12, 0.06, sfx, 0.2);
          tone("sine", 880, t0 + 0.13, 0.004, 0.04, 0.16, 0.06, sfx, 0.2);
          if (c.b > 50) { // the found position: a soft chord instead of a beep
            for (const f of [293.66, 440.0, 587.33]) tone("sine", f, t0, 0.01, 0.2, 1.4, 0.045, sfx, 0.4);
          }
          break;
        case "emit": tone("sine", 1318.5, t0, 0.003, 0, 0.42, 0.06, sfx, 0.45); tone("sine", 2637, t0, 0.003, 0, 0.12, 0.012, sfx, 0.3); break;
        case "arrive": tone("sine", 2349.3, t0, 0.002, 0, 0.05, 0.05, sfx, 0.1); break;
        case "measure": tone("sine", 1174.7, t0, 0.003, 0, 0.22, 0.05, sfx, 0.3); tone("sine", 880, t0 + 0.16, 0.003, 0, 0.3, 0.05, sfx, 0.3); break;
        case "marker":
          for (const k of [0, 0.16]) {
            const o = ctx.createOscillator(); o.type = "sine";
            o.frequency.setValueAtTime(700, t0 + k); o.frequency.exponentialRampToValueAtTime(520, t0 + k + 0.08);
            const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0 + k);
            g.gain.exponentialRampToValueAtTime(0.06, t0 + k + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + k + 0.12);
            o.connect(g).connect(sfx); o.start(t0 + k); o.stop(t0 + k + 0.15);
          }
          break;
        case "drop": tone("sine", 196, t0, 0.004, 0, 0.16, 0.08, sfx, 0.2); break;
        case "strike": noiseBurst(t0, 0.18, 0.05, "bandpass", 1800, 4200, sfx, 1.2); break;
        case "whoosh_in": noiseBurst(t0, at(2.4), 0.05, "lowpass", 250, 3200, sfx, 0.7); break;
        case "whoosh_out": noiseBurst(t0, at(1.4), 0.05, "lowpass", 3200, 250, sfx, 0.7); break;
        case "error":
          tone("sine", 293.66, t0, 0.3, 1.4, 0.9, 0.05, sfx, 0.3, -0.2);
          tone("sine", 311.13, t0, 0.3, 1.4, 0.9, 0.05, sfx, 0.3, 0.2);
          break;
        case "motif":
          MOTIF.forEach((f, i) => bell(f, t0 + i * SPB / 2, 0.13, (i - 1) * 0.25));
          break;
      }
    }

    const buf = await ctx.startRendering();
    return encodeWav(buf);
  }

  function encodeWav(buf) {
    const ch = buf.numberOfChannels, n = buf.length;
    const bytes = 44 + n * ch * 4;
    const ab = new ArrayBuffer(bytes);
    const v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, bytes - 8, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, ch, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * ch * 4, true); v.setUint16(32, ch * 4, true); v.setUint16(34, 32, true);
    w(36, "data"); v.setUint32(40, n * ch * 4, true);
    const data = [];
    for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { v.setFloat32(o, data[c][i], true); o += 4; }
    // base64 in chunks
    const u8 = new Uint8Array(ab);
    let s = "";
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }

  window.renderAudio = render;
})();
