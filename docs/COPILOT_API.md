# FIN Copilot API 1.0

FIN's conversational layer is a versioned Vercel Function. It explains the deterministic financial model; it does not replace the model or calculate authoritative financial values.

## Runtime pipeline

1. The Android app calculates facts, forecasts, recommendations, impact, and confidence locally.
2. The client defaults to on-device answers. Choosing cloud chat explicitly permits sharing a bounded financial summary, payee names, recent transaction details, question and conversation.
3. `POST /api/v1/copilot` applies a strict Zod input contract and a 256 KiB body limit.
4. The service retrieves a small set of relevant, curated RBI, MoSPI, and OGD guidance records.
5. Vercel AI Gateway calls the environment-selected model and requires a structured response schema.
6. Citation IDs are allowlisted against only the retrieved sources before the response is returned.
7. If any step fails, the Android app presents its on-device evidence-based answer.

Financial answers contain the relevant subset of:

- a direct answer;
- observed facts with evidence, confidence, and missing information;
- model predictions with horizon, confidence, and uncertainty;
- recommendations with rationale, expected impact, timeframe, confidence, and assumptions;
- a before/after change explanation; and
- allowlisted source metadata and an educational-use disclaimer.

General conversation such as greetings does not require financial analysis sections. P2's on-device MediaPipe model receives verified facts and recent conversational context through `FinLlm`; model output is checked against supplied numbers. Its `.task` asset is optional and must be installed on a compatible Android phone. Cloud chat preserves the managed structured API and includes P2's bounded transaction context only after the user selects that mode.

## Configuration

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local`.

```dotenv
AI_GATEWAY_MODEL=openai/gpt-oss-20b
AI_GATEWAY_API_KEY=your-local-ai-gateway-key
FIN_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

`AI_GATEWAY_MODEL` is configuration, not a hard-coded dependency. Vercel uses `VERCEL_OIDC_TOKEN` automatically when AI Gateway is enabled; `AI_GATEWAY_API_KEY` is the local-development fallback.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The dev server serves the app and API routes from one origin. Select cloud chat in Settings to use the configured model. Without credentials, local calculated answers remain available; the native MediaPipe engine runs only inside Android after a model is installed.

The request also carries `locale` (`en`, `hi`, `mr`), P2's ranked payee groups in `financialContext.categories`, the calculated budget in `financialContext.plan`, and exact daily/weekly/monthly totals plus bounded merchant and recent-payment arrays in `financialContext.transactions`. Calculated totals remain authoritative. The backend preserves the P2 transaction-query instructions, P1's structured response format, retrieved guidance and locale routing.

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
