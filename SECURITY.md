# Security policy

## Prototype scope

FIN is a hackathon prototype. Its OTP is intentionally fixed for demonstration and must not be treated as production authentication. Do not use the app to store information you are not comfortable keeping in local app storage.

## Data and API keys

- Transactions, financial profile/history, and analysis audit records are stored in an app-private SQLite database on the device.
- Android cloud backup is disabled for the application.
- No OpenRouter or other provider key is committed to this repository or embedded in the APK.
- A key entered in AI settings remains in app-local storage.
- Optional AI calls send a compact financial summary and the user's question, not raw transaction rows.
- Cleartext network traffic is disabled.

## Production hardening required

A production deployment should add server-verified identity, encrypted secrets, database encryption where required by the threat model, secure token storage, certificate and network controls, rate limiting, data deletion/export controls, formal threat modeling, dependency scanning, and independent security review.

## Reporting a vulnerability

Please do not publish sensitive vulnerability details in a public issue. Contact the repository owner through their GitHub profile with a concise description, affected version, reproduction steps, and impact. Allow time for validation and remediation before public disclosure.

