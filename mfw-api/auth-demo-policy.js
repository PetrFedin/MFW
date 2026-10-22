'use strict';
const crypto=require('node:crypto');

// Demo identity issuance is a LOCAL, explicit opt-in test mode.
// Never provide it on a published or PostgreSQL-backed Authority.
function demoIssuerAllowed({databaseConfigured=false,requirePostgres=false,explicitOptIn=false,nodeEnv=''}={}){
 return explicitOptIn===true && databaseConfigured!==true &&
   requirePostgres!==true &&
   ['test','development'].includes(String(nodeEnv).toLowerCase());
}

// A public self-selected Organizer/Staff demo role is never admin authority.
// The only presently approved administrative credential is an explicit,
// operator-controlled, long random server secret. Real reviewed JWT RBAC is
// a separate release gate, not inferred from a self-signed demo session.
function configuredAdminTokenAccepted(presented,configured){
 if(typeof presented!=='string'||typeof configured!=='string'||
    configured==='mfw-demo-admin'||Buffer.byteLength(configured,'utf8')<32)return false;
 const a=Buffer.from(presented,'utf8'),b=Buffer.from(configured,'utf8');
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}

function sessionAllowedForMode(session,{databaseConfigured=false,requirePostgres=false}={}){
 if(!session||session.typ!=='session'||typeof session.sub!=='string'||!session.sub)return false;
 if((databaseConfigured===true||requirePostgres===true)&&session.demo===true)return false;
 return true;
}

// Check the transport peer, not client-controlled X-Forwarded-For headers.
function localDemoRequest(req){
 const peer=String(req&&req.socket&&req.socket.remoteAddress||'');
 return peer==='127.0.0.1'||peer==='::1'||peer==='::ffff:127.0.0.1';
}
module.exports={demoIssuerAllowed,configuredAdminTokenAccepted,sessionAllowedForMode,localDemoRequest};
