import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { useDataVersion, vote, voteOf } from '@/lib/data';
import { refImage } from '@/lib/data/images';
import type { Block } from '@/lib/data/types';
import { calcOut, linePoints, num, splitMarks } from '@/lib/format';
import { t } from '@/i18n';
import { chartColors, colors, fonts, space, type } from '@theme';

import { Icon } from '../Icon';
import { toast } from '../Toast';

// 記事の部品。図とグラフは色の付いた地を使わず、うすいガラスの面に置く（design.md）。
// 文章が主役なので、図は小さめにまとめる。

/** 図を長押ししたときに呼ぶ（記事の画面が受け取って、メニューを出す） */
export const FigureCtx = createContext<(title: string) => void>(() => {});

function Obj({ title, tag, children, hint }: { title?: string; tag?: string; children: ReactNode; hint?: string }) {
  const onFigure = useContext(FigureCtx);
  return (
    <Pressable
      delayLongPress={450}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onFigure(title ?? '図');
      }}
      style={({ pressed }) => [s.obj, pressed && { transform: [{ scale: 0.985 }] }]}>
      {title || tag ? (
        <View style={s.ohd}>
          <Text style={s.ohdT}>{title}</Text>
          {tag ? <Text style={s.otag}>{tag}</Text> : null}
        </View>
      ) : null}
      {children}
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </Pressable>
  );
}

// 指でなぞる場所（0〜1）を返す。縦のスクロールより先に受け取る。
function useScrub(onPos: (x: number) => void) {
  const [w, setW] = useState(1);
  const handle = (e: { nativeEvent: { locationX: number } }) =>
    onPos(Math.max(0, Math.min(1, e.nativeEvent.locationX / w)));
  return {
    onLayout: (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width),
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: handle,
    onResponderMove: handle,
  };
}

function Seg({ items, value, onChange }: { items: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.seg}>
      {items.map((it) => (
        <Pressable
          key={it}
          accessibilityRole="button"
          accessibilityState={{ selected: it === value }}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onChange(it);
          }}
          style={[s.segB, it === value && s.segOn]}>
          <Text style={[s.segT, it === value && s.segTOn]}>{it}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function LineChart({ b }: { b: Extract<Block, { t: 'line' }> }) {
  const keys = Object.keys(b.frames);
  const [frame, setFrame] = useState(b.def);
  const pts = linePoints(b.frames[frame]);
  const [pick, setPick] = useState<number | null>(null);
  const scrub = useScrub((x) => setPick(Math.round(x * (pts.length - 1))));
  const W = 300;
  const H = 110;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const y = (v: number) => H - 6 - ((v - min) / (max - min || 1)) * (H - 12);
  const x = (i: number) => (i / (pts.length - 1)) * W;
  const d = pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const i = pick ?? pts.length - 1;
  const first = pts[0];
  const cur = pts[i];
  const ch = cur - first;
  return (
    <Obj title={b.title} tag="PULL" hint={t('blocks.lineHint')}>
      <View style={s.bigRow}>
        <Text style={s.big}>{num(cur, b.dec)}</Text>
        <Text style={s.unit}>{b.unit}</Text>
      </View>
      <Text style={[s.chg, { color: ch >= 0 ? colors.ok : colors.accent }]}>
        {ch >= 0 ? '▲' : '▼'} {num(Math.abs(ch), b.dec)} ({((ch / first) * 100).toFixed(2)}%)
      </Text>
      <View {...scrub} onTouchEnd={() => setPick(null)} style={{ height: H, marginTop: 10 }}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <Polyline points={d} fill="none" stroke={chartColors.accent} strokeWidth={2} strokeLinejoin="round" />
          {pick !== null ? <Line x1={x(i)} x2={x(i)} y1={0} y2={H} stroke={chartColors.grid} strokeWidth={1} /> : null}
          <Circle cx={x(i)} cy={y(cur)} r={4.5} fill={colors.white} stroke={chartColors.accent} strokeWidth={2.5} />
        </Svg>
      </View>
      <Seg items={keys} value={frame} onChange={(v) => (setFrame(v), setPick(null))} />
    </Obj>
  );
}

function Bars({ b }: { b: Extract<Block, { t: 'bars' }> }) {
  const [pick, setPick] = useState(b.cols.length - 1);
  const scrub = useScrub((x) => setPick(Math.min(b.cols.length - 1, Math.floor(x * b.cols.length))));
  const max = Math.max(...b.cols.map((c) => c[1].reduce((p, q) => p + q, 0)));
  const vs = b.cols[pick][1];
  return (
    <Obj title={b.title} tag="SCRUB" hint={t('blocks.barsHint')}>
      {b.sub ? <Text style={s.osub}>{b.sub}</Text> : null}
      <View style={s.bigRow}>
        <Text style={s.big}>
          {num(
            vs.reduce((p, q) => p + q, 0),
            b.dec ?? 0
          )}
        </Text>
        <Text style={s.unit}>{b.unit}</Text>
        <Text style={[s.unit, { marginLeft: 'auto', fontFamily: fonts.mono }]}>{b.cols[pick][0]}</Text>
      </View>
      <View {...scrub} style={s.bars}>
        {b.cols.map((c, i) => {
          const tot = c[1].reduce((p, q) => p + q, 0);
          return (
            <View key={c[0]} style={[s.barCol, { opacity: i === pick ? 1 : 0.45 }]}>
              <View style={{ height: `${(tot / max) * 100}%`, gap: 2 }}>
                {c[1].map((v, j) => (
                  <View key={j} style={{ flex: v, minHeight: 2, borderRadius: 3, backgroundColor: b.series[j][1] }} />
                ))}
              </View>
            </View>
          );
        })}
      </View>
      <View style={s.legend}>
        {b.series.map((sr, j) => (
          <Text key={sr[0]} style={s.legendT}>
            <Text style={{ color: sr[1] }}>■ </Text>
            {sr[0]} {num(vs[j], b.dec ?? 0)}
          </Text>
        ))}
      </View>
    </Obj>
  );
}

function Compare({ b }: { b: Extract<Block, { t: 'compare' }> }) {
  const [side, setSide] = useState(b.a[0]);
  const text = side === b.a[0] ? b.a[1] : b.b[1];
  return (
    <Obj title={b.title} tag="SWITCH" hint={t('blocks.compareHint')}>
      <Seg items={[b.a[0], b.b[0]]} value={side} onChange={setSide} />
      <Animated.View key={side} entering={FadeIn.duration(260)} style={s.cmp}>
        <Text style={s.cmpT}>
          {splitMarks(text).map((p, i) => (
            <Text key={i} style={p.mark ? s.mark : null}>
              {p.t}
            </Text>
          ))}
        </Text>
      </Animated.View>
    </Obj>
  );
}

function Steps({ b }: { b: Extract<Block, { t: 'steps' }> }) {
  const [on, setOn] = useState(0);
  return (
    <Obj title={b.title} tag="STEPS">
      {b.items.map(([when, what], i) => (
        <Pressable key={when} onPress={() => setOn(i)} style={s.step}>
          <View style={s.stepRail}>
            <View style={[s.stepDot, i < on && { backgroundColor: colors.text }, i === on && s.stepDotOn]} />
          </View>
          <View style={{ flex: 1, paddingBottom: 12 }}>
            <Text style={[s.stepW, i === on && { color: colors.accent }]}>{when}</Text>
            <Text style={[s.stepX, i === on && { color: colors.text }]}>{what}</Text>
          </View>
        </Pressable>
      ))}
    </Obj>
  );
}

function Poll({ b }: { b: Extract<Block, { t: 'poll' }> }) {
  useDataVersion();
  const mine = voteOf(b.id);
  return (
    <Obj title={b.q} tag="VOTE" hint={mine === undefined ? t('blocks.pollAfter', { n: num(b.n) }) : undefined}>
      {b.opts.map(([label, pct], i) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          disabled={mine !== undefined}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            vote(b.id, i);
            toast(t('blocks.pollThanks'));
          }}
          style={[s.pl, mine === i && s.plMine]}>
          {mine !== undefined ? (
            <Animated.View
              layout={LinearTransition.duration(600)}
              style={[s.plFill, { width: `${pct}%` }, mine === i && s.plFillMine]}
            />
          ) : null}
          <Text style={s.plT}>{label}</Text>
          {mine !== undefined ? <Text style={s.plP}>{pct}%</Text> : null}
        </Pressable>
      ))}
    </Obj>
  );
}

function Cards({ b }: { b: Extract<Block, { t: 'cards' }> }) {
  const [top, setTop] = useState(0);
  const n = b.items.length;
  return (
    <Obj title={b.title} tag={`${n} CARDS`} hint={t('blocks.cardsHint')}>
      <View style={{ height: 136, marginTop: 8 }}>
        {b.items.map((it, i) => {
          const depth = (i - top + n) % n;
          return (
            <Pressable
              key={it[0]}
              onPress={() => setTop((top + 1) % n)}
              style={[
                s.card,
                {
                  zIndex: n - depth,
                  transform: [{ translateY: depth * 8 }, { scale: 1 - depth * 0.04 }],
                  backgroundColor: depth ? '#121214' : '#17171A',
                },
              ]}>
              <View style={{ opacity: depth ? 0 : 1 }}>
                <Text style={s.cardN}>
                  {i + 1} / {n}
                </Text>
                <Text style={s.cardH}>{it[0]}</Text>
                <Text style={s.cardX}>{it[1]}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Obj>
  );
}

function Calc({ b }: { b: Extract<Block, { t: 'calc' }> }) {
  const [v, setV] = useState(b.val);
  const step = Math.max(1, Math.round((b.max - b.min) / 20));
  const out = calcOut(b.kind, v);
  const lead = { loan: '毎月の返済が', power: '1か月の電気代が', fx: '受け取れるのは', rice: '1年で' }[b.kind];
  return (
    <Obj title={b.title} tag="CALC">
      <View style={s.calcRow}>
        <Text style={s.osub}>{b.label}</Text>
        <Text style={s.calcV}>
          {num(v)} {b.unit}
        </Text>
      </View>
      <View style={s.stepper}>
        {[-1, 1].map((dir) => (
          <Pressable
            key={dir}
            accessibilityRole="button"
            accessibilityLabel={dir < 0 ? '減らす' : '増やす'}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setV((x) => Math.max(b.min, Math.min(b.max, x + dir * step)));
            }}
            style={s.stepBtn}>
            <Text style={s.stepBtnT}>{dir < 0 ? '−' : '+'}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.bigRow}>
        <Text style={s.unit}>{lead}</Text>
        <Text style={s.big}>{out.main}</Text>
        {b.kind !== 'fx' ? <Text style={s.unit}>増えます</Text> : null}
      </View>
      {out.sub ? <Text style={s.osub}>{out.sub}</Text> : null}
    </Obj>
  );
}

function Swap({ b }: { b: Extract<Block, { t: 'swap' }> }) {
  const [amt, setAmt] = useState(b.amt);
  const usd = amt / b.rate;
  return (
    <Obj title={b.title} tag="SWAP">
      <View style={s.swapBox}>
        <Text style={s.osub}>両替する円</Text>
        <Text style={s.big}>¥{num(amt)}</Text>
      </View>
      <View style={s.swapBox}>
        <Text style={s.osub}>受け取れるドル（1ドル {b.rate}円）</Text>
        <Text style={s.big}>${num(usd)}</Text>
      </View>
      <Seg
        items={['5万円', '10万円', '30万円']}
        value={`${amt / 10000}万円`}
        onChange={(x) => setAmt(Number(x.replace('万円', '')) * 10000)}
      />
    </Obj>
  );
}

function ICompare({ b }: { b: Extract<Block, { t: 'icompare' }> }) {
  const [side, setSide] = useState<'a' | 'b'>('b');
  const W = 300;
  const H = 110;
  const all = [...b.a.pts, ...b.b.pts];
  const min = Math.min(...all) - 0.2;
  const max = Math.max(...all) + 0.2;
  const pts = (arr: number[]) =>
    arr
      .map(
        (v, i) =>
          `${((i / (arr.length - 1)) * (W - 20) + 10).toFixed(1)},${(H - ((v - min) / (max - min)) * H).toFixed(1)}`
      )
      .join(' ');
  return (
    <Obj title={b.title} tag="COMPARE" hint={b.note}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ marginTop: 10 }}>
        <Polyline
          points={pts(b.a.pts)}
          fill="none"
          stroke={side === 'a' ? chartColors.accent : chartColors.soft}
          strokeWidth={side === 'a' ? 2.5 : 1.5}
        />
        <Polyline
          points={pts(b.b.pts)}
          fill="none"
          stroke={side === 'b' ? chartColors.accent : chartColors.soft}
          strokeWidth={side === 'b' ? 2.5 : 1.5}
        />
      </Svg>
      <View style={s.xlabels}>
        {b.xlabels.map((x, i) => (
          <Text key={x} style={s.legendT}>
            {x} {(side === 'a' ? b.a.pts : b.b.pts)[i]}
            {b.ylab}
          </Text>
        ))}
      </View>
      <Seg
        items={[b.a.label, b.b.label]}
        value={side === 'a' ? b.a.label : b.b.label}
        onChange={(v) => setSide(v === b.a.label ? 'a' : 'b')}
      />
    </Obj>
  );
}

function Heat({ b }: { b: Extract<Block, { t: 'heat' }> }) {
  const all = b.vals.flat();
  const min = Math.min(...all);
  const max = Math.max(...all);
  const [pick, setPick] = useState<[number, number] | null>(null);
  return (
    <Obj title={b.title} tag="HEAT">
      <View style={s.heatRow}>
        <View style={{ width: 74 }} />
        {b.cols.map((c) => (
          <Text key={c} style={[s.legendT, { flex: 1, textAlign: 'center' }]}>
            {c}
          </Text>
        ))}
      </View>
      {b.rows.map((r, i) => (
        <View key={r} style={s.heatRow}>
          <Text style={[s.legendT, { width: 74 }]}>{r}</Text>
          {b.vals[i].map((v, j) => (
            <Pressable
              key={j}
              onPress={() => setPick([i, j])}
              style={[
                s.heatC,
                { backgroundColor: `rgba(255,106,26,${(0.12 + ((v - min) / (max - min || 1)) * 0.78).toFixed(2)})` },
                pick?.[0] === i && pick?.[1] === j && s.heatOn,
              ]}
            />
          ))}
        </View>
      ))}
      <Text style={[s.osub, { marginTop: 8 }]}>
        {pick
          ? `${b.rows[pick[0]]} · ${b.cols[pick[1]]}：${num(b.vals[pick[0]][pick[1]])}${b.money ? '円' : ''}`
          : 'マスをタップすると数字が出ます'}
      </Text>
    </Obj>
  );
}

/** 図の画像：横幅いっぱい、縦は画像の比率のまま。長押しでメニュー */
function FigImage({ src }: { src: number }) {
  const onFigure = useContext(FigureCtx);
  const [ratio, setRatio] = useState(1.6);
  return (
    <Pressable delayLongPress={450} onLongPress={() => onFigure('図')}>
      <Image
        source={src}
        onLoad={(e) => setRatio(e.source.width / e.source.height)}
        style={{ width: '100%', aspectRatio: ratio, borderRadius: 20, backgroundColor: '#E8E5E1' }}
        contentFit="cover"
      />
    </Pressable>
  );
}

function Accordion({ b }: { b: Extract<Block, { t: 'accordion' }> }) {
  const [on, setOn] = useState(b.items.length - 1);
  return (
    <Obj title={b.title} tag="TIMELINE">
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
        {b.items.map((it, i) => (
          <Pressable key={it.h} onPress={() => setOn(i)} style={[s.accTab, i === on && s.accTabOn]}>
            <Text style={[s.accTabT, i === on && { color: '#111' }]}>{it.h}</Text>
          </Pressable>
        ))}
      </View>
      <Animated.View key={on} entering={FadeIn.duration(240)} style={s.cmp}>
        {refImage(`sq${b.items[on].img}`) ? (
          <Image source={refImage(`sq${b.items[on].img}`)} style={s.accImg} contentFit="cover" />
        ) : null}
        <Text style={s.cmpT}>{b.items[on].x}</Text>
      </Animated.View>
    </Obj>
  );
}

export function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'p':
      return (
        <Text style={s.p} maxFontSizeMultiplier={type.body.max}>
          {b.x}
        </Text>
      );
    case 'h':
      return (
        <Text style={s.h} accessibilityRole="header" maxFontSizeMultiplier={type.headline.max}>
          {b.x}
        </Text>
      );
    case 'video':
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={b.title}
          onPress={() => toast(t('blocks.videoOpen'))}
          style={s.video}>
          {refImage(`th${b.img}`) ? (
            <>
              <Image source={refImage(`th${b.img}`)} style={StyleSheet.absoluteFill} contentFit="cover" />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
            </>
          ) : null}
          <View style={s.play}>
            <Icon name="play" size={22} color={colors.white} />
          </View>
          {refImage(`th${b.img}`) ? null : (
            <Text style={s.videoT} numberOfLines={2}>
              {b.title}
            </Text>
          )}
          <View style={s.len}>
            <Icon name="play" size={10} color={colors.youtube} />
            <Text style={s.lenT}>{t('blocks.video', { len: b.len })}</Text>
          </View>
        </Pressable>
      );
    case 'fig': {
      const src = refImage(b.img);
      if (!src) return null;
      return (
        <View>
          <FigImage src={src} />
          {b.cap ? <Text style={s.cap}>{b.cap}</Text> : null}
        </View>
      );
    }
    case 'count':
      return (
        <Obj title={b.label} tag="KEY NUMBER">
          <View style={s.bigRow}>
            <Text style={[s.big, { fontSize: 34, lineHeight: 40 }]}>{num(b.value, b.dec)}</Text>
            <Text style={s.unit}>{b.suf}</Text>
          </View>
          {b.sub ? <Text style={s.osub}>{b.sub}</Text> : null}
        </Obj>
      );
    case 'line':
      return <LineChart b={b} />;
    case 'bars':
      return <Bars b={b} />;
    case 'compare':
      return <Compare b={b} />;
    case 'steps':
      return <Steps b={b} />;
    case 'poll':
      return <Poll b={b} />;
    case 'cards':
      return <Cards b={b} />;
    case 'calc':
      return <Calc b={b} />;
    case 'swap':
      return <Swap b={b} />;
    case 'icompare':
      return <ICompare b={b} />;
    case 'heat':
      return <Heat b={b} />;
    case 'accordion':
      return <Accordion b={b} />;
    case 'refs':
      return (
        <View>
          <Text style={s.refsH}>{t('article.refs')}</Text>
          {b.items.map(([title, src, dom]) => (
            <Pressable
              key={title}
              accessibilityRole="link"
              onPress={() => Linking.openURL(`https://${dom}/`)}
              style={s.ref}>
              <View style={{ flex: 1 }}>
                <Text style={s.refT}>{title}</Text>
                <Text style={s.refS}>
                  {src} · {dom}
                </Text>
              </View>
              <Icon name="link" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      );
    default:
      return null;
  }
}

const s = StyleSheet.create({
  p: { color: colors.textSoft, fontSize: type.body.fontSize, lineHeight: type.body.lineHeight },
  h: { color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: '700', marginTop: 10 },
  obj: {
    borderRadius: 22,
    padding: 16,
    paddingBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ohd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  ohdT: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600', flex: 1 },
  otag: { color: colors.faint, fontFamily: fonts.mono, fontSize: 9.5, letterSpacing: 1.4 },
  osub: { color: colors.faint, fontSize: 11.5, lineHeight: 17, marginTop: 4 },
  hint: { color: 'rgba(242,242,243,0.45)', fontSize: 11, marginTop: 10 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 },
  big: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  unit: { color: colors.faint, fontSize: 13 },
  chg: { fontFamily: fonts.mono, fontSize: 12, marginTop: 4 },
  seg: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  segB: { flex: 1, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: 'rgba(255,255,255,0.92)' },
  segT: { color: colors.faint, fontSize: 12, fontWeight: '600' },
  segTOn: { color: '#16161A' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120, marginTop: 12 },
  barCol: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendT: { color: 'rgba(242,242,243,0.7)', fontSize: 11, fontFamily: fonts.mono },
  cmp: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cmpT: { color: colors.text, fontSize: 14.5, lineHeight: 25 },
  mark: { color: '#FFB98F', backgroundColor: 'rgba(255,106,26,0.25)' },
  step: { flexDirection: 'row', gap: 12 },
  stepRail: { width: 14, alignItems: 'center', borderLeftWidth: 0 },
  stepDot: { marginTop: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)' },
  stepDotOn: { backgroundColor: colors.accent, transform: [{ scale: 1.2 }] },
  stepW: { color: colors.faint, fontFamily: fonts.monoBold, fontSize: 12, marginTop: 4 },
  stepX: { color: 'rgba(242,242,243,0.72)', fontSize: 13, lineHeight: 20, marginTop: 2 },
  pl: {
    height: 44,
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  plMine: { borderColor: colors.accent },
  plFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.12)' },
  plFillMine: { backgroundColor: 'rgba(255,106,26,0.3)' },
  plT: { color: colors.text, fontSize: 13.5 },
  plP: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 13, marginLeft: 'auto' },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 120,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  cardN: { color: colors.faint, fontFamily: fonts.mono, fontSize: 10 },
  cardH: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 4 },
  cardX: { color: 'rgba(242,242,243,0.72)', fontSize: 12.5, lineHeight: 19, marginTop: 4 },
  calcRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  calcV: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 15 },
  stepper: { flexDirection: 'row', gap: 8, marginTop: 10 },
  stepBtn: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnT: { color: colors.text, fontSize: 20, fontWeight: '500' },
  swapBox: { marginTop: 8, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)' },
  xlabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  heatC: { flex: 1, height: 26, borderRadius: 7 },
  heatOn: { borderWidth: 2, borderColor: colors.white },
  accTab: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accTabOn: { backgroundColor: 'rgba(255,255,255,0.92)' },
  accTabT: { color: colors.faint, fontFamily: fonts.monoBold, fontSize: 12 },
  video: {
    aspectRatio: 16 / 9,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A0F0F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,77,77,0.25)',
  },
  play: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,77,77,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  videoT: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  len: {
    position: 'absolute',
    left: 12,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  lenT: { color: colors.white, fontSize: 11, fontWeight: '600' },
  cap: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 6 },
  accImg: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 10 },
  refsH: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  ref: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 8,
  },
  refT: { color: colors.text, fontSize: 13, lineHeight: 18 },
  refS: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },
});
