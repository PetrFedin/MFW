# MFW server commercial evidence domain — Draft, 2026-10-13

Standalone **pure** Node contract for Pilot → Contract → Delivery → Acceptance → Invoice → Finance → Payment → Renewal. This is *not* connected to HTTP, PostgreSQL, payment providers or an accounting ledger.

- Context must be independently authenticated by trusted server middleware; caller-provided context does **not** qualify as proof.
- A server-provided source verification function is required; signed issuer, revocation and tenant validation must be implemented behind it before any real integration.
- Idempotency, stage prerequisites, scoped organisation and amount validation fail closed.
- FINANCE_REVIEWED requires a server-validated finance role and accounting policy. Still returns only SERVER_VALIDATED_CANDIDATE, not recognised revenue.
- Projection preserves recognised revenue and cash as null, regardless of client-provided events.
- Future integration requires PostgreSQL admission, tenant/JWT negative tests, immutable persistence, transactional outbox, accounting sign-off and independent reviewer approval. Never expose this module as a public trust authority on its own.

Node test: `node mfw-api/commercial-evidence-domain.test.js`. No production writes or paid resources.
