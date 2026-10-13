'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Pool } = require('pg');
const { runMigrations } = require('../migration-runner');
const { gitBlobSha } = require('../migration-preflight');

// Fail closed against accidental execution against a hosted database.
const rawUrl=process.env.DATABASE_URL;
const mode=process.argv[2];
if(process.env.MFW_DISPOSABLE_PG17_TEST!=='yes'||!rawUrl||!['replay','verify-restore'].includes(mode)){
  throw Error('scratch_only_explicit_mode_required');
}
const target=new URL(rawUrl);
if(!['127.0.0.1','localhost'].includes(target.hostname)||target.port!=='5432'||
   target.username!=='mfw_ci'||target.password!=='mfw_ci_disposable_only'||
   (mode==='replay'&&target.pathname!=='/mfw_ci')||
   (mode==='verify-restore'&&target.pathname!=='/mfw_ci_restore')){
  throw Error('refuse_nonisolated_postgres');
}
const names=[
  ...fs.readdirSync(path.join(__dirname,'..','migrations')).filter(name=>name.endsWith('.sql')).sort(),
  '026_postgres_conflict_constraints.sql','027_outbox_pg_boss_bridge.sql'
];
assert.equal(names.length,27,'exact 001–027 candidate chain required');
const reference=JSON.parse(fs.readFileSync(path.join(__dirname,'027-outbox-observation.json'),'utf8'));
assert.equal(reference.original027Recovered,false);
assert.equal(reference.productionAdmitted,false);
assert.equal(reference.candidateEquivalenceVerified,false);

async function checkCatalog(pool){
 const history=(await pool.query('SELECT filename FROM public.schema_migrations ORDER BY filename')).rows.map(x=>x.filename);
 assert.deepEqual(history,names);
 const counts=await pool.query("SELECT table_name,count(*)::int n FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('authority_outbox','authority_delivery_receipts') GROUP BY table_name ORDER BY table_name");
 assert.deepEqual(counts.rows,[{table_name:'authority_delivery_receipts',n:9},{table_name:'authority_outbox',n:14}]);
 const indexes=(await pool.query("SELECT tablename,indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('authority_outbox','authority_delivery_receipts')")).rows;
 const constraints=(await pool.query("SELECT conrelid::regclass::text AS table_name,conname FROM pg_constraint WHERE conrelid IN ('public.authority_outbox'::regclass,'public.authority_delivery_receipts'::regclass)")).rows;
 for(const [name,obj] of Object.entries(reference.tables)){
  for(const item of obj.indexes)assert(indexes.some(x=>x.tablename===name&&x.indexname===item),'missing_index:'+item);
  for(const item of obj.constraints)assert(constraints.some(x=>x.table_name===name&&x.conname===item),'missing_constraint:'+item);
 }
 return (await pool.query("SELECT id,event_key,status,attempts FROM public.authority_outbox WHERE event_key='scratch-only-event-01'")).rows;
}
async function reject(pool,sql,params,code){
 try{
  await pool.query(sql,params);
  assert.fail('expected_postgres_constraint:'+code);
 }catch(e){
  if(e.code==='ERR_ASSERTION')throw e;
  assert.equal(e.code,code,'SQLSTATE mismatch: '+String(e.message));
 }
}
(async()=>{
 const pool=new Pool({connectionString:rawUrl,max:3,connectionTimeoutMillis:5000});
 try{
  const version=Number((await pool.query("SELECT current_setting('server_version_num') AS v")).rows[0].v);
  assert(version>=170000&&version<180000,'PostgreSQL 17 only');
  if(mode==='replay'){
   const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mfw-scratch-pg17-'));
   try{
    const dir=path.join(tmp,'migrations');fs.mkdirSync(dir);
    const hashMap={};
    for(const name of names){
     const src=Number(name.slice(0,3))<=25?path.join(__dirname,'..','migrations',name):path.join(__dirname,name);
     const bytes=fs.readFileSync(src);fs.writeFileSync(path.join(dir,name),bytes);
     hashMap[name]=gitBlobSha(bytes);
    }
    const lockPath=path.join(tmp,'migration-lock.json');
    fs.writeFileSync(lockPath,JSON.stringify({format:'mfw-git-blob-lock-v1',files:hashMap}));
    assert.equal((await runMigrations(pool,{dir,lockPath})).applied.length,27);
    assert.deepEqual((await runMigrations(pool,{dir,lockPath})).applied,[]);
    await checkCatalog(pool);
   }finally{fs.rmSync(tmp,{recursive:true,force:true})}
   const created=await pool.query("INSERT INTO public.authority_outbox(event_key,topic,payload) VALUES ('scratch-only-event-01','scratch-probe','{}'::jsonb) RETURNING id");
   const id=created.rows[0].id;
   await pool.query("INSERT INTO public.authority_delivery_receipts(outbox_id,event_key,topic,consumer,payload_digest) VALUES($1,'scratch-only-event-01','scratch-probe','consumer-a','digest-a')",[id]);
   await reject(pool,"INSERT INTO public.authority_delivery_receipts(outbox_id,event_key,topic,consumer,payload_digest) VALUES($1,'scratch-only-event-01','scratch-probe','consumer-b','digest-b')",[id],'23505');
   await reject(pool,"INSERT INTO public.authority_outbox(event_key,topic) VALUES ('scratch-only-event-01','scratch-probe')",[],'23505');
   await reject(pool,"INSERT INTO public.authority_outbox(event_key,topic,attempts) VALUES ('scratch-negative-attempts','scratch-probe',-1)",[],'23514');
   await reject(pool,"INSERT INTO public.authority_outbox(event_key,topic,status) VALUES ('scratch-invalid-status','scratch-probe','unknown')",[],'23514');
   await reject(pool,"DELETE FROM public.authority_outbox WHERE id=$1",[id],'23503');
   const rows=await checkCatalog(pool);assert.equal(rows.length,1);
   assert.equal(rows[0].status,'pending');assert.equal(rows[0].attempts,0);
   console.log(JSON.stringify({event:'scratch_pg17_replay',status:'PASS',migrations:27,expectedFanoutBlocker:true,productionAdmitted:false}));
  }else{
   const rows=await checkCatalog(pool);assert.equal(rows.length,1,'backup/restore lost scratch event');
   const receipts=(await pool.query("SELECT consumer FROM public.authority_delivery_receipts WHERE event_key='scratch-only-event-01'")).rows;
   assert.equal(receipts.length,1);assert.equal(receipts[0].consumer,'consumer-a');
   console.log(JSON.stringify({event:'scratch_pg17_restore',status:'PASS',migrations:27,productionAdmitted:false}));
  }
 }finally{await pool.end()}
})().catch(e=>{console.error(e);process.exitCode=1});
