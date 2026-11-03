// What-if scenarios, saved per student + course + period on this device only.
// localStorage works in the extension page and in a phone app's web view.

import { emptyScenario, type Scenario } from '../engine/whatif';

const key = (studentId: string, courseKey: string, period: string) => `ggl:scenario:${studentId}:${courseKey}:${period}`;

export function loadScenario(studentId: string, courseKey: string, period: string): Scenario {
  try {
    const raw = localStorage.getItem(key(studentId, courseKey, period));
    if (raw) {
      const s = JSON.parse(raw) as Scenario;
      if (s && typeof s.scores === 'object' && Array.isArray(s.added)) return s;
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return emptyScenario();
}

export function saveScenario(studentId: string, courseKey: string, period: string, s: Scenario): void {
  try {
    const empty = !Object.keys(s.scores).length && !s.added.length;
    if (empty) localStorage.removeItem(key(studentId, courseKey, period));
    else localStorage.setItem(key(studentId, courseKey, period), JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
