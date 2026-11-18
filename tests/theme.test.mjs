import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme } from '../js/theme.js';

test('URL choice takes precedence over the saved preference', () => {
  for (const id of ['a', 'a-light', 'b', 'c', 'current'])
    assert.equal(resolveTheme('?x=keep&theme=' + id, 'current'), id);
});

test('Invalid or absent values fall through to storage, then the default', () => {
  for (const search of ['', '?theme=', '?theme=invalid', '?theme=__proto__', '?theme=constructor']) {
    assert.equal(resolveTheme(search, 'c'), 'c');
    assert.equal(resolveTheme(search, 'invalid'), 'a');
    assert.equal(resolveTheme(search, null), 'a');
  }
});

test('Shareable aliases resolve to canonical design IDs', () => {
  for (const [alias, id] of Object.entries({night:'a', 'night-light':'a-light', mission:'b', ribbon:'c'}))
    assert.equal(resolveTheme('?theme=' + alias, null), id);
});
