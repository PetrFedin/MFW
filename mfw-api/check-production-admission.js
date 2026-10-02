const baseUrl = String(process.env.MFW_AUTHORITY_URL || 'https://mfw-authority.onrender.com').replace(/\/$/, '');
const expectedSha = String(process.env.MFW_EXPECTED_SHA || '').trim();

async function main() {
  const response = await fetch(baseUrl + '/ready', { headers: { 'Cache-Control': 'no-cache' } });
  const body = await response.json().catch(() => ({}));

  const errors = [];
  if (response.status !== 200) errors.push('ready_http_' + response.status);
  if (body.status !== 'ready' || body.ready !== true) errors.push('production_not_ready');
  if (body.dataMode !== 'postgres') errors.push('data_mode_not_postgres');
  if (body.requirePostgres !== true) errors.push('postgres_guard_not_enabled');
  if (body.databaseConfigured !== true) errors.push('database_not_configured');
  if (body.databaseSchemaReady !== true) errors.push('schema_not_ready');
  if (expectedSha && body.releaseSha !== expectedSha) errors.push('release_sha_mismatch');

  const result = {
    ok: errors.length === 0,
    authority: baseUrl,
    expectedSha: expectedSha || null,
    releaseSha: body.releaseSha || null,
    dataMode: body.dataMode || null,
    databaseSchemaReady: body.databaseSchemaReady === true,
    requirePostgres: body.requirePostgres === true,
    blockers: body.blockers || [],
    errors
  };

  console.log(JSON.stringify(result, null, 2));
  if (errors.length) process.exit(1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
  process.exit(1);
});
