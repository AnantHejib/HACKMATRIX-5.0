import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { bearer } from 'better-auth/plugins/bearer';
import { username } from 'better-auth/plugins/username';
import { Pool } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { sendSmtp } from './smtp-client.js';
const deliveryState = new AsyncLocalStorage();
export async function runAuthRequest(callback) {
  return deliveryState.run({failed:false},async()=>{
    const response=await callback();
    return {response,deliveryFailed:deliveryState.getStore().failed};
  });
}

export function otpEmail(otp) {
  if (!/^\d{6}$/.test(otp)) throw new Error('Invalid OTP');
  return {
    subject: 'Your FIN sign-in code',
    text: `Your FIN sign-in code is ${otp}. It expires in 5 minutes. Never share this code. If you did not request it, ignore this email. FIN will never ask for this code over a call or chat.`,
    html: `<!doctype html><html><body style="margin:0;background:#eef3f9;font-family:Arial,sans-serif;color:#172b45"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:480px;background:#fff;border-radius:24px;overflow:hidden" cellspacing="0" cellpadding="0"><tr><td style="background:#092643;padding:28px;color:#fff"><div style="font-size:32px;font-weight:900">F<span style="color:#19d4d0">IN</span></div><p style="color:#bad4e8;margin-bottom:0">Your financial clarity starts here.</p></td></tr><tr><td style="padding:30px"><h1 style="font-size:24px;margin-top:0">Welcome to FIN</h1><p style="line-height:1.6;color:#54677d">Use this one-time code to securely sign in to your financial workspace.</p><div style="text-align:center;background:#edfafa;border:1px solid #b5e9e4;border-radius:16px;padding:22px;font-size:36px;letter-spacing:8px;font-weight:bold;color:#075e61">${otp}</div><p style="text-align:center;font-size:13px;color:#54677d">Expires in <strong>5 minutes</strong> · One-time use</p><p style="font-size:13px;line-height:1.6;color:#54677d">Never share this code. FIN will never ask for it over a call or chat. If you didn't request this email, you can safely ignore it.</p></td></tr><tr><td style="padding:18px 30px;background:#f5f8fc;font-size:12px;color:#718198">FIN · Financial Copilot<br>No financial records are included in this email.</td></tr></table></td></tr></table></body></html>`,
  };
}

export function getAuthConfig() {
  const emailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  const secretConfigured = (process.env.BETTER_AUTH_SECRET || '').length >= 32;
  const baseUrlConfigured = /^https:\/\//.test(process.env.BETTER_AUTH_URL || '') || (!process.env.VERCEL && /^http:\/\/localhost[:/]/.test(process.env.BETTER_AUTH_URL || ''));
  return { emailConfigured, databaseConfigured, secretConfigured, baseUrlConfigured, productionEnabled: databaseConfigured && secretConfigured && baseUrlConfigured };
}

export function createFINAuth({ database, secret, baseURL, deliver = async ({ email, otp }) => {
  try {
    await sendSmtp({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, from: process.env.SMTP_FROM, to: email, ...otpEmail(otp) });
  } catch { throw new Error('Email delivery failed'); }
} }) {
  return betterAuth({
    appName: 'FIN', database, secret, baseURL, basePath: '/api/v1/auth',
    emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128, autoSignIn: false },
    trustedOrigins: (process.env.FIN_ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    session: { expiresIn: 7 * 86400, updateAge: 86400 },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 30,
      customRules: { '/sign-in/username': { window: 60, max: 5 }, '/sign-up/email': { window: 60, max: 3 }, '/email-otp/send-verification-otp': { window: 60, max: 1 }, '/sign-in/email-otp': { window: 60, max: 5 } } },
    plugins: [username({ minUsernameLength: 10, maxUsernameLength: 10, usernameValidator: value => /^[0-9]{10}$/.test(value) }), emailOTP({ otpLength: 6, expiresIn: 300, allowedAttempts: 5, storeOTP: 'hashed', resendStrategy: 'rotate',
      async sendVerificationOTP(message) {
        try { await deliver(message); }
        catch { const state=deliveryState.getStore();if(state)state.failed=true;throw new Error('Email delivery failed'); }
      } }), bearer()],
    advanced: { database: { generateId: 'uuid' } },
    logger: { disabled: true },
  });
}

let instance;
export function getAuth() {
  if (!getAuthConfig().productionEnabled) throw Object.assign(new Error('Email sign-in is not configured. Set SMTP, database and authentication settings on the server.'), { status: 503 });
  return instance ||= createFINAuth({ database: new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000, query_timeout: 10000 }), secret: process.env.BETTER_AUTH_SECRET, baseURL: process.env.BETTER_AUTH_URL });
}

export async function requireSession(request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user?.id) throw Object.assign(new Error('Please sign in to FIN again.'), { status: 401, code: 'AUTH_REQUIRED' });
  return session;
}
