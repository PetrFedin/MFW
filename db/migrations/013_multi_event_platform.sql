BEGIN;

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    event_kind TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    name_en TEXT NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
    venue_name_ru TEXT,
    venue_name_en TEXT,
    city TEXT NOT NULL DEFAULT 'Moscow',
    official_website TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_on >= starts_on)
);

INSERT INTO events (
    id, code, slug, event_kind, name_ru, name_en,
    starts_on, ends_on, venue_name_ru, venue_name_en,
    official_website, status
)
VALUES
(
    '11111111-1111-4111-8111-111111111111',
    'mfw-2026-09',
    'moscow-fashion-week',
    'fashion_week',
    'Московская неделя моды',
    'Moscow Fashion Week',
    DATE '2026-09-26',
    DATE '2026-10-01',
    NULL,
    NULL,
    'https://moscowfashion.ru/',
    'live'
),
(
    '22222222-2222-4222-8222-222222222222',
    'brics-fashion-summit-2026',
    'brics-fashion-summit',
    'industry_summit',
    'Саммит моды БРИКС+',
    'BRICS+ Fashion Summit',
    DATE '2026-09-28',
    DATE '2026-09-30',
    'МКЗ «Зарядье»',
    'Concert Hall Zaryadye',
    'https://fashionsummit.org/',
    'live'
)
ON CONFLICT (code) DO UPDATE SET
    slug = EXCLUDED.slug,
    event_kind = EXCLUDED.event_kind,
    name_ru = EXCLUDED.name_ru,
    name_en = EXCLUDED.name_en,
    starts_on = EXCLUDED.starts_on,
    ends_on = EXCLUDED.ends_on,
    venue_name_ru = EXCLUDED.venue_name_ru,
    venue_name_en = EXCLUDED.venue_name_en,
    official_website = EXCLUDED.official_website,
    status = EXCLUDED.status,
    updated_at = NOW();

CREATE TABLE IF NOT EXISTS event_memberships (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id, role_code)
);

CREATE TABLE IF NOT EXISTS event_entitlements (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    entitlement_code TEXT NOT NULL,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id, entitlement_code)
);

CREATE INDEX IF NOT EXISTS idx_event_memberships_user
    ON event_memberships(user_id, event_id);

CREATE INDEX IF NOT EXISTS idx_event_entitlements_user
    ON event_entitlements(user_id, event_id)
    WHERE revoked_at IS NULL;

COMMIT;
