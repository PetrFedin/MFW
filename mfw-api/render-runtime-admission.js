const fs=require('fs');
const crypto=require('crypto');

const EXPECTED={
  service:{
    id:'srv-daug20id0e5s73fjtsr0',
    name:'mfw-authority',
    branch:'main',
    plan:'free',
    region:'frankfurt',
    runtime:'node',
    healthCheckPath:'/ready',
    startCommand:'cd mfw-api && node server-v2.js'
  },
  postgres:{
    id:'dpg-daugci8jo6nc738akc10-a',
    name:'mfw-postgres',
    plan:'free',
    region:'frankfurt',
    version:'17',
    status:'available'
  }
};

function canonicalize(value){
  if(Array.isArray(value))return value.map(canonicalize);
  if(value&&typeof value==='object'){
    return Object.keys(value).sort().reduce((out,key)=>{
      out[key]=canonicalize(value[key]);
      return out;
    },{});
  }
  return value;
}
function sha256(value){
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}
function arg(name){
  const prefix='--'+name+'=';
  const found=process.argv.slice(2).find(x=>String(x).startsWith(prefix));
  return found?String(found).slice(prefix.length):'';
}
function load(path,label){
  if(!path)throw new Error(label+'_path_missing');
  return JSON.parse(fs.readFileSync(path,'utf8'));
}
function normalizeService(raw){
  const d=raw.service||raw;
  const details=d.serviceDetails||{};
  const envDetails=details.envSpecificDetails||{};
  return {
    id:d.id||null,
    name:d.name||null,
    branch:d.branch||null,
    plan:d.plan||details.plan||null,
    region:d.region||details.region||null,
    runtime:d.runtime||details.runtime||details.env||null,
    healthCheckPath:d.healthCheckPath==null
      ? (details.healthCheckPath==null?null:details.healthCheckPath)
      : d.healthCheckPath,
    startCommand:d.startCommand||envDetails.startCommand||null,
    autoDeploy:d.autoDeploy||null,
    repo:d.repo||null
  };
}
function normalizePostgres(raw){
  const d=raw.postgres||raw;
  return {
    id:d.id||null,
    name:d.name||null,
    plan:d.plan||null,
    region:d.region||null,
    version:d.version==null?null:String(d.version),
    status:d.status||null,
    ipAllowList:Array.isArray(d.ipAllowList)?d.ipAllowList:[]
  };
}
function normalizeDeploy(raw){
  const d=raw.deploy||raw;
  const commit=d.commit||{};
  return {
    id:d.id||null,
    status:d.status||null,
    commitId:commit.id||d.commitId||null,
    branch:commit.branch||d.branch||null
  };
}
function normalizeAdmission(raw){
  const d=raw;
  return {
    schemaVersion:d.schemaVersion||null,
    ok:d.ok===true,
    expectedSha:d.expectedSha||null,
    releaseSha:d.releaseSha||null,
    production:d.production||null,
    errors:Array.isArray(d.errors)?d.errors:[]
  };
}
function verify({service,postgres,deploy,admission,expectedSha}){
  const errors=[];
  function eq(actual,expected,code){if(actual!==expected)errors.push(code);}
  const s=normalizeService(service);
  const p=normalizePostgres(postgres);
  const d=normalizeDeploy(deploy);
  const a=normalizeAdmission(admission);

  eq(s.id,EXPECTED.service.id,'service_id_mismatch');
  eq(s.name,EXPECTED.service.name,'service_name_mismatch');
  eq(s.branch,EXPECTED.service.branch,'service_branch_mismatch');
  eq(s.plan,EXPECTED.service.plan,'service_plan_mismatch');
  eq(s.region,EXPECTED.service.region,'service_region_mismatch');
  eq(s.runtime,EXPECTED.service.runtime,'service_runtime_mismatch');
  eq(s.healthCheckPath,EXPECTED.service.healthCheckPath,'health_check_path_mismatch');
  eq(s.startCommand,EXPECTED.service.startCommand,'start_command_mismatch');

  eq(p.id,EXPECTED.postgres.id,'postgres_id_mismatch');
  eq(p.name,EXPECTED.postgres.name,'postgres_name_mismatch');
  eq(p.plan,EXPECTED.postgres.plan,'postgres_plan_mismatch');
  eq(p.region,EXPECTED.postgres.region,'postgres_region_mismatch');
  eq(p.version,EXPECTED.postgres.version,'postgres_version_mismatch');
  eq(p.status,EXPECTED.postgres.status,'postgres_not_available');
  if(p.ipAllowList.length!==0)errors.push('postgres_external_allowlist_not_empty');

  if(!expectedSha)errors.push('expected_sha_missing');
  eq(d.status,'live','deploy_not_live');
  if(expectedSha)eq(d.commitId,expectedSha,'deploy_sha_mismatch');
  // Render deploy API may omit commit.branch; the separately verified service branch remains authoritative.
  if(d.branch!==null)eq(d.branch,'main','deploy_branch_mismatch');

  eq(a.schemaVersion,'mfw-admission-evidence-v1','admission_schema_mismatch');
  if(a.ok!==true)errors.push('admission_not_ok');
  if(expectedSha){
    eq(a.expectedSha,expectedSha,'admission_expected_sha_mismatch');
    eq(a.releaseSha,expectedSha,'admission_release_sha_mismatch');
  }
  if(a.errors.length!==0)errors.push('admission_contains_errors');
  if(!(a.production&&a.production.dataMode==='postgres'))errors.push('admission_not_postgres');
  if(!(a.production&&a.production.requirePostgres===true))errors.push('postgres_guard_not_enabled');
  if(!(a.production&&a.production.databaseConfigured===true))errors.push('database_not_configured');
  if(!(a.production&&a.production.databaseSchemaReady===true))errors.push('database_schema_not_ready');
  if(!(a.production&&a.production.schemaContract&&a.production.schemaContract.ready===true))errors.push('schema_contract_not_ready');
  if(!(a.production&&a.production.deepGoldenPath&&a.production.deepGoldenPath.ok===true))errors.push('golden_paths_not_ready');

  const payload={
    schemaVersion:'mfw-render-runtime-admission-v1',
    expectedSha:expectedSha||null,
    service:s,
    postgres:p,
    deploy:d,
    admission:a,
    errors
  };
  return {
    ...payload,
    ok:errors.length===0,
    receiptSha256:sha256(payload)
  };
}

function main(){
  const service=load(arg('service'),'service');
  const postgres=load(arg('postgres'),'postgres');
  const deploy=load(arg('deploy'),'deploy');
  const admission=load(arg('admission'),'admission');
  const expectedSha=String(arg('expected-sha')||process.env.MFW_EXPECTED_SHA||'').trim();
  const result=verify({service,postgres,deploy,admission,expectedSha});
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exit(1);
}
if(require.main===module){
  try{main();}catch(err){
    console.error(JSON.stringify({ok:false,error:String(err&&err.message||err)}));
    process.exit(1);
  }
}
module.exports={EXPECTED,canonicalize,sha256,normalizeService,normalizePostgres,normalizeDeploy,normalizeAdmission,verify};
