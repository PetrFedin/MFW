const assert=require('assert');
const {OrganisationRegistry,normalizeOrganisationName,validateClaim}=require('./organisation-registry');

(async()=>{
  assert.equal(normalizeOrganisationName('  Maison   Test  '),'maison test');
  assert.equal(validateClaim({name:'Maison Test',organisationType:'brand'}).organisationType,'brand');
  assert.throws(()=>validateClaim({name:'X',organisationType:'brand'}),/organisation_name_invalid/);
  const memory=new Map();
  const registry=new OrganisationRegistry({memory});
  const first=await registry.claimForUser('user-1',{name:'Maison Test',organisationType:'brand',countryCode:'FR',city:'Paris',relationshipRole:'representative'});
  const second=await registry.claimForUser('user-2',{name:'  Maison Test  ',organisationType:'brand'});
  assert.equal(first.id,second.id,'normalized identity must collapse duplicate claims');
  assert.equal(first.verificationStatus,'unverified','self claim must never self-verify');
  const list=await registry.list({limit:10});
  assert.equal(list.length,1);
  assert.equal(list[0].activeRepresentativeCount,2);
  const detail=await registry.get(first.id);
  assert.equal(detail.name,'Maison Test');
  console.log('organisation-registry contract PASS');
})().catch(err=>{console.error(err);process.exitCode=1;});
