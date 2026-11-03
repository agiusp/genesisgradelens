import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import type { District } from '../config/districts';
import type { Student } from '../genesis/model';
import { GenesisStateError, loadStudentData, loadStudents, type StudentData } from '../genesis/load';
import type { GenesisTransport } from '../genesis/transport';
import { CourseDetail } from './CourseDetail';
import { CourseList } from './CourseList';
import { timeAgo } from './format';

type Phase =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'closed'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; students: Student[] };

type Load = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; data: StudentData };

interface Props {
  transport: GenesisTransport;
  district: District;
  iconUrl: string;
  /** Extra controls in the top bar (e.g. close / sign out in the web build). */
  headerActions?: ComponentChildren;
  /** Scrolls the app to the top; defaults to the window. */
  scrollTop?: () => void;
}

const errorPhase = (err: unknown): Phase => {
  if (err instanceof GenesisStateError) {
    return err.state.kind === 'signed-out' ? { kind: 'signed-out' } : { kind: 'closed', message: err.state.message };
  }
  return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
};

export function App({ transport, district, iconUrl, headerActions, scrollTop }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loads, setLoads] = useState<Record<string, Load>>({});
  const [openCourse, setOpenCourse] = useState<string | null>(null);

  const start = useCallback(async () => {
    setPhase({ kind: 'loading' });
    setLoads({});
    try {
      const students = await loadStudents(transport, district);
      setPhase({ kind: 'ready', students });
      setStudentId((cur) => cur ?? (students.find((s) => s.selected) ?? students[0]).id);
    } catch (err) {
      setPhase(errorPhase(err));
    }
  }, [transport, district]);

  useEffect(() => {
    void start();
  }, [start]);

  const students = phase.kind === 'ready' ? phase.students : [];
  const student = students.find((s) => s.id === studentId) ?? null;

  const loadStudent = useCallback(
    async (s: Student, force = false) => {
      if (!force && loads[s.id]) return;
      setLoads((l) => ({ ...l, [s.id]: { kind: 'loading' } }));
      try {
        const data = await loadStudentData(transport, district, s);
        setLoads((l) => ({ ...l, [s.id]: { kind: 'ready', data } }));
      } catch (err) {
        const p = errorPhase(err);
        if (p.kind === 'signed-out' || p.kind === 'closed') setPhase(p);
        else setLoads((l) => ({ ...l, [s.id]: { kind: 'error', message: p.kind === 'error' ? p.message : '' } }));
      }
    },
    [transport, district, loads],
  );

  useEffect(() => {
    if (student) void loadStudent(student);
  }, [student, loadStudent]);

  // Browser/phone back button closes the course view.
  useEffect(() => {
    const onPop = () => setOpenCourse(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const open = (key: string) => {
    history.pushState({ course: key }, '');
    setOpenCourse(key);
    (scrollTop ?? (() => window.scrollTo(0, 0)))();
  };
  const close = () => history.back();

  const load = student ? loads[student.id] : undefined;
  const course = useMemo(
    () => (load?.kind === 'ready' && openCourse ? (load.data.courses.find((c) => c.key === openCourse) ?? null) : null),
    [load, openCourse],
  );

  return (
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <img src={iconUrl} alt="" />
          <h1>GenesisGradeLens</h1>
        </div>
        <div class="topbar-right">
          <span class="district">{district.name}</span>
          {headerActions}
        </div>
      </header>

      {students.length > 1 && (
        <nav class="tabs" aria-label="Students">
          {students.map((s) => (
            <button
              key={s.id}
              class={`tab ${s.id === studentId ? 'active' : ''}`}
              aria-pressed={s.id === studentId}
              onClick={() => {
                setStudentId(s.id);
                setOpenCourse(null);
              }}
            >
              <span class="tab-name">{s.name.split(' ')[0]}</span>
              <span class="tab-school">{s.school}</span>
            </button>
          ))}
        </nav>
      )}

      <main class="content">
        {phase.kind === 'loading' && <p class="card">Connecting to Genesis…</p>}

        {phase.kind === 'signed-out' && (
          <section class="card">
            <h2>Sign in to Genesis</h2>
            <p>GenesisGradeLens uses your existing Genesis login. It never sees or stores your password.</p>
            <div class="actions">
              <a class="button" href={district.portals.parent} target="_blank" rel="noreferrer">
                Open Genesis
              </a>
              <button class="button secondary" onClick={start}>
                I've signed in
              </button>
            </div>
          </section>
        )}

        {phase.kind === 'closed' && (
          <section class="card">
            <h2>Gradebook closed</h2>
            <p>You're signed in, but Genesis says: “{phase.message}”</p>
            <p class="muted">This usually happens while teachers finalize a marking period.</p>
            <button class="button secondary" onClick={start}>
              Check again
            </button>
          </section>
        )}

        {phase.kind === 'error' && (
          <section class="card">
            <h2>Couldn't reach Genesis</h2>
            <p class="muted">{phase.message}</p>
            <button class="button secondary" onClick={start}>
              Try again
            </button>
          </section>
        )}

        {phase.kind === 'ready' && student && (
          <>
            {(!load || load.kind === 'loading') && <p class="card">Loading {student.name.split(' ')[0]}'s courses…</p>}
            {load?.kind === 'error' && (
              <section class="card">
                <h2>Couldn't load grades</h2>
                <p class="muted">{load.message}</p>
                <button class="button secondary" onClick={() => loadStudent(student, true)}>
                  Try again
                </button>
              </section>
            )}
            {load?.kind === 'ready' &&
              (course ? (
                <CourseDetail course={course} district={district} studentId={student.id} onBack={close} />
              ) : (
                <>
                  <div class="toolbar">
                    <span class="muted small">
                      {load.data.period.label}
                      {load.data.period.range ? ` · ${load.data.period.range}` : ''} · updated {timeAgo(load.data.loadedAt)}
                    </span>
                    <button class="link-button" onClick={() => loadStudent(student, true)}>
                      Refresh
                    </button>
                  </div>
                  <CourseList data={load.data} district={district} onOpen={open} />
                </>
              ))}
          </>
        )}
      </main>
    </div>
  );
}
