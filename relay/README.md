# Marketing feedback relay

The deployed `fss-demo-feedback` Cloudflare Worker accepts JSON at
`https://fss-demo-feedback.jefepapi.workers.dev/feedback`. A browser
submission comes from `https://jefepapi.github.io`. The CORS preflight
returns 204. Successful submissions create issues in the private
`JefePapi/fss-demo-feedback` repository. The public draft link in the
demo is a separate, user-initiated action.

## Privacy and limits

The Worker has no application logging. Its deployment disables observability
and Logpush. The limiter reads the Cloudflare connecting IP, groups IPv6
addresses by their first four hextets (/64), and hashes the resulting key.
A SQLite-backed `RateLimiter` Durable Object keeps timestamps for up to
5 attempts per minute per key. Another object enforces 30 attempts per hour
across all senders. Alarms clear inactive counters. A per-isolate window and
the `RATE_LIMIT` binding provide additional checks. The limiter runs before
secret and message checks, so unsuccessful attempts also count.

The Worker verifies the Turnstile response with Cloudflare and requires
the verified hostname to equal `jefepapi.github.io`. The issue contains
the type, optional sample name (otherwise Anonymous), page, route, design,
server receipt time and message. The title begins with the type and an
excerpt of the first line. The message uses a fenced text block. Labels are
`feedback` plus the lowercase type, deduplicated. IP addresses, limiter
keys and check tokens are excluded from issues.

## Deployment and activation

The existing deployment uploaded `worker.js` as an ES module through a
multipart PUT to the Cloudflare Workers Scripts API, with compatibility date
`2026-11-01`. Its `LIMITER` binding points to `RateLimiter` and its
`RATE_LIMIT` binding allows five hits per 60 seconds. The service is
published on the account’s workers.dev subdomain.

1. Create a Turnstile widget for the hostname `jefepapi.github.io`.
   Put the **public site key** in `TURNSTILE_SITE_KEY` in
   `js/lazy/feedback-relay.js` for the next approved site release.
2. In Cloudflare, open the deployed **fss-demo-feedback** Worker, then
   **Settings → Variables and Secrets**. Add **Secret** values named
   `TURNSTILE_SECRET` (the matching widget secret) and `GITHUB_TOKEN`
   (a fine-grained token restricted to the private feedback repository
   with Issues read/write access). Save the Worker configuration through
   the normal deployment process. Both secrets belong only in the Worker.
3. Read the Worker root with GET to see its version and whether both
   secrets are present. The `configured` flag checks presence only.
   After site activation, a successful form submission returns 201 and
   an issue number. The inbox shows that number beside the browser copy.

With either secret absent the POST returns 503. A limit returns 429.
An invalid message, failed challenge or unsuccessful GitHub request leaves
the local feedback available for a manual retry. The Worker has no
idempotency key. If the browser loses the response after an issue is
created, a later manual retry can create a second issue.

Run `npm run test:relay` from the site root. The Node module loader stubs
the Cloudflare base class and the tests stub verification and issue creation.
