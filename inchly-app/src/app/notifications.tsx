import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOTIFS, Notif, PERSON_COLOR, ROOM } from '@/data';
import { getState, setState, startStudy, toggleFollow, toggleIn, useStore } from '@/store';
import { hair, lift, radius, useT } from '@/theme';
import { Btn, Empty, haptic, IconBtn, RingAvatar, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Inch } from '@/ui/Sticker';
import { SwipeRow } from '@/ui/SwipeRow';
import { Segmented } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Filter = 'all' | 'imp' | 'study';


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
  // Instagram's activity row: the face (or Inch, for notices from the app),
  // one line with the name in bold and the time in grey, one button on the right.
  return (
    <Pressable onPress={() => markRead(n.id)} accessibilityLabel={`${unread ? '未読 ' : ''}${n.title}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingLeft: 14, paddingRight: 12, backgroundColor: unread ? '#F5FAFF' : 'transparent' }}>
      {who ? (
        <RingAvatar name={who} color={PERSON_COLOR[who] ?? t.ink3} size={40} live={!!n.join} />
      ) : (
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: n.kind === 'imp' ? t.amberSoft : t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Inch pose="up" eyes={n.kind === 'imp' ? 'dot' : 'happy'} mouth={n.kind === 'imp' ? 'o' : 'smile'} prop={n.icon === 'bulb' ? 'bulb' : n.icon === 'cal' ? 'book' : n.kind === 'imp' ? 'sweat' : 'none'} size={42} border={false} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={13.5} lh={19}>
          {who ? <Txt size={13.5} w="600">{who}</Txt> : null}
          {who ? n.title.replace(who, '') : n.title}
          <Txt size={13} tone="ink3">{`  ${n.time}`}</Txt>
        </Txt>
        <Txt size={12} tone="ink3" lh={16} numberOfLines={1}>{n.sub}</Txt>
      </View>
      {n.join ? <Btn small kind={joined ? 'quiet' : 'blue'} label={joined ? '勉強中' : '一緒に始める'} disabled={joined} onPress={onJoin} /> : null}
      {n.follow ? <Btn small kind={following ? 'quiet' : 'blue'} label={following ? 'フォロー中' : 'フォローバック'} onPress={() => { toggleFollow(n.follow!); markRead(n.id); }} /> : null}
      {n.cta ? <Btn small kind="quiet" label={n.id === 6 ? '始める' : '開く'} onPress={cta} /> : null}
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
      <NavBar title="お知らせ" right={<IconBtn name="check" label="すべて既読にする" onPress={readAll} />} />
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 }}>
        <Segmented value={filter} onChange={setFilter} options={[{ v: 'all', label: 'すべて' }, { v: 'imp', label: '大事なこと' }, { v: 'study', label: '仲間の勉強' }]} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {list.length === 0 ? <Empty title={emptyTitle} sub="仲間が勉強を始めると、ここに届きます" /> : null}
        {days.map((d) => (
          <View key={d}>
            <Txt size={15} w="700" style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>{d}</Txt>
            <View style={[{ marginHorizontal: 16, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
              <View style={{ borderRadius: radius.card, overflow: 'hidden' }}>
                {list.filter((n) => n.day === d).map((n, i) => (
                  <View key={n.id}>
                    {i ? <View style={{ height: hair, backgroundColor: t.line, marginLeft: 70, zIndex: 1 }} /> : null}
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
