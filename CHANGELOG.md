# Changelog

All notable changes to this project are documented in this file.

## [1.0.0] - 2026-05-12

### Added
- PR3 AI economy orchestration module (`aiEconomy`) with churn, segmentation, retention, and jackpot tuning.
- Intelligent payment routing, settlement tracking, and payout queue orchestration helpers.
- Realtime scaling orchestration helpers for gateway planning, room balancing, and failover.
- Tournament network assignment utility.
- Extended web3 helper coverage (Arbitrum support, wallet reputation, tokenized jackpot ledger splits).
- Web route coverage for landing, dashboard, wallet, transactions, settings/profile, gameplay, loading, and error boundaries.
- Screenshot assets under `docs/screenshots`.

### Changed
- README upgraded to production-readiness format with deployment and environment documentation.
- Admin web route now enforces token-gated access.
- API startup now validates required production environment variables.

### Fixed
- Missing explicit production secret validation at server startup.
- Incomplete UI state coverage by adding loading/error/empty state routes and panels.

### Security
- Reinforced production startup checks for required secrets.
- Maintained admin-token protections for privileged API endpoints.

### Known Limitations
- API runtime state remains in-memory and is not yet shared across replicas.
- Web UI is a shell-level operational interface and not yet wired to persistent backend identity sessions.
- Screenshot generation is static from local running previews and should be refreshed as UI evolves.
