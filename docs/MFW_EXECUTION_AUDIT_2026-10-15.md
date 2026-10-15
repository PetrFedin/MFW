# MFW / BFS / Made in Moscow — execution audit and source-of-truth backlog

**Audited:** 15 October 2026. **Snapshot:** `PetrFedin/MFW:main@7a2e7b98f9192862cbafe638cc3732c2db4f0f01`. **Not a production admission or investor revenue certification.**

## Assessment method

Compared canonical `main` source tree and `CURRENT_STATE.md`, `RENDER_STATE.md`, `RELEASE_LOG.md` with the complete 93,910-character `docs/MFW_INTEGRATION_MASTER_PLAN_2026-10-01.md` (including its newest authoring commits), open issues and PRs, connected MFW Supabase metadata/read-only default ACLs and Render service/DB status. Reconciled previous CI results **by exact SHA**, not by branch label.

This audit is **an evidence map, not a binary feature checklist**. `code_in_main_runtime_unverified` means a source-level implementation exists, but live authenticated PostgreSQL golden-path admission has **not** been established. `preview_in_main` means read-only model/UX, not server trust. `draft_pr_not_admitted` means code is in a separate open PR and must not be attributed to `main`. `proposal_only` means only the roadmap/reference is identified. Planned scope is not counted as shipped.

## Executive decision

**Do not create a second authority or declare live commercial results while Phase 0 remains BLOCKED.** The priority is real participant reliability (registration/QR/agenda), authorised brand-buyer interactions, persistence, and evidence-backed sponsor/brand value. The investor UI is a read-only projection and does not establish accepted revenue.

The critical sequence is:

1. **P0** — reconcile Git-recovered 026–027 against live schema/application provenance, without fabricated executed-SQL attestation; independently review creator privileges and future-object default ACL; recover an existing safe database path; bind Authority securely; prove `/ready=200`, `dataMode=postgres` and exact deployed SHA.
2. **P0** — verify real signed JWT/session/current membership and cross-brand/event denials, successful golden paths, adversarial QR/pass retries, capital hash-chain, independent reviewer and rollback proof.
3. **P1** — transactional domain outbox + durable jobs/policy; then participant and partner workflows, verified Brand365, Made in Moscow roster, actual delivery/acceptance, safe financial reconciliation.
4. **P1** — admit investor financial read projections **only** from scoped accepted contracts and independently verified accounting and cash; no scenario -> actual substitution.
5. **P2** — mature multilingual replay, search/ICS, venue operations, trust credentials, partner APIs and benchmarking, in dependency order.

## Verified red lines

- MFW canonical main SQL currently `001–025`; connected Supabase application schema history reports `001–027`. PR #20 now contains the *Git-committed original application source files* 026 and 027, pinned to historical commits and blob hashes. This resolves **repository-source recovery**, not proof of which SQL bytes were applied in the connected database. The restored files remain quarantined outside executable migrations.
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
| P1 | 19 | Durable user/partner execution and attributable, separately accepted finance |
| P2 | 10 | Grounded new capabilities, accessible UX, privacy and portable institutional integration |

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

## Investor proof integrity improvement

The static `mfw/platform/evidence-package.json` now contains a mandatory fail-closed `verificationBoundary`: production admission BLOCKED, actual accounting/cash/ARR metrics null, code-level meaning of `observed`, and required server evidence before upgrading any commercial claim. A separate CI contract checks all claim status/evidence classifications, file references and prevents a synthetic finance metric from silently becoming a literal actual. This prevents confusion between verified **UI source presence** and verified **real-world financial outcomes**. It does not validate any live invoice or tenant permissions.

## Canonical status files updated

The audit PR also appends a time-stamped, read-only result to `CURRENT_STATE.md` and `RENDER_STATE.md` rather than overwriting earlier deployment history or claiming that draft PR code was released. No Render service was changed.

## Implementation issues created after the audit

- [#32](https://github.com/PetrFedin/MFW/issues/32) — P0 real authenticated registration/QR/BFS/Made Golden Paths and multi-role isolation; dependent on Phase 0.
- [#33](https://github.com/PetrFedin/MFW/issues/33) — P1 durable pg-boss/outbox worker, multi-consumer and crash/backup replay qualifications; dependent on Phase 0 and Issue #25.
- [#34](https://github.com/PetrFedin/MFW/issues/34) — P1 real-device UX, accessibility and participant execution flow QA; visual work can proceed safely without bypassing the persistence gate.

Quality/accessibility was promoted from P2 to P1 as **P1-19**, because a feature that is technically present but unusable or inaccessible does not pass participant acceptance. All three issue numbers are traced in the JSON matrix.


## Late verification addendum — 2026-10-15 (supersedes earlier source-recovery status)

**Checked independently, read-only:** connected GitHub, Render and MFW Supabase; the actual public site and HTTP health endpoints. This addendum supersedes statements above saying original committed SQL 027 is still missing. No schema, production code, grants, secrets, account data, paid services, or deployment were changed.

| Source | Observed evidence | Production implication |
| --- | --- | --- |
| GitHub | main \`7a2e7b98\`; production platform deploy \`9fd9356c\`; Authority \`b540bf54\`; separate API \`161926f9\` | Recent PR #20/#26/#29/#30/#31 additions are not in live deploys |
| Render | \`mfw-postgres\` free PostgreSQL 17 is **suspended**; Authority live deploy has autoDeploy=no and empty healthCheckPath | Local Render database cannot be assumed active; approved secure DB binding required |
| Public HTTP | Platform MFW, BFS and Made pages return content; Authority \`/health\` reports \`dataMode=memory\` at \`b540bf54\`; \`/health/deep\` returns synthetic self-test PASS; Authority \`/ready\` returns HTTP **503** | UI routing is reachable, durable operations NOT admitted |
| Secondary API | \`https://mfw-api.onrender.com/health\` returned HTTP **503** in this check | This individual URL failed; do not assert the whole service's uptime from one probe |
| Supabase | Connected MFW PostgreSQL 17 reports \`ACTIVE_HEALTHY\`; application \`schema_migrations\` has 27 rows through \`027_outbox_pg_boss_bridge.sql\` | Real existing schema is ahead of canonical main (25), but is not bound to Authority |
| Supabase Auth | \`auth.users=0\`, \`auth.sessions=0\` | No production signed-user registration/role Golden Path can be claimed on this database |
| Supabase jobs | \`authority_outbox=0\`, \`authority_delivery_receipts=0\`; no \`pgboss\` schema | Actual durable job delivery/retry remains unqualified |
| Supabase ACL | 88 public base tables with RLS enabled, 0 base tables directly readable via SELECT by anon/authenticated; **future-object default privileges remain broadly granted** for creators postgres/supabase_admin | Existing grants appear protected; newly created objects remain P0 security risk until reviewed hardening |
| Auth and finance PRs | #30 has four passing scratch/SDK/responsive workflows but remains Draft; #26 modelled investor UI responsive CI passed but remains separate | No real Auth, accepted invoices, bank settlement, revenue or live investor financial claims |
| Recovery PR | Original Git application files: 026 commit \`626a1b86424680c69fc295972ce8f9b4632da46b\` and 027 commit \`105cbc1cd859e67efd027b882372968d71fad42d\`; PR #20 head \`050bc73384d6960827ee78b7d916bbd3b2d1ab95\`, Responsive QA and Isolated PostgreSQL 17 Replay **GREEN** | Source of committed SQL is recovered; exact applied-live SQL provenance, human review and production admission remain HOLD |

**Integration collisions to resolve before merge:**
- PR #26 and #31 both modify \`CURRENT_STATE.md\` and \`mfw/platform/evidence-package.json\`. Merge must preserve investor-model code **and** finance-truth verification boundary.
- PR #20 and #30 both modify \`mfw-api/package.json\`. Reconcile scripts/dependencies and run all tests against the combined tree.
- PR #26 and #30 both modify \`.github/workflows/responsive-qa.yml\`. Preserve BOTH commercial-proof and Auth qualification suites, not one or the other.
- A GitHub mergeable flag or individual GREEN suites do not prove the combined branch is green or the live platform updated.

**End-to-end acceptance not performed by this check:** real signed user login, real payment, genuine event registration/QR check-in, multi-device persistence, cross-tenant denials on production, verified MFW/BFS/brand partner meetings, recovery after restart, and physical-device accessibility. Static/page GET success and synthetic memory-mode deep tests do not satisfy these gates.

**Authoritative next gate:** independently review P0 migration + future-object ACL → securely bind a single already-existing PostgreSQL provider with zero incremental paid resources → exact-main admission \`/ready=200\`, \`dataMode=postgres\` → verified JWT and multi-role real Golden Paths → scratch-to-live jobs/outbox qualification → rebase overlapping feature PRs, full integrated regression/browser/phone QA, and then staged release with rollback.
