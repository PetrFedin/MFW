# Current MFW/BFS project state

Last consolidated state: **2026-10-02**

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
