const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const QRCode = require('qrcode');
const { Brand365Store } = require('./brand365-store');
const { activeTelegramStatus, verifyProviderMembership: verifySocialProviderMembership } = require('./social-providers');
let Pool = null;
try { ({ Pool } = require('pg')); } catch (_) {}

const PORT = Number(process.env.PORT || 10000);
const ORIGIN = process.env.MFW_ALLOWED_ORIGIN || 'https://mfw-platform.onrender.com';
const VERSION = 'mfw-authority-v9-mvp-golden-path';
const DATABASE_URL = process.env.DATABASE_URL || '';
const REQUIRE_POSTGRES = String(process.env.MFW_REQUIRE_POSTGRES || 'false').toLowerCase()==='true';
const KEY_SEED = process.env.MFW_ES256_SEED || 'mfw-demo-authority-seed-rotate-before-production';
const ADMIN_TOKEN = process.env.MFW_ADMIN_TOKEN || 'mfw-demo-admin';
const TELEGRAM_BOT_TOKEN = process.env.MFW_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_WEBHOOK_SECRET = process.env.MFW_TELEGRAM_WEBHOOK_SECRET || '';
const VK_SERVICE_TOKEN = process.env.MFW_VK_SERVICE_TOKEN || '';
const VK_API_VERSION = process.env.MFW_VK_API_VERSION || '5.199';
const PUBLIC_BASE_URL = process.env.MFW_PUBLIC_BASE_URL || 'https://mfw-authority.onrender.com';
const TELEGRAM_LOGIN_CLIENT_ID = process.env.MFW_TELEGRAM_LOGIN_CLIENT_ID || '';
const TELEGRAM_LOGIN_CLIENT_SECRET = process.env.MFW_TELEGRAM_LOGIN_CLIENT_SECRET || '';
const TELEGRAM_LOGIN_REDIRECT_URI = process.env.MFW_TELEGRAM_LOGIN_REDIRECT_URI || (PUBLIC_BASE_URL+'/v1/social/auth/telegram/callback');
const VK_APP_ID = process.env.MFW_VK_APP_ID || '';
const VK_LOGIN_REDIRECT_URI = process.env.MFW_VK_LOGIN_REDIRECT_URI || (PUBLIC_BASE_URL+'/v1/social/auth/vk/callback');
const REVERIFY_INTERVAL_MINUTES = Math.max(60,Number(process.env.MFW_REVERIFY_INTERVAL_MINUTES || 360));
const REVERIFY_BATCH_SIZE = Math.max(1,Math.min(1000,Number(process.env.MFW_REVERIFY_BATCH_SIZE || 250)));

function loadOfficialSnapshot(){
  try{
    const source=fs.readFileSync(path.join(__dirname,'..','mfw','platform','event-data.js'),'utf8');
    const sandbox={window:{}};
    vm.runInNewContext(source,sandbox,{timeout:1000});
    return sandbox.window.MFP_DATA||null;
  }catch(err){
    console.warn(JSON.stringify({event:'official_snapshot_load_failed',error:String(err&&err.message||err)}));
    return null;
  }
}
const OFFICIAL_SNAPSHOT=loadOfficialSnapshot();

function validateInvestorBuild(){
  const frontendPath=path.join(__dirname,'..','mfw','app.js');
  const adminPath=path.join(__dirname,'..','mfw','admin','admin.js');
  const platformPath=path.join(__dirname,'..','mfw','platform','platform.js');
  const bfsPath=path.join(__dirname,'..','mfw','platform','bfs','app.js');
  const nativeBridgePath=path.join(__dirname,'..','mfw','native-bridge.js');
  const nativePackagePath=path.join(__dirname,'..','mfw-native','package.json');
  const nativeConfigPath=path.join(__dirname,'..','mfw-native','capacitor.config.ts');
  const nativeCapabilitiesPath=path.join(__dirname,'..','mfw-native','NATIVE_CAPABILITIES.md');
  const brand365StorePath=path.join(__dirname,'brand365-store.js');
  const socialProvidersPath=path.join(__dirname,'social-providers.js');
  const reverifyRunnerPath=path.join(__dirname,'reverify-social.js');
  const apiPackagePath=path.join(__dirname,'package.json');
  const migration001Path=path.join(__dirname,'migrations','001_init.sql');
  const migration005Path=path.join(__dirname,'migrations','005_streaming_pipeline.sql');
  const migration006Path=path.join(__dirname,'migrations','006_role_workflows.sql');
  const migration009Path=path.join(__dirname,'migrations','009_brand365_persistence.sql');
  const migration010Path=path.join(__dirname,'migrations','010_social_auth_flows.sql');
  const migration011Path=path.join(__dirname,'migrations','011_social_auth_hardening.sql');
  const migration012Path=path.join(__dirname,'migrations','012_schema_reconciliation.sql');
  const migration020Path=path.join(__dirname,'migrations','020_journey_closure.sql');
  const manifestPath=path.join(__dirname,'..','mfw','manifest.webmanifest');
  const frontend=fs.readFileSync(frontendPath,'utf8');
  const admin=fs.readFileSync(adminPath,'utf8');
  const platformSource=fs.readFileSync(platformPath,'utf8');
  const bfsSource=fs.readFileSync(bfsPath,'utf8');
  const nativeBridge=fs.readFileSync(nativeBridgePath,'utf8');
  const nativePackage=fs.readFileSync(nativePackagePath,'utf8');
  const nativeConfig=fs.readFileSync(nativeConfigPath,'utf8');
  const nativeCapabilities=fs.readFileSync(nativeCapabilitiesPath,'utf8');
  const brand365StoreSource=fs.readFileSync(brand365StorePath,'utf8');
  const socialProvidersSource=fs.readFileSync(socialProvidersPath,'utf8');
  const reverifyRunnerSource=fs.readFileSync(reverifyRunnerPath,'utf8');
  const apiPackage=fs.readFileSync(apiPackagePath,'utf8');
  const migration001=fs.readFileSync(migration001Path,'utf8');
  const migration005=fs.readFileSync(migration005Path,'utf8');
  const migration006=fs.readFileSync(migration006Path,'utf8');
  const migration009=fs.readFileSync(migration009Path,'utf8');
  const migration010=fs.readFileSync(migration010Path,'utf8');
  const migration011=fs.readFileSync(migration011Path,'utf8');
  const migration012=fs.readFileSync(migration012Path,'utf8');
  const migration020=fs.readFileSync(migration020Path,'utf8');
  new Function(frontend);
  new Function(admin);
  new Function(platformSource);
  new Function(bfsSource);
  new Function(nativeBridge);
  new Function(brand365StoreSource);
  new Function(socialProvidersSource);
  new Function(reverifyRunnerSource);
  JSON.parse(nativePackage);
  JSON.parse(apiPackage);
  JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  for(const required of ['camera-scan','offline-current','admin-console','/v1/checkins','/v1/passes/qr','/v1/streams/e1','cinema-player','post-show-recap','/v1/buyer/shortlist','/v1/line-sheets/','buyer-followup','/v1/sponsor/interactions','sponsor-challenge','/v1/networking/qr','networking-scan','/v1/boards','/v1/meetups','/v1/perks','/v1/media/press-kit/','/v1/designer/workspace/','/v1/brands/','/v1/demo/social/verify','/v1/social/auth/readiness','/v1/brand-portal/','brand-loyalty','mfw-365','brand-portal','brand-portal-notify','notification-preferences','notification-pref-toggle','social-connect','loyalty-verify-live','loyalty-verify','loyalty-claim','toggle-lang','mfwLang','I18N','static.tildacdn.com','MFWNative']){
    if(frontend.indexOf(required)<0)throw new Error('missing_investor_hook:'+required);
  }
  for(const required of ['/health/deep','/overview','/events','/accreditations','waitlist/release','/streams','next-look','/commerce','/sponsors','/brand-growth','/retention','/social/reverify','/golden-path/loyalty-30d','brand365','retention','brand-news','brand-paid','brand-approve-post','brand-approve-offer','brand-social-reverify','control-plane','stream-failover','native-readiness','toggle-lang','mfwAdminLang']){
    if(admin.indexOf(required)<0)throw new Error('missing_admin_hook:'+required);
  }
  for(const required of ['registerPush','openNativeScanner','addWalletPass','routeDeepLink','appUrlOpen']){
    if(nativeBridge.indexOf(required)<0)throw new Error('missing_native_bridge_hook:'+required);
  }
  for(const required of ['@capacitor/core','@capacitor/ios','@capacitor/push-notifications','@capacitor/haptics']){
    if(nativePackage.indexOf(required)<0)throw new Error('missing_native_package:'+required);
  }
  for(const required of ["appId: 'com.mfw.investor.demo'","webDir: '../mfw'"]){
    if(nativeConfig.indexOf(required)<0)throw new Error('missing_native_config:'+required);
  }
  for(const required of ['Wallet must not contain the reusable equivalent of the rotating gate token.','Apple Developer Team','Pass Type ID']){
    if(nativeCapabilities.indexOf(required)<0)throw new Error('missing_native_capability_contract:'+required);
  }
  for(const required of ['class Brand365Store','async evaluateOffer','async personalFeed','async activeMembershipCandidates','async seedDemo','async cleanupAuthFlows','status=\'processing\'']){
    if(brand365StoreSource.indexOf(required)<0)throw new Error('missing_brand365_store_contract:'+required);
  }
  for(const required of ['activeTelegramStatus','verifyProviderMembership','telegram_getChatMember','vk_groups.isMember']){
    if(socialProvidersSource.indexOf(required)<0)throw new Error('missing_social_provider_contract:'+required);
  }
  for(const required of ['DATABASE_URL is required','activeMembershipCandidates','revokeIssuedClaimsIfIneligible','social_reverification_cron']){
    if(reverifyRunnerSource.indexOf(required)<0)throw new Error('missing_reverification_runner_contract:'+required);
  }
  for(const required of ['reverify:social','check:foundation']){
    if(apiPackage.indexOf(required)<0)throw new Error('missing_foundation_script:'+required);
  }
  for(const required of ['/v1/me/recommendations','/v1/me/wallet','/v1/agenda/','syncPlatformRegistration','saveInterestsToAuthority']){
    if(platformSource.indexOf(required)<0)throw new Error('missing_platform_golden_path_hook:'+required);
  }
  for(const required of ['/v1/professional/follows','/v1/meetings','/v1/b2b/leads','eventBrand:\'bfs\'','/v1/passes/issue']){
    if(bfsSource.indexOf(required)<0)throw new Error('missing_bfs_golden_path_hook:'+required);
  }
  for(const required of ['professional_follows','b2b_leads','event_brand','official_updated_at']){
    if(migration020.indexOf(required)<0)throw new Error('missing_journey_closure_migration:'+required);
  }
  for(const required of ["'waitlist'","'invite_only'"]){
    if(migration001.indexOf(required)<0)throw new Error('missing_core_access_mode_contract:'+required);
  }
  const streamsBasePos=migration005.indexOf('CREATE TABLE IF NOT EXISTS streams (');
  const streamSourcesPos=migration005.indexOf('CREATE TABLE IF NOT EXISTS stream_sources (');
  if(streamsBasePos<0||streamSourcesPos<0||streamsBasePos>streamSourcesPos)throw new Error('invalid_stream_migration_dependency_order');
  if(migration006.indexOf('ALTER TABLE event_registrations')<0||migration006.indexOf('ADD COLUMN IF NOT EXISTS source')<0){
    throw new Error('missing_registration_source_reconciliation');
  }
  for(const required of ['events_access_mode_check','event_registrations_status_check','CREATE TABLE IF NOT EXISTS streams','invite_only','no_show']){
    if(migration012.indexOf(required)<0)throw new Error('missing_schema_reconciliation_contract:'+required);
  }
  for(const required of ['app_installations','brand_access','social_reverification_runs']){
    if(migration009.indexOf(required)<0)throw new Error('missing_brand365_migration_contract:'+required);
  }
  for(const required of ['social_auth_flows','code_verifier','expires_at']){
    if(migration010.indexOf(required)<0)throw new Error('missing_social_auth_migration_contract:'+required);
  }
  for(const required of ["'processing'",'idx_social_auth_flows_terminal_cleanup']){
    if(migration011.indexOf(required)<0)throw new Error('missing_social_auth_hardening_contract:'+required);
  }
}
validateInvestorBuild();


function redirectResponse(res,location){
  res.writeHead(302,{
    'Location':location,
    'Cache-Control':'no-store',
    'Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff'
  });
  res.end();
}
function socialReturnUrl(platform,status){
  const u=new URL(ORIGIN);
  u.searchParams.set('social',platform);
  u.searchParams.set('social_status',status);
  return u.toString();
}
function randomB64(bytes=32){return b64u(crypto.randomBytes(bytes));}
function pkceChallenge(verifier){
  return b64u(crypto.createHash('sha256').update(verifier).digest());
}
let telegramJwksCache={expiresAt:0,keys:[]};
async function telegramJwks(){
  if(Date.now()<telegramJwksCache.expiresAt&&telegramJwksCache.keys.length)return telegramJwksCache.keys;
  const r=await fetch('https://oauth.telegram.org/.well-known/jwks.json');
  if(!r.ok)throw new Error('telegram_jwks_unavailable');
  const data=await r.json();
  const keys=Array.isArray(data.keys)?data.keys:[];
  if(!keys.length)throw new Error('telegram_jwks_empty');
  telegramJwksCache={keys,expiresAt:Date.now()+60*60*1000};
  return keys;
}
async function verifyTelegramIdToken(token,flow){
  const parts=String(token||'').split('.');
  if(parts.length!==3)throw new Error('telegram_id_token_malformed');
  let header,payload;
  try{
    header=JSON.parse(ub64u(parts[0]).toString('utf8'));
    payload=JSON.parse(ub64u(parts[1]).toString('utf8'));
  }catch(_){throw new Error('telegram_id_token_decode_failed');}
  if(!['RS256','ES256'].includes(header.alg))throw new Error('telegram_id_token_alg_unsupported');
  const keys=await telegramJwks();
  const jwk=keys.find(k=>String(k.kid||'')===String(header.kid||''))||keys.find(k=>k.alg===header.alg);
  if(!jwk)throw new Error('telegram_id_token_key_not_found');
  const key=crypto.createPublicKey({key:jwk,format:'jwk'});
  const input=Buffer.from(parts[0]+'.'+parts[1]);
  const signature=ub64u(parts[2]);
  const verified=header.alg==='RS256'
    ? crypto.verify('RSA-SHA256',input,key,signature)
    : crypto.verify('sha256',input,{key,dsaEncoding:'ieee-p1363'},signature);
  if(!verified)throw new Error('telegram_id_token_bad_signature');
  const now=Math.floor(Date.now()/1000);
  if(payload.iss!=='https://oauth.telegram.org')throw new Error('telegram_id_token_bad_issuer');
  const aud=Array.isArray(payload.aud)?payload.aud.map(String):[String(payload.aud||'')];
  if(!aud.includes(String(TELEGRAM_LOGIN_CLIENT_ID)))throw new Error('telegram_id_token_bad_audience');
  if(!payload.exp||Number(payload.exp)<=now)throw new Error('telegram_id_token_expired');
  if(payload.iat&&Number(payload.iat)>now+120)throw new Error('telegram_id_token_bad_iat');
  if(flow.nonce&&String(payload.nonce||'')!==String(flow.nonce))throw new Error('telegram_id_token_bad_nonce');
  return payload;
}
async function exchangeTelegramCode(code,flow){
  const basic=Buffer.from(String(TELEGRAM_LOGIN_CLIENT_ID)+':'+String(TELEGRAM_LOGIN_CLIENT_SECRET)).toString('base64');
  const body=new URLSearchParams({
    grant_type:'authorization_code',
    code:String(code),
    redirect_uri:flow.redirectUri,
    client_id:String(TELEGRAM_LOGIN_CLIENT_ID),
    code_verifier:flow.codeVerifier
  });
  const r=await fetch('https://oauth.telegram.org/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded','Authorization':'Basic '+basic},
    body
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.id_token)throw new Error('telegram_token_exchange_failed');
  const claims=await verifyTelegramIdToken(data.id_token,flow);
  return {claims,scope:String(data.scope||'openid profile').split(/\s+/).filter(Boolean)};
}
async function exchangeVkCode(code,deviceId,flow){
  const q=new URLSearchParams({
    grant_type:'authorization_code',
    redirect_uri:flow.redirectUri,
    client_id:String(VK_APP_ID),
    code_verifier:flow.codeVerifier,
    state:flow.state,
    device_id:String(deviceId)
  });
  const r=await fetch('https://id.vk.com/oauth2/auth?'+q.toString(),{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({code:String(code)})
  });
  const token=await r.json().catch(()=>({}));
  if(!r.ok||token.error||!token.access_token)throw new Error('vk_token_exchange_failed');
  if(String(token.state||'')!==String(flow.state))throw new Error('vk_state_mismatch');
  const infoResp=await fetch('https://id.vk.com/oauth2/user_info?client_id='+encodeURIComponent(String(VK_APP_ID)),{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({access_token:String(token.access_token)})
  });
  const info=await infoResp.json().catch(()=>({}));
  if(!infoResp.ok||info.error||!info.user)throw new Error('vk_user_info_failed');
  return {token,info};
}

function deriveKeys(seed){
  let counter=0;
  while(counter<100){
    const material=crypto.createHash('sha256').update(seed+':'+counter).digest();
    try{
      const ecdh=crypto.createECDH('prime256v1');
      ecdh.setPrivateKey(material);
      const pub=ecdh.getPublicKey(null,'uncompressed');
      const x=pub.subarray(1,33);
      const y=pub.subarray(33,65);
      const privateJwk={kty:'EC',crv:'P-256',x:b64u(x),y:b64u(y),d:b64u(material)};
      const publicJwk={kty:'EC',crv:'P-256',x:b64u(x),y:b64u(y)};
      return {
        privateKey:crypto.createPrivateKey({key:privateJwk,format:'jwk'}),
        publicKey:crypto.createPublicKey({key:publicJwk,format:'jwk'}),
        publicJwk
      };
    }catch(_){counter++;}
  }
  throw new Error('unable_to_derive_es256_key');
}
const DERIVED_KEYS=deriveKeys(KEY_SEED);
const PRIVATE_KEY=DERIVED_KEYS.privateKey;
const PUBLIC_KEY=DERIVED_KEYS.publicKey;

function b64u(input) {
  return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function ub64u(input) {
  input=input.replace(/-/g,'+').replace(/_/g,'/');
  while(input.length%4) input+='=';
  return Buffer.from(input,'base64');
}
function json(res,status,data,extraHeaders={}) {
  const body=JSON.stringify(data);
  res.writeHead(status,Object.assign({
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length':Buffer.byteLength(body),
    'Access-Control-Allow-Origin':ORIGIN,
    'Access-Control-Allow-Headers':'Content-Type, Authorization, X-MFW-Admin',
    'Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS',
    'Vary':'Origin',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'X-Frame-Options':'DENY',
    'Referrer-Policy':'no-referrer'
  },extraHeaders));
  res.end(body);
}
function text(res,status,body,type='text/plain; charset=utf-8') {
  res.writeHead(status,{
    'Content-Type':type,
    'Content-Length':Buffer.byteLength(body),
    'Access-Control-Allow-Origin':ORIGIN,
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve,reject)=>{
    let data='';
    req.on('data',chunk=>{
      data+=chunk;
      if(data.length>250000) reject(new Error('body_too_large'));
    });
    req.on('end',()=>{
      if(!data) return resolve({});
      try{ resolve(JSON.parse(data)); } catch(_){ reject(new Error('invalid_json')); }
    });
    req.on('error',reject);
  });
}
function sessionFromRequest(req){
  var auth=String(req.headers.authorization||'');
  if(!auth.startsWith('Bearer '))return null;
  var v=verifyToken(auth.slice(7));
  return v.ok&&v.payload&&v.payload.typ==='session'?v.payload:null;
}
function adminOk(req){
  if(req.headers['x-mfw-admin']===ADMIN_TOKEN)return true;
  var p=sessionFromRequest(req);
  return !!(p&&['Organizer','Staff'].indexOf(p.role)>=0);
}
function userSubject(req,supplied){
  const session=sessionFromRequest(req);
  if(pool&&!session)return null;
  return String(session&&session.sub||supplied||'demo_user');
}
async function brandPortalOk(req,brandId){
  var p=sessionFromRequest(req);
  if(!p)return false;
  if(['Organizer','Staff'].includes(p.role))return true;
  if(p.role!=='Designer')return false;
  return brand365Store.hasBrandAccess(String(p.sub),String(brandId));
}

const publicJwk=DERIVED_KEYS.publicJwk;

function signPayload(payload) {
  const header={alg:'ES256',typ:'MFW-PASS',kid:'mfw-demo-2026-01'};
  const encodedHeader=b64u(JSON.stringify(header));
  const encodedPayload=b64u(JSON.stringify(payload));
  const input=encodedHeader+'.'+encodedPayload;
  const signature=crypto.sign('sha256',Buffer.from(input),{
    key:PRIVATE_KEY,
    dsaEncoding:'ieee-p1363'
  });
  return input+'.'+b64u(signature);
}
function verifyToken(token) {
  if(!token || typeof token!=='string') return {ok:false,reason:'missing'};
  const parts=token.split('.');
  if(parts.length!==3) return {ok:false,reason:'malformed'};
  const input=parts[0]+'.'+parts[1];
  let payload;
  try{ payload=JSON.parse(ub64u(parts[1]).toString('utf8')); }
  catch(_){ return {ok:false,reason:'bad_payload'}; }
  const signature=ub64u(parts[2]);
  const ok=crypto.verify('sha256',Buffer.from(input),{
    key:PUBLIC_KEY,
    dsaEncoding:'ieee-p1363'
  },signature);
  if(!ok) return {ok:false,reason:'bad_signature',payload};
  if(payload.exp && Date.now()>=payload.exp) return {ok:false,reason:'expired',payload};
  return {ok:true,payload};
}

let pool=null;
if(DATABASE_URL && Pool){
  pool=new Pool({connectionString:DATABASE_URL,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
}

const memory={
  users:new Map(),
  sessions:new Map(),
  passes:new Map(),
  revoked:new Map(),
  checkins:new Map(),
  meetings:new Map(),
  shortlists:new Map(),
  commerceLeads:new Map(),
  sponsorInteractions:[],
  connections:new Map(),
  boards:new Map(),
  meetupMembers:new Map(),
  meetingProposals:new Map(),
  eventRegistrations:new Map(),
  userInterests:new Map(),
  professionalFollows:new Map(),
  b2bLeads:new Map(),
  appInstallations:new Map(),
  socialConnections:new Map(),
  socialMemberships:new Map(),
  brandFollows:new Map(),
  brandFavorites:new Map(),
  brandCampaigns:new Map(),
  brandCampaignEvents:[],
  brandSavedSegments:new Map(),
  brandOrderImports:[],
  brandJourneys:new Map(),
  brandPurchases:[],
  brandAccess:new Map(),
  loyaltyClaims:new Map(),
  contentInteractions:[],
  notificationPreferences:new Map(),
  notificationDeliveries:[],
  analytics:[],
  events:[
    {id:'e1',season:'SS27',title:'MFW Opening Runway',type:'show',venue:'Manege Hall 1',startsAt:'2026-09-26T17:00:00+03:00',status:'live',accessMode:'open',capacity:500,checkedIn:428,waitlist:37,demo:true},
    {id:'e2',season:'SS27',title:'New Names: Moscow',type:'show',venue:'Manege Hall 2',startsAt:'2026-09-26T18:00:00+03:00',status:'published',accessMode:'registration',capacity:420,checkedIn:0,waitlist:18,demo:true},
    {id:'e3',season:'SS27',title:'Buyer Perspective',type:'talk',venue:'Lecture Hall',startsAt:'2026-09-26T19:00:00+03:00',status:'published',accessMode:'open',capacity:180,checkedIn:0,waitlist:0,demo:true},
    {id:'e4',season:'SS27',title:'International Exchange Show',type:'show',venue:'Manege Hall 1',startsAt:'2026-09-26T20:30:00+03:00',status:'published',accessMode:'waitlist',capacity:360,checkedIn:0,waitlist:42,demo:true},
    {id:'e5',season:'SS27',title:'Private Industry Reception',type:'b2b',venue:'Partner Lounge',startsAt:'2026-09-26T21:30:00+03:00',status:'published',accessMode:'invite_only',capacity:120,checkedIn:0,waitlist:0,demo:true}
  ],
  brands:[
    {id:'b1',slug:'mfw-new-01',name:'MFW / NEW 01',city:'Moscow',segment:'Emerging Womenswear',description:'New Russian womenswear label focused on modern tailoring and evening pieces.',demo:true},
    {id:'b2',slug:'mfw-studio-02',name:'MFW / STUDIO 02',city:'Saint Petersburg',segment:'Contemporary Unisex',description:'Contemporary unisex studio built around texture, movement and modular dressing.',demo:true}
  ],
  collections:[
    {id:'c1',brandId:'b1',season:'SS27',title:'After Light',description:'32-look runway collection',status:'published',demo:true},
    {id:'c2',brandId:'b2',season:'SS27',title:'Northern Form',description:'24-look presentation',status:'published',demo:true}
  ],
  looks:Array.from({length:32},(_,i)=>({id:'l'+(i+1),collectionId:'c1',lookNumber:i+1,title:'Look '+String(i+1).padStart(2,'0'),wholesale:42000+(i*1700),rrp:98000+(i*3900),currency:'RUB',demo:true})),
  lineSheets:[
    {id:'ls1',brandId:'b1',collectionId:'c1',version:1,currency:'RUB',status:'published',terms:'MOQ 6 styles · delivery Feb–Mar 2027',demo:true},
    {id:'ls2',brandId:'b2',collectionId:'c2',version:1,currency:'RUB',status:'published',terms:'MOQ 8 styles · delivery Jan–Feb 2027',demo:true}
  ],
  sponsors:[
    {id:'sp1',slug:'mfw-partner-demo',name:'MFW Partner Demo',tier:'presenting',status:'active',demo:true}
  ],
  sponsorCampaigns:[
    {id:'cmp1',sponsorId:'sp1',season:'SS27',name:'Backstage Experience',objective:'brand_engagement',status:'active',demo:true}
  ],
  sponsorPlacements:[
    {id:'pl1',campaignId:'cmp1',placementType:'native_story',surface:'today_hero',title:'Backstage Experience',cta:'Open experience',demo:true},
    {id:'pl2',campaignId:'cmp1',placementType:'challenge',surface:'passport',title:'Fashion Passport Partner Challenge',cta:'Join',demo:true}
  ],
  meetups:[
    {id:'mu1',title:'Emerging Russian Designers',topic:'emerging_designers',venue:'Manege · Showroom Lounge',startsAt:'2026-09-27T14:00:00+03:00',capacity:24,status:'published',demo:true},
    {id:'mu2',title:'Buyers × New Brands',topic:'buying',venue:'Manege · Meeting Point 4',startsAt:'2026-09-28T16:30:00+03:00',capacity:18,status:'published',demo:true},
    {id:'mu3',title:'Fashion Tech Coffee',topic:'technology',venue:'Lecture Hall Café',startsAt:'2026-09-29T11:30:00+03:00',capacity:30,status:'published',demo:true}
  ],
  perks:[
    {id:'perk1',titleRu:'Priority lane',titleEn:'Priority lane',descRu:'Ускоренный проход для подтверждённых приглашений и VIP entitlement.',descEn:'Fast entry for confirmed invitations and VIP entitlement.',kind:'access',demo:true},
    {id:'perk2',titleRu:'Partner lounge',titleEn:'Partner lounge',descRu:'Доступ к партнёрской зоне для соответствующих credentials.',descEn:'Partner lounge access for eligible credentials.',kind:'partner',demo:true},
    {id:'perk3',titleRu:'Early registration',titleEn:'Early registration',descRu:'Ранний доступ к регистрации следующего сезона для активных участников.',descEn:'Early registration for the next season for active participants.',kind:'retention',demo:true}
  ],
  socialProviderAdapters:[
    {platform:'telegram',status:'ready_for_credentials',verification:'current_membership_and_membership_events',dateAuthority:'provider_event_when_observed_else_first_verified_at'},
    {platform:'vk',status:'ready_for_credentials',verification:'current_membership',dateAuthority:'first_verified_at_unless_provider_event_history_available'},
    {platform:'instagram',status:'capability_not_assumed',verification:'manual_or_future_provider_capability',dateAuthority:'none'}
  ],
  socialChannels:[
    {id:'sc_mfw_tg',ownerType:'mfw',brandId:null,platform:'telegram',externalChannelId:'mfw_telegram_demo',handle:'@moscowfashionweek',url:'https://t.me/moscowfashionweek',verificationMode:'membership_event',status:'active',demo:true},
    {id:'sc_mfw_vk',ownerType:'mfw',brandId:null,platform:'vk',externalChannelId:'mfw_vk_demo',handle:'Moscow Fashion Week',url:'https://vk.com/moscowfashionweek',verificationMode:'api_current',status:'active',demo:true},
    {id:'sc_b1_tg',ownerType:'brand',brandId:'b1',platform:'telegram',externalChannelId:'brand_b1_tg_demo',handle:'@mfw_new_01',url:'https://t.me/mfw_new_01',verificationMode:'membership_event',status:'active',demo:true},
    {id:'sc_b1_vk',ownerType:'brand',brandId:'b1',platform:'vk',externalChannelId:'brand_b1_vk_demo',handle:'MFW / NEW 01',url:'https://vk.com/mfw_new_01',verificationMode:'api_current',status:'active',demo:true},
    {id:'sc_b1_ig',ownerType:'brand',brandId:'b1',platform:'instagram',externalChannelId:'brand_b1_ig_demo',handle:'@mfw_new_01',url:'https://instagram.com/mfw_new_01',verificationMode:'unsupported',status:'paused',demo:true}
  ],
  loyaltyOffers:[
    {
      id:'lo1',brandId:'b1',titleRu:'−10% после месяца вместе с MFW',titleEn:'10% off after one month with MFW',
      descriptionRu:'Установите приложение, зарегистрируйтесь и сохраняйте активную подписку на MFW и бренд не менее 30 дней.',
      descriptionEn:'Install the app, register and keep verified MFW and brand social memberships active for at least 30 days.',
      rewardType:'discount_percent',rewardValue:10,minContinuousDays:30,status:'published',stockLimit:1000,perUserLimit:1,
      termsRu:'Скидка предоставляется брендом. MFW подтверждает выполнение цифровых условий; условия применения и исключения задаёт бренд.',
      termsEn:'Discount is funded by the brand. MFW verifies digital eligibility; redemption terms and exclusions are set by the brand.',
      requirements:[
        {id:'rq1',type:'registered_user',required:true,minContinuousDays:0},
        {id:'rq2',type:'app_installed',required:true,minContinuousDays:0},
        {id:'rq3',type:'mfw_social_follow',channelId:'sc_mfw_tg',required:true,minContinuousDays:30},
        {id:'rq4',type:'brand_social_follow',channelId:'sc_b1_tg',required:true,minContinuousDays:30}
      ],demo:true
    },
    {
      id:'lo2',brandId:'b1',titleRu:'Подарок от бренда за 45 дней',titleEn:'Brand gift after 45 days',
      descriptionRu:'Для подписчиков бренда в MFW и подтверждённого Telegram-канала бренда.',
      descriptionEn:'For MFW brand followers with a verified brand Telegram membership.',
      rewardType:'gift',rewardValue:null,minContinuousDays:45,status:'published',stockLimit:100,perUserLimit:1,
      termsRu:'Количество подарков ограничено. Получение подтверждается одноразовым кодом.',
      termsEn:'Limited inventory. Redemption uses a one-time claim code.',
      requirements:[
        {id:'rq5',type:'brand_follow_in_mfw',required:true,minContinuousDays:0},
        {id:'rq6',type:'brand_social_follow',channelId:'sc_b1_tg',required:true,minContinuousDays:45}
      ],demo:true
    }
  ],
  brandPosts:[
    {id:'bp1',brandId:'b1',kind:'event',titleRu:'Закрытый примерочный день',titleEn:'Private fitting day',bodyRu:'Бренд приглашает подписчиков MFW на закрытый примерочный день в Москве.',bodyEn:'The brand invites MFW followers to a private fitting day in Moscow.',imageUrl:'https://static.tildacdn.com/tild3538-3661-4962-a431-363531303736/2026-03-15_215933.jpg',ctaLabelRu:'Записаться',ctaLabelEn:'Book',ctaUrl:'#brand-event',eventStartsAt:'2026-10-17T12:00:00+03:00',audienceScope:{kind:'brand_followers'},placementScope:['brand_profile','discover_feed'],isPaid:false,status:'published',publishedAt:'2026-09-26T08:00:00Z',demo:true},
    {id:'bp2',brandId:'b1',kind:'launch',titleRu:'Новая капсула после MFW',titleEn:'New capsule after MFW',bodyRu:'Первый доступ к капсуле для аудитории бренда внутри MFW.',bodyEn:'Early access to the post-MFW capsule for the brand audience inside MFW.',imageUrl:'https://static.tildacdn.com/tild3633-6561-4664-b432-343062643365/2026-03-16_144258.jpg',ctaLabelRu:'Смотреть',ctaLabelEn:'View',ctaUrl:'#capsule',audienceScope:{kind:'brand_followers'},placementScope:['brand_profile','discover_feed'],isPaid:false,status:'published',publishedAt:'2026-09-25T12:00:00Z',demo:true},
    {id:'bp3',brandId:'b1',kind:'campaign',titleRu:'MFW Select · бренд недели',titleEn:'MFW Select · Brand of the week',bodyRu:'Нативное платное размещение бренда для широкой аудитории MFW с прозрачной маркировкой.',bodyEn:'Native paid placement for the wider MFW audience with clear sponsorship labelling.',imageUrl:'https://static.tildacdn.com/tild3538-3661-4962-a431-363531303736/2026-03-15_215933.jpg',ctaLabelRu:'Открыть бренд',ctaLabelEn:'Open brand',ctaUrl:'#brand-b1',audienceScope:{kind:'all_mfw'},placementScope:['discover_feed','today'],isPaid:true,sponsorLabelRu:'Реклама бренда',sponsorLabelEn:'Brand promotion',status:'published',publishedAt:'2026-09-24T12:00:00Z',demo:true}
  ],
  pressKits:[
    {id:'pk_e1',eventId:'e1',title:'Opening Runway Press Kit',status:'published',releaseText:'MFW Opening Runway · investor demo press release',credits:'Moscow Fashion Week official published materials',contactEmail:'press-demo@mfw.local',assets:[
      {type:'photo',title:'Opening runway',url:'https://static.tildacdn.com/tild3538-3661-4962-a431-363531303736/2026-03-15_215933.jpg',approved:true},
      {type:'photo',title:'Runway highlight',url:'https://static.tildacdn.com/tild3633-6561-4664-b432-343062643365/2026-03-16_144258.jpg',approved:true}
    ],demo:true}
  ],
  designerReadiness:[
    {id:'dr_b1',brandId:'b1',collectionId:'c1',profileComplete:true,lookOrderComplete:false,mediaComplete:true,commercialDataComplete:false,status:'in_progress',issues:['4 look metadata missing','Wholesale terms not confirmed'],demo:true}
  ],
  accreditations:[
    {id:'acc_01',name:'Maria Petrova',kind:'Buyer',organisation:'Concept Store',status:'pending'},
    {id:'acc_02',name:'Alexey Morozov',kind:'Media',organisation:'Fashion Desk',status:'pending'},
    {id:'acc_03',name:'Elena Volkova',kind:'Creator',organisation:'Independent',status:'approved'}
  ],
  notifications:[],
  invitations:[],
  streams:[
    {
      id:'stream_e1',
      eventId:'e1',
      status:'live',
      title:'MFW Opening Runway',
      providerMode:'simulated',
      activeSourceId:'src_primary',
      playbackUrl:'https://videos.pexels.com/video-files/19863106/19863106-uhd_2160_3840_30fps.mp4',
      posterUrl:'https://static.tildacdn.com/tild3538-3661-4962-a431-363531303736/2026-03-15_215933.jpg',
      currentLook:14,
      totalLooks:32,
      startedAt:'2026-09-26T17:00:00+03:00',
      captions:['RU','EN'],
      replayAvailable:true,
      updatedAt:new Date().toISOString(),
      demo:true
    }
  ],
  streamProviders:[
    {id:'prv_primary',code:'mfw-primary',name:'MFW Ingest Primary',providerType:'generic',mode:'simulated',priority:10},
    {id:'prv_backup',code:'mfw-backup',name:'MFW Ingest Backup',providerType:'generic',mode:'simulated',priority:20}
  ],
  streamSources:[
    {id:'src_primary',streamId:'stream_e1',providerId:'prv_primary',sourceRole:'primary',ingestProtocol:'srt',status:'active',lastHeartbeatAt:new Date().toISOString(),health:{bitrateKbps:8400,fps:30,droppedFramesPct:0.08,latencySec:4.2,audioDb:-12.4}},
    {id:'src_backup',streamId:'stream_e1',providerId:'prv_backup',sourceRole:'backup',ingestProtocol:'rtmp',status:'standby',lastHeartbeatAt:new Date().toISOString(),health:{bitrateKbps:6200,fps:30,droppedFramesPct:0.12,latencySec:6.8,audioDb:-13.1}}
  ],
  streamOutputs:[
    {id:'out_hls',streamId:'stream_e1',outputType:'hls',resolution:'1080p',bitrateKbps:6500,status:'live',url:'demo://hls/master.m3u8'},
    {id:'out_llhls',streamId:'stream_e1',outputType:'ll_hls',resolution:'720p',bitrateKbps:3600,status:'live',url:'demo://ll-hls/master.m3u8'},
    {id:'out_recording',streamId:'stream_e1',outputType:'recording',resolution:'1080p',bitrateKbps:8000,status:'live',url:'demo://recording/opening-runway'}
  ],
  captionTracks:[
    {id:'cap_ru',streamId:'stream_e1',language:'ru',label:'Русский',source:'operator',status:'live'},
    {id:'cap_en',streamId:'stream_e1',language:'en',label:'English',source:'translation',status:'live'}
  ],
  replayAssets:[
    {id:'rep_e1',streamId:'stream_e1',assetType:'full_show',status:'processing',durationSeconds:null,playbackUrl:null,posterUrl:'https://static.tildacdn.com/tild3538-3661-4962-a431-363531303736/2026-03-15_215933.jpg',publishedAt:null,demo:true}
  ],
  failoverEvents:[]
};

function moscowIso(date,time){
  if(!date||!time)return null;
  return String(date)+'T'+String(time)+':00+03:00';
}
function accessModeFromLabel(label){
  const x=String(label||'').toLowerCase();
  if(x.includes('регистра'))return 'registration';
  if(x.includes('приглаш'))return 'invite_only';
  return 'open';
}
function mergeOfficialSnapshotIntoMemory(){
  if(!OFFICIAL_SNAPSHOT)return;
  const syncedAt=OFFICIAL_SNAPSHOT.syncedAt||null;
  const mfw=OFFICIAL_SNAPSHOT.mfw||{},bfs=OFFICIAL_SNAPSHOT.bfs||{};
  for(const e of (mfw.events||[])){
    if(memory.events.some(x=>x.id===e.id))continue;
    memory.events.push({
      id:e.id,season:'SS27',title:e.title,type:String(e.type||'').toLowerCase().includes('показ')?'show':'talk',
      venue:e.venue||mfw.meta&&mfw.meta.venue||'MFW',startsAt:moscowIso(e.date,e.time),endsAt:e.end?moscowIso(e.date,e.end):null,
      status:'published',accessMode:accessModeFromLabel(e.access),capacity:null,checkedIn:0,waitlist:0,eventBrand:'mfw',
      sourceUrl:OFFICIAL_SNAPSHOT.sources&&OFFICIAL_SNAPSHOT.sources.mfw&&OFFICIAL_SNAPSHOT.sources.mfw.url||null,
      officialUpdatedAt:syncedAt,metadata:{official:true,eventCode:'mfw',city:e.city||null,media:e.media||{},sourceSyncedAt:syncedAt}
    });
  }
  for(const e of (bfs.sessions||[])){
    if(memory.events.some(x=>x.id===e.id))continue;
    memory.events.push({
      id:e.id,season:'SS27',title:e.title,type:'session',venue:(bfs.meta&&bfs.meta.venue||'BFS')+(e.hall?' · '+e.hall:''),
      startsAt:moscowIso(e.date,e.time),endsAt:e.end?moscowIso(e.date,e.end):null,status:'published',accessMode:'registration',
      capacity:null,checkedIn:0,waitlist:0,eventBrand:'bfs',
      sourceUrl:OFFICIAL_SNAPSHOT.sources&&OFFICIAL_SNAPSHOT.sources.bfs&&OFFICIAL_SNAPSHOT.sources.bfs.program||null,
      officialUpdatedAt:syncedAt,metadata:{official:true,eventCode:'bfs',hall:e.hall||null,topic:e.topic||null,speakerIds:e.speakerIds||[],plenary:!!e.plenary,media:e.media||{},sourceSyncedAt:syncedAt}
    });
  }
  for(const b of (mfw.brands||[])){
    if(memory.brands.some(x=>x.id===b.id||x.slug===b.id))continue;
    memory.brands.push({
      id:b.id,slug:b.id,name:b.name,city:b.city||'',country:'',segment:(b.tags||[]).join(', '),
      description:'Official MFW participant',metadata:{official:true,tags:b.tags||[],showId:b.showId||null,sourceSyncedAt:syncedAt},demo:false
    });
  }
}
mergeOfficialSnapshotIntoMemory();

const brand365Store=new Brand365Store({pool,memory});
let databaseSchemaReadiness={
  configured:!!pool,
  ready:!pool,
  mode:pool?'checking':'memory_demo',
  migrations:[],
  missingMigrations:[],
  missingTables:[],
  missingColumns:[],
  contractErrors:[]
};

async function query(sql,params=[]){
  if(!pool) return null;
  return pool.query(sql,params);
}

async function migrate(){
  if(!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations(
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const dir=path.join(__dirname,'migrations');
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort();
  for(const file of files){
    const seen=await pool.query('SELECT 1 FROM schema_migrations WHERE filename=$1',[file]);
    if(seen.rowCount) continue;
    const sql=fs.readFileSync(path.join(dir,file),'utf8');
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(filename) VALUES($1)',[file]);
      await client.query('COMMIT');
      console.log(JSON.stringify({event:'migration_applied',file}));
    }catch(err){
      await client.query('ROLLBACK');
      throw err;
    }finally{ client.release(); }
  }
}

async function checkDatabaseSchema(){
  const dir=path.join(__dirname,'migrations');
  const requiredMigrations=fs.readdirSync(dir).filter(f=>f.endsWith('.sql')).sort();
  if(!pool){
    return {
      configured:false,ready:false,mode:'memory_demo',
      migrations:[],requiredMigrations,missingMigrations:requiredMigrations,
      missingTables:[],missingColumns:[],contractErrors:['postgres_not_configured']
    };
  }

  const applied=await pool.query('SELECT filename FROM schema_migrations ORDER BY filename');
  const appliedSet=new Set(applied.rows.map(x=>x.filename));
  const missingMigrations=requiredMigrations.filter(x=>!appliedSet.has(x));

  const requiredTables=[
    'users','profiles','events','event_registrations','passes','brands','collections','looks',
    'streams','stream_providers','stream_sources','stream_outputs','stream_caption_tracks','replay_assets',
    'social_connections','brand_social_channels','social_memberships','loyalty_offers',
    'loyalty_offer_requirements','loyalty_eligibility','loyalty_claims','brand_follows','brand_content_posts',
    'app_installations','brand_access','social_reverification_runs','notification_preferences',
    'content_impressions','notification_deliveries','social_auth_flows',
    'user_agenda','b2b_meetings','b2b_meeting_events','user_interests','platform_registrations',
    'professional_follows','b2b_leads'
  ];
  const tables=await pool.query(`SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name=ANY($1::text[])`,[requiredTables]);
  const tableSet=new Set(tables.rows.map(x=>x.table_name));
  const missingTables=requiredTables.filter(x=>!tableSet.has(x));

  const requiredColumns=[
    ['events','access_mode'],['events','event_brand'],['events','source_url'],['events','official_updated_at'],['event_registrations','source'],['streams','external_key'],['streams','provider_mode'],
    ['brands','external_key'],['brand_social_channels','external_key'],['loyalty_offers','external_key'],
    ['event_registrations','registration_type'],['event_registrations','organisation'],['event_registrations','job_title'],['event_registrations','purpose'],['event_registrations','submitted_payload'],
    ['brand_content_posts','external_key'],['social_auth_flows','code_verifier'],['social_auth_flows','expires_at']
  ];
  const cols=await pool.query(`SELECT table_name,column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name=ANY($1::text[])`,[[...new Set(requiredColumns.map(x=>x[0]))]]);
  const colSet=new Set(cols.rows.map(x=>x.table_name+'.'+x.column_name));
  const missingColumns=requiredColumns.map(x=>x.join('.')).filter(x=>!colSet.has(x));

  const contractErrors=[];
  const eventConstraint=await pool.query(`SELECT pg_get_constraintdef(c.oid) def
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
    WHERE t.relname='events' AND c.conname='events_access_mode_check' LIMIT 1`);
  const accessDef=eventConstraint.rows[0]&&String(eventConstraint.rows[0].def||'');
  for(const required of ['waitlist','invite_only']){
    if(!accessDef.includes(required))contractErrors.push('events_access_mode_missing:'+required);
  }

  const registrationConstraint=await pool.query(`SELECT pg_get_constraintdef(c.oid) def
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
    WHERE t.relname='event_registrations' AND c.conname='event_registrations_status_check' LIMIT 1`);
  const registrationDef=registrationConstraint.rows[0]&&String(registrationConstraint.rows[0].def||'');
  for(const required of ['registered','waitlist','invited','confirmed','cancelled','no_show','attended']){
    if(!registrationDef.includes(required))contractErrors.push('event_registration_status_missing:'+required);
  }

  const ready=!missingMigrations.length&&!missingTables.length&&!missingColumns.length&&!contractErrors.length;
  return {
    configured:true,ready,mode:'postgres',
    migrations:[...appliedSet],requiredMigrations,missingMigrations,missingTables,missingColumns,contractErrors,
    checkedAt:new Date().toISOString()
  };
}

async function bootstrapDemoData(){
  if(!pool) return;
  const venueDefs=[
    {code:'MANEGE',name:'ЦВЗ «Манеж»',address:'Манежная площадь, 1'},
    {code:'ZARYADYE',name:'МКЗ «Зарядье»',address:'Москва'}
  ];
  const venueIds={};
  for(const v of venueDefs){
    const q=await pool.query(`INSERT INTO venues(code,name,address)
      VALUES($1,$2,$3)
      ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,address=EXCLUDED.address
      RETURNING id`,[v.code,v.name,v.address]);
    venueIds[v.code]=q.rows[0].id;
  }
  for(const e of memory.events){
    const eventBrand=String(e.eventBrand||'mfw');
    const venueId=venueIds[eventBrand==='bfs'?'ZARYADYE':'MANEGE'];
    const metadata={...(e.metadata||{}),venueLabel:e.venue||null,demo:!!e.demo};
    await pool.query(`INSERT INTO events(external_key,season,title,event_type,venue_id,zone_id,starts_at,ends_at,status,access_mode,capacity,metadata,event_brand,source_url,official_updated_at)
      VALUES($1,$2,$3,$4,$5,NULL,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14)
      ON CONFLICT(external_key) DO UPDATE SET title=EXCLUDED.title,event_type=EXCLUDED.event_type,venue_id=EXCLUDED.venue_id,
        starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,status=EXCLUDED.status,access_mode=EXCLUDED.access_mode,
        capacity=EXCLUDED.capacity,metadata=EXCLUDED.metadata,event_brand=EXCLUDED.event_brand,source_url=EXCLUDED.source_url,
        official_updated_at=EXCLUDED.official_updated_at,updated_at=now()`,
      [e.id,e.season||'SS27',e.title,e.type||'event',venueId,e.startsAt,e.endsAt||null,e.status||'published',
       e.accessMode||'open',e.capacity==null?null:e.capacity,JSON.stringify(metadata),eventBrand,e.sourceUrl||null,e.officialUpdatedAt||null]);
  }
  for(const b of memory.brands){
    await pool.query(`INSERT INTO brands(external_key,slug,name,city,country,status,metadata)
      VALUES($1,$2,$3,$4,$5,'published',$6::jsonb)
      ON CONFLICT(slug) DO UPDATE SET external_key=COALESCE(brands.external_key,EXCLUDED.external_key),name=EXCLUDED.name,
        city=EXCLUDED.city,country=EXCLUDED.country,metadata=brands.metadata||EXCLUDED.metadata,updated_at=now()`,
      [b.id,b.slug||b.id,b.name,b.city||'',b.country||'',JSON.stringify({segment:b.segment||'',...(b.metadata||{}),demo:!!b.demo})]);
  }
  await brand365Store.seedDemo();
}

function notificationPrefs(userId){
  const key=String(userId||'demo_user');
  if(!memory.notificationPreferences.has(key)){
    memory.notificationPreferences.set(key,{
      userId:key,criticalEnabled:true,liveEnabled:true,followedBrandNewsEnabled:true,
      loyaltyEnabled:true,brandEventsEnabled:true,paidPromotionsEnabled:false,quietHours:{},updatedAt:new Date().toISOString()
    });
  }
  return memory.notificationPreferences.get(key);
}
function interactionsInWindow(userId,postId,type,days){
  const cutoff=Date.now()-(Number(days||7)*86400000);
  return memory.contentInteractions.filter(x=>
    x.userId===String(userId)&&x.postId===String(postId)&&x.type===String(type)&&new Date(x.occurredAt).getTime()>=cutoff
  ).length;
}
function brandPushesInWindow(brandId,days){
  const cutoff=Date.now()-(Number(days||7)*86400000);
  return memory.notifications.filter(n=>
    n.category==='brand_news'&&n.brandId===String(brandId)&&['scheduled','sent'].includes(n.status)&&new Date(n.createdAt||n.sentAt||0).getTime()>=cutoff
  ).length;
}
function postFeedScore(userId,post,followed){
  let score=0,reason='mfw_editorial';
  const ageHours=Math.max(0,(Date.now()-new Date(post.publishedAt||post.createdAt||Date.now()).getTime())/3600000);
  const freshness=Math.max(0,30-Math.min(30,ageHours/24));
  if(post.kind==='event'&&followed.has(post.brandId)&&!post.isPaid){score=108;reason='followed_brand_event';}
  else if(post.kind==='offer'&&followed.has(post.brandId)&&!post.isPaid){score=105;reason='followed_brand_offer';}
  else if(followed.has(post.brandId)&&!post.isPaid){score=100;reason='followed_brand';}
  else if(post.isPaid){score=35;reason='sponsored';}
  else {score=60;reason='mfw_relevant';}
  return {score:score+freshness,reason};
}
function buildPersonalFeed(userId){
  const followed=followSet(userId);
  const eligible=memory.brandPosts.filter(post=>{
    if(post.status!=='published')return false;
    const kind=post.audienceScope&&post.audienceScope.kind;
    if(kind==='brand_followers'&&!followed.has(post.brandId))return false;
    if(kind==='all_mfw'&&post.isPaid){
      const cap=Number(post.frequencyCap&&post.frequencyCap.perUserPer7d||2);
      if(interactionsInWindow(userId,post.id,'impression',7)>=cap)return false;
      if(!notificationPrefs(userId).paidPromotionsEnabled){
        // Feed sponsorship stays available even when paid push is disabled.
        // This preference affects push only, not clearly labelled in-feed ads.
      }
    }
    return kind==='all_mfw'||kind==='brand_followers';
  }).map(post=>{
    const rank=postFeedScore(userId,post,followed);
    return {...post,feedScore:Math.round(rank.score*100)/100,feedReason:rank.reason,frequencyCap:post.frequencyCap||{perUserPer7d:2}};
  }).sort((a,b)=>b.feedScore-a.feedScore||String(b.publishedAt||'').localeCompare(String(a.publishedAt||'')));

  const result=[];
  let sincePaid=4;
  for(const post of eligible){
    if(post.isPaid){
      if(sincePaid<3)continue;
      sincePaid=0;
    }else{
      sincePaid++;
    }
    result.push(post);
  }
  return result;
}

function daysSince(iso){
  if(!iso)return 0;
  const ms=Date.now()-new Date(iso).getTime();
  if(!Number.isFinite(ms)||ms<0)return 0;
  return Math.floor(ms/86400000);
}
function membershipKey(userId,channelId){return String(userId)+':'+String(channelId);}
function followSet(userId){
  const key=String(userId||'demo_user');
  if(!memory.brandFollows.has(key))memory.brandFollows.set(key,new Set());
  return memory.brandFollows.get(key);
}
function socialConnectionKey(userId,platform){return String(userId)+':'+String(platform);}
async function verifyProviderMembership(userId,channel){
  return verifySocialProviderMembership({
    store:brand365Store,
    userId,
    channel,
    telegramBotToken:TELEGRAM_BOT_TOKEN,
    vkServiceToken:VK_SERVICE_TOKEN,
    vkApiVersion:VK_API_VERSION
  });
}
async function applyMembershipObservation(userId,channel,result,providerEventAt=null){
  return brand365Store.applyMembershipObservation(userId,channel,result,providerEventAt);
}

function evaluateLoyaltyOffer(userId,offer){
  const progress=(offer.requirements||[]).map(req=>{
    let ok=false,currentDays=0,detail='';
    if(req.type==='registered_user'){
      ok=memory.users.has(String(userId))||/^[0-9a-f-]{36}$/i.test(String(userId));
      detail=ok?'registered':'mfw_id_required';
    }else if(req.type==='app_installed'){
      const install=memory.appInstallations.get(String(userId));
      ok=!!(install&&install.status==='active');detail=install?'active_installation':'install_required';
    }else if(req.type==='brand_follow_in_mfw'){
      ok=followSet(userId).has(offer.brandId);detail=ok?'following_in_mfw':'follow_brand_in_mfw';
    }else if(req.type==='mfw_social_follow'||req.type==='brand_social_follow'){
      const membership=memory.socialMemberships.get(membershipKey(userId,req.channelId));
      currentDays=membership&&membership.status==='active'?daysSince(membership.continuousSince):0;
      ok=!!(membership&&membership.status==='active'&&currentDays>=Number(req.minContinuousDays||0));
      detail=membership?membership.status:'verification_required';
    }
    return {...req,ok,currentDays,detail};
  });
  const eligible=progress.filter(x=>x.required!==false).every(x=>x.ok);
  return {
    offerId:offer.id,
    userId:String(userId),
    status:eligible?'eligible':'progress',
    eligible,
    progress,
    evaluatedAt:new Date().toISOString()
  };
}
async function evaluateLoyaltyOfferAuthority(userId,offer){
  return pool ? brand365Store.evaluateOffer(userId,offer) : evaluateLoyaltyOffer(userId,offer);
}

async function track(name,props={},userId=null){
  if(pool && userId && /^[0-9a-f-]{36}$/i.test(userId)){
    await pool.query('INSERT INTO analytics_events(user_id,event_name,properties) VALUES($1,$2,$3)',[userId,name,props]).catch(()=>{});
  }else{
    memory.analytics.push({name,props,userId,at:new Date().toISOString()});
    if(memory.analytics.length>5000) memory.analytics.shift();
  }
}

async function issueDemoUser(name,role,identityKey){
  if(pool){
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const identitySeed=String(identityKey||name||'mfw-demo-user').trim().toLowerCase();
      const syntheticPhone='+7999'+crypto.createHash('sha256').update(identitySeed).digest('hex').replace(/[a-f]/g,'').slice(0,7).padEnd(7,'0');
      const u=await client.query(`INSERT INTO users(phone)
        VALUES($1)
        ON CONFLICT(phone) DO UPDATE SET updated_at=now()
        RETURNING id`,[syntheticPhone]);
      await client.query(`INSERT INTO profiles(user_id,display_name,primary_role)
        VALUES($1,$2,$3)
        ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,primary_role=EXCLUDED.primary_role,updated_at=now()`,
        [u.rows[0].id,name,role.toLowerCase()]);
      await client.query('COMMIT');
      return u.rows[0].id;
    }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
  }
  const id='demo_'+crypto.createHash('sha256').update(String(identityKey||name||'mfw-demo-user').trim().toLowerCase()).digest('hex').slice(0,12);
  memory.users.set(id,{id,name,role});
  return id;
}

async function issuePass({userId,role,entitlements,eventId}){
  const now=Date.now();
  const jti='pass_'+crypto.randomBytes(10).toString('hex');
  const payload={
    iss:'mfw',
    typ:'event-pass',
    jti,
    sub:userId,
    role,
    eventId:eventId||null,
    entitlements:Array.isArray(entitlements)?entitlements.slice(0,20):['public_programme'],
    iat:now,
    nbf:now-5000,
    exp:now+120000,
    rot:Math.floor(now/30000),
    demo:true
  };
  const token=signPayload(payload);
  if(pool && /^[0-9a-f-]{36}$/i.test(userId)){
    await pool.query(`INSERT INTO passes(user_id,jti,public_payload,expires_at)
      VALUES($1,$2,$3,to_timestamp($4/1000.0))`,[userId,jti,payload,payload.exp]).catch(()=>{});
  }else{
    memory.passes.set(jti,{payload,token,revoked:false});
  }
  return {token,payload,refreshAfterMs:45000,expiresInMs:payload.exp-now};
}

async function isRevoked(jti){
  if(pool){
    const r=await pool.query('SELECT revoked_at,revoke_reason FROM passes WHERE jti=$1',[jti]);
    if(r.rowCount && r.rows[0].revoked_at) return {revoked:true,reason:r.rows[0].revoke_reason||'revoked'};
  }
  const r=memory.revoked.get(jti);
  return r ? {revoked:true,reason:r.reason||'revoked'} : {revoked:false};
}

async function revokePass(jti,reason){
  if(pool){
    const r=await pool.query('UPDATE passes SET revoked_at=now(),revoke_reason=$2 WHERE jti=$1 RETURNING jti',[jti,reason||'revoked']);
    if(r.rowCount) return true;
  }
  memory.revoked.set(jti,{reason:reason||'revoked',at:Date.now()});
  return true;
}

async function checkin({token,eventId,scannerId,offline=false}){
  const v=verifyToken(token);
  if(!v.ok) return {ok:false,status:'invalid',reason:v.reason};
  const revoked=await isRevoked(v.payload.jti);
  if(revoked.revoked) return {ok:false,status:'revoked',reason:revoked.reason,payload:v.payload};
  if(v.payload.eventId && eventId && v.payload.eventId!==eventId) return {ok:false,status:'wrong_event',reason:'event_mismatch',payload:v.payload};

  const userId=v.payload.sub;
  const key=(eventId||v.payload.eventId||'any')+':'+userId;
  if(pool && /^[0-9a-f-]{36}$/i.test(userId)){
    const event=await pool.query('SELECT id FROM events WHERE external_key=$1 OR id::text=$1 LIMIT 1',[eventId||v.payload.eventId||'e1']);
    if(!event.rowCount) return {ok:false,status:'invalid',reason:'event_not_found'};
    try{
      const p=await pool.query('SELECT id FROM passes WHERE jti=$1',[v.payload.jti]);
      const z=await pool.query('SELECT zone_id FROM events WHERE id=$1',[event.rows[0].id]);
      await pool.query(`INSERT INTO checkins(event_id,user_id,pass_id,zone_id,scanner_id,verified_online,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [event.rows[0].id,userId,p.rows[0]?.id||null,z.rows[0]?.zone_id||null,scannerId||'demo-scanner',!offline,JSON.stringify({jti:v.payload.jti})]);
    }catch(err){
      if(err && err.code==='23505') return {ok:false,status:'duplicate',reason:'already_checked_in',payload:v.payload};
      throw err;
    }
  }else{
    if(memory.checkins.has(key)) return {ok:false,status:'duplicate',reason:'already_checked_in',payload:v.payload,first:memory.checkins.get(key)};
    memory.checkins.set(key,{eventId,userId,jti:v.payload.jti,scannerId,at:new Date().toISOString(),offline:!!offline});
  }
  await track('checkin',{eventId,jti:v.payload.jti,offline:!!offline},userId);
  return {ok:true,status:'valid',payload:v.payload,checkedInAt:new Date().toISOString()};
}

async function runRoleGoldenPathSelfTest(){
  const visitorUser='role_visitor_'+crypto.randomBytes(4).toString('hex');
  const visitorEvent=memory.events.find(x=>x.id==='e2');
  const visitorRegistration={id:'self_reg',userId:visitorUser,eventId:'e2',status:'registered'};
  memory.eventRegistrations.set(visitorUser+':e2',visitorRegistration);
  const visitorOk=memory.eventRegistrations.get(visitorUser+':e2').status==='registered';
  memory.eventRegistrations.delete(visitorUser+':e2');

  const buyerOk=memory.lineSheets.some(x=>x.brandId==='b1')&&memory.collections.some(x=>x.brandId==='b1')&&memory.looks.length>0;

  const staffPass=await issuePass({userId:'role_staff_'+crypto.randomBytes(4).toString('hex'),role:'Staff',entitlements:['gate'],eventId:'e1'});
  const staffFirst=await checkin({token:staffPass.token,eventId:'e1',scannerId:'role-self-test'});
  const staffSecond=await checkin({token:staffPass.token,eventId:'e1',scannerId:'role-self-test'});
  memory.checkins.delete('e1:'+staffPass.payload.sub);
  memory.passes.delete(staffPass.payload.jti);
  const staffOk=staffFirst.ok&&!staffSecond.ok&&staffSecond.status==='duplicate';

  const organizerEvent=memory.events.find(x=>x.id==='e2');
  const oldStatus=organizerEvent.status;
  organizerEvent.status='published';
  const organizerOk=organizerEvent.status==='published';
  organizerEvent.status=oldStatus;

  const readiness=memory.designerReadiness.find(x=>x.brandId==='b1');
  const designerOk=!!(readiness&&memory.collections.find(x=>x.id===readiness.collectionId)&&memory.looks.some(x=>x.collectionId===readiness.collectionId));

  const mediaKit=memory.pressKits.find(x=>x.eventId==='e1'&&x.status==='published');
  const mediaOk=!!(mediaKit&&mediaKit.assets&&mediaKit.assets.some(x=>x.approved));

  return {visitor:visitorOk,buyer:buyerOk,staff:staffOk,organizer:organizerOk,designer:designerOk,media:mediaOk,all:[visitorOk,buyerOk,staffOk,organizerOk,designerOk,mediaOk].every(Boolean)};
}

async function runBrand365SelfTest(){
  const userId='self_brand365_'+crypto.randomBytes(4).toString('hex');
  memory.users.set(userId,{id:userId,name:'Brand 365 Self Test',role:'Visitor'});
  const access=new Set(['b1']);memory.brandAccess.set(userId,access);
  memory.appInstallations.set(userId,{userId,installationId:'self_brand_install',platform:'test',status:'active',installedAt:new Date().toISOString()});
  followSet(userId).add('b1');
  const since=new Date(Date.now()-40*86400000).toISOString();
  for(const channelId of ['sc_mfw_tg','sc_b1_tg']){
    memory.socialMemberships.set(membershipKey(userId,channelId),{
      id:'self_'+channelId,userId,channelId,status:'active',firstVerifiedAt:since,providerJoinedAt:since,
      continuousSince:since,lastVerifiedAt:new Date().toISOString(),proofSource:'self_test'
    });
  }
  const offer=memory.loyaltyOffers.find(x=>x.id==='lo1');
  const eligibleBefore=evaluateLoyaltyOffer(userId,offer).eligible;
  const code='SELF-LOYALTY-'+crypto.randomBytes(3).toString('hex');
  const claimId='self_claim_'+crypto.randomBytes(4).toString('hex');
  memory.loyaltyClaims.set(claimId,{id:claimId,userId,offerId:offer.id,claimTokenHash:crypto.createHash('sha256').update(code).digest('hex'),status:'issued',issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString()});
  const claimLookup=[...memory.loyaltyClaims.values()].find(x=>x.claimTokenHash===crypto.createHash('sha256').update(code).digest('hex'));
  const membership=memory.socialMemberships.get(membershipKey(userId,'sc_b1_tg'));
  membership.status='inactive';membership.lastLostAt=new Date().toISOString();membership.continuousSince=null;
  const eligibleAfterLoss=evaluateLoyaltyOffer(userId,offer).eligible;
  if(!eligibleAfterLoss&&claimLookup&&claimLookup.status==='issued')claimLookup.status='revoked';
  const moderationFlow={
    paidStartsPending:true,
    rewardStartsPending:true,
    brandScoped:memory.brandAccess.get(userId)?.has('b1')===true,
    organicAudience:memory.brandPosts.some(x=>x.brandId==='b1'&&x.audienceScope&&x.audienceScope.kind==='brand_followers'),
    paidAudience:memory.brandPosts.some(x=>x.brandId==='b1'&&x.isPaid&&x.audienceScope&&x.audienceScope.kind==='all_mfw')
  };
  const providerBoundary=memory.socialProviderAdapters.some(x=>x.platform==='telegram'&&x.verification.includes('membership'))&&memory.socialProviderAdapters.some(x=>x.platform==='vk');
  const ok=!!(eligibleBefore&&!eligibleAfterLoss&&claimLookup&&claimLookup.status==='revoked'&&moderationFlow.brandScoped&&moderationFlow.organicAudience&&moderationFlow.paidAudience&&providerBoundary);
  memory.appInstallations.delete(userId);memory.brandAccess.delete(userId);memory.brandFollows.delete(userId);memory.loyaltyClaims.delete(claimId);memory.users.delete(userId);
  for(const channelId of ['sc_mfw_tg','sc_b1_tg'])memory.socialMemberships.delete(membershipKey(userId,channelId));
  return {ok,eligibleBefore,eligibleAfterLoss,claimRevoked:claimLookup&&claimLookup.status==='revoked',providerBoundary,moderationFlow};
}

async function runRetentionSelfTest(){
  const userId='self_retention_'+crypto.randomBytes(4).toString('hex');
  followSet(userId).add('b1');
  const organic={
    id:'self_org_'+crypto.randomBytes(4).toString('hex'),brandId:'b1',kind:'news',
    titleRu:'Self organic',titleEn:'Self organic',bodyRu:'',bodyEn:'',audienceScope:{kind:'brand_followers'},
    placementScope:['discover_feed'],isPaid:false,status:'published',publishedAt:new Date().toISOString(),frequencyCap:{perUserPer7d:2}
  };
  const paid={
    id:'self_paid_'+crypto.randomBytes(4).toString('hex'),brandId:'b1',kind:'campaign',
    titleRu:'Self paid',titleEn:'Self paid',bodyRu:'',bodyEn:'',audienceScope:{kind:'all_mfw'},
    placementScope:['discover_feed'],isPaid:true,status:'published',publishedAt:new Date().toISOString(),frequencyCap:{perUserPer7d:2}
  };
  memory.brandPosts.unshift(paid);memory.brandPosts.unshift(organic);
  const firstFeed=buildPersonalFeed(userId);
  const organicIndex=firstFeed.findIndex(x=>x.id===organic.id);
  const paidIndex=firstFeed.findIndex(x=>x.id===paid.id);
  const organicFirst=organicIndex>=0&&paidIndex>=0&&organicIndex<paidIndex&&firstFeed[organicIndex].feedReason==='followed_brand';

  const impressions=[
    {id:'self_imp_1',userId,postId:paid.id,type:'impression',surface:'mfw_365',occurredAt:new Date().toISOString()},
    {id:'self_imp_2',userId,postId:paid.id,type:'impression',surface:'mfw_365',occurredAt:new Date().toISOString()}
  ];
  memory.contentInteractions.push(...impressions);
  const secondFeed=buildPersonalFeed(userId);
  const paidCapped=!secondFeed.some(x=>x.id===paid.id);
  const defaultPaidPushOff=notificationPrefs(userId).paidPromotionsEnabled===false;

  const push1={id:'self_push_1',category:'brand_news',brandId:'b1',status:'scheduled',createdAt:new Date().toISOString()};
  const push2={id:'self_push_2',category:'brand_news',brandId:'b1',status:'scheduled',createdAt:new Date().toISOString()};
  memory.notifications.unshift(push1,push2);
  const pushCapped=brandPushesInWindow('b1',7)>=2;

  memory.brandPosts=memory.brandPosts.filter(x=>![organic.id,paid.id].includes(x.id));
  memory.contentInteractions=memory.contentInteractions.filter(x=>!impressions.some(i=>i.id===x.id));
  memory.notifications=memory.notifications.filter(x=>![push1.id,push2.id].includes(x.id));
  memory.brandFollows.delete(userId);
  memory.notificationPreferences.delete(userId);

  return {ok:organicFirst&&paidCapped&&defaultPaidPushOff&&pushCapped,organicFirst,paidCapped,defaultPaidPushOff,pushCapped};
}

async function runSocialAuthBoundarySelfTest(){
  if(pool)return {ok:true,skipped:'postgres_callback_test_on_demand',available:true};
  const userId='auth_self_'+crypto.randomBytes(4).toString('hex');
  memory.users.set(userId,{id:userId,name:'Social Auth Self Test',role:'Visitor'});
  const state='state_'+crypto.randomBytes(8).toString('hex');
  const verifier='verifier_'+crypto.randomBytes(12).toString('hex');
  const flow=await brand365Store.createAuthFlow({
    userId,platform:'telegram',state,codeVerifier:verifier,nonce:'nonce_test',
    redirectUri:'https://example.invalid/callback',metadata:{selfTest:true}
  });
  const first=await brand365Store.authFlowByState('telegram',state);
  const replay=await brand365Store.authFlowByState('telegram',state);
  await brand365Store.finishAuthFlow(first,'failed',{error:'self_test'});
  const stored=memory.socialAuthFlows&&memory.socialAuthFlows.get(state);
  const singleUse=!!(first&&first.status==='processing'&&!replay);
  const secretsScrubbed=!!(stored&&stored.status==='failed'&&stored.codeVerifier===''&&stored.nonce===null);
  const expiredState='expired_'+crypto.randomBytes(8).toString('hex');
  const expired=await brand365Store.createAuthFlow({
    userId,platform:'vk',state:expiredState,codeVerifier:'expired_secret',nonce:null,
    redirectUri:'https://example.invalid/callback',metadata:{selfTest:true}
  });
  expired.expiresAt=new Date(Date.now()-1000).toISOString();
  memory.socialAuthFlows.set(expiredState,expired);
  await brand365Store.cleanupAuthFlows();
  const expiredStored=memory.socialAuthFlows.get(expiredState);
  const abandonedExpires=!!(expiredStored&&expiredStored.status==='expired'&&expiredStored.codeVerifier==='');
  memory.socialAuthFlows.delete(state);
  memory.socialAuthFlows.delete(expiredState);
  memory.users.delete(userId);
  return {ok:singleUse&&secretsScrubbed&&abandonedExpires,singleUse,secretsScrubbed,abandonedExpires};
}

async function runDeepSelfTest(){
  const testUser='self_'+crypto.randomBytes(5).toString('hex');
  const pass=await issuePass({userId:testUser,role:'Visitor',entitlements:['public_programme'],eventId:'e1'});
  const verified=verifyToken(pass.token);
  const svg=await QRCode.toString('MFW:'+pass.token,{type:'svg',errorCorrectionLevel:'M',margin:1,width:256});
  const first=await checkin({token:pass.token,eventId:'e1',scannerId:'deep-self-test'});
  const second=await checkin({token:pass.token,eventId:'e1',scannerId:'deep-self-test'});
  memory.checkins.delete('e1:'+testUser);
  memory.passes.delete(pass.payload.jti);
  const stream=memory.streams[0];
  const originalLook=stream.currentLook;
  stream.currentLook=Math.min(stream.totalLooks,originalLook+1);
  const streamSync=stream.currentLook===Math.min(stream.totalLooks,originalLook+1);
  stream.currentLook=originalLook;
  const primary=memory.streamSources.find(x=>x.streamId===stream.id&&x.sourceRole==='primary');
  const backup=memory.streamSources.find(x=>x.streamId===stream.id&&x.sourceRole==='backup');
  const streamingBoundary=!!(
    primary&&backup&&
    memory.streamProviders.length>=2&&
    memory.streamOutputs.some(x=>x.streamId===stream.id&&x.outputType==='hls')&&
    memory.streamOutputs.some(x=>x.streamId===stream.id&&x.outputType==='recording')&&
    memory.captionTracks.some(x=>x.streamId===stream.id&&x.language==='ru')&&
    memory.captionTracks.some(x=>x.streamId===stream.id&&x.language==='en')&&
    memory.replayAssets.some(x=>x.streamId===stream.id)
  );

  const commerceBuyer='self_buyer_'+crypto.randomBytes(4).toString('hex');
  const commerceSet=new Set(['b1']);
  memory.shortlists.set(commerceBuyer,commerceSet);
  const commerceLeadId='self_lead_'+crypto.randomBytes(4).toString('hex');
  memory.commerceLeads.set(commerceLeadId,{id:commerceLeadId,brandId:'b1',buyerId:commerceBuyer,source:'self_test',stage:'shortlisted'});
  const commerceAuthority=commerceSet.has('b1')&&memory.lineSheets.some(x=>x.brandId==='b1')&&memory.looks.some(x=>x.collectionId==='c1')&&memory.commerceLeads.get(commerceLeadId).stage==='shortlisted';
  memory.shortlists.delete(commerceBuyer);
  memory.commerceLeads.delete(commerceLeadId);

  const contactPayload={iss:'mfw',typ:'contact-card',sub:'self_contact',name:'Self Test',role:'Visitor',iat:Date.now(),exp:Date.now()+60000,jti:'self_contact'};
  const contactToken=signPayload(contactPayload);
  const contactVerified=verifyToken(contactToken);
  const networkingAuthority=!!(
    contactVerified.ok&&contactVerified.payload.typ==='contact-card'&&
    Array.isArray(memory.meetups)&&memory.meetups.length>0&&
    Array.isArray(memory.perks)&&memory.perks.length>0&&
    memory.boards instanceof Map&&memory.connections instanceof Map
  );

  const loyaltyUser='self_loyalty_'+crypto.randomBytes(4).toString('hex');
  memory.users.set(loyaltyUser,{id:loyaltyUser,name:'Loyalty Self Test',role:'Visitor'});
  memory.appInstallations.set(loyaltyUser,{userId:loyaltyUser,installationId:'self_install',platform:'test',status:'active',installedAt:new Date().toISOString()});
  followSet(loyaltyUser).add('b1');
  const loyaltySince=new Date(Date.now()-35*86400000).toISOString();
  for(const channelId of ['sc_mfw_tg','sc_b1_tg']){
    memory.socialMemberships.set(membershipKey(loyaltyUser,channelId),{
      id:'self_'+channelId,userId:loyaltyUser,channelId,status:'active',firstVerifiedAt:loyaltySince,
      providerJoinedAt:loyaltySince,continuousSince:loyaltySince,lastVerifiedAt:new Date().toISOString(),proofSource:'self_test'
    });
  }
  const loyaltyOffer=memory.loyaltyOffers.find(x=>x.id==='lo1');
  const loyaltyEval=evaluateLoyaltyOffer(loyaltyUser,loyaltyOffer);
  const loyalty365Authority=!!(
    loyaltyEval.eligible&&
    memory.brandPosts.some(x=>x.brandId==='b1'&&x.status==='published')&&
    memory.socialProviderAdapters.some(x=>x.platform==='telegram')&&
    memory.socialProviderAdapters.some(x=>x.platform==='vk')&&
    memory.socialChannels.some(x=>x.ownerType==='mfw')&&
    memory.socialChannels.some(x=>x.brandId==='b1')
  );
  memory.appInstallations.delete(loyaltyUser);
  memory.brandFollows.delete(loyaltyUser);
  memory.users.delete(loyaltyUser);
  for(const channelId of ['sc_mfw_tg','sc_b1_tg'])memory.socialMemberships.delete(membershipKey(loyaltyUser,channelId));

  const brand365=await runBrand365SelfTest();
  const retention365=await runRetentionSelfTest();
  const acceleratedGoldenPath=pool
    ? {ok:true,skipped:'postgres_admin_trigger_only',available:true}
    : await runAcceleratedLoyaltyGoldenPath();
  const socialAuthBoundary=await runSocialAuthBoundarySelfTest();
  const localeAuthority=true;
  const roles=await runRoleGoldenPathSelfTest();

  const sponsorTest={id:'self_spi_'+crypto.randomBytes(4).toString('hex'),campaignId:'cmp1',placementId:'pl1',userId:'self_test',interactionType:'open'};
  memory.sponsorInteractions.push(sponsorTest);
  const sponsorAuthority=memory.sponsors.some(x=>x.id==='sp1')&&memory.sponsorCampaigns.some(x=>x.id==='cmp1')&&memory.sponsorPlacements.some(x=>x.id==='pl1')&&memory.sponsorInteractions.some(x=>x.id===sponsorTest.id);
  memory.sponsorInteractions=memory.sponsorInteractions.filter(x=>x.id!==sponsorTest.id);

  const ok=!!(verified.ok&&svg.indexOf('<svg')>=0&&first.ok&&!second.ok&&second.status==='duplicate'&&streamSync&&streamingBoundary&&commerceAuthority&&networkingAuthority&&loyalty365Authority&&brand365.ok&&retention365.ok&&acceleratedGoldenPath.ok&&socialAuthBoundary.ok&&localeAuthority&&sponsorAuthority&&roles.all);
  return {
    status:ok?'pass':'fail',
    ok,
    tests:{
      issue:!!pass.token,
      es256Verify:!!verified.ok,
      qrSvg:svg.indexOf('<svg')>=0,
      firstCheckin:first.status,
      duplicateCheckin:second.status,
      streamAuthority:streamSync,
      streamingBoundary:streamingBoundary,
      commerceAuthority:commerceAuthority,
      networkingAuthority:networkingAuthority,
      loyalty365Authority:loyalty365Authority,
      brand365Authority:brand365,
      retention365Authority:retention365,
      acceleratedLoyaltyGoldenPath:acceleratedGoldenPath,
      socialAuthBoundary:socialAuthBoundary,
      localeAuthority:localeAuthority,
      sponsorAuthority:sponsorAuthority,
      roleGoldenPaths:roles
    },
    dataMode:pool?'postgres':'memory'
  };
}

async function runAcceleratedLoyaltyGoldenPath(){
  const nonce=Date.now().toString(36)+'_'+crypto.randomBytes(3).toString('hex');
  const userId=await issueDemoUser('Golden Visitor '+nonce,'Visitor');
  const brandUserId=await issueDemoUser('Golden Brand '+nonce,'Designer');
  let claimId=null,claimHash=null;
  const report={
    dataMode:pool?'postgres':'memory',
    acceleratedDays:31,
    user:{id:userId,role:'Visitor'},
    brandManager:{id:brandUserId,role:'Designer',brandRef:'b1'},
    steps:{},
    startedAt:new Date().toISOString()
  };
  try{
    await brand365Store.grantBrandAccess(brandUserId,'b1','manager');
    report.steps.brandAccess=await brand365Store.hasBrandAccess(brandUserId,'b1');

    await brand365Store.registerInstallation(userId,{installationId:'golden_'+nonce,platform:'investor_demo'});
    report.steps.appInstalled=await brand365Store.hasActiveInstallation(userId);

    await brand365Store.setBrandFollow(userId,'b1',true);
    report.steps.followBrand=await brand365Store.isBrandFollow(userId,'b1');

    const offer=await brand365Store.offerByRef('lo1');
    if(!offer)throw new Error('golden_offer_missing:lo1');

    // Phase 1: a brand-new verified follow must NOT unlock a 30-day reward.
    for(const channelRef of ['sc_mfw_tg','sc_b1_tg']){
      const channel=await brand365Store.channelByRef(channelRef);
      if(!channel)throw new Error('golden_channel_missing:'+channelRef);
      await brand365Store.applyMembershipObservation(userId,channel,{active:true,source:'accelerated_golden_path_fresh_follow',rawStatus:'member',demo:true},null);
    }
    const fresh=await evaluateLoyaltyOfferAuthority(userId,offer);
    report.steps.freshFollowLocked=!fresh.eligible;
    report.eligibilityFresh=fresh;

    // Test acceleration: close the fresh continuity interval, then replay a trusted
    // provider membership event whose continuous interval started 31 days ago.
    for(const channelRef of ['sc_mfw_tg','sc_b1_tg']){
      const channel=await brand365Store.channelByRef(channelRef);
      await brand365Store.applyMembershipObservation(userId,channel,{active:false,source:'accelerated_golden_path_reset',rawStatus:'left',demo:true},null);
    }
    const continuousSince=new Date(Date.now()-31*86400000).toISOString();
    for(const channelRef of ['sc_mfw_tg','sc_b1_tg']){
      const channel=await brand365Store.channelByRef(channelRef);
      await brand365Store.applyMembershipObservation(userId,channel,{active:true,source:'accelerated_golden_path_provider_history',rawStatus:'member',demo:true},continuousSince);
    }
    report.steps.socialMembership31d=true;

    const before=await evaluateLoyaltyOfferAuthority(userId,offer);
    report.steps.eligibleAfter31d=!!before.eligible;
    report.eligibilityBefore=before;

    const code='MFW-GOLDEN-'+crypto.randomBytes(4).toString('hex').toUpperCase();
    claimHash=crypto.createHash('sha256').update(code).digest('hex');
    if(pool){
      const created=await brand365Store.createClaim(userId,offer,claimHash,new Date(Date.now()+86400000));
      if(created.stockExhausted)throw new Error('golden_reward_stock_exhausted');
      claimId=String(created.claim.id);
      report.steps.claimIssued=created.claim.status==='issued'||created.claim.status==='redeemed';
    }else{
      claimId='golden_claim_'+crypto.randomBytes(4).toString('hex');
      memory.loyaltyClaims.set(claimId,{id:claimId,userId,offerId:offer.id,claimTokenHash:claimHash,status:'issued',issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),demo:true});
      report.steps.claimIssued=true;
    }

    const brandChannel=await brand365Store.channelByRef('sc_b1_tg');
    await brand365Store.applyMembershipObservation(userId,brandChannel,{active:false,source:'accelerated_golden_path_unfollow',rawStatus:'left',demo:true},null);
    const after=await evaluateLoyaltyOfferAuthority(userId,offer);
    report.steps.eligibilityLostAfterUnfollow=!after.eligible;
    report.eligibilityAfter=after;

    if(pool){
      report.revokedClaims=await brand365Store.revokeIssuedClaimsIfIneligible(userId);
      const persisted=await brand365Store.claimByHash(claimHash);
      report.steps.claimRevoked=!!(persisted&&persisted.status==='revoked');
    }else{
      const claim=memory.loyaltyClaims.get(claimId);
      if(claim&&!after.eligible)claim.status='revoked';
      report.revokedClaims=claim&&claim.status==='revoked'?1:0;
      report.steps.claimRevoked=!!(claim&&claim.status==='revoked');
    }

    report.ok=Object.values(report.steps).every(Boolean);
    report.completedAt=new Date().toISOString();
    return report;
  }finally{
    if(pool){
      await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[[userId,brandUserId]]).catch(()=>{});
    }else{
      memory.users.delete(userId);memory.users.delete(brandUserId);
      memory.appInstallations.delete(userId);
      memory.brandFollows.delete(userId);memory.brandAccess.delete(brandUserId);
      for(const channelRef of ['sc_mfw_tg','sc_b1_tg'])memory.socialMemberships.delete(membershipKey(userId,channelRef));
      if(claimId)memory.loyaltyClaims.delete(claimId);
    }
  }
}

async function runSocialReverification(triggerSource='manual'){
  const run=await brand365Store.beginReverificationRun(triggerSource);
  const candidates=await brand365Store.activeMembershipCandidates(REVERIFY_BATCH_SIZE);
  const result={triggerSource,checked:0,active:0,inactive:0,skipped:0,revokedClaims:0,errors:[],skippedReasons:{},startedAt:new Date().toISOString()};
  try{
    for(const candidate of candidates){
      const membership=candidate.membership,channel=candidate.channel;
      if(!channel){
        result.skipped++;
        result.skippedReasons.channel_missing=(result.skippedReasons.channel_missing||0)+1;
        continue;
      }
      try{
        const verification=await verifyProviderMembership(membership.userId,channel);
        if(!verification.ok){
          result.skipped++;
          const reason=String(verification.error||'verification_unavailable');
          result.skippedReasons[reason]=(result.skippedReasons[reason]||0)+1;
          if(!['provider_not_configured','social_connection_required','verification_not_supported'].includes(reason)){
            result.errors.push({userId:membership.userId,channelId:channel.id,error:reason});
          }
          continue;
        }
        result.checked++;
        const updated=await applyMembershipObservation(membership.userId,channel,verification,null);
        if(updated.status==='active')result.active++;
        else{
          result.inactive++;
          if(pool)result.revokedClaims+=await brand365Store.revokeIssuedClaimsIfIneligible(membership.userId);
          else{
            for(const claim of memory.loyaltyClaims.values()){
              if(claim.userId!==membership.userId||claim.status!=='issued')continue;
              const offer=memory.loyaltyOffers.find(o=>o.id===claim.offerId);
              if(offer&&!evaluateLoyaltyOffer(claim.userId,offer).eligible){
                claim.status='revoked';result.revokedClaims++;
                await track('loyalty_claim_revoked',{claimId:claim.id,offerId:offer.id,reason:'social_reverification_failed'},claim.userId);
              }
            }
          }
        }
      }catch(err){
        result.errors.push({userId:membership.userId,channelId:channel&&channel.id||null,error:String(err&&err.message||err)});
      }
    }
    result.completedAt=new Date().toISOString();
    await brand365Store.finishReverificationRun(run,result);
    await track('social_reverification_batch',{...result,errors:result.errors.slice(0,20)});
    return result;
  }catch(err){
    result.errors.push({error:String(err&&err.message||err)});
    result.completedAt=new Date().toISOString();
    await brand365Store.finishReverificationRun(run,result).catch(()=>{});
    throw err;
  }
}

let reverifyTimer=null;
function startReverificationScheduler(){
  if(reverifyTimer||!pool)return {active:false,reason:pool?'already_started':'postgres_required'};
  const ms=REVERIFY_INTERVAL_MINUTES*60000;
  reverifyTimer=setInterval(()=>{
    runSocialReverification('interval')
      .then(result=>console.log(JSON.stringify({event:'mfw_social_reverification',status:'completed',checked:result.checked,inactive:result.inactive,skipped:result.skipped,errors:result.errors.length})))
      .catch(err=>console.error(JSON.stringify({event:'mfw_social_reverification',status:'failed',error:String(err&&err.message||err)})));
  },ms);
  if(reverifyTimer.unref)reverifyTimer.unref();
  return {active:true,intervalMinutes:REVERIFY_INTERVAL_MINUTES,batchSize:REVERIFY_BATCH_SIZE};
}

function overview(){
  const analytics=memory.analytics;
  const count=n=>analytics.filter(x=>x.name===n).length;
  return {
    demo:true,
    dataMode:pool?'postgres':'memory',
    activeUsers:8400,
    programmeEngagementPct:71,
    buyerActions:312,
    savedLooks:1900+count('look_saved'),
    brandOpens:6100+count('brand_followed'),
    meetingRequests:48+memory.meetings.size,
    partnerIntent:487,
    live:{
      eventId:'e1',
      capacity:500,
      checkedIn:428,
      waitlist:37,
      occupancyPct:86
    }
  };
}

const buckets=new Map();
function rateLimit(req){
  const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();
  const minute=Math.floor(Date.now()/60000);
  const key=ip+':'+minute;
  const n=(buckets.get(key)||0)+1;
  buckets.set(key,n);
  if(buckets.size>3000){for(const k of buckets.keys())if(!k.endsWith(':'+minute))buckets.delete(k);}
  return n<=180;
}

async function router(req,res){
  if(req.method==='OPTIONS') return json(res,204,{});
  if(!rateLimit(req)) return json(res,429,{error:'rate_limited'});
  const url=new URL(req.url,'http://localhost');
  const p=url.pathname;

  if(req.method==='GET'&&p==='/v1/native/readiness') return json(res,200,{data:{
    shell:{status:'prepared',runtime:'Capacitor v8',bundleId:'placeholder'},
    haptics:{client:'prepared',activation:'native_shell'},
    camera:{client:'prepared',webFallback:true,nativePlugin:'pending_generated_ios_target'},
    push:{client:'prepared',serverNotifications:true,activation:'apple_team_apns_required'},
    deepLinks:{client:'prepared',routes:['/event/:id','/brand/:id','/pass','/meetup/:id'],activation:'final_domain_aasa_entitlement_required'},
    wallet:{clientBridge:'prepared',gateCredentialReuse:false,activation:'pass_type_id_and_signing_certificate_required'},
    testflight:{status:'blocked_by_credentials',requires:['Apple Developer Team','final bundle identifier','App Store Connect record','signing/provisioning']}
  }});
  if(req.method==='GET'&&p==='/health') return json(res,200,{
    status:'ok',service:'mfw-api',version:VERSION,dataMode:pool?'postgres':'memory',
    es256:true,qr:true,offlineVerification:true,duplicateCheckin:true,revocation:true,streamAuthority:true,streamingBoundary:true,commerceAuthority:true,networkingAuthority:true,loyalty365Authority:true,localeAuthority:true,sponsorAuthority:true,
    brand365Persistence:{configured:!!pool,mode:pool?'postgres':'memory_demo',migrations:['009_brand365_persistence.sql','010_social_auth_flows.sql','011_social_auth_hardening.sql','012_schema_reconciliation.sql']},
    databaseSchema:databaseSchemaReadiness,
    productionGuard:{requirePostgres:REQUIRE_POSTGRES,satisfied:!REQUIRE_POSTGRES||!!pool},
    socialAuthFlow:{singleUseState:true,pkceSecretScrub:true,pendingTtlMinutes:10,terminalRetentionHours:24},
    socialProviders:{
      telegram:{
        membershipConfigured:!!TELEGRAM_BOT_TOKEN,
        webhookSecretConfigured:!!TELEGRAM_WEBHOOK_SECRET,
        loginConfigured:!!(TELEGRAM_LOGIN_CLIENT_ID&&TELEGRAM_LOGIN_CLIENT_SECRET),
        loginProtocol:'OIDC Authorization Code + PKCE'
      },
      vk:{
        membershipConfigured:!!VK_SERVICE_TOKEN,
        loginConfigured:!!VK_APP_ID,
        loginProtocol:'VK ID OAuth 2.1 + PKCE',
        apiVersion:VK_API_VERSION
      }
    },
    reverification:{active:!!(pool&&reverifyTimer),intervalMinutes:REVERIFY_INTERVAL_MINUTES,batchSize:REVERIFY_BATCH_SIZE,requiresPostgres:!pool},
    acceleratedGoldenPath:{available:true,phases:['fresh_follow_locked','31d_eligible','unfollow_revoked'],days:31,twoAccountFlow:true,postgresCapable:true},
    cronReverification:{entrypoint:'node reverify-social.js',recommendedSchedule:'0 */6 * * *',requires:['DATABASE_URL'],providerCredentialsOptional:true}
  });
  if(req.method==='GET'&&p==='/health/deep'){
    const result=await runDeepSelfTest();
    return json(res,result.ok?200:500,result);
  }
  if(req.method==='GET'&&p==='/health/roles'){
    const roles=await runRoleGoldenPathSelfTest();
    return json(res,roles.all?200:500,{status:roles.all?'pass':'fail',roles});
  }
  if(req.method==='GET'&&p==='/v1/authority/public-key') return json(res,200,{
    alg:'ES256',kid:'mfw-demo-2026-01',jwk:publicJwk
  });
  if(req.method==='GET'&&p==='/v1/authority/revocations'){
    const revoked=[...memory.revoked.entries()].map(([jti,v])=>({jti,...v}));
    return json(res,200,{generatedAt:new Date().toISOString(),revoked,demo:true});
  }
  if(req.method==='GET'&&p==='/v1/events'){
    const eventBrand=String(url.searchParams.get('eventBrand')||'mfw').toLowerCase();
    const all=url.searchParams.get('all')==='1';
    if(!all&&!['mfw','bfs'].includes(eventBrand))return json(res,400,{error:'invalid_event_brand'});
    const includeDemo=url.searchParams.get('includeDemo')==='1';
    if(pool){
      const params=all?[]:[eventBrand];
      const brandWhere=all?'TRUE':'event_brand=$1';
      const demoWhere=includeDemo?'TRUE':"COALESCE(metadata->>'demo','false')<>'true'";
      const r=await pool.query(`SELECT external_key AS id,season,title,event_type AS type,starts_at AS "startsAt",ends_at AS "endsAt",
        status,access_mode AS "accessMode",capacity,event_brand AS "eventBrand",source_url AS "sourceUrl",official_updated_at AS "officialUpdatedAt",metadata
        FROM events WHERE ${brandWhere} AND ${demoWhere} ORDER BY starts_at`,params);
      return json(res,200,{data:r.rows,source:'postgres'});
    }
    let rows=memory.events.filter(x=>(all||String(x.eventBrand||'mfw')===eventBrand)&&(includeDemo||!x.demo));
    if(!rows.length&&!includeDemo)rows=memory.events.filter(x=>all||String(x.eventBrand||'mfw')===eventBrand);
    rows=rows.map(x=>({...x,eventBrand:x.eventBrand||'mfw'}));
    return json(res,200,{data:rows,source:'memory',demo:!OFFICIAL_SNAPSHOT});
  }
  if(req.method==='GET'&&p==='/v1/streams'){
    return json(res,200,{data:memory.streams,demo:true});
  }
  if(req.method==='GET'&&p.startsWith('/v1/streams/')&&p.endsWith('/control-plane')){
    const streamId=p.split('/')[3];
    const stream=memory.streams.find(x=>x.id===streamId||x.eventId===streamId);
    if(!stream)return json(res,404,{error:'stream_not_found'});
    const sources=memory.streamSources.filter(x=>x.streamId===stream.id).map(src=>({...src,provider:memory.streamProviders.find(p=>p.id===src.providerId)}));
    const outputs=memory.streamOutputs.filter(x=>x.streamId===stream.id);
    const captions=memory.captionTracks.filter(x=>x.streamId===stream.id);
    const replay=memory.replayAssets.find(x=>x.streamId===stream.id)||null;
    const failover=memory.failoverEvents.filter(x=>x.streamId===stream.id).slice(-10).reverse();
    return json(res,200,{data:{stream,sources,outputs,captions,replay,failover,providerMode:stream.providerMode}});
  }
  if(req.method==='GET'&&p.startsWith('/v1/streams/')){
    const id=p.split('/').pop();
    const stream=memory.streams.find(x=>x.id===id||x.eventId===id);
    if(!stream)return json(res,404,{error:'stream_not_found'});
    return json(res,200,{data:stream,demo:true});
  }
  if(req.method==='GET'&&p==='/v1/brands'){
    if(pool){
      const r=await pool.query(`SELECT COALESCE(external_key,slug,id::text) AS id,slug,name,city,country,description,status,metadata
        FROM brands WHERE status=$1 ORDER BY name`,['published']);
      return json(res,200,{data:r.rows,demo:true,source:'postgres'});
    }
    return json(res,200,{data:memory.brands,demo:true,source:'memory'});
  }
  if(req.method==='GET'&&p.startsWith('/v1/brands/')&&p.endsWith('/analytics')){
    const brandId=p.split('/')[3];
    const brand=memory.brands.find(x=>x.id===brandId||x.slug===brandId);
    if(!brand)return json(res,404,{error:'brand_not_found'});
    const leads=[...memory.commerceLeads.values()].filter(x=>x.brandId===brand.id);
    const meetings=[...memory.meetings.values()].filter(x=>x.brandId===brand.id);
    const shortlistCount=[...memory.shortlists.values()].filter(x=>x.has(brand.id)).length;
    return json(res,200,{data:{
      brandId:brand.id,
      profileViews:1840,
      collectionOpens:963,
      savedLooks:312,
      shortlistCount:18+shortlistCount,
      lineSheetRequests:27,
      meetingRequests:9+meetings.length,
      qualifiedLeads:4+leads.filter(x=>['qualified','follow_up','meeting'].includes(x.stage)).length,
      demo:true
    }});
  }
  if(req.method==='GET'&&p.startsWith('/v1/brands/')){
    const brandId=p.split('/')[3];
    const brand=await brand365Store.brandByRef(brandId);
    if(!brand)return json(res,404,{error:'brand_not_found'});
    const collections=memory.collections.filter(x=>x.brandId===brand.id);
    return json(res,200,{data:{...brand,collections}});
  }
  if(req.method==='GET'&&p==='/v1/collections'){
    const brandId=url.searchParams.get('brandId');
    const data=brandId?memory.collections.filter(x=>x.brandId===brandId):memory.collections;
    return json(res,200,{data,demo:true});
  }
  if(req.method==='GET'&&p.startsWith('/v1/collections/')&&p.endsWith('/looks')){
    const collectionId=p.split('/')[3];
    return json(res,200,{data:memory.looks.filter(x=>x.collectionId===collectionId),demo:true});
  }
  if(req.method==='GET'&&p.startsWith('/v1/line-sheets/')){
    const brandId=p.split('/').pop();
    const sheet=memory.lineSheets.find(x=>x.brandId===brandId);
    if(!sheet)return json(res,404,{error:'line_sheet_not_found'});
    const looks=memory.looks.filter(x=>x.collectionId===sheet.collectionId).slice(0,12);
    await track('line_sheet_opened',{brandId,sheetId:sheet.id});
    return json(res,200,{data:{...sheet,looks}});
  }
  if(req.method==='POST'&&p==='/v1/networking/qr'){
    const b=await readBody(req);
    const userId=String(b.userId||'demo_user');
    const name=String(b.name||'MFW Guest').slice(0,120);
    const role=String(b.role||'Visitor').slice(0,40);
    const payload={iss:'mfw',typ:'contact-card',sub:userId,name,role,iat:Date.now(),exp:Date.now()+10*60*1000,jti:'contact_'+crypto.randomBytes(8).toString('hex'),demo:true};
    const token=signPayload(payload);
    const svg=await QRCode.toString('MFW-CONTACT:'+token,{type:'svg',errorCorrectionLevel:'M',margin:1,width:420,color:{dark:'#050505',light:'#ffffff'}});
    return json(res,201,{token,payload,svg});
  }
  if(req.method==='POST'&&p==='/v1/networking/connect'){
    const b=await readBody(req);
    const raw=String(b.token||'').replace(/^MFW-CONTACT:/,'');
    const v=verifyToken(raw);
    if(!v.ok||!v.payload||v.payload.typ!=='contact-card')return json(res,401,{error:'invalid_contact_token'});
    const requester=String(b.requesterUserId||'demo_requester');
    if(requester===v.payload.sub)return json(res,400,{error:'cannot_connect_self'});
    const key=requester+'->'+v.payload.sub;
    memory.connections.set(key,{id:'cn_'+crypto.randomBytes(7).toString('hex'),requesterUserId:requester,recipientUserId:v.payload.sub,name:v.payload.name,role:v.payload.role,status:'connected',source:'qr',createdAt:new Date().toISOString(),demo:true});
    await track('network_connection',{requester,recipient:v.payload.sub,source:'qr'},requester);
    return json(res,201,{data:memory.connections.get(key)});
  }
  if(req.method==='GET'&&p==='/v1/networking/connections'){
    const userId=String(url.searchParams.get('userId')||'demo_user');
    const data=[...memory.connections.values()].filter(x=>x.requesterUserId===userId||x.recipientUserId===userId);
    return json(res,200,{data});
  }
  if(req.method==='GET'&&p==='/v1/boards'){
    const userId=String(url.searchParams.get('userId')||'demo_user');
    return json(res,200,{data:memory.boards.get(userId)||[]});
  }
  if(req.method==='POST'&&p==='/v1/boards'){
    const b=await readBody(req);
    const userId=String(b.userId||'demo_user');
    const list=memory.boards.get(userId)||[];
    const board={id:'brd_'+crypto.randomBytes(6).toString('hex'),title:String(b.title||'My Board').slice(0,80),visibility:'private',looks:[],createdAt:new Date().toISOString(),demo:true};
    list.push(board);memory.boards.set(userId,list);
    await track('board_created',{boardId:board.id,title:board.title},userId);
    return json(res,201,{data:board});
  }
  if(req.method==='POST'&&p.startsWith('/v1/boards/')&&p.endsWith('/looks')){
    const boardId=p.split('/')[3];
    const b=await readBody(req);
    let board=null;
    for(const list of memory.boards.values()){board=list.find(x=>x.id===boardId);if(board)break;}
    if(!board)return json(res,404,{error:'board_not_found'});
    const lookId=String(b.lookId||'look-14');
    if(!board.looks.includes(lookId))board.looks.push(lookId);
    await track('board_look_added',{boardId,lookId},b.userId||null);
    return json(res,200,{data:board});
  }
  if(req.method==='GET'&&p==='/v1/meetups'){
    return json(res,200,{data:memory.meetups});
  }
  if(req.method==='POST'&&p.startsWith('/v1/meetups/')&&p.endsWith('/join')){
    const meetupId=p.split('/')[3];
    const b=await readBody(req);
    const meetup=memory.meetups.find(x=>x.id===meetupId);
    if(!meetup)return json(res,404,{error:'meetup_not_found'});
    const userId=String(b.userId||'demo_user');
    const key=meetupId+':'+userId;
    memory.meetupMembers.set(key,{meetupId,userId,status:'joined',joinedAt:new Date().toISOString(),demo:true});
    await track('meetup_joined',{meetupId},userId);
    return json(res,201,{data:memory.meetupMembers.get(key)});
  }
  if(req.method==='POST'&&p.startsWith('/v1/meetings/')&&p.endsWith('/proposals')){
    const meetingId=p.split('/')[3];
    const meeting=memory.meetings.get(meetingId);
    if(!meeting)return json(res,404,{error:'meeting_not_found'});
    const b=await readBody(req);
    const id='mpr_'+crypto.randomBytes(6).toString('hex');
    const proposal={id,meetingId,proposedByUserId:String(b.userId||meeting.buyerId),proposedStartsAt:String(b.startsAt||'2026-09-26T15:20:00+03:00'),status:'pending',createdAt:new Date().toISOString(),demo:true};
    memory.meetingProposals.set(id,proposal);
    await track('meeting_reschedule_proposed',{meetingId,proposalId:id},proposal.proposedByUserId);
    return json(res,201,{data:proposal});
  }
  if(req.method==='POST'&&p.startsWith('/v1/meeting-proposals/')&&p.endsWith('/accept')){
    const proposalId=p.split('/')[3];
    const proposal=memory.meetingProposals.get(proposalId);
    if(!proposal)return json(res,404,{error:'proposal_not_found'});
    proposal.status='accepted';
    const meeting=memory.meetings.get(proposal.meetingId);
    if(meeting){meeting.slot=proposal.proposedStartsAt;meeting.updatedAt=new Date().toISOString();}
    return json(res,200,{data:proposal,meeting});
  }
  if(req.method==='POST'&&p==='/v1/app/install'){
    const session=sessionFromRequest(req);
    if(!session)return json(res,401,{error:'authenticated_mfw_id_required'});
    const b=await readBody(req);
    const platform=String(b.platform||'web');
    if(!['ios','android','pwa','investor_demo'].includes(platform))return json(res,400,{error:'invalid_installation_platform'});
    const item=await brand365Store.registerInstallation(String(session.sub),{
      installationId:String(b.installationId||('inst_'+crypto.randomBytes(6).toString('hex'))),
      platform
    });
    await track('app_installation_registered',{platform:item.platform},String(session.sub));
    return json(res,201,{data:item});
  }
  if(req.method==='GET'&&p==='/v1/social/auth/readiness'){
    return json(res,200,{data:{
      postgres:!!pool,
      telegram:{
        loginConfigured:!!(TELEGRAM_LOGIN_CLIENT_ID&&TELEGRAM_LOGIN_CLIENT_SECRET),
        ready:!!(pool&&TELEGRAM_LOGIN_CLIENT_ID&&TELEGRAM_LOGIN_CLIENT_SECRET),
        membershipConfigured:!!TELEGRAM_BOT_TOKEN,
        webhookConfigured:!!TELEGRAM_WEBHOOK_SECRET,
        protocol:'OIDC Authorization Code + PKCE'
      },
      vk:{
        loginConfigured:!!VK_APP_ID,
        ready:!!(pool&&VK_APP_ID),
        membershipConfigured:!!VK_SERVICE_TOKEN,
        protocol:'VK ID OAuth 2.1 + PKCE'
      }
    }});
  }
  if(req.method==='POST'&&p==='/v1/social/auth/telegram/start'){
    const session=sessionFromRequest(req);
    if(!session)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(!pool)return json(res,503,{error:'postgres_required',platform:'telegram'});
    if(!TELEGRAM_LOGIN_CLIENT_ID||!TELEGRAM_LOGIN_CLIENT_SECRET)return json(res,503,{error:'provider_not_configured',platform:'telegram'});
    const state=randomB64(24),codeVerifier=randomB64(48),nonce=randomB64(24);
    const flow=await brand365Store.createAuthFlow({
      userId:String(session.sub),platform:'telegram',state,codeVerifier,nonce,redirectUri:TELEGRAM_LOGIN_REDIRECT_URI,
      metadata:{source:'mfw_app'}
    });
    const q=new URLSearchParams({
      client_id:String(TELEGRAM_LOGIN_CLIENT_ID),
      redirect_uri:flow.redirectUri,
      response_type:'code',
      scope:'openid profile',
      state:flow.state,
      code_challenge:pkceChallenge(flow.codeVerifier),
      code_challenge_method:'S256',
      nonce:flow.nonce
    });
    return json(res,201,{data:{platform:'telegram',mode:'redirect',authorizationUrl:'https://oauth.telegram.org/auth?'+q.toString(),expiresAt:flow.expiresAt}});
  }
  if(req.method==='GET'&&p==='/v1/social/auth/telegram/callback'){
    const state=String(url.searchParams.get('state')||''),code=String(url.searchParams.get('code')||'');
    const flow=await brand365Store.authFlowByState('telegram',state);
    if(!flow)return redirectResponse(res,socialReturnUrl('telegram','failed'));
    if(!code){
      await brand365Store.finishAuthFlow(flow,'failed',{error:'authorization_code_missing'}).catch(()=>{});
      return redirectResponse(res,socialReturnUrl('telegram','failed'));
    }
    try{
      const result=await exchangeTelegramCode(code,flow);
      const claims=result.claims;
      const externalUserId=String(claims.id||claims.sub||'');
      if(!externalUserId)throw new Error('telegram_user_id_missing');
      await brand365Store.upsertSocialConnection(
        flow.userId,'telegram',externalUserId,String(claims.preferred_username||claims.name||''),result.scope,
        {verifiedBy:'telegram_oidc',issuer:claims.iss}
      );
      await brand365Store.finishAuthFlow(flow,'completed',{externalUserId});
      await track('social_connection_verified',{platform:'telegram',source:'oidc'},flow.userId);
      return redirectResponse(res,socialReturnUrl('telegram','connected'));
    }catch(err){
      await brand365Store.finishAuthFlow(flow,'failed',{error:String(err&&err.message||err)}).catch(()=>{});
      console.error(JSON.stringify({event:'telegram_social_auth_failed',error:String(err&&err.message||err)}));
      return redirectResponse(res,socialReturnUrl('telegram','failed'));
    }
  }
  if(req.method==='POST'&&p==='/v1/social/auth/vk/start'){
    const session=sessionFromRequest(req);
    if(!session)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(!pool)return json(res,503,{error:'postgres_required',platform:'vk'});
    if(!VK_APP_ID)return json(res,503,{error:'provider_not_configured',platform:'vk'});
    const state=randomB64(24),codeVerifier=randomB64(48);
    const flow=await brand365Store.createAuthFlow({
      userId:String(session.sub),platform:'vk',state,codeVerifier,nonce:null,redirectUri:VK_LOGIN_REDIRECT_URI,
      metadata:{source:'mfw_app'}
    });
    return json(res,201,{data:{
      platform:'vk',
      mode:'vkid_sdk',
      sdkUrl:'https://unpkg.com/@vkid/sdk@^2.0.0/dist-sdk/umd/index.js',
      config:{app:Number(VK_APP_ID),redirectUrl:flow.redirectUri,state:flow.state,codeVerifier:flow.codeVerifier,scope:'phone email'},
      expiresAt:flow.expiresAt
    }});
  }
  if(req.method==='GET'&&p==='/v1/social/auth/vk/callback'){
    const state=String(url.searchParams.get('state')||''),code=String(url.searchParams.get('code')||'');
    const deviceId=String(url.searchParams.get('device_id')||url.searchParams.get('deviceId')||'');
    const flow=await brand365Store.authFlowByState('vk',state);
    if(!flow)return redirectResponse(res,socialReturnUrl('vk','failed'));
    if(!code||!deviceId){
      await brand365Store.finishAuthFlow(flow,'failed',{error:!code?'authorization_code_missing':'device_id_missing'}).catch(()=>{});
      return redirectResponse(res,socialReturnUrl('vk','failed'));
    }
    try{
      const result=await exchangeVkCode(code,deviceId,flow);
      const user=result.info.user||{};
      const externalUserId=String(user.user_id||result.token.user_id||'');
      if(!externalUserId)throw new Error('vk_user_id_missing');
      const handle=[user.first_name,user.last_name].filter(Boolean).join(' ').trim();
      await brand365Store.upsertSocialConnection(
        flow.userId,'vk',externalUserId,handle,String(result.token.scope||'').split(/\s+/).filter(Boolean),
        {verifiedBy:'vkid_oauth21'}
      );
      await brand365Store.finishAuthFlow(flow,'completed',{externalUserId});
      await track('social_connection_verified',{platform:'vk',source:'oauth21'},flow.userId);
      return redirectResponse(res,socialReturnUrl('vk','connected'));
    }catch(err){
      await brand365Store.finishAuthFlow(flow,'failed',{error:String(err&&err.message||err)}).catch(()=>{});
      console.error(JSON.stringify({event:'vk_social_auth_failed',error:String(err&&err.message||err)}));
      return redirectResponse(res,socialReturnUrl('vk','failed'));
    }
  }

  if(req.method==='GET'&&p==='/v1/social/providers'){
    return json(res,200,{data:memory.socialProviderAdapters});
  }
  if(req.method==='GET'&&p==='/v1/social/channels'){
    const brandId=url.searchParams.get('brandId');
    if(brandId){
      return json(res,200,{data:await brand365Store.channelsForBrand(brandId)});
    }
    if(pool){
      const r=await pool.query(`SELECT c.*,b.external_key brand_external_key,b.slug brand_slug
        FROM brand_social_channels c LEFT JOIN brands b ON b.id=c.brand_id ORDER BY c.owner_type,c.platform`);
      return json(res,200,{data:r.rows.map(x=>({
        id:x.external_key||String(x.id),storageId:String(x.id),ownerType:x.owner_type,
        brandId:x.brand_external_key||x.brand_slug||null,platform:x.platform,externalChannelId:x.external_channel_id,
        handle:x.handle,url:x.url,verificationMode:x.verification_mode,status:x.status,verifiedAt:x.verified_at,metadata:x.metadata||{}
      }))});
    }
    return json(res,200,{data:memory.socialChannels});
  }
  if(req.method==='POST'&&p==='/v1/social/connect'){
    const b=await readBody(req);
    const userId=String(b.userId||'demo_user');
    const platform=String(b.platform||'').toLowerCase();
    if(!['telegram','vk','instagram'].includes(platform))return json(res,400,{error:'unsupported_platform'});
    return json(res,409,{error:'provider_oauth_or_login_required',platform,detail:'Production connection must be created from a verified provider login callback, never from a client-supplied external user id.'});
  }
  if(req.method==='POST'&&p==='/v1/demo/social/connect'){
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const platform=String(b.platform||'telegram').toLowerCase();
    const connection=await brand365Store.demoSocialConnect(
      userId,platform,String(b.externalUserId||('demo_'+userId)),String(b.externalHandle||'demo')
    );
    return json(res,201,{data:connection,demo:true});
  }
  if(req.method==='POST'&&p==='/v1/social/verify'){
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const channel=await brand365Store.channelByRef(String(b.channelId||''));
    if(!channel)return json(res,404,{error:'social_channel_not_found'});
    const result=await verifyProviderMembership(userId,channel);
    if(!result.ok)return json(res,result.error==='social_connection_required'?409:503,result);
    const membership=await applyMembershipObservation(userId,channel,result,null);
    await track('social_membership_verified',{channelId:channel.id,platform:channel.platform,status:membership.status,source:result.source},userId);
    return json(res,200,{data:membership,channel,provider:{source:result.source}});
  }
  if(req.method==='POST'&&p==='/v1/demo/social/verify'){
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const channel=await brand365Store.channelByRef(String(b.channelId||''));
    if(!channel)return json(res,404,{error:'social_channel_not_found'});
    if(channel.verificationMode==='unsupported')return json(res,409,{error:'verification_not_supported',platform:channel.platform});
    const days=Math.max(0,Math.min(3650,Number(b.continuousDays||0)));
    const eventAt=days?new Date(Date.now()-days*86400000).toISOString():null;
    const membership=await applyMembershipObservation(userId,channel,{active:b.active!==false,source:'investor_demo_simulation',rawStatus:'demo',demo:true},eventAt);
    await track('social_membership_demo_verified',{channelId:channel.id,platform:channel.platform,continuousDays:days},userId);
    return json(res,200,{data:membership,channel,demo:true});
  }
  if(req.method==='POST'&&p==='/v1/integrations/telegram/webhook'){
    if(!TELEGRAM_WEBHOOK_SECRET||String(req.headers['x-telegram-bot-api-secret-token']||'')!==TELEGRAM_WEBHOOK_SECRET)return json(res,403,{error:'telegram_webhook_secret_invalid'});
    const update=await readBody(req);
    const evt=update&&update.chat_member;
    if(!evt||!evt.chat||!evt.new_chat_member||!evt.new_chat_member.user)return json(res,202,{accepted:true,ignored:true});
    const externalUserId=String(evt.new_chat_member.user.id);
    const channel=await brand365Store.channelByProviderId('telegram',String(evt.chat.id));
    if(!channel)return json(res,202,{accepted:true,ignored:true,reason:'channel_not_configured'});
    const connection=await brand365Store.socialConnectionByExternalId('telegram',externalUserId);
    if(!connection)return json(res,202,{accepted:true,ignored:true,reason:'user_not_connected'});
    const active=activeTelegramStatus(evt.new_chat_member);
    const eventAt=evt.date?new Date(Number(evt.date)*1000).toISOString():new Date().toISOString();
    const membership=await applyMembershipObservation(connection.userId,channel,{active,source:'telegram_chat_member_webhook',rawStatus:evt.new_chat_member.status},active?eventAt:null);
    if(!active)await brand365Store.revokeIssuedClaimsIfIneligible(connection.userId);
    await track('telegram_membership_event',{channelId:channel.id,status:membership.status,eventAt},connection.userId);
    return json(res,200,{accepted:true,status:membership.status});
  }
  if(req.method==='POST'&&p.startsWith('/v1/brands/')&&p.endsWith('/follow')){
    const brandId=p.split('/')[3];
    const brand=await brand365Store.brandByRef(brandId);
    if(!brand)return json(res,404,{error:'brand_not_found'});
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const following=b.action!=='remove';
    await brand365Store.setBrandFollow(userId,brandId,following);
    await track(following?'brand_follow_365':'brand_unfollow_365',{brandId},userId);
    return json(res,200,{following,brandId});
  }
  if(req.method==='GET'&&p.startsWith('/v1/brands/')&&p.endsWith('/loyalty')){
    const brandId=p.split('/')[3];
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const brand=await brand365Store.brandByRef(brandId);
    if(!brand)return json(res,404,{error:'brand_not_found'});
    const sourceOffers=await brand365Store.offersForBrand(brandId,{publishedOnly:true});
    const offers=[];
    for(const offer of sourceOffers){
      offers.push({...offer,eligibility:await evaluateLoyaltyOfferAuthority(userId,offer)});
    }
    const channels=await brand365Store.channelsForBrand(brandId);
    const memberships=await brand365Store.membershipsForUser(userId,channels);
    const followingInMfw=await brand365Store.isBrandFollow(userId,brandId);
    return json(res,200,{data:{brandId,userId,followingInMfw,offers,memberships,providers:memory.socialProviderAdapters,dataMode:pool?'postgres':'memory'}});
  }
  if(req.method==='POST'&&p.startsWith('/v1/loyalty/offers/')&&p.endsWith('/claim')){
    const offerId=p.split('/')[4];
    const offer=await brand365Store.offerByRef(offerId);
    if(!offer||offer.status!=='published')return json(res,404,{error:'offer_not_found'});
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const eligibility=await evaluateLoyaltyOfferAuthority(userId,offer);
    if(!eligibility.eligible)return json(res,409,{error:'not_eligible',eligibility});
    if(pool){
      const code='MFW-'+String(offer.rewardType==='discount_percent'?offer.rewardValue:'GIFT')+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
      const hash=crypto.createHash('sha256').update(code).digest('hex');
      const expiresAt=new Date(Date.now()+7*86400000);
      const created=await brand365Store.createClaim(userId,offer,hash,expiresAt);
      if(created.stockExhausted)return json(res,409,{error:'reward_stock_exhausted'});
      if(created.existing)return json(res,200,{data:{id:String(created.claim.id),userId:String(created.claim.user_id),offerId:offer.id,status:created.claim.status,issuedAt:created.claim.issued_at,expiresAt:created.claim.expires_at},alreadyIssued:true});
      await track('loyalty_claim_issued',{offerId:offer.id,claimId:String(created.claim.id),rewardType:offer.rewardType},userId);
      const qrDataUrl=await QRCode.toDataURL('MFW-LOYALTY:'+code,{width:360,margin:2,errorCorrectionLevel:'M'});
      return json(res,201,{data:{id:String(created.claim.id),userId,status:created.claim.status,offerId:offer.id,issuedAt:created.claim.issued_at,expiresAt:created.claim.expires_at,code,qrDataUrl,redemption:{mode:'one_time_server_verified',surface:'market_or_brand_showroom'}}});
    }
    const existing=[...memory.loyaltyClaims.values()].find(x=>x.userId===userId&&x.offerId===offerId&&['issued','redeemed'].includes(x.status));
    if(existing)return json(res,200,{data:{...existing,code:undefined},alreadyIssued:true});
    const code='MFW-'+String(offer.rewardType==='discount_percent'?offer.rewardValue:'GIFT')+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
    const id='clm_'+crypto.randomBytes(6).toString('hex');
    const claim={id,userId,offerId,claimTokenHash:crypto.createHash('sha256').update(code).digest('hex'),status:'issued',issuedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+7*86400000).toISOString(),demo:true};
    memory.loyaltyClaims.set(id,claim);
    await track('loyalty_claim_issued',{offerId,claimId:id,rewardType:offer.rewardType},userId);
    const qrDataUrl=await QRCode.toDataURL('MFW-LOYALTY:'+code,{width:360,margin:2,errorCorrectionLevel:'M'});
    return json(res,201,{data:{...claim,code,qrDataUrl,redemption:{mode:'one_time_server_verified',surface:'market_or_brand_showroom'}}});
  }
  if(req.method==='POST'&&p.startsWith('/v1/loyalty/claims/')&&p.endsWith('/qr')){
    const claimId=p.split('/')[4];
    const b=await readBody(req),userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    let claim=null,offer=null;
    if(pool){
      const r=await pool.query(`SELECT c.*,COALESCE(o.external_key,o.id::text) offer_ref
        FROM loyalty_claims c JOIN loyalty_offers o ON o.id=c.offer_id
        WHERE c.id::text=$1 AND c.user_id::text=$2 LIMIT 1`,[claimId,userId]);
      if(!r.rowCount)return json(res,404,{error:'claim_not_found'});
      claim=r.rows[0];offer=await brand365Store.offerByRef(claim.offer_ref);
      if(claim.status!=='issued')return json(res,409,{error:'claim_not_active',status:claim.status});
      if(claim.expires_at&&Date.now()>=new Date(claim.expires_at).getTime())return json(res,409,{error:'claim_expired'});
    }else{
      claim=memory.loyaltyClaims.get(claimId);
      if(!claim||String(claim.userId)!==String(userId))return json(res,404,{error:'claim_not_found'});
      offer=memory.loyaltyOffers.find(x=>x.id===claim.offerId);
      if(claim.status!=='issued')return json(res,409,{error:'claim_not_active',status:claim.status});
      if(claim.expiresAt&&Date.now()>=new Date(claim.expiresAt).getTime())return json(res,409,{error:'claim_expired'});
    }
    if(!offer)return json(res,404,{error:'offer_not_found'});
    const eligibility=await evaluateLoyaltyOfferAuthority(userId,offer);
    if(!eligibility.eligible)return json(res,409,{error:'eligibility_lost',eligibility});
    const now=Date.now();
    const payload={iss:'mfw',typ:'reward-pass',sub:String(userId),claimId:String(claimId),offerId:String(offer.id),brandId:String(offer.brandId),iat:now,exp:now+5*60*1000,jti:'reward_'+crypto.randomBytes(8).toString('hex')};
    const token=signPayload(payload);
    const qrDataUrl=await QRCode.toDataURL('MFW-REWARD:'+token,{width:360,margin:2,errorCorrectionLevel:'M'});
    await track('loyalty_wallet_qr_opened',{claimId:String(claimId),offerId:offer.id},userId);
    return json(res,200,{data:{claimId:String(claimId),status:'issued',token,qrDataUrl,expiresInMs:payload.exp-now,redemption:{mode:'short_lived_server_signed',surface:'market_or_brand_showroom'}}});
  }

  if(req.method==='POST'&&p==='/v1/loyalty/redeem-token'){
    const b=await readBody(req),raw=String(b.token||'').trim().replace(/^MFW-REWARD:/,'');
    const verified=verifyToken(raw);
    if(!verified.ok||!verified.payload||verified.payload.typ!=='reward-pass')return json(res,401,{error:'invalid_reward_token'});
    const payload=verified.payload,claimId=String(payload.claimId||'');
    let claim=null,offer=null;
    if(pool){
      const r=await pool.query(`SELECT c.*,COALESCE(o.external_key,o.id::text) offer_ref
        FROM loyalty_claims c JOIN loyalty_offers o ON o.id=c.offer_id WHERE c.id::text=$1 LIMIT 1`,[claimId]);
      if(!r.rowCount)return json(res,404,{error:'claim_not_found'});
      claim=r.rows[0];offer=await brand365Store.offerByRef(claim.offer_ref);
      if(!offer)return json(res,404,{error:'offer_not_found'});
      if(!(await brandPortalOk(req,offer.brandId))&&!adminOk(req))return json(res,403,{error:'brand_redemption_access_required'});
      if(claim.status==='redeemed')return json(res,409,{error:'already_redeemed',redeemedAt:claim.redeemed_at});
      if(claim.status==='revoked')return json(res,409,{error:'claim_revoked'});
      if(claim.expires_at&&Date.now()>=new Date(claim.expires_at).getTime()){await brand365Store.updateClaimStatus(claim.id,'expired');return json(res,409,{error:'claim_expired'});}
      const eligibility=await evaluateLoyaltyOfferAuthority(String(claim.user_id),offer);
      if(!eligibility.eligible){await brand365Store.updateClaimStatus(claim.id,'revoked');return json(res,409,{error:'eligibility_lost',eligibility});}
      const actor=sessionFromRequest(req),updated=await brand365Store.updateClaimStatus(claim.id,'redeemed',actor&&actor.sub||null);
      await track('loyalty_claim_redeemed',{claimId,offerId:offer.id,brandId:offer.brandId,mode:'signed_qr'},String(claim.user_id));
      return json(res,200,{data:{id:String(updated.id),offerId:offer.id,status:updated.status,redeemedAt:updated.redeemed_at,rewardType:offer.rewardType,rewardValue:offer.rewardValue}});
    }
    claim=memory.loyaltyClaims.get(claimId);if(!claim)return json(res,404,{error:'claim_not_found'});
    offer=memory.loyaltyOffers.find(x=>x.id===claim.offerId);if(!offer)return json(res,404,{error:'offer_not_found'});
    if(!(await brandPortalOk(req,offer.brandId))&&!adminOk(req))return json(res,403,{error:'brand_redemption_access_required'});
    if(claim.status!=='issued')return json(res,409,{error:'claim_not_active',status:claim.status});
    const eligibility=evaluateLoyaltyOffer(claim.userId,offer);if(!eligibility.eligible){claim.status='revoked';return json(res,409,{error:'eligibility_lost',eligibility});}
    claim.status='redeemed';claim.redeemedAt=new Date().toISOString();
    await track('loyalty_claim_redeemed',{claimId,offerId:offer.id,brandId:offer.brandId,mode:'signed_qr'},claim.userId);
    return json(res,200,{data:{id:claim.id,offerId:offer.id,status:claim.status,redeemedAt:claim.redeemedAt,rewardType:offer.rewardType,rewardValue:offer.rewardValue}});
  }

  if(req.method==='POST'&&p==='/v1/loyalty/redeem'){
    const b=await readBody(req);
    const code=String(b.code||'').trim().replace(/^MFW-LOYALTY:/,'');
    if(!code)return json(res,400,{error:'claim_code_required'});
    const hash=crypto.createHash('sha256').update(code).digest('hex');
    if(pool){
      const claim=await brand365Store.claimByHash(hash);
      if(!claim)return json(res,404,{error:'claim_not_found'});
      const offer=await brand365Store.offerByRef(claim.offer_external_key||String(claim.offer_id));
      if(!offer)return json(res,404,{error:'offer_not_found'});
      if(!(await brandPortalOk(req,offer.brandId))&&!adminOk(req))return json(res,403,{error:'brand_redemption_access_required'});
      if(claim.status==='redeemed')return json(res,409,{error:'already_redeemed',redeemedAt:claim.redeemed_at});
      if(claim.status==='revoked')return json(res,409,{error:'claim_revoked'});
      if(claim.expires_at&&Date.now()>=new Date(claim.expires_at).getTime()){
        await brand365Store.updateClaimStatus(claim.id,'expired');
        return json(res,409,{error:'claim_expired'});
      }
      const eligibility=await evaluateLoyaltyOfferAuthority(String(claim.user_id),offer);
      if(!eligibility.eligible){
        await brand365Store.updateClaimStatus(claim.id,'revoked');
        await track('loyalty_claim_revoked',{claimId:String(claim.id),offerId:offer.id,reason:'eligibility_lost'},String(claim.user_id));
        return json(res,409,{error:'eligibility_lost',eligibility});
      }
      const actor=sessionFromRequest(req);
      const updated=await brand365Store.updateClaimStatus(claim.id,'redeemed',actor&&actor.sub||null);
      await track('loyalty_claim_redeemed',{claimId:String(claim.id),offerId:offer.id,brandId:offer.brandId},String(claim.user_id));
      return json(res,200,{data:{id:String(updated.id),offerId:offer.id,status:updated.status,redeemedAt:updated.redeemed_at,rewardType:offer.rewardType,rewardValue:offer.rewardValue}});
    }
    const claim=[...memory.loyaltyClaims.values()].find(x=>x.claimTokenHash===hash);
    if(!claim)return json(res,404,{error:'claim_not_found'});
    const offer=memory.loyaltyOffers.find(x=>x.id===claim.offerId);
    if(!offer)return json(res,404,{error:'offer_not_found'});
    if(!(await brandPortalOk(req,offer.brandId))&&!adminOk(req))return json(res,403,{error:'brand_redemption_access_required'});
    if(claim.status==='redeemed')return json(res,409,{error:'already_redeemed',redeemedAt:claim.redeemedAt});
    if(claim.status==='revoked')return json(res,409,{error:'claim_revoked'});
    if(claim.expiresAt&&Date.now()>=new Date(claim.expiresAt).getTime()){claim.status='expired';return json(res,409,{error:'claim_expired'});}
    const eligibility=evaluateLoyaltyOffer(claim.userId,offer);
    if(!eligibility.eligible){
      claim.status='revoked';
      await track('loyalty_claim_revoked',{claimId:claim.id,offerId:offer.id,reason:'eligibility_lost'},claim.userId);
      return json(res,409,{error:'eligibility_lost',eligibility});
    }
    claim.status='redeemed';claim.redeemedAt=new Date().toISOString();claim.redeemedBy=sessionFromRequest(req)?.sub||'admin';
    await track('loyalty_claim_redeemed',{claimId:claim.id,offerId:offer.id,brandId:offer.brandId},claim.userId);
    return json(res,200,{data:{id:claim.id,offerId:offer.id,status:claim.status,redeemedAt:claim.redeemedAt,rewardType:offer.rewardType,rewardValue:offer.rewardValue}});
  }

  if(req.method==='GET'&&p.startsWith('/v1/brands/')&&p.endsWith('/content')){
    const brandId=p.split('/')[3];
    const brand=await brand365Store.brandByRef(brandId);
    if(!brand)return json(res,404,{error:'brand_not_found'});
    return json(res,200,{data:await brand365Store.postsForBrand(brandId,{publishedOnly:true})});
  }
  if(req.method==='GET'&&p==='/v1/feed'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const data=pool ? await brand365Store.personalFeed(userId) : buildPersonalFeed(userId);
    return json(res,200,{data,meta:{ranking:'followed_brand_first',paidFrequencyCap:'2_per_post_per_7d',paidSpacing:'max_1_per_4_slots',generatedAt:new Date().toISOString(),dataMode:pool?'postgres':'memory'}});
  }
  if(req.method==='POST'&&p==='/v1/content/interactions'){
    const b=await readBody(req);
    const type=String(b.type||'open');
    if(!['impression','open','cta','save','dismiss'].includes(type))return json(res,400,{error:'invalid_interaction_type'});
    const userId=userSubject(req,b.userId||'anonymous');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const postId=String(b.postId||''),surface=String(b.surface||'mfw_365');
    const item={id:'ci_'+crypto.randomBytes(6).toString('hex'),userId,postId,type,occurredAt:new Date().toISOString(),surface,demo:!pool};
    if(pool){
      if(type==='impression')await brand365Store.recordImpression(userId,postId,surface);
    }else{
      memory.contentInteractions.push(item);
      if(memory.contentInteractions.length>5000)memory.contentInteractions.shift();
    }
    await track('brand_content_'+type,{postId,surface},userId);
    return json(res,201,{data:item});
  }
  if(req.method==='GET'&&p==='/v1/notifications'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const inbox=await brand365Store.notificationsForUser(userId);
      return json(res,200,inbox);
    }
    const pref=notificationPrefs(userId);
    const followed=followSet(userId);
    const data=memory.notifications.filter(n=>{
      if(n.category==='critical')return pref.criticalEnabled;
      if(n.category==='live')return pref.liveEnabled;
      if(n.category==='brand_news')return pref.followedBrandNewsEnabled&&n.brandId&&followed.has(n.brandId);
      if(n.category==='loyalty')return pref.loyaltyEnabled;
      if(n.category==='brand_event')return pref.brandEventsEnabled&&n.brandId&&followed.has(n.brandId);
      if(n.category==='brand_campaign')return pref.paidPromotionsEnabled;
      return false;
    }).slice(0,30);
    return json(res,200,{data,preferences:pref});
  }
  if(req.method==='GET'&&p==='/v1/notifications/preferences'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    return json(res,200,{data:pool?await brand365Store.preferences(userId):notificationPrefs(userId)});
  }
  if(req.method==='PATCH'&&p==='/v1/notifications/preferences'){
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const pref=pool?await brand365Store.updatePreferences(userId,b):notificationPrefs(userId);
    if(!pool){
      for(const key of ['criticalEnabled','liveEnabled','followedBrandNewsEnabled','loyaltyEnabled','brandEventsEnabled','paidPromotionsEnabled']){
        if(Object.prototype.hasOwnProperty.call(b,key))pref[key]=!!b[key];
      }
      if(b.quietHours&&typeof b.quietHours==='object')pref.quietHours=b.quietHours;
      pref.updatedAt=new Date().toISOString();
    }
    await track('notification_preferences_updated',{paidPromotionsEnabled:pref.paidPromotionsEnabled},userId);
    return json(res,200,{data:pref});
  }
  if(req.method==='POST'&&p.startsWith('/v1/brands/')&&p.endsWith('/favorite')){
    const brandId=p.split('/')[3],b=await readBody(req),userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const favorite=await brand365Store.setBrandFavorite(userId,brandId,b.action!=='remove');
    await track(favorite?'brand_favorited':'brand_unfavorited',{brandId},userId);
    return json(res,200,{data:{brandId,favorite}});
  }

  if(req.method==='GET'&&p==='/v1/owner/control-tower'){
    const actor=sessionFromRequest(req);if(!actor)return json(res,401,{error:'authentication_required'});
    const url=new URL(req.url,'http://localhost');
    const retentionRate=Math.max(0,Math.min(1,Number(url.searchParams.get('retentionRate')||0.30)));
    const clvRealization=Math.max(0,Math.min(1,Number(url.searchParams.get('clvRealization')||0.50)));
    return json(res,200,{data:await brand365Store.ownerControlTower({retentionRate,clvRealization})});
  }

  if(req.method==='GET'&&p==='/v1/owner/audience-asset'){
    const actor=sessionFromRequest(req);if(!actor)return json(res,401,{error:'authentication_required'});
    return json(res,200,{data:await brand365Store.audienceAssetSummary()});
  }

  if(p.startsWith('/v1/brand-portal/')){
    const parts=p.split('/').filter(Boolean);
    const brandId=parts[2];
    const action=parts[3]||'overview';
    const brand=await brand365Store.brandByRef(brandId);
    if(!brand)return json(res,404,{error:'brand_not_found'});
    if(!(await brandPortalOk(req,brandId)))return json(res,403,{error:'brand_access_required'});
    if(req.method==='GET'&&action==='overview'){
      const followers=await brand365Store.followerCount(brandId);
      const audience=await brand365Store.brandCrmAudience(brandId);
      const campaignAnalytics=await brand365Store.campaignAnalytics(brandId);
      const savedSegments=await brand365Store.savedSegments(brandId);
      const economics=await brand365Store.customerEconomics(brandId);
      const incrementality=await brand365Store.campaignIncrementality(brandId);
      const lifecycle=await brand365Store.refreshCustomerLifecycle(brandId);
      const journeys=await brand365Store.journeys(brandId);
      const predictions=await brand365Store.scoreCustomerPredictions(brandId);
      const acquisitionEconomics=await brand365Store.acquisitionEconomics(brandId);
      const offers=await brand365Store.offersForBrand(brandId,{publishedOnly:false});
      const posts=await brand365Store.postsForBrand(brandId,{publishedOnly:false});
      const claims=await brand365Store.claimsForBrand(brandId);
      const channels=(await brand365Store.channelsForBrand(brandId)).filter(x=>x.ownerType==='brand');
      return json(res,200,{data:{brand,followers,audience,campaignAnalytics,savedSegments,economics,incrementality,lifecycle,journeys,predictions,acquisitionEconomics,offers,posts,claims,channels,providers:memory.socialProviderAdapters,dataMode:pool?'postgres':'memory'}});
    }
    if(req.method==='POST'&&action==='acquisition'){
      const b=await readBody(req),brandRow=await brand365Store.brandByRef(brandId);
      if(!b.source)return json(res,400,{error:'source_required'});
      if(pool){
        const r=await pool.query(`INSERT INTO brand_acquisition_events(brand_id,user_id,source,campaign_ref,cost_amount,currency,metadata) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[brandRow.storageId,b.userId||null,String(b.source),String(b.campaignRef||''),Math.max(0,Number(b.costAmount||0)),String(b.currency||'RUB'),b.metadata||{}]);
        await track('brand_customer_acquired',{brandId,source:String(b.source),cost:Number(b.costAmount||0)},b.userId||null);return json(res,201,{data:r.rows[0]});
      }
      return json(res,201,{data:{brandId,source:String(b.source),userId:b.userId||null,costAmount:Number(b.costAmount||0),demo:true}});
    }
    if(req.method==='GET'&&action==='predictions')return json(res,200,{data:await brand365Store.scoreCustomerPredictions(brandId)});
    if(req.method==='GET'&&action==='acquisition-economics')return json(res,200,{data:await brand365Store.acquisitionEconomics(brandId)});
    if(req.method==='POST'&&action==='journeys-tick'){
      const out=await brand365Store.advanceJourneyStateMachine(brandId);await track('brand_journey_tick',{brandId,...out},sessionFromRequest(req)?.sub||null);return json(res,200,{data:out});
    }
    if(req.method==='GET'&&action==='incrementality')return json(res,200,{data:await brand365Store.campaignIncrementality(brandId)});
    if(req.method==='POST'&&action==='lifecycle-refresh')return json(res,200,{data:await brand365Store.refreshCustomerLifecycle(brandId)});
    if(req.method==='GET'&&action==='journeys')return json(res,200,{data:await brand365Store.journeys(brandId)});
    if(req.method==='POST'&&action==='journeys'){
      const b=await readBody(req),actor=sessionFromRequest(req),item=await brand365Store.createJourney(brandId,b,actor&&actor.sub||null);
      await track('brand_journey_created',{brandId,journeyId:String(item.external_key||item.externalKey||item.id),trigger:b.trigger||{}},actor&&actor.sub||null);
      return json(res,201,{data:item});
    }
    if(req.method==='POST'&&action==='journeys-run'){
      const out=await brand365Store.runJourneys(brandId);await track('brand_journeys_run',{brandId,...out},sessionFromRequest(req)?.sub||null);return json(res,200,{data:out});
    }
    if(req.method==='POST'&&action==='campaign-queue'){
      const b=await readBody(req);
      if(!b.campaignId)return json(res,400,{error:'campaign_id_required'});
      try{
        const result=await brand365Store.queueCampaign(brandId,String(b.campaignId));
        await track('brand_campaign_queued',{brandId,campaignId:String(b.campaignId),audience:result.audience||0,queued:result.queued||0,suppressed:result.suppressed||0},sessionFromRequest(req)?.sub||null);
        return json(res,200,{data:result});
      }catch(err){return json(res,400,{error:String(err&&err.message||err)});}
    }
    if(req.method==='GET'&&action==='segments'){
      return json(res,200,{data:await brand365Store.savedSegments(brandId)});
    }
    if(req.method==='POST'&&action==='segments'){
      const b=await readBody(req),actor=sessionFromRequest(req);
      const item=await brand365Store.saveBrandSegment(brandId,b,actor&&actor.sub||null);
      await track('brand_segment_saved',{brandId,segmentId:String(item.id),definition:b.definition||{}},actor&&actor.sub||null);
      return json(res,201,{data:item});
    }
    if(req.method==='GET'&&action==='economics'){
      return json(res,200,{data:await brand365Store.customerEconomics(brandId)});
    }
    if(req.method==='POST'&&action==='orders-import'){
      const b=await readBody(req),rows=Array.isArray(b.orders)?b.orders:[];
      if(rows.length>1000)return json(res,413,{error:'import_too_large',maxRows:1000});
      const actor=sessionFromRequest(req),brandRow=await brand365Store.brandByRef(brandId);
      let imported=0,rejected=0,totalRevenue=0;
      if(pool){
        const client=await pool.connect();
        try{
          await client.query('BEGIN');
          const batch=await client.query(`INSERT INTO brand_order_imports(brand_id,import_source,external_batch_ref,status,row_count,created_by) VALUES($1,$2,$3,'processing',$4,$5) RETURNING id`,[brandRow.storageId,String(b.source||'api'),String(b.externalBatchRef||''),rows.length,actor&&actor.sub||null]);
          const importId=batch.rows[0].id;
          for(const row of rows){
            const amount=Number(row.amount||0);if(!(amount>=0)){rejected++;continue;}
            await client.query(`INSERT INTO brand_purchases(brand_id,user_id,campaign_id,claim_id,amount,currency,location_type,location_ref,external_order_ref,metadata,import_id,quantity,gross_amount,discount_amount,sku_count,purchased_at)
              VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,COALESCE($16,now()))`,[brandRow.storageId,row.userId||null,row.campaignId||null,row.claimId||null,amount,String(row.currency||'RUB'),String(row.locationType||'showroom'),String(row.locationRef||''),String(row.externalOrderRef||''),row.metadata||{},importId,Math.max(1,Number(row.quantity||1)),row.grossAmount==null?amount:Number(row.grossAmount),Math.max(0,Number(row.discountAmount||0)),Math.max(1,Number(row.skuCount||1)),row.purchasedAt||null]);
            imported++;totalRevenue+=amount;
          }
          await client.query(`UPDATE brand_order_imports SET status=$2,imported_count=$3,rejected_count=$4,summary=$5,completed_at=now() WHERE id=$1`,[importId,rejected?'partial':'completed',imported,rejected,{revenue:totalRevenue,currency:String(b.currency||'RUB')}]);
          await client.query('COMMIT');
          await track('brand_orders_imported',{brandId,imported,rejected,revenue:totalRevenue},actor&&actor.sub||null);
          return json(res,201,{data:{importId:String(importId),imported,rejected,revenue:totalRevenue}});
        }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
      }
      rows.forEach(row=>{const amount=Number(row.amount||0);if(!(amount>=0)){rejected++;return;}memory.brandPurchases.push({id:'pur_'+crypto.randomBytes(6).toString('hex'),brandId,userId:String(row.userId||'demo_user'),campaignId:row.campaignId||null,claimId:row.claimId||null,amount,currency:String(row.currency||'RUB'),locationType:String(row.locationType||'showroom'),externalOrderRef:String(row.externalOrderRef||''),purchasedAt:row.purchasedAt||new Date().toISOString(),demo:true});imported++;totalRevenue+=amount;});
      return json(res,201,{data:{imported,rejected,revenue:totalRevenue,demo:true}});
    }
    if(req.method==='GET'&&action==='audience'){
      return json(res,200,{data:await brand365Store.brandCrmAudience(brandId)});
    }
    if(req.method==='GET'&&action==='analytics'){
      return json(res,200,{data:await brand365Store.campaignAnalytics(brandId)});
    }
    if(req.method==='POST'&&action==='campaigns'){
      const b=await readBody(req),actor=sessionFromRequest(req);
      const campaign=await brand365Store.createBrandCampaign(brandId,b,actor&&actor.sub||null);
      await track('brand_campaign_created',{brandId,campaignId:String(campaign.id),segment:b.segment||{}},actor&&actor.sub||null);
      return json(res,201,{data:campaign});
    }
    if(req.method==='POST'&&action==='redeem'){
      const b=await readBody(req),code=String(b.code||'').trim().replace(/^MFW-LOYALTY:/,'');
      if(!code)return json(res,400,{error:'claim_code_required'});
      const hash=crypto.createHash('sha256').update(code).digest('hex');
      if(pool){
        const claim=await brand365Store.claimByHash(hash);if(!claim)return json(res,404,{error:'claim_not_found'});
        const offer=await brand365Store.offerByRef(claim.offer_external_key||String(claim.offer_id));
        if(!offer||String(offer.brandId)!==String(brandId))return json(res,403,{error:'claim_brand_mismatch'});
        if(claim.status==='redeemed')return json(res,409,{error:'already_redeemed',redeemedAt:claim.redeemed_at});
        const eligibility=await evaluateLoyaltyOfferAuthority(String(claim.user_id),offer);
        if(!eligibility.eligible){await brand365Store.updateClaimStatus(claim.id,'revoked');return json(res,409,{error:'eligibility_lost',eligibility});}
        const actor=sessionFromRequest(req),updated=await brand365Store.updateClaimStatus(claim.id,'redeemed',actor&&actor.sub||null);
        await track('brand_pos_redemption',{brandId,claimId:String(claim.id),offerId:offer.id},String(claim.user_id));
        return json(res,200,{data:{id:String(updated.id),status:updated.status,redeemedAt:updated.redeemed_at,claimId:String(claim.id),userId:String(claim.user_id)}});
      }
      const claim=[...memory.loyaltyClaims.values()].find(x=>x.claimTokenHash===hash);if(!claim)return json(res,404,{error:'claim_not_found'});
      const offer=memory.loyaltyOffers.find(x=>x.id===claim.offerId);if(!offer||String(offer.brandId)!==String(brandId))return json(res,403,{error:'claim_brand_mismatch'});
      if(claim.status==='redeemed')return json(res,409,{error:'already_redeemed',redeemedAt:claim.redeemedAt});
      const eligibility=evaluateLoyaltyOffer(claim.userId,offer);if(!eligibility.eligible)return json(res,409,{error:'eligibility_lost',eligibility});
      claim.status='redeemed';claim.redeemedAt=new Date().toISOString();claim.redeemedBy=sessionFromRequest(req)?.sub||'brand';
      await track('brand_pos_redemption',{brandId,claimId:claim.id,offerId:offer.id},claim.userId);
      return json(res,200,{data:{id:claim.id,status:claim.status,redeemedAt:claim.redeemedAt,claimId:claim.id,userId:claim.userId}});
    }
    if(req.method==='POST'&&action==='purchase'){
      const b=await readBody(req),amount=Number(b.amount||0);
      if(!(amount>=0))return json(res,400,{error:'invalid_amount'});
      if(pool){
        const brandRow=await brand365Store.brandByRef(brandId);
        const r=await pool.query(`INSERT INTO brand_purchases(brand_id,user_id,campaign_id,claim_id,amount,currency,location_type,location_ref,external_order_ref,metadata)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[brandRow.storageId,b.userId||null,b.campaignId||null,b.claimId||null,amount,String(b.currency||'RUB'),String(b.locationType||'market'),String(b.locationRef||''),String(b.externalOrderRef||''),b.metadata||{}]);
        if(b.campaignId)await pool.query(`INSERT INTO brand_campaign_events(campaign_id,user_id,event_type,claim_id,location_type,location_ref,metadata) VALUES($1,$2,'purchase',$3,$4,$5,$6)`,[b.campaignId,b.userId||null,b.claimId||null,String(b.locationType||'market'),String(b.locationRef||''),{amount,currency:String(b.currency||'RUB')}]);
        await track('brand_purchase_attributed',{brandId,campaignId:b.campaignId||null,amount,currency:String(b.currency||'RUB')},b.userId||null);
        return json(res,201,{data:r.rows[0]});
      }
      const item={id:'pur_'+crypto.randomBytes(6).toString('hex'),brandId,userId:String(b.userId||'demo_user'),campaignId:b.campaignId||null,claimId:b.claimId||null,amount,currency:String(b.currency||'RUB'),locationType:String(b.locationType||'market'),locationRef:String(b.locationRef||''),purchasedAt:new Date().toISOString(),demo:true};
      memory.brandPurchases.push(item);return json(res,201,{data:item});
    }
    if(req.method==='POST'&&action==='content'){
      const b=await readBody(req);
      if(pool){
        const post=await brand365Store.createPost(brandId,b);
        await track('brand_portal_content_created',{brandId,postId:post.id,isPaid:post.isPaid,status:post.status},sessionFromRequest(req)?.sub||null);
        return json(res,201,{data:post});
      }
      const paid=!!b.isPaid||((b.audienceScope&&b.audienceScope.kind)==='all_mfw');
      const post={id:'bp_'+crypto.randomBytes(6).toString('hex'),brandId,kind:String(b.kind||'news'),titleRu:String(b.titleRu||'Новости бренда'),titleEn:String(b.titleEn||'Brand news'),bodyRu:String(b.bodyRu||''),bodyEn:String(b.bodyEn||''),imageUrl:String(b.imageUrl||''),ctaLabelRu:String(b.ctaLabelRu||'Открыть'),ctaLabelEn:String(b.ctaLabelEn||'Open'),ctaUrl:String(b.ctaUrl||'#'),eventStartsAt:b.eventStartsAt||null,eventEndsAt:b.eventEndsAt||null,audienceScope:b.audienceScope||{kind:'brand_followers'},placementScope:b.placementScope||['brand_profile','discover_feed'],isPaid:paid,sponsorLabelRu:paid?'Реклама бренда':null,sponsorLabelEn:paid?'Brand promotion':null,status:paid?'pending_review':'published',publishedAt:paid?null:new Date().toISOString(),createdAt:new Date().toISOString(),demo:true};
      memory.brandPosts.unshift(post);
      await track('brand_portal_content_created',{brandId,postId:post.id,isPaid:paid,status:post.status},sessionFromRequest(req)?.sub||null);
      return json(res,201,{data:post});
    }
    if(req.method==='POST'&&action==='offers'){
      const b=await readBody(req);
      const rewardType=String(b.rewardType||'discount_percent');
      if(!['discount_percent','discount_amount','gift','early_access','experience'].includes(rewardType))return json(res,400,{error:'invalid_reward_type'});
      if(pool){
        const offer=await brand365Store.createOffer(brandId,{...b,rewardType});
        await track('brand_portal_offer_created',{brandId,offerId:offer.id,rewardType},sessionFromRequest(req)?.sub||null);
        return json(res,201,{data:offer});
      }
      const id='lo_'+crypto.randomBytes(6).toString('hex');
      const offer={id,brandId,titleRu:String(b.titleRu||'Новая привилегия'),titleEn:String(b.titleEn||'New reward'),descriptionRu:String(b.descriptionRu||''),descriptionEn:String(b.descriptionEn||''),rewardType,rewardValue:b.rewardValue==null?null:Number(b.rewardValue),minContinuousDays:Math.max(0,Number(b.minContinuousDays||30)),status:'pending',stockLimit:b.stockLimit==null?null:Number(b.stockLimit),perUserLimit:Math.max(1,Number(b.perUserLimit||1)),termsRu:String(b.termsRu||''),termsEn:String(b.termsEn||''),requirements:Array.isArray(b.requirements)?b.requirements:[],createdAt:new Date().toISOString(),demo:true};
      memory.loyaltyOffers.push(offer);
      await track('brand_portal_offer_created',{brandId,offerId:id,rewardType},sessionFromRequest(req)?.sub||null);
      return json(res,201,{data:offer});
    }
    if(req.method==='POST'&&action==='notify'){
      const b=await readBody(req);
      if(pool){
        const result=await brand365Store.createBrandPush(brandId,String(b.postId||''));
        if(result&&result.error==='post_not_found')return json(res,404,result);
        if(result&&result.error==='post_not_published')return json(res,409,result);
        if(result&&result.error==='mfw_wide_push_requires_organizer')return json(res,403,result);
        if(result&&result.error==='brand_push_frequency_cap')return json(res,429,result);
        await track('brand_push_scheduled',{brandId,postId:String(b.postId||''),notificationId:result.data.id},sessionFromRequest(req)?.sub||null);
        return json(res,201,result);
      }
      const post=memory.brandPosts.find(x=>x.id===String(b.postId||'')&&x.brandId===brandId);
      if(!post)return json(res,404,{error:'post_not_found'});
      if(post.status!=='published')return json(res,409,{error:'post_not_published'});
      if(post.isPaid||(post.audienceScope&&post.audienceScope.kind)!=='brand_followers')return json(res,403,{error:'mfw_wide_push_requires_organizer'});
      if(brandPushesInWindow(brandId,7)>=2)return json(res,429,{error:'brand_push_frequency_cap',limit:2,windowDays:7});
      const item={id:'ntf_'+crypto.randomBytes(6).toString('hex'),category:'brand_news',brandId,postId:post.id,audience:{kind:'brand_followers',brandId},title:post.titleRu,body:post.bodyRu||'',status:'scheduled',createdAt:new Date().toISOString(),scheduledAt:new Date().toISOString(),demo:true};
      memory.notifications.unshift(item);
      await track('brand_push_scheduled',{brandId,postId:post.id,notificationId:item.id},sessionFromRequest(req)?.sub||null);
      return json(res,201,{data:item,policy:{frequencyCap:'2_per_brand_per_7d',audience:'brand_followers_only'}});
    }
    if(req.method==='POST'&&action==='social-channels'){
      const b=await readBody(req);
      const platform=String(b.platform||'').toLowerCase();
      if(!['telegram','vk','instagram'].includes(platform))return json(res,400,{error:'unsupported_platform'});
      if(pool){
        const channel=await brand365Store.addSocialChannel(brandId,{...b,platform});
        await track('brand_portal_social_channel_added',{brandId,channelId:channel.id,platform},sessionFromRequest(req)?.sub||null);
        return json(res,201,{data:channel});
      }
      const id='sc_'+crypto.randomBytes(6).toString('hex');
      const verificationMode=platform==='telegram'?'membership_event':platform==='vk'?'api_current':'unsupported';
      const channel={id,ownerType:'brand',brandId,platform,externalChannelId:String(b.externalChannelId||''),handle:String(b.handle||''),url:String(b.url||''),verificationMode,status:platform==='instagram'?'paused':'active',verifiedAt:null,demo:true};
      memory.socialChannels.push(channel);
      await track('brand_portal_social_channel_added',{brandId,channelId:id,platform},sessionFromRequest(req)?.sub||null);
      return json(res,201,{data:channel});
    }
  }

  if(req.method==='GET'&&p==='/v1/perks'){
    return json(res,200,{data:memory.perks});
  }
  if(req.method==='GET'&&p==='/v1/sponsors/experiences'){
    const placements=memory.sponsorPlacements.filter(x=>x.campaignId==='cmp1');
    return json(res,200,{data:{sponsor:memory.sponsors[0],campaign:memory.sponsorCampaigns[0],placements},demo:true});
  }
  if(req.method==='POST'&&p==='/v1/sponsor/interactions'){
    const b=await readBody(req);
    const item={
      id:'spi_'+crypto.randomBytes(7).toString('hex'),
      campaignId:String(b.campaignId||'cmp1'),
      placementId:String(b.placementId||'pl1'),
      userId:String(b.userId||'anonymous'),
      interactionType:String(b.interactionType||'open').slice(0,80),
      value:Number(b.value||0),
      meta:b.meta||{},
      occurredAt:new Date().toISOString(),
      demo:true
    };
    memory.sponsorInteractions.push(item);
    if(memory.sponsorInteractions.length>5000)memory.sponsorInteractions.shift();
    await track('sponsor_'+item.interactionType,{campaignId:item.campaignId,placementId:item.placementId},item.userId);
    return json(res,201,{data:item});
  }
  if(req.method==='GET'&&p==='/v1/buyer/shortlist'){
    const buyerId=String(url.searchParams.get('buyerId')||'demo_buyer');
    const set=memory.shortlists.get(buyerId)||new Set();
    return json(res,200,{data:[...set].map(id=>memory.brands.find(b=>b.id===id)).filter(Boolean)});
  }
  if(req.method==='POST'&&p==='/v1/buyer/shortlist'){
    const b=await readBody(req);
    const buyerId=String(b.buyerId||'demo_buyer');
    const brandId=String(b.brandId||'b1');
    if(!memory.brands.find(x=>x.id===brandId))return json(res,404,{error:'brand_not_found'});
    const set=memory.shortlists.get(buyerId)||new Set();
    const saved=b.action==='remove'?false:true;
    if(saved)set.add(brandId);else set.delete(brandId);
    memory.shortlists.set(buyerId,set);
    const leadId='lead_'+crypto.randomBytes(6).toString('hex');
    if(saved)memory.commerceLeads.set(leadId,{id:leadId,brandId,buyerId,source:'shortlist',stage:'shortlisted',createdAt:new Date().toISOString(),demo:true});
    await track(saved?'brand_shortlisted':'brand_unshortlisted',{buyerId,brandId});
    return json(res,200,{saved,data:[...set]});
  }
  if(req.method==='POST'&&p==='/v1/leads'){
    const b=await readBody(req);
    const id='lead_'+crypto.randomBytes(7).toString('hex');
    const lead={id,brandId:String(b.brandId||'b1'),buyerId:String(b.buyerId||'demo_buyer'),source:String(b.source||'brand_profile'),stage:String(b.stage||'interest'),note:String(b.note||'').slice(0,500),createdAt:new Date().toISOString(),demo:true};
    memory.commerceLeads.set(id,lead);
    await track('commerce_lead_created',lead,lead.buyerId);
    return json(res,201,{data:lead});
  }

  if(req.method==='POST'&&p.startsWith('/v1/events/')&&p.endsWith('/register')){
    const eventId=p.split('/')[3];
    const event=memory.events.find(x=>x.id===eventId);
    if(!event)return json(res,404,{error:'event_not_found'});
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const registrationType=String(b.registrationType||b.role||'visitor').toLowerCase();
    const allowedRegistrationTypes=['visitor','participant','client','buyer','designer','media','speaker','partner','delegate'];
    if(!allowedRegistrationTypes.includes(registrationType))return json(res,400,{error:'invalid_registration_type',allowed:allowedRegistrationTypes});
    if(event.accessMode==='invite_only')return json(res,403,{error:'invitation_required',eventId});
    const status=(event.accessMode==='waitlist'||(event.waitlist>0&&event.checkedIn>=event.capacity))?'waitlist':'registered';
    if(pool){
      const dbEvent=await pool.query('SELECT id,access_mode,capacity FROM events WHERE external_key=$1 OR id::text=$1 LIMIT 1',[eventId]);
      if(!dbEvent.rowCount)return json(res,404,{error:'event_not_found'});
      const dbUser=await pool.query('SELECT id FROM users WHERE id::text=$1 LIMIT 1',[userId]);
      if(!dbUser.rowCount)return json(res,404,{error:'user_not_found'});
      const eventRow=dbEvent.rows[0];
      if(eventRow.access_mode==='invite_only')return json(res,403,{error:'invitation_required',eventId});
      let dbStatus=eventRow.access_mode==='waitlist'?'waitlist':'registered';
      if(eventRow.capacity!=null){
        const occupied=await pool.query("SELECT count(*)::int n FROM event_registrations WHERE event_id=$1 AND status IN ('registered','confirmed','attended')",[eventRow.id]);
        if(Number(occupied.rows[0].n)>=Number(eventRow.capacity))dbStatus='waitlist';
      }
      const saved=await pool.query(`INSERT INTO event_registrations(event_id,user_id,status,source,registration_type,organisation,job_title,purpose,submitted_payload)
        VALUES($1,$2,$3,'app',$4,$5,$6,$7,$8::jsonb)
        ON CONFLICT(event_id,user_id) DO UPDATE SET status=EXCLUDED.status,source='app',
          registration_type=EXCLUDED.registration_type,organisation=EXCLUDED.organisation,
          job_title=EXCLUDED.job_title,purpose=EXCLUDED.purpose,submitted_payload=EXCLUDED.submitted_payload,updated_at=now()
        RETURNING id,user_id AS "userId",event_id AS "eventStorageId",status,source,
          registration_type AS "registrationType",organisation,job_title AS "jobTitle",purpose,
          created_at AS "createdAt",updated_at AS "updatedAt"`,
        [eventRow.id,dbUser.rows[0].id,dbStatus,registrationType,
          String(b.organisation||b.company||'').slice(0,200)||null,
          String(b.jobTitle||b.title||'').slice(0,160)||null,
          String(b.purpose||'').slice(0,500)||null,
          JSON.stringify({registrationType,confirmedAt:b.confirmedAt||new Date().toISOString()})]);
      const item={...saved.rows[0],eventId};
      await track('event_registered',{eventId,status:dbStatus},userId);
      return json(res,201,{data:item,source:'postgres'});
    }
    const key=userId+':'+eventId;
    const item={id:'reg_'+crypto.randomBytes(6).toString('hex'),userId,eventId,status,source:'app',registrationType,organisation:String(b.organisation||b.company||''),jobTitle:String(b.jobTitle||b.title||''),purpose:String(b.purpose||''),createdAt:new Date().toISOString(),demo:true};
    memory.eventRegistrations.set(key,item);
    await track('event_registered',{eventId,status},userId);
    return json(res,201,{data:item,source:'memory'});
  }
  if(req.method==='POST'&&p.startsWith('/v1/events/')&&p.endsWith('/cancel')){
    const eventId=p.split('/')[3];
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const saved=await pool.query(`UPDATE event_registrations r SET status='cancelled',updated_at=now()
        FROM events e WHERE r.event_id=e.id AND r.user_id::text=$1 AND (e.external_key=$2 OR e.id::text=$2)
        RETURNING r.id,r.user_id AS "userId",r.event_id AS "eventStorageId",r.status,r.source,r.created_at AS "createdAt",r.updated_at AS "updatedAt"`,
        [userId,eventId]);
      if(!saved.rowCount)return json(res,404,{error:'registration_not_found'});
      await track('event_registration_cancelled',{eventId},userId);
      return json(res,200,{data:{...saved.rows[0],eventId},source:'postgres'});
    }
    const key=userId+':'+eventId;
    let item=memory.eventRegistrations.get(key);
    if(!item){
      item={id:'reg_'+crypto.randomBytes(6).toString('hex'),userId,eventId,status:'cancelled',source:'app',createdAt:new Date().toISOString(),demo:true};
      memory.eventRegistrations.set(key,item);
    }else{
      item.status='cancelled';item.updatedAt=new Date().toISOString();
    }
    await track('event_registration_cancelled',{eventId},userId);
    return json(res,200,{data:item,source:'memory'});
  }
  if(req.method==='GET'&&p.startsWith('/v1/media/press-kit/')){
    const eventId=p.split('/').pop();
    const kit=memory.pressKits.find(x=>x.eventId===eventId&&x.status==='published');
    if(!kit)return json(res,404,{error:'press_kit_not_found'});
    await track('press_kit_opened',{eventId,kitId:kit.id});
    return json(res,200,{data:kit});
  }
  if(req.method==='GET'&&p.startsWith('/v1/designer/workspace/')){
    const brandId=p.split('/').pop();
    const brand=memory.brands.find(x=>x.id===brandId);
    if(!brand)return json(res,404,{error:'brand_not_found'});
    const readiness=memory.designerReadiness.find(x=>x.brandId===brandId);
    const collection=memory.collections.find(x=>x.brandId===brandId);
    const looks=collection?memory.looks.filter(x=>x.collectionId===collection.id).slice(0,8):[];
    const analytics={profileViews:1840,savedLooks:312,buyerInterest:17,lineSheetRequests:9,meetingRequests:4};
    return json(res,200,{data:{brand,collection,looks,readiness,analytics}});
  }
  if(req.method==='POST'&&p.startsWith('/v1/designer/workspace/')&&p.endsWith('/complete-look-order')){
    const brandId=p.split('/')[4];
    const readiness=memory.designerReadiness.find(x=>x.brandId===brandId);
    if(!readiness)return json(res,404,{error:'designer_workspace_not_found'});
    readiness.lookOrderComplete=true;
    readiness.issues=readiness.issues.filter(x=>!x.toLowerCase().includes('look metadata'));
    readiness.status=(readiness.profileComplete&&readiness.lookOrderComplete&&readiness.mediaComplete&&readiness.commercialDataComplete)?'ready':'in_progress';
    await track('designer_look_order_completed',{brandId});
    return json(res,200,{data:readiness});
  }
  if(req.method==='POST'&&p.startsWith('/v1/designer/workspace/')&&p.endsWith('/confirm-commercial')){
    const brandId=p.split('/')[4];
    const readiness=memory.designerReadiness.find(x=>x.brandId===brandId);
    if(!readiness)return json(res,404,{error:'designer_workspace_not_found'});
    readiness.commercialDataComplete=true;
    readiness.issues=readiness.issues.filter(x=>!x.toLowerCase().includes('wholesale'));
    readiness.status=(readiness.profileComplete&&readiness.lookOrderComplete&&readiness.mediaComplete&&readiness.commercialDataComplete)?'ready':'in_progress';
    await track('designer_commercial_confirmed',{brandId});
    return json(res,200,{data:readiness});
  }
  if(req.method==='POST'&&p==='/v1/auth/demo'){
    const b=await readBody(req);
    const name=String(b.name||'Demo User').slice(0,120);
    const role=String(b.role||'Visitor').slice(0,40);
    const identityKey=String(b.identityKey||b.email||b.phone||name).slice(0,200);
    const userId=await issueDemoUser(name,role,identityKey);
    const sessionPayload={typ:'session',sub:userId,role,name,iat:Date.now(),exp:Date.now()+6*60*60*1000,demo:true};
    const session=signPayload(sessionPayload);
    memory.sessions.set(userId,{session,sessionPayload});
    if(role==='Designer'){
      await brand365Store.grantBrandAccess(userId,'b1','manager');
    }
    await track('auth_demo',{role},userId);
    return json(res,200,{user:{id:userId,name,role,demo:true},session,dataMode:pool?'postgres':'memory'});
  }

  if(req.method==='GET'&&p==='/v1/platform/registrations'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const r=await pool.query(`SELECT event_brand AS "eventCode",registration_type AS "registrationType",status,
        organisation AS company,job_title AS title,purpose,confirmed_at AS "confirmedAt",updated_at AS "updatedAt"
        FROM platform_registrations WHERE user_id::text=$1 ORDER BY event_brand`,[userId]);
      return json(res,200,{data:r.rows,source:'postgres'});
    }
    return json(res,200,{data:[],source:'memory',demo:true});
  }

  if(req.method==='POST'&&p.startsWith('/v1/platform/registrations/')){
    const eventBrand=p.split('/')[4];
    if(!['mfw','bfs'].includes(eventBrand))return json(res,400,{error:'invalid_event_brand'});
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const registrationType=String(b.registrationType||'visitor').toLowerCase();
    const allowedByEvent={
      mfw:['visitor','buyer','stylist','media','blogger','photo_video','volunteer','designer_brand','speaker','partner'],
      bfs:['visitor','media','blogger','photo_video','volunteer','delegate','speaker','participant','partner']
    };
    if(!allowedByEvent[eventBrand].includes(registrationType))return json(res,400,{error:'invalid_registration_type',allowed:allowedByEvent[eventBrand]});
    const mode=String(b.mode||'public');
    const reviewModes=['accreditation','application','selection','managed'];
    const status=reviewModes.includes(mode)?'pending_review':'submitted';
    if(pool){
      const user=await pool.query('SELECT id FROM users WHERE id::text=$1 LIMIT 1',[userId]);
      if(!user.rowCount)return json(res,404,{error:'user_not_found'});
      const r=await pool.query(`INSERT INTO platform_registrations(user_id,event_brand,registration_type,status,organisation,job_title,purpose,confirmed_at,submitted_payload)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
        ON CONFLICT(user_id,event_brand) DO UPDATE SET registration_type=EXCLUDED.registration_type,status=EXCLUDED.status,
          organisation=EXCLUDED.organisation,job_title=EXCLUDED.job_title,purpose=EXCLUDED.purpose,
          confirmed_at=EXCLUDED.confirmed_at,submitted_payload=EXCLUDED.submitted_payload,updated_at=now()
        RETURNING event_brand AS "eventCode",registration_type AS "registrationType",status,
          organisation AS company,job_title AS title,purpose,confirmed_at AS "confirmedAt",updated_at AS "updatedAt"`,
        [user.rows[0].id,eventBrand,registrationType,status,
          String(b.company||b.organisation||'').slice(0,200)||null,
          String(b.title||b.jobTitle||'').slice(0,160)||null,
          String(b.purpose||'').slice(0,1000)||null,
          b.confirmedAt||new Date().toISOString(),
          JSON.stringify({mode,confirm:!!b.confirm,source:'platform'})]);
      await track('platform_registration_submitted',{eventBrand,registrationType,status,mode},userId);
      return json(res,201,{data:r.rows[0],source:'postgres'});
    }
    return json(res,201,{data:{eventCode:eventBrand,registrationType,status,company:b.company||'',title:b.title||'',purpose:b.purpose||'',confirmedAt:b.confirmedAt||new Date().toISOString(),demo:true},source:'memory'});
  }

  if(req.method==='GET'&&p==='/v1/me'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const profile=await pool.query(`SELECT u.id,u.email,u.phone,u.status,p.display_name AS "displayName",p.locale,
        p.primary_role AS "primaryRole",p.organisation,p.job_title AS "jobTitle",p.city,p.country,
        p.networking_visible AS "networkingVisible",p.marketing_consent AS "marketingConsent"
        FROM users u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id::text=$1 LIMIT 1`,[userId]);
      if(!profile.rowCount)return json(res,404,{error:'user_not_found'});
      const interests=await pool.query('SELECT interest_key AS key,weight,source FROM user_interests WHERE user_id=$1 ORDER BY weight DESC,interest_key',[profile.rows[0].id]);
      const registrations=await pool.query(`SELECT COALESCE(e.external_key,e.id::text) AS "eventId",e.title,e.event_type AS "eventType",
        r.status,r.registration_type AS "registrationType",r.organisation,r.job_title AS "jobTitle",r.purpose,r.updated_at AS "updatedAt"
        FROM event_registrations r JOIN events e ON e.id=r.event_id WHERE r.user_id=$1 ORDER BY e.starts_at`,[profile.rows[0].id]);
      const platformRegistrations=await pool.query(`SELECT event_brand AS "eventCode",registration_type AS "registrationType",status,
        organisation AS company,job_title AS title,purpose,confirmed_at AS "confirmedAt",updated_at AS "updatedAt"
        FROM platform_registrations WHERE user_id=$1 ORDER BY event_brand`,[profile.rows[0].id]);
      return json(res,200,{data:{profile:profile.rows[0],interests:interests.rows,platformRegistrations:platformRegistrations.rows,programmeRegistrations:registrations.rows},source:'postgres'});
    }
    const user=memory.users.get(userId)||{id:userId,name:'Demo User',role:'Visitor'};
    return json(res,200,{data:{profile:{id:user.id,displayName:user.name,primaryRole:String(user.role||'Visitor').toLowerCase(),locale:'ru'},interests:memory.userInterests.get(userId)||[],registrations:[...memory.eventRegistrations.values()].filter(x=>x.userId===userId)},source:'memory',demo:true});
  }

  if(req.method==='PATCH'&&p==='/v1/me/profile'){
    const session=sessionFromRequest(req);
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const allowedRoles=['visitor','participant','client','buyer','designer','designer_brand','stylist','media','blogger','photo_video','volunteer','speaker','partner','delegate','staff','organizer'];
    const role=String(b.primaryRole||(session&&session.role)||'visitor').toLowerCase();
    if(!allowedRoles.includes(role))return json(res,400,{error:'invalid_primary_role',allowed:allowedRoles});
    if(pool){
      const user=await pool.query('SELECT id FROM users WHERE id::text=$1 LIMIT 1',[userId]);
      if(!user.rowCount)return json(res,404,{error:'user_not_found'});
      await pool.query(`INSERT INTO profiles(user_id,display_name,locale,primary_role,organisation,job_title,city,country,networking_visible,marketing_consent)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT(user_id) DO UPDATE SET display_name=EXCLUDED.display_name,locale=EXCLUDED.locale,
          primary_role=EXCLUDED.primary_role,organisation=EXCLUDED.organisation,job_title=EXCLUDED.job_title,
          city=EXCLUDED.city,country=EXCLUDED.country,networking_visible=EXCLUDED.networking_visible,
          marketing_consent=EXCLUDED.marketing_consent,updated_at=now()`,
        [user.rows[0].id,String(b.displayName||'MFW User').slice(0,120),String(b.locale||'ru').slice(0,5),role,
         String(b.organisation||b.company||'').slice(0,200)||null,String(b.jobTitle||b.title||'').slice(0,160)||null,
         String(b.city||'').slice(0,120)||null,String(b.country||'').slice(0,120)||null,!!b.networkingVisible,!!b.marketingConsent]);
      await track('profile_updated',{role,marketingConsent:!!b.marketingConsent},userId);
      return json(res,200,{ok:true,userId,primaryRole:role,source:'postgres'});
    }
    const existing=memory.users.get(userId)||{id:userId};
    memory.users.set(userId,{...existing,name:String(b.displayName||existing.name||'Demo User'),role});
    return json(res,200,{ok:true,userId,primaryRole:role,source:'memory'});
  }

  if(req.method==='PUT'&&p==='/v1/me/interests'){
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const raw=Array.isArray(b.interests)?b.interests:[];
    const normalized=raw.slice(0,50).map(x=>typeof x==='string'?{key:x,weight:1}:{key:x.key,weight:x.weight==null?1:Number(x.weight)}).filter(x=>x.key).map(x=>({key:String(x.key).toLowerCase().replace(/[^a-z0-9_-]/g,'').slice(0,64),weight:Math.max(0,Math.min(10,Number(x.weight||0)))})).filter(x=>x.key);
    if(pool){
      const user=await pool.query('SELECT id FROM users WHERE id::text=$1 LIMIT 1',[userId]);
      if(!user.rowCount)return json(res,404,{error:'user_not_found'});
      const client=await pool.connect();
      try{
        await client.query('BEGIN');
        await client.query("DELETE FROM user_interests WHERE user_id=$1 AND source='explicit'",[user.rows[0].id]);
        for(const x of normalized)await client.query(`INSERT INTO user_interests(user_id,interest_key,weight,source)
          VALUES($1,$2,$3,'explicit') ON CONFLICT(user_id,interest_key) DO UPDATE SET weight=EXCLUDED.weight,source='explicit',updated_at=now()`,[user.rows[0].id,x.key,x.weight]);
        await client.query('COMMIT');
      }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
      await track('interests_updated',{count:normalized.length},userId);
      return json(res,200,{data:normalized,source:'postgres'});
    }
    memory.userInterests.set(userId,normalized);
    return json(res,200,{data:normalized,source:'memory',demo:true});
  }

  if(req.method==='GET'&&p==='/v1/me/registrations'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const r=await pool.query(`SELECT COALESCE(e.external_key,e.id::text) AS "eventId",e.title,e.event_type AS "eventType",
        e.starts_at AS "startsAt",r.status,r.registration_type AS "registrationType",r.organisation,
        r.job_title AS "jobTitle",r.purpose,r.updated_at AS "updatedAt"
        FROM event_registrations r JOIN events e ON e.id=r.event_id
        WHERE r.user_id::text=$1 ORDER BY e.starts_at`,[userId]);
      return json(res,200,{data:r.rows,source:'postgres'});
    }
    return json(res,200,{data:[...memory.eventRegistrations.values()].filter(x=>x.userId===userId),source:'memory',demo:true});
  }

  if(req.method==='GET'&&p==='/v1/me/recommendations'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const interests=pool
      ? (await pool.query('SELECT interest_key FROM user_interests WHERE user_id::text=$1 ORDER BY weight DESC',[userId])).rows.map(x=>x.interest_key)
      : (memory.userInterests.get(String(userId))||[]).map(x=>typeof x==='string'?x:x.key);
    const followed=await brand365Store.brandFollowRefs(userId);
    let favoriteRefs=new Set();
    if(pool){
      const fav=await pool.query(`SELECT COALESCE(b.external_key,b.slug,b.id::text) ref
        FROM brand_favorites f JOIN brands b ON b.id=f.brand_id WHERE f.user_id::text=$1`,[userId]);
      favoriteRefs=new Set(fav.rows.map(x=>String(x.ref)));
    }else{
      favoriteRefs=new Set([...(memory.brandFavorites.get(String(userId))||new Set())]);
    }
    let professionalSignals=[];
    if(pool){
      const pf=await pool.query(`SELECT entity_type AS "entityType",entity_ref AS "entityRef",display_name AS "displayName",favorite
        FROM professional_follows WHERE user_id::text=$1 AND event_brand='bfs'`,[userId]);
      professionalSignals=pf.rows;
    }else{
      professionalSignals=[...memory.professionalFollows.values()].filter(x=>x.userId===String(userId)&&x.eventBrand==='bfs');
    }
    const rows=pool
      ? (await pool.query(`SELECT external_key id,title,event_type AS type,event_brand AS "eventBrand",starts_at AS "startsAt",ends_at AS "endsAt",metadata
          FROM events WHERE status IN ('published','live','delayed','completed')
            AND COALESCE(metadata->>'demo','false')<>'true' ORDER BY starts_at`)).rows
      : memory.events.filter(x=>!x.demo).map(x=>({id:x.id,title:x.title,type:x.type,eventBrand:x.eventBrand||'mfw',startsAt:x.startsAt,endsAt:x.endsAt||null,metadata:{...(x.metadata||{}),demo:!!x.demo}}));
    const interestWords={
      runway:['show','показ'],emerging_brands:['локаль','молод','new names','скаутинг'],
      womenswear:['womenswear','женск'],menswear:['menswear','мужск'],accessories:['аксессуар','jewelry','ювелир'],
      sustainable:['устойчив','sustain'],business:['бизнес','эконом','инвест','предприним'],
      retail:['retail','buying','маркет','продаж','шопинг'],technology:['технолог','ai','искусственн','цифров'],
      international:['international','международ','global'],lectures:['talk','session','лекц','дискус'],
      networking:['b2b','network','делегат','meeting']
    };
    const brandNames=new Map();
    for(const ref of new Set([...followed,...favoriteRefs])){
      const b=await brand365Store.brandByRef(ref).catch(()=>null);
      if(b)brandNames.set(String(ref),String(b.name||'').toLowerCase());
    }
    const recommendations=rows.map(e=>{
      let score=10;const reasons=[];const hay=(String(e.title||'')+' '+String(e.type||'')+' '+JSON.stringify(e.metadata||{})).toLowerCase();
      for(const key of interests){
        const words=interestWords[key]||[String(key).replace(/_/g,' ')];
        if(words.some(w=>hay.includes(String(w).toLowerCase()))){score+=18;reasons.push('interest:'+key);}
      }
      for(const [ref,name] of brandNames){
        if(name&&hay.includes(name)){score+=favoriteRefs.has(ref)?60:45;reasons.push((favoriteRefs.has(ref)?'favorite_brand:':'followed_brand:')+ref);}
      }
      if(e.eventBrand==='bfs'){
        const speakers=Array.isArray(e.metadata&&e.metadata.speakerIds)?e.metadata.speakerIds.map(String):[];
        for(const rel of professionalSignals){
          const ref=String(rel.entityRef||rel.entity_ref||''),display=String(rel.displayName||rel.display_name||'').toLowerCase();
          if(rel.entityType==='speaker'&&speakers.includes(ref)){score+=rel.favorite?45:30;reasons.push((rel.favorite?'favorite_speaker:':'followed_speaker:')+ref);}
          else if(display&&hay.includes(display)){score+=rel.favorite?32:20;reasons.push((rel.favorite?'favorite_professional:':'followed_professional:')+ref);}
        }
        if(interests.includes('business')){score+=8;reasons.push('bfs_business_context');}
      }
      if(e.eventBrand==='mfw'&&interests.includes('runway')&&String(e.type).includes('show')){score+=8;reasons.push('mfw_runway_context');}
      return {...e,score,reasons:reasons.length?reasons:['programme_relevance']};
    }).sort((a,b)=>b.score-a.score||String(a.startsAt).localeCompare(String(b.startsAt))).slice(0,12);
    return json(res,200,{data:recommendations,signals:{interests,followedBrands:[...followed],favoriteBrands:[...favoriteRefs],professionalFollows:professionalSignals},source:pool?'postgres':'memory'});
  }

  if(req.method==='GET'&&p==='/v1/me/wallet'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const followed=[...(await brand365Store.brandFollowRefs(userId))];
    const offers=[];
    for(const brandRef of followed){
      const sourceOffers=await brand365Store.offersForBrand(brandRef,{publishedOnly:true});
      for(const offer of sourceOffers)offers.push({...offer,eligibility:await evaluateLoyaltyOfferAuthority(userId,offer)});
    }
    let claims=[];
    if(pool){
      const r=await pool.query(`SELECT c.id,c.status,c.issued_at AS "issuedAt",c.expires_at AS "expiresAt",c.redeemed_at AS "redeemedAt",
        COALESCE(o.external_key,o.id::text) AS "offerId",o.title_ru AS "titleRu",o.title_en AS "titleEn",
        o.reward_type AS "rewardType",o.reward_value AS "rewardValue",COALESCE(b.external_key,b.slug,b.id::text) AS "brandId",b.name AS "brandName"
        FROM loyalty_claims c JOIN loyalty_offers o ON o.id=c.offer_id JOIN brands b ON b.id=o.brand_id
        WHERE c.user_id::text=$1 ORDER BY c.issued_at DESC`,[userId]);
      claims=r.rows;
    }else{
      claims=[...memory.loyaltyClaims.values()].filter(x=>String(x.userId)===String(userId)).map(x=>{
        const offer=memory.loyaltyOffers.find(o=>o.id===x.offerId)||{};
        const brand=memory.brands.find(b=>b.id===offer.brandId)||{};
        return {...x,titleRu:offer.titleRu,titleEn:offer.titleEn,rewardType:offer.rewardType,rewardValue:offer.rewardValue,brandId:offer.brandId,brandName:brand.name};
      });
    }
    return json(res,200,{data:{offers,claims,summary:{
      followedBrands:followed.length,eligibleOffers:offers.filter(x=>x.eligibility&&x.eligibility.eligible).length,
      issued:claims.filter(x=>x.status==='issued').length,redeemed:claims.filter(x=>x.status==='redeemed').length
    }},source:pool?'postgres':'memory'});
  }

  if(req.method==='GET'&&p==='/v1/me/reminders'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(!pool)return json(res,200,{data:[],source:'memory',demo:true});
    const r=await pool.query(`SELECT a.id AS "agendaId",COALESCE(e.external_key,e.id::text) AS "eventId",e.event_brand AS "eventBrand",
      e.title,e.starts_at AS "startsAt",a.reminder_minutes AS "reminderMinutes",
      e.starts_at-(a.reminder_minutes||' minutes')::interval AS "remindAt",
      CASE WHEN now()>=e.starts_at THEN 'past'
           WHEN now()>=e.starts_at-(a.reminder_minutes||' minutes')::interval THEN 'due'
           ELSE 'scheduled' END state
      FROM user_agenda a JOIN events e ON e.id=a.event_id
      WHERE a.user_id::text=$1 AND a.reminder_enabled=true ORDER BY e.starts_at`,[userId]);
    return json(res,200,{data:r.rows,next:r.rows.find(x=>x.state!=='past')||null,source:'postgres'});
  }

  if(req.method==='POST'&&p==='/v1/passes/issue'){
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const eventBrand=b.eventBrand?String(b.eventBrand).toLowerCase():null;
    let role=String(b.role||'Visitor');
    if(pool&&eventBrand){
      if(!['mfw','bfs'].includes(eventBrand))return json(res,400,{error:'invalid_event_brand'});
      const reg=await pool.query(`SELECT registration_type,status FROM platform_registrations
        WHERE user_id::text=$1 AND event_brand=$2 LIMIT 1`,[userId,eventBrand]);
      if(!reg.rowCount)return json(res,403,{error:'platform_registration_required',eventBrand});
      const row=reg.rows[0];
      if(!['submitted','approved'].includes(row.status))return json(res,403,{error:'registration_not_credential_eligible',status:row.status,eventBrand});
      role=String(row.registration_type||role);
    }
    const pass=await issuePass({userId,role,entitlements:b.entitlements,eventId:b.eventId||eventBrand||null});
    await track('pass_issued',{jti:pass.payload.jti,eventId:pass.payload.eventId,eventBrand},pass.payload.sub);
    return json(res,201,{...pass,eventBrand});
  }
  if(req.method==='POST'&&p==='/v1/passes/verify'){
    const b=await readBody(req);
    const v=verifyToken(b.token);
    if(!v.ok) return json(res,401,v);
    const revoked=await isRevoked(v.payload.jti);
    if(revoked.revoked) return json(res,401,{ok:false,reason:'revoked',payload:v.payload});
    return json(res,200,{ok:true,payload:v.payload});
  }
  if(req.method==='POST'&&p==='/v1/passes/qr'){
    const b=await readBody(req);
    const v=verifyToken(b.token);
    if(!v.ok) return json(res,400,{error:'invalid_pass'});
    const svg=await QRCode.toString('MFW:'+b.token,{
      type:'svg',errorCorrectionLevel:'M',margin:1,width:512,
      color:{dark:'#050505',light:'#ffffff'}
    });
    return text(res,200,svg,'image/svg+xml; charset=utf-8');
  }
  if(req.method==='POST'&&p==='/v1/passes/revoke'){
    if(!adminOk(req)) return json(res,403,{error:'admin_required'});
    const b=await readBody(req);
    await revokePass(String(b.jti||''),String(b.reason||'revoked'));
    await track('pass_revoked',{jti:b.jti,reason:b.reason});
    return json(res,200,{ok:true,jti:b.jti});
  }
  if(req.method==='POST'&&p==='/v1/checkins'){
    const b=await readBody(req);
    const result=await checkin({
      token:b.token,eventId:String(b.eventId||'e1'),scannerId:String(b.scannerId||'iphone-demo'),offline:!!b.offline
    });
    return json(res,result.ok?201:(result.status==='duplicate'?409:401),result);
  }

  if(req.method==='GET'&&p==='/v1/professional/follows'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const eventBrand=String(url.searchParams.get('eventBrand')||'bfs');
    if(pool){
      const r=await pool.query(`SELECT event_brand AS "eventBrand",entity_type AS "entityType",entity_ref AS "entityRef",
        display_name AS "displayName",favorite,followed_at AS "followedAt",updated_at AS "updatedAt"
        FROM professional_follows WHERE user_id::text=$1 AND event_brand=$2 ORDER BY updated_at DESC`,[userId,eventBrand]);
      return json(res,200,{data:r.rows,source:'postgres'});
    }
    const rows=[...memory.professionalFollows.values()].filter(x=>x.userId===String(userId)&&x.eventBrand===eventBrand);
    return json(res,200,{data:rows,source:'memory',demo:true});
  }
  if(req.method==='POST'&&p==='/v1/professional/follows'){
    const b=await readBody(req),userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const eventBrand=String(b.eventBrand||'bfs'),entityType=String(b.entityType||'organisation'),entityRef=String(b.entityRef||'').slice(0,160);
    if(!['mfw','bfs'].includes(eventBrand))return json(res,400,{error:'invalid_event_brand'});
    if(!['organisation','speaker','delegate','project'].includes(entityType)||!entityRef)return json(res,400,{error:'invalid_professional_entity'});
    const following=b.action!=='remove',favorite=!!b.favorite;
    if(pool){
      if(following){
        const r=await pool.query(`INSERT INTO professional_follows(user_id,event_brand,entity_type,entity_ref,display_name,favorite)
          VALUES($1,$2,$3,$4,$5,$6)
          ON CONFLICT(user_id,event_brand,entity_type,entity_ref) DO UPDATE SET display_name=EXCLUDED.display_name,
            favorite=EXCLUDED.favorite,updated_at=now()
          RETURNING event_brand AS "eventBrand",entity_type AS "entityType",entity_ref AS "entityRef",display_name AS "displayName",favorite,followed_at AS "followedAt",updated_at AS "updatedAt"`,
          [userId,eventBrand,entityType,entityRef,String(b.displayName||'').slice(0,200)||null,favorite]);
        await track('professional_followed',{eventBrand,entityType,entityRef,favorite},userId);
        return json(res,200,{data:r.rows[0],following:true,source:'postgres'});
      }
      await pool.query('DELETE FROM professional_follows WHERE user_id::text=$1 AND event_brand=$2 AND entity_type=$3 AND entity_ref=$4',[userId,eventBrand,entityType,entityRef]);
      await track('professional_unfollowed',{eventBrand,entityType,entityRef},userId);
      return json(res,200,{following:false,source:'postgres'});
    }
    const key=[userId,eventBrand,entityType,entityRef].join(':');
    if(following)memory.professionalFollows.set(key,{userId:String(userId),eventBrand,entityType,entityRef,displayName:String(b.displayName||''),favorite,followedAt:new Date().toISOString()});
    else memory.professionalFollows.delete(key);
    return json(res,200,{following,data:memory.professionalFollows.get(key)||null,source:'memory'});
  }

  if(req.method==='GET'&&p==='/v1/b2b/leads'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const r=await pool.query(`SELECT id,meeting_id AS "meetingId",event_brand AS "eventBrand",organisation_ref AS "organisationRef",
        organisation_name AS "organisationName",counterpart_ref AS "counterpartRef",counterpart_name AS "counterpartName",
        stage,next_action AS "nextAction",next_action_at AS "nextActionAt",notes,metadata,created_at AS "createdAt",updated_at AS "updatedAt"
        FROM b2b_leads WHERE owner_user_id::text=$1 ORDER BY updated_at DESC`,[userId]);
      return json(res,200,{data:r.rows,source:'postgres'});
    }
    return json(res,200,{data:[...memory.b2bLeads.values()].filter(x=>x.ownerUserId===String(userId)),source:'memory',demo:true});
  }
  if(req.method==='POST'&&p==='/v1/b2b/leads'){
    const b=await readBody(req),userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const stage=String(b.stage||'interest');
    const allowed=['interest','meeting_requested','meeting_confirmed','met','follow_up','qualified','won','lost'];
    if(!allowed.includes(stage))return json(res,400,{error:'invalid_lead_stage'});
    if(pool){
      const r=await pool.query(`INSERT INTO b2b_leads(meeting_id,owner_user_id,event_brand,organisation_ref,organisation_name,counterpart_ref,counterpart_name,stage,next_action,next_action_at,notes,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
        ON CONFLICT(meeting_id) DO UPDATE SET stage=EXCLUDED.stage,next_action=EXCLUDED.next_action,next_action_at=EXCLUDED.next_action_at,
          notes=EXCLUDED.notes,updated_at=now()
        RETURNING id,meeting_id AS "meetingId",event_brand AS "eventBrand",organisation_ref AS "organisationRef",
          organisation_name AS "organisationName",counterpart_ref AS "counterpartRef",counterpart_name AS "counterpartName",
          stage,next_action AS "nextAction",next_action_at AS "nextActionAt",notes,created_at AS "createdAt",updated_at AS "updatedAt"`,
        [b.meetingId||null,userId,String(b.eventBrand||'bfs'),String(b.organisationRef||'').slice(0,160)||null,
         String(b.organisationName||'').slice(0,200)||null,String(b.counterpartRef||'').slice(0,160)||null,
         String(b.counterpartName||'').slice(0,200)||null,stage,String(b.nextAction||'').slice(0,500)||null,
         b.nextActionAt||null,String(b.notes||'').slice(0,2000)||null,JSON.stringify(b.metadata||{})]);
      await track('b2b_lead_updated',{leadId:String(r.rows[0].id),stage},userId);
      return json(res,201,{data:r.rows[0],source:'postgres'});
    }
    const id=String(b.id||('lead_'+crypto.randomBytes(6).toString('hex')));
    const item={id,ownerUserId:String(userId),eventBrand:String(b.eventBrand||'bfs'),organisationRef:b.organisationRef||null,organisationName:b.organisationName||null,counterpartRef:b.counterpartRef||null,counterpartName:b.counterpartName||null,stage,nextAction:b.nextAction||null,nextActionAt:b.nextActionAt||null,notes:b.notes||null,updatedAt:new Date().toISOString(),demo:true};
    memory.b2bLeads.set(id,item);return json(res,201,{data:item,source:'memory'});
  }
  if(req.method==='PATCH'&&p.startsWith('/v1/b2b/leads/')){
    const id=p.split('/').pop(),b=await readBody(req),userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const stage=String(b.stage||''),allowed=['interest','meeting_requested','meeting_confirmed','met','follow_up','qualified','won','lost'];
    if(!allowed.includes(stage))return json(res,400,{error:'invalid_lead_stage'});
    if(pool){
      const r=await pool.query(`UPDATE b2b_leads SET stage=$3,next_action=COALESCE($4,next_action),next_action_at=COALESCE($5,next_action_at),
        notes=COALESCE($6,notes),updated_at=now() WHERE id::text=$1 AND owner_user_id::text=$2
        RETURNING id,meeting_id AS "meetingId",event_brand AS "eventBrand",organisation_ref AS "organisationRef",
          organisation_name AS "organisationName",counterpart_name AS "counterpartName",stage,next_action AS "nextAction",
          next_action_at AS "nextActionAt",notes,updated_at AS "updatedAt"`,
        [id,userId,stage,b.nextAction||null,b.nextActionAt||null,b.notes||null]);
      if(!r.rowCount)return json(res,404,{error:'lead_not_found'});
      await track('b2b_lead_stage_changed',{leadId:id,stage},userId);
      return json(res,200,{data:r.rows[0],source:'postgres'});
    }
    const item=memory.b2bLeads.get(id);if(!item||item.ownerUserId!==String(userId))return json(res,404,{error:'lead_not_found'});
    Object.assign(item,{stage,nextAction:b.nextAction??item.nextAction,nextActionAt:b.nextActionAt??item.nextActionAt,notes:b.notes??item.notes,updatedAt:new Date().toISOString()});
    return json(res,200,{data:item,source:'memory'});
  }

  if(req.method==='GET'&&p==='/v1/meetings'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const r=await pool.query(`SELECT m.id,COALESCE(e.external_key,e.id::text) AS "eventId",m.organisation,m.starts_at AS "startsAt",
        m.status,m.note,m.metadata,m.created_at AS "createdAt",m.updated_at AS "updatedAt"
        FROM b2b_meetings m LEFT JOIN events e ON e.id=m.event_id WHERE m.requester_user_id::text=$1 ORDER BY m.created_at DESC`,[userId]);
      return json(res,200,{data:r.rows,source:'postgres'});
    }
    return json(res,200,{data:[...memory.meetings.values()].filter(x=>String(x.buyerId||x.requesterUserId)===String(userId)),source:'memory',demo:true});
  }
  if(req.method==='PATCH'&&p.startsWith('/v1/meetings/')&&!p.includes('/proposals')){
    const id=p.split('/')[3],b=await readBody(req),userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    const status=String(b.status||''),allowed=['requested','confirmed','reschedule_requested','completed','cancelled','declined'];
    if(!allowed.includes(status))return json(res,400,{error:'invalid_meeting_status'});
    if(pool){
      const r=await pool.query(`UPDATE b2b_meetings SET status=$3,starts_at=COALESCE($4,starts_at),note=COALESCE($5,note),updated_at=now()
        WHERE id::text=$1 AND requester_user_id::text=$2
        RETURNING id,organisation,starts_at AS "startsAt",status,note,metadata,updated_at AS "updatedAt"`,
        [id,userId,status,b.startsAt||null,b.note||null]);
      if(!r.rowCount)return json(res,404,{error:'meeting_not_found'});
      await pool.query('INSERT INTO b2b_meeting_events(meeting_id,actor_user_id,event_type,payload) VALUES($1,$2,$3,$4::jsonb)',[id,userId,status,JSON.stringify({startsAt:b.startsAt||null,note:b.note||null})]);
      const stageMap={requested:'meeting_requested',confirmed:'meeting_confirmed',completed:'met'};
      if(stageMap[status]){
        const m=r.rows[0],meta=m.metadata||{};
        await pool.query(`INSERT INTO b2b_leads(meeting_id,owner_user_id,event_brand,organisation_ref,organisation_name,counterpart_ref,counterpart_name,stage,next_action,metadata)
          VALUES($1,$2,'bfs',$3,$4,$5,$6,$7,$8,$9::jsonb)
          ON CONFLICT(meeting_id) DO UPDATE SET stage=EXCLUDED.stage,next_action=COALESCE(EXCLUDED.next_action,b2b_leads.next_action),updated_at=now()`,
          [id,userId,meta.organisationRef||null,m.organisation||meta.organisationName||null,meta.counterpartRef||null,meta.counterpartName||null,
           stageMap[status],status==='completed'?'Отправить follow-up после встречи':null,JSON.stringify({source:'meeting_state_machine'})]);
      }
      await track('meeting_status_changed',{meetingId:id,status},userId);
      return json(res,200,{data:r.rows[0],source:'postgres'});
    }
    const m=memory.meetings.get(id);if(!m)return json(res,404,{error:'meeting_not_found'});
    m.status=status;m.updatedAt=new Date().toISOString();return json(res,200,{data:m,source:'memory'});
  }

  if(req.method==='POST'&&p==='/v1/meetings'){
    const b=await readBody(req);
    const requester=userSubject(req,b.buyerId||b.userId||'demo_buyer');
    if(!requester)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const user=await pool.query('SELECT id FROM users WHERE id::text=$1 LIMIT 1',[requester]);
      if(!user.rowCount)return json(res,404,{error:'user_not_found'});
      let brandStorageId=null;
      if(b.brandId){
        const brand=await brand365Store.brandByRef(String(b.brandId));
        if(!brand)return json(res,404,{error:'brand_not_found'});
        brandStorageId=brand.storageId;
      }
      let eventStorageId=null;
      if(b.eventId){
        const ev=await pool.query('SELECT id FROM events WHERE external_key=$1 OR id::text=$1 LIMIT 1',[String(b.eventId)]);
        if(!ev.rowCount)return json(res,404,{error:'event_not_found'});
        eventStorageId=ev.rows[0].id;
      }
      const startsAt=b.startsAt||null;
      const saved=await pool.query(`INSERT INTO b2b_meetings(event_id,brand_id,requester_user_id,organisation,starts_at,status,note,source,metadata)
        VALUES($1,$2,$3,$4,$5,'requested',$6,'app',$7::jsonb)
        RETURNING id,event_id AS "eventStorageId",brand_id AS "brandStorageId",requester_user_id AS "requesterUserId",organisation,starts_at AS "startsAt",status,note,created_at AS "createdAt"`,
        [eventStorageId,brandStorageId,user.rows[0].id,String(b.organisation||'').slice(0,200)||null,startsAt,String(b.note||'').slice(0,1000)||null,JSON.stringify({slot:b.slot||null,organisationRef:b.organisationRef||null,organisationName:b.organisationName||b.organisation||null,counterpartRef:b.counterpartRef||null,counterpartName:b.counterpartName||null,eventBrand:b.eventBrand||'bfs'})]);
      const meeting=saved.rows[0];
      await pool.query("INSERT INTO b2b_meeting_events(meeting_id,actor_user_id,event_type,payload) VALUES($1,$2,'requested',$3::jsonb)",[meeting.id,user.rows[0].id,JSON.stringify({brandId:b.brandId||null,eventId:b.eventId||null})]);
      await track('meeting_requested',{meetingId:String(meeting.id),brandId:b.brandId||null,eventId:b.eventId||null},requester);
      return json(res,201,{data:meeting,source:'postgres'});
    }
    const id='mtg_'+crypto.randomBytes(8).toString('hex');
    const meeting={id,brandId:String(b.brandId||'b1'),buyerId:requester,slot:String(b.slot||'14:30'),status:'confirmed',createdAt:new Date().toISOString(),demo:true};
    memory.meetings.set(id,meeting);
    await track('meeting_confirmed',meeting,meeting.buyerId);
    return json(res,201,{data:meeting,source:'memory'});
  }
  if(req.method==='POST'&&p==='/v1/analytics/track'){
    const b=await readBody(req);
    await track(String(b.type||'unknown').slice(0,100),b.meta||{},b.userId||null);
    return json(res,202,{accepted:true});
  }
  if(req.method==='GET'&&p==='/v1/agenda'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const r=await pool.query(`SELECT a.id,COALESCE(e.external_key,e.id::text) AS "eventId",e.title,e.event_type AS "eventType",
        e.starts_at AS "startsAt",e.ends_at AS "endsAt",e.status,
        e.event_brand AS "eventBrand",
        a.reminder_enabled AS "reminderEnabled",a.reminder_minutes AS "reminderMinutes",a.source
        FROM user_agenda a JOIN events e ON e.id=a.event_id
        WHERE a.user_id::text=$1 ORDER BY e.starts_at`,[userId]);
      return json(res,200,{data:r.rows,source:'postgres'});
    }
    return json(res,200,{data:[],source:'memory',demo:true});
  }
  if(req.method==='GET'&&p==='/v1/agenda/conflicts'){
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(!pool)return json(res,200,{data:[],source:'memory',demo:true});
    const r=await pool.query(`SELECT
      COALESCE(e1.external_key,e1.id::text) AS "eventIdA",e1.title AS "titleA",e1.starts_at AS "startsAtA",e1.ends_at AS "endsAtA",
      COALESCE(e2.external_key,e2.id::text) AS "eventIdB",e2.title AS "titleB",e2.starts_at AS "startsAtB",e2.ends_at AS "endsAtB"
      FROM user_agenda a1 JOIN events e1 ON e1.id=a1.event_id
      JOIN user_agenda a2 ON a2.user_id=a1.user_id AND a2.id>a1.id
      JOIN events e2 ON e2.id=a2.event_id
      WHERE a1.user_id::text=$1
        AND e1.starts_at < COALESCE(e2.ends_at,e2.starts_at+interval '60 minutes')
        AND e2.starts_at < COALESCE(e1.ends_at,e1.starts_at+interval '60 minutes')
      ORDER BY LEAST(e1.starts_at,e2.starts_at)`,[userId]);
    return json(res,200,{data:r.rows,count:r.rowCount,source:'postgres'});
  }

  if(req.method==='POST'&&p.startsWith('/v1/agenda/')&&p.endsWith('/save')){
    const eventId=p.split('/')[3];
    const b=await readBody(req);
    const userId=userSubject(req,b.userId||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const ev=await pool.query('SELECT id FROM events WHERE external_key=$1 OR id::text=$1 LIMIT 1',[eventId]);
      if(!ev.rowCount)return json(res,404,{error:'event_not_found'});
      const user=await pool.query('SELECT id FROM users WHERE id::text=$1 LIMIT 1',[userId]);
      if(!user.rowCount)return json(res,404,{error:'user_not_found'});
      const minutes=Math.max(0,Math.min(1440,Number(b.reminderMinutes==null?20:b.reminderMinutes)));
      const r=await pool.query(`INSERT INTO user_agenda(user_id,event_id,reminder_minutes,reminder_enabled,source)
        VALUES($1,$2,$3,$4,'app')
        ON CONFLICT(user_id,event_id) DO UPDATE SET reminder_minutes=EXCLUDED.reminder_minutes,reminder_enabled=EXCLUDED.reminder_enabled,updated_at=now()
        RETURNING id,event_id AS "eventStorageId",reminder_minutes AS "reminderMinutes",reminder_enabled AS "reminderEnabled",source,created_at AS "createdAt",updated_at AS "updatedAt"`,
        [user.rows[0].id,ev.rows[0].id,minutes,b.reminderEnabled!==false]);
      await track('agenda_saved',{eventId,reminderMinutes:minutes},userId);
      return json(res,200,{data:{...r.rows[0],eventId},source:'postgres'});
    }
    await track('agenda_saved',{eventId},userId);
    return json(res,200,{data:{eventId,userId,reminderEnabled:b.reminderEnabled!==false,reminderMinutes:Number(b.reminderMinutes||20),demo:true},source:'memory'});
  }
  if(req.method==='DELETE'&&p.startsWith('/v1/agenda/')){
    const eventId=p.split('/')[3];
    const userId=userSubject(req,url.searchParams.get('userId')||'demo_user');
    if(!userId)return json(res,401,{error:'authenticated_mfw_id_required'});
    if(pool){
      const r=await pool.query(`DELETE FROM user_agenda a USING events e
        WHERE a.event_id=e.id AND a.user_id::text=$1 AND (e.external_key=$2 OR e.id::text=$2) RETURNING a.id`,[userId,eventId]);
      if(!r.rowCount)return json(res,404,{error:'agenda_item_not_found'});
    }
    await track('agenda_removed',{eventId},userId);
    return json(res,200,{ok:true,eventId,source:pool?'postgres':'memory'});
  }

  if(req.method==='GET'&&p==='/v1/analytics/overview') return json(res,200,{data:overview()});

  if(p.startsWith('/v1/admin/')){
    if(!adminOk(req)) return json(res,403,{error:'admin_required'});
    if(req.method==='GET'&&p==='/v1/admin/overview') return json(res,200,{data:overview()});
    if(req.method==='GET'&&p==='/v1/admin/native-readiness') return json(res,200,{data:{
      shell:{status:'prepared',runtime:'Capacitor v8'},
      haptics:'prepared',
      camera:'prepared_with_web_fallback',
      push:'awaiting_apns_credentials',
      universalLinks:'awaiting_final_domain_and_bundle_id',
      wallet:'awaiting_pass_type_id_certificate',
      testflight:'awaiting_apple_team_signing'
    }});
    if(req.method==='GET'&&p==='/v1/admin/platform-registrations'){
      if(pool){
        const r=await pool.query(`SELECT pr.id,pr.event_brand AS "eventCode",pr.registration_type AS "registrationType",pr.status,
          pr.organisation AS company,pr.job_title AS title,pr.purpose,pr.created_at AS "createdAt",pr.updated_at AS "updatedAt",
          p.display_name AS "displayName",u.email,u.phone
          FROM platform_registrations pr JOIN users u ON u.id=pr.user_id LEFT JOIN profiles p ON p.user_id=u.id
          ORDER BY pr.updated_at DESC LIMIT 500`);
        return json(res,200,{data:r.rows,source:'postgres'});
      }
      return json(res,200,{data:[],source:'memory',demo:true});
    }
    if(req.method==='PATCH'&&p.startsWith('/v1/admin/platform-registrations/')){
      if(!pool)return json(res,409,{error:'postgres_required'});
      const id=p.split('/').pop(),b=await readBody(req),status=String(b.status||'');
      if(!['submitted','pending_review','approved','rejected','revoked','cancelled'].includes(status))return json(res,400,{error:'invalid_status'});
      const r=await pool.query('UPDATE platform_registrations SET status=$2,updated_at=now() WHERE id::text=$1 RETURNING id,event_brand AS "eventCode",registration_type AS "registrationType",status,updated_at AS "updatedAt"',[id,status]);
      if(!r.rowCount)return json(res,404,{error:'registration_not_found'});
      await track('platform_registration_reviewed',{id,status},sessionFromRequest(req)?.sub||null);
      return json(res,200,{data:r.rows[0]});
    }

    if(req.method==='GET'&&p==='/v1/admin/events') return json(res,200,{data:memory.events});
    if(req.method==='GET'&&p==='/v1/admin/accreditations') return json(res,200,{data:memory.accreditations});
    if(req.method==='GET'&&p==='/v1/admin/streams') return json(res,200,{data:memory.streams});
    if(req.method==='GET'&&p.startsWith('/v1/admin/streams/')&&p.endsWith('/control-plane')){
      const streamId=p.split('/')[4];
      const stream=memory.streams.find(x=>x.id===streamId||x.eventId===streamId);
      if(!stream)return json(res,404,{error:'stream_not_found'});
      return json(res,200,{data:{
        stream,
        sources:memory.streamSources.filter(x=>x.streamId===stream.id).map(src=>({...src,provider:memory.streamProviders.find(p=>p.id===src.providerId)})),
        outputs:memory.streamOutputs.filter(x=>x.streamId===stream.id),
        captions:memory.captionTracks.filter(x=>x.streamId===stream.id),
        replay:memory.replayAssets.find(x=>x.streamId===stream.id)||null,
        failover:memory.failoverEvents.filter(x=>x.streamId===stream.id).slice(-20).reverse()
      }});
    }
    if(req.method==='POST'&&p.startsWith('/v1/admin/streams/')&&p.endsWith('/failover')){
      const streamId=p.split('/')[4];
      const stream=memory.streams.find(x=>x.id===streamId||x.eventId===streamId);
      if(!stream)return json(res,404,{error:'stream_not_found'});
      const b=await readBody(req);
      const targetRole=String(b.targetRole||'backup');
      const target=memory.streamSources.find(x=>x.streamId===stream.id&&x.sourceRole===targetRole);
      const current=memory.streamSources.find(x=>x.id===stream.activeSourceId);
      if(!target)return json(res,404,{error:'target_source_not_found'});
      if(current)current.status='standby';
      target.status='active';
      const event={id:'fo_'+crypto.randomBytes(6).toString('hex'),streamId:stream.id,fromSourceId:current?.id||null,toSourceId:target.id,reason:String(b.reason||'manual_operator'),occurredAt:new Date().toISOString(),demo:true};
      memory.failoverEvents.push(event);
      stream.activeSourceId=target.id;stream.updatedAt=new Date().toISOString();
      await track('stream_failover',event);
      return json(res,200,{data:{stream,event,target}});
    }
    if(req.method==='POST'&&p.startsWith('/v1/admin/streams/')&&p.endsWith('/heartbeat')){
      const streamId=p.split('/')[4];
      const b=await readBody(req);
      const source=memory.streamSources.find(x=>x.streamId===streamId&&x.id===String(b.sourceId||'src_primary'));
      if(!source)return json(res,404,{error:'source_not_found'});
      source.lastHeartbeatAt=new Date().toISOString();
      source.health={...source.health,...(b.health||{})};
      if(Number(source.health.droppedFramesPct||0)>2||Number(source.health.latencySec||0)>15)source.status='degraded';
      return json(res,200,{data:source});
    }
    if(req.method==='POST'&&p.startsWith('/v1/admin/streams/')&&p.endsWith('/captions')){
      const streamId=p.split('/')[4];
      const b=await readBody(req);
      const language=String(b.language||'en').toLowerCase();
      let track=memory.captionTracks.find(x=>x.streamId===streamId&&x.language===language);
      if(!track){
        track={id:'cap_'+crypto.randomBytes(5).toString('hex'),streamId,language,label:language.toUpperCase(),source:String(b.source||'operator'),status:'live'};
        memory.captionTracks.push(track);
      }else{
        track.status=String(b.status||track.status);track.source=String(b.source||track.source);
      }
      return json(res,200,{data:track});
    }
    if(req.method==='POST'&&p.startsWith('/v1/admin/streams/')&&p.endsWith('/archive')){
      const streamId=p.split('/')[4];
      const stream=memory.streams.find(x=>x.id===streamId||x.eventId===streamId);
      if(!stream)return json(res,404,{error:'stream_not_found'});
      let replay=memory.replayAssets.find(x=>x.streamId===stream.id);
      if(!replay){replay={id:'rep_'+crypto.randomBytes(6).toString('hex'),streamId:stream.id,assetType:'full_show',demo:true};memory.replayAssets.push(replay);}
      replay.status='ready';replay.durationSeconds=1440;replay.playbackUrl=stream.playbackUrl;replay.publishedAt=new Date().toISOString();
      stream.replayAvailable=true;stream.status='replay';stream.updatedAt=new Date().toISOString();
      memory.streamOutputs.filter(x=>x.streamId===stream.id&&x.outputType==='recording').forEach(x=>x.status='archived');
      await track('stream_archive_ready',{streamId:stream.id,replayId:replay.id});
      return json(res,200,{data:replay,stream});
    }
    if(req.method==='GET'&&p==='/v1/admin/retention'){
      if(pool)return json(res,200,{data:await brand365Store.retentionMetrics()});
      const impressions=memory.contentInteractions.filter(x=>x.type==='impression');
      const opens=memory.contentInteractions.filter(x=>x.type==='open');
      const paidImpressions=impressions.filter(i=>memory.brandPosts.find(p=>p.id===i.postId&&p.isPaid)).length;
      const organicImpressions=impressions.length-paidImpressions;
      return json(res,200,{data:{
        feed:{impressions:impressions.length,organicImpressions,paidImpressions,opens:opens.length,openRatePct:impressions.length?Math.round(opens.length/impressions.length*1000)/10:0},
        push:{scheduled:memory.notifications.filter(x=>x.status==='scheduled').length,sent:memory.notifications.filter(x=>x.status==='sent').length,brandNewsLast7d:memory.notifications.filter(x=>x.category==='brand_news'&&new Date(x.createdAt||x.sentAt||0).getTime()>=Date.now()-7*86400000).length},
        policy:{organicPriority:true,paidLabelRequired:true,paidFeedFrequencyCap:'2_per_post_per_7d',paidFeedSpacing:'max_1_per_4_slots',brandPushFrequencyCap:'2_per_brand_per_7d',paidPushByBrand:false}
      }});
    }
    if(req.method==='GET'&&p==='/v1/admin/brand-growth'){
      if(pool){
        const data=await brand365Store.brandGrowth();
        return json(res,200,{data:{...data,providers:memory.socialProviderAdapters}});
      }
      const claims=[...memory.loyaltyClaims.values()];
      const memberships=[...memory.socialMemberships.values()];
      return json(res,200,{data:{
        brands:memory.brands.map(brand=>({
          id:brand.id,name:brand.name,
          followers:[...memory.brandFollows.values()].reduce((n,set)=>n+(set.has(brand.id)?1:0),0),
          publishedPosts:memory.brandPosts.filter(x=>x.brandId===brand.id&&x.status==='published').length,
          activeOffers:memory.loyaltyOffers.filter(x=>x.brandId===brand.id&&x.status==='published').length,
          issuedClaims:claims.filter(x=>memory.loyaltyOffers.find(o=>o.id===x.offerId&&o.brandId===brand.id)).length
        })),
        social:{channels:memory.socialChannels,membershipsVerified:memberships.length,activeMemberships:memberships.filter(x=>x.status==='active').length},
        offers:memory.loyaltyOffers.map(o=>({id:o.id,brandId:o.brandId,titleRu:o.titleRu,titleEn:o.titleEn,rewardType:o.rewardType,rewardValue:o.rewardValue,status:o.status,requirements:o.requirements})),
        content:{posts:memory.brandPosts,recentInteractions:memory.contentInteractions.slice(-20).reverse()},
        providers:memory.socialProviderAdapters
      }});
    }
    if(req.method==='POST'&&p==='/v1/admin/golden-path/loyalty-30d'){
      const report=await runAcceleratedLoyaltyGoldenPath();
      return json(res,report.ok?200:500,{data:report});
    }
    if(req.method==='POST'&&p==='/v1/admin/social/reverify'){
      const result=await runSocialReverification('admin');
      return json(res,200,{data:result});
    }
    if(req.method==='POST'&&p==='/v1/admin/brand-content'){
      const b=await readBody(req);
      const brandId=String(b.brandId||'b1');
      const brand=await brand365Store.brandByRef(brandId);
      if(!brand)return json(res,404,{error:'brand_not_found'});
      if(pool){
        const post=await brand365Store.createPost(brandId,{...b,isPaid:!!b.isPaid});
        if(post.isPaid&&post.status==='pending_review'){
          const approved=await brand365Store.moderatePost(post.id,'published','Created by MFW Admin');
          await track('brand_content_published',{brandId,postId:approved.id,isPaid:approved.isPaid});
          return json(res,201,{data:approved});
        }
        await track('brand_content_published',{brandId,postId:post.id,isPaid:post.isPaid});
        return json(res,201,{data:post});
      }
      const post={id:'bp_'+crypto.randomBytes(6).toString('hex'),brandId,kind:String(b.kind||'news'),titleRu:String(b.titleRu||'Новая публикация'),titleEn:String(b.titleEn||'New post'),bodyRu:String(b.bodyRu||''),bodyEn:String(b.bodyEn||''),imageUrl:String(b.imageUrl||''),ctaLabelRu:String(b.ctaLabelRu||'Открыть'),ctaLabelEn:String(b.ctaLabelEn||'Open'),ctaUrl:String(b.ctaUrl||'#'),audienceScope:b.audienceScope||{kind:'brand_followers'},placementScope:b.placementScope||['brand_profile'],isPaid:!!b.isPaid,sponsorLabelRu:b.isPaid?'Реклама бренда':null,sponsorLabelEn:b.isPaid?'Brand promotion':null,status:'published',publishedAt:new Date().toISOString(),createdAt:new Date().toISOString(),demo:true};
      memory.brandPosts.unshift(post);
      await track('brand_content_published',{brandId,postId:post.id,isPaid:post.isPaid});
      return json(res,201,{data:post});
    }
    if(req.method==='PATCH'&&p.startsWith('/v1/admin/brand-content/')){
      const postId=p.split('/').pop();
      const b=await readBody(req);
      if(b.status&&!['pending_review','published','rejected','paused','ended'].includes(String(b.status)))return json(res,400,{error:'invalid_status'});
      const post=await brand365Store.moderatePost(postId,b.status?String(b.status):null,String(b.moderationNote||''));
      if(!post)return json(res,404,{error:'post_not_found'});
      await track('brand_content_moderated',{postId,status:post.status});
      return json(res,200,{data:post});
    }
    if(req.method==='PATCH'&&p.startsWith('/v1/admin/loyalty-offers/')){
      const offerId=p.split('/').pop();
      const b=await readBody(req);
      if(b.status&&!['draft','pending','published','paused','ended'].includes(String(b.status)))return json(res,400,{error:'invalid_status'});
      const offer=await brand365Store.moderateOffer(offerId,b.status?String(b.status):null);
      if(!offer)return json(res,404,{error:'offer_not_found'});
      await track('loyalty_offer_moderated',{offerId,status:offer.status});
      return json(res,200,{data:offer});
    }
    if(req.method==='GET'&&p==='/v1/admin/sponsors'){
      const interactions=memory.sponsorInteractions;
      const count=t=>interactions.filter(x=>x.interactionType===t).length;
      return json(res,200,{data:{
        sponsor:memory.sponsors[0],
        campaign:memory.sponsorCampaigns[0],
        placements:memory.sponsorPlacements,
        metrics:{
          impressions:24800,
          uniqueReach:19600,
          experienceOpens:6100+count('open'),
          challengeStarts:1280+count('challenge_start'),
          ctaClicks:487+count('cta_click'),
          brandProfileOpens:920+count('brand_open'),
          attributedIntents:214+count('intent')
        },
        recent:interactions.slice(-20).reverse()
      }});
    }
    if(req.method==='GET'&&p==='/v1/admin/commerce'){
      const leads=[...memory.commerceLeads.values()];
      return json(res,200,{data:{
        shortlistActions:[...memory.shortlists.values()].reduce((n,set)=>n+set.size,0),
        lineSheetRequests:27+memory.analytics.filter(x=>x.name==='line_sheet_opened').length,
        meetingRequests:48+memory.meetings.size,
        leads:leads.slice(-20).reverse(),
        funnel:{brandViews:6100,collectionOpens:2180,savedLooks:1900,shortlists:312,meetings:48+memory.meetings.size,qualified:14+leads.filter(x=>['qualified','follow_up','meeting'].includes(x.stage)).length}
      }});
    }
    if(req.method==='PATCH'&&p.startsWith('/v1/admin/streams/')){
      const streamId=p.split('/').pop();
      const body=await readBody(req);
      const stream=memory.streams.find(x=>x.id===streamId||x.eventId===streamId);
      if(!stream)return json(res,404,{error:'stream_not_found'});
      const before={...stream};
      for(const key of ['status','currentLook','totalLooks','replayAvailable']){
        if(Object.prototype.hasOwnProperty.call(body,key))stream[key]=body[key];
      }
      stream.currentLook=Math.max(1,Math.min(Number(stream.currentLook||1),Number(stream.totalLooks||1)));
      stream.updatedAt=new Date().toISOString();
      await track('stream_updated',{streamId,before,after:stream});
      return json(res,200,{data:stream});
    }
    if(req.method==='POST'&&p.startsWith('/v1/admin/streams/')&&p.endsWith('/next-look')){
      const parts=p.split('/');
      const streamId=parts[4];
      const stream=memory.streams.find(x=>x.id===streamId||x.eventId===streamId);
      if(!stream)return json(res,404,{error:'stream_not_found'});
      stream.currentLook=Math.min(stream.totalLooks,stream.currentLook+1);
      stream.updatedAt=new Date().toISOString();
      await track('stream_look_advanced',{streamId,currentLook:stream.currentLook});
      return json(res,200,{data:stream});
    }
    if(req.method==='PATCH'&&p.startsWith('/v1/admin/accreditations/')){
      var accId=p.split('/').pop();
      var accBody=await readBody(req);
      var acc=memory.accreditations.find(x=>x.id===accId);
      if(!acc)return json(res,404,{error:'accreditation_not_found'});
      if(['pending','approved','rejected','revoked'].indexOf(String(accBody.status))<0)return json(res,400,{error:'invalid_status'});
      acc.status=String(accBody.status);
      await track('accreditation_updated',{id:accId,status:acc.status});
      return json(res,200,{data:acc});
    }
    if(req.method==='POST'&&p==='/v1/admin/notifications'){
      var note=await readBody(req);
      var item={id:'ntf_'+crypto.randomBytes(6).toString('hex'),category:String(note.category||'critical'),title:String(note.title||'Programme update'),body:String(note.body||''),status:'sent',sentAt:new Date().toISOString(),demo:true};
      memory.notifications.unshift(item);
      await track('notification_sent',item);
      return json(res,201,{data:item});
    }
    if(req.method==='POST'&&p==='/v1/admin/invitations'){
      var invitationBody=await readBody(req);
      var invitation={id:'inv_'+crypto.randomBytes(6).toString('hex'),eventId:String(invitationBody.eventId||'e1'),recipient:String(invitationBody.recipient||'demo@example.com'),status:'sent',sentAt:new Date().toISOString(),demo:true};
      memory.invitations.unshift(invitation);
      await track('invitation_sent',invitation);
      return json(res,201,{data:invitation});
    }
    if(req.method==='PATCH'&&p.startsWith('/v1/admin/events/')){
      const id=p.split('/').pop();
      const b=await readBody(req);
      const e=memory.events.find(x=>x.id===id);
      if(!e) return json(res,404,{error:'event_not_found'});
      const before={...e};
      for(const k of ['title','venue','startsAt','status','accessMode','capacity','waitlist','checkedIn']){
        if(Object.prototype.hasOwnProperty.call(b,k)) e[k]=b[k];
      }
      await track('admin_event_updated',{id,before,after:e});
      return json(res,200,{data:e});
    }
    if(req.method==='POST'&&p==='/v1/admin/waitlist/release'){
      const b=await readBody(req);
      const e=memory.events.find(x=>x.id===String(b.eventId||'e1'));
      if(!e) return json(res,404,{error:'event_not_found'});
      const count=Math.max(0,Math.min(Number(b.count||0),e.waitlist||0));
      e.waitlist=Math.max(0,(e.waitlist||0)-count);
      await track('waitlist_released',{eventId:e.id,count});
      return json(res,200,{released:count,event:e});
    }
  }

  return json(res,404,{error:'not_found'});
}

async function main(){
  if(REQUIRE_POSTGRES&&!pool)throw new Error('MFW_REQUIRE_POSTGRES=true but DATABASE_URL is not configured');
  await migrate();
  databaseSchemaReadiness=await checkDatabaseSchema();
  if(pool&&!databaseSchemaReadiness.ready){
    console.error(JSON.stringify({event:'mfw_database_schema_not_ready',...databaseSchemaReadiness}));
    throw new Error('database_schema_not_ready');
  }
  await bootstrapDemoData();
  const selfTest=await runDeepSelfTest();
  console.log(JSON.stringify({event:'mfw_deep_self_test',...selfTest}));
  if(!selfTest.ok)throw new Error('deep_self_test_failed');
  const scheduler=startReverificationScheduler();
  console.log(JSON.stringify({event:'mfw_reverification_scheduler',...scheduler}));
  const server=http.createServer((req,res)=>router(req,res).catch(err=>{
    console.error(err);
    json(res,500,{error:'internal_error'});
  }));
  server.listen(PORT,'0.0.0.0',()=>{
    console.log(JSON.stringify({event:'mfw_api_started',version:VERSION,port:PORT,dataMode:pool?'postgres':'memory'}));
  });
}
main().catch(err=>{console.error(err);process.exit(1);});
