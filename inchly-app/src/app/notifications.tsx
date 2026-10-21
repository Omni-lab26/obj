import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOTIFS, Notif, PERSON_COLOR, ROOM } from '@/data';
import { getState, setState, startStudy, toggleFollow, toggleIn, useStore } from '@/store';
import { hair, radius, useT } from '@/theme';
import { Avatar, Btn, Empty, haptic, IconBtn, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Icon, IconName } from '@/ui/Icon';
import { SwipeRow } from '@/ui/SwipeRow';
import { Segmented } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Filter = 'all' | 'imp' | 'study';

// Colour of each kind's square, from the system palette.
const SQUARE: Partial<Record<IconName, string>> = { flag: '#FF9500', target: '#FF9500', bulb: '#FFCC00', cal: '#FF3B30' };

const markRead = (id: number) => setState((s) => (s.notifRead.includes(id) ? {} : { notifRead: [...s.notifRead, id] }));

function Row({ n, unread, joined, onJoin }: { n: Notif; unread: boolean; joined: boolean; onJoin: () => void }) {
  const t = useT();
  const following = useStore((s) => (n.follow ? s.following.includes(n.follow) : false));
  // follow notices name the handle; study notices name the person
  const who = n.join ?? (n.follow ? ROOM.find((p) => p.h === n.follow)?.n : undefined);
  const cta = () => {
    if (n.id === 6) { startStudy('en'); haptic.firm(); toast('英語を始めました', '記録はタイマーを止めたときに残ります'); }
    else toast('外部のページを開きます', '申込は河合塾のサイトで行います');
    markRead(n.id);
  };
  return (
    <Pressable onPress={() => markRead(n.id)} accessibilityLabel={`${unread ? '未読 ' : ''}${n.title}`}
      style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 16 }}>
      {unread ? <View style={{ position: 'absolute', left: 5, top: 26, width: 7, height: 7, borderRadius: 4, backgroundColor: t.tint }} /> : null}
      {who ? (
        <Avatar name={who} color={PERSON_COLOR[who] ?? t.ink3} size={36} />
      ) : (
        // the Settings-style square: a white symbol on its colour
        <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: SQUARE[n.icon] ?? t.tint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={n.icon} size={19} color="#fff" filled width={2} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Txt size={15} w={unread ? '600' : '400'} lh={20} style={{ flex: 1 }}>{n.title}</Txt>
          <Txt size={13} tone="ink3">{n.time}</Txt>
        </View>
        <Txt size={13} tone="ink2" lh={18} style={{ marginTop: 2 }}>{n.sub}</Txt>
        {n.cta || n.join || n.follow ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {n.join ? <Btn small kind="primary" icon="play" label={joined ? '勉強中' : '一緒に始める'} disabled={joined} onPress={onJoin} /> : null}
            {n.cta ? <Btn small kind="tint" label={n.cta} onPress={cta} /> : null}
            {n.follow ? (
              <Btn small kind={following ? 'quiet' : 'primary'} label={following ? 'フォロー中' : 'フォローを返す'}
                onPress={() => { toggleFollow(n.follow!); markRead(n.id); }} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function Notifications() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const [joined, setJoined] = useState<number[]>([]);
  const read = useStore((s) => s.notifRead);
  const gone = useStore((s) => s.notifGone);
  const list = NOTIFS.filter((n) => !gone.includes(n.id) && (filter === 'all' || n.kind === filter));
  const days = [...new Set(list.map((n) => n.day))];

  const readAll = () => {
    setState({ notifRead: NOTIFS.map((n) => n.id) });
    haptic.success();
    toast('すべて既読にしました');
  };
  const remove = (id: number) => {
    setState((s) => ({ notifGone: [...s.notifGone, id] }));
    toast('削除しました', undefined, { label: '元に戻す', run: () => setState((s) => ({ notifGone: s.notifGone.filter((x) => x !== id) })) });
  };
  const join = (n: Notif) => {
    if (getState().running) { toast('もう勉強中です'); return; }
    startStudy();
    haptic.firm();
    setJoined((j) => toggleIn(j, n.id));
    markRead(n.id);
    toast(`${n.join}と一緒に始めました`, '記録はタイマーを止めたときに残ります');
  };

  const emptyTitle = { all: '新しいお知らせはありません', imp: '大事なお知らせはありません', study: '仲間の勉強のお知らせはありません' }[filter];

  return (
    <Screen>
      <NavBar title="お知らせ" right={<IconBtn filled name="check" label="すべて既読にする" onPress={readAll} />} />
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 }}>
        <Segmented value={filter} onChange={setFilter} options={[{ v: 'all', label: 'すべて' }, { v: 'imp', label: '大事なこと' }, { v: 'study', label: '仲間の勉強' }]} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {list.length === 0 ? <Empty title={emptyTitle} sub="仲間が勉強を始めると、ここに届きます" /> : null}
        {days.map((d) => (
          <View key={d}>
            <Txt size={20} w="700" style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8 }}>{d}</Txt>
            <View style={{ marginHorizontal: 16, borderRadius: radius.card, backgroundColor: t.surface }}>
              <View style={{ borderRadius: radius.card, overflow: 'hidden' }}>
                {list.filter((n) => n.day === d).map((n, i) => (
                  <View key={n.id}>
                    {i ? <View style={{ height: hair, backgroundColor: t.line, marginLeft: 64, zIndex: 1 }} /> : null}
                    <SwipeRow bg={t.surface} onRead={() => { markRead(n.id); toast('既読にしました'); }} onDelete={() => remove(n.id)}>
                      <Row n={n} unread={!read.includes(n.id)} joined={joined.includes(n.id)} onJoin={() => join(n)} />
                    </SwipeRow>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
