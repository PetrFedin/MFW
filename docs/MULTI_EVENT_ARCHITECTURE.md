# Dual-event platform architecture

The application is one platform with two first-class event contexts:

- Moscow Fashion Week
- BRICS+ Fashion Summit

The events overlap in time and may share users and infrastructure, but event-owned state must never be shared implicitly.

## Authority rule

Every mutable event-owned entity carries an event_id, directly or through a mandatory parent relation. No API route, cache key, QR credential, notification, programme item, accreditation decision, meeting or analytics event may silently default to Moscow Fashion Week.

## Shared platform layer

Shared identity/authentication, profile, RU/EN language, device/session management, notification transport, files/media, audit transport and analytics ingestion.

## Event-owned layer

Programme, sessions, venues, speakers/designers/delegates, accreditations, passes, QR credentials, favourites, meetings, notifications, streaming schedule, partner placements, event analytics and staff permissions.

## Moscow Fashion Week surfaces

Shows, designers/brands/looks, buyers, showroom, market, business programme, World Fashion Shorts, streaming/replay and commerce lead handoff.

## BRICS+ Fashion Summit surfaces

Business programme, speakers, international delegations, exhibition, B2B meetings, session registration, QR access, media accreditation, World Fashion Shorts, streaming/replay and partner placements.

## Navigation

The authenticated app gets a persistent event switcher. During overlapping dates, Home can expose a combined "Today" view, while all deep links include the event slug. My Schedule supports Combined / MFW / BRICS filters. Admin requires an explicit event scope.

## Cross-event identity

One person may be a buyer at MFW and a delegate/speaker at BRICS+. Roles and entitlements therefore belong to event memberships, not to the global user.

## QR rule

Every access credential must be bound to user/pass identity, event_id, entitlements, issued_at, expiry and nonce/version. An MFW pass never grants BRICS+ access without a BRICS+ entitlement.

## Analytics rule

Every event telemetry envelope includes event_id, event_code, actor_id when authenticated, event role, surface, action and timestamp. Executive cross-event reporting aggregates only after event-level facts are isolated.

## Migration sequence

1. Create and seed events.
2. Introduce event-scoped memberships and entitlements.
3. Add event_id to programme, passes, venues, sessions, notifications, meetings and analytics.
4. Backfill legacy MFW rows.
5. Make event_id NOT NULL.
6. Replace global uniqueness with (event_id, local_key).
7. Add event-aware API middleware.
8. Add event switcher UI.
9. Run dual-event Golden Path and isolation tests.

## Golden Path

Shared: register/login -> profile -> language -> event chooser.

MFW: select MFW -> shows/programme -> save -> buyer/designer action -> pass -> QR check-in -> stream/replay -> analytics.

BRICS+: select BRICS+ -> business programme -> session -> save/register -> delegate/speaker context -> pass -> QR check-in -> exhibition/session access -> B2B meeting -> stream/replay -> analytics.

Isolation proof: use the same local identifier in both events and verify separate DB rows, API responses, cache keys, permissions, QR entitlements and analytics attribution.
