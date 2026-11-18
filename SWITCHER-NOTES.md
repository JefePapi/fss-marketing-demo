# BACKLOG #10 · Design switcher

The local `theme-switcher` working tree is based on `d13f453`. This is a
local handoff. The pre-existing port 4173 changes in Playwright and the
scroll benchmark were retained. The pre-existing `node_modules` symlink
points to the installed test tooling and is outside the deliverable.

## Files and behavior

| Files | Change |
|---|---|
| `index.html`, `js/theme-boot.js`, `404.html` | Select local CSS in the head before body rendering, keep the Night Wall no-script stylesheet, and preserve shared addresses through the Pages fallback. |
| `js/theme.js`, `js/app.js` | Resolve and remember an allowlisted ID, load the selected artwork, and switch the banner, brand and current view in place. New CSS loads before existing sheets are removed. Form controls and open dialogs keep their DOM nodes. |
| `js/views/home.js`, `js/themes/{a,b,c,current}.js` | Share the picker, destinations and submission guidance. Load only the selected hero, print illustrations, terrain and metrics, or ribbon geometry. Night Wall Light uses Night Wall’s module. |
| `css/base.css`, `css/theme-*.css` | Shared switcher and responsive rules, one active design family, warm-paper overrides for Night Wall Light, and Current’s original Firefox fallback. These replace `css/app.css`. |
| `img/themes/*.webp` | Four supplied previews and a fifth captured from the implemented light hero in Firefox. A missing image leaves a colored swatch and accessible text. |
| `js/views/{activities,request,staff-queue,calendar,about}.js` | Retain the #9 area data, label and arrange shared controls, add wizard artwork, and copy calendar links using the currently selected design. |
| `playwright.config.mjs`, `tests/{themes,firefox,regression}.spec.mjs`, `tests/theme.test.mjs` | Theme-specific storage state, resolver precedence, first paint, in-place switching, route and asset coverage, and the Current rendering regressions. |
| `perf/size.mjs`, `perf/staff-scroll.mjs`, `package.json` | Measure initial code per design and wheel-scroll a chosen design in either browser, including offline local-file interception. |
| `README.md`, `AGENTS.md`, `BACKLOG.md` | Sharing instructions, budget, checklist and close-out. |

## Initial payload

`npm run size` counts uncompressed bytes. Shared top-level JS, view JS and
base CSS total **185,700 bytes**. The original design alone was 198,977
bytes on the baseline. The owner-approved budget for the switcher is
**220,000 bytes** to retain the reference artwork and styles. The separate
five WebP thumbnails total 66,186 bytes.

| ID | Active CSS | Active theme JS | Initial JS + CSS |
|---|---:|---:|---:|
| a | 24,696 | 6,085 | 216,481 |
| a-light | 26,484 | 6,085 | 218,269 |
| b | 25,144 | 5,794 | 216,638 |
| c | 25,217 | 5,230 | 216,147 |
| current | 30,143 | 678 | 216,521 |

## Functional verification

- All 9 unit files passed, up from 8 on `d13f453`. The run with `node --test --test-isolation=none` reported 67 passing tests versus 64 on the baseline. Deliberately forcing the resolver to return Night Wall in a throwaway copy failed all three new resolver tests.
- Firefox loaded this checkout through Playwright request interception with the same origin and MIME types as a local server. The baseline passed 230 browser cases with four project-specific skips. Each of the five designs passed all 224 applicable existing behavior cases at 1280 × 900 and 390 × 844 combined, with four project-specific skips per run. The baseline count additionally includes the six Firefox-only cases for #8.
- All five designs separately passed the desktop hover/scroll regression in Firefox. The Home, queue, switcher and Firefox-specific review passed 124 checks. After adding the Pages redirect regression, the final switcher and #8 suite passed 36/36. The Firefox checks include #8 shadows and selection markers, #9 schedules, keyboard activation, route preservation, active-only asset requests, and retaining manager and unsent-form state during a switch.
- Additional Firefox checks covered the no-script fallback, a failed stylesheet load during startup and narrow-screen overflow. A text-contrast spot check on Night Wall Light found no failing solid-background text pairs on seven routes. This check excluded gradients and artwork.
- All 29 site JS files and the Playwright, test and performance modules passed syntax checks. All five previews decoded as WebP. The offline dependency audit returned zero known vulnerabilities. The full security checklist in README records 12 PASS, 0 FAIL and 0 N/A.

## Browser performance

The `design` workload uses a 1920 × 1080 viewport, four seconds of wheel
input per page, the event-details form step, the whole staff queue, the
activity list and Bowling Center’s expanded area schedules. It records the
actual scroll extent and frame intervals. Firefox uses native CPU speed.
Run either command from the repository root.

```sh
node perf/staff-scroll.mjs offline review 1 a firefox design
node perf/staff-scroll.mjs http://127.0.0.1:4173/ review 4 a chromium design
```

The table shows average Firefox FPS on each route.

| Design | Home | Request | Queue | Activities | Bowling Center |
|---|---:|---:|---:|---:|---:|
| a | 59.5 | 60.0 | 60.0 | 60.0 | 60.0 |
| a-light | 55.7 | 60.0 | 59.7 | 60.0 | 60.0 |
| b | 59.5 | 60.0 | 60.0 | 60.0 | 60.0 |
| c | 60.0 | 60.0 | 60.0 | 60.0 | 60.0 |
| current | 60.0 | 60.0 | 60.0 | 60.0 | 60.0 |

All 25 pages scrolled and averaged at least 55 fps. Night Wall Home first
measured 54.9 fps. After isolating the rotated artwork for Firefox it
measured 59.5 fps on the next run. One intermediate Night Wall activities
sample averaged 5.5 fps with a single 26.2-second frame interval. Its
95th percentile was 17 ms. The complete Night Wall workload was repeated
in isolation. The table reports that repeat, including the activities case.
Raw measurements are under `test-results/staff-scroll-*.json`.

## Open verification

The sandbox refused the local server bind and Chromium exited with SIGTRAP
during launch. The configured Playwright command could discover 264 cases,
but its local web server could not start. Chromium desktop/phone parity,
Chromium scroll performance and live-site verification remain external.
No production site, data or git remote was accessed.

## BACKLOG #11 · Staff Queue layout

The three utility links now have 16 px gaps on desktop and share a centerline
with the CSV button. Team and Show filters wrap inside their own groups. Status,
Priority and Search stack on phones and share one row starting at 900 px, with
twice as much space for Search. Queue cards use an 8 px gap within each chip
group. Ribbon Glass keeps its filter sidebar from 1280 px up.

The staff sweep covered request detail, Notifications, Email log, Reports,
Activities, Bowling Center and its areas, My activities with a manager selected,
and the calendar with Download open. Fixes include grouping lane actions,
labeling the requester link, separating related-request links, fitting report
tables to the available space and spacing calendar controls. Current also uses
a card grid on desktop for Activities and My activities. The sweep found no
matching layout issue in Email log or the area schedules.

### Firefox screenshots and initial payload

Each screenshot shows the local working tree at the indicated viewport width.
The second phone image shows the cards below the filters.

| Design | 390 px | 390 px cards | 1024 px | 1280 px | 1920 px | Initial bytes |
|---|---|---|---|---|---|---:|
| current | [390](test-results/queue-11/current-390.png) | [390-cards](test-results/queue-11/current-390-cards.png) | [1024](test-results/queue-11/current-1024.png) | [1280](test-results/queue-11/current-1280.png) | [1920](test-results/queue-11/current-1920.png) | 217,328 |
| a | [390](test-results/queue-11/a-390.png) | [390-cards](test-results/queue-11/a-390-cards.png) | [1024](test-results/queue-11/a-1024.png) | [1280](test-results/queue-11/a-1280.png) | [1920](test-results/queue-11/a-1920.png) | 217,257 |
| a-light | [390](test-results/queue-11/a-light-390.png) | [390-cards](test-results/queue-11/a-light-390-cards.png) | [1024](test-results/queue-11/a-light-1024.png) | [1280](test-results/queue-11/a-light-1280.png) | [1920](test-results/queue-11/a-light-1920.png) | 219,045 |
| b | [390](test-results/queue-11/b-390.png) | [390-cards](test-results/queue-11/b-390-cards.png) | [1024](test-results/queue-11/b-1024.png) | [1280](test-results/queue-11/b-1280.png) | [1920](test-results/queue-11/b-1920.png) | 217,414 |
| c | [390](test-results/queue-11/c-390.png) | [390-cards](test-results/queue-11/c-390-cards.png) | [1024](test-results/queue-11/c-1024.png) | [1280](test-results/queue-11/c-1280.png) | [1920](test-results/queue-11/c-1920.png) | 216,962 |

### Verification

- Reviewed the 20 Queue screenshots above and five additional phone card views.
  The layout regression also tests the 900 px breakpoint. It measures link gaps,
  vertical centering, containment of the CSV button, filter overflow, label and
  input alignment, phone stacking and chip separation.
- Against the preserved #10 checkout, the new test failed in each design. It
  caught the Current CSV button outside its toolbar at 1024 px, chip gaps in
  both Night Wall variants and Ribbon Glass, and 254 px of phone filter overflow
  in Mission Control.
- The eight related staff pages were checked in Firefox at 390, 1024 and 1280 px
  in every design. With the calendar download menu open, the final sweep found
  no page-edge overflow or crowded neighboring controls. The seven-column team
  report also fits its panel at the four tested desktop widths from 900 to 1920 px.
- The unit suite passed all 9 files and 67 individual tests. The recorded main
  baseline at `d13f453` had 64 passing tests and #10 had 67. All application,
  test and performance JS passed syntax checks. Each initial design passed the
  220,000-byte budget.
- Each theme passed 225 Firefox behavior cases across desktop and phone,
  including desktop hover. The phone skips that desktop-only case. The
  Firefox-specific and design-switcher suite passed 41/41, including the five
  new Queue regressions. Together these cover the 230 passing browser cases
  recorded on main. The final Reports check also passed on both viewports in
  each theme after the table layout adjustment.
- Firefox used the same local asset interception as #10. The configured
  `npm run test:parity` server could not bind its port in this sandbox, and
  a direct Chromium launch exited with SIGTRAP. The final Firefox run excluded
  the Chromium-only shadow assertion. Chromium parity remains unverified.
- The [security checklist](README.md#security-checklist-for-11) records
  **12 PASS, 0 FAIL, 0 N/A**. This handoff is uncommitted on
  `theme-switcher` at `d13f453`. No push or deployment was performed.
