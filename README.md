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

## Limits — please read

- **Data is per browser.** It lives in that browser's `localStorage`. A request sent on one phone does not appear on another computer.
- **The read-only link is not a live shared calendar.** It shows the sample events plus whatever *that* browser added. It is a display mode, not security.
- **Clearing browser data, or Reset demo data, returns to the 36 samples.**
- **No email is sent, no files can be attached, there are no logins.** Staff view is a switch in the header.
- **The 60-day lead-time note is a sample rule.** Section codes are illustrative.
- If the browser blocks storage (private mode, some Teams tabs) the demo still works from memory and says so in the footer.
- A real version would store requests on a server so everyone sees the same calendar. That part needs a hosting decision.

Not built on purpose: real email, uploads, accounts, website-change-only requests, repeating events, proofing rounds, hiding money fields, admin screens, shared data between visitors, dark mode.

## Run it locally

No build, no packages. ES modules need `http://`, so opening `index.html` from disk will not work:

```
python3 -m http.server 8000      # then open http://localhost:8000/
node --test tests/               # unit tests (no packages)
```

## Files

```
index.html            shell: demo banner, header, <main id="app">, footer; CSP + noindex
404.html              sends unknown addresses back to the home page
css/app.css           tokens, glass, layout, components, reduced motion, fallbacks
js/app.js             hash router, header nav, staff / read-only mode, Pause motion
js/config.js          services, teams, facilities, fake staff, lead-time rule, labels, the 16 headers
js/store.js           load / save / reset, memory fallback, number counter
js/seed.js            36 invented requests (dates relative to today), holidays
js/model.js           pure: overallStatus, heskTicketCount, leadTime, calWindow, calendarEvents
js/export.js          pure row builders + CSV / XLS / ICS strings, download helper
js/ui.js              h() DOM helper, form controls, toast, sheet/popover, clipboard
js/views/             home, request, sent, status, staff-queue, staff-request, calendar, about
tests/                model, export and seed tests for `node --test`
robots.txt  .nojekyll  AGENTS.md  BACKLOG.md
```

## Routes (all inside the hash)

`#/` · `#/request` · `#/sent/<number>` · `#/status` · `#/status/<number>` ·
`#/staff?team=all|design|flash|sponsorship|web&show=open|mine|unassigned|all` · `#/staff/<number>` ·
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
| Lane status values | `new` `inprogress` `waiting` `done` `declined` |
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

The seeded example request is the first one (`MKT-26-0106`, Fall Fest 5K) while the clock is in 2026.

## Build record (BACKLOG #1, 2026-11-17)

**Checked by the builder:** `node --check` passes on every `.js` file; every import resolves to an export; no `innerHTML`, `fetch`, inline style or inline handler anywhere in the site.

**Not checked by the builder — the tester must do these first:**
- The site has **not been opened in a browser** (the build task allowed no server, and ES modules do not load from `file://`).
- The unit tests in `tests/` are **written but were not run** (running scripts was not permitted in the build session). Baseline is zero tests; all should pass. Run `node --test tests/`.

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
