const assert=require('assert');
const {canonicalize,hashEvidence,readScope}=require('./admission-evidence');

const a={z:1,a:{y:2,x:[{b:2,a:1},3]}};
const b={a:{x:[{a:1,b:2},3],y:2},z:1};

assert.deepStrictEqual(canonicalize(a),canonicalize(b));
assert.strictEqual(hashEvidence(a),hashEvidence(b));

assert.strictEqual(readScope([]),'production');
assert.strictEqual(readScope(['--scope=production']),'production');
assert.strictEqual(readScope(['--scope=full']),'full');
assert.throws(()=>readScope(['--scope=unknown']),/invalid_scope_unknown/);

const source=require('fs').readFileSync(require('path').join(__dirname,'admission-evidence.js'),'utf8');
for(const required of [
  "schemaVersion:'mfw-admission-evidence-v1'",
  "expected_sha_missing",
  "migration_set_incomplete",
  "025_organisation_credential_revocations.sql",
  "deep_golden_path_failed",
  "operator_session_missing",
  "capital_chain_verification_failed",
  "projection.aggregateType!=='programme'",
  "projection.projectionRule!=='single_aggregate_type'",
  "evidenceHashSha256:hashEvidence(payload)"
]){
  assert(source.includes(required),'admission evidence contract missing: '+required);
}

assert(!source.includes('operatorSessionSupplied'));
assert(!source.includes('MFW_CAPITAL_OPERATOR_SESSION:'));

console.log(JSON.stringify({
  event:'mfw_admission_evidence_contract',
  status:'pass',
  schemaVersion:'mfw-admission-evidence-v1'
}));
