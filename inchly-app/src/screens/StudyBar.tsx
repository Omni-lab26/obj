import { ReactNode, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { clock, go, jpHm, useSession } from '@/screens/model';
import { togglePause } from '@/store';
import { useT } from '@/theme';
import { haptic, Press, SubjTile, Txt } from '@/ui/base';
import { hideStudyBar, STUDY_BAR_H, studyBarBottom } from '@/ui/Chrome';
import { Glass } from '@/ui/Glass';
import { Icon } from '@/ui/Icon';

// The study bar, like a music app's mini player: once you start (from the
// study page, a ToDo, anywhere), it sits on the tab bar on every tab with the
// time and pause. Tap it and the timer opens. Swipe it down and it goes away
// (the clock keeps running; the middle tab still shows the minutes) until you
// open the timer or start again. It goes when you record.

/** Lets the bar be swiped down and away: it follows the finger, and goes past a short pull or a flick. A theme's own bar can wrap itself in this too. */
export function SwipeAway({ children }: { children: ReactNode }) {
  const y = useSharedValue(0);
  const [pan] = useState(() => Gesture.Pan().activeOffsetY(8).failOffsetX([-16, 16])
    .onUpdate((e) => { y.value = e.translationY > 0 ? e.translationY : e.translationY * 0.2; })
    .onEnd((e) => {
      if (e.translationY > 28 || e.velocityY > 600) {
        y.value = withTiming(140, { duration: 180 }, (done) => { if (done) scheduleOnRN(hideStudyBar); });
      } else y.value = withSpring(0, { duration: 320, dampingRatio: 0.8 });
    }));
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: 1 - Math.min(0.6, Math.max(0, y.value) / 140) }));
  return <GestureDetector gesture={pan}><Animated.View style={a}>{children}</Animated.View></GestureDetector>;
}

/** What the bar says on its second line. */
function line(ss: ReturnType<typeof useSession>) {
  const time = ss.mode === 'goal'
    ? (ss.over ? `目安をこえて ${clock(ss.elapsed - ss.target)}` : `のこり ${clock(ss.remaining)}`)
    : `${clock(ss.elapsed)} · 目安 ${jpHm(ss.target / 60)}`;
  return `${ss.paused ? '一時停止中 · ' : ''}${time}`;
}

export function StandardStudyBar({ insets }: { insets: EdgeInsets }) {
  const t = useT();
  const ss = useSession();
  const playing = ss.running && !ss.paused;
  const press = () => { haptic.soft(); togglePause(); };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: studyBarBottom(insets.bottom), paddingHorizontal: 20 }}>
      <SwipeAway>
        <Glass radius={20} style={{ height: STUDY_BAR_H }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 6, gap: 4 }}>
            <Press onPress={go.timer} scale={0.98} accessibilityRole="button"
              accessibilityLabel={`${ss.subject.name}を勉強中。${line(ss)}。タイマーを開く`}
              style={{ flex: 1, minWidth: 0, height: STUDY_BAR_H, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SubjTile name={ss.subject.name} color={ss.subject.c} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={14} w="600" lh={18} numberOfLines={1}>{ss.subject.name}</Txt>
                <Txt num size={11.5} tone="ink3" lh={15} numberOfLines={1}>{line(ss)}</Txt>
              </View>
            </Press>
            <Press onPress={press} haptics={false} scale={0.86} hitSlop={6}
              accessibilityLabel={playing ? '一時停止' : '再開'}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={playing ? 'pause' : 'play'} size={20} color={t.ink} filled />
            </Press>
          </View>
          {/* how far along: toward the target, in the subject's color */}
          <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 0, height: 2.5, borderRadius: 2, backgroundColor: t.line, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (ss.elapsed / Math.max(1, ss.target)) * 100)}%`, height: '100%', backgroundColor: ss.subject.c }} />
          </View>
        </Glass>
      </SwipeAway>
    </View>
  );
}
