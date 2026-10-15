-- ONLY disposable PG17 CI; not a historical or new MFW production migration.
DO $$ BEGIN
 IF current_database() <> 'mfw_commercial_ci' THEN
   RAISE EXCEPTION 'commercial_identity_research_requires_scratch';
 END IF;
END $$;
-- The following auth tables mimic selected native Supabase columns; they
-- do not create accounts or sessions in a hosted Supabase project.
CREATE SCHEMA auth;
REVOKE ALL ON SCHEMA auth FROM PUBLIC;
CREATE TABLE auth.users (
 id uuid PRIMARY KEY,
 is_anonymous boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 banned_until timestamptz
);
CREATE TABLE auth.sessions (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 aal text NOT NULL CHECK(aal IN ('aal1','aal2')),
 not_after timestamptz
);
CREATE TABLE public.users (
 id uuid PRIMARY KEY,
 status text NOT NULL CHECK(status IN ('active','blocked','deleted'))
);
CREATE TABLE public.professional_organisations (
 id uuid PRIMARY KEY,
 status text NOT NULL CHECK(status IN ('active','suspended','archived')),
 verification_status text NOT NULL CHECK(verification_status IN ('unverified','verified','expired'))
);
CREATE TABLE public.professional_organisation_memberships (
 organisation_id uuid NOT NULL REFERENCES public.professional_organisations(id),
 user_id uuid NOT NULL REFERENCES public.users(id),
 status text NOT NULL CHECK(status IN ('active','revoked')),
 source text NOT NULL,
 ended_at timestamptz,
 PRIMARY KEY(organisation_id,user_id)
);
-- These two new research-only tables have no approved production equivalent.
-- Explicit auth-subject -> MFW-user link, never infer from email or name.
CREATE SCHEMA ci_commercial_auth;
REVOKE ALL ON SCHEMA ci_commercial_auth FROM PUBLIC;
CREATE TABLE ci_commercial_auth.subject_links (
 auth_subject uuid PRIMARY KEY REFERENCES auth.users(id),
 app_user_id uuid NOT NULL UNIQUE REFERENCES public.users(id),
 issuer text NOT NULL,
 status text NOT NULL CHECK(status IN ('operator_verified','revoked')),
 reviewed_by uuid NOT NULL REFERENCES public.users(id),
 proof_ref text NOT NULL CHECK(length(proof_ref)>4),
 CHECK(reviewed_by <> app_user_id)
);
-- Relationship_role / role_title in original 022 must NEVER confer these grants.
CREATE TABLE ci_commercial_auth.role_grants (
 organisation_id uuid NOT NULL REFERENCES public.professional_organisations(id),
 app_user_id uuid NOT NULL REFERENCES public.users(id),
 role text NOT NULL CHECK(role IN ('organiser','brand_admin','partner_admin',
  'finance_operator','finance_reviewer','settlement_verifier')),
 status text NOT NULL CHECK(status IN ('active','revoked')),
 source text NOT NULL CHECK(source='operator_approved'),
 approved_by uuid NOT NULL REFERENCES public.users(id),
 evidence_ref text NOT NULL CHECK(length(evidence_ref)>4),
 expires_at timestamptz,
 PRIMARY KEY(organisation_id,app_user_id),
 CHECK(approved_by <> app_user_id)
);
REVOKE ALL ON ALL TABLES IN SCHEMA auth FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA ci_commercial_auth FROM PUBLIC;
REVOKE ALL ON public.users,public.professional_organisations,
 public.professional_organisation_memberships FROM PUBLIC;
