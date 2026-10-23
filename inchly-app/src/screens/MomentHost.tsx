import { ComponentType, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Moment, onMoment } from '@/moments';
import { useThemeKit } from '@/themes';

type Shown = { id: number; moment: Moment };
let seq = 0;

/**
 * Plays the theme's show for a moment (src/moments.ts), over everything and
 * untouchable. One at a time: a new moment takes over. A show that never calls
 * done() is cleared after a few seconds anyway.
 */
export function MomentHost() {
  const kit = useThemeKit();
  const [shown, setShown] = useState<Shown | null>(null);
  useEffect(() => onMoment((moment) => setShown({ id: ++seq, moment })), []);
  useEffect(() => {
    if (!shown) return;
    const id = setTimeout(() => setShown((cur) => (cur?.id === shown.id ? null : cur)), 4000);
    return () => clearTimeout(id);
  }, [shown]);
  if (!shown) return null;
  const Show = kit.moments?.[shown.moment.kind] as ComponentType<{ moment: Moment; done: () => void }> | undefined;
  if (!Show) return null;
  const done = () => setShown((cur) => (cur?.id === shown.id ? null : cur));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 90 }]}>
      <Show key={shown.id} moment={shown.moment} done={done} />
    </View>
  );
}
