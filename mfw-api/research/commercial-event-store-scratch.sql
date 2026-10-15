-- Disposable PG17 research only. NOT an executable MFW migration or production DDL.
CREATE TABLE public.ci_commercial_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organisation_id text NOT NULL,
  agreement_id text NOT NULL,
  event_key text NOT NULL,
  sequence_no bigint NOT NULL CHECK(sequence_no > 0),
  parent_digest text,
  event_digest text NOT NULL,
  source_digest text NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ci_commercial_event_idempotency UNIQUE (organisation_id,event_key),
  CONSTRAINT ci_commercial_event_sequence UNIQUE (organisation_id,agreement_id,sequence_no)
);
CREATE TABLE public.ci_commercial_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES public.ci_commercial_events(id) ON DELETE RESTRICT,
  consumer text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','dispatched','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ci_commercial_consumer_idempotency UNIQUE(event_id,consumer)
);
ALTER TABLE public.ci_commercial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_commercial_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ci_commercial_events FROM PUBLIC;
REVOKE ALL ON public.ci_commercial_outbox FROM PUBLIC;
