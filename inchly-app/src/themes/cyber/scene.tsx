import {
  BlurMask, Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Rect, Skia, TileMode, vec, type SkPaint, type SkPath,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { type AlleyGeo, STREET } from './geo';
import { C } from './look';
import { NeonTubes, tubesOf } from './neon';

// The timer card's alley, in Skia (the parts bible's "雨の路地"): a night sky,
// soft city lights, the skyline with its windows (mostly warm, a few cool),
// a utility pole with sagging wires and a vending machine — the two lights
// of every Japanese back street — the tower the signs hang from, the
// subject's sign (neon tubes, or the box its acrylic panels sit in), the wet
// street with the sign's light streaked down it, and rain. Drawn in two
// canvases: the street, still (drawn once), and the rain over it with the
// vignette (the only part that moves; still with Reduce Motion, and only on
// the card in the middle). The words (the tenants, 勉強中, the HUD) are
// React Native over it (art.tsx).

export type SceneProps = {
  geo: AlleyGeo; color: string; hold: boolean;
  /** back: the street; front: the rain and the vignette */
  part: 'back' | 'front';
  /** the rain falls (the card in the middle) */
  rain?: boolean;
};

export default function Scene(p: SceneProps) {
  return p.part === 'back' ? <Street {...p} /> : <Rain {...p} />;
}

// ---------- the same every time (seeded) ----------
const lcg = (s0: number) => { let s = s0; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const chamfer = (w: number, h: number) => Skia.Path.MakeFromSVGString(`M10 0H${w}V${h}H0V10Z`)!;
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
/** Grey and dimmer: the whole street while the session is paused (grayscale .8, brightness .6). */
function holdPaint(): SkPaint {
  const g = 0.2, k = 0.6;
  const m = [
    0.2126 + 0.7874 * g, 0.7152 - 0.7152 * g, 0.0722 - 0.0722 * g, 0, 0,
    0.2126 - 0.2126 * g, 0.7152 + 0.2848 * g, 0.0722 - 0.0722 * g, 0, 0,
    0.2126 - 0.2126 * g, 0.7152 - 0.7152 * g, 0.0722 + 0.9278 * g, 0, 0,
    0, 0, 0, 1, 0,
  ].map((v, i) => (i < 15 && i % 5 < 3 ? v * k : v));
  const p = Skia.Paint();
  p.setColorFilter(Skia.ColorFilter.MakeMatrix(m));
  return p;
}
/** The reflection's streaks: the light drawn down the wet street (blurred a little across, a lot along). */
function streakPaint(): SkPaint {
  const p = Skia.Paint();
  p.setImageFilter(Skia.ImageFilter.MakeBlur(1.5, 6, TileMode.Decal, null));
  return p;
}

/** The skyline: a far row of blocks, a near row with windows on a grid (mostly dark; most lit ones warm, a few cool). */
function cityOf(w: number, top: number) {
  const rnd = lcg(31);
  const back = Skia.PathBuilder.Make(), ant = Skia.PathBuilder.Make(), front = Skia.PathBuilder.Make();
  // windows by color and three levels of light
  const win = [0, 1, 2].map(() => [Skia.PathBuilder.Make(), Skia.PathBuilder.Make()]);
  let x = 0;
  while (x < w) {
    const bw = 26 + Math.floor(rnd() * 40), bh = 90 + Math.floor(rnd() * 70);
    back.addRect(Skia.XYWHRect(x, top + 170 - bh, bw, bh));
    if (rnd() < 0.3) ant.addRect(Skia.XYWHRect(x + Math.floor(bw / 2), top + 170 - bh - 14, 1, 14));
    x += bw + 1;
  }
  x = -6;
  while (x < w) {
    const bw = 20 + 6 * Math.floor(rnd() * 5), bh = 40 + Math.floor(rnd() * 90), y = 170 - bh;
    front.addRect(Skia.XYWHRect(x, top + y, bw, bh));
    for (let wy = y + 6; wy < 164; wy += 7) for (let wx = x + 4; wx <= x + bw - 6; wx += 6) {
      if (rnd() < 0.12) {
        const warm = rnd() < 0.75, lvl = Math.min(2, Math.floor(rnd() * 3));
        win[lvl][warm ? 0 : 1].addRect(Skia.XYWHRect(wx, top + wy, 2, 2));
      }
    }
    x += bw + 2;
  }
  return { back: back.build(), ant: ant.build(), front: front.build(), win: win.map((p) => p.map((b) => b.build())) };
}
const WIN_OP = [0.42, 0.58, 0.74];

/** The pole and its wires: drawn on a 200 × 216 box stretched over the left half (the lines keep their width). */
function wiresOf(w: number, h: number) {
  const m = Skia.Matrix().scale((w * 0.52) / 200, (h - STREET) / 216);
  const at = (d: string) => Skia.PathBuilder.MakeFromPath(Skia.Path.MakeFromSVGString(d)!).transform(m).build();
  return {
    pole: at('M74 14V216 M58 36H92 M61 50H89'),
    wires: at('M58 36Q128 62 200 44 M92 36Q150 70 200 58 M61 50Q132 88 200 74 M0 58Q30 64 58 36 M0 80Q34 84 61 50'),
    shine: at('M58 35.2Q128 61.2 200 43.2 M92 35.2Q150 69.2 200 57.2 M61 49.2Q132 87.2 200 73.2'),
  };
}

/** Soft lights in the distance (blurred), warm and steel. */
function bokehOf(w: number, h: number) {
  const rnd = lcg(77);
  return Array.from({ length: 8 }, () => {
    const s = 6 + Math.floor(rnd() * 16), x = rnd() * 0.55 * w, y = (0.25 + rnd() * 0.5) * h;
    const c = ['#FFE3A6', '#6E8BB8', '#FFE3A6', '#3A5FB0'][Math.floor(rnd() * 4)], a = 0.2 + rnd() * 0.35;
    return { x: x + s / 2, y: y + s / 2, r: s / 2, c, a };
  });
}

/** Horizontal lines every `step`, `thick` high, over a box: scanlines. */
function linesOf(x: number, y: number, w: number, h: number, step: number, thick: number, vertical = false) {
  const b = Skia.PathBuilder.Make();
  if (vertical) for (let i = x; i < x + w; i += step) b.addRect(Skia.XYWHRect(i, y, thick, h));
  else for (let i = y; i < y + h; i += step) b.addRect(Skia.XYWHRect(x, i, w, thick));
  return b.build();
}

// ---------- the street ----------
function Street({ geo, color, hold }: SceneProps) {
  const { w, h, street0, L, sign } = geo;
  const clip = useMemo(() => chamfer(w, h), [w, h]);
  const city = useMemo(() => cityOf(w, h - STREET - 170), [w, h]);
  const wires = useMemo(() => wiresOf(w, h), [w, h]);
  const bokeh = useMemo(() => bokehOf(w, h), [w, h]);
  const tw = w - geo.towerX;
  const grid = useMemo(() => ({ h: linesOf(geo.towerX, 0, tw, street0, 20, 1), v: linesOf(geo.towerX, 0, tw, street0, 34, 1, true) }), [geo.towerX, tw, street0]);
  const ground = useMemo(() => linesOf(0, h - 64, w, 64, 4, 1), [w, h]);
  const wet = useMemo(() => linesOf(0, street0, w, STREET, 5, 2), [w, street0]);
  const tubes = useMemo(() => (L.plate || !L.tube ? [] : geo.cols.map((c) => ({ c, t: tubesOf(c.text, L.size) })).filter((x) => x.t)), [geo, L]);
  const grey = useMemo(() => (hold ? holdPaint() : undefined), [hold]);
  const streak = useMemo(() => streakPaint(), []);
  // the reflection: the sign as if it stood on the street, flipped down onto it and stretched
  const dy = street0 - sign.h - sign.y;
  const mirror = [{ translateY: street0 }, { scaleY: -1.4 }, { translateY: -street0 + dy }];
  const lit = !hold;
  return (
    <Canvas style={{ width: w, height: h }}>
      <Group clip={clip} layer={grey}>
        {/* the sky: dark blue-black, a little blue light from the upper left and steel from the right */}
        <Rect x={0} y={0} width={w} height={h}><LinearGradient start={vec(0, 0)} end={vec(0, h)} colors={['#0B1020', '#06070D', '#06070D']} positions={[0, 0.7, 1]} /></Rect>
        <Rect x={0} y={0} width={w} height={h}>
          <RadialGradient c={vec(w * 0.3, 0)} r={w * 1.2} colors={['rgba(58,107,255,0.22)', 'rgba(58,107,255,0)']} positions={[0, 0.6]} transform={[{ scaleY: (h * 0.7) / (w * 1.2) }]} origin={vec(w * 0.3, 0)} />
        </Rect>
        <Rect x={0} y={0} width={w} height={h}>
          <RadialGradient c={vec(w * 0.85, h * 0.2)} r={w * 0.9} colors={['rgba(110,139,184,0.16)', 'rgba(110,139,184,0)']} positions={[0, 0.6]} transform={[{ scaleY: (h * 0.6) / (w * 0.9) }]} origin={vec(w * 0.85, h * 0.2)} />
        </Rect>
        <Group opacity={0.7}>
          {bokeh.map((b, i) => <Circle key={i} cx={b.x} cy={b.y} r={b.r} color={b.c} opacity={b.a}><BlurMask blur={5} style="normal" /></Circle>)}
        </Group>
        {/* the city */}
        <Path path={city.back} color="#0B1222" />
        <Path path={city.ant} color="#16213A" />
        <Path path={city.front} color="#060912" />
        {city.win.map((pair, lvl) => pair.map((p, k) => <Path key={`${lvl}-${k}`} path={p} color={k ? '#9FB4D6' : C.warm} opacity={WIN_OP[lvl]} />))}
        {/* the pole and its wires */}
        <Path path={wires.pole} style="stroke" strokeWidth={3} color="#03050A" />
        <Path path={wires.wires} style="stroke" strokeWidth={1} color="#03050A" />
        <Path path={wires.shine} style="stroke" strokeWidth={1} color="rgba(110,139,184,0.32)" />
        {/* the tower the signs hang from */}
        <Rect x={geo.towerX} y={0} width={tw} height={street0}>
          <LinearGradient start={vec(geo.towerX, 0)} end={vec(w, 0)} colors={['rgba(4,6,10,0)', '#070A11', '#090D15']} positions={[0, 0.14, 1]} />
        </Rect>
        <Path path={grid.h} color="rgba(255,255,255,0.022)" />
        <Path path={grid.v} color="rgba(255,255,255,0.018)" />
        {/* mist low over the street */}
        <Rect x={0} y={h - 120} width={w} height={90}>
          <LinearGradient start={vec(0, h - 120)} end={vec(0, h - 30)} colors={['rgba(80,120,160,0)', 'rgba(80,120,160,0.14)', 'rgba(80,120,160,0)']} />
        </Rect>
        {/* the sign: its box, the light it throws, its bolts, and its tubes (an acrylic box's panels are drawn over it, art.tsx) */}
        {lit ? <Rect x={sign.x} y={sign.y} width={sign.w} height={sign.h} color={rgba(color, 0.3)}><BlurMask blur={17} style="normal" /></Rect> : null}
        <Rect x={sign.x} y={sign.y} width={sign.w} height={sign.h} color="rgba(4,6,10,0.9)">
          {lit ? (
            <RadialGradient c={vec(sign.x + sign.w / 2, sign.y + sign.h / 2)} r={sign.w * 0.8} colors={[rgba(color, 0.22), 'rgba(4,6,10,0.88)']} positions={[0, 0.75]}
              transform={[{ scaleY: (sign.h * 0.7) / (sign.w * 0.8) }]} origin={vec(sign.x + sign.w / 2, sign.y + sign.h / 2)} />
          ) : null}
        </Rect>
        <Rect x={sign.x + 0.5} y={sign.y + 0.5} width={sign.w - 1} height={sign.h - 1} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.07)" />
        {[[3, 3], [sign.w - 7, 3], [3, sign.h - 7], [sign.w - 7, sign.h - 7]].map(([x, y]) => <Rect key={`${x}-${y}`} x={sign.x + x} y={sign.y + y} width={4} height={4} color="#2A3640" />)}
        {tubes.map(({ c, t }) => <NeonTubes key={c.text + c.x} tubes={t!} color={color} off={hold} x={c.x} y={c.y} />)}
        {/* the street */}
        <Rect x={0} y={h - 64} width={w} height={64}>
          <LinearGradient start={vec(0, h - 64)} end={vec(0, h)} colors={['rgba(11,17,25,0.35)', 'rgba(11,17,25,0.94)']} />
        </Rect>
        <Path path={ground} color="rgba(255,255,255,0.03)" />
        {/* the sign's light in the wet street, streaked downward and fading */}
        <Group clip={Skia.XYWHRect(0, street0, w, STREET)}>
          <Group layer>
            <Group transform={mirror} layer={streak} opacity={0.4}>
              {tubes.map(({ c, t }) => <NeonTubes key={c.text + c.x} tubes={t!} color={color} off={hold} x={c.x} y={c.y} />)}
              {!L.plate && !L.tube ? geo.cols.map((c) => <Rect key={c.text + c.x} x={c.x + 2} y={c.y + 2} width={c.w - 4} height={c.h - 4} color={lit ? '#F5E6C2' : '#262B31'} />) : null}
              {L.plate ? <Rect x={sign.x + 10} y={sign.y + 12} width={sign.w - 20} height={sign.h - 24} style="stroke" strokeWidth={3} color={lit ? color : '#2A3540'} /> : null}
            </Group>
            <Rect x={0} y={street0} width={w} height={STREET} blendMode="dstIn">
              <LinearGradient start={vec(0, street0)} end={vec(0, street0 + Math.max(24, sign.h * 0.98))} colors={['#000000', 'rgba(0,0,0,0)']} />
            </Rect>
          </Group>
          <Path path={wet} color="rgba(5,7,12,0.3)" />
        </Group>
        {/* streaks of light on the wet street: under the sign, 勉強中's red, the tenants' warm, the vending machine's white */}
        <Group opacity={0.45}>
          {lit ? <Rect x={w - (30 + L.w / 2 - 1) - 2} y={h - 4 - 46} width={2} height={46} color={color}><BlurMask blur={1.5} style="normal" /></Rect> : null}
          {lit ? <Rect x={w - (geo.open.vert ? 30 + L.w / 2 - 9 : 60) - 4} y={h - 30 - 20} width={4} height={20} color={C.r}><BlurMask blur={1.5} style="normal" /></Rect> : null}
          <Rect x={w - (geo.tenantRight + 10) - 2} y={h - 4 - 30} width={2} height={30} color={C.warm}><BlurMask blur={1.5} style="normal" /></Rect>
          <Rect x={30} y={h - 28 - 24} width={12} height={24} color="#DCEBFF"><BlurMask blur={1.5} style="normal" /></Rect>
        </Group>
        <Vending x={24} y={h - 54 - 36} />
      </Group>
    </Canvas>
  );
}

/** The vending machine: its lit front of drinks, its slot, and the cold light around it. */
function Vending({ x, y }: { x: number; y: number }) {
  const rows = useMemo(() => linesOf(x + 2, y + 3, 18, 17, 5.6, 1), [x, y]);
  const cols = useMemo(() => linesOf(x + 2, y + 3, 18, 17, 4, 1.4, true), [x, y]);
  return (
    <Group>
      <Rect x={x} y={y} width={22} height={36} color="rgba(205,225,255,0.3)"><BlurMask blur={11} style="normal" /></Rect>
      <Rect x={x} y={y} width={22} height={36} color="rgba(205,225,255,0.4)"><BlurMask blur={2} style="normal" /></Rect>
      <Rect x={x} y={y} width={22} height={36} color="#080B10" />
      <Rect x={x} y={y} width={22} height={36 * 0.62} color="#0D131B" />
      <Rect x={x + 2} y={y + 3} width={18} height={17} color="rgba(255,227,166,0.85)" />
      <Path path={rows} color="rgba(20,28,40,0.55)" />
      <Path path={cols} color="rgba(20,28,40,0.45)" />
      <Rect x={x + 0.5} y={y + 0.5} width={21} height={35} style="stroke" strokeWidth={1} color="#1C2733" />
      <Rect x={x + 4} y={y + 36 - 13} width={14} height={2} color="#222C38" />
      <Rect x={x + 4} y={y + 36 - 7} width={14} height={3} color="#000000" />
    </Group>
  );
}

// ---------- the rain ----------
/** Three depths of short slanted strokes: [tile, strokes per tile, length, strength, width, seed, seconds per tile]. */
const RAIN = [[90, 22, 6, 0.18, 0.8, 3, 1.1], [120, 14, 11, 0.26, 1, 5, 0.7], [160, 7, 17, 0.36, 1.3, 9, 0.45]] as const;
function rainPath(w: number, h: number, size: number, n: number, len: number, s0: number): SkPath {
  const rnd = lcg(s0);
  const tile = Array.from({ length: n }, () => [rnd() * size, rnd() * size] as const);
  const b = Skia.PathBuilder.Make();
  // a tile past every edge, so the sheet still covers the picture as it moves down and to the left by a tile
  for (let tx = -1; tx <= Math.ceil(w / size) + 1; tx++) for (let ty = -1; ty <= Math.ceil(h / size); ty++) {
    for (const [x, y] of tile) { const X = x + tx * size, Y = y + ty * size; b.moveTo(X, Y).lineTo(X - len * 0.22, Y + len); }
  }
  return b.build();
}

function Rain({ geo, hold, rain }: SceneProps) {
  const { w, h } = geo;
  const clip = useMemo(() => chamfer(w, h), [w, h]);
  const sheets = useMemo(() => RAIN.map(([size, n, len, op, sw, s0, dur]) => ({ path: rainPath(w, h, size, n, len, s0), size, op, sw, dur })), [w, h]);
  // seconds since the rain began; it stands still with Reduce Motion, and off the middle card
  const t = useSharedValue(0);
  const still = useReducedMotion();
  const frame = useFrameCallback((f) => { t.value = f.timeSinceFirstFrame / 1000; }, false);
  const go = !!rain && !still;
  useEffect(() => { frame.setActive(go); }, [go, frame]);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Group clip={clip}>
        <Group opacity={hold ? 0.6 : 1}>
          {sheets.map((s, i) => <Sheet key={i} {...s} t={t} />)}
        </Group>
        {/* the corners darker, the middle a little high (over the signs too) */}
        <Rect x={0} y={0} width={w} height={h}>
          <RadialGradient c={vec(w * 0.5, h * 0.4)} r={w * 1.2} colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']} positions={[0, 0.55, 1]}
            transform={[{ scaleY: (h * 0.9) / (w * 1.2) }]} origin={vec(w * 0.5, h * 0.4)} />
        </Rect>
      </Group>
    </Canvas>
  );
}
function Sheet({ path, size, op, sw, dur, t }: { path: SkPath; size: number; op: number; sw: number; dur: number; t: SharedValue<number> }) {
  const move = useDerivedValue(() => {
    const k = (t.value / dur) % 1;
    return [{ translateX: -size * 0.22 * k }, { translateY: size * k }];
  });
  return (
    <Group transform={move}>
      <Path path={path} style="stroke" strokeWidth={sw} strokeCap="round" color={`rgba(200,235,255,${op})`} />
    </Group>
  );
}
