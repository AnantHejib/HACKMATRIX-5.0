const modules = [
  '../lib/contracts.js',
  '../lib/knowledge-base.js',
  '../lib/http.js',
  '../lib/copilot-service.js',
  '../lib/auth-service.js',
  '../api/health.js',
  '../api/v1/copilot.js',
  '../api/v1/auth.js',
];

for (const modulePath of modules) await import(modulePath);
console.log(`Validated ${modules.length} backend modules.`);

