/// <reference types="jest" />
import { pastContents } from '../contents';

describe('past contents', () => {
  const recs = [
    { s: 'ph', what: '相対性理論' }, { s: 'ph', what: '相対性理論' }, { s: 'ph', what: '電磁気' },
    { s: 'ma', what: 'ベクトル' }, { s: 'ma', what: 'ベクトル' }, { s: 'ma', what: 'ベクトル' }, { s: 'ma', what: 'ベクトル' }, { s: 'en' },
  ];
  const plans = [{ s: 'ph', t: '名問の森', note: '相対性理論' }];
  it("offers the subject's own first, then the most written", () => {
    expect(pastContents(recs, plans, 'ph', '')).toEqual(['相対性理論', '電磁気', '名問の森', 'ベクトル']);
    expect(pastContents(recs, plans, null, '')[0]).toBe('ベクトル');
  });
  it('narrows to what contains what is typed, never what is typed exactly', () => {
    expect(pastContents(recs, plans, 'ph', '相対')).toEqual(['相対性理論']);
    expect(pastContents(recs, plans, 'ph', '相対性理論')).toEqual([]);
    expect(pastContents(recs, plans, 'ph', '電', 1)).toEqual(['電磁気']);
  });
});
