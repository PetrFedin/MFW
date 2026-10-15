'use strict';
// Actual published Auth SDK; only the identity issuer and stores are fixtures.
// Keys/tokens stay in process memory; every network call is loopback-only.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const { AuthClient } = require('@supabase/auth-js');
const { createSupabaseIdentityBoundary } = require('../../commercial-identity-boundary');
const { createCommercialHttpBoundary, publicAuthFailure } = require('../../commercial-http-boundary');
const ISSUER = 'https://mfw-sdk-fixture.invalid/auth/v1';
const SUBJECT = '11111111-1111-4111-8111-111111111111';
const SESSION = '22222222-2222-4222-8222-222222222222';
const SUBJECT_B = '33333333-3333-4333-8333-333333333333';
const SESSION_B = '44444444-4444-4444-8444-444444444444';
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function key(alg, kid) {
  const pair = alg === 'ES256'
    ? crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    : crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  return { ...pair, alg, kid, jwk: { ...pair.publicKey.export({ format: 'jwk' }), kid, alg, use: 'sig' } };
}
function signed(pair, claims, header = {}) {
  const data = enc({ alg: pair.alg, typ: 'JWT', kid: pair.kid, ...header }) + '.' + enc(claims);
  const signature = crypto.sign('sha256', Buffer.from(data), pair.alg === 'ES256'
    ? { key: pair.privateKey, dsaEncoding: 'ieee-p1363' } : pair.privateKey);
  return data + '.' + signature.toString('base64url');
}
const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port));
});
const close = server => new Promise(resolve => {
  server.close(resolve);
  server.closeAllConnections();
});
function send(origin, path, token, { method = 'POST', headers = {}, body, duplicate = false } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...headers };
    if (token !== undefined) h.Authorization = duplicate ? ['Bearer ' + token, 'Bearer ' + token] : 'Bearer ' + token;
    if (body !== undefined) { h['Content-Length'] = Buffer.byteLength(body); h['Content-Type'] = 'application/json'; }
    const req = http.request(origin + path, { method, headers: h }, res => {
      let payload = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { payload += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: payload, headers: res.headers }));
    });
    req.setTimeout(3000, () => req.destroy(new Error('loopback_request_timeout')));
    req.on('error', reject);
    req.end(body);
  });
}

test('real Auth SDK and real loopback HTTP protect organisation/event scope', { timeout: 60000 }, async t => {
  const es = key('ES256', 'es-primary'), rsa = key('RS256', 'rsa-primary'), rotated = key('ES256', 'es-rotated');
  const symmetricSecret = crypto.randomBytes(48);
  let keys = [es.jwk, rsa.jwk], jwksDown = false, sessionDown = false, memberDown = false;
  let stats = { jwks: 0, user: 0, network: 0, foreignNetwork: 0 };
  const sessions = new Map(), memberships = new Map();
  const clients = [];
  let routeGate, lastActor, clientIndex = 0;
  const now = Math.floor(Date.now() / 1000);
  const claims = patch => ({
    iss: ISSUER, aud: 'authenticated', role: 'authenticated', sub: SUBJECT,
    session_id: SESSION, is_anonymous: false, aal: 'aal1', iat: now - 30, exp: now + 3600,
    ...patch
  });
  const pathFor = (org = 'org-a', event = 'PILOT_ACCEPTED') =>
    '/v1/commercial/organisations/' + org + '/events/' + event + '/authorise';
  const json = (res, code, value) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  const issuerServer = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/auth/v1/.well-known/jwks.json') {
      stats.jwks++;
      return json(res, jwksDown ? 503 : 200, jwksDown ? { message: 'fixture_unavailable' } : { keys });
    }
    if (req.method === 'GET' && req.url === '/auth/v1/user') {
      stats.user++;
      // Only the symmetric-path fixture verifies here. Asymmetric validation
      // must occur in the real SDK, never in this endpoint.
      try {
        const raw = String(req.headers.authorization || '').replace(/^Bearer /i, '');
        const segments = raw.split('.');
        const header = JSON.parse(Buffer.from(segments[0], 'base64url'));
        const payload = JSON.parse(Buffer.from(segments[1], 'base64url'));
        const expected = crypto.createHmac('sha256', symmetricSecret).update(segments[0] + '.' + segments[1]).digest();
        const actual = Buffer.from(segments[2], 'base64url');
        if (header.alg !== 'HS256' || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected) || payload.exp <= now)
          throw new Error('denied');
        return json(res, 200, { id: payload.sub, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
      } catch (_) { return json(res, 401, { code: 'bad_jwt', message: 'fixture_rejected' }); }
    }
    return json(res, 404, { message: 'fixture_route_not_allowed' });
  });
  const issuerOrigin = await listen(issuerServer);
  const sdkFetch = async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    stats.network++;
    if (url.origin !== new URL(ISSUER).origin || !['/auth/v1/.well-known/jwks.json', '/auth/v1/user'].includes(url.pathname) || url.search) {
      stats.foreignNetwork++;
      throw new Error('non_fixture_network_forbidden');
    }
    return fetch(issuerOrigin + url.pathname, { ...init, redirect: 'error', signal: AbortSignal.timeout(1500) });
  };
  function configure() {
    const auth = new AuthClient({ url: ISSUER, fetch: sdkFetch, autoRefreshToken: false,
      persistSession: false, detectSessionInUrl: false, storageKey: 'mfw-sdk-ci-' + (++clientIndex) });
    clients.push(auth);
    const authorise = createSupabaseIdentityBoundary({ auth, issuer: ISSUER,
      verifySession: async ({ subject, sessionId }) => {
        if (sessionDown) throw new Error('fixture_store_down');
        return sessions.get(subject + ':' + sessionId) || null;
      },
      lookupMembership: async ({ subject, organisationId }) => {
        if (memberDown) throw new Error('fixture_store_down');
        return memberships.get(subject + ':' + organisationId) || null;
      }
    });
    routeGate = createCommercialHttpBoundary({ authorise });
  }
  function reset() {
    keys = [es.jwk, rsa.jwk]; jwksDown = sessionDown = memberDown = false;
    sessions.clear(); memberships.clear(); lastActor = undefined;
    sessions.set(SUBJECT + ':' + SESSION, { subject: SUBJECT, sessionId: SESSION, active: true });
    sessions.set(SUBJECT_B + ':' + SESSION_B, { subject: SUBJECT_B, sessionId: SESSION_B, active: true });
    memberships.set(SUBJECT + ':org-a', { subject: SUBJECT, organisationId: 'org-a', role: 'partner_admin', status: 'active' });
    memberships.set(SUBJECT_B + ':org-b', { subject: SUBJECT_B, organisationId: 'org-b', role: 'brand_admin', status: 'active' });
    configure();
  }
  const application = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try { lastActor = await routeGate(req); res.writeHead(204); res.end(); }
    catch (error) { const safe = publicAuthFailure(error); json(res, safe.status, { error: safe.error }); }
  });
  const applicationOrigin = await listen(application);
  async function scenario(name, run) { await t.test(name, async () => { reset(); await run(); }); }
  try {
    for (const pair of [es, rsa]) await scenario(pair.alg + ': SDK verifies signed token and fetches JWKS', async () => {
      const before = stats.jwks, users = stats.user;
      const response = await send(applicationOrigin, pathFor(), signed(pair, claims()));
      assert.equal(response.status, 204); assert.equal(response.body, '');
      assert.equal(lastActor.organisationId, 'org-a'); assert.equal(lastActor.role, 'partner_admin');
      assert(stats.jwks > before); assert.equal(stats.user, users);
    });
    await scenario('JWKS cache reused without caching current membership', async () => {
      const token = signed(es, claims());
      assert.equal((await send(applicationOrigin, pathFor(), token)).status, 204);
      const calls = stats.jwks;
      assert.equal((await send(applicationOrigin, pathFor(), token)).status, 204);
      assert.equal(stats.jwks, calls);
      memberships.delete(SUBJECT + ':org-a');
      assert.equal((await send(applicationOrigin, pathFor(), token)).status, 403);
    });
    await scenario('HS256 uses SDK server validation fallback', async () => {
      const data = enc({ alg: 'HS256', typ: 'JWT' }) + '.' + enc(claims());
      const token = data + '.' + crypto.createHmac('sha256', symmetricSecret).update(data).digest('base64url');
      const before = stats.user;
      assert.equal((await send(applicationOrigin, pathFor(), token)).status, 204);
      assert(stats.user > before);
    });
    await scenario('bad symmetric token rejected by server fallback', async () => {
      const data = enc({ alg: 'HS256', typ: 'JWT' }) + '.' + enc(claims());
      const token = data + '.' + crypto.randomBytes(32).toString('base64url');
      assert.equal((await send(applicationOrigin, pathFor(), token)).status, 401);
    });
    await scenario('changed payload is rejected', async () => {
      const parts = signed(es, claims()).split('.'); parts[1] = enc(claims({ sub: SUBJECT_B }));
      assert.equal((await send(applicationOrigin, pathFor(), parts.join('.'))).status, 401);
    });
    await scenario('changed signature is rejected', async () => {
      const parts = signed(es, claims()).split('.'); const bytes = Buffer.from(parts[2], 'base64url'); bytes[0] ^= 1; parts[2] = bytes.toString('base64url');
      assert.equal((await send(applicationOrigin, pathFor(), parts.join('.'))).status, 401);
    });
    await scenario('unknown signing key rejected', async () => {
      assert.equal((await send(applicationOrigin, pathFor(), signed(rotated, claims()))).status, 401);
    });
    await scenario('new kid triggers JWKS refresh and becomes valid', async () => {
      assert.equal((await send(applicationOrigin, pathFor(), signed(es, claims()))).status, 204);
      const before = stats.jwks; keys.push(rotated.jwk);
      assert.equal((await send(applicationOrigin, pathFor(), signed(rotated, claims()))).status, 204);
      assert(stats.jwks > before);
    });
    await scenario('removed key rejected by fresh client, not claimed as global cache revocation', async () => {
      keys = [rsa.jwk];
      assert.equal((await send(applicationOrigin, pathFor(), signed(es, claims()))).status, 401);
    });
    await scenario('JWKS unavailable fails closed', async () => {
      jwksDown = true;
      assert.equal((await send(applicationOrigin, pathFor(), signed(es, claims()))).status, 401);
    });
    for (const [name, patch] of [
      ['expired token', { exp: now - 1, iat: now - 120 }], ['foreign issuer', { iss: 'https://foreign.invalid/auth/v1' }],
      ['foreign audience', { aud: 'other' }], ['anonymous user', { is_anonymous: true }],
      ['service-role token', { role: 'service_role' }], ['future not-before', { nbf: now + 3600 }]
    ]) await scenario(name, async () => assert.equal((await send(applicationOrigin, pathFor(), signed(es, claims(patch)))).status, 401));
    await scenario('second organisation has its own access only', async () => {
      const token = signed(es, claims({ sub: SUBJECT_B, session_id: SESSION_B }));
      assert.equal((await send(applicationOrigin, pathFor('org-b'), token)).status, 204);
      assert.equal((await send(applicationOrigin, pathFor('org-a'), token)).status, 403);
    });
    await scenario('unknown and forbidden organisation responses are indistinguishable', async () => {
      const token = signed(es, claims());
      const foreign = await send(applicationOrigin, pathFor('org-b'), token);
      const absent = await send(applicationOrigin, pathFor('does-not-exist'), token);
      assert.equal(foreign.status, 403); assert.equal(absent.status, 403); assert.equal(foreign.body, absent.body);
    });
    await scenario('role removal takes effect despite a valid cached key', async () => {
      const token = signed(es, claims());
      assert.equal((await send(applicationOrigin, pathFor(), token)).status, 204);
      memberships.get(SUBJECT + ':org-a').status = 'disabled';
      assert.equal((await send(applicationOrigin, pathFor(), token)).status, 403);
    });
    await scenario('session revocation takes effect without changing token', async () => {
      const token = signed(es, claims());
      assert.equal((await send(applicationOrigin, pathFor(), token)).status, 204);
      sessions.get(SUBJECT + ':' + SESSION).active = false;
      assert.equal((await send(applicationOrigin, pathFor(), token)).status, 401);
    });
    await scenario('session store failure fails closed', async () => {
      sessionDown = true; assert.equal((await send(applicationOrigin, pathFor(), signed(es, claims()))).status, 401);
    });
    await scenario('membership store failure fails closed', async () => {
      memberDown = true; assert.equal((await send(applicationOrigin, pathFor(), signed(es, claims()))).status, 403);
    });
    await scenario('signed metadata cannot promote partner into finance', async () => {
      const token = signed(es, claims({ aal: 'aal2', user_metadata: { role: 'finance_reviewer' }, app_metadata: { role: 'finance_reviewer' } }));
      assert.equal((await send(applicationOrigin, pathFor('org-a', 'FINANCE_REVIEWED'), token)).status, 403);
    });
    await scenario('current financial role requires AAL2, creates no financial approval', async () => {
      memberships.get(SUBJECT + ':org-a').role = 'finance_reviewer';
      assert.equal((await send(applicationOrigin, pathFor('org-a', 'FINANCE_REVIEWED'), signed(es, claims()))).status, 403);
      assert.equal((await send(applicationOrigin, pathFor('org-a', 'FINANCE_REVIEWED'), signed(es, claims({ aal: 'aal2' })))).status, 204);
      assert.equal(lastActor.financeAuthorityApproved, undefined);
    });
    await scenario('token larger than 240 characters survives the actual HTTP and SDK path', async () => {
      const token = signed(es, claims({ user_metadata: { note: 'x'.repeat(1500) } }));
      assert(token.length > 1024 && token.length < 10000);
      assert.equal((await send(applicationOrigin, pathFor(), token)).status, 204);
    });
    for (const [name, change] of [
      ['query scope', { path: pathFor() + '?organisationId=org-b' }],
      ['body scope', { options: { body: JSON.stringify({ organisationId: 'org-b', role: 'finance_reviewer' }) } }],
      ['header scope', { options: { headers: { 'X-Organisation-Id': 'org-b' } } }],
      ['duplicate bearer', { options: { duplicate: true } }]
    ]) await scenario(name + ' rejected before SDK', async () => {
      const calls = stats.network;
      assert.equal((await send(applicationOrigin, change.path || pathFor(), signed(es, claims()), change.options)).status, 400);
      assert.equal(stats.network, calls);
    });
    await scenario('no bearer returns redacted 401 with no cache', async () => {
      const response = await send(applicationOrigin, pathFor());
      assert.equal(response.status, 401); assert.deepEqual(JSON.parse(response.body), { error: 'unauthorised' });
      assert.equal(response.headers['cache-control'], 'no-store');
    });
    assert.equal(stats.foreignNetwork, 0);
    assert(stats.jwks > 0 && stats.user > 0);
    t.diagnostic(JSON.stringify({ sdk: '@supabase/auth-js', version: '2.117.3', transport: 'real loopback HTTP',
      crypto: 'SDK ES256/RS256 + fixture-server HS256 fallback', jwksRequests: stats.jwks, fallbackRequests: stats.user,
      hostedSupabaseTested: false, databaseStoreTested: false, liveMfaTested: false, productionAdmitted: false }));
  } finally {
    for (const client of clients) await client.stopAutoRefresh();
    await close(application); await close(issuerServer);
  }
});
