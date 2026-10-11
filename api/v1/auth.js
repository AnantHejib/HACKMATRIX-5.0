import { corsHeaders, json, readJson } from '../../lib/http.js';
import { getAuth, getAuthConfig, runAuthRequest } from '../../lib/auth-service.js';

export function OPTIONS(request) { return new Response(null, { status: 204, headers: corsHeaders(request) }); }

export async function handleAuth(request, authOverride) {
  const incomingURL=new URL(request.url);
  const action = incomingURL.searchParams.get('action') || incomingURL.pathname.split('/').pop();
  if (action === 'status') return json(request, { config: getAuthConfig(), status: getAuthConfig().productionEnabled ? 'ready' : 'configuration_required' });
  if (action === 'config') return json(request, { error: 'Configure authentication privately on the server.' }, 403);
  const paths = { signup: '/sign-up/email', signin: '/sign-in/username', 'send-otp': '/email-otp/send-verification-otp', 'verify-otp': '/sign-in/email-otp', session: '/get-session', logout: '/sign-out' };
  if (!paths[action] || (request.method === 'GET') !== (action === 'session')) return json(request, { error: 'UNKNOWN_AUTH_ACTION' }, 404);
  try {
    let body;
    if (request.method === 'POST') {
      const payload = await readJson(request);
      if(!payload||typeof payload!=='object'||Array.isArray(payload))return json(request,{error:'Invalid authentication request.'},400);
      if (action === 'signup' || action === 'signin') {
        const phone = payload.phone;
        if (typeof phone !== 'string' || !/^[0-9]{10}$/.test(phone)) return json(request, { error: 'Enter a mobile number containing exactly 10 digits.' }, 400);
        if (typeof payload.password !== 'string' || payload.password.length < 8 || payload.password.length > 128) return json(request, { error: action === 'signin' ? 'Incorrect mobile number or password.' : 'Use a password between 8 and 128 characters.' }, 400);
        body = { username: phone, password: payload.password };
        if (action === 'signup') {
          const email = String(payload.email || '').trim().toLowerCase();
          if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(request, { error: 'Enter a valid email address.' }, 400);
          body = { ...body, email, name: email.split('@')[0] };
        }
      } else if (action !== 'logout') {
        const email = String(payload.target || '').trim().toLowerCase();
        if (payload.type !== 'email' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(request, { error: 'Enter a valid email address.' }, 400);
        if (action === 'verify-otp' && !/^\d{6}$/.test(String(payload.code || ''))) return json(request, { error: 'Enter the six-digit code.' }, 400);
        const name = String(payload.name || '').trim().replace(/\s+/g, ' ');
        if (name && (name.length < 2 || name.length > 80)) return json(request, { error: 'Enter a name between 2 and 80 characters.' }, 400);
        body = action === 'send-otp' ? { email, type: 'sign-in' } : { email, otp: payload.code, ...(name ? { name } : {}) };
      } else body = {};
    }
    const auth = authOverride || getAuth();
    const url = new URL(request.url);
    url.pathname = '/api/v1/auth' + paths[action];
    url.search='';
    const headers = new Headers(request.headers);
    headers.delete('cookie'); headers.delete('content-length');
    // Adapt the native file:// JSON request to a cookie-free server request.
    // Removing Origin alone leaves Fetch Metadata behind, which makes Better
    // Auth require the missing origin again. Never adapt browser navigation/forms.
    if(headers.get('origin')==='null'){
      const mode=headers.get('sec-fetch-mode'),dest=headers.get('sec-fetch-dest');
      if(request.method==='POST' && ((request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()!=='application/json' || (mode&&mode!=='cors'&&mode!=='same-origin') || (dest&&dest!=='empty')))
        return json(request,{error:'Unsupported authentication request.'},403);
      for(const name of ['origin','referer','sec-fetch-site','sec-fetch-mode','sec-fetch-dest','sec-fetch-user'])headers.delete(name);
      // Better Auth requires an Origin for credential endpoints. Use only the
      // configured FIN backend origin for native file:// JSON requests.
      headers.set('origin', new URL(auth.options.baseURL).origin);
    }
    headers.set('content-type', 'application/json');
    const {response,deliveryFailed} = await runAuthRequest(()=>auth.handler(new Request(url, { method: request.method, headers, body: body ? JSON.stringify(body) : undefined })));
    if(deliveryFailed)return json(request,{error:'Email delivery failed. Please try again later.'},503);
    const data = await response.json().catch(() => ({}));
    if (action === 'signin' && !response.ok && response.status < 500 && response.status !== 429) return json(request, { error: 'Incorrect mobile number or password.' }, 401);
    if (!response.ok) return json(request, { error: response.status === 429 ? 'Too many requests. Please wait one minute and try again.' : response.status >= 500 ? 'Sign-in service unavailable or email delivery failed. Please try again later.' : data.message || 'Invalid or expired code. Request a new code.', cooldownSeconds: response.status === 429 ? 60 : undefined }, response.status);
    if (action === 'send-otp') return json(request, { success: true, provider: 'smtp', cooldownSeconds: 60, expiresInSeconds: 300 });
    if (action === 'verify-otp') return json(request, { success: true, verified: true, target: data.user.email, name: data.user.name, token: data.token });
    if (action === 'signup') {
      const context = await auth.$context;
      const stored = await context.adapter.findOne({ model: 'user', where: [{ field: 'email', value: body.email }] });
      if (!stored || stored.id !== data.user?.id || stored.username !== body.username) return json(request, { error: 'Unable to create this account. The email or mobile number may already be registered.' }, 409);
      return json(request, { success: true });
    }
    if (action === 'signin') return json(request, { success: true, user: data.user, token: data.token });
    if (action === 'session') return data?.user?.id ? json(request, { success: true, user: data.user, expiresAt: data.session.expiresAt }) : json(request, { error: 'Please sign in.' }, 401);
    return json(request, { success: true });
  } catch (error) { return json(request, { error: error.status === 503 ? error.message : 'Authentication is temporarily unavailable.' }, error.status || 503); }
}
export const GET = request => handleAuth(request);
export const POST = request => handleAuth(request);
