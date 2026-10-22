# MFW Competitive Capability Matrix — 20 October 2026

Scope: MFW / BFS / Made in Moscow, organiser operations, participant experience, wholesale, and year-round relationship continuity. Market features are drawn from vendors' own public product descriptions; actual deployments and performance have not been independently audited. Do not copy competitors' protected code, layouts, branding, or content.

| Capability | Reference product(s) | MFW evidence at integration PR #35 | Gap / development contract | Priority |
| --- | --- | --- | --- | --- |
| Registration, QR access, onsite check-in | Timepad, Cvent, Bizzabo | Event-scoped registration, rotating signed access, scanner and Admin paths | Real provider credentials, offline reconciliation, onsite stress testing | P0 |
| Event schedule and personal agenda | Cvent, Brella | Unified public calendar, agendas, reminders, conflicts | Personal itinerary with physical travel and availability | P1 |
| AI/criteria business matching | Grip, Swapcard, Brella | Manual discovery, meeting request and professional follows | Explainable rank, consent and conflict gating, anti-bias evaluation | P1 |
| Hosted-buyer scheduling | Grip | Request/confirm/reschedule workflows | Two-sided availability, capacity, hosted-buyer session controls | P1 |
| Exhibitor & sponsor lead capture | Swapcard, Cvent | Leads and follow-up, sponsor interaction evidence | Scoped scanning, consent, authoritative export and reconciliation | P0/P1 |
| Wholesale showrooms and line sheets | JOOR, NuORDER | Brand portal, line-sheet and shortlist entry points | Full SKU/size grid, price tiers, approval and purchase workflow | P1 |
| Order-to-reorder lifecycle | JOOR, NuORDER | Commercial evidence and proposed bridge | Buyer orders, shipping proof, sell-through, reorder and ERP integration | P2 |
| Fashion event PR operations | Launchmetrics | Media/press-kit and accreditation primitives | Invitations, seat allocation, sample tracking and press analytics | P2 |
| Russian organiser sales & ticketing | Timepad, Nethouse.Events | Independent registration and demo passes | Russian payments/receipts, import/export, fiscal and data law verification | P1 |
| Cross-event persistent identity | No single equivalence established | Shared user ID, organisation registry, BFS/MADE projections | Prove identity, consent, rights and revocation end-to-end | P0 |
| Provenance-aware investor reporting | Mix of vendors | Snapshot evidence, zero-default revenue, labelled demo | Independent financial/admission verification before production | P0 |

## Delivery rules

1. Never infer an entitlement from a role declared in the browser, public organisation name, or marketing material.
2. Preserve event-specific registrations, legitimate commercial consent and organisation-scoped access.
3. Meetings, CRM leads, revenue and proof must have canonical PostgreSQL source and user ownership.
4. Algorithmic matching must be explainable and deterministic before any AI layer is considered.
5. Preview/demonstration data must remain visibly separated from admitted operational data.
6. No claimed superiority or ROI without independently tested comparable metrics.
7. External APIs, trademarks, partner data and media require commercial and legal review before integration.

## Implementation on this pass

The B2B leads endpoint previously accepted a supplied meeting ID without verifying requester ownership and used an unconditional conflict update. A new transactional ownership guard restricts lead creation to the meeting requester and denies cross-owner updates. The guard lives in `mfw-api/b2b-lead-ownership.js`, its test in `mfw-api/b2b-lead-ownership.test.js`; the production-admission gate is unchanged.

## Vendor reference pages

- Swapcard: https://www.swapcard.com/
- Grip: https://www.grip.events/
- Brella: https://www.brella.io/
- Cvent: https://www.cvent.com/
- Bizzabo: https://www.bizzabo.com/
- JOOR: https://www.joor.com/
- NuORDER: https://www.nuorder.com/
- Timepad: https://timepad.ru/
- Nethouse.Events: https://events.nethouse.ru/
- Launchmetrics: https://www.launchmetrics.com/

These URLs are starting points for feature verification, not proof that every feature is available under every subscription. Verify product editions and API licensing before procurement.
