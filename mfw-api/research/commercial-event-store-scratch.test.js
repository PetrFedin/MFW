'use strict';
// This fixture refuses ANY non-localhost or non-CI database connection.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Pool}=require('pg');
function scratchOnly(){
  const url=new URL(process.env.DATABASE_URL||'');
  assert.equal(process.env.GITHUB_ACTIONS,'true');
  assert.equal(process.env.MFW_COMMERCIAL_SCRATCH,'true');
  assert.equal(url.protocol,'postgresql:');
  assert.equal(url.hostname,'127.0.0.1');
  assert.equal(url.port,'5432');
  assert.equal(url.username,'mfw_ci');
  assert.equal(url.password,'scratch_ci_only');
  assert.equal(url.pathname,'/mfw_commercial_ci');
  return url.toString();
}
const connectionString=scratchOnly();
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
async function append(pool,{org='org-a',agreement='a-001',expected=0,key,failAfterInsert=false}){
  const client=await pool.connect();
  let inTx=false;
  try{
    await client.query('BEGIN');inTx=true;
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text),hashtext($2::text))',[org,agreement]);
    const found=await client.query('SELECT sequence_no,event_digest FROM public.ci_commercial_events WHERE organisation_id=$1 AND agreement_id=$2 ORDER BY sequence_no DESC LIMIT 1',[org,agreement]);
    const last=found.rows[0]||null;
    const sequence=last?Number(last.sequence_no):0;
    if(sequence!==expected){
      await client.query('ROLLBACK');inTx=false;
      return {status:'STALE_SEQUENCE',actual:sequence};
    }
    const source=hash('scratch-source:'+key);
    const parent=last?last.event_digest:null;
    const digest=hash([org,agreement,sequence+1,key,parent,source].join('|'));
    const ev=await client.query(
      'INSERT INTO public.ci_commercial_events(organisation_id,agreement_id,event_key,sequence_no,parent_digest,event_digest,source_digest,event_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
      [org,agreement,key,sequence+1,parent,digest,source,'SYNTHETIC_TEST_EVENT']);
    if(failAfterInsert)throw Error('synthetic_rollback_injected');
    await client.query('INSERT INTO public.ci_commercial_outbox(event_id,consumer) VALUES($1,$2)',
      [ev.rows[0].id,'proof-consumer']);
    await client.query('COMMIT');inTx=false;
    return {status:'INSERTED',sequence:sequence+1,eventId:ev.rows[0].id,digest};
  }catch(e){
    if(inTx)await client.query('ROLLBACK');
    throw e;
  }finally{client.release();}
}
async function count(pool,table){
  const q=await pool.query('SELECT count(*)::integer AS n FROM public.'+table);
  return q.rows[0].n;
}
async function main(){
  const pool=new Pool({connectionString,max:4});
  try{
    const pg=await pool.query("SELECT current_setting('server_version_num') AS n");
    assert.equal(Math.floor(Number(pg.rows[0].n)/10000),17);
    await pool.query(fs.readFileSync(path.join(__dirname,'commercial-event-store-scratch.sql'),'utf8'));
    const twin=await Promise.all([
      append(pool,{key:'event-a',expected:0}),
      append(pool,{key:'event-b',expected:0})
    ]);
    assert.equal(twin.filter(x=>x.status==='INSERTED').length,1);
    assert.equal(twin.filter(x=>x.status==='STALE_SEQUENCE').length,1);
    assert.equal(await count(pool,'ci_commercial_events'),1);
    assert.equal(await count(pool,'ci_commercial_outbox'),1);
    const first=twin.find(x=>x.status==='INSERTED');
    await assert.rejects(append(pool,{key:'rolled-back',expected:1,failAfterInsert:true}),
      /synthetic_rollback_injected/);
    assert.equal(await count(pool,'ci_commercial_events'),1);
    assert.equal(await count(pool,'ci_commercial_outbox'),1);
    const second=await append(pool,{key:'event-two',expected:1});
    assert.equal(second.status,'INSERTED');
    assert.equal(second.sequence,2);
    await assert.rejects(append(pool,{key:'event-a',expected:2}),
      e=>e.code==='23505'&&e.constraint==='ci_commercial_event_idempotency');
    assert.equal(await count(pool,'ci_commercial_events'),2);
    assert.equal(await count(pool,'ci_commercial_outbox'),2);
    await pool.query('INSERT INTO public.ci_commercial_outbox(event_id,consumer) VALUES($1,$2)',
      [first.eventId,'analytics-consumer']);
    assert.equal(await count(pool,'ci_commercial_outbox'),3);
    await assert.rejects(pool.query('INSERT INTO public.ci_commercial_outbox(event_id,consumer) VALUES($1,$2)',
      [first.eventId,'analytics-consumer']),
      e=>e.code==='23505'&&e.constraint==='ci_commercial_consumer_idempotency');
    const chain=await pool.query(
      'SELECT a.event_digest AS older,b.parent_digest AS parent FROM public.ci_commercial_events a JOIN public.ci_commercial_events b ON b.sequence_no=2 AND b.organisation_id=a.organisation_id AND b.agreement_id=a.agreement_id WHERE a.sequence_no=1');
    assert.equal(chain.rowCount,1);
    assert.equal(chain.rows[0].older,chain.rows[0].parent);
    await pool.query('CREATE ROLE ci_commercial_guest NOLOGIN');
    await pool.query('GRANT USAGE ON SCHEMA public TO ci_commercial_guest');
    await pool.query('GRANT SELECT ON public.ci_commercial_events TO ci_commercial_guest');
    const guest=await pool.connect();
    try{
      await guest.query('SET ROLE ci_commercial_guest');
      const view=await guest.query('SELECT count(*)::integer AS n FROM public.ci_commercial_events');
      assert.equal(view.rows[0].n,0);
    }finally{await guest.query('RESET ROLE');guest.release();}
    // Explicit cross-organisation negative tests with distinct non-owner roles.
    // Fixed role identity is not a JWT or user-supplied mutable session variable.
    const other=await append(pool,{org:'org-b',agreement:'b-001',expected:0,key:'event-b-org'});
    assert.equal(other.status,'INSERTED');
    assert.equal(await count(pool,'ci_commercial_events'),3);
    assert.equal(await count(pool,'ci_commercial_outbox'),4);
    await pool.query(fs.readFileSync(
      path.join(__dirname,'commercial-tenant-isolation-scratch.sql'),'utf8'));
    const roles=await pool.query(
      "SELECT rolname,rolcanlogin,rolbypassrls FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname",
      [['ci_mfw_org_a','ci_mfw_org_b']]);
    assert.equal(roles.rowCount,2);
    assert(roles.rows.every(row=>row.rolcanlogin===false&&row.rolbypassrls===false));
    const tenantTests=[
      {role:'ci_mfw_org_a',org:'org-a',ownCount:2,foreignEventId:other.eventId},
      {role:'ci_mfw_org_b',org:'org-b',ownCount:1,foreignEventId:first.eventId}
    ];
    for(const scope of tenantTests){
      const connection=await pool.connect();
      try{
        // Roles are predefined literals, not supplied by a caller.
        await connection.query('SET ROLE '+scope.role);
        const visible=await connection.query(
          'SELECT organisation_id FROM public.ci_commercial_events ORDER BY id');
        assert.equal(visible.rowCount,scope.ownCount);
        assert(visible.rows.every(row=>row.organisation_id===scope.org));
        const guessed=await connection.query(
          'SELECT count(*)::integer AS n FROM public.ci_commercial_events WHERE id=$1',
          [scope.foreignEventId]);
        assert.equal(guessed.rows[0].n,0,'foreign event leaked by exact ID');
        // A user-editable GUC has no bearing on role-scoped RLS.
        await connection.query("SELECT set_config('mfw.tenant_hint','org-a',false)");
        const afterSpoof=await connection.query(
          'SELECT organisation_id FROM public.ci_commercial_events');
        assert.equal(afterSpoof.rowCount,scope.ownCount);
        assert(afterSpoof.rows.every(row=>row.organisation_id===scope.org));
        for(const sql of [
          'SELECT count(*) FROM public.ci_commercial_outbox',
          "INSERT INTO public.ci_commercial_events(organisation_id,agreement_id,event_key,sequence_no,event_digest,source_digest,event_type) VALUES('org-a','x','forged',10,'x','x','UNVERIFIED')",
          "UPDATE public.ci_commercial_events SET event_type='UNVERIFIED'",
          'DELETE FROM public.ci_commercial_events'
        ]){
          await assert.rejects(connection.query(sql),error=>error.code==='42501');
        }
      }finally{
        await connection.query('RESET ROLE');
        connection.release();
      }
    }
    assert.equal(await count(pool,'ci_commercial_events'),3);
    assert.equal(await count(pool,'ci_commercial_outbox'),4);
    console.log(JSON.stringify({event:'scratch_two_tenant_sql_roles',status:'pass',
      roles:'nonlogin_nonbypass',read:'own_org_only',
      foreignIdLookup:'no_leak',outbox:'no_access',
      writeOperations:'denied',jwtVerified:false,productionAdmitted:false}));
    const rls=await pool.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.ci_commercial_events'::regclass");
    assert.equal(rls.rows[0].relrowsecurity,true);
    console.log(JSON.stringify({event:'scratch_commercial_event_store',status:'pass',
      concurrent:'one-accepted-one-stale',atomicRollback:'pass',
      twoConsumers:'pass',noBroadRlsPolicy:'pass',
      jwtVerified:false,financeVerified:false,productionAdmitted:false}));
  }finally{await pool.end();}
  const fresh=new Pool({connectionString,max:1});
  try{
    assert.equal(await count(fresh,'ci_commercial_events'),3);
    assert.equal(await count(fresh,'ci_commercial_outbox'),4);
    console.log(JSON.stringify({event:'scratch_commercial_reconnect',status:'pass'}));
  }finally{await fresh.end();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
