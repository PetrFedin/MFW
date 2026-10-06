const crypto=require('crypto');

const CAPITAL_EVENT_TYPES=new Set([
  'REQUEST_RECORDED','APPROVAL_RECORDED','COMMITMENT_RECORDED','RELEASE_RECORDED',
  'SPEND_RECORDED','MEASUREMENT_RECORDED','DECISION_RECORDED'
]);
const CAPITAL_AGGREGATE_TYPES=new Set(['programme','portfolio_proposal','business_case','pilot']);

function stableJson(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJson(value[k])).join(',')+'}';
}
function normalizeEvidenceRefs(value){
  if(!Array.isArray(value))return [];
  return value.slice(0,50).map(x=>{
    if(typeof x==='string')return x.slice(0,500);
    if(x&&typeof x==='object'){
      const out={};
      for(const key of ['type','ref','digest','source','note']){
        if(x[key]!=null)out[key]=String(x[key]).slice(0,500);
      }
      return out;
    }
    return String(x).slice(0,500);
  });
}
function capitalEventEnvelope(input){
  return {
    programmeKey:String(input.programmeKey||'mfw_programme').slice(0,120),
    aggregateType:String(input.aggregateType||'pilot').slice(0,80),
    aggregateId:String(input.aggregateId||'').slice(0,180),
    aggregateSeq:Number(input.aggregateSeq),
    eventType:String(input.eventType||'').slice(0,80),
    actorSubject:String(input.actorSubject||'').slice(0,180),
    actorRole:String(input.actorRole||'').slice(0,80),
    authMethod:String(input.authMethod||'session'),
    occurredAt:new Date(input.occurredAt).toISOString(),
    points:input.points==null?null:Number(input.points),
    evidenceRefs:normalizeEvidenceRefs(input.evidenceRefs),
    payload:input.payload&&typeof input.payload==='object'&&!Array.isArray(input.payload)?input.payload:{},
    idempotencyKey:String(input.idempotencyKey||'').slice(0,220),
    requestId:input.requestId?String(input.requestId).slice(0,220):null,
    previousEventHash:input.previousEventHash||null
  };
}
function capitalHash(envelope){
  return crypto.createHash('sha256').update(stableJson(envelope)).digest('hex');
}
function capitalProjectionFromRows(rows){
  const totals={requested:0,approved:0,committed:0,released:0,spent:0,measured:0,measurementEvents:0,decisionEvents:0,decisions:{SCALE:0,ITERATE:0,STOP:0}};
  for(const r of rows){
    const points=Number(r.points||0);
    if(r.event_type==='REQUEST_RECORDED')totals.requested+=points;
    if(r.event_type==='APPROVAL_RECORDED')totals.approved+=points;
    if(r.event_type==='COMMITMENT_RECORDED')totals.committed+=points;
    if(r.event_type==='RELEASE_RECORDED')totals.released+=points;
    if(r.event_type==='SPEND_RECORDED')totals.spent+=points;
    if(r.event_type==='MEASUREMENT_RECORDED'){totals.measured+=points;totals.measurementEvents++;}
    if(r.event_type==='DECISION_RECORDED'){
      totals.decisionEvents++;
      const d=String((r.payload&&r.payload.decision)||'').toUpperCase();
      if(Object.prototype.hasOwnProperty.call(totals.decisions,d))totals.decisions[d]++;
    }
  }
  totals.netCommitted=Math.max(0,totals.committed-totals.released);
  totals.committedUnspent=Math.max(0,totals.netCommitted-totals.spent);
  return totals;
}
function transitionError(message){
  const err=new Error(message);
  err.status=409;
  return err;
}
function validateCapitalTransition(existingRows,next){
  const projection=capitalProjectionFromRows(existingRows);
  const points=Number(next.points||0);
  const evidence=normalizeEvidenceRefs(next.evidenceRefs);
  const evidenceRequired=new Set(['APPROVAL_RECORDED','COMMITMENT_RECORDED','RELEASE_RECORDED','SPEND_RECORDED','MEASUREMENT_RECORDED','DECISION_RECORDED']);
  const pointsRequired=new Set(['REQUEST_RECORDED','APPROVAL_RECORDED','COMMITMENT_RECORDED','RELEASE_RECORDED','SPEND_RECORDED']);
  if(evidenceRequired.has(next.eventType)&&!evidence.length)throw transitionError('capital_evidence_ref_required');
  if(pointsRequired.has(next.eventType)&&!(points>0))throw transitionError('capital_positive_points_required');
  if(next.eventType==='APPROVAL_RECORDED'&&projection.approved+points>projection.requested)throw transitionError('capital_approval_exceeds_requested');
  if(next.eventType==='COMMITMENT_RECORDED'&&projection.committed+points>projection.approved)throw transitionError('capital_commitment_exceeds_approved');
  if(next.eventType==='RELEASE_RECORDED'&&points>projection.committedUnspent)throw transitionError('capital_release_exceeds_unspent_commitment');
  if(next.eventType==='SPEND_RECORDED'&&projection.spent+points>projection.netCommitted)throw transitionError('capital_spend_exceeds_net_commitment');
  if(next.eventType==='MEASUREMENT_RECORDED'){
    if(projection.spent<=0)throw transitionError('capital_measurement_requires_spend');
    const payload=next.payload&&typeof next.payload==='object'?next.payload:{};
    if(!String(payload.metric||'').trim()||payload.measuredValue==null)throw transitionError('capital_measurement_payload_required');
  }
  if(next.eventType==='DECISION_RECORDED'){
    const decision=String(next.payload&&next.payload.decision||'').toUpperCase();
    if(!['SCALE','ITERATE','STOP'].includes(decision))throw transitionError('invalid_capital_decision');
    if((projection.measurementEvents||0)<1)throw transitionError('capital_decision_requires_measurement');
  }
  return true;
}
function verifyCapitalChainRows(rows){
  const byAggregate=new Map();
  const errors=[];
  for(const row of rows){
    const key=[row.programme_key,row.aggregate_type,row.aggregate_id].join('|');
    if(!byAggregate.has(key))byAggregate.set(key,[]);
    byAggregate.get(key).push(row);
  }
  for(const [key,events] of byAggregate.entries()){
    events.sort((a,b)=>Number(a.aggregate_seq)-Number(b.aggregate_seq));
    let prevHash=null,expectedSeq=1;
    for(const row of events){
      if(Number(row.aggregate_seq)!==expectedSeq)errors.push({aggregate:key,seq:Number(row.aggregate_seq),error:'sequence_gap',expected:expectedSeq});
      if((row.previous_event_hash||null)!==prevHash)errors.push({aggregate:key,seq:Number(row.aggregate_seq),error:'previous_hash_mismatch'});
      const envelope=capitalEventEnvelope({
        programmeKey:row.programme_key,aggregateType:row.aggregate_type,aggregateId:row.aggregate_id,
        aggregateSeq:Number(row.aggregate_seq),eventType:row.event_type,actorSubject:row.actor_subject,actorRole:row.actor_role,
        authMethod:row.auth_method,occurredAt:new Date(row.occurred_at).toISOString(),
        points:row.points==null?null:Number(row.points),evidenceRefs:row.evidence_refs,payload:row.payload,
        idempotencyKey:row.idempotency_key,requestId:row.request_id,previousEventHash:row.previous_event_hash||null
      });
      const computed=capitalHash(envelope);
      if(computed!==String(row.event_hash||''))errors.push({aggregate:key,seq:Number(row.aggregate_seq),error:'event_hash_mismatch',expected:computed,actual:String(row.event_hash||'')});
      prevHash=String(row.event_hash||'');
      expectedSeq++;
    }
  }
  return {ok:errors.length===0,aggregates:byAggregate.size,events:rows.length,errors};
}

module.exports={
  CAPITAL_EVENT_TYPES,
  CAPITAL_AGGREGATE_TYPES,
  stableJson,
  normalizeEvidenceRefs,
  capitalEventEnvelope,
  capitalHash,
  capitalProjectionFromRows,
  validateCapitalTransition,
  verifyCapitalChainRows
};
