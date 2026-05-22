# WCWS Pick'em

Mobile-first PWA for a Women's College World Series straight pick'em pool.

## What It Does

- Public dashboard with leaderboard, payout math, live game cards, and scenario odds.
- Public entrant pages so anyone can inspect a person's bracket.
- Password-protected admin portal for entrants, paid status, Venmo/Zelle tags, picks, winners, payout splits, round locks, and ESPN game IDs.
- Installable PWA metadata and service worker.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Admin login defaults to:

```txt
password: admin
```

Set `ADMIN_PASSWORD` before deploying.

## Data Storage

For Vercel, link a Vercel Blob store to the project so `BLOB_READ_WRITE_TOKEN` is available. The app stores the full pool state in `pool-state/default.json` and falls back to `data/pool.json` for local development when Blob/Supabase is not configured.

Supabase is also supported if you prefer Postgres. Set the Supabase environment variables from `.env.example` and create this table:

```sql
create table public.pool_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
```

Use `SUPABASE_SERVICE_ROLE_KEY` on Vercel so admin writes can upsert that row securely from server actions.

## Verification

```bash
npm test
npm run lint
npm run build
```
