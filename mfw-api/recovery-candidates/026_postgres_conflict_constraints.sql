-- Recovery candidate 026, NOT the recovered original application file.
-- Evidence: Supabase migrations mfw_028_canonical_026_postgres_conflict_constraints,
-- version 20261009014426, read-only inspected 2026-10-13.
-- Apply ONLY to a fresh disposable / isolated PostgreSQL test database.
-- Never mark a live application history row merely because this file exists.
CREATE UNIQUE INDEX IF NOT EXISTS ux_loyalty_offers_external_key
  ON loyalty_offers(external_key);

CREATE UNIQUE INDEX IF NOT EXISTS ux_brand_content_posts_external_key
  ON brand_content_posts(external_key);
