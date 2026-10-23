import { useMemo } from 'react';

import { AREAS, subj } from '../data';
import { Parts, regroup } from '../lib/history';
import { useStore } from '../store';

// What a chart colors by: each subject, or subjects added up by 教科. Charts
// read parts through `of`, and draw keys in `list` order with its names and colors.

export type Series = { key: string; name: string; c: string };
export type SeriesSet = { list: Series[]; keyOf: (subjectId: string) => string; of: (p: Parts) => Parts };

export function useSeries(detail: 'subject' | 'area' = 'subject'): SeriesSet {
  const subjects = useStore((s) => s.subjects);
  return useMemo(() => {
    if (detail === 'area') {
      const keyOf = (id: string) => subj(id).area;
      return { list: AREAS.map((a) => ({ key: a.id, name: a.name, c: a.c })), keyOf, of: (p: Parts) => regroup(p, keyOf) };
    }
    // hidden subjects stay in the list so old days keep their colors
    const list = subjects.map((x) => ({ key: x.id, name: x.name, c: x.c }));
    return { list: [...list, { key: '?', name: '削除した科目', c: '#8C93A0' }], keyOf: (id: string) => (subjects.some((x) => x.id === id) ? id : '?'), of: (p: Parts) => regroup(p, (id) => (subjects.some((x) => x.id === id) ? id : '?')) };
  }, [detail, subjects]);
}
