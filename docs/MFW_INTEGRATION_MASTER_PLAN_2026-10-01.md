# MFW / BFS — Integration Master Plan

**Document:** `docs/MFW_INTEGRATION_MASTER_PLAN_2026-10-01.md`  
**Status:** PLANNED — implementation source for future integration waves  
**Date:** 2026-10-01  
**Repository:** `PetrFedin/MFW`  
**Canonical branch:** `main`

## 1. Purpose

This document consolidates the external-repository integrations and product-strengthening ideas proposed for MFW/BFS during the 2026-10-01 GitHub portfolio analysis.

It is intentionally implementation-oriented. A future instruction such as:

> Implement everything approved in `docs/MFW_INTEGRATION_MASTER_PLAN_2026-10-01.md`

must be interpreted as: execute this plan in the sequence, boundaries and acceptance gates defined here, without creating a second authority for identity, registration, QR credentials, CRM/CDP, loyalty, campaigns, attribution, agenda or analytics.

This plan is **not evidence that any integration is already implemented**.

### Implementation-control discipline

Before every development/integration wave:

1. Re-read this **entire file from current `main` HEAD**, not a cached copy or previous conversation summary.
2. Inspect the newest commits that modified this document and identify newly added capabilities, changed dependencies, sequencing constraints and explicit prohibitions.
3. Reconcile new proposals with the current production gate before writing code.
4. Do not move a newly discovered persistent capability ahead of its prerequisite durable-authority/job/policy layers.
5. After implementation, update this document where implementation status materially changed, plus `CURRENT_STATE.md`, `RENDER_STATE.md` when runtime changes, and `RELEASE_LOG.md`.

**Latest implementation review — 2026-10-02:** Sections 13 (Unified Discovery Search + agenda calendar portability) and 14 (live moderated Q&A/polls) were explicitly re-read from the commits that introduced them. They remain accepted roadmap items but are sequenced after durable PostgreSQL and the required durable job/outbox foundations.


## 2. Verified baseline

Current repository state already includes:

- shared identity with separate MFW/BFS registrations;
- programme, brands/designers, speakers/organisations and agenda;
- QR/pass authority and check-in flows;
- Brand 365, loyalty, reward wallet and redemption;
- Brand CRM/CDP, segments, campaigns, consent/frequency caps;
- treatment/control incrementality;
- POS/order import and purchase attribution;
- AOV, repeat, LTV, retention, RFM, churn, predicted CLV;
- next-best-action and automated journeys;
- buyer/delegate B2B flows;
- notification/reminder engine;
- Owner Control Tower;
- PostgreSQL schema through migrations 001–020.

The current production blocker recorded in `RENDER_STATE.md` is durable PostgreSQL admission. New persistent modules in this plan must not be declared production-ready while the authority is running in memory mode.

## 3. Non-negotiable architecture rules

1. **MFW remains the system of record** for identity, registrations, programme publication, agenda, access, QR/pass state, Brand 365, CRM/CDP, campaign/loyalty state and owner metrics.
2. External products may be:
   - a library embedded in MFW;
   - a sidecar/provider behind an adapter;
   - an authoring/back-office source whose approved snapshot is imported into MFW;
   - a reference implementation only.
3. No external service may write directly to MFW PostgreSQL.
4. Provider webhooks enter through signed/idempotent MFW endpoints and are persisted as provider events before changing business state.
5. All new analytics must preserve the existing truth classes: **Observed / Attributed / Incremental / Modelled**.
6. MFW and BFS keep separate visual systems even when sharing backend capabilities.
7. Every production integration needs: migration, API contract, role/permission checks, audit/event trail, negative tests, exact-head deployment evidence and `CURRENT_STATE.md` update.

## 4. Integration disposition

Legend:

- **ADOPT** — planned for implementation.
- **ADAPT** — use concepts/components but keep MFW authority.
- **SIDECAR** — run separately behind an adapter.
- **REFERENCE** — study patterns; do not make it a runtime dependency now.
- **DEFER** — retain in roadmap but do not implement until the stated gate is met.

| Capability | External project | Decision | Core boundary |
|---|---|---|---|
| Durable PostgreSQL job execution | pg-boss | ADOPT | MFW PostgreSQL remains authority |
| Role/policy formalisation | node-casbin | ADOPT | replaces scattered checks, not domain ownership |
| Web HLS playback | hls.js | ADOPT | player only |
| Live ingest/transcoding | OvenMediaEngine | SIDECAR | stream provider, never registration/commerce authority |
| Signed Apple Wallet passes | passkit-generator | ADOPT | derived credential; rotating QR authority remains separate |
| Personalised ranking | Metarank | SIDECAR/ADAPT | recommendations are derived, never source facts |
| Venue/campus map | MapLibre GL JS | ADOPT | map renderer, official venue data stays in MFW |
| B2B external availability | Cal.com | ADAPT | MFW meeting entity remains canonical |
| Programme/CFP production | pretalx | ADAPT | approved programme snapshot imported to MFW |
| Organiser workflow patterns | Indico | REFERENCE | do not run both pretalx and Indico as authorities |
| Check-in/access-list operations | Hi.Events | REFERENCE | do not replace existing signed QR/check-in authority |
| Structured editorial CMS | Directus | SIDECAR/ADAPT | authoring source; published snapshot stored by MFW |
| Sponsor inventory/evidence | Twenty patterns + native MFW domain | ADAPT | implement sponsor authority inside MFW |
| Contextual surveys | Formbricks | SIDECAR | survey response source linked back to MFW user/event where consent allows |
| Product/UX experimentation | GrowthBook | SIDECAR | experiment assignment/result must be auditable |
| Email newsletters | listmonk | SIDECAR | delivery only; segment/consent truth remains MFW |
| Multichannel notification orchestration | Novu | DEFER | only if current notification engine becomes insufficient |
| Public-surface web analytics | Umami | DEFER | marketing telemetry only; never Owner Control Tower authority |
| Relationship/network graph | native projection | ADOPT | derived graph from existing MFW entities |

## 5. Required implementation sequence

### Phase 0 — Durable authority admission

**Do this before every new persistent integration.**

1. Provision/wire dedicated MFW PostgreSQL.
2. Apply and verify migrations 001–020.
3. Prove schema reconciliation and exact migration set.
4. Prove `dataMode=postgres`.
5. Re-run current identity/registration/agenda/loyalty golden paths.
6. Enable and verify social reverification.
7. Set `MFW_REQUIRE_POSTGRES=true`.
8. Record exact SHA/deploy evidence in `RENDER_STATE.md` and `RELEASE_LOG.md`.

**Acceptance:** no production feature in later phases may depend on in-memory-only state.

**Free-contour operational note — 2026-10-02:** do not provision a dedicated Render Cron Job solely for social reverification while the project is constrained to zero paid Render resources. The authority owns an in-process interval plus a stale-aware startup catch-up. Because a free web service can sleep, this provides eventual catch-up after wake/restart but does **not** claim strict wall-clock execution while the service is asleep. Phase 1 durable PostgreSQL jobs supersede this temporary free-tier execution pattern when the durable job layer is admitted.


---

### Phase 1 — Operational execution foundation: pg-boss + formal policy

#### 1.1 pg-boss

Repository: https://github.com/timgit/pg-boss

**Why:** MFW already has scheduled campaigns, reminders, journeys and reverification. These should not depend on ad-hoc timers in the API process.

**Placement:**

- add dependency to `mfw-api/package.json`;
- create `mfw-api/jobs/` with explicit handlers;
- use the existing PostgreSQL database, but separate job tables/schema ownership from domain tables;
- enqueue only after the authoritative business transaction commits.

**First job types:**

- `campaign_delivery`;
- `agenda_reminder`;
- `schedule_change_notification`;
- `journey_resume`;
- `social_reverification`;
- `wallet_pass_refresh`;
- `newsletter_export`;
- later: survey follow-up and sponsor evidence rollup.

**Do not:** move domain state into the job payload. Payload carries immutable IDs/version refs; handler reloads authoritative state.

**Acceptance:** retry is idempotent, duplicate execution cannot double-send/redeem, failed jobs are visible, API restart does not lose scheduled work.

#### 1.2 node-casbin

Repository: https://github.com/casbin/node-casbin

**Goal:** formalise permissions for organiser/staff/brand/buyer/media/speaker/delegate roles as the number of surfaces grows.

**Placement:**

- create `mfw-api/authz/`;
- map existing roles/actions into policy;
- keep ownership checks and event/brand scope checks in MFW domain logic;
- policy evaluation occurs before domain command execution.

**Do not:** let Casbin become a second user/role database.

**Acceptance:** every sensitive endpoint has explicit policy coverage; negative cross-brand/cross-event tests exist.

---

### Phase 2 — Real LIVE / Replay media contour

This phase turns the existing LIVE/replay state model into an actual media delivery path.

#### 2.1 OvenMediaEngine sidecar

Repository: https://github.com/AirenSoft/OvenMediaEngine

**Use as:** separate streaming provider for ingest/transcode/distribution where self-hosting is justified.

**MFW integration:**

`stream source/provider -> signed provider event -> MFW stream state -> participant player`

MFW stores:

- event/session ID;
- provider stream ID;
- provider/status;
- ingest health summary;
- playback URL/reference;
- started/ended timestamps;
- failover/source priority;
- replay asset reference.

Provider credentials never enter frontend code.

#### 2.2 hls.js player

Repository: https://github.com/video-dev/hls.js

**Placement:** MFW/BFS web player component.

Add:

- adaptive HLS;
- fatal/non-fatal error handling;
- reconnect;
- explicit scheduled/live/pause/ended/replay states from MFW authority;
- captions where provider supplies them;
- analytics events: player_open, start, stall, quality_change, complete.

**Do not:** infer business stream state only from player callbacks. Server authority wins.

**Order:** provider adapter first; player second; failover tests third.

---

### Phase 3 — Signed Wallet credential

Repository: https://github.com/alexandercerutti/passkit-generator

Current native boundary already states that a Wallet pass must not contain the reusable equivalent of the rotating gate token.

**Implementation:**

1. Introduce Wallet pass projection built from authorised registration/pass state.
2. Sign only with real Apple Pass Type ID/certificates in secret storage.
3. Store pass serial + user/event relation + status.
4. Wallet pass contains stable display identity, not the reusable rotating admission secret.
5. Check-in still requests/derives current gate credential from MFW authority.
6. Revocation/registration changes trigger pass refresh through the job queue.

**Acceptance:** copied/stale Wallet payload cannot bypass rotating QR validation.

---

### Phase 4 — Programme Production & CFP

Primary reference: https://github.com/pretalx/pretalx  
Secondary reference: https://github.com/indico/indico

These two proposals are merged into **one** workstream to avoid duplicate authorities.

**Canonical model:**

`proposal -> review -> accepted -> speaker requirements -> production readiness -> approved programme snapshot -> MFW published programme`

**Recommended approach:**

- build/extend an MFW Programme Production Desk using pretalx/Indico workflow patterns;
- if pretalx is used as an external authoring tool, import only an approved versioned snapshot;
- `program/session/event` publication remains MFW authority.

New domain entities should cover:

- proposal/submission;
- reviewer decision;
- speaker confirmation;
- disclosure/consent;
- bio/photo/deck deadline;
- moderation brief;
- technical requirements;
- final programme revision;
- publication snapshot ID.

**BFS first:** BFS benefits most from CFP/speaker/session production. MFW show scheduling can use the same infrastructure with different UI.

---

### Phase 5 — B2B meeting availability

Reference: https://github.com/calcom/cal.com

MFW already owns buyer/delegate B2B meeting/lead flows. Therefore **Cal.com must not replace MFW meeting authority**.

**Use only for:**

- external calendar availability;
- timezone-safe slot discovery;
- optional calendar provider handoff.

Flow:

`MFW request -> candidate availability adapter -> MFW slot proposal -> bilateral acceptance -> MFW Meeting -> optional external calendar event`

MFW stores the meeting lifecycle and audit. External provider IDs are references only.

---

### Phase 6 — Editorial/Brand 365 authoring

Reference: https://github.com/directus/directus

**Purpose:** structured authoring, preview and multilingual editorial operations without moving Brand CRM or audience targeting out of MFW.

Recommended boundary:

`Directus draft/review -> approved content version -> MFW publication import -> Brand365 targeting/placement -> MFW analytics`

Content objects:

- brand story;
- designer story;
- collection/editorial;
- BFS organisation/speaker feature;
- event guide;
- post-event recap;
- media asset metadata.

**Do not store:** loyalty eligibility, CRM segment membership, customer profile, attribution or reward state in Directus.

If Directus licensing/deployment is not desirable, implement the same workflow natively; Directus remains a design reference.

---

### Phase 7 — Sponsor Inventory & Evidence Authority

CRM UI patterns may be taken from https://github.com/twentyhq/twenty, but the domain must be native MFW.

Create a sponsor lifecycle:

`package -> contract -> inventory item -> placement/deliverable -> scheduled -> executed -> evidence -> measured -> accepted -> renewal context`

Entities:

- sponsor_package;
- sponsor_commitment;
- sponsor_inventory_item;
- sponsor_delivery;
- sponsor_evidence;
- sponsor_measurement_window;
- sponsor_acceptance.

Evidence may reference:

- impressions/attendance;
- QR/redemption;
- campaign exposure;
- consented leads;
- content publication;
- physical placement proof;
- attributable/incremental outcomes where methodology permits.

**Critical:** do not relabel attributed results as incremental. Existing truth-class rules apply.

---

### Phase 8 — Personalised Home / Agenda / Discover

Reference: https://github.com/metarank/metarank

Signals already available or planned:

- explicit interests;
- follows/favorites;
- agenda;
- attendance;
- brand interactions;
- replay/content interaction;
- buyer/delegate role;
- event registration context.

**Architecture:**

`MFW fact events -> feature/event feed -> ranking service -> ranked IDs + reason codes -> MFW renders entities`

Never let the ranking service own product entities or user profile truth.

Every recommendation should include an explainable reason code, for example:

- explicit_interest;
- follows_brand;
- similar_attendance;
- agenda_context;
- buyer_category_match.

Fallback must be deterministic when the ranking service is unavailable.

**Evaluation:** CTR alone is insufficient; measure save/add-to-agenda/attendance/replay and guard diversity.

---

### Phase 9 — Relationship / Network Graph

Implement as a rebuildable projection from authoritative entities:

`User <-> Brand <-> Designer <-> Show <-> Category <-> Country <-> Organisation <-> Speaker <-> Session <-> Meeting`

Uses:

- buyer-brand introductions;
- BFS delegate discovery;
- cross-event MFW↔BFS network analysis;
- connection explanation;
- sponsor/network-effect analytics.

Do not create a separate graph authority initially. PostgreSQL projection/materialised tables are sufficient until scale proves otherwise.

---

### Phase 10 — Venue/campus mapping

Reference: https://github.com/maplibre/maplibre-gl-js

Use MapLibre as a visual renderer for venue/campus/outdoor navigation where map interaction materially improves the event.

MFW authority supplies:

- venues;
- zones;
- entrances;
- sponsor/showroom locations;
- accessibility routes;
- temporary closures;
- event/session links.

MapLibre must not own venue state.

If indoor plans need a custom coordinate system, keep indoor floor geometry as MFW assets/GeoJSON and use the map only as presentation.

---

### Phase 11 — Surveys and feedback

Reference: https://github.com/formbricks/formbricks

Use for contextual surveys:

- after show/session;
- buyer satisfaction;
- sponsor research;
- event NPS/experience;
- content relevance.

Boundary:

- consent and user/event identity mapping stay in MFW;
- survey response may be stored externally;
- imported/linked summary is classified as observed survey data;
- free-text responses are not silently converted into customer facts.

---

### Phase 12 — Controlled experimentation

Reference: https://github.com/growthbook/growthbook

Candidate experiments:

- onboarding interest selection;
- Home ranking;
- reminder timing;
- content card design;
- call-to-action copy;
- agenda conflict resolution UX.

Required fields for every experiment:

- experiment ID/version;
- eligibility;
- assignment;
- start/end;
- primary metric;
- guardrail metrics;
- exclusion rules;
- result status.

Do not experiment on security, consent, eligibility, access control, QR validity or legal disclosures.

---

### Phase 13 — Email and notification delivery adapters

#### listmonk

Repository: https://github.com/knadh/listmonk

Use only as bulk/editorial email delivery.

MFW remains source for:

- consent;
- segment membership;
- frequency caps;
- campaign ID;
- attribution keys.

Exports to listmonk must be versioned/audited; unsubscribe signals must be reconciled back to MFW consent state.

#### Novu

Repository: https://github.com/novuhq/novu

**Deferred.** Current MFW already has notification/reminder/journey infrastructure. Add Novu only if multi-channel template orchestration becomes operationally expensive to maintain. If adopted later, it is a delivery/orchestration adapter, not a replacement for MFW campaign/journey authority.

---

### Phase 14 — Public-surface analytics

Reference: https://github.com/umami-software/umami

**Deferred/optional.** Use only for anonymous/public marketing surfaces where lightweight privacy-focused analytics are useful.

It must not replace:

- CRM/CDP facts;
- attendance;
- attribution;
- incrementality;
- Owner Control Tower.

---

### Phase 15 — Check-in operations patterns

Reference: https://github.com/HiEventsDev/Hi.Events

No runtime migration is planned because MFW already owns signed QR/check-in.

Study and selectively reproduce:

- access-list UX;
- check-in logs;
- operator exception handling;
- attendee support flows;
- badge/access status visibility.

Any implementation must call existing MFW credential/check-in authority.

## 6. Data/API additions expected

The exact schema belongs to the implementation PRs, but the roadmap expects new namespaces/tables for:

- jobs / delivery attempts;
- policy mappings;
- streaming providers/sources/playback assets;
- wallet pass serials/updates;
- programme production/submissions/review/readiness;
- external calendar connections;
- editorial publication versions;
- sponsor commitments/inventory/evidence;
- recommendation impressions/reasons;
- network graph projections;
- venue geometry/POIs;
- surveys/feedback links;
- experiment assignments/exposures.

Every table carrying provider state must store provider name, external ID, status, timestamps and metadata without making provider payloads the domain source of truth.

## 7. Cross-cutting tests

Each integration wave must add:

1. permission-negative tests;
2. idempotency/replay tests for provider callbacks;
3. persistence tests against PostgreSQL;
4. unavailable-provider fallback;
5. stale/duplicate provider event handling;
6. RU/EN UI coverage;
7. MFW/BFS visual-boundary check;
8. exact event/user/brand isolation;
9. migration reconciliation;
10. live smoke and exact Git SHA evidence.

## 8. Explicitly prohibited architecture

Do **not**:

- replace MFW identity with an external event platform;
- replace MFW QR authority with Hi.Events/Wallet payload;
- make Cal.com the source of B2B meetings;
- run both pretalx and Indico as competing programme authorities;
- move Brand365/CRM segments into Directus;
- let Metarank mutate customer facts;
- use listmonk/Novu as the consent source;
- use Umami as business/owner analytics;
- let streaming provider callbacks directly mutate business tables without provider-event admission;
- add a new stateful service before PostgreSQL durability is proven unless it is explicitly stateless/rebuildable.

## 9. Definition of complete roadmap integration

This document is considered fully executed only when:

- Phase 0 durable authority is green;
- every **ADOPT** item is implemented or explicitly superseded with written rationale;
- every **ADAPT** item has a native MFW equivalent or a bounded adapter;
- every provider has health/readiness/failure handling;
- all new capabilities appear in `CURRENT_STATE.md`;
- deployment/runtime changes appear in `RENDER_STATE.md`;
- release waves are recorded in `RELEASE_LOG.md`;
- exact-head end-to-end paths are green.

## 10. Suggested implementation issue order

1. MFW-INT-00 Durable PostgreSQL admission.
2. MFW-INT-01 pg-boss durable jobs.
3. MFW-INT-02 Formal authorization policy.
4. MFW-INT-03 Live provider + hls.js player.
5. MFW-INT-04 Signed Wallet passes.
6. MFW-INT-05 Programme Production / CFP.
7. MFW-INT-06 External availability adapter for B2B meetings.
8. MFW-INT-07 Editorial authoring/import.
9. MFW-INT-08 Sponsor Inventory & Evidence.
10. MFW-INT-09 Personalised ranking.
11. MFW-INT-10 Network graph projection.
12. MFW-INT-11 Venue/campus map.
13. MFW-INT-12 Contextual surveys.
14. MFW-INT-13 Controlled experimentation.
15. MFW-INT-14 Email delivery.
16. MFW-INT-15 Optional notification/public-analytics adapters.

### Extended issue order for additional waves

These items were added after the original MFW-INT-00…15 list and are now part of the same dependency-controlled backlog:

17. **MFW-INT-16 OpenTelemetry tracing** — after MFW-INT-00; instrument PostgreSQL/jobs/providers as each becomes real.
18. **MFW-INT-17 OpenFeature rollout boundary** — native stateless boundary exists; external provider remains optional/deferred until required.
19. **MFW-INT-18 Privileged passkeys / step-up auth** — after stable durable identity and formal policy.
20. **MFW-INT-19 Searchable replay transcript pipeline** — after real replay/media provider + durable jobs.
21. **MFW-INT-20 Runway Look Timeline** — after stable replay assets and canonical look IDs.
22. **MFW-INT-21 Media Rights / Embargo authority** — may start with editorial authoring, requires durable audit/state.
23. **MFW-INT-22 Venue Operations authority** — after durable PostgreSQL/jobs and existing check-in authority.
24. **MFW-INT-23 Unified Discovery Search** — after durable PostgreSQL + outbox/indexing jobs; Meilisearch remains rebuildable projection.
25. **MFW-INT-24 Agenda iCalendar portability** — after durable programme/agenda; external calendars remain projections.
26. **MFW-INT-25 Live moderated Q&A / polls** — after durable session/programme authority + jobs/policy.
27. **MFW-INT-26 Interaction-to-Replay bridge** — after MFW-INT-19 and MFW-INT-25, using approved interaction state only.
28. **MFW-INT-27 Made in Moscow ecosystem integration** — after durable PostgreSQL + jobs/policy; verified residency projection -> partner hub/showroom -> B2B/Brand365 continuity -> scoped evidence dashboard.

**Current execution pointer:** MFW-INT-00 remains the blocking issue. MFW-INT-17 has a safe native boundary implemented but is not allowed to pull any persistent issue ahead of MFW-INT-00.


---

**Implementation instruction:** preserve the current MFW authority model. Integrate external capabilities at explicit boundaries; never call a feature complete because an external service has been connected. Completion requires MFW-owned state transitions, tests, failure handling and release evidence.

## 11. Additional integration wave — observability, privileged identity and rollout control

These capabilities are additional to the phases above and must not bypass them.

### 11.1 OpenTelemetry end-to-end tracing — ADOPT

Reference: https://github.com/open-telemetry/opentelemetry-js

Instrument:

`web/API request -> auth -> domain command -> PostgreSQL -> pg-boss job -> provider call/webhook -> notification/stream/pass outcome`

Required attributes:

- release SHA;
- request/correlation ID;
- event/project scope;
- job type/id;
- provider name;
- result/error class;
- latency.

Do **not** put access tokens, QR secrets, private profile data or raw campaign audience data into traces.

Use tracing to answer operational questions such as: "why did this reminder/pass refresh/campaign delivery not complete?" It must remain an observability layer, not a business-state store.

### 11.2 Passkeys for privileged roles — ADOPT

Reference: https://github.com/MasterKale/SimpleWebAuthn

Add WebAuthn/passkeys first for high-risk roles:

- owner/admin;
- organiser;
- brand manager;
- staff roles that can issue/revoke access or operate check-in;
- later, optional end-user passwordless login.

Passkeys complement the existing identity model. They do not create a separate user directory.

Sensitive operations should support step-up authentication:

- credential/pass revocation;
- sponsor/brand access grant;
- campaign launch;
- export of audience data;
- security/settings changes.

Recovery flow must be explicit and audited.

### 11.3 OpenFeature rollout boundary — ADAPT

Reference: https://github.com/open-feature/js-sdk

Introduce a small feature-evaluation boundary so rollout logic does not spread through UI/API conditionals.

Use cases:

- gradual feature rollout;
- staff-only preview;
- MFW vs BFS capability exposure;
- emergency kill switch for non-critical features.

GrowthBook may later act as an experimentation/flag provider, but MFW code consumes a stable feature interface.

Flags must never control security invariants, consent validity, QR signature verification or financial truth.


**Implementation note — 2026-10-02:** the native provider boundary is now present as an OpenFeature-compatible boolean-evaluation interface with deterministic environment/default fallback. Initial preview flags all default off, critical/security/consent/QR/financial flag names are rejected, and the public evaluation endpoint cannot override role context supplied by the signed MFW session. A third-party provider (for example GrowthBook later) has **not** been adopted yet; MFW remains fully functional with no provider.

### 11.4 Operational acceptance

Before this additional wave is complete:

- traces connect HTTP, jobs and provider callbacks;
- production secrets/PII are absent from telemetry samples;
- privileged passkey enrollment/recovery is tested;
- feature evaluation has deterministic fallback;
- disabling the flag provider does not break core event admission, QR or agenda flows.

**Sequencing:** OpenTelemetry can start immediately after durable PostgreSQL admission; passkeys follow stable production identity; OpenFeature should be introduced before the number of rollout/experiment conditions becomes difficult to govern.

## 12. Additional integration wave — searchable replay, runway media rights and venue operations

This wave extends the media/event layer after the existing LIVE, programme, agenda and durable-job phases. It does not change registration, pass, CRM/CDP or campaign authorities.

### 12.1 Searchable replay transcript and caption authority — ADOPT/ADAPT

Processing reference: https://github.com/m-bain/whisperX

For eligible MFW/BFS streams and replays, add an asynchronous media-processing path:

`approved replay asset -> audio extraction -> speech transcription/alignment -> timecoded transcript segments -> human/editor review -> published captions/search projection`

Persist in MFW:

- replay/session/show ID;
- processor/provider + model/version;
- language;
- segment start/end;
- raw machine transcript;
- reviewed/published transcript;
- speaker label when confirmed;
- processing status/error;
- source asset checksum/version.

Use cases:

- searchable BFS session replay;
- captions/accessibility;
- speaker/session quotes with exact time anchors;
- automatic chapter candidates;
- post-event editorial search.

WhisperX is a processing worker only. It must not become the programme/content authority and machine text must not be quoted as confirmed speaker wording until reviewed where accuracy matters.

### 12.2 Runway Look Timeline — ADOPT

Create a native timeline connecting a fashion-show replay to canonical collection/look records:

`show -> replay -> time range -> look -> product/collection media -> designer/brand`

Support:

- manual exact look markers;
- assisted candidate matching from approved runway frames/media;
- correction/version history;
- "jump to look" playback;
- buyer shortlist from replay;
- look-level engagement analytics.

Any computer-vision similarity can suggest a look but cannot publish the relationship without confidence/review rules. The canonical look/collection identity stays in MFW.

This layer should be implemented **after** replay assets and collection/look IDs are stable, and before advanced replay commerce is expanded.

### 12.3 Media Rights, Embargo and Press Asset Authority — ADOPT

Optional DAM reference/sidecar: https://github.com/resourcespace/resourcespace

Introduce native MFW metadata for every press/editorial asset:

- asset/media ID;
- rights owner;
- photographer/creator credit;
- permitted channels/territories;
- embargo until;
- expiry where relevant;
- press/public/private scope;
- derivative permission;
- associated brand/designer/show/session;
- source/original checksum;
- approved derivative IDs.

Flow:

`asset admission -> rights/credit -> review -> embargo/publish state -> approved distribution -> usage evidence`

ResourceSpace may later be used as an editorial DAM sidecar if asset volume/press operations justify it. If used, MFW still stores the publication/rights projection required by product surfaces and never treats DAM folders as CRM or programme truth.

A missing/expired right should fail closed for new publication.

### 12.4 Venue Operations: capacity, queue and incident authority — ADOPT

Add a bounded operational layer for live event execution:

- venue/zone;
- capacity;
- observed occupancy snapshots;
- entry/queue state;
- temporary closure;
- incident;
- severity;
- owner/team;
- opened/resolved timestamps;
- participant-impact flag;
- communication status.

Possible inputs:

- staff observations;
- check-in events;
- explicitly integrated counters/sensors later.

Do not infer precise occupancy from registration or QR check-ins alone unless the methodology is documented; exits/re-entry make such counts incomplete.

Participant surfaces may then show:

- "entry delayed";
- "venue full";
- alternate entrance;
- schedule/room disruption.

Staff/admin gets incident timeline, escalation and resolution evidence.

### 12.5 Additional acceptance

- replay search always resolves to exact asset + time range;
- reviewed transcript and raw machine transcript are distinguishable;
- runway look linkage is versioned and reversible;
- no press asset publishes without a valid rights/embargo state;
- venue capacity/queue state identifies whether it is observed, calculated or estimated;
- incident alerts use existing MFW notification authority rather than a parallel messaging system.

**Sequencing:** LIVE/replay provider first -> transcript/replay indexing -> runway timeline; media-rights metadata can start with editorial authoring; venue operations follows durable PostgreSQL/jobs and existing check-in authority.

**Dependency hygiene:** pin runtime versions and review each external project's current LICENSE/security posture before adoption. ResourceSpace/WhisperX remain replaceable providers/components, not MFW domain authorities.

## 13. Additional integration wave — unified discovery search and agenda portability

This wave improves participant discovery after the programme, Brand 365, replay and editorial objects are already authoritative.

### 13.1 Unified Discovery Search — ADOPT/SIDECAR

Reference: https://github.com/meilisearch/meilisearch

Use a dedicated MFW Meilisearch Community Edition index/read model for:

- brands and designers;
- shows and collections;
- BFS sessions/topics;
- speakers and organisations;
- venues;
- approved editorial/Brand 365 content;
- reviewed replay transcripts/chapters;
- optionally public sponsor/partner entities.

Index flow:

authoritative MFW event/outbox -> indexing job -> Meilisearch document -> search result ID -> MFW entity lookup/render

The search engine never owns publication state, access rights, agenda state or CRM profile truth.

Every indexed document should carry only bounded search projection fields such as entity type, canonical ID, title, language, tags/topics, public status, event brand and searchable text.

Private/unpublished entities must not be indexed into a public index.

### 13.2 Search Relevance Governance — ADOPT

Keep relevance configuration in versioned MFW configuration, including:

- searchable attributes;
- filters/facets;
- synonyms;
- language-specific normalization;
- curated promoted result overrides where product/editorial policy requires them;
- deprecated term mappings;
- fallback behavior.

A curated override points to canonical entity IDs and expires/version-controls like other content configuration.

Track privacy-safe search analytics:

- query count;
- zero-result queries;
- filter usage;
- result click/open;
- downstream add-to-agenda/follow/replay actions.

Do not use raw search logs as CRM facts without an explicit approved analytics mapping.

### 13.3 Personal Agenda Calendar Export — ADOPT

Reference: https://github.com/kewisch/ical.js

Generate standards-based iCalendar output from the canonical MFW/BFS agenda.

Support:

- download .ics for an agenda;
- individual event add-to-calendar;
- stable UID per programme item;
- timezone-safe start/end;
- location;
- last-modified / sequence behavior;
- cancellation or moved-session updates;
- event deep link.

Optional subscription feeds may use a high-entropy revocable token. A calendar feed token is not an authentication credential for the rest of the account.

External calendar copies are projections. MFW remains the source for programme changes and agenda conflict logic.

### 13.4 Cross-project reuse

FLASHIN already operates Meilisearch in the portfolio. Reuse deployment/health/indexing lessons where applicable, but do not share FLASHIN indexes, credentials or business data with MFW.

### 13.5 Additional acceptance

- deleting/unpublishing an entity removes it from discoverable search within a bounded indexing SLA;
- search results resolve back to canonical MFW IDs;
- index rebuild from PostgreSQL is deterministic;
- zero-result analytics contain no unnecessary personal data;
- ICS UIDs remain stable across non-identity programme edits;
- schedule moves/cancellations produce correct calendar updates without turning the external calendar into programme authority.

**Sequencing:** durable PostgreSQL + pg-boss/outbox first -> search projections -> replay transcript indexing -> agenda calendar export/subscription.

**Dependency note:** use only a currently permitted Meilisearch edition/features; re-check license/edition terms before production upgrades.

## 14. Additional integration wave — live audience Q&A, polls and moderated interaction

This wave strengthens the live participant experience, especially for BFS sessions, without introducing a parallel identity, messaging or programme system.

### Live Session Interaction Authority — ADOPT

Create native session-linked entities:

- interaction_session;
- question;
- poll;
- poll_option;
- response;
- upvote;
- moderation_state;
- stage_display_state;
- closed_at;
- result_snapshot.

Canonical flow:

participant -> eligible session -> submit question / answer poll -> moderation -> stage display -> presenter/moderator action -> final result -> replay/session archive

All interactions reference the authoritative MFW/BFS session and participant identity/registration state where required.

### Moderated Q&A Queue — ADOPT

Support:

- anonymous-to-audience but authenticated-to-platform question submission where policy allows;
- moderator approve/reject;
- duplicate question merge/link;
- participant upvote;
- pin/promote to stage;
- answered/unanswered state;
- moderation reason/audit;
- optional speaker assignment.

Do not implement a free-form chat room as part of this feature. Q&A is a structured session workflow.

### Polling / Audience Response — ADOPT

Poll types may include:

- single choice;
- multiple choice;
- rating;
- yes/no;
- short bounded text where moderation is appropriate.

Each poll stores:

- session;
- creator/moderator;
- open/close times;
- eligibility;
- response mode;
- result visibility;
- result snapshot/version.

Results shown on stage are derived aggregates. Raw participant responses remain governed by consent/privacy rules.

### ARSnova / Particify-style reference — REFERENCE

Reference implementation source:

https://github.com/arsnova-dev/arsnova.eu

The verified repository is active and MIT-licensed, but should be used as a UX/domain reference rather than adopted as a second event platform.

Useful patterns to study:

- audience-response interaction;
- question/poll presentation;
- live moderation;
- session-oriented participation;
- presenter/audience separation.

MFW must keep its own session/identity/analytics authority.

### Interaction-to-Replay bridge — ADOPT

After a session ends, allow approved interaction records to become replay context:

- poll result chapter marker;
- answered Q&A item linked to transcript time range;
- highlighted audience question;
- follow-up editorial content.

Machine transcript matching may suggest the answer time range, but an approved replay marker remains reviewable/versioned.

### Interaction Analytics — ADOPT

Measure:

- participation rate;
- question submission/upvote;
- poll response;
- answered-question rate;
- interaction by session/topic;
- downstream replay/follow action.

Do not use participant interaction to infer political, health or other sensitive personal attributes.

### Additional acceptance

- only eligible participants/staff can submit/moderate where the session policy requires it;
- moderation history is auditable;
- duplicate retries cannot double-count poll responses/upvotes;
- result snapshots are reproducible from authoritative responses;
- interaction layer failure does not break programme, agenda, QR or stream playback;
- replay publication uses approved interaction state only.

**Sequencing:** session/programme authority + durable jobs first -> Q&A/polls -> stage display -> replay bridge -> analytics.

**Dependency note:** ARSnova is a reference implementation only; do not introduce a second participant/event database.

## 15. Additional integration wave — Made in Moscow ecosystem partnership

This wave reflects the **existing real-world role** of the city project «Сделано в Москве» / Made in Moscow in Moscow Fashion Week and converts that offline partnership into a bounded digital capability.

Verified public baseline (reviewed 2026-10-02):
- «Сделано в Москве» is already a co-organizer of the MFW market/showroom;
- the September–October 2026 market/showroom included more than 90 brands;
- MFW programme/gallery includes a dedicated «Сделано в Москве» fashion show;
- the programme is operated as a Moscow local-brand promotion/support mechanism, not as MFW domain authority.

Official public references:
- https://moscowfashion.ru/2026/market
- https://www.moscowfashion.ru/news/seventh-mfw
- https://www.moscowfashion.ru/news/seventh-mfw-opening
- https://www.moscowfashion.ru/news/mfw-day-five

### 15.1 Partnership role — ADOPT

Model «Сделано в Москве» primarily as an **institutional ecosystem / local-brand growth partner**, not as a second event platform.

MFW remains authority for:
- participant identity;
- MFW/BFS registration;
- programme/session state;
- QR/admission;
- buyer meetings;
- platform CRM/Brand365 state;
- analytics/evidence contracts.

The Made in Moscow integration may own or provide:
- verified programme residency/reference status;
- approved local-brand catalogue input;
- campaign/editorial collections;
- partner-specific activation configuration;
- bounded partner reporting exports.

Do not copy the programme's internal administrative system into MFW.

### 15.2 Verified residency badge and brand projection — ADOPT

Add a bounded projection to canonical MFW Brand:

- `made_in_moscow_status`: verified / not_verified / unknown;
- `made_in_moscow_verified_at`;
- `made_in_moscow_source_ref`;
- optional public programme URL;
- residency badge visible on approved brand surfaces.

The status must come from an approved roster/import/API or reviewed evidence. A brand must not self-assert the badge.

### 15.3 Made in Moscow Hub — ADOPT

Create a dedicated partner surface inside the existing platform, not a standalone app:

- curated Made in Moscow brands;
- MFW participating brands;
- runway/show participation;
- market/showroom location;
- product/editorial highlights where publication rights exist;
- buyer-facing filters;
- follow/favorite/save actions routed into existing Brand365 authority;
- post-event discovery rather than event-only exposure.

The hub must preserve the visual identity boundary between MFW and the programme while remaining inside the one-platform account model.

### 15.4 Market / Showroom digital layer — ADOPT

Extend the existing venue/brand/agenda model with:

- booth / showroom location reference;
- opening hours;
- brand-to-location mapping;
- participant save-to-route;
- buyer shortlist;
- QR/deep-link from physical stand to canonical brand page;
- optional approved offer/coupon routed through existing reward/evidence rules;
- no independent POS truth inside MFW unless a formal provider integration is admitted.

This should later compose with Venue Operations (MFW-INT-22) and venue mapping.

### 15.5 Buyer and B2B bridge — ADOPT

Use the existing MFW buyer/meeting authority to make the partnership commercially measurable:

Made in Moscow brand -> buyer discovery -> shortlist -> meeting/request -> follow-up -> lead state -> evidence.

Partner views may expose only approved aggregate or scoped brand-level metrics.

Do not provide unrestricted access to participant CRM data.

### 15.6 Brand365 continuity — ADOPT

The strategic value is not just six event days.

For participating Made in Moscow brands, allow approved Brand365 continuity:

- follow;
- favorite/save;
- verified loyalty eligibility where configured;
- editorial updates;
- approved campaigns;
- replay/runway context;
- buyer follow-up;
- retention analytics.

The programme becomes an acquisition/curation source; Brand365 remains MFW-owned state.

### 15.7 Partner evidence dashboard — ADOPT

Create a scoped partner evidence view with privacy-safe metrics such as:

- verified participating brands;
- profile/product/content opens;
- market/showroom route saves;
- QR/deep-link opens;
- follows/favorites;
- buyer shortlist / meeting requests;
- completed B2B follow-ups;
- approved reward/redemption evidence;
- post-event 7/30-day engagement;
- attributable campaign outcomes where an admitted evidence contract exists.

This is reporting/evidence, not ownership of the underlying MFW CRM.

### 15.8 Commercial / funding posture

Treat three relationships separately:

1. **Institutional ecosystem partner** — existing operational fit; highest-priority integration posture.
2. **Module/activation co-funder or commissioning partner** — potentially appropriate for a bounded Made in Moscow digital showroom / Brand365 / buyer-evidence layer, subject to the actual public procurement/support mechanism.
3. **Equity / venture investor in the MFW platform** — do not assume this role. The public programme's documented mandate is local-brand promotion/support, not venture ownership of MFW software.

Any funding route must be verified with the responsible programme/legal/procurement authority before being represented as available.

### 15.9 Additional acceptance

- no self-asserted Made in Moscow residency badge;
- roster sync/import is idempotent and auditable;
- programme status never grants MFW admission/authorization by itself;
- partner hub resolves to canonical MFW Brand IDs;
- participant CRM data is not exposed beyond scoped/approved contracts;
- post-event engagement remains available after the physical market closes;
- buyer outcomes can be measured without creating a second lead database;
- if external programme data is unavailable, core MFW remains fully functional.

**Sequencing:** Phase 0 durable PostgreSQL -> pg-boss/outbox/formal policy -> verified Made in Moscow roster projection -> hub/showroom layer -> B2B/Brand365 continuity -> partner evidence dashboard.

### 15.10 Current decision

Made in Moscow should be actively integrated into the MFW digital product as an institutional/growth partner. It should **not** be modelled as the primary platform investor by default. A bounded co-funded/commissioned digital module is a more structurally aligned funding hypothesis and must be legally/operationally verified before outreach.
