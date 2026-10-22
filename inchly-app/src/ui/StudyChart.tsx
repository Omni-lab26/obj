import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { pad, SUBJ } from '../data';
import { hourlyOf, weekOf, withLive } from '../lib/history';
import { dateKey } from '../lib/time';
import { ChartKind, ChartPalette, elapsedOf, setChart, useNow, useStore } from '../store';
import { ease, hair, useT } from '../theme';
import { Btn, Card, haptic, Press, Txt } from './base';
import { Icon } from './Icon';
import { openSheet } from './Sheet';
import { Segmented } from './Tabs';

// Home's study-time card: today hour by hour (24 vertical bars) or this week
// day by day (7), switched with 日 / 週. The gear at the top right picks the
// chart (bars, by subject, line) and its color. Tap a bar for its numbers.
// Never green: green is the grass.

/** Subject colors for charts — 国語's yellow is deepened so it holds on white. */
const SUBJ_C = SUBJ.map((x) => (x.id === 'ja' ? '#D9A300' : x.c));
export const PALETTES: Record<ChartPalette, { label: string; c: string }> = {
  ink: { label: 'インク', c: '#121417' },
  blue: { label: 'ブルー', c: '#2F6BFF' },
  orange: { label: 'オレンジ', c: '#F07B1D' },
  grape: { label: 'グレープ', c: '#8B5CF6' },
};
const KINDS: { v: ChartKind; label: string }[] = [
  { v: 'stack', label: '科目別' },
  { v: 'bar', label: '棒' },
  { v: 'line', label: '折れ線' },
];

const PLOT = 132;
const DOW = ['月', '火', '水', '木', '金', '土', '日'];
const hm = (m: number) => `${Math.floor(m / 60)}:${pad(Math.round(m) % 60)}`;
const jpHm = (m: number) => {
  const r = Math.round(m);
  return r >= 60 ? `${Math.floor(r / 60)}時間${r % 60 ? `${r % 60}分` : ''}` : `${r}分`;
};

type Col = { label: string; parts: number[]; live: number; total: number; future: boolean; now: boolean };

export function StudyChartCard() {
  const t = useT();
  const now = useNow(30_000);
  const chart = useStore((s) => s.chart);
  const sessions = useStore((s) => s.sessions);
  const goalMin = useStore((s) => s.goalMin);
  const running = useStore((s) => s.running);
  const subjId = useStore((s) => s.subj);
  const elapsed = useStore((s) => elapsedOf(s, now));
  // the tapped column, forgotten when the range or kind changes
  const [picked, setPicked] = useState<{ k: string; i: number } | null>(null);
  const view = `${chart.range}:${chart.kind}`;
  const sel = picked?.k === view ? picked.i : null;
  const [w, setW] = useState(0);
  const day = chart.range === 'day';
  const d = new Date(now);
  const today = dateKey(d);
  const liveMin = running ? elapsed / 60 : 0;
  const sk = SUBJ.findIndex((x) => x.id === subjId);

  const cols: Col[] = useMemo(() => {
    if (day) {
      const rec = hourlyOf(sessions, today);
      const all = running ? withLive(rec, now - elapsed * 1000, now, today, subjId) : rec;
      return rec.min.map((m, h) => ({
        label: h % 6 === 0 ? `${h}` : '', parts: rec.parts[h], live: all.min[h] - m, total: all.min[h],
        future: h > d.getHours(), now: h === d.getHours(),
      }));
    }
    return weekOf(sessions, d).map((x, i) => {
      const isToday = x.date === today;
      const live = isToday ? liveMin : 0;
      return { label: DOW[i], parts: x.parts, live, total: x.min + live, future: x.date > today, now: isToday };
    });
    // d and liveMin follow now and elapsed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, sessions, today, running, now, elapsed, subjId]);

  // the plot regrows when the range or kind changes
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.set(0);
    grow.set(withTiming(1, { duration: 420, easing: ease.out }));
  }, [chart.range, chart.kind, grow]);
  const growA = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.get() }], transformOrigin: 'bottom' }));

  // the figure is what's recorded (the same as home's card); the running timer is shown beside it
  const total = cols.reduce((a, c) => a + c.total - c.live, 0);
  const liveNow = cols.reduce((a, c) => a + c.live, 0);
  const max = day ? 60 : Math.max(goalMin, ...cols.map((c) => c.total)) * 1.08;
  const yOf = (m: number) => (Math.min(m, max) / max) * PLOT;
  const main = PALETTES[chart.palette].c;
  const n = cols.length;
  const gap = day ? 2 : 10;
  const bw = w ? (w - gap * (n - 1)) / n : 0;
  const pick = (i: number) => { haptic.tap(); setPicked(sel === i ? null : { k: view, i }); };

  // the line under the figure: the tapped bar, or a short summary
  const studied = cols.filter((c) => c.total > 0 && !c.future);
  const peak = cols.reduce((b, c, i) => (c.total > cols[b].total ? i : b), 0);
  let note: string;
  if (sel !== null) {
    const c = cols[sel];
    const by = c.parts.map((m, k) => (m >= 1 ? `${SUBJ[k].name} ${Math.round(m)}` : '')).filter(Boolean);
    if (c.live >= 1) by.push(`勉強中 ${Math.round(c.live)}`);
    note = `${day ? `${sel}時台` : `${DOW[sel]}曜`} · ${jpHm(c.total)}${by.length ? `（${by.join(' / ')}）` : ''}`;
  } else if (day) {
    note = total ? `いちばん長いのは ${peak}時台 · ${jpHm(cols[peak].total)}` : 'まだ記録がありません';
  } else {
    note = studied.length ? `1日平均 ${hm(total / Math.max(1, d.getDay() === 0 ? 7 : d.getDay()))} · ${studied.length}日勉強` : '今週はまだ記録がありません';
  }

  const usedSubj = SUBJ.map((x, k) => ({ ...x, c: SUBJ_C[k], on: cols.some((c) => c.parts[k] > 0) || (running && k === sk && liveMin > 0) })).filter((x) => x.on);

  return (
    <Card style={{ marginHorizontal: 16, marginTop: 12 }} pad={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt size={13} w="600" tone="ink2" style={{ flex: 1 }}>{day ? '今日の勉強時間' : '今週の勉強時間'}</Txt>
        <Segmented small value={chart.range} onChange={(v) => setChart({ range: v })} options={[{ v: 'day', label: '日' }, { v: 'week', label: '週' }]}
          style={{ backgroundColor: t.sunken, padding: 2 }} />
        <Press onPress={chartSettings} scale={0.9} hitSlop={8} accessibilityLabel="グラフの設定"
          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="gear" size={15} color={t.ink2} />
        </Press>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }} accessible accessibilityLabel={`${day ? '今日' : '今週'} ${jpHm(total)}`}>
        <Txt num size={28} w="700" lh={34}>{Math.floor(total / 60)}</Txt>
        <Txt size={12} w="600" tone="ink3">時間</Txt>
        <Txt num size={28} w="700" lh={34}>{pad(Math.floor(total) % 60)}</Txt>
        <Txt size={12} w="600" tone="ink3">分</Txt>
        {running && liveNow >= 1 ? <Txt size={11} w="600" tone="ink3" style={{ marginLeft: 6 }}>{`＋勉強中 ${jpHm(liveNow)}`}</Txt> : null}
      </View>
      <Txt size={11.5} tone={sel === null ? 'ink3' : 'ink'} w={sel === null ? '400' : '600'} numberOfLines={1} style={{ marginTop: 2 }}>{note}</Txt>

      {/* the plot: recessive grid, labels on the right edge */}
      <View style={{ marginTop: 12, flexDirection: 'row' }}>
        <View style={{ flex: 1 }} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
          <View style={{ height: PLOT }}>
            {(day ? [30, 60] : [goalMin]).map((g) => (
              <View key={g} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: yOf(g), borderTopWidth: 1, borderColor: t.line, borderStyle: day ? 'solid' : 'dashed' }} />
            ))}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: hair, backgroundColor: t.line2 }} />
            <Animated.View style={[{ flex: 1 }, growA]}>
              {chart.kind === 'line' ? (
                <LineMarks cols={cols} w={w} bw={bw} gap={gap} yOf={yOf} color={main} sel={sel} />
              ) : (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap }}>
                  {cols.map((c, i) => (
                    <BarMark key={i} c={c} h={yOf(c.total)} rec={yOf(c.total - c.live)} stack={chart.kind === 'stack'} main={main} live={sk}
                      dim={sel !== null && sel !== i} />
                  ))}
                </View>
              )}
            </Animated.View>
            {/* hit targets, a full column wide and the plot tall */}
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
              {cols.map((c, i) => (
                <Pressable key={i} onPress={() => pick(i)} style={{ flex: 1 }} accessibilityRole="button"
                  accessibilityLabel={`${day ? `${i}時台` : `${DOW[i]}曜`} ${jpHm(c.total)}`} />
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap, marginTop: 5 }}>
            {cols.map((c, i) => (
              <View key={i} style={{ flex: 1, alignItems: day ? 'flex-start' : 'center', overflow: 'visible' }}>
                {c.label ? <Txt num size={10} w={c.now ? '700' : '500'} tone={c.now ? 'ink' : 'ink3'} lh={12} style={{ width: day ? 24 : undefined }}>{c.label}</Txt> : null}
              </View>
            ))}
          </View>
        </View>
        <View style={{ width: 30, height: PLOT, marginLeft: 6 }}>
          {(day ? [[30, '30分'], [60, '60分']] as const : [[goalMin, `目標${hm(goalMin)}`]] as const).map(([g, l]) => (
            <Txt key={l} num size={9.5} tone="ink3" lh={11} style={{ position: 'absolute', left: 0, bottom: yOf(g) - 5 }}>{l}</Txt>
          ))}
        </View>
      </View>

      {chart.kind === 'stack' && usedSubj.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {usedSubj.map((x) => (
            <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: x.c }} />
              <Txt size={11} tone="ink2">{x.name}</Txt>
            </View>
          ))}
          {running ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: SUBJ_C[Math.max(0, sk)], opacity: 0.4 }} />
              <Txt size={11} tone="ink2">勉強中</Txt>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

/** One column: recorded minutes solid (by subject when stacked), the running timer paler on top. */
function BarMark({ c, h, rec, stack, main, live, dim }: { c: Col; h: number; rec: number; stack: boolean; main: string; live: number; dim: boolean }) {
  const t = useT();
  if (h <= 0) return <View style={{ flex: 1 }} />;
  const segs: { c: string; h: number; o?: number }[] = [];
  if (stack && c.total > 0) {
    c.parts.forEach((m, k) => { if (m > 0) segs.push({ c: SUBJ_C[k], h: (m / (c.total - c.live || 1)) * rec }); });
  } else if (rec > 0) segs.push({ c: main, h: rec });
  if (h - rec > 0.5) segs.push({ c: stack ? SUBJ_C[Math.max(0, live)] : main, h: h - rec, o: 0.4 });
  return (
    <View style={{ flex: 1, height: Math.max(3, h), borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: 'hidden', opacity: dim ? 0.35 : 1, flexDirection: 'column-reverse' }}>
      {segs.map((s, i) => (
        // a 2px surface gap between stacked segments
        <View key={i} style={{ height: Math.max(1, s.h), backgroundColor: s.c, opacity: s.o ?? 1, borderBottomWidth: i ? 2 : 0, borderColor: t.surface }} />
      ))}
    </View>
  );
}

function LineMarks({ cols, w, bw, gap, yOf, color, sel }: { cols: Col[]; w: number; bw: number; gap: number; yOf: (m: number) => number; color: string; sel: number | null }) {
  const t = useT();
  if (!w) return null;
  const pts = cols.map((c, i) => ({ x: i * (bw + gap) + bw / 2, y: PLOT - yOf(c.total), c }));
  const shown = pts.filter((p) => !p.c.future || p.c.total > 0);
  if (!shown.length) return null;
  const d = shown.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${d} L${shown[shown.length - 1].x.toFixed(1)},${PLOT} L${shown[0].x.toFixed(1)},${PLOT} Z`;
  const last = shown[shown.length - 1];
  return (
    <Svg width={w} height={PLOT}>
      <Path d={area} fill={color} fillOpacity={0.08} />
      <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {sel !== null ? <Line x1={pts[sel].x} x2={pts[sel].x} y1={0} y2={PLOT} stroke={t.line2} strokeWidth={1} /> : null}
      {(sel !== null ? [pts[sel]] : [last]).map((p) => (
        <Circle key={p.x} cx={p.x} cy={p.y} r={4} fill={color} stroke={t.surface} strokeWidth={2} />
      ))}
    </Svg>
  );
}

function chartSettings() {
  openSheet((close) => <ChartSettings close={close} />);
}
function ChartSettings({ close }: { close: () => void }) {
  const t = useT();
  const chart = useStore((s) => s.chart);
  const stack = chart.kind === 'stack';
  return (
    <View style={{ gap: 10 }}>
      <Txt size={18} w="800">グラフの設定</Txt>
      <Txt size={13} w="700" style={{ marginTop: 6 }}>種類</Txt>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {KINDS.map((k) => {
          const on = chart.kind === k.v;
          return (
            <Press key={k.v} onPress={() => setChart({ kind: k.v })} scale={0.96} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ flex: 1, padding: 10, gap: 8, borderRadius: 14, backgroundColor: on ? t.surface : t.sunken, borderWidth: on ? 2 : hair, borderColor: on ? t.ink : t.line }}>
              <KindPreview kind={k.v} color={PALETTES[chart.palette].c} />
              <Txt size={12.5} w="700" style={{ textAlign: 'center' }}>{k.label}</Txt>
            </Press>
          );
        })}
      </View>
      <Txt size={13} w="700" style={{ marginTop: 8 }}>色</Txt>
      {stack ? <Txt size={11.5} tone="ink3">科目別は科目の色で塗ります。棒と折れ線の色を選べます</Txt> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(Object.keys(PALETTES) as ChartPalette[]).map((p) => {
          const on = chart.palette === p;
          return (
            <Press key={p} onPress={() => setChart({ palette: p })} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: on ? t.surface : t.sunken, borderWidth: on ? 2 : hair, borderColor: on ? t.ink : t.line, opacity: stack ? 0.6 : 1 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: PALETTES[p].c, alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Icon name="check" size={13} color="#fff" width={3} /> : null}
              </View>
              <Txt size={11.5} w="600" tone="ink2">{PALETTES[p].label}</Txt>
            </Press>
          );
        })}
      </View>
      <Btn kind="primary" label="完了" onPress={close} style={{ marginTop: 10 }} />
    </View>
  );
}

const PREVIEW = [0.35, 0.7, 0.5, 0.9, 0.6];
function KindPreview({ kind, color }: { kind: ChartKind; color: string }) {
  const H = 34;
  if (kind === 'line') {
    const d = PREVIEW.map((v, i) => `${i ? 'L' : 'M'}${6 + i * 14},${H - v * (H - 4)}`).join(' ');
    return (
      <Svg width="100%" height={H} viewBox={`0 0 68 ${H}`}>
        <Path d={d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
      </Svg>
    );
  }
  return (
    <View style={{ height: H, flexDirection: 'row', alignItems: 'flex-end', gap: 4, justifyContent: 'center' }}>
      {PREVIEW.map((v, i) => (
        <View key={i} style={{ width: 8, height: v * H, borderTopLeftRadius: 2, borderTopRightRadius: 2, overflow: 'hidden', flexDirection: 'column-reverse' }}>
          {kind === 'stack'
            ? [0.5, 0.3, 0.2].map((f, k) => <View key={k} style={{ height: f * v * H, backgroundColor: SUBJ_C[(i + k) % 5] }} />)
            : <View style={{ flex: 1, backgroundColor: color }} />}
        </View>
      ))}
    </View>
  );
}
