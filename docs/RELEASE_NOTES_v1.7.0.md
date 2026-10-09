# FIN 1.7.0 — managed explainable Copilot

## Added

- Versioned `POST /api/v1/copilot` and `GET /api/health` Vercel Functions
- Strict input/output schemas with a 32 KiB request cap
- Managed Vercel AI Gateway integration with OIDC support and environment-selected model
- Structured answers separating observed facts, predictions, recommendations, impact, confidence, uncertainty, and before/after changes
- Curated retrieval grounding from official RBI, MoSPI, and Open Government Data India sources
- Citation allowlisting and summary-only mobile requests
- Synthetic behavior-evaluation cases for changed expenses, income, and debt
- API and embedded-client validation in GitHub Actions

## Changed

- Removed the client-side OpenRouter credential flow and migrated away any legacy stored key
- Added a server health panel and automatic on-device fallback
- Added a compile-time public API-origin setting: `FIN_API_BASE_URL`
- Updated Android version to `1.7.0` (`versionCode 8`)

## Security boundary

No AI secret is stored in the APK. Raw transaction rows and merchant descriptions remain on device. The backend deliberately logs metadata rather than financial values or question content.

The OTP remains a local demonstration flow. Production use still requires server-verified identity, mobile attestation, firewall rate limits, abuse/spend controls, deletion/export workflows, and security/privacy review.
