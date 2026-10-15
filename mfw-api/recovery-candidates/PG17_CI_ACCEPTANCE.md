# Isolated PostgreSQL 17 qualification

Canonical CI: .github/workflows/isolated-postgres-17.yml
Driver: mfw-api/recovery-candidates/isolated-replay.test.js

One disposable PostgreSQL 17 service tests original 001–025, catalog-based candidates 001–027, full observed column/index/constraint/RLS catalog parity, repeat migrations, negative SQL constraints (duplicates, status, attempts, FK, parent deletion and multi-consumer conflict) and pg_dump/pg_restore with restored synthetic record verification. Candidate SQL remains out of the production migration folder.

PASS only proves the local scratch catalog reconstruction and backup/restore. It does not authenticate the original 027, establish external role/JWT security or live outbox worker recovery, verify Supabase restore, or admit production. No new paid service is created.

## Consolidated role-test compatibility

The canonical single PostgreSQL 17 workflow now runs `scratch-role-boundary.test.js` after candidate replay against the localhost-only `mfw_candidate_ci` database. This checks that two disposable NOLOGIN probe roles with schema USAGE but no table privileges cannot directly SELECT outbox/receipt records and have no DML grants, while both tables have RLS enabled. It is only a synthetic SQL-access negative test, **not** JWT/tenant isolation or live Supabase authorization.


## Historic Git-source replay (added 2026-10-15)

Separate from the *catalog reconstruction* replay above, the same disposable PG17 CI
also validates untouched Git-committed SQL 026/027 from blob-pinned origin commits
in \`original-git/\`. It creates a separate scratch database, replays 001–027,
compares the observed catalog snapshot, checks RLS and negative direct SQL grants,
exposes the original receipt fanout uniqueness defect, and verifies pg_dump/pg_restore
of synthetic source-schema data. The actual deployed SQL provenance in live
Supabase, JWT/tenant security and production readiness remain unverified.
