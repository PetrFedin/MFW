const crypto=require('crypto');

class OrganisationCredentialAuthority{
  constructor({registry,privateKey,publicKey,keyConfigured=false,keyId='mfw-org-authority-v1',issuerId='mfw-platform',pool=null,memory=null}={}){
    this.registry=registry;this.privateKey=privateKey;this.publicKey=publicKey;this.keyConfigured=!!keyConfigured;
    this.keyId=keyId;this.issuerId=issuerId;this.pool=pool;this.memory=memory||new Map();
  }

  async issue(organisationId){
    if(!this.keyConfigured)throw new Error('organisation_credential_issuer_not_configured');
    const proof=await this.registry.portableProof(organisationId);
    if(!proof)throw new Error('organisation_not_found');
    if(proof.organisation.verificationStatus!=='verified')throw new Error('organisation_not_verified');
    const payload={
      credentialVersion:'mfw-organisation-credential-v1',
      issuerId:this.issuerId,keyId:this.keyId,alg:'ES256',
      issuedAt:new Date().toISOString(),
      organisationId:proof.organisation.id,
      organisationVerificationStatus:proof.organisation.verificationStatus,
      portableProofSha256:proof.proofSha256
    };
    const signature=crypto.sign('sha256',canonicalBytes(payload),{key:this.privateKey,dsaEncoding:'ieee-p1363'});
    const envelope={payload,signature:b64u(signature)};
    return {...envelope,credentialSha256:sha256(envelope)};
  }

  async verify(envelope){
    if(!this.keyConfigured)return {status:'ISSUER_NOT_CONFIGURED',signatureValid:false,current:false,revoked:false};
    const signature=this.verifySignature(envelope);
    if(!signature.valid)return {status:signature.reason==='envelope_hash_mismatch'?'INVALID_ENVELOPE_HASH':'INVALID_SIGNATURE',signatureValid:false,current:false,revoked:false,reason:signature.reason};
    const revocation=await this.revocation(envelope.credentialSha256);
    if(revocation)return {status:'REVOKED',signatureValid:true,current:false,revoked:true,revocation};
    const proof=await this.registry.portableProof(envelope.payload.organisationId);
    if(!proof||proof.organisation.verificationStatus!=='verified')return {status:'STALE',signatureValid:true,current:false,revoked:false,reason:'organisation_not_currently_verified'};
    if(proof.proofSha256!==envelope.payload.portableProofSha256)return {status:'STALE',signatureValid:true,current:false,revoked:false,currentPortableProofSha256:proof.proofSha256};
    return {status:'VALID',signatureValid:true,current:true,revoked:false,credentialSha256:envelope.credentialSha256,portableProofSha256:proof.proofSha256};
  }

  verifySignature(envelope){
    try{
      const payload=envelope&&envelope.payload,signature=envelope&&envelope.signature;
      if(!payload||payload.credentialVersion!=='mfw-organisation-credential-v1')return {valid:false,reason:'credential_version_mismatch'};
      if(payload.issuerId!==this.issuerId||payload.keyId!==this.keyId||payload.alg!=='ES256')return {valid:false,reason:'issuer_mismatch'};
      if(envelope.credentialSha256!==sha256({payload,signature}))return {valid:false,reason:'envelope_hash_mismatch'};
      const ok=crypto.verify('sha256',canonicalBytes(payload),{key:this.publicKey,dsaEncoding:'ieee-p1363'},ub64u(signature));
      return {valid:ok,reason:ok?null:'invalid_signature'};
    }catch(_){return {valid:false,reason:'invalid_signature'};}
  }

  async revoke(credentialSha256,organisationId,reason,revokedBy){
    if(!this.keyConfigured)throw new Error('organisation_credential_issuer_not_configured');
    credentialSha256=String(credentialSha256||'').toLowerCase();
    if(!/^[a-f0-9]{64}$/.test(credentialSha256))throw new Error('credential_sha256_invalid');
    reason=String(reason||'').trim();
    if(reason.length<3||reason.length>500)throw new Error('revocation_reason_invalid');
    if(this.pool){
      const r=await this.pool.query(`INSERT INTO professional_organisation_credential_revocations(credential_sha256,organisation_id,reason,revoked_by)
        VALUES($1,$2,$3,$4) ON CONFLICT(credential_sha256) DO NOTHING
        RETURNING credential_sha256 AS "credentialSha256",organisation_id AS "organisationId",reason,revoked_by AS "revokedBy",revoked_at AS "revokedAt"`,
        [credentialSha256,organisationId,reason,revokedBy]);
      if(r.rowCount)return r.rows[0];
      return this.revocation(credentialSha256);
    }
    const row={credentialSha256,organisationId,reason,revokedBy,revokedAt:new Date().toISOString()};
    if(!this.memory.has(credentialSha256))this.memory.set(credentialSha256,row);
    return this.memory.get(credentialSha256);
  }

  async revocation(credentialSha256){
    if(this.pool){
      const r=await this.pool.query(`SELECT credential_sha256 AS "credentialSha256",organisation_id AS "organisationId",
        reason,revoked_by AS "revokedBy",revoked_at AS "revokedAt"
        FROM professional_organisation_credential_revocations WHERE credential_sha256=$1`,[credentialSha256]);
      return r.rows[0]||null;
    }
    return this.memory.get(String(credentialSha256))||null;
  }
}
function stable(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(stable).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';}
function canonicalBytes(v){return Buffer.from(stable(v),'utf8');}
function sha256(v){return crypto.createHash('sha256').update(canonicalBytes(v)).digest('hex');}
function b64u(v){return Buffer.from(v).toString('base64url');}
function ub64u(v){return Buffer.from(String(v||''),'base64url');}
module.exports={OrganisationCredentialAuthority};
