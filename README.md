# SCATERX Casino Platform

SCATERX is a production-oriented cyberpunk crypto casino foundation repository designed for web, mobile web/PWA, desktop, and native wrappers.

## Included Platform Modules

- **Casino backend API** with provably fair SHA-256 RNG endpoints, jackpot accumulation, and payment abstraction for Xendit/PayMongo/Dragonpay.
- **Core casino math modules** for RTP and volatility calculations plus VIP cashback logic.
- **Frontend shell** (Next.js-style app structure) with player and admin entry points.
- **Infrastructure** with Docker, Docker Compose, Kubernetes deployment, NGINX reverse proxy, PM2 config, and CI workflow.
- **Persistence schema** using Prisma (PostgreSQL).
- **Mobile and desktop wrappers** via Capacitor and Electron configuration.

## Quick Start

```bash
npm test
npm run lint:check
npm run build:check
npm run start:api
```

## Key API Endpoints

- `GET /health`
- `GET /provably-fair/current`
- `POST /provably-fair/spin`
- `POST /provably-fair/verify`
- `POST /provably-fair/rotate-seed` (requires `x-admin-token`)
- `POST /payments/deposit`

## Security Baseline

- CSP and clickjacking protection headers.
- Deterministic provably-fair verifier flow (server seed + client seed + nonce).
- Input validation on payment and RNG routes.

## Testing

Node test suite validates RTP calculations, VIP logic, provably fair verification, and payment behavior.
