'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createIdentityBoundary, createSupabaseIdentityBoundary, MAX_ACCESS_TOKEN_LENGTH } = require('./commercial-identity-boundary');
const ISSUER = 'https://mfw-test.supabase.co/auth/v1';
const SUBJECT = '11111111-1111-4111-8111-111111111111';
const SESSION = '22222222-2222-4222-8222-222222222222';
const NOW = 1792022400;
function fixture(patch = {}, overrides = {}) {
  const claims = { iss: ISSUER, aud: 'authenticated', role: 'authenticated', sub: SUBJECT,
    session_id: SESSION, is_anonymous: false, aal: 'aal1', iat: NOW - 30, exp: NOW + 300, ...patch };
  const state = { now: NOW, active: true, membership: 'active', role: 'partner_admin', reads: 0 };
  const options = { issuer: ISSUER, nowSeconds: () => state.now,
    getClaims: async () => ({ data: { claims }, error: null }),
    verifySession: async () => ({ active: state.active, subject: SUBJECT, sessionId: SESSION }),
    lookupMembership: async () => { state.reads++; return { status: state.membership, subject: SUBJECT,
      organisationId: 'org-a', role: state.role }; }, ...overrides };
  return { claims, state, options, authorise: createIdentityBoundary(options) };
}
const request = () => ({ accessToken: 'opaque-test-token', organisationId: 'org-a', eventType: 'PILOT_ACCEPTED' });
async function denied(promise, code) { await assert.rejects(promise, error => error.code === code); }

for (const size of [240, 241, 1024, 10000]) {
  test('separate bearer-token validator accepts ' + size + ' characters before trusted verification', async () => {
    const f = fixture();
    assert.equal((await f.authorise({ ...request(), accessToken: 't'.repeat(size) })).subject, SUBJECT);
  });
}
for (const bad of ['', ' t', 't ', 't\nt', 't\tt', 't\u0000t', 't\u007ft', 't\u00a0t', 't'.repeat(10001), null, 123, {}]) {
  test('reject malformed or oversized bearer value without calling the verifier: ' + typeof bad + '/' + String(bad).length, async () => {
    let calls = 0;
    const f = fixture({}, { getClaims: async () => { calls++; throw Error('must not be reached'); } });
    await denied(f.authorise({ ...request(), accessToken: bad }), 'invalid_auth_request');
    assert.equal(calls, 0);
  });
}
test('short identifier limits remain independent from the token bound', async () => {
  assert.equal(MAX_ACCESS_TOKEN_LENGTH, 10000);
  await denied(fixture().authorise({ ...request(), organisationId: 'o'.repeat(241) }), 'invalid_auth_request');
});
for (const bad of [null, [], 0, 'request', Object.create({ accessToken: 't', organisationId: 'org-a', eventType: 'PILOT_ACCEPTED' })]) {
  test('reject non-record or inherited request: ' + String(bad), async () => {
    await denied(fixture().authorise(bad), 'invalid_auth_request');
  });
}
for (const eventType of ['__proto__', 'constructor', 'toString', {}, null]) {
  test('closed event role registry rejects inherited/non-string key ' + String(eventType), async () => {
    await denied(fixture().authorise({ ...request(), eventType }), 'invalid_auth_request');
  });
}
for (const issuer of ['https://', 'http://mfw-test.supabase.co/auth/v1',
  'https://user:password@mfw-test.supabase.co/auth/v1', 'https://mfw-test.supabase.co/auth/v1?x=1',
  'https://mfw-test.supabase.co/auth/v1#part', 'https://mfw-test.supabase.co/auth/v1/', 'https://mfw-test.supabase.co/not-auth']) {
  test('configuration rejects noncanonical or unsafe issuer ' + issuer.replace('user:password@', '[redacted]@'), () => {
    assert.throws(() => fixture({}, { issuer }), error => error.code === 'trusted_identity_dependencies_required');
  });
}
test('malformed options and adapter overrides fail closed', () => {
  for (const options of [null, [], false, 'bad']) {
    assert.throws(() => createIdentityBoundary(options), { code: 'trusted_identity_dependencies_required' });
  }
  assert.throws(() => createSupabaseIdentityBoundary({ auth: { getClaims() {} }, getClaims() {} }),
    { code: 'trusted_identity_dependencies_required' });
});
for (const [name, patch] of [
  ['negative issued-at', { iat: -1 }], ['zero issued-at', { iat: 0 }],
  ['fractional expiry', { exp: NOW + 0.5 }], ['string expiry', { exp: String(NOW + 300) }],
  ['zero nbf', { nbf: 0 }], ['nbf after expiry', { nbf: NOW + 400 }],
  ['audience with object', { aud: ['authenticated', {}] }], ['empty audience', { aud: [] }],
  ['numeric subject', { sub: 1111111111111111111 }], ['string anonymous flag', { is_anonymous: 'false' }]
]) {
  test('reject invalid signed-claim shape: ' + name, async () => {
    await denied(fixture(patch).authorise(request()), 'invalid_or_expired_claims');
  });
}
test('well-formed audience array is supported', async () => {
  assert.equal((await fixture({ aud: ['authenticated', 'mfw'] }).authorise(request())).subject, SUBJECT);
});
test('array-shaped verified claims cannot become a user', async () => {
  await denied(fixture({}, { getClaims: async () => ({ data: { claims: [] } }) }).authorise(request()),
    'invalid_or_expired_claims');
});
test('expiry during membership lookup is rejected at completion', async () => {
  const f = fixture({ exp: NOW + 1 });
  const authorise = createIdentityBoundary({ ...f.options, lookupMembership: async args => {
    f.state.now += 2;
    return f.options.lookupMembership(args);
  } });
  await denied(authorise(request()), 'invalid_or_expired_claims');
});
test('claim-object mutation cannot upgrade aal1 to aal2 after verification', async () => {
  const f = fixture();
  f.state.role = 'finance_operator';
  const authorise = createIdentityBoundary({ ...f.options, verifySession: async args => {
    f.claims.aal = 'aal2';
    return f.options.verifySession(args);
  } });
  await denied(authorise({ ...request(), eventType: 'INVOICE_ISSUED' }), 'finance_stepup_required');
});
test('subject snapshot is unchanged when verifier-owned object mutates asynchronously', async () => {
  const f = fixture();
  const authorise = createIdentityBoundary({ ...f.options, verifySession: async args => {
    f.claims.sub = '33333333-3333-4333-8333-333333333333';
    return f.options.verifySession(args);
  } });
  assert.equal((await authorise(request())).subject, SUBJECT);
});
test('session is checked anew even for repeated token', async () => {
  const f = fixture();
  await f.authorise(request());
  f.state.active = false;
  await denied(f.authorise(request()), 'active_session_required');
});
test('current membership is checked anew and revoked membership is denied', async () => {
  const f = fixture();
  await f.authorise(request());
  f.state.membership = 'disabled';
  await denied(f.authorise(request()), 'active_membership_required');
  assert.equal(f.state.reads, 2);
});
test('changed current role is not cached or replaced by token metadata', async () => {
  const f = fixture({ user_metadata: { role: 'partner_admin' }, app_metadata: { role: 'partner_admin' } });
  await f.authorise(request());
  f.state.role = 'settlement_verifier';
  await denied(f.authorise(request()), 'event_role_forbidden');
});
test('SDK adapter preserves receiver and never forwards claim-verification options', async () => {
  const f = fixture();
  const auth = { calls: 0, async getClaims(...args) {
    assert.equal(this, auth);
    assert.deepEqual(args, ['opaque-test-token']);
    this.calls++;
    return { data: { claims: f.claims } };
  } };
  const { getClaims: unused, ...rest } = f.options;
  const who = await createSupabaseIdentityBoundary({ ...rest, auth })(request());
  assert.equal(who.subject, SUBJECT);
  assert.equal(auth.calls, 1);
  assert(!Object.hasOwn(who, 'accessToken'));
});
test('dependency errors cannot echo bearer tokens or raw backend errors', async () => {
  const secret = 'test-bearer-never-log-me';
  await assert.rejects(fixture({}, { getClaims: async () => { throw Error('connection ' + secret); } })
    .authorise({ ...request(), accessToken: secret }), error =>
      error.code === 'verified_jwt_required' && !error.message.includes(secret));
});
test('broken server clock fails closed', async () => {
  await denied(fixture({}, { nowSeconds: () => { throw Error('clock unavailable'); } })
    .authorise(request()), 'invalid_or_expired_claims');
});
