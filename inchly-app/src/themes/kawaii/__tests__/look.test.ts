import { THEMES } from '../../../design';
import { candy, pastel, VARIANTS, variantOf } from '../look';

describe('candy', () => {
  it('spans the goal while the day is short of it', () => {
    const { pieces, goalAt } = candy([{ c: '#111111', min: 60 }, { c: '#222222', min: 30 }], 0, '#333333', 180);
    expect(goalAt).toBe(1);
    expect(pieces.map((p) => p.f)).toEqual([60 / 180, 30 / 180]);
  });

  it('puts the session under way last, marked live', () => {
    const { pieces } = candy([{ c: '#111111', min: 60 }], 30, '#333333', 180);
    expect(pieces[1]).toEqual({ c: '#333333', f: 30 / 180, live: true });
  });

  it('spans the whole day once it is past the goal, never more than the bar', () => {
    const { pieces, goalAt } = candy([{ c: '#111111', min: 200 }], 40, '#333333', 180);
    expect(goalAt).toBeCloseTo(180 / 240);
    expect(pieces.reduce((a, p) => a + p.f, 0)).toBeCloseTo(1);
  });

  it('copes with an empty day and no goal', () => {
    expect(candy([], 0, '#333333', 0)).toEqual({ pieces: [], goalAt: 1 });
  });
});

describe('colorways', () => {
  it('has one for every かわいい theme, and falls back for anything else', () => {
    const ids = Object.entries(THEMES).filter(([, d]) => d.family === 'kawaii').map(([id]) => id);
    expect(ids.sort()).toEqual(Object.keys(VARIANTS).sort());
    expect(variantOf('standard')).toBe(VARIANTS.yumekawa);
  });

  it('mixes toward white', () => {
    expect(pastel('#000000', 0)).toBe('#000000');
    expect(pastel('#000000', 1)).toBe('#ffffff');
    expect(pastel('#FF0000', 0.5)).toBe('#ff8080');
  });
});
