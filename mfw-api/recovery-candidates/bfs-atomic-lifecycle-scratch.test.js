'use strict';
// CI-only demonstration of atomic BFS meeting -> event history -> CRM lead.
// It does NOT modify live API, canonical migrations or production databases.
const assert=require('node:assert/strict');
const {Pool}=require('pg');
const url=new URL(process.env.DATABASE_URL||'');
assert.equal(process.env.CI,'true');
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.MFW_ISOLATED_PG_CI,'true');
for(const [k,v] of [['protocol','postgresql:'],['hostname','127.0.0.1'],
 ['port','5432'],['username','mfw_ci'],['password','mfw_ci_local_only'],
 ['pathname','/mfw_scratch_ci']])assert.equal(url[k],v,'scratch_only_'+k);
url.pathname='/mfw_restored_ci';
async function createAtomic(client,{requestKey,actor,failAt}){
 await client.query('BEGIN');let active=true;
 try{
  const prior=await client.query('SELECT meeting_id FROM public.ci_bfs_request_keys WHERE request_key=$1 FOR UPDATE',[requestKey]);
  if(prior.rowCount){await client.query('COMMIT');active=false;return prior.rows[0].meeting_id;}
  const meeting=await client.query(
   "INSERT INTO public.ci_bfs_meetings(actor,status) VALUES($1,'requested') RETURNING id",[actor]);
  if(failAt==='meeting')throw Error('injected_after_meeting');
  const id=meeting.rows[0].id;
  await client.query("INSERT INTO public.ci_bfs_meeting_events(meeting_id,kind) VALUES($1,'requested')",[id]);
  if(failAt==='event')throw Error('injected_after_event');
  await client.query("INSERT INTO public.ci_bfs_leads(meeting_id,stage) VALUES($1,'meeting_requested')",[id]);
  if(failAt==='lead')throw Error('injected_after_lead');
  await client.query('INSERT INTO public.ci_bfs_request_keys(request_key,meeting_id) VALUES($1,$2)',[requestKey,id]);
  await client.query('COMMIT');active=false;
  if(failAt==='commit')throw Error('injected_after_commit');
  return id;
 }catch(e){if(active)await client.query('ROLLBACK');throw e;}
}
async function transaction(pool,input){
 const client=await pool.connect();
 try{return await createAtomic(client,input);}
 finally{client.release();}
}
async function main(){
 const pool=new Pool({connectionString:url.toString(),max:3});
 try{
  const version=await pool.query("SELECT current_setting('server_version_num') AS n");
  assert.equal(Math.floor(Number(version.rows[0].n)/10000),17);
  await pool.query('CREATE TABLE public.ci_bfs_meetings(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor text NOT NULL,status text NOT NULL)');
  await pool.query('CREATE TABLE public.ci_bfs_meeting_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,meeting_id bigint NOT NULL REFERENCES public.ci_bfs_meetings(id),kind text NOT NULL)');
  await pool.query('CREATE TABLE public.ci_bfs_leads(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,meeting_id bigint NOT NULL UNIQUE REFERENCES public.ci_bfs_meetings(id),stage text NOT NULL)');
  await pool.query('CREATE TABLE public.ci_bfs_request_keys(request_key text PRIMARY KEY,meeting_id bigint NOT NULL UNIQUE REFERENCES public.ci_bfs_meetings(id))');
  const counts=async()=>{
   const r=await pool.query('SELECT (SELECT count(*)::int FROM public.ci_bfs_meetings) meetings,(SELECT count(*)::int FROM public.ci_bfs_meeting_events) events,(SELECT count(*)::int FROM public.ci_bfs_leads) leads,(SELECT count(*)::int FROM public.ci_bfs_request_keys) keys');
   return r.rows[0];
  };
  const empty={meetings:0,events:0,leads:0,keys:0};
  for(const failAt of ['meeting','event','lead']){
   await assert.rejects(transaction(pool,{requestKey:'failure_'+failAt,actor:'ci_buyer',failAt}),new RegExp('injected_after_'+failAt));
   assert.deepEqual(await counts(),empty,'failure must roll back all related records');
  }
  const id=await transaction(pool,{requestKey:'request_one',actor:'ci_buyer',failAt:null});
  assert.deepEqual(await counts(),{meetings:1,events:1,leads:1,keys:1});
  assert.equal(await transaction(pool,{requestKey:'request_one',actor:'ci_buyer'}),id);
  assert.deepEqual(await counts(),{meetings:1,events:1,leads:1,keys:1});
  await assert.rejects(transaction(pool,{requestKey:'request_two',actor:'ci_buyer',failAt:'commit'}),/injected_after_commit/);
  const recoveredId=await transaction(pool,{requestKey:'request_two',actor:'ci_buyer'});
  const recorded=await pool.query('SELECT meeting_id FROM public.ci_bfs_request_keys WHERE request_key=$1',['request_two']);
  assert.equal(recorded.rowCount,1);
  assert.equal(recoveredId,recorded.rows[0].meeting_id,
    'retry must return committed identity; sequence gaps after rollback are expected');
  assert.deepEqual(await counts(),{meetings:2,events:2,leads:2,keys:2});
  const history=await pool.query('SELECT count(*)::int n FROM public.schema_migrations');
  assert.equal(history.rows[0].n,27,'no new application migration admitted');
  console.log(JSON.stringify({event:'mfw_scratch_bfs_atomic_meeting_lead',status:'pass',
   failureInjection:['meeting','event','lead','commit'],idempotentRequestKeys:true,
   committedMeetingHistoryAndLead:true,productionIntegrated:false}));
 }finally{await pool.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
