'use strict';

// Transport adapter only: no route is registered by importing this module.
// The authorise dependency must be a trusted server-owned identity boundary.
const MAX_BEARER = 10000;
const ROUTE = /^\/v1\/commercial\/organisations\/([A-Za-z0-9_-]{1,120})\/events\/([A-Z_]{1,64})\/authorise$/;
const FORBIDDEN_HINTS = new Set(['x-organisation-id', 'x-tenant-id', 'x-user-id', 'x-user-role']);
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function createCommercialHttpBoundary({ authorise } = {}) {
  if (typeof authorise !== 'function') fail('trusted_http_authoriser_required');
  return async function authoriseRequest(req) {
    if (!req || req.method !== 'POST' || typeof req.url !== 'string') fail('invalid_auth_transport');
    const route = ROUTE.exec(req.url);
    if (!route || !Array.isArray(req.rawHeaders) || req.rawHeaders.length % 2) fail('invalid_auth_transport');
    const headers = new Map();
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      const name = req.rawHeaders[i], value = req.rawHeaders[i + 1];
      if (typeof name !== 'string' || typeof value !== 'string') fail('invalid_auth_transport');
      const key = name.toLowerCase();
      if (FORBIDDEN_HINTS.has(key)) fail('invalid_auth_transport');
      if (['authorization', 'content-length', 'transfer-encoding'].includes(key) && headers.has(key))
        fail('invalid_auth_transport');
      headers.set(key, value);
    }
    // Validation-only request carries no payload, avoiding two competing scopes.
    if (headers.has('transfer-encoding') || (headers.has('content-length') && headers.get('content-length') !== '0'))
      fail('invalid_auth_transport');
    const header = headers.get('authorization');
    if (header === undefined) fail('bearer_required');
    if (header.length > MAX_BEARER + 7) fail('invalid_auth_transport');
    const bearer = /^Bearer ([\x21-\x7e]+)$/i.exec(header);
    if (!bearer || bearer[1].includes(',')) fail('bearer_required');
    // Host, forwarded headers, cookies and token metadata never choose a tenant.
    return authorise({ accessToken: bearer[1], organisationId: route[1], eventType: route[2] });
  };
}
function publicAuthFailure(error) {
  const code = error && error.code;
  if (['bearer_required', 'verified_jwt_required', 'invalid_or_expired_claims', 'active_session_required'].includes(code))
    return Object.freeze({ status: 401, error: 'unauthorised' });
  if (['active_membership_required', 'event_role_forbidden', 'finance_stepup_required'].includes(code))
    return Object.freeze({ status: 403, error: 'forbidden' });
  if (['invalid_auth_transport', 'invalid_auth_request'].includes(code))
    return Object.freeze({ status: 400, error: 'invalid_request' });
  return Object.freeze({ status: 503, error: 'auth_unavailable' });
}
module.exports = { createCommercialHttpBoundary, publicAuthFailure };
