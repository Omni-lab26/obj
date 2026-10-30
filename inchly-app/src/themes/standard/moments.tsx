import { ReactNode, useEffect, useRef, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { subj } from '@/data';
import type { Moment } from '@/moments';
import type { MomentKit } from '@/themes/types';
import { dismiss, micro, present } from '@/ui/motion';
import { TextureFill } from '@/ui/Texture';
import type { CreatureId, Face } from './art';
import { LIFT, mix, ring, S } from './look';
import { Dots, J, Num } from './parts';
import { Creature } from './pixel';

// スタンダード's moments, after the mock (docs/app/mock/moments.html): a paper
// card in the middle with the ink outline and the lime shadow, one of the
// creatures standing still in a dotted well, and a few words. It comes in by
// fading from 0.98 to its size (0.2s), waits, and fades away (0.28s); about
// 0.45s in, the creature's face changes with one short fade — nothing hops,
// grows or flies (MOTION.md). ジリ is time (starting, the next plan's time),
// ふせん a ToDo (めぶ when they're all done), ペンタ a record. Starting is the
// most frequent, so it's only a note at the top. Recorded from the record
// sheet, the sheet's えらい！ stamp has said it: no card. The toasts say the facts, as ever.

/** When the creature's face changes, after the card is in. */
const FACE_AT = 450;

/** In (fade, 0.98 → 1), and at ms − 0.28s out; done() at ms. */
function useInOut(ms: number, done: () => void, from: { scale?: number; y?: number }) {
  const o = useSharedValue(0);
  const s = useSharedValue(from.scale ?? 1);
  const y = useSharedValue(from.y ?? 0);
  const end = useRef(done);
  useEffect(() => { end.current = done; }, [done]);
  useEffect(() => {
    o.set(micro(1));
    if (from.scale) s.set(micro(1));
    if (from.y) y.set(present(0));
    const out = setTimeout(() => {
      o.set(dismiss(0));
      if (from.y) y.set(dismiss(from.y));
    }, ms - 280);
    const fin = setTimeout(() => end.current(), ms);
    return () => { clearTimeout(out); clearTimeout(fin); };
    // once, as it mounts (a new moment mounts a new show)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }, { scale: s.value }] }));
}
/** The face: `from`, then `to` once the card is in. */
function useFace(from: Face, to: Face) {
  const [f, setF] = useState(from);
  useEffect(() => { const id = setTimeout(() => setF(to), FACE_AT); return () => clearTimeout(id); }, [to]);
  return f;
}

type CardProps = {
  done: () => void; ms: number; accent: string; who: CreatureId; from: Face; to: Face;
  /** the words over the figure (DotGothic16) */ title: string;
  figure: ReactNode; sub?: string; ticket?: boolean; label: string;
};
/** The card in the middle: the creature in a well of the accent with dots, the words, the figure (24pt: the screen's 32 stays the one big number). */
function Card({ done, ms, accent, who, from, to, title, figure, sub, ticket, label }: CardProps) {
  const a = useInOut(ms, done, { scale: 0.98 });
  const face = useFace(from, to);
  const { width } = useWindowDimensions();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 150 }}>
      <Animated.View accessible accessibilityLabel={label} style={[{ width: Math.min(256, width - 80), borderRadius: 22, backgroundColor: S.card, boxShadow: LIFT }, a]}>
        <View style={{ height: 96, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', backgroundColor: mix(accent, S.card, 0.34), alignItems: 'center', justifyContent: 'center',
          boxShadow: `inset 0px -2px 0px 0px ${S.ink}` }}>
          <TextureFill texture="dots-paper" />
          <Creature id={who} face={face} px={who === 'penta' ? 5 : 4} />
        </View>
        <View style={{ alignItems: 'center', gap: 7, paddingTop: 14, paddingHorizontal: 18, paddingBottom: 18 }}>
          <Dots size={16} lh={20} up={1} ls={0.3} style={{ textAlign: 'center' }}>{title}</Dots>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' }}>{figure}</View>
          {sub ? <J size={12.5} lh={18} color={S.ink2} style={{ textAlign: 'center' }}>{sub}</J> : null}
          {ticket ? (
            <View style={{ minHeight: 26, marginTop: 2, paddingHorizontal: 10, borderRadius: 7, backgroundColor: S.sky, boxShadow: ring(1.5), justifyContent: 'center' }}>
              <J size={12} w="800" lh={16}>休み券 +1</J>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}
/** A figure and its unit: 24pt Bricolage, the unit small and grey. */
const Fig = ({ n }: { n: string }) => <Num size={24} lh={26}>{n}</Num>;
const Unit = ({ u }: { u: string }) => <J size={13} w="700" lh={18} color={S.ink3} style={{ marginHorizontal: 2, marginBottom: 2 }}>{u}</J>;

/** Started: only a note at the top (it happens most), ジリ waking up. */
function Start({ moment, done }: { moment: Extract<Moment, { kind: 'start' }>; done: () => void }) {
  const insets = useSafeAreaInsets();
  const a = useInOut(2800, done, { y: -12 });
  const face = useFace('sleep', 'ring');
  const text = `${subj(moment.subject).name}をはじめました`;
  return (
    <Animated.View accessible accessibilityRole="alert" accessibilityLabel={text}
      style={[{ position: 'absolute', top: insets.top + 6, left: 12, right: 12, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: S.card, boxShadow: LIFT }, a]}>
      <Creature id="jiri" face={face} px={3} />
      <J size={15} w="700" lh={20} style={{ flex: 1 }} numberOfLines={2}>{text}</J>
    </Animated.View>
  );
}

function Todo({ moment, done }: { moment: Extract<Moment, { kind: 'todo' }>; done: () => void }) {
  const exp = `+${moment.exp}`;
  return (
    <Card done={done} ms={1400} accent={S.sun} who={moment.all ? 'mebu' : 'fusen'} from="idle" to="happy"
      title={moment.all ? 'ToDo ぜんぶクリア！' : 'ToDo クリア！'} label={`${moment.all ? 'ToDo ぜんぶクリア' : 'ToDo クリア'} ${exp} EXP`}
      figure={moment.exp ? <><Fig n={exp} /><Unit u="EXP" /></> : null} />
  );
}

function Target({ moment, done }: { moment: Extract<Moment, { kind: 'target' }>; done: () => void }) {
  return (
    <Card done={done} ms={1700} accent={S.coral} who="jiri" from="idle" to="ring" title="次の予定の時間です" label={`次の予定の時間です。${moment.min}分`}
      figure={<><Fig n={String(moment.min)} /><Unit u="分" /></>} />
  );
}

function Record({ moment, done }: { moment: Extract<Moment, { kind: 'record' }>; done: () => void }) {
  // from the record sheet, its stamp has said it
  useEffect(() => { if (moment.sheet) done(); }, [moment.sheet, done]);
  if (moment.sheet) return null;
  const name = subj(moment.subject).name;
  const lv = moment.level;
  return (
    <Card done={done} ms={1800} accent={S.sun} who="penta" from="idle" to="happy" ticket={moment.ticket}
      title={lv ? 'レベルアップ！' : `${name} ${moment.min}分`}
      label={lv ? `レベルアップ！ Lv.${lv}。${name} ${moment.min}分 +${moment.exp} EXP` : `${name} ${moment.min}分 +${moment.exp} EXP`}
      figure={lv ? <><Unit u="Lv." /><Fig n={String(lv)} /></> : <><Fig n={`+${moment.exp}`} /><Unit u="EXP" /></>}
      sub={lv ? `${name} ${moment.min}分 · +${moment.exp} EXP` : undefined} />
  );
}

export const moments: MomentKit = { start: Start, todo: Todo, target: Target, record: Record };
