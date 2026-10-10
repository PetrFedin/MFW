'use strict';
const assert=require('assert');
const {reconcileMigrations}=require('./migration-parity');

const canonical=['001_init.sql','002_commerce.sql','025_organisation_credential_revocations.sql'];
assert.deepStrictEqual(reconcileMigrations(canonical,[...canonical].reverse()),{
  ready:true,missingMigrations:[],unexpectedMigrations:[],duplicateMigrations:[]
});
const drift=reconcileMigrations(canonical,[...canonical,'026_postgres_conflict_constraints.sql','027_outbox_pg_boss_bridge.sql']);
assert.strictEqual(drift.ready,false);
assert.deepStrictEqual(drift.unexpectedMigrations,['026_postgres_conflict_constraints.sql','027_outbox_pg_boss_bridge.sql']);
assert.deepStrictEqual(drift.missingMigrations,[]);
const missing=reconcileMigrations(canonical,['001_init.sql']);
assert.strictEqual(missing.ready,false);
assert.deepStrictEqual(missing.missingMigrations,['002_commerce.sql','025_organisation_credential_revocations.sql']);
const duplicate=reconcileMigrations(canonical,[...canonical,'001_init.sql']);
assert.strictEqual(duplicate.ready,false);
assert.deepStrictEqual(duplicate.duplicateMigrations,['001_init.sql']);
assert.throws(()=>reconcileMigrations(null,[]),/migration_lists_required/);
console.log(JSON.stringify({event:'mfw_migration_parity',status:'pass'}));
