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
  assert.equal(Object.hasOwn(list[0],'relationship'),false,'public registry cannot expose private membership');
  assert.deepEqual(await registry.forUser('stranger'),[],'public name matching never establishes representation');
  assert.equal((await registry.forUser('user-1'))[0].representationVerified,false);
  assert.equal((await registry.forUser('user-1'))[0].relationship.source,'self_claim');
  assert.equal((await registry.forUser('user-2'))[0].relationship.source,'self_claim');
  await assert.rejects(registry.forUser(null),/session_required/);
  const detail=await registry.get(first.id);
  assert.equal(detail.name,'Maison Test');

  // An unreviewed self-claim is NEVER a right to an organisation credential.
  assert.equal(await registry.canRepresent('user-1',first.id),false);
  const stored=memory.get(first.id);
  stored.verificationStatus='verified';
  assert.equal(await registry.canRepresent('user-1',first.id),false,
    'organisation verified does not verify arbitrary membership');

  // An independently operator-reviewed representation can obtain a credential,
  // but a subsequent public claim cannot downgrade its provenance.
  stored.members.get('user-1').source='operator_verified';
  assert.equal(await registry.canRepresent('user-1',first.id),true);
  assert.equal((await registry.forUser('user-1'))[0].representationVerified,true);
  await assert.rejects(()=>registry.claimForUser('user-1',{
    name:'Maison Test',relationshipRole:'owner'
  }),/organisation_membership_review_required/);
  assert.equal(stored.members.get('user-1').source,'operator_verified');
  assert.equal(stored.members.get('user-1').relationshipRole,'representative');

  // An operator-revoked membership remains revoked even after a new self-claim.
  stored.members.get('user-1').status='revoked';
  stored.members.get('user-1').endedAt=new Date().toISOString();
  assert.equal(await registry.canRepresent('user-1',first.id),false);
  await assert.rejects(()=>registry.claimForUser('user-1',{name:'Maison Test'}),
    /organisation_membership_review_required/);
  assert.equal(stored.members.get('user-1').status,'revoked');
  assert.equal((await registry.list({limit:10}))[0].activeRepresentativeCount,1);
  assert.equal((await registry.summary()).activeRepresentatives,1);
  assert.deepEqual(await registry.forUser('user-1'),[],'revoked membership hidden from My Organisations');

  // Ordinary repeated active self-claims remain allowed, but cannot become
  // signed-credential permissions without operator-reviewed membership.
  await registry.claimForUser('user-2',{name:'Maison Test',relationshipRole:'buyer'});
  assert.equal(stored.members.get('user-2').source,'self_claim');
  assert.equal(await registry.canRepresent('user-2',first.id),false);
  stored.members.get('user-2').status='revoked';
  assert.equal((await registry.list({limit:10}))[0].activeRepresentativeCount,0);
  assert.equal((await registry.summary()).activeRepresentatives,0);
  await assert.rejects(()=>registry.claimForUser('user-2',{name:'Maison Test'}),
    /organisation_membership_review_required/);

  // Suspended and no-longer-verified organisations have no active signer path.
  stored.status='suspended';
  assert.deepEqual(await registry.forUser('user-2'),[],'suspended organisation not returned');
  await assert.rejects(()=>registry.claimForUser('user-3',{name:'Maison Test'}),
    /organisation_inactive/);
  assert.equal(stored.members.has('user-3'),false);
  stored.status='active';
  stored.verificationStatus='expired';
  stored.members.get('user-1').status='active';
  stored.members.get('user-1').endedAt=null;
  assert.equal(await registry.canRepresent('user-1',first.id),false);
  assert.equal((await registry.forUser('user-1'))[0].representationVerified,false);
  assert.deepEqual(await registry.forUser('user-2'),[]);
  console.log('organisation-registry contract PASS');
})().catch(err=>{console.error(err);process.exitCode=1;});
