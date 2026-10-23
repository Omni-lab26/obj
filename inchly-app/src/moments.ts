// The moments the app makes something of: a session starting, a ToDo done,
// the target reached, a session recorded (and a level gained). The store and
// the screens say when one happens; the theme app decides how it looks
// (src/themes: kit.moments) — a pal that cheers, a stamp, a splash of ink.
// What happened is always said in a toast as well, so a theme's show is extra,
// never the only way to know. (No React Native imports, so the store can call it.)

export type Moment =
  | { kind: 'start'; subject: string }
  | { kind: 'todo'; exp: number; all: boolean }
  | { kind: 'target'; min: number }
  | { kind: 'record'; subject: string; min: number; exp: number; level: number | null; ticket: boolean };
export type MomentKind = Moment['kind'];

const listeners = new Set<(m: Moment) => void>();
// A moment said before anything listens (the app opening straight onto the
// timer past its target) waits a little for the first listener.
let waiting: { m: Moment; at: number } | null = null;
export const onMoment = (l: (m: Moment) => void) => {
  listeners.add(l);
  if (waiting && Date.now() - waiting.at < 2000) l(waiting.m);
  waiting = null;
  return () => { listeners.delete(l); };
};
export function celebrate(m: Moment) {
  if (!listeners.size) { waiting = { m, at: Date.now() }; return; }
  listeners.forEach((l) => l(m));
}
