import { ReactNode, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { clock, go, jpHm, useSession } from '@/screens/model';
import { getState, togglePause } from '@/store';
import { useT } from '@/theme';
import { haptic, Press, SubjTile, Txt } from '@/ui/base';
import { STUDY_BAR_H, studyBarBottom } from '@/ui/Chrome';
import { Glass } from '@/ui/Glass';
import { Icon } from '@/ui/Icon';
import { toast } from '@/ui/Toast';

// The study bar, like a music app's mini player: once you start (from the
// study page, the menu, anywhere), it sits on the tab bar on every tab with the
// time studied and pause. Tap it and the timer opens. Pull it down and the
// time stops (pull again, or press play, and it goes on). It goes when you record.

/** Pull the bar down to pause the time (or start it again): it follows the finger a little and springs back. A theme's own bar can wrap itself in this too. */
export function SwipeToPause({ children }: { children: ReactNode }) {
  const y = useSharedValue(0);
  const [pan] = useState(() => Gesture.Pan().activeOffsetY(8).failOffsetX([-16, 16])
    .onUpdate((e) => { y.value = e.translationY > 0 ? Math.min(46, e.translationY * 0.6) : e.translationY * 0.15; })
    .onEnd((e) => {
      if (e.translationY > 28 || e.velocityY > 600) scheduleOnRN(pauseOrGo);
      y.value = withSpring(0, { duration: 340, dampingRatio: 0.7 });
    }));
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <GestureDetector gesture={pan}><Animated.View style={a}>{children}</Animated.View></GestureDetector>;
}
const pauseOrGo = () => {
  const c = getState();
  if (!c.running) return;
  haptic.soft();
  togglePause();
  toast(c.paused ? '再開しました' : '一時停止しました', c.paused ? '' : 'もう一度下にスライドすると再開します');
};

/** What the bar says on its second line: the time studied, and the timetable block's length when it came from one. */
function line(ss: ReturnType<typeof useSession>) {
  const time = ss.plan ? `${clock(ss.elapsed)} · 予定 ${jpHm(ss.plan / 60)}` : clock(ss.elapsed);
  return `${ss.paused ? '一時停止中 · ' : ''}${time}`;
}

export function StandardStudyBar({ insets }: { insets: EdgeInsets }) {
  const t = useT();
  const ss = useSession();
  const playing = ss.running && !ss.paused;
  const press = () => { haptic.soft(); togglePause(); };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: studyBarBottom(insets.bottom), paddingHorizontal: 20 }}>
      <SwipeToPause>
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
          {/* from the timetable: how far toward the block's length, green inside it, red past it */}
          {ss.plan ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 0, height: 2.5, borderRadius: 2, backgroundColor: t.line, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(100, (ss.elapsed / ss.plan) * 100)}%`, height: '100%', backgroundColor: ss.elapsed > ss.plan ? '#FF453A' : '#30D158' }} />
            </View>
          ) : null}
        </Glass>
      </SwipeToPause>
    </View>
  );
}
