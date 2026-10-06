# MFW Capital Authority — immutable server ledger

Date: 2026-10-06
Repository: PetrFedin/MFW
Authority service: mfw-api / server-v2.js
Migration: 023_capital_authority.sql

## Purpose

Capital Authority is the durable server-side source of truth for investment-governance events.

It records:

- requests;
- approvals;
- commitments;
- releases;
- spend events;
- measurement snapshots;
- SCALE / ITERATE / STOP decisions.

The investor UI is a projection. It is not authority.

## Persistence and admission

Capital Authority is PostgreSQL-only.

There is no memory fallback.

If PostgreSQL is unavailable, every /v1/capital/* endpoint fails closed with:

- HTTP 503;
- error=postgres_required;
- persistence=postgres_only.

Migration 022 is part of the ordinary transactional startup migration chain and therefore becomes part of /ready schema admission.

## Append-only ledger

Table:

capital_ledger_events

Every row contains:

- programme_key;
- aggregate_type;
- aggregate_id;
- aggregate_seq;
- event_type;
- actor_subject;
- actor_role;
- auth_method;
- occurred_at;
- recorded_at;
- points;
- evidence_refs;
- payload;
- idempotency_key;
- request_id;
- previous_event_hash;
- event_hash.

UPDATE / DELETE / TRUNCATE are rejected by database trigger trg_capital_ledger_immutable.

No projection table is authoritative.

## Actor authority

Capital writes require an authenticated non-demo session with role:

- Organizer; or
- Staff.

Public demo sessions are explicitly rejected.

Actor identity and role are copied into every immutable ledger event.

## Idempotency and concurrency

Writes require an idempotency key.

For each aggregate the API uses a PostgreSQL advisory transaction lock over:

programme_key | aggregate_type | aggregate_id

The idempotency key is checked:

1. before lock acquisition;
2. again after lock acquisition.

This prevents duplicate events under concurrent retry races.

aggregate_seq is monotonically increasing per aggregate.

## Hash chain

Every event stores:

previous_event_hash -> event_hash

event_hash is SHA-256 over a canonical event envelope containing:

- aggregate identity and sequence;
- event type;
- actor;
- occurred timestamp;
- points;
- evidence references;
- payload;
- idempotency key;
- request id;
- previous hash.

GET /v1/capital/verify independently rebuilds every chain and validates:

- aggregate sequence;
- previous hash link;
- event hash.

A mismatch returns verification failure rather than silently accepting the projection.

## Domain invariants

The server rejects invalid state transitions.

- approval cannot exceed requested points;
- commitment cannot exceed approved points;
- release cannot exceed unspent commitment;
- spend cannot exceed net committed points;
- measurement requires previous spend;
- measurement requires metric + measuredValue;
- decision requires at least one prior measurement;
- decision must be SCALE / ITERATE / STOP;
- approval, commitment, release, spend, measurement and decision require at least one evidence reference.

This makes Capital Authority an event-sourced domain state machine, not only an append-only log.

## API

### POST /v1/capital/events

Only write endpoint.

Creates one immutable event.

Required inputs depend on event type but always include:

- aggregateType;
- aggregateId;
- eventType;
- idempotencyKey.

Evidence-gated events require evidenceRefs.

### GET /v1/capital/ledger

Returns immutable ordered events for a programme and optional aggregate filters.

### GET /v1/capital/projection

Returns a derived programme projection:

- requested;
- approved;
- committed;
- released;
- net committed;
- spent;
- committed-unspent;
- measurement event count;
- decisions.

### GET /v1/capital/verify

Replays hash chains and returns machine-verifiable integrity status.

## Event types

- REQUEST_RECORDED
- APPROVAL_RECORDED
- COMMITMENT_RECORDED
- RELEASE_RECORDED
- SPEND_RECORDED
- MEASUREMENT_RECORDED
- DECISION_RECORDED

## Aggregate types

- programme
- portfolio_proposal
- business_case
- pilot

## Evidence boundary

evidence_refs contains immutable references or digests, not mutable source documents.

The ledger does not claim that an evidence reference is externally true merely because it is recorded. Evidence class and external verification remain separate concerns.

## CI contract

mfw-api/capital-authority-contract.test.js verifies:

- migration immutability hooks;
- hash-chain fields;
- idempotency and advisory locking contracts;
- domain invariant hooks;
- demo-actor rejection;
- PostgreSQL-only fail-closed behavior for all Capital Authority endpoints.

Responsive QA now runs mfw-api npm run check:foundation before browser/device tests.

## Production acceptance

Capital Authority is not production-admitted until all of the following are green:

1. secure DATABASE_URL binding;
2. migrations 001-023 applied;
3. /ready = 200;
4. dataMode = postgres;
5. missingMigrations = [];
6. missingTables = [];
7. missingColumns = [];
8. contractErrors = [];
9. capital ledger write/read replay succeeds with a non-demo Organizer/Staff session;
10. concurrent idempotency retry produces one event;
11. invalid over-commit / over-spend / premature decision attempts are rejected;
12. /v1/capital/verify returns ok=true;
13. exact release SHA is recorded in deployment evidence.

Until then the investor cockpit continues to label programme-capital values as MODELLED / DEMO.
