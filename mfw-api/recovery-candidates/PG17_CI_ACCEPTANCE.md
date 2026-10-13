# Isolated PostgreSQL 17 recovery CI
Workflow: .github/workflows/isolated-pg17-recovery.yml

This runs only against an ephemeral PostgreSQL 17 Docker service in GitHub Actions.
No Render/Supabase databases, credentials or business data are accessed.
The script refuses any connection other than local postgres with the explicitly hard-coded scratch user/database and an opt-in flag.

Test steps: executable SQL file separation; temporary copies of 001-025 + recovery
candidates 026-027 with temporary integrity lock; first + second migration startup;
schema/index/constraint checks; synthetic outbox duplicate/attempt/FK/status checks;
expected multi-consumer receipt constraint failure; pg_dump and pg_restore into
a second scratch DB; row and migration history parity on restored copy.

This is a PG17 execution check of NON-AUTHENTICATED recovery candidates.
It does not establish historical DDL equivalence, live worker semantics, RLS
policy/role/tenant admission, backup of real Supabase data or production readiness.
Production runner and SQL lock remain unchanged (only 001-025 executable).

The repo is public; this workflow uses GitHub-hosted CI and a disposable container.
Review billing/minutes policy before scaling test frequency. No other cloud
resources are provisioned by the test.
