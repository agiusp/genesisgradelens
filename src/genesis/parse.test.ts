// Fixtures mirror the Genesis markup documented in docs/genesis-pages.md, with made-up
// names, teachers, IDs and course codes. Real captured pages (fixtures/raw/) are git-ignored.

import { describe, expect, it } from 'vitest';
import { parseHtml } from './detect';
import { parseCategoryWeights, parseGradeCell, parseGradeSummary, parseListAssignments, parseStudents } from './parse';

const studentsHtml = `
<ul>
  <li class="selectStudentItem"><a onclick="selectStudent(event, '11111')"><div>Alex Example<div>Example High School</div></div></a></li>
  <li class="selectStudentItem selected"><a onclick="selectStudent(event, '222222')"><div>Sam Example<div>Example Middle School</div></div></a></li>
</ul>`;

const gradeSummaryHtml = `
<div>
  <div aria-label="">
    <div title="Go to Course Summary for English 2.">
      <div class="twoColFlex">
        <div><span>FY</span><span>|</span><span onclick="goToCourseSummary('E100','3','MP1')">English 2</span></div>
        <div>Teacher, Pat <a onclick="emailTeacher(event, 'x@example.org')"><img class="icon"></a></div>
      </div>
    </div>
  </div>
  <div><table><tbody>
    <tr><td class="cellCenter">MP1<br>9/08 to 11/13</td><td class="cellCenter">MP2<br>11/14 to 1/29</td><td class="cellCenter">FG</td></tr>
    <tr><td class="cellCenter"><a onclick="goToCourseSummary('E100','3','MP1')">90<br>(A-)</a></td><td class="cellCenter">---</td><td class="cellCenter"><img>90 (A-)</td></tr>
  </tbody></table></div>
</div>
<div>
  <div aria-label="">
    <div title="Go to Course Summary for Video.">
      <div class="twoColFlex">
        <div><span>S2</span><span>|</span><span onclick="goToCourseSummary('V200','1','MP1')">Video</span></div>
        <div>Teacher, Lee</div>
      </div>
    </div>
  </div>
  <div><table><tbody>
    <tr><td></td><td class="cellCenter">MP3<br>1/30 to 4/12</td><td class="cellCenter">FG</td></tr>
    <tr><td><img></td><td>---</td><td>---</td></tr>
  </tbody></table></div>
</div>`;

const courseSummaryWeighted = `
<table class="list"><tbody>
  <tr class="listheading"><td colspan="100"><div>Grading Information</div></td></tr>
  <tr class="listheading"><td class="cellLeft"><div>Category</div></td><td class="cellRight"><div>Weight</div></td><td class="cellRight">MP1 Avg</td></tr>
  <tr class="listroweven"><td class="cellLeft"><b>Homework</b></td><td class="cellRight">10.0 %</td><td class="cellRight">100.0 %</td></tr>
  <tr class="listrowodd"><td class="cellLeft"><b>Assessments</b></td><td class="cellRight">90.0 %</td><td class="cellRight">88.0 %</td></tr>
</tbody></table>`;

const listHtml = `
<table class="list"><tbody>
  <tr class="listheadingSmall"><td>Due</td><td>Course</td><td>Assignment</td><td>Grade</td><td></td></tr>
  <tr class="listroweven">
    <td class="cellCenter"><div>Mon</div><div>10/19</div></td>
    <td class="cellLeft"><div>English 2</div><div>Teacher, Pat</div></td>
    <td class="cellLeft"><div class="boxShadow" style="display:none"><table><tr><td>Close</td></tr><tr><td><b>Popup Title</b></td></tr></table></div><div>Assessments</div><b>Unit Test</b></td>
    <td class="cellLeft">50.5 / 59<div>86%</div></td><td></td>
  </tr>
  <tr class="listrowodd">
    <td class="cellCenter"><div>Tue</div><div>10/20</div></td>
    <td class="cellLeft"><div>Chemistry</div><div>Teacher, Kim</div></td>
    <td class="cellLeft"><div>Labs</div><b>Lab 4</b><div><div class="customDialogContainer"><table><tr><td>Close</td></tr><tr><td>Lab 4<hr></td></tr></table></div></div></td>
    <td class="cellLeft"><div title="Assignment Weight: 0.5"><span>x0.5</span></div>40.5 / 50<div>81%</div></td><td></td>
  </tr>
  <tr class="listroweven">
    <td class="cellCenter"><div>Fri</div><div>10/16</div></td>
    <td class="cellLeft"><div>Choir</div><div>Teacher, Max</div></td>
    <td class="cellLeft"><div>Participation</div><b>Lesson 2</b></td>
    <td class="cellLeft"><div><span title="Missing">Missing</span></div><div><div>Assignment Pts: 50</div></div></td><td></td>
  </tr>
  <tr class="listrowodd">
    <td class="cellCenter"><div>Fri</div><div>10/30</div></td>
    <td class="cellLeft"><div>Choir</div><div>Teacher, Max</div></td>
    <td class="cellLeft"><div>Ensemble</div><b>Open Mic</b></td>
    <td class="cellLeft"><div>No Grade</div><div>Assignment Pts: 10</div></td><td></td>
  </tr>
  <tr class="listroweven">
    <td class="cellCenter"><div>Tue</div><div>10/20</div></td>
    <td class="cellLeft"><div>Spanish</div><div>Teacher, Ana</div></td>
    <td class="cellLeft"><div>Presentational</div><b>Describe la foto</b></td>
    <td class="cellLeft"><span><img class="genesisImage large" title="Print Rubric"></span></td><td></td>
  </tr>
</tbody></table>`;

describe('parseStudents', () => {
  it('finds every student with id, name, school and selection', () => {
    expect(parseStudents(parseHtml(studentsHtml))).toEqual([
      { id: '11111', name: 'Alex Example', school: 'Example High School', selected: false },
      { id: '222222', name: 'Sam Example', school: 'Example Middle School', selected: true },
    ]);
  });
});

describe('parseGradeSummary', () => {
  const courses = parseGradeSummary(parseHtml(gradeSummaryHtml));

  it('reads course codes, names, terms and teachers', () => {
    expect(courses.map((c) => [c.code, c.section, c.linkPeriod, c.name, c.term, c.teacher])).toEqual([
      ['E100', '3', 'MP1', 'English 2', 'FY', 'Teacher, Pat'],
      ['V200', '1', 'MP1', 'Video', 'S2', 'Teacher, Lee'],
    ]);
  });

  it('reads only the periods each course shows, with grades', () => {
    expect(courses[0].periods).toEqual([
      { label: 'MP1', range: '9/08 to 11/13', grade: { value: 90, letter: 'A-' } },
      { label: 'MP2', range: '11/14 to 1/29', grade: null },
      { label: 'FG', range: null, grade: { value: 90, letter: 'A-' } },
    ]);
    expect(courses[1].periods.map((p) => p.label)).toEqual(['MP3', 'FG']);
  });
});

describe('parseCategoryWeights', () => {
  it('reads weights from Grading Information', () => {
    expect(parseCategoryWeights(parseHtml(courseSummaryWeighted))).toEqual([
      { name: 'Homework', weight: 10 },
      { name: 'Assessments', weight: 90 },
    ]);
  });

  it('returns null for a points course (no Grading Information)', () => {
    expect(parseCategoryWeights(parseHtml('<table class="list"><tr class="listroweven"><td>x</td></tr></table>'))).toBeNull();
  });
});

describe('parseListAssignments', () => {
  const rows = parseListAssignments(parseHtml(listHtml));

  it('reads graded rows and ignores the hidden pop-up', () => {
    expect(rows[0]).toMatchObject({
      title: 'Unit Test',
      category: 'Assessments',
      due: '10/19',
      courseText: 'English 2 Teacher, Pat',
      earned: 50.5,
      possible: 59,
      multiplier: 1,
      status: 'graded',
    });
  });

  it('reads multipliers, missing, ungraded and rubric rows', () => {
    expect(rows.slice(1).map((r) => [r.title, r.status, r.earned, r.possible, r.multiplier])).toEqual([
      ['Lab 4', 'graded', 40.5, 50, 0.5],
      ['Lesson 2', 'missing', null, 50, 1],
      ['Open Mic', 'ungraded', null, 10, 1],
      ['Describe la foto', 'rubric', null, null, 1],
    ]);
  });
});

describe('parseGradeCell', () => {
  it('understands single-letter codes', () => {
    const cell = parseHtml('<table><tr><td>E<div>Assignment Pts: 20</div></td></tr></table>').querySelector('td')!;
    expect(parseGradeCell(cell)).toEqual({ earned: null, possible: 20, multiplier: 1, status: 'exempt' });
  });
});
