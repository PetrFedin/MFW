const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {spawn}=require('child_process');

const serverPath=path.join(__dirname,'server-v2.js');
const serverSource=fs.readFileSync(serverPath,'utf8');
const migrationPath=path.join(__dirname,'migrations','023_capital_authority.sql');
const migration=fs.readFileSync(migrationPath,'utf8');
const operatorMigration=fs.readFileSync(path.join(__dirname,'migrations','024_capital_operator_admission.sql'),'utf8');
const domainSource=fs.readFileSync(path.join(__dirname,'capital-authority.js'),'utf8');

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
  'capital_operator_grants',
  "CHECK (operator_role IN ('Organizer','Staff'))",
  "CHECK (status IN ('active','suspended','revoked'))",
  'approved_by',
  'expires_at',
  'evidence_refs'
]){
  assert(operatorMigration.includes(required),'missing operator migration contract: '+required);
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
  'validateCapitalTransition',
  'actor.demo===true',
  "capital_authority_role_required",
  "persistence:'postgres_only'",
  "ADMIN_TOKEN_CONFIGURED"
]){
  assert(serverSource.includes(required),'missing server contract: '+required);
}
for(const required of [
  'capital_approval_exceeds_requested',
  'capital_commitment_exceeds_approved',
  'capital_release_exceeds_unspent_commitment',
  'capital_spend_exceeds_net_commitment',
  'capital_measurement_requires_spend',
  'capital_decision_requires_measurement',
  'capital_evidence_ref_required',
  'event_hash_mismatch',
  'previous_hash_mismatch'
]){
  assert(domainSource.includes(required),'missing domain contract: '+required);
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
      {path:'/v1/capital/verify',options:{method:'GET'}},
      {path:'/v1/admin/capital/operators',options:{method:'GET'}},
      {path:'/v1/admin/capital/operator-session',options:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:'00000000-0000-0000-0000-000000000000'})}}
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
