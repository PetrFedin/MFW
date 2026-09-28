BEGIN;

CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    registration_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    decided_by UUID,
    decision_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (status IN (
      'draft','submitted','under_review','approved','rejected','cancelled'
    ))
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_user_event
    ON event_registrations(user_id, event_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_registration_active_type
    ON event_registrations(event_id, user_id, registration_type)
    WHERE status IN ('draft','submitted','under_review','approved');

CREATE TABLE IF NOT EXISTS programme_items (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    local_key TEXT NOT NULL,
    item_type TEXT NOT NULL,
    title_ru TEXT NOT NULL,
    title_en TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    venue_code TEXT,
    hall_code TEXT,
    registration_required BOOLEAN NOT NULL DEFAULT FALSE,
    capacity INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, local_key),
    CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_programme_items_event_time
    ON programme_items(event_id, starts_at);

CREATE TABLE IF NOT EXISTS saved_programme_items (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    programme_item_id UUID NOT NULL REFERENCES programme_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id, programme_item_id)
);

COMMIT;
