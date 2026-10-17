'use strict';
const assert=require('node:assert/strict');
const {VERSION,createIdentityBoundary}=require('./commercial-identity-boundary');
const issuer='https://mfw-test.supabase.co/auth/v1';
const subject='11111111-1111-4111-8111-111111111111';
const session='22222222-2222-4222-8222-222222222222';
const clock=1790000000;
const claims={
 iss:issuer,aud:'authenticated',role:'authenticated',sub:subject,
 session_id:session,is_anonymous:false,aal:'aal1',
 iat:clock-60,exp:clock+3600,
 user_metadata:{organisationId:'org-b',role:'settlement_verifier'},
 app_metadata:{organisationId:'org-b',role:'settlement_verifier'}
};
const request={accessToken:'synthetic-test-token',organisationId:'org-a',eventType:'PILOT_ACCEPTED'};
const verifiedToken=async()=>({data:{claims},error:null});
const freshMembership=async()=>({subject,organisationId:'org-a',role:'partner_admin',status:'active'});
const activeSession=async()=>({subject,sessionId:session,active:true});
const gateway=overrides=>createIdentityBoundary({
 issuer,nowSeconds:()=>clock,
 getClaims:verifiedToken,lookupMembership:freshMembership,verifySession:activeSession,
 ...overrides
});
const jwtWith=patch=>async()=>({data:{claims:{...claims,...patch}},error:null});
async function fail(call,reason){await assert.rejects(call,err=>err.code===reason);}
async function main(){
 const who=await gateway()(request);
 assert.equal(who.verificationContract,VERSION);
 assert.equal(who.subject,subject);
 assert.equal(who.organisationId,'org-a');
 assert.equal(who.role,'partner_admin');
 assert.equal(who.trustedServerContext,true);
 assert.equal(who.verifiedByServer,true);
 assert.equal(who.aal,'aal1');
 assert.equal(Object.isFrozen(who),true);
 assert.equal(who.user_metadata,undefined);
 await fail(gateway()({...request,eventType:'PAYMENT_SETTLED'}),'event_role_forbidden');
 await fail(gateway()({...request,organisationId:'org-b'}),'active_membership_required');
 await fail(gateway()({...request,accessToken:''}),'invalid_auth_request');
 await fail(gateway()({...request,eventType:'UNKNOWN'}),'invalid_auth_request');
 for(const changes of [
   {iss:'https://other-issuer.test'},{aud:'anon'},
   {role:'service_role'},{iat:clock+1},{exp:clock-1},
   {nbf:clock+1},{session_id:'not-a-session'},
   {is_anonymous:true},{aal:'aal0'},{sub:'unknown'}
 ]){
   await fail(gateway({getClaims:jwtWith(changes)})(request),'invalid_or_expired_claims');
 }
 await fail(gateway({getClaims:async()=>({data:{claims:null}})})(request),'verified_jwt_required');
 await fail(gateway({getClaims:async()=>{throw Error('verification_unavailable');}})(request),'verified_jwt_required');
 await fail(gateway({verifySession:async()=>({subject,sessionId:session,active:false})})(request),'active_session_required');
 await fail(gateway({verifySession:async()=>{throw Error('session_store_unavailable');}})(request),'active_session_required');
 await fail(gateway({lookupMembership:async()=>({subject,organisationId:'org-a',role:'partner_admin',status:'disabled'})})(request),'active_membership_required');
 await fail(gateway({lookupMembership:async()=>({subject,organisationId:'org-b',role:'partner_admin',status:'active'})})(request),'active_membership_required');
 await fail(gateway({lookupMembership:async()=>{throw Error('membership_store_offline');}})(request),'active_membership_required');
 const finance=async()=>({subject,organisationId:'org-a',role:'finance_reviewer',status:'active'});
 await fail(gateway({lookupMembership:finance})({...request,eventType:'FINANCE_REVIEWED'}),'finance_stepup_required');
 const reviewer=await gateway({
   lookupMembership:finance,getClaims:jwtWith({aal:'aal2'})
 })({...request,eventType:'FINANCE_REVIEWED'});
 assert.equal(reviewer.role,'finance_reviewer');
 assert.equal(reviewer.aal,'aal2');
 const forged=await gateway({getClaims:jwtWith({
   user_metadata:{organisationId:'org-b',role:'finance_reviewer'},
   app_metadata:{organisationId:'org-b',role:'finance_reviewer'}
 })})(request);
 assert.equal(forged.role,'partner_admin');
 assert.equal(forged.organisationId,'org-a');
 assert.throws(()=>createIdentityBoundary(),/trusted_identity_dependencies_required/);
 console.log(JSON.stringify({event:'mfw_commercial_identity_contract',status:'pass',
  coverage:'verified-claims,tenant-membership,session-revocation,role,MFA,metadata-spoof',
  signatureTesting:'not_performed',liveAuth:'not_connected',productionAdmitted:false}));
}
main().catch(err=>{console.error(err);process.exitCode=1;});
