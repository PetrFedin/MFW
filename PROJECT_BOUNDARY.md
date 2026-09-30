# MFW project boundary

## Canonical repository

**Repository:** `PetrFedin/MFW`  
**Canonical branch:** `main`

Everything related to Moscow Fashion Week (MFW) and BRICS+ Fashion Summit (BFS) that is developed in the MGW ChatGPT project must be committed to this repository.

The `PetrFedin/Moscow` repository is a separate tourism/city product and is not an MFW source repository.

## Product boundary

This repository owns:

- Moscow Fashion Week consumer experience
- BRICS+ Fashion Summit consumer/business experience
- shared identity/account between MFW and BFS
- event-specific registration
- programme, speakers, designers, brands, shows, sessions
- QR credentials and passes
- Brand 365 / loyalty / reward wallet
- Brand CRM/CDP
- buyer/delegate B2B flows
- notification/reminder engine
- campaign incrementality and attribution
- RFM/LTV/churn/next-best-action
- automated journeys/state machine
- owner/investor analytics and Control Tower
- MFW API, PostgreSQL migrations, native bridge
- Render deployment manifests/runbooks

## Design boundary

MFW and BFS share backend authorities and identity, but **do not share a unified visual design**.

- MFW keeps its own fashion/editorial design system.
- BFS keeps its own summit/business design system.
- Shared account, agenda, loyalty, CRM and analytics are infrastructure, not a reason to visually merge the events.

## Development rule

Every MFW/BFS change must leave a trace in this repository:

1. code change;
2. current-state update when product scope changes materially;
3. Render/deployment update when runtime state changes;
4. tests/contracts for new authority behavior.

No new MFW feature should be implemented only in another repository.
