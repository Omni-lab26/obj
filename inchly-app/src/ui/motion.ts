import { Easing, FadeIn, FadeOut, LinearTransition, ReduceMotion, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

// How things move, everywhere (MOTION.md): the way iOS moves them, and never
// a bounce. Springs only critically damped (dampingRatio 1: they never go
// past where they're going); one curve, iOS's own, for everything timed. The
// lengths below are the only ones: nothing else in the app writes a duration,
// a curve or a spring of its own.
//
// withSpring's duration is perceptual: the spring comes to rest after about
// 1.5× it. The lengths in the comments are the real ones.
// "Reduce Motion" on: Reanimated skips to the end (ReduceMotion.System).

/** iOS's curve for sheets and the keyboard: off quickly, settling without going past. */
export const IOS = Easing.bezier(0.32, 0.72, 0, 1);
const reduceMotion = ReduceMotion.System;

export const M = {
  /** a finger comes down: 0.09s */
  press: { duration: 90, easing: Easing.out(Easing.quad), reduceMotion },
  /** the finger lifts: about 0.3s */
  release: { duration: 200, dampingRatio: 1, reduceMotion },
  /** a switch, a chip picked, a color or an opacity changing: 0.2s */
  micro: { duration: 200, easing: IOS, reduceMotion },
  /** rows and cards making room, a marker sliding to its place, scrolling to a place: about 0.38s */
  move: { duration: 250, dampingRatio: 1, reduceMotion },
  /** a sheet, a dialog or the timer coming up: about 0.5s */
  present: { duration: 330, dampingRatio: 1, reduceMotion },
  /** going away when a finger threw it (keeps the finger's speed): about 0.42s */
  dismiss: { duration: 280, dampingRatio: 1, reduceMotion },
  /** going away from a button: 0.28s */
  leave: { duration: 280, easing: IOS, reduceMotion },
  /** something appearing / disappearing: opacity only */
  fadeIn: 200,
  fadeOut: 160,
} as const;

// The moves, as values to set a shared value to (usable in worklets). `done`
// runs when it ends (on the UI thread: scheduleOnRN for JS). A finger's speed
// (`velocity`) carries on into the spring, and the spring is clamped so a fast
// throw stops at its place instead of going past it.
type Done = (finished?: boolean) => void;
const thrown = (velocity: number) => { 'worklet'; return velocity ? { velocity, overshootClamping: true } : {}; };
export const press = (to: number, done?: Done) => { 'worklet'; return withTiming(to, M.press, done); };
export const release = (to: number, done?: Done) => { 'worklet'; return withSpring(to, M.release, done); };
export const micro = (to: number, done?: Done) => { 'worklet'; return withTiming(to, M.micro, done); };
export const move = (to: number, velocity = 0, done?: Done) => { 'worklet'; return withSpring(to, { ...M.move, ...thrown(velocity) }, done); };
export const present = (to: number, velocity = 0, done?: Done) => { 'worklet'; return withSpring(to, { ...M.present, ...thrown(velocity) }, done); };
/** Away: thrown by a finger (a velocity), a spring keeping its speed; else iOS's curve. */
export const dismiss = (to: number, velocity?: number, done?: Done) => {
  'worklet';
  return velocity ? withSpring(to, { ...M.dismiss, ...thrown(velocity) }, done) : withTiming(to, M.leave, done);
};
/** A fixed length on iOS's curve, for what has to be in step with something else (a sheet's scrim with its sheet). */
export const timed = (to: number, duration: number, done?: Done) => { 'worklet'; return withTiming(to, { duration, easing: IOS, reduceMotion }, done); };

// For entering / exiting / layout: opacity only coming and going; rows making room without a bounce.
export const fadeIn = () => FadeIn.duration(M.fadeIn).easing(IOS).reduceMotion(reduceMotion);
export const fadeOut = () => FadeOut.duration(M.fadeOut).easing(IOS).reduceMotion(reduceMotion);
/**
 * The one motion allowed to repeat (MOTION.md, 例外): the 連続記録 flame's slow
 * sway, 0 → 1 → 0 on a sine, 2.4s each way, for as long as it's lit. Only the
 * flame uses it; with Reduce Motion it stands still.
 */
export const flicker = () => { 'worklet'; return withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin), reduceMotion }), -1, true, undefined, reduceMotion); };
export const layout = () => LinearTransition.springify().duration(M.move.duration).dampingRatio(1).reduceMotion(reduceMotion);
