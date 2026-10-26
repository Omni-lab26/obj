import { useIsFocused } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';

// A page draws the 背景 only while it's in view: from when it comes into
// focus until a moment after it leaves (so it's still there while the next
// page slides over it), and again while the timer is pulled down off it.
// Out of view it's just its ground color, and costs nothing.

let revealing = false;
const subs = new Set<() => void>();
/** The timer is going down (pulled, or closing): the page under it shows again. */
export function setRevealing(v: boolean) {
  if (v === revealing) return;
  revealing = v;
  subs.forEach((f) => f());
}
const useRevealing = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => revealing, () => revealing);

// the page last in focus: the one under the timer while it's open
let under = 0;
let seq = 0;

/** track: false for the timer's own view (it is never the page under anything). */
export function useInView(track = true) {
  const [id] = useState(() => ++seq);
  const focused = useIsFocused();
  const reveal = useRevealing();
  useEffect(() => { if (focused && track) under = id; }, [focused, track, id]);
  // gone: out of focus for a while (back in focus, it's back at once)
  const [gone, setGone] = useState(!focused);
  const [was, setWas] = useState(focused);
  if (focused !== was) {
    setWas(focused);
    if (focused) setGone(false);
  }
  useEffect(() => {
    if (focused) return;
    const id = setTimeout(() => setGone(true), 700);
    return () => clearTimeout(id);
  }, [focused]);
  return focused || !gone || (reveal && under === id);
}
