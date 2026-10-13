'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Pool}=require('pg');
const {runMigrations}=require('./migration-runner');
const {gitBlobSha}=require('./migration-preflight');
const catalog=require('./recovery-candidates/027-outbox-observation.json');

// Strict fail-closed CI-only connection guard: never use a Supabase/Render URL.
if(process.env.GITHUB_ACTIONS!=='true'||process.env.MFW_ISOLATED_PG_TEST!=='DISPOSABLE_GITHUB_ACTIONS_PG17')
  throw new Error('disposable_postgres_ci_guard_missing');
if(process.env.DATABASE_URL)throw new Error('production_database_url_forbidden');
const restore=process.argv.includes('--verify-restore');
const url=new URL(process.env.PG_ISOLATED_ADMISSION_URL||'');
if(!['postgres:','postgresql:'].includes(url.protocol)||url.hostname!=='127.0.0.1'||url.port!=='5432'||
  url.username!=='postgres'||url.pathname!==(restore?'/mfw_admission_restore':'/mfw_admission_ci'))
  throw new Error('not_disposable_local_postgresql_17');
async function sqlState(pool,sql,params,state){
  let failure=null;
  try{await pool.query(sql,params||[]);}catch(e){failure=e;}
  assert(failure,'expected_failure_'+state);
  assert.equal(failure.code,state,'wrong_postgresql_error_class');
}
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mfw-pg17-'));
  const dir=path.join(root,'migrations');
  fs.mkdirSync(dir);
  const names=fs.readdirSync(path.join(__dirname,'migrations')).filter(n=>n.endsWith('.sql')).sort();
  assert.equal(names.length,25);
  for(const name of names)fs.copyFileSync(path.join(__dirname,'migrations',name),path.join(dir,name));
  for(const name of ['026_postgres_conflict_constraints.sql','027_outbox_pg_boss_bridge.sql']){
    assert.equal(names.includes(name),false,'candidate_executable_in_live_migrations');
    fs.copyFileSync(path.join(__dirname,'recovery-candidates',name),path.join(dir,name));
    names.push(name);
  }
  const lock={format:'mfw-git-blob-lock-v1',files:{}};
  for(const name of names)lock.files[name]=gitBlobSha(fs.readFileSync(path.join(dir,name)));
  const lockPath=path.join(root,'lock.json');
  fs.writeFileSync(lockPath,JSON.stringify(lock));
  return {root,dir,lockPath};
}
async function verify(pool,db){
  const d=await pool.query('SELECT current_database() AS db, current_setting($1) AS version',['server_version_num']);
  assert.equal(d.rows[0].db,db);
  assert.equal(Math.floor(Number(d.rows[0].version)/10000),17);
  const applied=await pool.query('SELECT filename FROM public.schema_migrations ORDER BY filename');
  assert.equal(applied.rowCount,27);
  for(const [table,expected] of Object.entries(catalog.tables)){
    const columns=await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",[table]);
    assert.equal(columns.rowCount,expected.columnCount,'column_count_drift_'+table);
    const cons=await pool.query('SELECT conname FROM pg_constraint WHERE conrelid=($1::text)::regclass',['public.'+table]);
    const idx=await pool.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename=$1",[table]);
    const consSet=new Set(cons.rows.map(r=>r.conname)),idxSet=new Set(idx.rows.map(r=>r.indexname));
    for(const n of expected.constraints)assert(consSet.has(n),'missing_constraint_'+n);
    for(const n of expected.indexes)assert(idxSet.has(n),'missing_index_'+n);
  }
}
async function main(){
  const pool=new Pool({connectionString:url.toString(),max:4,connectionTimeoutMillis:5000});
  const f=restore?null:fixture();
  try{
    if(restore){
      await verify(pool,'mfw_admission_restore');
      assert.equal((await pool.query("SELECT id FROM public.authority_outbox WHERE event_key='mfw_isolated_evt_1'")).rowCount,1);
      assert.equal((await pool.query("SELECT consumer FROM public.authority_delivery_receipts WHERE event_key='mfw_isolated_evt_1' AND consumer='consumer_a'")).rowCount,1);
      console.log(JSON.stringify({test:'restore_27_candidate_migrations',status:'PASS',production:false}));
      return;
    }
    const count=await pool.query("SELECT count(*)::integer AS n FROM pg_catalog.pg_tables WHERE schemaname='public'");
    assert.equal(count.rows[0].n,0,'scratch_database_not_empty');
    const first=await runMigrations(pool,{dir:f.dir,lockPath:f.lockPath});
    assert.equal(first.applied.length,27);
    const second=await runMigrations(pool,{dir:f.dir,lockPath:f.lockPath});
    assert.equal(second.applied.length,0);
    await verify(pool,'mfw_admission_ci');
    const outbox=await pool.query("INSERT INTO public.authority_outbox(event_key,topic,payload) VALUES ('mfw_isolated_evt_1','partner.delivery',$1::jsonb) RETURNING id",[JSON.stringify({synthetic:true})]);
    const id=outbox.rows[0].id;
    await sqlState(pool,"INSERT INTO public.authority_outbox(event_key,topic) VALUES ('mfw_isolated_evt_1','again')",[], '23505');
    await sqlState(pool,"INSERT INTO public.authority_outbox(event_key,topic,status) VALUES ('bad_status','topic','invalid')",[],'23514');
    await sqlState(pool,"INSERT INTO public.authority_outbox(event_key,topic,attempts) VALUES ('bad_attempts','topic',-1)",[],'23514');
    await pool.query('INSERT INTO public.authority_delivery_receipts(outbox_id,event_key,topic,consumer,payload_digest) VALUES ($1,$2,$3,$4,$5)',
      [id,'mfw_isolated_evt_1','partner.delivery','consumer_a','digest']);
    await sqlState(pool,'INSERT INTO public.authority_delivery_receipts(outbox_id,event_key,topic,consumer,payload_digest) VALUES ($1,$2,$3,$4,$5)',
      [id,'mfw_isolated_evt_1','partner.delivery','consumer_b','digest'],'23505');
    await sqlState(pool,"INSERT INTO public.authority_delivery_receipts(outbox_id,event_key,topic,consumer,payload_digest) VALUES (gen_random_uuid(),'unknown','topic','consumer','digest')",[],'23503');
    assert.equal((await runMigrations(pool,{dir:f.dir,lockPath:f.lockPath})).applied.length,0);
    console.log(JSON.stringify({test:'pg17_scratch_candidate_replay',status:'PASS',count:27,fanout:'BLOCKED',original027Recovered:false,production:false}));
  }finally{
    await pool.end();
    if(f)fs.rmSync(f.root,{recursive:true,force:true});
  }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
