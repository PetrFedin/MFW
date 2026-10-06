const assert=require('assert');
const crypto=require('crypto');
const {OrganisationCredentialAuthority}=require('./organisation-credential');

function authority({configured=true}={}){
  const {privateKey,publicKey}=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  let proofHash='a'.repeat(64);
  const registry={
    async portableProof(id){
      if(id!=='org-1')return null;
      return {
        schemaVersion:'mfw-organisation-participation-proof-v1',
        organisation:{id:'org-1',name:'Maison Test',organisationType:'brand',verificationStatus:'verified'},
        participation:[],
        summary:{participationRecords:0,eventBrands:[],crossEvent:false},
        proofSha256:proofHash
      };
    }
  };
  const memory=new Map();
  const service=new OrganisationCredentialAuthority({
    registry,privateKey,publicKey,keyConfigured:configured,
    keyId:'test-org-key',issuerId:'mfw-test',memory
  });
  return {service,setProofHash(v){proofHash=v;}};
}

(async()=>{
  const fx=authority();
  const credential=await fx.service.issue('org-1');
  assert.equal(credential.payload.organisationId,'org-1');
  assert.equal(credential.payload.portableProofSha256,'a'.repeat(64));
  assert.equal(credential.credentialSha256.length,64);

  const valid=await fx.service.verify(credential);
  assert.equal(valid.status,'VALID');
  assert.equal(valid.signatureValid,true);

  const tampered={...credential,payload:{...credential.payload,portableProofSha256:'c'.repeat(64)}};
  const bad=await fx.service.verify(tampered);
  assert.equal(bad.status,'INVALID_SIGNATURE');

  fx.setProofHash('b'.repeat(64));
  const stale=await fx.service.verify(credential);
  assert.equal(stale.status,'STALE');
  assert.equal(stale.currentPortableProofSha256,'b'.repeat(64));

  fx.setProofHash('a'.repeat(64));
  await fx.service.revoke(credential.credentialSha256,'org-1','Verification withdrawn','admin');
  const revoked=await fx.service.verify(credential);
  assert.equal(revoked.status,'REVOKED');

  const unconfigured=authority({configured:false}).service;
  await assert.rejects(()=>unconfigured.issue('org-1'),/organisation_credential_issuer_not_configured/);
  console.log('organisation credential authority PASS');
})().catch(err=>{console.error(err);process.exitCode=1;});
