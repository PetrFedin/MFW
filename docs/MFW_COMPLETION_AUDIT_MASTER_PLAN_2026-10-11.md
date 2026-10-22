# MFW — Completion Audit & Dependency-Aware Release Plan

**Audit date:** 2026-10-11  
**Scope:** Moscow Fashion Week / BRICS+ Fashion Summit / «Сделано в Москве», unified identity, authority, UX, operations, B2B, CRM, Investor & Capital.  
**Baseline:** `main@161926f9b9795988c3e51f7227f198851be4cfd3`.  
**Status:** AUDIT / PROPOSED WORK; this document does not prove remediation, production admission or browser coverage.  
**Commercial guardrail:** zero new paid infrastructure, no upgrade or new paid third-party dependency without explicit approval. Existing free Render PostgreSQL has `expiresAt=2026-10-30T12:53:29Z`; preserve continuity, plan backup/restore and migration before expiration.

## 1. Rules of evidence and release governance

Feature completion must be assessed at four layers: **UI reachable → API & authorization → durable authoritative database state → restart/second-session/integration E2E**. The presence of a button, mock response, contract test or deployed static content is never a production PASS. Status values: VERIFIED (direct evidence), CODE_PRESENT (source only), DEMO_ONLY, FAIL (reproduced), BLOCKED (prerequisite missing), UNKNOWN (untested), COMPLETE (release admitted with evidence).

One canonical owner per business fact: MFW authority owns identity/registration/agenda/pass/Brand365/CRM, BFS programme/meetings reference shared authority, Made in Moscow is a verified-programme projection linked by **canonical brandRef**, never by name. Owner and Capital reports must distinguish Observed, Reported, Attributed, Incremental, Modelled, Synthetic and Not Evidenced. No UI can infer revenue from views, leads, meeting requests or shortlists.

Evidence per issue: source commit SHA, relevant file paths, test/trace link, database schema/migration version, deployment IDs/SHA, screenshots at seven device sizes, positive and negative tests, owner/reviewer, timestamp, rollback and recovery information. No production secrets, credentials or personally identifying records in issues, logs or screenshots.

## 2. Directly verified findings — 2026-10-11

| ID | Finding | Evidence and meaning | Status |
|---|---|---|---|
| AUD-01 | `main` HEAD `161926f9…`; Render platform and API live at this SHA, Authority live at `b540bf54…`, autoDeploy disabled | GitHub branch + Render deploy records; exact-SHA skew | VERIFIED / FAIL admission |
| AUD-02 | Authority has empty `healthCheckPath`; expected `/ready`; secure database binding and strict guard not verified | Render get/list services + RENDER_STATE.md | BLOCKED P0 |
| AUD-03 | Render free `mfw-postgres` exists (Frankfurt, PG17), external IP allow list is empty; hosted Render SQL cannot connect | Render Postgres metadata; keep network closed | VERIFIED |
| AUD-04 | Supabase MFW `public.schema_migrations`: 27 filenames `001–027` vs 25 repository SQL files; Supabase's own migration history has 28 entries including a separate canonical constraints migration | Supabase read-only SQL and migration list. Identify provenance, checksums, divergent semantics before any DB binding | FAIL parity |
| AUD-05 | Supabase MFW has 88 public tables, all RLS-enabled; 97 event rows, 20 brand rows, zero platform registrations, passes, B2B meetings, leads, verified memberships | Supabase read-only introspection. RLS enabled does not prove effective tenant/role isolation | VERIFIED |
| AUD-06 | Supabase has 6 Capital ledger rows and immutable-ledger trigger, one operator grant, empty outbox/receipts and no `pgboss` schema | Supabase table counts/pg_catalog; ledger identity/evidence and provider-grant safety not qualified | VERIFIED |
| AUD-07 | Root `mfw/index.html` embeds `platform/index.html`, while platform iframe initial src points to `../index.html`. Risk of recursion; PR #22 proposes redirect+frame-ready | GitHub source and PR #22 patch. Smoke browser did not observe a visual crash, but absence of visible crash does not disprove source-level defect | CODE_PRESENT defect |
| AUD-08 | PR #22 exact-head Chromium matrix failed: 28 failed tests, seven device configurations; failures include hidden MFW `#app` and missing deep-linked brand modal | Actions run 38098992881 logs; PR must remain Draft | FAIL |
| AUD-09 | PR #20 migration parity and PR #21 live navigation are Draft, each Chromium device-matrix check PASS on respective heads; neither merged | GitHub check-runs/PR metadata. PR #21 scheduled live workflow is not proven to have run successfully against production | PENDING |
| AUD-10 | Live browser read-only smoke opened root, MFW, BFS, Made; normal 3-way switching and demo onboarding modal visible. Not comprehensive controls, APIs or mobile-Safari QA | Interactive run 78794957-2f39-4bcc-a431-7eebfbe28421 | LIMITED PASS |
| AUD-11 | MFW and BFS frontends contain localStorage/demo state. E.g., MFW `mfwMyEvents`, saved brands, roles; BFS meetings and leads. Deal Room request buttons are disabled. | `mfw/app.js`, `mfw/platform/bfs/app.js`, `mfw/platform/platform.js`. UI values are not synonymous with durable authority | DEMO/INCOMPLETE |
| AUD-12 | `qa/responsive.spec.js` mocks MFW authority responses. Chromium mock coverage is useful but cannot qualify real PostgreSQL, external social, wallets or investor ledgers | test suite and CI workflow source | INCOMPLETE |
| AUD-13 | Made in Moscow Verified production roster is empty and must remain empty until approved official roster & moderation; source has demo slot | Supabase tables, Made partnership plan and runtime source | CORRECTLY GATED |
| AUD-14 | Master plan repeats Partner Data API and Trust Passport blocks, has multiple sections numbered 15, and mixes planned, demo and implemented language | `docs/MFW_INTEGRATION_MASTER_PLAN_2026-10-01.md` | DOCUMENTATION DEBT |

## 3. Execution sequence / critical path (do not skip gates)

### Wave 0 — Baseline, triage and safeguard (P0)
- Freeze business writes and paid provisioning until exact authoritative environment chosen. Label current site `preview/demo` where appropriate; do not confuse green ONLINE dot with PostgreSQL admission.
- Inventory routes/screens/actions across MFW, BFS, Made, Admin, Investor (DOM actionable element ID → handler → endpoint → table → role → tests). Create a machine-readable route/action audit register.
- Record `main` HEAD, PR #20–22 head/base SHA, exact checks, workflow logs, Render deployments, runtime service IDs, differences between Render and Supabase DBs. Identify whether any production-grade data exists in either.
- Fix PR #22 against current main on its branch: remove iframe recursion and guarantee child ready handshake, queue latest route, origin/source allowlisting, correct MFW `#app` visibility and brand deep-link targets. Preserve demo/error UX. New tests must fail before fix and pass after.
- Do not merge Draft PR on the strength of one limited live smoke. Require fully green exact-head CI with existing mocks and live route smoke (separate results).

**Gate 0:** every root entry path loads exactly one platform shell; MFW/BFS/Made selected child renders exactly one real app; switching back/forth, deep-links and reloads preserve intended route; no exception/overflow across 7 viewports.

### Wave 1 — Migration parity and durable data admission (P0)
- Compare repository SQL `001–025` to Supabase `public.schema_migrations` `001–027`; retrieve original `026_postgres_conflict_constraints.sql` and `027_outbox_pg_boss_bridge.sql` from approved history, cross-reference `supabase_migrations` entry `028_canonical_026_postgres_conflict_constraints`, object definitions, migration checksums, ordering, idempotence and schema fingerprints.
- PR #20's exact-set check is the basis; extend it to checksum, duplicate, unexpected and equivalent-prefix cases; no deleting unknown applied migrations just to turn readiness green.
- Decide **one** authoritative DB, Render or existing free Supabase. Never dual-write/automatically synchronize independent DBs. Render internal URL only if existing Render DB is chosen; otherwise server-only Supabase DSN over validated TLS/private secret, without publishing credentials.
- Make an offsite verified logical backup; restore into **isolated disposable target**, compare schema and representative data/checksums, measure recovery. Respect zero-cost limit; if isolated restore cannot be tested at zero incremental cost, hold production and say so.
- Bind database secret through supported secure dashboard/Blueprint mechanism; never export to chat or GitHub, and never open Render external IP allowlist. Deploy one exact SHA, reconcile `healthCheckPath=/ready`, turn on strict `MFW_REQUIRE_POSTGRES=true` **only after valid connection**, validate schema, `/ready=200`, `dataMode=postgres` and `/health/deep`.
- Golden paths: login, role/registration, agenda conflict, QR issue/verify/replay/revoke, brand follow/favorite/loyalty, meeting/lead, Capital read/verify (write tests exclusively in safe isolated environment). Restart + new-browser-session survival.

**Gate 1:** canonical complete migrations with provenance; backup/restore proof; strict Postgres-ready and exact-SHA Render admission; no in-memory fallback; stale state fails closed. No real pilot while gate closed.

### Wave 2 — Identity, permissions, true transactions (P0)
- Build identity/role matrix Visitor/Buyer/Delegate/Designer/Brand/Staff/Organizer/Media/Partner/Owner/Capital Operator; one person, separate MFW/BFS registration and Made residency status.
- Server profile, verified login/social provider flows (where credentials/approval exist), session revocation, audit, consent and purpose, account recovery, role onboarding. No demo name/role may silently upgrade real entitlements.
- Replace local client authority for registration, agenda, BFS meeting/lead, follows, rewards and confirmed pass with server read/write states; client cache only for permitted UX, never trusted as state source.
- Every write with idempotency, access scope, conflict/retry validation; distinguish `submitted`, `approved`, `rejected`, `waitlisted` and `not submitted`, show clear pending/error states.
- Role-aware API deny tests, same-user across devices, login/logout, expiring token, stale revocation and cross-brand access denial.

**Gate 2:** at least one complete E2E verified non-demo user path on admitted database for each authorized role; deny cases and reload durability pass.

### Wave 3 — Durable background operations, monitoring and safety (P0/P1)
- Transactional outbox (already present in Supabase but empty) → background worker / pg-boss, with separate migrations/history and explicit queue lease/claim; derive payload from canonical IDs and reload state.
- Jobs: agenda reminders, schedule-change notifications, campaigns, social reverification, pass refresh, invite/waitlist, follow-up and partner evidence aggregation.
- Retry/backoff, dead-letter/re-drive UI, idempotency, no duplicated sends/redemptions, no lost jobs after restart and free-tier sleep catch-up semantics.
- Structured audit/telemetry with correlation IDs, error tracing, privacy-safe operational console.
- Free-tier limitations: no guarantee of exact wall-clock execution during Render free-service sleep; choose eventual catch-up or independently verified no-cost scheduler, document SLA.

**Gate 3:** durable replay/retry after restart, no double processing, negative provider/queue outage tests green.

### Wave 4 — UX and accessible responsive rebuild (P0/P1)
- Single navigation pattern with distinct branded MFW/BFS/Made surfaces and persistent back, Home, Today, Search, Agenda, Access, Profile. Remove recursive iframe architecture debt without changing brand identity.
- Audit all clickable control types, tabs, drop-downs, drawers, modal focus/escape, scroll locks, safe-area, touch targets, keyboard and screen reader labels.
- Design empty/loading/error/denied/offline/waitlist states; separate demonstration view from real user. Show outcome and next recommended action on every user-facing form.
- Device matrix: 360×800, 375×667, 393×852, 430×932, 744×1133, 1024×1366, 1440×900; actual iPhone Safari + iPad Safari manual qualification remains separate.
- Russian default, EN supported; abbreviations explained, no uncontrolled mixed RU/EN, locale survives switch/reload. Media rights, lazy-load, no full-size overflows, basic page-speed budgets.
- Make participant Home and `Сейчас` useful: current status, next show/session, saved agenda, pass/entry, event change, recommended brand; do not use synthetic counters as real data.

**Gate 4:** 100% of inventoried reachable actions have outcomes, no blank pages or trapped dialogs; visual evidence and manual usability acceptance per role.

### Wave 5 — Real operational journeys (P1)
**MFW:** publish approved programme/version; designer → brand → show → collection/look → saved look/shortlist → official replay → follow → Brand365. Restrict real products, prices, media/stream rights to approved sources. Real schedule change updates agenda/reminders.

**BFS:** organization/speaker/session/topic → registration/QR → agenda → follow → bilateral meeting availability + accept/cancel/reschedule → follow-up → lead. Account/meeting survives hard reload. Do not equate requested meeting and completed meeting.

**Made:** independent roster admission and moderation → Verified badge on canonical `brandRef` → Hub → Digital Market/Showroom → Buyer Bridge → meeting → Brand365 → scoped partner dashboard. Missing official roster => empty Verified list with honest explanation, never inferred badge.

**Admission & QR:** access level, entitlement, short-lived signed current credential, clock-skew handling, scanner offline policy, duplicate/stale/revoked checks, staff incident flow and waitlist releases. Printed/static Apple Wallet badge never becomes a permanent gate bypass.

**Gate 5:** critical Golden Paths passed on exact deployed backend, two devices, two sessions and roles, with evidence.

### Wave 6 — Brand365, CRM/CDP and business value (P1)
- Consent-backed follow/favorite, verified 30+/60+ durations, reward offer/claim/one-time redeem with negative double-redemption tests.
- Scoped brand audiences, campaigns, frequency caps, segment composition, control/holdout, journeys and delivery receipts; lawful consent and unsubscribe.
- POS import: source contract, idempotent batch, product/order identifiers, duplicates, returns/adjustments, event-time and proof; no synthetic purchase treated as actual.
- KPI formulas and denominators: audience, D7/D30/D90/D180/D365 retention, cohort LTV, repeat rate, RFM, incremental sales vs merely attributed sales, contribution margin, CAC/payback and data freshness.
- Owner Control Tower aggregates only source-backed numbers with source links and no cross-brand privacy leakage.

**Gate 6:** a fully traced source purchase/import/attribution path and controlled campaign with inspectable uncertainty, permissions and reconciliation.

### Wave 7 — Investor/Capital governance and sponsor business (P1)
- Preserve immutable `capital_ledger_events`, event hash chain, actor, grant, evidence refs, programme-grain projection and no mixed-hierarchy double counting.
- Investigate 6 existing Supabase capital ledger rows; do not rewrite immutable history. Use isolated test environment for negative writes, overcommit, release-after-stop and concurrency replay.
- Wire Investor proposal → committee decision → request → approval → commitment → release → spend → measurement → SCALE/ITERATE/STOP only after formal authority and jobs; keep `MODELLED/SYNTHETIC` visibly separate.
- Sponsor package → contracted inventory → delivery/evidence → approved measure/acceptance → renewal; avoid asserted revenue without contract/invoice/payment proof.
- Step-up auth for Owner/Capital high-risk actions and safe reviewer/4-eyes workflow.

**Gate 7:** capital admission, independent ledger replay, source-backed sponsor evidence, scope negative tests all PASS on exact release SHA.

### Wave 8 — Prioritized product extensions (P1/P2)
Order by prerequisites, not marketing appeal:
1. Unified discovery: native SQL first, optional independently hosted Meilisearch index as rebuildable projection; search indexing from outbox and private/public scoping.
2. Agenda ICS export, stable UIDs/sequence/cancellations, no duplicate calendar authority.
3. Programme Production Desk and speaker/submission workflow (BFS first), versioned publish.
4. Real LIVE/HLS/replay adapter and captions; source/provider licensing, downtime fallback, player analytics.
5. Runway look timeline + reviewed transcripts and searchable replay, only after assets and stable look IDs.
6. B2B Deal Room: real bilateral permissions, request taxonomy, documents/expiry, approval and external handoff; existing preview buttons remain disabled until durable commercial lifecycle.
7. Meet-slot availability and deterministic matchmaking with human acceptance, fairness guard and explainable criteria.
8. Media rights/embargo/press kit, venue map/capacity/incident operations, signed Apple Wallet derived pass.
9. Contextual Q&A/polls, surveys, moderated interactions, explanation/consent, archival links to replay.
10. Organisational Trust Passport key lifecycle/status list/revocation, optional verified credentials and federation; no opaque universal score.
11. Partner API/webhooks/developer portal, privacy-safe industry benchmarks only with adequate cohort threshold and permissions.
12. External CMS, experimentation, advanced recommendation providers and optional adapters **only when existing native contours are proven insufficient and free-tier limits are verified**.

### Wave 9 — Launch/release operations (P0 final gate)
- Minimum complete pilot set: 1 real registration, 1 credential issue/check-in/revoke, 1 published agenda change, 1 approved brand + follow/reward, 1 confirmed BFS meeting + lead, 1 approved Made roster status where official input is available, 1 CRM campaign and attribution with independently supported outcome, plus read-only Capital ledger verification.
- CI: exact SHA, deterministic contract tests, real API DB tests, mobile/browser E2E, security regression, build, accessibility, performance and screenshots.
- Run restore drill, restart/load/rollback/cold-start, incident runbooks and metrics dashboards; no leaks, no silent success.
- Publish one admitted SHA only after all critical gates pass; write release receipt into `CURRENT_STATE.md`, `RENDER_STATE.md`, `RELEASE_LOG.md`. Mark blocked external credentials/roster honestly; this may remain a limited pilot rather than full public launch.

## 4. Feature completion matrix (UI → API/data → acceptance)

| Domain | User-visible entry | Required authority / integration | Mandatory proof | Audit state |
|---|---|---|---|---|
| Global shell | MFW/BFS/Made switcher, Home | frame/router, canonical deep links | root + 3-way switching + brand link across devices | FAIL PR22 |
| One ID | Profile, login, registration | users/profiles/sessions/roles; MFW/BFS registration | 2 sessions, reload, separate status, deny cross-role | UNVERIFIED |
| MFW programme | Today, show, designer, collection/look | published event/brand/collection IDs | exact ID, version, schedule-change alert | PARTIAL |
| BFS programme | session, speaker, organization | programme authority, publication | session/room/speaker consistency and replay flags | PARTIAL |
| Personal Agenda | add/remove, conflicts, reminders | user_agenda + notification jobs | conflict, DST, changes, reload, due-state | PARTIAL |
| Pass / Scanner | QR Wallet, check-in | event registration+entitlement+signed token+revocation | stale/replay/revoked/offline and restart | UNVERIFIED |
| Discover | Search/For You | canonical public read models, recommendation fallback | facets and private-data denial | PARTIAL |
| MFW Buyer | shortlist/look, meeting | brand/look/line_sheets, B2B events | no fake product/order, stable IDs | PARTIAL |
| BFS Buyer | B2B meetings, lead | b2b_meetings/b2b_leads, actor/scope | request → acceptance → completion → lead | DEMO/local |
| Made Verified | verified roster/Hub | partner membership/moderation, brandRef | verified-only official roster, empty state | BLOCKED |
| Brand365 | follow/favorite/reward/QR | brand follows, verified social, loyalty/redeem | 30-day proof, double redeem denial | UNVERIFIED |
| CRM/CDP | audiences, segments, campaigns | consent, import, delivery, cohorts | negative ACL, attribution and purchase proof | UNVERIFIED |
| Media | LIVE/Replay/look/press | provider, rights, asset versions | buffer/failure, rights, no demo stream passing as live | DEMO/partial |
| Admin | approval, moderation, operations | granular roles, audit, event state | every privileged action and negative role | UNVERIFIED |
| Sponsor | sponsor inventory/evidence | contract/delivery/measurement | evidence and finance reconciliation | DEMO/partial |
| Owner | Control Tower, KPI, reports | governed observed/attributed/incremental read models | source/denominator/truth/freshness/tenant isolation | PARTIAL |
| Investor | demos, dossiers, scenarios | modelled scenarios + evidence ledger | SYNTHETIC never called production | DEMO |
| Capital | committee, ledger, grants | immutable Capital Authority, real operator | hash replay, idempotent event, policy and projection | BLOCKED |

## 5. Exact short-term PR order

1. Inspect & repair **#22** CI failures on branch: tests for root initial frame, app visibility, brand direct link, race and trusted message origin. Do not merge red head; preserve backwards deep links and same-origin security.
2. Rebase **#21** and run **live** against exact deployed SHA. Its ordinary mock Chromium check being green is not proof the live workflow succeeded.
3. Merge **#20** only when exact-head tests and manual migration review pass. Then recover source/checksums for `026–027` and distinguish Supabase's extra `028` migration record from canonical files.
4. Decide authoritative DB and secure secret binding. No public Render DB access. Keep Render free database expiry visible. Backup & isolated restore before any migration/switch.
5. Admit strict PostgreSQL exact SHA, `/ready`, dataMode/schema/Golden Paths. Restore repeatability proof.
6. Execute action inventory and patch local/demo workflow discontinuities; every subsequent PR includes live integrated E2E and device screenshots.
7. Workers/jobs and policy, then complete functional waves 5–7. Only after those introduce wave 8.

## 6. Security and zero-cost constraints

- No payment/paid resource creation, no adding separate premium databases, no synthetic actual revenue/registrations, no publishing secret DSNs.
- No cross-project database reuse. Existing Render and Supabase are **separate MFW candidates**, never treat them as magically synchronized; compare before choosing.
- Zero incremental spend does not imply continuous uptime, free backups, unlimited storage, reliable uninterrupted cron or external email/social/video provider rights. Admit such limits explicitly rather than disguising them.
- Free Render PostgreSQL expires 2026-10-30 per current control plane. Choose retention/backup strategy now; production cannot depend on unproven automatic extension.
- Account/registration/pass/grant/privacy flows must fail closed when authoritative state unavailable. Read-only public catalogue may degrade gracefully with freshness labels.
- Verify external licensing (streaming, imagery, map tiles, providers), privacy regulation and event rights before publication.

## 7. Defects and ambiguities to resolve before implementation

- PR #22 posts `mfp-frame-ready` after Made IIFE termination; verify sender origin and state initialization. Existing regression tests assert hidden `#app` visible without explicitly completing onboarding; distinguish legitimately hidden onboarding from blank load.
- Browser normal-navigation smoke PASS conflicts with 28 PR22 tests failing; produce exact route/iframe tree trace and test contract corrections, not blind test weakening.
- Brand graph/timeline source exists, but QA tests use mocked brand with arbitrary metrics; these are not proof of real 30-day qualified followers, transactions or Made residency.
- Split RLS-enabled from RLS-enforced and validated. Run cross-tenant/role negative cases with non-owner/non-bypass role and verify service-role paths.
- Distinguish `public.schema_migrations` (app history) from `supabase_migrations.schema_migrations` (Supabase history); compare semantics, hashes and object definitions.
- Existing `CURRENT_STATE.md` has a consolidated header dated 2026-10-03 plus newer appended entries; move to one maintained canonical status table after remediation.
- Master plan duplicates Partner API and Trust Passport sections (first at ~1653/1766, repeated at ~2020/2133). De-duplicate logically while preserving full requirements/history, fixing section IDs and linking to this gate plan.
- Remove invented placeholder "live" media/counters only from real surfaces; keep separated explicit investor demo mode as a valid design feature.

## 8. Acceptance scorecard & traceability

For each delivered issue attach:
- **UI** route and screenshot on 7 viewports; keyboard, contrast, RU/EN and clear state transitions.
- **API** exact method/path, authorization scope, error semantics, request id and idempotency.
- **Storage** canonical table/row identity, migration digest, restart/second-session proof and selected DB identity.
- **Negative** unauthorized role/brand, stale/duplicate/replay/provider outage, lost network and recovery.
- **Operation** exact Git commit, PR checks, Render deploy IDs and health/ready receipts; no major divergence from main.
- **Business** source-backed outcome or explicit NOT EVIDENCED/SYNTHETIC label, measurable KPI definition and audit link.

Current release verdict is **NOT PRODUCTION ADMITTED**. Keep production business writes, verified roster issuance, Capital releases and business KPI claims gated until these proofs exist.

## 9. Sources checked directly

- Repo: https://github.com/PetrFedin/MFW
- MFW master plan: https://github.com/PetrFedin/MFW/blob/main/docs/MFW_INTEGRATION_MASTER_PLAN_2026-10-01.md
- Current state: https://github.com/PetrFedin/MFW/blob/main/CURRENT_STATE.md
- Render snapshot: https://github.com/PetrFedin/MFW/blob/main/RENDER_STATE.md
- PRs: https://github.com/PetrFedin/MFW/pull/20 ; https://github.com/PetrFedin/MFW/pull/21 ; https://github.com/PetrFedin/MFW/pull/22
- Failed exact-head QA: https://github.com/PetrFedin/MFW/actions/runs/38098992881
- Production site: https://mfw-platform.onrender.com/
- Supabase MFW project (connected read-only audit): project ref `yiiylfzwfpicrzpbgazl`, 2026-10-11 queries `public.schema_migrations`, counts, RLS and catalog/pgboss.

