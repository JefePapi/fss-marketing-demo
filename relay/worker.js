// FSS marketing demo feedback relay (Cloudflare Worker, free plan).
// Accepts POST JSON from https://jefepapi.github.io only, checks Turnstile, rate-limits per IP,
// and opens an issue in the private repo JefePapi/fss-demo-feedback.
// Secrets (Worker secrets, never in code): GITHUB_TOKEN, TURNSTILE_SECRET.
// Nothing about the sender is logged. The IP is only hashed into a rate-limit key.
import { DurableObject } from 'cloudflare:workers';
const VERSION = 6;
const ORIGIN = 'https://jefepapi.github.io';
const REPO = 'JefePapi/fss-demo-feedback';
const GITHUB = `https://api.github.com/repos/${REPO}`;
const SCREENSHOT_TAG = 'feedback-screenshots';
const SCREENSHOT_FAILED = '\n\nScreenshot failed.';
const SUBMISSION_ID = /^[0-9a-f]{32}$/;
const TYPES = { feedback: 'Feedback', suggestion: 'Suggestion', bug: 'Bug' };
const THEMES = new Set(['a', 'a-light', 'b', 'c', 'current']);
const MAX_BODY = 8192;
const MAX_IMAGE_BODY = 360 * 1024;
const MAX_JPEG = 256 * 1024;
const MAX_EDGE = 1280;
const IMAGE_ATTEMPTS_PER_MINUTE = 4;
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
const recentImageAttempts = new Map();
export function localLimit(key, now = Date.now(), limit = 5, windowMs = 60_000, buckets = recent) {
  const list = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (list.length >= limit) { buckets.set(key, list); return false; }
  list.push(now); buckets.set(key, list);
  if (buckets.size > 5000) buckets.clear();
  return true;
}

// Limiter objects store only timestamps. Separately named submission objects
// use the same binding to store a receipt, without using the limiter's alarm.
export class RateLimiter extends DurableObject {
  #sending;

  async hit(limit = 5, windowMs = 60_000) {
    const now = Date.now();
    const list = ((await this.ctx.storage.get('t')) || []).filter(t => now - t < windowMs);
    if (list.length >= limit) return false;
    list.push(now); await this.ctx.storage.put('t', list);
    await this.ctx.storage.setAlarm(now + windowMs * 2);
    return true;
  }
  async alarm() { await this.ctx.storage.deleteAll(); }

  async submit(submission, issue, jpeg) {
    this.#sending ??= saveSubmission(this.ctx.storage, this.env.GITHUB_TOKEN, submission, issue, jpeg)
      .finally(() => { this.#sending = undefined; });
    return this.#sending;
  }
}

async function ipKey(request) {
  let ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (ip.includes(':')) ip = ip.split(':').slice(0, 4).join(':') + '::/64'; // one key per IPv6 /64
  const data = new TextEncoder().encode('fss-feedback:' + ip);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function readBody(body, cap) {
  if (!body) return '';
  const reader = body.getReader();
  const bytes = new Uint8Array(cap);
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return new TextDecoder().decode(bytes.subarray(0, size));
      if (value.byteLength > cap - size) {
        void reader.cancel().catch(() => {});
        return null;
      }
      bytes.set(value, size);
      size += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }
}

const word = (bytes, offset) => bytes[offset] * 256 + bytes[offset + 1];

function jpegTables(bytes, start, end, huffman, tables) {
  for (let offset = start; offset < end;) {
    const selector = bytes[offset++];
    const kind = selector >> 4;
    const id = selector & 15;
    if (kind > 1 || id > 3) return false;
    if (huffman) {
      if (offset + 16 > end) return false;
      let symbols = 0;
      let available = 1;
      for (let i = 0; i < 16; i++) {
        const count = bytes[offset++];
        symbols += count;
        available = available * 2 - count;
        if (available <= 0) return false;
      }
      if (!symbols || symbols > 256) return false;
      offset += symbols;
    } else {
      offset += kind ? 128 : 64;
    }
    if (offset > end) return false;
    tables.add(huffman ? kind * 4 + id : id);
  }
  return start < end;
}

// Check the JPEG container and scan framing without decoding pixels.
function jpegStructure(bytes) {
  if (word(bytes, 0) !== 0xffd8 || word(bytes, bytes.length - 2) !== 0xffd9) return 'invalid';
  const quant = new Set(), huffman = new Set(), components = new Map(), scanned = new Set();
  let progressive, restart = 0;
  for (let offset = 2; offset < bytes.length;) {
    if (bytes[offset++] !== 0xff) return 'invalid';
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9)
      return offset === bytes.length && components.size && scanned.size === components.size ? '' : 'invalid';
    const length = word(bytes, offset);
    const start = offset + 2;
    const end = offset + length;
    if (!(length >= 2 && end <= bytes.length)) return 'invalid';
    offset = end;

    if (marker === 0xe0) {
      // Ordinary, thumbnail-free JFIF header directly after SOI.
      if (start !== 6 || length !== 16 || word(bytes, start) !== 0x4a46 ||
          word(bytes, start + 2) !== 0x4946 || word(bytes, start + 4) !== 1 ||
          bytes[start + 6] > 2 || bytes[start + 7] > 2 || !word(bytes, start + 8) ||
          !word(bytes, start + 10) || word(bytes, start + 12) !== 0) return 'metadata';
    } else if ((marker >= 0xe1 && marker <= 0xef) || marker === 0xfe) {
      return 'metadata';
    } else if (marker === 0xc0 || marker === 0xc2) {
      const height = word(bytes, start + 1), width = word(bytes, start + 3), count = bytes[start + 5];
      if (components.size || bytes[start] !== 8 || !width || !height ||
          count < 1 || count > 4 || length !== 8 + 3 * count) return 'invalid';
      if (width > MAX_EDGE || height > MAX_EDGE) return 'large';
      progressive = marker === 0xc2;
      for (let i = start + 6; i < end; i += 3) {
        const id = bytes[i], sampling = bytes[i + 1], table = bytes[i + 2];
        const horizontal = sampling >> 4, vertical = sampling & 15;
        if (components.has(id) || horizontal < 1 || horizontal > 4 ||
            vertical < 1 || vertical > 4 || table > 3) return 'invalid';
        components.set(id, table);
      }
    } else if (marker === 0xdb || marker === 0xc4) {
      if (!jpegTables(bytes, start, end, marker === 0xc4, marker === 0xc4 ? huffman : quant)) return 'invalid';
    } else if (marker === 0xdd && length === 4) {
      restart = word(bytes, start);
    } else if (marker === 0xda) {
      const count = bytes[start];
      if (!count || count > components.size || length !== 6 + 2 * count) return 'invalid';
      const first = bytes[end - 3], last = bytes[end - 2];
      const high = bytes[end - 1] >> 4, low = bytes[end - 1] & 15;
      if (progressive ? first > last || last > 63 || (first ? count !== 1 : last !== 0) ||
          low > 13 || (high && high !== low + 1) : first !== 0 || last !== 63 || high || low) return 'invalid';
      const scan = new Set();
      for (let i = start + 1; i < end - 3; i += 2) {
        const id = bytes[i], dc = bytes[i + 1] >> 4, ac = bytes[i + 1] & 15;
        const firstScan = !first && !high;
        if (firstScan ? scanned.has(id) : !scanned.has(id)) return 'invalid';
        if (scan.has(id) || !quant.has(components.get(id)) ||
            dc > 3 || ac > 3 || (firstScan && !huffman.has(dc)) ||
            ((!progressive || first) && !huffman.has(ac + 4))) return 'invalid';
        scan.add(id);
        if (firstScan) scanned.add(id);
      }
      // Inside a scan, FF 00 is a data byte. Only restart markers may interrupt it.
      let nextRestart = 0;
      let hasData = false;
      while (offset < bytes.length) {
        const markerStart = bytes.indexOf(0xff, offset);
        if (markerStart < 0) return 'invalid';
        hasData ||= markerStart > offset;
        offset = markerStart + 1;
        while (bytes[offset] === 0xff) offset++;
        const code = bytes[offset];
        if (code === 0 && offset === markerStart + 1) {
          hasData = true;
          offset++;
        } else if (restart && code === 0xd0 + nextRestart && hasData) {
          nextRestart = (nextRestart + 1) % 8;
          hasData = false;
          offset++;
        } else {
          offset = markerStart;
          break;
        }
      }
      if (!hasData) return 'invalid';
    } else {
      return 'invalid';
    }
  }
  return 'invalid';
}

function decodeJpeg(encoded) {
  if (typeof encoded !== 'string' || !encoded || encoded.length % 4 || /\s/.test(encoded)) return 'invalid';
  if (encoded.length > Math.ceil(MAX_JPEG / 3) * 4) return 'large';
  let binary;
  try { binary = atob(encoded); } catch { return 'invalid'; }
  if (binary.length > MAX_JPEG) return 'large';
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);
  return jpegStructure(bytes) || bytes;
}

const issueUnavailable = 'Could not save to GitHub right now. Your message is saved in this browser.';
const validNumber = number => Number.isSafeInteger(number) && number > 0;
const githubHeaders = token => ({ 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'fss-demo-feedback-relay', 'Content-Type': 'application/json' });

function githubClient(token) {
  const signal = AbortSignal.timeout(8000);
  return (url, { headers, ...options } = {}) => fetch(url, {
    ...options, headers: { ...githubHeaders(token), ...headers }, redirect: 'error', signal,
  });
}

async function githubJson(response, status, cap = 65_536) {
  if (response.status !== status) return null;
  const raw = await readBody(response.body, cap);
  return raw === null ? null : JSON.parse(raw);
}

async function findSubmission(github, since, marker) {
  // List repository issues directly to avoid waiting for the search index.
  const perPage = 30;
  const query = new URLSearchParams({ state: 'all', sort: 'created', direction: 'asc', since, per_page: perPage });
  for (let page = 1; ; page++) {
    const issues = await githubJson(await github(`${GITHUB}/issues?${query}&page=${page}`), 200, 4 * 1024 * 1024);
    if (!Array.isArray(issues)) throw new Error('Could not check for an existing feedback issue.');
    for (const issue of issues) {
      if (!validNumber(issue?.number) || (issue.body !== null && typeof issue.body !== 'string'))
        throw new Error('Could not read the feedback issue list.');
      if (!issue.pull_request && issue.body?.startsWith(marker)) {
        return { ok: true, number: issue.number, ...(issue.body.endsWith(SCREENSHOT_FAILED) && { screenshot: 'failed' }) };
      }
    }
    if (issues.length < perPage) return null;
  }
}

async function attachScreenshot(github, issue, number, jpeg) {
  const repo = await githubJson(await github(GITHUB), 200);
  if (repo?.private !== true || repo.visibility !== 'private') return false;

  // The release response can include its full asset list. Use the paginated
  // endpoint to check the 1,000th slot even if that inline list is incomplete.
  const release = await githubJson(await github(`${GITHUB}/releases/tags/${SCREENSHOT_TAG}`), 200, 4 * 1024 * 1024);
  if (!validNumber(release?.id) || release.tag_name !== SCREENSHOT_TAG || release.draft !== false) return false;
  if (!Object.hasOwn(release, 'immutable')) console.warn('Screenshot skipped: GitHub release response omitted immutable.');
  if (release.immutable !== false) return false;
  const assets = await githubJson(await github(`${GITHUB}/releases/${release.id}/assets?per_page=1&page=1000`), 200);
  if (!Array.isArray(assets) || assets.length) return false;

  const name = `issue-${number}.jpg`;
  const download = `https://github.com/${REPO}/releases/download/${SCREENSHOT_TAG}/${name}`;
  const upload = await github(`https://uploads.github.com/repos/${REPO}/releases/${release.id}/assets?name=${name}`, {
    method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: jpeg,
  });
  const asset = await githubJson(upload, 201, 8192);
  if (!validNumber(asset?.id) || asset.name !== name || asset.state !== 'uploaded' ||
      asset.content_type !== 'image/jpeg' || asset.size !== jpeg.byteLength || asset.browser_download_url !== download) return false;

  const body = `${issue.body}\n\n[Screenshot (JPEG)](${download})`;
  const linked = await githubJson(await github(`${GITHUB}/issues/${number}`, {
    method: 'PATCH', body: JSON.stringify({ body }),
  }), 200);
  return linked?.number === number && linked.body === body;
}

async function saveSubmission(storage, token, submission, issue, jpeg) {
  const receipt = await storage.get('receipt');
  if (receipt?.ok) return receipt;

  const marker = `<!-- fss-feedback-submission: ${submission} -->\n\n`;
  if (receipt) {
    const found = await findSubmission(githubClient(token), receipt.since, marker);
    if (found) {
      await storage.put('receipt', found);
      return found;
    }
  } else {
    // Reserve before posting. Include a small clock-skew allowance in the lookup window.
    await storage.put('receipt', { ok: false, since: new Date(Date.now() - 60_000).toISOString() });
  }

  const markedIssue = { ...issue, body: marker + issue.body };
  const initialIssue = jpeg ? { ...markedIssue, body: markedIssue.body + SCREENSHOT_FAILED } : markedIssue;
  const response = await githubClient(token)(`${GITHUB}/issues`, { method: 'POST', body: JSON.stringify(initialIssue) });
  if ([400, 401, 403, 404, 410, 422, 429].includes(response.status)) {
    await storage.delete('receipt'); // GitHub explicitly rejected the create.
    return { ok: false };
  }
  const created = await githubJson(response, 201);
  if (!validNumber(created?.number)) return { ok: false };
  const result = { ok: true, number: created.number, ...(jpeg && { screenshot: 'failed' }) };
  await storage.put('receipt', result);
  if (!jpeg) return result;

  // The original issue already contains the failure note. Replace it only
  // after a confirmed upload, so an unavailable GitHub still leaves a note.
  try {
    if (await attachScreenshot(githubClient(token), markedIssue, created.number, jpeg)) {
      const attached = { ...result, screenshot: 'attached' };
      await storage.put('receipt', attached);
      return attached;
    }
  } catch { /* The text issue and its receipt already exist. */ }
  return result;
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
    const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
    if (!contentType.startsWith('application/json')) return json(415, { ok: false, error: 'Send JSON.' });
    const image = /;\s*screenshot=jpeg\s*(?:;|$)/.test(contentType);
    const retry = /;\s*submission=([^;]*)/.exec(contentType);
    const key = await ipKey(request);
    if (image && !localLimit(key, Date.now(), IMAGE_ATTEMPTS_PER_MINUTE, 60_000, recentImageAttempts)) {
      void request.body?.cancel().catch(() => {});
      return json(429, { ok: false, error: 'Screenshots are busy right now. Send text only.', checkUsed: false });
    }

    let raw;
    try { raw = await readBody(request.body, image ? MAX_IMAGE_BODY : MAX_BODY); }
    catch { return json(400, { ok: false, error: 'Could not read the request.' }); }
    if (raw === null) return json(413, { ok: false, error: image ? 'This screenshot is too large. Send text only.' : 'Too large.' });

    const limiter = name => env.LIMITER.get(env.LIMITER.idFromName(name));
    if (!image) {
      const allowed = localLimit(key) && (!env.LIMITER || (await limiter(key).hit() && await limiter('global').hit(30, 3_600_000)))
        && (!env.RATE_LIMIT || (await env.RATE_LIMIT.limit({ key })).success);
      if (!allowed) return json(429, { ok: false, error: 'Too many messages. Please wait a minute and try again.' });
    }
    if (!env.GITHUB_TOKEN || !env.TURNSTILE_SECRET) {
      return json(503, { ok: false, error: 'not configured', detail: 'Shared feedback is not switched on yet. Your message is saved in this browser.' });
    }

    let input; try { input = JSON.parse(raw); } catch { return json(400, { ok: false, error: 'Invalid JSON.' }); }
    if (image !== Boolean(input && Object.hasOwn(input, 'screenshot')))
      return json(422, { ok: false, error: 'Could not read this screenshot. Send text only.' });
    const { value, error } = validate(input);
    if (error) return json(400, { ok: false, error });
    if (!value.token) return json(400, { ok: false, error: 'Please complete the check.' });

    let jpeg;
    if (image) {
      jpeg = decodeJpeg(input.screenshot);
      if (jpeg === 'large') return json(413, { ok: false, error: 'This screenshot is too large. Send text only.' });
      if (jpeg === 'metadata') return json(422, { ok: false, error: 'This screenshot contains extra information. Send text only.' });
      if (jpeg === 'invalid') return json(422, { ok: false, error: 'Could not read this screenshot. Send text only.' });
    }

    const submission = image ? input.id : retry?.[1].trim();
    if ((image || retry) && (typeof submission !== 'string' || !SUBMISSION_ID.test(submission)))
      return json(400, { ok: false, error: 'Invalid submission ID.' });
    if (submission && !env.LIMITER) return json(503, { ok: false, error: 'not configured' });

    const form = new FormData();
    form.append('secret', env.TURNSTILE_SECRET);
    form.append('response', value.token);
    const verify = fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: form, ...(submission && { signal: AbortSignal.timeout(5000) }),
    }).then(response => response.json().catch(() => ({})));
    const outcome = await (submission ? verify.catch(() => ({})) : verify);
    if (!outcome.success || outcome.hostname !== 'jefepapi.github.io') return json(403, { ok: false, error: 'The check failed. Please try again.' });

    // Verified images have their own sender and global limits.
    if (image && !(localLimit('image:' + key, Date.now(), 1) && (env.LIMITER
      ? await limiter('image:' + key).hit(1) && await limiter('image:global').hit(10, 3_600_000)
      : localLimit('image:global', Date.now(), 10, 3_600_000)))) {
      return json(429, { ok: false, error: 'Screenshots are busy right now. Send text only.' });
    }

    const issue = issueFor(value);
    if (submission) {
      const result = await limiter('submission:' + submission).submit(submission, issue, jpeg).catch(() => null);
      return result?.ok ? json(201, result) : json(502, { ok: false, error: issueUnavailable });
    }
    const gh = await fetch(`${GITHUB}/issues`, {
      method: 'POST', headers: githubHeaders(env.GITHUB_TOKEN), body: JSON.stringify(issue),
    });
    if (gh.status !== 201) return json(502, { ok: false, error: issueUnavailable });
    const created = await gh.json().catch(() => ({}));
    return json(201, { ok: true, number: created.number ?? null });
  },
};
