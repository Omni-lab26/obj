import { useLocalSearchParams } from 'expo-router';
import { ComponentRef, Fragment, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROOM } from '@/data';
import { type DmMsg, readDm, sendDm, useStore } from '@/store';
import { font, hair, lift, noOutline, useT } from '@/theme';
import { Avatar, haptic, Press, StdKey, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { clockAt, dayLabel, sameDay } from '@/ui/DmParts';
import { personSheet } from '@/ui/Editors';
import { Icon } from '@/ui/Icon';
import { fadeIn } from '@/ui/motion';
import { Stamp, STAMPS, Sticker } from '@/ui/Sticker';
import { Pane } from '@/ui/Glass';
import { ring, S, SR, useStd } from '@/ui/stdLook';

// A conversation with one person: the days' messages (yours on the right in
// ink, theirs on the left in white), each with its time beside it, and the
// composer (a stamp, the text, send). Opening it marks their messages read.
// Someone you've blocked can't be written to here (unblock in 設定).

export default function DmScreen() {
  const t = useT();
  const std = useStd();
  const insets = useSafeAreaInsets();
  const { n } = useLocalSearchParams<{ n: string }>();
  const dm = useStore((s) => s.dms.find((x) => x.n === n));
  const blocked = useStore((s) => s.blocked.includes(n));
  const color = dm?.c ?? ROOM.find((p) => p.n === n)?.c ?? '#5D6DB8';
  const msgs = dm?.msgs ?? [];
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [text, setText] = useState('');
  const [tray, setTray] = useState(false);
  // seen: on opening, and whenever something new arrives while it's open
  useEffect(() => { readDm(n); }, [n, msgs.length]);

  const send = () => {
    const v = text.trim();
    if (!v) return;
    haptic.soft();
    sendDm(n, color, { t: v.slice(0, 1000) });
    setText('');
  };
  const sendStamp = (id: string) => { haptic.soft(); sendDm(n, color, { stamp: id }); };

  return (
    <Screen>
      <NavBar title={n} border right={(
        <Press onPress={() => personSheet(n, color)} scale={0.9} hitSlop={6} accessibilityLabel={`${n}のプロフィール`} style={{ marginRight: 6 }}>
          <Avatar name={n} color={color} size={30} />
        </Press>
      )} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 4 }} keyboardDismissMode="interactive"
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
          {msgs.length ? null : (
            <View style={{ alignItems: 'center', gap: 6, paddingTop: 40 }}>
              <Avatar name={n} color={color} size={64} />
              <Txt size={16} w="700" style={{ marginTop: 4 }}>{n}</Txt>
              <Txt size={12.5} tone="ink3" style={{ textAlign: 'center' }}>{`${n}に最初のメッセージを送りましょう`}</Txt>
            </View>
          )}
          {msgs.map((m, i) => {
            const prev = msgs[i - 1];
            const newDay = !prev || !sameDay(prev.at, m.at);
            // the same side within a few minutes reads as one run: closer together
            const run = !!prev && !newDay && prev.me === m.me && m.at - prev.at < 5 * 60_000;
            return (
              <Fragment key={m.id}>
                {newDay ? (
                  <View style={[{ alignSelf: 'center', paddingHorizontal: 10, height: 22, borderRadius: 11, justifyContent: 'center', marginTop: i ? 14 : 0, marginBottom: 6, backgroundColor: t.dark ? t.sunken : 'rgba(15,23,42,0.05)' },
                    std && { height: 24, borderRadius: 7, backgroundColor: S.paper2, boxShadow: ring(1.5, 'rgba(23,18,31,0.16)') }]}>
                    <Txt size={11} w="600" tone="ink2">{dayLabel(m.at)}</Txt>
                  </View>
                ) : null}
                <Bubble m={m} n={n} color={color} gap={run ? 0 : 8} />
              </Fragment>
            );
          })}
        </ScrollView>
        {blocked ? (
          <View style={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: hair, borderTopColor: t.line, alignItems: 'center' }}>
            <Txt size={12.5} tone="ink3" style={{ textAlign: 'center' }}>{`${n}をブロック中です。設定 › ブロック中の人 から解除できます`}</Txt>
          </View>
        ) : (
          <View style={[{ backgroundColor: t.surface, borderTopWidth: hair, borderTopColor: t.line, paddingBottom: Math.max(insets.bottom, 8) }, std && { backgroundColor: S.card, borderTopWidth: 2, borderTopColor: S.ink }]}>
            <Pane radius={0} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
              <Press onPress={() => { haptic.tap(); setTray((x) => !x); }} haptics={false} scale={0.86} accessibilityLabel={tray ? 'スタンプを閉じる' : 'スタンプ'} accessibilityState={{ expanded: tray }}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: tray ? t.blueSoft : 'transparent' }}>
                <Sticker name="heart" size={30} tilt={tray ? 0 : -10} />
              </Press>
              <TextInput value={text} onChangeText={setText} onFocus={() => setTray(false)} placeholder="メッセージ" placeholderTextColor={t.ink3} multiline accessibilityLabel="メッセージ"
                style={[{ flex: 1, minHeight: 40, maxHeight: 120, borderRadius: 20, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, backgroundColor: t.canvas, borderWidth: hair, borderColor: t.line2, color: t.ink, fontSize: 15, lineHeight: 20, fontFamily: font.text },
                  // スタンダード: the card's color in a thin ink outline
                  std && { minWidth: 0, borderRadius: SR.key, borderWidth: 0, backgroundColor: S.card, boxShadow: ring(1.5) }, noOutline]} />
              {std ? (
                // スタンダード: send is the one decision here, an ink key on lime (no floor while there's nothing to send)
                <StdKey onPress={send} disabled={!text.trim()} label="送信" fill={S.ink} under={S.limeDeep} kd={3} radius={SR.key} style={{ width: 44, height: 40, marginBottom: 3 }} face={{ width: 44, height: 40 }}>
                  <Icon name="send" size={16} color={text.trim() ? S.onInk : S.ink3} />
                </StdKey>
              ) : (
              <Press onPress={send} disabled={!text.trim()} scale={0.88} accessibilityLabel="送信"
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? t.ink : t.sunken }}>
                <Icon name="send" size={16} color={text.trim() ? t.onInk : t.ink3} />
              </Press>
              )}
            </View>
            {tray ? (
              <Animated.View entering={fadeIn()} style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 10 }}>
                {STAMPS.map((x) => (
                  <View key={x.id} style={{ width: '25%', alignItems: 'center', paddingVertical: 6 }}>
                    <Press onPress={() => sendStamp(x.id)} haptics={false} scale={0.86} accessibilityLabel={`スタンプ「${x.label}」を送る`}>
                      <Stamp id={x.id} size={72} />
                    </Press>
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** One message: yours on the right in ink, theirs on the left in white; the time small beside it, at the bottom. */
function Bubble({ m, n, color, gap }: { m: DmMsg; n: string; color: string; gap: number }) {
  const t = useT();
  const std = useStd();
  const time = <Txt num size={10.5} tone="ink3" style={{ marginBottom: 2 }}>{clockAt(m.at)}</Txt>;
  const body = m.stamp ? <Stamp id={m.stamp} size={100} /> : (
    <View style={[{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, maxWidth: 260, backgroundColor: m.me ? t.ink : t.surface }, m.me ? null : lift(t), std && { borderRadius: 16, marginHorizontal: 2 }]}>
      <Txt size={15} lh={21} color={m.me ? t.onInk : t.ink} selectable>{m.t}</Txt>
    </View>
  );
  return (
    <Animated.View entering={fadeIn()} style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: m.me ? 'flex-end' : 'flex-start', gap: 6, marginTop: gap }}
      accessible accessibilityLabel={`${m.me ? 'あなた' : n}、${clockAt(m.at)}：${m.stamp ? `スタンプ「${STAMPS.find((x) => x.id === m.stamp)?.label ?? ''}」` : m.t}`}>
      {m.me ? time : <Avatar name={n} color={color} size={26} />}
      {body}
      {m.me ? null : time}
    </Animated.View>
  );
}
