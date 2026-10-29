import { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';

import { pad, subj } from '@/data';
import type { Moment } from '@/moments';
import { useStore } from '@/store';
import type { MomentKit } from '@/themes/types';
import { M as MOTION, timed } from '@/ui/motion';
import { C, glow } from './look';
import { NeonSign } from './NeonSign';
import { Barcode, D, J, Lightbox, Mono } from './parts';
import { canTube, signLayout } from './sign';
import { SAI } from './stamp';

// サイバー's moments, after its parts bible. Starting is JACK IN: the
// subject's name lights as neon, one stroke at a time in writing order (inside
// 0.28s), over a cyan flash, with the departure board's line. Recording is
// the parts bible's one big yellow screen: LOGGED, the minutes huge in black,
// and the 済 stamp — it appears with a 0.28s flicker, never growing or
// shrinking. Everything is a one-shot flash or a fade (MOTION.md); what
// happened is said in a toast too.

/** Calls done once, after ms (a new moment remounts the show). */
function useAutoDone(done: () => void, ms: number) {
  const [first] = useState(() => done);
  useEffect(() => { const id = setTimeout(first, ms); return () => clearTimeout(id); }, [first, ms]);
}
/** In, hold, out: 0 → 1 → 0. */
function useShow(hold: number) {
  const k = useSharedValue(0);
  useEffect(() => { k.set(withSequence(timed(1, MOTION.fadeIn), withDelay(hold, timed(0, MOTION.fadeOut)))); }, [k, hold]);
  return k;
}
/** One short flicker, as a tube catching or a stamp landing: on, dim, on (0.28s, opacity only). */
function useFlicker(delay = 0) {
  const f = useSharedValue(0);
  useEffect(() => { f.set(withDelay(delay, withSequence(timed(1, 60), timed(0.3, 70), timed(1, 150)))); }, [f, delay]);
  return f;
}
const hm = (m: number) => `${Math.floor(m / 60)}h${pad(m % 60)}`;

function Start({ moment, done }: { moment: Extract<Moment, { kind: 'start' }>; done: () => void }) {
  useAutoDone(done, 1500);
  const { width } = useWindowDimensions();
  const k = useShow(1050);
  const box = useAnimatedStyle(() => ({ opacity: k.value }));
  // the tubes light in writing order within 0.26s, after a cyan flash
  const power = useSharedValue(0);
  useEffect(() => { power.set(withDelay(80, timed(1, 260))); }, [power]);
  const flash = useSharedValue(0);
  useEffect(() => { flash.set(withSequence(timed(1, 1), timed(0.35, 66), timed(0.7, 66), timed(0, 68))); }, [flash]);
  const fl = useAnimatedStyle(() => ({ opacity: flash.value }));
  const sj = subj(moment.subject);
  const short = useStore((s) => s.subjects.find((x) => x.id === moment.subject)?.short);
  const task = useStore((s) => s.todos.find((x) => x.id === s.studyTodo)?.t) ?? sj.task;
  const plan = useStore((s) => s.planMin);
  const L = signLayout({ name: sj.name, short });
  const text = L.plate ? sj.name.slice(0, 4) : L.cols.join('');
  const n = [...text].length;
  const size = Math.min(64, Math.floor((width - 60) / Math.max(1, n)));
  const tube = canTube(text, size);
  const d = new Date();
  const at = `${d.getHours()}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const end = plan ? new Date(d.getTime() + plan * 60000) : null;
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,7,11,0.9)' }, box]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,240,255,0.28)' }, fl]} />
      <Animated.View style={[{ alignItems: 'center', gap: 12 }, box]}>
        <Mono size={11} color={C.c} ls={0.3}>JACK IN // 接続</Mono>
        <View style={{ minHeight: size, justifyContent: 'center' }}>
          {tube ? <NeonSign text={text} size={size} color={sj.c} power={power} /> : <Lightbox text={text} size={Math.round(size * 0.6)} vert={false} tint={sj.c} />}
        </View>
        <J size={15} color={C.t2} numberOfLines={1} style={{ maxWidth: width - 60 }}>{`${at}${task ? ` · ${task}` : ''}`}</J>
        {/* the departure board: what leaves now, and until when */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#050504', boxShadow: 'inset 0px 0px 0px 1px #1d1c0a, inset 0px 0px 24px rgba(0,0,0,0.95)' }}>
          <View style={{ backgroundColor: sj.c, paddingHorizontal: 5, paddingTop: 1, boxShadow: `0px 0px 10px ${sj.c}` }}><J size={12} color="#000" w="700" lh={15}>発車</J></View>
          <J size={17} color={C.warm} style={glow('rgba(255,227,166,0.6)', 7)} numberOfLines={1}>{sj.name}</J>
          {end ? <J size={17} color={C.warm} style={glow('rgba(255,227,166,0.6)', 7)}>{`→ ${end.getHours()}:${pad(end.getMinutes())}`}</J> : null}
        </View>
      </Animated.View>
    </View>
  );
}

/** A panel in the middle, cyan-edged: what happened, and its EXP. */
function Notice({ code, title, sub, edge = C.c, children }: { code: string; title: string; sub?: string; edge?: string; children?: ReactNode }) {
  return (
    <View style={{ alignSelf: 'center', minWidth: 240, alignItems: 'center', gap: 6, paddingVertical: 18, paddingHorizontal: 22, backgroundColor: 'rgba(8,14,22,0.97)', boxShadow: `inset 0px 0px 0px 1px ${edge}, 0px 0px 28px rgba(0,0,0,0.6), 0px 0px 18px ${edge}55` }}>
      <Mono size={10.5} color={edge} ls={0.2}>{code}</Mono>
      {children}
      <J size={15} w="700">{title}</J>
      {sub ? <Mono size={12} color={C.y} ls={0.1}>{sub}</Mono> : null}
    </View>
  );
}

function Todo({ moment, done }: { moment: Extract<Moment, { kind: 'todo' }>; done: () => void }) {
  useAutoDone(done, 1300);
  const k = useShow(850);
  const f = useFlicker();
  const a = useAnimatedStyle(() => ({ opacity: k.value * f.value }));
  const { height } = useWindowDimensions();
  return (
    <View style={{ flex: 1, paddingTop: height * 0.26 }}>
      <Animated.View style={a}>
        <Notice code={moment.all ? 'ALL TASKS CLEAR' : 'TASK CLEAR'} title={moment.all ? '今日のToDo、ぜんぶ終わり' : 'ToDoを完了しました'} sub={moment.exp ? `+${moment.exp} XP` : undefined}>
          <D size={40} color={C.c} style={glow(C.c, 10)}>{moment.all ? 'ALL' : 'OK'}</D>
        </Notice>
      </Animated.View>
    </View>
  );
}

function Target({ moment, done }: { moment: Extract<Moment, { kind: 'target' }>; done: () => void }) {
  useAutoDone(done, 1700);
  // the screen's edge flashes orange once; the notice stays until it goes
  const e = useSharedValue(0);
  useEffect(() => { e.set(withSequence(timed(1, 1), timed(0.35, 70), timed(1, 90), withDelay(800, timed(0, MOTION.fadeOut)))); }, [e]);
  const edge = useAnimatedStyle(() => ({ opacity: e.value }));
  const k = useShow(1250);
  const a = useAnimatedStyle(() => ({ opacity: k.value }));
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 4, borderColor: C.o }, edge]} />
      <Animated.View style={a}>
        <Notice code="TIME // 予定の時間" title="次の予定の時間です" edge={C.o}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <D size={48} color={C.o} style={glow(C.o, 10)}>{moment.min}</D>
            <J size={14} w="700" color={C.t2}>分</J>
          </View>
        </Notice>
      </Animated.View>
    </View>
  );
}

function Record({ moment, done }: { moment: Extract<Moment, { kind: 'record' }>; done: () => void }) {
  useAutoDone(done, moment.level ? 2200 : 1800);
  const k = useShow(moment.level ? 1500 : 1150);
  const a = useAnimatedStyle(() => ({ opacity: k.value }));
  // the stamp lands after the figures: a flicker, never a pop
  const st = useFlicker(320);
  const sa = useAnimatedStyle(() => ({ opacity: st.value }));
  const { width } = useWindowDimensions();
  const sj = subj(moment.subject);
  const goal = useStore((s) => s.goalMin);
  const lvBefore = moment.level ? moment.level - 1 : 0;
  return (
    <Animated.View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.y }, a]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs><Pattern id="logscan" width={3} height={3} patternUnits="userSpaceOnUse"><Rect x={0} y={0} width={3} height={1} fill="rgba(0,0,0,0.06)" /></Pattern></Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#logscan)" />
      </Svg>
      <Mono size={11} color="rgba(0,0,0,0.6)" ls={0.14} style={{ position: 'absolute', left: 14, top: 58 }}>EV.02 // 記録</Mono>
      <Animated.View style={[{ position: 'absolute', right: 22, top: 96, transform: [{ rotate: '-8deg' }] }, sa]}>
        <Stamp size={Math.min(110, width * 0.26)} />
      </Animated.View>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Mono size={11} color="#000" ls={0.3}>{`LOGGED // ${sj.name}`}</Mono>
        {moment.level ? (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Mono size={11} color="rgba(0,0,0,0.7)" ls={0.3}>SYSTEM UPGRADE</Mono>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
              <D size={30} color="rgba(0,0,0,0.45)">{lvBefore}</D>
              <Mono size={14} color="rgba(0,0,0,0.45)">→</Mono>
              <D size={92} color="#000" style={{ lineHeight: 92 }}>{moment.level}</D>
            </View>
            <J size={15} w="900" color="#000">{`レベルが上がりました · ${sj.name} ${moment.min}分`}</J>
          </View>
        ) : (
          <>
            <D size={92} color="#000" style={{ lineHeight: 92, letterSpacing: -2 }}>{`+${moment.min >= 60 ? hm(moment.min) : moment.min}`}</D>
            <J size={15} w="900" color="#000">{moment.min >= 60 ? `${sj.name}を記録しました` : `${sj.name} ${moment.min}分を記録しました`}</J>
          </>
        )}
        <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Barcode n={26} h={16} color="#000" />
          <Mono size={10} color="#000" ls={0.1}>{`+${moment.exp} XP${moment.ticket ? ' · 休み券 +1' : ''}`}</Mono>
        </View>
        <Mono size={9.5} color="rgba(0,0,0,0.5)" ls={0.1}>{`GOAL ${hm(goal)}`}</Mono>
      </View>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 34, alignItems: 'center' }}><Barcode n={64} h={12} color="#000" /></View>
    </Animated.View>
  );
}

/** 済: a red seal, the character in a serif inside a thick square ring, the ink a little uneven. */
function Stamp({ size }: { size: number }) {
  const ink = '#D8233A';
  const g = size * 0.62, off = (size - g) / 2;
  // where the ink didn't take: a few specks, the same every time
  const specks = Array.from({ length: 22 }, (_, i) => [((i * 37) % 97) / 97, ((i * 61) % 89) / 89, 0.6 + ((i * 13) % 7) / 7] as const);
  return (
    <Svg width={size} height={size} accessibilityLabel="済">
      <Rect x={2.5} y={2.5} width={size - 5} height={size - 5} fill="none" stroke={ink} strokeWidth={5} />
      <Path d={SAI} fill={ink} transform={`translate(${off} ${off}) scale(${g / 1000})`} />
      {specks.map(([x, y, r], i) => <Circle key={i} cx={x * size} cy={y * size} r={r} fill={C.y} opacity={0.8} />)}
    </Svg>
  );
}

export const moments: MomentKit = { start: Start, todo: Todo, target: Target, record: Record };
