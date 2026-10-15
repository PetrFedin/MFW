# PostgreSQL commercial identity research — 2026-10-15

**RESEARCH ONLY / PRODUCTION HOLD**. This fixture reproduces selected fields of the **read-only inspected** MFW Supabase PG17 `auth.users`, `auth.sessions`, `public.users`, `professional_organisations` and `professional_organisation_memberships`. It creates a *disposable* schema in GitHub Actions only. It neither imports accounts nor modifies the hosted Supabase project.

The historical MFW `022` membership is created with `self_claim` by default and can be reactivated via its claim path; **it is not a commercial-role grant**. The scratch adapter introduces two separate controls: operator-reviewed Auth-subject→internal-user link and separately operator-approved organisation-specific commercial role. A current Auth session (native session ID, subject, AAL, no deletion/ban) and current organisation/individual/reviewer statuses are independently required. A removed session, suspended company, expired grant, blocked reviewer, revoked link or self-claimed relationship fails closed.

The existing domain `EVENT_ROLES` and finance AAL2 check remain in force. No actual transaction is approved, and **financial posting would need an additional authorisation check within the same write transaction**, otherwise concurrent revocations can race this read-only check. The SQL in `commercial-identity-pg-scratch.sql` is NOT a valid MFW production migration. Do not use it as one.

SDK/JWKS verification is separately tested using the real SDK loopback harness. This PG17 run uses synthetic getClaims responses to exercise the DB path. Hosted users, secret keys and live migrations are untouched.

Sources: https://supabase.com/docs/guides/auth/sessions ; https://supabase.com/docs/reference/javascript/auth-getclaims .
