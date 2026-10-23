import { ReactNode, useMemo } from 'react';

import { arrangeZones, ExtraKind, TIMER, TimerPart, Zone } from '@/screens/layout';
import { useTargetNudge } from '@/screens/model';
import type { TimerKit } from '@/themes/types';
import { STANDARD_PARTS, StandardTimerPage } from './standard';

// The timer, for every theme: the base parts (layout.ts) in three zones, each
// drawn by the theme or, where it draws nothing of its own, the standard way.
export function TimerScreen({ kit = {} }: { kit?: TimerKit }) {
  const zones = useMemo(() => arrangeZones(TIMER, kit.arrange), [kit.arrange]);
  const Page = kit.Page ?? StandardTimerPage;
  const draw = (list: (TimerPart | ExtraKind)[]): ReactNode => list.map((p) => {
    const C = kit.parts?.[p] ?? (p in STANDARD_PARTS ? STANDARD_PARTS[p as TimerPart] : undefined);
    return C ? <C key={p} /> : null;
  });
  const drawn = { head: draw(zones.head), center: draw(zones.center), foot: draw(zones.foot) } satisfies Record<Zone, ReactNode>;
  return (
    <>
      <Page zones={drawn} />
      <TargetNudge />
    </>
  );
}

/** The nudge at the target ticks every second on its own, so the page around it doesn't. */
function TargetNudge() {
  useTargetNudge();
  return null;
}
