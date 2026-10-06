const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {spawn}=require('child_process');

const serverPath=path.join(__dirname,'server-v2.js');
const serverSource=fs.readFileSync(serverPath,'utf8');
const migrationPath=path.join(__dirname,'migrations','022_capital_authority.sql');
const migration=fs.readFileSync(migrationPath,'utf8');

for(const required of [
  'capital_ledger_events',
  'trg_capital_ledger_immutable',
  'reject_capital_ledger_mutation',
  'idempotency_key text NOT NULL UNIQUE',
  'previous_event_hash',
  'event_hash text NOT NULL UNIQUE',
  'BEFORE UPDATE OR DELETE OR TRUNCATE'
]){
  assert(migration.includes(required),'missing migration contract: '+required);
}
for(const required of [
  "p==='/v1/capital/events'",
  "p==='/v1/capital/ledger'",
  "p==='/v1/capital/projection'",
  "p==='/v1/capital/verify'",
  'pg_advisory_xact_lock',
  'seenAfterLock',
  'capitalHash',
  'verifyCapitalChainRows',
  'actor.demo===true',
  "capital_authority_role_required",
  "persistence:'postgres_only'"
]){
  assert(serverSource.includes(required),'missing server contract: '+required);
}

function cleanEnv(extra={}){
  const env={...process.env,...extra};
  delete env.DATABASE_URL;
  return env;
}
function collect(child){
  let out='';
  child.stdout.on('data',d=>{out+=d.toString();});
  child.stderr.on('data',d=>{out+=d.toString();});
  return ()=>out;
}
async function waitForJson(url,options,timeoutMs=20000){
  const deadline=Date.now()+timeoutMs;
  let last;
  while(Date.now()<deadline){
    try{
      const r=await fetch(url,options);
      const body=await r.json();
      return {r,body};
    }catch(err){
      last=err;
      await new Promise(resolve=>setTimeout(resolve,150));
    }
  }
  throw last||new Error('timeout:'+url);
}
async function stop(child){
  if(child.exitCode!==null)return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise(resolve=>child.once('exit',resolve)),
    new Promise(resolve=>setTimeout(resolve,2000))
  ]);
  if(child.exitCode===null)child.kill('SIGKILL');
}

(async()=>{
  const port=19122;
  const child=spawn(process.execPath,[serverPath],{
    cwd:__dirname,
    env:cleanEnv({PORT:String(port),MFW_REQUIRE_POSTGRES:'false',RENDER_GIT_COMMIT:'capital-contract-memory'}),
    stdio:['ignore','pipe','pipe']
  });
  const output=collect(child);
  try{
    await waitForJson('http://127.0.0.1:'+port+'/health');
    for(const request of [
      {path:'/v1/capital/events',options:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}},
      {path:'/v1/capital/ledger',options:{method:'GET'}},
      {path:'/v1/capital/projection',options:{method:'GET'}},
      {path:'/v1/capital/verify',options:{method:'GET'}}
    ]){
      const {r,body}=await waitForJson('http://127.0.0.1:'+port+request.path,request.options);
      assert.strictEqual(r.status,503,request.path+' must fail closed without postgres');
      assert.strictEqual(body.error,'postgres_required');
      assert.strictEqual(body.persistence,'postgres_only');
    }
  }catch(err){
    err.message+='\nserver output:\n'+output();
    throw err;
  }finally{
    await stop(child);
  }
  console.log(JSON.stringify({event:'capital_authority_contract',status:'pass'}));
})().catch(err=>{console.error(err);process.exit(1);});
