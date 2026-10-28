// School grades from the birth year and month, the Japanese way: the school
// year starts in April, and a child born from April to the next March is in
// one class (born in January–March, 早生まれ, they go with the year before).
// So the grade moves up by itself every April. You can change it: a school
// grade is kept as a shift from the one your birthday gives (it still moves
// up each April), anything else (浪人, 大学生 …) as itself.

/** The school grades in order: 小1 is 0, 高3 is 11. */
export const SCHOOL = ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3', '高1', '高2', '高3'] as const;
/** What you can pick that isn't a school grade (it stays as picked). */
export const OTHER_GRADES = ['浪人', '大学生', '社会人', 'その他'] as const;
export type GradeChoice = (typeof SCHOOL)[number] | (typeof OTHER_GRADES)[number];

/** The school year a day falls in (April to March): 2026 for 2026-04-01 … 2027-03-31. */
export const schoolYear = (now: Date = new Date()) => (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);

/** Your school grade index this year from your birthday (0 = 小1; past 11 you've finished 高校; below 0, not at school yet). */
export function gradeIndex(birthYear: number, birthMonth: number, now: Date = new Date()) {
  // born January–March: in the class of the year before
  const cohort = birthMonth <= 3 ? birthYear - 1 : birthYear;
  return schoolYear(now) - (cohort + 7);
}

/** Your age in full years (the birthday counted from the first of its month). */
export function ageOf(birthYear: number, birthMonth: number, now: Date = new Date()) {
  const had = now.getMonth() + 1 >= birthMonth;
  return now.getFullYear() - birthYear - (had ? 0 : 1);
}

/** A grade index as its name: 小1 … 高3, 既卒 past school, 未就学 before it. */
export const gradeName = (i: number) => (i < 0 ? '未就学' : i >= SCHOOL.length ? '既卒' : SCHOOL[i]);

/** What an account keeps about its grade: nothing (from the birthday), a shift (a school grade picked), or a fixed one (浪人 …). */
export type GradeSetting = { gradeShift?: number; gradeFixed?: string };

/** The grade to show now. */
export function gradeNow(a: { birthYear: number; birthMonth?: number } & GradeSetting, now: Date = new Date()) {
  if (a.gradeFixed) return a.gradeFixed;
  return gradeName(gradeIndex(a.birthYear, a.birthMonth ?? 4, now) + (a.gradeShift ?? 0));
}

/** Picking a grade: a school grade becomes a shift from the birthday's (so it still moves up), anything else is kept as it is. */
export function pickGrade(choice: string, birthYear: number, birthMonth: number, now: Date = new Date()): GradeSetting {
  const i = (SCHOOL as readonly string[]).indexOf(choice);
  if (i < 0) return { gradeFixed: choice };
  const shift = i - gradeIndex(birthYear, birthMonth, now);
  return shift ? { gradeShift: shift } : {};
}
