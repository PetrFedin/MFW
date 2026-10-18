# BFS programme-to-agenda contract repair — 18 October 2026

**Status:** integration candidate only, PR #35. This document describes a change in the draft branch, not a live deployment.

## Evidence and root cause

Exact-head Chromium Responsive QA `09cfbf91306e443cf0cb8ab0a6851e78c7ff2cf6` reported 399 passing and seven failing checks. All failures had the same selector `[data-save="s1"]` in `qa/responsive.spec.js:1163`, which timed out on all seven device profiles. Actual BFS session IDs in `mfw/platform/event-data.js` use canonical `bfs-*` identifiers; a read-only connected MFW PostgreSQL check found 26 BFS event rows with `bfs-*` external keys. A legacy four-session fallback embedded in `bfs/app.js` used `s1`–`s4` and could only generate IDs that PostgreSQL cannot resolve.

**The immediate CI failure was a stale test fixture.** The legacy UI fallback was a separate runtime reliability defect.

## Fix

- `qa/responsive.spec.js`: locate a real displayed `data-save` button, assert the canonical `bfs-*` ID and prove the exact POST URL `/v1/agenda/{id}/save`. A `source=memory, demo=true` receipt must leave the session unsaved.
- Add a separate synthetic receipt race test: mock `source=postgres` for a specific canonical ID, delay the initial GET until after that POST completes and verify that older empty hydration cannot remove the newly saved UI state. **This is a mocked HTTP regression test, not a real durable-write acceptance.**
- `mfw/platform/bfs/app.js`: remove invented `s1`–`s4` fallbacks. With no official data, render an explicit unavailable state with no actionable session cards.
- Introduce `agendaWriteRevision`: increment only after a confirmed agenda POST/DELETE/reminder; ignore any initial GET that started before that successful mutation.
- `qa/bfs-dom-bindings.test.js`: assert canonical source ID availability, no phantom fallback, missing-roster message, hydration revision guard, and server-receipt check.

## Security and truth boundaries

Actual server contract is `POST /v1/agenda/{eventId}/save` returning `{source:"postgres",data:{eventId,...}}` only after DB operation, while `source:"memory"` is never a successful durable write. The test exercises both via HTTP mocks so the UX reflects success/failure, but **does not prove** PostgreSQL persistence, real authenticated identity or transaction isolation. Real user enrollment and cross-device durable tests require live Authority `/ready=200`, `dataMode=postgres`, signed sessions, DB-owner/security approval, and integrated Golden Paths.

No real DB writes, no deployment, no new paid resources, no grant changes. Existing production stays on the previously recorded old Authority release; status must be freshly checked for release decisions.

## CI qualification

Exact-head responsive matrix, isolated PG17, Auth SDK/HTTP and other PR #35 gates must all be GREEN before considering merge. This file alone is NOT a PASS claim.
