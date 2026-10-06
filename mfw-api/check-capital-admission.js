const baseUrl=String(process.env.MFW_AUTHORITY_URL||'https://mfw-authority.onrender.com').replace(/\/$/,'');
const expectedSha=String(process.env.MFW_EXPECTED_SHA||'').trim();
const operatorSession=String(process.env.MFW_CAPITAL_OPERATOR_SESSION||'').trim();
const programmeKey=String(process.env.MFW_CAPITAL_PROGRAMME_KEY||'mfw_programme').trim();

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

async function main(){
  const errors=[];
  const readyResult=await fetchJson('/ready');
  const ready=readyResult.body||{};
  const schema=ready.databaseSchema||{};

  pushIf(errors,readyResult.response.status!==200,'ready_http_'+readyResult.response.status);
  pushIf(errors,ready.ready!==true||ready.status!=='ready','production_not_ready');
  pushIf(errors,ready.dataMode!=='postgres','data_mode_not_postgres');
  pushIf(errors,ready.databaseSchemaReady!==true,'schema_not_ready');
  pushIf(errors,expectedSha&&ready.releaseSha!==expectedSha,'release_sha_mismatch');
  pushIf(errors,!Array.isArray(schema.migrations)||!schema.migrations.includes('023_capital_authority.sql'),'capital_migration_missing');
  pushIf(errors,!Array.isArray(schema.migrations)||!schema.migrations.includes('024_capital_operator_admission.sql'),'operator_migration_missing');
  pushIf(errors,!operatorSession,'operator_session_missing');

  let ledgerResult=null,projectionResult=null,verifyResult=null;
  if(operatorSession){
    const auth={Authorization:'Bearer '+operatorSession};
    [ledgerResult,projectionResult,verifyResult]=await Promise.all([
      fetchJson('/v1/capital/ledger?programmeKey='+encodeURIComponent(programmeKey)+'&limit=5',{headers:auth}),
      fetchJson('/v1/capital/projection?programmeKey='+encodeURIComponent(programmeKey),{headers:auth}),
      fetchJson('/v1/capital/verify?programmeKey='+encodeURIComponent(programmeKey),{headers:auth})
    ]);

    pushIf(errors,ledgerResult.response.status!==200,'capital_ledger_http_'+ledgerResult.response.status);
    pushIf(errors,projectionResult.response.status!==200,'capital_projection_http_'+projectionResult.response.status);
    pushIf(errors,verifyResult.response.status!==200,'capital_verify_http_'+verifyResult.response.status);

    pushIf(errors,ledgerResult.body&&ledgerResult.body.authority!=='capital_ledger','capital_ledger_authority_mismatch');
    pushIf(errors,projectionResult.body&&projectionResult.body.authority!=='capital_ledger','capital_projection_authority_mismatch');
    pushIf(errors,verifyResult.body&&verifyResult.body.authority!=='capital_ledger','capital_verify_authority_mismatch');

    const verification=verifyResult.body&&verifyResult.body.data||{};
    pushIf(errors,verification.ok!==true,'capital_chain_verification_failed');
    pushIf(errors,verification.programmeKey!==programmeKey,'capital_programme_key_mismatch');
  }

  const result={
    ok:errors.length===0,
    authority:baseUrl,
    expectedSha:expectedSha||null,
    releaseSha:ready.releaseSha||null,
    programmeKey,
    postgresReady:ready.dataMode==='postgres'&&ready.databaseSchemaReady===true,
    migrations:{
      capital:Array.isArray(schema.migrations)&&schema.migrations.includes('023_capital_authority.sql'),
      operatorAdmission:Array.isArray(schema.migrations)&&schema.migrations.includes('024_capital_operator_admission.sql')
    },
    operatorSessionSupplied:!!operatorSession,
    ledger:ledgerResult?{status:ledgerResult.response.status,rows:Array.isArray(ledgerResult.body&&ledgerResult.body.data)?ledgerResult.body.data.length:null}:null,
    projection:projectionResult?{status:projectionResult.response.status,events:projectionResult.body&&projectionResult.body.data&&projectionResult.body.data.events}:null,
    verification:verifyResult?verifyResult.body&&verifyResult.body.data:null,
    errors
  };

  console.log(JSON.stringify(result,null,2));
  if(errors.length)process.exit(1);
}
main().catch(err=>{
  console.error(JSON.stringify({ok:false,error:String(err&&err.message||err)}));
  process.exit(1);
});
