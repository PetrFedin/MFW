# Isolated PostgreSQL 17 qualification

Canonical CI: .github/workflows/isolated-postgres-17.yml
Driver: mfw-api/recovery-candidates/isolated-replay.test.js

One disposable PostgreSQL 17 service tests original 001–025, catalog-based candidates 001–027, full observed column/index/constraint/RLS catalog parity, repeat migrations, negative SQL constraints (duplicates, status, attempts, FK, parent deletion and multi-consumer conflict) and pg_dump/pg_restore with restored synthetic record verification. Candidate SQL remains out of the production migration folder.

PASS only proves the local scratch catalog reconstruction and backup/restore. It does not authenticate the original 027, establish external role/JWT security or live outbox worker recovery, verify Supabase restore, or admit production. No new paid service is created.
