# GenesisGradeLens build plan

## Goals

1. Show every course's grade **as Genesis reports it** and **as GenesisGradeLens calculates it**,
   with the full breakdown: categories, weights, and every assignment.
2. A **Future** view: enter possible scores for upcoming or hypothetical assignments and see
   the projected grade; solve for "what score is needed to reach X".
3. Usable by **any family in the district**, in **any school year**.

## Design principles (any student, any year)

- **Nothing is hard-coded about a student, course, teacher, or year.** Everything is
  discovered from what Genesis shows the signed-in user at runtime:
  - Students: read from the "Select Student" list (1 or more children; any school).
  - Courses: read from Grade Summary / Current Grades each time. Courses change every year
    and differ between the high school and middle school.
  - Grade structure: read per course (weighted categories vs. total points), never assumed.
  - Marking periods / report-card columns: read from the table headers (the high school uses
    MP1–MP4, ME, FE, FG; the middle school adds cycle/trimester columns like C1–C6, T1–T3).
- **Unknown shapes degrade gracefully.** If a course uses a layout or rule the parser does
  not recognize, show the Genesis grade and the raw assignments, and mark the calculated
  grade as "unavailable" instead of guessing.
- **The Genesis-vs-calculated comparison is the self-check.** A mismatch is flagged in the UI
  so families (and we) can spot rules we do not handle yet.
- **District settings are data, not code.** Base URL and page paths live in one config file.
  Summit is the only district at first; other Genesis districts could be added later.
- **Handle closed periods.** When Genesis says "The gradebook is not available at this time",
  show that message (and the last cached data, if any, with its date).

## Architecture

- Chrome extension (Manifest V3), TypeScript + Vite + Preact.
- Host permission limited to the Genesis parent portal domain(s).
- The extension fetches Genesis pages with the user's existing session cookies, and parses
  the HTML with `DOMParser`.
- Layers:
  1. `genesis/` – fetch + parse pages into typed data (students, courses, categories,
     assignments, reported grades). The only code that knows about Genesis HTML.
  2. `engine/` – pure grade math (weighted, total points, exempt/excused/missing/extra credit,
     what-if, reverse solver). Fully unit-tested, no DOM.
  3. `ui/` – Overview, Course breakdown, Future views.
- Storage: `chrome.storage.local` for what-if scenarios and a cache of the last fetch.

### Desktop and phone

Chrome extensions don't run on phones, so GenesisGradeLens ships two ways from one codebase:

- **Desktop:** Chrome extension (`src/platform/extension/`).
- **Phone (later):** a Capacitor app for iOS and Android (`src/platform/mobile/`). The user signs
  in to Genesis inside the app; the app then fetches pages natively with that session. No server
  and no stored password.

Only `GenesisTransport` (how a page is fetched) differs per platform. Parsers, grade engine and
UI are shared, and the UI is designed mobile-first (phone width first, 44px touch targets,
no wide tables that need sideways scrolling).

Rejected: a hosted website that logs in for each family (would store every family's password
on a server), and a plain mobile web page (Genesis blocks cross-site reads).

## Steps

### Step 0 – Discovery ✅ (see docs/genesis-pages.md)
For each student, capture and document:
- Grade Summary (`tab2=gradebook&tab3=weeklysummary`): course list, current grades.
- Course detail (click-through from Grade Summary): category names, weights, calculation type.
- List Assignments (`tab2=gradebook&tab3=listassignments`): assignment fields, statuses
  (missing, exempt, excused, not graded, extra credit), filters for marking period / course.
- Current Grades (`tab2=grading&tab3=current`): report-card columns.
- How student switching works (the `studentid` parameter and the selector).

Output: `docs/genesis-pages.md` describing each page's structure, plus fixtures.
Raw pages go in `fixtures/raw/` (git-ignored). Anonymized copies (names, teachers, IDs
replaced) go in `fixtures/anonymized/` and are what the tests use.

### Step 1 – Extension scaffold ✅
Manifest, toolbar button that opens the GenesisGradeLens tab, host permission, build setup,
session check ("signed in?", "gradebook open?"), platform-neutral transport interface.

### Step 2 – Parsers ✅ (first pass)
Genesis HTML → typed data, tested against anonymized fixtures, including the
"gradebook not available" page and a student with one child vs. two.

### Step 3 – Grade engine ✅ (matches Genesis on 4 verified courses)
Weighted and total-points calculation; compare against Genesis for every course and resolve
mismatches.

### Step 4 – Overview and Breakdown views ✅ (first pass)

### Step 5 – Future view ✅ (first pass)
What-if scores, hypothetical assignments, reverse solver, saved scenarios per course.

### Step 6 – Distribution
- First: "Load unpacked" from a GitHub release for testers.
- Later: Chrome Web Store listing (needs a privacy policy page; the "data stays local"
  design keeps it simple).

### Accounts and payments (proposed, not decided)
- Two separate logins: a **GenesisGradeLens account** (who has paid) and the **Genesis login**
  (grades). The GenesisGradeLens server only ever knows an email and subscription status; grades
  never leave the device.
- Recommended: Supabase Auth (email magic link / Google sign-in, free tier) + Stripe Checkout
  + one webhook function that marks the account as paid. Works for extension and phone.
- Faster but extension-only alternative: ExtensionPay.
- Needs: terms of service, privacy policy, sales-tax handling (Stripe Tax or a merchant of
  record), and a check of the district's policy before charging.

### Step 7 – Phone app
- Capacitor wrapper around the same UI; in-app Genesis sign-in; native HTTP transport.
- Android: sideload APK for testers, then Google Play ($25 one-time).
- iOS: TestFlight, then App Store (Apple Developer Program, $99/year).

## Open questions

- **Student portal.** Do students log in at a separate Genesis student portal with a different
  page layout? If so, supporting students directly (not only parents) needs a second set of
  parsers. Needs someone with a student login to check.
- **Hidden rules.** Genesis may not show parents rules such as "drop lowest quiz" or rounding.
  We'll find these through mismatches and may add per-course overrides.
- **District policy.** Before sharing widely, check the district's acceptable-use policy
  and consider telling the district's tech office about the extension.
