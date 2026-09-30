# Render deployment state

Snapshot date: **2026-09-30**

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

There is currently no dedicated MFW PostgreSQL instance in the Render workspace.

Do **not** reuse `renova-review-db`; it belongs to another project.

Until a dedicated MFW PostgreSQL is provisioned and `DATABASE_URL` is wired:
- authority can run and self-test in memory mode;
- persistence across service restarts is not production-grade;
- server-side social reverification remains disabled;
- `MFW_REQUIRE_POSTGRES` remains `false`.

After PostgreSQL is available:
1. wire `DATABASE_URL`;
2. run migrations 001–016;
3. verify schema reconciliation;
4. verify `dataMode=postgres`;
5. verify social reverification;
6. set `MFW_REQUIRE_POSTGRES=true`;
7. record exact deploy in this file and `RELEASE_LOG.md`.
