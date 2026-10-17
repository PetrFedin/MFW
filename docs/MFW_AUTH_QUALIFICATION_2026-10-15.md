# MFW commercial identity boundary: targeted qualification

Date: 2026-10-15. Base: PR #30 at `65cc542a92af25b509d81e37bab4edba287b5081`.
Status: implementation and offline tests only; NOT a production Auth admission.

## Reproduced defects and changes

| Scenario in the prior unconnected module | Before | After |
| --- | --- | --- |
| A 1,024-character access token reaches a trusted verifier | Rejected: shared identifier validator capped it at 240 characters | Separate bearer limit of 10,000 ASCII non-whitespace characters; identifiers remain capped at 240 |
| Verifier-owned claims object changes `aal1` to `aal2` during session lookup | Late mutation could grant a finance candidate actor | Validated security-relevant claims are snapshotted before awaiting stores; no late AAL escalation |
| Token expires while current membership is being resolved | Candidate actor could be returned after expiry | Validity window rechecked immediately before returning actor |

These are reproduced module-level defects, NOT evidence that the deployed application was exploited. The module is not registered in the live API.

Additional guards reject malformed objects, inherited request fields, unsupported event keys, unsafe/noncanonical issuer configuration, malformed audiences and claim types, invalid timestamps, expired or unavailable sessions, revoked memberships and verifier/store errors. Errors contain fixed codes, not bearer tokens. Current session and membership are fetched on every call; role is never sourced from request data or user-editable/stale token metadata.

## SDK connection point

`createSupabaseIdentityBoundary({ auth, issuer, verifySession, lookupMembership })` accepts a trusted server-owned Supabase Auth client. It captures/binds `auth.getClaims` and passes only the access token. Requests cannot supply `allowExpired`, JWKS overrides or a replacement verifier. No new dependencies, clients, credentials, users, database objects or HTTP routes are created by this patch.

The configured issuer must be the canonical HTTPS `/auth/v1` issuer without embedded credentials, query or fragment, and must match the supplied Auth client. The returned actor is an internal DTO, not a signed credential; the domain still requires its own authorised source resolver and finance approvals. Authentication and membership must be rechecked appropriately at the protected write/transaction boundary; this adapter does not solve all time-of-check/time-of-use races.

## Verification and reproducibility

Local runtime: Node v22.16.0. Dependency source `commercial-evidence-domain.js` and the existing identity test were checked byte-for-byte against GitHub blob SHAs. Existing identity contract: PASS unchanged.

New tests: **56 identity regressions + 23 signed-fixture cases = 79 PASS**, zero failures/skips in the local run. CI runs the same suites on Node 20 and 22; only the exact-head run result establishes CI success.

```
node mfw-api/commercial-identity-boundary.test.js
node --test mfw-api/commercial-identity-regression.test.js mfw-api/research/commercial-identity-signatures.test.js
```

The signed-fixture tests generate ephemeral P-256/ES256 and RSA-2048/RS256 keys in process memory and perform actual signing/verification via Node crypto. They cover tampered payload/signature, wrong key, unknown key ID, unsigned/algorithm-confused fixtures, signed expired/foreign/anonymous claims, current session/membership withdrawal and provisional finance AAL2. No key material or bearer payloads are persisted or logged. A local trusted-key-set replacement test is NOT remote JWKS cache/rotation qualification.

**Critical scope:** the verifier in `research/commercial-identity-signatures.test.js` is an intentionally test-only fixture implementing the `getClaims` result interface. It is not the Supabase SDK and must never be imported by the application. The patch does not claim successful verification of a real Supabase-issued token, SDK network handling, HS256 fallback, production JWKS rotation, MFA enrollment, actual user revocation, tenant JWT/RLS integration or banking facts.

## Next admission gates

1. Independent review of this boundary and the closed financial role matrix.
2. Pinned, reviewed Supabase SDK client and approved issuer configuration in a separate integration environment.
3. Actual issued user tokens plus current session/membership storage; revoked session, tenant spoofing, role removal, key rotation and outages tested through the real HTTP entrypoint.
4. Protected PostgreSQL Authority admission, migrations/default privileges, transactional writes and end-to-end Golden Paths (Issue #32).

PR #20 database admission and production HOLD are not bypassed. Main and production are unchanged by this feature-branch work.

Sources: [Supabase getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims), [Supabase JWT guidance](https://supabase.com/docs/guides/auth/jwts), [Node 22 crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html).
