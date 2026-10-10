import fs from 'node:fs';
import http from 'node:http';

for (const name of ['.env.local', '.env']) {
  const path = new URL(`../${name}`, import.meta.url);
  if (fs.existsSync(path)) process.loadEnvFile(path);
}

const { GET: health, OPTIONS: healthOptions } = await import('../api/health.js');
const { POST: copilot, OPTIONS: copilotOptions } = await import('../api/v1/copilot.js');

const port = Number(process.env.PORT) || 3000;
const page = new URL('../app/src/main/assets/index.html', import.meta.url);
const routes = {
  'GET /api/health': health,
  'OPTIONS /api/health': healthOptions,
  'POST /api/v1/copilot': copilot,
  'OPTIONS /api/v1/copilot': copilotOptions,
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(page));
      return;
    }
    const handler = routes[`${req.method} ${url.pathname}`];
    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'NOT_FOUND' }));
      return;
    }
    const body = ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : await readBody(req);
    const response = await handler(new Request(url, { method: req.method, headers: req.headers, body }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'DEV_SERVER_ERROR' }));
  }
});

server.listen(port, () => {
  const ready = process.env.AI_GATEWAY_MODEL && (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
  console.log(`FIN is running at http://localhost:${port}`);
  console.log(ready
    ? `Copilot model: ${process.env.AI_GATEWAY_MODEL}`
    : 'Copilot model is not configured: set AI_GATEWAY_MODEL and AI_GATEWAY_API_KEY in .env.local. Chat will use on-device answers until then.');
});
