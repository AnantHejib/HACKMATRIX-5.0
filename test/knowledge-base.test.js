import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSources, retrieveGuidance } from '../lib/knowledge-base.js';
import { validRequest } from './fixtures.js';

test('retrieves RBI debt guidance for debt questions', () => {
  const request = validRequest();
  const results = retrieveGuidance(request.question, request.financialContext);
  assert.ok(results.some(source => source.id === 'rbi-fame'));
});

test('only resolves sources included in retrieved context', () => {
  const request = validRequest();
  const retrieved = retrieveGuidance(request.question, request.financialContext);
  const resolved = resolveSources(['rbi-fame', 'invented-source'], retrieved);
  assert.deepEqual(resolved.map(source => source.id), ['rbi-fame']);
});

