import { router } from 'expo-router';
import { ReactNode } from 'react';
import { ScrollView, Share, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEMES_OPEN } from '@/design';
import { subj } from '@/data';
import { recordsCsv } from '@/lib/csv';
import { DmFrom, getState, isMinor, LiveScope, setState, unblock, useNow, useStore, wipe } from '@/store';
import { hair, lift, radius, useT } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Choice, RadioCards } from '@/ui/Form';
import { openSheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

// Settings: who sees you, who can message you, which notices, and your data.
function Section({ title, foot, children }: { title: string; foot?: string; children: ReactNode }) {
  const t = useT();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
      <Txt size={12} w="600" tone="ink2" style={{ paddingHorizontal: 4, paddingBottom: 8 }}>{title}</Txt>
      <View style={[{ backgroundColor: t.surface, borderRadius: radius.card, paddingHorizontal: 14 }, lift(t)]}>{children}</View>
      {foot ? <Txt size={11.5} tone="ink3" lh={17} style={{ paddingHorizontal: 4, paddingTop: 6 }}>{foot}</Txt> : null}
    </View>
  );
}
function Row({ label, sub, right, first }: { label: string; sub?: string; right?: ReactNode; first?: boolean }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 10, borderTopWidth: first ? 0 : hair, borderTopColor: t.line }}>
      <View style={{ flex: 1 }}>
        <Txt size={14} w="500">{label}</Txt>
        {sub ? <Txt size={12} tone="ink3">{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}
function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  const t = useT();
  return <Switch value={on} onValueChange={(v) => { haptic.tap(); onChange(v); }} trackColor={{ true: t.green, false: t.line2 }} thumbColor="#fff" ios_backgroundColor={t.line2} accessibilityLabel={label} />;
}

const ago = (ms: number) => (ms < 60_000 ? 'たった今' : `${Math.floor(ms / 60_000)}分前`);

export default function Settings() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const now = useNow(30_000);
  const s = useStore((x) => x);
  const a = s.account;
  const minor = isMinor(a);

  // the share sheet: save to Files, mail it, or paste it into a spreadsheet
  const exportCsv = async () => {
    const csv = recordsCsv(getState().sessions, (id) => subj(id).name);
    try {
      const r = await Share.share({ title: 'Inchly の記録', message: csv });
      if (r.action === Share.sharedAction) toast('記録を書き出しました', `${getState().sessions.length}件`);
    } catch {
      toast('書き出せませんでした', 'もう一度試してください');
    }
  };
  const del = () =>
    openSheet((close) => (
      <View>
        <Txt size={18} w="700">アカウントとデータを削除</Txt>
        <Txt size={13.5} tone="ink2" lh={21} style={{ marginTop: 6 }}>
          記録、ToDo、締切、フォロー、グループへの参加がすべて消えます。元には戻せません。先にデータを書き出しておくこともできます。
        </Txt>
        <Btn kind="primary" wide label="削除する" style={{ marginTop: 18, backgroundColor: t.red }} onPress={() => {
          close();
          wipe();
          router.replace('/welcome');
          toast('削除しました');
        }} />
        <Btn kind="quiet" wide label="やめる" style={{ marginTop: 8 }} onPress={close} />
      </View>
    ));

  return (
    <Screen>
      <NavBar title="設定" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Section title="アカウント">
          <Row first label={a?.name ?? '—'} sub={`@${a?.handle ?? ''} · ${a?.grade ?? ''}${a?.aim ? ` · ${a.aim} 志望` : ''}`} />
          <Row label="ログイン" sub={a?.via === 'apple' ? 'Appleでサインイン' : a?.via === 'mail' ? 'メールアドレス' : 'サンプルのアカウント'} />
        </Section>

        <Section title="勉強中を見せる相手" foot={minor ? '18歳未満のため「全員」は選べません。' : '見せない場合も、自分の記録とグループのチャットは使えます。'}>
          <View style={{ paddingVertical: 12 }}>
            <RadioCards<LiveScope> value={s.liveScope} onChange={(v) => { if (v === 'all' && minor) { haptic.warn(); toast('18歳未満は「全員」にできません'); return; } setState({ liveScope: v }); }}
              options={[
                { v: 'all', title: '全員', sub: '「みんな」の自習室に並びます' },
                { v: 'followers', title: 'フォロワーだけ', sub: 'フォローしてくれている人にだけ見えます' },
                { v: 'none', title: '見せない', sub: '勉強中は誰にも表示されません' },
              ]} />
          </View>
          <Row label="順位を公開する" sub="オフでも自分の順位は見られます" right={<Toggle on={s.showRank} onChange={(v) => setState({ showRank: v })} label="順位を公開する" />} />
        </Section>

        <Section title="メッセージを受け取る相手" foot={minor ? '18歳未満のため「全員」は選べません。' : undefined}>
          <View style={{ paddingVertical: 12 }}>
            <Choice<DmFrom> value={s.dmFrom} onChange={(v) => { if (v === 'all' && minor) { haptic.warn(); toast('18歳未満は「全員」にできません'); return; } setState({ dmFrom: v }); }}
              options={[{ v: 'following', label: 'フォロー中の人' }, { v: 'groups', label: 'グループのメンバーまで' }, { v: 'all', label: '全員' }]} />
          </View>
        </Section>

        <Section title="お知らせ">
          <Row first label="仲間が勉強を始めた" sub="サーバーにつながると届きます（準備中）" right={<Toggle on={s.notify.peers} onChange={(v) => setState({ notify: { ...s.notify, peers: v } })} label="仲間が勉強を始めた" />} />
          <Row label="締切が近い" sub="3日前と前日" right={<Toggle on={s.notify.deadlines} onChange={(v) => setState({ notify: { ...s.notify, deadlines: v } })} label="締切が近い" />} />
          <Row label="目標まであと少し" sub="あと15分のとき" right={<Toggle on={s.notify.goal} onChange={(v) => setState({ notify: { ...s.notify, goal: v } })} label="目標まであと少し" />} />
          <Row label="時間割の時間になった" sub="予定が始まる時刻に" right={<Toggle on={s.notify.timetable !== false} onChange={(v) => setState({ notify: { ...s.notify, timetable: v } })} label="時間割の時間になった" />} />
        </Section>

        {THEMES_OPEN ? <Section title="見た目">
          <Press onPress={() => router.push('/design')} scale={0.99} accessibilityRole="button" accessibilityLabel="デザインを変える"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10 }}>
            <View style={{ flex: 1 }}>
              <Txt size={14} w="500">デザイン</Txt>
              <Txt size={12} tone="ink3">背景・メインの色・角・カード・タイマー。ホームを右にスワイプでも開きます</Txt>
            </View>
            <Txt size={16} tone="ink3">›</Txt>
          </Press>
        </Section> : null}

        <Section title="科目">
          <Press onPress={() => router.push('/subjects')} scale={0.99} accessibilityRole="button" accessibilityLabel="科目と色を編集"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row' }}>
              {s.subjects.filter((x) => !x.hidden).slice(0, 6).map((x, i) => <View key={x.id} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: x.c, marginLeft: i ? -5 : 0, borderWidth: 1.5, borderColor: t.surface }} />)}
            </View>
            <View style={{ flex: 1 }}>
              <Txt size={14} w="500">科目と色</Txt>
              <Txt size={12} tone="ink3" numberOfLines={1}>{s.subjects.filter((x) => !x.hidden).map((x) => x.name).join('・')}</Txt>
            </View>
            <Txt size={16} tone="ink3">›</Txt>
          </Press>
        </Section>

        <Section title="1日の目標">
          <View style={{ paddingVertical: 12 }}>
            <Choice value={String(s.goalMin)} onChange={(v) => setState({ goalMin: Number(v) })} options={[60, 120, 180, 240, 300].map((m) => ({ v: String(m), label: `${m / 60}時間` }))} />
          </View>
        </Section>

        <Section title="ブロック中の人">
          {s.blocked.length ? s.blocked.map((n, i) => (
            <Row key={n} first={i === 0} label={n} right={<Btn small kind="line" label="解除" onPress={() => { unblock(n); toast(`${n} のブロックを解除しました`); }} />} />
          )) : <Row first label="いません" sub="人の名前を押すと、ブロックや通報ができます" />}
        </Section>

        <Section title="データ" foot="記録はこの端末に保存されています。圏外でも記録できます。サーバーとの同期はまだありません。機種変更の前に書き出しておいてください。">
          <Row first label="この端末に保存" sub={s.savedAt ? `最後に保存 ${ago(now - s.savedAt)}` : 'まだ保存していません'} />
          <Row label="記録を書き出す（CSV）" sub={`${s.sessions.length}件 · メールやファイルに保存できます`} right={<Btn small kind="line" label="書き出す" onPress={exportCsv} />} />
          <View style={{ borderTopWidth: hair, borderTopColor: t.line, paddingVertical: 12 }}>
            <Press onPress={del} hitSlop={6} accessibilityRole="button" style={{ height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={14} w="600" color={t.red}>アカウントとデータを削除</Txt>
            </Press>
          </View>
        </Section>
        <Txt size={11.5} tone="ink3" style={{ textAlign: 'center', marginTop: 18 }}>Inchly 2.0（モック）</Txt>
      </ScrollView>
    </Screen>
  );
}
