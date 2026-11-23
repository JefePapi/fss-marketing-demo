import test from 'node:test';
import assert from 'node:assert/strict';
import { markBox, wrapNote } from '../js/lazy/feedback-markup-draw.js';

test('tap marks keep their size at the edges of the image', () => {
  const topLeft = {x:0, y:0};
  const bottomRight = {x:400, y:800};
  assert.deepEqual(markBox(topLeft, topLeft, 400, 800), {x:0, y:0, width:68, height:40});
  assert.deepEqual(markBox(bottomRight, bottomRight, 400, 800), {x:332, y:760, width:68, height:40});
});

test('drag marks work in either direction and have a visible minimum thickness', () => {
  const start = {x:100, y:20}, end = {x:50, y:22};
  const box = {x:50, y:14, width:50, height:14};
  assert.deepEqual(markBox(start, end, 400, 800), box);
  assert.deepEqual(markBox(end, start, 400, 800), box);
});

test('note wrapping uses measured widths and keeps emoji code points intact', () => {
  const measure = text => Array.from(text).length;
  assert.deepEqual(wrapNote('one  two three', 7, measure), ['one two', 'three']);
  assert.deepEqual(wrapNote('🙂🙂🙂 longword', 2, measure), ['🙂🙂', '🙂', 'lo', 'ng', 'wo', 'rd']);
});
