// District settings are data, not code. Adding another Genesis district should only
// need a new entry here (plus its domain in the extension's host_permissions).

export interface District {
  id: string;
  name: string;
  /**
   * Genesis entry points. Parents and students sign in to different portals, which may be on
   * different hosts and have different page layouts. Each host must also be listed in the
   * extension manifest's host_permissions.
   */
  portals: {
    parent: string;
    /** Student portal: URL pending (to be provided). */
    student?: string;
  };
  /** [minimum whole-number grade, letter], highest first. */
  gradeScale: [number, string][];
}

export const DISTRICTS: District[] = [
  {
    id: 'summit-nj',
    name: 'Summit Public Schools (NJ)',
    portals: {
      parent: 'https://parents.summit.k12.nj.us/genesis/parents',
      // Confirmed login host (2026-11-02); page path after login not yet verified.
      student: 'https://students.summit.k12.nj.us/genesis/students',
    },
    // Assumed letter scale, used only for GenesisGradeLens's own calculated grade.
    // Letters Genesis actually reports for a student override these where seen.
    gradeScale: [
      [93, 'A'], [90, 'A-'], [87, 'B+'], [83, 'B'], [80, 'B-'],
      [77, 'C+'], [73, 'C'], [70, 'C-'], [67, 'D+'], [65, 'D'], [0, 'F'],
    ],
  },
];

export const DEFAULT_DISTRICT = DISTRICTS[0];

/** Known Genesis pages, as the tab1/tab2/tab3 query parameters the portal uses. */
export const PAGES = {
  gradeSummary: { tab1: 'studentdata', tab2: 'gradebook', tab3: 'weeklysummary' },
  listAssignments: { tab1: 'studentdata', tab2: 'gradebook', tab3: 'listassignments' },
  currentGrades: { tab1: 'studentdata', tab2: 'grading', tab3: 'current' },
  courseSummary: { tab1: 'studentdata', tab2: 'gradebook', tab3: 'coursesummary' },
} as const;

export type PageName = keyof typeof PAGES;

export type PortalKind = keyof District['portals'];

export function pageUrl(
  district: District,
  page: PageName,
  opts: { studentId?: string; extra?: Record<string, string>; portal?: PortalKind } = {},
): string {
  const portal = opts.portal ?? 'parent';
  const base = district.portals[portal];
  if (!base) throw new Error(`${district.name} has no ${portal} portal configured`);
  const params = new URLSearchParams({ ...PAGES[page], action: 'form' });
  if (opts.studentId) params.set('studentid', opts.studentId);
  for (const [k, v] of Object.entries(opts.extra ?? {})) params.set(k, v);
  return `${base}?${params}`;
}

export function letterFor(grade: number, district: District, seen?: Map<number, string>): string {
  const known = seen?.get(grade);
  if (known) return known;
  return district.gradeScale.find(([min]) => grade >= min)?.[1] ?? '';
}
