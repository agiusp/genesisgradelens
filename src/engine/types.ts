// Platform-neutral grade data. Parsers produce these; the engine and UI consume them.

export type AssignmentStatus =
  | 'graded'
  | 'missing' // counts as 0 of possible
  | 'incomplete' // counts as 0 of possible
  | 'exempt' // ignored
  | 'absent' // ignored
  | 'ungraded' // not graded yet: ignored, but a what-if candidate
  | 'rubric'; // rubric-only, no points shown: ignored

export interface Assignment {
  id: string;
  title: string;
  category: string;
  /** Due date as shown (e.g. "10/19"); display only. */
  due?: string;
  earned: number | null;
  possible: number | null;
  /** Assignment weight multiplier shown as "x0.5"; 1 when not shown. */
  multiplier: number;
  status: AssignmentStatus;
  /** True for what-if assignments the user added. */
  hypothetical?: boolean;
}

export interface CategoryWeight {
  name: string;
  /** Percent, e.g. 40 for "40.0 %". */
  weight: number;
}

export type GradingMethod =
  | { kind: 'weighted'; categories: CategoryWeight[] }
  | { kind: 'points' };
