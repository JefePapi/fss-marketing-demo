# BACKLOG

## 1. Clickable "one request + rolling calendar" prototype — BUILT, waiting for tester

Opened 2026-11-17, before any code.

**Goal:** static demo proving four things: one request typed once, fan-out to per-team
lanes under one number, a rolling 12-month calendar that fills itself, and a
spreadsheet export (16 familiar headers) plus a read-only link for a Teams tab.

**Premise check:** the site folder was empty at the start; no earlier prototype to reuse.

**Decisions used (the plan's recommended options; none answered on the owner's behalf):**
- Form layout: four short steps at every width.
- Export: the 16 headers, plus STATUS, TYPE and REQUEST # at the far right.
- Lead-time note: 60 calendar days, labeled as a sample rule.

**Not done in this item (needs the owner's OK in the task text):** creating the public
repo, pushing, merging to main, switching on Pages.

**Close-out note (2026-11-17):** built in one pass. Results, skipped items and the
security checklist are in README.md ("Build record"). Not yet seen in a real browser
by the builder: no server was allowed in the build task, so the tester's by-hand
list (README) is the first real-browser check.

## 2. Liquid-glass polish and military event times — COMPLETE (browser check pending)

Opened 2026-11-17 before implementation; authorized by the owner's polish brief.
Premise: main b04e01a already has atmosphere, glass and motion controls, but reading
surfaces are 95–100% white and event times use AM/PM. Baseline: all 3 test files pass.
Local history and supplied screenshots reviewed; no configured live deployment to inspect.
Scope: CSS material pass, inline favicon, calendar/staff event time display and test docs.
No servers, commits, pushes or deployment. Branch creation blocked by read-only .git;
changes remain in the working tree on main without changing its commit.

**Close-out (2026-11-17):** implemented the authorized polish. Main b04e01a baseline:
3 test files pass / 0 fail; final: 3 pass / 0 fail, including new military-time coverage.
All 15 JS syntax checks and diff whitespace checks pass. CSP and stable hooks unchanged;
favicon SVG parses. Security checklist: 11 PASS, 0 FAIL, 0 N/A (README polish record).
No commit created; no server, push or deploy. Browser appearance/AA verification pending.
JS + CSS 124,076 bytes (+1,711 from baseline); pre-existing size overage parked below.

## 3. Parity pass — IMPLEMENTED, browser validation pending

Opened 2026-11-17 before implementation. Authorized scope: docs/PARITY.md covered and demo-stub rows, browser tests and documentation. Premise: local main 0b90329 has the base flows but lacks the listed parity gaps; supplied test tooling is already installed. Production inspection excluded by the task no-network rule. No commits, pushes or deployments. Baseline: 3 unit test files, 0 failures.

**Close-out (2026-11-17):** implemented the requested requester/staff parity features and simulated email triggers. Added exactly 78 browser row tests (156 cases at the two existing widths), an inventory-title guard, and pure report/action/model tests. Inventory rows untouched; R12 title says 13 choices while task-approved demo scope is about 8 (implemented 8). Existing 36-seed counts unchanged, with relative overdue/due-soon dates and priorities added.

Validation: baseline main 0b90329 = 3 unit test files passing / 0 failing; final = 5 passing / 0 failing, including all original files. Site JS syntax checks, test discovery and diff whitespace checks pass. Offline dependency audit: 0 reported vulnerabilities, no install or network. README security checklist: 12 PASS, 0 FAIL, 0 N/A for source/offline checks. Browser execution attempted, but the sandbox blocked the local server socket (PermissionError); UI/visual verification and independent tester verdict remain pending. JS + CSS: 155,256 bytes, below the approved 200,000-byte limit. No commit created; no push, merge or deploy. Changes remain local on main 0b90329 per the explicit no-commits task instruction.

## 4. Desktop speed fix and Sunday-first calendar — IMPLEMENTED, browser/FPS validation pending

Opened 2026-11-17 before implementation. Authorized scope: static atmosphere,
gradient glass surfaces, off-screen containment, Sunday–Saturday month cells,
regression tests and documentation. Premise: source confirms animated blurred
blobs, large backdrop blurs and Monday-first grid without trailing dates.
Local baseline: 5 unit test files pass, 0 fail. Git/history and production reads
excluded by the owner's explicit no-git/no-network instruction. No packages,
commits, merge or deployment authorized.

**Close-out (2026-11-17):** static multi-gradient atmosphere; gradient glass/tray
surfaces without backdrop blur; transform/opacity-only transitions; off-screen
content containment with print override. Complete Sunday–Saturday month grids,
pure monthCells helper, unit coverage and two new browser regression tests.
README includes hooks, native-picker limit, performance record and security checklist.
Baseline 5 unit files pass/0 fail; final 6 pass/0 fail. All 20 site JS syntax
checks pass; browser discovery 160 cases, existing parity inventory unchanged.
Both browser commands attempted: sandbox socket PermissionError prevents server
startup. Visual review, independent tester and 55+ fps idle/scroll measurements
remain pending. Offline audit: 0 reported vulnerabilities. Security: 12 PASS,
0 FAIL, 0 N/A (source/offline scope). JS + CSS 155,829 bytes, below 200,000.
No git/network use, commit, push, merge or deployment.

## 5. Activities, managers, hours and change notices — IMPLEMENTED, browser validation pending

Opened 2026-11-17 before implementation. Build PLAN-HOURS.md sections 1–13;
owner selected warn-and-send and working-tree-only edits, no branch/commit/push.
Premise: source and history at main 33c7775 confirm fixed facilities and no hours,
manager role, activity editors, notices or global mail log. Production read omitted
under the repository no-network rule. Measured baseline: 6 unit files pass, 0 fail;
recorded browser baseline: 156 parity + 4 regression cases. Preserve version 1,
CSP, export headers, parity inventory and desktop performance constraints.

**Close-out (2026-11-17):** PLAN-HOURS sections 1–9 implemented: additive version-1
activities, Sunday-first hours/closures/specials, manager roles, five editors,
marketing administration, change history, notifications and global demo email log;
request form warn-and-send, staff activity card and calendar hours. Sections 10–13:
23 unit/storage cases and 27 browser scenarios added, documentation and written
12 PASS / 0 FAIL / 0 N/A security checklist in README. No feature cuts needed.
Baseline main 33c7775: 6 unit files pass / 0 fail; final: 7 pass / 0 fail.
All 23 site JS syntax checks and source/whitespace checks pass. Discovery: 214
browser cases (original 160 + 54 new). Full browser command attempted; socket
PermissionError blocks the server, so no browser pass or independent tester
verdict is claimed. Offline render smoke passes; offline audit: 0 vulnerabilities.
Final JS+CSS: **187,540 bytes** (`wc -c js/*.js js/views/*.js css/app.css`),
below both the plan 195,000-byte hard stop and owner 200,000-byte limit. No branch, commit, push, merge or
deployment; edits remain on main 33c7775 in the working tree as requested.

## Parking lot
- Pointer-following light on glass cards (cut per the plan's cut order).
- Real shared storage so every visitor sees the same calendar (needs a hosting answer).
- Previous 100 KB budget concern resolved by owner-approved 200 KB budget for #3; keep future changes lean.

- Hours #5: overnight hours, repeating closures, per-person read state, manager
  accounts, requester status-page hours, prefilled activity-request link remain out
  of scope. Owner may revise S56 to reflect partial activity administration; parity
  inventory rows were deliberately unchanged.
