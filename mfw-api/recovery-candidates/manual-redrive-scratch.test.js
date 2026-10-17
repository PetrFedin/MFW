'use strict';
// Research-only manual dead-letter re-drive qualification on a disposable
// restored PostgreSQL 17 fixture. NEVER invoked by deployed Authority.
const assert = require('node:assert/strict');
const { Pool } = require('pg');

const source = new URL(process.env.DATABASE_URL || '');
assert.equal(process.env.CI, 'true', 'CI only');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'GitHub Actions only');
assert.equal(process.env.MFW_ISOLATED_PG_CI, 'true', 'isolated PG17 only');
for (const [key,value] of [
  ['protocol','postgresql:'],['hostname','127.0.0.1'],['port','5432'],
  ['pathname','/mfw_scratch_ci'],['username','mfw_ci'],
  ['password','mfw_ci_local_only']
]) assert.equal(source[key],value,'no_non_scratch_database_'+key);
source.pathname = '/mfw_restored_ci';

const TIME = '2026-10-16T11:00:00.000Z';
const REASONS = new Set(['DEPENDENCY_RECOVERED','SOURCE_VERIFIED']);
function deny(code) {
  const err = new Error(code);
  err.code = code;
  throw err;
}
function validCode(value,pattern) {
  return typeof value === 'string' && pattern.test(value);
}

async function redriveScratch(pool,input) {
  if (!input || typeof input !== 'object' ||
      !validCode(input.outboxId,/^[0-9a-f-]{36}$/i) ||
      !validCode(input.consumer,/^ci_[a-z_]{1,40}$/) ||
      !validCode(input.requestKey,/^ci_redrive_[a-z0-9_]{1,48}$/) ||
      !validCode(input.requestedBy,/^ci_[a-z_]{1,40}$/) ||
      !validCode(input.approvedBy,/^ci_[a-z_]{1,40}$/) ||
      !REASONS.has(input.reasonCode) ||
      typeof input.now !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(input.now) ||
      !Number.isFinite(Date.parse(input.now))) deny('redrive_request_invalid');
  if (input.requestedBy === input.approvedBy) deny('independent_approval_required');
  const client = await pool.connect();
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;
    // Serialize manual requests for one job; unlike worker SKIP LOCKED,
    // manual approval waits for the current operator transaction.
    const jobResult = await client.query(
      'SELECT status,attempt_count,error_code FROM public.ci_delivery_retry_jobs '+
      'WHERE outbox_id=$1::uuid AND consumer=$2 FOR UPDATE',
      [input.outboxId,input.consumer]);
    if (jobResult.rowCount !== 1) deny('redrive_job_not_found');
    const job = jobResult.rows[0];
    const roles = await client.query(
      'SELECT actor_id,duty,active,assurance FROM public.ci_redrive_actor_fixture '+
      'WHERE actor_id=ANY($1::text[])',
      [[input.requestedBy,input.approvedBy]]);
    const requester = roles.rows.find(x=>x.actor_id===input.requestedBy);
    const reviewer = roles.rows.find(x=>x.actor_id===input.approvedBy);
    if (!requester || requester.duty !== 'operator' || requester.active !== true ||
        requester.assurance !== 'aal2' ||
        !reviewer || reviewer.duty !== 'reviewer' || reviewer.active !== true ||
        reviewer.assurance !== 'aal2') deny('redrive_approved_authority_required');
    // Idempotency MUST bind both actor identities and the reason to the key.
    // It cannot let a different caller inspect or reuse a previous approval.
    const prior = await client.query(
      'SELECT outbox_id,consumer,requested_by,approved_by,reason_code '+
      'FROM public.ci_redrive_audit WHERE request_key=$1',
      [input.requestKey]);
    if (prior.rowCount) {
      const row = prior.rows[0];
      if (row.outbox_id !== input.outboxId || row.consumer !== input.consumer ||
          row.requested_by !== input.requestedBy ||
          row.approved_by !== input.approvedBy ||
          row.reason_code !== input.reasonCode) deny('redrive_request_key_conflict');
      await client.query('COMMIT');
      inTransaction = false;
      return 'ALREADY_RECORDED';
    }
    if (job.status !== 'dead_letter' || Number(job.attempt_count) !== 3)
      deny('dead_letter_only');
    const receipts = await client.query(
      'SELECT 1 FROM public.authority_delivery_receipts '+
      'WHERE outbox_id=$1::uuid AND consumer=$2 LIMIT 1',
      [input.outboxId,input.consumer]);
    if (receipts.rowCount !== 0) deny('already_delivered');
    const sequence = await client.query(
      'SELECT COALESCE(MAX(sequence_number),0)::integer+1 AS next '+
      'FROM public.ci_redrive_audit WHERE outbox_id=$1::uuid AND consumer=$2',
      [input.outboxId,input.consumer]);
    await client.query(
      'INSERT INTO public.ci_redrive_audit('+
      'request_key,outbox_id,consumer,sequence_number,requested_by,approved_by,'+
      'reason_code,previous_attempt_count,recorded_at) '+
      'VALUES ($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9::timestamptz)',
      [input.requestKey,input.outboxId,input.consumer,sequence.rows[0].next,
        input.requestedBy,input.approvedBy,input.reasonCode,Number(job.attempt_count),input.now]);
    const updated = await client.query(
      "UPDATE public.ci_delivery_retry_jobs SET status='pending',"+
      'attempt_count=0,available_at=$3::timestamptz,error_code=NULL '+
      "WHERE outbox_id=$1::uuid AND consumer=$2 AND status='dead_letter' "+
      'AND attempt_count=3 RETURNING status',
      [input.outboxId,input.consumer,input.now]);
    if (updated.rowCount !== 1) deny('redrive_concurrent_state_changed');
    await client.query('COMMIT');
    inTransaction = false;
    return 'REQUEUED';
  } catch (error) {
    if (inTransaction) {
      try { await client.query('ROLLBACK'); }
      catch (_) { /* retain the original error */ }
    }
    throw error;
  } finally { client.release(); }
}

async function main() {
  const pool = new Pool({connectionString:source.toString(),max:4});
  try {
    const version = await pool.query("SELECT current_setting('server_version_num') AS version");
    assert.equal(Math.floor(Number(version.rows[0].version)/10000),17);
    const schema = await pool.query(
      'SELECT COUNT(*)::integer AS n FROM public.schema_migrations');
    assert.equal(schema.rows[0].n,27,'no invented migration history');
    const poisoned = await pool.query(
      'SELECT j.outbox_id,j.consumer,j.status,j.attempt_count '+
      'FROM public.ci_delivery_retry_jobs j '+
      "JOIN public.authority_outbox o ON o.id=j.outbox_id AND o.event_key='ci:restore-test' "+
      "WHERE j.consumer='ci_poison'");
    assert.equal(poisoned.rowCount,1,'previous scratch retry qualification required');
    assert.equal(poisoned.rows[0].status,'dead_letter');
    assert.equal(poisoned.rows[0].attempt_count,3);
    const outboxId = poisoned.rows[0].outbox_id;
    const fixture = [
      ['ci_operator','operator',true,'aal2'],
      ['ci_reviewer','reviewer',true,'aal2'],
      ['ci_blocked','reviewer',false,'aal2'],
      ['ci_low_assurance','reviewer',true,'aal1']
    ];
    await pool.query(
      'CREATE TABLE public.ci_redrive_actor_fixture ('+
      'actor_id text PRIMARY KEY,duty text NOT NULL CHECK(duty IN ('+
      "'operator','reviewer')),"+
      'active boolean NOT NULL,assurance text NOT NULL '+
      "CHECK(assurance IN ('aal1','aal2')))");
    for (const values of fixture) {
      await pool.query(
        'INSERT INTO public.ci_redrive_actor_fixture(actor_id,duty,active,assurance) '+
        'VALUES($1,$2,$3,$4)',values);
    }
    await pool.query(
      'CREATE TABLE public.ci_redrive_audit ('+
      'request_key text PRIMARY KEY,outbox_id uuid NOT NULL,consumer text NOT NULL,'+
      'sequence_number integer NOT NULL CHECK(sequence_number>0),'+
      'requested_by text NOT NULL REFERENCES public.ci_redrive_actor_fixture(actor_id),'+
      'approved_by text NOT NULL REFERENCES public.ci_redrive_actor_fixture(actor_id),'+
      'reason_code text NOT NULL CHECK(reason_code IN ('+
      "'DEPENDENCY_RECOVERED','SOURCE_VERIFIED')),"+
      'previous_attempt_count integer NOT NULL CHECK(previous_attempt_count=3),'+
      'recorded_at timestamptz NOT NULL,'+
      'CHECK(requested_by<>approved_by),'+
      'UNIQUE(outbox_id,consumer,sequence_number),'+
      'FOREIGN KEY(outbox_id,consumer) '+
      'REFERENCES public.ci_delivery_retry_jobs(outbox_id,consumer) ON DELETE RESTRICT)');
    await pool.query(
      'CREATE FUNCTION public.ci_redrive_audit_immutable() RETURNS trigger '+
      'LANGUAGE plpgsql AS $deny$ BEGIN '+
      "RAISE EXCEPTION 'ci_redrive_audit_immutable' USING ERRCODE='P0001'; "+
      'END; $deny$');
    await pool.query(
      'CREATE TRIGGER ci_redrive_audit_immutable '+
      'BEFORE UPDATE OR DELETE ON public.ci_redrive_audit '+
      'FOR EACH ROW EXECUTE FUNCTION public.ci_redrive_audit_immutable()');
    const valid = {
      outboxId,consumer:'ci_poison',requestKey:'ci_redrive_poison_001',
      requestedBy:'ci_operator',approvedBy:'ci_reviewer',
      reasonCode:'DEPENDENCY_RECOVERED',now:TIME
    };
    async function rejectChange(override,code) {
      await assert.rejects(
        redriveScratch(pool,{...valid,...override}),
        error=>error.code===code,'expected '+code);
      const stillPoisoned = await pool.query(
        'SELECT status,attempt_count FROM public.ci_delivery_retry_jobs '+
        'WHERE outbox_id=$1 AND consumer=$2',[outboxId,'ci_poison']);
      assert.equal(stillPoisoned.rows[0].status,'dead_letter');
      assert.equal(stillPoisoned.rows[0].attempt_count,3);
    }
    await rejectChange({requestedBy:'ci_reviewer',approvedBy:'ci_reviewer'},'independent_approval_required');
    await rejectChange({approvedBy:'ci_blocked'},'redrive_approved_authority_required');
    await rejectChange({approvedBy:'ci_low_assurance'},'redrive_approved_authority_required');
    await rejectChange({approvedBy:'ci_not_a_reviewer'},'redrive_approved_authority_required');
    await rejectChange({reasonCode:'CUSTOMER_PAYMENT_APPROVED'},'redrive_request_invalid');
    await rejectChange({consumer:'ci_retry'},'dead_letter_only');
    const untouched=await pool.query(
      'SELECT count(*)::integer AS n FROM public.ci_redrive_audit');
    assert.equal(untouched.rows[0].n,0,'denials leave no audit or replay changes');

    // Two concurrent identical approvals must produce exactly one durable
    // audit and one new pending job; concurrent HTTP retries are not doubled.
    const repeated=await Promise.all([
      redriveScratch(pool,valid),redriveScratch(pool,valid)
    ]);
    assert.deepEqual(repeated.sort(),['ALREADY_RECORDED','REQUEUED']);
    const state=await pool.query(
      'SELECT status,attempt_count,error_code,available_at FROM public.ci_delivery_retry_jobs '+
      'WHERE outbox_id=$1 AND consumer=$2',[outboxId,'ci_poison']);
    assert.equal(state.rows[0].status,'pending');
    assert.equal(state.rows[0].attempt_count,0);
    assert.equal(state.rows[0].error_code,null);
    assert.equal(state.rows[0].available_at.toISOString(),TIME);
    const audited=await pool.query(
      'SELECT request_key,sequence_number,requested_by,approved_by,reason_code,'+
      'previous_attempt_count FROM public.ci_redrive_audit');
    assert.equal(audited.rowCount,1);
    assert.deepEqual(
      Object.values(audited.rows[0]),
      [valid.requestKey,1,'ci_operator','ci_reviewer',
       'DEPENDENCY_RECOVERED',3]);
    const noEffects=await pool.query(
      'SELECT '+
      '(SELECT COUNT(*)::integer FROM public.ci_delivery_effects WHERE outbox_id=$1 AND consumer=$2) AS effects,'+
      '(SELECT COUNT(*)::integer FROM public.authority_delivery_receipts WHERE outbox_id=$1 AND consumer=$2) AS receipts',
      [outboxId,'ci_poison']);
    assert.deepEqual(noEffects.rows[0],{effects:0,receipts:0},
      'approval alone must not claim a delivered business effect');
    // A replay key must be scope- and actor-bound. Even a valid reviewer
    // cannot reuse an unrelated key to silently redirect an approval.
    await assert.rejects(
      redriveScratch(pool,{...valid,consumer:'ci_retry'}),
      error=>error.code==='redrive_request_key_conflict');
    await assert.rejects(
      redriveScratch(pool,{...valid,reasonCode:'SOURCE_VERIFIED'}),
      error=>error.code==='redrive_request_key_conflict');
    await assert.rejects(
      redriveScratch(pool,{...valid,requestKey:'ci_redrive_poison_002'}),
      error=>error.code==='dead_letter_only');
    await assert.rejects(
      pool.query("UPDATE public.ci_redrive_audit SET reason_code='SOURCE_VERIFIED'"),
      error=>error.code==='P0001');
    await assert.rejects(
      pool.query('DELETE FROM public.ci_redrive_audit'),
      error=>error.code==='P0001');
    const fresh = new Pool({connectionString:source.toString(),max:1});
    try {
      const persisted=await fresh.query(
        'SELECT status,attempt_count FROM public.ci_delivery_retry_jobs WHERE outbox_id=$1 AND consumer=$2',
        [outboxId,'ci_poison']);
      assert.deepEqual(
        [persisted.rows[0].status,persisted.rows[0].attempt_count],
        ['pending',0]);
      const count=await fresh.query('SELECT COUNT(*)::integer AS n FROM public.ci_redrive_audit');
      assert.equal(count.rows[0].n,1);
    }finally { await fresh.end(); }
    const finalHistory=await pool.query('SELECT COUNT(*)::integer AS n FROM public.schema_migrations');
    assert.equal(finalHistory.rows[0].n,27);
    console.log(JSON.stringify({
      event:'mfw_scratch_dual_control_dead_letter_redrive',
      status:'pass',concurrentSameRequest:'single_audit_single_requeue',
      independentSyntheticAal2Actors:true,blockedAndUnverifiedActorsDenied:true,
      immutableAuditTrigger:true,replayKeyScopeBound:true,
      noExternalEffects:true,liveSignedActors:false,
      actualAuthorisation:false,manualReplayProduction:false,
      migrationHistoryUnchanged:true,productionAdmitted:false
    }));
  } finally { await pool.end(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
