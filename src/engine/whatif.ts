import { calculate } from './calculate';
import type { Assignment, GradingMethod } from './types';

/** A saved what-if scenario: scores typed into existing assignments, plus made-up ones. */
export interface Scenario {
  /** assignment id → hypothetical earned points (for ungraded, missing or graded ones). */
  scores: Record<string, number>;
  added: Assignment[];
}

export const emptyScenario = (): Scenario => ({ scores: {}, added: [] });

export function applyScenario(assignments: Assignment[], scenario: Scenario): Assignment[] {
  const withScore = (a: Assignment, hypothetical?: boolean): Assignment => {
    const s = scenario.scores[a.id];
    if (s === undefined || a.possible == null) return hypothetical ? { ...a, hypothetical } : a;
    return { ...a, earned: s, status: 'graded', hypothetical: true };
  };
  // Added assignments may have no score yet ("ungraded") until one is typed in.
  return [...assignments.map((a) => withScore(a)), ...scenario.added.map((a) => withScore(a, true))];
}

export interface MultiplierHint {
  /** Most common multiplier among real (non-what-if) assignments in the category. */
  value: number;
  /** How many of them use it, out of how many. */
  count: number;
  total: number;
  /** Every multiplier seen in the category, most common first. */
  seen: number[];
}

/** What multiplier do this category's existing assignments use? Defaults to ×1 with no data. */
export function typicalMultiplier(assignments: Assignment[], category: string): MultiplierHint {
  const tally = new Map<number, number>();
  let total = 0;
  for (const a of assignments) {
    if (a.hypothetical || a.category !== category) continue;
    const m = a.multiplier || 1;
    tally.set(m, (tally.get(m) ?? 0) + 1);
    total += 1;
  }
  // Most common first; on a tie prefer ×1 (Genesis's default).
  const seen = [...tally].sort((x, y) => y[1] - x[1] || (x[0] === 1 ? -1 : y[0] === 1 ? 1 : x[0] - y[0]));
  if (!seen.length) return { value: 1, count: 0, total: 0, seen: [] };
  return { value: seen[0][0], count: seen[0][1], total, seen: seen.map(([m]) => m) };
}

export interface RangePoint {
  score: number;
  /** Course grade (unrounded percent) if the assignment gets this score. */
  percent: number | null;
  rounded: number | null;
}

/** Course grade for each possible score on one assignment, everything else unchanged. */
export function gradeRange(
  assignments: Assignment[],
  method: GradingMethod,
  assignmentId: string,
  scores: number[],
): RangePoint[] {
  return scores.map((score) => {
    const r = calculate(
      assignments.map((x) => (x.id === assignmentId ? { ...x, earned: score, status: 'graded' as const } : x)),
      method,
    );
    return { score, percent: r.percent, rounded: r.rounded };
  });
}

/** Scores to list for an assignment out of `possible`: every whole point, thinned past 50 rows. */
export function rangeScores(possible: number, maxRows = 50): number[] {
  const top = Math.floor(possible);
  if (top < 1) return [possible];
  const step = Math.max(1, Math.ceil(top / maxRows));
  const out: number[] = [];
  for (let s = top; s >= 1; s -= step) out.push(s);
  if (out[out.length - 1] !== 1) out.push(1);
  if (possible !== top) out.unshift(possible);
  return out;
}

export type NeededScore =
  | { kind: 'score'; earned: number; possible: number }
  | { kind: 'already'; } // target reached even with 0
  | { kind: 'impossible'; best: number | null } // not reachable even with full marks
  | { kind: 'no-effect' }; // assignment doesn't affect the grade

/**
 * Score needed on one assignment to reach a target grade (percent, unrounded).
 * The grade is linear in that assignment's earned points, so two evaluations suffice.
 */
export function neededScore(
  assignments: Assignment[],
  method: GradingMethod,
  assignmentId: string,
  target: number,
): NeededScore {
  const a = assignments.find((x) => x.id === assignmentId);
  if (!a || a.possible == null || a.possible <= 0) return { kind: 'no-effect' };

  const gradeWith = (earned: number) =>
    calculate(
      assignments.map((x) => (x.id === assignmentId ? { ...x, earned, status: 'graded' as const } : x)),
      method,
    ).percent;

  const at0 = gradeWith(0);
  const atFull = gradeWith(a.possible);
  if (at0 == null || atFull == null || Math.abs(atFull - at0) < 1e-9) return { kind: 'no-effect' };
  if (at0 >= target) return { kind: 'already' };
  if (atFull < target) return { kind: 'impossible', best: atFull };

  const earned = ((target - at0) / (atFull - at0)) * a.possible;
  return { kind: 'score', earned, possible: a.possible };
}
