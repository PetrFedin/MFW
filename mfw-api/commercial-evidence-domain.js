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
function failure(code){const e=new Error(code);e.code=code;throw e;}
function nonempty(x,max=200){return typeof x==='string'&&x.length>0&&x.length<=max&&x===x.trim();}
function timestamp(x){return typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)&&!Number.isNaN(Date.parse(x));}
function authoritySubject(actor,scope){
 if(!actor||actor.trustedServerContext!==true||actor.verifiedByServer!==true||
   !nonempty(actor.subject)||!nonempty(actor.organisationId)||!nonempty(actor.role)||
   actor.organisationId!==scope.organisationId)failure('untrusted_actor_or_scope');
 if(!['organiser','brand_admin','partner_admin','finance_reviewer'].includes(actor.role))failure('unauthorised_role');
 return actor;
}
function canonical(record){
 const fields=['schemaVersion','eventType','organisationId','payerId','agreementId','idempotencyKey','occurredAt','sourceRef','issuerRef','actorSubject','actorRole','parentDigest','amountMinor','currency','accountingPeriod','financialPolicyRef'];
 const result={};
 for(const name of fields)result[name]=record[name]??null;
 return result;
}
function digest(record){return crypto.createHash('sha256').update(JSON.stringify(canonical(record))).digest('hex');}
function admit(input,context,history=[]){
 if(!input||!context||!Array.isArray(history))failure('invalid_arguments');
 if(input.schemaVersion!==SCHEMA||!TYPES.includes(input.eventType))failure('invalid_event_type');
 for(const x of ['organisationId','payerId','agreementId','idempotencyKey','sourceRef','issuerRef']){
   if(!nonempty(input[x],240))failure('missing_required_field_'+x);
 }
 if(!timestamp(input.occurredAt))failure('invalid_timestamp');
 const actor=authoritySubject(context,{organisationId:input.organisationId});
 // A caller-provided sourceRef is never enough: it must be independently resolved
 // by a server-owned verification callback with issuer, tenant and revocation checks.
 if(typeof context.verifySource!=='function')failure('source_verifier_required');
 const proof=context.verifySource({reference:input.sourceRef,issuer:input.issuerRef,organisationId:input.organisationId,agreementId:input.agreementId,eventType:input.eventType});
 if(!proof||proof.valid!==true||proof.revoked!==false||proof.issuerVerified!==true||
  proof.organisationId!==input.organisationId||proof.agreementId!==input.agreementId||
  !nonempty(proof.evidenceDigest,128))failure('source_not_admitted');
 const matching=history.filter(r=>r.organisationId===input.organisationId&&r.agreementId===input.agreementId);
 if(history.some(r=>r.idempotencyKey===input.idempotencyKey)){
   const old=history.find(r=>r.idempotencyKey===input.idempotencyKey);
   if(old.organisationId!==input.organisationId||old.agreementId!==input.agreementId||
      old.eventType!==input.eventType||old.sourceRef!==input.sourceRef||
      old.payerId!==input.payerId||old.issuerRef!==input.issuerRef||
      (old.amountMinor!==null&&old.amountMinor!==input.amountMinor)||
      (old.currency!==null&&old.currency!==input.currency))failure('idempotency_key_conflict');
   return Object.freeze({status:'ALREADY_RECORDED',event:old,mutated:false});
 }
 const existing=new Set(matching.map(r=>r.eventType));
 for(const prerequisite of REQUIRED[input.eventType])if(!existing.has(prerequisite))failure('missing_prerequisite_'+prerequisite);
 const finance=input.eventType==='FINANCE_REVIEWED';
 const financialTypes=['INVOICE_ISSUED','FINANCE_REVIEWED','PAYMENT_SETTLED'];
 if(financialTypes.includes(input.eventType)){
   if(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<0||input.amountMinor>1e12||
     !/^[A-Z]{3}$/.test(String(input.currency||'')))failure('invalid_money');
 }
 if(finance){
   if(actor.role!=='finance_reviewer'||context.financeAuthorityApproved!==true||
      !nonempty(input.financialPolicyRef)||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(input.accountingPeriod||'')){
     failure('finance_authority_required');
   }
 } else if(actor.role==='finance_reviewer'&&input.eventType==='CONTRACT_SIGNED'){
   failure('invalid_role_transition');
 }
 const entry={
  schemaVersion:SCHEMA,eventType:input.eventType,organisationId:input.organisationId,
  payerId:input.payerId,agreementId:input.agreementId,idempotencyKey:input.idempotencyKey,
  occurredAt:input.occurredAt,sourceRef:input.sourceRef,issuerRef:input.issuerRef,
  evidenceDigest:proof.evidenceDigest,actorSubject:actor.subject,actorRole:actor.role,
  parentDigest:matching.length?matching[matching.length-1].digest:null,
  amountMinor:financialTypes.includes(input.eventType)?input.amountMinor:null,
  currency:financialTypes.includes(input.eventType)?input.currency:null,
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
module.exports={SCHEMA,TYPES,REQUIRED,admit,projection,digest};
