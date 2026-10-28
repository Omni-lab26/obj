/// <reference types="jest" />
import { ageOf, gradeIndex, gradeNow, pickGrade, schoolYear } from '../grade';

describe('grades from the birthday', () => {
  const oct2026 = new Date(2026, 9, 28);
  it('the school year starts in April', () => {
    expect(schoolYear(new Date(2026, 2, 31))).toBe(2025);
    expect(schoolYear(new Date(2026, 3, 1))).toBe(2026);
  });
  it('born May 2008 is 高3 in the 2026 school year', () => {
    expect(gradeNow({ birthYear: 2008, birthMonth: 5 }, oct2026)).toBe('高3');
  });
  it('born February 2009 (早生まれ) is in the same class as May 2008', () => {
    expect(gradeNow({ birthYear: 2009, birthMonth: 2 }, oct2026)).toBe('高3');
    expect(gradeNow({ birthYear: 2009, birthMonth: 4 }, oct2026)).toBe('高2');
  });
  it('an elementary schooler: born June 2018 is 小2', () => {
    expect(gradeNow({ birthYear: 2018, birthMonth: 6 }, oct2026)).toBe('小2');
  });
  it('moves up by itself in April', () => {
    const a = { birthYear: 2011, birthMonth: 9 };
    expect(gradeNow(a, new Date(2027, 2, 31))).toBe('中3');
    expect(gradeNow(a, new Date(2027, 3, 1))).toBe('高1');
  });
  it('past 高3 is 既卒', () => {
    expect(gradeNow({ birthYear: 2000, birthMonth: 7 }, oct2026)).toBe('既卒');
  });
  it('a school grade picked by hand keeps moving up', () => {
    const set = pickGrade('高2', 2008, 5, oct2026); // a year behind 高3
    expect(set).toEqual({ gradeShift: -1 });
    expect(gradeNow({ birthYear: 2008, birthMonth: 5, ...set }, new Date(2027, 4, 1))).toBe('高3');
  });
  it('浪人 and the like stay as picked', () => {
    const set = pickGrade('浪人', 2007, 5, oct2026);
    expect(gradeNow({ birthYear: 2007, birthMonth: 5, ...set }, new Date(2028, 4, 1))).toBe('浪人');
  });
  it('picking the grade the birthday gives keeps nothing extra', () => {
    expect(pickGrade('高3', 2008, 5, oct2026)).toEqual({});
    expect(gradeIndex(2008, 5, oct2026)).toBe(11);
  });
  it('age counts the birthday month', () => {
    expect(ageOf(2013, 10, oct2026)).toBe(13);
    expect(ageOf(2013, 11, oct2026)).toBe(12);
  });
});
