-- 008_retention_engine.sql
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  critical_enabled boolean NOT NULL DEFAULT true,
  live_enabled boolean NOT NULL DEFAULT true,
  followed_brand_news_enabled boolean NOT NULL DEFAULT true,
  loyalty_enabled boolean NOT NULL DEFAULT true,
  brand_events_enabled boolean NOT NULL DEFAULT true,
  paid_promotions_enabled boolean NOT NULL DEFAULT false,
  quiet_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_impressions (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES brand_content_posts(id) ON DELETE CASCADE,
  surface text NOT NULL DEFAULT 'mfw_365',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id bigserial PRIMARY KEY,
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'push',
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','delivered','opened','suppressed','failed')),
  suppression_reason text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_content_impressions_user_post_time
  ON content_impressions(user_id,post_id,occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_status
  ON notification_deliveries(user_id,status,id DESC);
