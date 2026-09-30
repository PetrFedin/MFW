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
