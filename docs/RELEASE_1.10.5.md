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
- Android version code: `20`
- Analysis model: `2.4`

## Requirements audit and multilingual candidate

- Corrected remaining-principal overpayment, hidden savings-target misses, omitted zero-income months, invented statement-derived cash and missing-credit scoring.
- Added declared reserve confirmation and separate monthly income/expense ranges. Six-month simulated risk is explicitly separated from the historically evaluated 30-day model.
- Added persistent English/Hindi/Marathi selection, translated core labels, dashboard and planner summaries, local affordability/debt answers and backend response-language routing. Detailed English fallbacks remain; this is not complete localization certification.
- Added actual application-pipeline regression tests and reproducible synthetic scenario evidence. See `PLANNING_EVALUATION.md` for the full requirement matrix and release gates.
- Canonical APK remains `FIN-Financial-Copilot-v1.10.5.apk`, rebuilt as a debug/test candidate. No deployment, credentials or remote branches changed. Live assistant verification, complete localization/device QA, production authentication and release signing remain outstanding.
