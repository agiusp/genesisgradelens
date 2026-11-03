// Genesis HTML → typed data. The only code that knows Genesis markup.
// Written to be forgiving: anything unrecognized is skipped rather than guessed.

import type { AssignmentStatus, CategoryWeight } from '../engine/types';
import type { CourseSummaryRow, ListedAssignment, PeriodColumn, ReportedGrade, Student } from './model';

const clean = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

function isHidden(el: Element): boolean {
  // Assignment detail pop-ups: .boxShadow (Course Summary), .customDialogContainer (List Assignments).
  return (
    el.classList.contains('boxShadow') ||
    el.classList.contains('customDialogContainer') ||
    /display\s*:\s*none/i.test(el.getAttribute('style') ?? '')
  );
}

/** Text a user would see: skips hidden pop-ups and display:none elements. */
export function visibleText(el: Element): string {
  let out = '';
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) out += ' ' + n.textContent;
    else if (n.nodeType === 1 && !isHidden(n as Element)) out += ' ' + visibleText(n as Element);
  });
  return clean(out);
}

const num = (s: string) => Number(s.replace(/,/g, ''));

// ---------- Students ----------

export function parseStudents(doc: Document): Student[] {
  const students: Student[] = [];
  doc.querySelectorAll('li.selectStudentItem').forEach((li) => {
    const link = li.querySelector('[onclick*="selectStudent"]') ?? li;
    const id = (link.getAttribute('onclick') ?? '').match(/\d{3,}/)?.[0];
    if (!id) return;
    // Name is the outer text; the school sits in a nested element.
    const nameHolder = link.firstElementChild ?? link;
    const schoolEl = nameHolder.querySelector('div, span');
    const school = clean(schoolEl?.textContent);
    const full = clean(nameHolder.textContent);
    const name = clean(school && full.endsWith(school) ? full.slice(0, -school.length) : full);
    students.push({ id, name, school, selected: li.classList.contains('selected') });
  });
  return students;
}

// ---------- Grade Summary ----------

export function parseReportedGrade(text: string): ReportedGrade | null {
  const m = clean(text).match(/(-?\d+(?:\.\d+)?)\s*(?:\(([^)]+)\))?/);
  if (!m) return null;
  return { value: num(m[1]), letter: m[2] ? clean(m[2]) : null };
}

export function parseGradeSummary(doc: Document): CourseSummaryRow[] {
  const courses = new Map<string, CourseSummaryRow>();

  doc.querySelectorAll('[onclick^="goToCourseSummary"]').forEach((el) => {
    const args = (el.getAttribute('onclick') ?? '').match(/'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/);
    if (!args) return;
    const [, code, section, linkPeriod] = args;
    const key = `${code}:${section}`;
    const text = clean(el.textContent);
    // The same handler is on the course name and on each grade link; we want the name.
    if (courses.has(key) || /^\d/.test(text) || !text) return;

    // Header: "<term> | <name>" then teacher. Card: nearest ancestor holding the period table.
    const header = el.closest('.twoColFlex') ?? el.parentElement?.parentElement ?? el;
    const nameRow = el.parentElement;
    const term = clean(nameRow?.firstElementChild?.textContent).replace(/\|/g, '').trim();
    const teacher = clean(
      [...header.children]
        .filter((c) => !c.contains(el))
        .map((c) => c.textContent)
        .join(' '),
    );

    let card: Element | null = header;
    while (card && !card.querySelector('table')) card = card.parentElement;
    const periods = card ? parsePeriodTable(card.querySelector('table')!) : [];

    courses.set(key, { code, section, linkPeriod, name: text, teacher, term, periods });
  });

  return [...courses.values()];
}

function parsePeriodTable(table: Element): PeriodColumn[] {
  const rows = [...table.querySelectorAll('tr')];
  if (rows.length < 2) return [];
  const heads = [...rows[0].children];
  const cells = [...rows[1].children];
  const cols: PeriodColumn[] = [];
  heads.forEach((h, i) => {
    const t = visibleText(h);
    const m = t.match(/^([A-Z]{1,3}\d?)\s*(.*)$/);
    if (!m) return; // blank spacer column
    const g = cells[i] ? visibleText(cells[i]) : '';
    cols.push({ label: m[1], range: clean(m[2]) || null, grade: /\d/.test(g) ? parseReportedGrade(g) : null });
  });
  return cols;
}

// ---------- Course Summary (category weights) ----------

/** Category weights, or null when the page has no Grading Information table (points course). */
export function parseCategoryWeights(doc: Document): CategoryWeight[] | null {
  for (const table of doc.querySelectorAll('table.list')) {
    const headRow = [...table.querySelectorAll('tr')].find((r) => /Category/.test(r.textContent ?? '') && /Weight/.test(r.textContent ?? ''));
    if (!headRow || table.querySelector('table')) continue;
    const weights: CategoryWeight[] = [];
    table.querySelectorAll('tr.listroweven, tr.listrowodd').forEach((r) => {
      const c = [...r.children];
      const w = clean(c[1]?.textContent).match(/(\d+(?:\.\d+)?)\s*%/);
      const name = clean(c[0]?.textContent);
      if (name && w) weights.push({ name, weight: num(w[1]) });
    });
    if (weights.length) return weights;
  }
  return null;
}

// ---------- List Assignments ----------

const STATUS_WORDS: [RegExp, AssignmentStatus][] = [
  [/\bMissing\b/i, 'missing'],
  [/\bIncomplete\b/i, 'incomplete'],
  [/\bExempt\b/i, 'exempt'],
  [/\bAbsent\b/i, 'absent'],
  [/\bNo Grade\b/i, 'ungraded'],
];

export function parseGradeCell(cell: Element): Pick<ListedAssignment, 'earned' | 'possible' | 'multiplier' | 'status'> {
  const text = visibleText(cell);
  const weightTitle = cell.querySelector('[title^="Assignment Weight"]')?.getAttribute('title');
  const multMatch = (weightTitle ?? '').match(/(\d+(?:\.\d+)?)/) ?? text.match(/^x(\d+(?:\.\d+)?)/);
  const multiplier = multMatch ? num(multMatch[1]) : 1;
  const pts = text.match(/Assignment Pts:\s*(\d+(?:\.\d+)?)/i);
  const score = text.match(/(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);

  for (const [re, status] of STATUS_WORDS) {
    if (re.test(text)) {
      return { earned: null, possible: pts ? num(pts[1]) : score ? num(score[2]) : null, multiplier, status };
    }
  }
  if (score) return { earned: num(score[1]), possible: num(score[2]), multiplier, status: 'graded' };
  // Single-letter codes Genesis documents: E (exempt), A (absent), M (missing), I (incomplete).
  const code = text.replace(/^x\d+(\.\d+)?\s*/, '').match(/^([EAMI])\b/);
  if (code) {
    const status = ({ E: 'exempt', A: 'absent', M: 'missing', I: 'incomplete' } as const)[code[1] as 'E' | 'A' | 'M' | 'I'];
    return { earned: null, possible: pts ? num(pts[1]) : null, multiplier, status };
  }
  return { earned: null, possible: pts ? num(pts[1]) : null, multiplier, status: cell.querySelector('img') ? 'rubric' : 'ungraded' };
}

export function parseListAssignments(doc: Document): ListedAssignment[] {
  const out: ListedAssignment[] = [];
  doc.querySelectorAll('table.list > tbody > tr.listroweven, table.list > tbody > tr.listrowodd, table.list > tr.listroweven, table.list > tr.listrowodd').forEach((row, i) => {
    const c = [...row.children];
    if (c.length < 4) return;
    const due = visibleText(c[0]);
    const courseText = visibleText(c[1]);
    const titleEl = [...c[2].querySelectorAll('b')].find((b) => !b.closest('.boxShadow, .customDialogContainer'));
    const title = clean(titleEl?.textContent);
    const all = visibleText(c[2]);
    const category = clean(title && all.endsWith(title) ? all.slice(0, -title.length) : all.split(title)[0]);
    if (!title) return;
    out.push({
      id: `${courseText}|${due}|${title}|${i}`,
      title,
      category: category || 'Uncategorized',
      due: due.replace(/^[A-Za-z]{3}\s*/, ''),
      courseText,
      ...parseGradeCell(c[3]),
    });
  });
  return out;
}
