# MFW — authenticated organisation affiliation

Integration-only security update, 20 October 2026; PR #35.

## Original failure

The platform previously inferred my organisation by matching the free-text
company name against a public directory item. This could show the user as
associated with a verified organisation without any actual membership.

## Authority contract

- The read-only public directory cannot assert account affiliation.
- GET /v1/network/organisations/mine requires a valid session.
- The query scopes memberships to the authenticated subject only.
- The query excludes revoked, ended and inactive-organisation memberships.
- The response source must be PostgreSQL for the user interface to accept it.
- An unreviewed self-claim is a declaration, NOT verified representation.
- Verified representation additionally requires operator_verified member
  provenance, active organisation and organisation verification.
- The account clears former affiliation on refresh/revocation/failure.
- Name equality, HTML state, demo sessions and stale local storage cannot
  elevate the user to any organisation role.

## Regression and evidence

Memory tests: mfw-api/organisation-registry.test.js.
Isolated PostgreSQL 17 tests: mfw-api/recovery-candidates/organisation-claim-safety-scratch.test.js.
Loopback HTTP test: mfw-api/auth-demo-http.test.js.
Seven-viewport Chromium tests: qa/responsive.spec.js.

Passing these checks does not prove live registration, legal authority or
production database admission. Production HOLD remains in place.
