import { corsHeaders, json, readJson } from '../../lib/http.js';
import { sendOtp, verifyOtp, getAuthConfig, updateAuthConfig } from '../../lib/auth-service.js';

export function OPTIONS(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function GET(request) {
  return json(request, {
    status: 'ready',
    service: 'FIN Auth Service',
    config: getAuthConfig(),
  });
}

export async function POST(request) {
  const url = new URL(request.url);
  try {
    const payload = await readJson(request);

    if (url.pathname.endsWith('/send-otp')) {
      const result = await sendOtp(payload);
      return json(request, result, 200);
    }

    if (url.pathname.endsWith('/verify-otp')) {
      const result = await verifyOtp(payload);
      return json(request, result, 200);
    }

    if (url.pathname.endsWith('/config')) {
      const result = updateAuthConfig(payload);
      return json(request, { success: true, config: result }, 200);
    }

    return json(request, { error: 'UNKNOWN_AUTH_ACTION' }, 404);
  } catch (error) {
    const status = error.status || 500;
    return json(request, {
      success: false,
      error: error.message || 'Authentication error',
      attemptsRemaining: error.attemptsRemaining,
      cooldownSeconds: error.cooldownSeconds,
    }, status);
  }
}
