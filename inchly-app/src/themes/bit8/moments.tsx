import { ReactNode, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { subj } from '@/data';
import { T } from '@/themes/kit';
import type { MomentKit } from '@/themes/types';
import { L, useLook } from './look';
import { Fig, PixelArt, SPRITES, STEP, Typed, useBlink, useTyper, Win } from './ui';

// What you did, the way a game would say it: a window drops in with the line
// typing itself out, sparks blink round it, and on starting the screen
// flashes twice. Gone in under two seconds; the toast says the facts.

/** The screen flashes white twice, in steps. */
function Flash({ color = '#FFFFFF' }: { color?: string }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.set(withSequence(withTiming(0.55, { duration: 60, easing: STEP }), withTiming(0, { duration: 70, easing: STEP }), withTiming(0.4, { duration: 60, easing: STEP }), withTiming(0, { duration: 90, easing: STEP })));
  }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color }, a]} />;
}

/** Sparks blinking round the window. */
function Sparks({ color }: { color: string }) {
  const a = useBlink(true, 160, 0);
  const at = [{ left: -18, top: -14 }, { right: -16, top: 6 }, { left: 14, bottom: -18 }, { right: 26, bottom: -20 }, { right: -20, bottom: 30 }];
  return (
    <>
      {at.map((p, i) => (
        <Animated.View key={i} pointerEvents="none" style={[{ position: 'absolute', ...p }, i % 2 ? a : null]}>
          <PixelArt rows={SPRITES.spark} px={2} colors={{ X: color }} />
        </Animated.View>
      ))}
    </>
  );
}

/** A window that drops in (in steps), holds, and goes; done() when it's gone. */
function Pop({ done, ms = 1600, flash, sparks, lit, children }: { done: () => void; ms?: number; flash?: boolean; sparks?: boolean; lit?: boolean; children: (L: L) => ReactNode }) {
  const own = useLook();
  // floating over any screen, so no page shows through its corners
  const L = { ...own, page: 'transparent' };
  const y = useSharedValue(-24);
  const o = useSharedValue(0);
  const end = useRef(done);
  useEffect(() => { end.current = done; }, [done]);
  useEffect(() => {
    y.set(withTiming(0, { duration: 160, easing: STEP }));
    o.set(withSequence(withTiming(1, { duration: 60 }), withDelay(ms - 320, withTiming(0, { duration: 240, easing: STEP }))));
    const id = setTimeout(() => end.current(), ms);
    return () => clearTimeout(id);
  }, [ms, o, y]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
      {flash ? <Flash /> : null}
      <Animated.View style={[{ width: 290, maxWidth: '86%' }, a]}>
        <Win look={L} lit={lit} pad={14}>{children(L)}</Win>
        {sparks ? <Sparks color={L.exp} /> : null}
      </Animated.View>
    </View>
  );
}

/** A line that types itself out. */
function Line({ text, size = 16, color }: { text: string; size?: number; color: string }) {
  const ty = useTyper(text, 22);
  return <Typed text={text} n={ty.n} size={size} lh={Math.round(size * 1.55)} color={color} />;
}

export const moments: MomentKit = {
  start: ({ moment, done }) => (
    <Pop done={done} ms={1400} flash>
      {(L) => (
        <>
          <Line text={`${subj(moment.subject).name}の 勉強を はじめた！`} color={L.text} />
          <T size={13} lh={19} color={L.dim}>▶ このちょうしで いこう</T>
        </>
      )}
    </Pop>
  ),
  todo: ({ moment, done }) => (
    <Pop done={done} ms={1500} sparks={moment.all} lit={moment.all}>
      {(L) => (
        <>
          <Line text={moment.all ? 'すべての クエストを クリアした！' : 'クエストを クリアした！'} color={L.text} />
          {moment.exp ? <Fig size={26} color={L.exp}>{`+${moment.exp} EXP`}</Fig> : null}
        </>
      )}
    </Pop>
  ),
  target: ({ moment, done }) => (
    <Pop done={done} ms={1700} sparks lit>
      {(L) => (
        <>
          <Line text="もくひょうを たっせいした！" color={L.cursor} />
          <T size={13} lh={19} color={L.dim}>{`${moment.min}分 がんばった。このまま つづけても いい。`}</T>
        </>
      )}
    </Pop>
  ),
  record: ({ moment, done }) => (
    <Pop done={done} ms={1900} sparks={!!moment.level || moment.ticket} lit={!!moment.level}>
      {(L) => (
        <>
          <Line text={`${subj(moment.subject).name} ${moment.min}分を きろくした！`} color={L.text} />
          <Fig size={24} color={L.exp}>{`+${moment.exp} EXP`}</Fig>
          {moment.level ? (
            <View style={{ marginTop: 6 }}>
              <T size={15} lh={22} color={L.cursor}>レベルが あがった！</T>
              <Fig size={30} color={L.cursor}>{`LV ${moment.level}`}</Fig>
            </View>
          ) : null}
          {moment.ticket ? <T size={13} lh={20} color={L.mp} style={{ marginTop: 4 }}>やすみけんを てにいれた！</T> : null}
        </>
      )}
    </Pop>
  ),
};
