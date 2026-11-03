# Genesis parent portal: page structure

Findings from Step 0 discovery (Summit Public Schools, 2026-11-02, MP1 of 2026-27).
No student data here: names, IDs and teachers are replaced with placeholders.

All pages live at `<portal>/genesis/parents` with query parameters
`tab1=studentdata&tab2=…&tab3=…&action=form&studentid=<id>`.

## Session and errors

| Situation | What Genesis returns |
|---|---|
| Signed out | Redirect to `/genesis/sis/view?gohome=true` with a username/password form |
| Gradebook closed (e.g. end of marking period) | Normal page whose body says "The gradebook is not available at this time." |
| Unknown period code (e.g. `mp=C1` on a course summary) | Silently redirects to the default period (`mp=MP1`) |

## Students

Every page has a "Select Student" list:

```html
<li class="selectStudentItem [selected]">
  <a onclick="selectStudent(<studentid>…)">
    <div>First Last <div>School name</div></div>
  </a>
</li>
```

Any family can have one or more students, at different schools.

## Grade Summary — `tab2=gradebook&tab3=weeklysummary`

One card per course for the current year:

- Header: `<term> | <course name>` (term is `FY`, `S1`, `S2`, `Q1`–`Q4`, cycle codes…), teacher name,
  teacher e-mail link.
- The course name has `onclick="goToCourseSummary('<courseCode>','<section>','<period>')"`.
- A small table: first row = period headers with date ranges (`MP1` `9/08 to 11/13` … `FG`),
  second row = grades like `90 (A-)` or `---`.
- Only the periods the course runs in are shown (an S2 course shows only MP3, MP4, FG).
- Middle-school cycle courses can link to cycle periods (`C1`…`C6`) as well as `MP1`.

## Course Summary — `tab3=coursesummary&courseCode=…&courseSection=…&mp=…`

The page for "how is this grade built".

- "Last grade posted on M/D/YY".
- **Assignments table** (`table.list`): rows `tr.listroweven` / `tr.listrowodd` with 3 cells:
  1. Due: `<div>Mon</div><div>11/2</div>`
  2. Assignment: hidden `div.boxShadow` pop-up (title/description), `<div>Category</div>`,
     `<b>Title</b>`
  3. Grade: text node `earned / possible`, then `<div>NN%</div>`
- Footer rules (verbatim from Genesis):
  - "Assignments graded as E (Exempt) or A (Absent) do not impact a student's grade."
  - "Assignments graded as M (Missing) counts as 0.0% and I (Incomplete) counts as 0.0%."
- **Grading Information** table (`table.list`, header row `Category | Weight | MP1 Avg`) — present
  **only for weighted courses**:
  ```
  <tr class="listroweven"><td><b>Homework</b></td><td>10.0 %</td><td>100.0 %</td></tr>
  ```
  When this table is absent the course is graded by **total points** (verified on two courses).
- Class attendance summary (year to date).

## List Assignments — `tab3=listassignments`

Filterable list across all courses; the filters are plain GET parameters:

| Param | Values |
|---|---|
| `dateRange` | `weekof` (with `date=MM/DD/YYYY`), `MP1`…`MP4`, `allMP` |
| `courseAndSection` | empty for all, or `<courseCode>:<section>` |
| `status` | empty (all), `GRADED`, `UNGRADED`, `MISSING`, `INCOMPLETE` |

Rows have 5 cells: due, course + teacher, category + title, grade, (empty). Grade cell shapes seen:

| Shape | Meaning |
|---|---|
| `45.5 / 50` + `91%` | Graded |
| `<div title="Assignment Weight: 0.5"><span>x0.5</span></div>40.5 / 50` + `81%` | Graded, counts ×0.5 |
| `<span title="Missing">Missing</span>` + `Assignment Pts: 50` | Missing (counts as 0) |
| `No Grade` + `Assignment Pts: 10` | Not graded yet (what-if candidates) |
| `<img title="Print Rubric">` only | Rubric-graded, no points shown |

## Grade calculation (verified against Genesis)

| Course type | Method | Check |
|---|---|---|
| Weighted (3 categories 40/20/40) | Σ weight × (category earned ÷ category possible) | 89.76 → Genesis 90 ✔ |
| Weighted (2 categories 10/90) | same | 88.92 → Genesis 89 ✔ |
| No Grading Information | Σ earned ÷ Σ possible | 89.95 → 90 ✔; 101.04 → 101 ✔ (extra credit > 100%) |

- Category averages on the page are **rounded for display** (87.69 % shows as "88.0 %"); the
  final grade uses the unrounded values.
- Final grade is shown as a whole number (rounded half up) with a letter.

## Still to confirm

- How Genesis treats a weighted category with no graded work yet (assumed: left out and the
  remaining weights rescaled).
- Exempt / Absent / Incomplete rendering (none seen yet).
- Whether assignment weight multipliers (`x0.5`) apply to both earned and possible (assumed yes).
- Student portal (`students.<district>/genesis/…`) page layout.
