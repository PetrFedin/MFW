# MFW — Commercial Proof Ladder & Investor Economics Studio

**Date:** 2026-10-13
**Status:** DRAFT / DEMO-ONLY / NOT PRODUCTION-ADMITTED
**Canonical:** PetrFedin/MFW. MFW, BFS and Made design identities and access authorities remain independent.

## Business purpose

Investors, brands and partners can assess which facts are needed to bridge a pilot, a commercial contract, actual service delivery, invoicing, accounting recognition, bank settlement and repeat revenue. The goal is evidence discipline and transparent revenue mechanics, not a visual claim of bookings or sales.

This feature is NOT a payment processor, finance authority, billing API, audited ARR report or actual accounting ledger. It deliberately creates no revenue or payment facts.

## Read-only evidence ladder

| Stage | Evidence requirement | Truth boundary |
|---|---|---|
| Pilot | Accepted scope and outcome criteria | Not recognised revenue |
| Contract | Signed terms, buyer and price | Not a bank receipt |
| Delivery | Fulfilment record for relevant service period | Engagement is not fulfilment |
| Acceptance | Customer acceptance if applicable | Contract-specific |
| Invoice | Issued invoice and period | Invoicing alone is not recognition |
| Finance | Authorised treatment and accounting record | Finance policy and proper authority required |
| Payment | Bank settlement confirmation | Cash is separate from revenue |
| Renewal | Repeat signed agreement | Not inferred from mere retention |

Until future governed server linkage, all stages remain NOT EVIDENCED. Pure auditEvidence may report REVIEW READY from specially shaped input records but always reports productionRecognised=false, recognisedRevenue=null and cashCollected=null. Client-side strings cannot post ledger entries or override finance decisions.

## Interactive model: inputs and equations

All counterparty counts and money default to zero. The user controls every numeric assumption. No examples are preloaded into the published UI and no business records are fetched or saved.

Variables (monthly unless noted): B = paying Brand365 organisations; Pb = brand tariff, RUB; Cb = variable cost per brand; P = active partner packages; Pp = package price; Cp = package variable cost; F = fixed expenses; T = horizon in months.

    Potential commercial value = B * Pb + P * Pp
    Variable cost = B * Cb + P * Cp
    Contribution = Potential commercial value - Variable cost
    Simplified operating result = Contribution - F
    Period potential = Potential commercial value * T
    Required brands = CEIL(MAX(0, F - P * (Pp - Cp)) / (Pb - Cb))

Required brands is defined only where a viable positive unit contribution exists; if partner contribution alone covers F, the requirement is zero. No negative or zero-unit contribution is silently treated as viable.

All currency calculations use integer kopeks with bounded input magnitude. Invalid, negative, fractional quantities, empty inputs and non-finite values hide financial results rather than showing stale calculations.

The model keeps B and P and their economics constant across T months. It excludes CAC, churn, rebates, taxes, CAPEX, financing, inflation, cost allocation and cash-collection timing. Therefore potential commercial value is NEVER actual MRR, ARR, invoiced cash or recognised revenue.

**Synthetic unit-test example only:** B=10; Pb=1000; Cb=200; P=2; Pp=2500; Cp=500; F=5000; T=12 yields potential value 15000 RUB/month, contribution 12000 RUB/month, simplified result 7000 RUB/month, 2 break-even paying brands and 180000 RUB potential across 12 months. These are arithmetic test inputs, not MFW performance.

## Security and admission boundaries

- Browser truth: MODELLED only, no transmutation into VERIFIED, OBSERVED, INCREMENTAL or RECOGNISED.
- The actuals remain null: recognised revenue, billed amount, collected cash, audited ARR and audited MRR.
- Links navigate to existing Brand/Partner/Evidence Control panels, with no new write permissions.
- No pricing entitlement, real order, invoice, identity credential or payment is created.
- The Draft feature branch is independent of PR #20 and cannot bypass Phase 0 PostgreSQL admission.
- Actual contract/evidence registration requires guarded back-end authority, scoped role/JWT checks, audit, idempotency and independent finance policy approval.
- Additional paid-resource budget: zero.

## Acceptance gates

1. Pure Node contract: zero assumptions, arithmetic, 2-decimal precision, break-even, invalid values and absence of automatic recognition.
2. Playwright in seven viewports (360 / 375 / 393 / 430 / 744 / 1024 / 1440): eight evidence statuses, user-entered calculations, negative cases, reset, link navigation, no horizontal overflow.
3. PWA cache revision and referenced CSS/JS update together.
4. CI success at exact head SHA and independent review.
5. No claim of LIVE revenue, PostgreSQL durability or real payment.

## Follow-on backend after PostgreSQL admission

1. Versioned pilot/contract authority with explicit payer, counterparty, consent, pricing and obligations.
2. Tamper-evident delivery and acceptance snapshots; no payment or revenue inference from meetings, clicks or leads.
3. Invoice references and scoped finance recognition review with accepted accounting policy and accounting period.
4. Settlement evidence separate from income; repeat agreements and payer cohort retention.
5. Investor export: ledger references, missing evidence, effective date, methods and immutable audit; redact personal/tenant-private data.

The feature remains DEMO-ONLY until these gates pass on admitted PostgreSQL. Nothing in this specification authorises new production writes or new paid resources.

## Accounting interpretation reference

IFRS Foundation summary of IFRS 15: https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/ . It explains that revenue recognition follows satisfaction of performance obligations (at a point in time or over time), rather than a mechanical invoice or cash event. This is a **reference framework only**; it does not establish which accounting standard MFW must apply. Finance owners must approve the applicable policy, services, obligations, accounting periods, evidence and any special tax treatment before an actual revenue recognition endpoint is admitted. The investor preview never performs accounting recognition.

## Visual QA artifact

Successful Chromium 7-profile screenshots are captured from the commercial-proof panel in the dedicated browser test, not inferred from unit tests. Evidence remains local to the PR CI artifact; real Safari/iPhone device qualification and a deployed Render source SHA are separate gates, not claimed here.

## Investor evidence package index

The investor evidence package now includes commercial_proof_ladder_v1 with status implemented_preview, evidenceClass modelled, productionAdmission blocked, and pointers to pure model, responsive browser tests and this specification. This is code provenance, not evidence of accepted customer contracts or actual recognised revenue.
