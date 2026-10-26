import { useMemo } from 'react';

import { AREAS, subj } from '../data';
import { areaColorsOf, Parts, regroup } from '../lib/history';
import { useStore } from '../store';

// What a chart colors by: each subject, or subjects added up by 教科. Charts
// read parts through `of`, and draw keys in `list` order with its names and colors.

export type Series = { key: string; name: string; c: string };
export type SeriesSet = { list: Series[]; keyOf: (subjectId: string) => string; of: (p: Parts) => Parts };

/** Each 教科's color, from its subjects (see areaColorsOf); a 教科 with no subjects keeps its own. */
export function useAreaColors(): Record<string, string> {
  const subjects = useStore((s) => s.subjects);
  const sessions = useStore((s) => s.sessions);
  return useMemo(() => {
    const mine = areaColorsOf(subjects, sessions);
    return Object.fromEntries(AREAS.map((a) => [a.id, mine[a.id] ?? a.c]));
  }, [subjects, sessions]);
}

export function useSeries(detail: 'subject' | 'area' = 'subject'): SeriesSet {
  const subjects = useStore((s) => s.subjects);
  const areaC = useAreaColors();
  return useMemo(() => {
    if (detail === 'area') {
      // by 教科, each in the color of its most-studied subject, so it follows the colors you set
      const keyOf = (id: string) => subj(id).area;
      return { list: AREAS.map((a) => ({ key: a.id, name: a.name, c: areaC[a.id] })), keyOf, of: (p: Parts) => regroup(p, keyOf) };
    }
    // hidden subjects stay in the list so old days keep their colors
    const list = subjects.map((x) => ({ key: x.id, name: x.name, c: x.c }));
    return { list: [...list, { key: '?', name: '削除した科目', c: '#8C93A0' }], keyOf: (id: string) => (subjects.some((x) => x.id === id) ? id : '?'), of: (p: Parts) => regroup(p, (id) => (subjects.some((x) => x.id === id) ? id : '?')) };
  }, [detail, subjects, areaC]);
}
