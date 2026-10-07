const assert=require('assert');
const {
  EXPECTED,canonicalize,sha256,verify
}=require('./render-runtime-admission');

const expectedSha='abc123';
const service={
  id:EXPECTED.service.id,
  name:EXPECTED.service.name,
  branch:'main',
  plan:'free',
  region:'frankfurt',
  runtime:'node',
  healthCheckPath:'/ready',
  startCommand:'cd mfw-api && node server-v2.js',
  autoDeploy:'yes',
  repo:'https://github.com/PetrFedin/MFW'
};
const postgres={
  id:EXPECTED.postgres.id,
  name:EXPECTED.postgres.name,
  plan:'free',
  region:'frankfurt',
  version:17,
  status:'available',
  ipAllowList:[]
};
const deploy={
  id:'dep-test',
  status:'live',
  commit:{id:expectedSha,branch:'main'}
};
const admission={
  schemaVersion:'mfw-admission-evidence-v1',
  ok:true,
  expectedSha,
  releaseSha:expectedSha,
  errors:[],
  production:{
    dataMode:'postgres',
    requirePostgres:true,
    databaseConfigured:true,
    databaseSchemaReady:true,
    schemaContract:{ready:true},
    deepGoldenPath:{ok:true}
  }
};

const pass=verify({service,postgres,deploy,admission,expectedSha});
assert.strictEqual(pass.ok,true);
assert.deepStrictEqual(pass.errors,[]);
assert.strictEqual(pass.schemaVersion,'mfw-render-runtime-admission-v1');
assert.strictEqual(typeof pass.receiptSha256,'string');
assert.strictEqual(pass.receiptSha256.length,64);


const renderMcpService={
  id:EXPECTED.service.id,
  name:EXPECTED.service.name,
  branch:'main',
  autoDeploy:'yes',
  repo:'https://github.com/PetrFedin/MFW',
  serviceDetails:{
    plan:'free',
    region:'frankfurt',
    runtime:'node',
    healthCheckPath:'/ready',
    envSpecificDetails:{startCommand:'cd mfw-api && node server-v2.js'}
  }
};
const nestedShape=verify({
  service:renderMcpService,
  postgres,
  deploy,
  admission,
  expectedSha
});
assert.strictEqual(nestedShape.ok,true);
assert.deepStrictEqual(nestedShape.errors,[]);

const drift=verify({
  service:{...service,healthCheckPath:''},
  postgres,
  deploy,
  admission,
  expectedSha
});
assert.strictEqual(drift.ok,false);
assert(drift.errors.includes('health_check_path_mismatch'));

const memory=verify({
  service,
  postgres,
  deploy,
  admission:{
    ...admission,
    ok:false,
    errors:['ready_http_503'],
    production:{...admission.production,dataMode:'memory'}
  },
  expectedSha
});
assert.strictEqual(memory.ok,false);
assert(memory.errors.includes('admission_not_ok'));
assert(memory.errors.includes('admission_not_postgres'));
assert(memory.errors.includes('admission_contains_errors'));

const exposed=verify({
  service,
  postgres:{...postgres,ipAllowList:['0.0.0.0/0']},
  deploy,
  admission,
  expectedSha
});
assert.strictEqual(exposed.ok,false);
assert(exposed.errors.includes('postgres_external_allowlist_not_empty'));

assert.deepStrictEqual(canonicalize({b:2,a:1}),{a:1,b:2});
assert.strictEqual(
  sha256({a:1,b:2}),
  sha256({b:2,a:1})
);

console.log(JSON.stringify({
  event:'mfw_render_runtime_admission_contract',
  status:'pass',
  schemaVersion:'mfw-render-runtime-admission-v1'
}));
