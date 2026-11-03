// What the parsers extract from Genesis pages. See docs/genesis-pages.md.

import type { Assignment, CategoryWeight } from '../engine/types';

export interface Student {
  id: string;
  name: string;
  school: string;
  selected: boolean;
}

export interface ReportedGrade {
  /** As shown, e.g. 90 */
  value: number;
  /** As shown, e.g. "A-" */
  letter: string | null;
}

export interface PeriodColumn {
  /** e.g. "MP1", "FG" */
  label: string;
  /** e.g. "9/08 to 11/13"; absent for FG */
  range: string | null;
  grade: ReportedGrade | null;
}

export interface CourseSummaryRow {
  code: string;
  section: string;
  /** Period code Genesis links the course summary to (e.g. "MP1"). */
  linkPeriod: string;
  name: string;
  teacher: string;
  /** "FY", "S1", "S2", "Q4", … */
  term: string;
  periods: PeriodColumn[];
}

export interface ListedAssignment extends Assignment {
  courseText: string;
}

export type { Assignment, CategoryWeight };
