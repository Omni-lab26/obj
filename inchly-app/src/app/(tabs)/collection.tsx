import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Badge, RARITY } from '@/lib/badges';
import { badgesFor, useStore } from '@/store';
import { hair, useT } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { Screen, useTabPad } from '@/ui/Chrome';
import { Growth } from '@/ui/Growth';
import { openSheet } from '@/ui/Sheet';
import { Sticker, StickerName } from '@/ui/Sticker';
import { Segmented } from '@/ui/Tabs';

// Your collection: badges earned from your own records (with progress toward
// the rest), and the graphs. Badges have a rarity, shown as the frame color.

type View_ = 'badges' | 'graphs';

function detail(b: Badge) {
  openSheet((close) => (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ opacity: b.got ? 1 : 0.35 }}><Sticker name={b.sticker as StickerName} size={96} tilt={b.got ? -6 : 0} /></View>
      <View style={{ paddingHorizontal: 10, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: RARITY[b.rarity].color }}>
        <Txt size={11} w="700" color="#fff">{`${RARITY[b.rarity].label} · ${b.cat}`}</Txt>
      </View>
      <Txt size={20} w="800">{b.name}</Txt>
      <Txt size={13.5} tone="ink2">{b.how}</Txt>
      {b.got ? <Txt size={13} w="700" tone="greenInk">達成ずみ</Txt> : (
        <View style={{ alignSelf: 'stretch', gap: 6, marginTop: 4 }}>
          <Bar p={b.cur / b.tot} />
          <Txt num size={12} tone="ink3" style={{ textAlign: 'center' }}>{`${b.cur} / ${b.tot} · あと${Math.round((b.tot - b.cur) * 10) / 10}`}</Txt>
        </View>
      )}
      <Btn kind="quiet" wide label="閉じる" onPress={close} style={{ marginTop: 10 }} />
    </View>
  ));
}

function Bar({ p }: { p: number }) {
  const t = useT();
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}>
      <View style={{ width: `${Math.min(1, p) * 100}%`, height: 6, borderRadius: 3, backgroundColor: t.ink }} />
    </View>
  );
}

function Tile({ b }: { b: Badge }) {
  const t = useT();
  const c = RARITY[b.rarity].color;
  return (
    <Press onPress={() => { haptic.tap(); detail(b); }} scale={0.95} accessibilityLabel={`${b.name} ${RARITY[b.rarity].label} ${b.got ? '達成' : `${b.cur}/${b.tot}`}`}
      style={{ width: '31.6%', alignItems: 'center', gap: 3, paddingTop: 10, paddingBottom: 9, paddingHorizontal: 4, borderRadius: 14,
        backgroundColor: b.got ? t.surface : t.sunken, borderWidth: b.got ? 1.5 : hair, borderColor: b.got ? c : t.line2 }}>
      <View style={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
      <View style={{ opacity: b.got ? 1 : 0.3 }}><Sticker name={b.sticker as StickerName} size={44} tilt={b.got ? -6 : 0} /></View>
      <Txt size={11.5} w="700" lh={15} numberOfLines={2} style={{ textAlign: 'center', minHeight: 30 }}>{b.name}</Txt>
      {b.got ? <Txt size={10.5} w="700" tone="greenInk">達成</Txt> : (
        <View style={{ alignSelf: 'stretch', paddingHorizontal: 8, gap: 3 }}>
          <Bar p={b.cur / b.tot} />
          <Txt num size={10} tone="ink3" style={{ textAlign: 'center' }}>{`${b.cur}/${b.tot}`}</Txt>
        </View>
      )}
    </Press>
  );
}

export default function Collection() {
  const t = useT();
  const pad = useTabPad();
  const [view, setView] = useState<View_>('badges');
  const [cat, setCat] = useState('すべて');
  const s = useStore((x) => x);
  const badges = useMemo(() => badgesFor(s), [s]);
  const cats = ['すべて', ...new Set(badges.map((b) => b.cat))];
  const got = badges.filter((b) => b.got).length;
  // the closest one not yet earned
  const near = badges.filter((b) => !b.got).sort((a, b) => b.cur / b.tot - a.cur / a.tot)[0];
  const list = badges.filter((b) => cat === 'すべて' || b.cat === cat).sort((a, b) => Number(b.got) - Number(a.got));
  return (
    <Screen style={{ paddingTop: 0 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 4, paddingBottom: pad, gap: 12 }}>
        <View style={{ paddingHorizontal: 18, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Txt size={26} w="800">{view === 'badges' ? 'バッジ' : 'グラフ'}</Txt>
          <Txt size={12} tone="ink3">{view === 'badges' ? `${got} / ${badges.length} 集めた` : '記録から自動で'}</Txt>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          <Segmented value={view} onChange={setView} options={[{ v: 'badges', label: 'バッジ' }, { v: 'graphs', label: 'グラフ' }]} />
        </View>
        {view === 'graphs' ? <Growth stacked badges={false} /> : (
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {near ? (
              <Press onPress={() => detail(near)} scale={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line }}>
                <Sticker name={near.sticker as StickerName} size={40} />
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Txt size={11.5} tone="ink3">あと少しのバッジ</Txt>
                  <Txt size={14} w="700" numberOfLines={1}>{near.name} <Txt num size={12} tone="ink3">{`${near.cur} / ${near.tot}`}</Txt></Txt>
                  <Bar p={near.cur / near.tot} />
                </View>
              </Press>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 2 }}>
              {(Object.keys(RARITY) as (keyof typeof RARITY)[]).map((k) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RARITY[k].color }} />
                  <Txt size={11.5} tone="ink2">{RARITY[k].label}</Txt>
                </View>
              ))}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {cats.map((c) => {
                const on = c === cat;
                return (
                  <Press key={c} onPress={() => setCat(c)} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }} hitSlop={{ top: 6, bottom: 6 }}
                    style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center', backgroundColor: on ? t.ink : t.surface, borderWidth: hair, borderColor: on ? t.ink : t.line2 }}>
                    <Txt size={12.5} w="700" color={on ? t.onInk : t.ink2}>{c}</Txt>
                  </Press>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {list.map((b) => <Tile key={b.id} b={b} />)}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
