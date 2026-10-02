const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');

const serverPath = path.join(__dirname, 'server-v2.js');

function envFor(port) {
  const env = {
    ...process.env,
    PORT: String(port),
    MFW_REQUIRE_POSTGRES: 'false',
    RENDER_GIT_COMMIT: 'qa-feature-release',
    MFW_FLAG_PROGRAMME_PRODUCTION_PREVIEW: 'true'
  };
  delete env.DATABASE_URL;
  return env;
}

async function waitFor(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      return response;
    } catch (err) {
      last = err;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw last || new Error('timeout_waiting_for_' + url);
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000))
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

(async () => {
  const port = 19093;
  const base = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, [serverPath], {
    cwd: __dirname,
    env: envFor(port),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', (d) => { output += d.toString(); });
  child.stderr.on('data', (d) => { output += d.toString(); });

  try {
    await waitFor(base + '/health');

    const anonymous = await fetch(base + '/v1/features?eventBrand=bfs&role=Organizer');
    const anonymousBody = await anonymous.json();
    assert.strictEqual(anonymous.status, 200);
    assert.strictEqual(anonymousBody.role, 'Visitor');
    assert.strictEqual(anonymousBody.securityBoundary, 'not_authorization');
    assert.strictEqual(anonymousBody.defaultsFailClosed, true);
    assert.strictEqual(anonymousBody.data.programme_production_preview.value, false);
    assert.strictEqual(anonymousBody.data.programme_production_preview.reason, 'ROLE_SCOPE_MISS');

    const auth = await fetch(base + '/v1/auth/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rollout QA', role: 'Organizer', identityKey: 'feature-rollout-qa' })
    });
    const authBody = await auth.json();
    assert.strictEqual(auth.status, 200);
    assert(authBody.session);

    const organizer = await fetch(base + '/v1/features?eventBrand=bfs', {
      headers: { Authorization: 'Bearer ' + authBody.session }
    });
    const organizerBody = await organizer.json();
    assert.strictEqual(organizer.status, 200);
    assert.strictEqual(organizerBody.role, 'Organizer');
    assert.strictEqual(organizerBody.data.programme_production_preview.value, true);
    assert.strictEqual(organizerBody.data.programme_production_preview.reason, 'ENV_OVERRIDE');

    const invalid = await fetch(base + '/v1/features?eventBrand=wrong', {
      headers: { Authorization: 'Bearer ' + authBody.session }
    });
    const invalidBody = await invalid.json();
    assert.strictEqual(invalid.status, 400);
    assert.strictEqual(invalidBody.error, 'invalid_event_brand');

    const health = await fetch(base + '/health');
    const healthBody = await health.json();
    assert.strictEqual(healthBody.featureRollout.safety, 'non_critical_only');
    assert.strictEqual(healthBody.featureRollout.boundary, 'openfeature_compatible');
    assert(healthBody.featureRollout.flags.includes('programme_production_preview'));

    console.log(JSON.stringify({ event: 'mfw_feature_rollout_api_contract', status: 'pass' }));
  } catch (err) {
    err.message += '\nserver output:\n' + output;
    throw err;
  } finally {
    await stop(child);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
