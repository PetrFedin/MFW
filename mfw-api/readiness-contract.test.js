const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');

const serverPath = path.join(__dirname, 'server-v2.js');

function cleanEnv(extra) {
  const env = { ...process.env, ...extra };
  delete env.DATABASE_URL;
  return env;
}

function collect(child) {
  let output = '';
  child.stdout.on('data', (d) => { output += d.toString(); });
  child.stderr.on('data', (d) => { output += d.toString(); });
  return () => output;
}

async function waitForJson(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      const body = await response.json();
      return { response, body };
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

async function assertMemoryModeFailsClosed() {
  const port = 19091;
  const child = spawn(process.execPath, [serverPath], {
    cwd: __dirname,
    env: cleanEnv({
      PORT: String(port),
      MFW_REQUIRE_POSTGRES: 'false',
      RENDER_GIT_COMMIT: 'qa-memory-release'
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const output = collect(child);

  try {
    const health = await waitForJson('http://127.0.0.1:' + port + '/health');
    assert.strictEqual(health.response.status, 200);
    assert.strictEqual(health.body.status, 'ok');
    assert.strictEqual(health.body.dataMode, 'memory');
    assert.strictEqual(health.body.releaseSha, 'qa-memory-release');
    assert.strictEqual(health.body.productionAdmission.ready, false);
    assert(health.body.productionAdmission.blockers.includes('postgres_not_configured'));
    assert(health.body.productionAdmission.blockers.includes('postgres_guard_not_enabled'));

    const readyResponse = await fetch('http://127.0.0.1:' + port + '/ready');
    const ready = await readyResponse.json();
    assert.strictEqual(readyResponse.status, 503);
    assert.strictEqual(ready.status, 'blocked');
    assert.strictEqual(ready.ready, false);
    assert.strictEqual(ready.dataMode, 'memory');
    assert(ready.blockers.includes('postgres_not_configured'));
  } catch (err) {
    err.message += '\nserver output:\n' + output();
    throw err;
  } finally {
    await stop(child);
  }
}

async function assertStrictModeRefusesMissingDatabase() {
  const child = spawn(process.execPath, [serverPath], {
    cwd: __dirname,
    env: cleanEnv({
      PORT: '19092',
      MFW_REQUIRE_POSTGRES: 'true',
      RENDER_GIT_COMMIT: 'qa-strict-release'
    }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const output = collect(child);

  const result = await Promise.race([
    new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal }))),
    new Promise((_, reject) => setTimeout(() => reject(new Error('strict_mode_did_not_exit')), 10000))
  ]);

  assert.notStrictEqual(result.code, 0);
  assert(output().includes('MFW_REQUIRE_POSTGRES=true but DATABASE_URL is not configured'));
}

(async () => {
  await assertMemoryModeFailsClosed();
  await assertStrictModeRefusesMissingDatabase();
  console.log(JSON.stringify({ event: 'mfw_readiness_contract', status: 'pass' }));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
