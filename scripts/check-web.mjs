import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../app/src/main/assets/index.html', import.meta.url), 'utf8');
const reliability = fs.readFileSync(new URL('../app/src/main/assets/forecast-reliability.js', import.meta.url), 'utf8');
const planner = fs.readFileSync(new URL('../app/src/main/assets/financial-action-planner.js', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

if (!scripts.length) throw new Error('Embedded application scripts were not found.');
scripts.forEach((match, index) => new vm.Script(match[1], { filename: `app/src/main/assets/index.html#script-${index + 1}` }));
new vm.Script(reliability, { filename: 'app/src/main/assets/forecast-reliability.js' });
new vm.Script(planner, { filename: 'app/src/main/assets/financial-action-planner.js' });
const healthScoreStart = html.indexOf('function calculateHealthScore');
const healthScoreEnd = html.indexOf('function calculate(', healthScoreStart);
if (healthScoreStart < 0 || healthScoreEnd < 0) throw new Error('Pure health-score calculator was not found.');
const healthSandbox = {};
vm.runInNewContext(`const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,value));${html.slice(healthScoreStart, healthScoreEnd)};globalThis.calculateHealthScore=calculateHealthScore;`, healthSandbox);
const standardWeights = { cashFlow: .3, liquidity: .25, debt: .2, credit: .15, stability: .1 };
const withoutCredit = healthSandbox.calculateHealthScore({ cashFlow: 80, liquidity: 60, debt: 70, credit: null, stability: 90 }, standardWeights);
if (withoutCredit.score !== 73 || withoutCredit.weights.credit !== 0) throw new Error('Missing optional credit data was not excluded and reweighted correctly.');
const weightSum = Object.values(withoutCredit.weights).reduce((sum, value) => sum + value, 0);
if (Math.abs(weightSum - 1) > 1e-9) throw new Error('Available health dimensions were not normalized to 100% weight.');
const withCredit = healthSandbox.calculateHealthScore({ cashFlow: 80, liquidity: 60, debt: 70, credit: 50, stability: 90 }, standardWeights);
if (withCredit.score !== 70 || Math.abs(withCredit.weights.credit - .15) > 1e-9) throw new Error('Provided credit data was not included at its declared weight.');
if (!html.includes('src="forecast-reliability.js"')) throw new Error('Forecast reliability module is not loaded by the WebView.');
if (!html.includes('src="financial-action-planner.js"')) throw new Error('Financial action planner module is not loaded by the WebView.');

const forbidden = [
  'openrouter.ai/api',
  "localStorage.setItem('orKey'",
  'Authorization\':\'Bearer',
];

for (const value of forbidden) {
  if (html.includes(value)) throw new Error(`Forbidden client-side AI credential path remains: ${value}`);
}

for (const required of ['buildCopilotPayload', '/api/v1/copilot', 'formatCopilotResponse', 'Managed Copilot service']) {
  if (!html.includes(required)) throw new Error(`Required managed-Copilot integration is missing: ${required}`);
}

for (const required of ['Stable glass system', 'scheduleDrawCharts', '#sheetOverlay:not(.hidden)', 'prefers-reduced-motion:reduce', 'sheetEnter']) {
  if (!html.includes(required)) throw new Error(`Required smooth-UI optimization is missing: ${required}`);
}
for (const required of ['plannerHistoryProfile', 'Autonomous six-month planner', 'SYSTEM PROPOSAL', '30-day validation — separate from six-month scenarios', 'Custom assumptions']) {
  if (!html.includes(required)) throw new Error(`Required autonomous-planner integration is missing: ${required}`);
}
for (const required of ['healthDimensionDetails', 'showHealthDimension', 'Observed evidence', 'Why this matters', 'Recommended response', 'What could change it', 'CREDIT EXCLUDED · NOT PROVIDED']) {
  if (!html.includes(required)) throw new Error(`Required explainable-health integration is missing: ${required}`);
}
if (!html.includes('validation.eligibility.canShowProbability?prediction.gapProbability*.28:0')) {
  throw new Error('Health scoring must not apply an unsupported cash-gap probability.');
}
if (!html.includes('creditAvailable?Math.round')) {
  throw new Error('Optional missing credit data must be excluded from health scoring.');
}
if (html.includes('backdrop-filter:blur(22px)')) throw new Error('Expensive per-card backdrop blur was reintroduced.');
for (const forbiddenUiPattern of ['content-visibility:auto', 'contain-intrinsic-size', '#sheetOverlay.hidden{display:grid!important}', 'navbtn:after']) {
  if (html.includes(forbiddenUiPattern)) throw new Error(`Unstable WebView UI pattern was reintroduced: ${forbiddenUiPattern}`);
}

console.log('Validated embedded app syntax and managed-Copilot boundary.');
