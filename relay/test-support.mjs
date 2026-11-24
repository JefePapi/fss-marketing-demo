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

export function githubStub(number = 7) {
  return (url, options = {}) => {
    if (url === `${repo}/issues` && options.method === 'POST') return Response.json({ number }, { status: 201 });
    if (url === repo && !options.method) return Response.json({ private: true, visibility: 'private' });
    if (url === releaseTag && !options.method)
      return Response.json({ id: 42, tag_name: 'feedback-screenshots', draft: false, immutable: false });
    if (url === releaseAssets && !options.method) return Response.json([]);
    if (url === uploadUrl(number) && options.method === 'POST') return Response.json({
      id: 123, name: `issue-${number}.jpg`, state: 'uploaded', content_type: 'image/jpeg',
      size: options.body.byteLength, browser_download_url: privateLink(number),
    }, { status: 201 });
    if (url === `${repo}/issues/${number}` && options.method === 'PATCH')
      return Response.json({ number, body: JSON.parse(options.body).body });
    assert.fail(`Unexpected GitHub request: ${options.method || 'GET'} ${url}`);
  };
}
