# FIN 1.10.5

FIN 1.10.5 is the canonical product release. New work updates this release in place instead of creating another version-named product file.

## Autonomous six-month planning

- FIN proposes exactly three transaction-history strategies: Balanced momentum, Stability shield, and Debt release.
- Proposal parameters adapt to observed surplus, income variability, reserve position, discretionary load, and debt pressure.
- Each proposal explains the signal behind it and shows six period-level cash balances and trade-offs.
- Monte Carlo reserve-shortfall risk can change the recommended strategy when the highest-progress option is unsafe.
- A separate Custom assumptions mode supports verified income, opening cash, reserve, and savings targets without changing the autonomous history profile.

## History-derived planning and accuracy

- Six calendar-month buckets estimate earned income, essentials, contractual debt payments, and flexible spending.
- Median monthly values and robust variability reduce sensitivity to one-off transactions.
- Debt payments are separated from essential expenses to prevent double counting.
- Google Pay peer transfers remain excluded from earned income.
- A visible history-basis score describes input sufficiency without claiming unsupported forecast accuracy.
- Held-out day-30 error, naive-baseline error, P10-P90 coverage and width, and Brier score remain visible when validation data is sufficient.

## Loader, UI, and performance

- The loader carries a shaded gold coin along a rising graph and morphs it into a glowing paper plane with subtle sparkles. Bills, savings, and a protected buffer introduce the financial-management story. The shortened roughly 4.5-second sequence remains skippable.
- Motion uses compositor-friendly transforms and opacity, with a short static transition for reduced-motion devices.
- The loader remains tappable so users can enter immediately.
- Stable button hit areas, scrolling, popup interaction, lightweight glass styling, and Android hardware acceleration are retained.
- Web checks reject the unstable WebView patterns that caused the earlier UI regression.

## Explainable financial health

- Every health dimension now explains its observed evidence, meaning, calculation, score weight, recommended response, evidence confidence, and limitations.
- The dashboard identifies the strongest support and first financial priority instead of showing only an unexplained score.
- Money in, money out, and safe-to-spend values have plain-language calculation breakdowns.
- Demo data, statement-only data, and verified user history are labeled distinctly throughout the health view.
- Missing optional credit information is excluded and available score weights are normalized instead of penalizing the user with a zero.
- Cash-gap probability affects the cash-flow score only when the minimum-data policy permits reporting it.

## Release identity

- Product version: `1.10.5`
- Android version code: `21`
- Analysis model: `2.4`

## Requirements audit and multilingual candidate

- Corrected remaining-principal overpayment, hidden savings-target misses, omitted zero-income months, invented statement-derived cash and missing-credit scoring.
- Added declared reserve confirmation and separate monthly income/expense ranges. Six-month simulated risk is explicitly separated from the historically evaluated 30-day model.
- Added persistent English/Hindi/Marathi selection, translated core labels, dashboard and planner summaries, local affordability/debt answers and backend response-language routing. Detailed English fallbacks remain; this is not complete localization certification.
- Added actual application-pipeline regression tests and reproducible synthetic scenario evidence. See `PLANNING_EVALUATION.md` for the full requirement matrix and release gates.
- Canonical APK remains `FIN-Financial-Copilot-v1.10.5.apk`, rebuilt as a debug/test candidate. No deployment, credentials or remote branches changed. Live assistant verification, complete localization/device QA, production authentication and release signing remain outstanding.

## P1/P2 integration — 11 October 2026, build 21

P1 is the base. P2 source inspected: `gaurideshpande885/HACKMATRIX-5.0`, commit `5d3ef5b`. The existing local work was saved on `backup/fin-before-p1-p2-integration-20261011`; integration uses `integrate/fin-p1-p2-20261011`. No fork push or force push is required.

### Feature map and implementation

| Feature | Source retained/integrated | Files |
| --- | --- | --- |
| Splash, navigation, home shell | P1 current implementation | `app/src/main/assets/index.html` |
| Six-month constrained planner | P1 engine, constraints, three plans and stress scenarios preserved | `financial-action-planner.js`, planner functions in `index.html` |
| Data and PDF import | P1 native extraction, SQLite and parsing preserved; browser CSV validation strengthened | `MainActivity.java`, existing PDF/database classes, import functions in `index.html` |
| Insights and Action Centre | P1 calculations, evidence, ranking and feedback retained | `index.html`, `forecast-reliability.js` |
| Spending Snapshot | P2 payee grouping, repeat-visit detection, one-time payments and chart | `payeeStats`, `payeeChartRows`, `payeeBreakdown`, `drawMonthly` in `index.html` |
| Ask FIN | P2 real native MediaPipe engine, model picker/status/callbacks, prompts, verified-number checks and bank-query functions | `LocalLlm.java`, `MainActivity.java`, chat functions in `index.html` |
| Optional cloud Ask FIN | P1 configured API plus P2 transaction context and query instructions | `lib/contracts.js`, `lib/copilot-service.js`, `lib/http.js` |
| Languages | Existing English/Hindi/Marathi work preserved; numbers, numeric input, chart labels and health reasoning improved | `fin-locale.js`, `index.html` |

Both projects use a plain JavaScript WebView, app-private SQLite, Gradle Android build and Node/Vercel API. This allowed feature-level integration without replacing P1's loader, planner or entire app. MediaPipe `tasks-genai:0.10.27` and AndroidX are the required native additions; Playwright is a development-only browser-test dependency. P2's public debug keystore, API-disable build setting and whole-page replacements were not adopted.

### Actual-data behavior

- First launch starts with zero transactions and no invented balances, assets, debt or credit history. Empty views explain how to import a statement; financial scores/risk conclusions are withheld.
- Production transaction generation (`sampleData`) is removed. Recognized persisted legacy demo rows and the old demo financial profile are cleaned during migration; imported/user records remain.
- CSV requires date, description/merchant and amount columns. Empty input, unsupported file extensions, oversized files, impossible dates, malformed amounts, unclosed quotes and conflicting duplicate IDs are rejected. Failed imports retain existing history. Identical genuine payments without external IDs are retained.
- Supported PDF extraction/parser paths remain in P1, including Google Pay peer-transfer handling, password flow and extraction alternatives. Browser preview clearly directs PDF users to Android.
- Deleting data returns to an empty account after confirmation. Account switching does not seed transactions or restore the demo profile.
- Cash balances must be declared. Incoming transfers do not silently become verified earned income; incomplete data remains labeled.

### Verification

- 65 Node tests pass, including P1 planning/forecast tests, P2's 19 payee/payload tests, new-user/demo migration, invalid CSV, native inference callback contracts and production OTP guards.
- `npm run check` passes API, embedded web, statement parsing, adaptive learning and release checks.
- `npm run check:browser` runs actual headless Edge flow: startup, fresh empty account, rejected CSV, valid CSV upload, retained records, P2 snapshot, Insights, Action Centre, six-month table, chat facts, Marathi display/input and reload. Evidence images are generated under ignored `build/reports/`.
- Android debug build includes the real MediaPipe native engine; canonical filename remains `FIN-Financial-Copilot-v1.10.5.apk`.
- Existing deployed API health returned 200 and an English synthetic request returned a structured model answer. The pre-integration deployment returned English for a Hindi request. `scripts/check-live-api.mjs` records this failure until a deployment containing locale routing is available.

### Setup and remaining verification

For native AI, open Settings → Choose model file and install the compatible Qwen2.5-0.5B-Instruct `.task` file referenced in the app (approximately 550 MB). It is absent from the supplied repository and the default APK. Model import/inference on a physical compatible Android device cannot be certified here because no Android device/model file is connected. Native PDF/SQLite interaction also needs device verification; parser and browser flows are tested.

For cloud AI, retain server `AI_GATEWAY_MODEL` and gateway credentials/OIDC, configure allowed browser origins, and build with `-PFIN_API_BASE_URL=https://hackmatrix-50.vercel.app`. Users explicitly choose cloud sharing. Keys stay server-side. No credentials or environment values were changed for integration.

Authentication remains the existing local-profile preview. Public credential mutation is blocked, SMTP certificate verification is enabled, and development OTPs require explicit local opt-in and are blocked in production. A configured persistent identity provider is still needed for production account authentication. Release tasks now reject absent signing configuration; supply the four `FIN_RELEASE_*` signing variables privately to make a signed release. The current APK is debug-signed.

Six-month scenario probabilities still lack personalized historical calibration. Some dynamic paragraphs retain English fallback; translated health explanations and numeral conversion do not certify full native-language coverage. These remaining items are not represented as completed production gates.

### File changes

Added: `LocalLlm.java`, `assets/MODEL-LICENSE.txt`, `scripts/check-browser.mjs`, `scripts/check-live-api.mjs`, `test/transactions-payload.test.js`. Existing local auth modules/tests are preserved from the backup commit, with production guards applied.

Modified: `.env.example`, `.gitignore`, `app/build.gradle`, `gradle.properties`, `AndroidManifest.xml`, `MainActivity.java`, `assets/index.html`, `assets/fin-locale.js`, `lib/contracts.js`, `lib/copilot-service.js`, `lib/http.js`, `lib/auth-service.js`, `lib/smtp-client.js`, `api/v1/auth.js`, `package.json`, `package-lock.json`, `release.json`, API/app/auth tests, `scripts/check-learning.mjs`, README and API/dataset/release documentation. The canonical APK is replaced after the final build.

Removed production behavior: sample transaction generation, demo balance defaults and reset-to-demo fallback. No P1 feature module or colleague repository is deleted. `.vscode`, secrets, keystores, model weights, build folders and personal statements are excluded from the integration commit.
