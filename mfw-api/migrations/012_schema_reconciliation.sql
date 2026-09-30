-- 012_schema_reconciliation.sql
-- Reconcile early schema assumptions so both clean installs and previously
-- migrated environments satisfy the current MFW authority contract.

-- 001 originally did not include waitlist / invite_only, while the live
-- programme authority uses both states.
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_access_mode_check;

ALTER TABLE events
  ADD CONSTRAINT events_access_mode_check
  CHECK (access_mode IN ('open','registration','request','waitlist','invite','invite_only','closed'));

-- 006 originally used CREATE TABLE IF NOT EXISTS for a table already created
-- by 001, which silently skipped this additive field.
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';

-- 005 originally assumed a streams table already existed. Ensure the base
-- authority is present for environments that applied an earlier migration set.
CREATE TABLE IF NOT EXISTS streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_key text UNIQUE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','starting','live','paused','ended','failed','archived')),
  provider_mode text NOT NULL DEFAULT 'disabled'
    CHECK (provider_mode IN ('disabled','simulated','sandbox','live')),
  playback_url text,
  poster_url text,
  current_look integer NOT NULL DEFAULT 0 CHECK (current_look >= 0),
  total_looks integer NOT NULL DEFAULT 0 CHECK (total_looks >= 0),
  started_at timestamptz,
  ended_at timestamptz,
  replay_available boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

ALTER TABLE streams ADD COLUMN IF NOT EXISTS external_key text;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS provider_mode text NOT NULL DEFAULT 'disabled';
ALTER TABLE streams ADD COLUMN IF NOT EXISTS playback_url text;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS poster_url text;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS current_look integer NOT NULL DEFAULT 0;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS total_looks integer NOT NULL DEFAULT 0;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS ended_at timestamptz;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS replay_available boolean NOT NULL DEFAULT false;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE streams ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE streams ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_streams_external_key
  ON streams(external_key) WHERE external_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_streams_event_status ON streams(event_id,status);

-- Preserve the wider core registration lifecycle from 001 while keeping the
-- additive source field introduced by role workflows.
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_status_check;

ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_status_check
  CHECK (status IN ('registered','waitlist','invited','confirmed','cancelled','no_show','attended'));
