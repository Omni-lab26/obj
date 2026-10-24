import { View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { clock, go, jpHm, session, useSession } from '@/screens/model';
import { togglePause, useStore } from '@/store';
import { useT } from '@/theme';
import { haptic, Press, SubjTile, Txt } from '@/ui/base';
import { STUDY_BAR_H, studyBarBottom } from '@/ui/Chrome';
import { Glass } from '@/ui/Glass';
import { Icon } from '@/ui/Icon';

// The study bar, like a music app's mini player: it sits on the tab bar on
// every tab. Before a session it holds the last subject and time, and ▶
// starts it there and then; during one it is the timer (time, pause). Tap it
// and the timer opens.

/** What the bar says on its second line. */
function line(ss: ReturnType<typeof useSession>, before: boolean) {
  if (!ss.running) return `${before ? '前回の続き · ' : ''}${ss.task}`;
  const time = ss.mode === 'goal'
    ? (ss.over ? `目安をこえて ${clock(ss.elapsed - ss.target)}` : `のこり ${clock(ss.remaining)}`)
    : `${clock(ss.elapsed)} · 目安 ${jpHm(ss.target / 60)}`;
  return `${ss.paused ? '一時停止中 · ' : ''}${time}`;
}

export function StandardStudyBar({ insets }: { insets: EdgeInsets }) {
  const t = useT();
  const ss = useSession();
  const before = useStore((s) => s.sessions.length > 0);
  const playing = ss.running && !ss.paused;
  const press = () => {
    if (!ss.running) { session.start(); return; }
    haptic.soft();
    togglePause();
  };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: studyBarBottom(insets.bottom), paddingHorizontal: 20 }}>
      <Glass radius={20} style={{ height: STUDY_BAR_H }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 6, gap: 4 }}>
          <Press onPress={go.timer} scale={0.98} accessibilityRole="button"
            accessibilityLabel={ss.running ? `${ss.subject.name}を勉強中。${line(ss, before)}。タイマーを開く` : `${ss.subject.name} ${jpHm(ss.target / 60)}。タイマーを開く`}
            style={{ flex: 1, minWidth: 0, height: STUDY_BAR_H, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <SubjTile name={ss.subject.name} color={ss.subject.c} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={14} w="600" lh={18} numberOfLines={1}>{ss.running ? ss.subject.name : `${ss.subject.name} · ${jpHm(ss.target / 60)}`}</Txt>
              <Txt num size={11.5} tone="ink3" lh={15} numberOfLines={1}>{line(ss, before)}</Txt>
            </View>
          </Press>
          <Press onPress={press} haptics={false} scale={0.86} hitSlop={6}
            accessibilityLabel={ss.running ? (playing ? '一時停止' : '再開') : `${ss.subject.name}を始める`}
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={playing ? 'pause' : 'play'} size={20} color={t.ink} filled />
          </Press>
        </View>
        {/* how far along: toward the target, in the subject's color */}
        {ss.running ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 0, height: 2.5, borderRadius: 2, backgroundColor: t.line, overflow: 'hidden' }}>
            <View style={{ width: `${Math.min(100, (ss.elapsed / Math.max(1, ss.target)) * 100)}%`, height: '100%', backgroundColor: ss.subject.c }} />
          </View>
        ) : null}
      </Glass>
    </View>
  );
}
