import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Polygon, Rect } from 'react-native-svg';

import { alleyGeo, OPEN_W, TENANT_SIZE } from './geo';
import { C, glow } from './look';
import { D, J, Lightbox, Mono, Rec } from './parts';
import { StreetScene } from './Street';

// The picture on a サイバー timer card: the alley at night (Street, Skia)
// with its words over it in React Native — the tenants' acrylic signs, the
// subject's sign when it's a box or a number plate, 勉強中 under it, and the
// HUD in the corners. Made from the subject's name and color, so a subject
// you made yourself gets its own sign. Paused, the street goes grey, the sign
// goes out and caution tape goes across.

export type ArtState = 'idle' | 'live' | 'paused' | 'held';

export function AlleyArt({ name, short, color, code, no, w, h, state, over, span, rain }: {
  name: string; short?: string; color: string; code: string; no: string; w: number; h: number;
  state: ArtState; over?: boolean;
  /** the plan's time, for the HUD (17:00–18:00) */
  span: string;
  /** the rain falls (the card in the middle) */
  rain?: boolean;
}) {
  const geo = useMemo(() => alleyGeo(w, h, { name, short }), [w, h, name, short]);
  const { L } = geo;
  const hold = state === 'paused';
  const live = state === 'live';
  // the sign is lit unless the session is paused
  const lit = !hold;
  return (
    <View pointerEvents="none" style={{ width: w, height: h, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <StreetScene part="back" geo={geo} color={color} hold={hold} />
      {/* upstairs: other tenants' acrylic signs */}
      {geo.tenants.map((t) => (
        <View key={t.floor} style={{ position: 'absolute', right: geo.tenantRight, top: t.y }}>
          <Mono size={8.5} ls={0} style={{ position: 'absolute', left: -16, top: 0 }}>{t.floor}</Mono>
          <Lightbox text={t.text} size={TENANT_SIZE} off={t.off} dead={t.dead} hold={hold} />
        </View>
      ))}
      {/* the subject's sign, when it isn't tubes: acrylic panels tinted with its color, or its number plate */}
      {!L.plate && !L.tube ? geo.cols.map((c) => (
        <View key={c.text + c.x} style={{ position: 'absolute', left: c.x, top: c.y }}>
          <Lightbox text={c.text} size={L.ls} tint={color} off={!lit} hold={hold} />
        </View>
      )) : null}
      {L.plate ? (
        <View style={{ position: 'absolute', left: geo.sign.x + 10, top: geo.sign.y + 12, width: geo.sign.w - 20, height: geo.sign.h - 24, alignItems: 'center', justifyContent: 'center', gap: 4,
          backgroundColor: '#05070C', boxShadow: lit ? `inset 0px 0px 0px 2px ${color}, 0px 0px 16px ${color}73` : 'inset 0px 0px 0px 2px #2A3540' }}>
          <D size={30} color={lit ? color : '#3A4650'} style={lit ? glow(color, 8) : undefined}>{code}</D>
          <View style={{ backgroundColor: lit ? color : '#2A3540', paddingHorizontal: 6, paddingVertical: 1 }}><D size={14} color="#05070C">{no}</D></View>
        </View>
      ) : null}
      {/* 勉強中, lit in red while you study */}
      <Open right={geo.open.right} top={geo.open.y} vert={geo.open.vert} lit={live} />
      <StreetScene part="front" geo={geo} color={color} hold={hold} rain={rain} />
      {/* the HUD: what's running and the plate, top left; the plate and the plan's time, bottom left; corner marks on the right */}
      <View style={{ position: 'absolute', left: 12, top: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {live ? <Rec label={over ? '延長中' : '計測中'} color={over ? C.o : C.r} /> : hold ? <Rec label="一時停止" on={false} /> : state === 'held' ? <Rec label="記録まち" color={C.y} on={false} /> : null}
        <Mono size={9.5} color={C.c} ls={0.1}>{`${code} ${no}`}</Mono>
      </View>
      <View style={{ position: 'absolute', left: 12, bottom: 10, flexDirection: 'row', alignItems: 'baseline' }}>
        <Mono size={9.5} color={C.t2} ls={0.1}>{`${code} ${no} · `}</Mono>
        <J size={11} w="700" color={C.c} lh={14}>{span}</J>
      </View>
      <Reticle />
      {hold ? <Tape w={w} h={h} /> : null}
    </View>
  );
}

/** 勉強中: a small sign under the big one, standing (vertical) when there's room. */
function Open({ right, top, vert, lit }: { right: number; top: number; vert: boolean; lit: boolean }) {
  const ink = lit ? '#FFC0CC' : '#3A4650';
  return (
    <View style={{ position: 'absolute', right, top, width: vert ? OPEN_W : undefined, paddingVertical: vert ? 3 : 2, paddingHorizontal: vert ? 0 : 8, alignItems: 'center',
      flexDirection: vert ? 'column' : 'row', boxShadow: lit ? `inset 0px 0px 0px 1.5px #FFABBB, 0px 0px 10px ${C.r}` : 'inset 0px 0px 0px 1.5px #2A3540', backgroundColor: 'rgba(4,6,10,0.6)' }}>
      {[...'勉強中'].map((c) => <J key={c} size={12} w="700" color={ink} lh={vert ? 13.5 : 16} style={lit ? glow(C.r, 6) : undefined}>{c}</J>)}
    </View>
  );
}

/** Corner marks on the right, like a camera's frame. */
function Reticle() {
  const bar = { position: 'absolute' as const, backgroundColor: C.c, opacity: 0.8 };
  return (
    <>
      <View style={[bar, { right: 8, top: 8, width: 14, height: 1.5 }]} />
      <View style={[bar, { right: 8, top: 8, width: 1.5, height: 14 }]} />
      <View style={[bar, { right: 8, bottom: 8, width: 14, height: 1.5 }]} />
      <View style={[bar, { right: 8, bottom: 8, width: 1.5, height: 14 }]} />
    </>
  );
}

/** Paused: yellow and black tape across the picture. */
function Tape({ w, h }: { w: number; h: number }) {
  const tw = Math.round(w * 1.24);
  return (
    <View style={{ position: 'absolute', left: -w * 0.12, top: h * 0.44, width: tw, height: 30, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-7deg' }],
      boxShadow: '0px 6px 18px rgba(0,0,0,0.6)' }}>
      <Svg width={tw} height={30} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="tape" width={24} height={24} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Rect x={0} y={0} width={12} height={24} fill={C.y} />
            <Rect x={12} y={0} width={12} height={24} fill="#000" />
          </Pattern>
        </Defs>
        <Polygon points={`0,0 ${tw},0 ${tw},30 0,30`} fill="url(#tape)" />
      </Svg>
      <View style={{ backgroundColor: C.y, paddingHorizontal: 10, paddingTop: 5, paddingBottom: 4 }}>
        <J size={13} w="900" color="#000" lh={15} style={{ letterSpacing: 1.8 }}>一時停止中 · 集中区画</J>
      </View>
    </View>
  );
}
