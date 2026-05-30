# WCWS Pick'em

Mobile-first PWA for a Women's College World Series **double-elimination** bracket pool.

## How Scoring Works

Entrants fill out both sides of each four-team bracket — the winners' side and the
elimination side — all the way to a national champion. Correct picks earn points by
round:

| Round | Points | Scored on |
| --- | --- | --- |
| Winners' Bracket Round 1 | 1 | each game |
| Elimination Round 1 | 2 | each game |
| Winners' Bracket Final | 3 | each game |
| Elimination Final | 4 | each game |
| Bracket Final (advance to Finals) | 5 | which team advances |
| National Champion | 6 | which team wins the series |

The bracket final and championship score on **who advances**, not on each game,
because the loser-bracket team has to win twice (the "if necessary" game) while the
winners-bracket team only has to win once. Max score is 38 points.

## What It Does

- Public dashboard with the live bracket, leaderboard, payout math, live game cards, and scenario odds.
- Public entrant pages so anyone can inspect a person's bracket with correct/incorrect picks highlighted.
- An interactive bracket picker that cascades picks down both sides of the bracket.
- Optional public self-service entry (`/enter`) so people can submit their own bracket.
- Password-protected admin portal for entrants, paid status, Venmo/Zelle tags, picks, game winners, payout splits, round locks, and ESPN game IDs.
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
