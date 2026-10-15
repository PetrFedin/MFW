'use strict';
// SCRATCH PG17 ONLY: real published Supabase Auth SDK signature validation
// + loopback HTTP + live SQL lookups against SYNTHETIC auth and membership rows.
// This file MUST NOT be imported by deployed server-v2.js.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { AuthClient } = require('@supabase/auth-js');
const { createPostgresResearchIdentityBoundary } = require('../../research/commercial-pg-identity-adapter');
const { createCommercialHttpBoundary, publicAuthFailure } = require('../../commercial-http-boundary');

const url = new URL(process.env.DATABASE_URL || 'postgresql://invalid');
assert.equal(process.env.CI, 'true', 'CI_only');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'github_actions_only');
assert.equal(process.env.MFW_COMMERCIAL_SCRATCH, 'true', 'scratch_flag_required');
for (const [property, expected] of [
  ['protocol', 'postgresql:'], ['hostname', '127.0.0.1'],
  ['port', '5432'], ['username', 'mfw_ci'],
  ['password', 'scratch_ci_only'], ['pathname', '/mfw_commercial_ci']
]) assert.equal(url[property], expected, 'no_production_database_' + property);

const ISSUER = 'https://identity-ci.supabase.co/auth/v1';
const SUBJECT = '11111111-1111-4111-8111-111111111111';
const SESSION = '22222222-2222-4222-8222-222222222222';
const ORG = '77777777-7777-4777-8777-777777777777';
const FOREIGN_ORG = '88888888-8888-4888-8888-888888888888';
const APP_USER = '55555555-5555-4555-8555-555555555555';
const REVIEWER = '99999999-9999-4999-8999-999999999999';
const endpoint = (org=ORG, event='PILOT_ACCEPTED') =>
  '/v1/commercial/organisations/' + org + '/events/' + event + '/authorise';
const encode = data => Buffer.from(JSON.stringify(data)).toString('base64url');
const listen = server => new Promise((resolve,reject) => {
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:' + server.address().port));
});
const close = server => new Promise(resolve => {
  server.close(resolve);
  server.closeAllConnections();
});
const json = (res,status,body) => {
  res.writeHead(status,{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store','x-content-type-options':'nosniff'
  });
  res.end(JSON.stringify(body));
};

test('real SDK -> HTTP -> SQL session + reviewed tenant role (disposable PG17)',{timeout:60000},async t=>{
  const pool=new Pool({connectionString:url.toString(),max:4});
  let authServer=null,appServer=null,auth=null;
  const counters={jwks:0,foreignNetwork:0,requests:0};
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const jwk={...pair.publicKey.export({format:'jwk'}),kid:'mfw-pg17-ci-es256',alg:'ES256',use:'sig'};
  const now=Math.floor(Date.now()/1000);
  const claims=(extra={})=>({
    iss:ISSUER,aud:'authenticated',role:'authenticated',sub:SUBJECT,
    session_id:SESSION,is_anonymous:false,aal:'aal1',
    iat:now-60,exp:now+1800,...extra
  });
  function signed(custom=claims()) {
    const first=encode({alg:'ES256',typ:'JWT',kid:jwk.kid});
    const second=encode(custom);
    const data=first+'.'+second;
    const sig=crypto.sign('sha256',Buffer.from(data),{
      key:pair.privateKey,dsaEncoding:'ieee-p1363'
    }).toString('base64url');
    return data+'.'+sig;
  }
  async function scenario(name,fn){await t.test(name,fn);}
  try{
    const version=await pool.query("SELECT current_setting('server_version_num') AS n");
    assert.equal(Math.floor(Number(version.rows[0].n)/10000),17);
    const fixture=await pool.query(
      'SELECT count(*)::integer AS n FROM ci_commercial_auth.subject_links WHERE auth_subject=$1::uuid AND status=$2',
      [SUBJECT,'operator_verified']
    );
    assert.equal(fixture.rows[0].n,1,'scratch seed requires prior pg identity test');
    const session=await pool.query('SELECT id,aal FROM auth.sessions WHERE user_id=$1::uuid',[SUBJECT]);
    assert.equal(session.rowCount,1);
    assert.equal(session.rows[0].id,SESSION);
    assert.equal(session.rows[0].aal,'aal1');
    // Earlier scratch identity tests end with a FINANCE_REVIEWER candidate.
    // Restore only synthetic scratch roles, never change actual privileges.
    await pool.query(
      "UPDATE ci_commercial_auth.role_grants SET role='partner_admin' WHERE organisation_id=$1::uuid AND app_user_id=$2::uuid",
      [ORG,APP_USER]
    );
    authServer=http.createServer((req,res)=>{
      if(req.method==='GET'&&req.url==='/auth/v1/.well-known/jwks.json'){
        counters.jwks++;
        return json(res,200,{keys:[jwk]});
      }
      return json(res,404,{error:'fixture_only'});
    });
    const issuerOrigin=await listen(authServer);
    const sdkFetch=async(input,init={})=>{
      const requestUrl=new URL(typeof input==='string'||input instanceof URL?input:input.url);
      if(requestUrl.origin!==new URL(ISSUER).origin ||
         requestUrl.pathname!=='/auth/v1/.well-known/jwks.json' ||
         requestUrl.search || requestUrl.hash){
        counters.foreignNetwork++;
        throw Error('non_fixture_network_forbidden');
      }
      return fetch(issuerOrigin+requestUrl.pathname,{
        ...init,redirect:'error',signal:AbortSignal.timeout(2000)
      });
    };
    auth=new AuthClient({
      url:ISSUER,fetch:sdkFetch,autoRefreshToken:false,persistSession:false,
      detectSessionInUrl:false,storageKey:'mfw-pg17-sdk-http-isolated'
    });
    const authorize=createPostgresResearchIdentityBoundary({pool,auth,issuer:ISSUER});
    const httpGate=createCommercialHttpBoundary({authorise:authorize});
    appServer=http.createServer(async(req,res)=>{
      counters.requests++;
      try{
        const actor=await httpGate(req);
        // Candidate authorisation ONLY. There is no acceptance, invoice or DB write.
        assert.equal(actor.trustedServerContext,true);
        res.writeHead(204,{'cache-control':'no-store'});
        res.end();
      }catch(error){
        const mapped=publicAuthFailure(error);
        json(res,mapped.status,{error:mapped.error});
      }
    });
    const appOrigin=await listen(appServer);
    async function request(token,path=endpoint(),{method='POST',headers={}}={}){
      const h={...headers};
      if(token!==undefined)h.Authorization='Bearer '+token;
      const response=await fetch(appOrigin+path,{method,headers:h,redirect:'error',signal:AbortSignal.timeout(2500)});
      return {status:response.status,body:await response.text(),cache:response.headers.get('cache-control')};
    }
    const bearer=signed();
    await scenario('ES256 SDK signature + active SQL session + verified organisation => 204',async()=>{
      const r=await request(bearer);
      assert.equal(r.status,204);
      assert.equal(r.body,'');
      assert.equal(r.cache,'no-store');
      assert(counters.jwks>0,'real SDK must fetch JWK');
    });
    await scenario('same token cannot access different self-claimed organisation',async()=>{
      const foreign=await request(bearer,endpoint(FOREIGN_ORG));
      const absent=await request(bearer,endpoint('99999999-9999-4999-8999-999999999997'));
      assert.equal(foreign.status,403);
      assert.deepEqual([foreign.status,foreign.body],[absent.status,absent.body],
        'foreign and missing organisation must not leak existence');
    });
    await scenario('changed signed payload rejected before SQL actor admission',async()=>{
      const parts=bearer.split('.');
      parts[1]=encode(claims({sub:'33333333-3333-4333-8333-333333333333'}));
      assert.equal((await request(parts.join('.'))).status,401);
    });
    await scenario('absence of bearer rejected without tenant information',async()=>{
      const r=await request(undefined);
      assert.equal(r.status,401);
      assert.deepEqual(JSON.parse(r.body),{error:'unauthorised'});
    });
    await scenario('forged user metadata is not a finance grant',async()=>{
      const forged=signed(claims({aal:'aal2',user_metadata:{role:'finance_reviewer'},
        app_metadata:{role:'settlement_verifier'}}));
      assert.equal((await request(forged,endpoint(ORG,'FINANCE_REVIEWED'))).status,403);
    });
    await scenario('revoked or expired SQL session invalidates intact signed token',async()=>{
      await pool.query("UPDATE auth.sessions SET not_after=clock_timestamp()-interval '1 minute' WHERE id=$1::uuid",[SESSION]);
      try{assert.equal((await request(bearer)).status,401);}
      finally{await pool.query('UPDATE auth.sessions SET not_after=NULL WHERE id=$1::uuid',[SESSION]);}
      assert.equal((await request(bearer)).status,204);
    });
    await scenario('revoked tenant membership invalidates cached valid JWT',async()=>{
      await pool.query("UPDATE public.professional_organisation_memberships SET status='revoked' WHERE organisation_id=$1::uuid AND user_id=$2::uuid",[ORG,APP_USER]);
      try{assert.equal((await request(bearer)).status,403);}
      finally{await pool.query("UPDATE public.professional_organisation_memberships SET status='active' WHERE organisation_id=$1::uuid AND user_id=$2::uuid",[ORG,APP_USER]);}
      assert.equal((await request(bearer)).status,204);
    });
    await scenario('blocked independent reviewer revokes grant immediately',async()=>{
      await pool.query("UPDATE public.users SET status='blocked' WHERE id=$1::uuid",[REVIEWER]);
      try{
        const denied=await request(bearer);
        assert([401,403].includes(denied.status),'deny actor when reviewer revoked');
      }finally{await pool.query("UPDATE public.users SET status='active' WHERE id=$1::uuid",[REVIEWER]);}
      assert.equal((await request(bearer)).status,204);
    });
    await scenario('finance candidate requires actual session AAL2 AND reviewed finance role',async()=>{
      await pool.query("UPDATE ci_commercial_auth.role_grants SET role='finance_reviewer' WHERE organisation_id=$1::uuid AND app_user_id=$2::uuid",[ORG,APP_USER]);
      try {
        assert.equal((await request(bearer,endpoint(ORG,'FINANCE_REVIEWED'))).status,403);
        const elevated=signed(claims({aal:'aal2'}));
        assert.equal((await request(elevated,endpoint(ORG,'FINANCE_REVIEWED'))).status,401,
          'JWT AAL2 alone cannot override SQL session AAL1');
        await pool.query("UPDATE auth.sessions SET aal='aal2' WHERE id=$1::uuid",[SESSION]);
        try{
          assert.equal((await request(elevated,endpoint(ORG,'FINANCE_REVIEWED'))).status,204,
            '204 means actor authorised for later server validation, NOT invoice/payment');
        }finally{await pool.query("UPDATE auth.sessions SET aal='aal1' WHERE id=$1::uuid",[SESSION]);}
      }finally{
        await pool.query("UPDATE ci_commercial_auth.role_grants SET role='partner_admin' WHERE organisation_id=$1::uuid AND app_user_id=$2::uuid",[ORG,APP_USER]);
      }
    });
    await scenario('parallel valid/foreign requests do not confuse tenant',async()=>{
      const [valid,foreign]=await Promise.all([
        request(bearer,endpoint(ORG)),request(bearer,endpoint(FOREIGN_ORG))
      ]);
      assert.equal(valid.status,204);
      assert.equal(foreign.status,403);
    });
    assert.equal(counters.foreignNetwork,0,'no external Supabase/production calls');
    assert(counters.requests>=12);
    t.diagnostic(JSON.stringify({
      gate:'mfw_sdk_http_native_pg17_identity_integration',status:'pass',
      server:'disposable Postgres 17',issuer:'loopback-only synthetic keys',
      tokenCrypto:'actual @supabase/auth-js ES256 getClaims',
      verifiedSession:'synthetic SQL rows',membership:'operator-reviewed scratch',
      forbiddenCrossTenant:true,revocationRechecked:true,financeAal2Required:true,
      httpIdentityOnly:true,actualFinancialOperations:0,
      hostedUsersUsed:0,productionAdmitted:false
    }));
  }finally{
    if(auth)await auth.stopAutoRefresh();
    if(appServer)await close(appServer);
    if(authServer)await close(authServer);
    await pool.end();
  }
});
