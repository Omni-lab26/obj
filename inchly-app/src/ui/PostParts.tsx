import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PERSON_COLOR, Post, subj } from '../data';
import { addPost, gradeOf, getState, toggleBookmark, toggleHelpful, useStore } from '../store';
import { hair, useT } from '../theme';
import { Avatar, Btn, haptic, PixHead, Press, StdIcon, SubjTile, Txt } from './base';
import { personSheet } from './Editors';
import { Choice, Field } from './Form';
import { Icon } from './Icon';
import { fadeIn } from './motion';
import { Rolling } from './Rolling';
import { openSheet } from './Sheet';
import { Sticker } from './Sticker';
import { toast } from './Toast';
import { ring, S, SR, useStd } from './stdLook';

// Timeline posts, laid out like a microblog: avatar in a left column, name,
// @handle and time on one line, the text, an attached study record if there
// is one, and a row of quiet actions. Rows are split by hairlines, not cards.

const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ''}` : `${m}分`);

/** A study record attached to a post: the subject's colour, how long, what. */
function RecordChip({ rec }: { rec: NonNullable<Post['rec']> }) {
  const t = useT();
  const std = useStd();
  const sj = subj(rec.s);
  // スタンダード: a sunken box (paper 2, a thin ink edge) with the subject's square, a dotted label, the time
  if (std) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 9, paddingVertical: 10, paddingHorizontal: 12, borderRadius: SR.mid, backgroundColor: S.paper2, boxShadow: ring(1.5) }}>
        <SubjTile name={sj.name} color={sj.c} area={sj.area} size={32} radius={8} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <PixHead size={13} color={S.ink2}>勉強の記録</PixHead>
          <Txt size={14} w="700" lh={18} numberOfLines={1}>{sj.name}{rec.note ? <Txt size={13} tone="ink2">{`  ${rec.note}`}</Txt> : null}</Txt>
        </View>
        <Txt num size={15} w="800" lh={18}>{hm(rec.min)}</Txt>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 12, borderWidth: hair, borderColor: t.line2, backgroundColor: t.canvas }}>
      <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 1.5, backgroundColor: sj.c }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={11} tone="ink3" lh={14}>勉強の記録</Txt>
        <Txt size={13.5} w="600" lh={18} numberOfLines={1}>{sj.name}{rec.note ? <Txt size={12} tone="ink2">{`  ${rec.note}`}</Txt> : null}</Txt>
      </View>
      <Txt num size={15} w="700">{hm(rec.min)}</Txt>
    </View>
  );
}

export function PostRow({ p, first }: { p: Post; first?: boolean }) {
  const t = useT();
  const std = useStd();
  const account = useStore((s) => s.account);
  const name = p.mine ? account?.name ?? p.n : p.n;
  const handle = p.mine ? account?.handle ?? p.h : p.h;
  const color = p.mine ? PERSON_COLOR['はる'] : p.c;
  const who = () => (p.mine ? undefined : personSheet(p.n, p.c));
  return (
    <View style={[{ flexDirection: 'row', gap: 10, paddingTop: 12, paddingBottom: 6, paddingHorizontal: 16, borderTopWidth: first ? 0 : hair, borderTopColor: t.line },
      std && { paddingTop: 14, paddingBottom: 4, borderTopWidth: first ? 0 : 1.5 }]}>
      <Press onPress={who} disabled={p.mine} scale={0.92} accessibilityLabel={`${name}のプロフィール`}>
        <Avatar name={name} color={color} size={40} />
      </Press>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Txt size={std ? 14.5 : 14} w="700" lh={19} numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Txt>
          <Txt size={13} tone="ink3" lh={19} numberOfLines={1} style={{ flexShrink: 2 }}>{`@${handle} · ${p.w}`}</Txt>
          <View style={{ flex: 1 }} />
          {p.mine ? null : (
            <Press onPress={who} hitSlop={10} accessibilityLabel={`${name}への操作`} style={{ marginRight: -4 }}>
              {std ? <StdIcon name="more" color={S.ink3} /> : <Icon name="more" size={16} color={t.ink3} />}
            </Press>
          )}
        </View>
        <Txt size={14.5} lh={std ? 23 : 22} style={{ marginTop: std ? 2 : 1 }}>{p.t}</Txt>
        {p.tags.length ? <Txt size={14} w={std ? '700' : '400'} color={std ? S.ink2 : t.blue} lh={21}>{p.tags.join(' ')}</Txt> : null}
        {p.rec ? <RecordChip rec={p.rec} /> : null}
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 28, marginTop: 4 }, std && { gap: 26, marginTop: 2, height: 40 }]}>
          <Press onPress={() => toast('返信はこれから作ります')} hitSlop={8} accessibilityLabel={`返信 ${p.r}件`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 32 }}>
            <Icon name="chat" size={16} color={t.ink3} width={std ? 2 : undefined} />
            <Txt num size={12.5} tone="ink3">{p.r}</Txt>
          </Press>
          <Helpful id={p.id} base={p.u} />
          <Bookmark id={p.id} />
          <Press onPress={() => toast('リンクをコピーしました')} hitSlop={8} accessibilityLabel="共有" style={{ height: 32, justifyContent: 'center' }}>
            <Icon name="share" size={16} color={t.ink3} width={std ? 2 : undefined} />
          </Press>
        </View>
      </View>
    </View>
  );
}

function Helpful({ id, base }: { id: string; base: number }) {
  const t = useT();
  const std = useStd();
  const on = useStore((s) => s.helpful.includes(id));
  const press = () => {
    if (!on) haptic.soft();
    toggleHelpful(id);
  };
  return (
    <Press onPress={press} haptics={false} scale={0.94} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel="役に立った" hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 32 }}>
      <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
        {/* marked: the sticker takes the plain bulb's place, cross-fading (no pop) */}
        <Animated.View key={on ? 'on' : 'off'} entering={fadeIn()}>{on ? <Sticker name="bulb" size={24} tilt={-8} /> : <Icon name="bulb" size={16} color={t.ink3} width={std ? 2 : undefined} />}</Animated.View>
      </View>
      <Rolling value={String(base + (on ? 1 : 0))} size={std ? 13 : 12.5} weight={on ? '700' : std ? '500' : '400'} color={on ? (std ? '#A65F00' : '#B86E00') : t.ink3} />
    </Press>
  );
}

/** Save the post for later; saved ones are in the menu's ブックマーク. */
function Bookmark({ id }: { id: string }) {
  const t = useT();
  const std = useStd();
  const on = useStore((s) => s.bookmarks.includes(id));
  const press = () => {
    const now = toggleBookmark(id);
    if (now) {
      haptic.soft();
      toast('ブックマークしました', 'メニューの「ブックマーク」から見られます');
    } else haptic.tap();
  };
  return (
    <Press onPress={press} haptics={false} scale={0.94} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={on ? 'ブックマークを外す' : 'ブックマーク'}
      style={{ height: 32, justifyContent: 'center' }}>
      <Icon name="bookmark" size={16} color={on ? t.blue : t.ink3} filled={on} width={std ? 2 : undefined} />
    </Press>
  );
}

// ---------- writing a post ----------
export function composeSheet() {
  openSheet((close) => <Compose close={close} />);
}
function Compose({ close }: { close: () => void }) {
  const last = useStore((s) => s.sessions.filter((x) => x.date === s.lastDay).slice(-1)[0]);
  const [text, setText] = useState('');
  const [tag, setTag] = useState<'' | '#質問' | '#おすすめ'>('');
  const [attach, setAttach] = useState<'none' | 'last'>(last ? 'last' : 'none');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const err = touched && !text.trim() ? 'なにか書いてください' : undefined;
  const post = () => {
    if (!text.trim()) { setTouched(true); return; }
    setBusy(true);
    setTimeout(() => {
      const a = getState().account;
      addPost({ n: a?.name ?? 'はる', h: a?.handle ?? 'haru_study', c: PERSON_COLOR['はる'], m: gradeOf(a ?? null) || '高3', mine: true, w: 'たった今', t: text.trim(),
        tags: tag ? [tag] : [], u: 0, r: 0, rec: attach === 'last' && last ? { s: last.s, min: last.min, note: last.note } : undefined });
      haptic.success();
      close();
      toast('投稿しました');
    }, 600);
  };
  return (
    <View style={{ gap: 14 }}>
      <Txt size={17} w="700">投稿</Txt>
      <Field label="いま何してる？" value={text} onChangeText={setText} multiline max={280} error={err} onBlur={() => setTouched(true)} />
      {last ? (
        <Choice value={attach} onChange={setAttach} options={[{ v: 'last', label: `記録をつける（${subj(last.s).name} ${last.min}分）` }, { v: 'none', label: 'つけない' }]} />
      ) : null}
      <Choice value={tag} onChange={setTag} options={[{ v: '', label: 'タグなし' }, { v: '#質問', label: '#質問' }, { v: '#おすすめ', label: '#おすすめ' }]} />
      <Btn kind="primary" wide label="投稿する" loading={busy} disabled={!text.trim()} onPress={post} style={{ marginTop: 6 }} />
    </View>
  );
}
