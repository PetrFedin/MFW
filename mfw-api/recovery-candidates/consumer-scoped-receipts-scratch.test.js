'use strict';
// ONLY post-restore scratch PostgreSQL 17, NEVER historical 027 or production.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Pool}=require('pg');
const url=new URL(process.env.DATABASE_URL||'');
assert.equal(process.env.CI,'true');
assert.equal(process.env.MFW_ISOLATED_PG_CI,'true');
assert.equal(process.env.GITHUB_ACTIONS,'true');
for(const [key,val] of [
 ['protocol','postgresql:'],['hostname','127.0.0.1'],['port','5432'],
 ['pathname','/mfw_scratch_ci'],['username','mfw_ci'],['password','mfw_ci_local_only']
])assert.equal(url[key],val,'non_scratch_database_forbidden_'+key);
url.pathname='/mfw_restored_ci';
async function main(){
 const pool=new Pool({connectionString:url.toString(),max:1});
 try{
   const pg=await pool.query("SELECT current_setting('server_version_num') AS v");
   assert.equal(Math.floor(Number(pg.rows[0].v)/10000),17);
   const baseline=await pool.query('SELECT count(*)::integer AS n FROM public.schema_migrations');
   assert.equal(baseline.rows[0].n,27);
   const historical=await pool.query(
     "SELECT count(*)::integer AS n FROM pg_constraint WHERE conrelid='public.authority_delivery_receipts'::regclass AND conname='authority_delivery_receipts_event_key_key'");
   assert.equal(historical.rows[0].n,1,'historical schema must be preserved before forward candidate');
   const sql=fs.readFileSync(path.join(__dirname,'028_consumer_scoped_receipts_research.sql'),'utf8');
   await pool.query(sql);
   await pool.query(sql); // reviewed research candidate is replay-safe

   const constraints=await pool.query(
     "SELECT conname FROM pg_constraint WHERE conrelid='public.authority_delivery_receipts'::regclass");
   const names=new Set(constraints.rows.map(r=>r.conname));
   assert(!names.has('authority_delivery_receipts_event_key_key'));
   for(const key of [
     'authority_delivery_receipts_outbox_id_consumer_key',
     'authority_delivery_receipts_outbox_id_fkey',
     'authority_delivery_receipts_outbox_event_key_fkey'
   ])assert(names.has(key),'missing required receipt constraint '+key);
   const parent=await pool.query(
     "SELECT id,event_key FROM public.authority_outbox WHERE event_key='ci:restore-test'");
   assert.equal(parent.rowCount,1);
   const p=parent.rows[0];
   const statement='INSERT INTO public.authority_delivery_receipts(outbox_id,event_key,topic,consumer,payload_digest) VALUES($1,$2,$3,$4,$5)';
   const receipt=[p.id,p.event_key,'mfw.ci','consumer_B','digest_B'];
   await pool.query(statement,receipt);
   const count=await pool.query(
     'SELECT count(*)::integer AS n FROM public.authority_delivery_receipts WHERE outbox_id=$1',[p.id]);
   assert.equal(count.rows[0].n,2,'two consumers should each persist one receipt');
   await assert.rejects(pool.query(statement,receipt),
     err=>err.code==='23505'&&err.constraint==='authority_delivery_receipts_outbox_id_consumer_key');
   await assert.rejects(pool.query(statement,[p.id,'tampered:other-event','mfw.ci','consumer_C','digest_C']),
     err=>err.code==='23503'&&err.constraint==='authority_delivery_receipts_outbox_event_key_fkey');
   const history=await pool.query('SELECT count(*)::integer AS n FROM public.schema_migrations');
   assert.equal(history.rows[0].n,27,'research SQL must not claim migration history');
   console.log(JSON.stringify({
     event:'mfw_research_consumer_scoped_receipts',status:'pass',
     historical027:'preserved_in_candidate_baseline',
     restoredClone:'modified_disposable_only',
     multiConsumerFanout:'two_receipts_on_one_event',
     duplicatePerConsumer:'rejected_23505',
     mismatchedEventReference:'rejected_23503',
     replay:'safe',productionAdmitted:false
   }));
 }finally{await pool.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
