import { useEffect, useSyncExternalStore } from 'react';
import { EasingFunction, EasingFunctionFactory, SharedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { IOS } from './motion';

// Charts play an entrance — bars grow, lines draw, grass fills in — when they
// first appear (the app opening) and again whenever their page comes back into
// view (the tab bar says so with replayCharts). Never past where they land, on
// iOS's curve (ui/motion).

let tick = 0;
const subs = new Set<() => void>();
const on = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** A page has come into view: its charts play their entrance again. */
export function replayCharts() {
  tick += 1;
  subs.forEach((f) => f());
}
/** Changes each time charts should replay (use it as an effect's dependency). */
export function useReplay() {
  return useSyncExternalStore(on, () => tick, () => tick);
}

/** 0 → 1, eased (or at an even pace, for a wave): on mount and each time the page comes back. */
export function useAppear(delay = 120, duration = 500, easing: EasingFunction | EasingFunctionFactory = IOS): SharedValue<number> {
  const p = useSharedValue(0);
  const n = useReplay();
  useEffect(() => {
    p.set(0);
    p.set(withDelay(delay, withTiming(1, { duration, easing })));
  }, [n, p, delay, duration, easing]);
  return p;
}

/** Where a column (i of n) is in a left-to-right cascade at progress p: 0 hidden → 1 shown. */
export function cascade(p: number, i: number, n: number, spread = 0.6) {
  'worklet';
  const start = (i / Math.max(1, n - 1)) * spread;
  return Math.max(0, Math.min(1, (p - start) / (1 - spread)));
}
