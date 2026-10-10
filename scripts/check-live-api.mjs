import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validRequest } from '../test/fixtures.js';
import { copilotResponseSchema } from '../lib/contracts.js';
const base=process.env.FIN_VERIFY_API_BASE||'https://hackmatrix-50.vercel.app';
const results=[];
for(const locale of ['en','hi','mr']){
  const payload=validRequest({locale});
  const start=Date.now();
  const response=await fetch(base+'/api/v1/copilot',{method:'POST',headers:{'Content-Type':'application/json','X-FIN-Client-ID':'synthetic-integration-verification'},body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)});
  const data=await response.json();
  results.push({locale,status:response.status,durationMs:Date.now()-start,requestId:data.requestId,model:data.model?.id});
  assert.equal(response.status,200,JSON.stringify({locale,status:response.status,error:data.error,message:data.message}));
  assert.ok(copilotResponseSchema.safeParse(data.answer).success,'Live response must match the structured answer contract');
  if(locale!=='en')assert.match(data.answer.directAnswer,/[\u0900-\u097f]/);
}
fs.mkdirSync('build/reports',{recursive:true});
fs.writeFileSync('build/reports/live-api-verification.json',JSON.stringify({synthetic:true,base,results},null,2));
console.log('Verified configured live AI responses for English, Hindi and Marathi using synthetic financial summaries.');
