import test from 'node:test';
import assert from 'node:assert/strict';
import { sendOtp, verifyOtp, generateNumericOtp, getAuthConfig } from '../lib/auth-service.js';

test('auth-service: generates 6-digit numeric OTP', () => {
  for (let i = 0; i < 20; i++) {
    const otp = generateNumericOtp(6);
    assert.match(otp, /^\d{6}$/);
    assert.equal(otp.length, 6);
  }
});

test('auth-service: sends and verifies email OTP', async () => {
  const email = 'tester@example.com';
  const sendRes = await sendOtp({ type: 'email', target: email, name: 'Tester' });
  assert.equal(sendRes.success, true);
  assert.equal(sendRes.cooldownSeconds, 30);
  assert.ok(sendRes.devDelivery?.code);

  const code = sendRes.devDelivery.code;

  // Test incorrect code
  await assert.rejects(
    async () => verifyOtp({ type: 'email', target: email, code: '000000' }),
    err => {
      assert.match(err.message, /Incorrect code/);
      assert.equal(err.status, 400);
      return true;
    }
  );

  // Test correct code
  const verifyRes = await verifyOtp({ type: 'email', target: email, code });
  assert.equal(verifyRes.success, true);
  assert.equal(verifyRes.verified, true);
  assert.equal(verifyRes.target, email);
  assert.ok(verifyRes.verificationToken);

  // Re-verifying used code should fail
  await assert.rejects(
    async () => verifyOtp({ type: 'email', target: email, code }),
    err => {
      assert.match(err.message, /No verification code requested or code has expired/);
      return true;
    }
  );
});

test('auth-service: sends and verifies phone SMS OTP', async () => {
  const phone = '+919876543210';
  const sendRes = await sendOtp({ type: 'phone', target: phone });
  assert.equal(sendRes.success, true);
  assert.ok(sendRes.devDelivery?.code);

  const code = sendRes.devDelivery.code;

  // Verify correct code
  const verifyRes = await verifyOtp({ type: 'phone', target: phone, code });
  assert.equal(verifyRes.success, true);
  assert.equal(verifyRes.verified, true);
});

test('auth-service: enforces resend cooldown', async () => {
  const email = 'cooldown@example.com';
  await sendOtp({ type: 'email', target: email });

  await assert.rejects(
    async () => sendOtp({ type: 'email', target: email }),
    err => {
      assert.equal(err.status, 429);
      assert.match(err.message, /Please wait/);
      return true;
    }
  );
});

test('auth-service: rejects invalid targets and codes', async () => {
  await assert.rejects(
    async () => sendOtp({ type: 'invalid', target: 'abc' }),
    err => err.status === 400
  );

  await assert.rejects(
    async () => verifyOtp({ type: 'email', target: 'abc@test.com', code: '123' }),
    err => err.status === 400
  );
});
