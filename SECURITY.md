# Security policy

## Prototype scope

FIN is a hackathon prototype. Its OTP is intentionally fixed for demonstration and must not be treated as production authentication. Do not use the app to store information you are not comfortable keeping in local app storage.

## Data and AI credentials

- Transactions, financial profile/history, and analysis audit records are stored in an app-private SQLite database on the device.
- Android cloud backup is disabled for the application.
- No provider key is committed to this repository, embedded in the APK, or entered in the mobile interface.
- Vercel deployments authenticate to AI Gateway with platform OIDC. Local development may use `AI_GATEWAY_API_KEY` in an ignored `.env.local` file.
- Copilot calls send a bounded calculated summary, preferences, recent conversation, and the user's question—not raw transaction rows or merchant descriptions.
- API request bodies are capped at 32 KiB and validated with strict input and output schemas.
- Adaptive-ranking feedback stays on-device and excludes identity, raw transactions, merchant descriptions, and chat text. The learned policy cannot create or numerically alter financial recommendations.
- Cleartext network traffic is disabled.

## Production hardening required

A production deployment should add server-verified identity, app attestation, encrypted secrets, database encryption where required by the threat model, secure token storage, certificate and network controls, Vercel Firewall rate limiting, abuse monitoring, data deletion/export controls, formal threat modeling, dependency scanning, and independent security review. `X-FIN-Client-ID` is a pseudonymous abuse signal, not authentication.

## Reporting a vulnerability

Please do not publish sensitive vulnerability details in a public issue. Contact the repository owner through their GitHub profile with a concise description, affected version, reproduction steps, and impact. Allow time for validation and remediation before public disclosure.

