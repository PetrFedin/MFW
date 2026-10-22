# Integrated commercial identity qualification — scratch only

Date: 15 October 2026. PR #35 integration follow-up. **No production admission.**

An end-to-end negative test now passes a cryptographically signed synthetic ES256 JWT through the real pinned Supabase Auth SDK `getClaims`, actual loopback HTTP transport, and native-shaped PostgreSQL 17 SQL current-session and operator-reviewed membership checks. This closes the *test-layer separation* between earlier independent SDK, HTTP and PostgreSQL research.

The database is `mfw_commercial_ci` on GitHub Actions localhost, and the issuer redirects only approved JWKS requests to a localhost server. The test refuses other database hostnames, users, credentials, ports and database names and creates no external account or financial record.

Negative tests: tampered token, missing bearer, foreign/missing organisation response parity, self-claimed foreign organisation, stale session, membership revocation, blocked reviewer, role metadata forgery, financial role with AAL1, forged AAL2 when SQL session remains AAL1, and parallel valid/foreign calls. An accepted 204 denotes **identity candidacy only**, not authorisation of commercial event persistence, invoice or bank settlement.

This is a test of integration against **synthetic** PG Auth rows, not hosted Supabase-issued tokens or reviewed production linkage. Missing for release: migration/ACL review, signed real users, durable PostgreSQL Authority, production session revocation, transaction-time role recheck, independent finance approval, performance and disaster recovery.

CI driver: `.github/workflows/commercial-evidence-scratch-pg17.yml`, after SQL identity fixture and before scratch backup/restore. Dependencies are pinned by `mfw-api/integration/auth-sdk/package-lock.json`. No Render service or production DB change.
