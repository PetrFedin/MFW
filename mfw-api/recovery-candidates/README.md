# Isolated PostgreSQL 026/027 recovery candidates — NOT approved

These files are deliberately **outside** mfw-api/migrations/. They are not loaded
by the Authority migration runner. They must not be treated as authentic copies
of the original historical SQL, nor as evidence that production PostgreSQL is ready.

- 026: extracted equivalent from the recorded Supabase migration
  mfw_028_canonical_026_postgres_conflict_constraints (two unique indexes).
  The literal historical mfw-api file is not proven.
- 027: reconstructed physical catalog snapshot of authority_outbox and
  authority_delivery_receipts, based on read-only column/index/constraint queries
  performed 2026-10-13. This is **not** original SQL and **not** a verified semantic
  equivalent. Separate Supabase security/grant migration effects are not included.
- 027's observed global UNIQUE(event_key) on delivery receipts **prevents**
  two consumer receipts for the same event_key. Do not enable fan-out without a
  separately reviewed forward migration, proof of application contracts and role
  qualification. Preserving this defect is necessary for faithful catalog comparison.

## Required evidence to graduate a candidate

1. Independently review provenance, full schema objects (incl. functions,
   triggers, policies, grants, default privileges), roles and live application
   idempotency contract. Do not invent historical SQL fingerprints.
2. Replay complete 001–027 in a **disposable isolated** PostgreSQL 17;
   explicitly verify zero cost and connection isolation first.
3. Compare normalized pg_catalog object definitions against read-only
   reference, including all columns, constraints, indexes and privileges.
4. Verify repeatability (cold start, second startup), negative JWT/role/tenant
   cases, backup/restore and restore checksum/row parity.
5. Only once independent review and CI are GREEN may an approved SQL file
   enter mfw-api/migrations/ and the Git blob lock be regenerated.
6. Do not reset/delete existing public.schema_migrations rows to force parity.

A syntax-only Node test asserts that staged SQL is outside the executable
migration directory. It is **not** a PostgreSQL execution test.

Related: https://github.com/PetrFedin/MFW/issues/25
PR #20: https://github.com/PetrFedin/MFW/pull/20

## Physical catalog comparison (isolated, not historical recovery)

An additional read-only reference file `027-catalog-reference.json` records 23 columns, eight indexes, eight constraints, RLS enabled/not forced and zero policies across the two outbox tables. The scratch PG17 CI compares complete column order/types/nulls/defaults, index and constraint DDL, RLS state and policy count against this current catalog. Candidate-only RLS hardening is included; it is not presented as original 027 SQL. Role grants and default privileges, triggers, publication settings, and behavior of any worker are separate gates.

## Single canonical PostgreSQL 17 CI workflow

To avoid redundant GitHub Actions runner minutes, `.github/workflows/isolated-postgres-17.yml` is the only standard PG17 scratch replay and restore workflow. Two overlapping workflows were retired. All negative SQLSTATE tests and full observed-catalog parity remain in the canonical job. The original historical 027 still has not been recovered and production admission remains HOLD.
