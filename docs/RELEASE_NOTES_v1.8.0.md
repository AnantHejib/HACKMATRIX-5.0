# FIN 1.8.0 — private adaptive intelligence and liquid UI

## Added

- Disjoint LinUCB ranking for precomputed safe recommendations
- Bounded six-percent exploration with logged selection propensity
- SQLite schema v2 with feedback events and versioned policy state
- Local reward updates for saved, accepted, completed, and dismissed actions
- Learning controls showing feedback volume and per-action policy statistics
- Liquid-morphism glass surfaces throughout the application
- Persistent light/dark theme switch
- Animated dollar-payment startup sequence with reduced-motion support

## Safety boundary

Learning can change recommendation order only. Financial calculations, forecasts, confidence, expected impact, action text, and permitted actions remain deterministic. Raw transactions, identity, merchant descriptions, and chat text are excluded from learning events.

## Android

- Version: `1.8.0` (`versionCode 9`)
- Database: schema v2 with additive migration from v1
- APK: `FIN-Financial-Copilot-v1.8.0.apk`
- SHA-256: `4BFEBC08D9ACB1C8A9D91724199615BDA61730956B27F10DA0985975DA6639CA`
- Signature: APK Signature Scheme v2 verified (debug evaluation certificate)

This build is ready for prototype distribution. Play Store publication still requires a private release-signing key and production release process.
