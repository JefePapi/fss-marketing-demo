import assert from 'node:assert/strict';
import { RateLimiter } from './worker.js';

export const repo = 'https://api.github.com/repos/JefePapi/fss-demo-feedback';
export const releaseTag = `${repo}/releases/tags/feedback-screenshots`;
export const releaseAssets = `${repo}/releases/42/assets?per_page=1&page=1000`;
export const checkUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const uploadUrl = number => `https://uploads.github.com/repos/JefePapi/fss-demo-feedback/releases/42/assets?name=issue-${number}.jpg`;
export const privateLink = number => `https://github.com/JefePapi/fss-demo-feedback/releases/download/feedback-screenshots/issue-${number}.jpg`;

export function stubLimiter(env, hit = async () => true) {
  const objects = new Map();
  const stores = new Map();
  return {
    idFromName: name => name,
    get(name) {
      if (!name.startsWith('submission:')) return { hit: (...args) => hit(name, ...args) };
      if (!objects.has(name)) {
        if (!stores.has(name)) stores.set(name, new Map());
        const data = stores.get(name);
        const storage = {
          async get(key) { return structuredClone(data.get(key)); },
          async put(key, value) { data.set(key, structuredClone(value)); },
          async delete(key) { data.delete(key); },
        };
        objects.set(name, new RateLimiter({ storage }, env));
      }
      return objects.get(name);
    },
    restart() { objects.clear(); },
  };
}

export function githubStub(firstNumber = 7, respond) {
  const issues = new Map();
  const issueUrl = `${repo}/issues`;
  const fallback = async (url, options) => {
    options.signal?.throwIfAborted();
    if (url === issueUrl && options.method === 'POST') {
      const number = firstNumber + issues.size;
      const issue = { number, body: JSON.parse(options.body).body };
      issues.set(number, issue);
      return Response.json(issue, { status: 201 });
    }
    if (url.startsWith(`${issueUrl}?`) && !options.method) {
      const params = new URL(url).searchParams;
      assert.equal(params.get('state'), 'all');
      assert.equal(params.get('sort'), 'created');
      assert.equal(params.get('direction'), 'asc');
      assert.ok(Number.isFinite(Date.parse(params.get('since'))));
      const perPage = Number(params.get('per_page'));
      const offset = (Number(params.get('page')) - 1) * perPage;
      return Response.json([...issues.values()].slice(offset, offset + perPage));
    }
    if (url === repo && !options.method) return Response.json({ private: true, visibility: 'private' });
    if (url === releaseTag && !options.method)
      return Response.json({ id: 42, tag_name: 'feedback-screenshots', draft: false, immutable: false });
    if (url === releaseAssets && !options.method) return Response.json([]);
    const number = Number(url.match(/(\d+)(?:\.jpg)?$/)?.[1]);
    if (issues.has(number) && url === uploadUrl(number) && options.method === 'POST') return Response.json({
      id: 123, name: `issue-${number}.jpg`, state: 'uploaded', content_type: 'image/jpeg',
      size: options.body.byteLength, browser_download_url: privateLink(number),
    }, { status: 201 });
    if (issues.has(number) && url === `${issueUrl}/${number}` && options.method === 'PATCH') {
      const issue = { number, body: JSON.parse(options.body).body };
      issues.set(number, issue);
      return Response.json(issue);
    }
    assert.fail(`Unexpected GitHub request: ${options.method || 'GET'} ${url}`);
  };
  const github = async (url, options = {}) => {
    options.signal?.throwIfAborted();
    return (await respond?.(url, options, fallback)) ?? fallback(url, options);
  };
  return Object.assign(github, { issues });
}
