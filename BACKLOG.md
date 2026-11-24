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

## 6. Staff desktop wheel scrolling — IMPLEMENTED, browser/FPS validation pending

Premise: card and button lifts activate during wheel scrolling. No staff view
has a scroll or resize listener. Live measurements supplied by the owner.

Follow-up: preserve clicks and taps during scrolling, suppress only hover lifts,
and update the browser regression.

**Close-out:** The passive listener sets the scroll class until 150 ms after
the last scroll event. On hover-capable devices the class pauses transform-only
hover lifts and keeps buttons and cards clickable. The updated desktop regression
checks the class, pointer events, hover transforms and stable shadows. All eight
unit files and JS syntax checks pass. Playwright could not start its local server.
See README.md for the security and validation record.

## 7. Areas inside each activity — IMPLEMENTED, browser validation pending

Premise: activities have hours and edit history, but no areas or request area
selection. Reuse the version-1 store, hours editor and role checks.

**Close-out:** Added seeded version-1 areas, shared hours editing with demo
role checks and audit history, optional request selection with warn-and-send,
and area names in request details and existing export location fields.
Eight unit files pass, compared with seven before the changes, with zero
failures. All 23 site JS files pass syntax checks. Playwright discovers 224
cases, including one desktop-only test skipped by the phone project, but
server socket creation is blocked. JS + CSS is **196,467 bytes**. Security
checklist in README.md: 12 PASS, 0 FAIL, 0 N/A. Working tree only.

**Draft follow-up:** Restored route-based activity draft cleanup and included
the Areas add and edit routes. The shared editor already initializes a fresh
draft when the activity, section or area changes. That key makes a blanket
reset on path changes unnecessary for Areas. Sheets still close on path changes.

## 8. Firefox-only scroll fallback — IMPLEMENTED, Chromium and FPS validation pending

Opened 2026-11-18 before implementation. CSS still paints rounded shadows
and the clipped rear lens. The supplied Firefox measurements support removing
both. Local baseline: eight unit files pass and Playwright lists 224 cases.
Git history and live reads are outside the no-git and no-network task scope.

**Close-out:** Added the Firefox-only shadow reset, disabled the rear lens,
and preserved state markers with borders and outlines. All eight unit files
and 23 site JS syntax checks pass. Playwright lists 232 cases, including six
Firefox cases that passed with local files served through request interception.
Sandbox restrictions block the parity server and Chromium launch. Post-change
FPS remains unmeasured. JS + CSS: 197,882 bytes. Security checklist in README:
12 PASS, 0 FAIL, 0 N/A. Working tree only.

## 9. Show area hours to everyone browsing activities — IMPLEMENTED, browser validation pending

Premise: the list only counts areas for managers and detail hides hours in
collapsed panels. Local baseline: eight unit files pass. The task excludes
git history and production reads.

**Close-out:** Activity cards show area counts, today's hours and exceptions
starting within 14 days. Detail cards show the full week, exceptions within
60 days and sample contact details where available. All eight unit files pass
with zero failures, matching the local baseline. All 23 site JS files and the
updated spec pass syntax checks. An offline visitor DOM check passed.
Playwright discovers 234 tests, including both new visitor cases. The sandbox
blocks the parity server, so the browser and phone width checks are pending.
JS + CSS is **198,977 bytes**. README security checklist has 12 PASS, 0 FAIL,
0 N/A. Working tree only.

## 10. Five selectable designs — implemented locally, Chromium verification pending

Opened 2026-11-18, approved by Joseph at 13:52. The d13f453 shell loads one
stylesheet and has no design control. Port the three reference designs onto
the current routes, add the warm-paper variant and preserve #8 and #9.
The local baseline passes all eight unit files. Local branch only.

**Close-out, 18 Nov.** Home has five design previews and the sticky banner
switches designs on every route. The choice persists and can be shared before
the hash. Scoped assets retain the reference artwork, #8 Firefox treatment
and #9 public area schedules. Largest initial code payload is **218,269
bytes** against the documented **220,000-byte** budget. All 67 unit tests
passed versus 64 on d13f453. Each design passed 224 applicable Firefox
behavior cases across desktop and phone. All 25 final 1920px Firefox scroll
measurements met 55 fps. Security review was 12 PASS, 0 FAIL and 0 N/A.
Changes remain uncommitted on theme-switcher. The sandbox blocked Chromium
and local server binding. See [SWITCHER-NOTES.md](SWITCHER-NOTES.md) for
the per-route measurements, intermediate outlier and outstanding checks.

## 11. Staff Queue layout across five designs — complete locally

Opened 18 Nov at Joseph’s request. The supplied live Firefox reproduction and
the Current stylesheet on theme-switcher confirm that the toolbar, tabs and
fields lose their layout wrappers. Fix these groups and card chips, inspect
the related staff routes and verify desktop and phone layouts across designs.

**Close-out, 18 Nov.** All five designs passed the Queue layout regression at
390, 900, 1024, 1280 and 1920 px. Reviewed 20 Queue screenshots and five phone
card screenshots, plus the eight requested staff routes. The unit suite passed
67/67. Firefox passed 225 behavior cases per theme and 41 switcher and
Firefox-specific cases. Largest initial payload was 219,045 of 220,000 bytes.
Security checklist totals were 12 PASS, 0 FAIL and 0 N/A. See the
[layout notes and screenshots](SWITCHER-NOTES.md#backlog-11--staff-queue-layout).
The sandbox blocked the configured parity server and Chromium launch.
Local working tree only, based on `d13f453`, alongside uncommitted #10.

## 12. Feedback and suggestions — implemented and verified in Firefox

Opened 18 Nov at Joseph’s request. At `270879e` the shared shell has no feedback
control, store or staff inbox. Add browser-local submissions across all five
designs, with a Marketing review queue and on-demand assets. Joseph’s 16:24 update adds
a user-clicked, prefilled public GitHub issue and a disabled future relay adapter.

**Close-out, 18 Nov.** All pages offer browser-local feedback with optional
public GitHub issue drafts. Marketing can review, filter, copy, export and
manage entries from the Queue. Reset clears the inbox. The repository owner
creates the GitHub label.

All 72 unit cases passed versus 67 on the base commit. Each of the five
designs passed 242 applicable Firefox cases, plus 41 design and Firefox
checks across the suite. All 15 scroll measurements reached 59–60 FPS.
The largest initial payload is 219,491 / 220,000 bytes, with 12,411 bytes
of feedback code and CSS loaded on demand. Security checklist totals were
12 PASS, 0 FAIL and 0 N/A. Chromium remains pending because its launch and
the configured local server were blocked here. The local branch is based on
`270879e` with an uncommitted working tree and a read-only git directory.
[Measurements, tests and screenshots](docs/FEEDBACK-NOTES.md).

## 13. Send feedback to the shared relay — implemented and verified in Firefox

Opened 18 Nov. Joseph chose the Cloudflare relay at 17:54. At `56ccbaf`
(`origin/main`) the form saves locally and the relay adapter is empty.
Wire the deployed Worker to the form and Marketing inbox, keeping the local
copy first. The owner reports the Worker is awaiting secrets (503).

**Close-out, 18 Nov.** Browser-first saving, delivery status, explicit
staff retry and conditional Turnstile are implemented on `relay` at base
`56ccbaf`. The deployed Worker source matches the supplied copy. Setup
requires the public widget key and two Worker secrets.

All 74 site unit cases and 9 Worker cases passed. Firefox passed 297
browser cases per design, with zero new failures against #12. All 15
scroll cases reached 58.5–60.0 FPS. Largest initial design
219,528 / 220,000 bytes. Security checklist 12 PASS, 0 FAIL, 0 N/A
(offline audit). The sandbox blocked the stock parity server and live DNS.
The work is local and uncommitted because `.git` is read-only.
[Tests, limitations and measurements](docs/FEEDBACK-NOTES.md#13--shared-feedback-relay-18-nov).

## 14. Feedback page-capture engine — open

Item 1 in Joseph’s 23 Nov feedback capture brief. At main `205a830`,
the feedback sheet has no capture hook and the history has no capture engine.
A read-only Pages check matched the feedback module at that commit. Build
local Canvas reconstruction for public views, with masking and refusal checks. The brief leaves the
editor, relay, storage and deployment for separate work.

**Round 1 opened, 23 Nov.** The refuter and tester reports on PR #1
identify Night Wall Home refusal, overly obscured previews, unapproved
wizard paths and weak browser fidelity assertions. Recheck those cases on
the existing branch and retain the review's capture-only scope.

**Round 1 close-out.** Night Wall and Night Wall Light Home capture at
scroll zero on phone and desktop. The engine validates wizard and poster
SVGs against the theme originals, refuses obscured output and preserves
public calendar and activity context. Chromium passed all 17 reference
comparisons. The Night Wall wizard reference failed with its draw removed
and passed after restoration. Unit cases passed 74/74, relay cases passed
9/9, and full Chromium parity passed 319 tests versus 285 on main. The same
15 Firefox cases could not launch on either revision because the executable
was missing. Security checklist 16 PASS, 0 FAIL, 1 N/A. Item #14 remains open
for PR #1 review.

**Round 3 opened, 23 Nov.** The review found that the first capture refuses a
keyboard resize or backdrop scroll, and that Mission Control and Ribbon Glass
Home lack approved artwork. Fix both on PR #1. Main `205a830` predates the
engine. The earlier read-only Pages check matched main, and this session's
Pages request could not resolve the host.

**Round 3 close-out.** Capture measures the opening page, then draws on
demand after keyboard resize or backdrop scroll. Mission Control and Ribbon
Glass Home use verified theme originals. Desktop and phone tests cover both
Home references, added paths, deferred capture and tinted masks. Unit cases
passed 74/74 against main’s 73/73. Relay passed 9/9 on both. Syntax, PNG and
size checks passed. Night Wall Light measured 219,608 of 220,000 initial
bytes. Security checklist totals are 16 PASS, 0 FAIL, 1 N/A. Playwright
discovered all 303 main test names plus 48 capture cases, but the sandbox
blocked loopback before any cases ran on either revision. Item #14 remains
open for browser verification and PR #1 review.

**Round 3 browser follow-up opened, 23 Nov.** The browser run on `09add8e`
showed six failures in the two Home references and the tinted-mask case.
Finish the same round on PR #1. The live Pages feedback module returned
HTTP 200 and matched `main` byte for byte in a read-only check.

**Round 3 browser follow-up close-out.** Mission Control Home paints its
computed radial gradients and the SVG validated against its theme generator.
The Mission Control and Ribbon Glass references now hide the SVG through a
presentation attribute, and the tinted-mask fixture uses CSS properties that
take effect under the site's CSP. The first-capture-after-resize-and-scroll
test passes on desktop and phone-390. The focused run passed 46 tests with
2 expected skips. Chromium parity passed 331 tests versus 285 on `main`,
with no failing names. The shim had the same 15 missing-Firefox launch
failures on both revisions, and all 15 passed on both with the installed
Firefox. Unit and relay tests passed 74/74 and 9/9. Night Wall Light measured
219,528 of 220,000 bytes. `js/theme.js` matches `main`. Security checklist
totals remain 16 PASS, 0 FAIL, 1 N/A. Item #14 is ready for PR #1 review.

## 15. Feedback screenshot markup editor — implemented and verified

Item 2 in Joseph’s 23 Nov screenshot feedback brief. Main `d2813fb`
has a masked capture engine but no editor. A read-only Pages check matched
the feedback and capture modules to main. Add optional in-sheet markup and an
in-memory JPEG preview. Keep the text relay and its payload as they are.

**Close-out (23 Nov).** Added the two-question prompt, optional screenshot
markup with touch and keyboard controls, and a removable JPEG preview. Cancel
and Close return to the same draft. The browser regression confirmed the same
text POST bytes on this branch and main. Unit tests passed 77/77 vs 74/74.
Relay tests passed 9/9 on both revisions. Official Playwright browsers passed
364 tests vs 346 on main, with the same five skips and no failing test names.
All 40 JavaScript files passed syntax checks. Night Wall Light remains at
219,528 of 220,000 initial bytes. Security checklist totals are 17 PASS,
0 FAIL and 1 N/A. Ready for PR review.

**PR #2, fix round 1 (23 Nov).** Keep the editor off on Pages while
screenshot delivery is pending. Address the phone layout, destructive
controls and test gaps from the review on the existing branch.

**Round 1 close-out.** The editor requires a loopback address and an explicit
flag. The public form keeps the new prompt and sends the same POST bytes as
main. The phone editor uses the available width with Save and Cancel in view.
Remove asks for confirmation, and a backdrop tap or body-focused Escape keeps
the marks and draft. Unit tests passed 77/77 vs 74/74 on main. Relay passed
9/9 on both. Official browser parity passed 370 tests vs 346, with the same
five skips and no failing test names. Both storage mutations, the object URL
mutation and the double-save mutation were caught. Night Wall Light stayed
at 219,528 initial bytes. Checklist totals are 18 PASS, 0 FAIL and 1 N/A.
Round 1 is ready for review on PR #2.

## 16. Feedback screenshot caps and validation — verified on branch

Item 3 in the 23 Nov screenshot feedback brief. The branch starts at
`5211f46`, the current `origin/main`. The live Pages feedback module matches
that commit, and the relay reports version 4. The editor is loopback-only,
sends text alone, and the relay has no bounded streaming or JPEG validation.
Add the caps and text fallback. The relay still creates only the text issue.

**Close-out (24 Nov).** The relay caps the streamed body at 8,192 bytes for
text or 368,640 bytes for an image. It checks JPEG structure, rejects optional
metadata, and caps the JPEG at 262,144 bytes and 1,280 pixels on the longest
edge. It discards accepted images and reserves text capacity through a
separate image allowance. The editor stays loopback-only and preserves the
draft for **Send text only**. Public text POSTs match the captured fixture.
Unit passed 77/77 on both revisions. Relay passed 41/41 vs 9/9. Official
browser parity passed 409 vs 391 with the same five skips and no failing
names. All 40 JavaScript files passed syntax checks. Night Wall Light
measured 219,528 initial bytes on both revisions. Checklist totals are
19 PASS, 0 FAIL, 1 N/A. Ready for PR review.

**Round 1 of 3 opened (24 Nov).** The PR #3 review reproduced image attempts
spending text slots, oversized text spending a slot, and failed image sends
without a text fallback. The relay charges image attempts before Turnstile
and the suite misses a skipped image challenge. Fix these five findings on
the existing branch. The live Pages client matches main at `5211f46`, and
the live relay reports version 4.

**Round 1 close-out.** Image requests use their own buckets after Turnstile.
Oversized text returns 413 before the limiter. Any failed image send keeps the
draft and offers **Send text only**. A failed check on a valid JPEG returns
403 with zero GitHub issue calls. The supplied repro confirmed all five
sender and 30 global text slots after image traffic.
Unit passed 77/77 on both revisions. Relay passed 44/44 vs 9/9. Official
browser parity passed 421 vs 391 with the same five skips and no failing
names. All 68 JavaScript files passed syntax checks on both revisions.
Night Wall Light stayed at 219,528 initial bytes. All five mutations failed
their suites and were restored. Checklist totals are 19 PASS, 0 FAIL, 1 N/A.
Ready for Tester re-review on PR #3.

**Round 2 of 3 opened (24 Nov).** The refuter found an unready Turnstile
retry, unverified image traffic reaching siteverify without a rate limit, and
missing upstream-call assertions. Fix these on PR #3. The production Pages
modules match main at `5211f46`, and the live relay reports version 4.

**Round 2 close-out.** The text retry keeps an unspent check or waits for a
fresh one. A widget error keeps the draft in the browser. Images get four
attempts per sender per minute per isolate before siteverify. The text status
sequences match main, including five sends per sender and 30 globally.
The capacity test counts upstream calls and catches an issue POST on 429.
Unit passed 77/77 on both revisions. Relay passed 45/45 vs 9/9. Official
browser parity passed 433 vs 391 with the same five skips and no failing
names. All 68 JavaScript syntax checks passed. Night Wall Light measured
219,528 initial bytes. Checklist totals are 19 PASS, 0 FAIL, 1 N/A.
All six scratch mutations were caught and restored. PR #3 is ready for
Tester re-review.

## 17. Private relay screenshot storage — verified on branch

Item 4 in the relay storage brief. Base `948caa1` validates JPEGs, then
discards them. The production Pages feedback module matches the base and the
Worker reports version 4. Add private release-asset delivery, preserve the
text issue on partial failure, and verify retry behavior with stubbed GitHub.

**Close-out (24 Nov).** Accepted JPEGs go to the private `feedback-screenshots`
release. A full or immutable release leaves the issue text and a screenshot
failure note. The visitor gets image confirmation after the upload and issue
link succeed. Durable receipts deduplicate visitor and staff retries after
an image attempt. The editor remains loopback-only. Replacing the editor
sheet removes its Escape listener, and a stalled check saves the draft after
eight seconds.

Unit passed 77/77 on both revisions. Relay passed 67/67 vs 45/45. Browser
parity passed 445 vs 433 with the same five skips and no failing names. Syntax
checks passed on 69 source files vs 68. Night Wall Light stayed at 219,528
initial bytes. All three required relay mutants failed. The checklist records
21 PASS, 0 FAIL and 2 N/A. The Worker deployment and real private download
check remain pending approved activation.

## Parking lot
- Pointer-following light on glass cards (cut per the plan's cut order).
- Real shared storage so every visitor sees the same calendar (needs a hosting answer).
- Previous 100 KB budget concern resolved by owner-approved 200 KB budget for #3; keep future changes lean.

- Hours #5: overnight hours, repeating closures, per-person read state, manager
  accounts, requester status-page hours, prefilled activity-request link remain out
  of scope. Owner may revise S56 to reflect partial activity administration; parity
  inventory rows were deliberately unchanged.
