import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, View, ViewStyle } from 'react-native';
import Animated, { Easing, SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { pad } from '../data';
import { dayOf, grassOf } from '../lib/history';
import { useStore } from '../store';
import { useT } from '../theme';
import { useAppear } from './appear';
import { haptic, Txt } from './base';
import { fadeIn, fadeOut } from './motion';

// GitHub-style grass. Columns are weeks, rows are days. Press (or press and
// drag) on the grid to read the date and time of a day. When it appears (and
// when its page comes back) each square flips over like a card, grey side
// first, its green on the back — a wave from the top left. `square`: square
// cells on a faint edge and today in a 2pt ink frame (スタンダード's grass).

const GUTTER = 18; // weekday labels
const EDGE = 'inset 0px 0px 0px 1px rgba(23,18,31,0.1)'; // a square cell's faint edge
const MONTH_H = 16; // month labels

export function Heatmap({ weeks, gap = 3, legend = true, labels = true, square }: { weeks: number; gap?: number; legend?: boolean; labels?: boolean; square?: boolean }) {
  const t = useT();
  const appear = useAppear(80, 1000, Easing.linear); // the squares flip over like cards, a wave from the top left
  const sessions = useStore((s) => s.sessions);
  const lastDay = useStore((s) => s.lastDay); // a new day redraws the grass
  const cells = useMemo(() => grassOf(sessions, weeks), [sessions, weeks, lastDay]); // eslint-disable-line react-hooks/exhaustive-deps
  const [w, setW] = useState(0);
  const [hot, setHot] = useState<number | null>(null);
  const size = w ? (w - gap * (weeks - 1)) / weeks : 0;
  const geo = useRef({ size: 0, gap });
  useEffect(() => { geo.current = { size, gap }; }, [size, gap]);
  const last = useRef<number | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout>>(undefined);

  const at = (x: number, y: number) => {
    const { size: s, gap: g } = geo.current;
    if (!s) return null;
    const col = Math.max(0, Math.min(weeks - 1, Math.floor(x / (s + g))));
    const row = Math.max(0, Math.min(6, Math.floor(y / (s + g))));
    return col * 7 + row;
  };
  const show = (i: number | null) => {
    if (i !== null && i !== last.current) haptic.tap();
    last.current = i;
    setHot(i);
  };
  // The responder is created once; its handlers read refs only when a gesture fires, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (e) => { clearTimeout(hide.current); show(at(e.nativeEvent.locationX, e.nativeEvent.locationY)); },
      onPanResponderMove: (e) => show(at(e.nativeEvent.locationX, e.nativeEvent.locationY)),
      onPanResponderRelease: () => { hide.current = setTimeout(() => show(null), 1400); },
      onPanResponderTerminate: () => { hide.current = setTimeout(() => show(null), 600); },
    }),
  );

  let tip: { text: string; x: number; y: number } | null = null;
  if (hot !== null && size) {
    const n = weeks * 7;
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - hot));
    const l = cells[hot];
    const m = l ? dayOf(sessions, n - 1 - hot).min : 0;
    const col = Math.floor(hot / 7), row = hot % 7;
    tip = {
      text: `${d.getMonth() + 1}月${d.getDate()}日 · ${m ? `${Math.floor(m / 60)}時間${pad(m % 60)}分` : '記録なし'}`,
      x: (labels ? GUTTER : 0) + Math.min(w - 76, Math.max(76, col * (size + gap) + size / 2)),
      y: (labels ? MONTH_H : 0) + row * (size + gap),
    };
  }

  // Axis labels, like GitHub: month names over the first column of each month, 月・水・金 on the left.
  const n = weeks * 7;
  const start = new Date();
  start.setDate(start.getDate() - (n - 1));
  const months: { x: number; label: string }[] = [];
  if (labels && size) {
    let prev = -1;
    for (let c = 0; c < weeks; c++) {
      const d = new Date(start);
      d.setDate(start.getDate() + c * 7);
      const x = c * (size + gap);
      if (d.getMonth() !== prev && (!months.length || x - months[months.length - 1].x > 30)) months.push({ x, label: `${d.getMonth() + 1}月` });
      prev = d.getMonth();
    }
  }
  const dowLabel = (r: number) => ['日', '月', '火', '水', '木', '金', '土'][(start.getDay() + r) % 7];

  return (
    <View>
      {labels ? (
        <View style={{ height: MONTH_H, marginLeft: GUTTER }} pointerEvents="none">
          {months.map((m) => <Txt key={m.label + m.x} size={10.5} tone="ink3" lh={12} style={{ position: 'absolute', left: m.x, top: 0 }}>{m.label}</Txt>)}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row' }}>
      {labels ? (
        <View style={{ width: GUTTER }} pointerEvents="none">
          {size ? Array.from({ length: 7 }, (_, r) => (['月', '水', '金'].includes(dowLabel(r)) ? (
            <Txt key={r} size={10} tone="ink3" lh={12} style={{ position: 'absolute', top: r * (size + gap) + size / 2 - 6, left: 0 }}>{dowLabel(r)}</Txt>
          ) : null)) : null}
        </View>
      ) : null}
      {/* cells ignore touches so locationX/Y are relative to the whole grid */}
      <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers} accessibilityLabel={`${weeks}週間の勉強記録`}>
      <View pointerEvents="none" style={{ flexDirection: 'row', gap }}>
        {size
          ? Array.from({ length: weeks }, (_, c) => (
              <View key={c} style={{ gap }}>
                {cells.slice(c * 7, c * 7 + 7).map((l, r) => {
                  const i = c * 7 + r;
                  return (
                    <Flip key={r} p={appear} at={((c + r * 0.6) / (weeks + 4)) * 0.8} color={t.grass[l]} blank={t.grass[0]}
                      style={square
                        ? { width: size, height: size, borderWidth: i === cells.length - 1 || hot === i ? 2 : 0, borderColor: t.ink, boxShadow: EDGE }
                        : { width: size, height: size, borderRadius: Math.min(4, size * 0.22), borderWidth: i === cells.length - 1 || hot === i ? 1.5 : 0, borderColor: t.ink }} />
                  );
                })}
              </View>
            ))
          : null}
      </View>
      </View>
      </View>
      {tip ? (
        <Animated.View entering={fadeIn()} exiting={fadeOut()} pointerEvents="none"
          style={{ position: 'absolute', left: tip.x - 76, top: tip.y - 38, width: 152, alignItems: 'center' }}>
          <View style={{ backgroundColor: t.ink, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Txt size={12} w="600" color={t.onInk} num>{tip.text}</Txt>
          </View>
        </Animated.View>
      ) : null}
      {legend ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <View />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Txt size={11} tone="ink3">少</Txt>
            {t.grass.map((c) => <View key={c} style={square ? { width: 11, height: 11, backgroundColor: c, boxShadow: EDGE } : { width: 10, height: 10, borderRadius: 2.5, backgroundColor: c }} />)}
            <Txt size={11} tone="ink3">多</Txt>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** A square that flips over like a card when its turn comes (at, on the 0→1 timeline): blank on the front, its color on the back. */
function Flip({ p, at, color, blank, style }: { p: SharedValue<number>; at: number; color: string; blank: string; style: ViewStyle }) {
  const a = useAnimatedStyle(() => {
    const raw = Math.max(0, Math.min(1, (p.value - at) / 0.25));
    const k = raw * raw * (3 - 2 * raw); // each flip starts and lands softly, never past flat
    const back = k >= 0.5;
    // the front turns away to its edge, then the back turns in from the other side
    const deg = back ? (k - 1) * 180 : k * 180;
    return { backgroundColor: back ? color : blank, transform: [{ perspective: 220 }, { rotateY: `${deg}deg` }] };
  });
  return <Animated.View style={[style, a]} />;
}
