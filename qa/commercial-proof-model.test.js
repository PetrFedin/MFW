'use strict';
const assert=require('node:assert/strict');
const commercial=require('../mfw/platform/commercial-proof-model.js');

assert.equal(commercial.version,'mfw-commercial-proof-ladder-v1');
const zero=commercial.scenario(commercial.defaults);
assert.equal(zero.truthClass,'MODELLED');
assert.equal(zero.admitted,false);
assert.equal(zero.monthly.potentialCommercialValue,0);
assert.equal(zero.actual.recognisedRevenue,null);
assert.equal(zero.breakEvenBrands,null);
assert.equal(zero.actual.collectedCash,null);
assert.equal(zero.actual.auditedArr,null);
assert.equal(zero.horizon.months,12);

const scenario=commercial.scenario({
  paidBrands:10,brandMonthlyFee:1000,brandServiceCost:200,
  partnerPackages:2,packageMonthlyFee:2500,packageServiceCost:500,
  fixedMonthlyCost:5000,horizonMonths:12
});
assert.equal(scenario.monthly.potentialCommercialValue,15000);
assert.equal(scenario.monthly.variableCost,3000);
assert.equal(scenario.monthly.contribution,12000);
assert.equal(scenario.monthly.operatingResult,7000);
assert.equal(scenario.monthly.contributionMarginPct,80);
assert.equal(scenario.horizon.potentialCommercialValue,180000);
assert.equal(scenario.horizon.operatingResult,84000);
assert.equal(scenario.breakEvenBrands,2); // (5000 - (5000 - 1000)) / (1000 - 200) rounded up
assert.equal(scenario.actual.recognisedRevenue,null);

const deficit=commercial.scenario({...commercial.defaults,paidBrands:3,brandMonthlyFee:1000,brandServiceCost:1500,fixedMonthlyCost:2000});
assert.equal(deficit.monthly.operatingResult,-3500);
assert.equal(deficit.breakEvenBrands,null);
const partnerCover=commercial.scenario({...commercial.defaults,partnerPackages:1,packageMonthlyFee:3000,packageServiceCost:1000,fixedMonthlyCost:1000});
assert.equal(partnerCover.breakEvenBrands,0);
const decimals=commercial.scenario({...commercial.defaults,paidBrands:3,brandMonthlyFee:1.11,brandServiceCost:0.11,horizonMonths:1});
assert.equal(decimals.monthly.potentialCommercialValue,3.33);
assert.equal(decimals.monthly.contribution,3);
for(const data of [
 {...commercial.defaults,paidBrands:-1},
 {...commercial.defaults,paidBrands:2.5},
 {...commercial.defaults,paidBrands:'1e6'},
 {...commercial.defaults,paidBrands:'bad'},
 {...commercial.defaults,brandMonthlyFee:'0.001'},
 {...commercial.defaults,brandMonthlyFee:Infinity},
 {...commercial.defaults,brandServiceCost:-1},
 {...commercial.defaults,horizonMonths:0},
 {...commercial.defaults,horizonMonths:37},
 {...commercial.defaults,partnerPackages:100001}
]) assert.throws(()=>commercial.scenario(data),/invalid_assumption:/);
assert.throws(()=>commercial.scenario(null),/assumptions_object_required/);

const absent=commercial.auditEvidence();
assert.equal(absent.missing.length,8);
assert.equal(absent.readyForFinanceReview,false);
assert.equal(absent.productionRecognised,false);
assert.equal(absent.recognisedRevenue,null);
assert.equal(absent.cashCollected,null);
const admissible={authorityAdmitted:true,truthClass:'VERIFIED',sourceClass:'canonical_authority',
  evidenceRef:'auth://contract/id-001',issuerRef:'org://authority',occurredAt:'2026-10-13T00:00:00Z'};
const clientOnly={...admissible,sourceClass:'self_reported'};
assert.equal(commercial.hasAdmittedEvidence(clientOnly),false);
assert.equal(commercial.hasAdmittedEvidence(admissible),false,'self-declared server provenance is not authentication');
assert.equal(commercial.hasAdmittedEvidence({...admissible,authorityAdmitted:false}),false);
assert.equal(commercial.hasAdmittedEvidence({...admissible,occurredAt:'yesterday'}),false);
const half=commercial.auditEvidence({contract:admissible,delivery:clientOnly,invoice:admissible,payment:admissible});
assert.equal(half.readyForFinanceReview,false);
assert.equal(half.missing.includes('delivery'),true);
const complete=commercial.auditEvidence(Object.fromEntries(commercial.evidenceStages.map(x=>[x.id,admissible])));
assert.equal(complete.readyForFinanceReview,false);
assert.equal(complete.missing.length,8);
assert.equal(complete.productionRecognised,false);
assert.equal(complete.recognisedRevenue,null);
assert.equal(complete.cashCollected,null);

// Finance recognition must not depend mechanically on invoice issuance or cash payment.
const fs=require('node:fs');
const path=require('node:path');
const investorSource=fs.readFileSync(path.join(__dirname,'../mfw/platform/investor-proof-model.js'),'utf8');
assert.equal(investorSource.includes("revenueGate:'Recognised revenue'"),false);
assert.equal(investorSource.includes('billing/payment evidence'),false);
assert.equal(investorSource.includes('счёт и оплата отдельно'),true);

const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../mfw/platform/evidence-package.json'),'utf8'));
const claim=manifest.claims.find(row=>row.id==='commercial_proof_ladder_v1');
assert.ok(claim,'commercial_proof_claim_missing');
assert.equal(claim.status,'implemented_preview');
assert.equal(claim.evidenceClass,'modelled');
assert.equal(claim.productionAdmission,'blocked');
assert.equal(claim.dataOrigin,'browser_assumptions_only');
console.log(JSON.stringify({event:'mfw_commercial_proof_contract',status:'pass',assertions:'no-fake-kpi,money-precision,break-even,input-validation,evidence-provenance,no-client-recognition'}));
