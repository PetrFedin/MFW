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
