# MFW demo-identity and admin authority P0 guard — 18 October 2026

**Status: DRAFT integration-only, production HOLD.**

## Source-level security problem

Prior `POST /v1/auth/demo` accepted arbitrary client-provided `role` and
`identityKey`, then `issueDemoUser` could insert or update persistent
`users` / `profiles` if `DATABASE_URL` was configured. The fallback
administrator token `mfw-demo-admin` could pass `adminOk` as an HTTP
header without any environment secret. Furthermore, a self-issued
`Organizer` or `Staff` demo token was accepted for general administrative
routes, not just non-production demonstrations.

This is a **source-code exposure**, not evidence that real users were
exploited; the latest confirmed Render Authority was in memory mode with
`/ready=503`.

## Changes

1. `auth-demo-policy.js` is a pure, independently tested fail-closed policy.
   Public demo issuance requires ALL conditions: no DB configured,
   `MFW_REQUIRE_POSTGRES` false, `MFW_ENABLE_DEMO_AUTH=true`, and
   `NODE_ENV` not equal to `production`. Default is DENY.
2. If a database is configured or PostgreSQL is required, previously
   issued `demo:true` sessions are no longer accepted even if their
   cryptographic signature is valid.
3. General administrator access accepts ONLY an explicit
   `MFW_ADMIN_TOKEN` of at least 32 UTF-8 bytes and uses constant-time
   equality. The fallback literal `mfw-demo-admin` and self-selected
   `Organizer`/`Staff` demo roles are never admitted as admin.
   Real operator JWT/role-grant RBAC is **not yet wired**; it is a separate
   security and commercial readiness gate.
4. Accelerated loyalty golden path may create synthetic users only in
   isolated memory mode. Its authenticated admin endpoint responds
   `409 isolated_demo_only` when PostgreSQL is configured or required.
   The runtime function also refuses durable mode.
5. Pure policy tests, source wiring assertions, and a **real loopback HTTP**
   test cover public demo issuance, disabled production mode, client-chosen
   Organizer credentials, default-admin token rejection and explicit
   strong secret acceptance. The HTTP test launches local Authority without
   `DATABASE_URL` and contacts only `127.0.0.1`. It does not exercise
   actual hosted Supabase users, PostgreSQL writes or any live security key.

## Release requirements

- New draft source must pass full integrated `check:foundation`,
  responsive device matrix, scratch PostgreSQL replay and Auth SDK checks.
- No production deployment before approved real JWT/session verification,
  reviewed organisation and staff grants, audit logging, revocation and
  transaction-time checks, rollback and secret rotation.
- Do NOT set `MFW_ENABLE_DEMO_AUTH=true` in any Render production service.
  Any offline demonstration must use an isolated local development process.
- Old/demo keys must be rotated before enabling persistent users or real
  payment and finance operations.
- Application users in actual Supabase Auth were previously observed as
  zero; this code DOES NOT implement their onboarding.

**No database mutation, new paid infrastructure, Render redeploy or secret
read/write occurred as part of this draft-source correction.**
