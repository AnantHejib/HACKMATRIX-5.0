import { corsHeaders, json } from '../lib/http.js';

export function OPTIONS(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request) {
  if(process.env.FIN_COPILOT_UPSTREAM==='https://hackmatrix-50.vercel.app'){
    try{
      const upstream=await fetch(process.env.FIN_COPILOT_UPSTREAM+'/api/health',{signal:AbortSignal.timeout(5000),redirect:'error'});
      const body=await upstream.json();
      const ready=upstream.ok&&body.status==='ready';
      return json(request,{status:ready?'ready':'configuration-required',service:'FIN Copilot API',apiVersion:'1.0',modelConfigured:ready,gatewayAuthentication:'managed-upstream'},ready?200:503);
    }catch{return json(request,{status:'unavailable',service:'FIN Copilot API',apiVersion:'1.0',modelConfigured:false},503);}
  }
  const auth = process.env.VERCEL_OIDC_TOKEN
    ? 'oidc'
    : process.env.AI_GATEWAY_API_KEY ? 'gateway-key' : 'missing';
  return json(request, {
    status: process.env.AI_GATEWAY_MODEL && auth !== 'missing' ? 'ready' : 'configuration-required',
    service: 'FIN Copilot API',
    apiVersion: '1.0',
    modelConfigured: Boolean(process.env.AI_GATEWAY_MODEL),
    gatewayAuthentication: auth,
  }, process.env.AI_GATEWAY_MODEL && auth !== 'missing' ? 200 : 503);
}

