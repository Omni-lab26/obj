// Export: your records as CSV, the shape a spreadsheet opens directly.

type Row = { date: string; at: string; s: string; min: number; note?: string; manual?: boolean };

const cell = (v: string | number) => {
  const t = String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** One line per record, oldest first: date, time, subject, minutes, note, added by hand. */
export function recordsCsv(rows: readonly Row[], subjectName: (id: string) => string): string {
  const head = ['日付', '時刻', '科目', '分', 'メモ', '手で追加'];
  const body = [...rows]
    .sort((a, b) => (a.date + a.at.padStart(5, '0')).localeCompare(b.date + b.at.padStart(5, '0')))
    .map((r) => [r.date, r.at, subjectName(r.s), r.min, r.note ?? '', r.manual ? 'はい' : ''].map(cell).join(','));
  return [head.join(','), ...body].join('\n');
}
