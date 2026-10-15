-- PostgreSQL conflict-target hardening discovered by production admission.
-- These unique indexes are required by Brand365Store.seedDemo() ON CONFLICT clauses.
-- PostgreSQL UNIQUE indexes allow multiple NULL values, preserving optional external_key semantics.

CREATE UNIQUE INDEX IF NOT EXISTS ux_loyalty_offers_external_key
  ON loyalty_offers(external_key);

CREATE UNIQUE INDEX IF NOT EXISTS ux_brand_content_posts_external_key
  ON brand_content_posts(external_key);
