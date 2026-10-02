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

`DATABASE_URL -> migrations 001-020 -> schema reconciliation -> demo/bootstrap -> deep self-test -> listen`

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
2. startup applies migrations 001-020;
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
