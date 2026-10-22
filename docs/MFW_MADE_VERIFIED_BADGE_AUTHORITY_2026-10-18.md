# Cross-ecosystem verified programme badge evidence boundary — 18 October 2026

**Integration branch only. Production HOLD.**

The BFS organisation and speaker directories show a `СДЕЛАНО В МОСКВЕ · VERIFIED` badge only when an organisation carries an explicit canonical `brandRef` and the Made in Moscow roster API confirms the brand's approved membership.

## Defect

Prior BFS `hydrateMadeVerified()` accepted `data[].id` from any successful HTTP JSON, including `{source:"memory",demo:true}`, or an unclassified fake `source:"postgres"` response. This could label a business as independently verified without authoritative confirmation. The previous catch also left any stale verified-badge map in place.

## Correction

- Require `confirmed(out)`: `source:"postgres"` and no demo flag.
- Require the exact API classification `out.badge==="made_in_moscow_verified"` and an array of records.
- Only accept nonempty string `row.id` and `row.name` values.
- Rebuild the map for each request, and reset it to empty on error/revocation/untrusted source. The UI re-renders with no stale badge.
- Preserve the requirement for explicit `organisation.brandRef`; do not join brands merely by matching names.
- Add source-contract assertion in `qa/bfs-dom-bindings.test.js`.
- Add full browser negative and positive tests across the seven Responsive QA viewport profiles: demo/memory source is rejected, PostgreSQL without approved badge classification is rejected, an approved synthetic server roster shows precisely the explicitly linked brand. The test temporarily injects only one synthetic brand reference in the static browser fixture; it does not alter official data.

## Actual source SQL

`GET /v1/made-in-moscow/brands` in Authority responds with the `made_in_moscow_verified` marker only for joined programme memberships meeting all conditions:

- `brand_program_memberships.status='verified'`
- `brand_program_memberships.moderation_status='approved'`
- `brands.status='published'`
- programme `partner_programs.external_key='made_in_moscow'`

Read-only inspection of the connected project on 18 October returned **zero rows** satisfying these conditions; do not claim actual verified brands from it. No source-level linkage between the 12 known BFS organisations and Made programme brands has been independently approved.

## Acceptance

Both static and browser tests must pass on the exact new commit. These are synthetic receipt and source-classification tests, **not proof of production eligibility, real user identities or post-login persistence**. Do not activate unreviewed verified badges, payments, or commercial metrics. No database, secret, deployment or paid service is modified.
