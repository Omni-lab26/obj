import { router } from 'expo-router';
import { ReactNode, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { FREE, subj } from '@/data';
import { clock, go, jpHm, session, useNext, useSession } from '@/screens/model';
import { getState, startFree, startFrom, togglePause, useStore } from '@/store';
import { useT } from '@/theme';
import { Btn, haptic, Press, SubjTile, Txt } from '@/ui/base';
import { STUDY_BAR_H, studyBarBottom } from '@/ui/Chrome';
import { Dialog } from '@/ui/Dialog';
import { Glass } from '@/ui/Glass';
import { Icon } from '@/ui/Icon';

// The study bar, like a music app's mini player, always on the tab bar on every
// tab. Not studying, it shows the timetable: the plan whose time has come (with
// ▶), else the next one. 勉強を開始 starts that plan, or — when no plan's time
// has come — 自習 at once and opens the timer (the subject and what it was are
// written on the record page). Once you start, it shows the time studied and pause. Tap it and the timer opens. Pull it down to put it
// away: the time stops and it asks whether to record (the clock never runs
// on with the bar gone). It goes when you record.

/** Pull the bar down to finish: the time stops and a card asks to record it, write a memo first, or go on. A theme's own bar can wrap itself in this too. */
export function SwipeToRecord({ children }: { children: ReactNode }) {
  const y = useSharedValue(0);
  const [ask, setAsk] = useState(false);
  const [was, setWas] = useState(false); // whether the clock was running when you pulled
  const pulled = () => {
    const c = getState();
    if (!c.running) return;
    haptic.warn();
    setWas(!c.paused);
    if (!c.paused) togglePause(); // nothing runs behind the question
    setAsk(true);
  };
  const [pan] = useState(() => Gesture.Pan().activeOffsetY(8).failOffsetX([-16, 16])
    .onUpdate((e) => { y.value = e.translationY > 0 ? Math.min(60, e.translationY * 0.6) : e.translationY * 0.15; })
    .onEnd((e) => {
      if (e.translationY > 28 || e.velocityY > 600) scheduleOnRN(pulled);
      y.value = withSpring(0, { duration: 340, dampingRatio: 0.7 });
    }));
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const goOn = () => { setAsk(false); const c = getState(); if (was && c.running && c.paused) togglePause(); };
  const save = () => { setAsk(false); session.saveNow(); };
  const saveAll = () => { setAsk(false); session.saveAll(); };
  const memo = () => { setAsk(false); router.push('/record'); };
  return (
    <>
      <GestureDetector gesture={pan}><Animated.View style={a}>{children}</Animated.View></GestureDetector>
      <AskRecord open={ask} goOn={goOn} save={save} saveAll={saveAll} memo={memo} />
    </>
  );
}

function AskRecord({ open, goOn, save, saveAll, memo }: { open: boolean; goOn: () => void; save: () => void; saveAll: () => void; memo: () => void }) {
  return (
    <Dialog open={open} close={goOn} title="記録しますか？">
      {/* what it says counts the time, so it's only there while the card is open */}
      {open ? <AskBody save={save} saveAll={saveAll} memo={memo} goOn={goOn} /> : null}
    </Dialog>
  );
}
function AskBody({ save, saveAll, memo, goOn }: { save: () => void; saveAll: () => void; memo: () => void; goOn: () => void }) {
  const ss = useSession();
  const held = useStore((s) => s.held);
  const min = Math.max(1, Math.round(ss.elapsed / 60));
  const all = held.reduce((n, h) => n + Math.max(1, Math.round(h.sec / 60)), min);
  return (
    <View style={{ gap: 10, paddingHorizontal: 20, paddingBottom: 20 }}>
      <Txt size={14} tone="ink2" style={{ marginBottom: 6 }}>
        {`${ss.subject.name} ${min}分${held.length ? `（ほかに記録まちが${held.length}つ）` : ''}。バーを消すと時間は止まります。記録すると今日の合計に入ります`}
      </Txt>
      {ss.subject.id === FREE ? (
        // 自習: the subject and what it was are written on the record page
        <Btn kind="primary" wide label={`${min}分を記録する（科目と内容を書く）`} onPress={memo} />
      ) : held.length ? (
        <Btn kind="primary" wide label={`ぜんぶ記録する（${jpHm(all)}）`} onPress={saveAll} />
      ) : (
        <Btn kind="primary" wide label={`${min}分を記録する`} onPress={save} />
      )}
      {ss.subject.id === FREE ? null : <Btn kind="quiet" wide label="メモを書いて記録する" onPress={memo} />}
      <Btn kind="ghost" wide label="続ける" onPress={goOn} />
    </View>
  );
}

/** What the bar says on its second line: the time studied, and the timetable block's length when it came from one. (Paused, the words turn crimson instead of saying so.) */
function line(ss: ReturnType<typeof useSession>) {
  return ss.next ? `${clock(ss.elapsed)} · 次 ${ss.next.subject.name} ${ss.next.at}` : ss.plan ? `${clock(ss.elapsed)} · 予定 ${jpHm(ss.plan / 60)}` : clock(ss.elapsed);
}
/** Paused: the bar's words in crimson (紅). */
export const CRIMSON = '#D7003A';
/** The time running: a fluorescent green dot. */
export const NEON = '#39FF14';

export function StandardStudyBar({ insets }: { insets: EdgeInsets }) {
  const running = useStore((s) => s.running);
  return running ? <RunningBar insets={insets} /> : <PlanBar insets={insets} />;
}

/**
 * Not studying, the bar always offers 勉強を開始, beside the timetable: when a
 * plan's time has come, that plan — what to do and its memo; before then, the
 * next one and when. 勉強を開始 starts the plan whose time it is; otherwise
 * you pick what to study, it starts, and goes into today's timetable.
 */
function PlanBar({ insets }: { insets: EdgeInsets }) {
  const t = useT();
  const pick = useNext();
  const blocks = useStore((s) => s.timetable);
  const now = pick.from === 'now';
  const timed = now || pick.from === 'next';
  const sj = subj(pick.s);
  const b = pick.blockId ? blocks.find((x) => x.id === pick.blockId) : undefined;
  const when = now ? (pick.end ? `いま · ${pick.start}–${pick.end}` : `いま · ${pick.start}から`)
    : timed ? `次 · ${pick.start}から${pick.inMin && pick.inMin > 0 && pick.inMin < 90 ? `（あと${pick.inMin}分）` : ''}` : '';
  const begin = () => {
    if (now) { haptic.firm(); startFrom({ s: pick.s, min: pick.min, next: pick.next, blockId: pick.blockId }); return; }
    // no plan's time has come: 自習 at once, straight to the timer; its subject and what it was are written when it's recorded
    haptic.firm();
    startFree();
    router.push('/timer');
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: studyBarBottom(insets.bottom), paddingHorizontal: 20 }}>
      <Glass radius={20} frost style={{ height: STUDY_BAR_H }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 8, gap: 8 }}>
          <Press onPress={go.timer} scale={0.98} accessibilityRole="button" accessibilityLabel={timed ? `${when} ${sj.name} ${b?.t ?? ''}。タイマーを開く` : '今日の時間割。タイマーを開く'}
            style={{ flex: 1, minWidth: 0, height: STUDY_BAR_H, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {timed ? (
              <View style={{ opacity: now ? 1 : 0.5 }}><SubjTile name={sj.name} color={sj.c} size={40} /></View>
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="cal" size={17} color={t.ink2} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={14} w="600" lh={18} numberOfLines={1}>{timed ? (now ? (b?.t ?? sj.name) : `${sj.name}${b?.t ? ` · ${b.t}` : ''}`) : '今日の時間割'}</Txt>
              <Txt num size={11.5} lh={15} color={now ? t.ink2 : t.ink3} numberOfLines={1}>{timed ? (now && b?.note ? `${when} · ${b.note}` : when) : 'このあとの予定はありません'}</Txt>
            </View>
          </Press>
          <Press onPress={begin} haptics={false} scale={0.95} accessibilityLabel={now ? `${sj.name}の勉強を開始` : '勉強を開始'}
            style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: t.ink, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="play" size={11} color={t.onInk} filled />
            <Txt size={13} w="700" color={t.onInk}>勉強を開始</Txt>
          </Press>
        </View>
      </Glass>
    </View>
  );
}

function RunningBar({ insets }: { insets: EdgeInsets }) {
  const t = useT();
  const ss = useSession();
  const playing = ss.running && !ss.paused;
  const press = () => { haptic.soft(); togglePause(); };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: studyBarBottom(insets.bottom), paddingHorizontal: 20 }}>
      <SwipeToRecord>
        <Glass radius={20} frost style={{ height: STUDY_BAR_H }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 6, gap: 4 }}>
            <Press onPress={go.timer} scale={0.98} accessibilityRole="button"
              accessibilityLabel={`${ss.subject.name}を${ss.paused ? '一時停止中' : '勉強中'}。${line(ss)}。タイマーを開く`}
              style={{ flex: 1, minWidth: 0, height: STUDY_BAR_H, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View>
                <SubjTile name={ss.subject.name} color={ss.subject.c} size={40} />
                {playing ? <View style={{ position: 'absolute', left: -3, top: -3, width: 11, height: 11, borderRadius: 6, backgroundColor: NEON, borderWidth: 2, borderColor: t.surface }} /> : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={14} w="600" lh={18} color={ss.paused ? CRIMSON : undefined} numberOfLines={1}>{ss.subject.name}</Txt>
                <Txt num size={11.5} lh={15} color={ss.paused ? CRIMSON : t.ink3} numberOfLines={1}>{line(ss)}</Txt>
              </View>
            </Press>
            <Press onPress={press} haptics={false} scale={0.86} hitSlop={6}
              accessibilityLabel={playing ? '一時停止' : '再開'}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={playing ? 'pause' : 'play'} size={20} color={t.ink} filled />
            </Press>
          </View>
          {/* from the timetable: how far toward the block's length, green inside it, red past it */}
          {ss.plan ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 0, height: 2.5, borderRadius: 2, backgroundColor: t.line, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (ss.elapsed / ss.plan) * 100)}%`, height: '100%', backgroundColor: ss.elapsed > ss.plan ? '#FF453A' : '#30D158' }} />
            </View>
          ) : null}
        </Glass>
      </SwipeToRecord>
    </View>
  );
}
