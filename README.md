# Zim‑ACMS

Enterprise Access Control Management System (ACMS) — full‑stack app with an Express + TypeScript backend, Drizzle ORM (Postgres) and a React + Vite + Tailwind frontend.

**Tech stack:** Node, TypeScript, Express, Drizzle ORM, PostgreSQL, React, Vite, Tailwind, Zod

**Quick overview**
- Server: `server/` (Express, API routes, DB layer)
- Client: `client/` (React + Vite application)
- Shared: `shared/` (DB schema, Zod validators, shared models)

**Prerequisites**
- Node.js (recommended: Node 20.19.0+ or 22.12.0+)
- PostgreSQL running and accessible
- `npm` (comes with Node)

**Environment variables** (set in your shell or use a .env loader)
- `DATABASE_URL` — Postgres connection string, e.g. `postgres://user:pass@localhost:5432/zim_acms`
- `SESSION_SECRET` — secret for session cookie signing
- `PORT` — optional (defaults to `5000`)


## Setup (development)
1. Install dependencies:

```powershell
npm install
```

2. Configure environment variables (PowerShell example):

```powershell
$env:DATABASE_URL = "postgres://USER:PASSWORD@localhost:5432/zim_acms"
$env:SESSION_SECRET = "some_secret_here"
$env:PORT = "5000"   # optional
```

3. Push Drizzle schema to DB (creates tables):

```powershell
npm run db:push
```
npx drizzle-kit push
4. Start dev server (PowerShell-friendly):

```powershell
npm run dev
```

This runs the Express server and Vite dev server (client HMR). Open `http://localhost:5000`.


## Build & production
1. Build client and bundle server:

```powershell
npm run build
```

2. Start production server (ensure `DATABASE_URL` and `SESSION_SECRET` set):

```powershell
npm run start
```


## Useful scripts
- `npm run dev` — development server (server + Vite)
- `npm run build` — build client and bundle server
- `npm run start` — run bundled production server
- `npm run check` — TypeScript check
- `npm run db:push` — push Drizzle schema to database


## Troubleshooting
- `'NODE_ENV' is not recognized'` on Windows: the repo uses `cross-env` in `package.json`. If you see that error, install dev deps:

```powershell
npm install --save-dev cross-env
```

or run the server directly in PowerShell:

```powershell
$env:NODE_ENV = "development"
npx tsx server/index.ts
```

- `DATABASE_URL must be set`: ensure `DATABASE_URL` is defined in the same shell that runs the server and points to a reachable Postgres instance.

- Vite / `crypto.hash` errors on some Node versions: use Node >= `20.19.0` (preferred) or `22.12.0+`. The repo includes a small polyfill in `vite.config.ts` to work around missing `crypto.hash` behavior in older Node builds.


## Project layout (high level)
- `server/` — backend TypeScript, routes, DB connection, auth integrations
- `client/` — React app (pages, components, hooks)
- `shared/` — Drizzle schema and Zod validation
- `script/` — build helpers
- `package.json`, `vite.config.ts`, `drizzle.config.ts`, `tailwind.config.ts` — repo configuration


## Next steps / notes
- Create an admin user via `/api/register` or seed DB as needed.
- Use `database_export.sql` if you prefer to import schema manually instead of `drizzle-kit`.

If you want, I can add a `.env.example` file or a Windows PowerShell script to set environment variables automatically."# Zim-Acms" 
"# Zim-Acms" 
