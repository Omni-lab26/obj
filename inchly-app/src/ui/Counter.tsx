import { useEffect, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';

import { hair, useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { Icon, IconName } from './Icon';
import { Rolling } from './Rolling';

// bencho "rolling counter": a number between a minus and a plus whose digits
// roll like an odometer. Tap to step, hold to speed up, or drag the number
// up/down and fling it.
const DRAG_PX = 16; // finger travel per step
export function Counter({ value, min, max, onChange, unit, label }: { value: number; min: number; max: number; onChange: (v: number) => void; unit?: string; label: string }) {
  const t = useT();
  const v = useRef(value);
  const cb = useRef({ onChange, min, max });
  useEffect(() => { v.current = value; }, [value]);
  useEffect(() => { cb.current = { onChange, min, max }; }, [onChange, min, max]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const step = (d: number) => {
    const { min: lo, max: hi, onChange: set } = cb.current;
    const nv = Math.max(lo, Math.min(hi, v.current + d));
    if (nv === v.current) return false;
    v.current = nv;
    set(nv);
    haptic.tap();
    return true;
  };
  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);
  const hold = (d: number) => {
    stop();
    step(d);
    let n = 0;
    const rep = () => { n++; if (step(d)) timer.current = setTimeout(rep, Math.max(40, 190 - n * 16)); };
    timer.current = setTimeout(rep, 360);
  };

  // Drag on the number: every 16 px is one step; a fling keeps stepping and slows down.
  // The responder is created once; its handlers read refs only when a gesture fires, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    let acc = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { stop(); acc = 0; },
      onPanResponderMove: (_, g) => {
        const want = Math.trunc(-g.dy / DRAG_PX);
        while (acc < want) { acc++; step(1); }
        while (acc > want) { acc--; step(-1); }
      },
      onPanResponderRelease: (_, g) => {
        const vy = -g.vy; // px/ms, up is positive
        if (Math.abs(vy) < 0.35) return;
        const dir = vy > 0 ? 1 : -1;
        let left = Math.min(24, Math.round(Math.abs(vy) * 7));
        let wait = 40;
        const coast = () => { if (left-- <= 0 || !step(dir)) return; wait *= 1.18; timer.current = setTimeout(coast, wait); };
        timer.current = setTimeout(coast, wait);
      },
    });
  });

  const btn = (d: number, icon: IconName, disabled: boolean) => (
    <Press haptics={false} onPressIn={() => !disabled && hold(d)} onPressOut={stop} disabled={disabled} scale={0.92}
      accessibilityLabel={d > 0 ? `${label}を増やす` : `${label}を減らす`}
      style={{ width: 40, height: 46, borderRadius: 11, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={16} color={t.ink} width={2} />
    </Press>
  );
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', padding: 5, borderRadius: 16, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line }}
      accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value, text: `${value}${unit ?? ''}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      {btn(-1, 'minus', value <= min)}
      <View {...pan.panHandlers} style={{ minWidth: 66, height: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <Rolling value={String(value)} size={28} weight="500" />
        {unit ? <Txt size={12.5} tone="ink3" style={{ marginTop: 8 }}>{unit}</Txt> : null}
      </View>
      {btn(1, 'plus', value >= max)}
    </View>
  );
}
