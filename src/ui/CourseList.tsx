import { letterFor, type District } from '../config/districts';
import { calculate } from '../engine/calculate';
import type { CourseData, StudentData } from '../genesis/load';
import { fmtPct } from './format';

export function seenLetters(courses: CourseData[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const c of courses) for (const p of c.periods) if (p.grade?.letter) m.set(Math.round(p.grade.value), p.grade.letter);
  return m;
}

export function Agreement({ course, calc }: { course: CourseData; calc: number | null }) {
  if (calc == null || !course.reported) return null;
  const diff = calc - course.reported.value;
  return diff === 0 ? (
    <span class="badge good" title="GenesisGradeLens's calculation matches Genesis">✓ matches</span>
  ) : (
    <span class="badge warn" title="GenesisGradeLens's calculation differs from Genesis">
      {diff > 0 ? '+' : ''}
      {diff} vs Genesis
    </span>
  );
}

export function CourseList({ data, district, onOpen }: { data: StudentData; district: District; onOpen: (key: string) => void }) {
  const letters = seenLetters(data.courses);
  return (
    <>
      <ul class="course-list">
        {data.courses.map((c) => {
          const r = calculate(c.assignments, c.method);
          const missing = c.assignments.filter((a) => a.status === 'missing').length;
          const upcoming = c.assignments.filter((a) => a.status === 'ungraded' && a.possible).length;
          return (
            <li key={c.key}>
              <button class="course-card" onClick={() => onOpen(c.key)}>
                <div class="course-main">
                  <div class="course-name">{c.name}</div>
                  <div class="muted small">
                    {c.term} · {c.teacher}
                  </div>
                  <div class="chips">
                    {missing > 0 && <span class="badge bad">{missing} missing</span>}
                    {upcoming > 0 && <span class="badge">{upcoming} not graded yet</span>}
                    <Agreement course={c} calc={r.rounded} />
                  </div>
                </div>
                <div class="course-grades">
                  <div class="grade-big">
                    {c.reported ? (
                      <>
                        {c.reported.value}
                        <span class="letter">{c.reported.letter}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                  <div class="muted small">
                    Genesis
                  </div>
                  <div class="calc small">
                    {r.percent == null ? 'no grades yet' : `${fmtPct(r.percent)} ${letterFor(r.rounded!, district, letters)}`}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {data.otherCourses.length > 0 && (
        <details class="card other">
          <summary>Not running in {data.period.label} ({data.otherCourses.length})</summary>
          <ul>
            {data.otherCourses.map((c) => (
              <li key={c.name}>
                {c.name} <span class="muted small">· {c.term} · {c.teacher}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
