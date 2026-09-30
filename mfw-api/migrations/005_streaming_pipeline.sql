-- 005_streaming_pipeline.sql
-- Base stream authority must exist before source/output foreign keys.
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

CREATE INDEX IF NOT EXISTS idx_streams_event_status ON streams(event_id,status);

CREATE TABLE IF NOT EXISTS stream_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  provider_type text NOT NULL,
  mode text NOT NULL DEFAULT 'disabled' CHECK (mode IN ('disabled','simulated','sandbox','live')),
  priority integer NOT NULL DEFAULT 100,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stream_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES stream_providers(id) ON DELETE RESTRICT,
  source_role text NOT NULL CHECK (source_role IN ('primary','backup')),
  ingest_protocol text NOT NULL CHECK (ingest_protocol IN ('srt','rtmp','rist','webrtc','file')),
  ingest_url text,
  status text NOT NULL DEFAULT 'standby' CHECK (status IN ('offline','standby','healthy','degraded','failed','active')),
  last_heartbeat_at timestamptz,
  health jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(stream_id,source_role)
);

CREATE TABLE IF NOT EXISTS stream_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  output_type text NOT NULL CHECK (output_type IN ('hls','ll_hls','dash','recording','preview')),
  url text,
  resolution text,
  bitrate_kbps integer,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('preparing','ready','live','failed','archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stream_caption_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  language text NOT NULL,
  label text NOT NULL,
  source text NOT NULL DEFAULT 'operator',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','ready','failed')),
  url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(stream_id,language)
);

CREATE TABLE IF NOT EXISTS replay_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  asset_type text NOT NULL DEFAULT 'full_show',
  source_output_id uuid REFERENCES stream_outputs(id) ON DELETE SET NULL,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','ready','failed','archived')),
  playback_url text,
  poster_url text,
  published_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stream_failover_events (
  id bigserial PRIMARY KEY,
  stream_id uuid NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  from_source_id uuid REFERENCES stream_sources(id) ON DELETE SET NULL,
  to_source_id uuid REFERENCES stream_sources(id) ON DELETE SET NULL,
  reason text NOT NULL,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_stream_sources_stream_status ON stream_sources(stream_id,status);
CREATE INDEX IF NOT EXISTS idx_stream_outputs_stream_type ON stream_outputs(stream_id,output_type);
CREATE INDEX IF NOT EXISTS idx_replay_assets_stream_status ON replay_assets(stream_id,status);
CREATE INDEX IF NOT EXISTS idx_failover_stream_time ON stream_failover_events(stream_id,occurred_at DESC);
