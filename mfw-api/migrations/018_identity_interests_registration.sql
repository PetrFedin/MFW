-- 018_identity_interests_registration.sql
-- Persistent identity/preferences and event-specific registration context.

ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS registration_type text;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS organisation text;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS submitted_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS user_interests (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interest_key text NOT NULL,
  weight numeric(6,3) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  source text NOT NULL DEFAULT 'explicit',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,interest_key)
);

CREATE INDEX IF NOT EXISTS idx_user_interests_user ON user_interests(user_id,weight DESC,interest_key);
CREATE INDEX IF NOT EXISTS idx_event_registrations_type ON event_registrations(event_id,registration_type,status);
