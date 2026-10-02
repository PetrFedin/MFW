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
