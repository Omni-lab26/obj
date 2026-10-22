import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { eventsOf } from '@/lib/events';
import { canNotify } from '@/lib/notify';
import { jpDate, parseKey } from '@/lib/time';
import { claimEvent, ExtraTab, getState, setState, useStore } from '@/store';
import { hair, lift, radius, useT } from '@/theme';
import { Btn, haptic, IconBtn, Press, Txt } from '@/ui/base';
import { Screen, useTabPad } from '@/ui/Chrome';
import { daysUntil, deadlineActions, deadlineSheet } from '@/ui/Editors';
import { Coin } from '@/ui/Hud';
import { MePage } from '@/ui/MePage';
import { Sticker, StickerName } from '@/ui/Sticker';
import { toast } from '@/ui/Toast';

// The lobby's right-most page. What goes here isn't decided yet, so it starts
// as a choice between three candidates; the pick is remembered and can be
// changed at any time from the page's header.

const CANDIDATES: { id: ExtraTab; name: string; tag: string; sub: string; sticker: StickerName }[] = [
  { id: 'events', name: 'イベント', tag: '週替わりのチャレンジ', sub: '「週末10時間」「朝活ウィーク」など、今週だけの目標。達成するとコイン', sticker: 'flag' },
  { id: 'exams', name: '模試・締切', tag: 'カウントダウン', sub: '模試と申込の締切、あと何日か、ひも付けたToDoがどこまで進んだか', sticker: 'cal' },
  { id: 'me', name: 'マイページ', tag: '左上のアイコンからも', sub: 'カード、成長、記録の手直し、投稿', sticker: 'person' },
];

function Header({ title, onChange }: { title: string; onChange: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8, gap: 8 }}>
      <Txt size={26} w="800" style={{ flex: 1 }}>{title}</Txt>
      <Btn small kind="line" label="ここを変える" onPress={onChange} />
    </View>
  );
}

function Chooser() {
  const t = useT();
  const pad = useTabPad();
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: pad, gap: 12 }}>
      <Txt size={26} w="800" style={{ paddingHorizontal: 2 }}>ここに何を置く？</Txt>
      <Txt size={13.5} tone="ink2" lh={21} style={{ paddingHorizontal: 2 }}>右端のページはまだ決まっていません。選ぶと下のタブがその名前になります。あとから変えられます。</Txt>
      {CANDIDATES.map((c) => (
        <Press key={c.id} onPress={() => { haptic.success(); setState({ extraTab: c.id }); toast(`右端を「${c.name}」にしました`); }} scale={0.98}
          style={[{ padding: 14, gap: 8, borderRadius: 18, backgroundColor: t.surface }, lift(t)]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Sticker name={c.sticker} size={44} tilt={-6} />
            <View style={{ flex: 1 }}>
              <Txt size={16} w="800">{c.name}</Txt>
              <Txt size={11.5} w="600" tone="ink3">{c.tag}</Txt>
            </View>
            <Txt size={13} w="700" color={t.blue}>これにする</Txt>
          </View>
          <Txt size={13} tone="ink2" lh={20}>{c.sub}</Txt>
        </Press>
      ))}
    </ScrollView>
  );
}

function Events() {
  const t = useT();
  const pad = useTabPad();
  const sessions = useStore((s) => s.sessions);
  const claimed = useStore((s) => s.eventsClaimed);
  const list = eventsOf(sessions);
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: pad, gap: 12 }}>
      <Txt size={12.5} tone="ink3" style={{ paddingHorizontal: 2 }}>{`今週のチャレンジ · ${jpDate(parseKey(list[0].ends), false)}（日）まで`}</Txt>
      {list.map((e) => {
        const done = e.cur >= e.tot;
        const got = claimed.includes(e.key);
        return (
          <View key={e.id} style={[{ padding: 14, gap: 10, borderRadius: 18, backgroundColor: t.surface }, lift(t)]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Sticker name={e.sticker as StickerName} size={46} tilt={-6} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={15} w="800">{e.name}</Txt>
                <Txt size={12} tone="ink3">{e.how}</Txt>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 28, paddingLeft: 4, paddingRight: 9, borderRadius: 14, backgroundColor: '#FFF4D1' }}>
                <Coin size={18} />
                <Txt num size={12.5} w="700" color="#7A5800">{e.coin}</Txt>
              </View>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: t.sunken, overflow: 'hidden' }}>
              <View style={{ width: `${Math.min(1, e.cur / e.tot) * 100}%`, height: 8, borderRadius: 4, backgroundColor: t.ink }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Txt num size={13} w="700" style={{ flex: 1 }}>{`${Math.round(e.cur * 10) / 10} / ${e.tot}${e.unit}`}</Txt>
              {got ? <Txt size={12} w="700" tone="greenInk">受け取りずみ</Txt> : done ? (
                <Btn small kind="primary" label={`+${e.coin} 受け取る`} onPress={() => { const c = claimEvent(e.id); if (c) { haptic.success(); toast(e.name, `+${c} コイン`); } }} />
              ) : <Txt size={12} tone="ink3">{`あと${Math.round((e.tot - e.cur) * 10) / 10}${e.unit}`}</Txt>}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Exams() {
  const t = useT();
  const pad = useTabPad();
  const deadlines = useStore((s) => s.deadlines);
  const todos = useStore((s) => s.todos);
  const on = useStore((s) => s.notify.deadlines);
  const list = deadlines.map((d) => {
    const linked = todos.filter((x) => x.dl === d.id);
    return { ...d, days: daysUntil(d.mo, d.day), done: linked.filter((x) => x.d).length, total: linked.length };
  }).sort((a, b) => a.days - b.days);
  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: pad, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
        <Txt size={12.5} tone="ink3" style={{ flex: 1 }}>{on && canNotify ? '3日前と前日にお知らせします' : 'お知らせはオフです（設定で変えられます）'}</Txt>
        <Btn small kind="primary" icon="plus" label="締切を追加" onPress={deadlineSheet} />
      </View>
      {list.length ? list.map((d) => (
        <Press key={d.id} onPress={() => deadlineActions(d.id, d.t)} scale={0.98} style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, backgroundColor: t.surface }, lift(t)]}>
          <View style={{ width: 64, alignItems: 'center' }}>
            <Txt num size={32} w="800" lh={36} color={d.days <= 21 ? t.amber : t.ink}>{d.days}</Txt>
            <Txt size={11} tone="ink3">日</Txt>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Txt size={15} w="700" numberOfLines={1}>{d.t}</Txt>
            <Txt size={12} tone="ink3">{`${d.mo}月${d.day}日 · ${d.total ? `ToDo ${d.done}/${d.total}` : 'ひも付いたToDoなし'}`}</Txt>
            {d.total ? (
              <View style={{ height: 5, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}>
                <View style={{ width: `${(d.done / d.total) * 100}%`, height: 5, borderRadius: 3, backgroundColor: t.ink }} />
              </View>
            ) : null}
          </View>
        </Press>
      )) : (
        <View style={{ padding: 24, alignItems: 'center', gap: 6, borderRadius: radius.card, borderWidth: hair, borderColor: t.line2, borderStyle: 'dashed' }}>
          <Txt size={14} w="700">締切はまだありません</Txt>
          <Txt size={12.5} tone="ink3">模試や申込の日を入れておくと、ここで数えます</Txt>
        </View>
      )}
    </ScrollView>
  );
}

export default function Extra() {
  const pad = useTabPad();
  const pick = useStore((s) => s.extraTab);
  const change = () => { haptic.tap(); setState({ extraTab: null }); };
  const name = CANDIDATES.find((c) => c.id === pick)?.name ?? '';
  return (
    <Screen style={{ paddingTop: 0 }}>
      {pick ? (
        <Header title={name} onChange={change} />
      ) : null}
      {pick === 'events' ? <Events /> : pick === 'exams' ? <Exams /> : pick === 'me' ? (
        <View style={{ flex: 1 }}>
          <View style={{ position: 'absolute', top: -52, right: 128 }}>
            <IconBtn filled name="gear" label="設定" onPress={() => router.push('/settings')} />
          </View>
          <MePage bottomPad={pad} stacked />
        </View>
      ) : <Chooser />}
    </Screen>
  );
}

// keep the type check honest about the store shape this page reads
void getState;
