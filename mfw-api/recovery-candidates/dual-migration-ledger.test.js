'use strict';
// CI-only metadata snapshot; not a live database query.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {auditDualMigrationLedgers}=require('./dual-migration-ledger');
const {gitBlobSha}=require('../migration-preflight');
const root=path.join(__dirname,'..');
const lock=JSON.parse(fs.readFileSync(path.join(root,'migration-lock.json'),'utf8'));
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'original-git-provenance.json'),'utf8'));
const executable=Object.keys(lock.files).sort();
const recovered=source.migrations.map(x=>x.filename).sort();
assert.equal(executable.length,25);
assert.deepEqual(recovered,['026_postgres_conflict_constraints.sql','027_outbox_pg_boss_bridge.sql']);
for(const entry of source.migrations){
  const bytes=fs.readFileSync(path.join(__dirname,'original-git',entry.filename));
  assert.equal(gitBlobSha(bytes),entry.gitBlobSha,'Git original fingerprint');
}
const applied=[...executable,...recovered];
// 2026-10-16 Supabase read-only observation; four recent rows of 28,
// explicitly NOT a claim that this is the full platform ledger.
const platformTail=[
  {version:'20261008160801',name:'mfw_025_organisation_credential_revocations'},
  {version:'20261008170634',name:'mfw_026_server_only_security_and_app_history'},
  {version:'20261008171359',name:'mfw_027_enable_pg_net_probe_transport'},
  {version:'20261009014426',name:'mfw_028_canonical_026_postgres_conflict_constraints'}
];
const base={executableFiles:executable,recoveredGitFiles:recovered,
  appliedAppHistory:applied,platformHistorySample:platformTail};
const audit=auditDualMigrationLedgers(base);
assert.equal(audit.executableCount,25);
assert.equal(audit.appliedAppCount,27);
assert.equal(audit.recoveredGitCount,2);
assert.equal(audit.platformSampleCount,4);
assert.equal(audit.appSequenceValid,true);
assert.equal(audit.knownSourceCoverage,true);
assert.deepEqual(audit.appliedOutsideExecutable,recovered);
assert.deepEqual(audit.recoveredOutsideExecutable,recovered);
assert.deepEqual(audit.platformOrdinalCollisions.map(x=>x.ordinal),['026','027']);
assert.deepEqual(audit.platformOnlyOrdinals,['028']);
assert.equal(audit.executedSqlBytesVerified,false);
assert.equal(audit.productionAdmitted,false);
assert(audit.blockers.includes('application_sql_not_in_executable_migration_lock'));
const extra=auditDualMigrationLedgers({...base,appliedAppHistory:[...applied,'028_unreviewed.sql']});
assert.deepEqual(extra.unknownAppSources,['028_unreviewed.sql']);
assert.equal(extra.knownSourceCoverage,false);
assert(extra.blockers.includes('unknown_application_sql_source'));
assert.throws(()=>auditDualMigrationLedgers({...base,appliedAppHistory:[...applied,recovered[0]]}),
  e=>e.code==='applied_app_history_duplicate');
assert.throws(()=>auditDualMigrationLedgers({...base,recoveredGitFiles:[...recovered,executable[0]]}),
  e=>e.code==='recovered_file_already_executable');
assert.throws(()=>auditDualMigrationLedgers({...base,
  platformHistorySample:[platformTail[0],{...platformTail[0],name:'mfw_025_changed'}]}),
  e=>e.code==='platform_history_duplicate_version');
assert.throws(()=>auditDualMigrationLedgers({...base,platformHistorySample:[{version:'bad',name:'bad'}]}),
  e=>e.code==='platform_history_invalid');
console.log(JSON.stringify({
  event:'mfw_dual_migration_ledger_source_contract',status:'pass',
  executable:25,applicationHistory:27,recoveredGitSources:2,
  platformSampleRows:4,independentPlatformHistory:true,
  ordinalConflicts:['026','027'],liveExecutedBytesAttested:false,
  productionAdmitted:false
}));
