import { ScrollView, View } from 'react-native';

import { buy, STORE, StoreItem, useNow, useStore } from '@/store';
import { hair, lift, radius, useT } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { Screen, useTabPad } from '@/ui/Chrome';
import { Coin } from '@/ui/Hud';
import { Missions } from '@/ui/Missions';
import { openSheet } from '@/ui/Sheet';
import { Sticker, StickerName } from '@/ui/Sticker';
import { toast } from '@/ui/Toast';

// The store, the lobby's left-most page. Everything is bought with coins you
// earn by studying (a coin a minute, plus missions and events) — no money,
// ever: many of the people using this are under 18.

function Price({ n, dark }: { n: number; dark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingLeft: 4, paddingRight: 10, borderRadius: 14, backgroundColor: dark ? '#FFE07A' : '#FFF4D1', alignSelf: 'flex-start' }}>
      <Coin size={19} />
      <Txt num size={13} w="700" color={dark ? '#3D2C00' : '#7A5800'}>{n.toLocaleString('ja-JP')}</Txt>
    </View>
  );
}

function confirm(it: StoreItem) {
  openSheet((close) => <Confirm it={it} close={close} />);
}
function Confirm({ it, close }: { it: StoreItem; close: () => void }) {
  const coins = useStore((s) => s.coins);
  const owned = useStore((s) => it.kind === 'once' && s.owned.includes(it.id));
  const short = it.price - coins;
  const go = () => {
    if (!buy(it.id)) return;
    haptic.success();
    close();
    toast(`${it.name}を交換しました`, `のこり ${(coins - it.price).toLocaleString('ja-JP')} コイン`);
  };
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Sticker name={it.sticker as StickerName} size={88} tilt={-6} />
      <Txt size={18} w="800" style={{ textAlign: 'center' }}>{it.name}</Txt>
      <Txt size={13.5} tone="ink2" style={{ textAlign: 'center' }}>{it.sub}</Txt>
      <View style={{ marginTop: 4 }}><Price n={it.price} /></View>
      <Txt size={12} tone="ink3">{owned ? 'もう持っています' : short > 0 ? `あと${short}コイン。1分勉強すると1コイン` : `交換すると、のこり ${(coins - it.price).toLocaleString('ja-JP')} コイン`}</Txt>
      <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginTop: 12 }}>
        <Btn kind="quiet" label="やめる" onPress={close} style={{ flex: 1 }} />
        <Btn kind="primary" label={owned ? '交換ずみ' : short > 0 ? `あと${short}コイン` : '交換する'} disabled={owned || short > 0} onPress={go} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

export default function Store() {
  const t = useT();
  const pad = useTabPad();
  const now = useNow(1000);
  const owned = useStore((s) => s.owned);
  const tickets = useStore((s) => s.restTickets);
  const boost = useStore((s) => s.boost);
  // today's pick changes at midnight
  const d = new Date(now);
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86_400_000);
  const pick = STORE[dayOfYear % STORE.length];
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  const left = Math.max(0, Math.floor((midnight - now) / 1000));
  const hms = `${Math.floor(left / 3600)}:${String(Math.floor(left / 60) % 60).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  return (
    <Screen style={{ paddingTop: 0 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: pad, gap: 14 }}>
        <View style={{ paddingHorizontal: 2 }}>
          <Txt size={26} w="800">ストア</Txt>
          <Txt size={12} tone="ink3">勉強で貯めたコインで交換。お金はかかりません</Txt>
        </View>

        <Press onPress={() => confirm(pick)} scale={0.98} accessibilityLabel={`今日のおすすめ ${pick.name}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: '#121417' }}>
          <Sticker name={pick.sticker as StickerName} size={64} tilt={-8} />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Txt size={11} w="700" color="rgba(255,255,255,0.66)">{`今日のおすすめ · あと ${hms} で入れ替え`}</Txt>
            <Txt size={16} w="800" color="#fff" numberOfLines={2}>{pick.name}</Txt>
            <Txt size={12} color="rgba(255,255,255,0.72)" numberOfLines={2}>{pick.sub}</Txt>
          </View>
          <Price n={pick.price} dark />
        </Press>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: t.surface }, lift(t)]}>
            <Sticker name="coffee" size={30} />
            <Txt size={12.5} tone="ink2">休み券 <Txt num size={14} w="800">{tickets}</Txt>枚</Txt>
          </View>
          <View style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: t.surface }, lift(t)]}>
            <Sticker name="star" size={30} />
            <Txt size={12.5} tone="ink2">2倍 のこり <Txt num size={14} w="800">{boost}</Txt>回</Txt>
          </View>
        </View>

        <Txt size={15} w="700" style={{ paddingHorizontal: 2 }}>交換できるもの</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {STORE.map((it) => {
            const have = it.kind === 'once' && owned.includes(it.id);
            return (
              <Press key={it.id} onPress={() => confirm(it)} scale={0.97} accessibilityLabel={`${it.name} ${it.price}コイン${have ? ' 交換ずみ' : ''}`}
                style={[{ width: '48%', flexGrow: 1, padding: 12, gap: 6, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
                <Sticker name={it.sticker as StickerName} size={46} tilt={-4} />
                <Txt size={13.5} w="700" lh={19}>{it.name}</Txt>
                <Txt size={11.5} tone="ink3" lh={16} style={{ flexGrow: 1 }}>{it.sub}</Txt>
                {have ? <Txt size={12} w="700" tone="greenInk">交換ずみ</Txt> : <Price n={it.price} />}
              </Press>
            );
          })}
        </View>

        <View style={{ marginHorizontal: -16 }}>
          <Missions />
        </View>

        <View style={[{ padding: 14, gap: 8, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
          <Txt size={14} w="700">コインのもらい方</Txt>
          {[['勉強 1分', '+1'], ['今日のミッション', '+30〜50'], ['今週のイベント', '+200〜300'], ['コイン2倍のあいだ', '×2']].map(([k, v], i) => (
            <View key={k} style={{ flexDirection: 'row', paddingTop: i ? 8 : 0, borderTopWidth: i ? hair : 0, borderTopColor: t.line }}>
              <Txt size={13} tone="ink2" style={{ flex: 1 }}>{k}</Txt>
              <Txt num size={13} w="700" color="#7A5800">{v}</Txt>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
