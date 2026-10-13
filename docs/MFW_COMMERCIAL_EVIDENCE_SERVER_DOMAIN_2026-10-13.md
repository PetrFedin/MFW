# MFW server commercial evidence domain — Draft, 2026-10-13

Standalone **pure** Node contract for Pilot → Contract → Delivery → Acceptance → Invoice → Finance → Payment → Renewal. This is *not* connected to HTTP, PostgreSQL, payment providers or an accounting ledger.

- Context must be independently authenticated by trusted server middleware; caller-provided context does **not** qualify as proof.
- A server-provided source verification function is required; signed issuer, revocation and tenant validation must be implemented behind it before any real integration.
- Idempotency, stage prerequisites, scoped organisation and amount validation fail closed.
- FINANCE_REVIEWED requires a server-validated finance role and accounting policy. Still returns only SERVER_VALIDATED_CANDIDATE, not recognised revenue.
- Projection preserves recognised revenue and cash as null, regardless of client-provided events.
- Future integration requires PostgreSQL admission, tenant/JWT negative tests, immutable persistence, transactional outbox, accounting sign-off and independent reviewer approval. Never expose this module as a public trust authority on its own.

Node test: `node mfw-api/commercial-evidence-domain.test.js`. No production writes or paid resources.

## Candidate history integrity and scope (2026-10-13)

- Candidate hashes now include evidence digest and state; an altered evidence source, out-of-order record, broken parent link, repeated idempotency key or mixed payer/organisation/agreement scope is rejected before accepting a new event.
- Event times must be nondecreasing. A retry with the same idempotency key but a changed actor, event time, finance period, price or evidence reference is rejected as a conflict.
- SHA-256 hash links establish **internal consistency only**. They are not signatures, cannot verify issuer claims, and do not independently prove durability or immutability. Server-side authenticated evidence resolution, scoped PostgreSQL and immutable audit remain production gates.

## Financial segregation / source binding (2026-10-13)

- A provisional **server-role matrix** now separates partner/brand/organiser actions from `finance_operator` (invoice), `finance_reviewer` (accounting review) and `settlement_verifier` (bank settlement). These are contract-test role names, **not provisioned Supabase JWT claims**.
- Invoice, settlement and customer acceptance candidates require specific server-owned approval flags *and* an independently validated source proof; a partner or brand cannot submit their own settled-cash candidate. Counterparty acceptance requires server-confirmed acceptance authority, not an applicant's checkbox.
- Source resolution must bind exact organisation, payer, agreement, source reference, issuer, event type and timestamp, and exact amount/currency for monetary events. A SHA-256-shaped digest is required but is **not** a source signature.
- Contract/renewal amounts are recorded as candidate commercial value only. Settlement entries require a positive amount in the agreement currency and cannot cumulatively exceed candidate invoiced totals; neither invoice nor settlement creates recognised revenue. FX, credit notes, advance payments and overpayments are **not supported by this candidate model** and must be explicitly designed before production.
- This is a **pure synchronous contract** with a stubbed proof resolver. A real JWT verified identity source, bank settlement verifier, counterparty consent, source revocation, authoritative Postgres store, independent finance review and concurrency/idempotency enforcement remain open. Never integrate this directly as a public endpoint.

## Late retries and idempotency gate order (2026-10-13)

Previously, a duplicate pilot event timestamp could be rejected as a regression after newer events. Also, replay of a fully settled payment was at risk of failing the cumulative payment cap. The synchronous domain now checks an exact, independently re-verified idempotency replay **before** enforcing new-event chronology and settlement upper bound. Conflicting amounts and sources still fail closed; historical chain integrity, tenant scope, actor role and source verification are not bypassed. Real race safety remains blocked pending transactional PostgreSQL writes and concurrent-session testing.
