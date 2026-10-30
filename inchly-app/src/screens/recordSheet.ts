import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { FREE, PERSON_COLOR, subj } from '@/data';
import { celebrate } from '@/moments';
import { addPost, gradeOf, commitHeld, commitRecord, elapsedOf, getState, splitAtMidnight, togglePause, useStore, useSubjects } from '@/store';
import { dateKey } from '@/lib/time';
import { haptic } from '@/ui/base';
import { toast } from '@/ui/Toast';

// What "record this study" (app/record.tsx) knows and does, apart from how it
// looks: the session (or the one set aside, ?held=id), the time (fixable by
// 5 minutes), the memo, 自習's subject and contents, posting it too, and
// saving — so a theme (ThemeKit.Record) can draw the same sheet its own way.

export const RECORD_MAX = 140;

export function useRecordSheet() {
  const running = useStore((s) => s.running);
  const before = useStore((s) => s.todayMin);
  const { held: heldId } = useLocalSearchParams<{ held?: string }>();
  const [h] = useState(() => getState().held.find((x) => x.id === heldId));
  const livePlan = useStore((s) => s.planMin);
  const plan = h ? h.planMin ?? null : livePlan;
  const [own] = useState(() => h?.s ?? getState().subj);
  // 自習: the subject is picked here, and what it was written
  const free = own === FREE;
  const subjects = useSubjects();
  const [pick, setPick] = useState<string | null>(null);
  const [what, setWhat] = useState('');
  const sid = free ? pick ?? FREE : own;
  const keepFree = free && pick === FREE;
  const sj = subj(sid);
  const [min, setMin] = useState(() => Math.max(1, Math.round((h ? h.sec : elapsedOf(getState())) / 60)));
  const [end] = useState(() => (h ? new Date(h.end) : new Date()));
  const start = new Date(end.getTime() - min * 60_000);
  const [todoId] = useState(() => (h ? undefined : getState().studyTodo ?? undefined));
  const [note, setNote] = useState('');
  const [share, setShare] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done'>('idle');

  /** nothing to record: no session, none set aside */
  const empty = !h && !running && phase === 'idle';
  // past midnight, the part before it goes to the day before
  const todayPart = splitAtMidnight(min, end).filter((x) => x.date === dateKey(end)).reduce((n, x) => n + x.min, 0);
  const left = RECORD_MAX - note.length;
  const tooLong = left < 0;
  const adjust = (d: number) => { haptic.tap(); setMin((m) => Math.max(1, Math.min(600, m + d))); };
  const back = () => { const c = getState(); if (!h && c.running && c.paused) togglePause(); router.back(); };

  const save = () => {
    if (tooLong) { haptic.warn(); return; }
    setPhase('saving');
    const text = note.trim();
    // 自習 with no subject picked is recorded as 自習, to sort later (the study page's あとで仕分け)
    // 自習のまま: kept as 自習 on purpose (not sorted later); nothing picked: 自習, waiting in あとで仕分け
    const about = free ? { s: pick && pick !== FREE ? pick : FREE, what: what.trim() || undefined, kept: pick === FREE } : {};
    const done = h ? commitHeld(h.id, { note: text || undefined, min, ...about }) : commitRecord({ todoId, note: text || undefined, min, ...about });
    if (!done) { router.back(); return; }
    const { min: m, ticket, exp, levelUp } = done;
    if (share) {
      const a = getState().account;
      addPost({ n: a?.name ?? 'はる', h: a?.handle ?? 'haru_study', c: PERSON_COLOR['はる'], m: gradeOf(a ?? null) || '高3', mine: true, w: 'たった今',
        t: text || `${sj.name}${free && what.trim() ? `（${what.trim()}）` : ''}を${m}分`, tags: [], u: 0, r: 0, rec: { s: sid, min: m, note: text || undefined } });
    }
    haptic.success();
    setPhase('done');
    setTimeout(() => {
      router.back(); // back where you were: the timer stays as you left it
      const sub = [`+${exp} EXP`, ticket ? '7日連続！休み券を1枚もらいました' : '', share ? 'タイムラインにも投稿しました' : ''].filter(Boolean).join(' · ');
      toast(levelUp ? `レベルアップ！ Lv.${levelUp}` : `${sj.name} ${m}分を記録しました`, levelUp ? `${sj.name} ${m}分を記録 · ${sub}` : sub);
      celebrate({ kind: 'record', subject: sid, min: m, exp, level: levelUp, ticket, sheet: true });
    }, 1100); // long enough to see the stamp land
  };

  return {
    empty, before, plan, free, subjects, pick, setPick, keepFree, what, setWhat, sid, sj,
    min, adjust, start, end, note, setNote, share, setShare, phase, todayPart, left, tooLong, back, save,
  };
}
export type RecordSheet = ReturnType<typeof useRecordSheet>;
