# FIN 1.10.5 — mobile/password access (build 26)

The current Android entry flow uses a separate English `login.html` page. Sign-up collects email, a mobile number containing exactly ten ASCII digits, a password (8–128 characters), and confirmation. Sign-up returns to sign-in; matching mobile/password credentials create a server session and open the existing application. Invalid credentials stay on the page. No OTP is required for this flow.

Better Auth stores salted password hashes in the existing Neon PostgreSQL account table and the unique mobile number in its username field. Passwords are never stored in browser storage. Username schema migration is additive; existing OTP accounts remain intact. Previously created OTP-only accounts do not yet have a mobile/password credential and cannot use this new sign-in until enrolled. Email and mobile ownership are not verified by this password flow.

Browser verification covers registration, wrong-password rejection, successful sign-in, reload, logout and the existing financial tools. Install the canonical build 26 APK as an update. Physical Android testing and production release signing remain pending.

## Earlier email OTP implementation (build 25)

Email → SMTP email → six-digit code → verified session → FIN dashboard.

## Private backend setup required

### Gmail sender

Enable Google 2-Step Verification, then create an app password for FIN at https://myaccount.google.com/apppasswords. Availability depends on your account policy; security-key-only, managed organization or Advanced Protection accounts may not offer app passwords. See [Google's app-password instructions](https://support.google.com/accounts/answer/185833).

Use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=your-address@gmail.com`, and `SMTP_FROM="FIN <your-address@gmail.com>"`. Put the app password privately in `SMTP_PASS`, without the visual grouping spaces. Do not use your normal Google account password. Sender access sends mail only; users verify their own email addresses and do not provide their Gmail passwords to FIN.

Use a dedicated sender mailbox rather than a personal mailbox for a public deployment. Gmail sending limits and abuse controls still apply; large-scale production delivery may require a transactional email provider.

1. Configure a PostgreSQL database you control. Authentication stores users, hashed codes, sessions and shared rate limits there. It does not upload your bank statements or transactions.
2. Set these server environment variables locally in ignored `.env.local`, and separately on the backend deployment:
   - `SMTP_HOST`, `SMTP_PORT` (465 implicit TLS or 587 mandatory STARTTLS)
   - `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (a verified sender, not the example address)
   - `DATABASE_URL` (use your provider's TLS-enabled PostgreSQL connection string)
   - `BETTER_AUTH_SECRET` (a securely generated random value of at least 32 characters)
   - `BETTER_AUTH_URL=https://hackmatrix-50.vercel.app` in production; `http://localhost:3000` locally
   - `FIN_ALLOWED_ORIGINS` for any browser frontend origins
3. After confirming the target database, run `npm run auth:migrate`. This creates Better Auth's authentication tables, including the database-backed rate-limit table. Back up an existing database before migration. Never run migrations against an unintended database.
4. Deploy the backend source and confirm `/api/v1/auth/status` reports `ready`. Configuration readiness does not prove that SMTP can deliver or that migrations are installed.
5. Send a code to your own mailbox, check inbox/spam, verify it, reload, sign out, and verify the old token no longer works. Check deployment logs without logging passwords, OTPs, tokens or personal financial data.

SMTP settings and passwords belong ONLY on the backend. Do not paste them in chat, commit them, put them in Android BuildConfig, or configure them through a public API. Gmail requires an app password where supported; regular account passwords are not a substitute. Other providers may require SMTP AUTH permissions. If delivery is restricted by your provider, resolve that policy instead of disabling TLS verification.

## Implemented behavior

- Styled, responsive FIN HTML email and equivalent plain-text email, without financial records.
- Six-digit codes expire after five minutes, are stored hashed by Better Auth, and are consumed on sign-in. Five wrong-code attempts and endpoint rate limits are enforced server-side.
- Sixty-second resend limit per caller; resend rotates the code. Framework database rate limits are shared across backend instances.
- Session tokens are kept in WebView/tab `sessionStorage`, not durable browser storage. Closing the session requires another sign-in. A legacy `finSession` profile cannot unlock the app.
- Seven-day server sessions, checked on startup, focus and periodically. Sign-out revokes the session when the server is reachable. If not reachable, local sign-out locks FIN; server expiry still applies.
- Authenticated email selects the existing local account vault. Local financial data is retained on sign-out. This is an application access gate, not database encryption or protection against a compromised/rooted device. Native encrypted token storage and encrypted database storage are separate hardening work.
- Managed cloud Copilot requires a verified session. Deploy frontend/APK and backend together: old unauthenticated clients will no longer be allowed into the updated cloud endpoint.
- No client-generated OTP, visible backup code, FormSubmit fallback, guest login or embedded SMTP credentials.

## Verification and outstanding external checks

Run `npm run auth:check` to verify SMTP TLS/authentication (without sending mail), database connectivity and authentication schema readiness. It does not print secret values and does not migrate the database. Missing settings produce a nonzero exit code. After completing private configuration, run `npm run auth:migrate`, then repeat the readiness check before a real OTP test.

`npm test` exercises the actual Better Auth handler with a test-only memory adapter: correct/wrong/expired/used codes, attempt limits, cooldown, invalid sessions, sign-out and delivery failure. SMTP tests assert the production TLS options and both mail formats using a mocked transport. `npm run check:browser` drives the actual FIN page and auth handler with a synthetic outbox, verifies Devanagari code entry and session reload, then exercises CSV import and planning.

These tests do not prove real provider delivery or PostgreSQL connectivity. Live SMTP delivery, migration against your database, deployed route rewrites, physical Android behavior and signed production APK remain to be verified after credentials and services are configured. Without backend configuration, sign-in deliberately fails closed; the app is not usable as an authenticated production release yet.

Latest local readiness check (2026-10-11): sender/secret/base URL are populated; `DATABASE_URL` remains empty. Gmail SMTP connection attempts and independent TCP checks to ports 465 and 587 timed out. No email was sent; this does not prove that the App Password is valid or invalid. The connected Vercel account's project inventory does not include `hackmatrix-50`, so deployment changes require access to its owning account/team. Rotate the App Password shared in chat before production use.

The deployed backend's `/api/health` responds 200, but `/api/v1/auth/status` and `/api/v1/auth/send-otp` respond 404. Build 23 shows this as a persistent missing-authentication-service error rather than a misleading email-delivery failure. Successful non-JSON responses also cannot be mistaken for a sent OTP. This client fix does not deploy the missing service or enable login.

## New dedicated backend — 2026-10-11

- Vercel project: `anant-hejibs-projects/fin-auth`, project ID `prj_5ZYTgZWx1ni1HpKctKjut5DfLlJ0`.
- Production authentication URL: `https://fin-auth-gilt.vercel.app`.
- Neon resource: `fin-auth-db` (`store_mRGQ7QeJbltZx0li`), installed on the verified `free_v3` plan in Singapore. No paid plan was selected.
- Authentication schema migration completed during the successful Vercel build. Active production deployment: `dpl_4H4eBKX1XHnz9QzrvP9VcQnf24SN`.
- Public `/api/v1/auth/status` returns HTTP 200 with all required configuration present. The sender credential supplied again by the user was stored only as a production Vercel Secret; it is not in source or the APK. Rotate that credential before a public release because it was disclosed in chat.
- A real `/api/v1/auth/send-otp` request with Android-style `Origin: null` succeeded with HTTP 200, `provider: smtp`, a 60-second cooldown and five-minute expiry. Gmail SMTP accepted the styled email. Inbox receipt and a valid-code login on a physical Android device still require user verification. Unauthenticated session requests are rejected.
- Android `FIN_AUTH_BASE_URL` selects this dedicated service independently of `FIN_API_BASE_URL`. Existing managed AI at `https://hackmatrix-50.vercel.app` remains unchanged. Its old deployed API has not been upgraded to enforce the new sessions; server-side protection of that legacy AI endpoint remains separate work requiring access to its owning project.
- `npm run auth:stage` produces a whitelist-only deployment artifact in `build/fin-auth-deploy`. Verify its project with `vercel project inspect --non-interactive --scope anant-hejibs-projects` before any deployment. Only auth source, dependencies, migration script and a service page are included—never `.env` files, bank data or the APK.
- Keep local SMTP settings in `.env.local`; provisioned database settings were pulled separately into ignored `.env.fin-auth-provisioned.local` and merged without replacing the Gmail configuration.

Build 25 makes the passwordless behavior explicit: **Create account** collects a name and creates the account only after email verification; **Sign in** restores access through the same verified-email flow. It does not reveal whether an email already has an account.

Remaining release verification: install build 25, request a fresh code from the app, verify actual inbox receipt, enter the latest code, then test session restoration and sign-out on the Android device. Automated handler/browser tests already cover these flows using fixtures; real Gmail submission has now passed, but a complete real-device login has not yet been observed. Replace the disclosed Gmail App Password locally and update the production Secret before a public release.

Libraries: [Better Auth email OTP](https://better-auth.com/docs/plugins/email-otp), [bearer sessions](https://better-auth.com/docs/plugins/bearer), [Nodemailer SMTP](https://nodemailer.com/smtp).
