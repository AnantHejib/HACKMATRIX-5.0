# FIN Financial Health Copilot

FIN is an Android prototype based on the supplied HackMatrix presentation. It turns consented transaction data into a financial health summary, recurring-payment detection, debt-pressure analysis, a 30-day cash forecast, explainable insights, and practical actions.

## Install

Install `FIN-Financial-Copilot-v1.4.0.apk` on Android 7.0 or newer. Android may ask you to allow installation from the file manager because this is a locally signed hackathon build.

## Prototype features

- Consent-first onboarding and an anonymous synthetic demo dataset
- Passwordless sign-in and account creation with a demo email/SMS OTP
- Persistent local user sessions, profile display, and sign-out
- Consolidated financial-health view combining transactions with user-entered financial history
- Net-worth tracking across liquid savings, investments, and debt balances
- Emergency-fund runway, credit utilization, savings rate, and five explainable health dimensions
- Editable financial-history profile with monthly net-worth snapshots and trend chart
- CSV import with validation and local-only storage
- Deterministic financial model for cash flow, recurring commitments, debt pressure, spending categories, safe-to-spend, and a 30-day forecast
- Seven-stage analysis workspace covering collection, normalization, pattern analysis, forecasting, explanation, actions, and correction learning
- Dataset quality scoring, history coverage, category coverage, duplicate checks, and high-value anomaly detection
- Spending-pattern detection using monthly linear regression, volatility, and exponentially weighted recent spending
- Recurring-obligation prediction using median cadence plus schedule and amount consistency confidence
- Debt-pressure analysis using debt service, total debt, income, and revolving-credit utilization
- A 30-day probabilistic cash-flow forecast using 500 reproducible Monte Carlo simulations
- Median, stress, and upside cash paths with a P10–P90 uncertainty range
- Conversational answers grounded in the current financial model
- User-defined financial goal, monthly target, time horizon, and recommendation style
- Personalized affordability checks, emergency-fund plans, debt-payoff estimates, and spending-reduction suggestions
- Local conversation memory with saved recommendations in the action center
- Optional OpenRouter free-model responses with recent conversation context and verified summaries
- Evidence records with source transaction IDs, method, assumptions, confidence, and limitations
- User-correctable categories with immediate recalculation
- Action center with accept, complete, and dismiss feedback
- Ask FIN offline evidence mode
- Optional OpenRouter `openrouter/free` assistant using a key supplied by the user at runtime
- Pilot admin summary and audit trail

## CSV format

Use this header:

```csv
date,description,amount,category,type
2026-09-01,Campus stipend,58000,Income,income
2026-09-02,Apartment rent,-16500,Housing,expense
```

Dates use `YYYY-MM-DD`. Expenses can use negative amounts or `type=expense`.

## Free AI connection

Open **More → AI settings** and paste an OpenRouter key. The app calls `https://openrouter.ai/api/v1/chat/completions` with model `openrouter/free`. The key stays in app-local storage and is not embedded in the APK. Raw transaction rows are not sent; the assistant receives the question and a short calculated summary.

Without a key, Ask FIN remains fully usable in offline evidence mode.

## Prototype login

Enter any valid email address or 10–15 digit mobile number. Use demo OTP `246810`. The prototype stores the resulting session only on the device and does not collect a password. Production authentication would replace this local demo flow with a managed identity provider and server-verified email/SMS OTP.

## Source layout

- `app/src/main/assets/index.html` contains the interface and financial model.
- `app/src/main/java/com/ctrlaltelite/fin/MainActivity.java` hosts the Android WebView and CSV file picker.
- The app uses only Android platform APIs, with no third-party runtime dependencies.

This prototype provides educational guidance and is not investment, lending, or credit advice.
