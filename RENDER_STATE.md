# Render deployment state

Snapshot date: **2026-10-07**

## Legacy live contour

The currently working public MFW contour was originally created while MFW code lived in `PetrFedin/Moscow:mfw-app`.

### 1. Preview

- Render service: `moscow-fashion-week-preview`
- Service ID: `srv-darbk87pn0mc738s26pg`
- Type: static site
- Region/CDN: Render static
- Current source repository: `https://github.com/PetrFedin/Moscow`
- Current source branch: `mfw-app`
- Build command: `echo MFW static build`
- Publish path: `mfw`
- Auto deploy: yes
- URL: https://moscow-fashion-week-preview.onrender.com

### 2. API

- Render service: `moscow-fashion-week-api`
- Service ID: `srv-darfgjvpn0mc73cbrnl0`
- Type: Node web service
- Plan: free
- Region: Frankfurt
- Current source repository: `https://github.com/PetrFedin/Moscow`
- Current source branch: `mfw-app`
- Build command: `echo MFW API build`
- Start command: `node mfw-api/server.js`
- Auto deploy: yes
- URL: https://moscow-fashion-week-api.onrender.com

### 3. Authority

- Render service: `moscow-fashion-week-authority`
- Service ID: `srv-darfnid9fdbs739ds0b0`
- Type: Node web service
- Plan: free
- Region: Frankfurt
- Current source repository: `https://github.com/PetrFedin/Moscow`
- Current source branch: `mfw-app`
- Build command: `cd mfw-api && npm install --omit=dev`
- Start command: `cd mfw-api && node server-v2.js`
- Auto deploy: yes
- URL: https://moscow-fashion-week-authority.onrender.com

## Canonical target

The canonical source for every future MFW service is:

- repository: `https://github.com/PetrFedin/MFW`
- branch: `main`

The legacy services above must be treated as runtime continuity only until their replacements sourced from `PetrFedin/MFW:main` are verified.

## Deployment rule

For every release:

1. commit to `PetrFedin/MFW:main`;
2. record exact commit SHA;
3. let Render auto-deploy where enabled;
4. verify deploy reached exact commit;
5. verify preview/API/authority surfaces;
6. update `RELEASE_LOG.md` with result and blockers.

Do not call a release live until Render reports a successful deploy and the expected surfaces are verified.


## Canonical MFW contour — LIVE

Created: **2026-09-30**

All three canonical services now source `PetrFedin/MFW:main` directly and have `autoDeploy=yes`.

### Platform
- service: `mfw-platform`
- id: `srv-daug1qrncjis73fg95gg`
- URL: https://mfw-platform.onrender.com
- initial deploy: `dep-daug1r3ncjis73fg96b0`
- exact commit: `6fa0adaae2db67fc6b5b21484c19cc5a9c665402`
- status: **live**

### API
- service: `mfw-api`
- id: `srv-daug1v6gekts73eal6j0`
- URL: https://mfw-api.onrender.com
- initial deploy: `dep-daug1vugekts73eal8d0`
- exact commit: `6fa0adaae2db67fc6b5b21484c19cc5a9c665402`
- status: **live**
- startup evidence: `mfw_api_started`, version `investor-api-v2`

### Authority
- service: `mfw-authority`
- id: `srv-daug20id0e5s73fjtsr0`
- URL: https://mfw-authority.onrender.com
- initial deploy: `dep-daug21ad0e5s73fjtuvg`
- exact commit: `6fa0adaae2db67fc6b5b21484c19cc5a9c665402`
- status: **live**
- deep self-test: **PASS**
- current persistence: `dataMode=memory`
- social reverification scheduler: inactive until PostgreSQL is connected

## Remaining production-persistence blocker

Dedicated PostgreSQL now exists:

- name: `mfw-postgres`
- id: `dpg-daugci8jo6nc738akc10-a`
- plan: Free
- PostgreSQL: 17
- region: Frankfurt
- status: available

The blocker is **not database provisioning**. The direct-created `mfw-authority` service has not inherited the Blueprint `fromDatabase` binding, so its runtime still reports `dataMode=memory`.

Until `DATABASE_URL` is securely bound:
- persistence across service restarts is not production-grade;
- server-side social reverification remains disabled;
- `MFW_REQUIRE_POSTGRES` remains false in the live direct-created service;
- `GET /ready` must return 503 after the readiness-contract release.

Admission sequence:
1. securely bind existing `mfw-postgres` as `DATABASE_URL`;
2. set `MFW_REQUIRE_POSTGRES=true`;
3. authority startup applies migrations 001–025 transactionally;
4. verify schema reconciliation;
5. verify `dataMode=postgres`;
6. verify social reverification;
7. verify `GET /ready` = 200;
8. record exact deploy in this file and `RELEASE_LOG.md`.

Do not expose or reconstruct the generated database credential outside Render.


## 2026-09-30 exact-head MVP identity wave

Canonical services are live on:
`f201fd66a875a2b701abd8a6f690687b169624d6`

Deploy IDs:
- platform: `dep-daum268jo6nc73dne1a0`
- API: `dep-daum28btqb8s73btcc4g`
- authority: `dep-daum29k1nsns73eqtrs0`

Authority deep self-test: PASS.

Persistence remains blocked only by secure `DATABASE_URL` wiring from `mfw-postgres` to the direct-created authority service. Current mode: `memory`.

Auto-deploy defect is confirmed: commits did not produce deployments automatically even though `autoDeploy=yes`; until fixed, exact-head verification requires explicit deploy trigger.


## 2026-10-02 responsive exact-head recovery

Workspace: `ME` / `tea-dagitrp5efls73apuv50`.

Auto-deploy remains operationally unproven despite `autoDeploy=yes`. Render had stopped creating new deploys after 2026-09-30, so the canonical contour was explicitly redeployed.

Exact deployed commit before the Phase 0 readiness wave:
`850a13bbce33a720a9bff635f606e3e4fbc6f19d`

Deploy evidence:
- `mfw-platform`: `dep-davfr91srm7s73brfahg` — LIVE;
- `mfw-authority`: `dep-davg00k9v7es73flrcr0` — LIVE;
- `mfw-api`: `dep-davg016k1f9s73a6ckag` — LIVE.

Public platform now serves responsive asset revision `platform.css?v=20261001r3`.

Authority at that release:
- version `mfw-authority-v9-mvp-golden-path`;
- deep self-test PASS;
- `dataMode=memory`;
- PostgreSQL admission still blocked by missing runtime binding.

## 2026-10-02 free-contour correction

User constraint: **no paid Render resources**.

Canonical Blueprint corrections:

- removed `mfw-social-reverification` Render Cron from `render.yaml`;
- authority now performs stale-aware startup catch-up plus in-process interval reverification;
- this is deliberately eventual while the free web service can sleep; it is not represented as strict six-hour wall-clock execution;
- `DATABASE_URL` remains a `fromDatabase: mfw-postgres / connectionString` reference;
- `MFW_REQUIRE_POSTGRES=true` remains the production target;
- Blueprint secret names were reconciled with the actual authority runtime:
  - `MFW_TELEGRAM_BOT_TOKEN`;
  - `MFW_TELEGRAM_WEBHOOK_SECRET`;
  - `MFW_TELEGRAM_LOGIN_CLIENT_ID`;
  - `MFW_TELEGRAM_LOGIN_CLIENT_SECRET`;
  - `MFW_VK_SERVICE_TOKEN`;
  - `MFW_VK_APP_ID`;
  - `MFW_ADMIN_TOKEN`;
  - `MFW_ES256_SEED`.
- `MFW_REVERIFY_INTERVAL_MINUTES=360` and `MFW_REVERIFY_BATCH_SIZE=250` are explicit non-secret config.

Current live blocker remains unchanged: the direct-created authority still needs the existing free PostgreSQL connection securely injected by Render. The MCP update-env action can set literal values but does not expose/apply the generated `fromDatabase` secret reference, so the credential is not reconstructed outside Render.


## 2026-10-07 — Phase 0 runtime re-verification

Render workspace: `ME` / `tea-dagitrp5efls73apuv50`.

Verified through Render control-plane data:

- `mfw-authority`: free web service, Frankfurt, branch `main`, autoDeploy configured as yes;
- `mfw-postgres`: free PostgreSQL 17, Frankfurt, status `available`;
- free database expiry currently reported as 2026-10-30;
- latest observed authority runtime logs still report `dataMode=memory`;
- social reverification remains inactive with reason `postgres_required`;
- the direct-created authority still has not inherited the Blueprint `DATABASE_URL fromDatabase` binding;
- the Render connector cannot safely materialise the generated database connection string and does not expose Blueprint apply/sync;
- database external IP allowlist is empty, so external read-only SQL inspection is intentionally blocked.

Canonical `render.yaml` already contains the correct secure target:

`DATABASE_URL <- fromDatabase(mfw-postgres.connectionString)`
and
`MFW_REQUIRE_POSTGRES=true`.

Therefore the remaining infrastructure action is a Render-side Blueprint apply/sync (or equivalent secure internal binding) for the existing canonical resources. The database password must not be copied into chat, source control or reconstructed through external tooling.

The production migration floor is now 001–025. Capital admission tooling fails closed unless the full schema reconciliation contract is green.
