// FSS marketing demo feedback relay (Cloudflare Worker, free plan).
// Accepts POST JSON from https://jefepapi.github.io only, checks Turnstile, rate-limits per IP,
// and opens an issue in the private repo JefePapi/fss-demo-feedback.
// Secrets (Worker secrets, never in code): GITHUB_TOKEN, TURNSTILE_SECRET.
// Nothing about the sender is logged. The IP is only hashed into a rate-limit key.
import { DurableObject } from 'cloudflare:workers';
const VERSION = 4;
const ORIGIN = 'https://jefepapi.github.io';
const REPO = 'JefePapi/fss-demo-feedback';
const TYPES = { feedback: 'Feedback', suggestion: 'Suggestion', bug: 'Bug' };
const THEMES = new Set(['a', 'a-light', 'b', 'c', 'current']);
const MAX_BODY = 8192;
const LIMITS = { message: 2000, name: 60, page: 200, route: 200, token: 2048 };

const cors = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '600',
  'Vary': 'Origin',
};
const json = (status, data, withCors = true) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...(withCors ? cors : {}) },
});

const clean = (value, max) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '';
// Keep user text inert in GitHub markdown: no @mentions, no #refs, no fence breaks.
const inert = text => text.replace(/@/g, '@\u200b').replace(/#(?=\d)/g, '#\u200b').replace(/~~~/g, '~\u200b~~').replace(/```/g, '`\u200b``');

export function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Invalid request.' };
  const type = typeof input.type === 'string' && Object.hasOwn(TYPES, input.type) ? input.type : '';
  if (!type) return { error: 'Choose Feedback, Suggestion or Bug.' };
  if (typeof input.message !== 'string' || input.message.length > LIMITS.message) return { error: 'Message is too long (2000 characters max).' };
  const message = clean(input.message, LIMITS.message);
  if (!message) return { error: 'Please write a message.' };
  if (typeof input.name === 'string' && input.name.length > LIMITS.name) return { error: 'Name is too long (60 characters max).' };
  const theme = THEMES.has(input.theme) ? input.theme : 'unknown';
  return { value: { type, message, name: clean(input.name, LIMITS.name), page: clean(input.page, LIMITS.page),
    route: clean(input.route, LIMITS.route), theme, token: clean(input.turnstileToken, LIMITS.token) } };
}

export function issueFor(v, now = new Date()) {
  const first = v.message.split('\n')[0].slice(0, 70);
  const title = `[${TYPES[v.type]}] ${inert(first)}${v.message.length > first.length ? '…' : ''}`;
  const body = [
    `**Type:** ${TYPES[v.type]}`,
    `**Name:** ${v.name ? inert(v.name) : 'Anonymous'}`,
    `**Page:** ${inert(v.page || 'unknown')}${v.route ? ' (`' + v.route.replace(/`/g, "'") + '`)' : ''}`,
    `**Design:** ${v.theme}`,
    `**Received:** ${now.toISOString()}`,
    '', '**Message:**', '', '~~~text', inert(v.message), '~~~', '',
    '_Sent through the FSS marketing demo feedback form._',
  ].join('\n');
  const labels = [...new Set(['feedback', v.type])];
  return { title, body, labels };
}

// Second, best-effort layer: per-isolate memory window (the binding is approximate per location).
const recent = new Map();
export function localLimit(key, now = Date.now(), limit = 5, windowMs = 60_000) {
  const list = (recent.get(key) || []).filter(t => now - t < windowMs);
  if (list.length >= limit) { recent.set(key, list); return false; }
  list.push(now); recent.set(key, list);
  if (recent.size > 5000) recent.clear();
  return true;
}

// Strict per-IP limiter: one tiny SQLite-backed Durable Object per hashed IP (free plan). Stores only timestamps.
export class RateLimiter extends DurableObject {
  async hit(limit = 5, windowMs = 60_000) {
    const now = Date.now();
    const list = ((await this.ctx.storage.get('t')) || []).filter(t => now - t < windowMs);
    if (list.length >= limit) return false;
    list.push(now); await this.ctx.storage.put('t', list);
    await this.ctx.storage.setAlarm(now + windowMs * 2);
    return true;
  }
  async alarm() { await this.ctx.storage.deleteAll(); }
}

async function ipKey(request) {
  let ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (ip.includes(':')) ip = ip.split(':').slice(0, 4).join(':') + '::/64'; // one key per IPv6 /64
  const data = new TextEncoder().encode('fss-feedback:' + ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    if (request.method === 'GET' && url.pathname === '/') {
      return json(200, { service: 'fss-demo-feedback-relay', version: VERSION, configured: Boolean(env.GITHUB_TOKEN && env.TURNSTILE_SECRET) }, false);
    }
    if (url.pathname !== '/feedback') return json(404, { ok: false, error: 'Not found.' }, false);
    if (origin !== ORIGIN) return json(403, { ok: false, error: 'Origin not allowed.' }, false);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json(405, { ok: false, error: 'Use POST.' });
    if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return json(415, { ok: false, error: 'Send JSON.' });
    const length = Number(request.headers.get('Content-Length') || 0);
    if (length > MAX_BODY) return json(413, { ok: false, error: 'Too large.' });

    const key = await ipKey(request);
    const limiter = name => env.LIMITER.get(env.LIMITER.idFromName(name));
    const allowed = localLimit(key) && (!env.LIMITER || (await limiter(key).hit() && await limiter('global').hit(30, 3_600_000)))
      && (!env.RATE_LIMIT || (await env.RATE_LIMIT.limit({ key })).success);
    if (!allowed) return json(429, { ok: false, error: 'Too many messages. Please wait a minute and try again.' });
    if (!env.GITHUB_TOKEN || !env.TURNSTILE_SECRET) {
      return json(503, { ok: false, error: 'not configured', detail: 'Shared feedback is not switched on yet. Your message is saved in this browser.' });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json(413, { ok: false, error: 'Too large.' });
    let input; try { input = JSON.parse(raw); } catch { return json(400, { ok: false, error: 'Invalid JSON.' }); }
    const { value, error } = validate(input);
    if (error) return json(400, { ok: false, error });
    if (!value.token) return json(400, { ok: false, error: 'Please complete the check.' });

    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', value.token);
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const outcome = await verify.json().catch(() => ({}));
    if (!outcome.success || outcome.hostname !== 'jefepapi.github.io') return json(403, { ok: false, error: 'The check failed. Please try again.' });

    const issue = issueFor(value);
    const gh = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'fss-demo-feedback-relay', 'Content-Type': 'application/json' },
      body: JSON.stringify(issue),
    });
    if (gh.status !== 201) return json(502, { ok: false, error: 'Could not save to GitHub right now. Your message is saved in this browser.' });
    const created = await gh.json().catch(() => ({}));
    return json(201, { ok: true, number: created.number ?? null });
  },
};
