'use strict';
// Standalone server-domain contract. No HTTP route, DB writes, payments or invoice posting.
// All caller-supplied "verified" flags are untrusted.
const crypto=require('node:crypto');
const SCHEMA='mfw-commercial-evidence-domain-v1';
const TYPES=Object.freeze(['PILOT_ACCEPTED','CONTRACT_SIGNED','DELIVERY_VERIFIED','ACCEPTANCE_RECORDED','INVOICE_ISSUED','FINANCE_REVIEWED','PAYMENT_SETTLED','RENEWAL_SIGNED']);
const REQUIRED=Object.freeze({
 PILOT_ACCEPTED:[],
 CONTRACT_SIGNED:['PILOT_ACCEPTED'],
 DELIVERY_VERIFIED:['CONTRACT_SIGNED'],
 ACCEPTANCE_RECORDED:['DELIVERY_VERIFIED'],
 INVOICE_ISSUED:['CONTRACT_SIGNED'],
 FINANCE_REVIEWED:['CONTRACT_SIGNED','DELIVERY_VERIFIED'],
 PAYMENT_SETTLED:['INVOICE_ISSUED'],
 RENEWAL_SIGNED:['CONTRACT_SIGNED']
});
// Candidate governance policy only. Real grants, counterparty identity, bank
// verification and reviewer independence must be approved server-side.
const EVENT_ROLES=Object.freeze({
 PILOT_ACCEPTED:Object.freeze(['organiser','brand_admin','partner_admin']),
 CONTRACT_SIGNED:Object.freeze(['organiser','brand_admin','partner_admin']),
 DELIVERY_VERIFIED:Object.freeze(['organiser','brand_admin','partner_admin']),
 ACCEPTANCE_RECORDED:Object.freeze(['organiser','brand_admin','partner_admin']),
 INVOICE_ISSUED:Object.freeze(['finance_operator']),
 FINANCE_REVIEWED:Object.freeze(['finance_reviewer']),
 PAYMENT_SETTLED:Object.freeze(['settlement_verifier']),
 RENEWAL_SIGNED:Object.freeze(['organiser','brand_admin','partner_admin'])
});
const MONETARY_TYPES=new Set(['CONTRACT_SIGNED','INVOICE_ISSUED','FINANCE_REVIEWED','PAYMENT_SETTLED','RENEWAL_SIGNED']);
function failure(code){const e=new Error(code);e.code=code;throw e;}
function nonempty(x,max=200){return typeof x==='string'&&x.length>0&&x.length<=max&&x===x.trim();}
function timestamp(x){return typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)&&!Number.isNaN(Date.parse(x));}
function authoritySubject(actor,scope){
 if(!actor||actor.trustedServerContext!==true||actor.verifiedByServer!==true||
   !nonempty(actor.subject)||!nonempty(actor.organisationId)||!nonempty(actor.role)||
   actor.organisationId!==scope.organisationId)failure('untrusted_actor_or_scope');
 if(![...new Set(Object.values(EVENT_ROLES).flat())].includes(actor.role))failure('unauthorised_role');
 return actor;
}
function canonical(record){
 const fields=['schemaVersion','eventType','organisationId','payerId','agreementId','idempotencyKey','occurredAt','sourceRef','issuerRef','actorSubject','actorRole','evidenceDigest','state','parentDigest','amountMinor','currency','accountingPeriod','financialPolicyRef'];
 const result={};
 for(const name of fields)result[name]=record[name]??null;
 return result;
}
function digest(record){return crypto.createHash('sha256').update(JSON.stringify(canonical(record))).digest('hex');}
function verifyHistory(history,scope){
 if(!Array.isArray(history)||!scope)failure('invalid_history');
 let previous=null;
 let lastTime=-Infinity;
 const seenKeys=new Set();
 const seenStages=new Set();
 for(const row of history){
   if(!row||row.schemaVersion!==SCHEMA||!TYPES.includes(row.eventType)||
      row.state!=='SERVER_VALIDATED_CANDIDATE')failure('history_event_invalid');
   if(row.organisationId!==scope.organisationId||row.payerId!==scope.payerId||
      row.agreementId!==scope.agreementId)failure('history_scope_mismatch');
   if(!nonempty(row.idempotencyKey,240)||seenKeys.has(row.idempotencyKey))failure('history_duplicate_idempotency');
   seenKeys.add(row.idempotencyKey);
   if(!timestamp(row.occurredAt))failure('history_timestamp_invalid');
   const at=Date.parse(row.occurredAt);
   if(at<lastTime)failure('history_out_of_order');
   lastTime=at;
   if(row.parentDigest!==previous)failure('history_chain_broken');
   if(typeof row.digest!=='string'||!/^[0-9a-f]{64}$/.test(row.digest)||row.digest!==digest(row)){
     failure('history_digest_mismatch');
   }
   for(const prerequisite of REQUIRED[row.eventType]){
     if(!seenStages.has(prerequisite))failure('history_prerequisite_missing_'+prerequisite);
   }
   seenStages.add(row.eventType);
   previous=row.digest;
 }
 return Object.freeze({valid:true,events:history.length,headDigest:previous,
   authenticated:false,note:'SHA256 link integrity is not source authentication'});
}

function admit(input,context,history=[]){
 if(!input||!context||!Array.isArray(history))failure('invalid_arguments');
 if(input.schemaVersion!==SCHEMA||!TYPES.includes(input.eventType))failure('invalid_event_type');
 for(const x of ['organisationId','payerId','agreementId','idempotencyKey','sourceRef','issuerRef']){
   if(!nonempty(input[x],240))failure('missing_required_field_'+x);
 }
 if(!timestamp(input.occurredAt))failure('invalid_timestamp');
 if(MONETARY_TYPES.has(input.eventType)&&
   (!Number.isSafeInteger(input.amountMinor)||input.amountMinor<0||input.amountMinor>1e12||
    !/^[A-Z]{3}$/.test(String(input.currency||''))))failure('invalid_money');
 if((input.eventType==='INVOICE_ISSUED'||input.eventType==='PAYMENT_SETTLED')&&input.amountMinor===0)
   failure('zero_invoice_or_settlement');
 const actor=authoritySubject(context,{organisationId:input.organisationId});
 if(!EVENT_ROLES[input.eventType].includes(actor.role))failure('event_role_forbidden');
 if(input.eventType==='ACCEPTANCE_RECORDED'&&context.counterpartyAcceptanceVerified!==true)
   failure('counterparty_acceptance_required');
 if(input.eventType==='INVOICE_ISSUED'&&context.invoiceAuthorityApproved!==true)
   failure('invoice_authority_required');
 if(input.eventType==='FINANCE_REVIEWED'&&
   (context.financeAuthorityApproved!==true||!nonempty(input.financialPolicyRef)||
    !/^20\d{2}-(0[1-9]|1[0-2])$/.test(input.accountingPeriod||'')))
   failure('finance_authority_required');
 if(input.eventType==='PAYMENT_SETTLED'&&context.settlementAuthorityApproved!==true)
   failure('settlement_authority_required');
 // A caller-provided sourceRef is never enough: it must be independently resolved
 // by a server-owned verification callback with issuer, tenant and revocation checks.
 if(typeof context.verifySource!=='function')failure('source_verifier_required');
 const proof=context.verifySource({reference:input.sourceRef,issuer:input.issuerRef,
   organisationId:input.organisationId,payerId:input.payerId,
   agreementId:input.agreementId,eventType:input.eventType,occurredAt:input.occurredAt,
   amountMinor:MONETARY_TYPES.has(input.eventType)?input.amountMinor:null,
   currency:MONETARY_TYPES.has(input.eventType)?input.currency:null});
 if(!proof||proof.valid!==true||proof.revoked!==false||proof.issuerVerified!==true||
  proof.organisationId!==input.organisationId||proof.agreementId!==input.agreementId||
  proof.payerId!==input.payerId||proof.reference!==input.sourceRef||
  proof.issuer!==input.issuerRef||proof.eventType!==input.eventType||
  proof.occurredAt!==input.occurredAt||
  (MONETARY_TYPES.has(input.eventType)&&
    (proof.amountMinor!==input.amountMinor||proof.currency!==input.currency))||
  typeof proof.evidenceDigest!=='string'||!/^[a-f0-9]{64}$/.test(proof.evidenceDigest))
   failure('source_not_admitted');
 verifyHistory(history,{organisationId:input.organisationId,payerId:input.payerId,agreementId:input.agreementId});
 const matching=history;
 const signed=matching.find(r=>r.eventType==='CONTRACT_SIGNED');
 if(signed&&MONETARY_TYPES.has(input.eventType)&&signed.currency!==input.currency)
   failure('agreement_currency_mismatch');
 if(history.some(r=>r.idempotencyKey===input.idempotencyKey)){
   const old=history.find(r=>r.idempotencyKey===input.idempotencyKey);
   if(old.organisationId!==input.organisationId||old.agreementId!==input.agreementId||
      old.eventType!==input.eventType||old.sourceRef!==input.sourceRef||
      old.payerId!==input.payerId||old.issuerRef!==input.issuerRef||
      old.evidenceDigest!==proof.evidenceDigest||
      old.occurredAt!==input.occurredAt||old.actorSubject!==actor.subject||old.actorRole!==actor.role||
      (old.accountingPeriod!==null&&old.accountingPeriod!==input.accountingPeriod)||
      (old.financialPolicyRef!==null&&old.financialPolicyRef!==input.financialPolicyRef)||
      (old.amountMinor!==null&&old.amountMinor!==input.amountMinor)||
      (old.currency!==null&&old.currency!==input.currency))failure('idempotency_key_conflict');
   return Object.freeze({status:'ALREADY_RECORDED',event:old,mutated:false});
 }
 if(history.length&&Date.parse(input.occurredAt)<Date.parse(history[history.length-1].occurredAt))failure('event_timestamp_regression');
 if(input.eventType==='PAYMENT_SETTLED'){
   const invoiced=matching.filter(r=>r.eventType==='INVOICE_ISSUED')
     .reduce((sum,r)=>sum+r.amountMinor,0);
   const settled=matching.filter(r=>r.eventType==='PAYMENT_SETTLED')
     .reduce((sum,r)=>sum+r.amountMinor,0);
   if(!Number.isSafeInteger(invoiced)||!Number.isSafeInteger(settled)||
      settled+input.amountMinor>invoiced)failure('settlement_exceeds_invoiced');
 }
 const existing=new Set(matching.map(r=>r.eventType));
 for(const prerequisite of REQUIRED[input.eventType])if(!existing.has(prerequisite))failure('missing_prerequisite_'+prerequisite);
 const finance=input.eventType==='FINANCE_REVIEWED';
 const entry={
  schemaVersion:SCHEMA,eventType:input.eventType,organisationId:input.organisationId,
  payerId:input.payerId,agreementId:input.agreementId,idempotencyKey:input.idempotencyKey,
  occurredAt:input.occurredAt,sourceRef:input.sourceRef,issuerRef:input.issuerRef,
  evidenceDigest:proof.evidenceDigest,actorSubject:actor.subject,actorRole:actor.role,
  parentDigest:matching.length?matching[matching.length-1].digest:null,
  amountMinor:MONETARY_TYPES.has(input.eventType)?input.amountMinor:null,
  currency:MONETARY_TYPES.has(input.eventType)?input.currency:null,
  accountingPeriod:finance?input.accountingPeriod:null,
  financialPolicyRef:finance?input.financialPolicyRef:null,
  state:'SERVER_VALIDATED_CANDIDATE'
 };
 entry.digest=digest(entry);
 return Object.freeze({status:'VALIDATED_NOT_PERSISTED',event:Object.freeze(entry),mutated:false});
}
function projection(history){
 if(!Array.isArray(history))failure('invalid_history');
 const counts=Object.fromEntries(TYPES.map(t=>[t,0]));
 for(const x of history){if(TYPES.includes(x.eventType))counts[x.eventType]++;}
 return Object.freeze({schemaVersion:SCHEMA,counts,recognisedRevenueMinor:null,settledCashMinor:null,
  authoritativeLedger:false,source:'DOMAIN_TEST_ONLY'});
}
module.exports={SCHEMA,TYPES,REQUIRED,EVENT_ROLES,admit,projection,digest,verifyHistory};
