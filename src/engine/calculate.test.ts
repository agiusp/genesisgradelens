import { describe, expect, it } from 'vitest';
import { calculate, roundGrade } from './calculate';
import { applyScenario, gradeRange, neededScore, rangeScores, typicalMultiplier } from './whatif';
import type { Assignment, AssignmentStatus } from './types';

// Real score patterns from Genesis (titles replaced), with Genesis's reported grades.

let n = 0;
const a = (category: string, earned: number | null, possible: number, extra: Partial<Assignment> = {}): Assignment => ({
  id: `a${++n}`,
  title: `${category} ${n}`,
  category,
  earned,
  possible,
  multiplier: 1,
  status: (earned == null ? 'ungraded' : 'graded') as AssignmentStatus,
  ...extra,
});

describe('weighted courses (verified against Genesis)', () => {
  it('3 categories 40/20/40 → 89.76, Genesis shows 90', () => {
    const list = [
      a('Assessments', 50.5, 59),
      a('Assessments', 20, 20),
      a('Classwork & Homework', 10, 12),
      a('Writing', 16.5, 20),
      a('Writing', 5, 5),
      a('Classwork & Homework', 6, 8),
      a('Assessments', 18, 20),
      a('Classwork & Homework', 29, 30),
      a('Writing', 14.5, 15),
    ];
    const r = calculate(list, {
      kind: 'weighted',
      categories: [
        { name: 'Assessments', weight: 40 },
        { name: 'Classwork & Homework', weight: 20 },
        { name: 'Writing', weight: 40 },
      ],
    });
    expect(r.percent).toBeCloseTo(89.7576, 3);
    expect(r.rounded).toBe(90);
    const byName = Object.fromEntries(r.categories.map((c) => [c.name, c]));
    expect(byName['Assessments'].percent).toBeCloseTo(89.39, 2); // Genesis displays "89.0 %"
    expect(byName['Classwork & Homework'].percent).toBeCloseTo(90, 5);
    expect(byName['Writing'].percent).toBeCloseTo(90, 5);
  });

  it('2 categories 10/90 → 88.92, Genesis shows 89', () => {
    const list = [
      ...[3, 5, 10, 3, 10, 3, 3, 3].map((p) => a('Homework', p, p)),
      a('Assessments', 45.5, 50),
      a('Assessments', 9, 10),
      a('Assessments', 82.93, 100),
      a('Assessments', 42, 50),
      a('Assessments', 93, 100),
      a('Assessments', 43.24, 50),
    ];
    const r = calculate(list, {
      kind: 'weighted',
      categories: [
        { name: 'Homework', weight: 10 },
        { name: 'Assessments', weight: 90 },
      ],
    });
    expect(r.percent).toBeCloseTo(88.9175, 3);
    expect(r.rounded).toBe(89);
  });

  it('leaves out empty categories and rescales the rest', () => {
    const r = calculate([a('Tests', 8, 10)], {
      kind: 'weighted',
      categories: [
        { name: 'Tests', weight: 60 },
        { name: 'Homework', weight: 40 },
      ],
    });
    expect(r.percent).toBeCloseTo(80, 5);
    expect(r.categories.find((c) => c.name === 'Homework')?.effectiveWeight).toBe(0);
  });
});

describe('total-points courses (verified against Genesis)', () => {
  it('179 / 199 → 89.95, Genesis shows 90', () => {
    const list = [
      ...Array.from({ length: 27 }, () => a('Homework', 2, 2)),
      a('Classwork', 5, 5),
      a('Classwork', 10, 10),
      a('Tests', 81.5, 100),
      a('Quizzes', 28.5, 30),
    ];
    const r = calculate(list, { kind: 'points' });
    expect(r.percent).toBeCloseTo(89.95, 2);
    expect(r.rounded).toBe(90);
  });

  it('extra credit above 100%: 389 / 385 → 101', () => {
    const list = [
      ...[50, 50, 52, 52, 50].map((e) => a('Tests', e, 50)),
      ...Array.from({ length: 6 }, () => a('Homework', 10, 10)),
      ...Array.from({ length: 3 }, () => a('Homework', 15, 15)),
      a('Quizzes', 30, 30),
    ];
    const r = calculate(list, { kind: 'points' });
    expect(r.percent).toBeCloseTo(101.04, 2);
    expect(r.rounded).toBe(101);
  });
});

describe('statuses and multipliers', () => {
  it('missing counts as zero; exempt, absent, ungraded and rubric are ignored', () => {
    const r = calculate(
      [
        a('X', 9, 10),
        a('X', null, 10, { status: 'missing' }),
        a('X', null, 50, { status: 'exempt' }),
        a('X', null, 50, { status: 'absent' }),
        a('X', null, 50),
        a('X', null, 50, { status: 'rubric' }),
      ],
      { kind: 'points' },
    );
    expect(r.percent).toBeCloseTo(45, 5);
  });

  it('applies the assignment weight multiplier to earned and possible', () => {
    const r = calculate([a('Labs', 40.5, 50, { multiplier: 0.5 }), a('Labs', 10, 10)], { kind: 'points' });
    expect(r.percent).toBeCloseTo(((20.25 + 10) / 35) * 100, 5);
  });

  it('returns null when nothing counts yet', () => {
    expect(calculate([a('X', null, 10)], { kind: 'points' }).percent).toBeNull();
  });

  it('rounds half up like Genesis', () => {
    expect(roundGrade(89.5)).toBe(90);
    expect(roundGrade(89.49)).toBe(89);
  });
});

describe('what-if', () => {
  const method = { kind: 'weighted' as const, categories: [{ name: 'Tests', weight: 50 }, { name: 'HW', weight: 50 }] };
  const list = [a('Tests', 80, 100), a('HW', 10, 10), { ...a('Tests', null, 100), id: 'next' }];

  it('applies hypothetical scores', () => {
    const r = calculate(applyScenario(list, { scores: { next: 100 }, added: [] }), method);
    expect(r.percent).toBeCloseTo(95, 5); // Tests 180/200 = 90 → 0.5*90 + 0.5*100
  });

  it('solves for the score needed', () => {
    const need = neededScore(list, method, 'next', 93);
    expect(need.kind).toBe('score');
    if (need.kind === 'score') expect(need.earned).toBeCloseTo(92, 5); // Tests (80+x)/200 = 86%
  });

  it('lists the course grade for every score on an upcoming assignment', () => {
    // A 30-point lab added with no score yet, in a 50/50 weighted course.
    const lab: Assignment = { ...a('Tests', null, 30), id: 'lab', hypothetical: true };
    const list = applyScenario([a('Tests', 80, 100), a('HW', 10, 10)], { scores: {}, added: [lab] });
    const range = gradeRange(list, method, 'lab', rangeScores(30));
    expect(range).toHaveLength(30);
    expect(range[0]).toMatchObject({ score: 30 }); // highest first
    expect(range[0].percent).toBeCloseTo(50 * (110 / 130) + 50, 5);
    expect(range[29]).toMatchObject({ score: 1 });
    expect(range[29].percent).toBeCloseTo(50 * (81 / 130) + 50, 5);
  });

  it('applies typed scores to added assignments', () => {
    const lab: Assignment = { ...a('Tests', null, 30), id: 'lab2' };
    const out = applyScenario([], { scores: { lab2: 27 }, added: [lab] });
    expect(out[0]).toMatchObject({ earned: 27, status: 'graded', hypothetical: true });
  });

  it('suggests the multiplier other assignments in the category use', () => {
    const labs = [
      a('Labs', 40, 50, { multiplier: 0.5 }),
      a('Labs', 45, 50, { multiplier: 0.5 }),
      a('Labs', 9, 10),
      a('Tests', 90, 100),
    ];
    expect(typicalMultiplier(labs, 'Labs')).toEqual({ value: 0.5, count: 2, total: 3, seen: [0.5, 1] });
    expect(typicalMultiplier(labs, 'Tests')).toEqual({ value: 1, count: 1, total: 1, seen: [1] });
    expect(typicalMultiplier(labs, 'Homework')).toEqual({ value: 1, count: 0, total: 0, seen: [] });
  });

  it('a ×0.5 lab moves the grade half as much', () => {
    const base = [a('Labs', 40, 50)];
    const full: Assignment = { ...a('Labs', null, 30), id: 'f' };
    const half: Assignment = { ...a('Labs', null, 30, { multiplier: 0.5 }), id: 'h' };
    const [f] = gradeRange([...base, full], { kind: 'points' }, 'f', [0]);
    const [h] = gradeRange([...base, half], { kind: 'points' }, 'h', [0]);
    expect(f.percent).toBeCloseTo((40 / 80) * 100, 5);
    expect(h.percent).toBeCloseTo((40 / 65) * 100, 5);
  });

  it('thins long ranges but always keeps full marks and 1', () => {
    const s = rangeScores(200);
    expect(s[0]).toBe(200);
    expect(s[s.length - 1]).toBe(1);
    expect(s.length).toBeLessThanOrEqual(51);
  });

  it('reports impossible targets with the best reachable grade', () => {
    const need = neededScore(list, method, 'next', 99);
    expect(need).toEqual({ kind: 'impossible', best: 95 });
  });
});
