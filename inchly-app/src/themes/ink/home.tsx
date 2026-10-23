import { ComponentType, ReactNode, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { subj } from '@/data';
import { jpDate } from '@/lib/time';
import type { Block, Kind } from '@/screens/layout';
import { clock, go, hmColon, jpHm, pickLabel, session, startPick, tickTodo, useCharts, useDeadlines, useNext, usePeers, useSession, useToday, useTodos, useWeekStreak } from '@/screens/model';
import { T } from '@/themes/kit';
import type { HomeKit, SectionProps } from '@/themes/types';
import { Todo, useLevel, useStore } from '@/store';
import { onColor } from '@/theme';
import { Avatar, haptic, Press } from '@/ui/base';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { Icon } from '@/ui/Icon';
import { levelSheet } from '@/ui/Level';
import { toast } from '@/ui/Toast';
import { edgeDrops, HARD, INK, inky, paintTurf, TurfPart } from './paint';
import { BlobFill, Drop, IconSticker, Shout, SplashPress, Splat, Tape } from './parts';

// インク's home: the day is a patch of asphalt you paint. Every minute you
// study lands on it in that subject's ink; the goal covers it all. Below it,
// the big button to go and paint, the streak taped on, ToDos as stickers you
// stamp クリア, the week dripping off a ledge, and the deadlines as tickets.

const SURFACE = '#262626';
const DIM = '#A8A8A8';

// ---------- page, header, frame ----------
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  return (
    <Screen>
      {/* big dried splats behind everything */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Splat size={280} color={INK.pink} seed="bd-pink" style={{ position: 'absolute', top: -80, right: -110, opacity: 0.14 }} />
        <Splat size={240} color={INK.blue} seed="bd-blue" style={{ position: 'absolute', top: '40%', left: -130, opacity: 0.13 }} />
        <Splat size={260} color={INK.yellow} seed="bd-yellow" style={{ position: 'absolute', bottom: 30, right: -120, opacity: 0.08 }} />
      </View>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: tabPad + 8, gap: 26 }}>
        {children}
      </ScrollView>
    </Screen>
  );
}

function Header() {
  const unread = useUnread();
  const narrow = useWindowDimensions().width < 360;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: narrow ? 6 : 8, paddingLeft: 16, paddingRight: 12, paddingTop: 8, height: 58 }}>
      <View style={{ transform: [{ rotate: '-4deg' }], marginRight: 2 }} accessible accessibilityLabel="Inchly">
        <Shout size={narrow ? 21 : 24} shadow={INK.pink}>Inchly</Shout>
      </View>
      <LevelTank />
      <View style={{ flex: 1 }} />
      <IconSticker name="search" label="さがす" onPress={go.search} size={narrow ? 32 : 34} />
      <IconSticker name="bell" label="お知らせ" dot={unread > 0} onPress={go.notifications} size={narrow ? 32 : 34} />
      <IconSticker name="gear" label="設定" onPress={go.settings} size={narrow ? 32 : 34} />
    </View>
  );
}

/** The level as an ink tank: how full it is is how far to the next level. */
function LevelTank() {
  const l = useLevel();
  return (
    <Press onPress={levelSheet} scale={0.9} hitSlop={6} accessibilityRole="button" accessibilityLabel={`レベル${l.lv}。次のレベルまで${Math.round(l.need)} EXP`}
      style={{ width: 62, height: 28, borderRadius: 14, borderWidth: 2, borderColor: INK.white, backgroundColor: INK.black, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.round(l.p * 100)}%`, backgroundColor: INK.pink }} />
      <Shout size={12} lh={15}>{`Lv.${l.lv}`}</Shout>
    </Press>
  );
}

/** Sections インク doesn't draw (one the base gains later) get a slab of their own. */
function Frame({ block, children }: { block: Block; index: number; children: ReactNode }) {
  const kids = Array.isArray(children) ? children : [children];
  const wrap = (c: ReactNode, i: number) => (DRAWN.has(block.sections[i]) ? c
    : <View key={`slab${i}`} style={{ backgroundColor: SURFACE, borderRadius: 22, padding: 14, boxShadow: HARD }}>{c}</View>);
  if (block.row) return <View style={{ flexDirection: 'row', gap: 12 }}>{kids.map((c, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{wrap(c, i)}</View>)}</View>;
  return <View style={{ gap: 14 }}>{kids.map(wrap)}</View>;
}

/** A drip of ink on the left edge: the way to the デザイン page. */
function DesignHandle({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} hitSlop={{ top: 20, bottom: 20, left: 4, right: 16 }} scale={0.9} accessibilityRole="button" accessibilityLabel="デザインを変える"
      style={{ position: 'absolute', left: 0, top: '42%', width: 16, height: 74 }}>
      <Svg width={16} height={74}>
        <Path d="M0 0 H9 Q13 0 13 4 V44 Q13 50 9 50 H0 Z" fill={INK.pink} />
        <Circle cx={6} cy={60} r={6} fill={INK.pink} />
        <Path d="M3 10 V38" stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </Press>
  );
}

// ---------- today: the turf ----------
const CELL = 22;
const ROWS = 7;
function Turf() {
  const today = useToday();
  const ss = useSession();
  const [w, setW] = useState(0);
  const cols = w ? Math.max(8, Math.floor(w / CELL)) : 0;
  const cell = cols ? w / cols : CELL;
  const liveMin = ss.running ? Math.floor(ss.elapsed / 60) : 0;
  const liveId = ss.subject.id;
  const liveC = ss.subject.c;
  const parts = useMemo<TurfPart[]>(() => {
    const out: TurfPart[] = today.parts.map((p) => ({ id: p.id, c: inky(p.c), min: p.min, live: 0 }));
    if (liveMin > 0) {
      const at = out.find((p) => p.id === liveId);
      if (at) { at.min += liveMin; at.live = liveMin; } else out.push({ id: liveId, c: inky(liveC), min: liveMin, live: liveMin });
    }
    return out;
  }, [today.parts, liveMin, liveId, liveC]);
  const turf = useMemo(() => paintTurf(cols, ROWS, parts, today.goal), [cols, parts, today.goal]);
  const splashes = useMemo(() => edgeDrops(turf.cells, cols, ROWS), [turf, cols]);
  const painted = today.min + liveMin;
  const pct = Math.round((painted / Math.max(1, today.goal)) * 100);
  const wet = useSharedValue(1);
  const anyWet = turf.cells.some((c) => c.live) && !ss.paused;
  useEffect(() => {
    wet.set(anyWet ? withRepeat(withSequence(withTiming(0.55, { duration: 800 }), withTiming(1, { duration: 800 })), -1) : withTiming(1));
  }, [anyWet, wet]);
  const wetStyle = useAnimatedStyle(() => ({ opacity: wet.value }));
  const h = ROWS * cell;
  const r = cell * 0.7;
  // drawn once a minute at most (the clock ticks every second around it)
  const dry = useMemo(() => (cols ? (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      {Array.from({ length: cols * ROWS }, (_, i) => <Circle key={i} cx={(i % cols) * cell + cell / 2} cy={Math.floor(i / cols) * cell + cell / 2} r={1.3} fill="rgba(255,255,255,0.09)" />)}
      {turf.cells.filter((c) => !c.live).map((c) => <Circle key={c.i} cx={c.x * cell + cell / 2} cy={c.y * cell + cell / 2} r={r} fill={c.c} />)}
      {splashes.map((d, i) => <Circle key={`d${i}`} cx={d.x * cell + cell / 2} cy={d.y * cell + cell / 2} r={cell * d.s} fill={d.c} />)}
    </Svg>
  ) : null), [cols, w, h, cell, r, turf, splashes]);
  const wetCells = useMemo(() => (cols ? (
    <Svg width={w} height={h}>
      {turf.cells.filter((c) => c.live).map((c) => <Circle key={c.i} cx={c.x * cell + cell / 2} cy={c.y * cell + cell / 2} r={r} fill={c.c} />)}
    </Svg>
  ) : null), [cols, w, h, cell, r, turf]);
  const label = `今日 ${jpHm(today.min)}${ss.running ? `、勉強中 ${jpHm(liveMin)}` : ''}。目標の${pct}%をぬりました`;
  return (
    <View>
      {/* the banner, stuck on over the card's edge */}
      <View style={{ alignSelf: 'flex-start', marginLeft: 4, marginBottom: -14, zIndex: 2, transform: [{ rotate: '-3deg' }], backgroundColor: INK.orange, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 5, boxShadow: HARD }}>
        <Shout size={15} lh={19}>{`きょうのナワバリ · ${jpDate(new Date(), false)}`}</Shout>
      </View>
      <View style={{ backgroundColor: SURFACE, borderRadius: 24, padding: 10, paddingTop: 20, boxShadow: HARD }}>
        <SplashPress color={inky(liveC)} splash={70} haptics={false} onPress={() => haptic.soft()} scale={0.99} accessibilityLabel={label}
          style={{ height: h || ROWS * CELL, borderRadius: 16, backgroundColor: INK.asphalt, overflow: 'hidden' }}>
          <View style={StyleSheet.absoluteFill} onLayout={(e) => setW(e.nativeEvent.layout.width)} />
          {dry}
          {wetCells ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, wetStyle]}>{wetCells}</Animated.View> : null}
          {painted > 0 ? (
            <>
              <View style={{ position: 'absolute', top: 8, right: 8, transform: [{ rotate: '4deg' }], backgroundColor: INK.yellow, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, boxShadow: '2px 3px 0px rgba(0,0,0,0.55)' }}>
                <T f="heavy" size={13} color={INK.black} lh={17}>{pct >= 100 ? 'ぬりつぶし!' : `インク率 ${pct}%`}</T>
              </View>
              <View style={{ position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(14,14,14,0.78)', borderRadius: 12, paddingHorizontal: 10, paddingTop: 2, paddingBottom: 6 }}>
                <Shout size={38} lh={44} num>{hmColon(today.min)}</Shout>
                <T size={11} w="700" color="#D0D0D0" lh={14}>{`ぬった時間 · 目標 ${jpHm(today.goal)}`}</T>
              </View>
            </>
          ) : (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 20 }]}>
              <Shout size={22}>まだまっさら</Shout>
              <T size={12} color="#C8C8C8" style={{ textAlign: 'center' }}>
                {ss.running ? '1分たつと、ここがぬられはじめます' : '勉強した時間だけ、その科目の色でぬられていきます'}
              </T>
            </View>
          )}
        </SplashPress>
        <TurfFoot diff={today.diff} live={ss.running ? liveMin : null} parts={parts} />
      </View>
    </View>
  );
}

function TurfFoot({ diff, live, parts }: { diff: number; live: number | null; parts: TurfPart[] }) {
  const shown = parts.slice(0, 4);
  return (
    <View style={{ paddingHorizontal: 4, paddingTop: 10, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T f="heavy" size={13} lh={17} color={diff >= 0 ? INK.yellow : INK.pink} num>{`${diff >= 0 ? '▲' : '▼'} ${hmColon(Math.abs(diff))}`}</T>
        <T size={11.5} color={DIM}>きのうより</T>
        <View style={{ flex: 1 }} />
        {live !== null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,62,138,0.16)' }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: INK.pink }} />
            <T size={11} w="800" color={INK.pink}>{`＋勉強中 ${live}分`}</T>
          </View>
        ) : null}
      </View>
      {shown.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 }}>
          {shown.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '48%' }}>
              <Splat size={16} color={p.c} seed={`lg${p.id}`} drops={2} />
              <T size={12} w="700" numberOfLines={1} style={{ flexShrink: 1 }}>{subj(p.id).name}</T>
              <T size={11.5} color={DIM} num>{jpHm(p.min)}</T>
            </View>
          ))}
          {parts.length > shown.length ? <T size={11.5} color={DIM}>{`ほか${parts.length - shown.length}科目`}</T> : null}
        </View>
      ) : null}
    </View>
  );
}

// ---------- now: the big button ----------
function Now() {
  const ss = useSession();
  const pick = useNext();
  if (ss.running) return <Live />;
  const p = subj(pick.s);
  const c = inky(p.c);
  const fg = onColor(c);
  return (
    <View style={{ gap: 10 }}>
      <Press onPress={go.study} scale={0.98} accessibilityRole="button" accessibilityLabel={`${pickLabel(pick)} ${p.name} ${pick.what}。勉強のページを開く`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
        <Splat size={36} color={c} seed={`next${p.id}`} drops={3} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={11.5} w="800" color={INK.yellow} lh={15}>{pickLabel(pick)}</T>
          <T size={15} w="800" lh={20} numberOfLines={1}>{p.name}<T size={12.5} color="#C8C8C8">{pick.what ? `  ${pick.what}` : ''}</T></T>
        </View>
        <Icon name="chev" size={14} color={DIM} />
      </Press>
      <SplashPress color={INK.white} splash={90} onPress={() => startPick(pick)} haptics={false} scale={0.94} accessibilityRole="button" accessibilityLabel={`${p.name}を始める`}
        style={{ height: 70, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
        <BlobFill color={c} seed={`go${p.id}`} wob={4} stroke={INK.white} strokeWidth={3} />
        <View><Icon name="play" size={20} color={fg} /></View>
        <Shout size={24} color={fg} shadow={fg === '#FFFFFF' ? INK.black : 'rgba(255,255,255,0.55)'}>ぬりにいく!</Shout>
      </SplashPress>
    </View>
  );
}

/** Studying now: a wet splat that breathes, the clock, and pause. */
function Live() {
  const ss = useSession();
  const c = inky(ss.subject.c);
  const s = useSharedValue(1);
  useEffect(() => {
    s.set(ss.paused ? withTiming(1) : withRepeat(withSequence(withTiming(1.12, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [ss.paused, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const time = clock(ss.elapsed);
  const narrow = useWindowDimensions().width < 360;
  return (
    <Press onPress={go.timer} scale={0.98} accessibilityRole="button" accessibilityLabel={`${ss.subject.name}を勉強中 ${time}。タイマーを開く`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: narrow ? 8 : 10, paddingVertical: 10, paddingLeft: 8, paddingRight: 10, borderRadius: 22, backgroundColor: SURFACE, borderWidth: 2.5, borderColor: c, boxShadow: HARD }}>
      <Animated.View style={a}><Splat size={narrow ? 40 : 50} color={c} seed={`live${ss.subject.id}`} /></Animated.View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={11.5} w="800" color={ss.paused ? INK.yellow : INK.pink} lh={15} numberOfLines={1}>{ss.paused ? '一時停止中' : 'ぬってる最中'}</T>
        <T size={15} w="800" lh={20} numberOfLines={1}>{ss.subject.name}</T>
        {ss.task ? <T size={11.5} color="#C8C8C8" numberOfLines={1}>{ss.task}</T> : null}
      </View>
      <Shout size={(time.length > 5 ? 18 : 22) - (narrow ? 2 : 0)} num>{time}</Shout>
      <Press onPress={session.pause} haptics={false} scale={0.86} hitSlop={7} accessibilityRole="button" accessibilityLabel={ss.paused ? '再開' : '一時停止'}
        style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: INK.white, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={ss.paused ? 'play' : 'pause'} size={15} color={INK.black} />
      </Press>
    </Press>
  );
}

// ---------- the streak, taped on ----------
function Streak() {
  const { streak, tickets, days } = useWeekStreak();
  const wob = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${-1.6 + wob.value}deg` }] }));
  const shake = () => {
    haptic.soft();
    wob.set(withSequence(withTiming(4, { duration: 90 }), withSpring(0, { duration: 700, dampingRatio: 0.28 })));
  };
  return (
    <Animated.View style={[{ marginTop: 6 }, a]}>
      <SplashPress color={INK.yellow} onPress={shake} haptics={false} scale={0.97} accessibilityLabel={`${streak}日連続で勉強中。休み券${tickets}枚`}
        style={{ backgroundColor: SURFACE, borderRadius: 18, borderWidth: 2.5, borderColor: INK.white, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, boxShadow: HARD, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <Shout size={36} color={INK.yellow} lh={40} num>{streak}</Shout>
          <T f="heavy" size={15} lh={20} style={{ marginBottom: 5 }}>日れんぞく</T>
          <View style={{ flex: 1 }} />
          <View style={{ marginBottom: 6, paddingHorizontal: 8, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: INK.cyan, justifyContent: 'center' }}>
            <T size={11} w="800" color={INK.cyan}>{`休み券 ×${tickets}`}</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {days.map((d) => (
            <View key={d.date} style={{ alignItems: 'center', gap: 4, width: 28 }}>
              <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
                {d.today && d.studied ? <Splat size={30} color={INK.pink} seed={`today${d.date}`} drops={3} />
                  : <Drop size={18} color={d.studied ? INK.pink : d.rest ? INK.cyan : '#7A7A7A'} mode={d.studied || d.rest ? 'full' : d.future ? 'dashed' : 'empty'} />}
              </View>
              <T size={10.5} w="800" lh={13} color={d.today ? INK.white : '#8E8E8E'}>{d.label}</T>
            </View>
          ))}
        </View>
      </SplashPress>
      <Tape style={{ top: -8, left: 22, transform: [{ rotate: '-9deg' }] }} />
      <Tape style={{ top: -8, right: 22, transform: [{ rotate: '8deg' }] }} />
    </Animated.View>
  );
}

// ---------- ToDos, as stickers ----------
function Todos() {
  const { todos, done, total } = useTodos();
  const list = [...todos.filter((x) => !x.d), ...todos.filter((x) => x.d)].slice(0, 4);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Shout size={20}>ToDo</Shout>
        {total ? <T size={12} w="800" color={INK.yellow}>{`${done}/${total} クリア`}</T> : null}
        <View style={{ flex: 1 }} />
        {total > list.length ? (
          <Press onPress={go.study} hitSlop={8} accessibilityRole="button" accessibilityLabel="ToDoをぜんぶ見る">
            <T size={12} w="800" color="#C8C8C8">{`ぜんぶ見る（${total}）`}</T>
          </Press>
        ) : null}
        <IconSticker name="plus" label="ToDoを追加" onPress={() => todoSheet()} size={30} />
      </View>
      {list.length ? list.map((td, i) => <TodoSticker key={td.id} todo={td} i={i} />) : (
        <SplashPress color={INK.pink} onPress={() => todoSheet()} accessibilityRole="button" accessibilityLabel="ToDoを追加"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.4)' }}>
          <Icon name="plus" size={15} color={INK.white} />
          <View style={{ flex: 1 }}>
            <T size={14} w="800">ToDoを追加</T>
            <T size={11.5} color={DIM}>やることを決めておくと、始めやすい</T>
          </View>
        </SplashPress>
      )}
    </View>
  );
}

function TodoSticker({ todo, i }: { todo: Todo; i: number }) {
  const s = subj(todo.s);
  const c = inky(s.c);
  const [doneAtFirst] = useState(todo.d);
  return (
    <View style={{ transform: [{ rotate: `${i % 2 ? 0.7 : -0.7}deg` }] }}>
      <Press onPress={() => todoSheet(todo)} scale={0.98} accessibilityRole="button" accessibilityLabel={`${todo.t}。編集する`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingLeft: 10, paddingRight: 12, borderRadius: 16, backgroundColor: SURFACE,
          borderWidth: 2, borderColor: todo.d ? 'rgba(255,255,255,0.16)' : INK.white, boxShadow: HARD }}>
        <SplashPress color={c} splash={58} onPress={() => tickTodo(todo.id)} haptics={false} scale={0.8} hitSlop={10}
          accessibilityRole="checkbox" accessibilityState={{ checked: todo.d }} accessibilityLabel={`${todo.t}を${todo.d ? '未完了に戻す' : '完了にする'}`}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          {todo.d ? <Splat size={38} color={c} seed={`chk${todo.id}`} drops={3} style={{ position: 'absolute' }} />
            : <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: c }} />}
          {todo.d ? <View><Icon name="check" size={15} color={onColor(c)} width={2.6} /></View> : null}
        </SplashPress>
        <View style={{ flex: 1, minWidth: 0, opacity: todo.d ? 0.55 : 1 }}>
          <T size={14} w="700" lh={19} numberOfLines={1} style={todo.d ? { textDecorationLine: 'line-through' } : null}>{todo.t}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c }} />
            <T size={11} color={DIM} numberOfLines={1} style={{ flexShrink: 1 }}>{s.name}</T>
          </View>
        </View>
        {todo.d ? <ClearStamp animate={!doneAtFirst} /> : null}
      </Press>
    </View>
  );
}

/** "クリア!" stamped on a finished ToDo (it lands with a thump when you finish one). */
function ClearStamp({ animate }: { animate: boolean }) {
  const s = useSharedValue(animate ? 2.2 : 1);
  const o = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    s.set(withSpring(1, { duration: 420, dampingRatio: 0.5 }));
    o.set(withTiming(1, { duration: 120 }));
  }, [animate, s, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ rotate: '-10deg' }, { scale: s.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ borderWidth: 2.5, borderColor: INK.pink, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1, backgroundColor: 'rgba(255,62,138,0.14)' }, a]}>
      <T f="heavy" size={13} lh={18} color={INK.pink}>クリア!</T>
    </Animated.View>
  );
}

// ---------- the week, dripping ----------
const LEDGE = 26; // labels above, the ledge the ink hangs from
const DRIP = 104; // the longest drip
function Chart() {
  const { week, hours, goal, weekTotal } = useCharts();
  const [range, setRange] = useState<'week' | 'day'>('week');
  const [w, setW] = useState(0);
  const day = range === 'day';
  const cols = day ? hours.map((x) => ({ key: String(x.h), label: x.h % 6 === 0 ? String(x.h) : '', min: x.min, live: x.live, parts: x.parts, now: x.now, future: x.future }))
    : week.map((x) => ({ key: x.date, label: x.label, min: x.min, live: x.live, parts: x.parts, now: x.today, future: x.future }));
  const max = Math.max(day ? 60 : goal, ...cols.map((x) => x.min), 1);
  const len = (m: number) => (m / max) * DRIP;
  const colW = w / cols.length;
  const dripW = Math.min(day ? 9 : 22, colW * (day ? 0.62 : 0.5));
  const todayMin = hours.reduce((a, x) => a + x.min, 0);
  const total = day ? jpHm(todayMin) : jpHm(weekTotal);
  const H = LEDGE + DRIP + 18;
  const goalY = LEDGE + len(goal);
  const liveC = inky(subj(useStore((s) => s.subj)).c);
  const summary = `${day ? '今日' : '今週'} ${total}。` + (day ? '' : week.map((x) => `${x.label} ${jpHm(x.min)}`).join('、'));
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Shout size={20}>{day ? 'きょうのしずく' : 'こんしゅうのしずく'}</Shout>
        <View style={{ flex: 1 }} />
        {(['day', 'week'] as const).map((k) => (
          <Press key={k} onPress={() => setRange(k)} scale={0.9} hitSlop={6} accessibilityRole="button" accessibilityState={{ selected: range === k }} accessibilityLabel={k === 'day' ? '今日を時間ごとに' : '今週を日ごとに'}
            style={{ height: 28, paddingHorizontal: 11, borderRadius: 14, justifyContent: 'center', borderWidth: 2, borderColor: INK.white, backgroundColor: range === k ? INK.white : 'transparent' }}>
            <T size={12} w="800" color={range === k ? INK.black : INK.white}>{k === 'day' ? '日' : '週'}</T>
          </Press>
        ))}
      </View>
      <View style={{ backgroundColor: SURFACE, borderRadius: 22, paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10, boxShadow: HARD }} accessible accessibilityLabel={summary}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6, paddingHorizontal: 4, marginBottom: 6 }}>
          <Shout size={22} num>{total}</Shout>
          <T size={11.5} color={DIM}>{day ? 'きょうぬった時間' : 'こんしゅうぬった時間'}</T>
        </View>
        <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {w ? (
            <Svg width={w} height={H}>
              {/* the ledge */}
              <Rect x={0} y={LEDGE - 6} width={w} height={6} rx={3} fill="#3C3C3C" />
              {cols.map((c, i) => {
                const cx = colW * i + colW / 2;
                const x = cx - dripW / 2;
                let y = LEDGE - 2;
                const segs = [...c.parts.map((p) => ({ c: inky(p.c), m: p.min })), ...(c.live > 0 ? [{ c: liveC, m: c.live, wet: true }] : [])];
                const recorded = segs.reduce((a, s) => a + s.m, 0);
                const rest = Math.max(0, c.min - recorded); // minutes with no subject (deleted ones are in parts)
                if (rest > 0.5) segs.push({ c: '#8C93A0', m: rest });
                const bars = segs.map((s, k) => { const hh = len(s.m); const out = <Rect key={k} x={x} y={y} width={dripW} height={hh + 1} fill={s.c} opacity={'wet' in s ? 0.65 : 1} />; y += hh; return out; });
                const last = segs[segs.length - 1];
                return (
                  <G key={c.key}>
                    {c.min > 0.5 ? (
                      <>
                        {bars}
                        <Circle cx={cx} cy={y} r={dripW * 0.62} fill={last?.c ?? INK.pink} />
                      </>
                    ) : c.future ? null : <Circle cx={cx} cy={LEDGE + 3} r={day ? 1.6 : 3} fill="#4A4A4A" />}
                  </G>
                );
              })}
              {/* the goal, for the week */}
              {!day && goalY < H - 4 ? <Line x1={0} x2={w} y1={goalY} y2={goalY} stroke={INK.yellow} strokeWidth={1.5} strokeDasharray="5 4" /> : null}
            </Svg>
          ) : null}
          {w ? cols.map((c, i) => (c.label ? (
            <View key={c.key} pointerEvents="none" style={{ position: 'absolute', top: 0, left: colW * i, width: day ? colW * 3 : colW, alignItems: day ? 'flex-start' : 'center' }}>
              <T size={10.5} w="800" lh={14} color={c.now ? INK.yellow : c.future ? '#666' : '#BDBDBD'}>{c.label}</T>
            </View>
          ) : null)) : null}
          {!day && w && goalY < H - 4 ? (
            <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: goalY - 18, backgroundColor: INK.yellow, borderRadius: 4, paddingHorizontal: 5 }}>
              <T size={10} w="800" color={INK.black} lh={14}>{`目標 ${jpHm(goal)}`}</T>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ---------- deadlines, as tickets ----------
function Deadlines() {
  const list = useDeadlines();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Shout size={20}>しめきり</Shout>
        <View style={{ flex: 1 }} />
        <IconSticker name="plus" label="締切を追加" onPress={deadlineSheet} size={30} />
      </View>
      {list.length ? list.slice(0, 4).map((d, i) => {
        const soon = d.days <= 21;
        const c = soon ? INK.yellow : INK.cyan;
        return (
          <View key={d.id} style={{ transform: [{ rotate: `${i % 2 ? 0.6 : -0.6}deg` }] }}>
            <Press onPress={() => deadlineActions(d.id, d.t)} scale={0.98} accessibilityRole="button" accessibilityLabel={`${d.t} あと${d.days}日`}
              style={{ flexDirection: 'row', borderRadius: 14, overflow: 'hidden', boxShadow: HARD }}>
              <View style={{ width: 82, backgroundColor: c, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>
                <T size={10.5} w="800" color={INK.black} lh={13}>あと</T>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                  <T f="heavy" size={d.days >= 100 ? 24 : 30} lh={34} color={INK.black} num>{d.days}</T>
                  <T size={11} w="800" color={INK.black} style={{ marginBottom: 5, marginLeft: 1 }}>日</T>
                </View>
              </View>
              {/* the perforation */}
              <View style={{ width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: INK.black }} />
              <View style={{ flex: 1, minWidth: 0, backgroundColor: SURFACE, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', gap: 4 }}>
                <T size={14} w="800" numberOfLines={1}>{d.t}</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T size={11} color={DIM} num>{`${d.mo}月${d.day}日`}</T>
                  {d.total ? (
                    <View style={{ flexDirection: 'row', gap: 3 }}>
                      {Array.from({ length: Math.min(d.total, 8) }, (_, k) => <View key={k} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: k < d.done ? c : 'transparent', borderWidth: 1.5, borderColor: c }} />)}
                    </View>
                  ) : <T size={11} color={DIM}>ToDoなし</T>}
                </View>
              </View>
            </Press>
          </View>
        );
      }) : (
        <SplashPress color={INK.cyan} onPress={deadlineSheet} accessibilityRole="button" accessibilityLabel="締切を追加"
          style={{ paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.4)' }}>
          <T size={13} w="700" color="#D0D0D0">大事な日を入れておくと、あと何日かが見えます</T>
        </SplashPress>
      )}
    </View>
  );
}

// ---------- people painting along ----------
function Peers() {
  const { people } = usePeers();
  const peers = people.slice(0, 3);
  const me = useStore((s) => s.account?.name ?? 'はる');
  const running = useStore((s) => s.running);
  const [joined, setJoined] = useState(false);
  const join = () => {
    if (running) { toast('もう勉強中です'); return; }
    session.start();
    setJoined(true);
    haptic.success();
    toast('みんなと一緒に始めました');
  };
  const crew = [...(joined ? [{ n: me, c: '#6E56CF' }] : []), ...peers];
  const ring = [INK.pink, INK.yellow, INK.blue, INK.orange];
  const narrow = useWindowDimensions().width < 360;
  const button = (
    <SplashPress color={INK.blue} onPress={join} disabled={joined} haptics={false} scale={0.9} hitSlop={6} accessibilityRole="button" accessibilityLabel={joined ? '勉強中' : '一緒に始める'}
      style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: INK.blue, borderWidth: 2, borderColor: INK.white, alignItems: 'center', justifyContent: 'center', alignSelf: narrow ? 'stretch' : 'auto' }}>
      <T size={12} w="800" color={INK.white}>{joined ? '勉強中' : '一緒に始める'}</T>
    </SplashPress>
  );
  return (
    <Press onPress={go.community} scale={0.98} accessibilityRole="button" accessibilityLabel={`${peers.length + 1 + (joined ? 1 : 0)}人が勉強中。みんなのページを開く`}
      style={{ padding: 12, gap: 10, borderRadius: 22, backgroundColor: SURFACE, boxShadow: HARD }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row' }}>
          {crew.slice(0, 4).map((p, i) => (
            <View key={p.n + i} style={{ marginLeft: i ? -12 : 0, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', zIndex: 4 - i }}>
              <Splat size={52} color={ring[i % ring.length]} seed={`peer${p.n}`} drops={0} style={{ position: 'absolute' }} />
              <Avatar name={p.n} color={p.c} size={30} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={13.5} w="800" numberOfLines={1}>いっしょにぬってる</T>
          <T size={11} color={DIM} numberOfLines={1}>{`${peers.length + 1 + (joined ? 1 : 0)}人 · ${peers.map((p) => p.n).join(' · ')}`}</T>
        </View>
        {narrow ? null : button}
      </View>
      {/* on a narrow phone the button gets a line of its own */}
      {narrow ? button : null}
    </Press>
  );
}

// ---------- the kit ----------
const SECTIONS: Partial<Record<Kind, ComponentType<SectionProps>>> = {
  today: Turf, now: Now, streak: Streak, todos: Todos, chart: Chart, deadlines: Deadlines, peers: Peers,
};
const DRAWN = new Set<string>(Object.keys(SECTIONS));

export const home: HomeKit = {
  Page, Header, Frame, DesignHandle,
  sections: SECTIONS,
  // paint first: the turf, the button, then the streak and ToDos; the week and deadlines below
  arrange: () => [
    { id: 'turf', sections: ['today'] },
    { id: 'go', sections: ['now'] },
    { id: 'streak', sections: ['streak'] },
    { id: 'todos', sections: ['todos'] },
    { id: 'drips', sections: ['chart'] },
    { id: 'deadlines', sections: ['deadlines'] },
    { id: 'peers', sections: ['peers'] },
  ],
};

