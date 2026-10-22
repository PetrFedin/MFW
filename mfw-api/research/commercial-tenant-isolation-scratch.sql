-- Scratch-only, non-production policies for two fixed PostgreSQL roles.
-- This is NOT a JWT policy and must never be copied into runtime migrations.
CREATE ROLE ci_mfw_org_a NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE ci_mfw_org_b NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO ci_mfw_org_a,ci_mfw_org_b;
GRANT SELECT ON public.ci_commercial_events TO ci_mfw_org_a,ci_mfw_org_b;
CREATE POLICY ci_mfw_org_a_read
 ON public.ci_commercial_events FOR SELECT TO ci_mfw_org_a
 USING (organisation_id='org-a');
CREATE POLICY ci_mfw_org_b_read
 ON public.ci_commercial_events FOR SELECT TO ci_mfw_org_b
 USING (organisation_id='org-b');
-- Outbox remains an internal worker table. Neither test role receives access.
