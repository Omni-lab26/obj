import type { SkPicture } from '@shopify/react-native-skia';
import { makeMutable } from 'react-native-reanimated';

import { type Backdrop, backdropOf, BACKDROPS, useDesign } from '../../design';
import { feed, POND, type Pond, SEA } from '../../lib/koi';
import type { Crowd } from '../../lib/walkers';

// The 背景 (design.ts Backdrop) is one world — the koi, the sharks or the
// people on the glass floor — run once (BackdropEngine, at the root) and drawn
// into pictures that every page, the side menu and the timer show
// (BackdropView). The same koi everywhere, and the work done once however many
// pages are open: a page only puts a picture on the screen.
//
// Two drawings, made only while someone shows them:
// - soft: behind the frosted pages — each fish a few blurred round shapes,
//   the blur drawn in (no live blur of the screen over it). Cheap: a few
//   hundred numbers a frame.
// - sharp: the mosaic, where the 背景 is looked at (the timer, 眺める, and
//   pages with 背景のぼかし off). Its thousands of cells are the costly part,
//   so it's drawn less often.
// While a finger is on the screen, and while something moves (holdBackdrop),
// the world stands still: nothing is stepped or drawn, so every frame of a
// swipe, a scroll or a sheet is the gesture's. It goes on a moment after.

/** The cell of the koi's and sharks' grid, in points. */
export const CELL = 9;
/** The glass floor's color. */
export const FLOOR = '#F1F1EE';
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
/** The ground of each 背景, under what moves on it (and while it loads). */
export const GROUND: Record<Exclude<Backdrop, 'none'>, string> = { pond: hex(POND), sea: hex(SEA), walk: FLOOR };

/** What the engine drew last: the mosaic (sharp) and the blurred one (soft). */
export const backdropPicture = makeMutable<SkPicture | null>(null);
export const backdropSoft = makeMutable<SkPicture | null>(null);
/** How many views show each drawing now: the engine draws only what someone shows. */
export const sharpUsers = makeMutable(0);
export const softUsers = makeMutable(0);
/** The engine's clock (ms), and until when a finger is moving something (the mosaic waits). */
export const backdropClock = makeMutable(0);
export const backdropHeld = makeMutable(0);
/** A touch, a swipe, a scroll or something moving: the 背景 stands still for `ms` from now (call it again as it goes on). */
export function holdBackdrop(ms = 350) {
  'worklet';
  const until = backdropClock.value + ms;
  if (until > backdropHeld.value) backdropHeld.value = until;
}
/** The soft drawing's blur (points), by 背景のぼかし (設定): off (the pages show the mosaic), light, normal, strong. */
export const SOFT_BLUR = [0, 4, 8, 13] as const;
/** A rectangle (in points) for the koi and the walkers to keep off: the timer's card, while the timer is open. */
export const backdropAvoid = makeMutable<{ x: number; y: number; w: number; h: number } | null>(null);
/** The world: koi or sharks (a pond, in cells), or people (a crowd, in points). */
export type World = { kind: Exclude<Backdrop, 'none'>; w: number; h: number; pond: Pond | null; crowd: Crowd | null };
export const backdropWorld = makeMutable<World | null>(null);
/** On the glass floor, per walker: x, y, how visible, and id + 1 (0: nobody) — for their name tags. */
export const walkerTags = makeMutable<number[]>([]);

/** A tap on the water (in points): a ripple, and food the koi (or sharks) come for. */
export function feedAt(x: number, y: number) {
  'worklet';
  const w = backdropWorld.value;
  if (w?.pond) feed(w.pond, x / CELL, y / CELL);
}

/** The 背景 in use (none with a theme other than standard). */
export function useBackdrop(): Backdrop {
  return backdropOf(useDesign());
}
export const isDarkBackdrop = (b: Backdrop) => BACKDROPS[b].dark;
