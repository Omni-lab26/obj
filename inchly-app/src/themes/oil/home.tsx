import { ReactNode, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { subj } from '@/data';
import type { Block } from '@/screens/layout';
import { clock, go, hmColon, jpHm, pickLabel, session, type Slice, startPick, tickTodo, useCharts, useDeadlines, useNext, usePeers, useSession, useToday, useTodos, useWeekStreak } from '@/screens/model';
import { T } from '@/themes/kit';
import type { HomeKit } from '@/themes/types';
import { MAX_TICKETS, type Todo, useLevel, useStore } from '@/store';
import { hair, onColor } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { Icon, IconName } from '@/ui/Icon';
import { levelSheet } from '@/ui/Level';
import { toast } from '@/ui/Toast';
import { BrushHandle, Dab, Easel, FrameOver, GiltFrame, Heading, InkCheck, Painting, PaintTap, Placard, StrokeButton, Tube } from './canvas';
import { shade, tierOf, TIERS, useOil } from './look';
import { barLine, dabPath, type Part, palettePath, paletteSpots, strokePath } from './paint';

// The home as a painter's studio. Today is a canvas on the easel, painted
// stroke by stroke in the colors of what you studied, and finished — framed —
// at the day's goal. Under it hangs its museum label; then what's on the easel
// now, the week's paintings on the wall, the brushwork of the hours, the
// palette (the streak), the sketchbook (ToDos), the shows coming up
// (deadlines) and the others at work in the studio.

/** Recorded minutes and, if a session is under way, its minutes still wet. */
export function withLive(parts: Slice[], live: { id: string; c: string; min: number } | null): Part[] {
  const out: Part[] = parts.map((p) => ({ id: p.id, c: p.c, min: p.min }));
  if (live && live.min >= 1) {
    const hit = out.find((p) => p.id === live.id);
    if (hit) { hit.min += live.min; hit.live = live.min; } else out.push({ ...live, live: live.min });
  }
  return out;
}

// ---------- page ----------
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  return (
    <Screen>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 2, paddingBottom: tabPad, gap: 30 }}>
        {children}
      </ScrollView>
    </Screen>
  );
}

function HeadBtn({ icon, label, onPress, dot }: { icon: IconName; label: string; onPress: () => void; dot?: boolean }) {
  const { t } = useOil();
  return (
    <Press onPress={onPress} scale={0.88} hitSlop={5} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 36, height: 36, borderRadius: 18, borderWidth: hair, borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={18} color={t.ink} width={1.6} />
      {dot ? <View style={{ position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C2452D', borderWidth: 1.5, borderColor: t.canvas }} /> : null}
    </Press>
  );
}

/** The studio's name, which studio, the date; your level as a brass plaque in the color of your frames. */
function Header() {
  const { t, v } = useOil();
  const unread = useUnread();
  const l = useLevel();
  const tier = tierOf(l.lv);
  const g = TIERS[tier];
  const d = new Date();
  return (
    <View style={{ paddingLeft: 18, paddingRight: 14, paddingTop: 6, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ flex: 1, minWidth: 0 }} accessible accessibilityRole="header" accessibilityLabel={`Inchly ${v.room}`}>
        <T size={26} lh={31}>Inchly</T>
        <T size={11.5} lh={15} color={t.ink3} numberOfLines={1}>{`${v.room} · ${d.getMonth() + 1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`}</T>
      </View>
      <Press onPress={levelSheet} scale={0.92} hitSlop={6} accessibilityRole="button" accessibilityLabel={`レベル${l.lv}。${g.label}`}
        style={{ height: 26, paddingHorizontal: 8, justifyContent: 'center', backgroundColor: g.mid, borderWidth: 1.5, borderTopColor: g.hi, borderLeftColor: g.hi, borderBottomColor: g.lo, borderRightColor: g.lo }}>
        <T size={12} lh={16} num color={onColor(g.mid)}>{`Lv.${l.lv}`}</T>
      </Press>
      <HeadBtn icon="search" label="さがす" onPress={go.search} />
      <HeadBtn icon="bell" label="お知らせ" onPress={go.notifications} dot={unread > 0} />
      <HeadBtn icon="gear" label="設定" onPress={go.settings} />
    </View>
  );
}

function Frame({ block, children }: { block: Block; index: number; children: ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  return (
    <View style={{ paddingHorizontal: 18 }}>
      {block.row ? <View style={{ flexDirection: 'row', gap: 14 }}>{list.map((c, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{c}</View>)}</View> : <View style={{ gap: 26 }}>{children}</View>}
    </View>
  );
}

const ORDER = (): Block[] => [
  { id: 'grass', sections: ['grass'] },
  { id: 'streak', sections: ['streak'] },
  { id: 'today', sections: ['today'] },
  { id: 'gallery', sections: ['x:gallery'] },
  { id: 'peers', sections: ['peers'] },
];

// ---------- sections ----------
/** Today's painting on the easel, and its label: the time, the change from yesterday, how far from finished. */
function Today() {
  const { t, v } = useOil();
  const today = useToday();
  const ss = useSession();
  const tier = tierOf(useLevel().lv);
  const next = useDeadlines()[0];
  const { width } = useWindowDimensions();
  const cw = Math.min(width - 36 - 44, 284);
  const ch = Math.round(cw * 0.72);
  const liveMin = ss.running ? ss.elapsed / 60 : 0;
  const parts = withLive(today.parts, ss.running ? { id: ss.subject.id, c: ss.subject.c, min: liveMin } : null);
  const painted = today.min + Math.floor(liveMin);
  const finished = today.goal > 0 && painted >= today.goal;
  const up = today.diff >= 0;
  const d = new Date();
  return (
    <View>
      <View style={{ alignItems: 'center' }}>
        <Easel w={cw} h={ch}>
          <PaintTap a11y={`今日の一枚 《${v.title}》。${jpHm(painted)}ぶん描きました${finished ? '。完成' : ''}`} colors={parts.length ? parts.map((p) => p.c) : [v.accent]}>
            <Painting w={cw} h={ch} parts={parts} goal={today.goal} seed={`today:${today.goal}`} />
            {finished ? <FrameOver tier={tier} /> : null}
          </PaintTap>
        </Easel>
      </View>
      <Placard style={{ marginTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <T size={14} lh={19} color={v.paperInk}>{`《${v.title}》`}</T>
          <T size={11.5} color={v.paperInk2} numberOfLines={1} style={{ flex: 1 }}>{`今日の勉強 · ${d.getMonth() + 1}月${d.getDate()}日`}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 }} accessible accessibilityLabel={`今日 ${jpHm(today.min)}。昨日より${today.diff}分`}>
          <T size={30} lh={38} num color={v.paperInk} style={{ flex: 1 }} numberOfLines={1} adjustsFontSizeToFit>{jpHm(today.min)}</T>
          <View style={{ alignItems: 'flex-end', marginBottom: 5 }}>
            <T size={12.5} lh={16} num color={up ? v.paperInk : '#B4462B'}>{`${up ? '▲' : '▼'} ${hmColon(Math.abs(today.diff))}`}</T>
            <T size={10.5} lh={14} color={v.paperInk2}>昨日より</T>
          </View>
        </View>
        {ss.running && liveMin >= 1 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <Dab size={12} color={ss.subject.c} seed="wet" />
            <T size={11.5} color={v.paperInk2}>{`＋勉強中 ${Math.floor(liveMin)}分（まだ乾いていない絵の具）`}</T>
          </View>
        ) : null}
        <View style={{ height: hair, backgroundColor: 'rgba(0,0,0,0.16)', marginVertical: 8 }} />
        <T size={11.5} lh={17} color={v.paperInk2}>{`油彩・カンヴァス · 目標 ${jpHm(today.goal)} · ${finished ? '完成。額に入りました' : `完成まで あと${jpHm(today.goal - painted)}`}`}</T>
        {next ? <T size={11.5} lh={17} color={v.paperInk2} numberOfLines={1}>{`◆ ${next.t}まで ${next.days}日`}</T> : null}
      </Placard>
      {!painted ? <T size={11.5} color={t.ink3} style={{ marginTop: 8, textAlign: 'center' }}>まだ下描きです。勉強した分だけ、絵の具がのります</T> : null}
    </View>
  );
}

/** What's on the easel now (the session, its own small canvas filling as it runs), or the next canvas with the button that starts it. */
function Now() {
  const { t, v } = useOil();
  const ss = useSession();
  const pick = useNext();
  const tier = tierOf(useLevel().lv);
  if (ss.running) {
    const parts: Part[] = [{ id: ss.subject.id, c: ss.subject.c, min: ss.elapsed / 60, live: ss.paused ? 0 : ss.elapsed / 60 }];
    return (
      <View>
        <Heading title="制作中" sub={ss.paused ? '一時停止中' : '筆が進んでいます'} />
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <PaintTap onPress={go.timer} a11y={`${ss.subject.name}を勉強中 ${clock(ss.elapsed)}。タイマーを開く`} colors={[ss.subject.c]} tilt={2.4}>
            <GiltFrame tier={tier} thick={5}><Painting w={96} h={72} parts={parts} goal={ss.target / 60} seed={`now:${ss.subject.id}`} detail={false} /></GiltFrame>
          </PaintTap>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={18} lh={24} numberOfLines={1}>{`《${ss.subject.name}》`}</T>
            {ss.task ? <T size={12.5} color={t.ink2} numberOfLines={1}>{ss.task}</T> : null}
            <T size={26} lh={33} num accessibilityLabel={`経過 ${clock(ss.elapsed)}`}>{clock(ss.elapsed)}</T>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <StrokeButton label={ss.paused ? '再開' : '一時停止'} onPress={session.pause} color={shade(t.canvas, t.dark ? 0.16 : -0.12)} ink={t.ink} h={34} />
              <StrokeButton label="記録する" onPress={session.finish} color={v.accent} ink={v.onAccent} h={34} />
            </View>
          </View>
        </View>
      </View>
    );
  }
  const p = subj(pick.s);
  return (
    <View>
      <Heading title="次の一枚" sub={pickLabel(pick)} />
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <PaintTap onPress={go.study} a11y={`${pickLabel(pick)} ${p.name} ${pick.what}。勉強のページを開く`} colors={[p.c]} tilt={2.4}>
          <GiltFrame tier={tier} thick={5}>
            <Painting w={96} h={72} parts={[]} goal={1} seed={`next:${p.id}`} detail={false} />
            <Dab size={24} color={p.c} seed={p.id} style={{ position: 'absolute', right: 8, bottom: 6 }} />
          </GiltFrame>
        </PaintTap>
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <T size={18} lh={24} numberOfLines={1}>{`《${p.name}》`}</T>
          {pick.what ? <T size={12.5} color={t.ink2} numberOfLines={2}>{pick.what}</T> : null}
          <StrokeButton label="はじめる" icon="play" a11y={`${p.name}を始める`} onPress={() => startPick(pick)} color={p.c} ink={onColor(p.c)} h={38} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

/** The week on the wall: one painting a day, finished at the goal; days to come are an empty nail. */
function Gallery() {
  const { t, v } = useOil();
  const c = useCharts();
  const ss = useSession();
  const { days } = useWeekStreak();
  const tier = tierOf(useLevel().lv);
  const { width } = useWindowDimensions();
  const gap = 6;
  const fw = Math.floor((width - 36 - gap * 6) / 7);
  const pw = fw - 8, ph = Math.round(pw * 1.3);
  return (
    <View>
      <Heading title="今週の展示" sub="一日一枚。目標の時間で仕上がります" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {c.week.map((d, i) => {
          const rest = days[i]?.rest;
          const parts = withLive(d.parts, d.live >= 1 ? { id: ss.subject.id, c: ss.subject.c, min: d.live } : null);
          return (
            <View key={d.date} style={{ width: fw, alignItems: 'center', gap: 4 }}>
              {d.future ? (
                <View style={{ width: fw, height: ph + 8, alignItems: 'center' }} accessible accessibilityLabel={`${d.label}曜 これから`}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.ink3, marginTop: 1 }} />
                  <View style={{ flex: 1, alignSelf: 'stretch', marginTop: 4, borderWidth: 1, borderColor: t.line2, borderStyle: 'dashed' }} />
                </View>
              ) : (
                <PaintTap a11y={`${d.label}曜 ${d.min >= 1 ? jpHm(d.min) : rest ? '休み' : 'なし'}`} colors={[]} smear={false} tilt={5}>
                  <GiltFrame tier={tier} thick={3}><Painting w={pw} h={ph} parts={parts} goal={c.goal} seed={`day:${d.date}`} detail={false} /></GiltFrame>
                </PaintTap>
              )}
              <View style={{ paddingHorizontal: 4, borderBottomWidth: 2, borderBottomColor: d.today ? v.accent : 'transparent' }}>
                <T size={11} lh={15} color={d.today ? t.ink : t.ink2}>{d.label}</T>
              </View>
              <T size={9.5} lh={12} num color={t.ink3}>{d.min >= 1 ? hmColon(d.min) : rest ? '休' : d.future ? '' : '—'}</T>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Today by the hour, or the week by the day, as strokes of the brush stacked by subject; the goal in pencil. */
function Chart() {
  const { t, v } = useOil();
  const c = useCharts();
  const ss = useSession();
  const subjects = useStore((s) => s.subjects);
  const [range, setRange] = useState<'week' | 'day'>('week');
  const [w, setW] = useState(0);
  const week = range === 'week';
  const bars = week
    ? c.week.map((d) => ({ key: d.date, label: d.label, min: d.min, live: d.live, parts: d.parts, mark: d.today }))
    : c.hours.map((x) => ({ key: String(x.h), label: x.h % 6 === 0 ? String(x.h) : '', min: x.min, live: x.live, parts: x.parts, mark: x.now }));
  const recorded = week ? c.weekTotal : c.hours.reduce((a, x) => a + x.min - x.live, 0);
  const live = bars.reduce((a, b) => a + b.live, 0);
  const max = week ? Math.max(c.goal, ...bars.map((b) => b.min), 1) * 1.12 : 60;
  const H = 156, TOP = 20, FOOT = 24;
  const plotH = H - TOP - FOOT;
  const slot = w / bars.length;
  const bw = week ? Math.min(26, slot * 0.6) : Math.max(5, slot * 0.72);
  const y = (m: number) => TOP + plotH - (m / max) * plotH;
  const sig = `${range}|${w}|${bars.map((b) => `${b.key}:${b.parts.map((p) => `${p.id}${Math.round(p.min)}`).join(',')}:${Math.round(b.live)}`).join('|')}`;
  const marks = useMemo(() => {
    if (!w) return [];
    return bars.flatMap((b, i) => {
      const cx = slot * i + slot / 2;
      let acc = 0;
      const out: { key: string; d: string; c: string; o: number; wet?: boolean }[] = [];
      const seg = (from: number, to: number, color: string, key: string, o: number, wet?: boolean) => {
        const y0 = y(from), y1 = y(to);
        const hh = y0 - y1;
        if (hh < 0.5) return;
        const d = hh < bw * 0.6 ? dabPath(cx, (y0 + y1) / 2, Math.max(bw * 0.36, hh / 2), key) : strokePath(barLine(cx, y0 - 0.5, y1 + 0.5, bw, key), bw, key, true);
        out.push({ key, d, c: color, o, wet });
      };
      b.parts.forEach((p) => { seg(acc, acc + p.min, p.c, `${b.key}${p.id}`, 0.94); acc += p.min; });
      if (b.live > 0) seg(acc, acc + b.live, ss.subject.c, `${b.key}live`, 0.5, true);
      return out;
    });
    // `sig` stands for the bars
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, ss.subject.c]);
  // the subjects in this figure, for the key
  const sums = new Map<string, number>();
  bars.forEach((b) => b.parts.forEach((p) => sums.set(p.id, (sums.get(p.id) ?? 0) + p.min)));
  const key = [...subjects.filter((s) => sums.has(s.id)).map((s) => ({ id: s.id, name: s.name, c: s.c })), ...(sums.has('?') ? [{ id: '?', name: '削除した科目', c: '#8C93A0' }] : [])].slice(0, 6);
  const toggle = (k: 'week' | 'day', label: string, a11y: string) => (
    <Press onPress={() => setRange(k)} scale={0.92} hitSlop={8} accessibilityRole="tab" accessibilityState={{ selected: range === k }} accessibilityLabel={a11y}
      style={{ paddingHorizontal: 8, height: 28, justifyContent: 'center', alignItems: 'center' }}>
      {range === k ? <Dab size={26} color={v.accent} seed={`tog${k}`} style={{ position: 'absolute', opacity: 0.85 }} /> : null}
      <View style={{ zIndex: 1 }}><T size={13} lh={17} color={range === k ? v.onAccent : t.ink2}>{label}</T></View>
    </Press>
  );
  return (
    <View>
      <Heading title={week ? '今週' : '今日'} sub="筆あと" right={<View style={{ flexDirection: 'row', gap: 2 }} accessibilityRole="tablist">{toggle('week', '週', '週ごと')}{toggle('day', '日', '時間ごと')}</View>} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: -4, marginBottom: 6 }}>
        <T size={22} lh={28} num>{hmColon(recorded)}</T>
        {live >= 1 ? <T size={11.5} color={t.ink3}>{`＋勉強中 ${Math.round(live)}分`}</T> : null}
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }} accessible accessibilityLabel={`${week ? '今週' : '今日'}の勉強時間 ${jpHm(recorded)}`}>
        {w ? (
          <Svg width={w} height={H}>
            <Path d={`M2 ${TOP + plotH + 1}L${w - 2} ${TOP + plotH + 1}`} stroke={t.ink3} strokeWidth={1} opacity={0.6} />
            {week ? <Path d={`M2 ${y(c.goal)}L${w - 2} ${y(c.goal)}`} stroke={t.ink3} strokeWidth={1} strokeDasharray="4 4" opacity={0.8} /> : null}
            {!week ? [6, 12, 18].map((hh) => <Path key={hh} d={`M${slot * hh} ${TOP}L${slot * hh} ${TOP + plotH}`} stroke={t.ink3} strokeWidth={0.6} strokeDasharray="1 4" opacity={0.6} />) : null}
            {marks.map((m) => (
              <G key={m.key}>
                <Path d={m.d} fill={m.c} opacity={m.o} />
                {m.wet ? <Path d={m.d} fill="none" stroke="#FFFFFF" strokeWidth={1} opacity={0.6} strokeDasharray="2 3" /> : null}
              </G>
            ))}
            {bars.map((b, i) => (b.mark && !week ? <Path key={`m${i}`} d={`M${slot * i + slot / 2 - 4} ${TOP - 11}h8l-4 6z`} fill={v.mark} /> : null))}
            {week ? <SvgText x={w - 4} y={y(c.goal) - 4} fontSize={10} fill={t.ink3} textAnchor="end">目標</SvgText> : null}
          </Svg>
        ) : null}
        {w ? bars.map((b, i) => {
          const cx = slot * i + slot / 2;
          return (
            <View key={`l${b.key}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
              {week && b.min >= 1 ? (
                <View style={{ position: 'absolute', left: cx - 22, width: 44, top: y(b.min) - 16, alignItems: 'center' }}>
                  <T size={9.5} lh={12} num color={t.ink2}>{hmColon(b.min)}</T>
                </View>
              ) : null}
              {b.label ? (
                <View style={{ position: 'absolute', left: cx - 14, width: 28, top: H - FOOT + 4, alignItems: 'center' }}>
                  {week && b.mark ? <View style={{ position: 'absolute', bottom: -2, width: 16, height: 2, backgroundColor: v.mark }} /> : null}
                  <T size={week ? 11.5 : 10} lh={15} num color={b.mark ? t.ink : t.ink2}>{b.label}</T>
                </View>
              ) : null}
            </View>
          );
        }) : null}
      </View>
      {key.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4, marginTop: 6 }}>
          {key.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Dab size={13} color={s.c} seed={s.id} />
              <T size={11} lh={15} color={t.ink2} numberOfLines={1}>{s.name}</T>
            </View>
          ))}
        </View>
      ) : null}
      <T size={11} color={t.ink3} style={{ marginTop: 6 }}>{recorded + live > 0 ? `筆あと — ${week ? '今週の勉強時間（日ごと・科目ごと）' : '今日の勉強時間（時間ごと）'}` : `${week ? '今週' : '今日'}はまだ一筆もありません`}</T>
    </View>
  );
}

/** The streak as a palette: a dab of the day's main color for each day studied this week. */
function Streak() {
  const { t, v } = useOil();
  const { streak, tickets, days } = useWeekStreak();
  const c = useCharts();
  const { width } = useWindowDimensions();
  const PW = width < 360 ? 148 : 172, PH = Math.round(PW * 0.7);
  const spots = paletteSpots(PW, PH);
  const board = palettePath(PW, PH);
  const label = onColor(v.wood);
  const mainOf = (i: number) => (c.week[i]?.parts ?? []).reduce<{ c: string; min: number } | null>((a, p) => (!a || p.min > a.min ? p : a), null)?.c;
  return (
    <View>
      <Heading title="連続記録" sub="パレット · 一日一色" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <PaintTap a11y={`${streak}日連続で勉強中。休み券${tickets}枚`} colors={[]} smear={false} tilt={-5}>
          <View style={{ width: PW, height: PH }}>
            <Svg width={PW} height={PH}>
              <Path d={board} fill={v.wood} fillRule="evenodd" />
              <Path d={board} fill="none" stroke={v.woodDark} strokeWidth={1.5} />
              {spots.map(([x, y], i) => {
                const d = days[i];
                if (!d) return null;
                const col = d.studied ? mainOf(i) ?? v.accent : null;
                if (col) return <Path key={i} d={dabPath(x, y, PW * 0.068, `dab${d.date}`)} fill={col} />;
                if (d.rest) return <Path key={i} d={dabPath(x, y, PW * 0.06, `rest${d.date}`)} fill="#9C968C" />;
                return <Circle key={i} cx={x} cy={y} r={PW * 0.05} fill="none" stroke={d.today ? v.accent : label} strokeWidth={1.2} strokeDasharray="2 2.5" opacity={d.today ? 1 : 0.5} />;
              })}
              {spots.map(([x, y], i) => (days[i]?.studied ? <Circle key={`g${i}`} cx={x - PW * 0.02} cy={y - PW * 0.022} r={PW * 0.013} fill="#FFFFFF" opacity={0.5} /> : null))}
            </Svg>
            {spots.map(([x, y], i) => {
              const dx = PW * 0.56 - x, dy = PH * 0.56 - y, k = (PW * 0.12) / (Math.hypot(dx, dy) || 1);
              return (
              <View key={`t${i}`} pointerEvents="none" style={{ position: 'absolute', left: x + dx * k - 9, top: y + dy * k - 6, width: 18, alignItems: 'center' }}>
                <T size={9} lh={11} color={label} style={{ opacity: days[i]?.today ? 1 : 0.75 }}>{days[i]?.rest ? '休' : days[i]?.label}</T>
              </View>
              );
            })}
          </View>
        </PaintTap>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={40} lh={46} num numberOfLines={1}>{streak}<T size={14} lh={18}> 日連続</T></T>
          <T size={12} lh={17} color={t.ink2}>{streak ? `${streak}日、筆を置いていません` : '今日から数えはじめます'}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 10 }} accessible accessibilityLabel={`休み券 ${tickets}枚`}>
            {Array.from({ length: MAX_TICKETS }, (_, i) => <Tube key={i} full={i < tickets} color={v.accent} ink={t.ink} />)}
          </View>
          <T size={11} lh={15} color={t.ink3} style={{ marginTop: 2 }}>{`休み券 ${tickets}/${MAX_TICKETS}`}</T>
        </View>
      </View>
    </View>
  );
}

/** Today's ToDos on a sketchbook page, ticked off in ink. */
function Todos() {
  const { v } = useOil();
  const { todos, done, total } = useTodos();
  const shown = [...todos.filter((x) => !x.d), ...todos.filter((x) => x.d)].slice(0, 5);
  return (
    <View>
      <Heading title="ToDo" sub={total ? `スケッチブック · ${done}/${total}` : 'スケッチブック'} right={<AddLink label="＋ 追加" a11y="ToDoを追加" onPress={() => todoSheet()} />} />
      <View style={{ backgroundColor: v.paper, borderWidth: hair, borderColor: 'rgba(0,0,0,0.14)', paddingTop: 16, paddingHorizontal: 14, paddingBottom: 10,
        boxShadow: '0px 1px 2px rgba(0,0,0,0.12), 0px 6px 14px rgba(0,0,0,0.1)' }}>
        <Rings />
        {total ? shown.map((td, i) => <TodoLine key={td.id} td={td} last={i === shown.length - 1} />) : (
          <Press onPress={() => todoSheet()} accessibilityRole="button" accessibilityLabel="ToDoを追加" style={{ paddingVertical: 14 }}>
            <T size={13} color={v.paperInk2}>やることを書いておくと、始めやすくなります</T>
          </Press>
        )}
        {total ? (
          <Press onPress={go.study} hitSlop={8} accessibilityRole="link" accessibilityLabel="ToDoをすべて見る" style={{ alignSelf: 'flex-end', marginTop: 8 }}>
            <T size={12} color={v.paperInk} style={{ textDecorationLine: 'underline' }}>{total > shown.length ? `すべて見る（${total}）→` : '勉強のページへ →'}</T>
          </Press>
        ) : null}
      </View>
    </View>
  );
}
/** The sketchbook's spiral binding along the top. */
function Rings() {
  const { v } = useOil();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 14, right: 14, top: -7, flexDirection: 'row', justifyContent: 'space-between' }}>
      {Array.from({ length: 11 }, (_, i) => (
        <View key={i} style={{ width: 7, height: 15, borderRadius: 4, borderWidth: 1.5, borderColor: '#8A8A88', backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: v.paperInk, opacity: 0.6, marginBottom: 2 }} />
        </View>
      ))}
    </View>
  );
}
function TodoLine({ td, last }: { td: Todo; last: boolean }) {
  const { v } = useOil();
  const s = subj(td.s);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: last ? 0 : hair, borderBottomColor: 'rgba(0,0,0,0.12)' }}>
      <Press onPress={() => tickTodo(td.id)} scale={0.9} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: td.d }} accessibilityLabel={td.t}>
        <InkCheck on={td.d} color={v.paperInk} />
      </Press>
      <Press onPress={() => todoSheet(td)} scale={0.99} accessibilityRole="button" accessibilityLabel={`${td.t}を編集`} style={{ flex: 1, minWidth: 0 }}>
        <T size={14} lh={19} numberOfLines={1} color={td.d ? v.paperInk2 : v.paperInk} style={td.d ? { textDecorationLine: 'line-through' } : null}>{td.t}</T>
      </Press>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 92 }}>
        <Dab size={12} color={s.c} seed={td.s} />
        <T size={11} color={v.paperInk2} numberOfLines={1} style={{ flexShrink: 1 }}>{s.name}</T>
      </View>
    </View>
  );
}
function AddLink({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const { t, v } = useOil();
  return (
    <Press onPress={onPress} hitSlop={10} scale={0.92} accessibilityRole="button" accessibilityLabel={a11y} style={{ paddingHorizontal: 6, paddingVertical: 3, borderBottomWidth: 1.5, borderBottomColor: v.mark }}>
      <T size={12.5} lh={16} color={t.ink}>{label}</T>
    </Press>
  );
}

/** Deadlines as the shows coming up: the date on a small framed card, the ToDos tied to each as dabs. */
function Deadlines() {
  const { t, v } = useOil();
  const deadlines = useDeadlines();
  return (
    <View>
      <Heading title="締切" sub="展示の予定" right={<AddLink label="＋ 追加" a11y="締切を追加" onPress={deadlineSheet} />} />
      {deadlines.length ? deadlines.map((d) => (
        <Press key={d.id} onPress={() => deadlineActions(d.id, d.t)} scale={0.99} accessibilityRole="button" accessibilityLabel={`${d.t} あと${d.days}日`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 }}>
          <GiltFrame tier="wood" thick={3}>
            <View style={{ width: 42, height: 44, backgroundColor: v.paper, alignItems: 'center', justifyContent: 'center' }}>
              <T size={9.5} lh={12} color={v.paperInk2}>{`${d.mo}月`}</T>
              <T size={18} lh={22} num color={v.paperInk}>{d.day}</T>
            </View>
          </GiltFrame>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <T size={15} lh={20} numberOfLines={1}>{d.t}</T>
            {d.total ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }} accessible accessibilityLabel={`ToDo ${d.done}/${d.total}`}>
                {Array.from({ length: Math.min(8, d.total) }, (_, i) => (i < d.done
                  ? <Dab key={i} size={12} color={v.accent} seed={`${d.id}${i}`} />
                  : <View key={i} style={{ width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: t.ink3 }} /></View>))}
                <T size={10.5} color={t.ink3} style={{ marginLeft: 4 }}>{`ToDo ${d.done}/${d.total}`}</T>
              </View>
            ) : <T size={11} color={t.ink3}>ToDoなし</T>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T size={22} lh={27} num color={d.days <= 21 ? v.mark : t.ink}>{d.days}</T>
            <T size={10.5} lh={13} color={t.ink3}>日後</T>
          </View>
        </Press>
      )) : (
        <Press onPress={deadlineSheet} accessibilityRole="button" accessibilityLabel="締切を追加" style={{ paddingVertical: 10 }}>
          <T size={13} color={t.ink3}>締切や大事な日を入れておきましょう</T>
        </Press>
      )}
    </View>
  );
}

/** The others at work in the studio, as small portraits in oval frames; one button to start along with them. */
function Peers() {
  const { t, v } = useOil();
  const { people, count } = usePeers();
  const peers = people.slice(0, 3);
  const tier = TIERS[tierOf(useLevel().lv)];
  const running = useStore((s) => s.running);
  const [joined, setJoined] = useState(false);
  const join = () => {
    if (running) { toast('もう勉強中です'); return; }
    session.start();
    setJoined(true);
    haptic.success();
    toast('みんなと一緒に始めました');
  };
  return (
    <View>
      <Heading title="アトリエの仲間" sub={`いま ${count.toLocaleString('en-US')}人が勉強中`} />
      <Press onPress={go.community} scale={0.99} accessibilityRole="button" accessibilityLabel={`いま${count}人が勉強中。みんなのページを開く`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flexDirection: 'row' }}>
          {peers.map((p, i) => (
            <View key={p.n} style={{ marginLeft: i ? -10 : 0, width: 40, height: 50, borderRadius: 20, borderWidth: 3, borderColor: tier.mid, backgroundColor: i % 2 ? '#3B3026' : '#2C3550',
              alignItems: 'center', justifyContent: 'center', boxShadow: '1px 2px 5px rgba(0,0,0,0.3)' }}>
              <T size={17} lh={21} color="#F3EAD3">{[...p.n][0]}</T>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={13} lh={18} color={t.ink2} numberOfLines={1}>{peers.map((p) => p.n).join('、')}</T>
          <StrokeButton label={joined ? '勉強中' : '一緒に始める'} a11y="一緒に始める" onPress={join} disabled={joined || running} color={v.accent} ink={v.onAccent} h={34} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
        </View>
      </Press>
    </View>
  );
}

const sections: HomeKit['sections'] = {
  today: Today,
  now: Now,
  'x:gallery': Gallery,
  chart: Chart,
  streak: Streak,
  todos: Todos,
  deadlines: Deadlines,
  peers: Peers,
};

export const home: HomeKit = { Page, Header, Frame, sections, arrange: ORDER, DesignHandle: BrushHandle };
