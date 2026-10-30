import { router } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { FREE, hm, pad, subj } from '@/data';
import { pastContents } from '@/lib/contents';
import { RECORD_MAX, type RecordSheet } from '@/screens/recordSheet';
import { useStore } from '@/store';
import { haptic } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { fadeIn, micro } from '@/ui/motion';
import type { IconId } from './art';
import { R, ring, S, STICKER } from './look';
import { Card, Dot, Dots, J, Key, SubjSquare, useSink } from './parts';
import { Creature, Pix, PixSticker } from './pixel';

// スタンダード's record sheet, after the mock (docs/app/mock/record.html): the
// same sheet (screens/recordSheet.ts), laid out as before — 続ける on the left,
// 記録する on the right (the sheet's one decision: an ink face on a lime floor)
// — with what you write on the one lead card, the memo straight on the paper.
// What's attached is a line of words (not pressable); the − 39分 ＋ plate is
// the one thing with a floor. Sharing is a one-line switch, lime when on. The
// band at the bottom says how today's total changes, and the 140's ring.
// Saved, the paper is laid over and the えらい！ sticker fades in (0.98 → 1, no pop).

const clock = (d: Date) => `${d.getHours()}:${pad(d.getMinutes())}`;
const DOWN = '#C8302A';

export function Record({ r }: { r: RecordSheet }) {
  const insets = useSafeAreaInsets();
  // the memo at 18pt, 17 where its line is too short for the question in one line (the iPhone SE)
  const memoSize = useWindowDimensions().width < 385 ? 17 : 18;
  if (r.empty) return <Empty />;
  const { before, plan, free, subjects, pick, setPick, keepFree, what, setWhat, sj, min, adjust, start, end, note, setNote, share, setShare, phase, todayPart, left, tooLong, back, save } = r;
  const idle = phase === 'idle';
  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* 続ける on the left, 記録する on the right, as a post would have them */}
        <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <Pressable onPress={back} hitSlop={10} accessibilityRole="button" accessibilityLabel="続ける（タイマーにもどる）" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4, marginLeft: -4 }}>
            {({ pressed }) => <J size={15} w="600" lh={20} style={{ opacity: pressed ? 0.6 : 1 }}>続ける</J>}
          </Pressable>
          <Key label={idle ? (tooLong ? `メモが${-left}字多いので記録できません` : `${sj.name} ${min}分を記録する`) : '記録しました'} onPress={save} haptics={false} disabled={!idle}
            fill={S.ink} under={S.limeDeep} kd={4} style={{ height: 40, opacity: tooLong ? 0.5 : 1 }} face={{ paddingHorizontal: 20 }}>
            <J size={14.5} w="800" lh={18} color={idle ? S.onInk : S.ink3}>{idle ? '記録する' : '記録しました'}</J>
          </Key>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 }}>
          <Card hero>
            {free ? (
              // 自習: which subject it was (needed: the charts are by subject), and what — the charts' contents
              <View style={{ gap: 10, paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1.5, borderBottomColor: S.line }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8, rowGap: 2 }}>
                  <J size={13} w="700" lh={17} color={S.ink2}>{pick ? '科目' : '何の科目を勉強した？'}</J>
                  {pick ? null : <J size={11.5} lh={15} color={S.ink3}>選ばなければ、あとで仕分けに</J>}
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 10, paddingBottom: 4 }} accessibilityRole="radiogroup">
                  {/* 自習のまま: several subjects at once, or nothing worth writing — kept as 自習, not sorted later */}
                  <Chip on={keepFree} label="自習のまま" a11y="自習のまま（仕分けない）" color={subj(FREE).c} onPress={() => setPick(keepFree ? null : FREE)} />
                  {subjects.map((x) => <Chip key={x.id} on={pick === x.id} label={x.name} color={x.c} onPress={() => setPick(x.id)} />)}
                </View>
                <TextInput value={what} onChangeText={(v) => setWhat(v.slice(0, 30))} placeholder="内容（例：相対性理論、例題41〜50）" placeholderTextColor={S.ink3}
                  accessibilityLabel="勉強した内容" returnKeyType="done"
                  style={{ height: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: S.paper2, boxShadow: ring(1.5, 'rgba(23,18,31,0.16)'), fontSize: 16, color: S.ink, outlineStyle: 'none' } as object} />
                {/* what you've written before, so it's written the same way (and adds up as one) */}
                <Hints s={pick && pick !== FREE ? pick : null} typed={what} onPick={setWhat} />
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <SubjSquare name={sj.name} color={sj.c} area={sj.area} size={42} round />
              <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, minHeight: 24 }}>
                  <J size={15} w="800" lh={20}>{sj.name}</J>
                  <J size={12.5} lh={17} color={S.ink3} numberOfLines={1} style={{ flex: 1 }}>{free ? what.trim() : sj.task}</J>
                </View>
                {/* the memo, straight on the paper */}
                <TextInput value={note} onChangeText={setNote} multiline editable={idle} placeholder="どこまでやった？ どうだった？" placeholderTextColor={S.ink3}
                  accessibilityLabel="メモ" style={{ minHeight: 78, fontSize: memoSize, lineHeight: 26, color: idle ? S.ink : S.ink2, textAlignVertical: 'top', padding: 0, marginTop: -4, outlineStyle: 'none' } as object} />
                {/* what's attached: words, not pressable */}
                <MetaLine items={[
                  <View key="s" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Dot c={sj.c} /><Meta>{sj.name}</Meta></View>,
                  <Meta key="t">{`${clock(start)}〜${start.getDate() !== end.getDate() ? '翌' : ''}${clock(end)}`}</Meta>,
                  ...(plan ? [<Meta key="p">{min > plan ? `予定の${plan}分をこえて` : `予定の${plan}分の中で`}</Meta>] : []),
                ]} />
                {/* the time, by 5 minutes: the one thing here with a floor */}
                <Stepper min={min} adjust={adjust} disabled={!idle} />
                <ShareSwitch on={share} onPress={() => { if (!idle) return; haptic.tap(); setShare((v) => !v); }} />
              </View>
            </View>
          </Card>
        </ScrollView>

        {/* along the bottom: today's total, and how much room the memo has left */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 8, backgroundColor: S.card, borderTopWidth: 2, borderTopColor: S.ink }}>
          <J size={12.5} lh={17} num color={S.ink3} style={{ flex: 1 }}>
            {`今日 ${hm(before)} → `}<J size={12.5} lh={17} w="800" num>{hm(before + todayPart)}</J>{todayPart < min ? <J size={12} lh={17} color={S.ink3}>{`（前の日に${min - todayPart}分）`}</J> : null}
          </J>
          {note.length ? <J size={12} w="600" lh={14} num color={tooLong ? DOWN : S.ink3}>{String(left)}</J> : null}
          <Ring used={note.length} />
        </View>
      </KeyboardAvoidingView>

      {phase === 'done' ? <Stamp /> : null}
    </Screen>
  );
}

const Meta = ({ children }: { children: ReactNode }) => <J size={12.5} w="600" lh={19} num color={S.ink2}>{children}</J>;
/**
 * The attached words in a line, a · between them. Where the line is too short
 * the words go on in the next line, and no · is left at the end of a line or
 * at the start of one: the lines are laid out from the words' measured widths.
 */
const SEP_W = 16;
function MetaLine({ items }: { items: ReactNode[] }) {
  const [box, setBox] = useState(0);
  const [ws, setWs] = useState<number[]>([]);
  const measured = (i: number, w: number) => setWs((t) => (t[i] === w ? t : Object.assign([...t], { [i]: w })));
  const sep = <View style={{ width: SEP_W, alignItems: 'center' }}><J size={12.5} lh={19} color={S.ink3}>·</J></View>;
  // which words go in which line (all in one until they're measured)
  const lines: number[][] = [];
  const ready = !!box && items.every((_, i) => ws[i] != null);
  if (ready) {
    let x = Infinity;
    items.forEach((_, i) => {
      if (lines.length && x + SEP_W + ws[i] <= box) { lines[lines.length - 1].push(i); x += SEP_W + ws[i]; } else { lines.push([i]); x = ws[i]; }
    });
  } else lines.push(items.map((_, i) => i));
  return (
    <View onLayout={(e) => setBox(Math.floor(e.nativeEvent.layout.width))} style={{ gap: 2, opacity: ready ? 1 : 0 }}>
      {lines.map((line) => (
        <View key={line[0]} style={{ flexDirection: 'row', alignItems: 'center' }}>
          {line.map((i, j) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              {j ? sep : null}
              <View onLayout={(e) => measured(i, Math.ceil(e.nativeEvent.layout.width))}>{items[i]}</View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/** What you've written before (lib/contents), as chips that wrap in the card: a tap puts it in, so it's written the same way. */
function Hints({ s, typed, onPick }: { s: string | null; typed: string; onPick: (text: string) => void }) {
  const sessions = useStore((x) => x.sessions);
  const timetable = useStore((x) => x.timetable);
  const list = useMemo(() => pastContents(sessions, timetable, s, typed), [sessions, timetable, s, typed]);
  if (!list.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 10, paddingBottom: 4 }} accessibilityLabel="前に書いた内容">
      {list.map((w) => (
        <Key key={w} label={`${w}を入れる`} onPress={() => onPick(w)} kd={2} radius={R.chip} style={{ height: 32, maxWidth: '100%' }} face={{ paddingHorizontal: 12 }} hitSlop={{ top: 6, bottom: 6 }}>
          <J size={13} w="500" lh={16} color={S.ink2} numberOfLines={1}>{w}</J>
        </Key>
      ))}
    </View>
  );
}

/** − 39分 ＋ on one plate standing on its floor; only the − / ＋ icon sinks when pressed. */
function Stepper({ min, adjust, disabled }: { min: number; adjust: (d: number) => void; disabled: boolean }) {
  return (
    <View style={{ alignSelf: 'flex-start', height: 36, flexDirection: 'row', marginBottom: 3 }} accessibilityRole="adjustable" accessibilityLabel="勉強した時間">
      <View pointerEvents="none" style={{ position: 'absolute', left: -2, right: -2, top: 1, bottom: -5, borderRadius: R.chip + 2, backgroundColor: S.ink }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: R.chip, backgroundColor: S.card, boxShadow: ring() }} />
      <Step icon="minus" label="5分へらす" off={disabled || min <= 1} onPress={() => adjust(-5)} />
      <View style={{ minWidth: 52, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ position: 'absolute', left: -1, top: 9, bottom: 9, width: 2, backgroundColor: S.line }} />
        <J size={13} w="800" lh={16} num accessibilityLiveRegion="polite" accessibilityLabel={`勉強した時間 ${min}分`}>{`${min}分`}</J>
        <View pointerEvents="none" style={{ position: 'absolute', right: -1, top: 9, bottom: 9, width: 2, backgroundColor: S.line }} />
      </View>
      <Step icon="plus" label="5分ふやす" off={disabled || min >= 600} onPress={() => adjust(5)} />
    </View>
  );
}
function Step({ icon, label, off, onPress }: { icon: IconId; label: string; off: boolean; onPress: () => void }) {
  const s = useSink(2);
  return (
    <Pressable onPress={onPress} onPressIn={s.down} onPressOut={s.up} disabled={off} hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: off }} style={{ width: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={s.style}><Pix name={icon} color={off ? S.ink3 : S.ink} /></Animated.View>
    </Pressable>
  );
}

/** 自分だけのメモ ⇄ タイムラインにも投稿する: one line, a switch at its end (lime when on). */
function ShareSwitch({ on, onPress }: { on: boolean; onPress: () => void }) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => { v.set(micro(on ? 1 : 0)); }, [on, v]);
  const lime = useAnimatedStyle(() => ({ opacity: v.value }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: v.value * 20 }] }));
  const inked = useAnimatedStyle(() => ({ opacity: v.value }));
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel="タイムラインにも投稿する"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, marginTop: -2, paddingTop: 6, borderTopWidth: 1.5, borderTopColor: S.line }}>
      <Pix name={on ? 'people' : 'person'} />
      <J size={13.5} w="700" lh={18} style={{ flex: 1, minWidth: 0 }}>{on ? 'タイムラインにも投稿する' : '自分だけのメモ'}</J>
      <View style={{ width: 46, height: 26, marginRight: 2, borderRadius: 9, backgroundColor: S.paper2, boxShadow: `${ring()}, 0px 3px 0px 2px ${S.ink}` }}>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: 9, backgroundColor: S.lime }, lime]} />
        <Animated.View style={[{ position: 'absolute', left: 4, top: 4, width: 18, height: 18, borderRadius: 5, backgroundColor: S.card, boxShadow: ring(1.5) }, knob]}>
          <Animated.View style={[{ flex: 1, borderRadius: 5, backgroundColor: S.ink }, inked]} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** A subject to pick (自習): a chip on its floor; picked, lime and pressed in (no floor). */
function Chip({ on, label, a11y, color, onPress }: { on: boolean; label: string; a11y?: string; color: string; onPress: () => void }) {
  const s = useSink(2);
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} onPressIn={s.down} onPressOut={s.up} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={a11y ?? label}
      hitSlop={{ top: 4, bottom: 4 }} style={{ height: 34 }}>
      {on ? null : <View pointerEvents="none" style={{ position: 'absolute', left: -2, right: -2, top: 1, bottom: -5, borderRadius: R.chip + 2, backgroundColor: S.ink }} />}
      <Animated.View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: R.chip, backgroundColor: on ? S.lime : S.card, boxShadow: ring() },
        on ? { transform: [{ translateY: 2 }] } : s.style]}>
        <Dot c={color} />
        <J size={13} w="700" lh={16}>{label}</J>
      </Animated.View>
    </Pressable>
  );
}

/** How much of the 140 the memo uses: ink, then amber near the end, red past it. */
function Ring({ used }: { used: number }) {
  const r = 10, c = 2 * Math.PI * r, f = Math.min(1, used / RECORD_MAX);
  const col = used > RECORD_MAX ? DOWN : used > RECORD_MAX - 20 ? S.due : S.ink;
  return (
    <Svg width={26} height={26} pointerEvents="none">
      <Circle cx={13} cy={13} r={r} fill="none" stroke={S.paper2} strokeWidth={3} />
      <Circle cx={13} cy={13} r={r} fill="none" stroke={col} strokeWidth={3} strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 13 13)" />
    </Svg>
  );
}

/** Saved: the paper laid over, and the えらい！ sticker: a star and the word on a white rim with an ink outline, fading in from 0.98. */
function Stamp() {
  const v = useSharedValue(0);
  useEffect(() => { v.set(micro(1)); }, [v]);
  const a = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.98 + 0.02 * v.value }] }));
  return (
    <Animated.View entering={fadeIn()} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 40, backgroundColor: 'rgba(243,238,227,0.74)' }}>
      <Animated.View style={[{ alignItems: 'center' }, a]} accessible accessibilityLabel="えらい！">
        <PixSticker name="star" px={8} />
        <View style={{ marginTop: -26, paddingTop: 7, paddingBottom: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: S.sun, boxShadow: STICKER, transform: [{ rotate: '-5deg' }] }}>
          <Dots size={32} lh={34} up={1} ls={0.6}>えらい！</Dots>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** Nothing to record: back, the page's name, and めぶ asleep. */
function Empty() {
  return (
    <Screen>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={6} accessibilityRole="button" accessibilityLabel="戻る" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Pix name="left" />
        </Pressable>
        <J size={15} w="700" lh={20} style={{ flex: 1, textAlign: 'center', marginRight: 44 }} accessibilityRole="header">この勉強を記録</J>
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: 28 }}>
        {/* the empty box of the mock: a dashed edge on the paper (nothing rests here) */}
        <View style={{ alignItems: 'center', gap: 10, paddingTop: 32, paddingBottom: 28, paddingHorizontal: 20, borderRadius: R.mid, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(23,18,31,0.32)' }}>
          <Creature id="mebu" face="sleep" px={4} />
          <J size={15} w="700" lh={20}>記録する勉強がありません</J>
          <J size={12} lh={17} color={S.ink3} style={{ textAlign: 'center' }}>タイマーで勉強を始めると、ここで記録できます</J>
        </View>
      </View>
    </Screen>
  );
}
