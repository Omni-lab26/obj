/// <reference types="jest" />
// スタンダード took the site's look; the look it had before stays as クラシック.
import { applyDesign, BGS, CORNERS, DEFAULT_DESIGN, INKS, THEMES, THEMES_SHOWN, themeOf, themeShown, TIMERS, usesPicks } from '../../../design';
import { focus, radius, useT } from '../../../theme';
import { CREATURES, faceOf, greyed, ICONS, STICKERS, stickerRows } from '../art';
import { OWN } from '../../own';
import { mix, S } from '../look';

// useT reads the palette through useSyncExternalStore; outside React, read it as a plain call would.
// theme.ts takes only iOS's curve from ui/motion (Reanimated can't load here).
jest.mock('react', () => ({ ...jest.requireActual('react'), useSyncExternalStore: (_s: unknown, get: () => unknown) => get() }));
jest.mock('../../../ui/motion', () => ({ IOS: null }));

describe('themes', () => {
  it('shows スタンダード, クラシック and サイバー, スタンダード first and the default', () => {
    expect(THEMES_SHOWN).toEqual(['standard', 'classic', 'cyber']);
    expect(themeShown('classic')).toBe(true);
    expect(DEFAULT_DESIGN.theme).toBe('standard');
    expect(THEMES.standard.label).toBe('スタンダード');
    expect(THEMES.classic.label).toBe('クラシック');
  });

  it('draws スタンダード with its own kit, and クラシック with the base renderers', () => {
    expect(OWN.has('standard')).toBe(true);
    expect(OWN.has('cyber')).toBe(true);
    expect(OWN.has('classic')).toBe(false);
  });

  it('keeps the old look for クラシック: your picks, the system face, a shrink when pressed', () => {
    const th = themeOf('classic');
    expect(th.colors).toBeUndefined();
    expect(th.font).toBe('system');
    expect(th.family).toBe('standard');
    expect(usesPicks('classic')).toBe(true);
    expect(usesPicks('standard')).toBe(false);
    const d = { ...DEFAULT_DESIGN, theme: 'classic' as const, bg: 'warm' as const, ink: 'navy' as const, corners: 'l' as const, timer: 'plum' as const };
    applyDesign(d);
    const t = useT();
    expect(t.canvas).toBe(BGS.warm.canvas);
    expect(t.ink).toBe(INKS.navy.ink);
    expect(t.surface).toBe('#FFFFFF');
    expect(t.press).toBe('scale');
    expect(t.texture).toBeNull();
    expect(radius).toEqual({ card: CORNERS.l.card, inner: CORNERS.l.inner });
    expect(focus.bg).toBe(TIMERS.plum.bg);
  });

  it("gives スタンダード the mock's tokens, whatever was picked for クラシック", () => {
    applyDesign({ ...DEFAULT_DESIGN, theme: 'standard', bg: 'warm', ink: 'navy', corners: 's' });
    const t = useT();
    expect(t.canvas).toBe('#F3EEE3');
    expect(t.surface).toBe('#FBF8F1');
    expect(t.ink).toBe('#17121F');
    expect(t.green).toBe('#1FA35B');
    expect(t.grass).toEqual(['#E6E0D2', '#B5EBC8', '#5ED18A', '#1FA35B', '#0F7F3C']);
    expect(t.shadow1).toBe('0px 0px 0px 2px #17121F');
    expect(t.texture).toBe('dots-paper');
    expect(radius.card).toBe(22);
    applyDesign(DEFAULT_DESIGN);
  });
});

describe('pixel art', () => {
  it('draws every creature face in rows of one width, inside its box', () => {
    for (const c of Object.values(CREATURES)) {
      for (const rows of Object.values(c.faces)) {
        expect(new Set(rows.map((r) => r.length)).size).toBe(1);
        expect(rows[0].length).toBeLessThanOrEqual(c.w);
        expect(rows.length).toBeLessThanOrEqual(c.h);
        for (const ch of rows.join('').replace(/\./g, '')) expect(c.pal[ch]).toBeDefined();
      }
    }
    expect(faceOf('tsuru', 'read')).toBe(CREATURES.tsuru.faces.idle);
  });

  it('puts a white rim, an ink outline and a slanted shadow around a sticker', () => {
    // a pixel → its rim (3) → its outline (2) → the shadow (1) a pixel down and right
    expect(stickerRows(['k'])).toEqual(['22222.', '233321', '23k321', '233321', '222221', '.11111']);
    for (const s of Object.values(STICKERS)) expect(new Set(stickerRows(s.rows).map((r) => r.length)).size).toBe(1);
  });

  it('keeps icons on their grid and greys a palette by its lightness', () => {
    for (const rows of Object.values(ICONS)) expect(new Set(rows.map((r) => r.length)).size).toBe(1);
    expect(greyed({ a: '#FFFFFF', b: '#000000', c: 'rgba(0,0,0,0.2)' })).toEqual({ a: '#ffffff', b: '#000000', c: 'rgba(0,0,0,0.2)' });
  });
});

describe('the timer and the moments', () => {
  it("mixes a subject's color into the paper as the mock's color-mix does", () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mix(S.sun, S.card, 1)).toBe(S.sun.toLowerCase());
    // the moment card's well: the accent at 34% on the card
    expect(mix('#FFD23F', '#FBF8F1', 0.34)).toBe('#fcebb4');
  });
  it('has the − the record sheet needs, on its grid', () => {
    expect(ICONS.minus).toHaveLength(7);
    expect(ICONS.minus[3]).toBe('kkkkkkk');
  });
});
