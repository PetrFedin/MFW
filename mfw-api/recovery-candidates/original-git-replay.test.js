'use strict';
// Isolated Git-source replay. This test will refuse real Supabase/Render URLs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Pool } = require('pg');
const { runMigrations } = require('../migration-runner');
const { gitBlobSha } = require('../migration-preflight');

const sourceDir = path.join(__dirname, 'original-git');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'original-git-provenance.json'), 'utf8'));
assert.equal(manifest.historicGitFilesRecovered, true);
assert.equal(manifest.liveDatabaseSqlApplicationProven, false);
assert.equal(manifest.productionAdmitted, false);
assert.equal(process.env.CI, 'true');
assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.MFW_ISOLATED_PG_CI, 'true');
const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
for (const [key,value] of [
  ['protocol','postgresql:'], ['hostname','127.0.0.1'], ['port','5432'],
  ['username','mfw_ci'], ['password','mfw_ci_local_only'], ['pathname','/mfw_scratch_ci']
]) assert.equal(url[key], value, 'non_scratch_database_forbidden_' + key);

for (const origin of manifest.migrations) {
  const bytes = fs.readFileSync(path.join(sourceDir,origin.filename));
  assert.equal(gitBlobSha(bytes), origin.gitBlobSha, 'original Git bytes changed: ' + origin.filename);
  assert.match(origin.originCommit, /^[a-f0-9]{40}$/);
}

async function main() {
  const admin = new Pool({ connectionString:url.toString(), max:1 });
  let original = null;
  let temp = null;
  try {
    const version = await admin.query("SELECT current_setting('server_version_num') AS version");
    assert.equal(Math.floor(Number(version.rows[0].version)/10000),17,'PostgreSQL 17 required');
    // The original committed 027 explicitly revokes anon/authenticated.
    // Create those roles ONLY inside the disposable GitHub Actions PostgreSQL.
    await admin.query('CREATE ROLE anon NOLOGIN');
    await admin.query('CREATE ROLE authenticated NOLOGIN');
    await admin.query('CREATE DATABASE mfw_original_ci');
    const originUrl = new URL(url.toString());
    originUrl.pathname = '/mfw_original_ci';
    original = new Pool({ connectionString:originUrl.toString(),max:2 });
    temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mfw-git-original-'));
    const baseDir = path.join(__dirname, '..','migrations');
    const originalFiles = fs.readdirSync(baseDir).filter(n => n.endsWith('.sql'));
    assert.equal(originalFiles.length,25);
    for (const name of originalFiles) fs.copyFileSync(path.join(baseDir,name),path.join(temp,name));
    for (const source of manifest.migrations)
      fs.copyFileSync(path.join(sourceDir,source.filename),path.join(temp,source.filename));
    const files = fs.readdirSync(temp).filter(n=>n.endsWith('.sql')).sort();
    assert.equal(files.length,27);
    const hashes = Object.fromEntries(files.map(name=>[name,gitBlobSha(fs.readFileSync(path.join(temp,name)))]));
    const lockPath = path.join(temp,'git-source-scratch-lock.json');
    fs.writeFileSync(lockPath,JSON.stringify({format:'mfw-git-blob-lock-v1',files:hashes}));
    const options={dir:temp,lockPath};
    assert.equal((await runMigrations(original,options)).applied.length,27);
    assert.equal((await runMigrations(original,options)).applied.length,0,'second replay must be idempotent');

    const catalog = (await original.query(require('./catalog-query'))).rows[0].catalog;
    const reference = JSON.parse(fs.readFileSync(path.join(__dirname,'027-catalog-reference.json'),'utf8'));
    assert.deepStrictEqual(catalog, reference.catalog,
      'original Git 027 diverges from the observed 2026-10-13 physical catalog');
    for(const role of ['anon','authenticated']){
      for(const table of ['authority_outbox','authority_delivery_receipts']){
        const grants = await original.query('SELECT has_table_privilege($1,$2,$3) AS allowed',
          [role,'public.'+table,'SELECT']);
        assert.equal(grants.rows[0].allowed,false,'unexpected direct SQL read grant '+role+' '+table);
      }
    }
    const comment = await original.query(
      "SELECT obj_description('public.authority_outbox'::regclass) AS description");
    assert.match(comment.rows[0].description,/Transactional handoff/);

    const event = (await original.query(
      'INSERT INTO public.authority_outbox(event_key,topic,payload) VALUES ($1,$2,$3::jsonb) RETURNING id',
      ['ci:git-origin','mfw.ci',JSON.stringify({test:'synthetic_git_source'})])).rows[0];
    const statement='INSERT INTO public.authority_delivery_receipts(outbox_id,event_key,topic,consumer,payload_digest) VALUES($1,$2,$3,$4,$5)';
    await original.query(statement,[event.id,'ci:git-origin','mfw.ci','consumer_A','digest_git']);
    await assert.rejects(
      original.query(statement,[event.id,'ci:git-origin','mfw.ci','consumer_B','digest_git']),
      error=>error.code==='23505'&&error.constraint==='authority_delivery_receipts_event_key_key',
      'original committed 027 must reproduce known multi-consumer fanout blocker');

    console.log(JSON.stringify({
      gate:'mfw_original_committed_sql_pg17',status:'pass',migrationCount:27,
      source:'git_commit_and_blob_pinned',catalog:'matches_observed_snapshot',
      replay:'idempotent',multiConsumer:'blocked_by_original_unique_event_key',
      sqlApplicationToLiveProven:false,roles:'scratch_only',productionAdmitted:false
    }));
  } finally {
    if(original) await original.end();
    await admin.end();
    if(temp) fs.rmSync(temp,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
