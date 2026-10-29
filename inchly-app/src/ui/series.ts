import { useMemo } from 'react';

import { useDesign } from '../design';
import { AREAS, type AreaId, areaTone, FREE, subj, toneOf } from '../data';
import { Parts, regroup } from '../lib/history';
import { useStore } from '../store';

// What a chart colors by: each subject, or subjects added up by 教科. Charts
// read parts through `of`, and draw keys in `list` order with its names, colors
// and 教科 (for the icon beside a name). The colors are fixed (data.ts
// AREA_SHADES): a subject's own, a 教科's its first shade — the same on every
// chart and every day.

export type Series = { key: string; name: string; c: string; area?: AreaId };
export type SeriesSet = { list: Series[]; keyOf: (subjectId: string) => string; of: (p: Parts) => Parts };

/** Each 教科's color: fixed, its first shade (as the theme in use shows it). */
export const areaColors = (): Record<AreaId, string> => Object.fromEntries(AREAS.map((a) => [a.id, areaTone(a.id)])) as Record<AreaId, string>;

export function useSeries(detail: 'subject' | 'area' = 'subject'): SeriesSet {
  const subjects = useStore((s) => s.subjects);
  const theme = useDesign().theme; // the theme decides how the colors show
  return useMemo(() => {
    if (detail === 'area') {
      const keyOf = (id: string) => subj(id).area;
      return { list: AREAS.map((a) => ({ key: a.id, name: a.name, c: areaTone(a.id), area: a.id })), keyOf, of: (p: Parts) => regroup(p, keyOf) };
    }
    // hidden subjects stay in the list so old days keep their colors
    const list = subjects.map((x) => ({ key: x.id, name: x.name, c: toneOf(x), area: x.area }));
    // 自習 recorded without a subject (まとめて記録) keeps its own grey
    const known = (id: string) => id === FREE || subjects.some((x) => x.id === id);
    const keyOf = (id: string) => (known(id) ? id : '?');
    return { list: [...list, { key: FREE, name: '自習', c: '#8C93A0', area: 'other' as const }, { key: '?', name: '削除した科目', c: '#8C93A0', area: 'other' as const }], keyOf, of: (p: Parts) => regroup(p, keyOf) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, subjects, theme]);
}
