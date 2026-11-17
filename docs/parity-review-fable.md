# Independent review of the parity inventory (Fable 5.2)

Run 2026-11-17 12:45–12:48 Europe/Berlin, read-only, against the first draft of the inventory (`claude -p --model claude-fable-5-2`, tools Read/Glob/Grep only). Cost $2.68. Every point below was folded into docs/PARITY.md: missing rows added, misclassified rows corrected or split. Row names below are the reviewer's draft names, not the final IDs.

## Missing rows
- R-typo: "Did you mean…" email typo check | `suggest_email.php`, `detect_typos=1`, current-flow.md (on LIVE) | MISSING
- R-required: required-field rules (phone, Date Required, attendance, break-even all required on LIVE; optional in demo) | current-flow.md table, `request.js:112-134` | MISSING (or state as a deliberate change)
- R-flash-no-event: Flash input with no event date/time/place/cost | current-flow.md §C, `raw/cat_*.html`; demo forces all event facts (`request.js:66-85`) | MISSING (same gap as R11)
- R-guidelines: home-page rules (lead time, one proof change, POC approves, FSS events only) | `raw/home.html`, current-flow.md | MISSING
- R-download: view/download attachments on the ticket, "Download all" | `download_attachment.php`, `download_all.php` | MISSING
- R-filelimits: page listing allowed file types and sizes | `file_limits.php`, `raw/file_limits.html` | MISSING
- R-directlink: emailed direct link opens the ticket; staff "copy customer link" | `email_view_ticket=1`, `admin/admin_ticket.php` (copy_link) | MISSING (spec §5.5)
- R-flood: double-submit block, flood limit, optional cap on open tickets per email | `submit_ticket.php`, `flood`, `max_open` | MISSING (production)
- R-ticketmeta: requester sees category, created/updated dates, last replier, reply count, priority | `theme/hesk3/customer/view-ticket/view-ticket.php` | MISSING
- R-prefill: returning requester's name/email pre-filled | `customer_accounts.inc.php`; spec §5.2 | MISSING
- R-profile: customer changes own name/email/password | `profile.php`, `manage_mfa.php` | DROPPED with R28
- R-openedforyou: "ticket opened for you" email when staff file it | `language/en/emails/new_ticket_by_staff.txt` | DEMO-STUB
- X-maintenance: maintenance-mode page | `maintenance_mode`, `theme/hesk3/customer/maintenance.php` | MISSING (production)
- S-listview: sort, group by owner/category/priority, page size, choose columns, auto-reload | `inc/show_search_form.inc.php`, `admin/admin_settings_ticket_list.php` | MISSING
- S-quicklinks: one-tap views with counts (due soon, overdue, assigned to others, bookmarks) | `inc/ticket_list.inc.php` (ql_*) | MISSING
- S-bookmarks: personal bookmarks | `admin/admin_ticket.php` (bookmarks_add) | MISSING
- S-replyopts: on reply: set status after, "don't email customer", assign to me, change priority, signature | `admin/admin_ticket.php`, `admin/admin_reply_ticket.php` | MISSING
- S-draft: "Save and continue later" reply draft | `admin/save_ticket_draft_async.php` | MISSING
- S-noteedit: edit/delete a note; delete an attachment | `admin/edit_note.php`, `admin/admin_ticket.php` | MISSING
- S-unread: "Customer hasn't read this reply yet" marker | `admin/admin_ticket.php` (unread) | MISSING
- S-previous: previous tickets by the same requester | `admin/admin_ticket.php` (previous_tickets) | MISSING
- S-banfromticket: see requester IP, WHOIS, ban email/IP from the ticket | `admin/admin_ticket.php`, `ip_whois.php` | MISSING
- S-remind: "Remind assigned staff" button (not S28, not S40) | `admin/admin_ticket.php` (remind_assigned) | MISSING
- S-export1: export one ticket | `admin/export_ticket.php` | MISSING
- S-profile: staff profile: signature, default after-reply action, auto-start timer | `admin/profile.php` | MISSING
- S-loginsec: staff password reset, lock-out, 2-step codes, re-enter password for settings | `admin/password.php`, `admin/manage_mfa.php`, `admin/elevator.php` | MISSING (production)
- S-custompri: custom priorities | `admin/custom_priorities.php` | MISSING
- S-catrules: per-category private flag, default priority, default due date, auto-assign rule | `admin/manage_category.php` | MISSING
- S-stafffields: staff-only fields | `admin/custom_fields.php`, hesk-workflow.md | MISSING
- S-customers: approve/reject/edit/create customer accounts | `admin/manage_customers.php` | DROPPED with R28
- S-privatekb: staff-only knowledge base | `admin/knowledgebase_private.php` | open question (R29's reason covers the public KB only)
- S-online: who is online | `inc/users_online.inc.php` (off by default) | DROPPED-ON-PURPOSE

## Misclassified
- Whole "Now" column: "(add)", "(extend)", "(add stub)" are not in the status key | PARITY-DRAFT.md; README "no email, no files, no logins" | list as MISSING until built
- R12/R24/S13 "(add)": a static localStorage demo cannot hold 25 × 15 MB files | README limits | DEMO-STUB at best
- R20/R21 "(add)": needs real email; an emailed list is not an on-screen "My tickets" | `my_tickets.php` | R20 DEMO-STUB, R21 MISSING
- R10 COVERED: no Flash section exists; `section` is the calendar section code (FSVS…) | `config.js:30-37` | MISSING
- R08 COVERED: one quantity for all sizes, 5 sizes not 12, no comments box | `request.js:122-126`, `config.js:26` | PARTIAL
- R07 COVERED: in-hand date only under Flyers, optional; none for social/screen/sponsorship | `request.js:125` | PARTIAL
- R02 COVERED: 12 sample facilities of 22 | `config.js:30-37` | COVERED (sample list) — say so
- R22 COVERED: status page omits description, service answers, submitted/updated dates | `status.js:43-46` | PARTIAL
- R23 COVERED: reply only appends to the thread; no status flip, no history line, no queue marker for staff | `status.js:66-70`, `staff-queue.js` | PARTIAL
- R13 "(add trap)": a trap means nothing without a server; rate limit (spec §5.7) absent | spec §5.7 | DEMO-STUB
- S03 COVERED: no filter by a specific status or "assigned to others"; Open vs Everything only | `staff-queue.js:7-25` | PARTIAL
- S08 COVERED: a lane has one owner from its own team; no extra person can be added | `staff-request.js:63` | MISSING or DROPPED with that reason
- S09 "(add On hold)": the automatic "Waiting reply"/"Replied" turns also do not exist | `config.js:48`, `inc/statuses.inc.php` | PARTIAL
- S17 COVERED: just the public form; no "opened by staff" mark, no owner/due at creation, no notify choice | `admin/new_ticket.php` vs `sent.js:33` | PARTIAL
- S18 COVERED: only event facts editable; not requester name/email/phone, lane answers, or messages | `staff-request.js:21-31` | PARTIAL
- S20 COVERED: "Add a part" makes an empty lane; nothing moves across | `staff-request.js:79` | PARTIAL
- S25 COVERED: calendar export only; STATUS is the calendar status; no lane status, owner, email, messages, date range | `export.js:13-27` vs `admin/export.php` | MISSING
- R28 DROPPED: on at LIVE; replacement (R18 email check, R20) is not built | `raw/login.html`, `raw/register.html` | MISSING, pending agency
- S16 DROPPED: reason cites a demo-only sample button, not staff templates | `admin/manage_ticket_templates.php` | MISSING, ask agency
- S21 DROPPED: two different requests (duplicate, follow-up) still cannot be linked | `admin/admin_ticket.php` (link_ticket) | MISSING
- S32 DROPPED: requester can still post after every lane is Done | `status.js:64-71` | MISSING
- S33/R27 DROPPED: on by default in stock; spec §3 says ask the agency first | `time_worked=1`, `rating=1` | open question
- S36/S37 DROPPED: "unknown on live / ask agency" is not a decision | `inc/mail/hesk_pipe.php`, `autoclose` | open question
- S39 DROPPED: "Teams covers this" is an assumption | `admin/mail.php` | open question

## Split these
- R13 | spam question / hidden trap / reCAPTCHA / ban lists | dropped / stub / dropped / MISSING
- R17 | requester confirmation email vs Cc copies (depends on R04) | separate rows
- R22 | status / fields / replies / attachments | separate rows
- R25 | close own ticket vs reopen | `custclose`, `custopen` are separate switches
- R28 | register+verify / login / password reset / 2-step / "email has an account, must log in" | separate rows
- R32 | email on staff reply vs on close; "started/on hold" belongs in section C | separate rows
- S01 | login vs lock-out, 2-step, password reset | separate rows
- S20 | move category vs add/cancel a part | separate rows
- S27 | each email trigger vs per-person on/off (row already gives two statuses) | separate rows
- S29 | bulk close / priority / assign / merge / tag / print / export / delete / anonymize | `inc/ticket_list.inc.php` | separate rows
- S30 | delete / anonymize (privacy) / tag ("archive") | `admin/delete_tickets.php`, `anonymize_ticket.php`, `archive.php`
- S31 | edit reply vs delete reply | `admin/edit_post.php`, `admin/admin_ticket.php`
- S34 | staff accounts / permission switches / category visibility | `admin/manage_users.php`
- S35 | categories / custom fields / email templates / canned / bans / service messages / customer import / settings | one row per `admin/*.php` screen
- S38 | statistics / escalation / survey / recurring (spec §12 wants repeating events) | `admin/module_*.php`
