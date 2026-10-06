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
