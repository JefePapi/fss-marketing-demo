import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureRoute } from '../js/lazy/feedback-capture-policy.js';

test('capture allows known public views and rejects ambiguous or private destinations', () => {
  for (const page of ['', 'request', 'other', 'status', 'calendar', 'activities', 'about']) {
    assert.equal(captureRoute(page ? [page] : []), null);
    assert.equal(captureRoute(page ? [page] : [], {staff:true}), 'staff-view');
  }
  for (const page of ['notifications', 'feedback', 'reports', 'emails', 'sample-request']) {
    assert.equal(captureRoute(['staff', page]), 'staff-view');
  }
  assert.equal(captureRoute(['manager']), 'staff-view');
  assert.equal(captureRoute(['sent']), 'record-detail');
  assert.equal(captureRoute(['status','sample']), 'record-detail');
  assert.equal(captureRoute(['activities','bowling']), 'record-detail');
  assert.equal(captureRoute(['calendar'], {detail:true}), 'record-detail');
  assert.equal(captureRoute(['future-route']), 'misleading-preview');
  assert.equal(captureRoute(['request','future-route']), 'misleading-preview');
});
