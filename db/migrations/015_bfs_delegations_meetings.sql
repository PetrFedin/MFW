BEGIN;

CREATE TABLE IF NOT EXISTS delegations (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country_code TEXT NOT NULL,
    lead_user_id UUID,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, name)
);

CREATE TABLE IF NOT EXISTS delegation_members (
    delegation_id UUID NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title TEXT,
    organisation TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(delegation_id, user_id)
);

CREATE TABLE IF NOT EXISTS b2b_meetings (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    requester_user_id UUID NOT NULL,
    recipient_user_id UUID NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    location TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'requested',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (requester_user_id <> recipient_user_id),
    CHECK (ends_at > starts_at),
    CHECK (status IN ('requested','accepted','declined','cancelled','completed'))
);

CREATE INDEX IF NOT EXISTS idx_b2b_meetings_event_time
    ON b2b_meetings(event_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_b2b_meetings_requester
    ON b2b_meetings(event_id, requester_user_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_b2b_meetings_recipient
    ON b2b_meetings(event_id, recipient_user_id, starts_at);

COMMIT;
