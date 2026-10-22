'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCommercialHttpBoundary, publicAuthFailure } = require('./commercial-http-boundary');
const url = '/v1/commercial/organisations/org-a/events/PILOT_ACCEPTED/authorise';
const base = { method: 'POST', url, rawHeaders: ['Authorization', 'Bearer token', 'Content-Length', '0'] };
test('trusted authoriser receives only route scope and one bearer', async () => {
  let seen;
  const actor = Object.freeze({ organisationId: 'org-a', role: 'partner_admin' });
  const resolve = createCommercialHttpBoundary({ authorise: async request => { seen = request; return actor; } });
  assert.equal(await resolve({ ...base, body: { role: 'finance_reviewer' }, headers: { authorization: 'Bearer spoof' } }), actor);
  assert.deepEqual(seen, { accessToken: 'token', organisationId: 'org-a', eventType: 'PILOT_ACCEPTED' });
});
const bad = [
  { method: 'GET' }, { url: url + '?organisationId=org-b' }, { url: url.replace('org-a', '%6frg-a') },
  { url: 'https://evil.invalid' + url }, { url: url.replace('org-a', '../org-a') },
  { rawHeaders: ['Authorization', 'Bearer token', 'authorization', 'Bearer second'] },
  { rawHeaders: ['Authorization', 'Bearer token', 'Content-Length', '1'] },
  { rawHeaders: ['Authorization', 'Bearer token', 'Transfer-Encoding', 'chunked'] },
  { rawHeaders: ['Authorization', 'Bearer ' + 'x'.repeat(10001)] },
  ...['x-organisation-id', 'x-tenant-id', 'x-user-id', 'x-user-role'].map(name => ({ rawHeaders: ['Authorization', 'Bearer token', name, 'forged'] })),
  { rawHeaders: ['Authorization'] }
];
for (const [index, change] of bad.entries()) test('transport ambiguity denied ' + (index + 1), async () => {
  let calls = 0;
  const gate = createCommercialHttpBoundary({ authorise: async () => { calls++; } });
  await assert.rejects(gate({ ...base, ...change }), { code: 'invalid_auth_transport' });
  assert.equal(calls, 0);
});
for (const value of [undefined, 'Basic token', 'Bearer a,b', 'Bearer a b', 'Bearer\ttoken']) test('missing/malformed bearer denied: ' + String(value), async () => {
  const gate = createCommercialHttpBoundary({ authorise: async () => assert.fail('must not resolve') });
  await assert.rejects(gate({ ...base, rawHeaders: value === undefined ? [] : ['Authorization', value] }), { code: 'bearer_required' });
});
test('public failures never reveal provider details, token or private existence', () => {
  for (const code of ['active_membership_required', 'event_role_forbidden', 'finance_stepup_required'])
    assert.deepEqual(publicAuthFailure({ code, message: 'private secret' }), { status: 403, error: 'forbidden' });
  assert.deepEqual(publicAuthFailure(new Error('secret')), { status: 503, error: 'auth_unavailable' });
  assert.deepEqual(publicAuthFailure({ code: 'verified_jwt_required' }), { status: 401, error: 'unauthorised' });
});
