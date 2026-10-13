'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const recovery=path.join(root,'recovery-candidates');
const observation=JSON.parse(fs.readFileSync(path.join(recovery,'027-outbox-observation.json'),'utf8'));
const migrations=fs.readdirSync(path.join(root,'migrations'));
assert.deepEqual(observation.productionAdmitted,false);
assert.deepEqual(observation.original027Recovered,false);
assert.deepEqual(observation.candidateEquivalenceVerified,false);
assert.equal(observation.isolatedPostgresReplayPassed,false);
assert.equal(observation.fanout.supported,false);
assert.equal(observation.fanout.blocker,'receipt_event_key_globally_unique');
for(const n of ['026_postgres_conflict_constraints.sql','027_outbox_pg_boss_bridge.sql']){
  assert.equal(migrations.includes(n),false,'unreviewed SQL must not become executable migration: '+n);
}
const s026=fs.readFileSync(path.join(recovery,'026_postgres_conflict_constraints.sql'),'utf8');
const s027=fs.readFileSync(path.join(recovery,'027_outbox_pg_boss_bridge.sql'),'utf8');
assert.match(s026,/NOT the recovered original/);
assert.match(s026,/ux_loyalty_offers_external_key/);
assert.match(s026,/ux_brand_content_posts_external_key/);
assert.match(s027,/RECONSTRUCTED CATALOG CANDIDATE, NOT THE ORIGINAL 027/);
assert.match(s027,/CONSTRAINT authority_delivery_receipts_event_key_key UNIQUE \(event_key\)/);
assert.match(s027,/CONSTRAINT authority_delivery_receipts_outbox_id_consumer_key UNIQUE \(outbox_id, consumer\)/);
assert.match(s027,/ON DELETE RESTRICT/);
assert.match(s027,/ENABLE ROW LEVEL SECURITY/);
const liveCatalog=JSON.parse(fs.readFileSync(path.join(recovery,'027-catalog-reference.json'),'utf8'));
assert.equal(liveCatalog.historical027Recovered,false);
assert.equal(liveCatalog.fullSemanticEquivalence,false);
assert.equal(liveCatalog.catalog.columns.length,23);
assert.equal(liveCatalog.catalog.indexes.length,8);
assert.equal(liveCatalog.catalog.constraints.length,8);
assert.equal(liveCatalog.catalog.policyCount,0);

assert.match(s027,/CHECK \(attempts >= 0\)/);
assert.match(s027,/pending','dispatching','dispatched','failed/);
for(const [table,data] of Object.entries(observation.tables)){
  assert.match(s027,new RegExp('CREATE TABLE public\\.'+table+' \\('));
  for(const name of data.constraints)assert(s027.includes('CONSTRAINT '+name),'missing constraint: '+name);
  for(const name of data.indexes)assert(s027.includes(name),'missing index: '+name);
}
console.log(JSON.stringify({event:'mfw_recovery_candidate_contract',status:'pass',sqlExecution:'not_attempted',liveDatabase:'unchanged'}));
