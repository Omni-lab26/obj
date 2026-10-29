/// <reference types="jest" />
import { FREE } from '../../../data';
import { canTube, codeOf, normName, signLayout } from '../sign';

// サイバー's signs: how a subject's name becomes the sign in the timer card's alley.
const cols = (name: string, short?: string, room?: number) => {
  const L = signLayout({ name, short }, room);
  return L.plate ? 'plate' : L.cols;
};

describe('names made sign-ready', () => {
  it('reads I/II/III after Japanese as Roman numerals, and full-width letters as ASCII', () => {
    expect(normName('数学IA')).toBe('数学ⅠA');
    expect(normName('数学IIB')).toBe('数学ⅡB');
    expect(normName('数学IAIIB')).toBe('数学ⅠAⅡB');
    expect(normName('ＴＯＥＩＣ')).toBe('TOEIC');
    expect(normName('English I')).toBe('English I');
  });
});

describe('the sign', () => {
  it('stands up to 3 characters in one column, as tubes', () => {
    const L = signLayout({ name: '英語' });
    expect(L).toMatchObject({ cols: ['英語'], tube: true, size: 50 });
  });
  it('splits 4–6 into two columns, read right to left, at a word that ends the name', () => {
    expect(cols('物理基礎')).toEqual(['物理', '基礎']);
    expect(cols('物理基礎2')).toEqual(['物理', '基礎2']);
    expect(cols('英検準2級')).toEqual(['英検', '準2級']);
    expect(cols('政治経済')).toEqual(['政治', '経済']);
  });
  it('never starts a column with a small kana, nor splits a run of numerals', () => {
    expect(cols('リーディング')).toEqual(['リーディ', 'ング']);
    expect(cols('数学IAIIB')).toEqual(['数学', 'ⅠAⅡB']);
    expect(cols('コミュ英')).toEqual(['コミュ英']);
  });
  it('shows a long name by its 略称, the short name schools use, its leading kanji or first word — else the number plate', () => {
    expect(cols('英語コミュニケーションI')).toEqual(['コミュ英']);
    expect(cols('総合的な探究の時間')).toEqual(['総探']);
    expect(cols('プログラミング演習')).toBe('plate');
    expect(cols('プログラミング演習', 'プロ演')).toEqual(['プロ演']);
    expect(cols('IELTS対策')).toEqual(['IELTS']);
    expect(cols('TOEFL iBT対策')).toEqual(['TOEFL']);
  });
  it('is tubes only when every character has strokes and there is room to bend glass; else acrylic', () => {
    expect(signLayout({ name: '英検準2級' })).toMatchObject({ tube: false }); // 級 has no strokes here
    expect(signLayout({ name: '英語' }, 48)).toMatchObject({ tube: false }); // too small for tubes
    expect(canTube('英語', 30)).toBe(true);
    expect(canTube('英語', 20)).toBe(false);
    expect(canTube('123', 16)).toBe(true);
  });
});

describe('number plates', () => {
  it('codes a subject like a line on a station number', () => {
    expect(codeOf({ name: '英語', area: 'en' })).toBe('EN');
    expect(codeOf({ name: '物理基礎', area: 'sci' })).toBe('PH');
    expect(codeOf({ name: '世界史探究', area: 'soc' })).toBe('HI');
    expect(codeOf({ name: '自習', area: 'other', id: FREE })).toBe('FR');
    expect(codeOf({ name: '検定', area: 'other' })).toBe('XX');
  });
});
