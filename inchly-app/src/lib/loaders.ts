// Which loading mark comes up (ui/Loader draws them): one of the nine, a
// different one each time, never the same twice in a row.

export type LoaderKind = 'math' | 'physics' | 'chem' | 'bio' | 'earth' | 'english' | 'japanese' | 'social' | 'info';

const KINDS: LoaderKind[] = ['math', 'physics', 'chem', 'bio', 'earth', 'english', 'japanese', 'social', 'info'];
let last = -1;
/** The mark for the next loading: any of the nine but the one shown last. */
export function nextLoader(): LoaderKind {
  const i = (last + 1 + Math.floor(Math.random() * (KINDS.length - 1))) % KINDS.length;
  last = i;
  return KINDS[i];
}
