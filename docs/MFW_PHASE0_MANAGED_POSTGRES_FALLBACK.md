# MFW Phase 0 — managed PostgreSQL fallback

Status: proposed, not production-admitted.

This note supplements `MFW_INTEGRATION_MASTER_PLAN_2026-10-01.md` when the canonical Render database wiring is unavailable.

Verified candidate:
- managed PostgreSQL 17;
- migrations 001–025 present;
- complete required authority schema;
- all public tables protected by RLS.

Boundary:
- MFW remains the sole business authority;
- the external platform provides PostgreSQL infrastructure only;
- no client-side database access is introduced;
- no dual writes or split-brain persistence;
- exactly one production database target at a time.

Strict gate:
1. authorised server-only connection;
2. `MFW_REQUIRE_POSTGRES=true`;
3. exact-main deploy;
4. schema reconciliation 001–025;
5. `/ready=200` and `dataMode=postgres`;
6. social reverification and PostgreSQL Golden Paths;
7. Admission Evidence Bundle;
8. Runtime Admission and Capital hash-chain;
9. only then pg-boss/outbox.

Until this full sequence passes, Phase 0 remains open.