// Fetches and assembles everything the UI needs for one student.

import { pageUrl, type District } from '../config/districts';
import type { Assignment, GradingMethod } from '../engine/types';
import { detectPageState, parseHtml, type PageState } from './detect';
import type { PeriodColumn, ReportedGrade, Student } from './model';
import { parseCategoryWeights, parseGradeSummary, parseListAssignments, parseStudents } from './parse';
import type { GenesisTransport } from './transport';

export class GenesisStateError extends Error {
  constructor(public state: Exclude<PageState, { kind: 'ok' }>) {
    super(state.kind);
  }
}

async function getPage(transport: GenesisTransport, url: string): Promise<Document> {
  const page = await transport.get(url);
  const doc = parseHtml(page.html);
  const state = detectPageState(doc, page.url);
  if (state.kind !== 'ok') throw new GenesisStateError(state);
  return doc;
}

export async function loadStudents(transport: GenesisTransport, district: District): Promise<Student[]> {
  const doc = await getPage(transport, pageUrl(district, 'gradeSummary'));
  const students = parseStudents(doc);
  // Single-child accounts may have no selector: use the portal's current student.
  return students.length ? students : [{ id: '', name: 'Student', school: '', selected: true }];
}

export interface CourseData {
  key: string;
  code: string;
  section: string;
  name: string;
  teacher: string;
  term: string;
  period: string;
  periods: PeriodColumn[];
  reported: ReportedGrade | null;
  method: GradingMethod;
  /** Where the method came from: Genesis's weights table, or assumed total points. */
  methodSource: 'genesis-weights' | 'assumed-points';
  assignments: Assignment[];
}

export interface StudentData {
  student: Student;
  period: { label: string; range: string | null };
  courses: CourseData[];
  /** Courses that don't run in the current period (shown collapsed). */
  otherCourses: { name: string; term: string; teacher: string }[];
  loadedAt: number;
}

/** Parse "9/08 to 11/13" into dates in the school year containing `today`. */
export function periodDates(range: string, today: Date): { start: Date; end: Date } | null {
  const m = range.match(/(\d{1,2})\/(\d{1,2})\s*to\s*(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const startYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  const mk = (mo: number, d: number) => new Date(mo >= 7 ? startYear : startYear + 1, mo - 1, d);
  return { start: mk(+m[1], +m[2]), end: mk(+m[3], +m[4]) };
}

/** The marking period containing today, else the most recent one that has started. */
export function currentPeriod(columns: PeriodColumn[], today: Date): { label: string; range: string | null } | null {
  const dated = columns
    .filter((c) => c.range)
    .map((c) => ({ c, d: periodDates(c.range!, today) }))
    .filter((x): x is { c: PeriodColumn; d: { start: Date; end: Date } } => !!x.d);
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const inside = dated.find((x) => x.d.start <= day && day <= x.d.end);
  if (inside) return { label: inside.c.label, range: inside.c.range };
  const started = dated.filter((x) => x.d.start <= day).sort((a, b) => +b.d.start - +a.d.start)[0];
  return started ? { label: started.c.label, range: started.c.range } : null;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export async function loadStudentData(
  transport: GenesisTransport,
  district: District,
  student: Student,
  today = new Date(),
): Promise<StudentData> {
  const studentId = student.id || undefined;
  const summaryDoc = await getPage(transport, pageUrl(district, 'gradeSummary', { studentId }));
  const rows = parseGradeSummary(summaryDoc);

  // The current period is the most common answer across courses (they share MP dates).
  const votes = new Map<string, { label: string; range: string | null; n: number }>();
  for (const r of rows) {
    const p = currentPeriod(r.periods, today);
    if (p) votes.set(p.label, { ...p, n: (votes.get(p.label)?.n ?? 0) + 1 });
  }
  const period = [...votes.values()].sort((a, b) => b.n - a.n)[0] ?? { label: 'MP1', range: null };

  const listDoc = await getPage(
    transport,
    pageUrl(district, 'listAssignments', {
      studentId,
      extra: { dateRange: period.label, courseAndSection: '', status: '' },
    }),
  );
  const listed = parseListAssignments(listDoc);

  const active = rows.filter((r) => r.periods.some((p) => p.label === period.label));
  const other = rows.filter((r) => !active.includes(r));

  // Longest course name first so "Spanish 2 Honors" wins over "Spanish 2".
  const byLength = [...active].sort((a, b) => b.name.length - a.name.length);
  const assignmentsFor = new Map<string, Assignment[]>(active.map((r) => [`${r.code}:${r.section}`, []]));
  for (const a of listed) {
    const course = byLength.find((r) => a.courseText === r.name || a.courseText.startsWith(r.name + ' '));
    if (course) assignmentsFor.get(`${course.code}:${course.section}`)!.push(a);
  }

  const courses = await mapLimit(active, 3, async (r): Promise<CourseData> => {
    const key = `${r.code}:${r.section}`;
    let weights = null;
    try {
      const doc = await getPage(
        transport,
        pageUrl(district, 'courseSummary', {
          studentId,
          extra: { courseCode: r.code, courseSection: r.section, mp: period.label },
        }),
      );
      weights = parseCategoryWeights(doc);
    } catch (err) {
      if (err instanceof GenesisStateError && err.state.kind === 'signed-out') throw err;
    }
    const col = r.periods.find((p) => p.label === period.label);
    return {
      key,
      code: r.code,
      section: r.section,
      name: r.name,
      teacher: r.teacher,
      term: r.term,
      period: period.label,
      periods: r.periods,
      reported: col?.grade ?? null,
      method: weights ? { kind: 'weighted', categories: weights } : { kind: 'points' },
      methodSource: weights ? 'genesis-weights' : 'assumed-points',
      assignments: assignmentsFor.get(key) ?? [],
    };
  });

  return {
    student,
    period: { label: period.label, range: period.range },
    courses,
    otherCourses: other.map((r) => ({ name: r.name, term: r.term, teacher: r.teacher })),
    loadedAt: Date.now(),
  };
}
