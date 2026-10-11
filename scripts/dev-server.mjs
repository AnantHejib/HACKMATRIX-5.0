import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { buildWeb } from './build-web.mjs';
if(process.argv.includes('--web'))process.env.FIN_WEB='1';

for (const name of ['.env.local', '.env']) {
  const path = new URL(`../${name}`, import.meta.url);
  if (fs.existsSync(path)) process.loadEnvFile(path);
}

const { GET: health, OPTIONS: healthOptions } = await import('../api/health.js');
const { POST: copilot, OPTIONS: copilotOptions } = await import('../api/v1/copilot.js');
const { POST: authPost, OPTIONS: authOptions, GET: authGet } = await import('../api/v1/auth.js');

const port = Number(process.env.PORT) || 3000;
if(process.env.FIN_WEB==='1')buildWeb();
const page = new URL(process.env.FIN_WEB==='1'?'../build/web/index.html':'../app/src/main/assets/index.html', import.meta.url);
const staticAssets = new Map([
  ['/login.html', new URL('../app/src/main/assets/login.html', import.meta.url)],
  ['/login.js', new URL('../app/src/main/assets/login.js', import.meta.url)],
  ['/fin-auth.js', new URL('../app/src/main/assets/fin-auth.js', import.meta.url)],
  ['/fin-locale.js', new URL('../app/src/main/assets/fin-locale.js', import.meta.url)],
  ['/forecast-reliability.js', new URL('../app/src/main/assets/forecast-reliability.js', import.meta.url)],
  ['/financial-action-planner.js', new URL('../app/src/main/assets/financial-action-planner.js', import.meta.url)],
]);
if(process.env.FIN_WEB==='1'){
  const directory=path.resolve(import.meta.dirname,'../build/web');
  for(const relative of fs.readdirSync(directory,{recursive:true})){
    const filename=path.join(directory,relative);
    if(fs.statSync(filename).isFile())staticAssets.set('/'+relative.split(path.sep).join('/'),filename);
  }
}
const routes = {
  'POST /api/v1/auth/signup': authPost,
  'OPTIONS /api/v1/auth/signup': authOptions,
  'POST /api/v1/auth/signin': authPost,
  'OPTIONS /api/v1/auth/signin': authOptions,
  'GET /api/health': health,
  'OPTIONS /api/health': healthOptions,
  'POST /api/v1/copilot': copilot,
  'OPTIONS /api/v1/copilot': copilotOptions,
  'POST /api/v1/auth/send-otp': authPost,
  'OPTIONS /api/v1/auth/send-otp': authOptions,
  'POST /api/v1/auth/verify-otp': authPost,
  'OPTIONS /api/v1/auth/verify-otp': authOptions,
  'GET /api/v1/auth/status': authGet,
  'GET /api/v1/auth/session': authGet,
  'OPTIONS /api/v1/auth/session': authOptions,
  'POST /api/v1/auth/logout': authPost,
  'OPTIONS /api/v1/auth/logout': authOptions,
  'OPTIONS /api/v1/auth/status': authOptions,
  'POST /api/v1/auth/config': authPost,
  'OPTIONS /api/v1/auth/config': authOptions,
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
    if (req.method === 'GET' && staticAssets.has(url.pathname)) {
      const extension=path.extname(url.pathname),type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm'}[extension]||'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      res.end(fs.readFileSync(staticAssets.get(url.pathname)));
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
