const assert=require('assert');
const {
  capitalEventEnvelope,
  capitalHash,
  capitalProjectionFromRows,
  capitalProjectionBreakdown,
  capitalProjectionForType,
  capitalDecisionGate,
  validateCapitalTransition,
  verifyCapitalChainRows
}=require('./capital-authority');

function row(seq,type,points,payload,previous,evidence=['evidence://ok']){
  const envelope=capitalEventEnvelope({
    programmeKey:'mfw_programme',
    aggregateType:'pilot',
    aggregateId:'pilot_test',
    aggregateSeq:seq,
    eventType:type,
    actorSubject:'user_staff',
    actorRole:'Staff',
    authMethod:'session',
    occurredAt:'2026-10-06T12:00:00.000Z',
    points,
    evidenceRefs:evidence,
    payload:payload||{},
    idempotencyKey:'idem_'+seq,
    requestId:'req_'+seq,
    previousEventHash:previous||null
  });
  const eventHash=capitalHash(envelope);
  return {
    programme_key:envelope.programmeKey,
    aggregate_type:envelope.aggregateType,
    aggregate_id:envelope.aggregateId,
    aggregate_seq:envelope.aggregateSeq,
    event_type:envelope.eventType,
    actor_subject:envelope.actorSubject,
    actor_role:envelope.actorRole,
    auth_method:envelope.authMethod,
    occurred_at:envelope.occurredAt,
    points:envelope.points,
    evidence_refs:envelope.evidenceRefs,
    payload:envelope.payload,
    idempotency_key:envelope.idempotencyKey,
    request_id:envelope.requestId,
    previous_event_hash:envelope.previousEventHash,
    event_hash:eventHash
  };
}
function expectError(fn,message){
  let err=null;
  try{fn();}catch(e){err=e;}
  assert(err,'expected error '+message);
  assert.strictEqual(err.message,message);
  assert.strictEqual(err.status,409);
}

const rows=[];
validateCapitalTransition(rows,{eventType:'REQUEST_RECORDED',points:100,evidenceRefs:[],payload:{}});
rows.push(row(1,'REQUEST_RECORDED',100,{},null,[]));

validateCapitalTransition(rows,{eventType:'APPROVAL_RECORDED',points:80,evidenceRefs:['e://approval'],payload:{}});
rows.push(row(2,'APPROVAL_RECORDED',80,{},rows[0].event_hash,['e://approval']));

expectError(()=>validateCapitalTransition(rows,{eventType:'COMMITMENT_RECORDED',points:90,evidenceRefs:['e://commit'],payload:{}}),'capital_commitment_exceeds_approved');
validateCapitalTransition(rows,{eventType:'COMMITMENT_RECORDED',points:70,evidenceRefs:['e://commit'],payload:{}});
rows.push(row(3,'COMMITMENT_RECORDED',70,{},rows[1].event_hash,['e://commit']));

expectError(()=>validateCapitalTransition(rows,{eventType:'SPEND_RECORDED',points:80,evidenceRefs:['e://spend'],payload:{}}),'capital_spend_exceeds_net_commitment');
validateCapitalTransition(rows,{eventType:'SPEND_RECORDED',points:50,evidenceRefs:['e://spend'],payload:{}});
rows.push(row(4,'SPEND_RECORDED',50,{},rows[2].event_hash,['e://spend']));

expectError(()=>validateCapitalTransition(rows,{eventType:'RELEASE_RECORDED',points:25,evidenceRefs:['e://release'],payload:{}}),'capital_release_exceeds_unspent_commitment');
validateCapitalTransition(rows,{eventType:'RELEASE_RECORDED',points:20,evidenceRefs:['e://release'],payload:{}});
rows.push(row(5,'RELEASE_RECORDED',20,{},rows[3].event_hash,['e://release']));

expectError(()=>validateCapitalTransition(rows,{eventType:'DECISION_RECORDED',points:null,evidenceRefs:['e://decision'],payload:{decision:'SCALE'}}),'capital_decision_requires_measurement');
expectError(()=>validateCapitalTransition(rows,{eventType:'MEASUREMENT_RECORDED',points:null,evidenceRefs:['e://measure'],payload:{metric:'conversion'}}),'capital_measurement_payload_required');
validateCapitalTransition(rows,{eventType:'MEASUREMENT_RECORDED',points:null,evidenceRefs:['e://measure'],payload:{metric:'conversion',measuredValue:42.5}});
rows.push(row(6,'MEASUREMENT_RECORDED',null,{metric:'conversion',measuredValue:42.5},rows[4].event_hash,['e://measure']));

validateCapitalTransition(rows,{eventType:'DECISION_RECORDED',points:null,evidenceRefs:['e://decision'],payload:{decision:'ITERATE'}});
rows.push(row(7,'DECISION_RECORDED',null,{decision:'ITERATE'},rows[5].event_hash,['e://decision']));

const projection=capitalProjectionFromRows(rows);
assert.strictEqual(projection.requested,100);
assert.strictEqual(projection.approved,80);
assert.strictEqual(projection.committed,70);
assert.strictEqual(projection.released,20);
assert.strictEqual(projection.netCommitted,50);
assert.strictEqual(projection.spent,50);
assert.strictEqual(projection.committedUnspent,0);
assert.strictEqual(projection.measurementEvents,1);
assert.strictEqual(projection.decisions.ITERATE,1);

const verified=verifyCapitalChainRows(rows);
assert.strictEqual(verified.ok,true);
assert.strictEqual(verified.events,7);

const tampered=rows.map(x=>({...x}));
tampered[3].points=49;
const bad=verifyCapitalChainRows(tampered);
assert.strictEqual(bad.ok,false);
assert(bad.errors.some(x=>x.error==='event_hash_mismatch'));

const brokenLink=rows.map(x=>({...x}));
brokenLink[5].previous_event_hash='0'.repeat(64);
const badLink=verifyCapitalChainRows(brokenLink);
assert.strictEqual(badLink.ok,false);
assert(badLink.errors.some(x=>x.error==='previous_hash_mismatch'));

expectError(()=>validateCapitalTransition(rows,{eventType:'APPROVAL_RECORDED',points:1,evidenceRefs:[],payload:{}}),'capital_evidence_ref_required');

const mixedRows=[
  {...rows[0],aggregate_type:'programme',aggregate_id:'programme_root'},
  {...rows[1],aggregate_type:'programme',aggregate_id:'programme_root'},
  {...rows[2],aggregate_type:'programme',aggregate_id:'programme_root'},
  {...rows[0],aggregate_type:'pilot',aggregate_id:'pilot_child',idempotency_key:'pilot_req',event_hash:'a'.repeat(64)},
  {...rows[1],aggregate_type:'pilot',aggregate_id:'pilot_child',idempotency_key:'pilot_app',event_hash:'b'.repeat(64)},
  {...rows[2],aggregate_type:'pilot',aggregate_id:'pilot_child',idempotency_key:'pilot_commit',event_hash:'c'.repeat(64)}
];
const breakdown=capitalProjectionBreakdown(mixedRows);
assert.strictEqual(breakdown.mixedHierarchy,true);
assert.deepStrictEqual(breakdown.aggregateTypes,['pilot','programme']);
assert.strictEqual(breakdown.types.programme.projection.requested,100);
assert.strictEqual(breakdown.types.pilot.projection.requested,100);
assert.strictEqual(capitalProjectionForType(mixedRows,'programme').committed,70);
assert.strictEqual(capitalProjectionForType(mixedRows,'pilot').committed,70);
assert.strictEqual(capitalProjectionForType(mixedRows,'unknown'),null);




const measurementBase={
  ...rows[5],
  event_type:'MEASUREMENT_RECORDED',
  payload:{metric:'buyer_conversion',measuredValue:12.4,truthClass:'OBSERVED'},
  evidence_refs:['evidence://metric']
};
const gateRows=[...rows.slice(0,5),measurementBase];
const scaleGate=capitalDecisionGate(gateRows,{metric:'buyer_conversion',direction:'increase',target:10,nextTranchePoints:20,minimumEvidenceClass:'OBSERVED'});
assert.strictEqual(scaleGate.status,'SCALE');
assert.strictEqual(scaleGate.eligible,true);
assert.strictEqual(scaleGate.targetMet,true);
assert.strictEqual(scaleGate.truthClass,'OBSERVED');

const holdTruth=capitalDecisionGate([{...measurementBase,payload:{metric:'buyer_conversion',measuredValue:12.4,truthClass:'MODELLED'}}],{metric:'buyer_conversion',direction:'increase',target:10,minimumEvidenceClass:'OBSERVED'});
assert.strictEqual(holdTruth.status,'HOLD');
assert(holdTruth.reasonCodes.includes('evidence_class_below_policy'));

const missingMeasurement=capitalDecisionGate(rows.slice(0,5),{metric:'buyer_conversion',direction:'increase',target:10});
assert.strictEqual(missingMeasurement.status,'HOLD');
assert(missingMeasurement.reasonCodes.includes('measurement_missing'));

const iterateGate=capitalDecisionGate([{...measurementBase,payload:{metric:'buyer_conversion',measuredValue:7.5,truthClass:'ATTRIBUTED'}}],{metric:'buyer_conversion',direction:'increase',target:10,minimumEvidenceClass:'OBSERVED'});
assert.strictEqual(iterateGate.status,'ITERATE');
assert.strictEqual(iterateGate.targetMet,false);

console.log(JSON.stringify({event:'capital_authority_domain',status:'pass',events:rows.length}));
