import test from 'node:test';
import assert from 'node:assert/strict';
import { createCopilotAnswer } from '../lib/copilot-service.js';
import { validAnswer, validRequest } from './fixtures.js';

test('returns validated layers and filters invented citations', async () => {
  let captured;
  const response = await createCopilotAnswer(validRequest(), {
    model: 'openai/gpt-oss-20b',
    requestId: 'test-request',
    clientId: 'anonymous-installation',
    generate: async options => {
      captured = options;
      return {
        output: validAnswer,
        providerMetadata: { gateway: { generationId: 'generation-test' } },
      };
    },
  });

  assert.equal(response.answer.observedFacts.length, 1);
  assert.equal(response.answer.predictions.length, 1);
  assert.equal(response.answer.recommendations[0].expectedImpact.includes('₹36,000'), true);
  assert.deepEqual(response.answer.sources.map(source => source.id), ['rbi-fame']);
  assert.equal(response.model.generationId, 'generation-test');
  assert.match(captured.prompt, /financialContext/);
  assert.doesNotMatch(captured.prompt, /transactions/);
});

test('requires a configured gateway model', async () => {
  await assert.rejects(
    () => createCopilotAnswer(validRequest(), { model: '' }),
    error => error.code === 'MODEL_NOT_CONFIGURED',
  );
});

test('supports natural conversation without forcing financial analysis', async () => {
  const response = await createCopilotAnswer({
    ...validRequest(),
    question: 'Hi',
  }, {
    model: 'openai/gpt-oss-20b',
    generate: async options => {
      assert.match(options.system, /greetings, small talk, and general questions naturally/i);
      return {
        output: {
          directAnswer: 'Hi! I’m FIN. How can I help?',
          sourceIds: [],
        },
      };
    },
  });

  assert.equal(response.answer.directAnswer, 'Hi! I’m FIN. How can I help?');
  assert.deepEqual(response.answer.sources, []);
  assert.equal(response.answer.observedFacts, undefined);
});
