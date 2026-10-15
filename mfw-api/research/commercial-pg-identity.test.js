'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Pool}=require('pg');
const {createPostgresResearchIdentityBoundary}=require('./commercial-pg-identity-adapter');
const subject='11111111-1111-4111-8111-111111111111';
const sid='22222222-2222-4222-8222-222222222222';
const app='55555555-5555-4555-8555-555555555555';
const reviewer='99999999-9999-4999-8999-999999999999';
const org='77777777-7777-4777-8777-777777777777';
const other='88888888-8888-4888-8888-888888888888';
const issuer='https://identity-ci.supabase.co/auth/v1';
const now=Math.floor(Date.now()/1000);
const jwt={iss:issuer,aud:'authenticated',role:'authenticated',sub:subject,
 session_id:sid,is_anonymous:false,aal:'aal1',iat:now-60,exp:now+1800,
 user_metadata:{role:'finance_reviewer',organisationId:other},
 app_metadata:{role:'finance_reviewer',organisationId:other}};
const auth={getClaims:async()=>({data:{claims:jwt},error:null})};
const request=(id=org,type='PILOT_ACCEPTED')=>({accessToken:'test-token',
 organisationId:id,eventType:type});
async function deny(f,code){await assert.rejects(f,err=>err.code===code);}
async function main(){
 const db=process.env.DATABASE_URL||'';
 const url=new URL(db);
 assert.equal(process.env.GITHUB_ACTIONS,'true');
 assert.equal(process.env.MFW_COMMERCIAL_SCRATCH,'true');
 assert.equal(url.hostname,'127.0.0.1');
 assert.equal(url.port,'5432');
 assert.equal(url.pathname,'/mfw_commercial_ci');
 const pool=new Pool({connectionString:db,max:4});
 try{
  const pg=await pool.query("SELECT current_setting('server_version_num') AS n");
  assert.equal(Math.floor(Number(pg.rows[0].n)/10000),17);
  await pool.query(fs.readFileSync(path.join(__dirname,'commercial-identity-pg-scratch.sql'),'utf8'));
  await pool.query('INSERT INTO auth.users(id) VALUES($1)',[subject]);
  await pool.query('INSERT INTO auth.sessions(id,user_id,aal) VALUES($1,$2,$3)',[sid,subject,'aal1']);
  await pool.query("INSERT INTO public.users(id,status) VALUES($1,'active'),($2,'active')",[app,reviewer]);
  await pool.query("INSERT INTO public.professional_organisations(id,status,verification_status) VALUES($1,'active','verified'),($2,'active','verified')",[org,other]);
  await pool.query("INSERT INTO public.professional_organisation_memberships(organisation_id,user_id,status,source) VALUES($1,$2,'active','operator_verified'),($3,$2,'active','self_claim')",[org,app,other]);
  await pool.query("INSERT INTO ci_commercial_auth.subject_links(auth_subject,app_user_id,issuer,status,reviewed_by,proof_ref) VALUES($1,$2,$3,'operator_verified',$4,'operator:verified-link')",[subject,app,issuer,reviewer]);
  await pool.query("INSERT INTO ci_commercial_auth.role_grants(organisation_id,app_user_id,role,status,source,approved_by,evidence_ref) VALUES($1,$2,'partner_admin','active','operator_approved',$3,'reviewed:evidence-1'),($4,$2,'partner_admin','active','operator_approved',$3,'reviewed:evidence-2')",[org,app,reviewer,other]);
  const gate=createPostgresResearchIdentityBoundary({pool,auth,issuer});
  const result=await gate(request());
  assert.equal(result.organisationId,org);
  assert.equal(result.role,'partner_admin');
  assert.equal(result.financeAuthorityApproved,undefined);
  await deny(gate(request(other)),'active_membership_required');
  const mutations=[
   ["UPDATE auth.sessions SET not_after=now()-interval '1 minute' WHERE id=$1",[sid],
    "UPDATE auth.sessions SET not_after=NULL WHERE id=$1",[sid],'active_session_required'],
   ["UPDATE auth.sessions SET aal='aal2' WHERE id=$1",[sid],
    "UPDATE auth.sessions SET aal='aal1' WHERE id=$1",[sid],'active_session_required'],
   ["UPDATE auth.users SET deleted_at=now() WHERE id=$1",[subject],
    "UPDATE auth.users SET deleted_at=NULL WHERE id=$1",[subject],'active_session_required'],
   ["UPDATE auth.users SET is_anonymous=true WHERE id=$1",[subject],
    "UPDATE auth.users SET is_anonymous=false WHERE id=$1",[subject],'active_session_required'],
   ["UPDATE public.users SET status='blocked' WHERE id=$1",[app],
    "UPDATE public.users SET status='active' WHERE id=$1",[app],'active_session_required'],
   ["UPDATE ci_commercial_auth.subject_links SET status='revoked' WHERE auth_subject=$1",[subject],
    "UPDATE ci_commercial_auth.subject_links SET status='operator_verified' WHERE auth_subject=$1",[subject],'active_session_required'],
   ["UPDATE public.professional_organisation_memberships SET source='self_claim' WHERE organisation_id=$1",[org],
    "UPDATE public.professional_organisation_memberships SET source='operator_verified' WHERE organisation_id=$1",[org],'active_membership_required'],
   ["UPDATE public.professional_organisation_memberships SET status='revoked' WHERE organisation_id=$1",[org],
    "UPDATE public.professional_organisation_memberships SET status='active' WHERE organisation_id=$1",[org],'active_membership_required'],
   ["UPDATE public.professional_organisations SET verification_status='expired' WHERE id=$1",[org],
    "UPDATE public.professional_organisations SET verification_status='verified' WHERE id=$1",[org],'active_membership_required'],
   ["UPDATE public.professional_organisations SET status='suspended' WHERE id=$1",[org],
    "UPDATE public.professional_organisations SET status='active' WHERE id=$1",[org],'active_membership_required'],
   ["UPDATE ci_commercial_auth.role_grants SET status='revoked' WHERE organisation_id=$1",[org],
    "UPDATE ci_commercial_auth.role_grants SET status='active' WHERE organisation_id=$1",[org],'active_membership_required'],
   ["UPDATE ci_commercial_auth.role_grants SET expires_at=now()-interval '1 minute' WHERE organisation_id=$1",[org],
    "UPDATE ci_commercial_auth.role_grants SET expires_at=NULL WHERE organisation_id=$1",[org],'active_membership_required'],
   ["UPDATE public.users SET status='blocked' WHERE id=$1",[reviewer],
    "UPDATE public.users SET status='active' WHERE id=$1",[reviewer],'active_membership_required']
  ];
  for(const [sql,params,revert,code] of mutations){
   await pool.query(sql,params);
   try{await deny(gate(request()),code);}
   finally{await pool.query(revert,params);}
  }
  await assert.rejects(pool.query('UPDATE ci_commercial_auth.role_grants SET approved_by=$1 WHERE organisation_id=$2',[app,org]),e=>e.code==='23514');
  await assert.rejects(pool.query('UPDATE ci_commercial_auth.subject_links SET reviewed_by=$1 WHERE auth_subject=$2',[app,subject]),e=>e.code==='23514');
  await assert.rejects(pool.query("UPDATE ci_commercial_auth.role_grants SET source='self_claim' WHERE organisation_id=$1",[org]),e=>e.code==='23514');
  await pool.query('CREATE ROLE ci_commercial_untrusted NOLOGIN');
  const guest=await pool.connect();
  try{
   await guest.query('SET ROLE ci_commercial_untrusted');
   await assert.rejects(guest.query('SELECT * FROM auth.sessions'),e=>e.code==='42501');
   await assert.rejects(guest.query('SELECT * FROM ci_commercial_auth.role_grants'),e=>e.code==='42501');
  }finally{await guest.query('RESET ROLE');guest.release();}
  await pool.query("UPDATE ci_commercial_auth.role_grants SET role='finance_reviewer' WHERE organisation_id=$1",[org]);
  await deny(gate(request(org,'FINANCE_REVIEWED')),'finance_stepup_required');
  const strongAuth={getClaims:async()=>({data:{claims:{...jwt,aal:'aal2'}},error:null})};
  const strong=createPostgresResearchIdentityBoundary({pool,auth:strongAuth,issuer});
  await deny(strong(request(org,'FINANCE_REVIEWED')),'active_session_required');
  await pool.query("UPDATE auth.sessions SET aal='aal2' WHERE id=$1",[sid]);
  const reviewerActor=await strong(request(org,'FINANCE_REVIEWED'));
  assert.equal(reviewerActor.role,'finance_reviewer');
  assert.equal(reviewerActor.financeAuthorityApproved,undefined);
  await pool.query("UPDATE auth.sessions SET aal='aal1' WHERE id=$1",[sid]);
  const identities=await pool.query("SELECT count(*)::int AS count FROM ci_commercial_auth.role_grants");
  assert.equal(identities.rows[0].count,2);
  console.log(JSON.stringify({event:'research_postgres_identity',status:'pass',
   reviewedLink:true,selfClaimBlocked:true,negativeRevocations:mutations.length,
   ownerCannotSelfApprove:true,financeRequiresAal2:true,realHostedAuth:false,
   productionAdmitted:false,realFinance:false}));
 }finally{await pool.end();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
