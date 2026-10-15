'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const evidence=JSON.parse(fs.readFileSync(path.join(root,'mfw/platform/evidence-package.json'),'utf8'));
assert.equal(evidence.generatedFor,'demo');
assert.equal(evidence.verificationBoundary.runtimeAdmission,'blocked');
assert.equal(evidence.verificationBoundary.trustedCommercialSource,null);
assert.equal(evidence.verificationBoundary.stateClaimScope,'source-artifact-and-preview-presence-only');
assert(evidence.verificationBoundary.interpretationOfObserved.includes('does not establish verified attendee activity'));
const facts=evidence.verificationBoundary.actualCommercialMetrics;
for(const key of ['recognisedRevenue','bankVerifiedCash','auditedARR','verifiedSponsorSettlement']){
 assert(Object.prototype.hasOwnProperty.call(facts,key));
 assert.equal(facts[key],null,key+' must not become a synthetic reported actual');
}
const allowedStatus=new Set([
 'implemented','implemented_demo','preview_only','modelled','boundary_recorded','not_claimed',
 'implemented_preview','implemented_not_production_admitted','implemented_not_run_against_production'
]);
const allowedClasses=new Set(['observed','not_evidenced','modelled','synthetic']);
assert(Array.isArray(evidence.claims)&&evidence.claims.length>=30);
const seen=new Set();
for(const item of evidence.claims){
 assert(/^[a-z][a-z0-9_]*$/.test(item.id));
 assert(!seen.has(item.id),'duplicate evidence claim '+item.id);
 seen.add(item.id);
 assert(allowedStatus.has(item.status),'unreviewed status '+item.status);
 assert(allowedClasses.has(item.evidenceClass),'unreviewed truth class '+item.id);
 assert(item.claim.length>20,'claim lacks rationale '+item.id);
 assert(Array.isArray(item.evidence)&&item.evidence.length>0);
 for(const source of item.evidence){
   assert(!path.isAbsolute(source)&&!source.includes('..'),'unsafe source reference');
   assert(fs.existsSync(path.join(root,source)),'missing source artifact '+source);
 }
}
assert.equal(evidence.claims.find(x=>x.id==='production_postgres')?.status,'not_claimed');
for(const claimId of ['revenue_architecture','economics_dashboard','investment_committee_workspace']){
 const item=evidence.claims.find(x=>x.id===claimId);
 assert(item,'missing finance disclosure '+claimId);
 assert.equal(item.evidenceClass,'modelled');
}
assert.equal(evidence.claims.find(x=>x.id==='deal_room')?.evidenceClass,'not_evidenced');
console.log(JSON.stringify({event:'mfw_investor_evidence_truth_contract',status:'pass',
 claims:evidence.claims.length,sourceMeaning:'code_only',commercialActuals:'null',
 productionAdmitted:false}));
