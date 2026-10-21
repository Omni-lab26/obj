import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOTIFS, Notif } from '@/data';
import { getState, setState, startStudy, toggleFollow, toggleIn, useStore } from '@/store';
import { useT } from '@/theme';
import { Btn, Empty, haptic, IconBtn, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { SwipeRow } from '@/ui/SwipeRow';
import { Segmented } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Filter = 'all' | 'imp' | 'study';

const markRead = (id: number) => setState((s) => (s.notifRead.includes(id) ? {} : { notifRead: [...s.notifRead, id] }));

function Row({ n, unread, joined, onJoin }: { n: Notif; unread: boolean; joined: boolean; onJoin: () => void }) {
  const t = useT();
  const following = useStore((s) => (n.follow ? s.following.includes(n.follow) : false));
  const tile = n.kind === 'imp' ? { bg: t.amberSoft, fg: t.amber } : n.kind === 'study' ? { bg: t.greenSoft, fg: t.greenInk } : { bg: t.sunken, fg: t.ink2 };
  const cta = () => {
    if (n.id === 6) { startStudy('en'); haptic.firm(); toast('英語を始めました', '記録はタイマーを止めたときに残ります'); }
    else toast('外部のページを開きます', '申込は河合塾のサイトで行います');
    markRead(n.id);
  };
  return (
    <Pressable onPress={() => markRead(n.id)} accessibilityLabel={`${unread ? '未読 ' : ''}${n.title}`}
      style={{ flexDirection: 'row', gap: 12, paddingVertical: 14, paddingHorizontal: 20 }}>
      {n.kind === 'imp' ? <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: t.amber }} /> : null}
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tile.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={n.icon} size={18} color={tile.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {unread ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.blue }} /> : null}
          <Txt size={14} w="500" style={{ flex: 1 }}>{n.title}</Txt>
        </View>
        <Txt size={12.5} tone="ink3" style={{ marginTop: 2 }}>{n.sub} · {n.time}</Txt>
        {n.cta || n.join || n.follow ? (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {n.join ? <Btn small kind="go" label={joined ? '勉強中' : '一緒に始める'} disabled={joined} onPress={onJoin} /> : null}
            {n.cta ? <Btn small kind="line" label={n.cta} onPress={cta} /> : null}
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
      <NavBar title="お知らせ" right={<IconBtn name="check" label="すべて既読にする" onPress={readAll} />} />
      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}>
        <Segmented value={filter} onChange={setFilter} options={[{ v: 'all', label: 'すべて' }, { v: 'imp', label: '大事なこと' }, { v: 'study', label: '仲間の勉強' }]} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {list.length === 0 ? <Empty title={emptyTitle} sub="仲間が勉強を始めると、ここに届きます" /> : null}
        {days.map((d) => (
          <View key={d}>
            <Txt size={13} w="700" tone="ink3" style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 }}>{d}</Txt>
            {list.filter((n) => n.day === d).map((n) => (
              <View key={n.id} style={{ borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.line }}>
                <SwipeRow bg={t.canvas} onRead={() => { markRead(n.id); toast('既読にしました'); }} onDelete={() => remove(n.id)}>
                  <Row n={n} unread={!read.includes(n.id)} joined={joined.includes(n.id)} onJoin={() => join(n)} />
                </SwipeRow>
              </View>
            ))}
          </View>
        ))}
        {list.length ? (
          <Txt size={12} tone="ink3" style={{ textAlign: 'center', marginTop: 18 }}>右へスワイプで既読、左へスワイプで削除</Txt>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
