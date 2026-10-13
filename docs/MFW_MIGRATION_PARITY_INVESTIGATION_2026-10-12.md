# MFW migration parity investigation — 2026-10-12

**Read-only evidence, not production admission.** Connected Supabase project: `yiiylfzwfpicrzpbgazl`. No DB writes or credential changes.

## Exact observed state
- Canonical GitHub MFW `main` has SQL migrations **001–025**.
- Supabase `public.schema_migrations` records **001–027**. The extra entries are `026_postgres_conflict_constraints.sql` (applied 2026-10-09 01:44:33 UTC) and `027_outbox_pg_boss_bridge.sql` (applied 2026-10-09 16:47:48 UTC).
- Supabase has a **separate** migration history `supabase_migrations.schema_migrations` with 28 entries: names ending `mfw_026_server_only_security_and_app_history`, `mfw_027_enable_pg_net_probe_transport`, `mfw_028_canonical_026_postgres_conflict_constraints`. Do not confuse Supabase's migration 027 with application SQL 027.
- Full SQL of Supabase `mfw_028_canonical_026_postgres_conflict_constraints` was recovered via read-only query: two `CREATE UNIQUE INDEX IF NOT EXISTS` operations on `loyalty_offers(external_key)` and `brand_content_posts(external_key)` under names `ux_loyalty_offers_external_key`, `ux_brand_content_posts_external_key`. Both exist on current Supabase instance. Existing partial `uq_*_external_key` unique indexes ALSO exist, do not change without checking ON CONFLICT resolution.
- Supabase `mfw_026_server_only_security_and_app_history` creates public app history, secures `reject_capital_ledger_mutation()` function search_path, enables RLS on public tables, revokes anon/authenticated table/sequence/function grants. Supabase `mfw_027_enable_pg_net_probe_transport` installs `pg_net`. Neither represents the application's historical `027_outbox_pg_boss_bridge.sql`.

## 027 remains unverified
Original SQL source for historical application `027_outbox_pg_boss_bridge.sql` was not recovered. Observed schema has `public.authority_outbox` and `public.authority_delivery_receipts` with uniqueness on event keys, unique receipt (outbox_id, consumer), FK ON DELETE RESTRICT, non-negative attempt check, pending/topic indexes and statuses pending/dispatching/dispatched/failed. Both tables empty; `pgboss` schema absent. RLS enabled, not forced; no user-facing policies or grants for `anon`/`authenticated`; `service_role` has grants. These facts do not establish an active worker, tested replay, or equivalence of a reconstructed SQL file to its historical original.

## Required follow-up gates
1. Recover 027 original or prepare separately reviewed, clearly labeled equivalent based on complete schema/catalog and actual runtime contracts; do not invent a historical checksum.
2. Add independently versioned/canonical SQL files and migration integrity manifest; never delete applied history simply to make parity green.
3. Exercise migrations with backup/restore and negative security cases in a disposable isolated database before connecting live services.
4. PR #20 must fail closed on unknown/duplicate migrations. Keep `public.schema_migrations` distinct from `supabase_migrations.schema_migrations`.
5. No production DB binding or switch until exact-SHA admission, valid credentials, `/ready=200`, PostgreSQL Golden Paths and proven restore.

References: https://github.com/PetrFedin/MFW/pull/20 and https://supabase.com/docs/guides/deployment/database-migrations.

## Authority / Render admission check (12 Oct 2026)

- Render `mfw-postgres` exists in Frankfurt, free plan, status available; its control-plane expiration remains **2026-10-30 12:53:29 UTC**. The service is **not** admitted as authoritative, and no verified recovery/restore proof exists.
- Render `mfw-authority`: `autoDeploy=no`, `healthCheckPath` empty; last known service SHA `b540bf5498460cdf68767e636744567b0d13c1ea`. Do not deploy `main` expecting it to auto-fix the SQL drift.
- Render `mfw-platform` has already published functional SHA `9fd9356cbfddb0df7dd2e52d16695bbf437da32d`. PR #21 QA-only main merge `7a2e7b98f9192862cbafe638cc3732c2db4f0f01` does not establish Authority or DB admission.
- Separate staging migration test is mandatory: replay 001–027 in a newly isolated scratch PostgreSQL; inspect 026/027 against Supabase catalog, negative role tests, apply twice where idempotent, take a snapshot, test restore. Record SQL integrity and schema diffs. **No automatic writes to MFW production database.**
- Build 027 as an independently reviewed migration with provenance label *reconstructed-equivalent* until original source is recovered, instead of falsely reporting the recovered original. Only then should exact-set migration parity pass in code and production.

## Additional fail-closed preflight (Draft PR #20 continuation, 2026-10-13)

- Both the HTTP startup and CLI migrator now share `migration-runner.js`; preflight verifies a contiguous `001–025` local SQL set against `migration-lock.json` Git blob hashes **before connecting**.
- On connection, the runner opens one PostgreSQL transaction, acquires a **transaction-scoped** advisory lock (pooler-safe), and rejects unknown, duplicate, non-prefix or missing-history-on-populated-schema states **before any migration SQL**. All pending migrations commit atomically as one transaction or roll back together.
- Lock hashes protect repository SQL byte integrity against unreviewed edits; they **do not authenticate the SQL originally executed on Supabase**. Source recovery/equivalence of historical app migrations `026` and `027`, isolated restore, role security and live Authority admission remain BLOCKED.
- Read-only 2026-10-13 Render observation: `mfw-postgres` status `suspended` (user suspenders), live `mfw-authority` has empty `healthCheckPath`, `autoDeploy=off`, and last live deploy SHA `b540bf54...`, older than main. No DB/Render settings were changed.
- Coverage: `node mfw-api/migration-preflight.test.js` now verifies **all 25 actual repository SQL Git hashes** plus negative cases using a fake DB and disposable local SQL. Fake DB tests are **not** a real PostgreSQL restore or runtime proof.

## Security catalog follow-up (read-only, 2026-10-13)

- `authority_outbox` and `authority_delivery_receipts` expose no table DML grants to `anon` or `authenticated`; RLS enabled with no public policies. `mfw_authority_app` is `LOGIN`, `BYPASSRLS` and has DML grants: only trusted server-side use is allowed, and negative role tests remain required.
- Existing empty outbox and delivery receipts are **not** evidence of functioning jobs, replay, consumer idempotency, or completed B2B monetisation.
- Follow-up acceptance is tracked in [Issue #25](https://github.com/PetrFedin/MFW/issues/25). Original 027 SQL, isolated PostgreSQL restore and secure Render service binding are still blocking production admission.

## Empty history and reporting safety (2026-10-13)

- A blank `public.schema_migrations` table on an otherwise populated schema is now rejected; recreating history as if the DB were empty is unsafe.
- Logging callbacks execute only after COMMIT. A logging failure cannot turn a completed migration transaction into a spurious migration failure.
- The all-or-nothing transaction and preflight remain pending **real isolated PostgreSQL** qualification; fake DB unit tests cannot prove PostgreSQL DDL/restore behavior.

## Recovery candidate files (2026-10-13)

Created isolated *non-executable* candidate SQL and catalog snapshot under `mfw-api/recovery-candidates/`: 026 based on the logged Supabase canonical index migration and 027 reconstructed from read-only `pg_catalog`. They are deliberately **outside `mfw-api/migrations/`**, so the fail-closed runner still rejects live history 001–027 against repo 001–025. Neither is attested original SQL. The current receipts `UNIQUE(event_key)` blocks multiple consumers of one outbox event; see Issue #25. Node recovery-contract checks syntax/provenance markers and isolation only; real PG17 DDL parity and restore remain unverified.
