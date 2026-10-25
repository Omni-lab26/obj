import { ReactNode, useEffect, useMemo } from 'react';

import { arrangeZones, ExtraKind, TIMER, TimerPart, Zone } from '@/screens/layout';
import { useTargetNudge } from '@/screens/model';
import type { TimerKit } from '@/themes/types';
import { showStudyBar } from '@/ui/Chrome';
import { STANDARD_PARTS, STANDARD_ZONES, StandardTimerPage } from './standard';

// The timer, for every theme: the base parts (layout.ts) in three zones, each
// drawn by the theme or, where it draws nothing of its own, the standard way.
// With no theme timer at all, the standard drawing places the parts its own way.
const STANDARD: TimerKit = { arrange: STANDARD_ZONES };
export function TimerScreen({ kit = STANDARD }: { kit?: TimerKit }) {
  const zones = useMemo(() => arrangeZones(TIMER, kit.arrange), [kit.arrange]);
  // a study bar swiped away comes back once you've looked at the timer
  useEffect(() => { showStudyBar(); }, []);
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
