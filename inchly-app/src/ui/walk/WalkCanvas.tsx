import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedStyle, useFrameCallback, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PEOPLE } from '../../data';
import { crowdUniforms, type Crowd, makeCrowd, MAX_WALKERS, stepCrowd } from '../../lib/walkers';
import { Txt } from '../base';

// The glass floor (lib/walkers), drawn by one shader: a fine halftone screen
// of dots at 45°, darker where someone's shadow falls; a sole on the glass is
// solid ink with a crisp edge, and blurs into dots as it lifts. In 眺める,
// each walker carries a small tag: who they are and what they're studying.

const SKSL = `
uniform float pitch;
uniform float scale;
uniform float3 ink;
uniform float4 bodies[${MAX_WALKERS}];
uniform float4 heads[${MAX_WALKERS}];
uniform float4 feet[${MAX_WALKERS * 2}];

float sole(float2 p, float2 b, float r) {
  float2 q = abs(p) - b + float2(r);
  return length(max(q, float2(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

half4 main(float2 xy) {
  float shade = 0.0;
  for (int i = 0; i < ${MAX_WALKERS}; i++) {
    float4 b = bodies[i];
    float4 h = heads[i];
    float2 d = xy - b.xy;
    // shoulders wider than deep
    float along = dot(d, h.xy) / (b.z * 0.72);
    float across = dot(d, float2(-h.y, h.x)) / (b.z * 1.1);
    shade += b.w * exp(-(along * along + across * across) * 0.9);
  }
  float solid = 0.0;
  for (int i = 0; i < ${MAX_WALKERS * 2}; i++) {
    float4 f = feet[i];
    float2 d = xy - f.xy;
    float c = cos(f.z);
    float s = sin(f.z);
    float2 p = float2(c * d.x + s * d.y, -s * d.x + c * d.y);
    float L = 14.0 * scale;
    float W = 5.6 * scale;
    // a little rounder and wider toward the toe
    float sd = sole(p - float2(1.5 * scale, 0.0), float2(L, W + p.x * 0.05), W * 0.95);
    float lift = f.w;
    float blur = 1.0 + lift * 20.0 * scale;
    shade += (1.0 - smoothstep(-blur, blur, sd)) * (0.95 - lift * 0.55);
    solid = max(solid, (1.0 - smoothstep(-0.7, 0.7, sd)) * (1.0 - smoothstep(0.02, 0.16, lift)));
  }
  shade = clamp(shade, 0.0, 1.0);
  float2 g = float2(xy.x + xy.y, xy.y - xy.x) * 0.70710678 / pitch;
  float2 cell = fract(g) - 0.5;
  // dots grow with the shade and fade out at its rim, so the shadow has no edge
  float r = pow(shade, 0.8) * 0.64;
  float dotv = 1.0 - smoothstep(r - 0.12, r + 0.12, length(cell));
  float a = max(dotv * smoothstep(0.0, 0.05, shade), solid) * 0.88;
  return half4(half3(ink) * a, a);
}
`;

export type FloorProps = { width: number; height: number; avoid?: { x: number; y: number; w: number; h: number } | null; names?: boolean; floor?: string };

export default function WalkCanvas({ width, height, avoid = null, names = false, floor = '#F1F1EE' }: FloorProps) {
  const effect = useMemo(() => Skia.RuntimeEffect.Make(SKSL), []);
  const crowd = useSharedValue<Crowd | null>(null);
  const keep = useSharedValue<Crowd['avoid']>(null);
  useEffect(() => { keep.set(avoid ? { x0: avoid.x, y0: avoid.y, x1: avoid.x + avoid.w, y1: avoid.y + avoid.h } : null); }, [avoid, keep]);
  const empty = () => new Array(MAX_WALKERS * 4).fill(0);
  const uniforms = useSharedValue({ pitch: 3.4, scale: 1, ink: [0.09, 0.09, 0.09], bodies: empty(), heads: empty(), feet: new Array(MAX_WALKERS * 8).fill(0) });
  // the tags: where each walker is (x, y, how visible) and who
  const tags = useSharedValue<number[]>(new Array(MAX_WALKERS * 4).fill(0));
  const [who, setWho] = useState<number[]>([]);

  useFrameCallback((f) => {
    'worklet';
    let c = crowd.value;
    if (!c || c.w !== width || c.h !== height) {
      c = makeCrowd(width, height, 11, width * height > 600 * 900 ? 5 : 4);
      for (let i = 0; i < 90; i++) stepCrowd(c, 1 / 30);
      crowd.value = c;
    }
    c.avoid = keep.value;
    stepCrowd(c, (f.timeSincePreviousFrame ?? 16) / 1000);
    const u = {
      pitch: 3.4, scale: Math.min(1.5, Math.max(0.9, Math.min(width, height) / 393)), ink: [0.09, 0.09, 0.09],
      bodies: new Array(MAX_WALKERS * 4).fill(0), heads: new Array(MAX_WALKERS * 4).fill(0), feet: new Array(MAX_WALKERS * 8).fill(0),
    };
    crowdUniforms(c, u);
    uniforms.value = u;
    const t = new Array(MAX_WALKERS * 4).fill(0);
    for (let i = 0; i < c.walkers.length && i < MAX_WALKERS; i++) {
      const w = c.walkers[i];
      t[i * 4] = w.x; t[i * 4 + 1] = w.y; t[i * 4 + 2] = Math.min(1, w.age / 1.5); t[i * 4 + 3] = w.id + 1;
    }
    tags.value = t;
  });
  // who is on the floor (the tags' words change only when someone comes or goes)
  useAnimatedReaction(() => {
    const ids: number[] = [];
    for (let i = 0; i < MAX_WALKERS; i++) ids.push(tags.value[i * 4 + 3]);
    return ids.join(',');
  }, (now, before) => { if (now !== before) scheduleOnRN(setWho, now.split(',').map(Number)); });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: floor }]}>
      {effect ? (
        <Canvas style={{ width, height }}>
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : null}
      {names ? who.map((id, i) => (id ? <Tag key={`${i}-${id}`} slot={i} id={id - 1} tags={tags} /> : null)) : null}
    </View>
  );
}

/** A walker's tag: a small bracketed label beside them, with who it is and what they're studying. */
function Tag({ slot, id, tags }: { slot: number; id: number; tags: { value: number[] } }) {
  const p = PEOPLE[id % PEOPLE.length];
  const shown = useSharedValue(0);
  useEffect(() => { shown.set(withTiming(1, { duration: 600 })); }, [shown]);
  const a = useAnimatedStyle(() => {
    const x = tags.value[slot * 4], y = tags.value[slot * 4 + 1], o = tags.value[slot * 4 + 2];
    return { opacity: o * shown.value, transform: [{ translateX: x + 34 }, { translateY: y - 46 }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }, a]}>
      <View style={{ width: 8, height: 8, borderLeftWidth: 1, borderTopWidth: 1, borderColor: 'rgba(20,20,20,0.5)' }} />
      <Txt num size={10.5} w="700" color="rgba(20,20,20,0.75)" style={{ letterSpacing: 1.2 }}>{p.n}</Txt>
      <Txt size={10} color="rgba(20,20,20,0.45)">{`${p.s}を勉強中`}</Txt>
    </Animated.View>
  );
}
