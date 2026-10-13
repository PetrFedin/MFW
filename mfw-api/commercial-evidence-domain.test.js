'use strict';
const assert=require('node:assert/strict');
const {SCHEMA,admit,projection,verifyHistory}=require('./commercial-evidence-domain');
let n=0;
const actor={trustedServerContext:true,verifiedByServer:true,subject:'person-server-1',role:'partner_admin',organisationId:'org-A'};
const crypto=require('node:crypto');
const verifier=(claim)=>({valid:true,revoked:false,issuerVerified:true,
  organisationId:claim.organisationId,payerId:claim.payerId,
  agreementId:claim.agreementId,reference:claim.reference,issuer:claim.issuer,
  eventType:claim.eventType,occurredAt:claim.occurredAt,
  amountMinor:claim.amountMinor,currency:claim.currency,
  evidenceDigest:crypto.createHash('sha256')
    .update(JSON.stringify(claim)).digest('hex')});
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
assert.throws(()=>admit({...input('FINANCE_REVIEWED'),financialPolicyRef:'policy-v1',accountingPeriod:'2026-10'},{...context,role:'finance_reviewer',financeAuthorityApproved:true},history),/missing_prerequisite_DELIVERY_VERIFIED/);
add('DELIVERY_VERIFIED');
add('ACCEPTANCE_RECORDED',{}, {...context,counterpartyAcceptanceVerified:true});
add('INVOICE_ISSUED',{}, {...context,role:'finance_operator',invoiceAuthorityApproved:true});
assert.throws(()=>admit(input('FINANCE_REVIEWED'),{...context,role:'finance_reviewer'},history),/finance_authority_required/);
const finance=add('FINANCE_REVIEWED',{financialPolicyRef:'policy-v1',accountingPeriod:'2026-10'},
 {...context,role:'finance_reviewer',financeAuthorityApproved:true});
assert.equal(finance.state,'SERVER_VALIDATED_CANDIDATE');
add('PAYMENT_SETTLED',{}, {...context,role:'settlement_verifier',settlementAuthorityApproved:true});
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
assert.equal(duplicate.event.digest,history[0].digest);
// A delayed retry after other events must succeed, even when its original timestamp
// precedes the latest committed event. A settlement replay must NOT be counted twice.
const earlier=history[0];
const samePilot=admit({...input('PILOT_ACCEPTED'),idempotencyKey:earlier.idempotencyKey,
  occurredAt:earlier.occurredAt,sourceRef:earlier.sourceRef},context,history);
assert.equal(samePilot.status,'ALREADY_RECORDED');
assert.equal(samePilot.event.digest,earlier.digest);
const settledRecord=history.find(row=>row.eventType==='PAYMENT_SETTLED');
const sameSettlement=admit({...input('PAYMENT_SETTLED'),
   idempotencyKey:settledRecord.idempotencyKey,occurredAt:settledRecord.occurredAt,
   sourceRef:settledRecord.sourceRef},
   {...context,role:'settlement_verifier',settlementAuthorityApproved:true},history);
assert.equal(sameSettlement.status,'ALREADY_RECORDED');
assert.equal(sameSettlement.event.digest,settledRecord.digest);
assert.equal(projection(history).counts.PAYMENT_SETTLED,1);
assert.throws(()=>admit({...input('PAYMENT_SETTLED'),
  idempotencyKey:settledRecord.idempotencyKey,occurredAt:settledRecord.occurredAt,
  sourceRef:settledRecord.sourceRef,amountMinor:settledRecord.amountMinor-1},
  {...context,role:'settlement_verifier',settlementAuthorityApproved:true},history),
  /idempotency_key_conflict/);
assert.throws(()=>admit({...input('PILOT_ACCEPTED'),idempotencyKey:history[0].idempotencyKey,sourceRef:'evidence://different'},context,history),/idempotency_key_conflict/);
assert.throws(()=>admit({...input('INVOICE_ISSUED'),idempotencyKey:history[4].idempotencyKey,amountMinor:1},
 {...context,role:'finance_operator',invoiceAuthorityApproved:true},history),/idempotency_key_conflict/);
assert.throws(()=>admit({...input('INVOICE_ISSUED'),amountMinor:-1},
  {...context,role:'finance_operator',invoiceAuthorityApproved:true},history),/invalid_money/);
assert.throws(()=>admit({...input('PAYMENT_SETTLED'),organisationId:'org-B'},context,history),/untrusted_actor_or_scope/);
// Finance / counterparty segregation, source binding and payment overstatement.
assert.throws(()=>admit(input('INVOICE_ISSUED'),context,history),/event_role_forbidden/);
assert.throws(()=>admit(input('PAYMENT_SETTLED'),context,history),/event_role_forbidden/);
assert.throws(()=>admit(input('FINANCE_REVIEWED'), {...context,role:'finance_reviewer'},history),
 /finance_authority_required/);
assert.throws(()=>admit(input('INVOICE_ISSUED'),{...context,role:'finance_operator'},history),
 /invoice_authority_required/);
assert.throws(()=>admit(input('PAYMENT_SETTLED'),{...context,role:'settlement_verifier'},history),
 /settlement_authority_required/);
assert.throws(()=>admit(input('ACCEPTANCE_RECORDED'),context,history),
 /counterparty_acceptance_required/);
const badPayerVerifier=(claim)=>({...verifier(claim),payerId:'payer-foreign'});
assert.throws(()=>admit(input('RENEWAL_SIGNED'),{...context,verifySource:badPayerVerifier},history),
 /source_not_admitted/);
const badAmountVerifier=(claim)=>({...verifier(claim),amountMinor:1});
assert.throws(()=>admit(input('RENEWAL_SIGNED'),{...context,verifySource:badAmountVerifier},history),
 /source_not_admitted/);
const badIssuerVerifier=(claim)=>({...verifier(claim),issuer:'untrusted-issuer'});
assert.throws(()=>admit(input('RENEWAL_SIGNED'),{...context,verifySource:badIssuerVerifier},history),
 /source_not_admitted/);
const shortDigestVerifier=(claim)=>({...verifier(claim),evidenceDigest:'looks-signed'});
assert.throws(()=>admit(input('RENEWAL_SIGNED'),{...context,verifySource:shortDigestVerifier},history),
 /source_not_admitted/);
assert.throws(()=>admit({...input('PAYMENT_SETTLED'),amountMinor:1},
 {...context,role:'settlement_verifier',settlementAuthorityApproved:true},history),
 /settlement_exceeds_invoiced/);
assert.throws(()=>admit({...input('RENEWAL_SIGNED'),currency:'USD'},context,history),
 /agreement_currency_mismatch/);
assert.throws(()=>admit({...input('INVOICE_ISSUED'),amountMinor:0},
 {...context,role:'finance_operator',invoiceAuthorityApproved:true},history),
 /zero_invoice_or_settlement/);
assert.throws(()=>admit({...input('PAYMENT_SETTLED'),amountMinor:0},
 {...context,role:'settlement_verifier',settlementAuthorityApproved:true},history),
 /zero_invoice_or_settlement/);
const mutatingVerifier=(claim)=>({...verifier(claim),evidenceDigest:'f'.repeat(64)});
const duplicated={...input('RENEWAL_SIGNED'),idempotencyKey:history.at(-1).idempotencyKey,
 sourceRef:history.at(-1).sourceRef};
assert.throws(()=>admit(duplicated,{...context,verifySource:mutatingVerifier},history),
 /idempotency_key_conflict/);
console.log(JSON.stringify({event:'commercial_evidence_domain_contract',status:'pass',entries:history.length,
 persistence:'none',recognition:'none',cash:'none'}));
