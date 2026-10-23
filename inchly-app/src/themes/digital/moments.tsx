import { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { subj } from '@/data';
import type { Moment } from '@/moments';
import type { MomentKit } from '@/themes/types';
import { Look, useLook } from './look';
import { Ann, Blink, J, M, Seg } from './parts';

// デジタル's moments: the device beeps. A display pops up over the screen —
// the chrono starting, "donE" for a ToDo, the alarm at the target, the
// figures saved when a session is recorded (and the level, when it goes up).

/** Calls done once, after ms (the first done: a new moment remounts the show). */
function useAutoDone(done: () => void, ms: number) {
  const [first] = useState(() => done);
  useEffect(() => { const id = setTimeout(first, ms); return () => clearTimeout(id); }, [first, ms]);
}

/** In with a click, hold, out: 0 → 1 → 0. */
function useShow(hold: number) {
  const k = useSharedValue(0);
  useEffect(() => {
    k.set(withSequence(withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }), withDelay(hold, withTiming(0, { duration: 200 }))));
  }, [k, hold]);
  return k;
}

/** The window a moment shows in, set in a dark bezel. */
function Window({ L, children }: { L: Look; children: ReactNode }) {
  return (
    <View style={{ alignSelf: 'stretch', marginHorizontal: 26, borderRadius: 14, backgroundColor: L.body, padding: 8, boxShadow: `0px 14px 40px rgba(0,0,0,0.45), 0px 0px 0px 1px ${L.key.base}` }}>
      <View style={{ borderRadius: 9, backgroundColor: L.win.bg, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', gap: 6,
        boxShadow: `inset 0px 3px 8px rgba(0,0,0,0.3), 0px 0px 0px 1.5px ${L.win.edge}` }}>
        {children}
      </View>
    </View>
  );
}
const winLook = (L: Look): Look => ({ ...L, t: { ...L.t, canvas: L.win.bg } });

function Start({ moment, done }: { moment: Extract<Moment, { kind: 'start' }>; done: () => void }) {
  useAutoDone(done, 1400);
  const L = useLook();
  const k = useShow(950);
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.94 + 0.06 * k.value }] }));
  const sj = subj(moment.subject);
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Animated.View style={a}>
        <Window L={L}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Ann on color={L.win.ink} look={winLook(L)}>CHRONO</Ann>
            <Ann plain color={L.accent}>START</Ann>
          </View>
          <Blink period={500}><Seg text="00:00" h={58} color={L.win.seg} ghost={L.win.ghost} glow={L.glow} /></Blink>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 5, height: 16, borderRadius: 1, backgroundColor: sj.c }} />
            <J size={15} w="800" color={L.win.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{`${sj.name}を開始`}</J>
          </View>
          <M size={11} color={L.win.ink2} ls={3}>♪ BEEP BEEP</M>
        </Window>
      </Animated.View>
    </View>
  );
}

function Todo({ moment, done }: { moment: Extract<Moment, { kind: 'todo' }>; done: () => void }) {
  useAutoDone(done, 1300);
  const L = useLook();
  const k = useShow(850);
  const { height } = useWindowDimensions();
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ translateY: (k.value - 1) * 40 }] }));
  return (
    <View style={{ flex: 1, paddingTop: height * 0.24 }}>
      <Animated.View style={a}>
        <Window L={L}>
          <Ann on color={L.win.ink} look={winLook(L)}>{moment.all ? 'ALL TODO' : 'TODO'}</Ann>
          <Seg text={moment.all ? 'ALL' : 'donE'} h={50} color={L.win.seg} ghost={L.win.ghost} glow={L.glow} />
          {moment.exp ? <M b size={16} color={L.accent}>{`+${moment.exp} EXP`}</M> : null}
        </Window>
      </Animated.View>
    </View>
  );
}

function Target({ moment, done }: { moment: Extract<Moment, { kind: 'target' }>; done: () => void }) {
  useAutoDone(done, 1700);
  const L = useLook();
  const f = useSharedValue(0);
  useEffect(() => {
    f.set(withSequence(withRepeat(withSequence(withTiming(1, { duration: 1 }), withDelay(180, withTiming(0.15, { duration: 1 })), withDelay(160, withTiming(1, { duration: 1 }))), 3), withDelay(400, withTiming(0, { duration: 240 }))));
  }, [f]);
  const frame = useAnimatedStyle(() => ({ opacity: f.value }));
  // the edge of the screen flashes; the alarm's window stays put until it goes
  const k = useShow(1250);
  const box = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.94 + 0.06 * k.value }] }));
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 5, borderColor: L.accent }, frame]} />
      <Animated.View style={box}>
        <Window L={L}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Ann on color={L.accent} look={winLook(L)}>ALARM</Ann>
            <Ann plain color={L.win.ink2}>TARGET</Ann>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Seg text={String(moment.min)} h={56} color={L.accent} ghost={L.win.ghost} glow={L.glow} />
            <Ann plain color={L.win.ink2}>MIN</Ann>
          </View>
          <J size={13} w="700" color={L.win.ink}>目標の時間に届きました</J>
        </Window>
      </Animated.View>
    </View>
  );
}

function Record({ moment, done }: { moment: Extract<Moment, { kind: 'record' }>; done: () => void }) {
  useAutoDone(done, moment.level ? 2000 : 1600);
  const L = useLook();
  const k = useShow(moment.level ? 1350 : 1000);
  const a = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.94 + 0.06 * k.value }] }));
  const sj = subj(moment.subject);
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <Animated.View style={a}>
        <Window L={L}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Ann on color={L.win.ink} look={winLook(L)}>SAVE</Ann>
            {moment.level ? <Blink period={500}><Ann plain color={L.accent}>LEVEL UP</Ann></Blink> : null}
          </View>
          {moment.level ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
              <Ann plain color={L.win.ink2}>LV</Ann>
              <Seg text={String(moment.level)} h={56} color={L.accent} ghost={L.win.ghost} glow={L.glow} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
              <Seg text={String(moment.min)} h={56} color={L.win.seg} ghost={L.win.ghost} glow={L.glow} />
              <Ann plain color={L.win.ink2}>MIN</Ann>
            </View>
          )}
          <J size={13} w="700" color={L.win.ink} numberOfLines={1}>{`${sj.name} ${moment.min}分を記録`}</J>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <M b size={15} color={L.accent}>{`+${moment.exp} EXP`}</M>
            {moment.ticket ? <M b size={15} color={L.win.ink}>+1 REST</M> : null}
          </View>
        </Window>
      </Animated.View>
    </View>
  );
}

export const moments: MomentKit = { start: Start, todo: Todo, target: Target, record: Record };
