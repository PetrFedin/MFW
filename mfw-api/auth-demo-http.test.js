'use strict';
// CI-only HTTP contract. Spawns Authority with NO DATABASE_URL and a random
// loopback port. Never sends requests to Render, Supabase or any real service.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const path=require('node:path');
const {setTimeout:delay}=require('node:timers/promises');

async function freePort(){
 const listener=net.createServer();
 await new Promise((resolve,reject)=>listener.listen(0,'127.0.0.1',resolve).once('error',reject));
 const port=listener.address().port;
 await new Promise(resolve=>listener.close(resolve));
 return port;
}

async function withLocalAuthority(env,fn){
 const port=await freePort();
 let stdout='',stderr='';
 const child=spawn(process.execPath,['server-v2.js'],{
  cwd:__dirname,stdio:['ignore','pipe','pipe'],
  env:{
   ...process.env,PORT:String(port),DATABASE_URL:'',
   MFW_REQUIRE_POSTGRES:'false',
   MFW_ES256_SEED:'mfw_ci_ephemeral_never_production',
   MFW_ADMIN_TOKEN:env.adminToken||'',
   MFW_ENABLE_DEMO_AUTH:env.demoOptIn?'true':'false',
   NODE_ENV:env.nodeEnv||'test',
   MFW_REVERIFY_INTERVAL_MINUTES:'360'
  }
 });
 child.stdout.on('data',chunk=>{stdout+=chunk.toString();});
 child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
 try{
  const until=Date.now()+18000;
  let up=false;
  while(Date.now()<until){
   if(child.exitCode!==null)throw Error('authority_exited_before_start:'+child.exitCode+' '+stderr.slice(-450));
   if(stdout.includes('"event":"mfw_api_started"')){up=true;break;}
   await delay(100);
  }
  if(!up)throw Error('local_authority_start_timeout:'+stderr.slice(-450));
  await fn('http://127.0.0.1:'+port);
 }finally{
  if(child.exitCode===null){
   const end=new Promise(resolve=>child.once('exit',resolve));
   child.kill('SIGTERM');
   await Promise.race([end,delay(2000)]);
   if(child.exitCode===null)child.kill('SIGKILL');
  }
 }
}

async function call(base,path,options={}){
 const r=await fetch(base+path,{
  ...options,redirect:'error',signal:AbortSignal.timeout(3500),
  headers:{'content-type':'application/json',...(options.headers||{})}
 });
 let body=null;try{body=await r.json();}catch(_){}
 return{status:r.status,body};
}

(async()=>{
 const adminSecret='mfw_ci_random_secure_admin_credential_0123456789abcdef';
 await withLocalAuthority({demoOptIn:true,nodeEnv:'test',adminToken:adminSecret},async base=>{
  const auth=await call(base,'/v1/auth/demo',{method:'POST',body:JSON.stringify({
   name:'CI Demo Organizer',identityKey:'ci-local-only',role:'Organizer'
  })});
  assert.equal(auth.status,200,'isolated explicitly opted-in local demo may work');
  assert.equal(auth.body.user.demo,true);
  assert.equal(auth.body.user.role,'Organizer');
  const bearer={'authorization':'Bearer '+auth.body.session};
  const anonymousMine=await call(base,'/v1/network/organisations/mine');
  assert.equal(anonymousMine.status,401,'anonymous user cannot query memberships');
  const initialMine=await call(base,'/v1/network/organisations/mine',{headers:bearer});
  assert.equal(initialMine.status,200);
  assert.equal(initialMine.body.source,'memory_demo');
  assert.equal(initialMine.body.authority,'session_scoped_organisation_memberships');
  assert.deepEqual(initialMine.body.data,[],'no name-inferred organisation links');
  const claim=await call(base,'/v1/network/organisations/claim',{
   method:'POST',headers:bearer,body:JSON.stringify({
    name:'CI Maison Legal Boundary',organisationType:'brand',relationshipRole:'representative'
   })
  });
  assert.equal(claim.status,200);
  assert.equal(claim.body.authority,'self_claim_unverified');
  assert.equal(claim.body.data.verificationStatus,'unverified');
  const mine=await call(base,'/v1/network/organisations/mine',{headers:bearer});
  assert.equal(mine.status,200);
  assert.equal(mine.body.data.length,1);
  assert.equal(mine.body.data[0].relationship.source,'self_claim');
  assert.equal(mine.body.data[0].representationVerified,false);
  // The same public organisation can exist while a different subject has no
  // affiliated relationship; this must not be inferred from the brand name.
  const other=await call(base,'/v1/auth/demo',{method:'POST',body:JSON.stringify({
   name:'Other CI person',identityKey:'ci-other-account',role:'Visitor'
  })});
  assert.equal(other.status,200);
  const otherMine=await call(base,'/v1/network/organisations/mine',{
   headers:{authorization:'Bearer '+other.body.session}
  });
  assert.equal(otherMine.status,200);
  assert.deepEqual(otherMine.body.data,[],'cross-account organisation exposure forbidden');
  const role=await call(base,'/v1/admin/overview',{headers:bearer});
  assert.equal(role.status,403,'self-selected Organizer role MUST NOT be admin');
  const fallback=await call(base,'/v1/admin/overview',{headers:{'x-mfw-admin':'mfw-demo-admin'}});
  assert.equal(fallback.status,403,'public literal default admin credential disabled');
  const authorized=await call(base,'/v1/admin/overview',{headers:{'x-mfw-admin':adminSecret}});
  assert.equal(authorized.status,200,'explicit long admin secret works for management');
  const blocked=await call(base,'/v1/admin/overview',{
   headers:{'x-mfw-admin':adminSecret.slice(0,-1)+'a'}
  });
  assert.equal(blocked.status,403,'wrong header must not work');
 });
 await withLocalAuthority({demoOptIn:false,nodeEnv:'production',adminToken:''},async base=>{
  const login=await call(base,'/v1/auth/demo',{method:'POST',body:JSON.stringify({
   identityKey:'any_person',role:'Organizer'
  })});
  assert.equal(login.status,403,'production memory must refuse demo issuer');
  assert.equal(login.body.error,'demo_auth_disabled');
  const fallback=await call(base,'/v1/admin/overview',{headers:{'x-mfw-admin':'mfw-demo-admin'}});
  assert.equal(fallback.status,403,'production cannot accept fallback admin token');
 });
 console.log(JSON.stringify({
  gate:'mfw_auth_demo_real_loopback_http',status:'pass',
  anonymousRoleCannotAdmin:true,defaultAdminLiteralDenied:true,
  productionDemoIssuerDenied:true,localExplicitOptInOnly:true,
  realPostgresUsed:false,externalNetworkUsed:false,
  productionAdmitted:false
 }));
})().catch(e=>{console.error(e);process.exitCode=1;});
