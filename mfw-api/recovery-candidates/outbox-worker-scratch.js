'use strict';
// EXECUTABLE RESEARCH ONLY. It cannot be imported in production or used with
// Render/Supabase: this module hard-fails unless the disposable PG17 CI
// connection and flags are present. No network delivery or real user actions.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');

function requireScratch(){
  const url=new URL(process.env.DATABASE_URL||'');
  for(const [key,expected] of [
    ['CI','true'],['GITHUB_ACTIONS','true'],['MFW_ISOLATED_PG_CI','true']
  ])assert.equal(process.env[key],expected,'scratch_flag_'+key);
  for(const [key,expected] of [
    ['protocol','postgresql:'],['hostname','127.0.0.1'],['port','5432'],
    ['pathname','/mfw_scratch_ci'],['username','mfw_ci'],
    ['password','mfw_ci_local_only']
  ])assert.equal(url[key],expected,'non_scratch_database_'+key);
  assert.equal(url.search,'','scratch_connection_query_forbidden');
  assert.equal(url.hash,'','scratch_connection_fragment_forbidden');
}
requireScratch();

function validatedOptions(options){
  assert(options&&typeof options==='object'&&!Array.isArray(options),'options_object_required');
  assert(typeof options.consumer==='string'&&/^ci_[a-z_]{1,45}$/.test(options.consumer),
    'fixed_synthetic_consumer_required');
  assert(typeof options.organisation==='string'&&/^ci_org_[a-z]{1,24}$/.test(options.organisation),
    'fixed_server_owned_synthetic_organisation_required');
  assert(typeof options.now==='string'&&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(options.now)&&
    Number.isFinite(Date.parse(options.now)),'synthetic_utc_time_required');
  assert([null,undefined,'after_effect','after_receipt','after_commit'].includes(options.failAt),
    'invalid_failure_injection');
  if(options.afterLock!==undefined)assert.equal(typeof options.afterLock,'function');
}

async function runScratchWorkerOnce(pool,options){
  validatedOptions(options);
  const client=await pool.connect();
  let inTx=false;
  try{
    await client.query('BEGIN');
    inTx=true;
    const jobs=await client.query(
      'SELECT j.outbox_id,j.consumer,j.attempt_count,j.available_at,'+
      'o.event_key,o.topic,o.payload,'+
      's.organisation_id,s.membership_active,s.consent_active '+
      'FROM public.ci_delivery_retry_jobs j '+
      'JOIN public.authority_outbox o ON o.id=j.outbox_id '+
      'LEFT JOIN public.ci_worker_delivery_scope s '+
      'ON s.outbox_id=j.outbox_id AND s.consumer=j.consumer '+
      "WHERE j.consumer=$1 AND j.status IN ('pending','retry') "+
      'ORDER BY j.available_at,j.outbox_id '+
      'FOR UPDATE OF j SKIP LOCKED LIMIT 1',
      [options.consumer]);
    if(jobs.rowCount===0){
      await client.query('COMMIT');inTx=false;
      return 'EMPTY';
    }
    const job=jobs.rows[0];
    if(options.afterLock)await options.afterLock();
    if(Date.parse(job.available_at)>Date.parse(options.now)){
      await client.query('COMMIT');inTx=false;
      return 'NOT_DUE';
    }
    const prior=await client.query(
      'SELECT 1 FROM public.authority_delivery_receipts '+
      'WHERE outbox_id=$1 AND consumer=$2 LIMIT 1',
      [job.outbox_id,job.consumer]);
    if(prior.rowCount>0){
      await client.query(
        "UPDATE public.ci_delivery_retry_jobs SET status='delivered',error_code=NULL "+
        'WHERE outbox_id=$1 AND consumer=$2',
        [job.outbox_id,job.consumer]);
      await client.query('COMMIT');inTx=false;
      return 'ALREADY_RECEIPTED';
    }
    // Authorization is read INSIDE the claim transaction, after the job lock.
    // There is no claim from a user-editable payload or JWT user_metadata.
    let deny=null;
    if(job.organisation_id===null||job.organisation_id!==options.organisation)
      deny='SCOPE_NOT_AUTHORIZED';
    else if(job.membership_active!==true)deny='MEMBERSHIP_REVOKED';
    else if(job.consent_active!==true)deny='CONSENT_REVOKED';
    else if(!job.payload||Array.isArray(job.payload)||
      Object.keys(job.payload).length!==1||job.payload.synthetic!==true)
      deny='NON_SYNTHETIC_PAYLOAD';
    if(deny){
      await client.query(
        "UPDATE public.ci_delivery_retry_jobs SET status='suppressed',error_code=$3 "+
        'WHERE outbox_id=$1 AND consumer=$2',
        [job.outbox_id,job.consumer,deny]);
      await client.query(
        'INSERT INTO public.ci_worker_suppression_audit(outbox_id,consumer,reason_code,recorded_at) '+
        'VALUES($1,$2,$3,$4::timestamptz)',
        [job.outbox_id,job.consumer,deny,options.now]);
      await client.query('COMMIT');inTx=false;
      return 'SUPPRESSED';
    }
    if(Number(job.attempt_count)>=3){
      await client.query(
        "UPDATE public.ci_delivery_retry_jobs SET status='dead_letter',"+
        "error_code='RETRY_LIMIT_EXCEEDED' "+
        'WHERE outbox_id=$1 AND consumer=$2',
        [job.outbox_id,job.consumer]);
      await client.query('COMMIT');inTx=false;
      return 'DEAD_LETTER';
    }
    const digest=crypto.createHash('sha256').update(JSON.stringify([
      options.organisation,job.event_key,job.consumer,job.topic,job.payload
    ])).digest('hex');
    // The only business effect is another INSERT in the SAME disposable DB
    // transaction as the receipt. This does NOT prove exactly-once email,
    // SMS, wallet, finance or any other external network side effect.
    await client.query(
      'INSERT INTO public.ci_delivery_effects(outbox_id,consumer,effect_digest) '+
      'VALUES($1,$2,$3)',[job.outbox_id,job.consumer,digest]);
    if(options.failAt==='after_effect')throw Error('scratch_worker_crash_after_effect');
    await client.query(
      'INSERT INTO public.authority_delivery_receipts('+
      'outbox_id,event_key,topic,consumer,payload_digest) '+
      'VALUES($1,$2,$3,$4,$5)',
      [job.outbox_id,job.event_key,job.topic,job.consumer,digest]);
    if(options.failAt==='after_receipt')throw Error('scratch_worker_crash_after_receipt');
    await client.query(
      "UPDATE public.ci_delivery_retry_jobs SET status='delivered',"+
      'attempt_count=attempt_count+1,error_code=NULL '+
      'WHERE outbox_id=$1 AND consumer=$2',[job.outbox_id,job.consumer]);
    await client.query('COMMIT');inTx=false;
    if(options.failAt==='after_commit')throw Error('scratch_worker_crash_after_commit');
    return 'DELIVERED';
  }catch(error){
    if(inTx){
      try{await client.query('ROLLBACK');}
      catch(rollback){error.rollbackFailure=String(rollback.message);}
    }
    throw error;
  }finally{client.release();}
}
module.exports={runScratchWorkerOnce};
