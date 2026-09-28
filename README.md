# Moscow Fashion Platform — MVP

One digital platform for **Moscow Fashion Week (MFW)** and **BRICS+ Fashion Summit (BFS)**.

## Product rule

Identity is shared. Event participation is not.

A user creates one account and profile, then registers independently for MFW and BFS. Each event owns its registration status, role, programme, permissions, QR pass, notifications and analytics.

## Runnable MVP

The repository now includes:

- responsive iPhone/web demo shell;
- distinct MFW editorial/runway and BFS international/business experiences;
- persistent MFW/BFS switcher;
- Combined Today;
- independent MFW/BFS registrations;
- programme/session authority;
- BFS delegations and B2B meetings;
- signed event-bound QR credentials and My Pass;
- event-scoped operations/admin view;
- PostgreSQL migrations 013–016;
- migration runner;
- automated authority/isolation tests;
- Render blueprint;
- 7–10 minute investor demo script.

## Local run

```bash
npm install
npm test
npm start
```

Open http://localhost:3000.

## PostgreSQL

```bash
DATABASE_URL=... npm run migrate
```

## Demo

See `docs/INVESTOR_DEMO.md`.

## Architecture

See `docs/MULTI_EVENT_ARCHITECTURE.md` and `docs/DUAL_EVENT_UX.md`.
