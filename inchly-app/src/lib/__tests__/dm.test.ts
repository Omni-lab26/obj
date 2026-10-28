/// <reference types="jest" />
// One-to-one messages: sending starts or continues a conversation and brings it to the top; reading clears the unread count.
import { demoState, getState, INITIAL, readDm, sendDm, setState, unreadIn } from '../../store';

const reset = (patch = {}) => setState({ ...INITIAL, ...patch });

describe('one-to-one messages', () => {
  it('starts a conversation with the first message', () => {
    reset();
    sendDm('mio', '#C47A55', { t: 'おはよう' });
    const d = getState().dms;
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ n: 'mio', c: '#C47A55' });
    expect(d[0].msgs[0]).toMatchObject({ me: true, t: 'おはよう' });
  });
  it('puts the conversation you just wrote in at the top', () => {
    reset();
    sendDm('mio', '#C47A55', { t: 'a' });
    sendDm('そら', '#5D6DB8', { t: 'b' });
    sendDm('mio', '#C47A55', { stamp: 'ganbaro' });
    expect(getState().dms.map((x) => x.n)).toEqual(['mio', 'そら']);
    expect(getState().dms[0].msgs.map((m) => m.t ?? m.stamp)).toEqual(['a', 'ganbaro']);
  });
  it('counts their messages after you last looked, and reading clears them', () => {
    reset({ dms: demoState(new Date(2026, 9, 28, 19, 20)).dms });
    const mio = getState().dms.find((x) => x.n === 'mio')!;
    expect(unreadIn(mio)).toBe(1);
    readDm('mio');
    expect(unreadIn(getState().dms.find((x) => x.n === 'mio')!)).toBe(0);
  });
  it('a new save without messages starts with none', () => {
    expect(INITIAL.dms).toEqual([]);
  });
});

describe('accounts saved with a grade name', () => {
  it('keep their grade, now moving up each April', () => {
    const { migrate } = jest.requireActual('../../store') as typeof import('../../store');
    const out = migrate({ v: 3, account: { name: 'a', handle: 'a', grade: '高2', birthYear: 2008, aim: '', via: 'mail' } }, new Date(2026, 9, 28));
    expect(out.account).toMatchObject({ birthMonth: 4, gradeShift: -1 });
    expect(out.account).not.toHaveProperty('grade');
  });
});

describe('deleting a subject', () => {
  const { deleteSubject, getState: get, INITIAL: init, setState: set } = jest.requireActual('../../store') as typeof import('../../store');
  it('goes at once when nothing uses it', () => {
    set({ ...init, subjects: [...init.subjects, { id: 'x1', name: '漢文', area: 'ja', c: '#000' }] });
    expect(deleteSubject('x1')).toBe('removed');
    expect(get().subjects.some((x) => x.id === 'x1')).toBe(false);
  });
  it('with records, only together with them', () => {
    set({ ...init, subjects: [...init.subjects, { id: 'x2', name: '漢文', area: 'ja', c: '#000' }], sessions: [{ id: 's', s: 'x2', min: 10, date: '2026-10-28', at: '9:00' }] });
    expect(deleteSubject('x2')).toBe('used');
    expect(get().subjects.some((x) => x.id === 'x2')).toBe(true);
    expect(deleteSubject('x2', true)).toBe('removed');
    expect(get().sessions).toHaveLength(0);
  });
});
