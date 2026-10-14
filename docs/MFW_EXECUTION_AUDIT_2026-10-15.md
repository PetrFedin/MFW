# MFW / BFS / Made in Moscow — execution audit and source-of-truth backlog

**Audited:** 15 October 2026. **Snapshot:** `PetrFedin/MFW:main@7a2e7b98f9192862cbafe638cc3732c2db4f0f01`. **Not a production admission or investor revenue certification.**

## Assessment method

Compared canonical `main` source tree and `CURRENT_STATE.md`, `RENDER_STATE.md`, `RELEASE_LOG.md` with the complete 93,910-character `docs/MFW_INTEGRATION_MASTER_PLAN_2026-10-01.md` (including its newest authoring commits), open issues and PRs, connected MFW Supabase metadata/read-only default ACLs and Render service/DB status. Reconciled previous CI results **by exact SHA**, not by branch label.

This audit is **an evidence map, not a binary feature checklist**. `code_in_main_runtime_unverified` means a source-level implementation exists, but live authenticated PostgreSQL golden-path admission has **not** been established. `preview_in_main` means read-only model/UX, not server trust. `draft_pr_not_admitted` means code is in a separate open PR and must not be attributed to `main`. `proposal_only` means only the roadmap/reference is identified. Planned scope is not counted as shipped.

## Executive decision

**Do not create a second authority or declare live commercial results while Phase 0 remains BLOCKED.** The priority is real participant reliability (registration/QR/agenda), authorised brand-buyer interactions, persistence, and evidence-backed sponsor/brand value. The investor UI is a read-only projection and does not establish accepted revenue.

The critical sequence is:

1. **P0** — reconcile application migrations 026–027 without fabricated provenance; independently review creator privileges and future-object default ACL; recover an existing safe database path; bind Authority securely; prove `/ready=200`, `dataMode=postgres` and exact deployed SHA.
2. **P0** — verify real signed JWT/session/current membership and cross-brand/event denials, successful golden paths, adversarial QR/pass retries, capital hash-chain, independent reviewer and rollback proof.
3. **P1** — transactional domain outbox + durable jobs/policy; then participant and partner workflows, verified Brand365, Made in Moscow roster, actual delivery/acceptance, safe financial reconciliation.
4. **P1** — admit investor financial read projections **only** from scoped accepted contracts and independently verified accounting and cash; no scenario -> actual substitution.
5. **P2** — mature multilingual replay, search/ICS, venue operations, trust credentials, partner APIs and benchmarking, in dependency order.

## Verified red lines

- MFW canonical main SQL currently `001–025`; connected Supabase application schema history reports `001–027`. Draft PR #20's quarantine does **not** reconstruct authoritative historical source 027.
- Existing Render `mfw-authority`: `autoDeploy=no`, `healthCheckPath` empty; free Render PostgreSQL `mfw-postgres` **suspended** as observed on this audit date. The connected **Supabase** MFW PostgreSQL 17 project is active but not admitted as the Render Authority's live source of truth.
- Connected Supabase future-object `pg_default_acl` for creators `postgres` and `supabase_admin` grants privileges to `anon` / `authenticated`; Issue #28 candidate reviewed only as isolated PG17 test, **not applied**.
- Draft PR #20 PG17 migration replay, canary ACL and synthetic backup/restore passed on exact head `8feea7db458add3db76bdf50f90ccc61061071db`; no independent human review or production DB evidence.
- PR #26 Investor Economics CI GREEN, Ready for review; PR #30 server commercial validation and mock Auth/JWT boundary CI GREEN but Draft, no real authenticated bank/finance/Gateway state.
- Source `CURRENT_STATE.md` was last fully consolidated 2026-10-03, with a 2026-10-10 runtime addendum. Its product claims should be understood as implementation description, **not** an external acceptance report.
- Open standalone Issues at audit: #3, #7, #25, #27, #28; these do not capture every planned phase in the master plan.

## Complete priority register

Canonical machine-checkable register: [mfw-execution-roadmap.json](./mfw-execution-roadmap.json).

| Priority | Workstreams | Completion condition |
|---|---:|---|
| P0 | 6 | Exact live authority, security, reviewer and participant Golden Path evidence |
| P1 | 18 | Durable user/partner execution and attributable, separately accepted finance |
| P2 | 11 | Grounded new capabilities, accessible UX, privacy and portable institutional integration |

The JSON register contains an acceptance criterion and source file evidence for **each** workstream, plus blocked prerequisites. Graph checks guarantee missing source files, orphan dependencies and cycles fail CI.

## Next implementation wave

1. Finish PR #20 independent security/migration review and Issue #28 creator-default-ACL approval (scratch CI already green).
2. Resolve Render DB/provider choice safely; do not unsuspend/purchase/rebind until operator/resource approval and exact schema/backup plan.
3. Verify PR #30 Auth boundary against real server credentials and revoked membership; negative tenant and financial role abuse tests.
4. Close live admission and actual visitor check-in and BFS buyer/meeting Golden Paths.
5. Build P1-01 durable jobs/outbox and P1-12 Pilot-to-Revenue with tenant-verified documents/receipts and clear accounting policy.
6. Re-test already-present static MFW/BFS/Made UI for accessibility, content freshness, rights and real iOS/Android, not Chromium alone.

## Governance and UX standards

- Keep **one identity** but event/brand scoped access; MFW fashion editorial, BFS conference/business and Made in Moscow visual systems stay distinct.
- RU default with EN parity; meaningful accessible content, responsive touch targets, no fake open/live statuses, real photo rights.
- Classify finance/metrics as **Observed / Reported / Verified / Attributed / Incremental / Modelled**, with source references and freshness; do not treat gross activity as profit or GMV as MFW revenue.
- Existing checked flows should be improved with failure/recovery, negative cross-role tests, accessibility, scenario realism and evidence trail rather than endlessly adding preview buttons.
- No new paid resources or unreviewed production writes in this audit wave.

**Run:** `node qa/roadmap-integrity.test.js`. The dedicated lightweight GitHub Actions job checks this register on subsequent edits.
