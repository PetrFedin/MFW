'use strict';
const assert=require('node:assert/strict');
const {SCHEMA,admit,projection,verifyHistory}=require('./commercial-evidence-domain');
let n=0;
const actor={trustedServerContext:true,verifiedByServer:true,subject:'person-server-1',role:'partner_admin',organisationId:'org-A'};
const verifier=()=>({valid:true,revoked:false,issuerVerified:true,organisationId:'org-A',agreementId:'agreement-A',evidenceDigest:'sha256:serververified'});
const input=(eventType)=>({schemaVersion:SCHEMA,eventType,organisationId:'org-A',payerId:'payer-A',
 agreementId:'agreement-A',idempotencyKey:eventType+'-'+(++n),occurredAt:'2026-10-13T11:00:00Z',
 sourceRef:'evidence://'+eventType,issuerRef:'org://org-A',amountMinor:120000,currency:'RUB'});
const context={...actor,verifySource:verifier};
let history=[];
function add(type,overrides={},ctx=context){const r=admit({...input(type),...overrides},ctx,history);
 assert.equal(r.status,'VALIDATED_NOT_PERSISTED');assert.equal(r.mutated,false);history=[...history,r.event];return r.event;}
assert.throws(()=>admit(input('CONTRACT_SIGNED'),context,history),/missing_prerequisite_PILOT_ACCEPTED/);
assert.throws(()=>admit(input('PILOT_ACCEPTED'),{...context,verifiedByServer:false},history),/untrusted_actor_or_scope/);
assert.throws(()=>admit(input('PILOT_ACCEPTED'),{...context,verifySource:()=>({valid:true})},history),/source_not_admitted/);
assert.throws(()=>admit(input('PILOT_ACCEPTED'),{...context,organisationId:'org-B'},history),/untrusted_actor_or_scope/);
add('PILOT_ACCEPTED');
add('CONTRACT_SIGNED');
assert.throws(()=>admit(input('FINANCE_REVIEWED'),context,history),/missing_prerequisite_DELIVERY_VERIFIED/);
add('DELIVERY_VERIFIED');
add('ACCEPTANCE_RECORDED');
add('INVOICE_ISSUED');
assert.throws(()=>admit(input('FINANCE_REVIEWED'),context,history),/finance_authority_required/);
const finance=add('FINANCE_REVIEWED',{financialPolicyRef:'policy-v1',accountingPeriod:'2026-10'},
 {...context,role:'finance_reviewer',financeAuthorityApproved:true});
assert.equal(finance.state,'SERVER_VALIDATED_CANDIDATE');
add('PAYMENT_SETTLED');
add('RENEWAL_SIGNED');
const chain=verifyHistory(history,{organisationId:'org-A',payerId:'payer-A',agreementId:'agreement-A'});
assert.equal(chain.valid,true);
assert.equal(chain.events,8);
assert.equal(chain.authenticated,false);
assert.equal(chain.headDigest,history.at(-1).digest);
assert.throws(()=>verifyHistory(history,{organisationId:'org-A',payerId:'payer-B',agreementId:'agreement-A'}),/history_scope_mismatch/);
const altered=history.slice();
altered[2]={...altered[2],evidenceDigest:'counterfeit'};
assert.throws(()=>admit(input('RENEWAL_SIGNED'),context,altered),/history_digest_mismatch/);
const shuffled=history.slice();
[shuffled[2],shuffled[3]]=[shuffled[3],shuffled[2]];
assert.throws(()=>admit(input('RENEWAL_SIGNED'),context,shuffled),/history_chain_broken/);
assert.throws(()=>admit(input('RENEWAL_SIGNED'),context,[...history,history[0]]),/history_duplicate_idempotency/);
assert.throws(()=>admit({...input('RENEWAL_SIGNED'),payerId:'payer-B'},context,history),/history_scope_mismatch/);
assert.throws(()=>admit({...input('RENEWAL_SIGNED'),occurredAt:'2026-10-12T11:00:00Z'},context,history),/event_timestamp_regression/);
assert.equal(projection(history).recognisedRevenueMinor,null);
assert.equal(projection(history).settledCashMinor,null);
assert.equal(projection(history).authoritativeLedger,false);
const duplicate=admit({...input('PILOT_ACCEPTED'),idempotencyKey:history[0].idempotencyKey,sourceRef:history[0].sourceRef},context,history);
assert.equal(duplicate.status,'ALREADY_RECORDED');
assert.throws(()=>admit({...input('PILOT_ACCEPTED'),idempotencyKey:history[0].idempotencyKey,sourceRef:'evidence://different'},context,history),/idempotency_key_conflict/);
assert.throws(()=>admit({...input('INVOICE_ISSUED'),idempotencyKey:history[4].idempotencyKey,amountMinor:1},context,history),/idempotency_key_conflict/);
assert.throws(()=>admit({...input('INVOICE_ISSUED'),amountMinor:-1},context,history),/invalid_money/);
assert.throws(()=>admit({...input('PAYMENT_SETTLED'),organisationId:'org-B'},context,history),/untrusted_actor_or_scope/);
console.log(JSON.stringify({event:'commercial_evidence_domain_contract',status:'pass',entries:history.length,
 persistence:'none',recognition:'none',cash:'none'}));
