import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('parity inventory has exactly one browser test for every covered or simulated row',()=>{
 const inventory=readFileSync(new URL('../docs/PARITY.md',import.meta.url),'utf8');
 const expected=inventory.split('\n').map(l=>l.split('|').map(c=>c.trim())).filter(c=>/^[RS]\d+$/.test(c[1] || '') && ['**COVERED**','**DEMO-STUB**'].includes(c[5])).map(c=>c[1]+' '+c[2]);
 const source=readFileSync(new URL('./parity.spec.mjs',import.meta.url),'utf8');
 const actual=[...source.matchAll(/^test\((['"])(.*?)\1, async/gm)].map(m=>m[2]);
 assert.equal(expected.length,78);assert.equal(new Set(actual).size,actual.length);assert.deepEqual(actual.sort(),expected.sort());
});
