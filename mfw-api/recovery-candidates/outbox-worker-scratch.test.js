'use strict';
// Runs only after the multi-consumer, retry and manually approved dead-letter
// scratch tests. No production secrets, API providers or external deliveries.
const assert=require('node:assert/strict');
const {Pool}=require('pg');
const {runScratchWorkerOnce}=require('./outbox-worker-scratch');
const url=new URL(process.env.DATABASE_URL);
url.pathname='/mfw_restored_ci';
const NOW='2026-10-16T12:00:00.000Z';
const LATER='2026-10-16T13:00:00.000Z';
const ORG='ci_org_alpha';
async function main(){
  const pool=new Pool({connectionString:url.toString(),max:5});
  try{
    const version=await pool.query("SELECT current_setting('server_version_num') AS n");
    assert.equal(Math.floor(Number(version.rows[0].n)/10000),17);
    const ledger=await pool.query('SELECT COUNT(*)::int AS n FROM public.schema_migrations');
    assert.equal(ledger.rows[0].n,27);
    const parent=await pool.query(
      "SELECT id,event_key FROM public.authority_outbox WHERE event_key='ci:restore-test'");
    assert.equal(parent.rowCount,1);
    const event=parent.rows[0];

    await pool.query(
      'CREATE TABLE public.ci_worker_delivery_scope ('+
      'outbox_id uuid NOT NULL REFERENCES public.authority_outbox(id),'+
      'consumer text NOT NULL,organisation_id text NOT NULL,'+
      'membership_active boolean NOT NULL,consent_active boolean NOT NULL,'+
      'PRIMARY KEY(outbox_id,consumer))');
    await pool.query(
      'CREATE TABLE public.ci_worker_suppression_audit ('+
      'outbox_id uuid NOT NULL,consumer text NOT NULL,'+
      'reason_code text NOT NULL CHECK(reason_code IN ('+
      "'SCOPE_NOT_AUTHORIZED','MEMBERSHIP_REVOKED','CONSENT_REVOKED','NON_SYNTHETIC_PAYLOAD')),"+
      'recorded_at timestamptz NOT NULL,'+
      'PRIMARY KEY(outbox_id,consumer),'+
      'FOREIGN KEY(outbox_id,consumer) '+
      'REFERENCES public.ci_delivery_retry_jobs(outbox_id,consumer))');
    const insertJob='INSERT INTO public.ci_delivery_retry_jobs('+
      'outbox_id,consumer,available_at,attempt_count) VALUES($1,$2,$3::timestamptz,$4)';
    const insertScope='INSERT INTO public.ci_worker_delivery_scope('+
      'outbox_id,consumer,organisation_id,membership_active,consent_active) '+
      'VALUES($1,$2,$3,$4,$5)';
    const scenarios=[
      {consumer:'ci_worker_rollback',org:ORG,member:true,consent:true},
      {consumer:'ci_worker_receipt',org:ORG,member:true,consent:true},
      {consumer:'ci_worker_after_commit',org:ORG,member:true,consent:true},
      {consumer:'ci_worker_race',org:ORG,member:true,consent:true},
      {consumer:'ci_worker_foreign',org:'ci_org_beta',member:true,consent:true},
      {consumer:'ci_worker_revoked',org:ORG,member:true,consent:false},
      {consumer:'ci_worker_unmembered',org:ORG,member:false,consent:true},
      {consumer:'ci_worker_missing'},
      {consumer:'ci_worker_future',org:ORG,member:true,consent:true,available:LATER},
      {consumer:'ci_worker_exhausted',org:ORG,member:true,consent:true,attempts:3}
    ];
    for(const s of scenarios){
      await pool.query(insertJob,[event.id,s.consumer,s.available||NOW,s.attempts||0]);
      if(s.org)await pool.query(insertScope,[event.id,s.consumer,s.org,s.member,s.consent]);
    }
    // The dual-controlled manual re-drive already returned ci_poison to pending.
    await pool.query(insertScope,[event.id,'ci_poison',ORG,true,true]);
    const run=(consumer,overrides={})=>runScratchWorkerOnce(pool,{
      consumer,organisation:ORG,now:NOW,...overrides
    });
    async function count(consumer){
      const r=await pool.query(
        'SELECT '+
        '(SELECT COUNT(*)::int FROM public.ci_delivery_effects WHERE outbox_id=$1 AND consumer=$2) AS effects,'+
        '(SELECT COUNT(*)::int FROM public.authority_delivery_receipts WHERE outbox_id=$1 AND consumer=$2) AS receipts',
        [event.id,consumer]);
      return r.rows[0];
    }
    await assert.rejects(run('ci_worker_rollback',{failAt:'after_effect'}),
      /scratch_worker_crash_after_effect/);
    assert.deepEqual(await count('ci_worker_rollback'),{effects:0,receipts:0});
    assert.equal(await run('ci_worker_rollback'),'DELIVERED');
    assert.deepEqual(await count('ci_worker_rollback'),{effects:1,receipts:1});
    assert.equal(await run('ci_worker_rollback'),'EMPTY');

    await assert.rejects(run('ci_worker_receipt',{failAt:'after_receipt'}),
      /scratch_worker_crash_after_receipt/);
    assert.deepEqual(await count('ci_worker_receipt'),{effects:0,receipts:0});
    assert.equal(await run('ci_worker_receipt'),'DELIVERED');
    assert.deepEqual(await count('ci_worker_receipt'),{effects:1,receipts:1});

    await assert.rejects(run('ci_worker_after_commit',{failAt:'after_commit'}),
      /scratch_worker_crash_after_commit/);
    assert.deepEqual(await count('ci_worker_after_commit'),{effects:1,receipts:1});
    assert.equal(await run('ci_worker_after_commit'),'EMPTY');
    assert.deepEqual(await count('ci_worker_after_commit'),{effects:1,receipts:1});

    let unlock,seen;
    const held=new Promise(resolve=>{unlock=resolve;});
    const locked=new Promise(resolve=>{seen=resolve;});
    const worker1=run('ci_worker_race',{afterLock:async()=>{seen();await held;}});
    await locked;
    let worker2;
    try{worker2=await run('ci_worker_race');}
    finally{unlock();}
    assert.equal(worker2,'EMPTY');
    assert.equal(await worker1,'DELIVERED');
    assert.deepEqual(await count('ci_worker_race'),{effects:1,receipts:1});

    for(const c of [
      'ci_worker_foreign','ci_worker_revoked',
      'ci_worker_unmembered','ci_worker_missing'
    ]){
      assert.equal(await run(c),'SUPPRESSED');
      assert.deepEqual(await count(c),{effects:0,receipts:0});
      assert.equal(await run(c),'EMPTY');
    }
    assert.equal(await run('ci_worker_future'),'NOT_DUE');
    assert.deepEqual(await count('ci_worker_future'),{effects:0,receipts:0});
    assert.equal(await run('ci_worker_future',{now:LATER}),'DELIVERED');
    assert.equal(await run('ci_worker_exhausted'),'DEAD_LETTER');
    assert.deepEqual(await count('ci_worker_exhausted'),{effects:0,receipts:0});
    assert.equal(await run('ci_poison'),'DELIVERED');
    assert.deepEqual(await count('ci_poison'),{effects:1,receipts:1});

    const bad=await pool.query(
      'INSERT INTO public.authority_outbox(event_key,topic,payload) '+
      'VALUES($1,$2,$3::jsonb) RETURNING id',
      ['ci:pii-reject','mfw.ci',JSON.stringify({email:'personal@example.test'})]);
    const badId=bad.rows[0].id;
    await pool.query(insertJob,[badId,'ci_worker_payload',NOW,0]);
    await pool.query(insertScope,[badId,'ci_worker_payload',ORG,true,true]);
    assert.equal(await run('ci_worker_payload'),'SUPPRESSED');
    const badEffect=await pool.query(
      'SELECT COUNT(*)::int AS n FROM public.authority_delivery_receipts '+
      'WHERE outbox_id=$1',[badId]);
    assert.equal(badEffect.rows[0].n,0);
    const audits=await pool.query(
      'SELECT consumer,reason_code FROM public.ci_worker_suppression_audit ORDER BY consumer');
    assert.deepEqual(audits.rows.map(r=>[r.consumer,r.reason_code]),[
      ['ci_worker_foreign','SCOPE_NOT_AUTHORIZED'],
      ['ci_worker_missing','SCOPE_NOT_AUTHORIZED'],
      ['ci_worker_payload','NON_SYNTHETIC_PAYLOAD'],
      ['ci_worker_revoked','CONSENT_REVOKED'],
      ['ci_worker_unmembered','MEMBERSHIP_REVOKED']
    ]);
    const receiptCount=await pool.query(
      'SELECT COUNT(*)::int AS n FROM public.authority_delivery_receipts WHERE outbox_id=$1',
      [event.id]);
    assert.equal(receiptCount.rows[0].n,13,'7 existing + 6 successful local effects');
    const afterReconnect=new Pool({connectionString:url.toString(),max:1});
    try{
      const r=await afterReconnect.query(
        "SELECT COUNT(*)::int AS n FROM public.ci_delivery_retry_jobs WHERE status='suppressed'");
      assert.equal(r.rows[0].n,5);
      const delivered=await afterReconnect.query(
        "SELECT COUNT(*)::int AS n FROM public.ci_delivery_retry_jobs WHERE status='delivered'");
      assert.equal(delivered.rows[0].n,7,
        'prior ci_retry and six new worker deliveries');
    }finally{await afterReconnect.end();}
    const finalHistory=await pool.query(
      'SELECT COUNT(*)::int AS n FROM public.schema_migrations');
    assert.equal(finalHistory.rows[0].n,27);
    console.log(JSON.stringify({
      event:'mfw_scratch_outbox_worker_execution',status:'pass',
      rowLockSkipLocked:true,dualControlRedriveDelivered:true,
      transactionalBusinessEffectAndReceipt:true,
      concurrentWorkersRaceSafe:true,
      consentRevocationAndMembershipDenials:true,
      tenantScopeDenial:true,privatePayloadDenied:true,
      notDueDeferred:true,terminalRetryLimit:true,
      restartPersistence:true,appMigrationHistoryUnchanged:true,
      externalProviderCalls:0,realJwtVerified:false,
      productionWorker:false,productionAdmitted:false
    }));
  }finally{await pool.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
