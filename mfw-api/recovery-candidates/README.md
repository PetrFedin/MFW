# Isolated PostgreSQL 026/027 recovery candidates — NOT approved

These files are deliberately **outside** mfw-api/migrations/. They are not loaded
by the Authority migration runner. They must not be treated as authentic copies
of the original historical SQL, nor as evidence that production PostgreSQL is ready.

- The root candidate files here remain reconstructed, not source-identical.
  Separate exact committed application originals were located in historical Git:
  `original-git/026_postgres_conflict_constraints.sql` (commit `626a1b86`),
  `original-git/027_outbox_pg_boss_bridge.sql` (commit `105cbc1c`).
  Their exact Git blob SHA values are locked in `original-git-provenance.json`.
- The reference catalog remains a *read-only 2026-10-13 snapshot*. Matching it in
  isolated PostgreSQL does **not** prove which SQL bytes ran in the live DB;
  original committed sources do not establish live role, trigger or worker behavior.
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

To avoid redundant GitHub Actions runner minutes, `.github/workflows/isolated-postgres-17.yml` is the only standard PG17 scratch replay and restore workflow. Two overlapping workflows were retired. All negative SQLSTATE tests and full observed-catalog parity remain in the canonical job. Historical **Git-committed** SQL 027 has been located and blob-pinned; direct evidence of its application to live PostgreSQL is still missing and production admission remains HOLD.

## Default privilege regression test (15 October 2026)

Read-only verification of the connected MFW Supabase default ACL confirmed broad creator-specific future-object grants for `postgres` and `supabase_admin` (public schema; `anon`, `authenticated` and `service_role`). No live DDL was executed.

`default-privileges-scratch.test.js` reproduces these defaults using two dedicated synthetic creator roles and three client/service fixture roles in the disposable PG17 CI database. It proves new-table SELECT, new-sequence USAGE and new-function EXECUTE are initially granted, applies candidate default-privilege revocations for both creators, creates new canary objects, and confirms all are now inaccessible. It also checks that **existing** canaries retain their previous grants and that revoking global `PUBLIC` function EXECUTE is essential.

`default-privileges-review.sql` is a QUARANTINED REVIEW CANDIDATE, not an executable application migration. It must not be applied to real MFW until independent reviewer approval, live creator/grant inventory and server service_role compatibility sign-off. PostgreSQL `ALTER DEFAULT PRIVILEGES ... IN SCHEMA` cannot negate global function PUBLIC permissions; the global clause is intentional.

Docs: https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html ; https://supabase.com/docs/guides/api/securing-your-api . Issue https://github.com/PetrFedin/MFW/issues/28 .

## Forward-only multi-consumer receipt research (15 October 2026)

Historical 027 is preserved unchanged in `027_outbox_pg_boss_bridge.sql` for forensic fidelity. A separate quarantined `028_consumer_scoped_receipts_research.sql` removes global receipts `UNIQUE(event_key)`, retains `(outbox_id,consumer)` uniqueness and FK RESTRICT, and adds an enforced `(outbox_id,event_key)` composite foreign key. It is *not* an approved production migration.

The CI **first** completes 001–027 candidate replay and synthetic backup/restore unmodified. Only **after that**, on the separately restored disposable `mfw_restored_ci` clone, `consumer-scoped-receipts-scratch.test.js` applies and reapplies the candidate, confirms independent consumer A/B receipts for the same event, rejects a duplicated consumer (23505), and rejects an event-key/outbox mismatch (23503). The recorded application migration history remains 27 (no falsified migration row).

Independent schema review, application outbox handler API idempotency, role grants, data migration impact, and real worker crash/retry tests are not met by this SQL experiment. Related [Issue #25](https://github.com/PetrFedin/MFW/issues/25) remains production HOLD.


## Original Git-source recovery — 15 October 2026

The original **committed repository files**, not inferred-from-catalog substitutes, are now
archived unchanged in \`original-git/\`. Source commits are:
- 026: https://github.com/PetrFedin/MFW/commit/626a1b86424680c69fc295972ce8f9b4632da46b
- 027: https://github.com/PetrFedin/MFW/commit/105cbc1cd859e67efd027b882372968d71fad42d

\`original-git-replay.test.js\` independently replays native 001–025 plus these Git sources
on a separate **disposable** PG17 database, checks exact blob hashes, compares the full
observed two-table physical catalog, repeats migrations, checks scratch role grants,
and proves the historical global receipt event-key uniqueness blocks multi-consumer delivery.
The workflow also exercises pg_dump/pg_restore with synthetic data on that separate DB.
Both source files stay outside \`mfw-api/migrations/\` until independent review, live role
inventory, and data application evidence are complete. GREEN CI proves scratch behavior
only: not successful deployment, validated production migration history or JWT isolation.


## Synthetic dual-control dead-letter redrive (16 October 2026)

The canonical disposable PG17 pipeline now runs `manual-redrive-scratch.test.js` **after** the retry/crash test on `mfw_restored_ci`. It creates CI-only actor fixtures, an append-only redrive audit with an immutable UPDATE/DELETE trigger, verifies reviewer independence and synthetic AAL2, and requeues a poison job only with an explicit reason code. Concurrent duplicate request keys must yield one audit record and one pending job; different actors, reasons or consumers cannot reuse a request key. A redrive records a *pending* retry, not a successful delivery or payment.

This is **not** production manual replay or real Auth: fixture actor IDs and assurance markers are seeded by CI, not issued by Supabase or verified against a live staff account. Production requires validated issuer/session and current operator/reviewer grants, separate tenant and consent checks, a reviewed schema/ACL, secure API audit provenance, a running durable worker and operational alerts. No changes to historical 026/027, executable migrations, `main`, Render or production data.
