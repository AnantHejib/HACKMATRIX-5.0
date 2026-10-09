# Data model and analytics

This document describes the prototype's inputs, calculated signals, and forecasting approach. The goal is explainability: every important output can be traced to data and a named method.

## Transaction record

| Field | Meaning |
| --- | --- |
| `date` | Posting date in `YYYY-MM-DD` format |
| `description` | Merchant or transaction description |
| `amount` | Signed value; expenses may be negative |
| `category` | Income, Housing, Debt, Utilities, Subscriptions, Education, Health, or another user category |
| `type` | `income` or `expense` |

The normalization stage standardizes dates, signs, categories, and merchant names. Validation reports missing fields, duplicates, coverage, and high-value anomalies before results are calculated.

## Financial history

The profile supplements transactions with current cash balance, savings, investments, debt balances, emergency fund, credit limit and usage, and monthly net-worth snapshots. Each history point uses a `YYYY-MM` period key plus a display label so different years cannot collide.

## Health metrics

| Metric | Calculation |
| --- | --- |
| Net worth | Current cash + liquid savings + investments - total debt |
| Monthly cash flow | Monthly income - monthly spending |
| Savings rate | Positive monthly cash flow / monthly income |
| Emergency runway | Emergency fund / essential monthly spending |
| Credit utilization | Revolving credit used / revolving credit limit |
| Debt-service pressure | Required monthly debt payments / monthly income |
| Safe to spend | Available balance less near-term obligations and a safety buffer |

The dashboard groups metrics into cash flow, liquidity, debt, credit, and stability dimensions. Scores are directional educational indicators, not lending or credit decisions.

## Spending trend

Monthly spending totals are fitted with ordinary least squares:

```text
slope = sum((month - meanMonth) * (spend - meanSpend))
        / sum((month - meanMonth)^2)
```

A positive slope indicates spending is rising. An exponentially weighted moving average (`alpha = 0.35`) gives recent months more influence while retaining older evidence. Volatility is calculated from variation in observed monthly totals.

## Recurring obligations

Transactions are grouped by normalized merchant and category. A candidate needs at least three observations. FIN calculates:

- median interval between payments;
- interval coefficient of variation;
- amount coefficient of variation;
- next expected date from the most recent event and median cadence; and
- confidence from cadence and amount consistency.

Forecasted fixed commitments are restricted to categories such as Housing, Debt, Utilities, Subscriptions, Education, and Health so irregular discretionary purchases are not treated as bills.

## Debt pressure

Debt pressure is a bounded composite:

```text
pressure = 60% × debt-service-to-income
         + 25% × (total debt / annualized income)
         + 15% × revolving-credit utilization
```

The 0-100 result is an educational stress signal. Its contributing factors stay visible instead of being presented as an unexplained score.

## Cash-flow forecast

FIN runs 500 seeded Monte Carlo simulations over 30 days. Each path starts at the current balance, schedules detected obligations and expected income, then samples variable daily spending from recent behavior. Results are summarized as:

- P10: stress-case balance path;
- P50: median expected balance path;
- P90: upside balance path; and
- gap probability: share of simulations that fall below zero.

Using a deterministic seed makes the same input reproducible during a demo. The forecast is not a guarantee: missing transactions, changing income, unusual expenses, and short history can materially change the outcome.

## Data quality and persistence

Analysis model 2.0 normalizes income, spending, debt service, and category totals over the actual observed window, bounded to 30-90 days. Its quality score considers record volume, history span, category coverage, recency, duplicates, and uncategorized share. Forecast confidence combines model stability with this measured data quality.

On Android, normalized transactions and user-entered history are authoritative in SQLite. Every distinct recalculation input also creates a capped analysis record containing the model version, SHA-256 input fingerprint, record count, health score, net worth, debt pressure, cash-gap probability, confidence, and a JSON result summary. See [Database design](DATABASE.md).

## Recommendation context

Ask FIN uses calculated metrics together with the user's goal, monthly target, desired emergency-fund months, recommendation style, and time horizon. The local engine supports affordability checks, emergency-fund plans, debt-payoff estimates, and category-specific spending reductions. Optional AI receives only a summarized context.

## Recommendation impact and change tracking

Every generated action includes a quantified outcome, a timeframe, a confidence score, and an uncertainty statement. Depending on the action, FIN reports projected monthly cash released, six-month buffer growth, emergency-runway change, simple debt reduction, bill coverage, or estimated cash-gap risk change.

FIN keeps three claim types separate:

- **Observed fact:** direct arithmetic from imported transactions or clearly labeled user-entered balances. A coverage score warns when the dataset may be incomplete.
- **Model prediction:** a probabilistic estimate with method, horizon, assumptions, and confidence.
- **Recommendation:** a suggested response to the facts and predictions, with expected impact and limitations.

Before any transaction, income, expense, debt, savings, category, or CSV update is applied, FIN stores the current model snapshot. After recalculation it compares health score, safe-to-spend, cash-gap probability, total debt, and the leading recommendation. This makes model sensitivity visible instead of silently replacing the previous answer.

