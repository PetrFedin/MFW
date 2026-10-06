# MFW Phase 0 — Durable PostgreSQL Admission

Date: 2026-10-02
Canonical repository: `PetrFedin/MFW`
Canonical authority: `https://mfw-authority.onrender.com`

## Current verified state

Dedicated Render PostgreSQL already exists:

- name: `mfw-postgres`
- Render ID: `dpg-daugci8jo6nc738akc10-a`
- PostgreSQL: 17
- region: Frankfurt
- plan: Free
- status: available

Canonical services are direct-created Render services. Their current runtime does not inherit the `fromDatabase` binding that is already declared in `render.yaml`.

Observed authority state before admission:

- `dataMode=memory`
- `databaseSchema.ready=false`
- `contractErrors=["postgres_not_configured"]`
- social reverification inactive
- `MFW_REQUIRE_POSTGRES=false`

This is a **Phase 0 blocker**, not a production-ready PostgreSQL authority.

## Free-plan migration rule

The authority itself runs `migrate()` before opening the HTTP server. Every migration is transactional and recorded in `schema_migrations`.

For the free web-service contour, the Blueprint therefore does not depend on a separate pre-deploy migration step. Startup is fail-closed:

`DATABASE_URL -> migrations 001-022 -> schema reconciliation -> demo/bootstrap -> deep self-test -> listen`

If migration or reconciliation fails, the process exits before becoming ready.

## Readiness endpoints

### `GET /health`

Liveness and capability diagnostics. It may return 200 while Phase 0 is blocked.

Includes:

- runtime version;
- `RENDER_GIT_COMMIT` projection as `releaseSha`;
- data mode;
- schema readiness;
- production-admission state.

### `GET /ready`

Production admission only.

Returns **200** only when all are true:

1. PostgreSQL is configured;
2. schema reconciliation is ready;
3. `MFW_REQUIRE_POSTGRES=true`.

Otherwise it returns **503** with explicit blockers.

## Secure binding required in Render

The database secret must not be copied into GitHub or chat.

Apply the canonical Blueprint to the existing named service `mfw-authority`, or use the Render Dashboard Environment UI to add `DATABASE_URL` from the existing `mfw-postgres` connection and set `MFW_REQUIRE_POSTGRES=true`.

The canonical Blueprint already defines:

```yaml
- key: MFW_REQUIRE_POSTGRES
  value: "true"
- key: DATABASE_URL
  fromDatabase:
    name: mfw-postgres
    property: connectionString
```

The current Render MCP surface does not expose the generated database credential and does not provide Blueprint sync/apply. Do not invent or reconstruct the secret.

## Acceptance sequence

After secure binding:

1. deploy `mfw-authority`;
2. startup applies migrations 001-022;
3. `GET /ready` returns 200;
4. `dataMode=postgres`;
5. `databaseSchema.ready=true`;
6. `missingMigrations=[]`;
7. `missingTables=[]`;
8. `missingColumns=[]`;
9. `contractErrors=[]`;
10. rerun identity / registration / agenda / loyalty Golden Paths;
11. verify social reverification is active;
12. run `MFW_EXPECTED_SHA=<exact-sha> npm run check:production-admission`;
13. record exact Render deploy evidence in `RENDER_STATE.md` and `RELEASE_LOG.md`.

No Phase 1 stateful integration is production-admitted before this sequence is green.

## Free-tier reverification execution

A dedicated Render Cron is intentionally **not** part of the zero-paid-resource contour.

Authority behavior after PostgreSQL admission:

1. start the ordinary in-process reverification interval;
2. read the latest completed persisted `social_reverification_runs.completed_at`;
3. if no successful/completed history exists or the last completion is older than the configured interval, queue one `startup_catchup`;
4. collapse concurrent interval/catch-up triggers behind a single in-process execution promise;
5. persist each run through the existing `social_reverification_runs` authority.

Limitation: when a free web service is asleep, JavaScript timers do not execute. Therefore this is **eventual catch-up on wake/restart**, not strict wall-clock scheduling. The later durable job phase replaces this execution mechanism without changing the social-membership domain authority.

## Blueprint secret contract

Use the exact runtime names consumed by `server-v2.js`:

- `MFW_TELEGRAM_BOT_TOKEN`
- `MFW_TELEGRAM_WEBHOOK_SECRET`
- `MFW_TELEGRAM_LOGIN_CLIENT_ID`
- `MFW_TELEGRAM_LOGIN_CLIENT_SECRET`
- `MFW_VK_SERVICE_TOKEN`
- `MFW_VK_APP_ID`
- `MFW_ADMIN_TOKEN`
- `MFW_ES256_SEED`

Do not use the obsolete Blueprint-only aliases `TELEGRAM_BOT_TOKEN`, `VK_CLIENT_ID`, `VK_CLIENT_SECRET` or `MFW_JWT_SECRET`.

## Capital Authority admission extension

Migration 022 adds the PostgreSQL-only immutable Capital Authority.

Production admission for programme-capital writes additionally requires:

- capital_ledger_events present;
- immutability trigger present;
- /v1/capital/events fail-closed without PostgreSQL;
- /v1/capital/verify reports an intact hash chain after a test event sequence;
- non-demo Organizer/Staff actor identity.

The frontend modelled Programme Capital Control remains demo-only until these checks pass on the exact deployed SHA.
