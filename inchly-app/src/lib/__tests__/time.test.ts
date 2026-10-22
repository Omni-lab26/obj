/// <reference types="jest" />
import { addDays, ageThisYear, dateKey, daysBetween, daysUntil, parseKey, streak } from '../time';

// Months are 0-based in Date: new Date(2026, 9, 21) is 21 October 2026.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe('dateKey', () => {
  it('writes the local calendar date', () => {
    expect(dateKey(at(2026, 10, 21))).toBe('2026-10-21');
    expect(dateKey(at(2026, 1, 5, 0))).toBe('2026-01-05');
  });
  it('a minute before and after midnight are different days', () => {
    expect(dateKey(new Date(2026, 9, 21, 23, 59))).toBe('2026-10-21');
    expect(dateKey(new Date(2026, 9, 22, 0, 1))).toBe('2026-10-22');
  });
  it('round-trips through parseKey', () => {
    expect(dateKey(parseKey('2027-02-28'))).toBe('2027-02-28');
  });
});

describe('addDays / daysBetween', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29'); // leap year
  });
  it('counts whole days either way', () => {
    expect(daysBetween('2026-10-21', '2026-11-08')).toBe(18);
    expect(daysBetween('2026-11-08', '2026-10-21')).toBe(-18);
    expect(daysBetween('2026-10-21', '2026-10-21')).toBe(0);
  });
});

describe('daysUntil', () => {
  it('counts to a date later this year', () => {
    expect(daysUntil(11, 8, at(2026, 10, 21))).toBe(18);
  });
  it('a date already gone this year means next year', () => {
    expect(daysUntil(1, 16, at(2026, 10, 21))).toBe(87);
  });
  it('today is 0', () => {
    expect(daysUntil(10, 21, at(2026, 10, 21))).toBe(0);
  });
});

describe('ageThisYear', () => {
  it('is the year difference', () => {
    expect(ageThisYear(2008, at(2026, 10, 21))).toBe(18);
    expect(ageThisYear(2014, at(2026, 1, 1))).toBe(12);
  });
});

describe('streak', () => {
  const now = at(2026, 10, 21);
  const days = (...ks: string[]) => new Set(ks);
  it('counts back from today', () => {
    expect(streak(days('2026-10-21', '2026-10-20', '2026-10-19'), days(), now)).toBe(3);
  });
  it('today still open: the run up to yesterday stands', () => {
    expect(streak(days('2026-10-20', '2026-10-19'), days(), now)).toBe(2);
  });
  it('a missed day ends it', () => {
    expect(streak(days('2026-10-21', '2026-10-19'), days(), now)).toBe(1);
  });
  it('a rest ticket bridges a day without counting it', () => {
    expect(streak(days('2026-10-21', '2026-10-19'), days('2026-10-20'), now)).toBe(2);
  });
  it('nothing recorded is 0', () => {
    expect(streak(days(), days(), now)).toBe(0);
  });
});
