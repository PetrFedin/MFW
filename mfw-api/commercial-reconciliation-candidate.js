'use strict';
// Pure synthetic candidate arithmetic: no source authentication, finance posting,
// bank settlement verification, persistence, or side effects.
const VERSION='mfw-candidate-invoice-reconciliation-v1';
const EVENT_TYPES=Object.freeze(['INVOICE_ISSUED','CREDIT_NOTE_ISSUED','PAYMENT_SETTLED','REFUND_SETTLED']);
function reject(code){const e=new Error(code);e.code=code;throw e;}
function id(x){return typeof x==='string'&&x.length>0&&x.length<=240&&x.trim()===x;}
function time(x){return typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)&&Number.isFinite(Date.parse(x));}
function minor(x){return Number.isSafeInteger(x)&&x>0&&x<=1e12;}
function add(a,b){const n=a+b;if(!Number.isSafeInteger(n))reject('candidate_amount_overflow');return n;}
function reconcile(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!Array.isArray(input.events))reject('candidate_input_invalid');
 for(const key of ['organisationId','payerId','agreementId'])if(!id(input[key]))reject('candidate_scope_invalid');
 if(typeof input.currency!=='string'||!/^[A-Z]{3}$/.test(input.currency))reject('candidate_currency_invalid');
 const invoices=new Map(),payments=new Map(),keys=new Set(),ids=new Set();
 let lastTime=-Infinity;
 for(const ev of input.events){
   if(!ev||typeof ev!=='object'||Array.isArray(ev)||!EVENT_TYPES.includes(ev.eventType))reject('candidate_event_invalid');
   for(const key of ['organisationId','payerId','agreementId'])if(ev[key]!==input[key])reject('candidate_cross_scope');
   if(ev.currency!==input.currency)reject('candidate_cross_currency');
   if(!id(ev.eventKey)||!id(ev.eventId)||!id(ev.invoiceId))reject('candidate_event_reference_invalid');
   if(keys.has(ev.eventKey)||ids.has(ev.eventId))reject('candidate_duplicate_event');
   keys.add(ev.eventKey);ids.add(ev.eventId);
   if(!time(ev.occurredAt))reject('candidate_time_invalid');
   const at=Date.parse(ev.occurredAt);
   if(at<lastTime)reject('candidate_event_out_of_order');
   lastTime=at;
   if(!minor(ev.amountMinor))reject('candidate_amount_invalid');
   if(ev.eventType==='INVOICE_ISSUED'){
     if(invoices.has(ev.invoiceId))reject('candidate_duplicate_invoice');
     invoices.set(ev.invoiceId,{invoiceId:ev.invoiceId,invoiceMinor:ev.amountMinor,creditMinor:0,paymentsMinor:0,refundsMinor:0});
     continue;
   }
   const invoice=invoices.get(ev.invoiceId);
   if(!invoice)reject('candidate_invoice_not_found');
   if(ev.eventType==='CREDIT_NOTE_ISSUED'){
     if(add(invoice.creditMinor,ev.amountMinor)>invoice.invoiceMinor)reject('candidate_credit_exceeds_invoice');
     invoice.creditMinor=add(invoice.creditMinor,ev.amountMinor);
   } else if(ev.eventType==='PAYMENT_SETTLED'){
     payments.set(ev.eventId,{invoiceId:ev.invoiceId,paidMinor:ev.amountMinor,refundedMinor:0});
     invoice.paymentsMinor=add(invoice.paymentsMinor,ev.amountMinor);
   } else if(ev.eventType==='REFUND_SETTLED'){
     if(!id(ev.paymentEventId))reject('candidate_payment_reference_required');
     const paid=payments.get(ev.paymentEventId);
     if(!paid||paid.invoiceId!==ev.invoiceId)reject('candidate_payment_reference_invalid');
     if(add(paid.refundedMinor,ev.amountMinor)>paid.paidMinor)reject('candidate_refund_exceeds_payment');
     paid.refundedMinor=add(paid.refundedMinor,ev.amountMinor);
     invoice.refundsMinor=add(invoice.refundsMinor,ev.amountMinor);
   }
 }
 let gross=0,credits=0,adjusted=0,paymentsTotal=0,refunds=0,netSettlements=0,open=0,overpaid=0;
 const rows=[];
 for(const inv of invoices.values()){
   const netInvoice=inv.invoiceMinor-inv.creditMinor;
   const netPaid=inv.paymentsMinor-inv.refundsMinor;
   if(netInvoice<0||netPaid<0)reject('candidate_negative_balance');
   const outstandingMinor=Math.max(0,netInvoice-netPaid);
   const overpaidMinor=Math.max(0,netPaid-netInvoice);
   const status=overpaidMinor?'OVERPAID_REVIEW':netInvoice===0?'CREDITED_ZERO':
     netPaid===0?'OPEN':outstandingMinor===0?'SETTLED':'PARTIAL';
   rows.push(Object.freeze({invoiceId:inv.invoiceId,grossInvoiceMinor:inv.invoiceMinor,
     creditNotesMinor:inv.creditMinor,adjustedInvoiceMinor:netInvoice,
     candidatePaymentsMinor:inv.paymentsMinor,candidateRefundsMinor:inv.refundsMinor,
     candidateNetSettlementsMinor:netPaid,outstandingMinor,overpaidMinor,status}));
   gross=add(gross,inv.invoiceMinor);
   credits=add(credits,inv.creditMinor);
   adjusted=add(adjusted,netInvoice);
   paymentsTotal=add(paymentsTotal,inv.paymentsMinor);
   refunds=add(refunds,inv.refundsMinor);
   netSettlements=add(netSettlements,netPaid);
   open=add(open,outstandingMinor);
   overpaid=add(overpaid,overpaidMinor);
 }
 if(adjusted-netSettlements!==open-overpaid)reject('candidate_balance_invariant');
 return Object.freeze({
   schemaVersion:VERSION,truthClass:'MODELLED_CANDIDATE',authoritative:false,productionAdmitted:false,
   organisationId:input.organisationId,payerId:input.payerId,
   agreementId:input.agreementId,currency:input.currency,
   eventCount:input.events.length,invoiceCount:rows.length,invoices:Object.freeze(rows),
   candidateTotals:Object.freeze({grossInvoiceMinor:gross,creditNotesMinor:credits,
     adjustedInvoiceMinor:adjusted,paymentsMinor:paymentsTotal,refundsMinor:refunds,
     netSettlementsMinor:netSettlements,outstandingMinor:open,overpaidMinor:overpaid}),
   exceptions:Object.freeze(rows.filter(row=>row.overpaidMinor>0).map(row=>Object.freeze({
     code:'OVERPAYMENT_REVIEW_REQUIRED',invoiceId:row.invoiceId,amountMinor:row.overpaidMinor}))),
   actuals:Object.freeze({recognisedRevenueMinor:null,bankVerifiedCashMinor:null,
     bookedReceivableMinor:null,auditedArrMinor:null}),
   limitations:'Pure candidate arithmetic only. Invoices, credit notes and bank facts are NOT authenticated.'
 });
}
module.exports={VERSION,EVENT_TYPES,reconcile};
