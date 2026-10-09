export const knowledgeBase = Object.freeze([
  {
    id: 'rbi-budgeting',
    title: 'RBI — I Can Do: Financial Planning',
    url: 'https://www.rbi.org.in/FinancialEducation/content/I%20Can%20Do_RBI.pdf',
    topics: ['budget', 'budgeting', 'expense', 'spending', 'saving', 'goal', 'cash flow'],
    guidance: 'Use a simple budget, compare planned and actual spending monthly, identify unnecessary expenses, and anticipate surprise costs.',
  },
  {
    id: 'rbi-fame',
    title: 'RBI — Financial Awareness Messages',
    url: 'https://www.rbi.org.in/commonman/images/FAME%20Booklet%20second%20edition/FAME%20Booklet%20English/FAME30072020.pdf',
    topics: ['debt', 'loan', 'borrowing', 'credit', 'repayment', 'budget', 'saving'],
    guidance: 'Budgeting supports expense control and saving; responsible borrowing includes understanding repayment capacity and maintaining repayment discipline.',
  },
  {
    id: 'mospi-hces-2023-24',
    title: 'MoSPI — Household Consumption Expenditure Survey 2023-24',
    url: 'https://www.mospi.gov.in/sites/default/files/publication_reports/Final_Report_HCES_2023-24L.pdf',
    topics: ['household', 'consumption', 'category', 'spending pattern', 'benchmark', 'rural', 'urban'],
    guidance: 'HCES supplies population-level category and consumption context. It must not be treated as an individual affordability target or substituted for the user’s own records.',
  },
  {
    id: 'india-ogd-consumption',
    title: 'Open Government Data India — Household Consumer Expenditure',
    url: 'https://data.gov.in/catalog/household-consumer-expenditure-national-sample-survey',
    topics: ['dataset', 'household', 'consumption', 'expenditure', 'research', 'benchmark'],
    guidance: 'The catalog is released under India’s National Data Sharing and Accessibility Policy and can support aggregate validation and research, not personalized decisions.',
  },
]);

function tokens(value) {
  return new Set(String(value).toLowerCase().match(/[a-z0-9]+/g) || []);
}

export function retrieveGuidance(question, financialContext, limit = 3) {
  const query = tokens([
    question,
    financialContext?.preferences?.primaryGoal,
    ...(financialContext?.recommendations || []).map(item => item.title),
  ].join(' '));

  return knowledgeBase
    .map(entry => {
      const haystack = tokens(`${entry.title} ${entry.topics.join(' ')} ${entry.guidance}`);
      let score = 0;
      query.forEach(token => {
        if (haystack.has(token)) score += token.length > 5 ? 3 : 1;
      });
      return { entry, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, limit)
    .map(item => item.entry);
}

export function resolveSources(ids, retrieved) {
  const allowed = new Map(retrieved.map(source => [source.id, source]));
  return [...new Set(ids)]
    .map(id => allowed.get(id))
    .filter(Boolean)
    .map(({ id, title, url }) => ({ id, title, url }));
}

