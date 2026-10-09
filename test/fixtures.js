export function validRequest(overrides = {}) {
  return {
    apiVersion: '1.0',
    question: 'How should I reduce my debt without risking my next bill cycle?',
    conversation: [],
    financialContext: {
      analysisVersion: '2.0',
      currency: 'INR',
      dataQuality: 88,
      observed: {
        monthlyIncome: 60000,
        monthlySpending: 46000,
        essentialMonthly: 33000,
        currentCash: 24000,
        liquidSavings: 90000,
        totalDebt: 78000,
        monthlyDebtPayments: 6200,
        recurringMonthly: 25500,
        netWorth: 91000,
        safeToSpend: 5700,
        recordCount: 113,
        observedDays: 90,
      },
      prediction: {
        cashGapProbability: 18,
        forecastConfidence: 82,
        gapDay: null,
        spendingTrendPercent: 3,
        emergencyRunwayMonths: 2.2,
        debtPressurePercent: 14,
      },
      recommendations: [{
        id: 'debt',
        title: 'Add a monthly debt overpayment',
        rationale: 'Protect one bill cycle, then direct part of the surplus to principal.',
        expectedImpact: 'About ₹36,000 additional principal reduction over six months.',
        timeframe: '6 months',
        confidence: 72,
        uncertainty: 'Interest, lender fees, and prepayment allocation are unavailable.',
      }],
      preferences: {
        primaryGoal: 'Reduce debt',
        monthlyTarget: 6000,
        emergencyMonths: 3,
        style: 'Practical and balanced',
        timeHorizon: '6 months',
      },
      change: null,
      ...overrides,
    },
  };
}

export const validAnswer = {
  directAnswer: 'Protect the next bill cycle first, then use the modeled surplus for a measured overpayment.',
  observedFacts: [{
    statement: 'Monthly income exceeds monthly spending by ₹14,000.',
    evidence: '₹60,000 observed monthly income minus ₹46,000 observed monthly spending.',
    confidence: 88,
    missingInformation: 'Account coverage may be incomplete.',
  }],
  predictions: [{
    statement: 'The current model estimates an 18% chance of a 30-day cash gap.',
    horizon: 'Next 30 days',
    confidence: 82,
    uncertainty: 'Unexpected bills or income changes are outside the current data.',
  }],
  recommendations: [{
    action: 'Add a monthly debt overpayment after reserving the next bill cycle.',
    rationale: 'This follows the supplied debt recommendation and preserves near-term liquidity.',
    expectedImpact: 'About ₹36,000 additional principal reduction over six months.',
    timeframe: '6 months',
    confidence: 72,
    assumptions: ['Income and essential spending remain near current levels.'],
  }],
  changeExplanation: {
    changed: false,
    summary: 'No before-and-after financial update is available.',
    drivers: [],
  },
  sourceIds: ['rbi-fame', 'not-allowed'],
  disclaimer: 'Educational guidance only; confirm lender terms before acting.',
};

