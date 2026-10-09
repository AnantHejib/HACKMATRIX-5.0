import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../app/src/main/assets/index.html', import.meta.url), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);

if (!match) throw new Error('Embedded application script was not found.');
new vm.Script(match[1], { filename: 'app/src/main/assets/index.html' });

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

console.log('Validated embedded app syntax and managed-Copilot boundary.');
