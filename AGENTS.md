# Rules for anyone (person or coding tool) changing this repo

This is the one rules file for the repo. They apply the same to every tool.

- **It is a demo.** Sample data only. Never add real names, phone numbers, emails, logos, seals or official imagery.
- **No network.** No CDN, web font, analytics, `fetch` or form post. Keep the CSP in `index.html` unchanged. The sole outbound exception is a user-clicked, prefilled new-issue link to JefePapi/fss-marketing-demo on GitHub. Keep it a top-level navigation with `noopener noreferrer` and no remote resources or prefetch.
- **No packages, no build step.** Plain HTML, local stylesheets, vanilla ES modules. Load only the active design and its shared base. Adding a package needs the owner's OK. Task #3 exception: owner approved the already-installed test-only @playwright/test dependency; no npm install.
- **Relative paths only** (`./js/app.js`), so the site works under `/<repo>/` on GitHub Pages.
- **Typed text is never rendered as HTML.** Build DOM with `h()` in `js/ui.js`; no `innerHTML`.
- **The demo banner and the unofficial-prototype footer stay on every screen**, including the read-only calendar.
- **"Ticket" never appears on requester screens.** The only exception is the staff-side "Old way" chip.
- **The calendar is derived, never stored.** `calendarEvents()` in `js/model.js` builds it from requests on every render.
- **Export headers are fixed.** The 16 strings in `js/config.js` match the sheet byte for byte (`DAY ` has a trailing space; `CONNCET` is the sheet's spelling). Do not "fix" them.
- **Stable hooks for tests:** keep the `id` and `data-test` attributes listed in README.md.

## Process
- One `BACKLOG.md` item at a time: numbered entry before work, close-out note after. Side ideas go to the parking lot.
- `main` is production (GitHub Pages serves it). No merge or publish without the owner's OK in the task text.
- Run before handing off: `node --test tests/*.test.mjs` and `npm run test:parity` (all must pass) and `node --check` on every `.js` file.
- Every change ships with the written security checklist (see README.md, "Security checklist").
- Size budget for #10: at most 220,000 unminified bytes per initial design. Run `npm run size`. Count all top-level and view JS, base CSS, active theme JS and CSS, including both stylesheets for Night Wall Light. Keep on-demand modules under `js/lazy/`. Feedback JS and `css/feedback.css` load only on open or inbox visit and are reported separately by the size check.
