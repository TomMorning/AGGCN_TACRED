# ArchProbe AI

Interactive B2B/B2C technical interview simulation SaaS for Senior Backend & AI Engineers.

Users pick a **High-Concurrency Backend** or **AI Agent System Design** scenario, defend their architecture, and face a 3-round **Adversarial Staff Engineer AI Interviewer** grounded in golden rubrics (DeepTutor-inspired multi-agent flow + L1/L2/L3 weakness memory). LLM calls use **DeepSeek-V3 (`deepseek-chat`)** exclusively.

## Monorepo

| Path | Stack |
|------|--------|
| `/web` | Next.js 15, TypeScript, Tailwind, Mermaid |
| `/backend` | Go, chi, pgx, token-bucket rate limit, DeepSeek OpenAI-compatible SDK |
| `/supabase` | PostgreSQL schema + golden scenario seeds |

## Quick start (3 commands)

```bash
cp .env.example .env
# put your DeepSeek key in LLM_API_KEY

make up          # Postgres 16 + Redis 7 (auto-runs schema + seed)
make backend     # API on :8080
make web         # UI on :3000
```

Open [http://localhost:3000](http://localhost:3000) and try the free homepage roast on **llm-gateway-sidecar**.

### Build / test

```bash
make test    # Go unit tests
make build   # go build + next build
```

## API

- `GET /api/scenarios` — list scenarios + pass probability
- `POST /api/interviews/start` — `{ "slug": "llm-gateway-sidecar" }`
- `POST /api/interviews/{id}/submit` — `{ "answer": "..." }`
- `GET /api/dashboard/memory` — L3 mastery graph + variant drills
- `POST /api/webhooks/billing` — header `X-Billing-Secret` + `{ "plan_tier": "pro" }`

Without a valid `LLM_API_KEY`, the backend falls back to a deterministic heuristic auditor so the UI remains demoable.

## Flagship scenarios

| Slug | Tier |
|------|------|
| `llm-gateway-sidecar` | Free |
| `distributed-rate-limiter` | Free |
| `financial-graph-rag` | Free |
| `agentic-workflow-engine` | Pro |
| `high-freq-inventory-flash-sale` | Pro |
| `realtime-social-intent-crawler` | Pro |

## Extract as a standalone GitHub repo

This tree currently lives under `archprobe-ai/` inside the host repository (the cloud agent token cannot create a new GitHub repo). To publish standalone:

```bash
cd archprobe-ai
git init
git add .
git commit -m "Initial ArchProbe AI platform"
gh repo create TomMorning/archprobe-ai --public --source=. --remote=origin --push
```

## License

MIT — see parent repository unless replaced when extracted.
