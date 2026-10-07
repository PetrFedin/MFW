const crypto=require('crypto');

const baseUrl=String(process.env.MFW_AUTHORITY_URL||'https://mfw-authority.onrender.com').replace(/\/$/,'');
const expectedSha=String(process.env.MFW_EXPECTED_SHA||'').trim();
const operatorSession=String(process.env.MFW_CAPITAL_OPERATOR_SESSION||'').trim();
const programmeKey=String(process.env.MFW_CAPITAL_PROGRAMME_KEY||'mfw_programme').trim();

function readScope(argv=process.argv.slice(2)){
  const raw=argv.find((x)=>String(x).startsWith('--scope='));
  const scope=raw?String(raw).split('=')[1]:'production';
  if(!['production','full'].includes(scope))throw new Error('invalid_scope_'+scope);
  return scope;
}

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

function hashEvidence(payload){
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(payload))).digest('hex');
}

async function fetchJson(pathname,options={}){
  const headers=Object.assign({'Cache-Control':'no-cache'},options.headers||{});
  const response=await fetch(baseUrl+pathname,{
    ...options,
    headers,
    signal:AbortSignal.timeout(20000)
  });
  const body=await response.json().catch(()=>({}));
  return {response,body};
}

function pushIf(errors,condition,code){if(condition)errors.push(code);}

function buildProductionEvidence(readyResult,healthResult,deepResult,errors){
  const ready=readyResult.body||{};
  const health=healthResult.body||{};
  const deep=deepResult.body||{};
  const schema=ready.databaseSchema||{};
  const reverify=health.reverification||{};
  const productionAdmission=health.productionAdmission||{};

  pushIf(errors,!expectedSha,'expected_sha_missing');
  pushIf(errors,readyResult.response.status!==200,'ready_http_'+readyResult.response.status);
  pushIf(errors,ready.status!=='ready'||ready.ready!==true,'production_not_ready');
  pushIf(errors,ready.dataMode!=='postgres','ready_data_mode_not_postgres');
  pushIf(errors,ready.requirePostgres!==true,'postgres_guard_not_enabled');
  pushIf(errors,ready.databaseConfigured!==true,'database_not_configured');
  pushIf(errors,ready.databaseSchemaReady!==true,'schema_not_ready');
  pushIf(errors,!!expectedSha&&ready.releaseSha!==expectedSha,'release_sha_mismatch');

  pushIf(errors,schema.ready!==true,'schema_reconciliation_not_ready');
  pushIf(errors,(schema.missingMigrations||[]).length!==0,'schema_missing_migrations');
  pushIf(errors,(schema.missingTables||[]).length!==0,'schema_missing_tables');
  pushIf(errors,(schema.missingColumns||[]).length!==0,'schema_missing_columns');
  pushIf(errors,(schema.contractErrors||[]).length!==0,'schema_contract_errors');
  pushIf(errors,!Array.isArray(schema.migrations)||schema.migrations.length<25,'migration_set_incomplete');

  pushIf(errors,healthResult.response.status!==200,'health_http_'+healthResult.response.status);
  pushIf(errors,health.dataMode!=='postgres','health_data_mode_not_postgres');
  pushIf(errors,productionAdmission.ready!==true,'health_production_admission_not_ready');
  pushIf(errors,!!expectedSha&&health.releaseSha!==expectedSha,'health_release_sha_mismatch');
  pushIf(errors,reverify.active!==true,'social_reverification_scheduler_inactive');
  pushIf(errors,reverify.strategy!=='in_process_interval_with_startup_catchup','social_reverification_strategy_unexpected');
  pushIf(errors,reverify.externalCronRequired!==false,'external_cron_dependency_present');

  pushIf(errors,deepResult.response.status!==200,'deep_health_http_'+deepResult.response.status);
  pushIf(errors,deep.status!=='pass'||deep.ok!==true,'deep_golden_path_failed');
  pushIf(errors,deep.dataMode!=='postgres','deep_data_mode_not_postgres');
  pushIf(errors,!(deep.tests&&deep.tests.roleGoldenPaths&&deep.tests.roleGoldenPaths.all===true),'role_golden_paths_failed');
  pushIf(errors,!(deep.tests&&deep.tests.acceleratedLoyaltyGoldenPath&&deep.tests.acceleratedLoyaltyGoldenPath.ok===true),'loyalty_golden_path_failed');
  pushIf(errors,!(deep.tests&&deep.tests.acceleratedLoyaltyGoldenPath&&deep.tests.acceleratedLoyaltyGoldenPath.dataMode==='postgres'),'loyalty_golden_path_not_postgres');

  return {
    readyHttp:readyResult.response.status,
    healthHttp:healthResult.response.status,
    deepHttp:deepResult.response.status,
    releaseSha:ready.releaseSha||health.releaseSha||null,
    dataMode:ready.dataMode||null,
    requirePostgres:ready.requirePostgres===true,
    databaseConfigured:ready.databaseConfigured===true,
    databaseSchemaReady:ready.databaseSchemaReady===true,
    migrationsApplied:Array.isArray(schema.migrations)?schema.migrations.length:0,
    migrationFloor025:Array.isArray(schema.migrations)&&schema.migrations.includes('025_organisation_credential_revocations.sql'),
    schemaContract:{
      ready:schema.ready===true,
      missingMigrations:schema.missingMigrations||[],
      missingTables:schema.missingTables||[],
      missingColumns:schema.missingColumns||[],
      contractErrors:schema.contractErrors||[]
    },
    reverification:{
      active:reverify.active===true,
      strategy:reverify.strategy||null,
      externalCronRequired:reverify.externalCronRequired
    },
    deepGoldenPath:{
      ok:deep.ok===true,
      dataMode:deep.dataMode||null,
      rolesAll:!!(deep.tests&&deep.tests.roleGoldenPaths&&deep.tests.roleGoldenPaths.all===true),
      loyaltyOk:!!(deep.tests&&deep.tests.acceleratedLoyaltyGoldenPath&&deep.tests.acceleratedLoyaltyGoldenPath.ok===true),
      loyaltyDataMode:deep.tests&&deep.tests.acceleratedLoyaltyGoldenPath
        ? deep.tests.acceleratedLoyaltyGoldenPath.dataMode||null
        : null
    },
    blockers:ready.blockers||[]
  };
}

async function collectCapitalEvidence(errors){
  if(!operatorSession){
    errors.push('operator_session_missing');
    return {status:'blocked',reason:'operator_session_missing'};
  }
  const auth={Authorization:'Bearer '+operatorSession};
  const [ledgerResult,projectionResult,verifyResult]=await Promise.all([
    fetchJson('/v1/capital/ledger?programmeKey='+encodeURIComponent(programmeKey)+'&limit=5',{headers:auth}),
    fetchJson('/v1/capital/projection?programmeKey='+encodeURIComponent(programmeKey)+'&aggregateType=programme',{headers:auth}),
    fetchJson('/v1/capital/verify?programmeKey='+encodeURIComponent(programmeKey),{headers:auth})
  ]);

  pushIf(errors,ledgerResult.response.status!==200,'capital_ledger_http_'+ledgerResult.response.status);
  pushIf(errors,projectionResult.response.status!==200,'capital_projection_http_'+projectionResult.response.status);
  pushIf(errors,verifyResult.response.status!==200,'capital_verify_http_'+verifyResult.response.status);

  const ledgerBody=ledgerResult.body||{};
  const projectionBody=projectionResult.body||{};
  const verifyBody=verifyResult.body||{};
  const projection=projectionBody.data||{};
  const verification=verifyBody.data||{};

  pushIf(errors,ledgerBody.authority!=='capital_ledger','capital_ledger_authority_mismatch');
  pushIf(errors,projectionBody.authority!=='capital_ledger','capital_projection_authority_mismatch');
  pushIf(errors,verifyBody.authority!=='capital_ledger','capital_verify_authority_mismatch');
  pushIf(errors,projection.aggregateType!=='programme','capital_projection_grain_mismatch');
  pushIf(errors,projection.projectionRule!=='single_aggregate_type','capital_projection_rule_mismatch');
  pushIf(errors,!projection.projection||typeof projection.projection!=='object','capital_projection_missing');
  pushIf(errors,verification.ok!==true,'capital_chain_verification_failed');
  pushIf(errors,verification.programmeKey!==programmeKey,'capital_programme_key_mismatch');

  return {
    status:'checked',
    programmeKey,
    ledger:{
      http:ledgerResult.response.status,
      authority:ledgerBody.authority||null,
      rows:Array.isArray(ledgerBody.data)?ledgerBody.data.length:null
    },
    projection:{
      http:projectionResult.response.status,
      authority:projectionBody.authority||null,
      aggregateType:projection.aggregateType||null,
      projectionRule:projection.projectionRule||null,
      events:projection.events==null?null:projection.events,
      totals:projection.projection||null
    },
    verification:{
      http:verifyResult.response.status,
      authority:verifyBody.authority||null,
      ok:verification.ok===true,
      programmeKey:verification.programmeKey||null,
      aggregates:verification.aggregates==null?null:verification.aggregates,
      events:verification.events==null?null:verification.events,
      failures:verification.failures||[]
    }
  };
}

async function collectAdmissionEvidence(scope=readScope()){
  const errors=[];
  const [readyResult,healthResult,deepResult]=await Promise.all([
    fetchJson('/ready'),
    fetchJson('/health'),
    fetchJson('/health/deep')
  ]);
  const production=buildProductionEvidence(readyResult,healthResult,deepResult,errors);
  const capital=scope==='full'
    ? await collectCapitalEvidence(errors)
    : {status:'not_requested'};

  const payload={
    schemaVersion:'mfw-admission-evidence-v1',
    authority:baseUrl,
    scope,
    expectedSha:expectedSha||null,
    releaseSha:production.releaseSha||null,
    production,
    capital,
    errors
  };

  return {
    ...payload,
    evidenceHashSha256:hashEvidence(payload),
    generatedAt:new Date().toISOString(),
    ok:errors.length===0
  };
}

async function main(){
  const result=await collectAdmissionEvidence();
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exit(1);
}

if(require.main===module){
  main().catch((err)=>{
    console.error(JSON.stringify({ok:false,error:String(err&&err.message||err)}));
    process.exit(1);
  });
}

module.exports={canonicalize,hashEvidence,readScope,collectAdmissionEvidence};
