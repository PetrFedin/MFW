'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { planMigrations, gitBlobSha, loadLockedMigrations } = require('./migration-preflight');
const { runMigrations } = require('./migration-runner');

// Verify actual checked-in migration bytes, not only synthetic fixtures.
const repoLock = loadLockedMigrations(path.join(__dirname, 'migrations'), path.join(__dirname, 'migration-lock.json'));
assert.strictEqual(repoLock.files.length, 25);

const files = ['001_init.sql','002_commerce.sql','003_security.sql'];
assert.deepStrictEqual(planMigrations(files,[]).pendingFiles,files);
assert.deepStrictEqual(planMigrations(files,['002_commerce.sql','001_init.sql']).pendingFiles,['003_security.sql']);
assert.deepStrictEqual(planMigrations(files,files).pendingFiles,[]);
for(const [names,history,code] of [
  [files,[...files,'026_postgres_conflict_constraints.sql','027_outbox_pg_boss_bridge.sql'],'migration_history_unknown'],
  [files,['001_init.sql','003_security.sql'],'migration_history_not_prefix'],
  [files,['001_init.sql','001_init.sql'],'migration_history_duplicate'],
  [['001_init.sql','003_security.sql'],[],'migration_sequence_invalid'],
  [['001_init.sql','001_extra.sql'],[],'migration_sequence_invalid'],
  [['001_init.sql','bad.sql'],[],'migration_filename_invalid']
]) assert.throws(()=>planMigrations(names,history),err=>err.code===code);

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mfw-migrations-'));
  const dir=path.join(root,'migrations');
  fs.mkdirSync(dir);
  const lockPath=path.join(root,'migration-lock.json');
  const contents={'001_init.sql':'SELECT 1;','002_commerce.sql':'SELECT 2;'};
  for(const [name,content] of Object.entries(contents)) fs.writeFileSync(path.join(dir,name),content);
  fs.writeFileSync(lockPath,JSON.stringify({
    format:'mfw-git-blob-lock-v1',
    files:Object.fromEntries(Object.entries(contents).map(([name,content])=>[name,gitBlobSha(content)]))
  }));
  return {root,dir,lockPath};
}
function fakeDatabase(history=null,tables=[],failSql=null){
  const queries=[];
  const client={
    released:false,
    async query(sql,args){
      queries.push([sql,args]);
      if(failSql&&String(sql).includes(failSql))throw new Error('mock_sql_failure');
      if(String(sql).includes('to_regclass'))return {rows:[{history_table:history?'schema_migrations':null}]};
      if(String(sql).startsWith('SELECT filename'))return {rows:(history||[]).map(filename=>({filename}))};
      if(String(sql).includes('FROM pg_catalog.pg_tables'))return {rows:tables.map(tablename=>({tablename}))};
      return {rows:[]};
    },
    release(){this.released=true;}
  };
  return {queries,client,pool:{async connect(){return client;}}};
}
(async()=>{
  const {root,dir,lockPath}=fixture();
  try{
    assert.deepStrictEqual(loadLockedMigrations(dir,lockPath).files,['001_init.sql','002_commerce.sql']);
    const fresh=fakeDatabase();
    assert.deepStrictEqual((await runMigrations(fresh.pool,{dir,lockPath})).applied,['001_init.sql','002_commerce.sql']);
    assert.strictEqual(fresh.queries.filter(x=>x[0]==='COMMIT').length,1);
    assert(fresh.queries.some(x=>String(x[0]).includes('pg_advisory_xact_lock')));
    assert(fresh.client.released);

    for(const [history,code] of [
      [['001_init.sql','027_outbox_pg_boss_bridge.sql'],'migration_history_unknown'],
      [['002_commerce.sql'],'migration_history_not_prefix']
    ]){
      const db=fakeDatabase(history);
      await assert.rejects(runMigrations(db.pool,{dir,lockPath}),err=>err.code===code);
      assert(!db.queries.some(x=>String(x[0]).startsWith('CREATE TABLE') || String(x[0]).startsWith('INSERT INTO')));
      assert.strictEqual(db.queries.filter(x=>x[0]==='ROLLBACK').length,1);
      assert(db.client.released);
    }
    const noHistory=fakeDatabase(null,['users']);
    await assert.rejects(runMigrations(noHistory.pool,{dir,lockPath}),/migration_history_missing_nonempty_schema/);
    assert(!noHistory.queries.some(x=>String(x[0]).startsWith('CREATE TABLE')));
    assert.strictEqual(noHistory.queries.filter(x=>x[0]==='ROLLBACK').length,1);

    const failing=fakeDatabase(null,[],'SELECT 2;');
    await assert.rejects(runMigrations(failing.pool,{dir,lockPath}),/mock_sql_failure/);
    assert.strictEqual(failing.queries.filter(x=>x[0]==='ROLLBACK').length,1);
    assert(failing.client.released);

    fs.writeFileSync(path.join(dir,'001_init.sql'),'SELECT 9;');
    assert.throws(()=>loadLockedMigrations(dir,lockPath),/migration_lock_hash_mismatch/);
    let connected=false;
    await assert.rejects(runMigrations({async connect(){connected=true;throw Error('unexpected');}},{dir,lockPath}),/migration_lock_hash_mismatch/);
    assert.strictEqual(connected,false);
    console.log(JSON.stringify({event:'mfw_migration_preflight',status:'pass',assertions:'prefix,unknown,missing-history,atomic-rollback,integrity,transaction-advisory-lock'}));
  } finally {fs.rmSync(root,{recursive:true,force:true});}
})().catch(err=>{console.error(err);process.exitCode=1;});
