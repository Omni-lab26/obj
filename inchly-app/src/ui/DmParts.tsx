import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { ROOM } from '@/data';
import { mondayIndex } from '@/lib/time';
import { useStore } from '@/store';
import { hair, useT } from '@/theme';
import { Avatar, Press, Txt } from '@/ui/base';
import { openSheet } from '@/ui/Sheet';

// One-to-one messages: the pieces the list (app/messages) and a conversation
// (app/dm/[n]) share — opening one, the times as LINE and Messages show them,
// and the sheet that starts a new one.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];
const day0 = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const daysAgo = (ms: number) => Math.round((day0(Date.now()) - day0(ms)) / 86_400_000);

/** Opens the conversation with this person (a new one if there's none yet). */
export const openDm = (n: string) => router.push({ pathname: '/dm/[n]', params: { n } });

/** The clock time, '9:05'. */
export const clockAt = (ms: number) => { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
/** In the list: today's time, 昨日, the weekday this week, else the date. */
export function listTime(ms: number) {
  const ago = daysAgo(ms);
  const d = new Date(ms);
  if (ago <= 0) return clockAt(ms);
  if (ago === 1) return '昨日';
  if (ago < 7) return `${DOW[mondayIndex(d)]}曜日`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
/** Over a day's messages: 今日, 昨日, else '10月26日(月)'. */
export function dayLabel(ms: number) {
  const ago = daysAgo(ms);
  const d = new Date(ms);
  return ago <= 0 ? '今日' : ago === 1 ? '昨日' : `${d.getMonth() + 1}月${d.getDate()}日(${DOW[mondayIndex(d)]})`;
}
export const sameDay = (a: number, b: number) => day0(a) === day0(b);

/** 新しいメッセージ: whom to write to — the people you follow first, then the rest of the study room. */
export function newDmSheet() {
  openSheet((close) => <NewDm close={close} />);
}
function NewDm({ close }: { close: () => void }) {
  const t = useT();
  const following = useStore((s) => s.following);
  const blocked = useStore((s) => s.blocked);
  const people = ROOM.filter((p) => !blocked.includes(p.n)).sort((a, b) => Number(following.includes(b.h)) - Number(following.includes(a.h)));
  return (
    <View style={{ gap: 10 }}>
      <Txt size={17} w="700" accessibilityRole="header">新しいメッセージ</Txt>
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        {people.map((p, i) => (
          <Press key={p.h} onPress={() => { close(); openDm(p.n); }} scale={0.99} accessibilityLabel={`${p.n}にメッセージを送る`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}>
            {i ? <View style={{ position: 'absolute', top: 0, left: 52, right: 0, height: hair, backgroundColor: t.line }} /> : null}
            <Avatar name={p.n} color={p.c} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={14.5} w="700">{p.n}</Txt>
              <Txt size={12} tone="ink3" numberOfLines={1}>{`@${p.h} · ${p.g}${following.includes(p.h) ? ' · フォロー中' : ''}`}</Txt>
            </View>
          </Press>
        ))}
      </ScrollView>
    </View>
  );
}
