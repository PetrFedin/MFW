const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');

const serverPath = path.join(__dirname, 'server-v2.js');

async function waitFor(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response) return response;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('timeout_waiting_for_' + url);
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
  const port = 19094;
  const env = { ...process.env, PORT: String(port), MFW_REQUIRE_POSTGRES: 'false', RENDER_GIT_COMMIT: 'qa-made-release' };
  delete env.DATABASE_URL;

  const child = spawn(process.execPath, [serverPath], {
    cwd: __dirname,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (d) => { output += d.toString(); });
  child.stderr.on('data', (d) => { output += d.toString(); });

  try {
    await waitFor('http://127.0.0.1:' + port + '/health');

    const overviewResponse = await fetch('http://127.0.0.1:' + port + '/v1/made-in-moscow/overview');
    const overview = await overviewResponse.json();
    assert.strictEqual(overviewResponse.status, 200);
    assert.strictEqual(overview.data.programKey, 'made_in_moscow');
    assert.strictEqual(overview.data.accessModel, 'shared_platform_identity');
    assert.strictEqual(overview.data.verifiedBrandAuthority, 'approved_roster_or_reviewed_evidence');
    assert.strictEqual(overview.data.crossModeration, true);
    assert.strictEqual(overview.data.verifiedBrands, 0);
    assert.strictEqual(overview.data.productionAdmitted, false);

    const verifiedResponse = await fetch('http://127.0.0.1:' + port + '/v1/made-in-moscow/brands');
    const verified = await verifiedResponse.json();
    assert.strictEqual(verifiedResponse.status, 200);
    assert.deepStrictEqual(verified.data, []);
    assert.strictEqual(verified.reason, 'verified_roster_requires_postgres');

    const brandsResponse = await fetch('http://127.0.0.1:' + port + '/v1/brands');
    const brands = await brandsResponse.json();
    assert.strictEqual(brandsResponse.status, 200);
    assert(Array.isArray(brands.data));
    assert(brands.data.every((brand) => brand.madeInMoscowVerified === false));

    console.log(JSON.stringify({ event: 'mfw_made_in_moscow_contract', status: 'pass' }));
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
