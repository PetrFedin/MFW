-- 017_mvp_persistence.sql
-- Persistent MVP journeys: event registration, agenda/reminders, and B2B meetings.

CREATE TABLE IF NOT EXISTS user_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reminder_minutes integer NOT NULL DEFAULT 20 CHECK (reminder_minutes BETWEEN 0 AND 1440),
  reminder_enabled boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,event_id)
);

CREATE TABLE IF NOT EXISTS b2b_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
  requester_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counterpart_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  organisation text,
  starts_at timestamptz,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','confirmed','reschedule_requested','completed','cancelled','declined')),
  note text,
  source text NOT NULL DEFAULT 'app',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS b2b_meeting_events (
  id bigserial PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES b2b_meetings(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_agenda_user ON user_agenda(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_agenda_event ON user_agenda(event_id);
CREATE INDEX IF NOT EXISTS idx_b2b_meetings_requester ON b2b_meetings(requester_user_id,starts_at);
CREATE INDEX IF NOT EXISTS idx_b2b_meetings_brand ON b2b_meetings(brand_id,starts_at);
CREATE INDEX IF NOT EXISTS idx_b2b_meeting_events_meeting ON b2b_meeting_events(meeting_id,occurred_at);
