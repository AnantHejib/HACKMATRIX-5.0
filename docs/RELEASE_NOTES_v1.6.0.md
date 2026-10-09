# FIN 1.6.0 — durable financial data and analysis model 2.0

This release delivers the first publication-hardening slice for the consolidated financial-health output.

## Added

- Versioned app-private SQLite database with transactions, financial profile, monthly history, and analysis-audit tables.
- Automatic migration of earlier local prototype data and transactional demo/CSV seeding.
- Native validation, 10,000-row import cap, stable IDs, timestamps, indexes, WAL, and a 100-run analysis retention limit.
- Financial data-vault status and schema details inside the Data view.
- Editable current cash balance and year-safe monthly history keys.

## Analysis model 2.0

- Normalizes recent totals over the actual 30-90 day observed window.
- Calculates emergency runway from essential costs instead of all spending.
- Combines debt service, leverage, and credit utilization into an explainable composite debt-pressure signal.
- Persists distinct model outputs with an SHA-256 input fingerprint and confidence metadata.
- Uses measured data quality to qualify observed facts, predictions, and recommendation confidence.

## Correctness and security

- Fixed an operator-precedence issue in synthetic transaction typing and made signed expense amounts safe during legacy migration.
- Restricted in-app navigation to bundled assets and removed unused WebView JavaScript bridges.
- Disabled Android backup and cleartext traffic.

The included APK is a debug-signed evaluation build. Store publication still requires a private release signing key, production identity, and the remaining controls listed in `SECURITY.md`.

## APK verification

- File: `FIN-Financial-Copilot-v1.6.0.apk`
- Package: `com.ctrlaltelite.fin`
- Version: `1.6.0` (`versionCode 7`)
- Minimum Android: 7.0 (`API 24`)
- SHA-256: `0E51B8EEB4A7491CFEA04608FB9573569E70D98F93A6DF2F6F11052E43B50B93`
- Signature: APK Signature Scheme v2 verified (debug evaluation certificate)
