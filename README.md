# Marketing request demo — sample data, unofficial

**Unofficial prototype for 52 FSS Marketing review. Not an official Air Force or government site.**
Every sample event, name and email is made up. Requests stay in the browser. Saving feedback keeps a local copy and tries to send it privately to Marketing. Visitors can also open a public GitHub draft.

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

### Areas

Open Activities to see each area’s hours today, then choose Bowling Center for weekly hours, upcoming closures and sample contact details.
In Staff view,
Marketing and assigned managers can add, edit or remove areas. New areas start
with a copy of the activity's hours and closures. Manager saves add a Marketing
notification and simulated email. On a new request, choose an area or leave
**Whole activity** selected. Warnings use the selected hours and still allow
sending. Staff facts, status, calendar details and location exports show the area.

## Designs

Choose a preview under **Choose a design** on Home, or use **Design** in the
demo banner on any page. Changing the design keeps the current route and
form inputs. Night Wall opens on a fresh browser. A valid shared link takes
precedence over the design saved on that device.

| Design | Share parameter |
|---|---|
| Night Wall | `?theme=a` |
| Night Wall Light | `?theme=a-light` |
| Mission Control | `?theme=b` |
| Ribbon Glass | `?theme=c` |
| Current (liquid glass) | `?theme=current` |

Copy the address after switching. Put the parameter **before** the hash, as
in `./?theme=c#/request` or `./?theme=b#/calendar?readonly=1`. Short names
`night`, `night-light`, `mission` and `ribbon` also work. Invalid values fall
back to the saved design or Night Wall. The preference uses `mktdemo.theme`.

Run `npm run size` to check the 220,000-byte unminified initial JS + CSS
budget. It includes all initial shared and view JS, base CSS, and the selected
design’s module and stylesheets. The light variant shares Night Wall’s art
and adds one CSS layer. The five local WebP previews are counted separately
from this code budget. See [the #10 verification record](SWITCHER-NOTES.md).

## Feedback

Open **Feedback** in the demo banner or footer on any page. Desktop also has a
floating button that moves clear of page controls. Choose Feedback, Suggestion
or Bug, enter a message and optionally add a sample name. **Save feedback**
saves the local copy first, then makes one attempt to send it privately to
Marketing. The relay receives the type, message, optional sample name, page,
route and design. The relay POST excludes the local timestamp and read marker.
The latest 200 entries stay in this browser under `mktdemo.feedback`.
If browser storage fails, the
sheet explains that changes last for the current page session.

To bring a suggestion to Joseph, choose **Also post to GitHub** after saving
or from a staff inbox row. This opens a public issue draft for
**JefePapi/fss-marketing-demo** in a new tab. Sign in to GitHub, review the
prefilled details and choose **Create** there. Opening the draft shares its
contents with GitHub. The delivery marker tracks only the private relay.
Long messages may be shortened for the link. **Copy as text** keeps the full
submission. The repository owner creates the `feedback` label. The issue link
and the `.github/ISSUE_TEMPLATE/feedback.md` template both request that label.

In **Staff view → Queue → Feedback**, Marketing can filter entries, mark
them read or unread, confirm deletion of one entry and download the current
filter as CSV. Each entry shows **Sent · #12** (its private issue number)
or **Only in this browser**. Use **Try sending again** for one manual retry.
Entries saved before the relay was added are eligible too. The Queue badge
counts unread feedback across all types.
Managers can submit from their pages. Inbox access follows Notifications.
**Reset demo data** clears the browser inbox. Published issues live on GitHub.

The form, inbox, model and feedback CSS load on first use. About, Notifications,
Email log and Reports also load on their own routes. `npm run size` reports
on-demand feedback bytes separately from the initial design budget.
[Verification and screenshots](docs/FEEDBACK-NOTES.md).

### Switch on shared sending

The deployed Cloudflare relay currently awaits configuration. The form
explains a 503, a rate limit, or a failed send and keeps the public GitHub
fallback available. Only a successful relay confirmation displays
**Sent to the marketing team.**

Create a Turnstile widget for `jefepapi.github.io` and set its public
site key in `js/lazy/feedback-relay.js`. Add `TURNSTILE_SECRET` and
`GITHUB_TOKEN` to the deployed Worker as secrets. The latter needs Issues
write access to the private `JefePapi/fss-demo-feedback` repository.
With the public key empty, the browser skips the widget and submits without
a token. Once configured, only opening the feedback form or staff retry
form loads the widget. Submitting makes one credential-free relay POST
with a ten-second timeout. [Worker setup and privacy](relay/README.md).

## Limits — please read

- Native date pickers follow the browser’s locale and may show a different first weekday. The demo month grid runs Sunday to Saturday.

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

Not built on purpose: real email, server uploads, accounts, repeating events, proofing rounds, hiding money fields, account administration, shared data between visitors.

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
css/base.css          design picker, banner control and shared responsive layouts
css/theme-*.css       active design styles and Firefox scroll treatments
js/theme-boot.js      first-paint selection
js/theme.js           registry and interactive stylesheet/artwork swap
js/themes/            lazy hero artwork, icons and wordmarks
img/themes/           local design previews
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
| Feedback | `#feedback-open`, `[data-test="feedback-banner"]`, `[data-test="feedback-footer"]`, `#go-feedback`, `#feedback-count`, `[data-test="feedback-entry"]` |
| Design controls | `#theme-select`, `[data-test="theme-picker"]`, `[data-test="theme-option"][data-theme]` |
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
| Calendar week layout | `#month-head` / `[data-test="month-head"]`: Sun–Sat; `#month-grid > .cell[data-date]`; `.cell.out` has neighbouring day numbers, `aria-hidden="true"` and no links |
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


## Performance and calendar polish (BACKLOG #4, 2026-11-17)

Run `npm run perf:staff` for the manual desktop staff scroll FPS check.

The atmosphere is one fixed background with three soft radial gradients. Hidden
legacy light elements keep the shell unchanged; drift animations and blob filters
are removed. Glass and trays use translucent gradient fills, rims and highlights;
header and panels have no backdrop blur. This removes the area-dependent repeated
backdrop repaint identified in the owner's desktop measurements. Hover lifts only
transition transform; shadow changes are immediate. No will-change is used.
Pause motion still disables transitions and hover lifts, with its existing
aria-pressed control; system reduced motion remains supported.

content-visibility: auto was tried on month blocks, queue cards and thread items
and removed again: measured scroll speed got worse (queue 16 fps vs 60 fps without
it at 1920x1080), because these lists are short. All 12 agenda months stay in the DOM. No scroll/resize listeners
were found. Month grids now use complete Sunday–Saturday weeks with dimmed,
noninteractive neighbouring dates. Day labels already index Sunday first; agenda
and exports group by month/date, with no other week grouping to change.

Validation: pre-change local baseline 5 unit test files passing, 0 failing;
after change 6 passing, 0 failing, including month-boundary, leap-year, year-rollover
and DST-month helper checks. All 20 site JS files pass node --check. Existing
parity titles are unchanged; discovery finds 160 browser cases (156 parity plus
4 new regression cases across desktop/phone). Both npm run test:parity and
npx --no-install playwright test were attempted. The sandbox blocks socket
creation: PermissionError [Errno 1] Operation not permitted. Browser behavior,
visual appearance and the 55+ fps target at 1920×1080 and 2560×1440 idle/scroll
remain unverified and require a browser run where the local server can start.
No independent tester verdict is claimed. No git, network, install, commit,
merge or deployment was performed. JS + CSS: 155,829 bytes (limit 200,000).

### Security checklist for performance/calendar #4

| Item | Result | Reason |
|---|---|---|
| No login or permission guard removed | PASS | Demo staff/read-only controls untouched |
| No new packages | PASS | Existing test tooling only; no install or manifest changes |
| Full dependency audit | PASS | Offline npm audit reports 0 vulnerabilities across 3 development dependencies; no fresh network advisories |
| No secrets or real personal data | PASS | Only CSS, date logic, fictional test dates and docs added |
| No data leaves the browser | PASS | No network APIs or form posts added; no network used |
| Typed text never rendered as HTML | PASS | New calendar cells use h() text nodes; no innerHTML |
| CSV formula neutralizing | PASS | Export code untouched; export unit checks pass |
| File-format checks | PASS | CSV/XLS/ICS unit checks and all JS syntax checks pass; source files decode as UTF-8 with no trailing whitespace; external-app imports untested |
| CSP unchanged | PASS | index.html untouched; existing connect-src/form-action restrictions retained |
| No seals or official marks | PASS | Gradient-only visuals; no imagery added |
| noindex | PASS | index.html and robots.txt untouched |
| Demo labels and stable hooks | PASS | Banner/footer and existing hooks retained; month-head added |

Counts: **12 PASS, 0 FAIL, 0 N/A** for source/offline checks. Browser and FPS
verification remain pending, not represented as passing checks.


## Activities and hours (BACKLOG #5)

Marketing can add, rename and archive sample activities, assign managers, and edit
hours, closures, specials and contact details. Turn on Staff view, then choose
Marketing, Manager A — Avery Lane, or Manager B — Bo Kim. Managers see their assigned,
active activities; editing another activity or activity administration is blocked
both in the view and at the store write boundary. This role switch is a demo,
not a login or production security. Turning Staff view off restores Marketing.

The public activity page shows Sunday–Saturday hours, upcoming closures and
specials, sample contact details and the last update. Notes for marketing, manager
names and history appear only on the staff side. Hours and multi-day closures
support up to two openings per day; overnight hours are outside this demo.
Closures override the weekly hours. The requester form warns about a closed day
or a time outside hours, including on Check and send; **it still allows sending**.
All-day and untimed events receive only a closed-day check. Staff request pages
show activity information and flag hours changes after submission for upcoming
events. Calendar event details show the hours on that particular event day.

Every meaningful save records old → new lines and who changed them. A manager save
also adds an unread marketing notification and a would-email-marketing log entry;
Marketing edits record history only. Saving unchanged information writes no history,
notice, mail or updated timestamp. Read state is shared by marketing staff in this
browser. The global email log also derives request emails from their outboxes.
**Demo: nothing is sent.** Activity history is capped at 50 entries per activity;
activity notices and mail at 100 each; the global email view shows at most 100.

The same 12 facility IDs remain in store version 1 (`mktdemo.v1`). Existing saved
requests and their counter survive the additive upgrade, without a misleading
seeded notice. Fresh data/reset restores 12 activities and one unread bowling
notice with its email preview. Archived activity names remain on old requests;
archived activities leave public lists and new pickers, except an already selected
archived value stays available with an archived label. New IDs are unique slugs.
Calendar entries remain derived from requests; closures do not become events.

### New files and routes

- `js/hours.js`: pure hours lookup, event checks, validation, normalization, diffs,
  edit application, change detection and the shared demo edit rule.
- `js/views/activities.js`: public list/page, My activities and shared compact info.
- `js/views/activity-edit.js`: hours, closures, specials, details, name/managers editors.
- `js/lazy/notices.js`: marketing notifications and global email log.
- `tests/hours.test.mjs`: 23 pure/storage scenarios, including the plan's 22 cases.
- `tests/hours.spec.mjs`: 27 browser scenarios in both existing projects.

Routes: `#/activities`, `#/activities/<id>`, `#/activities/new`,
`#/activities/<id>/edit/hours|closures|specials|details|admin`,
`#/activities/<id>/areas/new`, `#/activities/<id>/areas/<areaId>/edit`, `#/manager`,
`#/staff/notifications`, `#/staff/emails`. Only Marketing can open the last two.
The home Hours and info card and the Activities nav link open the public list.

### Hours hooks

| What | Selectors |
|---|---|
| Role and navigation | `#demo-role`, `#nav-activities`, `#nav-my`, `#nav-notices`, `#notice-count`, `#go-activities`, `#go-emails`, `#go-notices` |
| List and manager list | `[data-test="activity-card"][data-activity]`, `[data-test="activity-archived"]`, `#activity-add`, `#my-activities`, `#pick-role` |
| Activity page | `#activity-name`, `#activity-archived`, `#activity-today`, `#activity-hours tr[data-day="sun"…"sat"]`, `[data-today="1"]` |
| Details and history | `#activity-closures [data-test="closure"]`, `#activity-specials [data-test="special"]`, `#activity-contact`, `#activity-notes`, `#activity-managers`, `#activity-updated`, `#activity-history [data-test="history-entry"]`, `[data-test="change-line"]` |
| Editor links and actions | `#edit-hours`, `#edit-closures`, `#edit-specials`, `#edit-details`, `#edit-admin`, `#activity-save`, `#activity-cancel`, `#edit-errors`, `#no-changes`, `#edit-blocked` |
| Hours editor (day = sun…sat) | `#h-<day>-closed`, `-o1`, `-c1`, `-add2`, `-o2`, `-c2`, `-rm2`, `-err`; `#h-copy-weekdays` |
| Closures (k = row index from 0) | `#closure-add`, `[data-test="closure-row"]`, `#c-<k>-date`, `-to`, `-label`, `-closed`, `-o1`, `-c1`, `-add2`, `-o2`, `-c2`, `-rm2`, `-remove`, `-err` |
| Specials | `#special-add`, `[data-test="special-row"]`, `#p-<k>-title`, `-from`, `-to`, `-text`, `-remove`, `-err` |
| Details/admin | `#a-location`, `#a-description`, `#a-phone`, `#a-email`, `#a-notes`, `#a-name`, `#a-section`, `#a-mgr-mgrA`…`mgrD`, `#a-archived` |
| Role blocks | `#role-blocked`, `#role-to-marketing`, `#edit-blocked` |
| Notifications | `[data-test="notice"][data-read="0|1"]`, `[data-test="notice-read"]`, `[data-test="notice-request"]`, `#notices-read-all` |
| Email log | `#email-log-note`, `[data-test="email-entry"][data-trigger="activity-updated"]` |
| Request info | `#activity-info-wrap`, `[data-test="hours-warning"][data-level="closed|outside"]`, `[data-test="hours-ok"]`, `details#activity-info`, `#activity-info-hours`, `[data-test="closure-near"]` |
| Areas | `#area-add`, `[data-test="area"][data-area]`, `[data-test="area-edit"]`, `[data-test="area-remove"]`, `#area-name`, `#area-save`, `#activity-cancel`, `#f-areaId` |
| Staff/calendar info | `section#activity-card`, `[data-test="hours-changed"]`, `#event-hours` |

### Validation and deviations

Baseline: main `33c7775`, 6 unit files passing, 0 failing. Final: 7 unit files
passing, 0 failing, including 23 new hours/storage cases. Existing parity inventory
and its test file are unchanged. Discovery finds **214 browser cases** (156 parity,
4 regression, 54 hours). All 23 site JS files pass `node --check`; diff whitespace
and UTF-8/source-format checks pass. Offline render smoke checks cover the new
views, editor saves, role blocks, notifications/mail and empty-date/date-update
form rendering. They do not substitute for browser or layout checks.

`npm run test:parity` was attempted; its local server cannot start. A direct server
attempt confirms `PermissionError: [Errno 1] Operation not permitted` on socket
creation. None of the 214 browser cases could execute here; parity/regression,
phone layout, keyboard behavior, 320 px/200% text, private-mode browser behavior,
network-tab and FPS checks remain for the owner's tester. No independent tester
verdict is claimed. Offline dependency audit reports 0 vulnerabilities across the
3 development dependencies; no fresh advisory lookup was made.

All plan sections are implemented. Process overrides: working tree only, no branch,
commit or push; section 14 option 1 was explicitly selected by the owner. No feature
cuts were needed. JS + CSS is below the plan's 195,000-byte hard stop and owner's
200,000-byte limit (**187,540 bytes**, `wc -c js/*.js js/views/*.js css/app.css`). No publication or production
reads/writes were performed. S56's inventory row stays MISSING; this is a partial
local activity-admin demo, and any inventory revision is parked for the owner.

### Security checklist for activities/hours #5

| Item | Result | Reason |
|---|---|---|
| No login or permission guard removed | PASS | Existing demo/read-only guards retained; role/ownership checks added in view and store; store denial tests pass |
| No new package | PASS | No install, package or lockfile changes; existing test tooling only |
| Dependency audit | PASS | Offline npm audit reports 0 vulnerabilities; no fresh network advisory check |
| No secrets or real personal data | PASS | Invented managers, @example.com seed emails, literal DSN 000-0000 (sample); five-date seed checks pass |
| Nothing leaves the browser | PASS | No network APIs, form posts or external assets added; source check only, browser network check pending |
| Typed text stays text | PASS | New DOM uses h() text nodes; no HTML parsing; malicious-label browser scenario written but unable to run |
| CSV/XLS/ICS file-format safety | PASS | Exports and fixed headers unchanged; export unit tests pass; external applications untested |
| CSP unchanged | PASS | index.html byte-identical to baseline; existing connect-src/form-action restrictions retained |
| No official seals or imagery | PASS | No imagery added |
| noindex retained | PASS | index.html and robots.txt untouched |
| Demo labels and stable hooks | PASS | Shell banner/footer retained; new demo notes and email disclaimer; existing hooks retained in source |
| Local storage growth capped | PASS | 50 history entries per activity; 100 notices and activity mail entries; caps tested; requests retain existing behavior |

Counts: **12 PASS, 0 FAIL, 0 N/A** for source/offline checks. Browser verification is
pending and is not represented as passed.


## Validation for BACKLOG #6 and #7

The baseline passed 7 unit files. The final suite passes 8 files with zero
failures, including area seeding and migration, role checks, request validation,
removed-area names, and export format checks. All 23 site JS files pass
`node --check`, and offline DOM smoke checks cover area rendering and request
picker updates. Playwright lists 224 cases across desktop and phone, including
one desktop-only check skipped on phone. Its local server could not start.
A direct attempt failed with `PermissionError: [Errno 1] Operation not permitted`
on socket creation. Browser behavior and the manual FPS check remain unverified.
The #6 follow-up keeps controls clickable during scrolling, including on
phones. On hover-capable devices, the passive scroll listener pauses hover
transforms until 150 ms after the last scroll event. Hover leaves shadows
unchanged. The desktop regression covers both normal and paused hover lifts.

The follow-up passes all eight unit files, matching the prior local run, and
syntax checks for all 23 site JS files plus the updated regression spec. The
local server remains blocked at socket creation, so browser parity remains
unverified. JS + CSS totals **196,689 bytes**. Work is local and has no commit
hash.

### Security checklist for #6 and #7

| Item | Result | Reason |
|---|---|---|
| No login or permission guard removed | PASS | Existing demo role checks are reused in the editor and write path. Unit tests exercise unauthorized edits. |
| No new packages | PASS | The earlier changes added a script to the manifest. The scroll follow-up leaves the manifest and lockfile untouched. |
| Dependency audit | PASS | Offline audit reports zero vulnerabilities across three development dependencies. Fresh advisories were unavailable offline. |
| No secrets or real personal data | PASS | New seeds contain the requested area names, fictional schedules and empty contact fields. |
| Nothing leaves the browser | PASS | Requests, notices and simulated mail are stored locally. Source review found no network calls. |
| Typed text stays text | PASS | Area labels and notes render through the existing text-node helper. |
| CSV/XLS/ICS file-format safety | PASS | Tests cover fixed headers, existing escaping, area locations and UTF-8 line folding. Imports in external applications were untested. |
| CSP | PASS | Existing restrictions retained in the untouched HTML shell. |
| No official seals or imagery | PASS | Changes add no visual assets. |
| noindex | PASS | Existing meta tag and robots rules remain in place. |
| Demo labels and stable hooks | PASS | Shared shell and existing hooks stay in place. New area hooks are documented above. |
| Local storage growth capped | PASS | Areas are capped at 30 per activity. History, notices and mail use their existing caps. |

Source and offline checklist totals **12 PASS, 0 FAIL, 0 N/A**.

### Security checklist for #8

| Item | Result | Reason |
|---|---|---|
| No login or permission guard removed | PASS | Application JS and role checks were untouched. |
| No new packages | PASS | Only a test script was added to the manifest. |
| Dependency audit | PASS | Offline audit reported zero vulnerabilities across three development dependencies. Fresh advisories were unavailable offline. |
| No secrets or real personal data | PASS | No data or assets were added. |
| Nothing leaves the browser | PASS | The fallback adds only local CSS and browser assertions. |
| Typed text stays text | PASS | The DOM rendering path was untouched. |
| CSV/XLS/ICS file-format safety | PASS | Export sources were untouched and the export unit tests passed. |
| CSP | PASS | The HTML shell was untouched. |
| No official seals or imagery | PASS | No imagery was added. |
| noindex | PASS | The HTML shell and robots rules were untouched. |
| Demo labels and stable hooks | PASS | App markup was untouched and browser assertions use existing selectors. |
| Local storage growth capped | PASS | The fallback adds no storage. |

Source and offline checklist totals **12 PASS, 0 FAIL, 0 N/A**.

### Security checklist for #9

| Item | Result | Reason |
|---|---|---|
| No login or permission guard removed | PASS | Area editing still uses the existing role checks. Notes still require Staff view. |
| No new packages | PASS | The dependency manifests were untouched. |
| Dependency audit | PASS | Offline npm audit reported zero vulnerabilities across the three installed test dependencies. Fresh advisories were unavailable offline. |
| No secrets or real personal data | PASS | Rendering uses existing demo data. |
| Nothing leaves the browser | PASS | The change renders local activity data without adding network calls. |
| Typed text stays text | PASS | Area names, notes and labels render through `h()` as text. |
| CSV/XLS/ICS file-format safety | PASS | Export code was untouched and format tests passed. |
| CSP | PASS | The HTML shell was untouched. |
| No official seals or imagery | PASS | The change adds no imagery. |
| noindex | PASS | The HTML shell and robots rules were untouched. |
| Demo labels and stable hooks | PASS | Shared demo labels and existing hooks were preserved. |
| Local storage growth capped | PASS | The change adds no persisted fields or writes. |

Totals **12 PASS, 0 FAIL, 0 N/A**.

### Security checklist for #10

| Check | Result | Reason |
|---|---|---|
| Login and permission guards | PASS | Existing role, manager edit and read-only route checks still run. Switching a design keeps the active role. |
| Packages | PASS | The dependency lists and lockfile match d13f453. All artwork and previews are local. |
| Dependency audit | PASS | Offline npm audit returned zero known vulnerabilities. Advisory freshness is limited to the local cache. |
| Secrets and personal data | PASS | The previews use sample UI. The new storage key holds only a design ID. |
| Data leaving the browser | PASS | The switch loads bundled local CSS, JS and images. It adds no API, analytics or form submission. |
| Typed text | PASS | Shared controls use DOM nodes and text through `h()`. SVG elements use DOM APIs. |
| File formats | PASS | Export code and headers match the baseline. Export tests pass. Preview files decode as WebP. |
| CSP | PASS | The policy matches d13f453. The boot script loads from the same origin. |
| Official imagery | PASS | The poster shapes, terrain and ribbon come from the supplied demo designs. |
| Search indexing | PASS | The noindex tags and robots rules are preserved. |
| Demo labels and hooks | PASS | Each checked route retains its demo banner, footer and existing workflow controls. |
| Browser storage | PASS | A single allowlisted preference is overwritten on a switch. Blocked storage is handled. |

Totals **12 PASS, 0 FAIL, 0 N/A**.

### Security checklist for #11

| Check | Result | Reason |
|---|---|---|
| Login and permission guards | PASS | The demo role, manager ownership and read-only calendar checks match #10. |
| Packages | PASS | The manifest and lockfile match #10. Only preinstalled test tools were used. |
| Dependency audit | PASS | The offline npm audit returned zero known vulnerabilities across three development dependencies. Advisory coverage is limited to the local cache. |
| Secrets and personal data | PASS | Views and screenshots use existing demo records. |
| Data leaving the browser | PASS | Changes use local CSS and DOM layout. Downloads still use the existing browser code. |
| Typed text | PASS | Request titles, numbers and links in Notifications are constructed with the existing text-node helper. |
| File formats | PASS | CSV, XLS and ICS tests passed. Export code and fixed headers match #10. |
| CSP | PASS | The policy matches main, including the restrictions on connections and form submissions. |
| Official imagery | PASS | The site uses the existing demo assets. |
| Search indexing | PASS | The HTML noindex directive and robots rules are intact. |
| Demo labels and hooks | PASS | Banner, footer, route links and control selectors are preserved. Firefox exercises them through the UI. |
| Browser storage | PASS | This change adds no persisted fields or writes. |

Totals **12 PASS, 0 FAIL, 0 N/A**.

### Security checklist for #12

| Check | Result | Evidence |
|---|---|---|
| Login and permission guards | PASS | The inbox uses the Notifications Marketing guard. Read and delete actions recheck the demo role. Managers and read-only calendar visitors can open the submission sheet. |
| Packages | PASS | The manifests match the base commit. Verification used the installed test tooling. |
| Dependency audit | PASS | Offline npm audit reported zero known vulnerabilities across three development dependencies. Advisory coverage is limited to the local cache. |
| Secrets and personal data | PASS | The client has no relay credential. The issue draft discloses that posting is public, and fixtures use sample text. |
| Outbound data | PASS | Opening and saving triggered zero GitHub requests in the browser test. The explicit issue link has a fixed destination, a new browsing context and `noopener noreferrer`. DNS prefetch is disabled. |
| Typed text | PASS | Form input and inbox entries render through DOM text nodes. The issue builder percent-encodes values and indents submitted text in Markdown. |
| File formats | PASS | The CSV download uses the existing formula guard and quoting. Tests check the exported bytes and original calendar formats. The issue template includes the feedback label. |
| CSP | PASS | The CSP matches 270879e byte for byte, including the existing connection and form-action restrictions. |
| Official imagery | PASS | The only new icon is a generic speech bubble drawn inline. |
| Search indexing | PASS | Both HTML documents retain their noindex directives and robots.txt matches the baseline. |
| Demo labels and hooks | PASS | Browser tests check the shell, feedback launchers, route access, focus return and existing controls on phone and desktop. |
| Browser storage | PASS | Feedback has a separate, 200-entry cap, field limits, a disclosed memory fallback and a tested reset. |

Totals **12 PASS, 0 FAIL, 0 N/A**.

### Security checklist for #13

| Check | Result | Evidence |
|---|---|---|
| Login and permission guards | PASS | The Marketing inbox keeps the Notifications guard. Staff retry checks the active role again before sending. |
| Packages | PASS | The package changes add the Worker test command and include it in the test suite. Dependencies and the lockfile match the base. |
| Dependency audit | PASS (offline) | The offline audit reports zero known vulnerabilities in the three development dependencies. DNS blocked a fresh registry advisory check. |
| Secrets and personal data | PASS | The adapter sends the six feedback fields and an available challenge token. It omits cookies and referrer. Tokens stay out of browser storage. Worker secrets stay server-side. |
| Outbound data | PASS | Intercepted requests verify one user-initiated POST, the allowed fields and the absence of GitHub traffic. The optional public draft retains its disclosure and link protections. |
| Typed text | PASS | The UI uses DOM text nodes. Worker response bodies cannot supply display messages. The public draft retains URL encoding. |
| File formats | PASS | The Worker and adapter use JSON. CSV and calendar tests cover their existing headers and spreadsheet escaping. Source syntax and UTF-8 checks pass. |
| CSP | PASS | The change permits the relay connection and the Turnstile script and frame origins. Form posts stay disabled. The fallback HTML has no CSP. |
| Official imagery | PASS | The change adds no images, logos or official marks. |
| Search indexing | PASS | Both HTML documents retain noindex. The robots file matches the base. |
| Demo labels and hooks | PASS | The existing banner, footer and test hooks remain present. Delivery appears in a live status next to the thank-you heading. |
| Browser storage | PASS | The capped inbox saves before POST, preserves read state, handles #12 entries and retains its memory fallback. A pending response updates only an existing row. |

Totals **12 PASS, 0 FAIL, 0 N/A** within the audit scope above.

## Local feedback page capture

When Feedback opens, it records the viewport before mounting the sheet or
focusing the message box. The first call to `capture()` from
`./js/lazy/feedback-capture.js` draws the preview if the opening view and
viewport are still available. Success returns `{ok: true, canvas, viewport}`
with a Canvas 2D image at device pixel density, capped at 1,280 pixels on the
long edge, and the saved scroll, CSS size, visual offset, public route name
and design. Refusals return `{ok: false, reason, message}`. Closing Feedback
clears the preview, and a route or design change invalidates it.

The canvas uses measured browser boxes and line breaks, selected theme styles,
fixed labels and approved demo artwork, including the rotated Night Wall
posters. Wizard and poster SVGs must match the original theme artwork.
Controls, uploads, displayed private details and unrecognized text receive
opaque masks. Public calendar dates, known sample titles and activity hours
remain visible. Staff views, individual records, mostly masked previews and
views with substantial unsupported effects are refused. Capture leaves minor
decorative details, such as shadows, out of the reconstruction.

Run `npx playwright test tests/feedback-capture.spec.mjs --project=desktop --project=phone-390`
to check the scrolled forms, Night Wall Home at scroll zero and visible wizard
illustrations. The committed PNGs show Chromium-rendered pages with test-applied
masks before Feedback opens. The tests compare the reconstructed form, artwork
and label regions with those references, and check masks and each visible
file-limit line independently.

### Security checklist for the feedback page-capture engine (backlog #14)

| Check | Result | Evidence |
|---|---|---|
| Login and permission guards | PASS | Existing guards are intact. The capture policy separately refuses staff mode and staff routes. |
| Packages | PASS | Dependency manifests and lockfile match main. The tests use installed Playwright. |
| Dependency audit | PASS | The npm registry advisory audit covered all three locked development dependencies and found zero vulnerabilities. |
| Secrets and personal data | PASS | Reference images use sample fixtures and mask private content. The engine never reads input values or upload bytes. |
| Outbound data | PASS | The capture stays in browser memory. Capture adds no outbound data, public URL, storage, or network endpoint. |
| Typed text | PASS | The engine paints only approved labels into Canvas and masks unknown text. Existing DOM construction continues to use text nodes. |
| CSV formula neutralization | N/A | Capture does not touch export code or formulas. |
| File formats | PASS | Capture returns a raster canvas. The tests encode and decode PNG, and the existing export format checks still run. |
| CSP, origin, Turnstile and staff guards | PASS | The viewport hook runs before the sheet. CSP, origin checks, Turnstile and staff permissions match main. |
| Approved artwork and official marks | PASS | The capture checks wizard and poster SVGs against the theme originals. The injected-path browser case verifies that unknown geometry contributes no pixels. |
| Search indexing | PASS | Both HTML documents retain noindex, and robots.txt matches main. |
| Demo banner, footer and hooks | PASS | The existing shell and test hooks match main. The canvas includes the visible banner and footer. |
| Controls, uploads and unknown content | PASS | The capture masks controls, file rows, user text and unapproved content with opaque placeholders. Mostly masked output is refused. |
| Staff and record details | PASS | The policy rejects staff, staff-side public views and individual records before creating a canvas. |
| Feedback sheet and keyboard | PASS | Opening Feedback saves viewport metadata. The first capture checks that it can still draw that view and excludes the sheet. The sheet releases the preview on close. |
| Screen sharing | PASS | Capture uses Canvas 2D and does not invoke `getDisplayMedia`. |
| Retention and logging | PASS | Capture adds no purge, auto-delete, image logging or token logging. |

Totals **16 PASS, 0 FAIL, 1 N/A**.
