# Marketing feedback relay

The deployed `fss-demo-feedback` Cloudflare Worker accepts JSON at
`https://fss-demo-feedback.jefepapi.workers.dev/feedback`. A browser
submission comes from `https://jefepapi.github.io`. The CORS preflight
returns 204. Successful submissions create issues in the private
`JefePapi/fss-demo-feedback` repository. The public draft link in the
demo is a separate, user-initiated action.

## Privacy and limits

The Worker logs one fixed warning if GitHub omits the release's `immutable`
flag. The warning contains no request, release or credential data. The
deployment disables observability and Logpush. The limiter reads the
Cloudflare connecting IP, groups IPv6 addresses by their first four hextets
(/64), and hashes the resulting key.
A SQLite-backed `RateLimiter` Durable Object keeps timestamps for up to
5 attempts per minute per key. Another object enforces 30 attempts per hour
across all senders. Alarms clear inactive counters. A per-isolate window and
the `RATE_LIMIT` binding provide additional checks. The text limiter runs
after the body cap and before secret and message checks, so unsuccessful
in-cap attempts also count.

The Worker verifies the Turnstile response with Cloudflare and requires
the verified hostname to equal `jefepapi.github.io`. The issue contains
the type, optional sample name (otherwise Anonymous), page, route, design,
server receipt time and message. The title begins with the type and an
excerpt of the first line. The message uses a fenced text block. Labels are
`feedback` plus the lowercase type, deduplicated. IP addresses, limiter
keys and check tokens are excluded from issues.

### Screenshot validation and storage (Worker version 6)

Text-only clients continue to send `application/json` with a cap of 8,192
UTF-8 bytes. The local preview marks its optional image request as
`application/json; screenshot=jpeg` and adds the entry `id` and a base64
`screenshot` field. The marker selects the 368,640-byte body cap before any
body reads, and the JSON must contain the matching screenshot field. Both
limits count actual streamed bytes. The Worker cancels the stream at the
first byte over the cap regardless of Content-Length.

The JPEG may be up to 262,144 bytes and 1,280 pixels on either edge. The
Worker checks markers, segments, baseline or progressive frame and scan
headers, and scan framing. The browser also checks that the flattened image
decodes before preview. The browser strips optional metadata emitted by its
canvas encoder, including color profiles. The Worker rejects images with
EXIF/GPS, XMP, ICC, comments or other optional metadata. Only the standard
thumbnail-free JFIF application header is allowed. Rejection keeps
untrusted metadata out without rewriting JPEGs in the Worker.

Before reading the image body or calling Turnstile, the Worker allows four
image attempts per sender per minute in each isolate. Verified image attempts
have separate buckets for one sender slot per minute and ten slots per hour
across all senders. Image requests leave the full text allowance available.

The relay creates the text issue first, with a `Screenshot failed.` note.
It checks that the repository is private, then looks up the designated
published, mutable `feedback-screenshots` release in the same repository.
It uploads the JPEG as `issue-<number>.jpg`. A successful upload must return
matching asset metadata, including the expected GitHub download URL. The
relay replaces the failure note with that link and confirms the screenshot
only after GitHub confirms the issue edit. The link uses the private
repository's GitHub release download path. Keep the repository private so
that access to the link continues to require repo access. [GitHub release asset API](https://docs.github.com/en/rest/releases/assets)

A full release (1,000 assets), an immutable or missing release, a release
response without an `immutable` flag, an unconfirmed private repository,
or an upload or link failure leaves the visitor's text issue intact. The
visitor sees that the text was sent and the
screenshot could not be confirmed. If the upload finishes but the issue
edit fails, the asset can still be found by issue number on the private
release. The Worker never creates releases or deletes assets. [GitHub release API](https://docs.github.com/en/rest/releases/releases)

Before issue creation is confirmed, the form keeps the draft and offers
**Send text only**. The retry reuses an unspent check or waits up to eight
seconds for a fresh one. A check error or timeout leaves a browser copy.
Visitor and staff text retries for an image attempt send the same
submission ID in the `Content-Type` parameter `submission`. The JSON
retains the text-only fields. The existing `LIMITER` binding serializes
each submission in a separately named Durable Object. A pending receipt
keeps a lookup start time. A confirmed receipt keeps the issue number and
delivery result. Receipts contain no JPEG, message, IP or token and have no
expiry. An explicit GitHub rejection releases the reservation. After an
uncertain response, the retry lists the repository's open and closed issues
for the lookup window and matches the submission ID in a hidden issue-body
comment. It reuses a matching issue. A successful lookup with no match
allows a new create. A failed lookup keeps the reservation for the next
retry. Reconciliation depends on GitHub listing a completed create before
the retry's lookup finishes. Issue creation has its own eight-second
deadline. The lookup and screenshot steps each have a separate deadline.

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
   (a fine-grained token restricted to the private feedback repository).
   Select these repository permissions:
   - **Issues: Read and write** for listing, creating and editing issues.
   - **Contents: Read and write** for reading the release and its assets
     and uploading the JPEG. GitHub requires this scope for release-asset
     uploads. [GitHub release asset API permissions](https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28#upload-a-release-asset)
   - **Metadata: Read** for the repository visibility check. GitHub includes
     this permission automatically.

   Save the Worker configuration through the normal deployment process.
   Both secrets belong only in the Worker.
3. Read the Worker root with GET to see its version and whether both
   secrets are present. The `configured` flag checks presence only.
   After site activation, a successful form submission returns 201 and
   an issue number. The inbox shows that number beside the browser copy.

Before any approved activation, the deployment owner provisions the
`feedback-screenshots` release as published and mutable in the private
feedback repository, and verifies a download with and without repository
access. Version 6 requires the existing `LIMITER` binding for image
submissions and their retries. The public editor flag stays off.

With either secret absent the POST returns 503. A limit returns 429.
An invalid message, failed challenge or unsuccessful GitHub request leaves
the local feedback available for a manual retry. Ordinary text-only entries
use the original issue creation path. A lost response on that path may
produce a second issue on manual retry.

Run `npm run test:relay` from the site root. The Node tests stub Durable
Object storage, verification, and all GitHub calls.
