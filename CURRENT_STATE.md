# Current MFW/BFS project state

Last consolidated state: **2026-10-03**

## Current product

The platform is a three-direction fashion ecosystem:

- Moscow Fashion Week (MFW)
- BRICS+ Fashion Summit (BFS)
- «Сделано в Москве» ecosystem partner experience

A user has one platform identity across all three directions. MFW/BFS retain event-specific participation rules; «Сделано в Москве» consumer/buyer access reuses the shared identity while brand residency/verification is a separate authoritative status.

## Implemented areas

### MFW

- MFW-specific visual experience
- programme and official event data layer
- brands directory and brand detail
- linked brand → show graph
- favorites and follows
- Brand 365
- 30-day verified loyalty logic
- reward wallet
- one-time loyalty QR
- market/showroom redemption
- brand blog/news/photo publishing
- brand invitations
- buyer/commercial surfaces

### BFS

- BFS-specific visual experience
- programme
- speakers
- speaker → session links
- organisations
- B2B meeting/lead flow
- session detail
- explicit LIVE/replay availability state
- reminders
- schedule-change notifications

### Сделано в Москве

- third branded platform experience in official red/white-inspired visual language;
- one-platform account access without a repeated consumer profile;
- Made in Moscow Verified badge contract;
- verified-roster-only badge rule;
- dedicated Hub;
- Digital Market / Showroom concept;
- Buyer Bridge;
- Brand365 continuity;
- partner Evidence Dashboard;
- cross-platform brand badge support for MFW surfaces;
- BFS organisation/speaker badge projection requires an explicit canonical `brandRef`; name matching is forbidden;
- cross-moderation schema prepared behind the PostgreSQL production gate.

### Shared platform

- identity/account
- separate MFW/BFS registration where required
- three-direction switcher: MFW / BFS / Сделано в Москве
- combined agenda foundation
- official event-data snapshot and change detection
- notifications/reminders
- loyalty/CRM authorities
- cross-event analytics foundation

### Brand CRM / CDP

- follower age buckets
- 30+/60+ segments
- favorites
- buyer segment
- saved dynamic segments
- intersection segments
- campaign builder
- campaign scheduling
- consent checks
- frequency caps
- notification delivery queue
- deterministic treatment/control groups
- campaign incrementality
- CAC/ROI
- POS/order import
- purchase attribution
- AOV
- repeat rate
- LTV
- cohort retention
- RFM lifecycle
- churn scoring
- predicted CLV
- next-best-action
- acquisition source economics
- automated journeys
- wait/branch state machine
- deterministic journey holdouts
- stop-on-purchase

### Owner / investor layer

- Audience Asset
- Owner Control Tower
- brand-by-brand contribution
- cohort retention M1/M3/M6
- attributable GMV
- incremental GMV
- predicted CLV
- cross-brand migration
- MFW ↔ BFS overlap
- acquisition-source mix
- scenario valuation with explicit assumptions

## Data truth rules

Metrics are separated into:

- **Observed** — registrations, purchases, customers, retention
- **Attributed** — linked to campaign/brand/source
- **Incremental** — treatment vs control
- **Modelled** — churn score, predicted CLV, scenarios

Modelled metrics must not be presented as audited business valuation.

## PostgreSQL

Current migrations: **001–021**.

Latest schema layer:

- campaign experiments
- Brand CRM persistence
- customer profiles
- journeys
- holdouts
- acquisition events
- state-machine runtime fields

## Current technical next layer

The next major product-development layer is **Ecosystem Economics & Investor Model**:

- D30/D90/D180/D365 cohort LTV curves
- contribution margin instead of GMV-only views
- paid/organic acquisition payback
- brand revenue-share economics
- sponsor economics
- MFW↔BFS network effects
- audience asset bridge: Opening → Acquired → Retained → Reactivated → Churned → Closing
- 12/24/36 month scenarios

This file must be updated whenever a major development wave is completed.


## MVP identity and registration authority

Current account model:
- one shared identity/profile;
- explicit interests persisted server-side;
- separate project registrations for MFW and BFS;
- project registration is distinct from registration to a specific show/session;
- role/application context is persisted per MFW/BFS registration;
- personal agenda is a separate entity;
- agenda conflicts are detected server-side when PostgreSQL is active.

Current canonical authority URL:
`https://mfw-authority.onrender.com`


## Responsive device hardening

Responsive usability is now part of the release gate for the shared MFW/BFS shell, MFW participant experience, BFS participant/professional experience, platform overlays and Admin Console.

Automated device matrix:
- 360×800 compact phone;
- 375×667 compact iPhone;
- 393×852 standard iPhone;
- 430×932 large iPhone;
- 744×1133 compact tablet;
- 1024×1366 large tablet;
- 1440×900 desktop control.

The Playwright gate in `qa/responsive.spec.js` verifies viewport containment, document-level horizontal overflow, reachable navigation, modal/drawer fit and primary touch-target height.

## Phase 0 durable authority admission

The repository now has an explicit production-readiness boundary:

- `/health` is liveness/capability diagnostics;
- `/ready` is fail-closed production admission;
- memory mode is never production-ready;
- readiness requires PostgreSQL, reconciled schema and `MFW_REQUIRE_POSTGRES=true`;
- Render release SHA is projected through `RENDER_GIT_COMMIT`;
- `mfw-api/readiness-contract.test.js` guards memory and strict-mode behavior;
- `mfw-api/check-production-admission.js` verifies live exact-SHA PostgreSQL admission.

The dedicated free `mfw-postgres` exists in Frankfurt on PostgreSQL 17. The remaining Phase 0 blocker is secure binding of that existing database to the direct-created `mfw-authority` service. Phase 1 stateful integrations are not production-admitted until `/ready` is green.

## Rollout / feature-evaluation boundary

A stateless OpenFeature-compatible feature-evaluation boundary now exists for **non-critical preview/product rollout only**.

Current guarded preview flags:
- Programme Production preview;
- venue map preview;
- unified discovery search preview;
- contextual survey prompt preview;
- replay search preview.

Safety rules:
- all flags default to false;
- provider failure falls back deterministically;
- role comes from the signed MFW session, not query parameters;
- MFW/BFS event scope is explicit;
- flag keys involving QR/check-in, credentials/revocation, consent, authorization, eligibility, payment or financial/attribution truth are rejected;
- `GET /v1/features` is explicitly marked `securityBoundary=not_authorization`.

This is a stateless rollout boundary only. No external flag provider has been made authoritative and no persistent Phase 1 module is production-admitted while PostgreSQL Phase 0 remains blocked.

## Free-tier infrastructure hardening

The canonical free Render contour has been tightened:

- dedicated Render Cron was removed from `render.yaml` because the zero-paid-resource constraint is authoritative;
- social reverification now uses the authority's in-process interval plus stale-aware startup catch-up;
- catch-up consults the latest completed persisted reverification run and executes after wake/restart only when stale;
- overlapping in-process reverification runs are collapsed behind one promise;
- the Blueprint now uses the exact environment-variable names consumed by `server-v2.js`;
- obsolete `TELEGRAM_BOT_TOKEN`, `VK_CLIENT_ID`, `VK_CLIENT_SECRET` and unused `MFW_JWT_SECRET` Blueprint keys were removed;
- `mfw-api/render-blueprint-contract.test.js` prevents reintroducing paid cron or mismatched secret names.

This is still not Phase 0 production admission: the existing direct-created `mfw-authority` service remains blocked until the existing free `mfw-postgres` is securely bound as `DATABASE_URL`.

## Master-plan review discipline

Before every following implementation wave, the current `docs/MFW_INTEGRATION_MASTER_PLAN_2026-10-01.md` is re-read from repository HEAD and its newest modifying commits are inspected.

Latest reviewed additions:
- Section 13 — Unified Discovery Search / Meilisearch + agenda ICS portability;
- Section 14 — live moderated Q&A / polling / replay bridge.

Both remain dependency-gated behind durable PostgreSQL and the durable jobs/outbox foundation.

## Premium participant companion / PWA

Implemented as a stateless/read-only wave that does not bypass Phase 0:

- one global Discover surface across MFW + BFS + Made in Moscow;
- MFW brands/shows and BFS speakers/sessions come from the current published snapshot;
- Made in Moscow entries appear only from verified roster authority;
- four participant routes: Plan / Discover / Connect / Access;
- Ctrl/Cmd+K opens global Discover and focuses search;
- PWA manifest now represents Moscow Fashion Platform rather than only MFW;
- install shortcuts open MFW, BFS or Made in Moscow directly;
- branded offline shell added;
- service worker caches only public shell/assets;
- offline mode explicitly does not claim registration, QR, LIVE, meetings, wallet or Verified truth;
- online/offline state is visible in the shared shell;
- responsive QA expanded from 42 to 56 tests across 7 device profiles.

Latest exact responsive evidence: 56/56 PASS on commit `d9966a579e1d7ebe5ede5af41758eec935e43f93`.

## Buyer / Brand Deal Room preview

A non-persistent commercial-workflow preview is implemented inside the shared Hub.

Current preview chain:

`confirmed meeting -> look/collection shortlist -> structured buyer request -> brand response -> external handoff`

Included preview contracts:
- bilateral relationship gate;
- canonical look/collection IDs only;
- request taxonomy for line sheet / wholesale price / availability / MOQ / delivery / sample / showroom / distribution;
- private-document categories;
- outcome evidence classes: Observed / Reported / Verified;
- explicit no-silent-order / external-commerce handoff boundary.

Safety boundary:
- request controls are disabled;
- no writable commercial input exists in the preview;
- no price, MOQ, order, request, document or commercial outcome is persisted;
- production Deal Room remains gated by durable PostgreSQL + formal policy/ACL + audit/idempotency.

Responsive Deal Room agent coverage: all 7 device profiles passed in the 63-test wave.

## Lifecycle-aware participant mode

The shared Hub now contains `Сейчас` / Now.

Lifecycle is derived from the published MFW/BFS programme dates:

`Before -> Live Days -> After Event`

Current behavior:
- Before: registration/profile, Discover, agenda and interests are prioritised;
- Live: today's MFW/BFS programme is composed and can route items into agenda;
- After: relationship continuation, saved items, Deal Room follow-up and Made in Moscow / Brand365 become primary;
- replay count is based only on explicitly confirmed replay state;
- follow-up/Deal Room activity is never represented as a sale without separate outcome evidence.

The lifecycle engine is read-only; it does not mutate access, agenda or commercial truth by itself.

Agent verification covers both:
- real current post-event state;
- a frozen 2026-09-29 live-event state;
across the complete 7-device matrix.

## PWA cache release

The participant companion shell is on cache revision `mfp-shell-2026-10-03-p2`.
Platform JS/CSS use the matching `20261003p2` asset revision so mobile/CDN clients do not mix old companion code with the new lifecycle UI.

## Investor media system — 2026-10-06

A stateless investor-demo media layer now connects the three ecosystem directions without changing authority boundaries:

- MFW: current-season runway/editorial imagery plus official external video references;
- BFS: separate international/business media deck;
- «Сделано в Москве»: separate brand-growth/editorial media layer;
- shared investor gallery shows all three experiences together and routes directly into each;
- a central media manifest records source pages, asset URLs and the non-licence boundary;
- major hero/story slots are assigned distinct media rather than reusing one image repeatedly;
- new responsive QA asserts that the three investor ecosystem cards use three distinct backgrounds.

No event access, Verified status, commercial outcome, analytics KPI or production-readiness claim is inferred from media. Phase 0 PostgreSQL admission remains unchanged.

## Trust Passport MVP preview — 2026-10-06

Implemented from the newest defensibility/trust section of the master plan as a dependency-safe preview:

- dedicated Trust Passport tab in the shared Hub;
- six explainable dimensions: identity, role, event participation, meeting reliability, organisation affiliation and commercial outcome evidence;
- explicit source/scope/freshness framing;
- neutral no-history principle for new verified participants;
- no universal/opaque reputation score;
- no inference of wealth, creditworthiness, politics, ethnicity or hidden buyer intent;
- portable credential / verified-directory / trust-aware matchmaking shown only as future governed capabilities;
- guided investor route now includes Trust Passport before Owner value.

Production credential issuer/status registry and revocation remain gated behind durable identity/history, PostgreSQL and formal policy review.

## Investor revenue architecture — 2026-10-06

The shared investor value layer now shows five monetisation surfaces without presenting hypothetical figures as actual revenue:

- partner / sponsor product;
- Brand365 / brand CRM tooling;
- professional B2B / Deal Room;
- privacy-safe fashion intelligence;
- partner API / enterprise integrations.

Each surface is labelled by the evidence required before it can be treated as a commercial result. The UI explicitly states that engagement, meetings and structured requests are not revenue.

This remains a product/commercial architecture preview. Actual ARR/MRR, unit economics and realised revenue require production contracts, billing/payment evidence and production analytics.

## Investor proof operating layer — 2026-10-06

The investor MVP now has one shared evidence model feeding four operating surfaces:

- Investor Proof;
- Partner / Sponsor Console;
- Brand Business Cockpit;
- Investment / Economics Dashboard.

The proof chain is:

user/profile -> explicit interest -> brand -> meeting -> structured commercial intent -> external handoff -> D30 -> D90 -> D365

Two modes are intentionally separated:

- LIVE PROOF: only current account/product signals are shown; missing stages are labelled NOT EVIDENCED.
- SYNTHETIC CASE: a full illustrative case is shown with SYNTHETIC evidence labels and is never presented as production performance.

Evidence taxonomy remains explicit:

OBSERVED / REPORTED / VERIFIED / MODELLED / SYNTHETIC / NOT EVIDENCED.

Partner Console uses package -> inventory -> campaign -> delivery -> handoff -> report -> settlement, with recognised revenue gated behind appropriate contract/billing/payment evidence.

Brand Cockpit uses exposure -> relationship -> buyer signal -> match -> meeting -> Deal Room -> request -> handoff -> outcome and adds D30/D90/D365 continuity.

Economics maps payer -> product -> formula -> revenue-recognition gate and deliberately shows no factual ARR/MRR without source contracts and billing data.

A machine-readable evidence manifest is available at `mfw/platform/evidence-package.json`.

## Evidence Control Tower — 2026-10-06

Investor Proof is now an Evidence Control Tower with two explicit views:

### Case Dossier

A selected buyer x brand relationship expands into a chronological dossier:

source -> seen -> saved -> recommended -> meeting proposed -> meeting held -> intent -> Deal Room -> external handoff -> D30 -> D90 -> D365

Each transition exposes:

- event/context;
- timestamp/relative time;
- human-readable reason;
- evidence class;
- evidence reference;
- potentially affected revenue streams.

LIVE PROOF derives only current account/product state and leaves missing stages NOT EVIDENCED.

SYNTHETIC CASE provides three complete illustrative dossiers. Synthetic cases are clearly labelled and are not production KPI.

### Portfolio View

The synthetic investor portfolio aggregates:

Audience -> Engagement -> Qualified Buyer -> Meeting -> Intent -> Deal -> Retention -> Revenue Evidence

It also shows:

- MFW / BFS / Made in Moscow contribution;
- D30 / D90 / D365 retention;
- evidence-class mix;
- revenue surfaces touched.

Portfolio numbers are scenario data only. A touched revenue surface is explicitly not counted as realised revenue.

## Portfolio drill-down — 2026-10-06

Evidence Control Tower now supports portfolio-to-dossier navigation.

An investor can select any synthetic portfolio stage:

Audience / Engagement / Qualified Buyer / Meeting / Intent / Deal / Retention / Revenue Evidence

and see:

- aggregate stage count;
- conversion from the previous stage;
- MFW / BFS / Made in Moscow cohort composition;
- representative linked demo journeys;
- evidence class for the representative transition;
- direct navigation into the selected buyer x brand Case Dossier.

Important truth boundary:

- the aggregate cohort count remains synthetic scenario data;
- representative dossiers are examples, not a fabricated row-level list of every synthetic journey;
- opening a representative dossier never implies that all members of the aggregate cohort exist as materialised production records.

## Filterable Portfolio Control Tower — 2026-10-06

Portfolio View now supports simultaneous filters over the deterministic synthetic cohort cube:

- period;
- ecosystem (MFW / BFS / Made in Moscow);
- buyer market;
- brand category;
- new / returning buyer;
- evidence class;
- retention horizon (D30 / D90 / D365);
- revenue surface.

The same filtered cohort recomputes:

- Audience -> Engagement -> Qualified Buyer -> Meeting -> Intent -> Deal -> Retention -> Revenue Evidence;
- ecosystem contribution;
- selected retention horizon and all D30/D90/D365 comparison values;
- revenue-surface touch counts;
- stage drill-down and representative dossier eligibility.

The synthetic cube contains 12 deterministic cohorts whose unfiltered total preserves the 1,200-journey demo portfolio.

If a filter combination has no cohort, the UI returns an explicit zero state. It does not substitute a nearby cohort or estimate missing values.

## Comparison / Scenario Mode — 2026-10-06

Evidence Control Tower now includes a third view: Comparison / Scenario Mode.

Two independent synthetic slices, A and B, can be configured side-by-side across the same cohort dimensions:

- period;
- ecosystem;
- buyer market;
- brand category;
- new / returning buyer;
- evidence class;
- retention horizon;
- revenue surface.

Quick presets:

- MFW vs BFS;
- CIS vs GCC;
- new vs returning buyer.

The comparison calculates rates from the deterministic synthetic cohort cube:

- Audience -> Qualified Buyer;
- Qualified Buyer -> Meeting;
- Meeting -> Intent;
- Intent -> Deal-stage;
- Intent -> selected D30/D90/D365 retention;
- Deal-stage -> Revenue Evidence.

The UI shows both values and the percentage-point delta A-B.

Important boundary: a higher conversion in a selected synthetic slice is descriptive, not causal. It does not prove that the event, market or buyer type caused the difference, and no monetary uplift is inferred without real contracts/payment evidence.

Russian is the default UI language for the shared investor/control-tower layer. English remains secondary/product terminology only where useful.

## Opportunity Explanation Engine — 2026-10-06

Comparison / Scenario Mode now includes a deterministic Opportunity Explanation layer.

For the selected A/B scenarios it:

- ranks the six comparison gaps by absolute percentage-point difference;
- selects the largest gap as the primary opportunity/exposure to inspect;
- shows a compact funnel-gap waterfall;
- decomposes the selected rate gap by brand category and buyer market;
- separates composition/mix effect from within-segment rate effect;
- compares D30 / D90 / D365 retention gaps;
- maps representative synthetic dossiers for each side when a materialised demo case matches the selected scenario;
- links directly from the explanation back into the Case Dossier and its evidence references.

The decomposition is symmetric:

- mix effect captures differences in segment weights;
- within-segment effect captures differences in segment rates;
- their sum reproduces the aggregate A-B rate gap up to rounding.

This is descriptive accounting decomposition only. It is not causal attribution, and it does not infer monetary uplift without real contract/billing/payment evidence.

## Recommendation / Capital Allocation Layer — 2026-10-06

Comparison / Scenario Mode now includes a modelled Recommendation / Capital Allocation layer.

The engine:

- maps the ranked scenario gaps to a fixed intervention catalog;
- scores candidate interventions from:
  - absolute percentage-point gap;
  - affected denominator cohort scale;
  - explicit leverage assumption;
  - explicit effort assumption;
- selects the top three interventions;
- normalizes their relative scores into exactly 100 modelled pilot-budget points;
- identifies the weaker scenario and strongest market/category driver;
- names the KPI expected to move;
- creates an explicitly MODELLED pilot target;
- declares evidence required before an intervention can be treated as successful;
- links representative dossiers where materialised demo evidence exists;
- includes a Pilot -> Measure -> Verify -> Scale/Stop governance path.

Priority score:

|gap pp| x sqrt(affected denominator / max scenario population) x leverage / effort.

The 100 points are not currency and are not an approved budget. Real capital allocation requires intervention costs, capacity, contractual constraints, risk limits and investment-committee approval.

Pilot targets are scenario assumptions only. No recommendation is represented as guaranteed uplift.

## Investment Committee Workspace — 2026-10-06

The investment operating loop is now closed in the investor MVP:

Recommendation -> Mini Business Case -> Review -> Demo Approval -> Pilot Running -> Measured -> Scale / Iterate / Stop.

Each mini business case contains:

- named owner;
- modelled pilot-budget request in non-monetary points;
- baseline KPI;
- modelled KPI target;
- evidence plan;
- pilot design;
- measured synthetic result;
- decision state;
- current-session decision log.

The workspace uses an in-memory demo state machine only:

DRAFT -> IN_REVIEW -> APPROVED -> PILOT_RUNNING -> MEASURED -> DECIDED.

The final decision follows explicit demo rules:

- SCALE: measured KPI meets/exceeds target and the evidence gate is complete;
- ITERATE: KPI improves vs baseline but misses target, or evidence remains incomplete;
- STOP: KPI does not improve, a material guardrail breaks, or evidence quality is insufficient.

No approval, pilot state or measured result is persisted to production authority. The UI explicitly labels all of these states as DEMO / SYNTHETIC.

Production implementation still requires server-side actor identity, immutable decision/evidence history, timestamps, role-based approval permissions and auditability.

## Programme Capital Control — 2026-10-06

The investor MVP now includes portfolio-level capital governance above individual Investment Committee cases.

Modelled programme envelope:

- envelope: 150 pilot points;
- requested: 128;
- approved: 100;
- committed: 85;
- spent: 58;
- measured: 46;
- scaled: 22;
- stopped: 6;
- uncommitted reserve: 50;
- committed-but-unspent: 27.

Core capital rule:

Committed-but-unspent is not free capital.

Only:

1. uncommitted programme reserve; and
2. capital explicitly released from a STOP / closed commitment

may enter reallocation capacity.

The demo includes an explicit release action for the unused 3-point balance of a stopped Deal Room SLA pilot. Before release, reallocation capacity is 50. After release it becomes 53 and committed-but-unspent falls from 27 to 24.

Programme view includes:

- Requested -> Approved -> Committed -> Spent -> Measured -> Scaled / Stopped;
- MFW / BFS / Made in Moscow capital map;
- pilot-level table;
- blockers and at-risk commitments;
- evidence completeness;
- reallocation opportunities;
- programme-level ITERATE / REVIEW signal.

All values are modelled pilot points, not currency, actual accounting spend or approved corporate budgets.

## Capital Reallocation Optimizer — 2026-10-06

Programme Capital Control now includes a gate-aware Capital Reallocation Optimizer.

The optimizer compares the next 10 / 20 / 30 modelled points across:

- MFW;
- BRICS+ Fashion Summit;
- Made in Moscow.

Each candidate is evaluated on:

- capital-at-risk relief;
- modelled KPI leverage;
- evidence readiness;
- tranche absorption capacity.

Decision score:

30% risk relief + 25% KPI leverage + 30% evidence readiness + 15% absorption.

Evidence governance overrides upside:

- READY: evidence readiness >= 80%;
- CONDITIONAL: 60% to <80%;
- HOLD: below 60% or hard evidence blocker;
- HOLD candidates receive score 0 regardless of modelled upside.

Current demo candidate states:

- MFW professional discovery: READY;
- BFS matchmaking optimizer: CONDITIONAL;
- Made in Moscow meeting-intent pack: HOLD due to incomplete evidence plan.

For each 10/20/30-point scenario the UI shows:

- how much the vertical can absorb;
- modelled KPI lift;
- capital-at-risk relief;
- evidence readiness;
- evidence required before the next tranche;
- a modelled recommendation for committee review.

The optimizer does not approve capital. It only produces a candidate decision for Investment Committee review.

Reallocation capacity remains constrained by Programme Capital rules: uncommitted reserve + explicit releases only.

## Portfolio Scenario Simulator — 2026-10-06

Programme Capital Control now includes a Portfolio Scenario Simulator above the single-destination reallocation optimizer.

For a selected 10 / 20 / 30-point next-quarter budget, the simulator enumerates eligible mixes across:

- MFW;
- BRICS+ Fashion Summit;
- Made in Moscow;
- explicit Reserve.

Scenario step: 10 points.

Ranking dimensions:

- 30% capital-at-risk reduction;
- 25% modelled KPI leverage;
- 20% evidence confidence;
- 10% diversification;
- 15% optionality / reserve.

Governance constraints apply before ranking:

- HOLD candidates cannot receive new capital;
- CONDITIONAL allocations remain committee-gated;
- vertical allocations cannot exceed absorption caps or available programme reallocation capacity;
- unallocated budget remains Reserve by design and is scored as optionality;
- the simulator ranks mixes but does not approve or commit capital.

The simulator shows the top five eligible mixes for 20/30-point budgets and all available mixes for a 10-point budget. A pure Reserve scenario is included, so optionality is an explicit portfolio decision rather than an accidental capacity remainder.

All risk reduction and KPI values are model assumptions. They are not guaranteed outcomes, currency or ROI.

## Portfolio Proposal Handoff — 2026-10-06

The best Portfolio Scenario Simulator mix can now be handed directly into the Investment Committee Workspace as a demo Portfolio Allocation Proposal.

Flow:

Portfolio Scenario Simulator -> Best Mix -> Portfolio Allocation Proposal -> Review -> Approved Demo Allocation.

The proposal includes:

- selected programme budget;
- MFW / BFS / Made / Reserve mix;
- modelled portfolio score;
- modelled risk relief;
- modelled KPI leverage;
- proposal status.

Proposal state is in-memory demo state only:

DRAFT -> IN_REVIEW -> APPROVED_DEMO.

This handoff does not create commitments, accounting entries or corporate approvals. Production implementation requires server-side actors, immutable proposal/approval history, approval authority and linkage to programme commitment records.

## Server-side Capital Authority — 2026-10-06

Capital governance now has a durable server-side authority contract in mfw-api.

migration 023 adds capital_ledger_events as an append-only PostgreSQL ledger.

Capital events now have:

- aggregate sequence;
- authenticated non-demo actor;
- actor role;
- occurred_at + server recorded_at;
- evidence references;
- idempotency key;
- request id;
- previous event hash;
- event hash.

Database mutation protection rejects UPDATE / DELETE / TRUNCATE.

The API exposes:

- POST /v1/capital/events;
- GET /v1/capital/ledger;
- GET /v1/capital/projection;
- GET /v1/capital/verify.

There is no memory fallback. Capital endpoints fail closed without PostgreSQL.

Capital writes require a non-demo Organizer/Staff session.

Server-side invariants reject:

- approval > requested;
- commitment > approved;
- release > unspent commitment;
- spend > net commitment;
- measurement before spend;
- measurement without metric/measuredValue;
- decision before measurement;
- invalid decision outside SCALE / ITERATE / STOP;
- evidence-gated events without evidence refs.

Hash chains can be independently replayed by /v1/capital/verify.

The frontend Programme Capital Control remains explicitly MODELLED/DEMO until PostgreSQL production admission and a real authority-backed UI projection are green.

## Capital Authority UI bridge — 2026-10-06

Programme Capital Control now has a read-only bridge to the server Capital Authority.

Behavior:

- non-demo Organizer/Staff session -> read /v1/capital/projection + /v1/capital/verify;
- display authoritative PostgreSQL projection and chain integrity;
- demo session -> AUTHORITY PROTECTED, no authority query, no fallback write;
- synthetic Investment Committee / simulator actions remain demo-state only and are never persisted to Capital Authority.

This keeps investor demonstration separate from corporate authority while making the UI ready to surface real ledger state after production admission.

## Capital Operator Admission — 2026-10-06

Migration 024 adds durable Capital Authority operator grants.

Capital access is no longer based on signed claims alone. Every capital request now re-checks:

- non-demo operator session;
- Organizer/Staff role;
- active capital_operator_grants row;
- active user;
- grant expiry;
- persisted session expiry/revocation.

Operator bootstrap requires an explicitly configured non-default MFW_ADMIN_TOKEN. Grant suspension/revocation revokes active persisted sessions.

This closes the practical gap where Capital Authority existed but no non-demo operator admission path was available.
