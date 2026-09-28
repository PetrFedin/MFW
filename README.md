# MFW Platform

Unified digital platform for **Moscow Fashion Week** and **BRICS+ Fashion Summit**.

The architecture is multi-event by design: shared identity and infrastructure, strict event-scoped authority for programme, roles, passes, QR access, meetings, notifications and analytics.

## Current foundation

- event catalog for MFW 2026 and BRICS+ Fashion Summit 2026;
- strict event context resolver;
- event-scoped roles and entitlements;
- PostgreSQL migration `013_multi_event_platform.sql`;
- automated cross-event isolation tests;
- architecture specification in `docs/MULTI_EVENT_ARCHITECTURE.md`.

## Test

```bash
npm test
```

## Next implementation wave

Programme/session authority -> event-aware API -> QR credential authority -> combined/event-specific schedule -> BRICS+ delegate/B2B workflow -> admin switcher -> PostgreSQL Golden Path.
