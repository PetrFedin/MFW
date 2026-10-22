# MFW integrated improvement candidate — 2026-10-15

Includes source changes from PR #20, #23, #24, #26, #29, #30 and #31.
This is NOT an admitted release. Main and production remain untouched.

Five overlapping paths were reconciled explicitly:
- mfw-api/package.json: both migration and commercial domain tests.
- .github/workflows/responsive-qa.yml: commercial modelling and finance/security tests.
- mfw/platform/evidence-package.json: both modelled ladder and null actuals/security proof.
- CURRENT_STATE.md: both commercial UI and live infrastructure audit.
- README.md: both latest actual runtime state and zero-cost development priorities.

Historical SQL 026/027 remain quarantined and never promoted to executable migrations.
Await full exact-head CI, independent PostgreSQL/schema/security review, real signed tenant sessions,
durable Authority /ready=200, Golden Paths and rollback proof before any main merge or deployment.
No additional paid resources or production writes.
