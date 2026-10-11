import crypto from 'node:crypto';
import { copilotRequestSchema, copilotResponseSchema } from '../../lib/contracts.js';
import { createCopilotAnswer } from '../../lib/copilot-service.js';
import { corsHeaders, json, readJson } from '../../lib/http.js';
import { requireSession } from '../../lib/auth-service.js';
import { resolveSources, retrieveGuidance } from '../../lib/knowledge-base.js';

export function OPTIONS(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function handleCopilot(request, { authenticate = requireSession, fetcher = fetch, generate = createCopilotAnswer } = {}) {
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

    await authenticate(request);
    let response;
    if(process.env.FIN_COPILOT_UPSTREAM){
      if(process.env.FIN_COPILOT_UPSTREAM!=='https://hackmatrix-50.vercel.app')throw Object.assign(new Error('Unsupported Copilot upstream'),{code:'UPSTREAM_CONFIGURATION'});
      // The existing deployed service predates locale and nullable change risks.
      // Preserve missing probabilities as missing; never invent numeric values.
      const {locale,...upstreamPayload}=parsed.data;
      const change=upstreamPayload.financialContext.change;
      const withheldChange=change&&(change.before.cashGapProbability===null||change.after.cashGapProbability===null);
      if(withheldChange)upstreamPayload.financialContext={...upstreamPayload.financialContext,change:null};
      if(locale!=='en'){
        const language=locale==='hi'?'Hindi':'Marathi',prefix=`Please answer in ${language}. `;
        if(prefix.length+upstreamPayload.question.length<=800)upstreamPayload.question=prefix+upstreamPayload.question;
        upstreamPayload.financialContext={...upstreamPayload.financialContext,preferences:{...upstreamPayload.financialContext.preferences,style:`${upstreamPayload.financialContext.preferences.style.slice(0,40)}; reply in ${language}`}};
      }
      const upstream=await fetcher(process.env.FIN_COPILOT_UPSTREAM+'/api/v1/copilot',{
        method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify(upstreamPayload),signal:AbortSignal.timeout(25000),redirect:'error',
      });
      const body=await upstream.json().catch(()=>null);
      if(!upstream.ok)throw Object.assign(new Error('Copilot upstream unavailable'),{status:upstream.status===429?429:503,code:'COPILOT_UPSTREAM_UNAVAILABLE'});
      const answer=copilotResponseSchema.safeParse(body?.answer);
      if(!answer.success)throw Object.assign(new Error('Invalid upstream response'),{code:'INVALID_COPILOT_RESPONSE'});
      response={apiVersion:'1.0',requestId,answer:{...answer.data,sources:resolveSources(answer.data.sourceIds,retrieveGuidance(parsed.data.question,parsed.data.financialContext))}};
      if(withheldChange){
        const currency=new Intl.NumberFormat(locale==='mr'?'mr-IN':locale==='hi'?'hi-IN':'en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
        response.answer.changeExplanation={changed:change.before.leadingRecommendation!==change.after.leadingRecommendation,summary:`${change.label}. Safe-to-spend ${currency.format(change.before.safeToSpend)} → ${currency.format(change.after.safeToSpend)}; debt ${currency.format(change.before.totalDebt)} → ${currency.format(change.after.totalDebt)}.`,drivers:['Before/after cash-gap probabilities are unavailable; no numeric risk change can be claimed.']};
      }
    }else response = await generate(parsed.data, {
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

export async function POST(request){return handleCopilot(request);}

