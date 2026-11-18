import test from 'node:test'; import assert from 'node:assert/strict';
import worker, { validate, issueFor, localLimit } from './worker.js';
const O = 'https://jefepapi.github.io';
let ip = 0;
const req = (opts = {}) => new Request('https://x.workers.dev' + (opts.path || '/feedback'), { method: opts.method || 'POST',
  headers: { ...(opts.origin === null ? {} : { Origin: opts.origin || O }), 'Content-Type': opts.ct || 'application/json', 'CF-Connecting-IP': '10.0.0.' + (++ip) },
  body: (opts.method || 'POST') === 'POST' ? JSON.stringify(opts.body || { type: 'suggestion', message: 'Hi @team #12 ```x```', name: 'Jo', page: 'Home', route: '#/', theme: 'a', turnstileToken: 't' }) : undefined });
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
