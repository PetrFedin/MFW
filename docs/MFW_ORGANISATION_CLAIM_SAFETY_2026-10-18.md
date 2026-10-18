# MFW organisation claim and credential safety — 18 October 2026

**Scope:** draft PR #35, not merged, not production-admitted.

## Root cause and boundary
The previous `OrganisationRegistry.claimForUser` reused existing memberships with
`ON CONFLICT ... DO UPDATE SET status='active', ended_at=NULL`, including previously
revoked or operator-reviewed relationships. In the in-memory equivalent,
`row.members.set` overwrote the relationship without preserving revocation or
review provenance.

The separate `canRepresent` method was used as the API gate for signed
organisation credentials and previously accepted any active membership. A
self-claimed relationship to a verified organisation could therefore qualify for
credential issuance in the source logic. This is a source-level deficiency; there
is no evidence of an actual production exploit or of persistent Authority admission.

## Changes
- Public claims may create or update an **active self-claimed** relationship only.
  They may never revive a revoked, ended or independently operator-verified record.
  The PostgreSQL guard is in `ON CONFLICT ... WHERE` under the row lock, and rolls
  back if no row is returned. No SQL migration has been changed.
- `canRepresent` is now explicitly a *credential issuance gate*. It requires an
  operator-verified, active, non-ended membership **and** an active, currently
  verified organisation; ordinary self-claims cannot obtain signed credentials.
- In-memory model applies the same conditions and forbids self-revival.
- `OrganisationCredentialAuthority.issue` and `verify` require the current
  organisation to be active, not merely have a stale `verified` flag.
- Scratch PostgreSQL 17 test replays exactly the original quarantined Git SQL
  001–027, verifies normal self-claims and all negative revocation/role/organisation
  cases using synthetic users and claims. Existing local Node unit tests cover the
  memory and signed-credential paths.
- SDK→HTTP→PG17 E2E test has been corrected: forged token-only `aal2` is denied
  with **401** when the SQL session is `aal1`, while a valid `aal1` token with
  forged finance metadata yields **403**. A parent test cannot print PASS after
  failed nested scenarios.

## Still blocked
These tests are on synthetic scratch databases, not real hosted Supabase Auth
users or persistent MFW Authority. A security reviewer must assess `adminOk`,
the credential issuer policy and revoked-session races before any real activation.
No production credential, user, role or financial event has been created.
`/ready=200`, `dataMode=postgres`, actual signed-user E2E and exact deployment
SHA remain separate required evidence.

**Expected GitHub CI gates:** Responsive QA including unit tests; Isolated PG17
Replay including new scratch claim test; Commercial Evidence Scratch PG17 including
SDK/HTTP/SQL negative tests. A GREEN result is not claimed until the new exact
commit SHA completes each workflow.
