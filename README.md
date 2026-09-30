# MFW / Moscow Fashion Platform

MFW is the canonical repository for the Moscow Fashion Week (MFW) and BRICS+ Fashion Summit (BFS) digital platform.

> **Canonical source:** `PetrFedin/MFW:main`  
> **Moscow is a separate project.** Nothing MFW-specific should be developed in `PetrFedin/Moscow`.

## Product vision

The platform extends MFW and BFS beyond the event dates into a persistent fashion ecosystem.

### For participants and guests

- registration and accreditation
- event passes and QR credentials
- programme, shows, sessions and reminders
- designers, brands, speakers and organisations
- follows, favorites and personalized agenda
- LIVE / Replay availability
- Brand 365 and post-event engagement
- loyalty progress and verified rewards
- buyer/delegate discovery and B2B meetings

### For brands

- follower and favorite audience
- verified subscription duration
- 30+/60+ loyalty cohorts
- audience segmentation
- campaign builder
- invitations and push notifications
- news/photo blog
- discount/gift reward campaigns
- one-time QR/coupon redemption
- POS/order import
- campaign attribution
- AOV / repeat / LTV / RFM
- churn scoring and next-best-action
- automated journeys

### For organisers and owners

- identity and registration authority
- event data synchronization
- engagement and attendance surfaces
- brand CRM/CDP infrastructure
- attribution and incrementality
- cohort retention
- cross-brand migration
- MFW ↔ BFS overlap
- acquisition-source economics
- Audience Asset and Owner Control Tower

## Product architecture

### MFW experience

MFW keeps its own fashion/editorial visual identity.

`Brand → Designer → Show → Collection → LIVE/Replay → Follow/Favorite → Reward`

### BFS experience

BFS keeps its own summit/business visual identity.

`Organisation → Delegate/Speaker → Session → Topic → Meeting → Follow → Lead`

### Shared infrastructure

MFW and BFS share infrastructure but **not visual design**:

- identity/account
- registration authority
- agenda
- notifications/reminders
- loyalty
- CRM/CDP
- analytics
- owner/investor layer

## Repository structure

```
mfw/                    # web experiences and platform shell
  app.js
  styles.css
  platform/
    bfs/
    event-data.js
    event-sync.js
    platform.js
  admin/
  mfw/
mfw-api/                # Node API / authority layer
  server-v2.js
  brand365-store.js
  social-providers.js
  migrations/           # PostgreSQL migrations 001-016
mfw-native/             # native bridge / Capacitor support
PROJECT_BOUNDARY.md     # canonical project boundary
CURRENT_STATE.md        # current functional/technical state
RENDER_STATE.md         # Render runtime snapshot
RELEASE_LOG.md          # handoff / release history
render.yaml             # canonical Render Blueprint
```

## Current state

See:

- [CURRENT_STATE.md](./CURRENT_STATE.md)
- [RELEASE_LOG.md](./RELEASE_LOG.md)
- [RENDER_STATE.md](./RENDER_STATE.md)

Current implementation includes:

- dual MFW/BFS experiences
- shared account with separate registrations
- official programme/data layer
- Brand 365
- verified loyalty and reward QR
- Brand CRM/CDP
- treatment/control campaign incrementality
- RFM / churn / CLV / next-best-action
- automated journey state machine
- Owner Control Tower

## Data truth model

Owner/investor metrics are split into four classes:

1. **Observed** — registrations, purchases, customers, retention
2. **Attributed** — linked to brand/campaign/source
3. **Incremental** — measured against control/holdout
4. **Modelled** — churn score, predicted CLV, scenario value

Modelled values must not be represented as audited company valuation.

## Render

The current runtime state is documented in [RENDER_STATE.md](./RENDER_STATE.md).

The canonical deployment target is:

- repository: `https://github.com/PetrFedin/MFW`
- branch: `main`
- infrastructure: `render.yaml`

All future MFW Render services must source this repository.

### One-time GitHub / Render connection

Render currently has access to the historical `PetrFedin/Moscow` repository, but the Render GitHub App still needs access to the private `PetrFedin/MFW` repository.

After that single connection is granted, the Blueprint in `render.yaml` becomes the canonical deploy source and auto-deploy can run directly from `MFW/main`.

## Release discipline

Every meaningful development wave should:

1. commit code to `PetrFedin/MFW:main`
2. update `CURRENT_STATE.md` if product scope changed
3. update `RENDER_STATE.md` if runtime changed
4. append `RELEASE_LOG.md`
5. verify exact Render deploy commit
6. verify preview/API/authority health
7. record blockers and continuation point

Do not call a release live until the expected Render deploy is live and verified.

## Current continuation point

Next major layer:

- ecosystem economics
- D30/D90/D180/D365 cohort LTV curves
- contribution margin
- paid vs organic acquisition payback
- brand revenue-share economics
- sponsor economics
- MFW ↔ BFS network effects
- audience asset bridge:
  `Opening → Acquired → Retained → Reactivated → Churned → Closing`
- 12 / 24 / 36 month scenarios
