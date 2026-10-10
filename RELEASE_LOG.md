# MFW release log

This is the canonical handoff log for development waves.

## 2026-09-30 — Repository consolidation

**Status:** repository consolidated

- Canonical repository established: `PetrFedin/MFW`
- Complete current product tree synchronized into `main`
- Included `mfw/`, `mfw-api/`, `mfw-native/`
- PostgreSQL migrations through `016_brand_cdp_state_machine.sql`
- Current owner/investor layer: Owner Control Tower
- Current CRM/CDP layer: journeys, incrementality, RFM, churn, CLV, acquisition economics
- Current Render live contour documented in `RENDER_STATE.md`
- Legacy Render services still source `PetrFedin/Moscow:mfw-app`; canonical replacement is `PetrFedin/MFW:main`

### Development continuation point

Next wave:

- ecosystem economics
- contribution margin
- LTV curves
- acquisition payback
- revenue share
- sponsor economics
- network effects
- opening/closing audience asset bridge
- 12/24/36 month scenarios

## Logging standard

Every meaningful development wave should add:

- date
- exact Git commit
- major features completed
- migrations added
- Render deploy ID/status
- verification performed
- unresolved blockers
- next continuation point


## 2026-09-30 — Dedicated MFW PostgreSQL provisioned

**Status:** database available; declarative wiring committed

- Created dedicated Render PostgreSQL `mfw-postgres`
- Render ID: `dpg-daugci8jo6nc738akc10-a`
- PostgreSQL: 17
- Region: Frankfurt
- Plan: Free
- Database: `mfw_postgres`
- Canonical Blueprint now declares the database and wires `DATABASE_URL` using `fromDatabase`
- Authority Blueprint now runs `npm run migrate` as `preDeployCommand`
- Authority target invariant: `MFW_REQUIRE_POSTGRES=true`
- Social reverification uses the same canonical database connection
- Blueprint commit: `4efc8dce6b5a6a56098931195047314a1b9b7341`

### Verification still required

The already-created direct Render services do not automatically adopt new Blueprint-only wiring. Before declaring PostgreSQL production authority, verify the Blueprint-managed service/environment or wire the existing authority service through Render Dashboard without exposing the database credential.

Required proof:
`migrations 001-016 → /health dataMode=postgres → schema ready → Golden Path → social reverification`.


## 2026-09-30 — MVP persistence wave 017

**Git exact head:** `8d4cfaf237af966967a911ead129f82a7aab0237`

Completed:
- added migration `017_mvp_persistence.sql`;
- added persistent `user_agenda` with reminder configuration;
- added persistent `b2b_meetings` and immutable `b2b_meeting_events`;
- event registration/cancellation now use PostgreSQL when authority is in postgres mode;
- B2B meeting creation now uses PostgreSQL when authority is in postgres mode;
- added `GET /v1/agenda`, `POST /v1/agenda/:eventId/save`, `DELETE /v1/agenda/:eventId`;
- schema readiness now requires the new MVP persistence tables.

Render exact-head proof:
- `mfw-platform`: deploy `dep-daulmvu0tbcc73bpeb90` — **live**
- `mfw-api`: deploy `dep-dauln10jo6nc73dm6r6g` — **live**
- `mfw-authority`: deploy `dep-dauln3142hec73ev75pg` — **live**
- all three deployed exact commit `8d4cfaf237af966967a911ead129f82a7aab0237`;
- authority deep self-test: **PASS**;
- authority remains `dataMode=memory` because the direct-created service has not yet received `DATABASE_URL`;
- social reverification remains inactive with reason `postgres_required`.

Infrastructure defect:
- services report `autoDeploy=yes`, but commits after initial provisioning did not automatically create deployments;
- exact-head deployment therefore had to be triggered via Render API;
- treat auto-deploy webhook as unproven until a later commit produces a deploy without manual/API trigger.

Next gate:
- apply the canonical Blueprint or otherwise securely wire `mfw-postgres` to `mfw-authority`;
- migrations 001-017;
- `dataMode=postgres`;
- schema readiness PASS;
- PostgreSQL golden paths;
- social reverification active;
- only then call persistent MVP authority production-ready.


## 2026-09-30 — Persistent identity / registrations MVP

**Exact deployed commit:** `f201fd66a875a2b701abd8a6f690687b169624d6`

Completed:
- migration `018_identity_interests_registration.sql`;
- migration `019_platform_registrations.sql`;
- persistent profile / primary role authority;
- persistent explicit user interests;
- separate MFW/BFS platform registration authority;
- platform registration types and review status;
- platform vs programme registration split;
- server-side personal agenda conflict detection;
- account drawer syncs profile and MFW/BFS registrations to canonical authority;
- MFW frontend migrated from legacy `moscow-fashion-week-authority` to `mfw-authority`;
- interaction contract rejects legacy Moscow authority URL.

Render exact-head proof:
- platform deploy `dep-daum268jo6nc73dne1a0` — LIVE;
- API deploy `dep-daum28btqb8s73btcc4g` — LIVE;
- authority deploy `dep-daum29k1nsns73eqtrs0` — LIVE;
- authority deep self-test — PASS;
- current authority persistence — `dataMode=memory`;
- social reverification — inactive / `postgres_required`.

Auto-deploy:
- confirmed broken/unproven: the commit did not create deploys automatically despite `autoDeploy=yes`;
- exact-head deployment was triggered via Render API.

Current persistence gate:
`mfw-postgres → DATABASE_URL → migrations 001-019 → schema PASS → dataMode=postgres → PostgreSQL Golden Paths → social reverification → MFW_REQUIRE_POSTGRES=true`.

## 2026-10-02 — Responsive exact-head recovery and Phase 0 admission contract

### Responsive live recovery

Verified exact responsive commit:
`850a13bbce33a720a9bff635f606e3e4fbc6f19d`

Render workspace: `ME`.

Forced exact-head deploys were required because no automatic Render deploys had been created after 2026-09-30 despite `autoDeploy=yes`.

Deploys:
- platform: `dep-davfr91srm7s73brfahg` — LIVE;
- authority: `dep-davg00k9v7es73flrcr0` — LIVE;
- API: `dep-davg016k1f9s73a6ckag` — LIVE.

Verification:
- public platform serves responsive CSS revision `r3`;
- responsive device matrix: 35/35 PASS;
- authority deep self-test: PASS;
- API and authority both reached LIVE on exact responsive SHA.

### Phase 0 production admission hardening

Added:
- fail-closed `GET /ready`;
- Render release SHA projection;
- memory-mode readiness regression test;
- strict-mode missing-DB regression test;
- exact-SHA production-admission checker;
- Phase 0 CI workflow;
- dedicated admission runbook.

Durability remains **BLOCKED**, not failed:
- existing `mfw-postgres` is available;
- direct-created authority still lacks secure `DATABASE_URL` binding;
- current live authority therefore remains `dataMode=memory`;
- social reverification remains inactive.

Next gate:
`secure DB binding -> MFW_REQUIRE_POSTGRES=true -> migrations 001-020 -> schema PASS -> /ready 200 -> PostgreSQL Golden Paths -> reverification active`.

### Stateless rollout boundary

Implemented from Master Plan §11.3 without bypassing the Phase 0 durability gate.

Added:
- native OpenFeature-compatible boolean evaluation boundary;
- deterministic percentage rollout by stable targeting key;
- explicit MFW/BFS and server-session role scoping;
- provider-error fallback;
- fail-closed defaults;
- hard prohibition on rollout flags for QR/check-in, credentials/revocation, consent, authorization, eligibility, payment and financial/attribution truth;
- `GET /v1/features` marked as UI rollout only / not authorization;
- module and live-authority API regression tests.

No external flag provider is authoritative. No new persistent state was introduced.

## 2026-10-02 — Free-tier reverification and Blueprint contract

**Constraint:** no paid Render resources.

Completed:

- removed the dedicated Render social-reverification Cron from the canonical Blueprint;
- added `reverification-catchup.js` with stale-aware restart/wake policy;
- authority now serialises reverification execution to prevent overlapping interval/catch-up runs;
- startup checks the latest persisted completed run before deciding whether catch-up is due;
- added catch-up regression contract to the foundation CI;
- aligned Blueprint env names with the variables actually read by `server-v2.js`;
- removed obsolete/mismatched secret names;
- added a Render Blueprint regression contract that fails if a dedicated Cron is reintroduced or env contracts drift.

Master-plan review performed against the commits adding:
- Section 13 — unified discovery + ICS agenda portability;
- Section 14 — moderated Q&A/polls + replay bridge.

Those additions remain roadmap-approved but dependency-gated.

Phase 0 remains blocked only by secure injection of the existing `mfw-postgres` connection into the already-created `mfw-authority` runtime.

## 2026-10-02 — Third ecosystem: «Сделано в Москве»

Implemented as a third branded direction of Moscow Fashion Platform:

- shared switcher: MFW ↔ BFS ↔ Сделано в Москве;
- shared account access without a second consumer profile;
- dedicated responsive Made in Moscow partner experience;
- six-module product surface: Verified / Hub / Digital Market / Buyer Bridge / Brand365 / Evidence;
- investor route updated from two to three ecosystem directions;
- MFW brand-card support for a verified Made in Moscow badge;
- BFS organisation/speaker/delegate surfaces can project the badge only through explicit `brandRef` to a canonical verified Brand; no name-based inference;
- badge is fail-closed: no verified roster means no real-brand badge;
- migration 021 adds generic partner-program membership plus scoped service-application moderation;
- public aggregate endpoints prepared for Made in Moscow overview and verified brands;
- responsive QA extended to the third experience.

Production truth remains gated by Phase 0 PostgreSQL admission and an approved external roster/data contract.

## 2026-10-03 — Premium participant companion / PWA

Added a pre-Phase-0-safe participant layer:

- global Discover over published MFW/BFS snapshot entities and verified Made in Moscow roster projection;
- Plan / Discover / Connect / Access companion routes;
- Ctrl/Cmd+K command access to Discover;
- direct PWA shortcuts for all three ecosystem directions;
- network-state indicator;
- branded offline fallback;
- service-worker public-shell caching only;
- no offline authority for registration, QR/pass, LIVE, meetings, wallet or Verified state;
- new responsive/device contract.

Evidence:
- Phase 0 fail-closed contract: PASS;
- responsive/device agents: **56/56 PASS**;
- tested viewports: 360×800, 375×667, 393×852, 430×932, 744×1133, 1024×1366, 1440×900.

## 2026-10-03 — Deal Room preview + lifecycle participant mode

Implemented without bypassing the PostgreSQL production gate:

- Buyer / Brand Deal Room read-only preview;
- five-stage commercial follow-up path;
- eight structured buyer request types;
- private-document categories;
- Observed / Reported / Verified commercial evidence classes;
- no writable commercial form and no persisted wholesale/order state;
- lifecycle-aware Now: Before / Live Days / After Event;
- post-event continuation into Discover, Brand365 and commercial follow-up;
- replay shown as confirmed only from explicit media state;
- lifecycle agent tested in both current post-event and frozen live-day states.

Evidence before final cache rotation:
- Phase 0 fail-closed contract: PASS;
- Deal Room responsive wave: 63/63 PASS;
- lifecycle responsive wave: 77/77 PASS;
- complete matrix: 360×800, 375×667, 393×852, 430×932, 744×1133, 1024×1366, 1440×900.

Final participant shell cache revision: `mfp-shell-2026-10-03-p2`.

## 2026-10-06 — Investor demo media system

Completed a presentation-focused, pre-Phase-0-safe visual wave:

- centralized MFW / BFS / Made in Moscow media manifest and provenance document;
- current MFW editorial imagery distributed across distinct storytelling slots;
- MFW official-video links surfaced separately from the technical demo stream;
- BFS editorial media deck with its own international/business visual language;
- Made in Moscow editorial hero/story layer with explicit no-Verified-inference boundary;
- shared three-ecosystem investor gallery and cross-platform value bridge;
- PWA cache revision rotated to `mfp-shell-2026-10-06-i1`;
- responsive QA now checks that investor ecosystem media is present and non-duplicated.

Remote public assets remain source-owned. Commercial/public campaign reuse requires rights confirmation; the demo does not claim a licence.

## 2026-10-06 — Trust Passport preview

Added a read-only defensibility layer to the investor MVP:

- Trust Passport Hub tab;
- explainable credential dimensions instead of one score;
- explicit no-history state principle;
- prohibited inference categories called out in-product;
- eight-step guided investor demo now includes the trust/credential moat;
- responsive QA covers the trust preview.

No portable credential is actually issued by this preview and no production trust decision is made client-side.

## 2026-10-06 — Investor proof operating layer

Added the next investor-MVP wave:

- shared investor proof model;
- live-proof vs clearly labelled synthetic demo case;
- nine-stage evidence chain through D365;
- Partner / Sponsor Console preview;
- Brand Business Cockpit preview;
- buyer conversion funnel;
- investment/economics dashboard with payer/product/formula/revenue-gate;
- machine-readable evidence package manifest;
- guided investor route expanded to 12 steps;
- responsive QA coverage for all new surfaces.

No synthetic/modelled value is treated as production KPI or realised revenue.

## 2026-10-06 — Evidence Control Tower

Upgraded Investor Proof into a two-mode Evidence Control Tower:

- Case Dossier with three synthetic buyer x brand journeys;
- per-transition reason, evidence class and evidence reference;
- explicit potential revenue-stream mapping;
- Portfolio View across eight funnel stages;
- ecosystem contribution for MFW / BFS / Made in Moscow;
- D30 / D90 / D365 retention;
- evidence mix and revenue-surface touch map;
- responsive QA for live/synthetic separation and portfolio truth boundaries.

No synthetic portfolio count is presented as production performance.

## 2026-10-06 — Filterable Portfolio Control Tower

Added multi-dimensional investor analytics filters to Portfolio View:

- period / ecosystem / buyer market / brand category;
- buyer type / evidence class / retention horizon / revenue surface;
- deterministic recalculation from the synthetic cohort cube;
- synchronized funnel, ecosystem mix, retention and revenue-surface views;
- zero-state handling for unsupported filter combinations;
- responsive QA for filtered calculations and reset behavior.

All filtered values remain synthetic scenario data and are not production KPI.

## 2026-10-06 — Comparison / Scenario Mode

Added side-by-side investor scenario comparison:

- independent A/B filter sets;
- MFW vs BFS preset;
- CIS vs GCC preset;
- new vs returning preset;
- conversion, retention and revenue-evidence rates;
- percentage-point deltas;
- responsive comparison layout;
- Russian-first Control Tower labels and filters.

All comparison outputs remain deterministic synthetic scenario metrics, not production KPI or causal conclusions.

## 2026-10-06 — Opportunity Explanation Engine

Added decision-support explanations to Comparison Mode:

- largest funnel gap detection;
- six-stage gap ranking;
- category and market decomposition;
- composition/mix vs within-segment contributions;
- D30/D90/D365 retention explanation;
- representative dossier evidence links;
- explicit inspect-next recommendation for the selected bottleneck;
- responsive QA for the explanation layer.

All outputs are synthetic descriptive analysis, not causal claims or realised economic impact.

## 2026-10-06 — Recommendation / Capital Allocation

Added a modelled investment decision layer to Comparison Mode:

- six-item intervention catalog mapped to the funnel;
- deterministic opportunity scoring;
- top-three intervention ranking;
- 100-point normalized pilot resource allocation;
- target scenario and strongest segment driver;
- KPI and modelled pilot target;
- evidence gate per intervention;
- owner and pilot design;
- representative dossier links;
- Pilot / Measure / Verify / Scale-or-Stop governance;
- QA asserting three recommendations and exactly 100 allocated points.

The allocation is a transparent scenario model, not a monetary budget or realised ROI forecast.

## 2026-10-06 — Investment Committee Workspace

Added the final governance loop to the investor MVP:

- recommendation opens directly into a mini business case;
- owner / budget request / baseline / modelled target / evidence plan;
- demo approval and pilot state machine;
- deterministic synthetic measured result;
- SCALE / ITERATE / STOP decision logic;
- evidence-completeness gating;
- current-session decision log;
- guided investor route extended through the committee workspace;
- PWA cache rotated to p2;
- QA updated to use scoped/exact selectors after Russian-first UI changes.

Committee actions are demo-only and are not production corporate approvals.

## 2026-10-06 — Programme Capital Control

Added portfolio-level capital governance:

- 150-point modelled programme envelope;
- requested / approved / committed / spent / measured / scaled / stopped states;
- MFW / BFS / Made capital allocation views;
- blocker and evidence-completeness views;
- strict separation of uncommitted reserve and committed-but-unspent capital;
- explicit STOP commitment release before reallocation;
- reallocation capacity calculation;
- guided investor route extended to 15 steps;
- responsive QA for programme totals and release semantics.

No programme values are represented as real currency or accounting records.

## 2026-10-06 — Capital Reallocation Optimizer

Added gate-aware programme reallocation decision support:

- 10 / 20 / 30 modelled-point tranche comparison;
- MFW / BFS / Made alternatives;
- capital-at-risk relief;
- modelled KPI lift;
- evidence readiness;
- absorption caps;
- READY / CONDITIONAL / HOLD gates;
- next-tranche evidence requirements;
- recommendation candidate for Investment Committee;
- explicit linkage to current reallocation capacity;
- responsive QA;
- PWA cache rotated to p3.

Optimizer outputs are model assumptions, not approvals, guaranteed KPI uplift, currency or ROI.

## 2026-10-06 — Portfolio Scenario Simulator

Added portfolio-mix optimization above the single-destination capital optimizer:

- 10 / 20 / 30-point programme budget simulation;
- MFW / BFS / Made / Reserve combinations;
- explicit Reserve-only and partial-Reserve scenarios;
- HOLD exclusion before ranking;
- CONDITIONAL committee gating;
- absorption-cap enforcement;
- ranking by risk reduction / KPI leverage / evidence confidence / diversification / optionality;
- top-scenario recommendation and rationale;
- responsive QA;
- PWA cache rotated to p4.

The simulator is modelled decision support only and does not approve capital or forecast realised ROI.

## 2026-10-06 — Portfolio Proposal Handoff

Connected Portfolio Scenario Simulator to Investment Committee Workspace:

- best mix can open as a Portfolio Allocation Proposal;
- DRAFT -> IN_REVIEW -> APPROVED_DEMO demo flow;
- proposal includes allocation mix, score, risk relief and KPI leverage;
- no automatic commitment is created;
- responsive QA added;
- PWA cache rotated to p5.

Portfolio proposal approvals remain demo-session state only.

## 2026-10-06 — Immutable Capital Authority

Added the enterprise capital authority foundation:

- migration 023_capital_authority.sql;
- append-only capital_ledger_events;
- DB trigger blocking UPDATE / DELETE / TRUNCATE;
- per-aggregate sequence and SHA-256 hash chain;
- concurrent idempotency protection with advisory transaction lock;
- non-demo Organizer/Staff actor requirement;
- PostgreSQL-only fail-closed API;
- request / approval / commitment / release / spend / measurement / decision events;
- server-side capital state invariants;
- ledger / projection / chain verification endpoints;
- capital authority contract test;
- mfw-api foundation checks added to PR CI.

No frontend modelled capital value is promoted to production truth by this change alone.

## 2026-10-06 — Capital Operator Admission

Added migration 024_capital_operator_admission.sql and production-oriented operator admission:

- durable Organizer/Staff capital grants;
- active / suspended / revoked lifecycle;
- optional grant expiry;
- appointment evidence refs;
- non-default secure admin bootstrap requirement;
- persisted 4-hour operator sessions;
- per-request grant + user + session revalidation;
- session revocation on grant suspension/revocation;
- demo sessions cannot self-elevate;
- normalized PostgreSQL-only fail-closed responses;
- Idempotency-Key and X-Request-Id allowed by CORS for ledger clients.

Final enterprise IAM / SSO is still a later production hardening layer.

## 2026-10-06 — Capital Authority admission checker

Added read-only production admission tooling for Capital Authority:

- exact SHA check;
- migrations 023/024 check;
- operator session requirement;
- ledger/projection access check;
- hash-chain verification check;
- no synthetic ledger writes.

Also raised the general production migration floor from 21 to 24.
## 2026-10-06 — Hierarchy-safe Capital Projection + Decision Gate

Hardened Capital Authority decision support:

- removed ambiguous mixed-hierarchy total from /v1/capital/projection;
- added per-aggregate-type and per-aggregate breakdown;
- explicit aggregateType is required for a single authoritative total;
- admission checker now validates programme projection grain;
- added regression coverage preventing programme + pilot double counting;
- added deterministic read-only Capital Decision Gate;
- gate evaluates KPI target, truth class and evidence presence;
- gate returns SCALE / ITERATE / STOP / HOLD recommendation only;
- recommendation carries source measurement event hash;
- no approval, commitment, release or spend is created by the gate.

This wave explicitly follows the Integration Master Plan dependency rule: persistent tranche workflow remains sequenced behind durable PostgreSQL admission plus pg-boss/outbox and formal policy.
## 2026-10-06 — Russian-first investor and capital UI

Added a Russian-first localisation hardening wave:

- Russian is the primary visible language across Investor / Capital / Organisation / Partner / Brand / Trust / Deal Room surfaces;
- visible technical state labels are translated through presentation mappings while API/storage enum values remain unchanged;
- common abbreviations expose Russian explanations using accessible title/tooltips;
- core English headings such as Owner / Investor Route, Evidence Control Tower, Programme Capital Control and Mini Business Case were replaced in the Russian locale;
- added qa/russian-first-contract.test.js;
- Responsive QA now fails if key investor/capital headings regress back to English.

English locale support remains a separate requirement and is not replaced by this RU-first policy.


## 2026-10-06 — Canonical migration ordering through 025

- preserved Capital Authority as migration 023;
- preserved Capital Operator Admission as migration 024;
- placed organisation credential revocation ledger at migration 025 to avoid duplicate numeric prefixes;
- added a migration-order CI contract requiring unique contiguous numbering;
- Phase 0 PostgreSQL admission now expects migrations 001-025.


## 2026-10-07 — Capital admission contract hardening

Aligned the specialised Capital Authority admission checker with the platform-wide production gate:

- require strict PostgreSQL guard;
- require configured database binding;
- require full schema reconciliation PASS;
- require migration floor 001–025;
- explicitly verify migrations 023 / 024 / 025;
- preserve programme-grain projection and hash-chain verification checks;
- added a regression contract to `check:foundation`;
- corrected Capital Authority documentation from the stale migration-022/001–024 wording.

No runtime PostgreSQL admission is claimed by this release. Render still requires secure Blueprint/internal database binding before Phase 0 can be declared green.


## 2026-10-07 — Phase 0 Admission Evidence Bundle

Added deterministic read-only admission evidence:

- `npm run check:admission-evidence` for production admission;
- `npm run check:admission-evidence:full` for production + Capital chain verification;
- exact SHA is mandatory;
- canonical evidence payload receives SHA-256 receipt;
- operator bearer token is never serialized;
- contract test is part of `check:foundation`.

This is evidence tooling only; it does not claim live PostgreSQL admission while Render Blueprint binding is still absent.


## 2026-10-07 — Render Runtime Admission Proof

Added `mfw-render-runtime-admission-v1`:

- read-only Render service/Postgres/deploy verification;
- exact deployed SHA proof;
- `healthCheckPath=/ready` enforcement;
- no external Postgres allowlist;
- consumes deterministic Admission Evidence Bundle;
- deterministic SHA-256 runtime receipt;
- foundation regression coverage.

No live PostgreSQL admission is claimed by this change.


## 2026-10-08 — Cross-event Brand Graph v2 and Brand Relationship Timeline

Merged the two stacked read-model layers after exact-head responsive qualification:

- PR #14 Cross-event Brand Graph v2 — Responsive QA #349 PASS;
- PR #15 Brand Relationship Timeline — Responsive QA #351 PASS;
- resulting canonical main SHA: `f437135fbdc8074cce4b8acfc15eb06ddc14a86b`.

Preserved boundaries:
- canonical brandRef, no display-name identity inference;
- source/authority/truth class per graph/timeline stage;
- freshness/provenance per timeline item;
- no participant PII;
- missing evidence stays NOT EVIDENCED;
- shortlist/meeting/qualified lead are not revenue;
- verified commercial outcome requires external order reference plus explicit evidence reference;
- projections remain read-only and not production-admitted while Phase 0 is open.

Returned immediately to the Phase 0 PostgreSQL gate after merge. Live Render now serves exact `main@f437135fbdc8074cce4b8acfc15eb06ddc14a86b`, but still shows memory mode, missing secure database binding and empty `healthCheckPath`. No pg-boss/outbox work has been started ahead of admission.


## 2026-10-10 — Phase 0 pre-binding runtime synchronization

Exact SHA: `b540bf5498460cdf68767e636744567b0d13c1ea`.

- synchronized safe non-secret `mfw-authority` environment values with canonical Blueprint intent;
- Render explicit deploy `dep-db4o1oad0e5s73cscg80`: LIVE;
- build successful, zero npm audit vulnerabilities reported by Render build log;
- authority deep self-test: PASS;
- persistence remains `dataMode=memory`;
- social reverification remains blocked on PostgreSQL binding;
- `healthCheckPath` runtime drift remains open;
- newly observed control-plane drift: authority now reports `autoDeploy=no`;
- Phase 0 Readiness Contract #125: PASS;
- Responsive QA #358: PASS;
- no `DATABASE_URL` secret copied or reconstructed;
- PostgreSQL external allowlist remains closed;
- Phase 0 remains BLOCKED on secure Render internal database binding and health-check reconciliation.
