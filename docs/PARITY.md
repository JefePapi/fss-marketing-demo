# Parity inventory: the old ticket site vs. this demo

**Question:** can people do everything they could do on the old 52 FSS Marketing ticket site, just simpler?
**Answer in one line:** every everyday requester and staff task is in the demo (COVERED or DEMO-STUB), and each of those rows has an automated browser test. What is not in the demo is listed below as MISSING (mostly server and admin settings a real build needs) or DROPPED-ON-PURPOSE (with the reason).

**Old system:** HESK 3.6.4 ticket software with a vendor skin. Sources: the stock HESK 3.6.4 code (read only, never run), the public live pages saved on 2026-11-10, and the rebuild notes. **Source** column: CODE = stock HESK can do it; LIVE = seen on the public live site. Staff screens on the live site were never seen, so staff rows list what stock HESK can do; the agency may not use all of it.

**Status key**
- **COVERED**: you can do it in the demo. The last text column says where, and what got simpler.
- **DEMO-STUB**: shown or simulated in the demo (email, sign-in, server checks) and done for real in a production build.
- **MISSING**: not in the demo. Listed honestly.
- **DROPPED-ON-PURPOSE**: left out on purpose; the reason is given. Items marked "open question" need the agency's answer.

**Before** = the demo at commit `0b90329`. **Now** = after this parity pass.
The inventory was drafted from the sources and then independently reviewed by Fable 5.2, which added 33 rows and reclassified 23. Its review is in `docs/parity-review-fable.md`.

Every demo screen still says "unofficial demo, sample data". Files, requests and the email log stay in the visitor's own browser.

## Counts

| Status | Before (0b90329) | Now |
|---|---|---|
| COVERED | 29 | 65 |
| DEMO-STUB | 4 | 13 |
| MISSING | 84 | 26 |
| DROPPED-ON-PURPOSE | 0 | 13 |
| **Total rows** | 117 | 117 |

## A. Requester side

| ID | Old system capability | Source | Before | Now | Where and how in the demo / reason | Test |
|---|---|---|---|---|---|---|
| R01 | Open a request from a public web form, no account needed | CODE+LIVE | COVERED | **COVERED** | Home → Start a request. One form in four short steps instead of pick-a-facility → continue → one of 4 layouts. | parity.spec |
| R02 | Choose the facility | LIVE | COVERED | **COVERED** | Step 2 list holds facilities only (12 sample names; real list of 22 is a setting). Sponsorship, Flash and Website are tick boxes, not fake "facilities". | parity.spec |
| R03 | Give name, email and phone | LIVE | COVERED | **COVERED** | Step 1, asked once for all teams. Phone optional in the demo (required on live). | parity.spec |
| R04 | Add followers (Cc) who get copies | CODE+LIVE | MISSING | **COVERED** | Step 1 "Also send updates to" (up to 5 emails); shown to staff and on the status page; Cc'd in the email log. | parity.spec |
| R05 | Did you mean …? email typo check | CODE+LIVE | MISSING | **COVERED** | Step 1 suggests a fix for common domain typos; one tap applies it. | parity.spec |
| R06 | Title and description | LIVE | COVERED | **COVERED** | Step 2 "What is it called?" / "What is happening?". | parity.spec |
| R07 | Event date, time, location, cost | LIVE | COVERED | **COVERED** | Step 2; also multi-day and all-day. | parity.spec |
| R08 | Date Required (when the product is needed) | LIVE | COVERED | **COVERED** | Flyers/posters → "When do you need it in hand?". | parity.spec |
| R09 | Printing options with quantities | LIVE | COVERED | **COVERED** | Flyers/posters → pick sizes, a quantity for each size. | parity.spec |
| R10 | Commercial sponsorship: attendance, break-even, cash, items | LIVE | COVERED | **COVERED** | Tick "Help getting sponsors"; attendance asked once in step 2 and shared. | parity.spec |
| R11 | Ask for a Flash magazine listing | LIVE | COVERED | **COVERED** | Tick "Flash magazine listing" on the same request. | parity.spec |
| R12 | Flash section (13 choices) | LIVE | MISSING | **COVERED** | Not asked of the requester; the Flash lane has a "Flash section" picker, pre-chosen from the facility. | parity.spec |
| R13 | Flash notice with no event date or place | LIVE | MISSING | **COVERED** | Home → "Something that isn't an event" → Flash notice: name, email, title, text, files. One Flash lane, no calendar entry. | parity.spec |
| R14 | Webmaster request: page address, old text, new text | LIVE | MISSING | **COVERED** | Home → "Something that isn't an event" → Website change. One Web lane, no calendar entry. | parity.spec |
| R15 | Attach files (25 files, 15 MB each, set file types) | CODE+LIVE | MISSING | **COVERED** | Step 3 "Add pictures or files"; same limits and type list; files are kept in this browser only (IndexedDB). | parity.spec |
| R16 | See which file types and sizes are allowed | LIVE | MISSING | **COVERED** | The limits are printed next to the file picker; a refused file says why. | parity.spec |
| R17 | Download attachments from the request | CODE | MISSING | **COVERED** | File list with Download on the status page and the staff page. | parity.spec |
| R18 | Download all files as one zip | CODE | MISSING | **MISSING** | Not built; files download one by one. | — |
| R19 | Spam question on every form | LIVE | MISSING | **DROPPED-ON-PURPOSE** | Rebuild spec §4: no quiz for real people; a hidden trap does the job. | — |
| R20 | Hidden bot-trap fields | CODE+LIVE | MISSING | **DEMO-STUB** | A hidden field; if filled, Send is refused. Real check belongs on the server. | parity.spec |
| R21 | reCAPTCHA, flood limit, open-request cap, banned emails/IPs | CODE | MISSING | **MISSING** | Server-side protections; production only. | — |
| R22 | Lead-time rule | CODE+LIVE | COVERED | **COVERED** | One sample rule (60 days) shown the moment the date is picked; late is allowed but flagged to staff. | parity.spec |
| R23 | Errors shown with typing kept | CODE | COVERED | **COVERED** | Per-field messages; draft survives Back and reload. | parity.spec |
| R24 | Reload or double-click does not send twice | CODE | COVERED | **COVERED** | Send is locked after the first click. | parity.spec |
| R25 | Confirmation page with tracking number | CODE | COVERED | **COVERED** | One request number (MKT-YY-NNNN) for every team, with a Copy button. | parity.spec |
| R26 | Confirmation email to requester and Cc | CODE | DEMO-STUB | **DEMO-STUB** | The receipt lists the email that would go out; staff page "Email log". Nothing is sent. | parity.spec |
| R27 | Check a request with tracking number + email | CODE | MISSING | **COVERED** | Check on a request asks for number and email; a wrong pair gets the plain "not found". | parity.spec |
| R28 | Lock-out after repeated wrong guesses | CODE | MISSING | **MISSING** | Server-side; production only. | — |
| R29 | Forgot the number → list of my requests by email | CODE | MISSING | **DEMO-STUB** | Forgot your number? takes an email; the demo shows the list on screen instead of emailing it. | parity.spec |
| R30 | My tickets list for a signed-in requester | CODE+LIVE | MISSING | **DEMO-STUB** | Same list as R29, without an account. Production would email it. | parity.spec |
| R31 | See status | CODE | COVERED | **COVERED** | Overall status plus one line per team. | parity.spec |
| R32 | See what was sent: details, answers, files, dates | CODE | MISSING | **COVERED** | Status page shows description, each part's answers, files, sent and last-updated dates. | parity.spec |
| R33 | See replies | CODE | COVERED | **COVERED** | Messages list on the status page; private notes never show. | parity.spec |
| R34 | Reply to staff | CODE | COVERED | **COVERED** | Send a message. A reply moves any "Waiting on requester" part back to "In progress" and marks the request "New reply" for staff. | parity.spec |
| R35 | Attach files to a reply | CODE | MISSING | **COVERED** | File picker under "Send a message". | parity.spec |
| R36 | Close my own request | CODE | MISSING | **COVERED** | I no longer need this with optional reason: open parts closed, calendar entry cancelled, logged. | parity.spec |
| R37 | Reopen my own request | CODE | MISSING | **COVERED** | Reopen brings back the parts and calendar status as they were. | parity.spec |
| R38 | Print the request | CODE | MISSING | **COVERED** | Print button; print layout hides the background and menus. | parity.spec |
| R39 | Link in the email opens the request | CODE | MISSING | **DEMO-STUB** | Staff "Copy requester link"; the link opens the status page directly (demo shortcut, no email check). | parity.spec |
| R40 | Old number of a merged request forwards | CODE | MISSING | **COVERED** | Opening a merged number shows the surviving request with a note. | parity.spec |
| R41 | Email when staff reply | CODE | DEMO-STUB | **DEMO-STUB** | Added to the email log unless staff tick "Don't email". | parity.spec |
| R42 | Email when the request is finished | CODE | DEMO-STUB | **DEMO-STUB** | Added to the email log when every part is Done or Declined. | parity.spec |
| R43 | Rate a staff reply | CODE | MISSING | **DROPPED-ON-PURPOSE** | Spec §3 "probably not needed"; open question for the agency. | — |
| R44 | Register a requester account (confirm by email) | CODE+LIVE | MISSING | **DROPPED-ON-PURPOSE** | Spec: never required. Number + email replaces it. Open question for the agency. | — |
| R45 | Returning requester's details pre-filled | CODE | MISSING | **COVERED** | Remember my details on this device fills step 1 next time (no password). | parity.spec |
| R46 | Requester log in, password reset, 2-step codes, profile | CODE+LIVE | MISSING | **DROPPED-ON-PURPOSE** | Goes with R44; no requester passwords. | — |
| R47 | Knowledge base and article suggestions | CODE | MISSING | **DROPPED-ON-PURPOSE** | None linked on the live site. | — |
| R48 | Requester picks priority | CODE | MISSING | **DROPPED-ON-PURPOSE** | Hidden on the live form; staff set priority (S18). | — |
| R49 | Home-page rules (lead time, proof changes, POC approval) | LIVE | MISSING | **COVERED** | Before you send box on the home page (sample wording). | parity.spec |
| R50 | Maintenance-mode page | CODE | MISSING | **MISSING** | Production only. | — |

## B. Staff and admin side

| ID | Old system capability | Source | Before | Now | Where and how in the demo / reason | Test |
|---|---|---|---|---|---|---|
| S01 | Staff sign-in | CODE | DEMO-STUB | **DEMO-STUB** | Staff view switch and "Acting as" picker; no password in the demo. | parity.spec |
| S02 | Staff password reset, lock-out, 2-step codes | CODE | MISSING | **MISSING** | Production only. | — |
| S03 | Work queue list | CODE | COVERED | **COVERED** | One card per request, with each team's status. | parity.spec |
| S04 | Filter by category/team | CODE | COVERED | **COVERED** | Team tabs with counts. | parity.spec |
| S05 | Mine / Unassigned / Open / Everything | CODE | COVERED | **COVERED** | Show tabs, using "Acting as". | parity.spec |
| S06 | Filter by status | CODE | MISSING | **COVERED** | Status picker on the queue (by part status). | parity.spec |
| S07 | Filter by priority | CODE | MISSING | **COVERED** | Priority picker on the queue. | parity.spec |
| S08 | Overdue and due-soon views | CODE | MISSING | **COVERED** | Overdue and "Due in 7 days" tabs; Overdue tag on cards and parts. | parity.spec |
| S09 | Search across number, name, email, text, notes | CODE | MISSING | **COVERED** | Queue search looks through number, title, requester, email, Cc, facility, description, answers, messages and notes. | parity.spec |
| S10 | Sort, columns, page size, group-by settings | CODE | MISSING | **MISSING** | Fixed order: urgent first, then event date. | — |
| S11 | Personal bookmarks | CODE | MISSING | **MISSING** | Not built. | — |
| S12 | Auto-assign to whoever has the fewest open | CODE | MISSING | **COVERED** | Auto-assign on an unassigned part picks the teammate with the fewest open parts; logged. | parity.spec |
| S13 | Assign, reassign, unassign by hand | CODE | COVERED | **COVERED** | Owner per part; logged. | parity.spec |
| S14 | Several teams share one request (collaborators) | CODE | COVERED | **COVERED** | Each team gets its own part with its own owner on the same request. | parity.spec |
| S15 | Extra person on the same part | CODE | MISSING | **MISSING** | A part has one owner. | — |
| S16 | Statuses incl. In progress and On hold | CODE | MISSING | **COVERED** | Per part: New, In progress, Waiting on requester, On hold, Done, Declined. | parity.spec |
| S17 | Automatic "customer replied" status | CODE | MISSING | **COVERED** | A requester reply sets "New reply" and moves Waiting parts to In progress (see R34). | parity.spec |
| S18 | Staff-set priority (Low to Critical) | CODE | MISSING | **COVERED** | Priority picker on the request; High and Critical show on the queue; logged. | parity.spec |
| S19 | Custom statuses and priorities | CODE | MISSING | **MISSING** | Admin setting; production. | — |
| S20 | Reply to the requester | CODE | COVERED | **COVERED** | Thread "Reply to requester", optionally about one part. | parity.spec |
| S21 | Reply without emailing | CODE | MISSING | **DEMO-STUB** | Don't email the requester box; the email log skips it. | parity.spec |
| S22 | Attach files to a reply or note | CODE | MISSING | **COVERED** | File picker in the thread. | parity.spec |
| S23 | Private staff notes | CODE | COVERED | **COVERED** | Save private note; never on the status page. | parity.spec |
| S24 | Edit or delete a reply or note | CODE | MISSING | **MISSING** | Not built. | — |
| S25 | Saved (canned) replies | CODE | MISSING | **COVERED** | Insert a saved reply picker in the thread (sample texts). | parity.spec |
| S26 | Save a reply draft for later | CODE | MISSING | **MISSING** | Not built. | — |
| S27 | Templates for staff-made requests | CODE | MISSING | **MISSING** | Not built; open question for the agency. | — |
| S28 | File a request for a walk-in or phone caller | CODE | MISSING | **COVERED** | In staff view the form has "Sent in by staff for a caller"; the request and history show it. | parity.spec |
| S29 | Edit the request's details | CODE | COVERED | **COVERED** | Edit facts; every change logged (the old system logged none). | parity.spec |
| S30 | Edit the requester's contact details | CODE | MISSING | **COVERED** | Contact fields in "Edit facts"; logged. | parity.spec |
| S31 | Due date | CODE | COVERED | **COVERED** | Due date per part. | parity.spec |
| S32 | Move work to another team | CODE | MISSING | **COVERED** | Move to on a part changes it to another team's service; owner cleared; logged. | parity.spec |
| S33 | Add or cancel a part later | CODE | COVERED | **COVERED** | Add a part; decline a part with a reason. | parity.spec |
| S34 | Link related requests | CODE | MISSING | **COVERED** | Related requests: add a number, links both ways. | parity.spec |
| S35 | Merge duplicates | CODE | MISSING | **COVERED** | Merge into…: messages, parts, files and history move to the other request; old number forwards. | parity.spec |
| S36 | History / audit trail | CODE | COVERED | **COVERED** | History list per request. | parity.spec |
| S37 | Print | CODE | MISSING | **COVERED** | Print button on the staff request page. | parity.spec |
| S38 | Export to a spreadsheet (calendar) | CODE | COVERED | **COVERED** | Calendar → Download: CSV, Excel, .ics with the sheet's 16 headers. | parity.spec |
| S39 | Export the request list | CODE | MISSING | **COVERED** | Queue → "Download requests (CSV)": number, title, requester, priority, each part's status, owner and due date. | parity.spec |
| S40 | Export one request | CODE | MISSING | **MISSING** | Print → Save as PDF is the stand-in. | — |
| S41 | Reports: counts per month, team, staff, facility | CODE | MISSING | **COVERED** | Staff → Reports. | parity.spec |
| S42 | Staff emails: new work, assigned to me, requester replied | CODE | MISSING | **DEMO-STUB** | Written to the email log on each trigger. | parity.spec |
| S43 | Each person chooses which emails they get | CODE | MISSING | **MISSING** | Production setting. | — |
| S44 | Overdue reminders | CODE | MISSING | **DEMO-STUB** | Overdue tab and tags; the scheduled email is production. | parity.spec |
| S45 | Remind the owner button | CODE | MISSING | **DEMO-STUB** | Adds a reminder to the email log. | parity.spec |
| S46 | Re-send a notification | CODE | MISSING | **DEMO-STUB** | Re-send receipt adds it to the email log again. | parity.spec |
| S47 | Other requests from the same person | CODE | MISSING | **COVERED** | Listed on the staff request page. | parity.spec |
| S48 | Requester hasn't read this yet marker | CODE | MISSING | **MISSING** | Not built. | — |
| S49 | Requester IP, WHOIS, ban from the request | CODE | MISSING | **MISSING** | Production only. | — |
| S50 | Bulk actions on ticked rows | CODE | MISSING | **MISSING** | Not built. | — |
| S51 | Delete or anonymize a request | CODE | MISSING | **MISSING** | Production (privacy rules). | — |
| S52 | Archive tag | CODE | MISSING | **MISSING** | Not built. | — |
| S53 | Lock a request against replies | CODE | MISSING | **MISSING** | Not built. | — |
| S54 | Time worked | CODE | MISSING | **DROPPED-ON-PURPOSE** | Spec §3 "probably not needed"; open question. | — |
| S55 | Staff accounts, permissions, which teams each person sees | CODE | MISSING | **MISSING** | Production; demo shows all teams. | — |
| S56 | Admin: facility list and form fields | CODE | MISSING | **MISSING** | Production admin. | — |
| S57 | Admin: email wording | CODE | MISSING | **MISSING** | Production admin. | — |
| S58 | Admin: edit the saved-reply list | CODE | MISSING | **MISSING** | Production admin. | — |
| S59 | Admin: ban lists, site banners, customer import, settings | CODE | MISSING | **MISSING** | Production admin. | — |
| S60 | Staff-only fields | CODE | COVERED | **COVERED** | Calendar card fields (type, section code, actual attendance) are staff-only. | parity.spec |
| S61 | Email-to-ticket (mailbox import) | CODE | MISSING | **DROPPED-ON-PURPOSE** | Off by default; use on live unknown. Open question. | — |
| S62 | Auto-close inactive requests | CODE | MISSING | **DROPPED-ON-PURPOSE** | Off by default. | — |
| S63 | Paid modules: escalation, satisfaction survey, recurring tickets | CODE | MISSING | **DROPPED-ON-PURPOSE** | Not in the download; unknown whether the vendor supplies them. Repeating events are a calendar question. | — |
| S64 | Staff private messages | CODE | MISSING | **DROPPED-ON-PURPOSE** | Open question; Teams may cover it. | — |
| S65 | Who is online | CODE | MISSING | **DROPPED-ON-PURPOSE** | Off by default. | — |
| S66 | Staff-only knowledge base | CODE | MISSING | **DROPPED-ON-PURPOSE** | Open question. | — |
| S67 | Staff profile and signature | CODE | MISSING | **MISSING** | Production. | — |

## The test

`tests/parity.spec.mjs` (Playwright) has one test per COVERED or DEMO-STUB row, named `<ID> <capability>`. Each test drives the demo like a user in a fresh browser and runs at two widths: desktop (1280 px) and phone (390 px). `tests/parity-inventory.test.mjs` fails the build if a COVERED/DEMO-STUB row has no matching test, or a test has no row.

```
npm install          # test tools only; the site itself has no packages
npm test             # unit tests + parity suite against a local copy
npm run test:live    # parity suite against https://jefepapi.github.io/fss-marketing-demo/
```

### Results (2026-11-17, Europe/Berlin)

| Run | Where | Result |
|---|---|---|
| Unit tests | `node --test tests/*.test.mjs` | 32 passed / 32 (5 files) |
| Parity suite, local | http://127.0.0.1:4173/ (this folder) | **156 passed / 156** (78 tests × 2 widths), 0 flaky |
| Parity suite, live | https://jefepapi.github.io/fss-marketing-demo/ | run after this push (see the next commit) |

## Honest gaps (MISSING, by theme)

- **Server and security work a real build needs:** wrong-guess lock-out, reCAPTCHA/flood limits/ban lists, staff password reset and 2-step codes, requester IP/ban tools, maintenance page (R21, R28, R50, S02, S49).
- **Admin screens:** staff accounts and permissions, facility list and form fields, email wording, saved-reply list, custom statuses and priorities, per-person email choices, staff profile (S19, S43, S55–S59, S67).
- **Smaller staff tools not built:** download-all zip, list sort/column settings, bookmarks, extra person on one part, edit/delete a reply or note, reply drafts, staff templates, export one request (Print → PDF stands in), unread marker, bulk actions, delete/anonymize, archive tag, lock (R18, S10, S11, S15, S24, S26, S27, S40, S48, S50–S53).

Dropped on purpose (13): spam quiz, reply ratings, requester accounts/passwords, knowledge base, requester-chosen priority, time worked, email-to-ticket, auto-close, paid modules, staff private messages, who's online, staff-only knowledge base. Several are open questions for the agency, marked in the rows.
