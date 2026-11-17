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

## Parking lot
- Pointer-following light on glass cards (cut per the plan's cut order).
- Real shared storage so every visitor sees the same calendar (needs a hosting answer).
- Reduce JS + CSS below 100 KB: pre-existing baseline 122,365 bytes; after #2, 124,076. Requires a separate focused size pass.
