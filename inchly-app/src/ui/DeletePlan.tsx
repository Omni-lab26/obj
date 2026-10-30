import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { subj } from '../data';
import { endOf, type Block } from '../lib/timetable';
import { removeBlock } from '../store';
import { Btn, haptic, Press, StdKey, Txt } from './base';
import { Dialog } from './Dialog';
import { S, useStd } from './stdLook';
import { toast } from './Toast';

// 消しますか？: asked before a plan leaves the timetable (from 削除 on a row slid
// right). It says which plan, and, for one that repeats, that every weekday's
// copy goes with it. 消す removes it; やめる (or a tap outside) puts the row back.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];
let ask: ((b: Block, back: () => void) => void) | null = null;

/** Asks whether to delete this plan; `back` runs when the answer is no. */
export function askDeletePlan(b: Block, back: () => void) {
  if (ask) ask(b, back);
  else back();
}

/** Where the question shows (once, on the page with the timetable). */
export function DeletePlanHost() {
  const std = useStd();
  const [q, setQ] = useState<{ b: Block; back: () => void } | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    ask = (b, back) => { setQ({ b, back }); setOpen(true); };
    return () => { ask = null; };
  }, []);
  const no = () => { setOpen(false); q?.back(); };
  const yes = () => {
    if (!q) return;
    setOpen(false);
    removeBlock(q.b.id);
    haptic.warn();
    toast('予定を削除しました');
  };
  const b = q?.b;
  const sj = b ? subj(b.s) : null;
  const when = b ? (b.start ? `${b.start}${endOf(b) ? `〜${endOf(b)}` : 'から'}` : '時刻なし') : '';
  const repeats = b && !b.date && b.days.length > 1 ? `毎週${b.days.map((d) => DOW[d]).join('・')}曜日の予定です。\nほかの曜日の分もいっしょに消えます。` : '';
  return (
    <Dialog open={open} close={no} title="消しますか？">
      {b && sj ? (
        <View style={{ gap: 10, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ gap: 2, marginBottom: repeats ? 0 : 6 }}>
            <Txt size={15} w="700" numberOfLines={1}>{`${sj.name}${b.t ? ` · ${b.t}` : ''}`}</Txt>
            <Txt num size={13} tone="ink2">{when}</Txt>
          </View>
          {repeats ? <Txt size={13} tone="ink2" style={{ marginBottom: 6 }}>{repeats}</Txt> : null}
          {std ? (
            // スタンダード: a key whose words are crimson (taking something away), as in the plan sheet
            <StdKey onPress={yes} label="この予定を消す" style={{ minHeight: 48 }} face={{ minHeight: 48 }}>
              <Txt size={15} w="700" color={S.pause}>消す</Txt>
            </StdKey>
          ) : (
            <Press onPress={yes} accessibilityRole="button" accessibilityLabel="この予定を消す" style={{ height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={15} w="700" tone="red">消す</Txt>
            </Press>
          )}
          <Btn kind="ghost" wide label="やめる" onPress={no} />
        </View>
      ) : null}
    </Dialog>
  );
}
