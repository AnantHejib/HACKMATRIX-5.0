import crypto from 'node:crypto';
import { copilotRequestSchema } from '../../lib/contracts.js';
import { createCopilotAnswer } from '../../lib/copilot-service.js';
import { corsHeaders, json, readJson } from '../../lib/http.js';

export function OPTIONS(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const raw = await readJson(request);
    const parsed = copilotRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return json(request, {
        error: 'INVALID_REQUEST',
        message: 'The financial summary did not match API version 1.0.',
        requestId,
        fields: parsed.error.issues.slice(0, 8).map(issue => ({ path: issue.path.join('.'), message: issue.message })),
      }, 400);
    }

    const response = await createCopilotAnswer(parsed.data, {
      requestId,
      clientId: request.headers.get('x-fin-client-id')?.slice(0, 128),
    });
    console.info(JSON.stringify({ event: 'copilot.complete', requestId, durationMs: Date.now() - startedAt, records: parsed.data.financialContext.observed.recordCount }));
    return json(request, response);
  } catch (error) {
    const status = Number(error?.status) || 503;
    const code = error?.code || (status < 500 ? 'BAD_REQUEST' : 'COPILOT_UNAVAILABLE');
    console.error(JSON.stringify({ event: 'copilot.error', requestId, code, status, durationMs: Date.now() - startedAt, error: error?.name || 'Error' }));
    return json(request, {
      error: code,
      message: status < 500 ? error.message : 'FIN Copilot is temporarily unavailable. Use the on-device evidence mode and try again later.',
      requestId,
      offlineFallback: true,
    }, status);
  }
}

