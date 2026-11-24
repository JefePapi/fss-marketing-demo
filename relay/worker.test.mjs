import test from 'node:test'; import assert from 'node:assert/strict';
import worker, { validate, issueFor, localLimit } from './worker.js';
import { checkUrl, githubStub, privateLink, releaseAssets, releaseTag, repo, stubLimiter, uploadUrl } from './test-support.mjs';
const O = 'https://jefepapi.github.io';
let ip = 0;
const req = (opts = {}) => new Request('https://x.workers.dev' + (opts.path || '/feedback'), { method: opts.method || 'POST',
  headers: { ...(opts.origin === null ? {} : { Origin: opts.origin || O }), 'Content-Type': opts.ct || 'application/json',
    'CF-Connecting-IP': opts.ip || 'test-sender-' + (++ip), ...opts.headers },
  body: (opts.method || 'POST') === 'POST' ? opts.raw ?? JSON.stringify(opts.body || { type: 'suggestion', message: 'Hi @team #12 ```x```', name: 'Jo', page: 'Home', route: '#/', theme: 'a', turnstileToken: 't' }) : undefined,
  ...(opts.raw instanceof ReadableStream && { duplex: 'half' }) });
test('rejects other origins', async () => { assert.equal((await worker.fetch(req({ origin: 'https://evil.example' }), {})).status, 403); assert.equal((await worker.fetch(req({ origin: null }), {})).status, 403); });
test('preflight has strict CORS', async () => { const r = await worker.fetch(req({ method: 'OPTIONS' }), {}); assert.equal(r.status, 204); assert.equal(r.headers.get('Access-Control-Allow-Origin'), O); });
test('503 when not configured', async () => { const r = await worker.fetch(req(), {}); assert.equal(r.status, 503); assert.equal((await r.json()).error, 'not configured'); assert.equal(r.headers.get('Access-Control-Allow-Origin'), O); });
test('429 when rate limited', async () => { const r = await worker.fetch(req(), { RATE_LIMIT: { limit: async () => ({ success: false }) } }); assert.equal(r.status, 429); });
test('validation', () => { assert.ok(validate({ type: 'x', message: 'a' }).error); assert.ok(validate({ type: 'bug', message: '  ' }).error); assert.ok(validate({ type: 'bug', message: 'a'.repeat(2001) }).error); assert.ok(validate({ type: 'bug', message: 'ok' }).value); });
test('issue text is inert', () => { const i = issueFor(validate({ type: 'suggestion', message: 'Hi @team #12 ```x```', theme: 'a' }).value); assert.ok(!/@team/.test(i.body)); assert.ok(!/```/.test(i.body)); assert.deepEqual(i.labels, ['feedback', 'suggestion']); assert.ok(i.title.startsWith('[Suggestion] ')); });
test('creates issue when configured and check passes', async () => {
  const calls = []; const orig = globalThis.fetch;
  globalThis.fetch = async (u, init) => { calls.push(String(u)); if (String(u).includes('siteverify')) return Response.json({ success: true, hostname: 'jefepapi.github.io' }); return new Response(JSON.stringify({ number: 7 }), { status: 201 }); };
  try { const r = await worker.fetch(req(), { GITHUB_TOKEN: 'x', TURNSTILE_SECRET: 'y', RATE_LIMIT: { limit: async () => ({ success: true }) } }); assert.equal(r.status, 201); assert.equal((await r.json()).number, 7); assert.equal(calls.length, 2); }
  finally { globalThis.fetch = orig; } });
test('bad turnstile is 403', async () => { const orig = globalThis.fetch; globalThis.fetch = async () => Response.json({ success: false });
  try { assert.equal((await worker.fetch(req(), { GITHUB_TOKEN: 'x', TURNSTILE_SECRET: 'y' })).status, 403); } finally { globalThis.fetch = orig; } });
test('local limiter allows 5 per minute', () => { for (let i = 0; i < 5; i++) assert.equal(localLimit('k', 1000), true); assert.equal(localLimit('k', 1000), false); assert.equal(localLimit('k', 62000), true); });

// Flat gray, single-component JPEGs made with Pillow. Wide fixtures use
// baseline scans and tall fixtures use progressive scans.
const jpegs = Object.fromEntries(Object.entries({
  wide: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAIBQABAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AIYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9k=',
  tooWide: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAIBQEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AIYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/9k=',
  tall: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wgALCAUAAAgBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAT/2gAIAQEAAAABhAAAAAAAAAAAAAAAAAAAAAAAAAAH/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQABBQIg/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQAGPwIg/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQABPyEg/9oACAEBAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAA/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQABPxAg/9k=',
  tooTall: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wgALCAUBAAgBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAT/2gAIAQEAAAABhAAAAAAAAAAAAAAAAAAAAAAAAAAD/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQABBQIh/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQAGPwIh/8QAFBABAAAAAAAAAAAAAAAAAAAAcP/aAAgBAQABPyEh/9oACAEBAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAf//EABQQAQAAAAAAAAAAAAAAAAAAAHD/2gAIAQEAAT8QIf/Z',
}).map(([name, base64]) => [name, Buffer.from(base64, 'base64')]));

const withSize = size => Buffer.concat([
  jpegs.wide.subarray(0, -2), Buffer.alloc(size - jpegs.wide.length, 0xff), jpegs.wide.subarray(-2),
]); // JPEG permits FF fill bytes before EOI.
const imageCT = 'application/json; screenshot=jpeg';
const textFields = { type: 'feedback', message: 'Sample résumé', turnstileToken: 'sample-check' };
let submission = 0;
const imageBody = jpeg => ({ ...textFields, id: (++submission).toString(16).padStart(32, '0'), screenshot: jpeg.toString('base64') });
const testEnv = { GITHUB_TOKEN: 'sample-issue-key', TURNSTILE_SECRET: 'sample-check-key' };
testEnv.LIMITER = stubLimiter(testEnv);

function stubExternal(t, verify = () => ({ success: true, hostname: new URL(O).hostname }), override) {
  const github = githubStub(7, override);
  const { mock } = t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === checkUrl)
      return Response.json(verify(options.body.get('response')));
    return github(url, options);
  });
  return Object.assign(mock, { issues: github.issues });
}

const modes = ['accurate length', 'no length', 'lying smaller length', 'chunked without length'];
function transport(raw, mode) {
  const size = Buffer.byteLength(raw);
  const headers = mode === 'accurate length' ? { 'Content-Length': String(size) }
    : mode === 'lying smaller length' ? { 'Content-Length': '1' } : {};
  if (mode !== 'chunked without length') return { raw, headers };
  const bytes = new TextEncoder().encode(raw);
  const split = bytes.indexOf(0xc3) + 1; // Split the UTF-8 character in the message.
  const chunks = [bytes.subarray(0, split), bytes.subarray(split, -1), bytes.subarray(-1)];
  return { headers, raw: new ReadableStream({
    pull(controller) {
      if (chunks.length) controller.enqueue(chunks.shift());
      else controller.close();
    },
  }) };
}

for (const mode of modes) {
  for (const [name, cap, body, ct] of [
    ['Text-only request', 8192, textFields],
    ['Image request', 368640, imageBody(withSize(262144)), imageCT],
  ]) {
    test(`${name} cap and one byte over (${mode})`, async t => {
      const upstream = stubExternal(t);
      const json = JSON.stringify(body);
      const atCap = json + ' '.repeat(cap - Buffer.byteLength(json));
      assert.equal((await worker.fetch(req({ ...transport(atCap, mode), ct }), testEnv)).status, 201);
      const rejected = await worker.fetch(req({ ...transport(atCap + ' ', mode), ct }), testEnv);
      assert.equal(rejected.status, 413);
      assert.equal(upstream.callCount(), ct ? 7 : 2);
    });
  }

  test(`JPEG byte cap and one byte over (${mode})`, async t => {
    const upstream = stubExternal(t);
    const send = size => worker.fetch(req({
      ...transport(JSON.stringify(imageBody(withSize(size))), mode), ct: imageCT,
    }), testEnv);
    assert.equal((await send(262144)).status, 201);
    assert.equal((await send(262145)).status, 413);
    assert.equal(upstream.callCount(), 7);
  });
}

for (const [name, cap, ct] of [['text-only', 8192], ['image', 368640, imageCT]]) {
  test(`cancels ${name} stream at the first excess byte`, async t => {
    const upstream = stubExternal(t);
    let pulls = 0, cancelled = false;
    const raw = new ReadableStream({
      pull(controller) {
        pulls++;
        assert.ok(pulls <= 2, 'read past the first excess byte');
        controller.enqueue(new Uint8Array(pulls === 1 ? cap : 1));
      },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    const response = await worker.fetch(req({ raw, ct, headers: { 'Content-Length': '1' } }), testEnv);
    assert.equal(response.status, 413);
    assert.equal(pulls, 2);
    assert.equal(cancelled, true);
    assert.equal(upstream.callCount(), 0);
  });
}

for (const [axis, atCap, over] of [['width', jpegs.wide, jpegs.tooWide], ['height', jpegs.tall, jpegs.tooTall]]) {
  test(`JPEG ${axis} accepts 1280 and rejects 1281`, async t => {
    const upstream = stubExternal(t);
    const send = jpeg => worker.fetch(req({ body: imageBody(jpeg), ct: imageCT }), testEnv);
    assert.equal((await send(atCap)).status, 201);
    assert.equal((await send(over)).status, 413);
    assert.equal(upstream.callCount(), 7);
  });
}

function insertMarker(code, data) {
  return Buffer.concat([jpegs.wide.subarray(0, 20), Buffer.from([0xff, code, 0, data.length + 2]),
    data, jpegs.wide.subarray(20)]);
}

const exifWithGps = Buffer.from('45786966000049492a0008000000010025880400010000001a00000000000000010001000200020000004e00000000000000', 'hex');
for (const [name, jpeg] of [
  ['non-JPEG bytes', Buffer.from('not a JPEG')],
  ['missing SOI', jpegs.wide.subarray(2)],
  ['missing EOI', jpegs.wide.subarray(0, -2)],
  ['trailing data', Buffer.concat([jpegs.wide, jpegs.wide])],
  ['garbage segment length', insertMarker(0xdb, Buffer.alloc(0)).map((byte, i) => i === 23 ? 1 : byte)],
  ['malformed Huffman table', insertMarker(0xc4, Buffer.from([0, 255]))],
  ['unsupported SOF', jpegs.wide.map((byte, i) => i === 90 ? 0xc1 : byte)],
  ['EXIF with GPS IFD', insertMarker(0xe1, exifWithGps)],
  ['XMP APP1', insertMarker(0xe1, Buffer.from('http://ns.adobe.com/xap/1.0/\0'))],
  ['ICC APP2', insertMarker(0xe2, Buffer.from('ICC_PROFILE\0'))],
  ['comment', insertMarker(0xfe, Buffer.from('Sample comment'))],
  ['application-specific APP0', insertMarker(0xe0, Buffer.from('JFXX\0'))],
]) {
  test(`rejects JPEG with ${name}`, async t => {
    const upstream = stubExternal(t);
    const response = await worker.fetch(req({ body: imageBody(jpeg), ct: imageCT }), testEnv);
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /Send text only/);
    assert.equal(upstream.callCount(), 0);
  });
}

test('the image envelope requires a matching header and base64 JPEG', async t => {
  const upstream = stubExternal(t);
  for (const options of [
    { body: textFields, ct: imageCT }, { body: imageBody(jpegs.wide) },
    { body: { ...textFields, screenshot: '!!!!' }, ct: imageCT },
  ]) {
    assert.equal((await worker.fetch(req(options), testEnv)).status, 422);
  }
  assert.equal(upstream.callCount(), 0);
});

test('uploads the exact JPEG after issue creation and only links the confirmed private asset', async t => {
  const upstream = stubExternal(t);
  const body = imageBody(jpegs.wide);
  const text = await worker.fetch(req({ body: textFields }), testEnv);
  const image = await worker.fetch(req({ body, ct: imageCT }), testEnv);
  assert.equal(text.status, 201);
  assert.equal(image.status, 201);
  assert.deepEqual(await text.json(), { ok: true, number: 7 });
  assert.deepEqual(await image.json(), { ok: true, number: 8, screenshot: 'attached' });
  const [textCheck, textIssue, imageCheck, imageIssue, privacy, release, assets, upload, link] = upstream.calls.map(call => call.arguments);
  assert.deepEqual(upstream.calls.map(call => call.arguments[0]), [checkUrl, `${repo}/issues`, checkUrl,
    `${repo}/issues`, repo, releaseTag, releaseAssets, uploadUrl(8), `${repo}/issues/8`]);
  assert.equal(imageCheck[0], textCheck[0]);
  assert.equal(imageCheck[1].method, textCheck[1].method);
  assert.deepEqual([...imageCheck[1].body], [...textCheck[1].body]);
  assert.equal(imageIssue[0], textIssue[0]);
  const written = JSON.parse(imageIssue[1].body);
  const plain = JSON.parse(textIssue[1].body);
  const received = text => text.replace(/^\*\*Received:\*\* .*$/m, '**Received:** sample-time');
  assert.deepEqual({ ...written, body: received(written.body) },
    { ...plain, body: `<!-- fss-feedback-submission: ${body.id} -->\n\n${received(plain.body)}\n\nScreenshot failed.` });
  for (const [, options] of [imageIssue, privacy, release, assets, upload, link]) assert.equal(options.redirect, 'error');
  assert.equal(upload[1].headers['Content-Type'], 'image/jpeg');
  assert.deepEqual(Buffer.from(upload[1].body), jpegs.wide);
  assert.deepEqual(JSON.parse(link[1].body), {
    body: written.body.replace(/Screenshot failed\.$/, `[Screenshot (JPEG)](${privateLink(8)})`),
  });
});

test('a rejected JPEG still allows text from the same sender', async t => {
  const upstream = stubExternal(t);
  const ip = 'sample-rejected-image-sender';
  const failed = await worker.fetch(req({ body: imageBody(jpegs.tooWide), ct: imageCT, ip }), testEnv);
  assert.equal(failed.status, 413);
  assert.equal(upstream.callCount(), 0);
  assert.equal((await worker.fetch(req({ body: textFields, ip }), testEnv)).status, 201);
  assert.equal(upstream.callCount(), 2);
});

function rateLimits() {
  const hits = new Map();
  const textBinding = [];
  const env = { ...testEnv, RATE_LIMIT: { async limit({ key }) {
    textBinding.push(key);
    return { success: true };
  } } };
  env.LIMITER = stubLimiter(env, async (name, limit = 5) => {
    const count = (hits.get(name) || 0) + 1;
    if (count > limit) return false;
    hits.set(name, count);
    return true;
  });
  return { env, hits, textBinding };
}

test('image attempts leave all sender and global text slots available', async t => {
  const upstream = stubExternal(t);
  const { env, hits, textBinding } = rateLimits();
  const sendImage = (ip, options) => worker.fetch(req({ body: imageBody(jpegs.wide), ct: imageCT, ip, ...options }), env);
  const sendText = ip => worker.fetch(req({ body: textFields, ip }), env);
  const accepted = 'sample-image-accepted';
  const oversized = 'sample-image-oversized';
  const invalid = 'sample-image-invalid';
  const busySender = 'sample-image-busy';
  assert.equal((await sendImage(oversized, { raw: ' '.repeat(368641) })).status, 413);
  assert.equal((await sendImage(invalid, { body: imageBody(Buffer.from('not a JPEG')) })).status, 422);
  assert.equal(upstream.callCount(), 0);
  assert.equal((await sendImage(accepted)).status, 201);
  assert.equal((await sendImage(accepted)).status, 429);
  for (let i = 0; i < 9; i++) assert.equal((await sendImage('sample-image-sender-' + i)).status, 201);
  const busy = await sendImage(busySender);
  assert.equal(busy.status, 429);
  assert.match((await busy.json()).error, /Send text only/);
  assert.equal(upstream.callCount(), 72); // Ten complete deliveries and twelve checks.
  assert.equal(hits.get('image:global'), 10);
  assert.ok([...hits.keys()].every(key => key.startsWith('image:')));
  assert.equal(textBinding.length, 0);
  for (const ip of [accepted, oversized, invalid, busySender]) {
    for (let i = 0; i < 5; i++) assert.equal((await sendText(ip)).status, 201);
    assert.equal((await sendText(ip)).status, 429);
  }
  for (let i = 0; i < 10; i++) assert.equal((await sendText('sample-text-sender-' + i)).status, 201);
  assert.equal(hits.get('global'), 30);
  assert.equal((await sendText('sample-text-over-global')).status, 429);
  assert.equal(upstream.callCount(), 132); // Thirty more issues and checks.
});

test('unverified images from one sender are capped before additional siteverify calls', async t => {
  const upstream = stubExternal(t, () => ({ success: false }));
  const { env, hits, textBinding } = rateLimits();
  const ip = 'sample-unverified-image-sender';
  const body = imageBody(jpegs.wide);
  const send = (sender = ip) => worker.fetch(req({ body, ct: imageCT, ip: sender }), env);
  for (let i = 0; i < 4; i++) assert.equal((await send()).status, 403);
  assert.equal(upstream.callCount(), 4);
  for (let i = 0; i < 10; i++) {
    const response = await send();
    assert.equal(response.status, 429);
    assert.equal((await response.json()).checkUsed, false);
  }
  assert.equal(upstream.callCount(), 4);
  assert.equal((await send('another-unverified-image-sender')).status, 403);
  assert.equal(upstream.callCount(), 5);
  assert.equal(hits.size, 0);
  assert.equal(textBinding.length, 0);
});

test('failed Turnstile on a valid JPEG returns 403 without creating an issue', async t => {
  const upstream = stubExternal(t, () => ({ success: false }));
  const response = await worker.fetch(req({ body: imageBody(jpegs.wide), ct: imageCT }), testEnv);
  assert.equal(response.status, 403);
  assert.deepEqual(upstream.calls.map(call => call.arguments[0]), [
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  ]);
});

test('oversized text returns 413 without spending sender or global text slots', async t => {
  const upstream = stubExternal(t);
  const { env, hits, textBinding } = rateLimits();
  const ip = 'sample-oversized-text-sender';
  const body = JSON.stringify(textFields);
  const raw = body + ' '.repeat(8193 - Buffer.byteLength(body));
  assert.equal(Buffer.byteLength(raw), 8193);
  for (const mode of modes) {
    assert.equal((await worker.fetch(req({ ip, ...transport(raw, mode) }), env)).status, 413);
  }
  assert.equal(hits.size, 0);
  assert.equal(textBinding.length, 0);
  assert.equal(upstream.callCount(), 0);
  for (let i = 0; i < 5; i++) assert.equal((await worker.fetch(req({ ip, body: textFields }), env)).status, 201);
  assert.equal((await worker.fetch(req({ ip, body: textFields }), env)).status, 429);
  assert.equal(hits.get('global'), 5);
});

test('image buckets are charged only after Turnstile passes', async t => {
  stubExternal(t, token => ({ success: token === textFields.turnstileToken, hostname: new URL(O).hostname }));
  const { env, hits } = rateLimits();
  const ip = 'sample-image-retry-sender';
  const body = imageBody(jpegs.wide);
  const send = fields => worker.fetch(req({ ip, ct: imageCT, body: fields }), env);
  assert.equal((await send({ ...body, turnstileToken: 'sample-failed-check' })).status, 403);
  assert.equal(hits.size, 0);
  assert.equal((await send(body)).status, 201);
  assert.equal(hits.get('image:global'), 1);
  assert.equal((await send(body)).status, 429);
});

const savedText = { ok: true, number: 7, screenshot: 'failed' };
const savedImage = { ...savedText, screenshot: 'attached' };
const sendImage = (body = imageBody(jpegs.wide), env = testEnv) => worker.fetch(req({ body, ct: imageCT }), env);
const retryText = (id, env = testEnv) => worker.fetch(req({ body: textFields, ct: `application/json; submission=${id}` }), env);
const calledUrls = upstream => upstream.calls.map(call => call.arguments[0]);
const issueWrites = upstream => upstream.calls.filter(call => call.arguments[0] === `${repo}/issues`);
const issueLookup = url => url.startsWith(`${repo}/issues?`);

for (const [scenario, endpoint, metadata] of [
  ['public repository', repo, { private: false, visibility: 'public' }],
  ['internal repository', repo, { private: true, visibility: 'internal' }],
  ['unknown repository visibility', repo, { private: true }],
  ['immutable release', releaseTag, { id: 42, tag_name: 'feedback-screenshots', draft: false, immutable: true }],
  ['draft release', releaseTag, { id: 42, tag_name: 'feedback-screenshots', draft: true, immutable: false }],
  ['full release', releaseAssets, [{ id: 1000 }]],
]) {
  test(`${scenario} keeps text with a failure note and makes no screenshot writes`, async t => {
    const upstream = stubExternal(t, undefined, url => url === endpoint ? Response.json(metadata) : undefined);
    const response = await sendImage();
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), savedText);
    const expected = [checkUrl, `${repo}/issues`, repo, releaseTag, releaseAssets];
    assert.deepEqual(calledUrls(upstream), expected.slice(0, expected.indexOf(endpoint) + 1));
    const initialIssue = JSON.parse(issueWrites(upstream)[0].arguments[1].body);
    assert.match(initialIssue.body, /Screenshot failed\.$/);
    assert.ok(!initialIssue.body.includes('/releases/'));
  });
}

test('a missing release immutable flag logs a fixed warning and keeps text only', async t => {
  const warning = t.mock.method(console, 'warn', () => {});
  const upstream = stubExternal(t, undefined, url => url === releaseTag ?
    Response.json({ id: 42, tag_name: 'feedback-screenshots', draft: false }) : undefined);
  assert.deepEqual(await (await sendImage()).json(), savedText);
  assert.deepEqual(calledUrls(upstream), [checkUrl, `${repo}/issues`, repo, releaseTag]);
  assert.deepEqual(warning.mock.calls.map(call => call.arguments), [
    ['Screenshot skipped: GitHub release response omitted immutable.'],
  ]);
  assert.match(upstream.issues.get(7).body, /Screenshot failed\.$/);
});

for (const [scenario, respond] of [
  ['upload rejects', () => new Response(null, { status: 422 })],
  ['upload response body over cap', () => new Response(' '.repeat(8193), { status: 201 })],
  ['upload response has malformed JSON', () => new Response('{', { status: 201 })],
  ...Object.entries({ size: 262145, state: 'starter', name: 'issue-8.jpg', content_type: 'text/html', browser_download_url: 'https://example.invalid/asset' })
    .map(([field, value]) => [`invalid asset ${field}`, async (url, options, github) =>
      Response.json({ ...await (await github(url, options)).json(), [field]: value }, { status: 201 })]),
]) {
  test(`${scenario} leaves the issue and never links the screenshot`, async t => {
    const upstream = stubExternal(t, undefined, (url, ...args) => url === uploadUrl(7) ? respond(url, ...args) : undefined);
    const result = await sendImage();
    assert.equal(result.status, 201);
    assert.deepEqual(await result.json(), savedText);
    assert.equal(calledUrls(upstream).at(-1), uploadUrl(7));
    assert.ok(!calledUrls(upstream).includes(`${repo}/issues/7`));
  });
}

for (const [scenario, linkResponse] of [
  ['HTTP rejection', new Response(null, { status: 403 })],
  ['wrong issue in link response', Response.json({ number: 8 })],
]) {
  test(`upload succeeds but linking gets ${scenario}; retries return the existing text issue`, async t => {
    const body = imageBody(jpegs.wide);
    const upstream = stubExternal(t, undefined, url => url === `${repo}/issues/7` ? linkResponse : undefined);
    assert.deepEqual(await (await sendImage(body)).json(), savedText);
    testEnv.LIMITER.restart();
    assert.deepEqual(await (await retryText(body.id)).json(), savedText);
    assert.deepEqual(await (await sendImage(body)).json(), savedText);
    assert.equal(issueWrites(upstream).length, 1);
    assert.deepEqual(calledUrls(upstream).slice(5), [uploadUrl(7), `${repo}/issues/7`, checkUrl, checkUrl]);
  });
}

test('parallel image and staff text retries share the receipt and await link confirmation', async t => {
  const linkStarted = Promise.withResolvers();
  const allowLink = Promise.withResolvers();
  const body = imageBody(jpegs.wide);
  const upstream = stubExternal(t, undefined, async (url, options, github) => {
    if (url === `${repo}/issues/7`) {
      linkStarted.resolve();
      await allowLink.promise;
    }
    return github(url, options);
  });
  const attempts = [sendImage(body)];
  try {
    const first = await Promise.race([linkStarted.promise.then(() => 'link'), attempts[0].then(() => 'response')]);
    assert.equal(first, 'link');
    attempts.push(sendImage(body), retryText(body.id));
    for (const attempt of attempts) {
      const state = await Promise.race([attempt.then(() => 'response'), new Promise(resolve => setImmediate(resolve, 'waiting'))]);
      assert.equal(state, 'waiting');
    }
  } finally {
    allowLink.resolve();
    await Promise.allSettled(attempts);
  }
  for (const response of await Promise.all(attempts)) assert.deepEqual(await response.json(), savedImage);
  testEnv.LIMITER.restart();
  assert.deepEqual(await (await retryText(body.id)).json(), savedImage);
  assert.equal(issueWrites(upstream).length, 1);
  assert.equal(calledUrls(upstream).filter(url => url === uploadUrl(7)).length, 1);
  assert.equal(calledUrls(upstream).filter(url => url === `${repo}/issues/7`).length, 1);
});

function untilAborted(signal) {
  return new Promise((_, reject) => {
    signal.throwIfAborted();
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

for (const [stage, endpoint] of [
  ['upload', uploadUrl(7)],
  ['issue link', `${repo}/issues/7`],
]) {
  test(`GitHub timeout during ${stage} keeps retry from creating a duplicate issue`, async t => {
    const body = imageBody(jpegs.wide);
    const deadline = new AbortController();
    const timeout = t.mock.method(AbortSignal, 'timeout', ms => ms === 8000 ? deadline.signal : new AbortController().signal);
    const upstream = stubExternal(t, undefined, (url, options) => {
      if (url !== endpoint) return;
      assert.equal(options.signal, deadline.signal);
      queueMicrotask(() => deadline.abort());
      return untilAborted(options.signal);
    });
    const verify = async response => {
      assert.equal(response.status, 201);
      assert.deepEqual(await response.json(), savedText);
    };
    await verify(await sendImage(body));
    assert.equal(deadline.signal.aborted, true);
    assert.equal(calledUrls(upstream).at(-1), endpoint);
    testEnv.LIMITER.restart();
    await verify(await retryText(body.id));
    assert.equal(issueWrites(upstream).length, 1);
    assert.deepEqual(timeout.mock.calls.map(call => call.arguments[0]), [5000, 8000, 8000, 5000]);
  });
}

for (const [scenario, fail] of [
  ['GitHub 503', () => new Response(null, { status: 503 })],
  ['a network error', () => { throw new TypeError('Sample network failure'); }],
  ['an eight-second timeout', signal => untilAborted(signal)],
]) {
  test(`${scenario} before issue creation recovers on a text retry`, async t => {
    const timeout = t.mock.method(AbortSignal, 'timeout', ms => {
      const controller = new AbortController();
      if (ms === 8000) setImmediate(() => controller.abort());
      return controller.signal;
    });
    const body = imageBody(jpegs.wide);
    let firstCreate = true;
    const upstream = stubExternal(t, undefined, (url, options) => {
      if (url !== `${repo}/issues` || !firstCreate) return;
      firstCreate = false;
      return fail(options.signal);
    });
    assert.equal((await sendImage(body)).status, 502);
    assert.equal(upstream.issues.size, 0);
    testEnv.LIMITER.restart();
    const retry = await retryText(body.id);
    assert.equal(retry.status, 201);
    assert.deepEqual(await retry.json(), { ok: true, number: 7 });
    assert.deepEqual(calledUrls(upstream).map(url => issueLookup(url) ? 'lookup' : url),
      [checkUrl, `${repo}/issues`, checkUrl, 'lookup', `${repo}/issues`]);
    assert.deepEqual(timeout.mock.calls.map(call => call.arguments[0]), [5000, 8000, 5000, 8000, 8000]);
    assert.equal(upstream.issues.size, 1);
  });
}

for (const [scenario, response] of [
  ['a 503', new Response(null, { status: 503 })],
  ['a non-JSON 201', new Response('<html>', { status: 201 })],
  ['an oversized 201', new Response(' '.repeat(65_537), { status: 201 })],
]) {
  test(`${scenario} after issue creation recovers the same issue on retry`, async t => {
    let firstCreate = true;
    const upstream = stubExternal(t, undefined, async (url, options, github) => {
      if (url !== `${repo}/issues` || !firstCreate) return;
      firstCreate = false;
      await github(url, options);
      return response;
    });
    const body = imageBody(jpegs.wide);
    assert.equal((await sendImage(body)).status, 502);
    assert.equal(upstream.issues.size, 1);
    testEnv.LIMITER.restart();
    const retry = await retryText(body.id);
    assert.equal(upstream.issues.size, 1, 'the retry must leave exactly one GitHub issue');
    assert.deepEqual(await retry.json(), savedText);
    assert.deepEqual(await (await retryText(body.id)).json(), savedText);
    assert.equal(issueWrites(upstream).length, 1);
    assert.equal(calledUrls(upstream).filter(issueLookup).length, 1);
  });
}

test('a Durable Object restart during an ambiguous create finds the issue on a later page', async t => {
  const deadline = new AbortController();
  t.mock.method(AbortSignal, 'timeout', ms => ms === 8000 && !deadline.signal.aborted
    ? deadline.signal : new AbortController().signal);
  const created = Promise.withResolvers();
  let firstCreate = true;
  const upstream = stubExternal(t, undefined, async (url, options, github) => {
    if (url !== `${repo}/issues` || !firstCreate) return;
    firstCreate = false;
    await github(url, options);
    created.resolve();
    return untilAborted(options.signal);
  });
  for (let i = 0; i < 30; i++) upstream.issues.set(i + 7, { number: i + 7, body: null });
  const body = imageBody(jpegs.wide);
  const initial = sendImage(body);
  try {
    assert.equal(await Promise.race([created.promise.then(() => 'created'), initial.then(() => 'response')]), 'created');
    testEnv.LIMITER.restart();
  } finally {
    deadline.abort();
  }
  assert.equal((await initial).status, 502);
  const results = await Promise.all([retryText(body.id), sendImage(body)]);
  for (const result of results) assert.deepEqual(await result.json(), { ...savedText, number: 37 });
  assert.equal(upstream.issues.size, 31);
  assert.equal(issueWrites(upstream).length, 1);
  assert.deepEqual(calledUrls(upstream).filter(issueLookup).map(url => new URL(url).searchParams.get('page')), ['1', '2']);
});

test('an unavailable issue lookup preserves the reservation without another create', async t => {
  let firstLookup = true;
  const upstream = stubExternal(t, undefined, async (url, options, github) => {
    if (url === `${repo}/issues` && firstLookup) {
      await github(url, options);
      return new Response(null, { status: 503 });
    }
    if (issueLookup(url) && firstLookup) {
      firstLookup = false;
      return new Response(null, { status: 503 });
    }
  });
  const body = imageBody(jpegs.wide);
  assert.equal((await retryText(body.id)).status, 502);
  assert.equal((await retryText(body.id)).status, 502);
  assert.deepEqual(await (await retryText(body.id)).json(), { ok: true, number: 7 });
  assert.equal(upstream.issues.size, 1);
  assert.equal(issueWrites(upstream).length, 1);
});

test('a slow 4 MB release read has a deadline independent of issue creation', async t => {
  const issued = new AbortController();
  const screenshot = new AbortController();
  const deadlines = [issued, screenshot];
  const timeouts = t.mock.method(AbortSignal, 'timeout', ms => ms === 8000
    ? deadlines.shift().signal : new AbortController().signal);
  const release = JSON.stringify({ id: 42, tag_name: 'feedback-screenshots', draft: false, immutable: false });
  const bytes = new TextEncoder().encode(release.padEnd(4 * 1024 * 1024));
  const upstream = stubExternal(t, undefined, (url, options) => {
    if (url === releaseTag) return new Response(new ReadableStream({
      async start(controller) {
        await new Promise(resolve => setImmediate(resolve));
        issued.abort();
        if (options.signal.aborted) controller.error(options.signal.reason);
        else {
          controller.enqueue(bytes);
          controller.close();
        }
      },
    }));
  });
  assert.deepEqual(await (await sendImage()).json(), savedImage);
  assert.equal(issueWrites(upstream)[0].arguments[1].signal, issued.signal);
  assert.equal(upstream.calls.find(call => call.arguments[0] === releaseTag).arguments[1].signal, screenshot.signal);
  assert.deepEqual(timeouts.mock.calls.map(call => call.arguments[0]), [5000, 8000, 8000]);
});

test('a rejected issue create can retry as text with the same submission ID', async t => {
  let rejected = false;
  const upstream = stubExternal(t, undefined, url => {
    if (url === `${repo}/issues` && !rejected) {
      rejected = true;
      return new Response(null, { status: 422 });
    }
  });
  const body = imageBody(jpegs.wide);
  assert.equal((await sendImage(body)).status, 502);
  const result = await retryText(body.id);
  assert.equal(result.status, 201);
  assert.deepEqual(await result.json(), { ok: true, number: 7 });
  assert.deepEqual(calledUrls(upstream), [checkUrl, `${repo}/issues`, checkUrl, `${repo}/issues`]);
  assert.doesNotMatch(JSON.parse(issueWrites(upstream)[1].arguments[1].body).body, /Screenshot/);
});

test('malformed or missing submission IDs cannot bypass validation and binding checks', async t => {
  const upstream = stubExternal(t);
  assert.equal((await sendImage({ ...imageBody(jpegs.wide), id: '../issues' })).status, 400);
  assert.equal((await sendImage({ ...imageBody(jpegs.wide), id: undefined })).status, 400);
  assert.equal((await retryText('')).status, 400);
  assert.equal((await sendImage(imageBody(jpegs.wide), { ...testEnv, LIMITER: undefined })).status, 503);
  assert.equal(upstream.callCount(), 0);
  const oldText = await worker.fetch(req({ body: { ...textFields, id: 'legacy' } }), testEnv);
  assert.deepEqual(await oldText.json(), { ok: true, number: 7 });
  assert.deepEqual(calledUrls(upstream), [checkUrl, `${repo}/issues`]);
});
