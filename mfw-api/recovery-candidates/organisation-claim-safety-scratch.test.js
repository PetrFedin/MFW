'use strict';
// Never connect to production. The database mfw_original_ci is created by
// original-git-replay.test.js in the disposable GitHub Actions PostgreSQL 17.
const assert=require('node:assert/strict');
const {Pool}=require('pg');
const {OrganisationRegistry}=require('../organisation-registry');

const url=new URL(process.env.DATABASE_URL||'postgresql://invalid');
for(const [k,v] of Object.entries({
  protocol:'postgresql:',hostname:'127.0.0.1',port:'5432',
  username:'mfw_ci',password:'mfw_ci_local_only',pathname:'/mfw_scratch_ci'
}))assert.equal(url[k],v,'non_scratch_database_forbidden_'+k);
assert.equal(process.env.GITHUB_ACTIONS,'true');
assert.equal(process.env.CI,'true');
assert.equal(process.env.MFW_ISOLATED_PG_CI,'true');
url.pathname='/mfw_original_ci';

const U1='a1000000-0000-4000-8000-000000000001';
const U2='a1000000-0000-4000-8000-000000000002';
const U3='a1000000-0000-4000-8000-000000000003';
const claim={name:'MFW Scratch Credential Atelier',organisationType:'brand',
  relationshipRole:'representative'};
async function main(){
  const pool=new Pool({connectionString:url.toString(),max:4});
  try{
    const version=await pool.query("SELECT current_setting('server_version_num') AS version");
    assert.equal(Math.floor(Number(version.rows[0].version)/10000),17);
    const migrations=await pool.query("SELECT COUNT(*)::integer AS n FROM public.schema_migrations");
    assert.equal(migrations.rows[0].n,27,'run original Git replay before claim tests');
    await pool.query("INSERT INTO public.users(id,status) VALUES ($1,'active'),($2,'active'),($3,'active')",
      [U1,U2,U3]);
    const registry=new OrganisationRegistry({pool});

    const first=await registry.claimForUser(U1,claim);
    const orgId=first.id;
    assert.equal(first.relationship.source,'self_claim');
    assert.equal(first.relationship.status,'active');
    assert.equal(await registry.canRepresent(U1,orgId),false,
      'unverified self-claim cannot produce signed organisation credential');

    // Independently verifying the organisation does NOT verify its claimants.
    await pool.query("UPDATE public.professional_organisations SET verification_status='verified' WHERE id=$1",[orgId]);
    assert.equal(await registry.canRepresent(U1,orgId),false);

    // Simulate a reviewed relationship on this disposable fixture only.
    await pool.query("UPDATE public.professional_organisation_memberships SET source='operator_verified' WHERE organisation_id=$1 AND user_id=$2",[orgId,U1]);
    assert.equal(await registry.canRepresent(U1,orgId),true);
    await assert.rejects(registry.claimForUser(U1,{...claim,relationshipRole:'owner'}),
      /organisation_membership_review_required/,
      'public self-claim must not replace an operator-approved relationship');
    let member=await pool.query("SELECT source,status,relationship_role,ended_at FROM public.professional_organisation_memberships WHERE organisation_id=$1 AND user_id=$2",[orgId,U1]);
    assert.equal(member.rows[0].source,'operator_verified');
    assert.equal(member.rows[0].status,'active');
    assert.equal(member.rows[0].relationship_role,'representative');

    // Operator revocation must survive a forged repeat claim; SQL WHERE
    // is evaluated under the ON CONFLICT row lock.
    await pool.query("UPDATE public.professional_organisation_memberships SET status='revoked',ended_at=now() WHERE organisation_id=$1 AND user_id=$2",[orgId,U1]);
    assert.equal(await registry.canRepresent(U1,orgId),false);
    await assert.rejects(registry.claimForUser(U1,claim),
      /organisation_membership_review_required/);
    member=await pool.query("SELECT source,status,ended_at FROM public.professional_organisation_memberships WHERE organisation_id=$1 AND user_id=$2",[orgId,U1]);
    assert.equal(member.rows[0].source,'operator_verified');
    assert.equal(member.rows[0].status,'revoked');
    assert(member.rows[0].ended_at);

    const second=await registry.claimForUser(U2,claim);
    assert.equal(second.id,orgId);
    assert.equal(second.relationship.source,'self_claim');
    assert.equal(await registry.canRepresent(U2,orgId),false);
    const resubmit=await registry.claimForUser(U2,{...claim,relationshipRole:'buyer'});
    assert.equal(resubmit.relationship.source,'self_claim');
    assert.equal(resubmit.relationship.relationshipRole,'buyer');
    assert.equal(await registry.canRepresent(U2,orgId),false);
    await pool.query("UPDATE public.professional_organisation_memberships SET status='revoked' WHERE organisation_id=$1 AND user_id=$2",[orgId,U2]);
    await assert.rejects(registry.claimForUser(U2,claim),
      /organisation_membership_review_required/);
    const inactive=await pool.query("SELECT status FROM public.professional_organisation_memberships WHERE organisation_id=$1 AND user_id=$2",[orgId,U2]);
    assert.equal(inactive.rows[0].status,'revoked');

    // Suspended company cannot receive new representation claims.
    await pool.query("UPDATE public.professional_organisations SET status='suspended' WHERE id=$1",[orgId]);
    await assert.rejects(registry.claimForUser(U3,claim),/organisation_inactive/);
    const nonmember=await pool.query("SELECT COUNT(*)::integer AS n FROM public.professional_organisation_memberships WHERE organisation_id=$1 AND user_id=$2",[orgId,U3]);
    assert.equal(nonmember.rows[0].n,0);
    await pool.query("UPDATE public.professional_organisation_memberships SET status='active',ended_at=NULL WHERE organisation_id=$1 AND user_id=$2",[orgId,U1]);
    assert.equal(await registry.canRepresent(U1,orgId),false,'suspended organisation cannot issue proof');
    await pool.query("UPDATE public.professional_organisations SET status='active',verification_status='expired' WHERE id=$1",[orgId]);
    assert.equal(await registry.canRepresent(U1,orgId),false,'expired verification cannot issue proof');
    await pool.query("UPDATE public.professional_organisations SET verification_status='verified' WHERE id=$1",[orgId]);
    assert.equal(await registry.canRepresent(U1,orgId),true);

    console.log(JSON.stringify({
      gate:'mfw_organisation_claim_privilege_safety_pg17',status:'pass',
      originalGitSchema:27,unreviewedClaimsDenied:true,
      revokedMembershipCannotSelfRestore:true,
      verifiedCompanyDoesNotVerifyClaimants:true,
      operatorApprovalRequired:true,suspendedCompanyDenied:true,
      expiredCompanyDenied:true,database:'disposable_pg17',
      credentialsIssued:0,productionAdmitted:false
    }));
  }finally{await pool.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
