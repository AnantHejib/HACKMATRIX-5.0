# FIN Copilot API 1.0

FIN's conversational layer is a versioned Vercel Function. It explains the deterministic financial model; it does not replace the model or calculate authoritative financial values.

## Runtime pipeline

1. The Android app calculates facts, forecasts, recommendations, impact, and confidence locally.
2. The client builds a bounded summary without transaction rows or merchant descriptions.
3. `POST /api/v1/copilot` applies a strict Zod input contract and a 32 KiB body limit.
4. The service retrieves a small set of relevant, curated RBI, MoSPI, and OGD guidance records.
5. Vercel AI Gateway calls the environment-selected model and requires a structured response schema.
6. Citation IDs are allowlisted against only the retrieved sources before the response is returned.
7. If any step fails, the Android app presents its on-device evidence-based answer.

Every successful answer contains:

- a direct answer;
- observed facts with evidence, confidence, and missing information;
- model predictions with horizon, confidence, and uncertainty;
- recommendations with rationale, expected impact, timeframe, confidence, and assumptions;
- a before/after change explanation; and
- allowlisted source metadata and an educational-use disclaimer.

## Configuration

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local`.

```dotenv
AI_GATEWAY_MODEL=openai/gpt-oss-20b
AI_GATEWAY_API_KEY=your-local-ai-gateway-key
FIN_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

`AI_GATEWAY_MODEL` is configuration, not a hard-coded dependency. Vercel uses `VERCEL_OIDC_TOKEN` automatically when AI Gateway is enabled; `AI_GATEWAY_API_KEY` is the local-development fallback.

## Verify locally

```bash
npm ci
npm run check
npm test
```

The tests validate body limits, strict request parsing, required decision layers, citation filtering, configuration failures, and health/error responses. Synthetic scenarios in `evals/copilot-cases.json` cover a new medical expense, an income increase, and a corrected debt balance.

## Deploy

1. Import the repository into Vercel or run `vercel link`.
2. Enable AI Gateway for the project.
3. Set `AI_GATEWAY_MODEL` for Preview and Production.
4. Set `FIN_ALLOWED_ORIGINS` for web clients. Android's bundled `file://` origin is supported.
5. Deploy, then verify `GET /api/health` returns `200` with `status: "ready"`.
6. Build the Android APK with the production origin:

```bash
gradle assembleRelease -PFIN_API_BASE_URL=https://your-fin-api.vercel.app
```

Do not ship a gateway or provider secret in the Gradle property; it contains only the public API origin.

## Production controls still required

The endpoint is deployable, but a public mobile client cannot safely hold a shared secret. Before using real customer data, configure Vercel Firewall rate limits, server-verified user sessions, app/device attestation, abuse alerts and spend budgets, retention rules, and a formal privacy/security review. `X-FIN-Client-ID` is hashed for a pseudonymous provider safety signal and is not authentication.

The health endpoint reports configuration state and authentication mode but never returns tokens. API logs include request ID, duration, and record count only; financial amounts and questions are not deliberately logged.
