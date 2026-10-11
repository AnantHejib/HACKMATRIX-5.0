import test from 'node:test';
import assert from 'node:assert/strict';
import { GET as health } from '../api/health.js';
import { POST, handleCopilot } from '../api/v1/copilot.js';
import { validRequest, validAnswer } from './fixtures.js';

test('returns structured validation errors without invoking a model', async () => {
  const request = new Request('https://fin.example/api/v1/copilot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiVersion: '1.0', question: 'hi' }),
  });
  const response = await POST(request);
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.error, 'INVALID_REQUEST');
  assert.equal(Array.isArray(body.fields), true);
});

test('rejects request bodies over the service limit', async () => {
  const request = new Request('https://fin.example/api/v1/copilot', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ padding: 'x'.repeat(257 * 1024) }),
  });
  const response = await POST(request);
  const body = await response.json();
  assert.equal(response.status, 413);
  assert.equal(body.offlineFallback, true);
});

test('health reports configuration without exposing credentials', async () => {
  const previousModel = process.env.AI_GATEWAY_MODEL;
  const previousKey = process.env.AI_GATEWAY_API_KEY;
  try {
    process.env.AI_GATEWAY_MODEL = 'openai/gpt-oss-20b';
    process.env.AI_GATEWAY_API_KEY = 'must-never-appear';
    const response = await health(new Request('https://fin.example/api/health'));
    const text = await response.text();
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(text).gatewayAuthentication, 'gateway-key');
    assert.equal(text.includes('must-never-appear'), false);
  } finally {
    if (previousModel === undefined) delete process.env.AI_GATEWAY_MODEL;
    else process.env.AI_GATEWAY_MODEL = previousModel;
    if (previousKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = previousKey;
  }
});

test('managed upstream requires a session, forwards the validated payload without session secrets and validates its response',async()=>{
  const previous=process.env.FIN_COPILOT_UPSTREAM;process.env.FIN_COPILOT_UPSTREAM='https://hackmatrix-50.vercel.app';
  const request=()=>new Request('https://fin.example/api/v1/copilot',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer private-session'},body:JSON.stringify(validRequest())});
  try{
    let calls=0;
    const denied=await handleCopilot(request(),{authenticate:async()=>{throw Object.assign(new Error('Sign in'),{status:401});},fetcher:async()=>{calls++;}});
    assert.equal(denied.status,401);assert.equal(calls,0);
    const response=await handleCopilot(request(),{authenticate:async()=>({user:{id:'test'}}),fetcher:async(url,options)=>{
      assert.equal(url,'https://hackmatrix-50.vercel.app/api/v1/copilot');assert.equal(options.headers.Authorization,undefined);assert.equal(JSON.parse(options.body).question,validRequest().question);
      assert.equal(JSON.parse(options.body).locale,undefined);
      return new Response(JSON.stringify({answer:validAnswer}),{status:200});
    }});
    assert.equal(response.status,200);assert.equal((await response.json()).answer.directAnswer,validAnswer.directAnswer);
    const malformed=await handleCopilot(request(),{authenticate:async()=>({}),fetcher:async()=>new Response(JSON.stringify({answer:{directAnswer:''}}))});
    assert.equal(malformed.status,503);
    const changed=validRequest();changed.locale='mr';changed.financialContext.change={label:'Debt updated',before:{healthScore:70,safeToSpend:1000,cashGapProbability:null,totalDebt:20000,leadingRecommendation:'Save'},after:{healthScore:65,safeToSpend:500,cashGapProbability:null,totalDebt:30000,leadingRecommendation:'Repay'}};
    const compatible=await handleCopilot(new Request('https://fin.example/api/v1/copilot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(changed)}),{authenticate:async()=>({}),fetcher:async(url,options)=>{
      const sent=JSON.parse(options.body);assert.equal(sent.financialContext.change,null);assert.match(sent.financialContext.preferences.style,/Marathi/);return new Response(JSON.stringify({answer:validAnswer}));
    }});
    const result=await compatible.json();assert.equal(compatible.status,200);assert.equal(result.answer.changeExplanation.changed,true);assert.match(result.answer.changeExplanation.drivers[0],/unavailable/);
  }finally{if(previous===undefined)delete process.env.FIN_COPILOT_UPSTREAM;else process.env.FIN_COPILOT_UPSTREAM=previous;}
});

