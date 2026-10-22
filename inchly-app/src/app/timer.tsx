import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hm, pad, subj, SUBJ } from '@/data';
import { elapsedOf, getState, setSubject, setTarget, startStudy, togglePause, useNow, useStore } from '@/store';
import { focus, hair } from '@/theme';
import { haptic, Press, Txt } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { SlideToRecord } from '@/ui/SlideToRecord';
import { TimeScrubber } from '@/ui/TimeScrubber';
import { toast } from '@/ui/Toast';

// Focus timer: always dark. The subject sits on top, large. By default the
// readout counts up (the time that gets recorded) with the target as a thin
// bar; in 目安 mode it counts down the planned session on two rulers (hours
// above, minutes below) — drag or fling either to adjust. Slide to record
// pauses the clock and opens the record page.
const fmt = (sec: number) => {
  const v = Math.max(0, Math.round(sec));
  const h = Math.floor(v / 3600), m = Math.floor(v / 60) % 60, x = v % 60;
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${pad(m)}:${pad(x)}`;
};
const hourLabel = (h: number) => `${h}時間`;
const minLabel = (m: number) => `${m}分`;
type Preview = { h: number | null; m: number | null };

/** The big countdown. It redraws on its own while a ruler moves, so the screen around it stays still. */
function Readout({ sec, over, paused, side, parts, register }: {
  sec: number; over: boolean; paused: boolean; side: string; parts: { h: number; m: number };
  register: (set: (p: Preview) => void) => void;
}) {
  const [p, setP] = useState<Preview>({ h: null, m: null });
  useEffect(() => register(setP), [register]);
  const moving = p.h !== null || p.m !== null;
  const shown = moving ? Math.min(300, (p.h ?? parts.h) * 60 + (p.m ?? Math.floor(parts.m))) * 60 : sec;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, opacity: paused && !moving ? 0.5 : 1 }}
      accessible accessibilityLabel={`${side} ${fmt(shown)}`}>
      {over && !moving ? <Txt num size={40} w="500" color={focus.green} style={{ marginBottom: 6 }}>+</Txt> : null}
      <Rolling value={fmt(shown)} size={60} weight="600" color={over && !moving ? focus.green : focus.ink} />
      <Txt size={13} w="600" color={over && !moving ? focus.green : focus.ink2} style={{ marginBottom: 11 }}>{moving ? 'に設定' : side}</Txt>
    </View>
  );
}

export default function Timer() {
  const insets = useSafeAreaInsets();
  useNow();
  const s = useStore((x) => x);
  const e = elapsedOf(s);
  const sj = subj(s.subj);
  const playing = s.running && !s.paused;
  const rem = s.targetMin * 60 - e;
  const over = s.running && rem < 0;
  const up = s.timerMode === 'up';
  const task = s.todos.find((x) => x.id === s.studyTodo && x.s === s.subj)?.t ?? sj.task;
  const canSwitch = !s.running || e <= 60;

  // One nudge when the planned time is reached.
  const nudged = useRef(false);
  useEffect(() => {
    if (!s.running) nudged.current = false;
    else if (over && !nudged.current) {
      nudged.current = true;
      haptic.success();
      toast(`目標の${Math.round(s.targetMin)}分に届きました`, 'このまま続けても、記録してもOK');
    }
  }, [over, s.running, s.targetMin]);

  const pickSubject = (id: string) => {
    if (id === s.subj) return;
    const cur = getState();
    if (cur.running && elapsedOf(cur) > 60) {
      haptic.warn();
      toast('勉強中の科目は変えられません', '記録してから切り替えましょう');
      return;
    }
    if (cur.running) startStudy(id);
    else setSubject(id);
  };
  const main = () => {
    haptic.firm();
    if (!s.running) startStudy(s.subj);
    else togglePause();
  };
  // Rulers: the planned length while idle, the remaining time while running, split into hours and minutes.
  const left = s.running ? Math.max(0, rem) / 60 : s.targetMin;
  const parts = { h: Math.min(5, Math.floor(left / 60)), m: left - Math.min(5, Math.floor(left / 60)) * 60 };
  const side = over ? '超過' : s.running ? '残り' : 'に集中';

  // While a ruler moves, only the readout hears about it.
  const preview = useRef<Preview>({ h: null, m: null });
  const pushPreview = useRef<(p: Preview) => void>(() => {});
  const register = useCallback((set: (p: Preview) => void) => { pushPreview.current = set; }, []);
  const onHoursPreview = useCallback((v: number | null) => { preview.current = { ...preview.current, h: v }; pushPreview.current(preview.current); }, []);
  const onMinsPreview = useCallback((v: number | null) => { preview.current = { ...preview.current, m: v }; pushPreview.current(preview.current); }, []);
  // A session is at most 5:00; a 5 on the hours ruler takes the minutes back to 0.
  const setTotal = (raw: number) => {
    const total = Math.min(300, raw);
    const cur = getState();
    if (cur.running) setTarget(elapsedOf(cur) / 60 + total);
    else setTarget(Math.max(5, total));
  };
  const partsNow = () => {
    const cur = getState();
    const l = cur.running ? Math.max(0, cur.targetMin * 60 - elapsedOf(cur)) / 60 : cur.targetMin;
    const h = Math.min(5, Math.floor(l / 60));
    return { h, m: l - h * 60 };
  };
  const onHours = useCallback((h: number) => setTotal(h * 60 + Math.round(partsNow().m)), []);
  const onMins = useCallback((m: number) => setTotal(partsNow().h * 60 + m), []);

  // Slide to record: stop the clock where it is and fill in the record page.
  const toRecord = useCallback(() => {
    const cur = getState();
    if (cur.running && !cur.paused) togglePause();
    router.push('/record');
  }, []);

  return (
    <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 16 }}>
      <StatusBar style="light" />
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <Press onPress={() => router.back()} scale={0.86} accessibilityLabel="閉じる" hitSlop={6}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ transform: [{ rotate: '-90deg' }] }}>
            <Icon name="back" size={22} color={focus.ink2} />
          </View>
        </Press>
      </View>

      {/* what you're studying, first and large */}
      <View style={{ alignItems: 'center', gap: 2, paddingHorizontal: 24, paddingTop: 4 }} accessible accessibilityLabel={`${sj.name} ${task}`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: sj.c }} />
          <Txt size={32} w="800" color={focus.ink}>{sj.name}</Txt>
        </View>
        <Txt size={13} color={focus.ink2} numberOfLines={1}>{task}</Txt>
      </View>
      {/* the subject can change before starting and in the first minute, so the chips show only then */}
      {canSwitch ? <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 12 }} accessibilityRole="radiogroup" accessibilityLabel="科目を変える">
        {SUBJ.map((x) => {
          const on = x.id === s.subj;
          return (
            <Pressable key={x.id} onPress={() => pickSubject(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} hitSlop={{ top: 8, bottom: 8 }}
              style={({ pressed }) => ({ height: 30, paddingHorizontal: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: on ? 'rgba(255,255,255,0.08)' : 'transparent', borderWidth: hair, borderColor: on ? 'rgba(255,255,255,0.16)' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: x.c, opacity: on ? 1 : 0.6 }} />
              <Txt size={12} w="600" color={on ? '#fff' : 'rgba(255,255,255,0.55)'}>{x.name}</Txt>
            </Pressable>
          );
        })}
      </View> : null}

      <View style={{ flex: 1, minHeight: 24 }} />

      {up ? (
        <>
          <Readout sec={e} over={false} paused={s.paused} side="勉強した時間" parts={parts} register={register} />
          {/* the target as a thin bar under the count, in the subject's color */}
          <View style={{ marginTop: 18, marginHorizontal: 40, gap: 6 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: focus.raise, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (e / (s.targetMin * 60)) * 100)}%`, height: 4, borderRadius: 2, backgroundColor: over ? '#F2B705' : sj.c }} />
            </View>
            <Txt size={11.5} color={focus.ink3} style={{ textAlign: 'center' }}>
              {s.paused ? '一時停止中' : over ? `目安の${Math.round(s.targetMin)}分をこえました` : `目安 ${Math.round(s.targetMin)}分まで あと ${fmt(Math.max(0, rem))}`}
            </Txt>
          </View>
        </>
      ) : (
        <>
          <Readout sec={over ? -rem : s.running ? rem : s.targetMin * 60} over={over} paused={s.paused} side={side} parts={parts} register={register} />
          <Txt size={11.5} color={focus.ink3} style={{ textAlign: 'center', marginTop: 2 }}>
            {s.paused ? '一時停止中' : s.running ? `勉強した時間 ${fmt(e)}` : '目盛りを動かして、集中する時間を決めます'}
          </Txt>
        </>
      )}

      {up ? null : <View style={{ marginTop: 22, marginHorizontal: 20, gap: 4 }}>
        <Txt size={11} w="600" color={focus.ink3}>時間</Txt>
        <TimeScrubber value={parts.h} onChange={onHours} onPreview={onHoursPreview} min={0} max={5} step={1} px={56} minor={0.25} mid={0.5} major={1}
          label={hourLabel} bg={focus.bg} dark a11y={s.running ? '残り時間の時間' : '集中する時間の時間'} />
        <Txt size={11} w="600" color={focus.ink3} style={{ marginTop: 4 }}>分</Txt>
        <TimeScrubber value={parts.m} onChange={onMins} onPreview={onMinsPreview} min={0} max={59} step={5} px={10} minor={1} mid={5} major={15}
          label={minLabel} bg={focus.bg} dark a11y={s.running ? '残り時間の分' : '集中する時間の分'} />
      </View>}

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 14 }}>
        <Txt size={11.5} color={focus.ink2}>今日 <Txt num size={12} w="600" color="#fff">{hm(s.todayMin)}</Txt></Txt>
        <Txt size={11.5} color={focus.ink2}>目標 <Txt num size={12} w="600" color="#fff">{hm(s.goalMin).replace('00分', '')}</Txt></Txt>
      </View>

      <View style={{ alignItems: 'center', marginTop: 26 }}>
        <Press onPress={main} haptics={false} scale={0.92} accessibilityLabel={playing ? '一時停止' : s.running ? '再開' : '開始'}
          style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: focus.ink, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 0px 0px 6px rgba(255,255,255,0.06)' }}>
          <Icon name={playing ? 'pause' : 'play'} size={24} color={focus.bg} />
        </Press>
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />
      <View style={{ marginHorizontal: 24 }}>
        <SlideToRecord disabled={!s.running} onDone={toRecord} />
      </View>
    </Screen>
  );
}
