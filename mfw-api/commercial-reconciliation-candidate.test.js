'use strict';
const assert=require('node:assert/strict');
const {VERSION,reconcile}=require('./commercial-reconciliation-candidate');
const scope={organisationId:'organisation-A',payerId:'payer-A',agreementId:'agreement-A',currency:'RUB'};
let seq=0;
const iso='2026-10-13T16:30:00Z';
function event(eventType,invoiceId,amountMinor,extra={}){
 const n=++seq;
 return {...scope,eventType,invoiceId,amountMinor,eventId:'event-'+n,
   eventKey:'key-'+n,occurredAt:iso,...extra};
}
const run=events=>reconcile({...scope,events});
const i1=event('INVOICE_ISSUED','invoice-1',10000);
const p1=event('PAYMENT_SETTLED','invoice-1',3000);
const p2=event('PAYMENT_SETTLED','invoice-1',2000);
const c1=event('CREDIT_NOTE_ISSUED','invoice-1',1000);
const r1=event('REFUND_SETTLED','invoice-1',1000,{paymentEventId:p1.eventId});
const i2=event('INVOICE_ISSUED','invoice-2',5000);
const p3=event('PAYMENT_SETTLED','invoice-2',5000);
const c2=event('CREDIT_NOTE_ISSUED','invoice-2',2000);
const r2=event('REFUND_SETTLED','invoice-2',1500,{paymentEventId:p3.eventId});
const r3=event('REFUND_SETTLED','invoice-2',500,{paymentEventId:p3.eventId});
const partial=run([i1,p1,p2,c1,r1]);
assert.equal(partial.schemaVersion,VERSION);
assert.equal(partial.truthClass,'MODELLED_CANDIDATE');
assert.equal(partial.authoritative,false);
assert.equal(partial.productionAdmitted,false);
assert.equal(partial.actuals.recognisedRevenueMinor,null);
assert.equal(partial.actuals.bankVerifiedCashMinor,null);
assert.deepEqual(partial.candidateTotals,{
 grossInvoiceMinor:10000,creditNotesMinor:1000,adjustedInvoiceMinor:9000,
 paymentsMinor:5000,refundsMinor:1000,netSettlementsMinor:4000,
 outstandingMinor:5000,overpaidMinor:0
});
assert.equal(partial.invoices[0].status,'PARTIAL');
const initial=run([i1,p1,p2,c1,r1,i2,p3]);
assert.equal(initial.invoices[1].status,'SETTLED');
const over=run([i1,p1,p2,c1,r1,i2,p3,c2]);
assert.equal(over.invoices[1].status,'OVERPAID_REVIEW');
assert.deepEqual(over.exceptions,[{code:'OVERPAYMENT_REVIEW_REQUIRED',invoiceId:'invoice-2',amountMinor:2000}]);
const reduced=run([i1,p1,p2,c1,r1,i2,p3,c2,r2]);
assert.equal(reduced.invoices[1].overpaidMinor,500);
const settled=run([i1,p1,p2,c1,r1,i2,p3,c2,r2,r3]);
assert.equal(settled.invoiceCount,2);
assert.equal(settled.eventCount,10);
assert.equal(settled.invoices[1].status,'SETTLED');
assert.equal(settled.exceptions.length,0);
assert.equal(settled.candidateTotals.adjustedInvoiceMinor,12000);
assert.equal(settled.candidateTotals.netSettlementsMinor,7000);
assert.equal(settled.candidateTotals.outstandingMinor,5000);
assert.equal(settled.candidateTotals.overpaidMinor,0);
assert.equal(settled.candidateTotals.adjustedInvoiceMinor-settled.candidateTotals.netSettlementsMinor,
             settled.candidateTotals.outstandingMinor-settled.candidateTotals.overpaidMinor);
assert.equal(run([]).invoiceCount,0);
const zero=run([event('INVOICE_ISSUED','invoice-z',700),event('CREDIT_NOTE_ISSUED','invoice-z',700)]);
assert.equal(zero.invoices[0].status,'CREDITED_ZERO');
function denied(events,pattern,options=scope){assert.throws(()=>reconcile({...options,events}),pattern);}
denied([p1],/candidate_invoice_not_found/);
denied([i1,i1],/candidate_duplicate_event/);
denied([i1,event('INVOICE_ISSUED','invoice-1',50)],/candidate_duplicate_invoice/);
denied([i1,event('CREDIT_NOTE_ISSUED','invoice-1',10001)],/candidate_credit_exceeds_invoice/);
denied([i1,{...p1,organisationId:'organisation-B'}],/candidate_cross_scope/);
denied([i1,{...p1,currency:'USD'}],/candidate_cross_currency/);
denied([i1,{...p1,amountMinor:-1}],/candidate_amount_invalid/);
denied([i1,{...p1,amountMinor:0}],/candidate_amount_invalid/);
denied([i1,{...p1,amountMinor:1.1}],/candidate_amount_invalid/);
denied([i1,{...p1,amountMinor:'3000'}],/candidate_amount_invalid/);
denied([i1,{...p1,occurredAt:'2026-10-13T15:29:00Z'}],/candidate_event_out_of_order/);
denied([i1,{...r1,paymentEventId:'not-a-payment'}],/candidate_payment_reference_invalid/);
denied([i1,p1,{...r1,paymentEventId:p3.eventId}],/candidate_payment_reference_invalid/);
denied([i1,p1,{...r1,amountMinor:3001}],/candidate_refund_exceeds_payment/);
denied([i1,p1,{...r1,invoiceId:'invoice-2'}],/candidate_invoice_not_found/);
denied([i1,p1,{...r1,amountMinor:2000},event('REFUND_SETTLED','invoice-1',1001,{paymentEventId:p1.eventId})],/candidate_refund_exceeds_payment/);
denied([i1,{...p1,eventId:i1.eventId}],/candidate_duplicate_event/);
denied([i1,{...p1,eventKey:i1.eventKey}],/candidate_duplicate_event/);
denied([i1,{...p1,occurredAt:'yesterday'}],/candidate_time_invalid/);
denied([i1,{...p1,payerId:'payer-B'}],/candidate_cross_scope/);
assert.throws(()=>reconcile(null),/candidate_input_invalid/);
assert.throws(()=>reconcile({...scope,events:{}}),/candidate_input_invalid/);
assert.throws(()=>reconcile({...scope,currency:'RUBLE',events:[]}),/candidate_currency_invalid/);
console.log(JSON.stringify({event:'mfw_candidate_reconciliation_contract',status:'pass',
 cases:'partial,credit-after-settlement,refund,overpayment,duplicate,scope,currency',
 recognition:'not-supported',bankVerification:'not-supported',persistence:'none'}));
