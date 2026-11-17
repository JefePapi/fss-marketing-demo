# Marketing request demo — sample data, unofficial

**Unofficial prototype for 52 FSS Marketing review. Not an official Air Force or government site.**
Every event, name and email in it is made up. Nothing typed into it is sent anywhere.

Intended address: `https://jefepapi.github.io/fss-marketing-demo/` (GitHub Pages, repo `fss-marketing-demo`).

## What the demo shows (about one minute)

1. **One request, typed once.** Tap *Marketing for an event or program*, then *Fill with sample answers*.
2. **Tick what you need** (flyers, Flash magazine, sponsors…). Today that is several separate forms.
3. **Send request → one number** (`MKT-26-0142` on a fresh browser).
4. **See it as staff (demo):** one request, a lane per service, each with its own status and owner.
5. **Calendar:** the event is already on the rolling 12-month calendar. Nobody typed it into Excel.
6. **Download → Rolling Calendar (.csv):** the sheet's own 16 column headers, plus STATUS, TYPE and REQUEST # at the far right.
7. **Copy link for Teams:** a read-only calendar link that can be pinned as a Website tab.
8. **Non-event work:** Home → Something that isn't an event → website change or Flash notice. No calendar entry.
9. **Files and updates:** attach sample files, download the original bytes, add Cc, send messages, close/reopen, print, and find your requests by email.
10. **Staff work:** priority and due filters, auto-assignment, On hold, saved replies, contact edits, move/add parts, related requests, merge duplicates, request CSV and reports.
11. **Email preview and log:** simulated receipts, assignment, replies, completion, reminders and re-send. **Demo: nothing is sent.**

## Limits — please read

- **Data is per browser.** It lives in that browser's `localStorage`. A request sent on one phone does not appear on another computer.
- **The read-only link is not a live shared calendar.** It shows the sample events plus whatever *that* browser added. It is a display mode, not security.
- **Clearing browser data, or Reset demo data, returns to the 36 samples.**
- **No email is sent; the email log is simulated. There are no logins.** Staff view is a switch in the header.
- **Files never leave the browser.** Metadata lives with the request in localStorage; original bytes live in IndexedDB (`mktdemo-files`). Max 25 per picker, 15 MB each, approved extensions printed beside the picker. Reset clears the files database. If IndexedDB fails, bytes remain in memory for this page view and a note explains that limitation. A later visit may have metadata without downloadable bytes.
- **Status lookup asks for number and requester/Cc email. Direct `#/status/<number>` links are a demo shortcut**, including confirmation and copied staff links; they open without an email check. This is a local demo convenience, not access control.
- **Remember my details** stores name, email, optional phone and Cc on this device only. Untick it and send to forget them. Use sample details.
- **The 60-day lead-time note is a sample rule.** Section codes are illustrative.
- If the browser blocks storage (private mode, some Teams tabs) the demo still works from memory and says so in the footer.
- A real version would store requests on a server so everyone sees the same calendar. That part needs a hosting decision.

Not built on purpose: real email, server uploads, accounts, repeating events, proofing rounds, hiding money fields, admin screens, shared data between visitors, dark mode.

## Run it locally

No site build or runtime packages. The owner approved the already-installed `@playwright/test` development dependency for BACKLOG #3; do not run npm install in the sandbox. ES modules need `http://`, so opening `index.html` from disk will not work:

```
python3 -m http.server 8000      # then open http://localhost:8000/
node --test tests/*.test.mjs          # unit tests
npm run test:parity                    # desktop + phone browser tests
npm test                               # unit + parity
```

## Files

```
index.html            shell: demo banner, header, <main id="app">, footer; CSP + noindex
404.html              sends unknown addresses back to the home page
css/app.css           tokens, glass, layout, components, reduced motion, fallbacks
js/app.js             hash router, header nav, staff / read-only mode, Pause motion
js/config.js          services, teams, facilities, fake staff, lead-time rule, labels, the 16 headers
js/store.js           load / save / reset, memory fallback, number counter
js/files.js           IndexedDB bytes, memory fallback, pickers and original downloads
js/actions.js         simulated outbox, assignment, email matching and merge actions
js/seed.js            36 invented requests (dates relative to today), holidays
js/model.js           pure: overallStatus, heskTicketCount, leadTime, calWindow, calendarEvents
js/export.js          pure row builders + CSV / XLS / ICS strings, download helper
js/ui.js              h() DOM helper, form controls, toast, sheet/popover, clipboard
js/views/             home, request, other, sent, status, staff-queue, staff-request, reports, calendar, about
tests/                model, export and seed tests for `node --test`
robots.txt  .nojekyll  AGENTS.md  BACKLOG.md
```

## Routes (all inside the hash)

`#/` · `#/request` · `#/other` · `#/sent/<number>` · `#/status` · `#/status/<number>` ·
`#/staff?team=all|design|flash|sponsorship|web&show=open|mine|unassigned|all|overdue|duesoon` · `#/staff/<number>` · `#/staff/reports` ·
`#/calendar?view=month|list&m=YYYY-MM&svc=…&status=…&section=…&d=YYYY-MM-DD&readonly=1` · `#/about`

## Hooks for a browser test (ids; most also carry the same `data-test`)

| What | Selector |
|---|---|
| Demo banner / footer | `#demo-banner`, `#site-footer` |
| Start the form | `#start-request` |
| Form step container (one at a time) | `#step-1` … `#step-4` (`data-test="step-N"`), text in `#step-label` |
| Fill with sample answers | `#fill-sample` |
| Fields | `#f-name #f-email #f-phone #f-facilityId #f-title #f-description #f-date #f-multi #f-endDate #f-start #f-end #f-allDay #f-where #f-cost #f-est` |
| Yes/No taps (radios) | `#f-joint-yes|no`, `#f-signup-yes|no`, `#f-afConnect-yes|notyet|no` |
| Lead-time note | `[data-test="lead-note"]` (`data-late="1"` when inside the window) |
| Service checkboxes | `#svc-print #svc-social #svc-screen #svc-flash #svc-sponsorship #svc-web #svc-calonly` |
| "Old way" line on the form | `#old-way-line` |
| Back / Continue / Send | `#btn-back`, `#btn-next` (`data-test="next"`), `#btn-send` (`data-test="send"`) |
| Confirmation number | `#confirmation-number` |
| After sending | `#sent-status`, `#sent-staff` (`data-test="see-as-staff"`), `#sent-another`, `[data-test="sent-team"]` |
| Status page | `#status-number`, `#status-go`, `[data-test="team-line"]`, `#needs-you`, `#status-message`, `#status-send`, `#not-found` |
| Staff toggle / acting as | `#staff-toggle`, `#acting-as` |
| Queue | `#team-all|design|flash|sponsorship|web`, `#show-open|mine|unassigned|all`, `#queue-search`, `[data-test="queue-card"][data-request="MKT-…"]` |
| Staff request | `#overall-status`, `#old-way`, `#old-way-detail`, `#facts-edit`, `#facts-save` |
| Lanes | `[data-test="lane"][data-service="print"]`; status `select[data-test="lane-status"][data-service="print"]` (also `#lane-status-j1`); owner `select[data-test="lane-owner"]…`; `[data-test="lane-reason"]`; `#add-part`, `#btn-add-part` |
| Lane status values | `new` `inprogress` `waiting` `onhold` `done` `declined` |
| Calendar card | `#cal-status` (`notconfirmed` `good` `cancelled`), `#cal-reason`, `#cal-cancel-confirm`, `#cal-type`, `#cal-section`, `#cal-actual` |
| Thread | `#thread-text`, `#thread-about`, `#btn-reply`, `#btn-note`, `[data-test="thread-reply"]`, `[data-test="thread-note"]` |
| Calendar views | `#view-month`, `#view-list`; current one has `aria-current`; `#calendar-body[data-view]` |
| Calendar months | `#m-YYYY-MM`, `#month-prev`, `#month-next`, `#month-title`, list banners `#mon-YYYY-MM` |
| Calendar events | `[data-test="cal-event"][data-request="MKT-…"]`, day cell link `#day-YYYY-MM-DD`, `#day-panel`, detail `#event-detail`, `#sheet-close`, `#open-request` |
| Filters | `#filter-svc-print` … `#filter-svc-calonly`, `#filter-status-good|notconfirmed|cancelled`, `#filter-section`, `#filter-clear` |
| Exports | `#download-toggle` (open the menu first), `#export-csv`, `#export-xls`, `#export-ics`, `#export-events-only` |
| Share link | `#copy-link`, then `#share-link` (the URL is its value); `#readonly-tag` shows in read-only mode |
| Reset | `#reset-demo` (About), `#reset-demo-staff` (Queue), then `#confirm-yes` |
| Motion | `#pause-motion` |

### Parity-pass hooks

| What | Selector |
|---|---|
| Contact and preferences | `#f-cc`, `#f-cc-err`, `#email-suggest`, `#f-remember`, `#f-bystaff` (staff view only) |
| Per-size quantities / in hand | `#f-qty-a6 #f-qty-a5 #f-qty-a4 #f-qty-a3 #f-qty-a1`, `#f-inHand` |
| Home | `#start-other`, `#before-you-send` |
| Non-event request | `#o-kind-web #o-kind-flash`, `#o-name #o-email #o-phone #o-title #o-text`, `#o-url #o-old #o-new`, `#o-files #o-send` |
| Bot trap and refusal (both forms) | `#f-website`, `#send-refused` |
| Request files | `#f-files #f-files-err #file-limits`, `[data-test="file-item"]` with Remove; other picker errors use `<picker-id>-err` |
| Download original bytes | `[data-test="attachment"]`, `[data-test="attachment-download"]` |
| Receipt and email log | `#email-preview`, `#email-log`, `[data-test="email-entry"][data-trigger]`, `#resend-receipt`, `#reply-noemail` |
| Status lookup / forgot number | `#status-number #status-email #status-go`, `#forgot-email #forgot-go`, `[data-test="my-request"]` |
| Status facts / answers / dates | `#status-details`, `[data-test="part-answers"]`, `#status-dates` |
| Requester message files / close / reopen | `#status-files`, `#withdraw-open #withdraw-reason #withdraw-confirm #reopen` |
| Print (both request pages) | `#print-request` |
| Requester URL / merged forwarding | `#copy-requester-link #requester-link`, `#merged-note` |
| Queue filters / badges | `#queue-status #queue-priority #show-overdue #show-duesoon`, `[data-test="overdue"]`, `[data-test="new-reply"]` |
| Priority / assignment / reminder | `#req-priority`, `[data-test="lane-autoassign"]`, `[data-test="lane-remind"]` |
| Flash section | `#lane-flashsection-<jobId>`, `[data-test="lane-flashsection"]` |
| Move work | `[data-test="lane-move"]`, `[data-test="lane-move-go"]` |
| Thread files / saved replies | `#thread-files`, `#canned` |
| Edit contacts | `#f-req-name #f-req-email #f-req-phone #f-req-cc` |
| Related / merge | `#related-input #related-add`, `[data-test="related-link"]` with Remove, `#merge-into #merge-go #merge-error #confirm-yes` |
| Other requests from this person | `#other-requests`, `[data-test="other-request"]` |
| Request CSV / reports | `#export-requests #go-reports`, `#report-month #report-team #report-staff #report-facility` |

The seeded example request is the first one (`MKT-26-0106`, Fall Fest 5K) while the clock is in 2026.

## Build record (BACKLOG #1, 2026-11-17)

**Checked by the builder:** `node --check` passes on every `.js` file; every import resolves to an export; no `innerHTML`, `fetch`, inline style or inline handler anywhere in the site.

**Not checked by the builder — the tester must do these first:**
- The site has **not been opened in a browser** (the build task allowed no server, and ES modules do not load from `file://`).
- The unit tests in `tests/` are **written but were not run** (running scripts was not permitted in the build session). Baseline is zero tests; all should pass. Run `node --test tests/*.mjs`.

**Plan items skipped or changed**
- Pointer-following light and card tilt: skipped (first on the plan's cut list). Hover lift on cards is in.
- Size budget: **about 121 KB of JS + CSS, over the plan's 100 KB target.** No images, no fonts.
- Repo name is `fss-marketing-demo` (build brief) instead of the plan's `mkt-one-request-demo`.
- Service extras (sizes, how many, break-even…) are all optional, to keep the form short.
- List view shows all 12 months; the month strip jumps to a month instead of paging.
- Calendar-only requests have no lanes, so they show in the queue under **Everything**, not **Open**.
- The plan's facility "Information, Tickets and Travel" is named "Trips and Travel" here, so the word "ticket" never shows on requester screens. It appears only on the staff-side "Old way" chip and in the sheet's own `DATE OF TICKET SUBMISSION` header inside the downloaded file.
- Test notes: with a day selected in month view, an event has two `[data-test="cal-event"]` buttons (grid and day panel), so scope to `#month-grid` or `#day-panel`. Lane reason, due date, section, attendance and notes save on change without redrawing the page.
- Not done here (needs the owner's OK): creating the repo, pushing, switching on Pages. Real Teams tab check is the tester's.

## Security checklist (this change)

| Item | Result | Reason |
|---|---|---|
| No login or permission guard removed | N/A | None exist; staff view is a labeled demo switch |
| No new packages | PASS | Zero packages, no build step |
| Dependency audit | N/A | No dependencies to audit |
| No secrets, tokens or real personal data | PASS | Seeds are invented; emails end `@example.com`; no phone numbers |
| No data leaves the browser | PASS (by code) | CSP `connect-src 'none'`, `form-action 'none'`; no network code. Network-tab check is on the tester's list |
| Typed text never rendered as HTML | PASS | All DOM built with text nodes via `h()`; XLS export escapes `& < > "` |
| CSV formula neutralizing | PASS (by code) | Cells starting `= + - @` get a leading `'`; test written, not yet run |
| File-format checks (CSV / XLS / ICS) | NOT VERIFIED | Tests written, not run; opening in Excel and a calendar app is on the tester's list |
| No seals or official marks | PASS | Plain outlined compass icon and words only |
| noindex | PASS | Meta tag and `robots.txt` disallow all |
| Sheet paste file not read or copied | PASS | Never opened; headers came from the plan |

Counts: 8 PASS, 0 FAIL, 2 N/A, 1 not verified (waiting on the tester). Checklist rows marked "by code" also need the tester's browser check.

## Tester's by-hand list (390 px and 1280 px)

1. Home → form → Fill with sample → tick Flyers, Social, Flash, Sponsors → check screen shows every fact once → Send → `MKT-26-0142`.
2. A date three weeks out shows the lead-time note and does not block Send; staff view shows **Late request**.
3. Back from step 3 to step 2 keeps every answer; reload on step 3 keeps them too.
4. Check status by number shows three team cards; an unknown number gives the plain "not found" message.
5. Staff view → Queue: the new request is first under All, Design, Flash and Sponsorship, absent under Web.
6. Open it: 4 lanes, chip says "Old way: 3 separate tickets". Set a Design lane to In progress, assign Maya Chen → overall status In progress → status page shows it.
7. Set a lane to Waiting on requester and reply → status page shows the highlighted question; a private note does not appear there.
8. Calendar: the event is on its day in grid and list; the detail opens and closes by keyboard (Esc).
9. Staff edits the event date → the calendar moves it; History logs the change.
10. Cancel with a reason → still on the calendar, struck through; CSV has the reason in Notes and `Cancelled` in STATUS.
11. CSV opens in Excel with the 16 headers, month banners and empty days. `.xls` opens after the prompt. `.ics` imports.
12. Copy link for Teams → open in a private window → list view, no staff toggle, no Reset, banner and footer present, Download works.
13. Reset demo data → 36 samples; next number is 0142 again.
14. Reduced motion (system setting or Pause motion) → no drifting light, no lifts; still looks like glass.
15. Keyboard only through the whole flow; no sideways scroll at 320 px; usable at 200% text.
16. Network tab: zero requests after load. Console: no errors, no CSP violations.
17. In real Teams: add a Website tab with the read-only link and report the result either way.


## Polish record (BACKLOG #2, 2026-11-17)

Stronger blue/teal light forms, translucent navy header, 45–60% outer glass,
80–82% reading surfaces, glossy navy actions, pill tabs and illuminated selections.
The existing Pause motion and reduced-motion rules still control all animation.
Unsupported backdrop-filter gets solid surfaces. Dark text stays on dense backing;
rendered AA contrast, mobile layout and motion remain browser-verification items.
Calendar chips, agenda and details, and staff event details show military ranges
such as `0800–1100`. Stored HH:mm values, requester displays and exports stay unchanged.
An embedded SVG favicon needs no extra file or request. Test commands are corrected.

Validation: `node --test tests/*.mjs` passes all 3 test files, matching main
`b04e01a` (3 pass, 0 fail), with added military-time edge-case coverage.
`node --check` passes all 15 JavaScript files; `git diff --check` passes.
CSP and changed views' id/data-test hooks match the baseline; favicon SVG parses.
JS + CSS: 124,076 bytes versus 122,365 on main (+1,711 bytes, about 1.4%).
The pre-existing 100 KB budget violation remains; tracked in BACKLOG's parking lot.
No server or browser session, commit, push or deployment was performed.
Branch creation was denied by the sandbox's read-only .git; the working tree is on
main at b04e01a with uncommitted edits. No independent tester verdict is claimed.

### Security checklist for polish #2

| Item | Result | Reason |
|---|---|---|
| No login or permission guard removed | PASS | Demo staff/read-only controls untouched |
| No new packages | PASS | No packages added |
| Dependency audit | PASS | No manifests, lockfiles or third-party dependencies exist |
| No secrets, tokens or real personal data | PASS | Diff adds presentation, formatting and fictional test times only |
| No data leaves the browser | PASS | CSP byte-identical; no network APIs added; favicon embedded |
| Typed text never rendered as HTML | PASS | Existing h() text-node handling untouched; no innerHTML |
| CSV formula neutralizing | PASS | Export implementation unchanged; export tests pass |
| File-format checks (CSV / XLS / ICS) | PASS | Export suite passes; SVG parses; JS syntax and whitespace checks pass; external-app import not exercised |
| No seals or official marks | PASS | Favicon uses the existing generic compass motif |
| noindex | PASS | Existing meta and robots.txt unchanged |
| Sheet paste file not read or copied | PASS | No sheet file accessed |

Counts: **11 PASS, 0 FAIL, 0 N/A** (source and automated checks; browser checks pending).

## Parity

[docs/PARITY.md](docs/PARITY.md) is the owner's inventory. Its rows are unchanged.
`tests/parity.spec.mjs` has exactly one test per COVERED or DEMO-STUB row: 78 tests,
run at 1280 px and 390 px (156 project cases). A unit guard checks exact titles,
missing rows, duplicates and unexpected rows. Each row exercises the UI; file
checks read downloaded bytes, and print checks stub `window.print`.

- `npm run test:parity`: local server on 4173, both existing projects.
- `npm run test:live`: same tests against the configured Pages address. Run only when network use is authorized.
- `npm test`: unit tests followed by browser parity.

All scenarios start with fresh browser storage. Dates and numbers use the current
year/day. No shared server data or real email is used. Request-list export respects
team/show/search/status/priority filters. Reports derive counts from surviving
requests. The calendar and calendar exports omit non-event and merged requests.
Printing keeps the demo banner and unofficial footer.

### BACKLOG #3 validation and limits

Local base: main `0b90329`; measured baseline: 3 unit test files pass, 0 fail.
After this pass: 5 unit test files pass, 0 fail (including parity guard and pure
model/action/report tests). All site JS syntax checks pass. Playwright discovers
78 tests in each of the unchanged desktop and phone projects.

Browser execution was attempted with `npx playwright test --workers=2`, but the
sandbox refuses the local server socket with `PermissionError: [Errno 1]
Operation not permitted`. **Browser parity and visual behavior remain unverified**;
the owner's agent must run the suite outside this sandbox. No production read,
commit, push or deployment occurred. No independent tester verdict is claimed.

Inventory wording to review: R12's capability title says 13 Flash sections, while
the authorized demo scope asks for about 8 sample names; this build has 8.
S44 simulates overdue visibility; scheduled reminder delivery remains production
work, as the inventory's explanation states.

### Security checklist for parity #3

| Item | Result | Reason |
|---|---|---|
| No login or permission guard removed | PASS | Demo staff/read-only switches retained; number lookup now also checks email; direct links documented as shortcuts |
| No unapproved package | PASS | Only owner-approved, preinstalled test-only @playwright/test; no install; no runtime dependency or build |
| Full dependency audit | PASS | `npm audit --offline --json` reports 0 vulnerabilities across 3 development dependencies; offline result is not a fresh advisory check |
| No secrets or real sample data | PASS | Invented people and @example.com addresses; sample phone left blank; no official imagery |
| Files never leave the browser | PASS | File bytes stored only in IndexedDB or memory; metadata in localStorage; no upload/network code |
| Typed text never rendered as HTML | PASS | Text nodes through h(); no innerHTML; attachment SVG/HTML-like contents are downloaded, never embedded |
| Download filenames sanitized | PASS | Path separators and control characters replaced; original ordinary filenames retained; Blob URLs revoked |
| CSV formula neutralizing | PASS | Request CSV reuses safeCell/toCSV; formula and multi-lane export tests pass |
| File-format checks | PASS | CSV/XLS/ICS tests, metadata/quantity/report tests, all JS syntax and diff whitespace checks pass; external-app imports and browser downloads await tester |
| CSP unchanged | PASS | index.html byte-identical to baseline; connect-src and form-action remain none |
| No seals or official marks | PASS | No imagery added |
| noindex | PASS | Existing meta and robots.txt retained |

Counts: **12 PASS, 0 FAIL, 0 N/A** for source/offline checks. Browser verification
is pending and is not represented as a passed check.

### Tester's parity list (390 px and 1280 px)

1. Run `npm test`; all 156 browser project cases must pass. Inspect failures, traces and console/CSP errors.
2. Check Cc errors, email typo suggestion, remembered details and per-size quantities.
3. Submit both non-event kinds; verify staff, status, queue, reports and calendar exports.
4. Attach sample files on the request, requester reply, staff reply and private note; download original bytes after reload. Check invalid type, size/count limits, Remove, IndexedDB denial fallback and Reset.
5. Verify number + email lookup and Cc lookup, forgot-number list, withdrawal/reopen, print and copied direct URL.
6. Verify every email trigger in the simulated log, including no-email replies and staff-filed receipts. Nothing should actually send.
7. Check priority ordering, status/team/search filters, overdue/due-soon views, auto-assignment, On hold, moving parts, saved replies and new-reply clearing.
8. Merge duplicates with files/messages/related links; verify old-number forwarding, source removed from queue, invalid merge refusal and report totals.
9. Check request CSV formulas are neutralized and current filters are honored; confirm all reports and print layouts at both widths.
10. Confirm no horizontal page overflow, large tap targets, keyboard focus, banner/footer, motion pause and no network activity after initial assets.

Final size from `wc -c js/*.js js/views/*.js css/app.css`: **155,256 bytes** unminified (approved limit 200,000).
