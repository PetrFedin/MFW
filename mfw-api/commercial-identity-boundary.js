'use strict';

// Not registered in the live API. Signature verification stays in a trusted
// server-owned Supabase SDK client; session/membership stores remain authoritative.
const { EVENT_ROLES } = require('./commercial-evidence-domain');
const VERSION = 'mfw-commercial-identity-boundary-v1';
const MAX_ACCESS_TOKEN_LENGTH = 10000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STRONG_ROLES = new Set(['finance_operator', 'finance_reviewer', 'settlement_verifier']);
const CLAIM_FIELDS = ['iss', 'aud', 'role', 'sub', 'session_id', 'is_anonymous', 'aal', 'iat', 'exp'];

function deny(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}
function record(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function text(value, max = 240) {
  return typeof value === 'string' && value.length > 0 && value.length <= max &&
    value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
}
function token(value) {
  // Tokens are NOT short identifiers. Do not truncate or log them.
  return typeof value === 'string' && value.length > 0 &&
    value.length <= MAX_ACCESS_TOKEN_LENGTH && /^[\x21-\x7e]+$/.test(value);
}
function trustedIssuer(value) {
  if (!text(value, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname === '/auth/v1' &&
      !url.username && !url.password && !url.search && !url.hash && url.href === value;
  } catch (_) { return false; }
}
function validTime(claims, clock) {
  let now;
  try { now = clock(); } catch (_) { return false; }
  return Number.isSafeInteger(now) && now > 0 &&
    Number.isSafeInteger(claims.iat) && claims.iat > 0 &&
    Number.isSafeInteger(claims.exp) && claims.exp > claims.iat &&
    claims.iat <= now && claims.exp > now &&
    (claims.nbf === undefined || (Number.isSafeInteger(claims.nbf) &&
      claims.nbf > 0 && claims.nbf < claims.exp && claims.nbf <= now));
}
function snapshotClaims(raw, issuer, clock) {
  if (!record(raw) || !CLAIM_FIELDS.every(key => Object.hasOwn(raw, key)))
    deny('invalid_or_expired_claims');
  // Snapshot security-relevant scalar fields before any awaited store lookup.
  // An SDK/cache object changed by another callback cannot change the actor.
  const claims = Object.fromEntries(CLAIM_FIELDS.map(key => [key, raw[key]]));
  if (Object.hasOwn(raw, 'nbf')) claims.nbf = raw.nbf;
  if (Array.isArray(claims.aud)) claims.aud = Object.freeze(claims.aud.slice());
  const audienceOK = claims.aud === 'authenticated' ||
    (Array.isArray(claims.aud) && claims.aud.length > 0 && claims.aud.length <= 8 &&
      claims.aud.every(item => text(item)) && claims.aud.includes('authenticated'));
  if (claims.iss !== issuer || claims.role !== 'authenticated' || !audienceOK ||
      typeof claims.sub !== 'string' || !UUID.test(claims.sub) ||
      typeof claims.session_id !== 'string' || !UUID.test(claims.session_id) ||
      claims.is_anonymous !== false || !['aal1', 'aal2'].includes(claims.aal) ||
      !validTime(claims, clock)) deny('invalid_or_expired_claims');
  return Object.freeze(claims);
}

function createIdentityBoundary(options = {}) {
  if (!record(options)) deny('trusted_identity_dependencies_required');
  const { getClaims, lookupMembership, verifySession, issuer,
    nowSeconds = () => Math.floor(Date.now() / 1000) } = options;
  if (typeof getClaims !== 'function' || typeof lookupMembership !== 'function' ||
      typeof verifySession !== 'function' || typeof nowSeconds !== 'function' ||
      !trustedIssuer(issuer)) deny('trusted_identity_dependencies_required');

  return async function authorise(request = {}) {
    if (!record(request) || !['accessToken', 'organisationId', 'eventType']
      .every(key => Object.hasOwn(request, key))) deny('invalid_auth_request');
    const { accessToken, organisationId, eventType } = request;
    if (!token(accessToken) || !text(organisationId) || typeof eventType !== 'string' ||
        !Object.hasOwn(EVENT_ROLES, eventType)) deny('invalid_auth_request');
    let result;
    try { result = await getClaims(accessToken); }
    catch (_) { deny('verified_jwt_required'); }
    if (!record(result) || result.error || !record(result.data) || !result.data.claims)
      deny('verified_jwt_required');
    const jwt = snapshotClaims(result.data.claims, issuer, nowSeconds);
    let session;
    try { session = await verifySession({ subject: jwt.sub, sessionId: jwt.session_id, organisationId, aal: jwt.aal }); }
    catch (_) { deny('active_session_required'); }
    if (!record(session) || session.active !== true || session.subject !== jwt.sub ||
        session.sessionId !== jwt.session_id) deny('active_session_required');
    let membership;
    try { membership = await lookupMembership({ subject: jwt.sub, organisationId }); }
    catch (_) { deny('active_membership_required'); }
    if (!record(membership) || membership.status !== 'active' || membership.subject !== jwt.sub ||
        membership.organisationId !== organisationId || !text(membership.role))
      deny('active_membership_required');
    if (!EVENT_ROLES[eventType].includes(membership.role)) deny('event_role_forbidden');
    if (STRONG_ROLES.has(membership.role) && jwt.aal !== 'aal2') deny('finance_stepup_required');
    // A token can expire while current membership/session lookups are pending.
    if (!validTime(jwt, nowSeconds)) deny('invalid_or_expired_claims');
    return Object.freeze({ subject: jwt.sub, organisationId, role: membership.role,
      sessionId: jwt.session_id, aal: jwt.aal, trustedServerContext: true,
      verifiedByServer: true, verificationContract: VERSION });
  };
}

function createSupabaseIdentityBoundary(options = {}) {
  if (!record(options) || !options.auth || typeof options.auth.getClaims !== 'function' ||
      Object.hasOwn(options, 'getClaims')) deny('trusted_identity_dependencies_required');
  const { auth, ...policy } = options;
  // Preserve the SDK receiver. Only the token is passed: requests cannot supply
  // skip-verification flags, JWKS overrides or allowExpired options.
  const getClaims = auth.getClaims.bind(auth);
  return createIdentityBoundary({ ...policy, getClaims: accessToken => getClaims(accessToken) });
}
module.exports = { VERSION, MAX_ACCESS_TOKEN_LENGTH, createIdentityBoundary, createSupabaseIdentityBoundary };
