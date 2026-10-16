'use strict';
// ONLY post-restore scratch PostgreSQL 17, NEVER historical 027 or production.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
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
// Scratch-only approximation of a PostgreSQL-local consumer effect.
// External delivery is NOT transactional with this database.
async function consumeScratch(pool,{eventKey,consumer,failAt=null,afterLock=null}){
 const client=await pool.connect();
 let active=false;
 try{
   await client.query('BEGIN');active=true;
   const locked=await client.query(
     'SELECT id,event_key,topic,payload FROM public.authority_outbox WHERE event_key=$1 FOR UPDATE SKIP LOCKED',
     [eventKey]);
   if(!locked.rowCount){
     await client.query('COMMIT');active=false;
     return 'NOT_CLAIMED';
   }
   const event=locked.rows[0];
   if(afterLock)await afterLock();
   const receipt=await client.query(
     'SELECT id FROM public.authority_delivery_receipts WHERE outbox_id=$1 AND consumer=$2',
     [event.id,consumer]);
   if(receipt.rowCount){
     await client.query('COMMIT');active=false;
     return 'ALREADY_PROCESSED';
   }
   const digest=crypto.createHash('sha256')
     .update(JSON.stringify([event.event_key,consumer,event.topic,event.payload]))
     .digest('hex');
   await client.query(
     'INSERT INTO public.ci_delivery_effects(outbox_id,consumer,effect_digest) VALUES($1,$2,$3)',
     [event.id,consumer,digest]);
   if(failAt==='after_effect')throw Error('scratch_crash_after_effect');
   await client.query(
     'INSERT INTO public.authority_delivery_receipts(outbox_id,event_key,topic,consumer,payload_digest) VALUES($1,$2,$3,$4,$5)',
     [event.id,event.event_key,event.topic,consumer,digest]);
   if(failAt==='before_commit')throw Error('scratch_crash_before_commit');
   await client.query('COMMIT');active=false;
   if(failAt==='after_commit')throw Error('scratch_crash_after_commit');
   return 'PROCESSED';
 }catch(error){
   if(active)await client.query('ROLLBACK');
   throw error;
 }finally{client.release();}
}
async function main(){
 const pool=new Pool({connectionString:url.toString(),max:4});
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

   // Fully disposable effects ledger: it models only database-local business
   // effects, never payments, messages, remote APIs or production consumers.
   await pool.query(
     'CREATE TABLE public.ci_delivery_effects ('+
     'outbox_id uuid NOT NULL REFERENCES public.authority_outbox(id) ON DELETE RESTRICT,'+
     'consumer text NOT NULL, effect_digest text NOT NULL,'+
     'PRIMARY KEY(outbox_id,consumer))');
   async function counts(consumer){
     const result=await pool.query(
       'SELECT (SELECT count(*)::integer FROM public.ci_delivery_effects WHERE outbox_id=$1 AND consumer=$2) AS effects,'+
       ' (SELECT count(*)::integer FROM public.authority_delivery_receipts WHERE outbox_id=$1 AND consumer=$2) AS receipts',
       [p.id,consumer]);
     return result.rows[0];
   }
   // Simulate process loss after a local effect, before durable receipt;
   // transaction rollback must remove BOTH records.
   await assert.rejects(
     consumeScratch(pool,{eventKey:p.event_key,consumer:'ci_after_effect',failAt:'after_effect'}),
     /scratch_crash_after_effect/);
   assert.deepEqual(await counts('ci_after_effect'),{effects:0,receipts:0});
   assert.equal(await consumeScratch(pool,{eventKey:p.event_key,consumer:'ci_after_effect'}),'PROCESSED');
   assert.equal(await consumeScratch(pool,{eventKey:p.event_key,consumer:'ci_after_effect'}),'ALREADY_PROCESSED');
   assert.deepEqual(await counts('ci_after_effect'),{effects:1,receipts:1});

   // Receipt written, then transaction aborts: no orphan receipt or effect.
   await assert.rejects(
     consumeScratch(pool,{eventKey:p.event_key,consumer:'ci_before_commit',failAt:'before_commit'}),
     /scratch_crash_before_commit/);
   assert.deepEqual(await counts('ci_before_commit'),{effects:0,receipts:0});
   assert.equal(await consumeScratch(pool,{eventKey:p.event_key,consumer:'ci_before_commit'}),'PROCESSED');
   assert.deepEqual(await counts('ci_before_commit'),{effects:1,receipts:1});

   // Crash AFTER COMMIT: caller may retry, but durable receipt guarantees a
   // single DB-local effect even though the previous response was lost.
   await assert.rejects(
     consumeScratch(pool,{eventKey:p.event_key,consumer:'ci_after_commit',failAt:'after_commit'}),
     /scratch_crash_after_commit/);
   assert.deepEqual(await counts('ci_after_commit'),{effects:1,receipts:1});
   assert.equal(await consumeScratch(pool,{eventKey:p.event_key,consumer:'ci_after_commit'}),'ALREADY_PROCESSED');
   assert.deepEqual(await counts('ci_after_commit'),{effects:1,receipts:1});

   // Hold one worker's row lock and race a second worker against the SAME
   // consumer: SKIP LOCKED must not deliver or block that second worker.
   let releaseLock;
   let markLockHeld;
   const held=new Promise(resolve=>{releaseLock=resolve;});
   const lockSeen=new Promise(resolve=>{markLockHeld=resolve;});
   const workerOne=consumeScratch(pool,{
     eventKey:p.event_key,consumer:'ci_parallel',
     afterLock:async()=>{markLockHeld();await held;}
   });
   await lockSeen;
   let workerTwo;
   try {
     workerTwo=await consumeScratch(pool,{eventKey:p.event_key,consumer:'ci_parallel'});
   }finally{releaseLock();}
   assert.equal(workerTwo,'NOT_CLAIMED');
   assert.equal(await workerOne,'PROCESSED');
   assert.equal(await consumeScratch(pool,{eventKey:p.event_key,consumer:'ci_parallel'}),'ALREADY_PROCESSED');
   assert.deepEqual(await counts('ci_parallel'),{effects:1,receipts:1});

   const fanout=await pool.query(
     'SELECT consumer,count(*)::integer AS n FROM public.authority_delivery_receipts WHERE outbox_id=$1 GROUP BY consumer',
     [p.id]);
   assert.equal(fanout.rowCount,6,'historical A/B plus four independent scratch consumers');
   assert(fanout.rows.every(row=>row.n===1),'per-consumer unique delivery receipt');
   const effects=await pool.query('SELECT count(*)::integer AS n FROM public.ci_delivery_effects WHERE outbox_id=$1',[p.id]);
   assert.equal(effects.rows[0].n,4);
   const restart=new Pool({connectionString:url.toString(),max:1});
   try {
     const persisted=await restart.query(
       'SELECT count(*)::integer AS n FROM public.authority_delivery_receipts WHERE outbox_id=$1',[p.id]);
     assert.equal(persisted.rows[0].n,6,'receipts persist across new database connection');
   }finally{await restart.end();}
   console.log(JSON.stringify({
     event:'mfw_scratch_delivery_crash_recovery',status:'pass',
     rollbackAfterEffect:true,rollbackAfterReceipt:true,
     replayAfterCommitDeduplicated:true,
     competingWorkersSkipLocked:true,consumerScopedDatabaseEffects:true,
     restartReceiptPersistence:true,
     externalExactlyOnce:false,productionWorker:false,
     jwtTenantQualified:false,productionAdmitted:false
   }));
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
