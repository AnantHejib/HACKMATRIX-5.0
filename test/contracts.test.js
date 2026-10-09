import test from 'node:test';
import assert from 'node:assert/strict';
import { copilotRequestSchema, copilotResponseSchema } from '../lib/contracts.js';
import { validAnswer, validRequest } from './fixtures.js';

test('accepts a bounded financial-summary request', () => {
  assert.equal(copilotRequestSchema.safeParse(validRequest()).success, true);
});

test('rejects raw or malformed request fields', () => {
  const payload = validRequest();
  payload.transactions = [{ amount: -500 }];
  payload.question = 'x'.repeat(801);
  const parsed = copilotRequestSchema.safeParse(payload);
  assert.equal(parsed.success, false);
});

test('requires separate facts, predictions, recommendations, and impact', () => {
  assert.equal(copilotResponseSchema.safeParse(validAnswer).success, true);
  const missingImpact = structuredClone(validAnswer);
  delete missingImpact.recommendations[0].expectedImpact;
  assert.equal(copilotResponseSchema.safeParse(missingImpact).success, false);
});

