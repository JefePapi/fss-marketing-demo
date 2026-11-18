# Feedback and public issue drafts

BACKLOG #12 was built on the local `feedback` branch at `270879e`, the
checkout’s `origin/main`. The shell now offers feedback on requester, staff,
manager, About, read-only calendar and fallback pages. Marketing reviews
submissions at `#/staff/feedback`. The manager guard matches Notifications.
The optional public issue link opens a draft. The user completes posting on
GitHub, and Joseph creates the repository label. The working tree is
uncommitted because the sandbox mounts `.git` read-only.

## Size and scrolling

`npm run size` measures uncompressed initial JS and CSS. The shared
scripts and base CSS total 186,922 bytes. Feedback opens with 8,602
additional bytes for the form, model and stylesheet. The inbox adds 3,809
bytes, for 12,411 on demand. About, Reports, and the Notifications/Email
log module load only on their respective routes.

The three scroll columns are average FPS at 1920 × 1080, in Firefox at native
CPU speed, using the repository's four-second wheel workload. Each case
must move through real page content and reach 55 FPS.

| Design | Initial bytes | Home | Queue | Activities |
|---|---:|---:|---:|---:|
| a | 217,703 | 60.0 | 60.0 | 60.0 |
| a-light | 219,491 | 59.0 | 60.0 | 60.0 |
| b | 217,860 | 60.0 | 60.0 | 60.0 |
| c | 217,408 | 60.0 | 60.0 | 60.0 |
| current | 217,774 | 59.7 | 59.5 | 60.0 |

An initial implementation repositioned the pill during scrolling and measured
50.5 FPS on Night Wall Home and 51.0 on Night Wall Light Home. The base
commit measured 58.3 on Night Wall Home on this host. The final pill uses
the sticky banner during scrolling and recalculates its corner position when
scrolling stops. All 15 final measurements met the target.

Reproduce a row with `node perf/staff-scroll.mjs offline feedback-12-final 1 a firefox feedback`
and substitute the design ID. Raw results live in
`test-results/staff-scroll-feedback-12-final-firefox-<id>.json`.

## Verification

All 72 unit tests in 10 files passed, up from 67 in 9 files on the base commit.
Each design passed the same 225 existing Firefox behavior cases as #11 and
17 new feedback cases across desktop and phone. Two desktop-only cases
skipped on phone. Another 41 design-switching and Firefox-specific cases
passed. That gives **1,251 browser passes and zero new failures**.
The Chromium-only shadow assertion was excluded from Firefox.

The Current rerun was interrupted after 221 passes and one phone skip.
The remaining 22 cases ran by exact test location, with 21 passes and one
skip. The combined passing and skipped names match the other four designs.
The new tests cover lazy loading, message validation, anonymous submissions,
focus return, blocked storage, public draft contents, CSV downloads, copying,
read state, filtering, deletion, reset, and clearance around the desktop pill.

The configured `npm run test:parity` server could not start in this sandbox.
A direct Chromium launch exited with SIGTRAP. Firefox used local request
interception at the configured origin. Chromium desktop/phone parity and
live GitHub issue creation remain external checks. The test harness inspected
the public draft and blocked GitHub traffic. No feedback was posted.

The CSP matches the base byte for byte. Source syntax, whitespace checks,
the existing export tests and an offline dependency audit passed. The audit
reported zero known vulnerabilities across three development dependencies.
The [written checklist](../README.md#security-checklist-for-12) records
12 PASS, 0 FAIL and 0 N/A.

## Phone check at 390 px

- Open Feedback beside Design or in the footer. Both launch the same sheet.
- Save a sample suggestion and check the public-post notice beside the GitHub link.
- In Staff view, open Queue → Feedback, filter suggestions and toggle a read marker.

## Screenshots

- [Phone feedback form, Night Wall](feedback-12/a-390-form.png)
- [Phone thank-you and GitHub disclosure, Night Wall](feedback-12/a-390-thanks.png)
- [Desktop Marketing inbox, Night Wall Light](feedback-12/a-light-1280-inbox.png)

The full local capture set is under `test-results/feedback-12/`. Files named
`<design>-<width>-form.png` and `<design>-<width>-inbox.png` cover all five
designs at 390 and 1280 px.
