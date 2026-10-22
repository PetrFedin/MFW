-- REVIEW CANDIDATE ONLY. NEVER APPLY TO LIVE MFW SUPABASE WITHOUT APPROVAL.
-- A migration owner must confirm privileges, data API exposure, existing grants,
-- and service_role dependencies before drafting a separately versioned migration.
-- PostgreSQL 17 global PUBLIC function EXECUTE requires a GLOBAL revoke.
-- Source: https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html
-- Current inspected creator roles: postgres and supabase_admin.
-- Existing object grants do not change: DEFAULT PRIVILEGES is forward-only.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
 REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
 REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
 REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
 REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
 REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
 REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
-- Do not execute this file via a production migration runner.
