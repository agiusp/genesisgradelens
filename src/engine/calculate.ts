import type { Assignment, GradingMethod } from './types';

export interface CategoryResult {
  name: string;
  /** Configured weight in percent (weighted courses only). */
  weight: number | null;
  /** Weight actually applied after rescaling for empty categories (percent). */
  effectiveWeight: number | null;
  earned: number;
  possible: number;
  /** Category average in percent, or null when nothing in it counts yet. */
  percent: number | null;
  /** Percentage points this category adds to the final grade. */
  contribution: number | null;
  count: number;
}

export interface GradeResult {
  /** Unrounded grade in percent, or null when nothing counts yet. */
  percent: number | null;
  /** Whole-number grade as Genesis displays it. */
  rounded: number | null;
  categories: CategoryResult[];
}

/** Does this assignment count toward the grade, and with what points? */
export function countedPoints(a: Assignment): { earned: number; possible: number } | null {
  const m = a.multiplier || 1;
  switch (a.status) {
    case 'graded':
      if (a.earned == null || a.possible == null) return null;
      return { earned: a.earned * m, possible: a.possible * m };
    case 'missing':
    case 'incomplete':
      if (a.possible == null) return null;
      return { earned: 0, possible: a.possible * m };
    default:
      return null;
  }
}

/** Genesis shows whole-number grades, rounded half up. */
export function roundGrade(percent: number): number {
  return Math.floor(percent + 0.5 + 1e-9);
}

export function calculate(assignments: Assignment[], method: GradingMethod): GradeResult {
  // Sum points per category, in order of first appearance.
  const sums = new Map<string, { earned: number; possible: number; count: number }>();
  if (method.kind === 'weighted') {
    for (const c of method.categories) sums.set(c.name, { earned: 0, possible: 0, count: 0 });
  }
  for (const a of assignments) {
    const pts = countedPoints(a);
    if (!pts) continue;
    const s = sums.get(a.category) ?? { earned: 0, possible: 0, count: 0 };
    s.earned += pts.earned;
    s.possible += pts.possible;
    s.count += 1;
    sums.set(a.category, s);
  }

  const pct = (s: { earned: number; possible: number }) => (s.possible > 0 ? (s.earned / s.possible) * 100 : null);

  if (method.kind === 'points') {
    let earned = 0;
    let possible = 0;
    for (const s of sums.values()) {
      earned += s.earned;
      possible += s.possible;
    }
    const percent = possible > 0 ? (earned / possible) * 100 : null;
    const categories: CategoryResult[] = [...sums].map(([name, s]) => ({
      name,
      weight: null,
      effectiveWeight: null,
      ...s,
      percent: pct(s),
      // In a points course a category's share is its points over all points.
      contribution: possible > 0 ? (s.earned / possible) * 100 : null,
    }));
    return { percent, rounded: percent == null ? null : roundGrade(percent), categories };
  }

  // Weighted: categories with no counted work are left out and the rest rescaled.
  const weights = new Map(method.categories.map((c) => [c.name, c.weight]));
  const active = [...sums].filter(([name, s]) => s.possible > 0 && (weights.get(name) ?? 0) > 0);
  const activeWeight = active.reduce((t, [name]) => t + (weights.get(name) ?? 0), 0);

  let percent: number | null = null;
  if (activeWeight > 0) {
    percent = active.reduce((t, [name, s]) => t + (weights.get(name)! / activeWeight) * pct(s)!, 0);
  }

  const categories: CategoryResult[] = [...sums].map(([name, s]) => {
    const weight = weights.get(name) ?? null;
    const isActive = s.possible > 0 && (weight ?? 0) > 0 && activeWeight > 0;
    const effectiveWeight = isActive ? (weight! / activeWeight) * 100 : weight == null ? null : 0;
    const p = pct(s);
    return {
      name,
      weight,
      effectiveWeight,
      ...s,
      percent: p,
      contribution: isActive && p != null ? (effectiveWeight! / 100) * p : null,
    };
  });

  return { percent, rounded: percent == null ? null : roundGrade(percent), categories };
}
