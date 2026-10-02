const baseUrl = String(process.env.MFW_AUTHORITY_URL || 'https://mfw-authority.onrender.com').replace(/\/$/, '');
const expectedSha = String(process.env.MFW_EXPECTED_SHA || '').trim();

async function fetchJson(pathname) {
  const response = await fetch(baseUrl + pathname, {
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(20000)
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function pushIf(errors, condition, code) {
  if (condition) errors.push(code);
}

async function main() {
  const [readyResult, healthResult, deepResult] = await Promise.all([
    fetchJson('/ready'),
    fetchJson('/health'),
    fetchJson('/health/deep')
  ]);

  const ready = readyResult.body;
  const health = healthResult.body;
  const deep = deepResult.body;
  const schema = ready.databaseSchema || {};
  const reverify = health.reverification || {};
  const productionAdmission = health.productionAdmission || {};

  const errors = [];

  pushIf(errors, readyResult.response.status !== 200, 'ready_http_' + readyResult.response.status);
  pushIf(errors, ready.status !== 'ready' || ready.ready !== true, 'production_not_ready');
  pushIf(errors, ready.dataMode !== 'postgres', 'ready_data_mode_not_postgres');
  pushIf(errors, ready.requirePostgres !== true, 'postgres_guard_not_enabled');
  pushIf(errors, ready.databaseConfigured !== true, 'database_not_configured');
  pushIf(errors, ready.databaseSchemaReady !== true, 'schema_not_ready');
  pushIf(errors, expectedSha && ready.releaseSha !== expectedSha, 'release_sha_mismatch');

  pushIf(errors, schema.ready !== true, 'schema_reconciliation_not_ready');
  pushIf(errors, (schema.missingMigrations || []).length !== 0, 'schema_missing_migrations');
  pushIf(errors, (schema.missingTables || []).length !== 0, 'schema_missing_tables');
  pushIf(errors, (schema.missingColumns || []).length !== 0, 'schema_missing_columns');
  pushIf(errors, (schema.contractErrors || []).length !== 0, 'schema_contract_errors');
  pushIf(errors, !Array.isArray(schema.migrations) || schema.migrations.length < 20, 'migration_set_incomplete');

  pushIf(errors, healthResult.response.status !== 200, 'health_http_' + healthResult.response.status);
  pushIf(errors, health.dataMode !== 'postgres', 'health_data_mode_not_postgres');
  pushIf(errors, productionAdmission.ready !== true, 'health_production_admission_not_ready');
  pushIf(errors, expectedSha && health.releaseSha !== expectedSha, 'health_release_sha_mismatch');
  pushIf(errors, reverify.active !== true, 'social_reverification_scheduler_inactive');
  pushIf(errors, reverify.strategy !== 'in_process_interval_with_startup_catchup', 'social_reverification_strategy_unexpected');
  pushIf(errors, reverify.externalCronRequired !== false, 'external_cron_dependency_present');

  pushIf(errors, deepResult.response.status !== 200, 'deep_health_http_' + deepResult.response.status);
  pushIf(errors, deep.status !== 'pass' || deep.ok !== true, 'deep_golden_path_failed');
  pushIf(errors, deep.dataMode !== 'postgres', 'deep_data_mode_not_postgres');
  pushIf(errors, !(deep.tests && deep.tests.roleGoldenPaths && deep.tests.roleGoldenPaths.all === true), 'role_golden_paths_failed');
  pushIf(errors, !(deep.tests && deep.tests.acceleratedLoyaltyGoldenPath && deep.tests.acceleratedLoyaltyGoldenPath.ok === true), 'loyalty_golden_path_failed');
  pushIf(errors, !(deep.tests && deep.tests.acceleratedLoyaltyGoldenPath && deep.tests.acceleratedLoyaltyGoldenPath.dataMode === 'postgres'), 'loyalty_golden_path_not_postgres');

  const result = {
    ok: errors.length === 0,
    authority: baseUrl,
    expectedSha: expectedSha || null,
    releaseSha: ready.releaseSha || health.releaseSha || null,
    dataMode: ready.dataMode || null,
    databaseSchemaReady: ready.databaseSchemaReady === true,
    migrationsApplied: Array.isArray(schema.migrations) ? schema.migrations.length : 0,
    migrationContract: {
      missingMigrations: schema.missingMigrations || [],
      missingTables: schema.missingTables || [],
      missingColumns: schema.missingColumns || [],
      contractErrors: schema.contractErrors || []
    },
    requirePostgres: ready.requirePostgres === true,
    reverification: {
      active: reverify.active === true,
      strategy: reverify.strategy || null,
      externalCronRequired: reverify.externalCronRequired
    },
    deepGoldenPath: {
      ok: deep.ok === true,
      dataMode: deep.dataMode || null,
      roles: deep.tests && deep.tests.roleGoldenPaths || null,
      loyalty: deep.tests && deep.tests.acceleratedLoyaltyGoldenPath
        ? {
            ok: deep.tests.acceleratedLoyaltyGoldenPath.ok === true,
            dataMode: deep.tests.acceleratedLoyaltyGoldenPath.dataMode || null
          }
        : null
    },
    blockers: ready.blockers || [],
    errors
  };

  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exit(1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  process.exit(1);
});
