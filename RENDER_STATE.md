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
