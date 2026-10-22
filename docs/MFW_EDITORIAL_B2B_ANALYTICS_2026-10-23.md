# MFW — Editorial UI and B2B Intelligence Contract

Integration preview: 23 October 2026. Production remains HOLD.

## Visual direction

MFW uses an editorial, restrained shell. BFS retains its distinctive Summit palette;
Made retains its own programme identity. Across all three: consistent reading scale,
high-contrast focus rings, minimum 44px controls, unambiguous provenance labels,
sober panels, no fabricated company cards, and accessible 360–1440px layouts.
Demo financial decisions must still be labelled synthetic: removing a superficial
AI-looking style is not permission to present simulated approvals as real.

## B2B follow-up model (mfw/platform/b2b-followup.js)

Inputs: authenticated, owner-scoped PostgreSQL responses for CRM leads and
B2B meetings. Memory/demo responses, duplicate lead IDs, duplicate meeting IDs
and multiple leads for one meeting fail closed. Time must include explicit
timezone information. The model does not emit external messages or modify leads.

- An open lead has a CRM stage other than `won` / `lost`.
- `overdue` = action exists + time exists + time earlier than now.
- `missing` = open lead lacks either an action or a valid timezone-bound deadline.
- `dueSoon` = scheduled action within the next 72 hours (not overdue).
- `actionCoveragePct` = 100 * open leads with actionable text and valid deadline /
  number of open leads. If denominator zero, present an unknown dash, not 0%.
- `meetingLinkCoveragePct` = 100 * leads with accessible matching meeting /
  leads that declare a meeting ID; zero denominator is unknown.
- `meetingConflict` = `met` lead without completed meeting, or
  `meeting_confirmed` lead with cancelled/declined meeting.
- `stageMix` and `eventMix` are exact observed frequency distributions;
  no conversion attribution is implied.
- `overdueDaysTotal` = sum of `ceil((now - dueAt)/24 hours)` among overdue
  open leads. This is an operational age measure, not calendar business days.

### Transparent prioritisation

The queue uses **deterministic rules**, not a generative model or score of a person:

| Open-record deadline state | Base points |
| --- | ---: |
| Overdue | 82 |
| Missing action or usable deadline | 62 |
| Scheduled within 72 hours | 45 |
| Scheduled later | 24 |
| Closed CRM record | 0 |

Additional points: 1–10 for overdue whole days, 8 for a missing declared
meeting, 8 for lifecycle disagreement, 4 for unknown CRM stage. Maximum 100.
Tie-breakers: earliest due date, then lexicographically stable lead ID.
The total is only a work-queue priority; it does not estimate intent, quality,
revenue, financial standing, reputation, or probability of conversion.

### Cross-event navigation

An MFW Follow-up card displays a BFS link only when the corresponding meeting
is present in the user's authorised meeting response. Clicking sends an
in-memory meetingRef to the BFS iframe. BFS re-requests the authenticated
PostgreSQL GET /v1/meetings, selects the exact accessible ID, and fails closed
if missing. The route cannot create or grant representation or meeting rights.

## Made brand directory integrity

No fabricated brand tiles are shown while roster admission is unknown.
Unavailable Authority displays a neutral information state (count unknown).
Admitted empty roster shows zero; admitted verified roster displays only
rows returned by approved PostgreSQL Authority. No fake Verified badges.

## Delivery and evidence

Files updated: platform.js, b2b-followup.js, platform.css, BFS app/styles,
Made app/styles/index, and QA unit + seven-size Chromium matrix.
Page HTML query revisions changed on 2026-10-23 to prevent stale CSS/JS
being reused under the previous stable URL.

Validation gates: `qa/b2b-followup.test.js`, `qa/responsive.spec.js`,
existing API auth and isolation suites, isolated PostgreSQL 17.
Visual Evidence records the exact SHA with 26 PNG and four 25-second MP4.
Only completed successful capture artifacts are eligible for presentations;
a successful CI does not establish production admission.

## Known limitations

This pass creates no new finance authority and no paid deployment. Existing
mock/illustrative investor cases remain synthetic and explicitly labelled.
Real programme memberships, purchasing flows, signed contract evidence and
commercial payments require independent production integration and permission
validation before claiming real-world use.
