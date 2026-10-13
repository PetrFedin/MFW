'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Pool}=require('pg');
const {runMigrations}=require('../migration-runner');
const {gitBlobSha}=require('../migration-preflight');
const url=new URL(process.env.DATABASE_URL||'');
assert.equal(process.env.CI,'true');
assert.equal(process.env.MFW_ISOLATED_PG_CI,'true');
assert.equal(url.hostname,'127.0.0.1');
assert.equal(url.pathname,'/mfw_scratch_ci');
assert.equal(url.username,'mfw_ci');
assert.equal(url.port,'5432');

async function main(){
  const base=new Pool({connectionString:url.toString()});
  let candidate=null,dir=null;
  try {
    assert.equal((await runMigrations(base)).applied.length,25);
    assert.equal((await runMigrations(base)).applied.length,0);
    const baseline=await base.query('SELECT COUNT(*)::int AS n FROM public.schema_migrations');
    assert.equal(baseline.rows[0].n,25);
    await base.query('CREATE DATABASE mfw_candidate_ci');
    const candidateUrl=new URL(url.toString());
    candidateUrl.pathname='/mfw_candidate_ci';
    candidate=new Pool({connectionString:candidateUrl.toString()});
    dir=fs.mkdtempSync(path.join(os.tmpdir(),'mfw-isolated-sql-'));
    const origin=path.join(__dirname,'..','migrations');
    const originals=fs.readdirSync(origin).filter(x=>x.endsWith('.sql'));
    assert.equal(originals.length,25);
    originals.forEach(name=>fs.copyFileSync(path.join(origin,name),path.join(dir,name)));
    for(const name of ['026_postgres_conflict_constraints.sql','027_outbox_pg_boss_bridge.sql'])
      fs.copyFileSync(path.join(__dirname,name),path.join(dir,name));
    const all=fs.readdirSync(dir).filter(x=>x.endsWith('.sql')).sort();
    assert.equal(all.length,27);
    const files={};
    all.forEach(name=>{files[name]=gitBlobSha(fs.readFileSync(path.join(dir,name)));});
    const lockPath=path.join(dir,'scratch-only-blob-lock.json');
    fs.writeFileSync(lockPath,JSON.stringify({format:'mfw-git-blob-lock-v1',files}));
    const opts={dir,lockPath};
    assert.equal((await runMigrations(candidate,opts)).applied.length,27);
    assert.equal((await runMigrations(candidate,opts)).applied.length,0);
    const observation=JSON.parse(fs.readFileSync(path.join(__dirname,'027-outbox-observation.json'),'utf8'));
    assert.equal(observation.original027Recovered,false);
    for(const [table,expected] of Object.entries(observation.tables)){
      const cols=await candidate.query("SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",[table]);
      assert.equal(cols.rows[0].n,expected.columnCount,table+' columns');
      const query=await candidate.query('SELECT conname FROM pg_constraint WHERE conrelid=$1::regclass',['public.'+table]);
      const constraints=new Set(query.rows.map(row=>row.conname));
      expected.constraints.forEach(name=>assert(constraints.has(name),'missing constraint '+name));
      const idx=await candidate.query("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename=$1",[table]);
      const indexes=new Set(idx.rows.map(row=>row.indexname));
      expected.indexes.forEach(name=>assert(indexes.has(name),'missing index '+name));
    }
    const event=await candidate.query('INSERT INTO public.authority_outbox(event_key,topic,payload) VALUES($1,$2,$3::jsonb) RETURNING id',
      ['ci:restore-test','mfw.ci',JSON.stringify({synthetic:true})]);
    const id=event.rows[0].id;
    const receiptSql='INSERT INTO public.authority_delivery_receipts(outbox_id,event_key,topic,consumer,payload_digest) VALUES($1,$2,$3,$4,$5)';
    await candidate.query(receiptSql,[id,'ci:restore-test','mfw.ci','consumer_A','digest_ci']);
    let conflict;
    try{await candidate.query(receiptSql,[id,'ci:restore-test','mfw.ci','consumer_B','digest_ci']);}
    catch(error){conflict=error;}
    assert(conflict,'second consumer must be rejected by currently observed constraints');
    assert.equal(conflict.code,'23505');
    assert.equal(conflict.constraint,'authority_delivery_receipts_event_key_key');
    console.log(JSON.stringify({gate:'scratch_pg17_replay',result:'pass',base:25,candidate:27,
      idempotent:true,multiConsumer:'blocked',source:'reconstructed_not_original',
      productionAdmitted:false,backupRestore:'not_yet_tested'}));
  } finally{
    if(candidate)await candidate.end();
    await base.end();
    if(dir)fs.rmSync(dir,{recursive:true,force:true});
  }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
