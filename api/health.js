import { corsHeaders, json } from '../lib/http.js';

export function OPTIONS(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function GET(request) {
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

