import fs from 'node:fs';

const cases = JSON.parse(fs.readFileSync(new URL('../evals/copilot-cases.json', import.meta.url), 'utf8'));

if (!Array.isArray(cases) || cases.length < 3) throw new Error('At least three adaptive-recommendation cases are required.');

for (const item of cases) {
  if (!item.id || !item.question || !item.change?.before || !item.change?.after) {
    throw new Error(`Incomplete evaluation case: ${item.id || 'unknown'}`);
  }
  if (!Array.isArray(item.mustExplain) || item.mustExplain.length < 2) {
    throw new Error(`Evaluation case ${item.id} needs explicit explanation criteria.`);
  }
  if (!Array.isArray(item.mustNotDo) || item.mustNotDo.length < 1) {
    throw new Error(`Evaluation case ${item.id} needs at least one safety prohibition.`);
  }
  const before = JSON.stringify(item.change.before);
  const after = JSON.stringify(item.change.after);
  if (before === after) throw new Error(`Evaluation case ${item.id} does not change financial state.`);
}

console.log(`Validated ${cases.length} adaptive-recommendation evaluation cases.`);
