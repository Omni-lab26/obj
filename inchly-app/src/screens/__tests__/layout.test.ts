import { arrange, arrangeZones, Block, HOME, TIMER } from '../layout';

const kinds = (bs: Block[]) => bs.flatMap((b) => b.sections);

describe('arrange', () => {
  it('keeps the base when a theme has no arrangement', () => {
    expect(arrange(HOME)).toBe(HOME);
  });

  it('follows the theme’s order, groups and rows', () => {
    const out = arrange(HOME, () => [
      { id: 'top', sections: ['streak', 'todos'], row: true },
      { id: 'today', sections: ['today', 'chart', 'now'] },
      { id: 'deadlines', sections: ['deadlines'] },
      { id: 'peers', sections: ['peers'] },
    ]);
    expect(out[0]).toEqual({ id: 'top', sections: ['streak', 'todos'], row: true });
    expect(kinds(out)).toEqual(['streak', 'todos', 'today', 'chart', 'now', 'deadlines', 'peers']);
  });

  it('never loses a base section the theme leaves out: it comes after the block before it in the base', () => {
    const out = arrange(HOME, () => [{ id: 'today', sections: ['today', 'now'] }, { id: 'peers', sections: ['peers'] }]);
    expect(kinds(out).sort()).toEqual(kinds(HOME).sort());
    // chart lands right after the rest of its base block
    expect(out[1]).toEqual({ id: 'today+', sections: ['chart'], row: undefined });
    // streak, todos and deadlines follow in base order, before peers
    expect(kinds(out)).toEqual(['today', 'now', 'chart', 'streak', 'todos', 'deadlines', 'peers']);
  });

  it('drops sections the base no longer has, keeps the theme’s own, and draws nothing twice', () => {
    const out = arrange(HOME, (base) => [
      { id: 'mine', sections: ['x:ticker', 'gone' as never, 'today'] },
      { id: 'again', sections: ['today'] },
      ...base.slice(1),
    ]);
    expect(out[0].sections).toEqual(['x:ticker', 'today']);
    expect(out.find((b) => b.id === 'again')).toBeUndefined();
    expect(kinds(out).filter((k) => k === 'today')).toHaveLength(1);
    expect(kinds(out)).toContain('chart');
  });
});

describe('arrangeZones', () => {
  it('keeps the base when a theme has no arrangement', () => {
    expect(arrangeZones(TIMER)).toBe(TIMER);
  });

  it('moves parts between zones and keeps the ones left out in their base zone', () => {
    const out = arrangeZones(TIMER, () => ({ head: ['top', 'x:pal'], center: ['subject', 'readout'], foot: ['main', 'record'] }));
    // the switcher stays in the head, after the part before it that's still there
    expect(out.head).toEqual(['top', 'switcher', 'x:pal']);
    expect(out.center).toEqual(['subject', 'readout', 'progress', 'today']);
    expect(out.foot).toEqual(['main', 'record']);
    const all = [...out.head, ...out.center, ...out.foot];
    expect(new Set(all).size).toBe(all.length);
  });
});
