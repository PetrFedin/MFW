-- RECONSTRUCTED CATALOG CANDIDATE, NOT THE ORIGINAL 027 SOURCE.
-- PUBLIC SCHEMA SHAPE OBSERVED READ-ONLY IN THE EXISTING SUPABASE PROJECT.
-- DO NOT APPLY TO PRODUCTION; valid only as a scratch-cluster comparison baseline.
-- WARNING: global UNIQUE(event_key) on delivery receipts blocks multiple
-- independent consumers of one outbox event. This reproduces observed catalog,
-- NOT a production-qualified fan-out design. See GitHub Issue #25.
CREATE TABLE public.authority_outbox (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  topic text NOT NULL,
  aggregate_type text,
  aggregate_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text,
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  pg_boss_job_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT authority_outbox_pkey PRIMARY KEY (id),
  CONSTRAINT authority_outbox_event_key_key UNIQUE (event_key),
  CONSTRAINT authority_outbox_attempts_check CHECK (attempts >= 0),
  CONSTRAINT authority_outbox_status_check
    CHECK (status IN ('pending','dispatching','dispatched','failed'))
);

CREATE INDEX authority_outbox_pending_idx ON public.authority_outbox
  (status, available_at, created_at)
  WHERE status IN ('pending','failed');
CREATE INDEX authority_outbox_topic_idx ON public.authority_outbox
  (topic, created_at DESC);

CREATE TABLE public.authority_delivery_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  outbox_id uuid NOT NULL,
  event_key text NOT NULL,
  topic text NOT NULL,
  consumer text NOT NULL,
  pg_boss_job_id uuid,
  payload_digest text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT authority_delivery_receipts_pkey PRIMARY KEY (id),
  CONSTRAINT authority_delivery_receipts_event_key_key UNIQUE (event_key),
  CONSTRAINT authority_delivery_receipts_outbox_id_consumer_key UNIQUE (outbox_id, consumer),
  CONSTRAINT authority_delivery_receipts_outbox_id_fkey
    FOREIGN KEY (outbox_id) REFERENCES public.authority_outbox(id) ON DELETE RESTRICT
);

CREATE INDEX authority_delivery_receipts_topic_idx ON public.authority_delivery_receipts
  (topic, processed_at DESC);

-- Defensive RLS: current live catalog has RLS enabled but no public policies.
-- This is catalog-derived hardening of the candidate, NOT recovered original 027.
ALTER TABLE public.authority_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_delivery_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.authority_outbox FROM PUBLIC;
REVOKE ALL ON public.authority_delivery_receipts FROM PUBLIC;
-- App-role GRANTs and default privileges still require independent review.
