# SCATERX Casino Platform

SCATERX is a production-oriented cyberpunk crypto casino foundation repository designed for web, mobile web/PWA, desktop, and native wrappers.

## Included Platform Modules

- **Casino backend API** with provably fair SHA-256 RNG endpoints, jackpot accumulation, and payment abstraction for Xendit/PayMongo/Dragonpay.
- **Core casino math modules** for RTP and volatility calculations plus VIP cashback logic.
- **PR2 convergence modules**: RTP profile simulation/audit tooling, payout distribution + volatility heatmaps, anti-replay nonce guards, anti-burst auto-spin guard, provider failover, withdrawal approval workflow, and reconciliation reporting.
- **PR3 omega modules**: AI economy tick orchestration (churn, segmentation, retention offers, jackpot tuning), intelligent payment routing + payout queue orchestration, realtime gateway/failover planning, tournament network placement, and extended web3 chain + tokenized jackpot helpers.
- **Frontend shell** (Next.js-style app structure) with player and admin entry points.
- **Infrastructure** with Docker, Docker Compose, Kubernetes deployment, NGINX reverse proxy, PM2 config, and CI workflow.
- **Persistence schema** using Prisma (PostgreSQL).
- **Mobile and desktop wrappers** via Capacitor and Electron configuration.

## Quick Start

```bash
npm test
npm run verify:metadata
npm run verify:structure
npm run start:api
```

## Key API Endpoints

- `GET /health`
- `GET /provably-fair/current`
- `POST /provably-fair/spin`
- `POST /provably-fair/verify`
- `POST /provably-fair/rotate-seed` (requires `x-admin-token`)
- `GET /rtp/profiles`
- `POST /rtp/simulate`
- `POST /payments/deposit`
- `POST /payments/provider/select`
- `POST /payments/withdraw`
- `POST /payments/withdraw/approve` (requires `x-admin-token`)
- `POST /payments/reconcile`
- `POST /payments/route/intelligent`
- `POST /payments/settlement/track`
- `POST /payments/payout/orchestrate` (requires `x-admin-token`)
- `GET /payments/queue` (requires `x-admin-token`)
- `GET /jackpot/ticker`
- `POST /security/token/rotate` (requires `x-admin-token`)
- `POST /security/token/verify`
- `POST /ai/economy/evaluate`
- `POST /realtime/topology`
- `POST /realtime/failover`
- `POST /tournaments/orchestrate`
- `POST /tournaments/network/assign`
- `GET /tournaments/network/status`

Webhook signature verification expects the raw request body bytes/string (`sha256=<hex>`), not a parsed JSON object.

## Security Baseline

- CSP and clickjacking protection headers.
- Deterministic provably-fair verifier flow (server seed + client seed + nonce).
- Nonce replay protection for spin requests.
- Basic rate limiting for mutating routes.
- Auto-spin burst abuse controls via session guard.
- Rotating signed session token helper endpoints for ops/admin automation.
- Client seeds are normalized and capped to 64 characters for deterministic hashing.
- Input validation on payment and RNG routes.
- Seed rotation includes versioned hash chaining in-process (persist to storage for multi-instance production use).
- API runtime state is in-memory; deploy as a single API replica/instance unless shared state storage is added.

## Testing

Node test suite validates RTP calculations, VIP logic, provably fair verification, and payment behavior.

## PR2 Production Math and Fintech Notes

- `packages/core/src/rtp.js` now includes configurable RTP profiles, weighted probability matrices, deterministic large-spin simulation, payout distribution analytics, and volatility heatmap generation.
- `apps/api/src/payments.js` now includes payment-provider failover selection, queue item generation, withdrawal lifecycle controls, fraud scoring, and transaction reconciliation helpers.
- `apps/web/game/engine/features.js` includes deterministic feature logic for sticky wilds, walking wilds, mystery reveals, transformation events, gamble feature resolution, and respin triggers.
