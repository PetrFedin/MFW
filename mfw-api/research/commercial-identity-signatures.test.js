'use strict';
// TEST-ONLY signed JWS fixture, not a production verifier and not a Supabase SDK
// implementation. Real SDK/JWKS/Auth integration remains a separate release gate.
// Ephemeral private keys never leave process memory. No network is used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createSupabaseIdentityBoundary } = require('../commercial-identity-boundary');
const ISSUER = 'https://mfw-signature-test.supabase.co/auth/v1';
const SUBJECT = '11111111-1111-4111-8111-111111111111';
const SESSION = '22222222-2222-4222-8222-222222222222';
const NOW = 1792022400;
const es1 = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const es2 = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const profile = { ES256: { algorithm: 'sha256', signatureLength: 64 },
  RS256: { algorithm: 'RSA-SHA256', signatureLength: 256 } };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const claims = patch => ({ iss: ISSUER, aud: 'authenticated', sub: SUBJECT,
  role: 'authenticated', session_id: SESSION, is_anonymous: false, aal: 'aal1',
  iat: NOW - 30, exp: NOW + 300, user_metadata: { padding: 'x'.repeat(700) }, ...patch });
function mint(key, alg, kid, payload = claims(), header = {}) {
  const input = encode({ typ: 'JWT', alg, kid, ...header }) + '.' + encode(payload);
  const signature = crypto.sign(profile[alg].algorithm, Buffer.from(input),
    alg === 'ES256' ? { key: key.privateKey, dsaEncoding: 'ieee-p1363' } : key.privateKey);
  return input + '.' + signature.toString('base64url');
}
function verifier(keys) {
  return { calls: 0, async getClaims(token) {
    this.calls++;
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) throw Error('invalid JWS');
    const bytes = parts.map(part => {
      const decoded = Buffer.from(part, 'base64url');
      if (decoded.toString('base64url') !== part) throw Error('noncanonical encoding');
      return decoded;
    });
    const header = JSON.parse(bytes[0].toString('utf8'));
    const trusted = keys.get(header.kid);
    if (header.typ !== 'JWT' || !Object.hasOwn(profile, header.alg) || !trusted ||
        trusted.alg !== header.alg || header.jku || header.jwk || header.x5u || header.crit)
      throw Error('untrusted key or algorithm');
    if (bytes[2].length !== profile[header.alg].signatureLength) throw Error('invalid signature length');
    const verified = crypto.verify(profile[header.alg].algorithm, Buffer.from(parts[0] + '.' + parts[1]),
      header.alg === 'ES256' ? { key: trusted.key, dsaEncoding: 'ieee-p1363' } : trusted.key, bytes[2]);
    if (!verified) throw Error('signature rejected');
    return { data: { claims: JSON.parse(bytes[1].toString('utf8')) }, error: null };
  } };
}
function fixture(keys = new Map([['es-1', { alg: 'ES256', key: es1.publicKey }],
  ['rsa-1', { alg: 'RS256', key: rsa.publicKey }]])) {
  const state = { active: true, status: 'active', role: 'partner_admin', storeCalls: 0 };
  const auth = verifier(keys);
  const authorise = createSupabaseIdentityBoundary({ auth, issuer: ISSUER, nowSeconds: () => NOW,
    verifySession: async () => { state.storeCalls++; return { active: state.active, subject: SUBJECT, sessionId: SESSION }; },
    lookupMembership: async () => { state.storeCalls++; return { status: state.status, subject: SUBJECT,
      organisationId: 'org-a', role: state.role }; } });
  return { auth, authorise, state, keys };
}
const request = accessToken => ({ accessToken, organisationId: 'org-a', eventType: 'PILOT_ACCEPTED' });
const rejection = (promise, code) => assert.rejects(promise, error => error.code === code);

for (const [alg, key, kid] of [['ES256', es1, 'es-1'], ['RS256', rsa, 'rsa-1']]) {
  test(alg + ' cryptographically signed token longer than 240 characters is accepted', async () => {
    const f = fixture();
    const token = mint(key, alg, kid);
    assert(token.length > 240 && token.length < 10000);
    const user = await f.authorise(request(token));
    assert.equal(user.subject, SUBJECT);
    assert.equal(user.organisationId, 'org-a');
    assert.equal(f.state.storeCalls, 2);
  });
  test(alg + ' payload tampering is denied before any session/membership reads', async () => {
    const f = fixture();
    const parts = mint(key, alg, kid).split('.');
    parts[1] = encode(claims({ sub: '33333333-3333-4333-8333-333333333333' }));
    await rejection(f.authorise(request(parts.join('.'))), 'verified_jwt_required');
    assert.equal(f.state.storeCalls, 0);
  });
  test(alg + ' signature tampering is denied', async () => {
    const f = fixture();
    const parts = mint(key, alg, kid).split('.');
    const damaged = Buffer.from(parts[2], 'base64url');
    damaged[0] ^= 1;
    parts[2] = damaged.toString('base64url');
    await rejection(f.authorise(request(parts.join('.'))), 'verified_jwt_required');
    assert.equal(f.state.storeCalls, 0);
  });
}
test('wrong signing key cannot borrow an authorised kid', async () => {
  await rejection(fixture().authorise(request(mint(es2, 'ES256', 'es-1'))), 'verified_jwt_required');
});
test('unknown kid cannot grant access', async () => {
  await rejection(fixture().authorise(request(mint(es1, 'ES256', 'unknown'))), 'verified_jwt_required');
});
test('unsigned alg=none token is denied', async () => {
  const unsigned = encode({ typ: 'JWT', alg: 'none' }) + '.' + encode(claims()) + '.';
  await rejection(fixture().authorise(request(unsigned)), 'verified_jwt_required');
});
test('HS256/public-key algorithm confusion is denied', async () => {
  const input = encode({ typ: 'JWT', alg: 'HS256', kid: 'es-1' }) + '.' + encode(claims());
  const signature = crypto.createHmac('sha256', es1.publicKey.export({ type: 'spki', format: 'der' }))
    .update(input).digest('base64url');
  await rejection(fixture().authorise(request(input + '.' + signature)), 'verified_jwt_required');
});
test('token-specified remote key URL is not trusted', async () => {
  await rejection(fixture().authorise(request(mint(es1, 'ES256', 'es-1', claims(),
    { jku: 'https://untrusted.invalid/jwks' }))), 'verified_jwt_required');
});
for (const [label, patch] of [['expired', { exp: NOW - 1 }], ['future nbf', { nbf: NOW + 30 }],
  ['foreign issuer', { iss: 'https://another.invalid/auth/v1' }], ['wrong audience', { aud: 'anon' }],
  ['anonymous user', { is_anonymous: true }], ['service-role token', { role: 'service_role' }]]) {
  test('valid signature does not override ' + label, async () => {
    const f = fixture();
    await rejection(f.authorise(request(mint(es1, 'ES256', 'es-1', claims(patch)))), 'invalid_or_expired_claims');
    assert.equal(f.state.storeCalls, 0);
  });
}
test('cryptographically valid token loses access after session revocation', async () => {
  const f = fixture(), token = mint(es1, 'ES256', 'es-1');
  await f.authorise(request(token));
  f.state.active = false;
  await rejection(f.authorise(request(token)), 'active_session_required');
});
test('signed stale metadata cannot retain a revoked organisation membership', async () => {
  const f = fixture(), token = mint(es1, 'ES256', 'es-1', claims({ app_metadata: { role: 'partner_admin', organisationId: 'org-a' } }));
  await f.authorise(request(token));
  f.state.status = 'disabled';
  await rejection(f.authorise(request(token)), 'active_membership_required');
});
test('signed metadata cannot grant finance authority', async () => {
  const f = fixture();
  const token = mint(es1, 'ES256', 'es-1', claims({ aal: 'aal2', user_metadata: { role: 'finance_reviewer' } }));
  await rejection(f.authorise({ ...request(token), eventType: 'FINANCE_REVIEWED' }), 'event_role_forbidden');
});
test('actual signature plus current finance role still requires aal2', async () => {
  const f = fixture(); f.state.role = 'finance_reviewer';
  await rejection(f.authorise({ ...request(mint(es1, 'ES256', 'es-1')), eventType: 'FINANCE_REVIEWED' }), 'finance_stepup_required');
  const result = await f.authorise({ ...request(mint(es1, 'ES256', 'es-1', claims({ aal: 'aal2' }))), eventType: 'FINANCE_REVIEWED' });
  assert.equal(result.role, 'finance_reviewer');
});
test('replacing the local trusted key set rejects removed key and accepts successor', async () => {
  const f = fixture();
  const old = mint(es1, 'ES256', 'es-1');
  await f.authorise(request(old));
  f.keys.delete('es-1');
  f.keys.set('es-2', { alg: 'ES256', key: es2.publicKey });
  await rejection(f.authorise(request(old)), 'verified_jwt_required');
  assert.equal((await f.authorise(request(mint(es2, 'ES256', 'es-2')))).subject, SUBJECT);
});
test('oversized but correctly signed token is denied before verifier processing', async () => {
  const f = fixture();
  const token = mint(es1, 'ES256', 'es-1', claims({ user_metadata: { oversized: 'x'.repeat(10000) } }));
  await rejection(f.authorise(request(token)), 'invalid_auth_request');
  assert.equal(f.auth.calls, 0);
});
