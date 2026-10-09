const modules = [
  '../lib/contracts.js',
  '../lib/knowledge-base.js',
  '../lib/http.js',
  '../lib/copilot-service.js',
  '../api/health.js',
  '../api/v1/copilot.js',
];

for (const modulePath of modules) await import(modulePath);
console.log(`Validated ${modules.length} backend modules.`);

