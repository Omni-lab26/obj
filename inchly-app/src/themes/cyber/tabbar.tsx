import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Pattern, Polygon, Rect, Stop } from 'react-native-svg';

import { subj } from '@/data';
import { clock, go, jpHm, useNext, useTicking } from '@/screens/model';
import { SwipeToRecord } from '@/screens/StudyBar';
import { T } from '@/themes/kit';
import type { TabBarProps } from '@/themes/types';
import { elapsedOf, startFree, startFrom, togglePause, useStore } from '@/store';
import { haptic, Press } from '@/ui/base';
import { STUDY_BAR_H, studyBarBottom, TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { TourSpot } from '@/ui/Tour';
import { CIcon, type CIconName } from './icons';
import { C, glow } from './look';
import { Btn, cellW, Cut, Ib, J, Mono, useSize } from './parts';
import { plateOf } from './sign';

// サイバー's bars, after the parts bible. The tab bar is a control deck along
// the bottom with its middle raised: the timetable's key sits there (a red
// light on it while you study); the tab you're on has a yellow light over it
// and its mark in yellow. The study bar is "a process running": the
// subject's plate, ● 計測中, the time, the next plan and a row of LEDs;
// paused, a red edge and stripes.

const ICONS: Record<string, CIconName> = { index: 'home', timeline: 'feed', study: 'study', community: 'users', me: 'user' };

/** The deck: it fills the room the screens leave at the bottom, the middle 92 points raised 16. */
export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  const room = tabBarBottom(insets.bottom) + TAB_BAR_H;
  // the keys keep clear of the home indicator (or of the edge, on a phone with none)
  const row = room - Math.max(4, insets.bottom - 22);
  const [s, onLayout] = useSize();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: room }} onLayout={onLayout}>
      {s ? <Deck w={s.w} h={s.h} /> : null}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: row, flexDirection: 'row', alignItems: 'flex-end' }} accessibilityRole="tablist">
        {items.map((it, i) => (
          <TourSpot key={it.key} id={`tab-${it.name}`} style={{ flex: 1 }}>
            <Press scale={0.92} accessibilityRole="tab" accessibilityState={{ selected: it.focused }} onPress={it.onPress}
              accessibilityLabel={it.center ? (running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`) : it.label}
              style={{ height: it.center ? row : Math.min(TAB_BAR_H - 4, row - 16), alignItems: 'center', justifyContent: it.center ? 'flex-start' : 'center', gap: 4, paddingTop: it.center ? 3 : 0 }}>
              {it.center ? <Key on={it.focused} pip={running && !it.focused} paused={paused} /> : (
                <>
                  {it.focused ? <Lit /> : null}
                  <Mono size={8.5} color={it.focused ? C.y : C.t3} ls={0} style={{ position: 'absolute', left: 8, top: 2, opacity: 0.6 }}>{`0${i + 1}`}</Mono>
                  <CIcon name={ICONS[it.name] ?? 'home'} size={24} color={it.focused ? C.y : C.t3} accent={it.focused ? C.y : C.c} />
                </>
              )}
              <J size={11} w="700" lh={13} color={it.focused ? C.y : C.t3} numberOfLines={1}>{it.center ? '時間割' : it.label}</J>
            </Press>
          </TourSpot>
        ))}
      </View>
    </View>
  );
}

/** The deck's body: dark, a cyan edge brightest over the middle, a row of ticks under it. */
function Deck({ w, h }: { w: number; h: number }) {
  const m = w / 2;
  const pts = `0,16 ${m - 46},16 ${m - 34},0 ${m + 34},0 ${m + 46},16 ${w},16 ${w},${h} 0,${h}`;
  const edge = `0,16.5 ${m - 46},16.5 ${m - 34},0.5 ${m + 34},0.5 ${m + 46},16.5 ${w},16.5`;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="deck" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="rgb(6,10,15)" stopOpacity={0.94} /><Stop offset="1" stopColor="rgb(3,6,10)" stopOpacity={0.98} /></LinearGradient>
        <LinearGradient id="deckedge" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.c} stopOpacity={0.25} /><Stop offset="0.38" stopColor={C.c} /><Stop offset="0.62" stopColor={C.c} /><Stop offset="1" stopColor={C.c} stopOpacity={0.25} />
        </LinearGradient>
        <Pattern id="deckticks" width={7} height={3} patternUnits="userSpaceOnUse"><Rect x={0} y={0} width={1} height={3} fill="rgba(0,240,255,0.22)" /></Pattern>
      </Defs>
      <Polygon points={pts} fill="url(#deck)" />
      <Polygon points={edge} fill="none" stroke="url(#deckedge)" strokeWidth={1} />
      <Rect x={10} y={21} width={w - 20} height={3} fill="url(#deckticks)" />
    </Svg>
  );
}
/** Over the tab you're on: a short yellow light, and its glow falling down. */
function Lit() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={{ position: 'absolute', top: 2, left: '24%', right: '24%', height: 3, backgroundColor: C.y, boxShadow: '0px 0px 12px rgba(252,238,10,0.8)' }} />
      <View style={{ position: 'absolute', top: 2, left: '10%', right: '10%', bottom: 0, backgroundImage: 'radial-gradient(60% 70% at 50% 0%, rgba(252,238,10,0.13), transparent 70%)' }} />
    </View>
  );
}
/** The timetable's key in the raised middle: yellow when you're on it; a red light while you study elsewhere. */
function Key({ on, pip, paused }: { on: boolean; pip: boolean; paused: boolean }) {
  return (
    <View style={{ width: 58, height: 46, alignItems: 'center', justifyContent: 'center', boxShadow: on ? '0px 0px 22px rgba(252,238,10,0.35)' : undefined }}>
      <Cut shape="f1" k={8} fill={on ? C.y : C.panel2} edge={on ? null : C.ln2} />
      <CIcon name="study" size={26} color={on ? '#000' : C.t1} accent={on ? '#000' : C.c} />
      {pip ? <View style={{ position: 'absolute', right: 5, top: 5, width: 6, height: 6, backgroundColor: paused ? C.t2 : C.r, boxShadow: paused ? undefined : `0px 0px 6px ${C.r}` }} /> : null}
    </View>
  );
}

// ---------- the study bar ----------
export function StudyBar({ insets }: { insets: EdgeInsets }) {
  const running = useStore((s) => s.running);
  return running ? <Running insets={insets} /> : <Plan insets={insets} />;
}

/** The bar's panel: cut at two corners; a light down its left side in the subject's color (paused: red stripes). */
function Shell({ color, hold, children }: { color: string; hold?: boolean; children: ReactNode }) {
  return (
    <View style={{ height: STUDY_BAR_H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12, paddingRight: 8, paddingBottom: 3 }}>
      <Cut shape="f1" k={10} fill="rgba(8,16,26,0.97)" edge={hold ? C.r : C.ln2} glow={hold ? 0.3 : 0} />
      {hold ? (
        <Svg width={6} height={STUDY_BAR_H - 16} style={{ position: 'absolute', left: 0, top: 10 }}>
          <Defs><Pattern id="holdstripe" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><Rect x={0} y={0} width={4} height={8} fill={C.r} /><Rect x={4} y={0} width={4} height={8} fill="#000" /></Pattern></Defs>
          <Rect x={0} y={0} width={6} height={STUDY_BAR_H - 16} fill="url(#holdstripe)" />
        </Svg>
      ) : <View style={{ position: 'absolute', left: 0, top: 10, bottom: 6, width: 3, backgroundColor: color, boxShadow: `0px 0px 8px ${color}` }} />}
      {children}
    </View>
  );
}
/** The subject's plate: its code big and its number, in its color. */
function SPlate({ code, no, color, dim }: { code: string; no: string; color: string; dim?: boolean }) {
  return (
    <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: dim ? 0.5 : 1 }}>
      <Cut shape="f3" k={8} fill="#060A0F" edge={`${color}B3`} />
      <T f="chakra" size={15} color={color} lh={17}>{code}</T>
      <Mono size={8.5} color={color} ls={0.04}>{no}</Mono>
    </View>
  );
}

/** Studying: the plate, ● 計測中, the time and what's next, pause; LEDs along the bottom toward the plan's end. Pull it down to stop and record. */
function Running({ insets }: { insets: EdgeInsets }) {
  const subject = subj(useStore((s) => s.subj));
  const paused = useStore((s) => s.paused);
  const plan = useStore((s) => (s.planMin ? Math.round(s.planMin * 60) : null));
  const next = useStore((s) => (s.planMin && s.planNext ? `次 ${s.planNext.at} ${subj(s.planNext.s).name}` : null));
  const { code, no } = plateOf(subject);
  const press = () => { haptic.soft(); togglePause(); };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: studyBarBottom(insets.bottom), paddingHorizontal: 14 }}>
      <TourSpot id="bar">
        <SwipeToRecord>
          <Shell color={subject.c} hold={paused}>
            <Press onPress={go.timer} scale={0.98} accessibilityRole="button"
              accessibilityLabel={`${subject.name}を${paused ? '一時停止中' : '勉強中'}${next ? ` · ${next}` : plan ? ` · 予定 ${jpHm(plan / 60)}` : ''}。タイマーを開く`}
              style={{ flex: 1, minWidth: 0, height: STUDY_BAR_H, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SPlate code={code} no={no} color={subject.c} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <J size={15} w="700" lh={19} numberOfLines={1} style={{ flexShrink: 1 }}>{subject.name}</J>
                  <RecLight paused={paused} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, overflow: 'hidden' }}>
                  <BarTime paused={paused} />
                  {plan ? <Mono size={11} ls={0.04}>{`/ ${Math.round(plan / 60)}:00`}</Mono> : null}
                  {next ? <J size={11.5} color={C.t2} numberOfLines={1} style={{ flexShrink: 1 }}>{next}</J> : null}
                </View>
              </View>
            </Press>
            <Ib name={paused ? 'play' : 'pause'} kind={paused ? 'yp' : 'y'} label={paused ? '再開' : '一時停止'} onPress={press} />
            <Leds plan={plan} paused={paused} />
          </Shell>
        </SwipeToRecord>
      </TourSpot>
    </View>
  );
}
function RecLight({ paused }: { paused: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 7, height: 7, backgroundColor: C.r, boxShadow: paused ? undefined : `0px 0px 6px ${C.r}` }} />
      <J size={11} w="700" color={C.r} lh={14}>{paused ? '一時停止' : '計測中'}</J>
    </View>
  );
}
/** The time studied, each figure in its cell: the one part of the bar that redraws every second. */
function BarTime({ paused }: { paused: boolean }) {
  const time = useTicking((s, now) => clock(elapsedOf(s, now)));
  return (
    <View style={{ flexDirection: 'row' }}>
      {[...time].map((c, i) => (
        <T key={i} f="chakra" size={19} color={paused ? C.t2 : C.c} lh={21} style={[{ width: 19 * cellW(c), textAlign: 'center' }, paused ? null : glow('rgba(0,240,255,0.5)', 8)]}>{c}</T>
      ))}
    </View>
  );
}
/** 24 LEDs toward the plan's end (yellow, the last); red while paused. */
function Leds({ plan, paused }: { plan: number | null; paused: boolean }) {
  const lit = useTicking((s, now) => (plan ? Math.min(24, Math.floor((elapsedOf(s, now) / plan) * 24)) : 0));
  const [w, setW] = useState(0);
  const n = 24, gap = 2, sk = 1.7;
  const cw = w ? (w - sk - gap * (n - 1)) / n : 0;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 12, right: 12, bottom: 4, height: 3 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Svg width={w} height={3}>
          {Array.from({ length: n }, (_, i) => {
            const x0 = i * (cw + gap);
            return <Polygon key={i} points={`${x0 + sk},0 ${x0 + sk + cw},0 ${x0 + cw},3 ${x0},3`} fill={i < lit ? (paused ? C.r : C.c) : i === n - 1 && plan ? C.y : C.steel} />;
          })}
        </Svg>
      ) : null}
    </View>
  );
}

/**
 * Not studying: the timetable's plan whose time has come (or the next one,
 * dimmer), and 勉強を開始 — that plan, or with none left today, 自習 at once
 * (the subject and what it was are written when it's recorded).
 */
function Plan({ insets }: { insets: EdgeInsets }) {
  const pick = useNext();
  const blocks = useStore((s) => s.timetable);
  const now = pick.from === 'now';
  const timed = now || pick.from === 'next';
  const sj = subj(pick.s);
  const b = pick.blockId ? blocks.find((x) => x.id === pick.blockId) : undefined;
  const { code, no } = plateOf(sj);
  const when = now ? (pick.end ? `いま · ${pick.start}–${pick.end}` : `いま · ${pick.start}から`)
    : timed ? `次発 · ${pick.start}${pick.inMin && pick.inMin > 0 && pick.inMin < 90 ? `（あと${pick.inMin}分）` : ''}` : '';
  const begin = () => {
    haptic.firm();
    if (timed) { startFrom({ s: pick.s, min: pick.min, next: pick.next, blockId: pick.blockId }); return; }
    startFree();
    router.push('/timer');
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: studyBarBottom(insets.bottom), paddingHorizontal: 14 }}>
      <Shell color={timed ? sj.c : C.steel}>
        <Press onPress={go.timer} scale={0.98} accessibilityRole="button" accessibilityLabel={timed ? `${when} ${sj.name} ${b?.t ?? ''}。タイマーを開く` : '今日の時間割。タイマーを開く'}
          style={{ flex: 1, minWidth: 0, height: STUDY_BAR_H, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {timed ? <SPlate code={code} no={no} color={sj.c} dim={!now} /> : (
            <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Cut shape="f3" k={8} fill="#060A0F" edge={C.ln2} />
              <CIcon name="cal" size={20} color={C.t2} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <J size={14} w="700" lh={18} numberOfLines={1}>{timed ? (now ? (b?.t ?? sj.name) : `${sj.name}${b?.t ? ` · ${b.t}` : ''}`) : '今日の時間割'}</J>
            <J size={11.5} lh={15} color={now ? C.c : C.t3} numberOfLines={1}>{timed ? (now && b?.note ? `${when} · ${b.note}` : when) : 'このあとの予定はありません'}</J>
          </View>
        </Press>
        <TourSpot id="start">
          <Btn label="勉強を開始" icon="play" small onPress={begin} a11y={timed ? `${sj.name}の勉強を開始` : '勉強を開始（自習）'} />
        </TourSpot>
      </Shell>
    </View>
  );
}
