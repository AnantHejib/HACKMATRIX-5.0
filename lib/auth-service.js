import crypto from 'node:crypto';
import { sendSmtp } from './smtp-client.js';

// Secure in-memory OTP storage
// Key: `${type}:${normalizedTarget}` -> { hash, expiresAt, attempts, lastSentAt, provider, devCode }
const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30 seconds
const MAX_VERIFY_ATTEMPTS = 5;

function normalizeTarget(type, target) {
  const raw = String(target || '').trim();
  if (type === 'email') return raw.toLowerCase();
  // Phone: keep digits and leading +
  return raw.replace(/[^\d+]/g, '');
}

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code).trim()).digest('hex');
}

export function generateNumericOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length);
  return String(crypto.randomInt(min, max));
}



export function getAuthConfig() {
  const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasFast2Sms = Boolean(process.env.FAST2SMS_API_KEY);
  const hasMsg91 = Boolean(process.env.MSG91_AUTH_KEY);
  const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

  return {
    emailConfigured: hasSmtp,
    smsConfigured: hasFast2Sms || hasMsg91 || hasTwilio,
    emailProvider: hasSmtp ? 'smtp' : 'dev-stream',
    smsProvider: hasFast2Sms ? 'fast2sms' : (hasMsg91 ? 'msg91' : (hasTwilio ? 'twilio' : 'dev-stream')),
    productionEnabled: false,
    fast2smsApiKey: process.env.FAST2SMS_API_KEY ? '••••••••' : '',
  };
}

export function updateAuthConfig(){throw Object.assign(new Error('Configure authentication delivery through server environment variables.'),{status:403});}

async function deliverEmailOtp(email,otp,name='FIN User'){
  const {SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASS,SMTP_FROM}=process.env;
  if(!SMTP_USER||!SMTP_PASS)return {delivered:true,provider:'dev-stream',devCode:otp};
  try{
    await sendSmtp({host:SMTP_HOST||'smtp.gmail.com',port:Number(SMTP_PORT)||465,user:SMTP_USER,pass:SMTP_PASS,from:SMTP_FROM||SMTP_USER,to:email,subject:'Your FIN verification code',text:'Your FIN verification code is '+otp+'. Valid for 5 minutes.'});
    return {delivered:true,provider:'smtp'};
  }catch{throw Object.assign(new Error('Email delivery failed. Please retry later.'),{status:503});}
}

async function deliverSmsOtp(phone, otp) {
  const { FAST2SMS_API_KEY, MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_PHONE } = process.env;

  // 1. Fast2SMS (India)
  if (FAST2SMS_API_KEY) {
    const cleanNumber = phone.replace(/^\+91/, '').replace(/^\+/, '').replace(/\D/g, '');
    try {
      let res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: cleanNumber,
        }),
      });
      let result = await res.json().catch(() => ({}));
      if (!res.ok || result.return === false) {
        // Fallback to Quick SMS (route 'q') for instant delivery without DLT registration
        res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: FAST2SMS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q',
            message: `Your FIN security code is ${otp}. Valid for 5 minutes.`,
            numbers: cleanNumber,
          }),
        });
        result = await res.json().catch(() => ({}));
        if (!res.ok || result.return === false) {
          throw new Error(result.message || res.statusText || 'Fast2SMS dispatch failed');
        }
      }
      return { delivered: true, provider: 'fast2sms' };
    } catch { throw Object.assign(new Error('SMS delivery failed. Please retry later.'), {status:503}); }
  }

  // 2. MSG91 (India & Global)
  if (MSG91_AUTH_KEY) {
    const cleanNumber = phone.replace(/[^\d]/g, '');
    const url = new URL('https://control.msg91.com/api/v5/otp');
    url.searchParams.set('authkey', MSG91_AUTH_KEY);
    if (MSG91_TEMPLATE_ID) url.searchParams.set('template_id', MSG91_TEMPLATE_ID);
    url.searchParams.set('mobile', cleanNumber);
    url.searchParams.set('otp', otp);

    const res = await fetch(url.toString(), { method: 'POST' });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || result.type === 'error') {
      throw new Error(`MSG91 error: ${result.message || res.statusText}`);
    }
    return { delivered: true, provider: 'msg91' };
  }

  // 3. Twilio (Global fallback)
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_PHONE) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: TWILIO_FROM_PHONE,
        Body: `Your FIN security code is ${otp}. Valid for 5 minutes. Do not share this code.`,
      }).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Twilio error: ${err}`);
    }
    return { delivered: true, provider: 'twilio' };
  }

  return { delivered: true, provider: 'dev-stream' };
}

export async function sendOtp({ type, target, name = 'FIN User' }) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw Object.assign(new Error('Production authentication requires a configured persistent identity service.'), { status: 503 });
  }
  if (!['email', 'phone'].includes(type)) {
    throw Object.assign(new Error('Type must be email or phone'), { status: 400 });
  }

  const normalized = normalizeTarget(type, target);
  if (!normalized || (type === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) : !/^\+?\d{10,15}$/.test(normalized))) {
    throw Object.assign(new Error(`Invalid ${type} target`), { status: 400 });
  }

  const key = `${type}:${normalized}`;
  const now = Date.now();
  const existing = otpStore.get(key);

  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const remaining = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    throw Object.assign(new Error(`Please wait ${remaining} seconds before requesting a new code`), {
      status: 429,
      cooldownSeconds: remaining,
    });
  }

  const otp = generateNumericOtp(6);
  const hashed = hashCode(otp);

  let delivery;
  const config = getAuthConfig();
  if (!config.emailConfigured && type === 'email' && process.env.FIN_AUTH_DEV_MODE !== 'true') throw Object.assign(new Error('Email delivery is not configured.'), { status: 503 });
  if (!config.smsConfigured && type === 'phone' && process.env.FIN_AUTH_DEV_MODE !== 'true') throw Object.assign(new Error('SMS delivery is not configured.'), { status: 503 });
  if (type === 'email') {
    delivery = await deliverEmailOtp(normalized, otp, name);
  } else {
    delivery = await deliverSmsOtp(normalized, otp);
  }

  otpStore.set(key, {
    hash: hashed,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: now,
    provider: delivery.provider,
    // In dev-stream mode only (when no provider key is configured), retain code for dev inspection
    devCode: delivery.provider === 'dev-stream' ? otp : undefined,
  });

  return {
    success: true,
    message: type === 'email' ? `Verification code sent to ${target}` : `SMS code sent to ${target}`,
    cooldownSeconds: 30,
    provider: delivery.provider,
    expiresInSeconds: 300,
    devCode: delivery.devCode || (delivery.provider === 'dev-stream' ? otp : undefined),
    warning: delivery.warning,
    devDelivery: (delivery.devCode || delivery.provider === 'dev-stream') ? { code: otp, instructions: delivery.warning || 'Enclave backup' } : undefined,
  };
}

export async function verifyOtp({ type, target, code }) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') throw Object.assign(new Error('Production authentication is not configured.'), { status: 503 });
  if (!['email', 'phone'].includes(type)) {
    throw Object.assign(new Error('Type must be email or phone'), { status: 400 });
  }

  const normalized = normalizeTarget(type, target);
  const cleanCode = String(code || '').trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    throw Object.assign(new Error('Verification code must be 6 digits'), { status: 400 });
  }

  const key = `${type}:${normalized}`;
  const record = otpStore.get(key);

  if (!record) {
    throw Object.assign(new Error('No verification code requested or code has expired. Please request a new code.'), { status: 400 });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    throw Object.assign(new Error('Verification code has expired. Please request a new code.'), { status: 400 });
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    otpStore.delete(key);
    throw Object.assign(new Error('Too many incorrect attempts. Please request a new code.'), { status: 429 });
  }

  const inputHash = hashCode(cleanCode);
  if (inputHash !== record.hash) {
    record.attempts += 1;
    const remaining = MAX_VERIFY_ATTEMPTS - record.attempts;
    throw Object.assign(new Error(`Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`), {
      status: 400,
      attemptsRemaining: remaining,
    });
  }

  // Verified!
  otpStore.delete(key);

  const verificationToken = crypto.randomBytes(24).toString('hex');
  return {
    success: true,
    verified: true,
    type,
    target: normalized,
    verificationToken,
    verifiedAt: new Date().toISOString(),
  };
}
