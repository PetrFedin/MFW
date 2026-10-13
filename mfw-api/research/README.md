# Scratch PostgreSQL 17 — Commercial Event/Outbox Experiment

**RESEARCH ONLY.** SQL and tests live outside executable migration paths. They are not original historical migration 026/027, a sanctioned production DDL or a server endpoint.

The GitHub Actions workflow starts a disposable local PostgreSQL 17 container with hard-coded CI-only credentials. It tests two concurrent same-sequence appends, a transaction rollback injected between event and outbox insertion, unique event keys and per-event/per-consumer outbox receipts, cold connection restart, scratch RLS denial and synthetic pg_dump/pg_restore.

### What a passing workflow does NOT prove

- Live Supabase role/JWT isolation, tenant policies, externally verified evidence or approved service credentials.
- Production atomicity, a live outbox worker, crash recovery under production traffic, proper invoice issuance, a bank-cleared settlement, tax/accounting approval or financial recognition.
- Safe migration chain 026/027, production SQL compatibility, completeness of audit trail, non-repudiation or immutable evidence.
- Availability, latency/SLA, outage recovery or a valid production funding business case.

Assumptions: the server holding the DB connection has first authenticated the user and checked every operation. The scratch table owner can bypass RLS, so the test deliberately makes NO claim about actual app security. Tenant roles must be tested separately in a hardened environment before a production service may use this design.

**Budget:** normal public GitHub-hosted runner with temporary PostgreSQL 17 service; no Render/Supabase service changes or new paid infrastructure.

Source workflow: .github/workflows/commercial-evidence-scratch-pg17.yml
