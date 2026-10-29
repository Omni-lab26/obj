import { ReactNode, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Pattern as SvgPattern, Polygon, Rect, Stop } from 'react-native-svg';

import { faceFor } from '@/theme';
import { T } from '@/themes/kit';
import { Press } from '@/ui/base';
import { CIcon, type CIconName } from './icons';
import { C, type Pattern } from './look';
import { SMALL } from './sign';

// サイバー's small parts, after its parts bible: chamfered panels with a cyan
// edge, 4×4 terminals on the corners they keep and ticks down the left side;
// "/// MOD.01" labels; figures in Chakra Petch (each in a fixed cell when it
// ticks); station-number plates for subjects; LED cells that wear a
// subject's pattern; buttons cut at the bottom right with a mark on the left;
// acrylic sign boxes; barcodes and caution stripes.

// ---------- shapes ----------
export type Shape = 'f1' | 'f3' | 'btn' | 'tag';
/** The outline of a shape at a size: f1 cuts top left and bottom right, f3 top left, btn bottom right, tag both sides slanted. */
export function outline(shape: Shape, w: number, h: number, k: number, inset = 0) {
  const a = inset, kk = Math.min(k, w / 2, h / 2);
  const pts: [number, number][] = shape === 'f1' ? [[kk, a], [w - a, a], [w - a, h - kk], [w - kk, h - a], [a, h - a], [a, kk]]
    : shape === 'f3' ? [[kk, a], [w - a, a], [w - a, h - a], [a, h - a], [a, kk]]
    : shape === 'btn' ? [[a, a], [w - a, a], [w - a, h - kk], [w - kk, h - a], [a, h - a]]
    : [[kk, a], [w - a, a], [w - kk, h - a], [a, h - a]];
  return pts.map((p) => p.join(',')).join(' ');
}

export function useSize() {
  const [s, setS] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (!s || Math.abs(s.w - w) > 0.5 || Math.abs(s.h - h) > 0.5) setS({ w, h });
  };
  return [s, onLayout] as const;
}

/**
 * A shape's fill and edge, drawn behind what's in the box (place it first).
 * term: the 4×4 terminals on the corners it keeps; ticks: the marks down the
 * left edge; glow: the edge's light spilling out (0–1).
 */
let cutId = 0;
export function Cut({ shape = 'f1', k = 12, fill = C.panel, edge = C.ln2, term, ticks, glow = 0, points, grad }: {
  shape?: Shape; k?: number; fill?: string; edge?: string | null; term?: ('tr' | 'bl' | 'tl' | 'br')[]; ticks?: boolean; glow?: number;
  /** an outline of its own (w, h → "x,y x,y …"), instead of the shape */
  points?: (w: number, h: number, inset: number) => string;
  /** a fill that runs left to right instead: [offset, color] stops */
  grad?: [number, string][];
}) {
  const [s, onLayout] = useSize();
  const [id] = useState(() => `cut${++cutId}`);
  const pts = (inset: number) => (s ? (points ? points(s.w, s.h, inset) : outline(shape, s.w, s.h, k, inset)) : '');
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {s ? (
        <Svg width={s.w} height={s.h} style={{ overflow: 'visible' }}>
          {grad ? <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">{grad.map(([o, c]) => <Stop key={o} offset={o} stopColor={c} />)}</LinearGradient></Defs> : null}
          {glow && edge ? <Polygon points={pts(0)} fill="none" stroke={edge} strokeWidth={5} opacity={glow * 0.35} /> : null}
          <Polygon points={pts(edge ? 0.5 : 0)} fill={grad ? `url(#${id})` : fill} stroke={edge ?? 'none'} strokeWidth={edge ? 1 : 0} />
          {ticks ? <G stroke={C.ln2} strokeWidth={1}>{[0, 1, 2, 3, 4, 5, 6].map((i) => <Line key={i} x1={1} x2={5} y1={k + 18 + i * 5 + 0.5} y2={k + 18 + i * 5 + 0.5} />)}</G> : null}
          {(term ?? []).map((c) => <Rect key={c} x={c[1] === 'r' ? s.w - 4 : 0} y={c[0] === 'b' ? s.h - 4 : 0} width={4} height={4} fill={C.c} />)}
        </Svg>
      ) : null}
    </View>
  );
}

/** F1: the everyday panel. Two corners cut, a cyan edge, terminals and ticks. */
export function Panel({ children, pad = 14, k = 12, fill = C.panel, edge = C.ln2, ticks = true, style }: {
  children?: ReactNode; pad?: number; k?: number; fill?: string; edge?: string | null; ticks?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ padding: pad }, style]}>
      <Cut shape="f1" k={k} fill={fill} edge={edge} term={['tr', 'bl']} ticks={ticks} />
      {children}
    </View>
  );
}

// ---------- type ----------
/** Figures and Latin in Chakra Petch (corners cut like the panels). `cell`: each character in a fixed box, so a ticking clock never jitters. */
export function D({ children, size = 16, color = C.t1, cell, med, style, ...rest }: TextProps & { children: string | number; size?: number; color?: string; cell?: boolean; med?: boolean }) {
  const s = String(children);
  if (!cell) return <T {...rest} f={med ? 'chakraMed' : 'chakra'} size={size} color={color} lh={Math.round(size * 1.12)} style={style}>{s}</T>;
  // Chakra Petch has no tabular figures: a digit takes .62em, a colon .27em, anything else .42em
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline' }, style as StyleProp<ViewStyle>]} accessible accessibilityLabel={s}>
      {[...s].map((c, i) => (
        <T key={i} f={med ? 'chakraMed' : 'chakra'} size={size} color={color} lh={Math.round(size * 1.12)} style={{ width: size * cellW(c), textAlign: 'center' }}>{c}</T>
      ))}
    </View>
  );
}
/** A character's fixed cell in a clock, as a share of the size. */
export const cellW = (c: string) => (/\d/.test(c) ? 0.62 : c === ':' ? 0.27 : 0.42);

/** A label in the narrow mono (Latin only; decorative, its meaning is always said in Japanese too). */
export function Mono({ children, size = 10.5, color = C.t3, ls = 0.12, style, ...rest }: TextProps & { children: ReactNode; size?: number; color?: string; ls?: number }) {
  return <T {...rest} f="techMono" size={size} color={color} ls={size * ls} lh={Math.round(size * 1.35)} numberOfLines={1} style={style}>{children}</T>;
}

/** Japanese: the system face (Hiragino on the phone), at a weight. */
export function J({ size = 14, color = C.t1, w = '500', lh, style, ...rest }: TextProps & { size?: number; color?: string; w?: TextStyle['fontWeight']; lh?: number }) {
  return <Text {...rest} style={[{ fontFamily: faceFor('system', size), fontSize: size, fontWeight: w, color, lineHeight: lh ?? Math.round(size * 1.45) }, style]} />;
}

/** A panel's head: "/// MOD.01" in yellow and cyan, the Japanese name, and something on the right. */
export function Head({ mod, name, right }: { mod: string; name: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 20 }}>
      <Mono color={C.y} size={11} ls={0}>{'///'}</Mono>
      <Mono color={C.c} size={10.5}>{mod}</Mono>
      <J size={13} w="700" numberOfLines={1} style={{ flexShrink: 1 }} accessibilityRole="header">{name}</J>
      <View style={{ flex: 1 }} />
      {typeof right === 'string' ? <Mono size={10.5}>{right}</Mono> : right}
    </View>
  );
}

/** A subject's number plate, like station numbering: its code over its number, ringed in its color. */
export function Plate({ code, no, color, size = 22 }: { code: string; no: string; color: string; size?: number }) {
  const k = Math.round(size * 0.18);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Polygon points={outline('f3', size, size, k, 0.75)} fill="#070B10" stroke={color} strokeWidth={1.5} />
      </Svg>
      <T f="techMono" size={size * 0.39} color={color} lh={Math.round(size * 0.4)} ls={0.2}>{code}</T>
      <T f="techMono" size={size * 0.34} color={C.t2} lh={Math.round(size * 0.36)}>{no}</T>
    </View>
  );
}

/** "● 計測中": what's running, as a recorder's light (red); paused, the light goes out. */
export function Rec({ label, on = true, color = C.r, size = 11 }: { label: string; on?: boolean; color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 7, height: 7, backgroundColor: color, boxShadow: on ? `0px 0px 6px ${color}` : undefined }} />
      <J size={size} w="700" color={color} lh={Math.round(size * 1.3)}>{label}</J>
    </View>
  );
}

// ---------- controls ----------
/**
 * A button, cut at the bottom right with a mark on its left edge. pri: yellow
 * (the one that matters most); sec: a cyan edge; ysec: a yellow edge (adding,
 * going ahead); ink: black on the yellow band; danger: red.
 */
export function Btn({ label, onPress, kind = 'pri', small, wide, icon, disabled, a11y }: {
  label: string; onPress: () => void; kind?: 'pri' | 'sec' | 'ysec' | 'ink' | 'danger'; small?: boolean; wide?: boolean; icon?: CIconName; disabled?: boolean; a11y?: string;
}) {
  const fg = disabled ? C.t3 : kind === 'pri' ? '#000' : kind === 'sec' ? C.c : kind === 'ysec' ? C.y : kind === 'ink' ? '#000' : C.r;
  const fill = disabled ? (kind === 'pri' ? C.panel3 : 'transparent') : kind === 'pri' ? C.y : kind === 'sec' ? 'rgba(0,240,255,0.05)' : kind === 'ysec' ? 'rgba(252,238,10,0.05)' : kind === 'ink' ? 'rgba(0,0,0,0.06)' : 'rgba(255,45,85,0.06)';
  const edge = kind === 'pri' && !disabled ? null : disabled ? C.steel : fg;
  const h = small ? 34 : 46;
  return (
    <Press onPress={onPress} disabled={disabled} scale={0.97} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      style={{ height: h, paddingLeft: small ? 20 : 30, paddingRight: small ? 16 : 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: wide ? 'stretch' : 'flex-start' }}>
      <Cut shape="btn" k={small ? 9 : 12} fill={fill} edge={edge} />
      {/* the mark on the left edge */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: h / 2 - (small ? 4.5 : 6), width: small ? 7 : 10, height: small ? 9 : 12, borderTopWidth: small ? 1.5 : 2, borderBottomWidth: small ? 1.5 : 2, borderColor: kind === 'pri' && !disabled ? 'rgba(0,0,0,0.6)' : fg, opacity: 0.9 }} />
      {icon ? <CIcon name={icon} size={small ? 14 : 16} color={fg} accent={fg} /> : null}
      <J size={small ? 13 : 15} w="700" color={fg} numberOfLines={1} style={{ letterSpacing: small ? 0.4 : 0.9 }}>{label}</J>
    </Press>
  );
}

/** A square icon button with its top left corner cut. y: a yellow icon; yp: yellow filled; ink: black, on the yellow band. badge: a count in red. */
export function Ib({ name, onPress, label, kind, size = 40, badge }: { name: CIconName; onPress: () => void; label: string; kind?: 'y' | 'yp' | 'ink' | 'c'; size?: number; badge?: number }) {
  const fg = kind === 'y' || kind === 'ink' ? C.y : kind === 'yp' ? '#000' : kind === 'c' ? C.c : C.t1;
  const fill = kind === 'yp' ? C.y : kind === 'ink' ? '#000' : C.panel2;
  const edge = kind === 'yp' || kind === 'ink' ? null : C.ln2;
  return (
    <Press onPress={onPress} scale={0.92} hitSlop={4} accessibilityRole="button" accessibilityLabel={badge ? `${label} ${badge}件` : label}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Cut shape="f3" k={Math.round(size * 0.2)} fill={fill} edge={edge} />
      <CIcon name={name} size={Math.round(size * 0.5)} color={fg} accent={kind === 'yp' ? '#000' : kind ? C.y : C.c} />
      {badge ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: 2, top: 2, minWidth: 15, height: 13, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' }}>
          <Cut shape="f3" k={3} fill={C.r} edge={null} />
          <T f="chakra" size={10} color="#fff" lh={12}>{String(Math.min(99, badge))}</T>
        </View>
      ) : null}
    </Press>
  );
}

/** A person: a hexagon with their initial, ringed in cyan while they study (no colors of their own: only state shows). */
export function Avatar({ name, size = 44, live, me }: { name: string; size?: number; live?: boolean; me?: boolean }) {
  const pts = (i: number) => `${size * 0.25},${i} ${size * 0.75},${i} ${size - i},${size / 2} ${size * 0.75},${size - i} ${size * 0.25},${size - i} ${i},${size / 2}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Polygon points={pts(0)} fill={me ? '#262300' : '#13202A'} />
        {live ? <Polygon points={pts(1)} fill="none" stroke={C.c} strokeWidth={2} /> : null}
      </Svg>
      <J size={Math.round(size * 0.36)} w="700" color={me ? C.y : C.t1} lh={Math.round(size * 0.5)}>{[...name][0] ?? ''}</J>
    </View>
  );
}

// ---------- LED cells ----------
/** One LED cell: a subject's color and pattern, free study (hatched), or off. */
export type Cell = { c: string; p: Pattern; now?: boolean } | 'free' | null;
const PAT: Record<Exclude<Pattern, 'none'>, (id: string) => ReactNode> = {
  v: (id) => <SvgPattern key={id} id={id} width={3} height={3} patternUnits="userSpaceOnUse"><Rect x={0} y={0} width={1} height={3} fill="rgba(0,0,0,0.42)" /></SvgPattern>,
  h: (id) => <SvgPattern key={id} id={id} width={3} height={3} patternUnits="userSpaceOnUse"><Rect x={0} y={0} width={3} height={1} fill="rgba(0,0,0,0.42)" /></SvgPattern>,
  dots: (id) => <SvgPattern key={id} id={id} width={3} height={3} patternUnits="userSpaceOnUse"><Rect x={1} y={1} width={1.2} height={1.2} fill="rgba(0,0,0,0.5)" /></SvgPattern>,
  check: (id) => <SvgPattern key={id} id={id} width={4} height={4} patternUnits="userSpaceOnUse"><Rect x={0} y={0} width={2} height={2} fill="rgba(0,0,0,0.38)" /><Rect x={2} y={2} width={2} height={2} fill="rgba(0,0,0,0.38)" /></SvgPattern>,
  hatch: (id) => <SvgPattern key={id} id={id} width={4} height={4} patternUnits="userSpaceOnUse"><Line x1={0} y1={4} x2={4} y2={0} stroke="rgba(0,0,0,0.4)" strokeWidth={1} /></SvgPattern>,
};
let cellsId = 0;
/**
 * A row of skewed LED cells (the day's tape, a meter). What's running glows;
 * finished cells step back a little. Drawn in one SVG for the whole row.
 */
export function Cells({ cells, h = 18, gap = 3, off = '#142029', skew = 0.45 }: { cells: Cell[]; h?: number; gap?: number; off?: string; skew?: number }) {
  const [s, onLayout] = useSize();
  const [id] = useState(() => `c${++cellsId}`);
  const n = cells.length, sk = h * skew;
  const w = s ? (s.w - sk - gap * (n - 1)) / n : 0;
  return (
    <View style={{ height: h }} onLayout={onLayout}>
      {s ? (
        <Svg width={s.w} height={h}>
          <Defs>
            {(Object.keys(PAT) as Exclude<Pattern, 'none'>[]).map((p) => PAT[p](`${id}-${p}`))}
            <SvgPattern id={`${id}-free`} width={4} height={4} patternUnits="userSpaceOnUse"><Line x1={0} y1={4} x2={4} y2={0} stroke="#6B8087" strokeWidth={1.4} /></SvgPattern>
          </Defs>
          {cells.map((x, i) => {
            const x0 = i * (w + gap);
            const pts = `${x0 + sk},0 ${x0 + sk + w},0 ${x0 + w},${h} ${x0},${h}`;
            if (!x) return <Polygon key={i} points={pts} fill={off} />;
            if (x === 'free') return <Polygon key={i} points={pts} fill={`url(#${id}-free)`} />;
            return (
              <G key={i} opacity={x.now === false ? 0.82 : 1}>
                <Polygon points={pts} fill={x.c} />
                {x.p !== 'none' ? <Polygon points={pts} fill={`url(#${id}-${x.p})`} /> : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

// ---------- signs ----------
/** A color greyed and darkened, as the street looks while the session is paused (keepHue: only darkened, to `dark` of itself). */
export function holdColor(hex: string, dark = 0.6, keepHue = false) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const out = [r, g, b].map((v) => Math.round((keepHue ? v : 0.2 * v + 0.8 * y) * dark));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
/**
 * A lit acrylic sign: each character its own panel, lit from inside (dead
 * ones dark), so one can be out. tint: the subject's color as a band along
 * the top of each panel. hold: the street paused (grey, dimmer).
 */
export function Lightbox({ text, size, vert = true, off, dead = [], tint, hold }: { text: string; size: number; vert?: boolean; off?: boolean; dead?: number[]; tint?: string; hold?: boolean }) {
  const box = Math.round(size * 1.3);
  const top = hold ? holdColor('#FFF4DA') : '#FFF4DA', bottom = hold ? holdColor('#EBD9AE') : '#EBD9AE';
  return (
    <View accessible accessibilityLabel={text} style={{ flexDirection: vert ? 'column' : 'row', gap: 2, padding: 2, backgroundColor: '#07090D', boxShadow: 'inset 0px 0px 0px 1px rgba(255,255,255,0.08), 0px 0px 0px 1px #000000' }}>
      {[...text].map((c, i) => {
        const lit = !off && !dead.includes(i);
        const glow = hold ? 'rgba(150,150,150,0.18)' : tint ? `${tint}99` : 'rgba(255,227,166,0.42)';
        return (
          <View key={i} style={[{ width: box, height: box, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
            lit ? { backgroundImage: `linear-gradient(${top}, ${bottom})`, boxShadow: `0px 0px 12px ${glow}` } : { backgroundImage: 'linear-gradient(#262B31, #1C2026)', boxShadow: 'inset 0px 0px 0px 1px rgba(255,255,255,0.05)' }]}>
            {/* the band a little darker than the subject's color, so even 化学's silver reads against the cream */}
            {lit && tint ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, backgroundColor: holdColor(tint, hold ? 0.6 : 0.62, !hold) }} /> : null}
            <Text style={[{ fontFamily: faceFor('system', size), fontSize: size, fontWeight: '700', lineHeight: box, textAlign: 'center', color: lit ? '#1A1206' : '#474D55' },
              vert && c === 'ー' ? { transform: [{ rotate: '90deg' }] } : vert && SMALL.includes(c) ? { transform: [{ translateX: size * 0.1 }, { translateY: -size * 0.12 }] } : null]}>{c}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------- marks ----------
/** A barcode, for the corners of things. */
export function Barcode({ n = 24, h = 12, color = C.t3 }: { n?: number; h?: number; color?: string }) {
  const bars = Array.from({ length: n }, (_, i) => [1, 2, 1, 3, 1, 1, 2, 1, 2][(i * 7 + 3) % 9]);
  const w = bars.reduce((a, b) => a + b + 1, 0);
  let x = 0;
  return (
    <Svg width={w} height={h} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((b, i) => { const r = <Rect key={i} x={x} y={0} width={b} height={h} fill={color} />; x += b + 1; return r; })}
    </Svg>
  );
}

/** Yellow and black caution stripes (only for what really needs care: a session on hold). */
export function Hazard({ h = 12, style, color = C.y }: { h?: number; style?: StyleProp<ViewStyle>; color?: string }) {
  const [s, onLayout] = useSize();
  return (
    <View style={[{ height: h, overflow: 'hidden', backgroundColor: color }, style]} onLayout={onLayout}>
      {s ? (
        <Svg width={s.w} height={h}>
          {Array.from({ length: Math.ceil((s.w + h) / 14) + 1 }, (_, i) => <Polygon key={i} points={`${i * 14},0 ${i * 14 + 7},0 ${i * 14 + 7 - h},${h} ${i * 14 - h},${h}`} fill="#000" />)}
        </Svg>
      ) : null}
    </View>
  );
}
