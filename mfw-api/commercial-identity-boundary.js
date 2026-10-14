'use strict';

// NOT IN THE LIVE API. Builds scoped candidate actors only from a trusted
// Supabase getClaims verification and current server-owned membership/session
// checks; never from client JWT metadata or request-supplied role strings.
const {EVENT_ROLES}=require('./commercial-evidence-domain');
const VERSION='mfw-commercial-identity-boundary-v1';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STRONG_ROLES=new Set(['finance_operator','finance_reviewer','settlement_verifier']);
function deny(code){const e=new Error(code);e.code=code;throw e;}
function nonempty(x){return typeof x==='string'&&x.length>0&&x.length<=240&&x.trim()===x;}
function createIdentityBoundary({getClaims,lookupMembership,verifySession,issuer,nowSeconds=()=>Math.floor(Date.now()/1000)}={}){
 if(typeof getClaims!=='function'||typeof lookupMembership!=='function'||
    typeof verifySession!=='function'||typeof nowSeconds!=='function'||
    !nonempty(issuer)||!issuer.startsWith('https://'))
   deny('trusted_identity_dependencies_required');
 return async function authorise({accessToken,organisationId,eventType}={}){
   if(!nonempty(accessToken)||accessToken.length>10000||
      !nonempty(organisationId)||!Object.prototype.hasOwnProperty.call(EVENT_ROLES,eventType))
     deny('invalid_auth_request');
   let result;
   try{result=await getClaims(accessToken);}
   catch(_error){deny('verified_jwt_required');}
   if(!result||result.error||!result.data||!result.data.claims)
     deny('verified_jwt_required');
   const jwt=result.data.claims;
   const now=nowSeconds();
   const audOk=jwt.aud==='authenticated'||
     (Array.isArray(jwt.aud)&&jwt.aud.includes('authenticated'));
   if(!Number.isSafeInteger(now)||now<=0||
      jwt.iss!==issuer||jwt.role!=='authenticated'||!audOk||
      !UUID.test(jwt.sub||'')||!UUID.test(jwt.session_id||'')||
      jwt.is_anonymous!==false||!['aal1','aal2'].includes(jwt.aal)||
      !Number.isSafeInteger(jwt.iat)||!Number.isSafeInteger(jwt.exp)||
      jwt.iat>now||jwt.exp<=now||
      (jwt.nbf!==undefined&&(!Number.isSafeInteger(jwt.nbf)||jwt.nbf>now)))
     deny('invalid_or_expired_claims');
   let session;
   try{session=await verifySession({subject:jwt.sub,sessionId:jwt.session_id,organisationId});}
   catch(_error){deny('active_session_required');}
   if(!session||session.active!==true||session.subject!==jwt.sub||
      session.sessionId!==jwt.session_id)
     deny('active_session_required');
   let membership;
   try{membership=await lookupMembership({subject:jwt.sub,organisationId});}
   catch(_error){deny('active_membership_required');}
   if(!membership||membership.status!=='active'||membership.subject!==jwt.sub||
      membership.organisationId!==organisationId||!nonempty(membership.role))
     deny('active_membership_required');
   if(!EVENT_ROLES[eventType].includes(membership.role))deny('event_role_forbidden');
   if(STRONG_ROLES.has(membership.role)&&jwt.aal!=='aal2')deny('finance_stepup_required');
   // This object is still not issuer evidence. The domain separately requires
   // a server-owned source resolver, policy sign-off and immutable persistence.
   return Object.freeze({subject:jwt.sub,organisationId,role:membership.role,
     sessionId:jwt.session_id,aal:jwt.aal,
     trustedServerContext:true,verifiedByServer:true,
     verificationContract:VERSION});
 };
}
module.exports={VERSION,createIdentityBoundary};
