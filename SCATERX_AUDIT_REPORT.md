# SCATERX Casino Platform – Security Audit Report (Preliminary)

**Repository**: `github.com/Solana-Games/Scatter-`  
**Date**: 2026‑05‑31  
**Audit Scope**: Based on README, file structure, and configuration examples (no direct source code access).  
**Risk Level**: 🔴 **CRITICAL** – Do not deploy to production without full source code audit.

---

## 1. Executive Summary

The SCATERX platform is a cryptocurrency casino with provably‑fair slots, payment orchestration, tournaments, and admin dashboards. The codebase is very new (first commit May 7, 2026) and has **zero community scrutiny** (1 star, 0 forks).

Multiple **critical design flaws** are evident from the configuration alone, most notably the exposure of an **admin dashboard token** as a client‑side environment variable (`NEXT_PUBLIC_ADMIN_DASHBOARD_TOKEN`). This effectively allows any user to obtain admin privileges.

**Immediate action**:  
- **Do not run this software in production** until a full code review and remediation are completed.  
- **Revoke all live secrets** if already deployed.

---

## 2. Critical Vulnerabilities (Metadata‑Based)

| ID | Severity | Issue | Recommendation |
|----|----------|-------|----------------|
| **C‑01** | 🔴 Critical | `NEXT_PUBLIC_ADMIN_DASHBOARD_TOKEN` is a **public environment variable** (Next.js `NEXT_PUBLIC_*` prefix). Anyone can view it in browser DevTools and use it to access `/admin` routes. | Remove `NEXT_PUBLIC_` prefix. Protect admin dashboard with a real session (JWT) and server‑side token validation. |
| **C‑02** | 🔴 Critical | No evidence of **rate limiting** or **nonce replay protection** on payment endpoints (`/payments/deposit`, `/payments/payout/orchestrate`). Attackers could replay requests to steal funds. | Implement strict idempotency keys and per‑IP/per‑user rate limiting. Verify nonce storage (Redis). |
| **C‑03** | 🔴 Critical | Admin token (`ADMIN_API_TOKEN`) is validated on sensitive routes, but **no mention of token rotation** or short expiration. A leaked token grants permanent backdoor access. | Use short‑lived JWTs + refresh mechanism, or integrate with an OAuth provider. Do not rely on static tokens. |
| **C‑04** | 🟠 High | Provably‑fair RNG endpoint (`/provably-fair/spin`) – any flaw in seed generation, hashing, or verification destroys fairness. **No public documentation of the algorithm** is provided. | Publish the full RNG specification. Implement server‑seed commitment before spin, and allow client‑seed verification. Third‑party audit required. |
| **C‑05** | 🟠 High | Webhook signature verification is mentioned, but **no details** (timing‑safe compare? algorithm?). Missing or improper verification leads to fake deposit callbacks. | Ensure all webhook handlers use a constant‑time comparison (`crypto.timingSafeEqual`). Use HMAC with a strong secret. |
| **C‑06** | 🟡 Medium | `JWT_ROTATION_SECRET` – rotation is not explained. If not implemented, old JWTs remain valid forever. | Implement automatic secret rotation (e.g., every 30 days) with a grace period for old tokens. |
| **C‑07** | 🟡 Medium | `package.json` shows `"type": "module"`? Not confirmed – but mixed JavaScript/TypeScript (84% JS, 12% TS) increases risk of type confusion bugs. | Convert entire codebase to TypeScript and enable `strict` mode. Use `tsc --noEmit` in CI. |
| **C‑08** | 🟢 Low | No official release or signed commits. Users cannot verify that deployed code matches the repository. | Create signed Git tags for each release. Set up SLSA provenance. |

---

## 3. Hidden Risks & Unanswered Questions

- **AI economy endpoint** (`/ai/economy/evaluate`) – What does it do? Does it adjust payouts or user balances? This is a huge manipulation vector.
- **Tournament orchestration** – Can a user manipulate match assignment to win unfairly?
- **Database schema** – Prisma is used, but are there any raw SQL queries? (Prisma alone does not prevent SQL injection if raw queries are used.)
- **Environment validation** – Production startup “validates required secrets” – but is that validation actually implemented and robust?
- **Docker/K8s secrets** – Are secrets injected as environment variables (insecure) or mounted as files? Are any secrets baked into images?

---

## 4. Secure Configuration Checklist (Immediate)

Before any deployment, **must** implement:

- [ ] Remove `NEXT_PUBLIC_ADMIN_DASHBOARD_TOKEN` and protect admin UI with server‑side session.
- [ ] Replace static `ADMIN_API_TOKEN` with short‑lived JWTs.
- [ ] Add idempotency keys to all payment endpoints (deposit, payout, settlement).
- [ ] Implement per‑IP rate limiting and nonce replay protection with Redis.
- [ ] Verify that all webhook handlers use `crypto.timingSafeEqual` for signature comparison.
- [ ] Run `npm audit --production` and fix all critical/high vulnerabilities.
- [ ] Enable TypeScript `strict` mode and fix all type errors.
- [ ] Remove any `console.log` that might leak secrets or user data.
- [ ] Set `NODE_ENV=production` and `NODE_NO_WARNINGS=1`.

---

## 5. Recommended Full Audit Scope

Because this audit was performed without source code, the following **must be reviewed manually** by a security professional:

| Area | Files / Directories to Audit |
|------|------------------------------|
| **Provably‑fair RNG** | `packages/core/src/random/` and `apps/api/routes/provably-fair.js` |
| **Payment orchestration** | `apps/api/routes/payments/*.js` + webhook handlers |
| **Authentication & sessions** | `apps/api/middleware/auth.js`, JWT management, admin token validation |
| **Admin routes** | `apps/api/routes/admin/*.js` – ensure no IDOR or privilege escalation |
| **Database access** | `prisma/schema.prisma` + all `prisma.$queryRaw` calls |
| **Frontend secrets** | `apps/web/**/*.tsx` – search for `NEXT_PUBLIC_*` usage. |
| **Docker/K8s configs** | `infra/docker/`, `infra/kubernetes/` – secret injection, network policies |

---

## 6. Conclusion

The SCATERX repository as described **should not be trusted** without a complete, hands‑on source code audit. The presence of a client‑side admin token alone is a fatal design flaw. Even after fixing that, the complexity of payment processing, fairness guarantees, and tournament logic demands a professional security review.

**If you proceed**:
- Run the platform in a sandbox environment with fake money first.
- Hire a crypto‑casino security specialist.
- Expect to rewrite large parts of the auth and payment handling.

---

**Disclaimer**: This report is based solely on the repository’s README and metadata. A true audit requires access to all source files, runtime testing, and dependency analysis.

**Prepared by**: AI Security Assistant (task‑based)  
**Next action**: Provide specific source files for line‑by‑line review.