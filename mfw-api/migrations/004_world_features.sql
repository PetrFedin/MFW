-- 004_world_features.sql
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('pending','connected','blocked')),
  source text NOT NULL DEFAULT 'qr',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_user_id,recipient_user_id)
);

CREATE TABLE IF NOT EXISTS inspiration_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','shared')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspiration_board_looks (
  board_id uuid NOT NULL REFERENCES inspiration_boards(id) ON DELETE CASCADE,
  look_id uuid NOT NULL REFERENCES looks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(board_id,look_id)
);

CREATE TABLE IF NOT EXISTS meetups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season text NOT NULL,
  title text NOT NULL,
  topic text NOT NULL,
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  capacity integer,
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','full','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meetup_members (
  meetup_id uuid NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'joined' CHECK (status IN ('joined','waitlist','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(meetup_id,user_id)
);

CREATE TABLE IF NOT EXISTS meeting_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  proposed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  proposed_starts_at timestamptz NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connections_recipient ON connections(recipient_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_boards_user ON inspiration_boards(user_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetups_start_status ON meetups(starts_at,status);
CREATE INDEX IF NOT EXISTS idx_meeting_proposals_meeting ON meeting_proposals(meeting_id,created_at DESC);
