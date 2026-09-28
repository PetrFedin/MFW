# Dual-event UX contract

## Product model

The user creates one platform account once. That global identity owns profile, contact data, language, devices and authentication.

Participation is not global. Moscow Fashion Week and BRICS+ Fashion Summit each require a separate event registration.

A platform account therefore has three independent states:

- account exists;
- MFW registration state;
- BFS registration state.

Approval for one event never implies approval for the other.

## Entry screen

After login, the user sees two event cards.

Each card shows:
- event identity and dates;
- the user's registration state for that event;
- the correct primary action.

Examples:
- MFW — Approved — Open event
- BFS — Not registered — Register
- MFW — Under review — View application
- BFS — Approved — Open event

This is preferable to asking the user to choose an event before they understand their status.

## Persistent event switcher

Inside an event, the top-level shell always exposes the active event identity.

Switcher:
MFW | BFS

Switching does not log the user out and does not duplicate the profile. It changes event context and therefore:
- visual system;
- navigation;
- programme;
- role;
- permissions;
- pass/QR;
- registration state;
- notifications;
- analytics scope.

Where an equivalent route exists, preserve it:
MFW / My schedule -> BFS / My programme.

Where it does not exist, route to the target event Today screen.

## MFW experience

MFW should feel editorial, visual and runway-led.

Primary surfaces:
Today / Shows / Designers / Programme / Market / Showroom / Shorts / My schedule / Pass.

The interface prioritises imagery, show time, designer identity, looks and buyer workflows.

## BFS experience

BFS should feel international, institutional and business-led while remaining part of the same premium platform.

Primary surfaces:
Today / Programme / Speakers / Delegations / Exhibition / B2B meetings / Shorts / My programme / Pass.

The interface prioritises session topic, speaker, country/delegation, hall, meeting availability and professional networking.

## Registration

Global profile data may prefill both forms, but each event stores its own registration snapshot.

MFW can request event-specific information for visitor, buyer, designer, media, speaker, partner or staff flows.

BFS can request event-specific information for visitor, delegate, speaker, media, partner or staff flows.

The user explicitly submits each event application. Prefill is convenience, not consent.

## Combined Today and calendar

A platform-level Combined view may show items from both events in chronological order.

Every card must retain visible event identity. Combined view never merges permissions: an item can be visible while its event registration or entitlement still controls booking/access.

Filters:
Combined | MFW | BFS

## Passes

There is no universal QR pass.

My Passes may contain:
- MFW pass;
- BFS pass.

Each QR credential is event-bound. If the user has both, switching event changes the active pass.

## Admin

Admin begins with an explicit event scope:
MFW | BFS | Cross-event analytics.

Operational mutations require MFW or BFS scope. Cross-event mode is read/aggregate by default and must not accidentally edit both events.
