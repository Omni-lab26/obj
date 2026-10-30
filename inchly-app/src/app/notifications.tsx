import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOTIFS, Notif, PERSON_COLOR, ROOM } from '@/data';
import { getState, setState, startStudy, toggleFollow, toggleIn, useStore } from '@/store';
import { hair, lift, radius, useT } from '@/theme';
import { Avatar, Btn, Empty, haptic, IconBtn, IconPlate, Txt } from '@/ui/base';
import { allowed, NavBar, Screen } from '@/ui/Chrome';
import { IconName } from '@/ui/Icon';
import { Sticker, StickerName } from '@/ui/Sticker';
import { SwipeRow } from '@/ui/SwipeRow';
import { Segmented } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';
import { Pane } from '@/ui/Glass';
import { PixSticker } from '@/themes/standard/pixel';
import type { StickerId } from '@/themes/standard/art';
import { ring, RING_SOFT, S, useStd } from '@/ui/stdLook';

type Filter = 'all' | 'imp' | 'study';

// Each kind of notice wears a pop sticker instead of a line icon.
const STICKER: Partial<Record<IconName, StickerName>> = { flag: 'flag', bulb: 'bulb', cal: 'cal', target: 'target', clock: 'pencil', userPlus: 'pencil', users: 'heart' };

// スタンダード: the notices that have a pixel sticker wear it (the others keep their pop one)
const PIX: Partial<Record<IconName, StickerId>> = { flag: 'flag', cal: 'cal' };

const markRead = (id: number) => setState((s) => (s.notifRead.includes(id) ? {} : { notifRead: [...s.notifRead, id] }));

function Row({ n, unread, joined, onJoin }: { n: Notif; unread: boolean; joined: boolean; onJoin: () => void }) {
  const t = useT();
  const std = useStd();
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
      style={{ flexDirection: 'row', gap: 10, paddingVertical: 12, paddingHorizontal: 14 }}>
      {who ? (
        // about a person: show the person, with a sticker for what happened
        <View style={{ width: 36, height: 36 }}>
          <Avatar name={who} color={PERSON_COLOR[who] ?? t.ink3} size={34} />
          {std ? (n.join ? <View style={{ position: 'absolute', right: -3, bottom: -1, width: 9, height: 9, backgroundColor: S.run, boxShadow: ring(1.5) }} /> : null)
            : <Sticker name={STICKER[n.icon] ?? 'pencil'} size={22} tilt={-8} style={{ position: 'absolute', right: -8, bottom: -7 }} />}
        </View>
      ) : std && PIX[n.icon] ? (
        <View style={{ width: 40, alignItems: 'center', paddingTop: 2 }}><PixSticker name={PIX[n.icon]!} tilt={n.id % 2 ? -6 : 6} /></View>
      ) : (
        <Sticker name={STICKER[n.icon] ?? 'bell'} size={40} tilt={n.id % 2 ? -6 : 5} style={{ margin: -2 }} />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt size={13.5} w={unread ? '600' : '500'} lh={19} style={{ flex: 1 }}>{n.title}</Txt>
          {unread ? <View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.blue, alignSelf: 'flex-start', marginTop: 6 }, std && { width: 8, height: 8, borderRadius: 0, backgroundColor: S.unread, boxShadow: ring(1.5) }]} /> : null}
        </View>
        {n.kind === 'imp' ? (
          std ? (
            // スタンダード: a tag (paper 2, a faint edge) with the deadline color's square
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, minHeight: 22, paddingHorizontal: 8, borderRadius: 7, backgroundColor: S.paper2, boxShadow: RING_SOFT }}>
              <View style={{ width: 7, height: 7, backgroundColor: S.due, boxShadow: ring(1.5) }} />
              <Txt size={11} w="700" color="#A65F00" lh={14}>大事</Txt>
            </View>
          ) : (
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, height: 18, paddingHorizontal: 6, borderRadius: 5, backgroundColor: t.amberSoft }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.amber }} />
            <Txt size={10.5} w="700" tone="amber" lh={13}>大事</Txt>
          </View>
          )
        ) : null}
        <Txt size={11.5} tone="ink3" lh={16} style={{ marginTop: 2 }}>{n.sub} · {n.time}</Txt>
        {n.cta || n.join || n.follow ? (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {/* スタンダード: starting is lime (start); the rest are plain keys */}
            {n.join ? <Btn small kind={std ? 'go' : 'primary'} icon="play" label={joined ? '勉強中' : '一緒に始める'} disabled={joined} onPress={onJoin} /> : null}
            {n.cta ? <Btn small kind={std && n.id === 6 ? 'go' : 'tint'} label={n.cta} onPress={cta} /> : null}
            {n.follow ? (
              <Btn small kind={following || std ? 'quiet' : 'primary'} label={following ? 'フォロー中' : 'フォローを返す'}
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
  const std = useStd();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const [joined, setJoined] = useState<number[]>([]);
  const read = useStore((s) => s.notifRead);
  const gone = useStore((s) => s.notifGone);
  const notify = useStore((s) => s.notify);
  const blocked = useStore((s) => s.blocked);
  const off = [!notify.peers && '仲間', !notify.deadlines && '締切', !notify.goal && '目標'].filter(Boolean);
  const list = NOTIFS.filter(allowed({ notify, blocked })).filter((n) => !gone.includes(n.id) && (filter === 'all' || n.kind === filter));
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
      <NavBar title="お知らせ" right={
        <View style={{ flexDirection: 'row' }}>
          <IconPlate>
            <IconBtn name="check" label="すべて既読にする" onPress={readAll} />
            <IconBtn name="gear" label="お知らせの設定" onPress={() => router.push('/settings')} />
          </IconPlate>
        </View>
      } />
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 }}>
        <Segmented value={filter} onChange={setFilter} options={[{ v: 'all', label: 'すべて' }, { v: 'imp', label: '大事なこと' }, { v: 'study', label: '仲間の勉強' }]} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {list.length === 0 ? <Empty title={emptyTitle} sub="仲間が勉強を始めると、ここに届きます" /> : null}
        {days.map((d) => (
          <View key={d}>
            <Txt size={std ? 13 : 12} w={std ? '700' : '600'} tone="ink2" style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>{d}</Txt>
            <View style={[{ marginHorizontal: 16, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
              <Pane radius={radius.card} />
              <View style={{ borderRadius: radius.card, overflow: 'hidden' }}>
                {list.filter((n) => n.day === d).map((n, i) => (
                  <View key={n.id} style={{ borderTopWidth: i ? (std ? 1.5 : hair) : 0, borderTopColor: t.line }}>
                    <SwipeRow bg={t.surface} onRead={() => { markRead(n.id); toast('既読にしました'); }} onDelete={() => remove(n.id)}>
                      <Row n={n} unread={!read.includes(n.id)} joined={joined.includes(n.id)} onJoin={() => join(n)} />
                    </SwipeRow>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
        {list.length ? (
          <Txt size={11} tone="ink3" style={{ textAlign: 'center', marginTop: 16 }}>右へスワイプで既読、左へスワイプで削除</Txt>
        ) : null}
        {off.length ? (
          <Pressable onPress={() => router.push('/settings')} hitSlop={6} style={{ alignSelf: 'center', marginTop: 8, paddingVertical: 6 }}>
            <Txt size={11.5} tone="ink3">{`${off.join('・')}のお知らせはオフです `}<Txt size={11.5} w="600" color={t.blue}>設定</Txt></Txt>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
