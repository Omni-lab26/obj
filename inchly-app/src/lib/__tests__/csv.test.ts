/// <reference types="jest" />
import { recordsCsv } from '../csv';

describe('recordsCsv', () => {
  it('writes a header and one line per record, oldest first, quoting where needed', () => {
    const csv = recordsCsv(
      [
        { date: '2026-10-21', at: '19:00', s: 'ma', min: 40, note: '例題38,39' },
        { date: '2026-10-21', at: '7:10', s: 'en', min: 60 },
        { date: '2026-10-20', at: '22:05', s: 'ma', min: 33, note: 'say "hi"', manual: true },
      ],
      (id) => ({ en: '英語', ma: '数学' })[id] ?? id,
    );
    expect(csv.split('\n')).toEqual([
      '日付,時刻,科目,分,メモ,手で追加',
      '2026-10-20,22:05,数学,33,"say ""hi""",はい',
      '2026-10-21,7:10,英語,60,,',
      '2026-10-21,19:00,数学,40,"例題38,39",',
    ]);
  });
});
