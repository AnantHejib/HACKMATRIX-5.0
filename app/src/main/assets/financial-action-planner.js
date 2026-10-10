(function (root) {
  'use strict';

  const PERIODS = 6;
  const PATHS = 500;

  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  function rng(seed) {
    return () => {
      let value = seed += 0x6D2B79F5;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function normal(random) {
    let first = 0;
    let second = 0;
    while (!first) first = random();
    while (!second) second = random();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  }

  function percentile(values, probability) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) * probability)];
  }

  const SEQUENCES = [
    { id: 'balanced', name: 'Balanced momentum', order: ['discretionary', 'savings', 'extraDebt'] },
    { id: 'reserve', name: 'Stability shield', order: ['savings', 'discretionary', 'extraDebt'] },
    { id: 'debt', name: 'Debt release', order: ['extraDebt', 'discretionary', 'savings'] },
  ];

  function normalizeInput(input = {}) {
    return {
      periods: Math.max(6, Math.floor(finite(input.periods, PERIODS))),
      startingCash: Math.max(0, finite(input.startingCash)),
      monthlyIncome: Math.max(0, finite(input.monthlyIncome)),
      incomeSd: Math.max(0, finite(input.incomeSd)),
      essentialExpenses: Math.max(0, finite(input.essentialExpenses)),
      essentialSd: Math.max(0, finite(input.essentialSd)),
      debtMinimum: Math.max(0, finite(input.debtMinimum)),
      discretionaryBaseline: Math.max(0, finite(input.discretionaryBaseline)),
      monthlySavingsGoal: Math.max(0, finite(input.monthlySavingsGoal)),
      totalDebt: Math.max(0, finite(input.totalDebt)),
      minimumReserve: Math.max(0, finite(input.minimumReserve)),
      scenario: input.scenario || 'stable',
      shockAmount: Math.max(0, finite(input.shockAmount, 25000)),
      paths: Math.max(100, Math.floor(finite(input.paths, PATHS))),
      historyProfile: input.historyProfile && typeof input.historyProfile === 'object' ? input.historyProfile : {},
    };
  }

  function deriveAutonomousSequences(input) {
    const income = Math.max(1, input.monthlyIncome);
    const surplus = Math.max(0, input.monthlyIncome - input.essentialExpenses - input.debtMinimum - input.discretionaryBaseline);
    const volatility = clamp(input.incomeSd / income, 0, 1);
    const reserveNeed = input.minimumReserve ? clamp((input.minimumReserve - input.startingCash) / input.minimumReserve, 0, 1) : 0;
    const debtLoad = clamp((input.debtMinimum / income) * 2 + (input.totalDebt / Math.max(income * 12, 1)) * 0.35, 0, 1);
    const discretionaryLoad = clamp(input.discretionaryBaseline / income, 0, 1);
    const history = input.historyProfile;
    const commonEvidence = `${Math.max(0, Math.round(finite(history.months)))} observed month${Math.round(finite(history.months)) === 1 ? '' : 's'}, ${Math.max(0, Math.round(finite(history.transactionCount)))} transactions, ${history.reliabilityLabel || 'limited input reliability'}`;

    const balanced = {
      ...SEQUENCES[0],
      discretionaryRate: clamp(0.84 - volatility * 0.18 - discretionaryLoad * 0.08, 0.58, 0.86),
      savingsRate: clamp(0.42 + reserveNeed * 0.16 + volatility * 0.08, 0.38, 0.64),
      debtRate: clamp(0.32 + debtLoad * 0.18, 0.28, 0.56),
      rationale: `Balances liquidity and debt progress because observed monthly surplus is ${Math.round(surplus)} and income variability is ${Math.round(volatility * 100)}%.`,
      evidence: commonEvidence,
      autonomous: true,
    };
    const reserve = {
      ...SEQUENCES[1],
      discretionaryRate: clamp(0.68 - volatility * 0.22 - reserveNeed * 0.12, 0.38, 0.7),
      savingsRate: clamp(0.64 + volatility * 0.18 + reserveNeed * 0.12, 0.62, 0.9),
      debtRate: clamp(0.14 - reserveNeed * 0.05, 0.08, 0.18),
      rationale: `Protects the declared reserve first because the reserve gap is ${Math.round(reserveNeed * 100)}% and observed income variability is ${Math.round(volatility * 100)}%.`,
      evidence: commonEvidence,
      autonomous: true,
    };
    const debt = {
      ...SEQUENCES[2],
      discretionaryRate: clamp(0.76 - debtLoad * 0.2 - volatility * 0.08, 0.48, 0.76),
      savingsRate: clamp(0.2 + reserveNeed * 0.12 + volatility * 0.08, 0.18, 0.42),
      debtRate: clamp(0.58 + debtLoad * 0.22 - reserveNeed * 0.12, 0.48, 0.82),
      rationale: `Accelerates optional debt repayment because observed debt pressure is ${Math.round(debtLoad * 100)}%, while still protecting the minimum reserve.`,
      evidence: commonEvidence,
      autonomous: true,
    };
    return [balanced, reserve, debt];
  }

  function scenarioValues(input, period) {
    let income = input.monthlyIncome;
    let essential = input.essentialExpenses;
    if (input.scenario === 'income-reduction' && period >= 2) income *= 0.7;
    if (input.scenario === 'essential-shock' && period === 2) essential += input.shockAmount;
    if (input.scenario === 'infeasible') {
      if (period >= 2) income *= 0.6;
      if (period === 2) essential += input.shockAmount;
    }
    return { income, essential };
  }

  function requestedActions(input, sequence, opening, income, essential) {
    const structuralSurplus = Math.max(0, income - essential - input.debtMinimum - input.discretionaryBaseline * sequence.discretionaryRate);
    return {
      discretionary: input.discretionaryBaseline * sequence.discretionaryRate,
      savings: Math.min(input.monthlySavingsGoal, structuralSurplus * sequence.savingsRate),
      extraDebt: Math.min(input.totalDebt, structuralSurplus * sequence.debtRate),
    };
  }

  function allocatePeriod(input, sequence, period, opening, overrides = {}) {
    const scenario = scenarioValues(input, period);
    const income = Math.max(0, finite(overrides.income, scenario.income));
    const essential = Math.max(0, finite(overrides.essential, scenario.essential));
    const debtMinimum = Math.min(input.totalDebt, input.debtMinimum);
    const requests = overrides.requests || requestedActions(input, sequence, opening, income, essential);
    const allocations = { discretionary: 0, savings: 0, extraDebt: 0 };
    let allocatable = Math.max(0, opening + income - essential - debtMinimum - input.minimumReserve);
    for (const action of sequence.order) {
      allocations[action] = Math.min(Math.max(0, finite(requests[action])), allocatable);
      if (action === 'extraDebt') allocations[action] = Math.min(allocations[action], Math.max(0, input.totalDebt - debtMinimum));
      allocatable -= allocations[action];
    }
    const closing = opening + income - essential - debtMinimum - allocations.discretionary - allocations.savings - allocations.extraDebt;
    const conflicts = [];
    if (allocations.savings + 0.01 < input.monthlySavingsGoal) conflicts.push(`Declared savings target misses by ${Math.round(input.monthlySavingsGoal - allocations.savings)}`);
    if (closing < input.minimumReserve) conflicts.push(`Minimum cash reserve misses by ${Math.round(input.minimumReserve - closing)}`);
    if (allocations.savings + 0.01 < requests.savings) conflicts.push(`Savings contribution reduced by ${Math.round(requests.savings - allocations.savings)}`);
    if (allocations.extraDebt + 0.01 < requests.extraDebt) conflicts.push(`Extra debt payment reduced by ${Math.round(requests.extraDebt - allocations.extraDebt)}`);
    if (allocations.discretionary + 0.01 < requests.discretionary) conflicts.push(`Discretionary allowance reduced by ${Math.round(requests.discretionary - allocations.discretionary)}`);
    return { period, opening, income, essential, debtMinimum, ...allocations, closing, conflicts, requests };
  }

  function deterministicPlan(input, sequence) {
    const periods = [];
    let cash = input.startingCash;
    let debtRemaining = input.totalDebt;
    for (let period = 1; period <= input.periods; period++) {
      const row = allocatePeriod({ ...input, totalDebt: debtRemaining }, sequence, period, cash);
      debtRemaining = Math.max(0, debtRemaining - row.debtMinimum - row.extraDebt);
      periods.push({ ...row, debtRemaining });
      cash = row.closing;
    }
    return periods;
  }

  function simulate(input, sequence, planned) {
    const balances = Array.from({ length: input.periods }, () => []);
    const incomes = Array.from({ length: input.periods }, () => []);
    const expenses = Array.from({ length: input.periods }, () => []);
    let shortfalls = 0;
    for (let path = 0; path < input.paths; path++) {
      const random = rng(4813 + path * 7919);
      let cash = input.startingCash;
      let pathShortfall = false;
      for (let period = 1; period <= input.periods; period++) {
        const scenario = scenarioValues(input, period);
        const income = Math.max(0, scenario.income + normal(random) * input.incomeSd);
        const essential = Math.max(0, scenario.essential + normal(random) * input.essentialSd);
        const commitments = planned[period - 1];
        cash += income - essential - commitments.debtMinimum - commitments.discretionary - commitments.savings - commitments.extraDebt;
        balances[period - 1].push(cash);
        incomes[period - 1].push(income);
        expenses[period - 1].push(essential + commitments.debtMinimum + commitments.discretionary + commitments.extraDebt);
        if (cash < input.minimumReserve) pathShortfall = true;
      }
      if (pathShortfall) shortfalls++;
    }
    return {
      shortfallRisk: shortfalls / input.paths,
      incomeRanges: incomes.map((values, index) => ({ period: index + 1, p10: percentile(values, .1), p50: percentile(values, .5), p90: percentile(values, .9) })),
      expenseRanges: expenses.map((values, index) => ({ period: index + 1, p10: percentile(values, .1), p50: percentile(values, .5), p90: percentile(values, .9) })),
      ranges: balances.map((values, index) => ({ period: index + 1, p10: percentile(values, 0.1), p50: percentile(values, 0.5), p90: percentile(values, 0.9), width: percentile(values, 0.9) - percentile(values, 0.1) })),
      method: `${input.paths} seeded Monte Carlo paths; independent monthly normal income and essential-expense draws clipped at zero, with fixed planned discretionary and debt payments. P10–P90 is an 80% model interval, not guaranteed coverage. Savings transfers are excluded from expense ranges. No interest or fees are modeled.`,
    };
  }

  function relaxation(input, periods) {
    const conflicts = periods.flatMap(period => period.conflicts.map(message => `Period ${period.period}: ${message}`));
    if (!conflicts.length) return { infeasible: false, conflicts: [], proposals: [] };
    const worstReserveGap = Math.max(0, ...periods.map(period => input.minimumReserve - period.closing));
    const savingsGap = periods.reduce((sum, period) => sum + Math.max(0, input.monthlySavingsGoal - period.savings), 0);
    const proposals = [];
    if (worstReserveGap) proposals.push(`Temporarily lower the reserve by no more than ${Math.round(worstReserveGap)}, or add equivalent income before the affected period`);
    if (savingsGap) proposals.push(`Reduce or defer the six-month savings target by ${Math.round(savingsGap)}`);
    proposals.push('Renegotiate optional debt overpayments before reducing essential expenses or minimum debt payments');
    return { infeasible: true, conflicts, proposals };
  }

  function buildPlans(rawInput) {
    const input = normalizeInput(rawInput);
    const proposedSequences = deriveAutonomousSequences(input);
    const sequences = proposedSequences.map(sequence => {
      const periods = deterministicPlan(input, sequence);
      const uncertainty = simulate(input, sequence, periods);
      const saved = periods.reduce((sum, period) => sum + period.savings, 0);
      const extraDebt = periods.reduce((sum, period) => sum + period.extraDebt, 0);
      const discretionary = periods.reduce((sum, period) => sum + period.discretionary, 0);
      const feasibility = relaxation(input, periods);
      const targetGap = Math.max(0, input.monthlySavingsGoal * input.periods - saved);
      const score = uncertainty.shortfallRisk * 100 + targetGap / Math.max(1, input.monthlyIncome) * 12 + periods.at(-1).debtRemaining / Math.max(1, input.totalDebt) * 8;
      return { ...sequence, periods, uncertainty, feasibility, totals: { saved, extraDebt, discretionary, targetGap }, score };
    });
    const riskNeutral = [...sequences].sort((a, b) => (b.totals.saved + b.totals.extraDebt) - (a.totals.saved + a.totals.extraDebt))[0];
    const safest = [...sequences].sort((a, b) => a.uncertainty.shortfallRisk - b.uncertainty.shortfallRisk || a.score - b.score)[0];
    const recommended = riskNeutral.uncertainty.shortfallRisk - safest.uncertainty.shortfallRisk >= 0.02 ? safest : riskNeutral;
    sequences.sort((a, b) => (a.id === recommended.id ? -1 : b.id === recommended.id ? 1 : a.score - b.score));
    return {
      input,
      sequences,
      recommendedId: recommended.id,
      riskNeutralId: riskNeutral.id,
      uncertaintyChangedPreference: recommended.id !== riskNeutral.id,
      recommendationReason: recommended.id !== riskNeutral.id ? `Without uncertainty, ${riskNeutral.name} maximizes planned saving plus debt reduction. Forecast risk changes the preference to ${recommended.name}, lowering reserve-shortfall risk from ${Math.round(riskNeutral.uncertainty.shortfallRisk * 100)}% to ${Math.round(recommended.uncertainty.shortfallRisk * 100)}%.` : `${recommended.name} remains preferred after uncertainty because no alternative lowers reserve-shortfall risk by at least two percentage points.`,
      horizon: `${input.periods} monthly periods`,
      uncertaintyMethod: sequences[0].uncertainty.method,
      proposalMethod: 'Three autonomous strategies derived from observed cash flow, variability, reserve position, discretionary load, and debt pressure',
    };
  }

  function replan(rawInput, changes) {
    return buildPlans({ ...rawInput, ...changes });
  }

  root.FinActionPlanner = { PERIODS, PATHS, SEQUENCES, deriveAutonomousSequences, buildPlans, replan };
})(typeof globalThis !== 'undefined' ? globalThis : window);
