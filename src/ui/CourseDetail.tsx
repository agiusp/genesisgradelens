import { useEffect, useMemo, useState } from 'preact/hooks';
import { letterFor, type District } from '../config/districts';
import { calculate, countedPoints, type GradeResult } from '../engine/calculate';
import type { Assignment } from '../engine/types';
import { applyScenario, gradeRange, neededScore, rangeScores, typicalMultiplier, type Scenario } from '../engine/whatif';
import type { CourseData } from '../genesis/load';
import { Agreement, seenLetters } from './CourseList';
import { fmtPct, fmtPts } from './format';
import { GradeDial } from './GradeDial';
import { loadScenario, saveScenario } from './scenarioStore';

interface Props {
  course: CourseData;
  district: District;
  studentId: string;
  onBack: () => void;
}

const STATUS_LABEL: Record<Assignment['status'], string> = {
  graded: '',
  missing: 'Missing (counts as 0)',
  incomplete: 'Incomplete (counts as 0)',
  exempt: 'Exempt (not counted)',
  absent: 'Absent (not counted)',
  ungraded: 'Not graded yet',
  rubric: 'Rubric (no points shown)',
};

export function CourseDetail({ course, district, studentId, onBack }: Props) {
  const [whatIf, setWhatIf] = useState(false);
  const [scenario, setScenario] = useState<Scenario>(() => loadScenario(studentId, course.key, course.period));
  useEffect(() => saveScenario(studentId, course.key, course.period, scenario), [scenario, studentId, course]);

  const letters = useMemo(() => seenLetters([course]), [course]);
  const actual = useMemo(() => calculate(course.assignments, course.method), [course]);
  const projectedList = useMemo(() => applyScenario(course.assignments, scenario), [course, scenario]);
  const projected = useMemo(() => calculate(projectedList, course.method), [projectedList, course]);
  const shown = whatIf ? projected : actual;
  const hasScenario = Object.keys(scenario.scores).length > 0 || scenario.added.length > 0;

  const categories = course.method.kind === 'weighted' ? course.method.categories.map((c) => c.name) : [];
  const allCategories = [...new Set([...categories, ...course.assignments.map((a) => a.category)])];

  const setScore = (id: string, value: string) =>
    setScenario((s) => {
      const scores = { ...s.scores };
      if (value === '') delete scores[id];
      else scores[id] = Number(value);
      return { ...s, scores };
    });

  return (
    <div class="detail">
      <button class="link-button back" onClick={onBack}>
        ← All courses
      </button>

      <section class="card">
        <h2 class="detail-title">{course.name}</h2>
        <div class="muted small">
          {course.term} · {course.teacher} · {course.period}
        </div>
        <div class="grade-compare">
          <GradeBox label="Genesis" value={course.reported ? `${course.reported.value}` : '—'} letter={course.reported?.letter ?? ''} />
          <GradeBox
            label="Calculated"
            value={fmtPct(actual.percent)}
            letter={actual.rounded == null ? '' : letterFor(actual.rounded, district, letters)}
          />
          {whatIf && (
            <GradeBox
              label="What-if"
              value={fmtPct(projected.percent)}
              letter={projected.rounded == null ? '' : letterFor(projected.rounded, district, letters)}
              highlight
              delta={projected.percent != null && actual.percent != null ? projected.percent - actual.percent : null}
            />
          )}
        </div>
        <div class="chips">
          <Agreement course={course} calc={actual.rounded} />
          <span class="muted small">
            {course.methodSource === 'genesis-weights'
              ? 'Weighted categories (from Genesis)'
              : 'Total points (Genesis shows no category weights for this course)'}
          </span>
        </div>
        <div class="mode-switch" role="group" aria-label="View">
          <button class={!whatIf ? 'active' : ''} aria-pressed={!whatIf} onClick={() => setWhatIf(false)}>
            Current
          </button>
          <button class={whatIf ? 'active' : ''} aria-pressed={whatIf} onClick={() => setWhatIf(true)}>
            What if…{hasScenario ? ' •' : ''}
          </button>
        </div>
      </section>

      <Breakdown result={shown} method={course.method.kind} />

      {whatIf && (
        <WhatIfTools
          course={course}
          projectedList={projectedList}
          scenario={scenario}
          setScenario={setScenario}
          categories={allCategories}
          district={district}
          letters={letters}
          currentPercent={actual.percent}
        />
      )}

      <section class="card">
        <h3>Assignments</h3>
        <ul class="assignments">
          {(whatIf ? projectedList : course.assignments).map((a) => {
            const pts = countedPoints(a);
            const added = scenario.added.some((x) => x.id === a.id);
            const editable = whatIf && a.possible != null;
            const typed = scenario.scores[a.id];
            return (
              <li key={a.id} class={`assignment ${a.hypothetical ? 'hypo' : ''} ${a.status}`}>
                <div class="a-main">
                  <div class="a-title">{a.title}</div>
                  <div class="muted small">
                    {a.due ? `${a.due} · ` : ''}
                    {a.category}
                  </div>
                  {a.multiplier !== 1 && <MultiplierBadge m={a.multiplier} />}
                  {added && <div class="small status-ungraded">Future assignment (what-if)</div>}
                  {STATUS_LABEL[a.status] && !a.hypothetical && <div class={`small status-${a.status}`}>{STATUS_LABEL[a.status]}</div>}
                </div>
                <div class="a-score">
                  {editable ? (
                    <span>
                    <label class="score-input">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={typed ?? ''}
                        placeholder={a.earned != null ? fmtPts(a.earned) : '?'}
                        onInput={(e) => setScore(a.id, (e.target as HTMLInputElement).value)}
                        aria-label={`What-if score for ${a.title}`}
                      />
                      <span>/ {fmtPts(a.possible)}</span>
                    </label>
                    {added && (
                      <button
                        class="link-button small"
                        onClick={() =>
                          setScenario((s) => {
                            const scores = { ...s.scores };
                            delete scores[a.id];
                            return { scores, added: s.added.filter((x) => x.id !== a.id) };
                          })
                        }
                      >
                        remove
                      </button>
                    )}
                    </span>
                  ) : (
                    <span>
                      {a.earned != null ? fmtPts(a.earned) : '—'} / {fmtPts(a.possible)}
                      {pts && pts.possible > 0 && <span class="muted small"> {fmtPct((pts.earned / pts.possible) * 100, 0)}</span>}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
          {course.assignments.length === 0 && <li class="muted">No assignments posted for {course.period} yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function GradeBox(props: { label: string; value: string; letter: string; highlight?: boolean; delta?: number | null }) {
  return (
    <div class={`grade-box ${props.highlight ? 'highlight' : ''}`}>
      <div class="muted small">{props.label}</div>
      <div class="grade-big">
        {props.value}
        <span class="letter">{props.letter}</span>
      </div>
      {props.delta != null && Math.abs(props.delta) >= 0.005 && (
        <div class={`small ${props.delta > 0 ? 'up' : 'down'}`}>
          {props.delta > 0 ? '▲' : '▼'} {Math.abs(props.delta).toFixed(2)}
        </div>
      )}
    </div>
  );
}

function Breakdown({ result, method }: { result: GradeResult; method: 'weighted' | 'points' }) {
  return (
    <section class="card">
      <h3>How the grade is built</h3>
      <p class="muted small">
        {method === 'weighted'
          ? 'Each category average counts for its weight. Empty categories are left out and the rest scaled up.'
          : 'All points earned divided by all points possible.'}
      </p>
      <ul class="categories">
        {result.categories.map((c) => (
          <li key={c.name} class="category">
            <div class="cat-head">
              <strong>{c.name}</strong>
              <span>{fmtPct(c.percent)}</span>
            </div>
            <div class="bar" aria-hidden="true">
              <div class="bar-fill" style={{ width: `${Math.min(100, c.percent ?? 0)}%` }} />
            </div>
            <div class="muted small">
              {fmtPts(c.earned)} / {fmtPts(c.possible)} pts · {c.count} graded
              {c.weight != null && ` · weight ${fmtPct(c.weight, 1)}`}
              {c.effectiveWeight != null && c.weight != null && Math.abs(c.effectiveWeight - c.weight) > 0.01 && ` (now ${fmtPct(c.effectiveWeight, 1)})`}
              {c.contribution != null && ` · adds ${c.contribution.toFixed(2)} pts`}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function WhatIfTools(props: {
  course: CourseData;
  projectedList: Assignment[];
  scenario: Scenario;
  setScenario: (fn: (s: Scenario) => Scenario) => void;
  categories: string[];
  district: District;
  letters: Map<number, string>;
  currentPercent: number | null;
}) {
  const { course, projectedList, scenario, setScenario, categories, district, letters, currentPercent } = props;
  const [cat, setCat] = useState(categories[0] ?? 'Assignment');
  const [title, setTitle] = useState('');
  const [possible, setPossible] = useState('100');
  const [earned, setEarned] = useState('');
  // Pre-fill "counts ×" from what this category's real assignments use; refresh on category change.
  const hint = useMemo(() => typicalMultiplier(course.assignments, cat), [course.assignments, cat]);
  const [mult, setMult] = useState(String(hint.value));
  useEffect(() => setMult(String(hint.value)), [hint.value, cat]);
  const multValue = Number(mult) > 0 ? Number(mult) : 1;

  const candidates = projectedList.filter((a) => a.possible != null && (a.hypothetical || a.status === 'ungraded' || a.status === 'missing'));
  const [targetId, setTargetId] = useState('');
  const [rangeId, setRangeId] = useState('');
  const rangeFor = candidates.find((a) => a.id === rangeId) ?? candidates[candidates.length - 1];
  const [target, setTarget] = useState('90');
  const solveFor = candidates.find((a) => a.id === targetId) ?? candidates[0];

  const need = useMemo(() => {
    if (!solveFor || target === '') return null;
    // Solve with every other what-if applied, and this assignment's own what-if removed.
    const list = projectedList.map((a) => (a.id === solveFor.id ? { ...a, earned: 0 } : a));
    return neededScore(list, course.method, solveFor.id, Number(target) - 0.5);
  }, [solveFor, target, projectedList, course.method]);

  const add = (e: Event) => {
    e.preventDefault();
    const p = Number(possible);
    if (!(p > 0)) return;
    const a: Assignment = {
      id: `hypo-${Date.now()}`,
      title: title.trim() || `Future ${cat}`,
      category: cat,
      // No score yet: it doesn't count until one is typed in, but the range table works.
      earned: earned === '' ? null : Number(earned),
      possible: p,
      multiplier: multValue,
      status: earned === '' ? 'ungraded' : 'graded',
      hypothetical: true,
    };
    setScenario((s) => ({ ...s, added: [...s.added, a] }));
    setRangeId(a.id);
    setTitle('');
    setEarned('');
  };

  return (
    <section class="card whatif">
      <h3>What if…</h3>
      <p class="muted small">
        Type scores into any assignment below, or add a future one here. Nothing is sent to Genesis; scenarios are saved on this
        device only.
      </p>

      <form class="add-form" onSubmit={add}>
        <label>
          Category
          <select value={cat} onChange={(e) => setCat((e.target as HTMLSelectElement).value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name (optional)
          <input value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="e.g. Unit 3 Test" />
        </label>
        <div class="row">
          <label>
            Score (optional)
            <input type="number" inputMode="decimal" step="any" min="0" value={earned} placeholder="?" onInput={(e) => setEarned((e.target as HTMLInputElement).value)} />
          </label>
          <label>
            Out of
            <input type="number" inputMode="decimal" step="any" min="1" value={possible} onInput={(e) => setPossible((e.target as HTMLInputElement).value)} required />
          </label>
        </div>
        <label>
          Counts ×
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min="0.01"
            value={mult}
            onInput={(e) => setMult((e.target as HTMLInputElement).value)}
            required
          />
        </label>
        <p class={`mult-hint small ${hint.value !== 1 || multValue !== 1 ? 'notice' : 'muted'}`}>
          {hint.total === 0
            ? `No graded ${cat} assignments yet, so this assumes ×1 (Genesis's default).`
            : hint.seen.length === 1
              ? `All ${hint.total} graded ${cat} assignment${hint.total === 1 ? '' : 's'} in this course count ×${hint.value}.`
              : `${hint.count} of ${hint.total} graded ${cat} assignments count ×${hint.value} (others: ${hint.seen
                  .slice(1)
                  .map((m) => `×${m}`)
                  .join(', ')}). Check with the teacher if unsure.`}
          {multValue !== 1 && Number(possible) > 0 && ` At ×${multValue}, ${fmtPts(Number(possible))} points count as ${fmtPts(Number(possible) * multValue)}.`}
        </p>
        <button class="button" type="submit">
          Add future assignment
        </button>
      </form>

      {rangeFor && (
        <ScoreRange
          assignment={rangeFor}
          candidates={candidates}
          onPick={setRangeId}
          list={projectedList}
          course={course}
          district={district}
          letters={letters}
          currentPercent={currentPercent}
        />
      )}

      {candidates.length > 0 && (
        <div class="solver">
          <h4>What score is needed?</h4>
          <div class="row">
            <label>
              On
              <select value={solveFor?.id} onChange={(e) => setTargetId((e.target as HTMLSelectElement).value)}>
                {candidates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} (/{fmtPts(a.possible)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              To reach
              <input type="number" inputMode="decimal" value={target} onInput={(e) => setTarget((e.target as HTMLInputElement).value)} />
            </label>
          </div>
          {need && (
            <p class="solver-answer">
              {need.kind === 'score' &&
                `${fmtPts(Math.ceil(need.earned * 100) / 100)} / ${fmtPts(need.possible)} (${fmtPct((need.earned / need.possible) * 100, 1)})`}
              {need.kind === 'already' && 'Already there, even with a 0.'}
              {need.kind === 'impossible' && `Not reachable with this one assignment (best: ${fmtPct(need.best)}).`}
              {need.kind === 'no-effect' && "This assignment doesn't change the grade."}
            </p>
          )}
          <p class="muted small">Grades of {target || '…'} and up round from {Number(target || 0) - 0.5}%.</p>
        </div>
      )}

      {(Object.keys(scenario.scores).length > 0 || scenario.added.length > 0) && (
        <button class="button secondary" onClick={() => setScenario(() => ({ scores: {}, added: [] }))}>
          Reset to real grades
        </button>
      )}
    </section>
  );
}

function ScoreRange(props: {
  assignment: Assignment;
  candidates: Assignment[];
  onPick: (id: string) => void;
  list: Assignment[];
  course: CourseData;
  district: District;
  letters: Map<number, string>;
  currentPercent: number | null;
}) {
  const { assignment: a, candidates, onPick, list, course, district, letters, currentPercent } = props;
  const rows = useMemo(
    () => gradeRange(list, course.method, a.id, rangeScores(a.possible ?? 0)),
    [list, course.method, a.id, a.possible],
  );
  const thinned = rows.length > 1 && rows[0].score - rows[1].score > 1;
  // "Now" = the grade before this assignment counts (other what-ifs applied), so the dial,
  // the table's "vs now" and the worst/best ends all share one baseline.
  const now = useMemo(
    () => calculate(list.map((x) => (x.id === a.id ? { ...x, earned: null, status: 'ungraded' as const } : x)), course.method).percent,
    [list, a.id, course.method],
  );
  const typedHere = a.hypothetical && a.status === 'graded' ? calculate(list, course.method).percent : null;
  const letter = (r: number) => letterFor(r, district, letters);
  const first = rows[0];
  const last = rows[rows.length - 1];
  void currentPercent;

  return (
    <div class="range">
      <h4>Score range</h4>
      <label class="range-pick">
        Every possible score on
        <select value={a.id} onChange={(e) => onPick((e.target as HTMLSelectElement).value)}>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} · {c.category} (/{fmtPts(c.possible)}
              {c.multiplier !== 1 ? `, counts ×${c.multiplier}` : ''})
            </option>
          ))}
        </select>
      </label>
      {a.multiplier !== 1 && (
        <p class="mult-hint notice small">
          <MultiplierBadge m={a.multiplier} /> This assignment counts ×{a.multiplier}: a full {fmtPts(a.possible)}-point score
          counts as {fmtPts((a.possible ?? 0) * a.multiplier)} points in {a.category}. The grades below include that.
        </p>
      )}
      <GradeDial
        district={district}
        letter={letter}
        now={now ?? currentPercent}
        worst={last?.percent ?? null}
        best={first?.percent ?? null}
        worstLabel={last ? `${fmtPts(last.score)} / ${fmtPts(a.possible)}` : ''}
        bestLabel={first ? `${fmtPts(first.score)} / ${fmtPts(a.possible)}` : ''}
        whatIf={typedHere}
      />
      <p class="muted small">
        Course grade for each score on this {a.category} assignment, with your other what-if scores applied. Rows where the
        letter grade changes are highlighted.{thinned ? ' Long ranges are shown in steps.' : ''}
      </p>
      <div class="range-scroll">
        <table class="table range-table">
          <thead>
            <tr>
              <th scope="col">Score</th>
              <th scope="col">Course grade</th>
              <th scope="col">vs now</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const letter = r.rounded == null ? '' : letterFor(r.rounded, district, letters);
              const prev = rows[i - 1];
              const prevLetter = prev?.rounded == null ? null : letterFor(prev.rounded, district, letters);
              const boundary = prevLetter != null && prevLetter !== letter;
              const delta = r.percent != null && (now ?? currentPercent) != null ? r.percent - (now ?? currentPercent)! : null;
              return (
                <tr key={r.score} class={boundary ? 'boundary' : ''}>
                  <td>
                    <strong>{fmtPts(r.score)}</strong>
                    <span class="muted"> / {fmtPts(a.possible)}</span>
                    <span class="muted small"> · {fmtPct((r.score / (a.possible || 1)) * 100, 0)}</span>
                  </td>
                  <td>
                    {fmtPct(r.percent)} <strong>{letter}</strong>
                  </td>
                  <td class={delta == null ? '' : delta >= 0.005 ? 'up' : delta <= -0.005 ? 'down' : 'muted'}>
                    {delta == null ? '—' : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(2)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MultiplierBadge({ m }: { m: number }) {
  return (
    <span class="badge mult" title={`Genesis assignment weight: this counts ${m} times its points`}>
      counts ×{m}
    </span>
  );
}
