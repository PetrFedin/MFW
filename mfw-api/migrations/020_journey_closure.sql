-- 020_journey_closure.sql
-- Close the MVP loop between interests, recommendations, unified programme and BFS professional follow-up.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_brand text NOT NULL DEFAULT 'mfw'
  CHECK (event_brand IN ('mfw','bfs'));

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS official_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS professional_follows (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_brand text NOT NULL CHECK (event_brand IN ('mfw','bfs')),
  entity_type text NOT NULL CHECK (entity_type IN ('organisation','speaker','delegate','project')),
  entity_ref text NOT NULL,
  display_name text,
  favorite boolean NOT NULL DEFAULT false,
  followed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,event_brand,entity_type,entity_ref)
);

CREATE TABLE IF NOT EXISTS b2b_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid UNIQUE REFERENCES b2b_meetings(id) ON DELETE SET NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_brand text NOT NULL DEFAULT 'bfs' CHECK (event_brand IN ('mfw','bfs')),
  organisation_ref text,
  organisation_name text,
  counterpart_ref text,
  counterpart_name text,
  stage text NOT NULL DEFAULT 'interest'
    CHECK (stage IN ('interest','meeting_requested','meeting_confirmed','met','follow_up','qualified','won','lost')),
  next_action text,
  next_action_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_event_brand_time ON events(event_brand,starts_at);
CREATE INDEX IF NOT EXISTS idx_professional_follows_user ON professional_follows(user_id,event_brand,entity_type);
CREATE INDEX IF NOT EXISTS idx_professional_follows_entity ON professional_follows(event_brand,entity_type,entity_ref);
CREATE INDEX IF NOT EXISTS idx_b2b_leads_owner_stage ON b2b_leads(owner_user_id,stage,updated_at DESC);
