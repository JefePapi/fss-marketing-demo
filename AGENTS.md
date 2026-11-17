# Rules for anyone (person or coding tool) changing this repo

This is the one rules file for the repo. They apply the same to every tool.

- **It is a demo.** Sample data only. Never add real names, phone numbers, emails, logos, seals or official imagery.
- **No network.** No CDN, web font, analytics, `fetch` or form post. The CSP meta tag in `index.html` enforces it; do not loosen it.
- **No packages, no build step.** Plain HTML, one CSS file, vanilla ES modules. Adding a package needs the owner's OK. Task #3 exception: owner approved the already-installed test-only @playwright/test dependency; no npm install.
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
- Size budget: JS + CSS under 200 KB (owner-approved task #3 budget) unminified. Check with `wc -c js/*.js js/views/*.js css/app.css`.
