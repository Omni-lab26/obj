import { useMemo } from 'react';
import { ScrollView } from 'react-native';

import { pastContents } from '../lib/contents';
import { useStore } from '../store';
import { useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { StdChip } from './Form';
import { useStd } from './stdLook';

// What you've written before (lib/contents), as chips under a field where you
// write what you studied: a tap puts it in, so it's written the same way.

export function ContentHints({ s, typed, onPick }: { s: string | null; typed: string; onPick: (text: string) => void }) {
  const t = useT();
  const std = useStd();
  const sessions = useStore((x) => x.sessions);
  const timetable = useStore((x) => x.timetable);
  const list = useMemo(() => pastContents(sessions, timetable, s, typed), [sessions, timetable, s, typed]);
  if (!list.length) return null;
  return (
    // スタンダード: chips on a 2pt floor; the row leaves room around them (a scroller clips what's outside it)
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[{ gap: 6 }, std && { gap: 8, paddingHorizontal: 3, paddingTop: 3, paddingBottom: 5 }]} accessibilityLabel="前に書いた内容">
      {list.map((w) => std ? <StdChip key={w} role="button" label={w} a11y={`${w}を入れる`} onPress={() => { haptic.tap(); onPick(w); }} /> : (
        <Press key={w} onPress={() => { haptic.tap(); onPick(w); }} scale={0.95} accessibilityLabel={`${w}を入れる`}
          style={{ height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: t.sunken, justifyContent: 'center' }}>
          <Txt size={13} tone="ink2" numberOfLines={1}>{w}</Txt>
        </Press>
      ))}
    </ScrollView>
  );
}
