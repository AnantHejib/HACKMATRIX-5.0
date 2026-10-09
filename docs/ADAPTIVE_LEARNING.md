# Private adaptive recommendation ranking

FIN 1.8 adds a local disjoint LinUCB contextual-bandit policy. The policy can reorder only the four recommendation candidates already produced by the deterministic financial model. It cannot create actions, change amounts, edit expected impact, or modify forecasts.

## Context and actions

Each candidate is scored from eight bounded features: bias, cash-gap risk, debt pressure, runway gap, surplus ratio, data quality, goal match, and an action-specific relevance signal. The action set is fixed to emergency buffer, flexible spending, debt overpayment, and bill-cycle reserve.

The existing rule-based priority is retained as a baseline. LinUCB adds a learned reward estimate and uncertainty bonus. Six-percent bounded exploration gives each safe candidate a non-zero display probability; the selected propensity is stored for future offline policy evaluation.

## Feedback and reward

| Event | Reward |
| --- | ---: |
| Saved from Ask FIN | +0.2 |
| Accepted | +0.4 |
| Completed | +1.4 |
| Dismissed | -0.4 |
| Displayed | 0.0 |

Feedback updates only the selected arm's covariance matrix and reward vector. Every event records the policy version, decision ID, action ID, propensity, bounded model context, and outcome snapshot. Raw transactions, merchant descriptions, identity, and chat text are excluded.

## SQLite schema v2

- `feedback_events` retains the newest 2,000 display and reward events.
- `policy_state` stores the current versioned matrices and interaction count.
- Migration from schema v1 is additive; financial tables are not rebuilt or cleared.

Browser preview uses an equivalent local-storage fallback capped at 500 events. The installed Android app uses transactional SQLite writes.

## Production path

The device policy is intentionally personal and private. Cross-user training requires explicit consent, de-identification, server-side retention/deletion controls, offline propensity-aware evaluation, expert safety review, and a reversible canary deployment. Click engagement alone must never become the financial objective.
