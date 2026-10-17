'use strict';
// RESEARCH ONLY. Not imported by server-v2.js; no production write authority.
// The approved financial operation must re-check the grant in its OWN transaction.
const { createSupabaseIdentityBoundary } = require('../commercial-identity-boundary');
function scratchOnly() {
  const url = new URL(process.env.DATABASE_URL || '');
  if (process.env.GITHUB_ACTIONS !== 'true' ||
      process.env.MFW_COMMERCIAL_SCRATCH !== 'true' ||
      url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' ||
      url.port !== '5432' || url.pathname !== '/mfw_commercial_ci' ||
      url.username !== 'mfw_ci' || url.password !== 'scratch_ci_only')
    throw new Error('scratch_pg_identity_only');
}
function createPostgresResearchIdentityStores({ pool, issuer } = {}) {
  scratchOnly();
  if (!pool || typeof pool.query !== 'function' || typeof issuer !== 'string')
    throw new Error('trusted_pg_identity_dependencies_required');
  return {
    verifySession: async ({ subject, sessionId, aal }) => {
      const q = await pool.query(
        'SELECT s.id FROM auth.sessions s ' +
        'JOIN auth.users au ON au.id=s.user_id ' +
        'JOIN ci_commercial_auth.subject_links l ON l.auth_subject=au.id ' +
        'JOIN public.users u ON u.id=l.app_user_id ' +
        'JOIN public.users link_reviewer ON link_reviewer.id=l.reviewed_by ' +
        'WHERE s.id=$1::uuid AND s.user_id=$2::uuid AND s.aal::text=$3 ' +
        'AND (s.not_after IS NULL OR s.not_after>clock_timestamp()) ' +
        'AND au.is_anonymous=false AND au.deleted_at IS NULL ' +
        'AND (au.banned_until IS NULL OR au.banned_until<=clock_timestamp()) ' +
        "AND l.issuer=$4 AND l.status='operator_verified' " +
        "AND length(l.proof_ref)>4 AND u.status='active' AND link_reviewer.status='active' " +
        'LIMIT 1',
        [sessionId, subject, aal, issuer]);
      return q.rowCount === 1 ? { subject, sessionId, active: true } : null;
    },
    lookupMembership: async ({ subject, organisationId }) => {
      const q = await pool.query(
        'SELECT g.role FROM ci_commercial_auth.subject_links l ' +
        "JOIN public.users u ON u.id=l.app_user_id AND u.status='active' " +
        'JOIN public.professional_organisation_memberships m ' +
        'ON m.user_id=u.id AND m.organisation_id=$2::uuid ' +
        'JOIN public.professional_organisations o ON o.id=m.organisation_id ' +
        "AND o.status='active' AND o.verification_status='verified' " +
        'JOIN ci_commercial_auth.role_grants g ON g.app_user_id=u.id AND g.organisation_id=o.id ' +
        "JOIN public.users reviewer ON reviewer.id=g.approved_by AND reviewer.status='active' " +
        'WHERE l.auth_subject=$1::uuid AND l.issuer=$3 ' +
        "AND l.status='operator_verified' AND length(l.proof_ref)>4 " +
        "AND m.status='active' AND m.ended_at IS NULL AND m.source='operator_verified' " +
        "AND g.status='active' AND g.source='operator_approved' " +
        'AND length(g.evidence_ref)>4 ' +
        'AND (g.expires_at IS NULL OR g.expires_at>clock_timestamp()) LIMIT 1',
        [subject, organisationId, issuer]);
      return q.rowCount === 1
        ? { subject, organisationId, role: q.rows[0].role, status: 'active' }
        : null;
    }
  };
}
function createPostgresResearchIdentityBoundary({pool,auth,issuer,nowSeconds}={}) {
  const stores=createPostgresResearchIdentityStores({pool,issuer});
  return createSupabaseIdentityBoundary({auth,issuer,...stores,...(nowSeconds?{nowSeconds}:{})});
}
module.exports={createPostgresResearchIdentityStores,createPostgresResearchIdentityBoundary};
