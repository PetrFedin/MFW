# MFW — Cross-Event Institutional Commerce Network

Status: **PROPOSED, documentation only**. Date: 2026-10-11. This roadmap complements existing canonical plans and does not represent shipped functionality.

## Strategic enhancements
1. P0: buyer-delegate value chain from verified accreditation through meeting -> showroom -> follow-up -> attributable order evidence.
2. P0: independent operator/brand/staff permissions, QR replay defenses, offline reconciliation and complete attendance provenance.
3. P1: consent-driven Brand365 loyalty and sponsor measurement based on incremental lift with testable attribution assumptions.
4. P1: partner publishing API for brands and Made in Moscow residents with qualification, status expiry and revocation.
5. P2: signed event participation credentials with W3C VC/OpenID interoperability proof, privacy-preserving verifier.
6. P2: B2B marketplace and enterprise licensing with explicit fee/commission audit and no pay-for-trust ranking.

## Common implementation contract
- Inspect and preserve existing domain authorities, schemas, tasks and existing roadmap before implementation. Do not build a parallel source of truth.
- Every proposal becomes a bounded PR with owner, dependency graph, acceptance criteria, CI and rollback procedure.
- For recommendations, record source, freshness, confidence, effect estimate, human approval and outcome; distinguish measured impact from hypothetical scenarios.
- Introduce issuer/verifier credentials only where independently useful; support issuance, expiry, suspension/revocation, key rotation and privacy-preserving verification.
- Apply least privilege, per-tenant access, audit retention and independent negative-path tests.
- Demand functional device/browser proof, golden-path replay, exact-SHA CI and recoverability before production admission.
- Pilot with baseline and outcome metrics; no fabricated ROI, partner agreements, customer evidence or production readiness.

## Reference standards (evaluate applicability, do not assume compliance)
- W3C Verifiable Credentials 2.0: https://www.w3.org/TR/vc-data-model-2.0/
- OpenID4VC specifications: https://openid.net/wg/digital-credentials-protocols/specifications/
- NIST AI Risk Management Framework: https://www.nist.gov/itl/ai-risk-management-framework
- OWASP GenAI Security Project: https://genai.owasp.org/

## Execution gate
Discovery -> architecture boundary review -> single vertical slice -> adversarial tests -> human acceptance -> measured pilot -> commercial rollout. Missing external credentials, rights, legal applicability, real-world evidence, or CI is an explicit BLOCKED state.
