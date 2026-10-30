import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type Dm, unreadIn, useStore } from '@/store';
import { hair, useT } from '@/theme';
import { Avatar, Empty, IconBtn, Press, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { listTime, newDmSheet, openDm } from '@/ui/DmParts';
import { STAMPS } from '@/ui/Sticker';
import { Pane } from '@/ui/Glass';
import { ring, S, useStd } from '@/ui/stdLook';

// メッセージ: your one-to-one conversations, the latest first (opened from the
// chat button at the top right of home). Each row is the person, their last
// message and when, and a count of what you haven't read. The pencil starts a
// new one.

const preview = (d: Dm) => {
  const m = d.msgs[d.msgs.length - 1];
  if (!m) return '';
  const what = m.stamp ? `スタンプ「${STAMPS.find((x) => x.id === m.stamp)?.label ?? ''}」` : m.t ?? '';
  return m.me ? `あなた: ${what}` : what;
};

export default function Messages() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const dms = useStore((s) => s.dms);
  const blocked = useStore((s) => s.blocked);
  const list = dms.filter((d) => !blocked.includes(d.n) && d.msgs.length);
  const std = useStd();
  return (
    <Screen>
      <NavBar title="メッセージ" right={<IconBtn name="edit" label="新しいメッセージ" onPress={newDmSheet} />} />
      {/* スタンダード: the list on the card's paper, an ink line over it */}
      <View style={[{ flex: 1, backgroundColor: t.surface }, std && { borderTopWidth: 2, borderTopColor: S.ink }]}>
        <Pane radius={0} />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {list.map((d, i) => {
            const unread = unreadIn(d);
            const last = d.msgs[d.msgs.length - 1];
            return (
              <Press key={d.n} onPress={() => openDm(d.n)} scale={0.99} accessibilityLabel={`${d.n}とのメッセージ。${unread ? `未読${unread}件。` : ''}${preview(d)}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 }}>
                {i ? <View style={{ position: 'absolute', top: 0, left: 76, right: 0, height: std ? 1.5 : hair, backgroundColor: t.line }} /> : null}
                <Avatar name={d.n} color={d.c} size={48} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Txt size={15} w="700" numberOfLines={1} style={{ flex: 1 }}>{d.n}</Txt>
                    <Txt num size={12} w={std && unread ? '700' : '400'} color={unread ? t.blue : t.ink3}>{listTime(last.at)}</Txt>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Txt size={13} tone={unread ? 'ink' : 'ink3'} w={unread ? '600' : '400'} numberOfLines={2} lh={18} style={{ flex: 1 }}>{preview(d)}</Txt>
                    {unread ? (
                      <View style={[{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center' },
                        // スタンダード: unread is coral (its one use), edged in ink
                        std && { borderRadius: 6, backgroundColor: S.unread, boxShadow: ring(1.5) }]}>
                        <Txt num size={11.5} w="700" color={std ? S.ink : '#FFFFFF'} lh={14}>{String(unread)}</Txt>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Press>
            );
          })}
          {list.length ? null : <Empty title="まだメッセージはありません" sub="右上のペンから、フォローしている人やルームの人に送れます" />}
        </ScrollView>
      </View>
    </Screen>
  );
}
