# Plan: clickable "one request + rolling calendar" prototype

Written 2026-11-17. Planning only: no code written, nothing fetched, no login used.
Audience: the coding agent that builds this today (target 2–3 hours), then the tester.

## 0. What we are proving

The agency said the glass mockups "look exactly the same" as today's site. So the demo has to make the *behavior* obvious within a minute:

1. **One request, typed once**, with service checkboxes. Today the same event is 3 tickets, about 31 required boxes and 17 retyped entries.
2. **It fans out to per-team jobs** under one number; each team has its own status.
3. **The Rolling Calendar fills itself** from those requests. Nobody retypes the event into Excel.
4. **They keep the spreadsheet if they want it**: one link for a Teams tab, and an export with their own 16 column headers.

Anything that does not serve those four points is out of scope (section 13).

## 1. Decisions at a glance

| Topic | Decision |
|---|---|
| Stack | Static site. Vanilla JS ES modules, one CSS file, no build step, no packages, no CDN, no web fonts |
| Routing | Hash routes (`#/...`), so it works on GitHub Pages and in a Teams tab |
| Data | Seed data generated in the browser + the visitor's own changes in `localStorage`. Nothing is sent anywhere |
| Host | GitHub Pages, new public repo `mkt-one-request-demo` under the default `gh` account |
| Form layout | Four short steps at every width (You → Event → What you need → Check and send) |
| Jobs | One lane per ticked service; lanes grouped under four teams |
| Calendar | Current month + 11. Month grid and list. Read-only mode by URL flag |
| Export | CSV in the sheet's layout (primary), `.xls` (HTML table, colored status), `.ics` |
| Size budget | Under 100 KB JS + CSS unminified. No images except inline SVG icons |
| Look | visual-plan-futuristic.md tokens: pearl canvas, blue/teal light, thick glass, navy `#133e5e` header |

## 2. Guardrails (non-negotiable)

- **Banner on every screen, including read-only:** "Demo — sample data". Not dismissible.
- **Footer on every screen:** "Unofficial prototype for 52 FSS Marketing review. Not an official Air Force or government site."
- No seals, emblems, logos or official imagery. The header mark is the plain outlined compass icon from the visual plan, plus the words "Marketing Department".
- No logins. Staff view is a header toggle labeled **Staff view (demo)**.
- No network calls of any kind after page load: no `fetch`, no analytics, no fonts, no form posts. Enforce with a CSP meta tag: `default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'`.
- `<meta name="robots" content="noindex">` and a `robots.txt` that disallows all. This is a review demo, not a public site.
- The requester form says once, above the first box: "Demo: please use made-up details. Nothing you type leaves this browser."
- All text the visitor types is rendered with `textContent`, never `innerHTML`.
- Do not open, read or copy `rolling-calendar/rolling-calendar-paste.tsv`. Seed data is invented (section 9).
- Never show the word "ticket" on requester screens. The only exception is the staff-side contrast chip (section 6).

## 3. Routes

| Route | Screen |
|---|---|
| `#/` | Home: "What do you need?" → **Marketing for an event or program**; smaller **Check on a request**; **See the calendar** |
| `#/request` | The four-step form. Step is kept in memory and in `sessionStorage` so Back never loses typing |
| `#/sent/MKT-26-0142` | Confirmation |
| `#/status` | "Check on a request": one box for the number |
| `#/status/MKT-26-0142` | Requester's view of one request |
| `#/staff?team=all\|design\|flash\|sponsorship\|web&show=open\|mine\|unassigned\|all` | Staff queue |
| `#/staff/MKT-26-0142` | Staff view of one request with lanes |
| `#/calendar?view=month\|list&m=2026-11&svc=…&status=…&readonly=1` | Rolling calendar |
| `#/about` | What this demo is, what is fake, where the data lives, Reset button |

Unknown route → Home. Unknown request number → "We could not find that number in this demo" with a link to the seeded example.

Query parameters live **inside the hash** (`#/calendar?view=list&readonly=1`), parsed with `URLSearchParams` on the part after `?`.

## 4. Requester flow

One form, four steps, a progress rail with "Step 2 of 4" as text. A **Fill with sample answers** button on step 1 fills the Fall Fest 5K example so a reviewer can get through in 30 seconds.

### Step 1 — About you (3 boxes)
Your name · Your email · Your phone (optional in the demo; placeholder shows no real number).

### Step 2 — About the event (asked once, used by every team and the calendar)
| Box | Notes |
|---|---|
| Which facility? | Select, 12 generic facilities (section 9). Sets the section code silently |
| What is it called? | Text |
| What is happening? | Textarea, a few sentences |
| What day is it? | Native `<input type="date">` (typed or picked). Lead-time note appears under it the moment a date is chosen |
| Ends on (optional) | Only shown after tapping "It lasts more than one day" |
| What time? | Start and end as `type="time"`, plus an "All day / time not set yet" checkbox |
| Where exactly? | Text |
| What does it cost the customer? | Text; "Free" is fine |
| How many people do you expect? | Number, optional. Reused by sponsorship; never asked twice |
| Three quick taps | Joint event? Yes/No · Do people have to sign up? Yes/No · On the AF Connect app? Yes / Not yet / No |

### Step 3 — What do you need from Marketing? (tap any)
A reminder capsule shows "Fall Fest 5K — Fitness Center". Each ticked service opens only its own questions:

| Service (checkbox) | Team | Extra questions, shown only when ticked |
|---|---|---|
| Flyers or posters (design and print) | Design | Sizes (chips: A6, A5, A4, A3, A1 poster), how many, "When do you need it in hand?" |
| Social media graphic | Design | Which: event photo / cover photo (chips) |
| Screen ad | Design | None. Note: "1920 × 1080, we size it for you" |
| Flash magazine listing | Flash | None. "The editor will tell you which issue" |
| Help getting sponsors | Sponsorship | Break-even number; cash asked for (optional); items asked for (optional). Expected attendance is shown read-only from step 2 |
| Website listing | Web | Which page (optional text) |
| **Just put it on the calendar** | none | Exclusive. Unticks the others. Creates a calendar entry and no jobs |

A live line under the list: "You are sending **1 request**. The old way: **3 separate forms**." (N from section 7's rule; hidden when N ≤ 1.)

Must pick at least one service or "Just put it on the calendar".

### Step 4 — Check and send
Plain summary in three cards (You, Event, What you asked for) each with an **Edit** link back to its step. Late-request note repeated if it applies. One button: **Send request**. Disabled for one second after tap so a double tap cannot create two.

### Lead-time note (warn and flag, never block)
- One sample rule in `config.js`: **60 calendar days** before the event date. Label it in code and in `#/about` as a sample; the agency sets the real rule.
- Shown as a real date, not a count: "For full service, events should be sent in by **18 September**. This one is inside that window. You can still send it; Marketing will tell you what is possible."
- A request inside the window is stored `late: true`, shows a **Late request** chip to staff, and exports as `Late` in the `LATE REQUEST` column.
- Event date in the past → inline error, cannot continue.

### Confirmation (`#/sent/…`)
- "Your request is saved" and the number, large: **MKT-26-0142**. **Copy number** button.
- "Teams handling this request": one card per team with what they were asked for.
- "It is on the calendar: Saturday 20 March 2027" with a link that opens the calendar on that month.
- Notice: "Receipt does not promise funding or a magazine slot."
- Honest demo line: "In the real system you would get one email copy. This demo sends no email."
- Buttons: **Check status** · **See it as staff (demo)** · **Send another**.

### Check status (`#/status/…`)
Event summary, then one line per lane with its written status and the latest reply from staff. A message box adds to the thread as "Requester". Private staff notes never appear here. If any lane is "Waiting on requester", a highlighted card at the top says what staff asked.

## 5. Tracking numbers

Format `MKT-YY-NNNN`. `YY` from the submit date. Seeds use `0106`–`0141`, so the **first request a visitor sends is `MKT-26-0142`**. Counter stored with the data; Reset puts it back.

## 6. Staff view (demo)

Header toggle **Staff view (demo)** switches the nav to Queue · Calendar. A small select "Acting as:" picks one of the fake staff (section 9) so "Mine" and thread names work.

### Queue (`#/staff`)
- Team tabs: **All · Design · Flash · Sponsorship · Web**. Count on each tab.
- Second row: **Open · Mine · Unassigned · Everything**. Search box "Search by request number or title".
- One card per **request** (not per lane): number, title, facility, event date, requester, overall status pill, small lane dots with written labels ("Design: In progress"), **Late request** chip if flagged. With a team tab active, cards show only requests that have a lane for that team and put that team's lane status first.
- Sort: late and waiting-on-staff first, then by event date.
- Phone: stacked cards, whole card opens the request. Desktop: same cards in aligned columns.

### One request (`#/staff/…`)
- **Facts card** at top (the shared facts, once). **Edit facts** opens the same fields; saving updates the calendar and adds a log line "Date changed from … to …".
- Contrast chip beside the number, quiet styling: **"Old way: 3 separate tickets"**; tap shows "Design form + Commercial Sponsorship form + Flash Inputs form. Here: 1 request." Hidden when N ≤ 1.
- **Lanes**: one card per service. Each has: service name, team, status select (New / In progress / Waiting on requester / Done / Declined), owner select (fake staff of that team, or Unassigned), due date, and that service's extra answers. Declined asks for a short reason.
- **Add a part**: add a service lane later ("this should go in the Flash after all"). One tap, logged.
- **Calendar card**: calendar status (Not confirmed / Good to go / Cancelled; Cancelled requires a reason), event type (none / Wing / AFE / M3), section code (pre-filled from facility, editable), actual attendance (enabled once the event date has passed).
- **Thread**: one list, two kinds of entry. **Reply to requester** (shown on the status page) and **Private note** (staff only, visibly tinted and labeled). Entries show author, time and, if chosen, which lane they are about.
- **History**: collapsed log of status, owner and fact changes.

### Overall request status (derived, never stored)
Evaluate in this order:
1. No lanes → **Calendar only**
2. Every lane Declined → **Declined**
3. Every lane Done or Declined → **Complete**
4. Any lane Waiting on requester → **Waiting on requester**
5. Any lane In progress, or a mix of Done and New → **In progress**
6. Otherwise → **New**

Requester-facing wording for the same values: Calendar only → "On the calendar" · New → "Received" · Waiting on requester → "We need something from you".

## 7. "Old way" ticket count

`N = number of distinct teams among the lanes`, because today's site has four form layouts: standard facility form (all Design services), Commercial Sponsorship, Flash Inputs, Webmaster Request. Design + Flash + Sponsorship = 3. Pure function `heskTicketCount(request)`.

## 8. Rolling 12-month calendar

**Window:** first day of the current month through the last day of the 11th month after it, computed from the visitor's clock. A month strip across the top (Nov 26 · Dec · Jan 27 …) jumps to a month; Prev/Next stop at the window edges.

**Views**
- **Month grid:** 7 columns, Monday first. Each day shows up to 2 event chips (time + title) and "+3 more". At 390 px the grid shows a dot count per day and the tapped day's events list underneath; no horizontal scroll.
- **List (agenda):** grouped by month with a banner per month, one row per event day: date, weekday, time, title, location, section, status pill. Default view on phones and in read-only links.
- Holidays and Family Days appear as tinted day labels (seeded list, section 9). Cancelled events stay visible, struck through, with the status written out.
- Multi-day events appear on every day they cover.

**Filters:** service (multi-select chips incl. "Calendar only"), calendar status (Good to go / Not confirmed / Cancelled), section. Filters are written into the hash so a filtered view can be shared.

**Event detail:** tap an event → popover on desktop, bottom sheet on phone: title, date and weekday, time, location, facility and section, contact name, expected attendance, sign-up, AF Connect, joint, services requested with lane status, calendar status. Staff mode adds **Open request**. Closes on Esc, outside tap, and a visible Close button; focus returns to the event.

**Read-only share link**
- Button **Copy link for Teams** builds `…/#/calendar?view=list&readonly=1` plus current filters, copies it, and shows it in a selectable box in case the clipboard is blocked.
- `readonly=1` hides: the staff toggle, the request button, Reset, every edit control, and "Open request". It keeps: views, filters, event detail, exports, the demo banner and the footer.
- The flag is read from the URL on every render and carried on every in-calendar link. It is a display mode for the demo, not security; say so in `#/about`.
- Teams: add a **Website** tab and paste the link. GitHub Pages sends no frame-blocking header, so it should load in the tab; **the tester confirms this in real Teams**. If the tenant blocks it, Teams offers "open in browser" and the same link still works. If storage is blocked inside the tab, the store falls back to memory and the calendar still shows seed data (section 10).

**Honest note on the calendar page** (always visible, small, under the title):
> Demo: this calendar shows sample events, plus anything added in this browser. In the real system, everyone would see the same live calendar.

**Exports** (menu **Download**; exports the full 12-month window, respecting no filters, so the file always matches the sheet)

1. **Rolling Calendar (.csv)** — primary. UTF-8 with BOM, CRLF line ends, every cell quoted. Layout mirrors the sheet:
   - Row 1 title: `52d FSS Calendar of Events — DEMO SAMPLE DATA`
   - Header row, exactly these 16, spelling and spacing preserved (`DAY ` has a trailing space):
     `DATE`, `DAY `, `TIME OF EVENT`, `DATE OF TICKET SUBMISSION`, `LATE REQUEST`, `EVENT OR PROGRAM`, `LOCATION`, `SECTION`, `POC (Name, Phone)`, `JOINT EVENT?`, `EST. ATTENDANCE`, `ACTUAL ATTENDANCE`, `SIGNED UP REQUIRED?`, `ON AF CONNCET APP?`, `SPONSORSHIP REQUESTED`, `Notes`
   - Then three added columns at the far right so nothing existing moves: `STATUS`, `TYPE`, `REQUEST #`
   - A month banner row before each month; one row per calendar day, empty days kept; a day with two events gets two rows; holidays put their name in `DAY `.
   - A checkbox in the menu, **Events only (no empty days)**, drops banners and empty days.
2. **Excel (.xls)** — the same rows as an HTML table saved with an `.xls` name and `application/vnd.ms-excel`. Status cells are colored (green Good to go, amber Not confirmed, grey struck-through Cancelled). Excel shows a one-time "format and extension don't match" prompt; note that beside the menu item. Cut this first if time runs short.
3. **Calendar file (.ics)** — one `VEVENT` per event (all-day when no time), cancelled ones marked `STATUS:CANCELLED`. Cut second.

Column fill rules:
| Column | Source |
|---|---|
| DATE | `DD-MMM-YY` |
| DAY | weekday from the date; holiday name on holiday rows |
| TIME OF EVENT | `1800-2000` style from start/end; `All Day` or `TBD` |
| DATE OF TICKET SUBMISSION | request `submittedAt`; blank for calendar-only seeds with none |
| LATE REQUEST | `On Time` / `Late` from the stored flag |
| EVENT OR PROGRAM / LOCATION / SECTION | title / where / section code |
| POC (Name, Phone) | name, then phone only if one was entered |
| JOINT EVENT? / SIGNED UP REQUIRED? | `Yes` / `No` |
| EST. / ACTUAL ATTENDANCE | numbers or blank |
| ON AF CONNCET APP? | `Yes` / `Not yet` / `No` |
| SPONSORSHIP REQUESTED | `Yes` if a sponsorship lane exists |
| Notes | cancel reason, then calendar notes |

Any cell starting with `=`, `+`, `-` or `@` is prefixed with `'` so a typed title cannot run as a formula.

## 9. Seed data (all invented)

Generated by `seed.js` **relative to today**, so the demo never looks stale: each seed has a month offset (0–11) and a day, not a fixed date.

- **36 requests**, 3 per month on average, numbers `MKT-26-0106` to `MKT-26-0141`. A handful before today in the current month so "actual attendance" and Complete states exist.
- **Featured:** Fall Fest 5K — Fitness Center, Jordan Hale, Design (flyers + social) In progress / Sponsorship New / Flash Waiting. Its number is printed in the demo script.
- **Mix:** about 10 calendar-only, 12 single-team, 9 two-team, 5 three-team; 4 flagged late; 3 cancelled with reasons ("Not enough sign-ups"); 2 multi-day trips; one recurring program entered as 5 separate dated seeds sharing a title.
- **Lane statuses:** every status appears at least 3 times; at least 2 requests Waiting on requester with a staff question in the thread; at least 3 unassigned lanes.
- **Titles (generic):** Karaoke Night, Storytime, LEGO Club, Paint and Sip, No-Tap Tournament, First Friday Social, Ski Day Trip, Castle Tour, Spring Carnival Demo, Sample Menu Board, Trivia Night, Family Bowling Day, Car Care Clinic, Summer Reading Kickoff, Holiday Market Trip, Kayak Morning.
- **Facilities → section code** (12): Fitness Center FSVS · Community Center FSWC · Club FSWC · Library FSDL · Arts and Crafts FSWT · Auto Hobby FSWT · Outdoor Recreation FSWO · Information, Tickets and Travel FSWI · Bowling Center FSWB · Youth Programs FSYP · Lodging FSH · Pet Lodge FSWS. Codes are illustrative; `#/about` says so.
- **Requesters (fake):** Jordan Hale, Sam Ortiz, Alex Kim, Riley Brooks, Casey Morgan, Dana Whitfield. Emails `first.last@example.com`. **No phone numbers in seeds.**
- **Staff (fake):** Design — Maya Chen, Taylor Reed · Flash — Priya Nair · Sponsorship — Marcus Bell · Web — Lena Fischer.
- **Holidays:** about 12 date-computed entries (New Year's Day, MLK Day, Presidents' Day, Memorial Day, Juneteenth, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas Day) plus 3 labeled "Family Day (sample)".

## 10. Data model

Stored under one key, `mktdemo.v1`, as JSON: `{ version, counter, requests: [...] }`. If `version` does not match, reseed.

```
Request
  id            "MKT-26-0142"
  submittedAt   ISO datetime
  late          boolean (set at submit from the lead-time rule)
  requester     { name, email, phone? }
  event         { facilityId, section, title, description,
                  date "YYYY-MM-DD", endDate?, allDay, start "HH:MM"?, end "HH:MM"?,
                  where, cost, estAttendance?, actualAttendance?,
                  joint, signup, afConnect "yes"|"notyet"|"no" }
  calendar      { status "notconfirmed"|"good"|"cancelled", cancelReason?, type?, notes? }
  jobs[]        ServiceJob
  thread[]      { at, author, role "requester"|"staff", kind "reply"|"note", jobId?, text }
  log[]         { at, who, text }

ServiceJob (a lane)
  id            "j1"
  service       "print"|"social"|"screen"|"flash"|"sponsorship"|"web"
  team          "design"|"flash"|"sponsorship"|"web"   (from service)
  status        "new"|"inprogress"|"waiting"|"done"|"declined"
  owner         staffId | null
  due           "YYYY-MM-DD"?
  details       service-specific answers (sizes, qty, breakEven, cash, items, page…)
  declineReason?
```

**CalendarEvent is never stored.** `calendarEvents(requests, window)` derives it on every render: one entry per request per day covered (`date`…`endDate`), carrying title, time, where, section, calendar status, services, late flag and request id. This is the point of the demo: the calendar cannot drift from the request.

**Store rules**
- `store.js` wraps `localStorage` in try/catch. If it throws (private mode, blocked inside a Teams frame), keep data in memory and show a small note: "Changes will not be kept after you close this page."
- First load, or Reset, writes seeds. **Reset demo data** lives in `#/about` and the staff header; it asks "Clear everything you added in this browser?" before acting.
- All derivations (overall status, ticket count, lead time, window, export rows) are pure functions in `model.js` and `export.js` so they can be tested with Node.

## 11. File layout

```
index.html            shell: banner, header, <main id="app">, footer; CSP + noindex meta
css/app.css           tokens, glass, layout, components, reduced-motion, fallbacks
js/app.js             hash router, shell rendering, staff/readonly mode
js/config.js          services, teams, facilities, staff, lead-time rule, labels
js/store.js           load/save/reset, memory fallback, id counter
js/seed.js            seed generator (relative dates), holiday list
js/model.js           pure: overallStatus, heskTicketCount, leadTime, window, calendarEvents
js/export.js          pure row builders + CSV/XLS/ICS strings + download helper
js/ui.js              el() helper, date formatting, toast, dialog/sheet, focus handling
js/views/home.js  request.js  sent.js  status.js
js/views/staff-queue.js  staff-request.js  calendar.js  about.js
tests/model.test.mjs  export.test.mjs  seed.test.mjs     (node --test, no packages)
robots.txt  .nojekyll  README.md  AGENTS.md  BACKLOG.md
```

All paths relative (`./js/app.js`), so the site works under `/<repo>/` on Pages and from `python3 -m http.server` locally.

## 12. Look and speed

- **Tokens** as CSS custom properties, straight from visual-plan-futuristic.md section 2 (navy `#133e5e`, wordmark `#edf6fb`, electric blue `#1776ea`, teal `#00abba`, pearl `#ecf0f5`, ink `#102f46`, secondary `#40586c`, action blue `#1262c4`, deep teal `#075b66`, border `#697c8c`).
- **Atmosphere:** fixed full-page layer of two or three large radial gradients (blue, teal) on pearl, drifting over about 20 s with a transform-only animation.
- **Glass:** panels at roughly 45–55% white with `backdrop-filter: blur(28px) saturate(1.4)`, bright top rim, darker lower edge, broad navy shadow, 28 px radius. A rear "lens" pseudo-element offset 10 px behind main panels. **Text always sits on a 92–100% white reading surface** inside the glass.
- **Fallback:** `@supports not (backdrop-filter: blur(1px))` → panels at about 88% white with the same rims and shadows.
- **Reduced motion:** `prefers-reduced-motion: reduce` freezes the atmosphere and removes lifts and transitions. A visible **Pause motion** button in the footer does the same and remembers the choice.
- **Controls:** system font stack, 18 px body, 16 px minimum, 48 px tap targets, visible 3 px focus outline, status always written out and never color alone. Primary buttons navy with pale text; white text never sits on raw teal or raw electric blue.
- **Mobile-first:** design at 390 px first, no horizontal scroll at 320 px. One task per screen. Sticky action tray (Back / Continue) with reserved space. Desktop from 900 px: two-column facts, lanes in a row, calendar grid.
- **Quick:** no framework, each view renders with DOM calls into `#app`, one delegated click listener. Route changes under 50 ms on a mid-range phone. Check the budget with `wc -c js/*.js js/views/*.js css/app.css`.

## 13. Out of scope today

Real email, file uploads (show a disabled "Add pictures or files" row labeled "not in this demo"), accounts, website-change-only requests, recurrence rules, proofing rounds, money-field hiding, admin screens, shared data between visitors, dark mode. Say so in `#/about` in two sentences so nobody reads a gap as a decision.

## 14. Hosting

**Pick: GitHub Pages on a new public repo, `mkt-one-request-demo`**, served from `main` at the root. URL: `https://<account>.github.io/mkt-one-request-demo/`.

Why: `gh` is already logged in, it is free with HTTPS, a push is the deploy, there is no build, and hash routes need no rewrite rules. Netlify or Cloudflare Pages would work equally well but need a new account and login today for no gain.

Repo name and README stay neutral ("Marketing request demo — sample data, unofficial"). No real names, no base contact details, nothing from `/workspace/org` copied in except this plan's content.

**Limits, and how to say them honestly**
- Data is per browser. A request sent on Joseph's phone does not appear on a reviewer's laptop.
- The read-only Teams link shows the sample events plus whatever that person's own browser added. It is not a live shared calendar.
- Clearing browser data or tapping Reset returns to the samples.
- Say it in three places: the calendar note (section 8), `#/about`, and the last line of the demo script. Framing: "This demo shows how it would work. A real version stores requests on a server so everyone sees the same calendar; that is the part that needs the agency's hosting answer."

**Process (charter)**
1. `BACKLOG.md` item #1 in the new repo before any code; close-out note after.
2. Premise check: confirm no such repo or earlier prototype exists (`gh repo list`, `/workspace/repos`).
3. Build on branch `prototype-v1`; test locally with `python3 -m http.server`; open a PR.
4. Tester runs section 15 and the security checklist, then sends PR and verdict to the Chief of Staff.
5. **Creating the public repo, merging to `main` and switching on Pages is the go-live step and needs Joseph's OK in the task text.** His request for "a working demo on free hosting" is the intent; the builder still checks that the build task says so before publishing.
6. After go-live: load the URL on a phone, confirm the banner, send one request, download the CSV.

## 15. Test checklist

**Automated (`node --test tests/*.mjs`)** — baseline is zero tests on a new repo; all must pass.
- `overallStatus` for each of the six rules in section 6.
- `heskTicketCount`: print+social → 1; print+flash+sponsorship → 3; calendar-only → 0.
- Lead time: 59 days → late; 60 days → on time; past date rejected.
- Window: 12 months from a fixed "today", including a December → January rollover and a leap February.
- `calendarEvents`: a 3-day trip yields 3 entries; a cancelled request is still returned.
- CSV: header row equals the 16 strings byte for byte (including `DAY `), commas, quotes and line breaks in a title are escaped, a title starting with `=` is neutralized, BOM present.
- Seeds: 36 requests, ids unique and ≤ 0141, every event date inside the window or the current month, no phone numbers, every email ends `@example.com`.
- Next id after seeding is `MKT-26-0142` (with the clock fixed in 2026).

**By hand, at 390 px and at 1280 px**
1. Home → form → Fill with sample → tick Flyers, Social, Flash, Sponsors → check screen shows every fact once → Send → number `MKT-26-0142`.
2. Lead-time note appears for a date 3 weeks out and does not block Send; the request shows **Late request** in staff view.
3. Back from step 3 to step 2 keeps every typed answer; reload on step 3 keeps them too.
4. Check status by number shows three team lines; an unknown number gives the plain "not found" message.
5. Staff view → Queue → the new request is first under All and under Design, Flash and Sponsorship tabs, and absent under Web.
6. Open it → 4 lanes, chip says "Old way: 3 separate tickets" → set Design to In progress, assign Maya Chen → overall status becomes In progress → status page shows it.
7. Set a lane to Waiting on requester with a reply → status page shows the highlighted question; a private note does **not** appear there.
8. Calendar → the event is on its day in grid and list → popover opens and closes by keyboard.
9. Staff edits the event date → the calendar moves it; history logs the change.
10. Cancel with a reason → still on the calendar, struck through; CSV has the reason in Notes and `Cancelled` in STATUS.
11. Download CSV → opens in Excel with 16 familiar headers, month banners and empty days. `.xls` opens after the prompt. `.ics` imports into a calendar app.
12. Copy link for Teams → open in a private window → list view, no staff toggle, no Reset, no edit controls, banner and footer present, Download still works.
13. Reset demo data → back to 36 samples; next number is 0142 again.
14. Reduced motion on → no drifting light, no lifts; page still looks like glass. Backdrop-filter off (devtools) → panels still readable.
15. Keyboard only: whole request flow, focus always visible. No horizontal scroll at 320 px. Text at 200% still usable.
16. Devtools Network tab: zero requests after initial load. Console: no errors, no CSP violations.
17. Size: JS + CSS under 100 KB.
18. In real Teams: add a Website tab with the read-only link (tester; report result either way).

**Security checklist for the PR** (each pass / fail / N/A with a reason): no login or permission guard removed (none exist) · no new packages · dependency audit (none) · no secrets, tokens or real personal data in the repo · no data leaves the browser (CSP + Network tab) · user text never rendered as HTML · CSV formula neutralizing · no seals or official marks · noindex present · paste TSV not read or copied.

## 16. Build order (about 2.5 hours)

| # | Slice | Minutes |
|---|---|---|
| 1 | Shell, router, tokens, glass, banner, footer | 20 |
| 2 | config, store, seed, model + tests | 30 |
| 3 | Request form, check screen, confirmation, status page | 40 |
| 4 | Staff queue and request page with lanes and thread | 35 |
| 5 | Calendar list, then grid, popover, filters, read-only | 30 |
| 6 | CSV export + tests; then `.xls`; then `.ics` | 15 |
| 7 | About page, reset, reduced motion, 390 px and keyboard pass | 15 |

If time runs out, cut in this order: `.ics`, `.xls`, section filter, Add a part, pointer-light effects. Never cut: the banner, the one form, lanes, the calendar list, CSV, the read-only link.

## 17. The 60-second demo script (for Joseph to send)

> **Try the new request flow — about a minute, works on your phone.**
> Link: `https://…/mkt-one-request-demo/`
> It is a demo with made-up events. Nothing you type is sent anywhere.
>
> 1. Tap **Marketing for an event or program**, then **Fill with sample answers**.
> 2. On "What do you need?", tick **Flyers or posters**, **Flash magazine listing** and **Help getting sponsors**. Today that is three separate forms.
> 3. Tap **Send request**. You get **one** number.
> 4. Tap **See it as staff (demo)**. One request, a lane for each team, each with its own status and owner. Change one.
> 5. Tap **Calendar**. Your event is already on the rolling 12-month calendar. Nobody typed it into Excel.
> 6. Tap **Download → Rolling Calendar (.csv)**. It opens in Excel with the same columns you use now.
> 7. Tap **Copy link for Teams**. That link can be pinned as a tab so everyone opens the same calendar view.
>
> One honest note: this demo keeps its data in your own browser, so you will see the sample events plus your own test, not each other's. A real version would share one live calendar.

## 18. Questions for Joseph (builder proceeds on the first option; none blocks the build)

1. **Form layout?** (a) Four short steps at every width — recommended, matches the phone mockups and "one task per screen". (b) One scrolling page with a check screen.
2. **Extra export columns?** (a) Keep the 16 and add STATUS, TYPE and REQUEST # at the far right — recommended. (b) The 16 only.
3. **Sample lead-time rule shown in the demo?** (a) 60 calendar days before the event, labeled as a sample — recommended, closest to the site's 60-day and 45-business-day lines. (b) No lead-time note in the demo until the agency names its rule.
4. **Who gets the link first?** (a) Joseph tries it on his phone, then forwards — recommended. (b) Send straight to the agency.
