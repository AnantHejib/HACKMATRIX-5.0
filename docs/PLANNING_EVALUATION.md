# Constrained planning and probabilistic forecast evaluation

## Product scope

FIN analysis model 2.4 combines an autonomous six-month constrained action planner with the existing 30-day probabilistic cash-flow engine. It proposes three strategies from the user's transaction history:

1. **Balanced momentum:** dynamically balances discretionary spending, saving, and extra debt repayment.
2. **Stability shield:** increases reserve priority when income variability or the reserve gap is high.
3. **Debt release:** increases optional principal reduction when observed debt pressure is high.

Every sequence includes opening cash, forecast income, essential expenses, required debt payment, discretionary allowance, saving contribution, optional debt payment, closing cash, and a P10-P90 closing-balance range for every month. By default, FIN derives income, essential spending, debt minimums, flexible spending, variability, reserve, and a feasible saving target from six calendar-month buckets. Median monthly values and robust variability reduce sensitivity to one-off transactions. Imported peer transfers are not assumed to be earned income.

The autonomous view is the default. A separate **Custom assumptions** mode allows the user to supply verified income, opening cash, reserve, or saving targets when a payment statement is incomplete. Income and spending overrides remain separate from the autonomous history profile. An explicitly confirmed minimum reserve applies to all three strategies in either mode.

## Constraints and replanning

Required constraints are applied in this order:

- essential expenses;
- contractual minimum debt payment;
- declared minimum cash reserve; and
- the selected sequence's discretionary, saving, and optional-debt priorities.

When all requests cannot fit above the reserve, FIN reduces lower-priority actions and reports each conflict. It proposes an explicit relaxation, such as deferring part of the savings target, adding income equal to the reserve gap, temporarily lowering the reserve by a stated maximum, or renegotiating optional debt overpayments. It never proposes reducing essential expenses or required debt payments as the first relaxation.

The planner recalculates all six periods and all three strategies after a transaction import, category correction, custom constraint, or scenario change.

## Uncertainty method

Each action sequence is evaluated with 500 reproducible Monte Carlo paths. Monthly income and essential expenses use independent normal draws clipped at zero, scaled by history-derived variability. Planned discretionary and debt payments stay fixed. Savings transfers reduce available cash but are excluded from expense ranges. Interest, fees, cross-month correlations and changing behavior are not modeled. The current scenario can also apply a declared structural income reduction or a one-time essential-expense shock. FIN reports:

- probability that cash falls below the declared reserve in any period;
- separate income and expense P10, P50 and P90 forecasts for each month;
- P10, P50, and P90 closing cash by period;
- P10-P90 interval width; and
- the change in preferred sequence caused by shortfall risk.

The risk-neutral comparison maximizes planned saving plus optional debt reduction. If another sequence lowers reserve-shortfall probability by at least two percentage points, uncertainty changes the preferred plan and FIN names both plans and both risks.

## Required demonstration cases

| Case | Synthetic assumption | Expected evidence |
| --- | --- | --- |
| Stable income | Declared income and observed variability continue for six months | Three period-level plans and their reserve-shortfall risks |
| Income reduction | Declared income falls 30% from month 2 | All periods are replanned; optional actions contract before protected obligations |
| Unexpected essential expense | A one-time essential expense is added in month 2 | Wider/downward balance range and changed shortfall risk |
| Infeasible target | Income falls 40% from month 2 and the essential shock occurs | Explicit conflicts and quantified relaxation proposals |
| Uncertainty changes preference | Risk-neutral progress is compared with simulated reserve risk | Aggressive plan is replaced when another plan reduces risk by at least two percentage points |

These scenario changes are synthetic perturbations used for demonstration. They are not inferred claims about an imported user's future.

## Sample statement study

The supplied Google Pay activity statement covers 4 April through 30 September 2026. The importer recovered 541 unique UPI entries and reconciled to the statement totals of INR 110,163.34 sent and INR 96,063 received. Incoming entries are peer transfers or rewards in this source, not verified salary records. FIN therefore imports them as `Transfers`, excludes them from earned-income forecasts, and asks the user to declare or recategorize verified income before action planning.

The statement is useful for observed payment frequency, variable expense amounts, merchant/category patterns, and recurring obligations. It is not a complete account ledger because Google Pay explicitly excludes some activity and does not provide a running bank balance. The user-entered current balance remains authoritative.

No personal identifiers or raw statement rows are copied into the repository or sent to the Copilot API.

## Train-validation-test timeline

FIN uses chronological splits only:

```text
Expanding training history -> earlier held-out 30-day validation windows -> latest untouched 30-day test window
```

- **Training:** only records posted on or before each cutoff are used for recurring detection, trends, distributions, and model inputs.
- **Validation:** completed middle rolling windows measure P50 MAE, interval coverage and width, Brier score, and gap-day error.
- **Test:** the latest complete held-out 30-day window is reported separately in the product timeline.
- **Baseline:** each held-out window also receives a historical-average daily net-cash-flow forecast.

Future records never enter the training calculation for their cutoff. Synthetic scenario generation is separate from these real/synthetic history periods and is used only to stress the six-month plans.

## Evidence delivered

- period-level expected cash plans for three sequences;
- per-period P10-P90 simulated outcomes;
- declared constraints and any violated goal;
- explicit relaxations for infeasible plans;
- replanning controls for all required cases;
- held-out forecast errors, coverage, interval width, Brier score, and baseline comparison; and
- an explicit train-validation-test timeline.

## 2026-10-10 verification and remaining release gates

This is a tested hackathon candidate, not a certified production financial system.

| Requested outcome | Verified evidence | Remaining limitation |
| --- | --- | --- |
| Consolidated health | Actual app calculation tests combine transactions and declared assets/debt; missing credit is excluded | Payment-only PDFs do not establish account balances, salary or complete liabilities |
| Patterns, recurring obligations, debt and gaps | Parser checks, recurring detection, debt-pressure update test and rolling forecast tests | Categories and inferred recurrence need user correction; undeclared cash withholds probability |
| Conversational personalized guidance | Local answers use calculated state; backend structured-contract tests pass | Live model-provider round trip is unverified; local server reports missing configuration |
| Action impact | Three six-month sequences expose period balances, savings, debt and simulated reserve risk | Heuristic proposals, not a globally optimal solver; no interest/fees |
| Facts versus predictions versus recommendations | Layered response contracts, evidence views and withheld-risk tests | Recommendation confidence scores are evidence heuristics, not calibrated probabilities |
| Adaptation to new information | Actual pipeline tests update spending and debt; scenario tests reduce income and add shocks | Physical-device input/import-to-screen testing remains outstanding |
| Six monthly periods and declared constraints | Three strategies, reserve confirmation, debt-principal cap and unmet savings-target conflicts tested | Automatically proposed reserve must be confirmed; savings goals may require explicit relaxation |
| Probabilistic forecasting and baselines | Separate monthly income/expense ranges; rolling later-held-out 30-day cash forecasts compare MAE, coverage and width with average baseline | Six-month scenario probabilities are not historically calibrated; 30-day metrics must not be presented as six-month accuracy |
| English, Hindi, Marathi | Persistent selector, navigation labels, localized dashboard/planner summaries and local answers; provider language routing tested | Some detailed dynamic explanations retain English fallback; native-speaker and device-layout review still required |

### Bugs corrected

- Optional debt repayments could exceed remaining principal.
- Derived savings contributions hid missed user-declared savings targets.
- Zero-income months were omitted from autonomous income estimates.
- Statement net flow was used as if it established available bank cash.
- Withheld probabilities leaked into change snapshots; missing cash now suppresses risk reporting.
- Credit limits without a credit score incorrectly activated the credit-score dimension.
- Goal changes did not immediately refresh calculations; confirmed zero balances were rejected.
- Shared reserve confirmation, separate income/expense ranges and explicit scenario-method disclosures were missing.

### Reproduce the evidence

Run `npm test` and `npm run check`. In PowerShell, run `$env:FIN_EXPORT_EVIDENCE='1'` followed by `node --test test/app-flow.test.js` to regenerate `build/reports/requirements-evidence.json`.

The export contains synthetic April–September 2026 transactions, declared profile inputs, chronological cutoff dates and held-out actual outcomes, baseline/forecast metrics, stable/reduced-income/shock/infeasible plans and an uncertainty-driven preference change. Future stress periods are separate from historical training/backtesting. Aggregate metrics include rolling evaluation windows; the latest window is visible individually in `validation.backtests`, not an independently audited untouched benchmark.

Before a production release: replace demo authentication, complete security/privacy review, verify the configured live assistant, calibrate six-month forecasts on longer diverse histories, finish full translation coverage and native-language review, test all screens/import flows on Android, and sign a release APK. Do not present a successful debug build as completing these gates.
