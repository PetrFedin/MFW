# MFW × «Сделано в Москве» — partnership concept

Date: 2026-10-02

## Decision

Use «Сделано в Москве» as an institutional local-brand growth and evidence partner inside the MFW platform.

Do not position the programme by default as the equity/venture investor in the platform.

The stronger first commercial framing is a bounded digital activation / commissioning / co-funding hypothesis:

`verified resident brands -> digital showroom -> buyer discovery -> Brand365 continuity -> measurable evidence`

Any public funding/procurement mechanism must be verified before it is represented as available.

## Why this fits the real event

The programme already participates in the physical MFW experience as market/showroom co-organizer and has its own fashion-show presence. The missing layer is the persistent digital continuation.

## Proposed product package

### Made in Moscow Verified
Reviewed resident badge on canonical MFW Brand records.

### Made in Moscow Hub
Curated resident-brand discovery inside the one-platform MFW/BFS account.

### Digital Market / Showroom
Stand/booth location, brand deep links, route save, buyer shortlist and approved offers.

### Buyer Bridge
Resident brand -> discovery -> meeting -> follow-up -> lead evidence using existing MFW B2B authority.

### Brand365
Follow/favorite, post-event editorial, approved campaign and loyalty continuity.

### Evidence Dashboard
Scoped partner reporting for engagement, buyer intent and approved outcomes without exposing the full participant CRM.

## Funding posture

1. Institutional partnership — already aligned with actual event operations.
2. Co-funded/commissioned digital module — potentially aligned; mechanism must be confirmed.
3. Equity investor — not assumed and not the first ask.

## Dependency gate

No persistent Made in Moscow module is production-admitted before:

`PostgreSQL Phase 0 -> durable jobs/outbox -> formal policy -> verified roster contract`.

## Implemented product layer

The repository now contains a third Moscow Fashion Platform experience:

`MFW <-> BFS <-> Сделано в Москве`

Implemented in repository:
- shared platform switcher;
- one shared identity/profile entry point;
- separate visual shell inspired by the programme's light/airy visual system and balloon metaphor;
- Verified trust layer;
- Made in Moscow Hub;
- Digital Market / Showroom;
- Buyer Bridge;
- Brand365 continuity;
- Partner Evidence Dashboard;
- investor/partner demonstration route;
- migration 021 for partner-program membership and scoped cross-service moderation;
- MFW brand-card rendering contract for verified programme badges;
- responsive device QA for the third experience.

### Truth boundary

No real brand is labelled as a verified programme member from Moscow location, MFW participation or editorial inference.

Badge condition:

`partner_program=made_in_moscow AND membership=verified AND moderation=approved`

Until an approved roster/import/API is connected, real-brand verified results remain empty.
