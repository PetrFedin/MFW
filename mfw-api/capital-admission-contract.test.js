const assert=require('assert');
const fs=require('fs');
const path=require('path');

const checker=fs.readFileSync(path.join(__dirname,'check-capital-admission.js'),'utf8');

for(const required of [
  "ready.requirePostgres!==true",
  "ready.databaseConfigured!==true",
  "schema.ready!==true",
  "schema_missing_migrations",
  "schema_missing_tables",
  "schema_missing_columns",
  "schema_contract_errors",
  "schema.migrations.length<25",
  "023_capital_authority.sql",
  "024_capital_operator_admission.sql",
  "025_organisation_credential_revocations.sql",
  "migration_floor_025_missing",
  "projectionData.aggregateType!=='programme'",
  "projectionData.projectionRule!=='single_aggregate_type'",
  "verification.ok!==true"
]){
  assert(checker.includes(required),'capital admission checker missing contract: '+required);
}

console.log(JSON.stringify({
  event:'capital_admission_contract',
  status:'pass',
  productionMigrationFloor:25
}));
