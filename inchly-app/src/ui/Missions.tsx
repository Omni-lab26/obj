import { View } from 'react-native';

import { claimMission, isClaimed, missionsOf, useStore } from '../store';
import { hair, type, useT } from '../theme';
import { Card, haptic, Press, Txt } from './base';
import { Coin } from './Hud';
import { Sticker } from './Sticker';
import { toast } from './Toast';

// Today's missions: small goals that pay coins. They sit in the store, next
// to what the coins buy.
export function Missions() {
  const t = useT();
  const s = useStore((x) => x);
  const list = missionsOf(s);
  const claim = (id: string, name: string) => {
    const c = claimMission(id);
    if (c) { haptic.success(); toast(`ミッション「${name}」`, `+${c} コイン`); }
  };
  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Txt size={type.head} w="600" style={{ flex: 1 }}>今日のミッション</Txt>
        <Txt size={12} tone="ink3">0時に入れ替わります</Txt>
      </View>
      <Card style={{ marginHorizontal: 16 }} pad={0}>
        {list.map((m, i) => {
          const done = m.cur >= m.tot;
          const got = isClaimed(s, m.id);
          return (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: i ? hair : 0, borderTopColor: t.line }}>
              <Sticker name={m.sticker} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={13.5} w="600" numberOfLines={1}>{m.t}</Txt>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: t.sunken, marginTop: 6, overflow: 'hidden' }}>
                  <View style={{ width: `${(m.cur / m.tot) * 100}%`, height: 5, borderRadius: 3, backgroundColor: t.ink }} />
                </View>
              </View>
              {got ? (
                <Txt size={11.5} w="700" tone="greenInk">受け取りずみ</Txt>
              ) : done ? (
                <Press onPress={() => claim(m.id, m.t)} scale={0.94} accessibilityLabel={`${m.coin}コインを受け取る`}
                  style={{ height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F2B705', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Txt num size={13} w="800" color="#2E2200">{`+${m.coin}`}</Txt>
                  <Txt size={12} w="700" color="#2E2200">受け取る</Txt>
                </Press>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 28, paddingLeft: 4, paddingRight: 9, borderRadius: 14, backgroundColor: '#FFF4D1' }}>
                  <Coin size={18} />
                  <Txt num size={12.5} w="700" color="#7A5800">{m.coin}</Txt>
                </View>
              )}
            </View>
          );
        })}
      </Card>
    </>
  );
}
