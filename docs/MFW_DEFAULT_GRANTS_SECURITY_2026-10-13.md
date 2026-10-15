# MFW future-object DEFAULT PRIVILEGES: scratch-only security proof
Status: P0 HOLD. Observed 2026-10-13 in existing MFW Supabase read-only catalogs.

All 88 existing public tables deny DML to anon/authenticated, but pg_default_acl
for postgres and supabase_admin includes explicit future TABLE / SEQUENCE /
FUNCTION grants to those public roles. Blanket existing-object REVOKE is
not enough to constrain future objects.

The SQL candidate remains OUTSIDE mfw-api/migrations and is not production-
authorised. A disposable PG17 CI workflow creates both owner roles and
anon/authenticated, seeds broad defaults, proves prepatch canary exposure,
applies the candidate locally, then checks new canaries deny SELECT/INSERT
and SEQUENCE USAGE while existing canaries retain old grants.

CRITICAL: new public SQL functions may still be executable via GLOBAL PUBLIC
default grants. Per-schema REVOKE cannot remove global privileges. Finance,
auth, extension and API owners must separately review any global default
function privilege changes; this patch intentionally does NOT alter them.

No Supabase/Render secrets, real database, production roles, app schema or
paid resources are used. Passing this scratch test does not qualify Phase 0.

Official PostgreSQL 17 reference:
https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html
Tracking: https://github.com/PetrFedin/MFW/issues/28
